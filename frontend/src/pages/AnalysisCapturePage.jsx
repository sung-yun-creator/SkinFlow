import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  Camera,
  CheckCircle2,
  ImagePlus,
  Lightbulb,
  Loader2,
  ScanFace,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Upload,
} from "lucide-react";
import PageLayout from "../components/layout/PageLayout";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import Badge from "../components/common/Badge";
import { extractRoi } from "../api/analysisApi";


const ANALYSIS_PROGRESS_KEY = "skinflow_analysis_progress";
const ANALYSIS_PROGRESS_EVENT = "skinflow-analysis-progress";

function saveAnalysisProgress(progress) {
  const progressPayload = {
    updatedAt: new Date().toISOString(),
    path: "/analysis/loading",
    ...progress,
  };

  localStorage.setItem(ANALYSIS_PROGRESS_KEY, JSON.stringify(progressPayload));
  window.dispatchEvent(new Event(ANALYSIS_PROGRESS_EVENT));
}

function getProgressFromRoiResult(roiResult) {
  const status = roiResult?.status || roiResult?.roi?.status || roiResult?.result?.status;

  if (!status || status === "ok") {
    return {
      status: "roi_complete",
      label: "ROI 확인 완료",
      description: "얼굴 관심 영역을 확인했습니다. 결과 UI 미리보기로 이어집니다.",
      progress: 45,
    };
  }

  if (status === "model_missing") {
    return {
      status: "model_missing",
      label: "ROI 모델 확인 필요",
      description: "AI 서버 모델 파일 확인이 필요합니다. 요청 흐름은 전달되었습니다.",
      progress: 20,
    };
  }

  if (status === "no_face") {
    return {
      status: "failed",
      label: "얼굴 미검출",
      description: "이미지에서 얼굴을 찾지 못했습니다. 다른 사진으로 다시 시도해주세요.",
      progress: 10,
    };
  }

  return {
    status: "analysis_waiting",
    label: "ROI 확인 필요",
    description: "얼굴 관심 영역 확인 결과를 검토해야 합니다.",
    progress: 20,
  };
}

const allowedImageTypes = ["image/jpeg", "image/png"];

const uploadGuideItems = [
  {
    title: "정면 얼굴",
    description: "얼굴이 중앙에 오고 이마와 양볼이 잘 보이는 사진을 권장합니다.",
  },
  {
    title: "밝은 조명",
    description: "강한 역광이나 너무 어두운 환경은 피해주세요.",
  },
  {
    title: "가림 요소 제거",
    description: "마스크, 손, 머리카락 등 얼굴을 가리는 요소를 줄여주세요.",
  },
];

const flowSteps = [
  {
    title: "사진 선택",
    description: "스마트폰으로 촬영한 얼굴 이미지를 업로드합니다.",
  },
  {
    title: "ROI 확인",
    description: "AI 분석에 필요한 얼굴 관심 영역을 확인합니다.",
  },
  {
    title: "결과 연결",
    description: "색소침착·주름 결과와 추천 가이드를 이어서 확인합니다.",
  },
];

function getFileSizeLabel(file) {
  if (!file?.size) return "";

  const sizeInMb = file.size / 1024 / 1024;

  if (sizeInMb >= 1) {
    return `${sizeInMb.toFixed(1)}MB`;
  }

  return `${Math.max(1, Math.round(file.size / 1024))}KB`;
}

