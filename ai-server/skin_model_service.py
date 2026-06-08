def predict_skin_condition(image_bytes: bytes, roi: dict | None = None) -> dict:
    return {
        "status": "pending",
        "message": "Skin model is not connected yet.",
        "roi": roi,
        "result": None,
    }
