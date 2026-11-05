"""Map exported Next pages to exact S3 website keys without HTTP redirects."""
import argparse
import json
from pathlib import Path, PurePosixPath
import re

MANIFEST = 'ROUTE_ALIASES.json'
RESERVED = {'api', 'ws', 'profiles', '_next'}


def page_key(route):
    key = route.removeprefix('/')
    assert re.fullmatch(r'[A-Za-z0-9_-]+(?:/[A-Za-z0-9_-]+)*', key), 'Invalid page route'
    assert PurePosixPath(key).parts[0] not in RESERVED, 'Reserved route prefix'
    return key


def write_aliases(root, next_root):
    prerender = json.loads((next_root / 'prerender-manifest.json').read_text(encoding='utf-8'))
    assert not prerender['dynamicRoutes'], 'Static route export required'
    aliases = {}
    for route in sorted(prerender['routes']):
        if route == '/' or route.startswith('/_') or PurePosixPath(route).suffix:
            continue
        key = page_key(route)
        source = key + '.html'
        assert (root / source).is_file(), f'Missing exported page: {source}'
        for alias in (key, key + '/index.html'):
            assert not (root / alias).is_file(), f'Alias would replace an artifact: {alias}'
            aliases[alias] = source
    (root / MANIFEST).write_text(json.dumps({'schemaVersion': 1, 'aliases': aliases}, indent=2) + '\n',
                                 encoding='utf-8')
    print(f'Prepared {len(aliases)} exact website keys for {len(aliases) // 2} exported pages.')


def load_aliases(root, files):
    data = json.loads((root / MANIFEST).read_text(encoding='utf-8'))
    assert data['schemaVersion'] == 1 and isinstance(data['aliases'], dict), 'Invalid route manifest'
    aliases = {}
    for alias, source in data['aliases'].items():
        assert source.endswith('.html') and source in files, 'Alias source is not an exported HTML page'
        key = page_key(source[:-5])
        assert alias in (key, key + '/index.html'), 'Alias does not match its exported page'
        assert alias not in files, 'Alias would replace an artifact'
        aliases[alias] = files[source]
    return aliases


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', type=Path, default=Path('out'))
    parser.add_argument('--next-root', type=Path, default=Path('.next'))
    args = parser.parse_args()
    write_aliases(args.root, args.next_root)
