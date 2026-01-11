#!/usr/bin/env python3
import argparse
import json
import math
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from twelvelabs import TwelveLabs


# -----------------------------
# Cosine similarity
# -----------------------------
def cosine_sim(a: List[float], b: List[float]) -> float:
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


# -----------------------------
# Robust vector extraction
# -----------------------------
def _is_num(x: Any) -> bool:
    return isinstance(x, (int, float)) and not isinstance(x, bool)


def find_longest_numeric_vector(obj: Any, min_len: int = 32) -> Optional[List[float]]:
    """
    Recursively find the *longest* numeric list in a JSON-like object.
    Works across response shape changes.
    """
    best: Optional[List[float]] = None

    def walk(x: Any):
        nonlocal best
        if isinstance(x, list):
            if x and all(_is_num(v) for v in x):
                if len(x) >= min_len and (best is None or len(x) > len(best)):
                    best = [float(v) for v in x]
            for v in x:
                walk(v)
        elif isinstance(x, dict):
            for v in x.values():
                walk(v)

    walk(obj)
    return best


def to_jsonable(x: Any) -> Any:
    """
    Convert pydantic / SDK objects to JSON-serializable dicts where possible.
    """
    if x is None:
        return None
    # pydantic v2
    if hasattr(x, "model_dump"):
        try:
            return x.model_dump()
        except Exception:
            pass
    # pydantic v1
    if hasattr(x, "dict"):
        try:
            return x.dict()
        except Exception:
            pass
    # plain types
    if isinstance(x, (dict, list, str, int, float, bool)):
        return x
    # fallback: try __dict__
    if hasattr(x, "__dict__"):
        return dict(x.__dict__)
    return x


def load_jsonl_embedding(path: Path) -> Tuple[List[float], Dict[str, Any]]:
    with path.open("r", encoding="utf-8") as f:
        line = f.readline().strip()
        if not line:
            raise ValueError(f"Empty JSONL: {path}")
        obj = json.loads(line)

    vec = find_longest_numeric_vector(obj, min_len=32)
    if vec is None:
        raise ValueError(f"Could not find numeric embedding vector in JSONL: {path}")

    meta: Dict[str, Any] = {}
    if isinstance(obj, dict):
        for k in ("asset_id", "video_id", "clip_id", "scope", "option", "model_name"):
            if k in obj:
                meta[k] = obj[k]

    return vec, meta


# -----------------------------
# Text embedding via TwelveLabs
# -----------------------------
def embed_text(client: TwelveLabs, text: str) -> List[float]:
    """
    Produces an embedding for text.

    Handles both SDK behaviors:
      A) Async: returns task object with id/task_id -> poll client.embed.tasks.retrieve(...)
      B) Sync: returns EmbeddingResponse directly (no id) -> extract vector immediately
    """
    resp = client.embed.create(
        model_name="marengo3.0",
        text=text,
    )

    # Case A: async task object
    task_id = getattr(resp, "id", None) or getattr(resp, "task_id", None)
    if task_id:
        while True:
            t = client.embed.tasks.retrieve(task_id)
            status = getattr(t, "status", None)
            if status == "ready":
                result_obj = getattr(t, "result", t)
                break
            if status == "failed":
                raise RuntimeError(f"Text embedding failed. task_id={task_id}")
        vec = find_longest_numeric_vector(to_jsonable(result_obj), min_len=32)
        if vec is None:
            raise RuntimeError("Could not extract text embedding vector from async task result")
        return vec

    # Case B: sync embedding response (no id)
    vec = find_longest_numeric_vector(to_jsonable(resp), min_len=32)
    if vec is None:
        raise RuntimeError("Could not extract text embedding vector from EmbeddingResponse")
    return vec


# -----------------------------
# Normalization helpers
# -----------------------------
def minmax_norm(scores: List[Tuple[str, float]]) -> List[Tuple[str, float]]:
    vals = [s for _, s in scores]
    lo = min(vals)
    hi = max(vals)
    if hi == lo:
        return [(n, 0.0) for n, _ in scores]
    return [(n, (s - lo) / (hi - lo)) for n, s in scores]


# -----------------------------
# Main
# -----------------------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--embdir", required=True, help="Folder with JSONL embeddings (*.jsonl)")
    ap.add_argument("--topk", type=int, default=3)
    ap.add_argument("--ent_text", required=True)
    ap.add_argument("--srs_text", required=True)
    ap.add_argument("--print_scores", action="store_true")
    ap.add_argument("--normalize", action="store_true", help="Also print min-max normalized scores [0,1]")
    ap.add_argument("--disjoint", action="store_true", help="Ensure serious picks do not overlap entertainment picks")
    args = ap.parse_args()

    api_key = os.getenv("TWELVELABS_API_KEY")
    if not api_key:
        raise RuntimeError("TWELVELABS_API_KEY not set")

    client = TwelveLabs(api_key=api_key)

    embdir = Path(args.embdir)
    files = sorted(embdir.glob("*.jsonl"))
    if not files:
        raise RuntimeError(f"No embeddings found in {embdir}")

    # Load clip embeddings
    clip_vecs: Dict[str, List[float]] = {}
    for p in files:
        name = p.stem
        vec, _meta = load_jsonl_embedding(p)
        clip_vecs[name] = vec

    # Embed profile texts
    ent_vec = embed_text(client, args.ent_text)
    srs_vec = embed_text(client, args.srs_text)

    # Score clips
    ent_scores: List[Tuple[str, float]] = []
    srs_scores: List[Tuple[str, float]] = []
    for name, vec in clip_vecs.items():
        ent_scores.append((name, cosine_sim(vec, ent_vec)))
        srs_scores.append((name, cosine_sim(vec, srs_vec)))

    ent_scores.sort(key=lambda x: x[1], reverse=True)
    srs_scores.sort(key=lambda x: x[1], reverse=True)

    ent_norm = minmax_norm(ent_scores) if args.normalize else None
    srs_norm = minmax_norm(srs_scores) if args.normalize else None

    # Select Top-K with optional disjointness
    ent_pick = ent_scores[: args.topk]
    if args.disjoint:
        ent_names = {n for n, _ in ent_pick}
        srs_filtered = [(n, s) for (n, s) in srs_scores if n not in ent_names]
        srs_pick = srs_filtered[: args.topk]
    else:
        srs_pick = srs_scores[: args.topk]

    # Output in your requested format
    print("\nfinal output:")
    print("entertainment - " + ", ".join([n for n, _ in ent_pick]))
    print("srs - " + ", ".join([n for n, _ in srs_pick]))

    if args.print_scores:
        print("\n--- raw cosine scores ---")
        print("entertainment:")
        for n, s in ent_pick:
            print(f"  {n}: {s:.6f}")
        print("srs:")
        for n, s in srs_pick:
            print(f"  {n}: {s:.6f}")

    if args.normalize and ent_norm and srs_norm:
        ent_norm_map = dict(ent_norm)
        srs_norm_map = dict(srs_norm)
        print("\n--- min-max normalized scores [0,1] ---")
        print("entertainment:")
        for n, _ in ent_pick:
            print(f"  {n}: {ent_norm_map.get(n, 0.0):.6f}")
        print("srs:")
        for n, _ in srs_pick:
            print(f"  {n}: {srs_norm_map.get(n, 0.0):.6f}")


if __name__ == "__main__":
    main()
