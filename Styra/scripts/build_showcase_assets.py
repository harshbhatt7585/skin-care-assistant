#!/usr/bin/env python3
"""
End-to-end showcase asset pipeline.

What it does:
1) Reads image URLs from a text file.
2) Downloads them to public/images/lookbook.
3) Removes background (rembg) and writes transparent PNG cutouts.
4) Optionally deletes original downloaded files.
5) Updates SHOWCASE_IMAGES in Landing.tsx automatically.
"""

from __future__ import annotations

import argparse
import io
import re
import sys
from pathlib import Path
from urllib.request import Request, urlopen

try:
    from PIL import Image
    from rembg import remove
except Exception:
    print(
        "Missing dependencies. Install with:\n"
        "  python -m pip install rembg onnxruntime pillow\n"
        "Or run scripts/run_showcase_pipeline.sh",
        file=sys.stderr,
    )
    raise


IMAGE_EXT_BY_CONTENT_TYPE = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


def read_urls(urls_file: Path) -> list[str]:
    urls: list[str] = []
    for raw in urls_file.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        urls.append(line)
    if not urls:
        raise ValueError(f"No URLs found in {urls_file}")
    return urls


def infer_download_ext(content_type: str | None, url: str) -> str:
    if content_type:
        normalized = content_type.split(";")[0].strip().lower()
        if normalized in IMAGE_EXT_BY_CONTENT_TYPE:
            return IMAGE_EXT_BY_CONTENT_TYPE[normalized]
    # Fallback for URLs without file extension.
    return ".jpg"


def download_image(url: str, out_path: Path) -> tuple[int, str]:
    req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urlopen(req, timeout=60) as response:
        content_type = response.headers.get("Content-Type", "")
        payload = response.read()
    out_path.write_bytes(payload)
    return len(payload), content_type


def create_cutout(input_path: Path, output_path: Path) -> None:
    src_bytes = input_path.read_bytes()
    out_bytes = remove(src_bytes)
    image = Image.open(io.BytesIO(out_bytes)).convert("RGBA")
    bbox = image.getbbox()
    if bbox:
        image = image.crop(bbox)
    image.save(output_path, format="PNG", optimize=True)


def update_showcase_constant(landing_file: Path, image_paths: list[str]) -> None:
    source = landing_file.read_text(encoding="utf-8")
    const_pattern = r"const SHOWCASE_IMAGES = \[(?:\n|.)*?\n\]"
    replacement = (
        "const SHOWCASE_IMAGES = [\n"
        + "".join(f"  '{path}',\n" for path in image_paths)
        + "]"
    )
    updated, count = re.subn(const_pattern, replacement, source, count=1)
    if count == 0:
        raise ValueError(f"Could not find SHOWCASE_IMAGES in {landing_file}")
    landing_file.write_text(updated, encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Build landing showcase cutout assets")
    parser.add_argument(
        "--urls-file",
        default="scripts/showcase_urls.txt",
        help="Text file containing one image URL per line",
    )
    parser.add_argument(
        "--out-dir",
        default="public/images/lookbook",
        help="Output directory for downloaded/cutout images",
    )
    parser.add_argument(
        "--landing-file",
        default="src/components/Landing/Landing.tsx",
        help="Landing component file containing SHOWCASE_IMAGES",
    )
    parser.add_argument(
        "--base-name",
        default="gshop",
        help="Base filename for generated assets",
    )
    parser.add_argument(
        "--keep-originals",
        action="store_true",
        help="Keep original downloaded images in output directory",
    )
    parser.add_argument(
        "--clean-output",
        action="store_true",
        help="Remove previous files matching <base-name>-* before generating new ones",
    )
    args = parser.parse_args()

    root = Path.cwd()
    urls_file = root / args.urls_file
    out_dir = root / args.out_dir
    landing_file = root / args.landing_file
    base_name = args.base_name

    urls = read_urls(urls_file)
    out_dir.mkdir(parents=True, exist_ok=True)

    if args.clean_output:
        for old in out_dir.glob(f"{base_name}-*"):
            old.unlink()

    showcase_paths: list[str] = []
    created_files: list[Path] = []
    for index, url in enumerate(urls, start=1):
        # Download original
        temp_path = out_dir / f"{base_name}-{index}.jpg"
        size_bytes, content_type = download_image(url, temp_path)
        ext = infer_download_ext(content_type, url)
        if ext != ".jpg":
            renamed = out_dir / f"{base_name}-{index}{ext}"
            temp_path.rename(renamed)
            temp_path = renamed

        # Remove background
        cutout_name = f"{base_name}-{index}-cutout.png"
        cutout_path = out_dir / cutout_name
        create_cutout(temp_path, cutout_path)
        created_files.append(cutout_path)
        showcase_paths.append(f"/images/lookbook/{cutout_name}")

        if not args.keep_originals:
            temp_path.unlink(missing_ok=True)

        print(
            f"[{index}/{len(urls)}] downloaded {size_bytes} bytes -> {cutout_path.name}"
        )

    update_showcase_constant(landing_file, showcase_paths)

    print("\nShowcase update complete:")
    print(f"- URLs source: {urls_file}")
    print(f"- Output dir: {out_dir}")
    print(f"- Landing file updated: {landing_file}")
    print(f"- Cutouts generated: {len(created_files)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
