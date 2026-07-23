import os
import sys
import time
import json
import argparse
from datetime import datetime
from qcloud_cos import CosConfig, CosS3Client

SECRET_ID = os.environ.get('TENCENT_SECRET_ID', '')
SECRET_KEY = os.environ.get('TENCENT_SECRET_KEY', '')
REGION = 'ap-guangzhou'
BUCKET = 'x402-1454137396'

SKIP_DIRS = {
    'node_modules', '.git', '__pycache__', '.hvigor', 'build',
    'oh_modules', 'dist', '.mini-ide', 'commandline-tools',
    '.gradle', '.idea', '.vscode'
}

SKIP_EXTENSIONS = {
    '.log', '.tmp', '.bak', '.pyc', '.map'
}

def get_client():
    config = CosConfig(Region=REGION, SecretId=SECRET_ID, SecretKey=SECRET_KEY)
    return CosS3Client(config)

def should_skip_dir(dirname):
    return dirname in SKIP_DIRS or dirname.startswith('.')

def should_skip_file(filename):
    ext = os.path.splitext(filename)[1].lower()
    return ext in SKIP_EXTENSIONS

def collect_files(base_dir, prefix=''):
    files = []
    for root, dirs, filenames in os.walk(base_dir):
        dirs[:] = [d for d in dirs if not should_skip_dir(d)]
        for f in filenames:
            if should_skip_file(f):
                continue
            full_path = os.path.join(root, f)
            rel_path = os.path.relpath(full_path, base_dir)
            rel_path = rel_path.replace('\\', '/')
            files.append((full_path, rel_path))
    return files

def backup_section(client, project_dir, section_name, tag=None):
    if tag is None:
        tag = datetime.now().strftime('%Y%m%d_%H%M%S')

    cos_prefix = f'guiniu-yinzheng/{tag}'
    section_map = {
        'frontend-src': os.path.join(project_dir, 'frontend', 'src'),
        'frontend-dist-mp-alipay': os.path.join(project_dir, 'frontend', 'dist', 'build', 'mp-alipay'),
        'backend-src': os.path.join(project_dir, 'src'),
        'server-py': os.path.join(project_dir, 'server.py'),
        'payment-backends': os.path.join(project_dir, 'payment_backends'),
        'harmony-entry': os.path.join(project_dir, 'entry', 'src'),
        'entry-config': os.path.join(project_dir, 'entry'),
        'mp-alipay': os.path.join(project_dir, 'mp-alipay'),
        'scripts': os.path.join(project_dir, 'scripts'),
        'terraform': os.path.join(project_dir, 'terraform'),
        'root-config': project_dir,
    }

    if section_name not in section_map:
        print(f'Unknown section: {section_name}')
        print(f'Available: {list(section_map.keys())}')
        return

    section_path = section_map[section_name]
    if not os.path.exists(section_path):
        print(f'  SKIP {section_name}: {section_path} not found')
        return

    print(f'[{tag}] Backing up section: {section_name}')

    if section_name == 'root-config':
        files = []
        for f in os.listdir(section_path):
            fp = os.path.join(section_path, f)
            if os.path.isfile(fp) and not should_skip_file(f) and not f.startswith('.'):
                files.append((fp, f))
    elif os.path.isfile(section_path):
        files = [(section_path, os.path.basename(section_path))]
    else:
        files = collect_files(section_path)

    print(f'  {section_name}: {len(files)} files')
    uploaded = 0
    failed = 0

    for full_path, rel_path in files:
        cos_key = f'{cos_prefix}/{section_name}/{rel_path}'
        try:
            client.upload_file(Bucket=BUCKET, Key=cos_key, LocalFilePath=full_path)
            uploaded += 1
            if uploaded % 20 == 0:
                print(f'    ... {uploaded}/{len(files)} uploaded')
        except Exception as e:
            failed += 1
            if failed <= 5:
                print(f'    FAIL: {cos_key} -> {e}')

    print(f'  Done: {uploaded}/{len(files)} uploaded, {failed} failed')
    return uploaded, failed

