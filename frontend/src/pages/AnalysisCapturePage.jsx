import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  Camera,
  CheckCircle2,
  ImagePlus,
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
import { analyzeSkin, extractRoi } from "../api/analysisApi";


const ANALYSIS_PROGRESS_KEY = "skinflow_analysis_progress";
const ANALYSIS_RESULT_KEY = "skinflow_latest_analysis_result";
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


function saveLatestAnalysisResult(payload) {
  const resultPayload = {
    updatedAt: new Date().toISOString(),
    ...payload,
  };

  localStorage.setItem(ANALYSIS_RESULT_KEY, JSON.stringify(resultPayload));
}

function getProgressFromAnalysisResult(analysisResult) {
  if (analysisResult?.saved) {
    return {
      status: "analysis_completed",
      label: "분석 결과 저장 완료",
      description: "색소침착·주름 분석 결과가 저장되었습니다. 결과 화면에서 확인할 수 있습니다.",
      progress: 100,
    };
  }

  if (analysisResult?.code === "AI_MODEL_PENDING" || analysisResult?.status === "pending") {
    return {
      status: "ai_model_pending",
      label: "AI 모델 연결 대기",
      description: analysisResult?.message || "AI 모델 분석 결과가 아직 준비되지 않았습니다.",
      progress: 75,
    };
  }

  return {
    status: "analysis_pending",
    label: "분석 결과 확인 필요",
    description: "분석 결과를 바로 표시하지 못했습니다. 잠시 후 다시 시도해주세요.",
    progress: 70,
  };
}

