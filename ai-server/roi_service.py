import os
from pathlib import Path
from typing import Any


DEFAULT_MODEL_PATH = Path(__file__).resolve().parent / "models" / "face_landmarker.task"
MODEL_PATH = Path(os.getenv("FACE_LANDMARKER_MODEL_PATH", DEFAULT_MODEL_PATH))

_LANDMARKER: Any | None = None


def extract_roi(image_bytes: bytes) -> dict:
    image_data = _load_image(image_bytes)
    if image_data["status"] != "ok":
        return image_data

    model_status = _get_landmarker()
    if model_status["status"] != "ok":
        return {
            "status": model_status["status"],
            "message": model_status["message"],
            "image": image_data["image"],
        }

    try:
        mp = model_status["mediapipe"]
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_data["array"])
        result = model_status["landmarker"].detect(mp_image)
    except Exception as error:
        return {
            "status": "failed",
            "message": "Face landmark detection failed.",
            "detail": str(error),
            "image": image_data["image"],
        }

    if not result.face_landmarks:
        return {
            "status": "no_face",
            "message": "No face was detected in the image.",
            "image": image_data["image"],
        }

    landmarks = result.face_landmarks[0]
    face_box = _build_face_box(landmarks, image_data["image"]["width"], image_data["image"]["height"])

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
