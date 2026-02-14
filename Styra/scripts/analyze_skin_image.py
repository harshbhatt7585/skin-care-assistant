"""Utility script to inspect pigmentation and acne-like bumps on a face photo."""

from __future__ import annotations

import argparse
import os
from pathlib import Path
from typing import Tuple

import numpy as np
from skimage import (
    color,
    exposure,
    filters,
    io,
    measure,
    morphology,
    segmentation,
    util,
)


MPL_CACHE = Path(__file__).resolve().parent / ".matplotlib-cache"
os.environ.setdefault("MPLCONFIGDIR", str(MPL_CACHE))
MPL_CACHE.mkdir(parents=True, exist_ok=True)

import matplotlib.pyplot as plt  # noqa: E402 needs MPLCONFIGDIR set before import


def load_image(path: Path) -> np.ndarray:
    """Load an image as float RGB."""
    image = io.imread(path)
    if image.ndim == 2:
        image = color.gray2rgb(image)
    elif image.shape[-1] == 4:
        image = color.rgba2rgb(image)
    return util.img_as_float(image)


def compute_pigmentation_heatmap(rgb: np.ndarray) -> np.ndarray:
    """Compute a redness-focused heatmap using the LAB *a* channel."""
    lab = color.rgb2lab(rgb)
    a_channel = lab[..., 1]
    rescaled = exposure.rescale_intensity(
        a_channel,
        in_range=(np.percentile(a_channel, 2), np.percentile(a_channel, 98)),
        out_range=(0, 1),
    )
    return filters.gaussian(rescaled, sigma=2)


def segment_red_bumps(rgb: np.ndarray, heatmap: np.ndarray) -> np.ndarray:
    """Use color and morphological cues to segment inflamed red bumps."""
    hsv = color.rgb2hsv(rgb)
    hue, saturation, value = hsv[..., 0], hsv[..., 1], hsv[..., 2]

    red_mask = ((hue < 0.04) | (hue > 0.96)) & (saturation > 0.25) & (value > 0.2)

    lab = color.rgb2lab(rgb)
    redness = exposure.rescale_intensity(
        lab[..., 1], in_range="image", out_range=(0, 1)
    )
    adaptive_threshold = (
        np.percentile(redness[red_mask], 60)
        if np.any(red_mask)
        else np.percentile(redness, 70)
    )

    enhanced = (redness > adaptive_threshold) | (heatmap > np.percentile(heatmap, 75))
    mask = red_mask & enhanced

    mask = morphology.binary_opening(mask, morphology.disk(2))
    mask = morphology.binary_closing(mask, morphology.disk(3))
    mask = morphology.remove_small_objects(mask, min_size=60)
    mask = morphology.remove_small_holes(mask, area_threshold=100)
    return mask


def summarize_regions(mask: np.ndarray) -> Tuple[int, float]:
    """Return the number of regions and coverage percentage."""
    labeled = measure.label(mask)
    props = measure.regionprops(labeled)
    coverage = float(mask.sum() / mask.size * 100)
    return len(props), coverage


def visualize(
    rgb: np.ndarray, heatmap: np.ndarray, mask: np.ndarray, output_dir: Path
) -> None:
    """Save visualization assets for inspection."""
    output_dir.mkdir(parents=True, exist_ok=True)

    fig, axes = plt.subplots(1, 3, figsize=(15, 5))
    axes[0].imshow(rgb)
    axes[0].set_title("Original Image")
    axes[0].axis("off")

    im = axes[1].imshow(heatmap, cmap="inferno")
    axes[1].set_title("Pigmentation Heatmap")
    axes[1].axis("off")
    fig.colorbar(im, ax=axes[1], fraction=0.046, pad=0.04)

    overlay = segmentation.mark_boundaries(
        rgb, mask, color=(1, 0.05, 0.05), mode="thick"
    )
    axes[2].imshow(overlay)
    axes[2].imshow(np.ma.masked_where(~mask, mask), cmap="Reds", alpha=0.35)
    axes[2].set_title("Segmented Red Bumps")
    axes[2].axis("off")

    fig.tight_layout()
    figure_path = output_dir / "skin_analysis.png"
    fig.savefig(figure_path, dpi=200)
    plt.close(fig)

    mask_path = output_dir / "segmented_mask.png"
    io.imsave(mask_path, util.img_as_ubyte(mask))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Analyze pigmentation and acne-like bumps on an image"
    )
    parser.add_argument(
        "--image",
        type=Path,
        default=Path("inputs/image.png"),
        help="Path to the image to analyze (default: inputs/image.png)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("test_outputs/skin_analysis"),
        help="Folder to store the generated visualizations",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    rgb = load_image(args.image)
    print(f"Loaded image {args.image} with shape {rgb.shape}")

    heatmap = compute_pigmentation_heatmap(rgb)
    mask = segment_red_bumps(rgb, heatmap)
    region_count, coverage = summarize_regions(mask)

    print(
        f"Detected {region_count} clustered regions covering {coverage:.2f}% of the face"
    )
    visualize(rgb, heatmap, mask, args.output)
    print(f"Saved visualization to {args.output / 'skin_analysis.png'}")
    print(f"Saved binary segmentation mask to {args.output / 'segmented_mask.png'}")


if __name__ == "__main__":
    main()
