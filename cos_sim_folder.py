import argparse
import json
import math
from pathlib import Path


def find_vector(obj: dict):
    """
    TwelveLabs embed JSON shape can vary by SDK/version.
    Try common locations.
    """
    # Most common: {"embedding":[...]} or {"embeddings":[...]} for a single record
    if "embedding" in obj and isinstance(obj["embedding"], list):
        return obj["embedding"]
    if "embeddings" in obj and isinstance(obj["embeddings"], list) and obj["embeddings"] and isinstance(obj["embeddings"][0], (int, float)):
        return obj["embeddings"]

    # Sometimes nested: {"data": {"embedding": [...]}}
    if "data" in obj and isinstance(obj["data"], dict):
        if "embedding" in obj["data"] and isinstance(obj["data"]["embedding"], list):
            return obj["data"]["embedding"]

    # Sometimes nested: {"video_embedding": {"embedding": [...]}} etc.
    for k, v in obj.items():
        if isinstance(v, dict) and "embedding" in v and isinstance(v["embedding"], list):
            return v["embedding"]

    raise KeyError("Could not locate embedding vector in JSON record.")


def load_asset_embedding(jsonl_path: Path):
    line = jsonl_path.read_text(encoding="utf-8").splitlines()[0]
    obj = json.loads(line)
    vec = find_vector(obj)
    return jsonl_path.stem, vec


def cosine(a, b):
    if len(a) != len(b):
        raise ValueError(f"Dim mismatch: {len(a)} vs {len(b)}")
    dot = 0.0
    na = 0.0
    nb = 0.0
    for x, y in zip(a, b):
        dot += x * y
        na += x * x
        nb += y * y
    if na == 0.0 or nb == 0.0:
        return 0.0
    return dot / (math.sqrt(na) * math.sqrt(nb))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--embdir", required=True, help="Folder containing JSONL embeddings (asset-scope).")
    ap.add_argument("--topk", type=int, default=5)
    args = ap.parse_args()

    embdir = Path(args.embdir).expanduser().resolve()
    files = sorted(embdir.glob("*.jsonl"))
    if not files:
        print(f"No JSONL files found in: {embdir}")
        return

    items = []
    for f in files:
        try:
            name, vec = load_asset_embedding(f)
            items.append((name, vec))
        except Exception as e:
            print(f"[SKIP] {f.name}: {e}")

    if len(items) < 2:
        print("Need at least 2 embeddings.")
        return

    # Full pairwise similarity matrix (printed compactly)
    print(f"Loaded {len(items)} embeddings from {embdir}")
    print("Pairwise cosine similarities:")
    for i in range(len(items)):
        for j in range(i + 1, len(items)):
            s = cosine(items[i][1], items[j][1])
            print(f"  {items[i][0]}  <->  {items[j][0]}  = {s:.6f}")

    # For each video, show top-k most similar others
    print("\nTop matches per video:")
    for i, (name_i, vec_i) in enumerate(items):
        sims = []
        for j, (name_j, vec_j) in enumerate(items):
            if i == j:
                continue
            sims.append((cosine(vec_i, vec_j), name_j))
        sims.sort(reverse=True, key=lambda x: x[0])
        print(f"\n{name_i}:")
        for s, other in sims[: args.topk]:
            print(f"  {other}: {s:.6f}")


if __name__ == "__main__":
    main()
