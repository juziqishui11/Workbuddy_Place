#!/usr/bin/env python3
# Git Data API 推送：把 toy-collection-mp 小程序源码 + 更新后的 Workbench 推到 juziqishui11/Workbuddy_Place
# 不用 git push（github.com 传输在本环境会卡死），改为 API 合成 tree/commit。
import os, json, base64, urllib.request, urllib.error

REPO = 'juziqishui11/Workbuddy_Place'
BRANCH = 'main'
PAT = open(r'C:/Users/EDY/.workbuddy/secrets/github_pat.txt').read().strip()
API = 'https://api.github.com/repos/' + REPO

# (本地根目录, 远端前缀)
ROOTS = [
    (r'D:/workBuddy_place/Workbench', 'Workbench'),
    (r'D:/workBuddy_place/toy-collection-mp', 'toy-collection-mp'),
]
EXCLUDE_DIRS = {'dist-site', '.workbuddy', 'node_modules', '.git', '__pycache__', '.verify', 'cache'}
EXCLUDE_FILES = {'.DS_Store', 'Thumbs.db', 'push.log'}

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
        r = urllib.request.urlopen(req, data=body, timeout=60)
        return json.loads(r.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        print('HTTP', e.code, e.read().decode('utf-8')[:300]); raise

# 1. 收集本地文件
files = []
for root, prefix in ROOTS:
    for dp, dns, fns in os.walk(root):
        dns[:] = [d for d in dns if d not in EXCLUDE_DIRS]
        rel = os.path.relpath(dp, root).replace(os.sep, '/')
        for fn in fns:
            if fn in EXCLUDE_FILES or fn.endswith('.genie'):
                continue
            full = os.path.join(dp, fn)
            if os.path.isfile(full):
                path = (rel + '/' + fn) if rel != '.' else fn
                files.append((prefix + '/' + path, full))
print('本地待推送文件数:', len(files))

# 2. HEAD
ref = gh('GET', '/git/refs/heads/' + BRANCH)
base_sha = ref['object']['sha']
base_commit = gh('GET', '/git/commits/' + base_sha)
base_tree = base_commit['tree']['sha']

# 3. blobs
tree_entries = []
for ghpath, full in files:
    with open(full, 'rb') as f:
        content = f.read()
    b64 = base64.b64encode(content).decode('ascii')
    blob = gh('POST', '/git/blobs', {'content': b64, 'encoding': 'base64'})
    tree_entries.append({'path': ghpath, 'mode': '100644', 'type': 'blob', 'sha': blob['sha']})
    print('  blob', ghpath, len(content))

# 4. tree（基于 HEAD tree 覆盖同名、其余追加）
new_tree = gh('POST', '/git/trees', {'base_tree': base_tree, 'tree': tree_entries})
# 5. commit
new_commit = gh('POST', '/git/commits', {
    'message': 'feat: 卡牌中文描述（649/649 中文图鉴描述 + 分类 + 弱点/抵抗，详情页新增中文图鉴描述卡）',
    'tree': new_tree['sha'], 'parents': [base_sha]})
# 6. ref
gh('PATCH', '/git/refs/heads/' + BRANCH, {'sha': new_commit['sha']})
print('PUSH OK -> commit', new_commit['sha'][:12])
print('files pushed:', len(tree_entries))
