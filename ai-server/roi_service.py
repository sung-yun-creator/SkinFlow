import os
from pathlib import Path
from typing import Any


DEFAULT_MODEL_PATH = Path(__file__).resolve().parent / "models" / "face_landmarker.task"
MODEL_PATH = Path(os.getenv("FACE_LANDMARKER_MODEL_PATH", DEFAULT_MODEL_PATH))

_LANDMARKER: Any | None = None

MIN_BRIGHTNESS = 45
MAX_BRIGHTNESS = 215
MIN_CONTRAST = 18
MAX_GLARE_RATIO = 0.12
MIN_BLUR_VARIANCE = 35
MIN_FACE_AREA_RATIO = 0.08
FACE_EDGE_MARGIN = 0.02


def extract_roi(image_bytes: bytes) -> dict:
    image_data = _load_image(image_bytes)
    if image_data["status"] != "ok":
        return image_data

    quality_status = _check_image_quality_with_retry(image_data["array"])
    if quality_status["status"] != "ok":
        return {
            **quality_status,
            "image": image_data["image"],
        }

    model_status = _get_landmarker()
    if model_status["status"] != "ok":
        return {
            "status": model_status["status"],
            "message": model_status["message"],
            "image": image_data["image"],
        }

    landmark_result = _detect_face_landmarks(image_data["array"], model_status, retry_on_error=True)
    if landmark_result["status"] != "ok":
        return {
            **landmark_result,
            "image": image_data["image"],
        }

    result = landmark_result["result"]

    if not result.face_landmarks:
        return {
            "status": "no_face",
            "message": "No face was detected in the image.",
            "image": image_data["image"],
        }

    landmarks = result.face_landmarks[0]
    face_box = _build_face_box(landmarks, image_data["image"]["width"], image_data["image"]["height"])
    face_quality_status = _check_face_quality_with_retry(image_data["array"], face_box)
    if face_quality_status["status"] != "ok":
        return {
            **face_quality_status,
            "image": image_data["image"],
            "face": face_box,
            "landmark_count": len(landmarks),
        }

    return {
        "status": "ok",
        "source": "mediapipe_face_landmarker",
        "model_path": str(MODEL_PATH),
        "image": image_data["image"],
        "face": face_box,
        "regions": _build_skin_regions(face_box, image_data["image"]["width"], image_data["image"]["height"]),
        "landmark_count": len(landmarks),
    }


def _load_image(image_bytes: bytes) -> dict:
    try:
        import cv2
        import numpy as np
    except ImportError as error:
        return {
            "status": "dependency_missing",
            "message": "OpenCV and numpy are required for ROI extraction.",
            "detail": str(error),
        }

    try:
        encoded_image = np.frombuffer(image_bytes, np.uint8)
        bgr_image = cv2.imdecode(encoded_image, cv2.IMREAD_COLOR)

        if bgr_image is None:
            return {
                "status": "invalid_image",
                "message": "The uploaded file is not a valid image.",
            }

        rgb_image = cv2.cvtColor(bgr_image, cv2.COLOR_BGR2RGB)
        height, width = rgb_image.shape[:2]

        return {
            "status": "ok",
            "array": rgb_image,
            "image": {
                "width": width,
                "height": height,
                "byte_size": len(image_bytes),
            },
        }
    except Exception as error:
        return {
            "status": "invalid_image",
            "message": "The uploaded file is not a valid image.",
            "detail": str(error),
        }


def _check_image_quality(rgb_image: Any) -> dict:
    import cv2
    import numpy as np

    gray_image = cv2.cvtColor(rgb_image, cv2.COLOR_RGB2GRAY)
    brightness = float(np.mean(gray_image))
    contrast = float(np.std(gray_image))
    glare_ratio = float(np.mean(gray_image >= 245))

    metrics = _quality_metrics(brightness, contrast, glare_ratio)

    if brightness < MIN_BRIGHTNESS:
        return {
            "status": "too_dark",
            "message": "The image is too dark. Please take the photo in a brighter place.",
            "quality": metrics,
        }

    if brightness > MAX_BRIGHTNESS:
        return {
            "status": "too_bright",
            "message": "The image is too bright. Please avoid strong direct light.",
            "quality": metrics,
        }

    if contrast < MIN_CONTRAST:
        return {
            "status": "low_contrast",
            "message": "The image has low contrast. Please use more even lighting.",
            "quality": metrics,
        }

    if glare_ratio > MAX_GLARE_RATIO:
        return {
            "status": "glare",
            "message": "Strong reflected light was detected. Please reduce glare and try again.",
            "quality": metrics,
        }

    return {
        "status": "ok",
        "quality": metrics,
    }


