import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from static_routes import MANIFEST, load_aliases, write_aliases

spec = importlib.util.spec_from_file_location('deploy_static', Path(__file__).with_name('deploy-static.py'))
deploy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(deploy)
REVISION = 'a' * 40


class StaticDeploymentTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.root = self.base / 'out'
        self.root.mkdir()
        (self.root / 'index.html').write_text('new page')
        (self.root / 'REVISION').write_text(REVISION + '\n')
        (self.root / 'worker.mjs').write_text('export const ready=true;')
        (self.root / MANIFEST).write_text(json.dumps({'schemaVersion': 1, 'aliases': {}}))
        self.manifest()
        self.backup = self.base / 'backup'

    def manifest(self):
        files = sorted(p for p in self.root.rglob('*') if p.is_file() and p.name != 'SHA256SUMS')
        (self.root / 'SHA256SUMS').write_text(''.join(
            f'{hashlib.sha256(p.read_bytes()).hexdigest()}  ./{p.relative_to(self.root).as_posix()}\n'
            for p in files))

    def add_routes(self):
        (self.root / 'challenges').mkdir()
        (self.root / 'challenges.html').write_text('challenge list')
        (self.root / 'challenges/editor.html').write_text('challenge editor')
        next_root = self.base / '.next'
        next_root.mkdir()
        (next_root / 'prerender-manifest.json').write_text(json.dumps({
            'routes': {'/': {}, '/challenges': {}, '/challenges/editor': {}, '/favicon.ico': {},
                       '/_not-found': {}, '/_global-error': {}}, 'dynamicRoutes': {}}))
        write_aliases(self.root, next_root)
        self.manifest()
        return load_aliases(self.root, deploy.verified_files(self.root, REVISION))

    def test_nested_page_urls_resolve_to_exact_html_without_a_redirect(self):
        aliases = self.add_routes()
        self.assertEqual(set(aliases), {'challenges', 'challenges/index.html',
                                       'challenges/editor', 'challenges/editor/index.html'})
        from urllib.parse import urlsplit
        for url in ['/challenges/editor?id=22', '/challenges/editor/?id=22&returnTo=%2Fchallenges']:
            path = urlsplit(url).path.lstrip('/')
            key = path + 'index.html' if path.endswith('/') else path
            self.assertEqual(aliases[key].read_text(), 'challenge editor')
        self.assertTrue((self.root / 'challenges/editor.html').is_file())

    def test_alias_cannot_overwrite_reserved_prefix_or_other_page(self):
        for alias, source in [('profiles/owner', 'profiles/owner.html'),
                              ('api/login', 'api/login.html'), ('ws/connect', 'ws/connect.html'),
                              ('challenges/editor', 'index.html')]:
            (self.root / MANIFEST).write_text(json.dumps({'schemaVersion': 1, 'aliases': {alias: source}}))
            with self.assertRaises(AssertionError):
                load_aliases(self.root, {source: self.root / source})

    def test_missing_exported_page_prevents_route_manifest(self):
        next_root = self.base / '.next'
        next_root.mkdir()
        (next_root / 'prerender-manifest.json').write_text(json.dumps({
            'routes': {'/challenges/editor': {}}, 'dynamicRoutes': {}}))
        with self.assertRaisesRegex(AssertionError, 'Missing exported page'):
            write_aliases(self.root, next_root)

    def test_every_alias_gets_explicit_html_type_and_no_cache_after_assets(self):
        aliases = self.add_routes()
        self.fake_backup()
        with patch.object(deploy, 'aws') as aws:
            deploy.upload(self.root, REVISION, 'site', self.backup)
        calls = [call.args for call in aws.call_args_list]
        self.assertEqual(len(calls), 3 + len(aliases))
        uploaded = {args[args.index('--key') + 1] for args in calls[3:]}
        self.assertEqual(uploaded, set(aliases))
        for args in calls[3:]:
            self.assertEqual(args[args.index('--content-type') + 1], 'text/html; charset=utf-8')
            self.assertEqual(args[args.index('--cache-control') + 1], 'no-cache')

    def test_backup_and_restore_allow_s3_key_and_prefix_to_coexist(self):
        aliases = self.add_routes()
        old_keys = {'index.html', 'REVISION', 'challenges', 'challenges/index.html',
                    'challenges/editor', 'challenges/editor/index.html'}
        def aws(*args):
            if args[1] == 'list-objects-v2':
                return {'Contents': [{'Key': key} for key in old_keys | {'profiles/users/7'}]}
            key = args[args.index('--key') + 1]
            Path(args[-1]).write_text('old ' + key)
            return {'ContentType': 'text/plain' if key == 'REVISION' else 'text/html; charset=utf-8',
                    'CacheControl': 'no-cache'}
        with patch.object(deploy, 'aws', side_effect=aws):
            deploy.prepare(self.root, REVISION, 'site', self.backup)
        record = json.loads((self.backup / 'manifest.json').read_text())
        self.assertEqual(set(record['saved']), old_keys)
        self.assertEqual(record['newAliases'], {})
        self.assertEqual(len({saved['file'] for saved in record['saved'].values()}), len(old_keys))
        with patch.object(deploy, 'aws') as aws:
            deploy.rollback('site', REVISION, self.backup)
        restored = [json.loads(call.args[call.args.index('--cli-input-json') + 1])
                    for call in aws.call_args_list if call.args[1] == 'put-object']
        self.assertEqual({item['Key'] for item in restored}, old_keys)
        self.assertTrue(all(item['ContentType'] == 'text/html; charset=utf-8'
                            for item in restored if item['Key'] != 'REVISION'))

    def test_rollback_removes_only_failed_releases_new_aliases(self):
        self.fake_backup()
        record = json.loads((self.backup / 'manifest.json').read_text())
        record['newKeys'] += ['signin', 'signin/index.html']
        record['newAliases'] = {key: hashlib.sha256(b'failed page').hexdigest()
                                for key in ['signin', 'signin/index.html']}
        (self.backup / 'manifest.json').write_text(json.dumps(record))
        calls = []
        def aws(*args):
            calls.append(args)
            if args[1] == 'get-object':
                key = args[args.index('--key') + 1]
                Path(args[-1]).write_text('failed page' if key == 'signin' else 'someone else changed this')
            return {}
        with patch.object(deploy, 'aws', side_effect=aws):
            deploy.rollback('site', REVISION, self.backup)
        removed = [args[args.index('--key') + 1] for args in calls if args[1] == 'delete-object']
        self.assertEqual(removed, ['signin'])

    def fake_backup(self, marker=False):
        self.backup.mkdir()
        (self.backup / 'files').mkdir()
        old = self.backup / 'files/index.html'
        old.write_text('old page')
        data = {'bucket': 'site', 'revision': REVISION,
                'saved': {'index.html': {'metadata': {'ContentType': 'text/html', 'CacheControl': 'no-cache'},
                                         'sha256': hashlib.sha256(old.read_bytes()).hexdigest()}},
                'newKeys': ['worker.mjs'] + (['REVISION'] if marker else [])}
        (self.backup / 'manifest.json').write_text(json.dumps(data))

    def test_tampered_or_wrong_revision_is_rejected_before_aws(self):
        (self.root / 'index.html').write_text('tampered')
        with patch.object(deploy, 'aws') as aws:
            with self.assertRaises(AssertionError):
                deploy.prepare(self.root, REVISION, 'site', self.backup)
            aws.assert_not_called()

    def test_profile_upload_prefix_is_never_an_artifact_target(self):
        (self.root / 'profiles').mkdir()
        (self.root / 'profiles/owner.png').write_bytes(b'not a website asset')
        self.manifest()
        with self.assertRaises(AssertionError):
            deploy.verified_files(self.root, REVISION)

    def test_backup_downloads_only_keys_that_will_be_replaced(self):
        calls = []
        def aws(*args):
            calls.append(args)
            if args[1] == 'list-objects-v2':
                return {'Contents': [{'Key': k} for k in ['index.html', 'profiles/users/7', 'old-hash.js']]}
            self.assertEqual(args[args.index('--key') + 1], 'index.html')
            Path(args[-1]).write_text('old page')
            return {'ContentType': 'text/html'}
        with patch.object(deploy, 'aws', side_effect=aws):
            deploy.prepare(self.root, REVISION, 'site', self.backup)
        self.assertEqual(len(calls), 2)
        record = json.loads((self.backup / 'manifest.json').read_text())
        self.assertEqual(list(record['saved']), ['index.html'])
        self.assertNotIn('profiles/users/7', record['newKeys'])

    def test_upload_keeps_other_keys_and_sets_module_mime_before_html(self):
        self.fake_backup()
        with patch.object(deploy, 'aws') as aws:
            deploy.upload(self.root, REVISION, 'site', self.backup)
        calls = [call.args for call in aws.call_args_list]
        self.assertEqual(len(calls), 3)
        self.assertTrue(all('--delete' not in args for args in calls))
        self.assertIn('REVISION', calls[0])
        self.assertIn('text/javascript', calls[1])
        self.assertIn('text/html; charset=utf-8', calls[2])

    def test_rollback_restores_saved_headers_and_only_removes_own_marker(self):
        self.fake_backup(marker=True)
        calls = []
        def aws(*args):
            calls.append(args)
            if args[1] == 'get-object':
                Path(args[-1]).write_text(REVISION + '\n')
            return {}
        with patch.object(deploy, 'aws', side_effect=aws):
            deploy.rollback('site', REVISION, self.backup)
        restored = json.loads(calls[0][calls[0].index('--cli-input-json') + 1])
        self.assertEqual(restored['Key'], 'index.html')
        self.assertEqual(restored['ContentType'], 'text/html')
        self.assertEqual(calls[-1], ('s3api', 'delete-object', '--bucket', 'site', '--key', 'REVISION'))

    def test_corrupt_backup_prevents_all_restore_writes(self):
        self.fake_backup()
        (self.backup / 'files/index.html').write_text('corrupt')
        with patch.object(deploy, 'aws') as aws:
            with self.assertRaises(AssertionError):
                deploy.rollback('site', REVISION, self.backup)
            aws.assert_not_called()


if __name__ == '__main__':
    unittest.main()
