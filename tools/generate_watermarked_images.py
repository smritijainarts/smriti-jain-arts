"""Optimize product photos and create website-ready watermarked copies."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
IMAGES_DIR = ROOT / "images"
FONT_PATH = Path(r"C:\Windows\Fonts\arialbd.ttf")
WATERMARK_TEXT = "Smriti Jain Arts"
# "incoming" is the local holding area for new, unsorted camera photos.
# It is intentionally excluded until the photos have been grouped into a product folder.
SKIPPED_FOLDERS = {"005-clutcher-holder", "incoming"}
SOURCE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
# 1400px keeps product photos crisp in the zoomed product dialog while
# substantially reducing download size and repository storage.
MAX_WEBSITE_EDGE = 1400
THUMBNAIL_EDGE = 600
SOURCE_JPEG_QUALITY = 80


def source_images(folder: Path) -> list[Path]:
    return sorted(
        path
        for path in folder.iterdir()
        if path.is_file()
        and path.name != "thumbnail.webp"
        and path.suffix.lower() in SOURCE_EXTENSIONS
    )


def optimize_source(source: Path) -> tuple[bool, int]:
    """Resize an oversized source once, preserving its filename and format."""
    original_bytes = source.stat().st_size
    temporary = source.with_name(f".{source.stem}.optimizing{source.suffix}")

    with Image.open(source) as image:
        corrected = ImageOps.exif_transpose(image)
        if max(corrected.size) <= MAX_WEBSITE_EDGE:
            return False, 0

        optimized = corrected.copy()
        optimized.thumbnail(
            (MAX_WEBSITE_EDGE, MAX_WEBSITE_EDGE), Image.Resampling.LANCZOS
        )

        suffix = source.suffix.lower()
        if suffix in {".jpg", ".jpeg"}:
            optimized.convert("RGB").save(
                temporary,
                "JPEG",
                quality=SOURCE_JPEG_QUALITY,
                optimize=True,
                progressive=True,
            )
        elif suffix == ".webp":
            optimized.save(temporary, "WEBP", quality=84, method=6)
        else:
            optimized.save(temporary, "PNG", optimize=True)
        optimized.close()

    temporary.replace(source)
    return True, max(0, original_bytes - source.stat().st_size)


def fitted_font(image_width: int, image_height: int) -> ImageFont.FreeTypeFont:
    # Keep the watermark present but subordinate to the artwork.
    target_width = image_width * 0.52
    initial_size = max(22, int(min(image_width, image_height) * 0.085))
    font = ImageFont.truetype(str(FONT_PATH), initial_size)
    text_width = font.getlength(WATERMARK_TEXT)
    fitted_size = max(24, int(initial_size * target_width / max(text_width, 1)))
    fitted_size = min(fitted_size, int(min(image_width, image_height) * 0.11))
    return ImageFont.truetype(str(FONT_PATH), fitted_size)


def add_watermark(image: Image.Image) -> Image.Image:
    base = ImageOps.exif_transpose(image).convert("RGBA")
    base.thumbnail((MAX_WEBSITE_EDGE, MAX_WEBSITE_EDGE), Image.Resampling.LANCZOS)
    font = fitted_font(*base.size)
    stroke_width = max(1, int(font.size * 0.035))

    measure = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    bounds = measure.textbbox(
        (0, 0), WATERMARK_TEXT, font=font, stroke_width=stroke_width
    )
    padding = max(10, int(font.size * 0.14))
    text_width = bounds[2] - bounds[0]
    text_height = bounds[3] - bounds[1]
    label = Image.new(
        "RGBA", (text_width + padding * 2, text_height + padding * 2), (0, 0, 0, 0)
    )
    draw = ImageDraw.Draw(label)
    draw.text(
        (padding - bounds[0], padding - bounds[1]),
        WATERMARK_TEXT,
        font=font,
        fill=(255, 255, 255, 76),
        stroke_width=stroke_width,
        stroke_fill=(35, 25, 35, 58),
    )

    rotated = label.rotate(20, expand=True, resample=Image.Resampling.BICUBIC)
    left = int((base.width - rotated.width) / 2)
    top = int(base.height * 0.60 - rotated.height / 2)
    base.alpha_composite(rotated, (left, top))
    return base.convert("RGB")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Prepare all product photos, or only the named product folders."
    )
    parser.add_argument(
        "folders",
        nargs="*",
        help="Optional product-folder names under images/ to process.",
    )
    arguments = parser.parse_args()

    if not FONT_PATH.exists():
        raise FileNotFoundError(f"Watermark font not found: {FONT_PATH}")

    generated = 0
    thumbnails = 0
    optimized_sources = 0
    source_bytes_saved = 0
    output_bytes = 0

    all_folders = {path.name: path for path in IMAGES_DIR.iterdir() if path.is_dir()}
    unknown_folders = [name for name in arguments.folders if name not in all_folders]
    if unknown_folders:
        raise FileNotFoundError(
            "Unknown product folder(s): " + ", ".join(unknown_folders)
        )

    folders_to_process = (
        [all_folders[name] for name in arguments.folders]
        if arguments.folders
        else sorted(all_folders.values())
    )

    for folder in folders_to_process:
        if folder.name in SKIPPED_FOLDERS:
            continue

        output_dir = folder / "watermarked"
        output_dir.mkdir(exist_ok=True)
        primary_output: Path | None = None

        sources = source_images(folder)
        for source in sources:
            optimized, bytes_saved = optimize_source(source)
            if optimized:
                optimized_sources += 1
                source_bytes_saved += bytes_saved

        for source in sources:
            output = output_dir / f"{source.stem}.webp"
            temporary_output = output_dir / f".{source.stem}.watermarking.webp"
            with Image.open(source) as image:
                watermarked = add_watermark(image)
                watermarked.save(temporary_output, "WEBP", quality=78, method=6)
            temporary_output.replace(output)
            generated += 1
            output_bytes += output.stat().st_size
            if source.stem.endswith("-1"):
                primary_output = output

        if primary_output:
            thumbnail_output = folder / "thumbnail.webp"
            temporary_thumbnail = folder / ".thumbnail.watermarking.webp"
            with Image.open(primary_output) as primary:
                thumbnail = primary.convert("RGB")
                thumbnail.thumbnail(
                    (THUMBNAIL_EDGE, THUMBNAIL_EDGE), Image.Resampling.LANCZOS
                )
                thumbnail.save(temporary_thumbnail, "WEBP", quality=74, method=6)
            temporary_thumbnail.replace(thumbnail_output)
            thumbnails += 1

    print(
        f"OPTIMIZED_SOURCES={optimized_sources} "
        f"SOURCE_MB_SAVED={source_bytes_saved / 1048576:.1f} "
        f"WATERMARKED={generated} THUMBNAILS={thumbnails} "
        f"WATERMARKED_MB={output_bytes / 1048576:.1f}"
    )


if __name__ == "__main__":
    main()
