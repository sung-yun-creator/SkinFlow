import io
import os
from pathlib import Path
from typing import Any

try:
    import torch
    import torch.nn as nn
    from PIL import Image
    from torchvision import models, transforms
except ImportError as import_error:
    torch = None
    nn = None
    Image = None
    models = None
    transforms = None
    DEPENDENCY_ERROR = import_error
else:
    DEPENDENCY_ERROR = None


BASE_DIR = Path(__file__).resolve().parent
DEFAULT_MODEL_PATH = BASE_DIR / "models" / "skinflow_resnet18_v2_normalized_best.pth"
MODEL_PATH = Path(os.getenv("SKIN_MODEL_PATH", DEFAULT_MODEL_PATH))

PIGMENTATION_MAX = 341.0
WRINKLE_MAX = 6.0

_model = None
_device = None
_transform = None


def _build_model():
    model = models.resnet18(weights=None)
    num_features = model.fc.in_features
    model.fc = nn.Linear(num_features, 2)
    return model


def _get_transform():
    return transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225],
        ),
    ])


def _load_model():
    global _model, _device, _transform

    if _model is not None:
        return _model, _device, _transform

    if DEPENDENCY_ERROR is not None:
        return None, None, None

    if not MODEL_PATH.exists():
        return None, None, None

    _device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    _transform = _get_transform()

    model = _build_model()
    state_dict = torch.load(MODEL_PATH, map_location=_device)
    model.load_state_dict(state_dict)
    model.to(_device)
    model.eval()

    _model = model
    return _model, _device, _transform


def _to_bounded_ratio(value: float) -> float:
    return max(0.0, min(float(value), 1.0))


def _to_metric_score(normalized_problem_value: float) -> int:
    score = round((1 - normalized_problem_value) * 100)
    return max(0, min(int(score), 100))


def _calculate_total_score(pigmentation_score: int, wrinkle_score: int) -> int:
    score = round((pigmentation_score * 0.6) + (wrinkle_score * 0.4))
    return max(0, min(int(score), 100))


def _get_status(score: int) -> str:
    if score >= 80:
        return "good"
    if score >= 60:
        return "caution"
    return "risk"


def _get_status_name(status_code: str) -> str:
    status_names = {
        "good": "양호",
        "caution": "주의",
        "risk": "위험",
    }
    return status_names.get(status_code, "주의")


def _not_ready_response(status: str, message: str, roi: dict | None = None) -> dict[str, Any]:
    return {
        "status": status,
        "message": message,
        "roi": roi,
        "result": None,
    }


def predict_skin_condition(image_bytes: bytes, roi: dict | None = None) -> dict[str, Any]:
    if DEPENDENCY_ERROR is not None:
        return _not_ready_response(
            "dependency_missing",
            f"Skin model dependency is missing: {DEPENDENCY_ERROR.name}",
            roi,
        )

    if not MODEL_PATH.exists():
        return _not_ready_response(
            "model_missing",
            f"Skin model file was not found: {MODEL_PATH}",
            roi,
        )

    model, device, transform = _load_model()

    if model is None:
        return _not_ready_response(
            "model_unavailable",
            "Skin model could not be loaded.",
            roi,
        )

    try:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception:
        return _not_ready_response(
            "invalid_image",
            "Uploaded file could not be read as an image.",
            roi,
        )

    input_tensor = transform(image).unsqueeze(0).to(device)

    with torch.no_grad():
        output = model(input_tensor).squeeze(0).cpu()

    pigmentation_norm = _to_bounded_ratio(output[0].item())
    wrinkle_norm = _to_bounded_ratio(output[1].item())

    pigmentation_value = pigmentation_norm * PIGMENTATION_MAX
    wrinkle_value = wrinkle_norm * WRINKLE_MAX

    pigmentation_score = _to_metric_score(pigmentation_norm)
    wrinkle_score = _to_metric_score(wrinkle_norm)
    total_score = _calculate_total_score(pigmentation_score, wrinkle_score)
    status_code = _get_status(total_score)
    status_name = _get_status_name(status_code)

    return {
        "status": "ok",
        "roi": roi,
        "result": {
            "total_score": total_score,
            "skin_score": total_score,
            "skin_status": status_code,
            "skin_status_name": status_name,
            "pigmentation_score": pigmentation_score,
            "wrinkle_score": wrinkle_score,
            "pigmentation": {
                "normalized": round(pigmentation_norm, 4),
                "value": round(pigmentation_value, 2),
                "max": PIGMENTATION_MAX,
                "score": pigmentation_score,
            },
            "wrinkle": {
                "normalized": round(wrinkle_norm, 4),
                "value": round(wrinkle_value, 2),
                "max": WRINKLE_MAX,
                "score": wrinkle_score,
            },
            "summary": (
                f"{status_name} 상태입니다. "
                "색소침착과 주름 지표를 기준으로 산출한 결과입니다."
            ),
        },
    }