def backup_project(client, project_dir, tag=None, sections=None):
    if tag is None:
        tag = datetime.now().strftime('%Y%m%d_%H%M%S')

    cos_prefix = f'guiniu-yinzheng/{tag}'
    print(f'[{tag}] Starting backup: {project_dir} -> cos://{BUCKET}/{cos_prefix}/')

    all_sections = [
        'frontend-src', 'frontend-dist-mp-alipay',
        'backend-src', 'server-py', 'payment-backends',
        'harmony-entry', 'root-config'
    ]
    target_sections = sections if sections else all_sections

    total_up = 0
    total_fail = 0

    for sec in target_sections:
        up, fail = backup_section(client, project_dir, sec, tag)
        total_up += up
        total_fail += fail

    manifest = {
        'tag': tag,
        'timestamp': datetime.now().isoformat(),
        'project_dir': project_dir,
        'uploaded': total_up,
        'failed': total_fail,
        'sections': target_sections
    }
    manifest_key = f'{cos_prefix}/MANIFEST.json'
    client.put_object(
        Bucket=BUCKET,
        Key=manifest_key,
        Body=json.dumps(manifest, indent=2, ensure_ascii=False).encode('utf-8')
    )
    print(f'\n  MANIFEST: {manifest_key}')
    print(f'  Result: {uploaded}/{total} uploaded, {failed} failed')
    return manifest

def list_backups(client):
    resp = client.list_objects(Bucket=BUCKET, Prefix='guiniu-yinzheng/', Delimiter='/')
    prefixes = resp.get('CommonPrefixes', [])
    print('Available backups:')
    for p in prefixes:
        prefix = p['Prefix']
        tag = prefix.rstrip('/').split('/')[-1]
        try:
            manifest_resp = client.get_object(Bucket=BUCKET, Key=f'{prefix}MANIFEST.json')
            body = manifest_resp['Body'].read()
            manifest = json.loads(body.decode('utf-8'))
            ts = manifest.get('timestamp', 'unknown')
            cnt = manifest.get('uploaded', '?')
            print(f'  {tag}  {ts}  ({cnt} files)')
        except Exception:
            print(f'  {tag}  (no manifest)')

def restore_backup(client, project_dir, tag):
    cos_prefix = f'guiniu-yinzheng/{tag}'
    print(f'Restoring backup {tag} to {project_dir}')

    manifest_key = f'{cos_prefix}/MANIFEST.json'
    try:
        manifest_resp = client.get_object(Bucket=BUCKET, Key=manifest_key)
        body = manifest_resp['Body'].read()
        manifest = json.loads(body.decode('utf-8'))
        print(f'  Backup: {manifest.get("timestamp")} ({manifest.get("uploaded")}/{manifest.get("total_files")} files)')
    except Exception as e:
        print(f'  WARN: Could not read manifest: {e}')

    marker = ''
    total = 0
    while True:
        resp = client.list_objects(Bucket=BUCKET, Prefix=cos_prefix, Marker=marker, MaxKeys=200)
        contents = resp.get('Contents', [])
        if not contents:
            break
        for obj in contents:
            key = obj['Key']
            if key.endswith('MANIFEST.json'):
                continue
            rel = key[len(cos_prefix) + 1:]
            section_parts = rel.split('/', 1)
            if len(section_parts) < 2:
                continue
            section = section_parts[0]
            file_rel = section_parts[1]

            if section == 'frontend-src':
                local_path = os.path.join(project_dir, 'frontend', 'src', file_rel)
            elif section == 'frontend-dist-mp-alipay':
                local_path = os.path.join(project_dir, 'frontend', 'dist', 'build', 'mp-alipay', file_rel)
            elif section == 'backend-src':
                local_path = os.path.join(project_dir, 'src', file_rel)
            elif section == 'server-py':
                local_path = os.path.join(project_dir, file_rel)
            elif section == 'payment-backends':
                local_path = os.path.join(project_dir, 'payment_backends', file_rel)
            elif section == 'harmony-entry':
                local_path = os.path.join(project_dir, 'entry', 'src', file_rel)
            elif section == 'config':
                local_path = os.path.join(project_dir, file_rel)
            else:
                local_path = os.path.join(project_dir, section, file_rel)

            os.makedirs(os.path.dirname(local_path), exist_ok=True)
            try:
                client.download_file(Bucket=BUCKET, Key=key, DestFilePath=local_path)
                total += 1
                if total % 50 == 0:
                    print(f'  ... {total} files restored')
            except Exception as e:
                print(f'  FAIL: {key} -> {e}')

        if resp.get('IsTruncated') == 'true':
            marker = resp.get('NextMarker', contents[-1]['Key'])
        else:
            break

    print(f'  Restored {total} files')

