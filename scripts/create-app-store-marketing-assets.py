from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SCREENSHOTS = ROOT / "release" / "app-store" / "screenshots" / "iphone"
OUTPUT = ROOT / "release" / "app-store" / "creative-assets"
ICON = ROOT / "public" / "habitree-icon.png"

FONT_REGULAR = "/System/Library/Fonts/SFNS.ttf"
FONT_ROUNDED = "/System/Library/Fonts/SFNSRounded.ttf"
FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"

INK = "#181A18"
MUTED = "#62665F"
LEAF = "#168A61"
LEAF_DARK = "#07553C"
WARM = "#F4F2EB"
SURFACE = "#FCFBF7"


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size=size)


def add_soft_shapes(canvas: Image.Image, scale: float = 1.0) -> None:
    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    width, height = canvas.size
    draw.ellipse(
        (int(width * 0.47), int(-height * 0.18), int(width * 1.13), int(height * 1.2)),
        fill=(205, 246, 227, 220),
    )
    draw.ellipse(
        (int(width * 0.70), int(height * 0.06), int(width * 1.04), int(height * 0.64)),
        fill=(150, 226, 190, 90),
    )
    draw.ellipse(
        (int(-width * 0.12), int(height * 0.68), int(width * 0.32), int(height * 1.22)),
        fill=(224, 244, 228, 130),
    )
    overlay = overlay.filter(ImageFilter.GaussianBlur(int(55 * scale)))
    canvas.paste(overlay, (0, 0), overlay)


def rounded_image(image: Image.Image, size: tuple[int, int], radius: int) -> Image.Image:
    fitted = ImageOps.fit(image.convert("RGB"), size, method=Image.Resampling.LANCZOS)
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0], size[1]), radius=radius, fill=255)
    result = Image.new("RGBA", size, (0, 0, 0, 0))
    result.paste(fitted, (0, 0), mask)
    return result


def paste_with_shadow(
    canvas: Image.Image,
    image: Image.Image,
    position: tuple[int, int],
    shadow_radius: int,
    shadow_offset: tuple[int, int],
) -> None:
    alpha = image.getchannel("A")
    shadow = Image.new("RGBA", image.size, (19, 49, 38, 0))
    shadow.putalpha(alpha.point(lambda value: int(value * 0.22)))
    shadow = shadow.filter(ImageFilter.GaussianBlur(shadow_radius))
    canvas.paste(
        shadow,
        (position[0] + shadow_offset[0], position[1] + shadow_offset[1]),
        shadow,
    )
    canvas.paste(image, position, image)


def draw_pill(draw: ImageDraw.ImageDraw, x: int, y: int, label: str, scale: float) -> int:
    label_font = font(FONT_BOLD, int(45 * scale))
    bbox = draw.textbbox((0, 0), label, font=label_font)
    width = bbox[2] - bbox[0] + int(80 * scale)
    height = int(96 * scale)
    draw.rounded_rectangle((x, y, x + width, y + height), radius=height // 2, fill="#E2F5EA")
    draw.text((x + int(40 * scale), y + int(23 * scale)), label, font=label_font, fill=LEAF_DARK)
    return width


def build_asset(size: tuple[int, int], output_name: str, universal: bool = False) -> None:
    width, height = size
    scale = height / 2560
    canvas = Image.new("RGB", size, WARM)
    add_soft_shapes(canvas, scale)
    draw = ImageDraw.Draw(canvas)

    margin_x = int(250 * scale)
    icon_size = int(310 * scale)
    icon = rounded_image(Image.open(ICON), (icon_size, icon_size), int(76 * scale))
    paste_with_shadow(canvas, icon, (margin_x, int(250 * scale)), int(26 * scale), (0, int(18 * scale)))

    eyebrow = font(FONT_BOLD, int(54 * scale))
    heading = font(FONT_BOLD, int(174 * scale))
    body = font(FONT_REGULAR, int(62 * scale))
    draw.text((margin_x, int(650 * scale)), "HABITREE", font=eyebrow, fill=LEAF_DARK)
    draw.multiline_text(
        (margin_x, int(800 * scale)),
        "Small habits.\nA growing garden.",
        font=heading,
        fill=INK,
        spacing=int(25 * scale),
    )
    draw.multiline_text(
        (margin_x, int(1335 * scale)),
        "Build daily and weekly routines\nthat grow with you.",
        font=body,
        fill=MUTED,
        spacing=int(18 * scale),
    )

    pill_y = int(1725 * scale)
    pill_x = margin_x
    for label in ("Daily", "Weekly", "Private"):
        pill_x += draw_pill(draw, pill_x, pill_y, label, scale) + int(24 * scale)

    today = Image.open(SCREENSHOTS / "01-today-growing-streaks.png")
    garden = Image.open(SCREENSHOTS / "03-garden.png")
    if universal:
        phone_height = int(height * 0.91)
        phone_width = int(phone_height * today.width / today.height)
        back_x = int(width * 0.69)
        front_x = int(width * 0.56)
        y_back = int(height * 0.035)
        y_front = int(height * 0.095)
    else:
        phone_height = int(height * 0.90)
        phone_width = int(phone_height * today.width / today.height)
        back_x = int(width * 0.74)
        front_x = int(width * 0.59)
        y_back = int(height * 0.035)
        y_front = int(height * 0.095)

    garden_card = rounded_image(garden, (phone_width, phone_height), int(100 * scale))
    today_card = rounded_image(today, (phone_width, phone_height), int(100 * scale))
    paste_with_shadow(canvas, garden_card, (back_x, y_back), int(45 * scale), (0, int(24 * scale)))
    paste_with_shadow(canvas, today_card, (front_x, y_front), int(55 * scale), (0, int(28 * scale)))

    OUTPUT.mkdir(parents=True, exist_ok=True)
    canvas.save(OUTPUT / output_name, format="PNG", optimize=True)


if __name__ == "__main__":
    build_asset((3840, 2560), "habitree-search-results-3840x2560.png")
    build_asset((5244, 2950), "habitree-universal-header-search-5244x2950.png", universal=True)
