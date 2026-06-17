from fastapi import FastAPI, File, UploadFile

from privacy_image_service import build_privacy_masked_image
from roi_service import extract_roi_with_retry
from skin_model_service import predict_skin_condition

app = FastAPI(title="SkinFlow AI Server")


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "ai-server"}


@app.post("/analyze-skin")
async def analyze_skin(file: UploadFile = File(...)):
    image_bytes = await file.read()
    roi = extract_roi_with_retry(image_bytes)
    prediction = predict_skin_condition(image_bytes, roi)
    privacy_image = build_privacy_masked_image(image_bytes, roi)

    return {
        "filename": file.filename,
        "content_type": file.content_type,
        "roi": roi,
        "prediction": prediction,
        "privacy_image": privacy_image,
    }


@app.post("/extract-roi")
async def extract_skin_roi(file: UploadFile = File(...)):
    image_bytes = await file.read()
    roi = extract_roi_with_retry(image_bytes)

    return {
        "filename": file.filename,
        "content_type": file.content_type,
        "roi": roi,
    }
