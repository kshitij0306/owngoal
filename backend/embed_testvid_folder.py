import argparse
import json
import os
import time
from pathlib import Path

from twelvelabs import TwelveLabs


def get_embed_tasks_client(client: TwelveLabs):
    """
    SDK may expose:
      - client.embed.v_2.tasks
      - client.embed.v2.tasks
    This helper finds the right object.
    """
    embed = getattr(client, "embed", None)
    if embed is None:
        raise RuntimeError("TwelveLabs client has no .embed attribute. Check SDK install.")

    v2 = getattr(embed, "v_2", None) or getattr(embed, "v2", None)
    if v2 is None:
        # Some SDKs expose tasks directly under embed, but usually it's v2.
        tasks = getattr(embed, "tasks", None)
    else:
        tasks = getattr(v2, "tasks", None)

    if tasks is None or not hasattr(tasks, "create") or not hasattr(tasks, "retrieve"):
        raise RuntimeError(
            "Could not locate embed tasks client. Expected client.embed.v_2.tasks (or client.embed.v2.tasks)."
        )
    return tasks


def list_videos(root: Path):
    exts = {".mp4", ".mov", ".mkv", ".webm", ".m4v"}
    return sorted([p for p in root.rglob("*") if p.is_file() and p.suffix.lower() in exts])


def save_embeddings_jsonl(out_path: Path, asset_id: str, task_result) -> int:
    """
    task_result should be the final task object with task_result.data list.
    Writes one JSON line per embedding record.
    Returns number of records written.
    """
    out_path.parent.mkdir(parents=True, exist_ok=True)

    # Defensive: handle either attribute-style or dict-style
    data = getattr(task_result, "data", None)
    if data is None:
        raise RuntimeError("Task result has no .data. Cannot extract embeddings.")

    n = 0
    with out_path.open("w", encoding="utf-8") as f:
        for row in data:
            # row could be a pydantic model or dict-like
            item = row.model_dump() if hasattr(row, "model_dump") else dict(row)
            item["asset_id"] = asset_id
            f.write(json.dumps(item) + "\n")
            n += 1
    return n


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", required=True, help="Folder containing videos (recursive).")
    ap.add_argument("--option", default="visual", choices=["visual", "audio", "transcription"])
    ap.add_argument("--scope", default="asset", choices=["asset", "clip"])
    ap.add_argument("--model", default="marengo3.0")
    ap.add_argument("--outdir", default="embeddings", help="Output folder name created under --root")
    ap.add_argument("--poll", type=float, default=2.0, help="Polling interval seconds")
    ap.add_argument("--limit", type=int, default=0, help="Process at most N videos (0 = all)")
    args = ap.parse_args()

    api_key = os.getenv("TWELVELABS_API_KEY")
    if not api_key:
        raise RuntimeError("TWELVELABS_API_KEY is not set in the environment.")

    root = Path(args.root).expanduser().resolve()
    if not root.exists():
        raise RuntimeError(f"Root does not exist: {root}")

    out_root = root / args.outdir
    out_root.mkdir(parents=True, exist_ok=True)

    client = TwelveLabs(api_key=api_key)
    tasks_client = get_embed_tasks_client(client)

    videos = list_videos(root)
    if args.limit and args.limit > 0:
        videos = videos[: args.limit]

    if not videos:
        print(f"No videos found under: {root}")
        return

    print(f"Root: {root}")
    print(f"Found {len(videos)} video(s). Output: {out_root}")
    print(f"Embedding: scope={args.scope} option={args.option} model={args.model}")

    processed = skipped = failed = 0

    for i, video_path in enumerate(videos, 1):
        rel = video_path.relative_to(root)
        # Mirror relative structure under embeddings/
        out_path = out_root / rel.with_suffix("").name
        out_file = out_path.with_suffix(".jsonl")

        if out_file.exists():
            print(f"[SKIP {i}/{len(videos)}] Already exists: {out_file}")
            skipped += 1
            continue

        print(f"\n[{i}/{len(videos)}] Uploading: {rel}")
        try:
            with video_path.open("rb") as f:
                asset = client.assets.create(method="direct", file=f)
            asset_id = getattr(asset, "id", None)
            if not asset_id:
                raise RuntimeError("Asset upload returned no id.")
            print(f"asset.id={asset_id}")

            # Create async embedding task (v2)
            task = tasks_client.create(
                input_type="video",
                model_name=args.model,
                video={
                    "media_source": {"asset_id": asset_id},
                    "embedding_option": [args.option],
                    "embedding_scope": [args.scope],
                },
            )
            task_id = getattr(task, "id", None)
            if not task_id:
                raise RuntimeError("Embed task creation returned no id.")
            print(f"embed_task.id={task_id}")

            # Poll
            while True:
                t = tasks_client.retrieve(task_id=task_id)
                status = getattr(t, "status", None)
                print(f"  status={status}")
                if status == "ready":
                    task_final = t
                    break
                if status == "failed":
                    err = getattr(t, "error", None)
                    raise RuntimeError(f"Embedding failed: {err}")
                time.sleep(args.poll)

            n = save_embeddings_jsonl(out_file, asset_id=asset_id, task_result=task_final)
            print(f"Saved JSONL -> {out_file} (records={n})")
            processed += 1

        except Exception as e:
            failed += 1
            print(f"[FAIL] {video_path}: {e}")

    print(f"\nDone. processed={processed} skipped={skipped} failed={failed}")


if __name__ == "__main__":
    main()