def _check_image_quality_with_retry(rgb_image: Any) -> dict:
    try:
        return _check_image_quality(rgb_image)
    except Exception as error:
        try:
            return _check_image_quality(rgb_image)
        except Exception as retry_error:
            return _quality_check_failed("image_quality", retry_error or error)


def _check_face_quality(rgb_image: Any, face_box: dict) -> dict:
    import cv2
    import numpy as np

    normalized = face_box["normalized"]
    face_area_ratio = normalized["width"] * normalized["height"]

    if face_area_ratio < MIN_FACE_AREA_RATIO:
        return {
            "status": "face_too_small",
            "message": "The face is too small in the image. Please move closer to the camera.",
            "quality": {
                "face_area_ratio": round(face_area_ratio, 4),
            },
        }

    if _is_face_near_edge(normalized):
        return {
            "status": "face_cutoff",
            "message": "The face is too close to the edge. Please center your face and try again.",
            "quality": {
                "face_area_ratio": round(face_area_ratio, 4),
            },
        }

    face_crop = _crop_face(rgb_image, face_box)
    if face_crop.size == 0:
        return {
            "status": "face_cutoff",
            "message": "The face area could not be checked. Please use a clearer centered photo.",
        }

    gray_face = cv2.cvtColor(face_crop, cv2.COLOR_RGB2GRAY)
    blur_variance = float(cv2.Laplacian(gray_face, cv2.CV_64F).var())
    face_glare_ratio = float(np.mean(gray_face >= 245))

    if blur_variance < MIN_BLUR_VARIANCE:
        return {
            "status": "blurry",
            "message": "The face area is blurry. Please hold the camera steady and try again.",
            "quality": {
                "blur_variance": round(blur_variance, 2),
                "face_glare_ratio": round(face_glare_ratio, 4),
                "face_area_ratio": round(face_area_ratio, 4),
            },
        }

    if face_glare_ratio > MAX_GLARE_RATIO:
        return {
            "status": "glare",
            "message": "Strong reflected light was detected on the face. Please reduce glare and try again.",
            "quality": {
                "blur_variance": round(blur_variance, 2),
                "face_glare_ratio": round(face_glare_ratio, 4),
                "face_area_ratio": round(face_area_ratio, 4),
            },
        }

    return {
        "status": "ok",
        "quality": {
            "blur_variance": round(blur_variance, 2),
            "face_glare_ratio": round(face_glare_ratio, 4),
            "face_area_ratio": round(face_area_ratio, 4),
        },
    }


def _check_face_quality_with_retry(rgb_image: Any, face_box: dict) -> dict:
    try:
        return _check_face_quality(rgb_image, face_box)
    except Exception as error:
        try:
            return _check_face_quality(rgb_image, face_box)
        except Exception as retry_error:
            return _quality_check_failed("face_quality", retry_error or error)


def _quality_check_failed(stage: str, error: Exception) -> dict:
    return {
        "status": "quality_check_failed",
        "message": "Image quality check failed after retry. Please try again.",
        "detail": str(error),
        "stage": stage,
        "retryable": True,
    }


def _detect_face_landmarks(rgb_image: Any, model_status: dict, retry_on_error: bool = True) -> dict:
    try:
        return {
            "status": "ok",
            "result": _run_face_landmarker(rgb_image, model_status),
        }
    except Exception as error:
        if not retry_on_error:
            return _landmark_retry_failed(error)

    _reset_landmarker()
    retry_model_status = _get_landmarker()
    if retry_model_status["status"] != "ok":
        return {
            "status": retry_model_status["status"],
            "message": retry_model_status["message"],
            "retryable": True,
        }

    try:
        return {
            "status": "ok",
            "result": _run_face_landmarker(rgb_image, retry_model_status),
            "retried": True,
        }
    except Exception as retry_error:
        return _landmark_retry_failed(retry_error)


def _run_face_landmarker(rgb_image: Any, model_status: dict) -> Any:
    mp = model_status["mediapipe"]
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_image)

    return model_status["landmarker"].detect(mp_image)