function getProgressFromRoiResult(roiResult) {
  const status = roiResult?.status || roiResult?.roi?.status || roiResult?.result?.status;

  if (!status || status === "ok") {
    return {
      status: "roi_complete",
      label: "촬영 이미지 확인 완료",
      description: "분석에 필요한 얼굴 관심 영역을 확인했습니다.",
      progress: 45,
    };
  }

  if (status === "model_missing") {
    return {
      status: "model_missing",
      label: "얼굴 영역 모델 확인 필요",
      description: "얼굴 영역 분석 준비 상태를 확인하고 있습니다. 잠시 후 다시 시도해주세요.",
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
    label: "얼굴 영역 확인 필요",
    description: "얼굴 관심 영역 확인 결과를 다시 검토해야 합니다.",
    progress: 20,
  };
}

const allowedImageTypes = ["image/jpeg", "image/png"];

function getRoiData(roiResult) {
  return roiResult?.roi || roiResult?.result?.roi || roiResult?.result || roiResult || null;
}

function isRoiResultReady(roiResult) {
  const roiData = getRoiData(roiResult);
  const status = roiData?.status || roiResult?.status;

  return !status || status === "ok";
}

function normalizeRoiRegions(roiResult) {
  const roiData = getRoiData(roiResult);
  const regions = [];

  if (roiData?.face?.normalized) {
    regions.push({ ...roiData.face, name: roiData.face.name || "face", type: "face" });
  }

  if (Array.isArray(roiData?.regions)) {
    regions.push(...roiData.regions.map((region) => ({ ...region, type: "skin" })));
  }

  return regions
    .map((region) => {
      const normalized = region.normalized || {};
      const x = Number(normalized.x);
      const y = Number(normalized.y);
      const width = Number(normalized.width);
      const height = Number(normalized.height);

      if (![x, y, width, height].every(Number.isFinite)) {
        return null;
      }

      return {
        name: region.name,
        type: region.type,
        normalized: {
          x: Math.max(0, Math.min(1, x)),
          y: Math.max(0, Math.min(1, y)),
          width: Math.max(0.01, Math.min(1, width)),
          height: Math.max(0.01, Math.min(1, height)),
        },
      };
    })
    .filter(Boolean);
}

function getRoiRegionStyle(region, frameSize, imageSize) {
  const normalized = region.normalized;

  if (!normalized || !frameSize.width || !frameSize.height || !imageSize.width || !imageSize.height) {
    return {
      left: `${normalized.x * 100}%`,
      top: `${normalized.y * 100}%`,
      width: `${normalized.width * 100}%`,
      height: `${normalized.height * 100}%`,
    };
  }

  const imageRatio = imageSize.width / imageSize.height;
  const frameRatio = frameSize.width / frameSize.height;
  const displayedWidth = imageRatio > frameRatio ? frameSize.width : frameSize.height * imageRatio;
  const displayedHeight = imageRatio > frameRatio ? frameSize.width / imageRatio : frameSize.height;
  const offsetX = (frameSize.width - displayedWidth) / 2;
  const offsetY = (frameSize.height - displayedHeight) / 2;

  return {
    left: `${offsetX + normalized.x * displayedWidth}px`,
    top: `${offsetY + normalized.y * displayedHeight}px`,
    width: `${normalized.width * displayedWidth}px`,
    height: `${normalized.height * displayedHeight}px`,
  };
}

function stopMediaStream(stream) {
  if (!stream) return;

  stream.getTracks().forEach((track) => {
    track.stop();
  });
}

function createCapturedImageFile(blob) {
  const capturedAt = new Date().toISOString().replace(/[:.]/g, "-");

  return new File([blob], `skinflow-webcam-${capturedAt}.jpg`, {
    type: "image/jpeg",
  });
}

const uploadGuideItems = [
  {
    title: "얼굴이 프레임 안에 들어오게 촬영",
    description: "얼굴 윤곽과 양볼이 잘리지 않도록 화면 중앙에 맞춰주세요.",
  },
  {
    title: "밝고 고른 조명 사용",
    description: "너무 어둡거나 한쪽만 강한 빛이 드는 환경은 피해주세요.",
  },
  {
    title: "얼굴 가림 요소 제거",
    description: "머리카락, 마스크, 손, 안경 그림자가 얼굴을 가리지 않도록 정리해 주세요.",
  },
  {
    title: "흔들림 없이 선명하게 촬영",
    description: "초점이 맞고 얼굴 윤곽이 흐리지 않은 사진을 사용해 주세요.",
  },
];

const flowSteps = [
  {
    title: "이미지 입력",
    description: "스마트폰 사진을 업로드하거나 웹캠으로 얼굴 이미지를 촬영합니다.",
  },
  {
    title: "얼굴 영역 확인",
    description: "검출된 세부 ROI를 먼저 확인합니다.",
  },
  {
    title: "이 사진으로 분석",
    description: "확인한 사진으로 색소침착·주름 분석을 요청합니다.",
  },
];

function getAnalysisRequestErrorMessage(error) {
  const rawMessage = String(error?.message || "");
  const lowerMessage = rawMessage.toLowerCase();

  if (
    !rawMessage ||
    rawMessage === "Failed to fetch" ||
    lowerMessage.includes("networkerror") ||
    lowerMessage.includes("err_connection") ||
    lowerMessage.includes("internal server error")
  ) {
    return "일시적으로 분석 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
  }

  if (rawMessage.length > 90) {
    return "분석 요청을 처리하지 못했습니다. 이미지를 다시 선택한 뒤 분석을 요청해 주세요.";
  }

  return rawMessage;
}

function AnalysisCapturePage() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const webcamStreamRef = useRef(null);
  const previewFrameRef = useRef(null);

  const [selectedMethod, setSelectedMethod] = useState("upload");
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStartingWebcam, setIsStartingWebcam] = useState(false);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [webcamStatus, setWebcamStatus] = useState("웹캠 준비 전");
  const [roiPreviewResult, setRoiPreviewResult] = useState(null);
  const [previewFrameSize, setPreviewFrameSize] = useState({ width: 0, height: 0 });
  const [previewImageSize, setPreviewImageSize] = useState({ width: 0, height: 0 });

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

  useEffect(() => {
    return () => {
      stopMediaStream(webcamStreamRef.current);
    };
  }, []);

  useEffect(() => {
    const updatePreviewFrameSize = () => {
      const frame = previewFrameRef.current;

      if (!frame) return;

      setPreviewFrameSize({
        width: frame.clientWidth,
        height: frame.clientHeight,
      });
    };

    updatePreviewFrameSize();
    window.addEventListener("resize", updatePreviewFrameSize);

    return () => {
      window.removeEventListener("resize", updatePreviewFrameSize);
    };
  }, [previewUrl, selectedMethod]);

  const selectedMethodLabel = selectedMethod === "webcam" ? "웹캠 촬영" : "이미지 업로드";
  const roiPreviewRegions = useMemo(() => normalizeRoiRegions(roiPreviewResult), [roiPreviewResult]);
  const roiDisplayRegions = useMemo(
    () =>
      roiPreviewRegions.map((region) => ({
        ...region,
        style: getRoiRegionStyle(region, previewFrameSize, previewImageSize),
      })),
    [previewFrameSize, previewImageSize, roiPreviewRegions],
  );
  const hasConfirmedRoi = Boolean(roiPreviewResult) && isRoiResultReady(roiPreviewResult);
  const canStartAnalysis = Boolean(selectedFile) && !isSubmitting;
  const startButtonLabel = !isLoggedIn
    ? "로그인 후 분석하기"
    : isSubmitting
      ? hasConfirmedRoi
        ? "분석 요청 중"
        : "얼굴 영역 확인 중"
      : selectedFile
        ? hasConfirmedRoi
          ? "이 사진으로 분석하기"
          : "얼굴 영역 확인하기"
        : selectedMethod === "webcam"
          ? "촬영 후 분석 시작"
          : "이미지 선택 후 분석 시작";
  const startHelpText = selectedFile
    ? hasConfirmedRoi
      ? "얼굴 관심 영역을 확인했습니다. 이 사진으로 분석을 요청할 수 있습니다."
      : "먼저 얼굴 영역을 확인한 뒤, 같은 사진으로 분석을 요청할 수 있습니다."
    : selectedMethod === "webcam"
      ? "웹캠을 켜고 얼굴 이미지를 촬영하면 분석 시작 버튼이 활성화됩니다."
      : "JPG 또는 PNG 이미지를 선택하면 분석 시작 버튼이 활성화됩니다.";

  const resetSelectedImage = () => {
    setSelectedFile(null);
    setSelectedFileName("");
    setRoiPreviewResult(null);
    setPreviewImageSize({ width: 0, height: 0 });
  };

  const handleSelectWebcam = () => {
    setSelectedMethod("webcam");
    setUploadError("");

    if (selectedMethod !== "webcam") {
      resetSelectedImage();
    }
  };

  const handleSelectUpload = () => {
    setSelectedMethod("upload");
    setUploadError("");
    setIsWebcamActive(false);
    setWebcamStatus("웹캠 준비 전");
    stopMediaStream(webcamStreamRef.current);
    webcamStreamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (selectedMethod !== "upload") {
      resetSelectedImage();
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    setSelectedMethod("upload");

    if (!file) {
      setSelectedFile(null);
      setSelectedFileName("");
      setUploadError("이미지를 다시 선택한 뒤 분석을 요청해 주세요.");
      return;
    }

    if (!allowedImageTypes.includes(file.type)) {
      setSelectedFile(null);
      setSelectedFileName("");
      setUploadError("JPG 또는 PNG 형식의 얼굴 이미지를 선택해 주세요.");
      event.target.value = "";
      return;
    }

    setSelectedFile(file);
    setSelectedFileName(file.name);
    setRoiPreviewResult(null);
    setUploadError("");
  };

  const handleStartWebcam = async () => {
    if (isSubmitting || isStartingWebcam) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      setUploadError("현재 브라우저에서는 웹캠 촬영을 사용할 수 없습니다. 이미지 업로드를 사용해주세요.");
      return;
    }

    try {
      setSelectedMethod("webcam");
      setIsStartingWebcam(true);
      setUploadError("");
      setWebcamStatus("웹캠 권한을 확인하고 있습니다.");
      resetSelectedImage();
      stopMediaStream(webcamStreamRef.current);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      webcamStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsWebcamActive(true);
      setWebcamStatus("웹캠 준비 완료");
    } catch (error) {
      stopMediaStream(webcamStreamRef.current);
      webcamStreamRef.current = null;
      setIsWebcamActive(false);
      setWebcamStatus("웹캠 연결 실패");

      const isPermissionError =
        error.name === "NotAllowedError" || error.name === "PermissionDeniedError";

      setUploadError(
        isPermissionError
          ? "웹캠 권한이 차단되었습니다. 브라우저 권한을 허용하거나 이미지 업로드를 사용해주세요."
          : "웹캠을 시작하지 못했습니다. 기기 연결 상태를 확인하거나 이미지 업로드를 사용해주세요.",
      );
    } finally {
      setIsStartingWebcam(false);
    }
  };

  const handleCaptureWebcam = async () => {
    if (isSubmitting) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!isWebcamActive || !video || !canvas) {
      setUploadError("웹캠을 먼저 켠 뒤 얼굴 이미지를 촬영해주세요.");
      return;
    }

    const width = video.videoWidth;
    const height = video.videoHeight;

    if (!width || !height) {
      setUploadError("웹캠 화면을 아직 읽지 못했습니다. 잠시 후 다시 촬영해주세요.");
      return;
    }

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, width, height);

    try {
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (capturedBlob) => {
            if (capturedBlob) {
              resolve(capturedBlob);
              return;
            }

            reject(new Error("촬영 이미지를 생성하지 못했습니다."));
          },
          "image/jpeg",
          0.92,
        );
      });

      const capturedFile = createCapturedImageFile(blob);

      setSelectedFile(capturedFile);
      setSelectedFileName(capturedFile.name);
      setRoiPreviewResult(null);
      setUploadError("");
      setWebcamStatus("촬영 완료 · 분석 요청 가능");
      setIsWebcamActive(false);
      stopMediaStream(webcamStreamRef.current);
      webcamStreamRef.current = null;

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    } catch (error) {
      setUploadError(error.message || "촬영 이미지를 처리하지 못했습니다. 다시 촬영해 주세요.");
    }
  };

  const handleConfirmFaceRegion = async () => {
    if (isSubmitting) return;

    if (!isLoggedIn) {
      navigate("/login");
      return;
    }

    if (!selectedFile) {
      setUploadError(
        selectedMethod === "webcam"
          ? "웹캠을 켜고 얼굴 이미지를 촬영한 뒤 분석을 요청해 주세요."
          : "이미지를 다시 선택한 뒤 분석을 요청해 주세요.",
      );
      return;
    }

    try {
      setIsSubmitting(true);
      setUploadError("");
      setRoiPreviewResult(null);

      saveAnalysisProgress({
        status: "roi_processing",
        label: "얼굴 영역 확인 중",
        description: `${selectedFile.name} 파일의 얼굴 관심 영역을 확인하고 있습니다.`,
        progress: 20,
      });

      const roiResponse = await extractRoi(selectedFile);
      const roiResult = roiResponse?.result || null;

      saveAnalysisProgress(getProgressFromRoiResult(roiResult));
      setRoiPreviewResult(roiResult);

      if (!isRoiResultReady(roiResult)) {
        setUploadError(roiResult?.message || roiResult?.roi?.message || "얼굴 영역을 확인하지 못했습니다. 다른 사진으로 다시 시도해 주세요.");
      }
    } catch (error) {
      saveAnalysisProgress({
        status: "failed",
        label: "얼굴 영역 확인 필요",
        description: "얼굴 영역 확인 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.",
        progress: 0,
      });

      setUploadError(getAnalysisRequestErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartAnalysis = async () => {
    if (isSubmitting) return;

    if (!isLoggedIn) {
      navigate("/login");
      return;
    }

    if (!selectedFile) {
      setUploadError(
        selectedMethod === "webcam"
          ? "웹캠을 켜고 얼굴 이미지를 촬영한 뒤 분석을 요청해 주세요."
          : "이미지를 다시 선택한 뒤 분석을 요청해 주세요.",
      );
      return;
    }

    if (!hasConfirmedRoi) {
      setUploadError("분석 전에 얼굴 영역을 먼저 확인해 주세요.");
      return;
    }

    const analysisMethod = selectedMethod;
    const roiResult = roiPreviewResult;

    try {
      setIsSubmitting(true);
      setUploadError("");

      saveAnalysisProgress({
        status: "skin_analysis_processing",
        label: "피부 지표 분석 요청 중",
        description: "색소침착·주름 분석을 위해 이미지를 전달하고 있습니다.",
        progress: 65,
      });

      const analysisResponse = await analyzeSkin(selectedFile);
      const analysisResult = analysisResponse?.result || null;
      const analysisPayload = {
        userId: analysisResponse?.userId || null,
        fileName: selectedFile.name,
        roiResult,
        result: analysisResult,
      };

      saveLatestAnalysisResult(analysisPayload);
      saveAnalysisProgress(getProgressFromAnalysisResult(analysisResult));

      navigate("/analysis/loading", {
        state: {
          analysisInput: {
            method: analysisMethod,
            fileName: selectedFile.name,
            roiResult,
            analysisResult,
          },
        },
      });
    } catch (error) {
      saveAnalysisProgress({
        status: "failed",
        label: "분석 요청 확인 필요",
        description: "분석 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.",
        progress: 0,
      });

      setUploadError(getAnalysisRequestErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrimaryAction = () => {
    if (hasConfirmedRoi) {
      handleStartAnalysis();
      return;
    }

    handleConfirmFaceRegion();
  };

  return (
    <PageLayout>
      <style>
        {`
          .sf-capture-page {
            display: grid;
            gap: 18px;
            padding-top: 4px;
          }

          .sf-capture-hero {
            display: grid;
            grid-template-columns: minmax(0, 0.92fr) minmax(440px, 1.08fr);
            gap: 18px;
            align-items: start;
          }

          .sf-capture-hero.is-webcam-mode {
            grid-template-columns: 1fr;
            justify-items: center;
          }

          .sf-capture-hero.is-webcam-mode .sf-capture-intro {
            display: none;
          }

          .sf-capture-hero.is-webcam-mode .sf-capture-intro-content {
            gap: 16px;
          }

          .sf-capture-hero.is-webcam-mode .sf-capture-intro h1 {
            margin: 8px 0 6px;
            font-size: clamp(30px, 3vw, 42px);
            line-height: 1.06;
          }

          .sf-capture-hero.is-webcam-mode .sf-capture-intro p {
            max-width: 760px;
          }

          .sf-capture-hero.is-webcam-mode .sf-capture-note {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            margin-top: 4px;
          }

          .sf-capture-hero.is-webcam-mode .sf-capture-upload-card {
            width: min(100%, 920px);
            justify-self: center;
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
            align-self: start;
            min-height: 0;
            padding: 26px 28px;
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
            height: auto;
          }



          .sf-gradient-text {
            display: inline-block;
            background: linear-gradient(90deg, #167d7f 0%, #14b8a6 52%, #22c5c8 100%);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
            -webkit-text-fill-color: transparent;
          }
          .sf-capture-intro h1 {
            margin: 14px 0 10px;
            color: #0f172a;
            font-size: clamp(32px, 3.6vw, 44px);
            line-height: 1.08;
            letter-spacing: -0.07em;
            word-break: keep-all;
          }

          .sf-capture-title-line {
            display: block;
            white-space: nowrap;
          }

          .sf-capture-intro h1 .sf-gradient-text {
            white-space: nowrap;
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
            grid-template-columns: 1fr;
            gap: 13px;
            margin-top: 20px;
          }

          .sf-method-card {
            position: relative;
            display: grid;
            grid-template-columns: 44px minmax(0, 1fr);
            gap: 12px;
            align-items: center;
            min-height: 68px;
            padding: 12px 14px;
            border-radius: 19px;
            border: 1px solid rgba(226, 232, 240, 0.92);
            background: #f8fafc;
            cursor: pointer;
            transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
            text-align: left;
          }

          .sf-method-card.is-recommended-method {
            border-color: rgba(22, 125, 127, 0.24);
            background: linear-gradient(135deg, #ffffff 0%, #f0fdfa 100%);
          }

          .sf-method-card.is-support-method {
            background: #f8fafc;
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

          .sf-method-badge {
            display: inline-flex;
            align-items: center;
            width: fit-content;
            margin-top: 6px;
            padding: 4px 7px;
            border-radius: 999px;
            font-size: 10.5px;
            font-weight: 950;
            line-height: 1;
            white-space: nowrap;
          }

          .sf-method-badge.is-recommended {
            color: #167d7f;
            background: rgba(22, 125, 127, 0.1);
          }

          .sf-method-badge.is-support {
            color: #64748b;
            background: #e2e8f0;
          }

          .sf-method-copy small {
            display: block;
            margin-top: 3px;
            color: #64748b;
            font-size: 12px;
            line-height: 1.38;
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
            background: linear-gradient(135deg, #f2fbfb 0%, #ffffff 52%, #ecfeff 100%);
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
            margin-top: 18px;
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
            display: flex;
            flex-direction: column;
          }

          .sf-upload-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 16px;
            margin-bottom: 10px;
          }

          .sf-webcam-return-button {
            border: 1px solid rgba(22, 125, 127, 0.14);
            border-radius: 999px;
            padding: 7px 11px;
            color: #167d7f;
            background: rgba(22, 125, 127, 0.075);
            font: inherit;
            font-size: 12px;
            font-weight: 900;
            line-height: 1;
            cursor: pointer;
            transition: background 0.18s ease, border-color 0.18s ease, transform 0.18s ease;
            white-space: nowrap;
          }

          .sf-webcam-return-button:hover:not(:disabled) {
            transform: translateY(-1px);
            border-color: rgba(22, 125, 127, 0.28);
            background: rgba(22, 125, 127, 0.11);
          }

          .sf-webcam-return-button:disabled {
            cursor: not-allowed;
            opacity: 0.58;
          }

          .sf-card-label {
            display: block;
            color: #167d7f;
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
            color: #14b8a6;
            background: rgba(20, 184, 166, 0.1);
          }

          .sf-status-pill.is-recommended {
            color: #167d7f;
            background: rgba(22, 125, 127, 0.1);
          }

          .sf-upload-zone {
            position: relative;
            display: grid;
            place-items: center;
            min-height: 440px;
            overflow: hidden;
            border-radius: 28px;
            border: 1px dashed rgba(22, 125, 127, 0.35);
            background:
              radial-gradient(circle at 80% 10%, rgba(22, 125, 127, 0.12), transparent 32%),
              radial-gradient(circle at 18% 82%, rgba(20, 184, 166, 0.10), transparent 30%),
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
            background: linear-gradient(135deg, #effafa, #ffffff 52%, #ecfeff);
            border: 1px solid rgba(226, 232, 240, 0.95);
            box-shadow: 0 18px 38px rgba(15, 23, 42, 0.08);
          }

          .sf-upload-preview {
            position: relative;
            width: 100%;
            min-height: 440px;
            overflow: hidden;
            border-radius: 28px;
            background:
              radial-gradient(circle at 0% 0%, rgba(22, 125, 127, 0.12), transparent 34%),
              linear-gradient(135deg, #f8fafc 0%, #ffffff 50%, #ecfeff 100%);
          }

          .sf-preview-media-frame {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 440px;
          }

          .sf-preview-media-frame img {
            width: 100%;
            height: 440px;
            object-fit: contain;
            display: block;
          }

          .sf-upload-preview.is-roi-confirmed .sf-preview-media-frame img {
            object-fit: contain;
            opacity: 0.92;
          }

          .sf-roi-overlay {
            position: absolute;
            inset: 0;
            pointer-events: none;
          }

          .sf-roi-preview-box {
            position: absolute;
            border: 2px solid rgba(22, 125, 127, 0.72);
            border-radius: 12px;
            background: rgba(22, 125, 127, 0.035);
          }

          .sf-roi-preview-box.is-skin {
            border-style: dashed;
            border-color: rgba(244, 63, 94, 0.58);
            background: rgba(244, 63, 94, 0.035);
          }

          .sf-roi-confirm-note {
            display: grid;
            gap: 7px;
            margin-top: 12px;
            padding: 13px;
            border-radius: 17px;
            color: #475569;
            background: rgba(22, 125, 127, 0.07);
            border: 1px solid rgba(22, 125, 127, 0.12);
            font-size: 12px;
            font-weight: 800;
            line-height: 1.55;
            word-break: keep-all;
          }

          .sf-roi-confirm-note strong {
            color: #0f172a;
            font-size: 13px;
          }

          .sf-webcam-zone {
            cursor: default;
          }

          .sf-webcam-zone:hover {
            transform: none;
          }

          .sf-webcam-panel {
            position: relative;
            width: 100%;
            min-height: 440px;
            overflow: hidden;
            border-radius: 28px;
            background: #0f172a;
          }

          .sf-capture-hero.is-webcam-mode .sf-webcam-panel,
          .sf-capture-hero.is-webcam-mode .sf-webcam-panel video,
          .sf-capture-hero.is-webcam-mode .sf-upload-preview,
          .sf-capture-hero.is-webcam-mode .sf-preview-media-frame,
          .sf-capture-hero.is-webcam-mode .sf-preview-media-frame img {
            min-height: clamp(340px, 40vw, 420px);
            height: clamp(340px, 40vw, 420px);
          }

          .sf-webcam-panel video {
            width: 100%;
            height: 440px;
            object-fit: cover;
            display: block;
            opacity: 0;
            transition: opacity 0.18s ease;
          }

          .sf-webcam-panel video.is-active {
            opacity: 1;
          }

          .sf-webcam-placeholder {
            position: absolute;
            inset: 0;
            display: grid;
            place-items: center;
            padding: 22px;
            text-align: center;
            background:
              radial-gradient(circle at 80% 10%, rgba(34, 197, 200, 0.16), transparent 34%),
              linear-gradient(135deg, #0f172a 0%, #143d45 100%);
          }

          .sf-webcam-placeholder-content {
            display: grid;
            justify-items: center;
            gap: 10px;
            color: #ffffff;
          }

          .sf-webcam-placeholder-content h3 {
            margin: 0;
            color: #ffffff;
            font-size: 20px;
            letter-spacing: -0.04em;
          }

          .sf-webcam-placeholder-content p {
            max-width: 360px;
            margin: 0;
            color: rgba(255, 255, 255, 0.72);
            font-size: 13px;
            line-height: 1.6;
            word-break: keep-all;
          }

          .sf-capture-hero.is-webcam-mode .sf-webcam-placeholder-content p {
            max-width: 520px;
          }

          .sf-webcam-canvas {
            display: none;
          }

          .sf-webcam-actions {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
            margin-top: 12px;
          }

          .sf-webcam-actions .sf-button {
            min-height: 48px;
          }

          .sf-preview-overlay {
            display: none;
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
            background: rgba(20, 184, 166, 0.08);
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
            grid-template-columns: 1fr;
            gap: 10px;
            align-items: center;
            margin-top: 4px;
            padding-top: 4px;
          }

          .sf-upload-actions .sf-button {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            height: 54px;
            min-height: 58px;
            padding: 0 24px 2px;
            line-height: 1;
            box-shadow: 0 18px 38px rgba(22, 125, 127, 0.2);
          }

          .sf-upload-actions .sf-button:disabled {
            box-shadow: none;
          }

          .sf-start-help {
            margin: 0;
            color: #64748b;
            font-size: 12px;
            font-weight: 800;
            line-height: 1.55;
            text-align: center;
            word-break: keep-all;
          }

          .sf-upload-actions .sf-button .sf-action-label {
            display: inline-flex;
            align-items: center;
            line-height: 1;
            transform: translateY(1px);
          }

          .sf-upload-actions .sf-button svg {
            display: block;
            flex: 0 0 auto;
            width: 18px !important;
            height: 18px !important;
            margin: 0;
            transform: translateY(1px);
          }

          .sf-capture-bottom {
            display: grid;
            grid-template-columns: minmax(0, 0.72fr) minmax(420px, 1.28fr);
            gap: 14px;
            align-items: stretch !important;
            margin-top: 0;
          }

          .sf-capture-guide-card {
            box-shadow: none;
            background:
              radial-gradient(circle at 100% 0%, rgba(22, 125, 127, 0.05), transparent 34%),
              #f8fafc;
            border: 1px solid rgba(203, 213, 225, 0.9);
          }

          .sf-capture-guide-card .sf-card-label {
            color: #64748b;
          }

          .sf-capture-guide-card .sf-badge {
            color: #475569;
            background: #e2e8f0;
            border-color: #cbd5e1;
          }

          .sf-capture-flow-card,
          .sf-capture-guide-card {
            display: flex;
            flex-direction: column;
            min-height: 100%;
            padding: 14px 16px;
            align-self: stretch !important;
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
            gap: 8px;
            flex: 1;
          }

          .sf-flow-card {
            display: grid;
            grid-template-columns: 42px minmax(0, 1fr) auto;
            gap: 12px;
            align-items: center;
            min-height: 66px;
            padding: 11px 12px;
            border-radius: 18px;
            border: 1px solid rgba(22, 125, 127, 0.14);
            background:
              radial-gradient(circle at 96% 18%, rgba(34, 197, 200, 0.08), transparent 34%),
              linear-gradient(135deg, #ffffff 0%, #f8fafc 58%, #f0fdfa 100%);
          }

          .sf-flow-copy {
            min-width: 0;
          }

          .sf-flow-index {
            justify-self: end;
            padding: 5px 9px;
            border-radius: 999px;
            color: #167d7f;
            background: rgba(22, 125, 127, 0.08);
            font-size: 11px;
            font-weight: 950;
            line-height: 1;
          }

          .sf-flow-card strong {
            display: block;
            color: #0f172a;
            font-size: 13.5px;
            letter-spacing: -0.03em;
          }

          .sf-flow-card p {
            margin: 3px 0 0;
            color: #64748b;
            font-size: 11.5px;
            line-height: 1.42;
            word-break: keep-all;
          }

          .sf-flow-card > .sf-icon-tile {
            width: 42px;
            height: 42px;
            min-width: 42px;
            min-height: 42px;
            margin: 0;
            align-self: center;
            justify-self: center;
            border-radius: 15px;
            display: grid !important;
            place-items: center !important;
            line-height: 0 !important;
            color: #167d7f;
            background: linear-gradient(135deg, #f2fbfb 0%, #ffffff 52%, #ecfeff 100%);
            border: 1px solid rgba(226, 232, 240, 0.9);
          }

          .sf-flow-card > .sf-icon-tile svg {
            display: block;
            width: 18px !important;
            height: 18px !important;
            min-width: 18px;
            min-height: 18px;
            margin: 0;
            transform: none;
            stroke-width: 2.15;
          }

          .sf-guide-list {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
            flex: 1;
          }

          .sf-guide-row {
            display: grid;
            grid-template-columns: 30px 1fr;
            gap: 10px;
            align-items: center;
            min-height: 58px;
            padding: 9px 10px;
            border-radius: 14px;
            border: 1px solid rgba(226, 232, 240, 0.95);
            background: rgba(255, 255, 255, 0.72);
          }

          .sf-guide-row > .sf-icon-tile {
            width: 30px;
            height: 30px;
            min-width: 30px;
            min-height: 30px;
            margin: 0;
            align-self: center;
            justify-self: center;
            border-radius: 999px;
            display: grid !important;
            place-items: center !important;
            line-height: 0 !important;
            color: #167d7f;
            background: rgba(22, 125, 127, 0.08);
            border: 1px solid rgba(22, 125, 127, 0.12);
          }

          .sf-guide-row > .sf-icon-tile svg {
            display: block;
            width: 15px !important;
            height: 15px !important;
            min-width: 15px;
            min-height: 15px;
            margin: 0;
            transform: none;
            stroke-width: 2.15;
          }

          .sf-guide-row strong {
            display: block;
            color: #0f172a;
            font-size: 13.5px;
            letter-spacing: -0.03em;
          }

          .sf-guide-row > div > span {
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

            .sf-capture-hero.is-webcam-mode .sf-capture-intro {
              display: block;
              width: 100%;
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
              padding: 18px;
            }

            .sf-capture-hero.is-webcam-mode .sf-capture-intro,
            .sf-capture-hero.is-webcam-mode .sf-capture-upload-card {
              padding: 20px;
            }

            .sf-capture-hero.is-webcam-mode .sf-capture-note {
              grid-template-columns: 1fr;
            }

            .sf-capture-intro h1 {
              font-size: 34px;
            }

            .sf-capture-title-line {
              white-space: normal;
            }

            .sf-capture-methods,
            .sf-upload-meta,
            .sf-flow-grid,
            .sf-guide-list {
              grid-template-columns: 1fr;
            }

            .sf-upload-zone,
            .sf-upload-preview,
            .sf-preview-media-frame,
            .sf-preview-media-frame img,
            .sf-webcam-panel,
            .sf-webcam-panel video {
              min-height: 330px;
              height: 330px;
            }

            .sf-upload-actions,
            .sf-webcam-actions {
              grid-template-columns: 1fr;
            }

            .sf-preview-overlay {
              right: 10px;
              bottom: 10px;
            }
          }
        `}
      </style>

      <div className="sf-capture-page">
        <section className={`sf-capture-hero ${selectedMethod === "webcam" ? "is-webcam-mode" : ""}`}>
          <Card className="sf-capture-intro">
            <div className="sf-capture-intro-content">
              <Badge>피부 분석 준비</Badge>

              <h1>
                <span className="sf-capture-title-line">사진 업로드와 웹캠으로</span>
                <span className="sf-capture-title-line sf-gradient-text">피부 분석을 시작하세요</span>
              </h1>

              <p>
                얼굴 이미지를 업로드하거나 웹캠으로 촬영해 색소침착·주름 지표를 분석합니다.
                분석 결과는 피부 관리 참고 정보와 추천 화면에 활용됩니다.
              </p>

              <div className="sf-capture-methods" aria-label="입력 방식 선택">
                <button
                  type="button"
                  className={`sf-method-card is-recommended-method ${selectedMethod === "upload" ? "is-active" : ""}`}
                  onClick={handleSelectUpload}
                  disabled={isSubmitting}
                >
                  <span className="sf-icon-tile" aria-hidden="true">
                    <Smartphone size={21} />
                  </span>
                  <div className="sf-method-copy">
                    <strong>이미지 업로드</strong>
                    <span className="sf-method-badge is-recommended">기본 권장</span>
                    <small>권장 방식 · 스마트폰 사진 사용</small>
                  </div>
                </button>

                <button
                  type="button"
                  className={`sf-method-card is-support-method ${selectedMethod === "webcam" ? "is-active" : ""}`}
                  onClick={handleSelectWebcam}
                  disabled={isSubmitting}
                >
                  <span className="sf-icon-tile" aria-hidden="true">
                    <Camera size={21} />
                  </span>
                  <div className="sf-method-copy">
                    <strong>웹캠 촬영</strong>
                    <span className="sf-method-badge is-support">보조 방식</span>
                    <small>보조 방식 · 기기 환경 확인 필요</small>
                  </div>
                </button>
              </div>

              <div className="sf-capture-note">
                <div className="sf-note-row">
                  <CheckCircle2 size={17} />
                  <span>얼굴이 중앙에 보이고 주요 부위가 가려지지 않은 사진을 사용해주세요.</span>
                </div>
                <div className="sf-note-row">
                  <ShieldCheck size={17} />
                  <span>결과는 피부 관리 참고 정보이며 추천 화면과 함께 확인할 수 있습니다.</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="sf-capture-upload-card">
            <div className="sf-upload-top">
              <div>
                <span className="sf-card-label">
                  {selectedMethod === "webcam" ? "보조 입력 방식" : "권장 입력 방식"}
                </span>
                <h2>{selectedMethodLabel}</h2>
              </div>

              {selectedMethod === "webcam" ? (
                <button
                  type="button"
                  className="sf-webcam-return-button"
                  onClick={handleSelectUpload}
                  disabled={isSubmitting || isStartingWebcam}
                >
                  ← 이미지 업로드로 돌아가기
                </button>
              ) : (
                <span className={`sf-status-pill ${isLoggedIn ? "is-recommended" : "is-locked"}`}>
                  {isLoggedIn ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                  {isLoggedIn ? "분석 가능" : "로그인 필요"}
                </span>
              )}
            </div>

            {selectedMethod === "webcam" ? (
              <div className="sf-upload-zone sf-webcam-zone">
                {previewUrl ? (
                  <div className={`sf-upload-preview ${hasConfirmedRoi ? "is-roi-confirmed" : ""}`}>
                    <div className="sf-preview-media-frame" ref={previewFrameRef}>
                      <img
                        src={previewUrl}
                        alt="웹캠으로 촬영한 얼굴 이미지 미리보기"
                        onLoad={(event) => {
                          setPreviewImageSize({
                            width: event.currentTarget.naturalWidth,
                            height: event.currentTarget.naturalHeight,
                          });
                          setPreviewFrameSize({
                            width: event.currentTarget.parentElement?.clientWidth || 0,
                            height: event.currentTarget.parentElement?.clientHeight || 0,
                          });
                        }}
                      />
                      {hasConfirmedRoi && roiDisplayRegions.length > 0 && (
                        <div className="sf-roi-overlay" aria-hidden="true">
                          {roiDisplayRegions.map((region) => (
                            <span
                              className={`sf-roi-preview-box is-${region.type}`}
                              key={region.name}
                              style={region.style}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="sf-webcam-panel">
                    <video
                      ref={videoRef}
                      className={isWebcamActive ? "is-active" : ""}
                      autoPlay
                      playsInline
                      muted
                    />
                    {!isWebcamActive && (
                      <div className="sf-webcam-placeholder">
                        <div className="sf-webcam-placeholder-content">
                          <span className="sf-upload-icon-large">
                            <Camera size={30} />
                          </span>
                          <div>
                            <h3>{webcamStatus}</h3>
                            <p>웹캠을 켠 뒤 얼굴이 중앙에 오도록 맞추고 촬영 버튼을 눌러주세요.</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <canvas ref={canvasRef} className="sf-webcam-canvas" />
              </div>
            ) : (
              <label className="sf-upload-zone">
                {previewUrl ? (
                  <div className={`sf-upload-preview ${hasConfirmedRoi ? "is-roi-confirmed" : ""}`}>
                    <div className="sf-preview-media-frame" ref={previewFrameRef}>
                      <img
                        src={previewUrl}
                        alt="업로드한 얼굴 이미지 미리보기"
                        onLoad={(event) => {
                          setPreviewImageSize({
                            width: event.currentTarget.naturalWidth,
                            height: event.currentTarget.naturalHeight,
                          });
                          setPreviewFrameSize({
                            width: event.currentTarget.parentElement?.clientWidth || 0,
                            height: event.currentTarget.parentElement?.clientHeight || 0,
                          });
                        }}
                      />
                      {hasConfirmedRoi && roiDisplayRegions.length > 0 && (
                        <div className="sf-roi-overlay" aria-hidden="true">
                          {roiDisplayRegions.map((region) => (
                            <span
                              className={`sf-roi-preview-box is-${region.type}`}
                              key={region.name}
                              style={region.style}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="sf-upload-empty">
                    <span className="sf-upload-icon-large">
                      <ImagePlus size={30} />
                    </span>
                    <div>
                      <h3>얼굴 이미지 업로드</h3>
                      <p>JPG 또는 PNG 파일을 선택하면 얼굴 영역 확인을 시작합니다.</p>
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
            )}

            {selectedMethod === "webcam" && (
              <div className="sf-webcam-actions">
                <Button
                  variant="secondary"
                  onClick={handleStartWebcam}
                  disabled={isSubmitting || isStartingWebcam}
                >
                  {isStartingWebcam ? "웹캠 연결 중" : selectedFile ? "다시 촬영 준비" : "웹캠 켜기"}
                </Button>
                <Button
                  onClick={handleCaptureWebcam}
                  disabled={isSubmitting || isStartingWebcam || !isWebcamActive}
                >
                  얼굴 이미지 촬영
                </Button>
              </div>
            )}

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
                <strong>
                  {selectedFile
                    ? selectedMethod === "webcam"
                      ? "촬영 완료"
                      : "업로드 준비"
                    : selectedMethod === "webcam"
                      ? webcamStatus
                      : "대기 중"}
                </strong>
              </div>
            </div>

            {uploadError && (
              <div className="sf-capture-error">
                <AlertCircle size={18} />
                <span>{uploadError}</span>
              </div>
            )}

            {hasConfirmedRoi && (
              <div className="sf-roi-confirm-note">
                <strong>얼굴 영역 확인 결과</strong>
                <span>
                  검출된 세부 ROI를 읽기 전용으로 표시했습니다. 영역을 수정하지 않고 이 사진으로 분석을 이어갈 수 있습니다.
                </span>
              </div>
            )}

            <div className="sf-upload-actions">
              <Button full onClick={handlePrimaryAction} disabled={!canStartAnalysis}>
                {isSubmitting ? (
                  <>
                    <span className="sf-action-label">{startButtonLabel}</span>
                    <Loader2 size={18} />
                  </>
                ) : (
                  <>
                    <span className="sf-action-label">{startButtonLabel}</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </Button>
              {selectedFile && (
                <Button
                  variant="secondary"
                  full
                  onClick={selectedMethod === "webcam" ? handleStartWebcam : resetSelectedImage}
                  disabled={isSubmitting || isStartingWebcam}
                >
                  {selectedMethod === "webcam" ? "다시 촬영 준비" : "다시 선택하기"}
                </Button>
              )}
              <p className="sf-start-help">{startHelpText}</p>
            </div>
          </Card>
        </section>

        <section className="sf-capture-bottom">
          <Card className="sf-capture-flow-card">
            <div className="sf-bottom-title-row">
              <div>
                <span className="sf-card-label">분석 흐름</span>
                <h2>입력 후 진행 흐름</h2>
              </div>
              <Badge>진행 순서</Badge>
            </div>

            <div className="sf-flow-grid">
              {flowSteps.map((step, index) => {
                const StepIcon = index === 0 ? Upload : index === 1 ? ScanFace : Sparkles;

                return (
                  <article className="sf-flow-card" key={step.title}>
                    <span className="sf-icon-tile" aria-hidden="true">
                      <StepIcon size={18} />
                    </span>
                    <div className="sf-flow-copy">
                      <strong>{step.title}</strong>
                      <p>{step.description}</p>
                    </div>
                    <span className="sf-flow-index">0{index + 1}</span>
                  </article>
                );
              })}
            </div>
          </Card>

          <Card className="sf-capture-guide-card">
            <div className="sf-bottom-title-row">
              <div>
                <span className="sf-card-label">촬영 전 확인사항</span>
                <h2>분석 전 체크</h2>
              </div>
              <Badge>확인</Badge>
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
            </div>
          </Card>
        </section>
      </div>
    </PageLayout>
  );
}

export default AnalysisCapturePage;
