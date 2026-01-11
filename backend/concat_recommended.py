#!/usr/bin/env python3
"""
concat_recommended.py

Create 2 merged videos (entertainment + serious) by concatenating the selected clips.

Example:
  python concat_recommended.py \
    --root ./testvid \
    --ent "videofull (2),videofull (5),videofull (1)" \
    --srs "videofull (9),videofull (3),videofull (4)" \
    --outdir ./testvid/merged \
    --fps 30

Notes:
- Uses ffmpeg. Install it if missing (brew install ffmpeg).
- Re-encodes for robustness (handles different codecs/resolutions).
"""

import argparse
import os
import shlex
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import List


def run(cmd: List[str]) -> None:
    p = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    if p.returncode != 0:
        print(p.stdout)
        raise RuntimeError(f"Command failed: {' '.join(shlex.quote(c) for c in cmd)}")
    # uncomment for debugging:
    # print(p.stdout)


def which_or_die(bin_name: str) -> str:
    from shutil import which
    p = which(bin_name)
    if not p:
        raise RuntimeError(
            f"{bin_name} not found in PATH. Install it first (e.g., `brew install {bin_name}`)."
        )
    return p


def parse_csv_list(s: str) -> List[str]:
    # Accept comma-separated; preserve internal spaces/parentheses.
    items = [x.strip() for x in s.split(",") if x.strip()]
    if not items:
        raise ValueError("Empty list provided.")
    return items


def find_video_by_stem(root: Path, stem: str) -> Path:
    # Match exact stem first, then fallback to case-insensitive.
    candidates = list(root.glob("*.mp4"))
    for p in candidates:
        if p.stem == stem:
            return p
    for p in candidates:
        if p.stem.lower() == stem.lower():
            return p
    raise FileNotFoundError(f"Could not find .mp4 for stem={stem!r} under {root}")


def make_concat_file(paths: List[Path]) -> Path:
    # ffmpeg concat demuxer wants:
    # file '/abs/path1'
    # file '/abs/path2'
    tf = tempfile.NamedTemporaryFile("w", delete=False, suffix=".txt", encoding="utf-8")
    out_path = Path(tf.name)
    try:
        for p in paths:
            tf.write(f"file {p.resolve().as_posix()!r}\n")
        tf.flush()
    finally:
        tf.close()
    return out_path


def concat_videos(paths: List[Path], out_path: Path, fps: int = 30) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)

    # Robust concat: use concat demuxer + re-encode to a consistent format.
    # -safe 0 allows absolute paths.
    # -vf scale=... keeps original size but makes sure dimensions are even (required by some encoders).
    # If your inputs are different resolutions, consider forcing a fixed scale here.
    concat_list = make_concat_file(paths)
    try:
        cmd = [
            "ffmpeg",
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(concat_list),
            "-r",
            str(fps),
            "-c:v",
            "libx264",
            "-preset",
            "fast",
            "-crf",
            "18",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            str(out_path),
        ]
        run(cmd)
    finally:
        try:
            concat_list.unlink()
        except Exception:
            pass


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", required=True, help="Folder containing the .mp4 clips (e.g., ./testvid)")
    ap.add_argument("--ent", required=True, help="Comma-separated stems for entertainment (no .mp4)")
    ap.add_argument("--srs", required=True, help="Comma-separated stems for serious (no .mp4)")
    ap.add_argument("--outdir", default=None, help="Output folder (default: <root>/merged)")
    ap.add_argument("--fps", type=int, default=30, help="Output FPS (default: 30)")
    args = ap.parse_args()

    which_or_die("ffmpeg")

    root = Path(args.root).expanduser().resolve()
    if not root.exists():
        raise FileNotFoundError(f"--root not found: {root}")

    outdir = Path(args.outdir).expanduser().resolve() if args.outdir else (root / "merged")
    outdir.mkdir(parents=True, exist_ok=True)

    ent_stems = parse_csv_list(args.ent)
    srs_stems = parse_csv_list(args.srs)

    ent_paths = [find_video_by_stem(root, s) for s in ent_stems]
    srs_paths = [find_video_by_stem(root, s) for s in srs_stems]

    ent_out = outdir / "entertainment.mp4"
    srs_out = outdir / "serious.mp4"

    print("Entertainment clips (in order):")
    for p in ent_paths:
        print(f"  - {p.name}")
    print(f"-> Writing: {ent_out}")
    concat_videos(ent_paths, ent_out, fps=args.fps)

    print("\nSerious clips (in order):")
    for p in srs_paths:
        print(f"  - {p.name}")
    print(f"-> Writing: {srs_out}")
    concat_videos(srs_paths, srs_out, fps=args.fps)

    print("\nDone.")
    print(f"Entertainment: {ent_out}")
    print(f"Serious:       {srs_out}")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"[ERROR] {e}", file=sys.stderr)
        sys.exit(1)