def _landmark_retry_failed(error: Exception) -> dict:
    return {
        "status": "landmark_retry_failed",
        "message": "Face landmark analysis failed after retry. Please try again.",
        "detail": str(error),
        "retryable": True,
    }


def _reset_landmarker() -> None:
    global _LANDMARKER
    _LANDMARKER = None


def _quality_metrics(brightness: float, contrast: float, glare_ratio: float) -> dict:
    return {
        "brightness": round(brightness, 2),
        "contrast": round(contrast, 2),
        "glare_ratio": round(glare_ratio, 4),
    }


def _crop_face(rgb_image: Any, face_box: dict) -> Any:
    pixel = face_box["pixel"]
    image_height, image_width = rgb_image.shape[:2]

    x1 = max(0, pixel["x"])
    y1 = max(0, pixel["y"])
    x2 = min(image_width, pixel["x"] + pixel["width"])
    y2 = min(image_height, pixel["y"] + pixel["height"])

    return rgb_image[y1:y2, x1:x2]


def _is_face_near_edge(normalized: dict) -> bool:
    right = normalized["x"] + normalized["width"]
    bottom = normalized["y"] + normalized["height"]

    return (
        normalized["x"] <= FACE_EDGE_MARGIN
        or normalized["y"] <= FACE_EDGE_MARGIN
        or right >= 1 - FACE_EDGE_MARGIN
        or bottom >= 1 - FACE_EDGE_MARGIN
    )


def _get_landmarker() -> dict:
    global _LANDMARKER

    if not MODEL_PATH.exists():
        return {
            "status": "model_missing",
            "message": "Face Landmarker model file is missing.",
        }

    try:
        import mediapipe as mp
    except ImportError as error:
        return {
            "status": "dependency_missing",
            "message": "mediapipe is required for ROI extraction.",
            "detail": str(error),
        }

    if _LANDMARKER is None:
        base_options = mp.tasks.BaseOptions(model_asset_path=str(MODEL_PATH))
        options = mp.tasks.vision.FaceLandmarkerOptions(
            base_options=base_options,
            running_mode=mp.tasks.vision.RunningMode.IMAGE,
            num_faces=1,
        )
        _LANDMARKER = mp.tasks.vision.FaceLandmarker.create_from_options(options)

    return {
        "status": "ok",
        "mediapipe": mp,
        "landmarker": _LANDMARKER,
    }


def _build_face_box(landmarks: list, image_width: int, image_height: int) -> dict:
    min_x = _clamp(min(landmark.x for landmark in landmarks))
    min_y = _clamp(min(landmark.y for landmark in landmarks))
    max_x = _clamp(max(landmark.x for landmark in landmarks))
    max_y = _clamp(max(landmark.y for landmark in landmarks))

    return _to_region("face", min_x, min_y, max_x - min_x, max_y - min_y, image_width, image_height)


def _build_skin_regions(face_box: dict, image_width: int, image_height: int) -> list[dict]:
    x = face_box["normalized"]["x"]
    y = face_box["normalized"]["y"]
    width = face_box["normalized"]["width"]
    height = face_box["normalized"]["height"]

    region_specs = [
        ("forehead", x + width * 0.22, y + height * 0.03, width * 0.56, height * 0.22),
        ("left_cheek", x + width * 0.08, y + height * 0.38, width * 0.28, height * 0.26),
        ("right_cheek", x + width * 0.64, y + height * 0.38, width * 0.28, height * 0.26),
        ("nose", x + width * 0.39, y + height * 0.34, width * 0.22, height * 0.32),
        ("chin", x + width * 0.34, y + height * 0.74, width * 0.32, height * 0.18),
    ]

    return [_to_region(name, rx, ry, rw, rh, image_width, image_height) for name, rx, ry, rw, rh in region_specs]


def _to_region(name: str, x: float, y: float, width: float, height: float, image_width: int, image_height: int) -> dict:
    x = _clamp(x)
    y = _clamp(y)
    width = min(width, 1 - x)
    height = min(height, 1 - y)

    return {
        "name": name,
        "normalized": {
            "x": round(x, 6),
            "y": round(y, 6),
            "width": round(width, 6),
            "height": round(height, 6),
        },
        "pixel": {
            "x": round(x * image_width),
            "y": round(y * image_height),
            "width": round(width * image_width),
            "height": round(height * image_height),
        },
    }


def _clamp(value: float) -> float:
    return max(0.0, min(1.0, value))
