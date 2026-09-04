#!/usr/bin/env python3
"""Push the static site to juziqishui11/Workbuddy_Place under Personal_Website/ via Git Data API."""
import os, base64, json, urllib.request, urllib.error, sys

ROOT = r"D:\workBuddy_place\Software Engineering\Personal_Website"
PREFIX = "Personal_Website"
REPO = "juziqishui11/Workbuddy_Place"
BRANCH = "main"
PAT_PATH = os.path.expanduser(r"~\.workbuddy\secrets\github_pat.txt")
SKIP_DIRS = {".git", ".edgeone", "__pycache__", "node_modules", ".workbuddy"}

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
            full = os.path.join(dp, name)
            rel = os.path.relpath(full, ROOT).replace(os.sep, "/")
            out.append((rel, full))
    out.sort()
    return out

def main():
    token = read_pat()
    files = collect_files()
    print(f"collected {len(files)} files")
    # HEAD sha
    ref = api("GET", f"/git/refs/heads/{BRANCH}", token)
    head_sha = ref["object"]["sha"]
    print("HEAD:", head_sha)
    # blobs
    blobs = {}
    for rel, full in files:
        with open(full, "rb") as f:
            content = base64.b64encode(f.read()).decode("ascii")
        # detect text vs binary by extension
        ext = os.path.splitext(rel)[1].lower()
        is_text = ext in {".html", ".css", ".js", ".svg", ".md", ".txt", ".json", ".xml"}
        resp = api("POST", "/git/blobs", token, {
            "content": content,
            "encoding": "base64"
        })
        blobs[rel] = resp["sha"]
        print(f"  blob {rel} -> {resp['sha'][:10]}")
    # tree
    tree = [{"path": f"{PREFIX}/{rel}", "mode": "100644", "type": "blob", "sha": sha}
            for rel, sha in blobs.items()]
    tree_resp = api("POST", "/git/trees", token, {"base_tree": head_sha, "tree": tree})
    print("tree:", tree_resp["sha"])
    # commit
    msg = "feat: add personal website (枫城) — index/about/projects/blog/contact + assets"
    commit = api("POST", "/git/commits", token, {
        "message": msg,
        "tree": tree_resp["sha"],
        "parents": [head_sha]
    })
    print("commit:", commit["sha"])
    # update ref
    api("PATCH", f"/git/refs/heads/{BRANCH}", token, {"sha": commit["sha"]})
    print("PUSHED OK ->", commit["sha"])
    print("browse: https://github.com/" + REPO + "/tree/" + BRANCH + "/" + PREFIX)

if __name__ == "__main__":
    main()
