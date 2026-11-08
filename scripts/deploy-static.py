"""Publish a verified static artifact without deleting shared bucket contents."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import subprocess
from static_routes import load_aliases, page_key


def aws(*args):
    result = subprocess.run(['aws', *map(str, args), '--no-cli-pager'], check=True,
                            capture_output=True, text=True)
    return json.loads(result.stdout) if result.stdout.strip().startswith(('{', '[')) else result.stdout


def verified_files(root, revision):
    assert re.fullmatch(r'[0-9a-f]{40}', revision), 'Invalid release revision'
    assert (root / 'REVISION').read_text().strip() == revision, 'Wrong artifact revision'
    files = {}
    for path in root.rglob('*'):
        assert not path.is_symlink(), 'Artifact symlinks are not supported'
        if not path.is_file():
            continue
        key = path.relative_to(root).as_posix()
        assert PurePosixPath(key).parts[0] != 'profiles', 'User profile prefix is reserved'
        assert not any(part.startswith('.') for part in PurePosixPath(key).parts), 'Hidden artifact file'
        files[key] = path
    checksums = {}
    for line in (root / 'SHA256SUMS').read_text().splitlines():
        digest, key = line.split(maxsplit=1)
        assert key.startswith('./') and re.fullmatch(r'[0-9a-f]{64}', digest)
        key = key[2:]
        assert key in files and key not in checksums, 'Unknown or duplicate manifest entry'
        assert hashlib.sha256(files[key].read_bytes()).hexdigest() == digest, 'Artifact checksum mismatch'
        checksums[key] = digest
    assert set(checksums) == set(files) - {'SHA256SUMS'}, 'Incomplete manifest'
    assert 'index.html' in files, 'Missing website entry point'
    return files


def prepare(root, revision, bucket, backup):
    files = verified_files(root, revision)
    aliases = load_aliases(root, files)
    files.update(aliases)
    backup.mkdir(parents=True, exist_ok=False)
    listing = aws('s3api', 'list-objects-v2', '--bucket', bucket, '--output', 'json')
    existing = {item['Key'] for item in listing.get('Contents', [])}
    assert 'index.html' in existing, 'Expected existing production website is missing'

    def save(key):
        # S3 permits both "challenges" and "challenges/editor"; a local filesystem does not.
        stored_file = 'objects/' + hashlib.sha256(key.encode()).hexdigest()
        target = backup / stored_file
        target.parent.mkdir(parents=True, exist_ok=True)
        metadata = aws('s3api', 'get-object', '--bucket', bucket, '--key', key, target)
        return key, {'file': stored_file, 'metadata': metadata,
                     'sha256': hashlib.sha256(target.read_bytes()).hexdigest()}

    with ThreadPoolExecutor(max_workers=8) as pool:
        saved = dict(pool.map(save, sorted(set(files) & existing)))
    manifest = {'bucket': bucket, 'revision': revision, 'saved': saved,
                'newKeys': sorted(set(files) - existing),
                'newAliases': {key: hashlib.sha256(path.read_bytes()).hexdigest()
                               for key, path in aliases.items() if key not in existing}}
    (backup / 'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
    print(f'Backed up {len(saved)} overwritten objects; all unrelated keys will be retained.')


def load_backup(backup, bucket, revision):
    record = json.loads((backup / 'manifest.json').read_text(encoding='utf-8'))
    assert record['bucket'] == bucket and record['revision'] == revision
    return record


def upload(root, revision, bucket, backup):
    files = verified_files(root, revision)
    aliases = load_aliases(root, files)
    load_backup(backup, bucket, revision)
    # Do not use --delete: this bucket also contains user profile uploads and old hashed assets.
    common = ['s3', 'cp', str(root) + '/', 's3://' + bucket + '/', '--recursive',
              '--only-show-errors', '--cache-control', 'no-cache']
    aws(*common, '--exclude', '*.html', '--exclude', '*.js', '--exclude', '*.mjs', '--exclude', 'REVISION')
    aws(*common, '--exclude', '*', '--include', '*.js', '--include', '*.mjs',
        '--content-type', 'text/javascript')
    # Mutable HTML is published after all referenced assets; retain existing .html URLs.
    aws(*common, '--exclude', '*', '--include', '*.html', '--content-type', 'text/html; charset=utf-8')
    def publish_alias(item):
        key, source = item
        aws('s3api', 'put-object', '--bucket', bucket, '--key', key, '--body', source,
            '--content-type', 'text/html; charset=utf-8', '--cache-control', 'no-cache')
    with ThreadPoolExecutor(max_workers=8) as pool:
        list(pool.map(publish_alias, sorted(aliases.items())))


def finalize(root, revision, bucket, backup):
    verified_files(root, revision)
    load_backup(backup, bucket, revision)
    aws('s3api', 'put-object', '--bucket', bucket, '--key', 'REVISION', '--body', root / 'REVISION',
        '--content-type', 'text/plain', '--cache-control', 'no-cache')


def rollback(bucket, revision, backup):
    record = load_backup(backup, bucket, revision)
    fields = ['ContentType', 'CacheControl', 'ContentEncoding', 'ContentDisposition',
              'ContentLanguage', 'Metadata', 'Expires', 'WebsiteRedirectLocation',
              'ServerSideEncryption', 'SSEKMSKeyId', 'BucketKeyEnabled']

    prepared = []
    def stored_source(key, saved):
        if 'file' in saved:
            assert saved['file'] == 'objects/' + hashlib.sha256(key.encode()).hexdigest()
            return backup / saved['file']
        return backup / 'files' / key  # Backups from the previous deployment script.

    for key, saved in record['saved'].items():
        assert not key.startswith('profiles/') and not PurePosixPath(key).is_absolute()
        assert '..' not in PurePosixPath(key).parts
        source = stored_source(key, saved)
        assert hashlib.sha256(source.read_bytes()).hexdigest() == saved['sha256'], 'Corrupt rollback file'
        prepared.append((key, saved))
    for key, digest in record.get('newAliases', {}).items():
        page_key(key.removesuffix('/index.html'))
        assert key in record['newKeys'] and re.fullmatch(r'[0-9a-f]{64}', digest)

    def restore(item):
        key, saved = item
        source = stored_source(key, saved)
        params = {k: v for k, v in saved['metadata'].items() if k in fields}
        params.update(Bucket=bucket, Key=key)
        aws('s3api', 'put-object', '--cli-input-json', json.dumps(params), '--body', source)

    # Restore old assets before old entry points. New, unreferenced assets remain intentionally.
    def is_html(item):
        return item[0].endswith('.html') or item[1]['metadata'].get('ContentType', '').startswith('text/html')
    ordered = sorted(prepared, key=lambda item: (is_html(item), item[0]))
    for html in [False, True]:
        with ThreadPoolExecutor(max_workers=8) as pool:
            list(pool.map(restore, [item for item in ordered if is_html(item) == html]))
    for key, digest in record.get('newAliases', {}).items():
        target = backup / ('new-alias-' + hashlib.sha256(key.encode()).hexdigest())
        try:
            aws('s3api', 'get-object', '--bucket', bucket, '--key', key, target)
        except subprocess.CalledProcessError as error:
            if 'NoSuchKey' not in error.stderr and '(404)' not in error.stderr:
                raise
        else:
            # Remove only new route aliases still containing this failed release's exact HTML.
            if hashlib.sha256(target.read_bytes()).hexdigest() == digest:
                aws('s3api', 'delete-object', '--bucket', bucket, '--key', key)
    if 'REVISION' in record['newKeys']:
        # The old pipeline had no marker. Remove only this release's own newly created marker.
        target = backup / 'failed-revision'
        try:
            aws('s3api', 'get-object', '--bucket', bucket, '--key', 'REVISION', target)
        except subprocess.CalledProcessError as error:
            if 'NoSuchKey' not in error.stderr and '(404)' not in error.stderr:
                raise
        else:
            if target.read_text().strip() == revision:
                aws('s3api', 'delete-object', '--bucket', bucket, '--key', 'REVISION')
    print(f'Restored {len(ordered)} prior objects; user uploads and unrelated keys were untouched.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=['prepare', 'upload', 'finalize', 'rollback'])
    parser.add_argument('--root', type=Path, default=Path('out'))
    parser.add_argument('--revision', required=True)
    parser.add_argument('--bucket', required=True)
    parser.add_argument('--backup', type=Path, required=True)
    args = parser.parse_args()
    if args.action == 'rollback':
        rollback(args.bucket, args.revision, args.backup)
    else:
        globals()[args.action](args.root, args.revision, args.bucket, args.backup)