def backup_env_only(client, project_dir, tag=None):
    if tag is None:
        tag = datetime.now().strftime('%Y%m%d_%H%M%S')
    cos_prefix = f'guiniu-yinzheng/{tag}/env'

    env_files = ['.env', '.env.example', '.env.production']
    for ef in env_files:
        for search_dir in [project_dir, os.path.join(project_dir, 'frontend')]:
            fp = os.path.join(search_dir, ef)
            if os.path.exists(fp):
                cos_key = f'{cos_prefix}/{ef}'
                client.upload_file(Bucket=BUCKET, Key=cos_key, LocalFilePath=fp)
                print(f'  Uploaded: {fp} -> {cos_key}')

    key_files = [
        'cloudbaserc.json', 'Dockerfile.cloudbase', 'Dockerfile',
        'supervisord.conf', 'package.json', 'requirements.txt',
        'build-profile.json5', 'oh-package.json5'
    ]
    for kf in key_files:
        fp = os.path.join(project_dir, kf)
        if os.path.exists(fp):
            cos_key = f'{cos_prefix}/{kf}'
            client.upload_file(Bucket=BUCKET, Key=cos_key, LocalFilePath=fp)
            print(f'  Uploaded: {fp} -> {cos_key}')

    print(f'  Env/config backup done: {tag}')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='X402 COS Backup Service')
    sub = parser.add_subparsers(dest='command')

    bk = sub.add_parser('backup', help='Backup project to COS')
    bk.add_argument('--dir', default='D:/x402-deveco', help='Project directory')
    bk.add_argument('--tag', default=None, help='Backup tag (default: timestamp)')

    ls = sub.add_parser('list', help='List backups')
    rs = sub.add_parser('restore', help='Restore from COS backup')
    rs.add_argument('--dir', default='D:/x402-deveco', help='Project directory')
    rs.add_argument('--tag', required=True, help='Backup tag to restore')

    ev = sub.add_parser('env', help='Backup env/config files only')
    ev.add_argument('--dir', default='D:/x402-deveco', help='Project directory')
    ev.add_argument('--tag', default=None, help='Backup tag')

    sc = sub.add_parser('section', help='Backup a single section')
    sc.add_argument('--dir', default='D:/x402-deveco', help='Project directory')
    sc.add_argument('--tag', default=None, help='Backup tag')
    sc.add_argument('--name', required=True, help='Section name')

    args = parser.parse_args()
    client = get_client()

    if args.command == 'backup':
        backup_project(client, args.dir, args.tag)
    elif args.command == 'list':
        list_backups(client)
    elif args.command == 'restore':
        restore_backup(client, args.dir, args.tag)
    elif args.command == 'env':
        backup_env_only(client, args.dir, args.tag)
    elif args.command == 'section':
        backup_section(client, args.dir, args.name, args.tag)
    else:
        parser.print_help()
