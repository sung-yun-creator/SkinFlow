import base64
from typing import Any


def build_privacy_masked_image(image_bytes: bytes, roi: dict | None = None) -> dict[str, Any] | None:
    if not roi or roi.get("status") != "ok" or not roi.get("face", {}).get("pixel"):
        return None

    try:
        import cv2
        import numpy as np
    except ImportError:
        return None

    encoded_image = np.frombuffer(image_bytes, np.uint8)
    bgr_image = cv2.imdecode(encoded_image, cv2.IMREAD_COLOR)

    if bgr_image is None:
        return None

    masked_image = bgr_image.copy()
    image_height, image_width = masked_image.shape[:2]
    eye_region = _build_eye_region(roi["face"]["pixel"], image_width, image_height)

    _mosaic_region(masked_image, eye_region)

    ok, output = cv2.imencode(".jpg", masked_image, [int(cv2.IMWRITE_JPEG_QUALITY), 90])

    if not ok:
        return None

    output_bytes = output.tobytes()

    return {
        "image_type": "privacy_masked",
        "content_type": "image/jpeg",
        "file_ext": "jpg",
        "byte_size": len(output_bytes),
        "data_base64": base64.b64encode(output_bytes).decode("ascii"),
        "masked_regions": [
            {
                "name": "eye_band",
                "pixel": eye_region,
            },
        ],
    }


def _build_eye_region(face: dict, image_width: int, image_height: int) -> dict:
    face_x = int(face["x"])
    face_y = int(face["y"])
    face_width = int(face["width"])
    face_height = int(face["height"])

    x = face_x + round(face_width * 0.12)
    y = face_y + round(face_height * 0.26)
    width = round(face_width * 0.76)
    height = max(1, round(face_height * 0.18))

    return _clamp_region(x, y, width, height, image_width, image_height)


def _clamp_region(x: int, y: int, width: int, height: int, image_width: int, image_height: int) -> dict:
    x1 = max(0, min(x, image_width - 1))
    y1 = max(0, min(y, image_height - 1))
    x2 = max(x1 + 1, min(x + width, image_width))
    y2 = max(y1 + 1, min(y + height, image_height))

    return {
        "x": x1,
        "y": y1,
        "width": x2 - x1,
        "height": y2 - y1,
    }


def _mosaic_region(image: Any, region: dict, block_size: int = 16) -> None:
    import cv2

    x = region["x"]
    y = region["y"]
    width = region["width"]
    height = region["height"]
    crop = image[y:y + height, x:x + width]

    if crop.size == 0:
        return

    small_width = max(1, width // block_size)
    small_height = max(1, height // block_size)
    small = cv2.resize(crop, (small_width, small_height), interpolation=cv2.INTER_LINEAR)
    mosaic = cv2.resize(small, (width, height), interpolation=cv2.INTER_NEAREST)
    image[y:y + height, x:x + width] = mosaic
