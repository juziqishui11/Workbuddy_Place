#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Git Data API 推送 —— 把本地工程推到 juziqishui11/Workbuddy_Place。

为什么不用 git push：
  本机到 github.com 的 smart-HTTP 传输会卡死（ls-remote 通，数据阶段挂起），
  改用 GitHub Git Data API 合成 tree/commit，一次调用完成，稳定。

用法：
    python gh_sync.py                      # 推送 ROOTS 中全部工程
    python gh_sync.py toy-collection-mp    # 只推送指定远端前缀
    python gh_sync.py toy-collection-mp --dry-run
    COMMIT_MSG_FILE=msg.txt python gh_sync.py toy-collection-mp   # 自定义提交信息

⚠️ 提交信息只认环境变量 COMMIT_MSG / COMMIT_MSG_FILE；不支持 `-m`。
   写 `-m "xxx"` 会被当成"只看这个前缀"的过滤参数而**静默忽略**，最终落成默认
   的 `chore: sync toy-collection-mp`。Windows 下中文信息请走 COMMIT_MSG_FILE
   （UTF-8 文件），避免命令行编码把中文写成乱码。

特性：
  * 逐文件计算 git blob sha1 与远端比对，只上传真正变更的文件（大文件不重复传）
  * 远端存在而本地没有的文件，自动生成 sha=None 的 tree entry 删除
  * 排除 .genie / node_modules / dist-site 等非源码产物
"""
import os
import sys
import json
import base64
import hashlib
import urllib.request
import urllib.error

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

REPO = 'juziqishui11/Workbuddy_Place'
BRANCH = 'main'
PAT = open(r'C:/Users/EDY/.workbuddy/secrets/github_pat.txt', encoding='utf-8').read().strip()
API = 'https://api.github.com/repos/' + REPO

# (本地根目录, 远端前缀)
ROOTS = [
    (r'D:/workBuddy_place/Workbench', 'Workbench'),
    (r'D:/workBuddy_place/toy-collection-mp', 'toy-collection-mp'),
]
EXCLUDE_DIRS = {'dist-site', '.workbuddy', 'node_modules', '.git', '__pycache__',
                '.verify', 'cache', '.edgeone', '.tmp', '.vscode'}
EXCLUDE_FILES = {'.DS_Store', 'Thumbs.db', 'push.log'}
EXCLUDE_EXTS = {'.genie'}


def gh(method, path, data=None):
    url = API + path
    req = urllib.request.Request(url, headers={
        'Authorization': 'Bearer ' + PAT,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'wb-push',
        'Content-Type': 'application/json'})
    req.get_method = lambda: method
    body = json.dumps(data).encode('utf-8') if data is not None else None
    try:
        r = urllib.request.urlopen(req, data=body, timeout=120)
        return json.loads(r.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        print('HTTP', e.code, e.read().decode('utf-8')[:400])
        raise


def blob_sha1(content_bytes):
    """git blob 对象的 sha1：sha1('blob <len>\\0' + content)"""
    h = hashlib.sha1()
    h.update(('blob %d\0' % len(content_bytes)).encode('ascii'))
    h.update(content_bytes)
    return h.hexdigest()


def collect_local(root):
    """返回 {相对路径: 绝对路径}，相对路径统一用 / 分隔"""
    out = {}
    for dp, dns, fns in os.walk(root):
        dns[:] = [d for d in dns if d not in EXCLUDE_DIRS]
        rel_dir = os.path.relpath(dp, root).replace(os.sep, '/')
        for fn in fns:
            ext = os.path.splitext(fn)[1]
            if fn in EXCLUDE_FILES or ext in EXCLUDE_EXTS:
                continue
            full = os.path.join(dp, fn)
            if not os.path.isfile(full):
                continue
            rel = fn if rel_dir == '.' else rel_dir + '/' + fn
            out[rel] = full
    return out


def main():
    argv = sys.argv[1:]
    dry_run = '--dry-run' in argv
    only = [a for a in argv if not a.startswith('--')]

    roots = [(r, p) for r, p in ROOTS if (not only or p in only)]
    if not roots:
        print('没有匹配的工程前缀:', only)
        return 1

    # 1. 远端 HEAD
    ref = gh('GET', '/git/refs/heads/' + BRANCH)
    base_sha = ref['object']['sha']
    base_commit = gh('GET', '/git/commits/' + base_sha)
    base_tree = base_commit['tree']['sha']
    print('远端 HEAD:', base_sha[:12], '|', base_commit['message'].splitlines()[0][:60])

    # 2. 远端全量 tree（recursive）
    full = gh('GET', '/git/trees/%s?recursive=1' % base_tree)
    remote = {}
    for e in full.get('tree', []):
        if e['type'] == 'blob':
            remote[e['path']] = e['sha']

    # 3. 逐 root 比对
    tree_entries = []
    total_up = 0
    for root, prefix in roots:
        local = collect_local(root)
        plen = len(prefix) + 1
        rem = {k[plen:]: v for k, v in remote.items() if k.startswith(prefix + '/')}

        changed, added = [], []
        for rel, full_path in local.items():
            with open(full_path, 'rb') as f:
                content = f.read()
            sha = blob_sha1(content)
            if rel not in rem:
                added.append((rel, content, sha))
            elif rem[rel] != sha:
                changed.append((rel, content, sha))
        deleted = [r for r in rem if r not in local]

        print('\n[%s] 远端 %d / 本地 %d | 变更 %d 新增 %d 删除 %d'
              % (prefix, len(rem), len(local), len(changed), len(added), len(deleted)))
        for r, _, _ in changed:
            print('   M', r)
        for r, _, _ in added:
            print('   A', r)
        for r in sorted(deleted):
            print('   D', r)

        if dry_run:
            continue

        for rel, content, sha in changed + added:
            ghpath = prefix + '/' + rel
            b64 = base64.b64encode(content).decode('ascii')
            blob = gh('POST', '/git/blobs', {'content': b64, 'encoding': 'base64'})
            assert blob['sha'] == sha, 'blob sha 不一致: ' + ghpath
            tree_entries.append({'path': ghpath, 'mode': '100644',
                                 'type': 'blob', 'sha': blob['sha']})
            total_up += 1
            print('   up', ghpath, len(content), 'B')

        for rel in sorted(deleted):
            tree_entries.append({'path': prefix + '/' + rel, 'mode': '100644',
                                 'type': 'blob', 'sha': None})

    if dry_run:
        print('\n[dry-run] 未做任何写入')
        return 0

    if not tree_entries:
        print('\n无差异，无需提交')
        return 0

    # 4. tree（基于 HEAD tree 覆盖同名，其余保留）
    new_tree = gh('POST', '/git/trees', {'base_tree': base_tree, 'tree': tree_entries})

    # 5. commit
    msg = os.environ.get('COMMIT_MSG') or 'chore: sync toy-collection-mp'
    mf = os.environ.get('COMMIT_MSG_FILE')
    if mf and os.path.isfile(mf):
        with open(mf, encoding='utf-8') as f:
            msg = f.read().strip()
    new_commit = gh('POST', '/git/commits', {
        'message': msg, 'tree': new_tree['sha'], 'parents': [base_sha]})

    # 6. 移动分支引用
    gh('PATCH', '/git/refs/heads/' + BRANCH, {'sha': new_commit['sha']})
    print('\nPUSH OK -> commit', new_commit['sha'])
    print('上传文件:', total_up, '| tree entries:', len(tree_entries))
    return 0


if __name__ == '__main__':
    sys.exit(main())