function AnalysisCapturePage() {
  const navigate = useNavigate();

  const [selectedMethod, setSelectedMethod] = useState("upload");
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLoggedIn = Boolean(localStorage.getItem("skinflow_token"));

  const previewUrl = useMemo(() => {
    if (!selectedFile) return "";
    return URL.createObjectURL(selectedFile);
  }, [selectedFile]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const selectedMethodLabel = selectedMethod === "webcam" ? "웹캠 촬영" : "이미지 업로드";
  const fileSizeLabel = getFileSizeLabel(selectedFile);

  const handleSelectWebcam = () => {
    setSelectedMethod("webcam");
    setUploadError("");
  };

  const handleSelectUpload = () => {
    setSelectedMethod("upload");
    setUploadError("");
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    setSelectedMethod("upload");

    if (!file) {
      setSelectedFile(null);
      setSelectedFileName("");
      setUploadError("분석에 사용할 이미지 파일을 선택해주세요.");
      return;
    }

    if (!allowedImageTypes.includes(file.type)) {
      setSelectedFile(null);
      setSelectedFileName("");
      setUploadError("JPG 또는 PNG 형식의 이미지만 업로드할 수 있습니다.");
      event.target.value = "";
      return;
    }

    setSelectedFile(file);
    setSelectedFileName(file.name);
    setUploadError("");
  };

  const handleStartAnalysis = async () => {
    if (isSubmitting) return;

    if (!isLoggedIn) {
      navigate("/login");
      return;
    }

    if (selectedMethod === "upload" && !selectedFile) {
      setUploadError("이미지 파일을 먼저 선택해주세요.");
      return;
    }

    if (selectedMethod === "webcam") {
      saveAnalysisProgress({
        status: "roi_pending",
        label: "웹캠 입력 확인 대기",
        description: "웹캠 촬영 방식은 보조 기능입니다. 현재는 입력 방식 확인 단계입니다.",
        progress: 20,
      });

      navigate("/analysis/loading", {
        state: {
          analysisInput: {
            method: "webcam",
          },
        },
      });
      return;
    }

    try {
      setIsSubmitting(true);
      setUploadError("");

      saveAnalysisProgress({
        status: "roi_processing",
        label: "얼굴 영역 확인 중",
        description: `${selectedFile.name} 파일의 얼굴 관심 영역을 확인하고 있습니다.`,
        progress: 20,
      });

      const roiResponse = await extractRoi(selectedFile);
      const roiResult = roiResponse?.result || null;

      saveAnalysisProgress(getProgressFromRoiResult(roiResult));

      navigate("/analysis/loading", {
        state: {
          analysisInput: {
            method: "upload",
            fileName: selectedFile.name,
            roiResult,
          },
        },
      });
    } catch (error) {
      const rawMessage = error.message || "";
      const fallbackMessage =
        "이미지 분석 요청을 처리하지 못했습니다. 백엔드 서버와 AI 서버 실행 상태를 확인한 뒤 다시 시도해주세요.";

      const message =
        rawMessage === "Failed to fetch" ||
        rawMessage.includes("NetworkError") ||
        rawMessage.includes("ERR_CONNECTION")
          ? fallbackMessage
          : rawMessage || fallbackMessage;

      saveAnalysisProgress({
        status: "failed",
        label: "분석 요청 확인 필요",
        description: "분석 요청 처리 중 문제가 발생했습니다. 서버 실행 상태를 확인해주세요.",
        progress: 0,
      });

      setUploadError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageLayout>
      <style>
        {`
          .sf-capture-page {
            display: grid;
            gap: 16px;
          }

          .sf-capture-hero {
            display: grid;
            grid-template-columns: minmax(0, 0.86fr) minmax(420px, 1.14fr);
            gap: 18px;
            align-items: stretch;
          }

          .sf-capture-intro,
          .sf-capture-upload-card,
          .sf-capture-flow-card,
          .sf-capture-guide-card {
            border: 1px solid rgba(226, 232, 240, 0.92);
            background: rgba(255, 255, 255, 0.96);
            box-shadow: 0 18px 46px rgba(15, 23, 42, 0.07);
          }

          .sf-capture-intro {
            position: relative;
            overflow: hidden;
            min-height: 0;
            padding: 28px 30px;
          }

          .sf-capture-intro::after {
            content: "";
            position: absolute;
            right: -90px;
            bottom: -90px;
            width: 220px;
            height: 220px;
            border-radius: 999px;
            background: radial-gradient(circle, rgba(22, 125, 127, 0.13), transparent 68%);
          }

          .sf-capture-intro-content {
            position: relative;
            z-index: 1;
            display: flex;
            flex-direction: column;
            height: 100%;
          }

          .sf-capture-intro h1 {
            margin: 16px 0 12px;
            color: #0f172a;
            font-size: clamp(32px, 4.2vw, 48px);
            line-height: 1.08;
            letter-spacing: -0.07em;
          }

          .sf-capture-intro p {
            max-width: 540px;
            margin: 0;
            color: #64748b;
            font-size: 15px;
            line-height: 1.7;
            word-break: keep-all;
          }

          .sf-capture-methods {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
            margin-top: 22px;
          }

          .sf-method-card {
            display: grid;
            grid-template-columns: 48px 1fr;
            gap: 13px;
            align-items: center;
            min-height: 76px;
            padding: 13px;
            border-radius: 22px;
            border: 1px solid rgba(226, 232, 240, 0.92);
            background: #f8fafc;
            cursor: pointer;
            transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
            text-align: left;
          }

          .sf-method-card:hover,
          .sf-method-card.is-active {
            transform: translateY(-2px);
            border-color: rgba(22, 125, 127, 0.28);
            background: #ffffff;
            box-shadow: 0 16px 36px rgba(15, 23, 42, 0.075);
          }

          .sf-method-copy {
            min-width: 0;
          }

          .sf-method-copy strong {
            display: block;
            color: #0f172a;
            font-size: 14px;
            letter-spacing: -0.035em;
          }

          .sf-method-copy small {
            display: block;
            margin-top: 4px;
            color: #64748b;
            font-size: 12px;
            line-height: 1.45;
            font-weight: 750;
            word-break: keep-all;
          }

          .sf-icon-tile {
            width: 44px;
            height: 44px;
            min-width: 44px;
            min-height: 44px;
            border-radius: 17px;
            display: grid !important;
            place-items: center !important;
            color: #167d7f;
            background: linear-gradient(135deg, #f2fbfb 0%, #ffffff 52%, #fff1f4 100%);
            border: 1px solid rgba(226, 232, 240, 0.9);
            box-shadow: 0 10px 24px rgba(15, 23, 42, 0.055);
          }

          .sf-icon-tile svg {
            display: block;
            width: 19px !important;
            height: 19px !important;
            min-width: 19px;
            min-height: 19px;
            margin: 0;
            stroke-width: 2.15;
          }

          .sf-capture-note {
            display: grid;
            gap: 8px;
            margin-top: 24px;
            padding-top: 0;
          }

          .sf-note-row {
            display: flex;
            gap: 10px;
            align-items: flex-start;
            color: #475569;
            font-size: 13px;
            line-height: 1.6;
          }

          .sf-note-row svg {
            flex: 0 0 auto;
            margin-top: 2px;
            color: #167d7f;
          }

          .sf-capture-upload-card {
            padding: 24px;
          }

          .sf-upload-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 16px;
            margin-bottom: 12px;
          }

          .sf-card-label {
            display: block;
            color: #64748b;
            font-size: 12px;
            font-weight: 950;
          }

          .sf-upload-top h2,
          .sf-capture-flow-card h2,
          .sf-capture-guide-card h2 {
            margin: 6px 0 0;
            color: #0f172a;
            font-size: 21px;
            line-height: 1.25;
            letter-spacing: -0.045em;
          }

          .sf-status-pill {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            min-width: 78px;
            justify-content: center;
            padding: 8px 12px;
            border-radius: 999px;
            color: #167d7f;
            background: rgba(22, 125, 127, 0.1);
            font-size: 12px;
            font-weight: 950;
            white-space: nowrap;
          }

          .sf-status-pill.is-locked {
            color: #f43f5e;
            background: rgba(244, 63, 94, 0.1);
          }

          .sf-upload-zone {
            position: relative;
            display: grid;
            place-items: center;
            min-height: 220px;
            overflow: hidden;
            border-radius: 28px;
            border: 1px dashed rgba(22, 125, 127, 0.35);
            background:
              radial-gradient(circle at 80% 10%, rgba(22, 125, 127, 0.12), transparent 32%),
              radial-gradient(circle at 18% 82%, rgba(244, 63, 94, 0.10), transparent 30%),
              #f8fafc;
            cursor: pointer;
            transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
          }

          .sf-upload-zone:hover {
            transform: translateY(-1px);
            border-color: rgba(22, 125, 127, 0.55);
            box-shadow: inset 0 0 0 1px rgba(22, 125, 127, 0.08), 0 16px 34px rgba(15, 23, 42, 0.06);
          }

          .sf-upload-zone input {
            position: absolute;
            inset: 0;
            opacity: 0;
            cursor: pointer;
          }

          .sf-upload-empty {
            display: grid;
            justify-items: center;
            gap: 10px;
            padding: 20px;
            text-align: center;
          }

          .sf-upload-empty h3 {
            margin: 0;
            color: #0f172a;
            font-size: 20px;
            letter-spacing: -0.04em;
          }

          .sf-upload-empty p {
            max-width: 360px;
            margin: 0;
            color: #64748b;
            font-size: 14px;
            line-height: 1.65;
          }

          .sf-upload-icon-large {
            width: 58px;
            height: 58px;
            border-radius: 24px;
            display: grid;
            place-items: center;
            color: #167d7f;
            background: linear-gradient(135deg, #effafa, #ffffff 52%, #fff1f4);
            border: 1px solid rgba(226, 232, 240, 0.95);
            box-shadow: 0 18px 38px rgba(15, 23, 42, 0.08);
          }

          .sf-upload-preview {
            position: relative;
            width: 100%;
            min-height: 220px;
          }

          .sf-upload-preview img {
            width: 100%;
            height: 220px;
            object-fit: cover;
            display: block;
          }

          .sf-preview-overlay {
            position: absolute;
            left: 16px;
            right: 16px;
            bottom: 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 14px;
            padding: 14px 16px;
            border-radius: 20px;
            background: rgba(255, 255, 255, 0.92);
            backdrop-filter: blur(16px);
            box-shadow: 0 16px 34px rgba(15, 23, 42, 0.12);
          }

          .sf-preview-overlay strong {
            display: block;
            max-width: 280px;
            overflow: hidden;
            color: #0f172a;
            font-size: 14px;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .sf-preview-overlay span {
            display: block;
            margin-top: 3px;
            color: #64748b;
            font-size: 12px;
            font-weight: 800;
          }

          .sf-upload-meta {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 10px;
            margin: 12px 0 14px;
          }

          .sf-meta-card {
            padding: 11px;
            border-radius: 18px;
            border: 1px solid rgba(226, 232, 240, 0.9);
            background: #f8fafc;
          }

          .sf-meta-card span {
            display: block;
            color: #64748b;
            font-size: 11px;
            font-weight: 950;
          }

          .sf-meta-card strong {
            display: block;
            margin-top: 5px;
            overflow: hidden;
            color: #0f172a;
            font-size: 13px;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .sf-capture-error {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            margin-bottom: 12px;
            padding: 13px 14px;
            border-radius: 18px;
            color: #be123c;
            background: rgba(244, 63, 94, 0.08);
            font-size: 13px;
            font-weight: 750;
            line-height: 1.48;
          }

          .sf-capture-error svg {
            flex: 0 0 auto;
            margin-top: 1px;
          }

          .sf-upload-actions {
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 10px;
            align-items: center;
          }

          .sf-capture-bottom {
            display: grid;
            grid-template-columns: minmax(0, 0.9fr) minmax(420px, 1.1fr);
            gap: 16px;
            align-items: start !important;
          }

          .sf-capture-flow-card,
          .sf-capture-guide-card {
            padding: 18px;
          }

          .sf-capture-flow-card {
            align-self: start !important;
            height: auto !important;
            min-height: 0 !important;
          }

          .sf-capture-guide-card {
            align-self: start;
          }

          .sf-bottom-title-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 12px;
            margin-bottom: 12px;
          }

          .sf-flow-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 12px;
          }

          .sf-flow-card {
            min-height: 118px;
            padding: 13px;
            border-radius: 20px;
            border: 1px solid rgba(226, 232, 240, 0.9);
            background:
              radial-gradient(circle at 100% 0%, rgba(22, 125, 127, 0.06), transparent 38%),
              #f8fafc;
          }

          .sf-flow-head {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 10px;
            margin-bottom: 10px;
          }

          .sf-flow-index {
            color: #cbd5e1;
            font-size: 12px;
            font-weight: 950;
          }

          .sf-flow-card strong {
            display: block;
            color: #0f172a;
            font-size: 15px;
            letter-spacing: -0.035em;
          }

          .sf-flow-card p {
            margin: 6px 0 0;
            color: #64748b;
            font-size: 11.5px;
            line-height: 1.44;
            word-break: keep-all;
          }

          .sf-flow-card .sf-icon-tile {
            width: 42px;
            height: 42px;
            min-width: 42px;
            min-height: 42px;
            border-radius: 15px;
          }

          .sf-flow-card .sf-icon-tile svg {
            width: 18px !important;
            height: 18px !important;
            min-width: 18px;
            min-height: 18px;
          }

          .sf-guide-list {
            display: grid;
            gap: 8px;
          }

          .sf-guide-row {
            display: grid;
            grid-template-columns: 40px 1fr;
            gap: 11px;
            align-items: center;
            min-height: 66px;
            padding: 10px;
            border-radius: 18px;
            border: 1px solid rgba(226, 232, 240, 0.9);
            background: #f8fafc;
          }

          .sf-guide-row .sf-icon-tile {
            width: 36px;
            height: 36px;
            min-width: 36px;
            min-height: 36px;
            border-radius: 14px;
            display: grid !important;
            place-items: center !important;
          }

          .sf-guide-row .sf-icon-tile svg {
            width: 17px !important;
            height: 17px !important;
            min-width: 17px;
            min-height: 17px;
          }

          .sf-guide-row strong {
            display: block;
            color: #0f172a;
            font-size: 13.5px;
            letter-spacing: -0.03em;
          }

          .sf-guide-row span {
            display: block;
            margin-top: 3px;
            color: #64748b;
            font-size: 11.5px;
            line-height: 1.42;
            word-break: keep-all;
          }

          @media (max-width: 1060px) {
            .sf-capture-hero,
            .sf-capture-bottom {
              grid-template-columns: 1fr;
            }

            .sf-capture-intro {
              min-height: auto;
            }

            .sf-capture-note {
              margin-top: 24px;
            }
          }

          @media (max-width: 720px) {
            .sf-capture-intro,
            .sf-capture-upload-card,
            .sf-capture-flow-card,
            .sf-capture-guide-card {
              padding: 20px;
            }

            .sf-capture-intro h1 {
              font-size: 34px;
            }

            .sf-capture-methods,
            .sf-upload-meta,
            .sf-flow-grid {
              grid-template-columns: 1fr;
            }

            .sf-upload-zone,
            .sf-upload-preview,
            .sf-upload-preview img {
              min-height: 210px;
              height: 210px;
            }

            .sf-upload-actions {
              grid-template-columns: 1fr;
            }

            .sf-preview-overlay {
              align-items: flex-start;
              flex-direction: column;
            }
          }
        `}
      </style>

      <div className="sf-capture-page">
        <section className="sf-capture-hero">
          <Card className="sf-capture-intro">
            <div className="sf-capture-intro-content">
              <Badge>피부 분석 준비</Badge>

              <h1>
                스마트폰 사진으로
                <br />
                피부 분석을 시작하세요
              </h1>

              <p>
                웹캠보다 안정적인 스마트폰 촬영 이미지를 중심으로 분석 흐름을
                진행합니다. 업로드 후 ROI 확인 단계를 거쳐 색소침착과 주름 중심의
                결과 화면으로 이어집니다.
              </p>

              <div className="sf-capture-methods" aria-label="입력 방식 선택">
                <button
                  type="button"
                  className={`sf-method-card ${selectedMethod === "upload" ? "is-active" : ""}`}
                  onClick={handleSelectUpload}
                  disabled={isSubmitting}
                >
                  <span className="sf-icon-tile" aria-hidden="true">
                    <Smartphone size={21} />
                  </span>
                  <div className="sf-method-copy">
                    <strong>이미지 업로드</strong>
                    <small>권장 방식 · 스마트폰 사진 사용</small>
                  </div>
                </button>

                <button
                  type="button"
                  className={`sf-method-card ${selectedMethod === "webcam" ? "is-active" : ""}`}
                  onClick={handleSelectWebcam}
                  disabled={isSubmitting}
                >
                  <span className="sf-icon-tile" aria-hidden="true">
                    <Camera size={21} />
                  </span>
                  <div className="sf-method-copy">
                    <strong>웹캠 촬영</strong>
                    <small>보조 방식 · 기기 환경 확인 필요</small>
                  </div>
                </button>
              </div>

              <div className="sf-capture-note">
                <div className="sf-note-row">
                  <CheckCircle2 size={17} />
                  <span>얼굴이 중앙에 보이고 이마와 양볼이 가려지지 않은 사진을 사용해주세요.</span>
                </div>
                <div className="sf-note-row">
                  <ShieldCheck size={17} />
                  <span>분석 결과는 피부 관리 참고 정보이며 의료적 판단 목적이 아닙니다.</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="sf-capture-upload-card">
            <div className="sf-upload-top">
              <div>
                <span className="sf-card-label">선택한 입력 방식</span>
                <h2>{selectedMethodLabel}</h2>
              </div>

              <span className={`sf-status-pill ${isLoggedIn ? "" : "is-locked"}`}>
                {isLoggedIn ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                {isLoggedIn ? "분석 가능" : "로그인 필요"}
              </span>
            </div>

            <label className="sf-upload-zone">
              {previewUrl ? (
                <div className="sf-upload-preview">
                  <img src={previewUrl} alt="업로드한 얼굴 이미지 미리보기" />
                  <div className="sf-preview-overlay">
                    <div>
                      <strong>{selectedFileName}</strong>
                      <span>{fileSizeLabel || "이미지 선택 완료"}</span>
                    </div>
                    <Badge>선택 완료</Badge>
                  </div>
                </div>
              ) : (
                <div className="sf-upload-empty">
                  <span className="sf-upload-icon-large">
                    <ImagePlus size={30} />
                  </span>
                  <div>
                    <h3>얼굴 이미지 업로드</h3>
                    <p>JPG 또는 PNG 파일을 선택하면 ROI 분석 요청을 진행할 수 있습니다.</p>
                  </div>
                </div>
              )}

              <input
                type="file"
                accept="image/png, image/jpeg"
                onChange={handleFileChange}
                disabled={isSubmitting}
              />
            </label>

            <div className="sf-upload-meta">
              <div className="sf-meta-card">
                <span>파일 형식</span>
                <strong>{selectedFile?.type ? selectedFile.type.replace("image/", "").toUpperCase() : "JPG / PNG"}</strong>
              </div>
              <div className="sf-meta-card">
                <span>파일명</span>
                <strong>{selectedFileName || "선택 전"}</strong>
              </div>
              <div className="sf-meta-card">
                <span>진행 상태</span>
                <strong>{selectedFile ? "업로드 준비" : "대기 중"}</strong>
              </div>
            </div>

            {uploadError && (
              <div className="sf-capture-error">
                <AlertCircle size={18} />
                <span>{uploadError}</span>
              </div>
            )}

            <div className="sf-upload-actions">
              <Button full onClick={handleStartAnalysis} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    ROI 분석 요청 중 <Loader2 size={18} />
                  </>
                ) : (
                  <>
                    {isLoggedIn ? "분석 시작" : "로그인 후 분석하기"} <ArrowRight size={18} />
                  </>
                )}
              </Button>

              <Button to="/dashboard" variant="secondary">
                대시보드로 이동
              </Button>
            </div>
          </Card>
        </section>

        <section className="sf-capture-bottom">
          <Card className="sf-capture-flow-card">
            <div className="sf-bottom-title-row">
              <div>
                <span className="sf-card-label">분석 흐름</span>
                <h2>3단계로 진행됩니다</h2>
              </div>
              <Badge>짧은 흐름</Badge>
            </div>

            <div className="sf-flow-grid">
              {flowSteps.map((step, index) => {
                const StepIcon = index === 0 ? Upload : index === 1 ? ScanFace : Sparkles;

                return (
                  <article className="sf-flow-card" key={step.title}>
                    <div className="sf-flow-head">
                      <span className="sf-icon-tile" aria-hidden="true">
                        <StepIcon size={21} />
                      </span>
                      <span className="sf-flow-index">0{index + 1}</span>
                    </div>
                    <strong>{step.title}</strong>
                    <p>{step.description}</p>
                  </article>
                );
              })}
            </div>
          </Card>

          <Card className="sf-capture-guide-card">
            <div className="sf-bottom-title-row">
              <div>
                <span className="sf-card-label">분석 전 확인</span>
                <h2>사진 품질 체크</h2>
              </div>
              <Badge>권장</Badge>
            </div>

            <div className="sf-guide-list">
              {uploadGuideItems.map((item) => (
                <div className="sf-guide-row" key={item.title}>
                  <span className="sf-icon-tile" aria-hidden="true">
                    <CheckCircle2 size={18} />
                  </span>
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.description}</span>
                  </div>
                </div>
              ))}

              <div className="sf-guide-row">
                <span className="sf-icon-tile" aria-hidden="true">
                  <Lightbulb size={18} />
                </span>
                <div>
                  <strong>결과 활용 안내</strong>
                  <span>이미지 품질과 조명에 따라 분석 결과가 달라질 수 있습니다.</span>
                </div>
              </div>
            </div>
          </Card>
        </section>
      </div>
    </PageLayout>
  );
}

export default AnalysisCapturePage;
