#!/usr/bin/env python3
import os
import json
import time
import argparse
from pathlib import Path
from typing import Optional

from twelvelabs import TwelveLabs

VIDEO_EXTS = {".mp4", ".mov", ".mkv", ".webm", ".m4v", ".avi"}

def require_api_key() -> str:
    api_key = os.getenv("TWELVELABS_API_KEY")
    if not api_key:
        raise SystemExit(
            "Missing TWELVELABS_API_KEY. Set it first:\n"
            '  export TWELVELABS_API_KEY="YOUR_KEY"\n'
        )
    return api_key

def list_videos(root: Path) -> list[Path]:
    vids = [p for p in root.iterdir() if p.is_file() and p.suffix.lower() in VIDEO_EXTS]
    vids.sort()
    return vids

def safe_slug(name: str) -> str:
    keep = []
    for ch in name:
        if ch.isalnum() or ch in ("-", "_"):
            keep.append(ch)
        else:
            keep.append("_")
    return "".join(keep)

def wait_task_ready(client: TwelveLabs, task_id: str, poll_sec: int = 3, timeout_sec: int = 60 * 30):
    t0 = time.time()
    while True:
        task = client.tasks.retrieve(task_id)
        status = getattr(task, "status", None)
        print(f"  status={status}")
        if status == "ready":
            return task
        if status == "failed":
            # best-effort error detail
            err = getattr(task, "error", None)
            raise RuntimeError(f"Embedding task failed: {err}")
        if time.time() - t0 > timeout_sec:
            raise TimeoutError(f"Timed out waiting for task {task_id}")
        time.sleep(poll_sec)

def dump_jsonl(records, out_path: Path) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8") as f:
        for r in records:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".", help="Folder containing test videos (default: current folder)")
    ap.add_argument("--option", default="visual", choices=["visual", "audio"], help="Embedding option")
    ap.add_argument("--scope", default="asset", choices=["asset"], help="Embedding scope (keep 'asset' for now)")
    ap.add_argument("--limit", type=int, default=0, help="Process only first N videos (0 = all)")
    ap.add_argument("--overwrite", action="store_true", help="Overwrite existing embeddings")
    args = ap.parse_args()

    root = Path(args.root).expanduser().resolve()
    if not root.exists():
        raise SystemExit(f"Root not found: {root}")

    api_key = require_api_key()
    client = TwelveLabs(api_key=api_key)

    videos = list_videos(root)
    if args.limit and args.limit > 0:
        videos = videos[: args.limit]

    if not videos:
        raise SystemExit(f"No videos found under: {root}")

    emb_dir = root / "embeddings"
    emb_dir.mkdir(parents=True, exist_ok=True)

    print(f"Root: {root}")
    print(f"Found {len(videos)} video(s). Output: {emb_dir}")
    print(f"Embedding: scope={args.scope} option={args.option}")

    for i, vp in enumerate(videos, 1):
        stem = safe_slug(vp.stem)
        # If embeddings already exist, skip unless overwrite
        existing = list(emb_dir.glob(f"{stem}__*__{args.scope}__{args.option}.jsonl"))
        if existing and not args.overwrite:
            print(f"[SKIP] {vp.name} (embedding exists: {existing[0].name})")
            continue

        print(f"\n[{i}/{len(videos)}] Uploading: {vp.name}")

        try:
            with vp.open("rb") as f:
                asset = client.assets.create(method="direct", file=f)
            asset_id = getattr(asset, "id", None)
            if not asset_id:
                raise RuntimeError("Asset upload returned no id")
            print(f"asset.id={asset_id}")

            # Create embedding task (SDK 1.3 style)
            # This matches the approach that worked for you in embed_video_v2.py
            task = client.embed.task.create(
                asset_id=asset_id,
                options=[args.option],
                scope=args.scope,
            )
            task_id = getattr(task, "id", None)
            if not task_id:
                raise RuntimeError("Embed task returned no id")
            print(f"embed_task.id={task_id}")

            task = wait_task_ready(client, task_id)

            # Fetch results
            # Depending on SDK response, embeddings may be available via task.result or a download endpoint.
            # The following is the common pattern: task.result is a list of embedding items.
            result = getattr(task, "result", None)
            if result is None:
                # fallback: try retrieve again and read 'result'
                task = client.tasks.retrieve(task_id)
                result = getattr(task, "result", None)

            if result is None:
                raise RuntimeError("Task is ready but no result found on task object.")

            out_path = emb_dir / f"{stem}__{asset_id}__{args.scope}__{args.option}.jsonl"

            # Normalize result to JSONL records
            records = []
            # result might be a list of objects; convert via model_dump if present
            if isinstance(result, list):
                for item in result:
                    if hasattr(item, "model_dump"):
                        records.append(item.model_dump())
                    elif isinstance(item, dict):
                        records.append(item)
                    else:
                        # best-effort
                        records.append({"value": item})
            else:
                # single object/dict
                if hasattr(result, "model_dump"):
                    records = [result.model_dump()]
                elif isinstance(result, dict):
                    records = [result]
                else:
                    records = [{"value": result}]

            dump_jsonl(records, out_path)
            print(f"[OK] Saved -> {out_path}")

        except Exception as e:
            print(f"[FAIL] {vp}: {e}")

if __name__ == "__main__":
    main()
