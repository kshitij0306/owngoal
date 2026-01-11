"""
Batch crop multi-cam regions from each MP4 in ./raw_footage and:
  1) write cropped full-length MP4s per cam
  2) split each cropped cam video into 5-second segments

Requirements:
  - ffmpeg + ffprobe installed and on PATH
Run:
  python crop_and_segment.py
"""

import os
import sys
import shutil
import subprocess
from pathlib import Path

RAW_DIR = Path("raw_footage")
OUT_DIR = Path("processed")

# Normalized crop boxes from your spec: (x, y, w, h)
CROPS = {
    "cam4":  (0.00, 0.00, 0.25, 0.25),  # 4 CAM (row 1, col 1)
    "cam2":  (0.25, 0.00, 0.25, 0.25),  # 2 CAM (row 1, col 2)
    "cam5":  (0.50, 0.00, 0.25, 0.25),  # 5 CAM (row 1, col 3)
    "cam11": (0.75, 0.00, 0.25, 0.25),  # 11 CAM (row 1, col 4)
    "arep":  (0.00, 0.25, 0.25, 0.25),  # A REP (row 2, col 1)
    "brep":  (0.25, 0.25, 0.25, 0.25),  # B REP (row 2, col 2)
}

SEGMENT_SECONDS = 5


def require_tool(name: str) -> None:
    if shutil.which(name) is None:
        print(f"ERROR: '{name}' not found on PATH. Install ffmpeg and try again.")
        sys.exit(1)


def run(cmd: list[str]) -> None:
    # Print for traceability
    print(" ".join(cmd))
    subprocess.run(cmd, check=True)


def crop_filter(x: float, y: float, w: float, h: float) -> str:
    # Use ffmpeg expressions in terms of input width/height (iw/ih)
    return f"crop=iw*{w}:ih*{h}:iw*{x}:ih*{y}"


def process_video(video_path: Path) -> None:
    stem = video_path.stem
    video_out_root = OUT_DIR / stem
    video_out_root.mkdir(parents=True, exist_ok=True)

    for cam_name, (x, y, w, h) in CROPS.items():
        cam_dir = video_out_root / cam_name
        seg_dir = cam_dir / "segments"
        cam_dir.mkdir(parents=True, exist_ok=True)
        seg_dir.mkdir(parents=True, exist_ok=True)

        # 1) Write full cropped cam video
        cropped_full = cam_dir / f"{stem}_{cam_name}.mp4"
        vf = crop_filter(x, y, w, h)

        # Re-encode to H.264 for broad compatibility; preserve audio if present.
        # -movflags +faststart makes MP4 web-friendly.
        run([
            "ffmpeg", "-y",
            "-i", str(video_path),
            "-vf", vf,
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "18",
            "-c:a", "aac", "-b:a", "128k",
            "-movflags", "+faststart",
            str(cropped_full),
        ])

        # 2) Segment cropped cam video into 5-second chunks
        # Use stream copy for speed since we just encoded it.
        # reset_timestamps=1 makes each segment start at 0.
        seg_pattern = seg_dir / f"{stem}_{cam_name}_%05d.mp4"
        run([
            "ffmpeg", "-y",
            "-i", str(cropped_full),
            "-c", "copy",
            "-f", "segment",
            "-segment_time", str(SEGMENT_SECONDS),
            "-reset_timestamps", "1",
            str(seg_pattern),
        ])

    print(f"Done: {video_path.name} -> {video_out_root}")


def main() -> None:
    require_tool("ffmpeg")
    require_tool("ffprobe")

    if not RAW_DIR.exists() or not RAW_DIR.is_dir():
        print(f"ERROR: folder not found: {RAW_DIR.resolve()}")
        sys.exit(1)

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    mp4s = sorted(RAW_DIR.glob("*.mp4"))
    if not mp4s:
        print(f"ERROR: no .mp4 files found in {RAW_DIR.resolve()}")
        sys.exit(1)

    for vp in mp4s:
        try:
            process_video(vp)
        except subprocess.CalledProcessError as e:
            print(f"ERROR processing {vp.name}: {e}")
            sys.exit(1)

    print("All videos processed.")


if __name__ == "__main__":
    main()