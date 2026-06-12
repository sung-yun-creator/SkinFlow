import io
from pathlib import Path

import torch
import torch.nn as nn
from PIL import Image
from torchvision import models, transforms


# =========================
# 설정
# =========================

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "models" / "skinflow_resnet18_v2_normalized_best.pth"

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

PIGMENTATION_MAX = 341.0
WRINKLE_MAX = 6.0


# =========================
# 전처리
# =========================

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])


# =========================
# 모델 생성
# =========================

def build_model():
    model = models.resnet18(weights=None)
    num_features = model.fc.in_features
    model.fc = nn.Linear(num_features, 2)
    return model


model = build_model()
model.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE))
model.to(DEVICE)
model.eval()


# =========================
# 점수/등급 변환
# =========================

def get_status(score: int) -> str:
    if score >= 80:
        return "양호"
    elif score >= 60:
        return "주의"
    return "심각"


def calculate_skin_score(pigmentation_value: float, wrinkle_value: float) -> int:
    pigmentation_ratio = min(pigmentation_value / PIGMENTATION_MAX, 1.0)
    wrinkle_ratio = min(wrinkle_value / WRINKLE_MAX, 1.0)

    problem_ratio = (pigmentation_ratio * 0.6) + (wrinkle_ratio * 0.4)
    score = int(round((1 - problem_ratio) * 100))

    return max(0, min(score, 100))


# =========================
# 예측 함수
# =========================

def predict_skin_condition(image_bytes: bytes, roi: dict | None = None) -> dict:
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

    input_tensor = transform(image).unsqueeze(0).to(DEVICE)

    with torch.no_grad():
        output = model(input_tensor).squeeze(0).cpu()

    pigmentation_norm = float(output[0].item())
    wrinkle_norm = float(output[1].item())

    pigmentation_norm = max(0.0, min(pigmentation_norm, 1.0))
    wrinkle_norm = max(0.0, min(wrinkle_norm, 1.0))

    pigmentation_value = pigmentation_norm * PIGMENTATION_MAX
    wrinkle_value = wrinkle_norm * WRINKLE_MAX

    skin_score = calculate_skin_score(pigmentation_value, wrinkle_value)
    status = get_status(skin_score)

    return {
        "status": "success",
        "roi": roi,
        "result": {
            "pigmentation": {
                "normalized": round(pigmentation_norm, 4),
                "value": round(pigmentation_value, 2),
                "max": PIGMENTATION_MAX,
            },
            "wrinkle": {
                "normalized": round(wrinkle_norm, 4),
                "value": round(wrinkle_value, 2),
                "max": WRINKLE_MAX,
            },
            "skin_score": skin_score,
            "skin_status": status,
        }
    }
