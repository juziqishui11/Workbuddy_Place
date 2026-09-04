#!/usr/bin/env python3
"""Remove gh_push.py and .env from the Personal_Website/ subtree on GitHub via Git Data API."""
import os, base64, json, urllib.request, urllib.error, sys

ROOT = r"D:\workBuddy_place\Software Engineering\Personal_Website"
PREFIX = "Personal_Website"
REPO = "juziqishui11/Workbuddy_Place"
BRANCH = "main"
PAT_PATH = os.path.expanduser(r"~\.workbuddy\secrets\github_pat.txt")
SKIP_DIRS = {".git", ".edgeone", "__pycache__", "node_modules", ".workbuddy"}
EXCLUDE_FILES = {"gh_push.py", ".env"}  # relative names to drop from repo

def read_pat():
    with open(PAT_PATH, "r", encoding="utf-8") as f:
        return f.read().strip()

def api(method, path, token, data=None):
    url = f"https://api.github.com/repos/{REPO}{path}"
    headers = {"User-Agent": "wb-push", "Authorization": f"Bearer {token}",
               "Accept": "application/vnd.github+json"}
    body = None
    if data is not None:
        body = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.load(r) if r.read else {}
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8", "replace")
        print(f"HTTP {e.code} {method} {path}\n{err[:800]}", file=sys.stderr)
        raise

def collect_files():
    out = []
    for dp, dn, fn in os.walk(ROOT):
        dn[:] = [d for d in dn if d not in SKIP_DIRS]
        for name in fn:
            rel = os.path.relpath(os.path.join(dp, name), ROOT).replace(os.sep, "/")
            if rel in EXCLUDE_FILES:
                continue
            out.append(rel)
    out.sort()
    return out

def main():
    token = read_pat()
    files = collect_files()
    print(f"keeping {len(files)} files (dropping gh_push.py, .env)")
    ref = api("GET", f"/git/refs/heads/{BRANCH}", token)
    head_sha = ref["object"]["sha"]
    commit = api("GET", f"/git/commits/{head_sha}", token)
    base_tree = commit["tree"]["sha"]
    print("HEAD:", head_sha, "tree:", base_tree)
    blobs = {}
    for rel in files:
        with open(os.path.join(ROOT, rel), "rb") as f:
            content = base64.b64encode(f.read()).decode("ascii")
        resp = api("POST", "/git/blobs", token, {"content": content, "encoding": "base64"})
        blobs[rel] = resp["sha"]
    # Omit gh_push.py and .env -> they get deleted from base_tree on merge
    tree = [{"path": f"{PREFIX}/{rel}", "mode": "100644", "type": "blob", "sha": sha}
            for rel, sha in blobs.items()]
    tree_resp = api("POST", "/git/trees", token, {"base_tree": base_tree, "tree": tree})
    print("tree:", tree_resp["sha"])
    msg = "chore: remove push helper script and empty .env from repo"
    new_commit = api("POST", "/git/commits", token, {
        "message": msg, "tree": tree_resp["sha"], "parents": [head_sha]})
    print("commit:", new_commit["sha"])
    api("PATCH", f"/git/refs/heads/{BRANCH}", token, {"sha": new_commit["sha"]})
    print("CLEANED OK ->", new_commit["sha"])

if __name__ == "__main__":
    main()
