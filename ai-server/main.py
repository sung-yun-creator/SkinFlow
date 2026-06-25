from fastapi import FastAPI, File, HTTPException, UploadFile
from pydantic import BaseModel

from chatbot_search_service import (
    ChatbotSearchUnavailable,
    get_chatbot_search_status,
    search_chatbot_knowledge,
)
from privacy_image_service import build_privacy_masked_image
from roi_service import extract_roi_with_retry
from skin_model_service import predict_skin_condition

app = FastAPI(title="SkinFlow AI Server")


class ChatbotSearchRequest(BaseModel):
    query: str
    top_k: int = 5


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "ai-server",
        "chatbot": get_chatbot_search_status(),
    }


@app.get("/chatbot/health")
def chatbot_health_check():
    return get_chatbot_search_status()


@app.post("/chatbot/search")
def search_chatbot(request: ChatbotSearchRequest):
    query = request.query.strip()

    if not query:
        raise HTTPException(status_code=400, detail="query is required")

    try:
        results = search_chatbot_knowledge(query, request.top_k)
    except ChatbotSearchUnavailable as error:
        raise HTTPException(status_code=503, detail=str(error)) from error

    return {
        "success": True,
        "query": query,
        "results": results,
    }


@app.post("/analyze-skin")
async def analyze_skin(file: UploadFile = File(...)):
    image_bytes = await file.read()
    roi = extract_roi_with_retry(image_bytes)
    if roi.get("status") != "ok":
        prediction = {
            "status": "roi_required",
            "message": roi.get("message") or "ROI를 추출하지 못했습니다. 얼굴이 잘 보이는 사진으로 다시 시도해 주세요.",
            "retryable": roi.get("retryable", True),
            "roi": roi,
            "result": None,
        }
    else:
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
