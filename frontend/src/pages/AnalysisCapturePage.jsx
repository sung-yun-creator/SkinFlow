// AnalysisCapturePage.jsx
// 사용자가 피부 분석에 사용할 이미지를 준비하는 "분석 촬영/업로드 화면"입니다.
// 이 파일의 큰 흐름은 1) 이미지 업로드 또는 웹캠 촬영 → 2) 얼굴 관심 영역(ROI) 확인 → 3) 실제 피부 분석 요청입니다.
// 비전공자 기준으로는 "사용자가 분석할 사진을 고르고, 서버에 보내기 전 확인하는 페이지"라고 이해하면 됩니다.
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
import { analyzeSkin, extractRoi } from "../api/analysisApi";
import { isCompletedAnalysisResult } from "../utils/analysisStatus";


// 분석 촬영 화면과 진행 화면은 서로 다른 라우트라서 진행 상태를 localStorage로 잠시 공유합니다.
// 사용자가 새로고침하거나 진행 화면으로 이동해도 같은 분석 흐름을 이어서 보여주기 위한 값입니다.
const ANALYSIS_PROGRESS_KEY = "skinflow_analysis_progress";
const ANALYSIS_RESULT_KEY = "skinflow_latest_analysis_result";
const ANALYSIS_PROGRESS_EVENT = "skinflow-analysis-progress";

// 분석 진행 화면에서 보여줄 현재 단계 정보를 저장합니다.
// 예를 들어 "얼굴 영역 확인 중", "피부 지표 분석 요청 중" 같은 상태를 localStorage에 넣어둡니다.
// 이렇게 해두면 /analysis/loading 페이지로 이동하거나 새로고침해도 진행 상태를 이어서 보여줄 수 있습니다.
function saveAnalysisProgress(progress) {
  const progressPayload = {
    updatedAt: new Date().toISOString(),
    path: "/analysis/loading",
    ...progress,
  };

  localStorage.setItem(ANALYSIS_PROGRESS_KEY, JSON.stringify(progressPayload));
  window.dispatchEvent(new Event(ANALYSIS_PROGRESS_EVENT));
}


// 가장 최근 분석 API 응답을 저장합니다.
// 분석 진행 화면과 결과 화면에서 같은 응답을 다시 확인할 수 있도록 임시 보관하는 역할입니다.
// 실제 DB 저장은 백엔드가 담당하고, 여기서는 프론트 화면 흐름을 위한 값만 저장합니다.
function saveLatestAnalysisResult(payload) {
  const resultPayload = {
    updatedAt: new Date().toISOString(),
    ...payload,
  };

  localStorage.setItem(ANALYSIS_RESULT_KEY, JSON.stringify(resultPayload));
}

// 분석 API 응답은 saved/status/code를 함께 확인해 완료와 AI 모델 대기 상태를 구분합니다.
// saved=true라도 status가 completed가 아니면 최종 결과가 아니므로 100% 완료로 표시하지 않습니다.
function getProgressFromAnalysisResult(analysisResult) {
  if (isCompletedAnalysisResult(analysisResult)) {
    return {
      status: "analysis_completed",
      label: "분석 결과 저장 완료",
      description: "색소침착·주름 분석 결과가 저장되었습니다. 결과 화면에서 확인할 수 있습니다.",
      progress: 100,
    };
  }

  const normalizedCode = String(analysisResult?.code || "").trim().toLowerCase();
  const normalizedStatus = String(analysisResult?.status || "").trim().toLowerCase();

  // AI_MODEL_PENDING과 pending은 실패가 아니라 결과 생성 전 상태이므로 재시도 가능한 안내로 유지합니다.
  if (normalizedCode === "ai_model_pending" || normalizedStatus === "pending") {
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

// ROI API 응답을 사용자가 이해할 수 있는 진행 상태 문구로 바꿉니다.
// ROI는 얼굴에서 이마/양볼처럼 분석에 필요한 영역을 찾는 단계입니다.
// 이 함수는 성공, 얼굴 미검출, 모델 준비 필요 같은 상태를 화면 안내 문구로 정리합니다.
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

// 사용자가 업로드할 수 있는 이미지 형식입니다.
// 현재 분석 요청은 JPG/PNG만 허용해 파일 형식 문제로 API가 실패하는 상황을 줄입니다.
const allowedImageTypes = ["image/jpeg", "image/png"];

// ROI 응답은 백엔드/AI 서버 응답 구조에 따라 roi, result.roi, result 형태로 올 수 있습니다.
// 화면에서는 같은 방식으로 쓰기 위해 가능한 위치를 순서대로 확인해 실제 ROI 데이터를 꺼냅니다.
function getRoiData(roiResult) {
  return roiResult?.roi || roiResult?.result?.roi || roiResult?.result || roiResult || null;
}

// ROI 결과가 실제 분석 단계로 넘어갈 수 있는 상태인지 확인합니다.
// status가 없거나 ok이면 정상으로 보고, no_face/model_missing 같은 값이면 분석 버튼 흐름을 막습니다.
function isRoiResultReady(roiResult) {
  const roiData = getRoiData(roiResult);
  const status = roiData?.status || roiResult?.status;

  return !status || status === "ok";
}

// ROI 좌표는 이미지 위에 박스로 표시되므로 0~1 범위의 정규화 좌표만 사용합니다.
// 좌표가 비정상인 항목은 표시하지 않아 사용자가 잘못된 영역을 확인하지 않게 합니다.
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

// 이미지가 object-fit: contain 형태로 보일 때 실제 표시 영역과 프레임 크기가 달라질 수 있습니다.
// 이 계산은 ROI 박스가 원본 이미지 비율에 맞춰 정확히 겹쳐 보이도록 보정합니다.
// 정규화된 ROI 좌표를 실제 화면의 미리보기 이미지 위에 표시할 CSS 위치값으로 바꿉니다.
// 서버가 보내는 좌표는 0~1 비율값이고, 화면 이미지는 기기마다 크기가 다르기 때문에 변환 과정이 필요합니다.
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

// 웹캠 사용이 끝났을 때 카메라 스트림을 정리합니다.
// 이 처리를 하지 않으면 브라우저에서 카메라가 계속 켜져 있거나 다른 화면에서도 점유될 수 있습니다.
function stopMediaStream(stream) {
  if (!stream) return;

  stream.getTracks().forEach((track) => {
    track.stop();
  });
}

// 웹캠으로 찍은 이미지는 처음에는 Blob 형태입니다.
// 분석 API는 File 객체를 보내는 흐름이므로, 촬영한 Blob을 JPG 파일처럼 사용할 수 있게 변환합니다.
function createCapturedImageFile(blob) {
  const capturedAt = new Date().toISOString().replace(/[:.]/g, "-");

  return new File([blob], `skinflow-webcam-${capturedAt}.jpg`, {
    type: "image/jpeg",
  });
}

// 화면 하단의 촬영/업로드 안내 카드에 들어가는 문구 목록입니다.
// 사용자가 어떤 사진을 선택해야 분석이 잘 진행되는지 알려주는 UX 안내 데이터입니다.
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

// 왼쪽 카드에 표시되는 분석 흐름 3단계입니다.
// 실제 버튼 동작과 연결된 설명이므로 사용자가 현재 어떤 순서로 진행되는지 이해할 수 있습니다.
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

// API 요청 실패 메시지를 사용자에게 보여줄 문장으로 바꿉니다.
// 서버 주소 문제, 로그인 만료, AI 서버 대기처럼 개발자용 에러를 그대로 보여주지 않기 위한 함수입니다.
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

// 분석 촬영 페이지 컴포넌트입니다.
// 이 안에서 업로드/웹캠 선택 상태, 선택된 파일, ROI 미리보기, 분석 요청 상태를 관리합니다.
function AnalysisCapturePage() {
  const navigate = useNavigate();
  // useRef는 화면 요소나 웹캠 스트림처럼 "다시 렌더링되어도 유지해야 하는 값"을 담을 때 사용합니다.
  // videoRef/canvasRef는 웹캠 촬영에, previewFrameRef는 ROI 박스를 이미지 위에 맞추는 데 사용합니다.
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const webcamStreamRef = useRef(null);
  const previewFrameRef = useRef(null);

  // 아래 useState들은 이 화면의 현재 상태를 저장합니다.
  // selectedMethod는 업로드/웹캠 중 어떤 입력 방식을 선택했는지,
  // selectedFile은 실제 분석에 보낼 이미지 파일,
  // uploadError는 사용자에게 보여줄 안내/오류 문구를 담당합니다.
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

  // 분석 API는 로그인 토큰이 필요한 보호 기능입니다.
  // 토큰이 없으면 분석 요청 대신 로그인 페이지로 이동시킵니다.
  const isLoggedIn = Boolean(localStorage.getItem("skinflow_token"));

  // 선택한 이미지 파일을 브라우저에서 미리보기로 보여주기 위한 임시 URL입니다.
  // useMemo를 사용해 selectedFile이 바뀔 때만 새 URL을 만들도록 합니다.
  const previewUrl = useMemo(() => {
    if (!selectedFile) return "";
    return URL.createObjectURL(selectedFile);
  }, [selectedFile]);

  // 미리보기 URL은 브라우저 메모리를 사용하므로, 더 이상 쓰지 않을 때 해제합니다.
  // 이미지 선택을 여러 번 해도 메모리가 계속 쌓이지 않도록 하는 정리 코드입니다.
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // 페이지를 벗어날 때 웹캠 스트림을 종료합니다.
  // 사용자가 다른 화면으로 이동했는데도 카메라가 계속 켜지는 문제를 막습니다.
  useEffect(() => {
    return () => {
      stopMediaStream(webcamStreamRef.current);
    };
  }, []);

  // ROI 박스를 이미지 위에 정확히 올리려면 미리보기 영역의 실제 크기를 알아야 합니다.
  // 화면 크기가 바뀔 수 있으므로 resize 이벤트에서도 다시 계산합니다.
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

  // 서버에서 받은 ROI 결과를 화면에 그릴 수 있는 영역 배열로 변환합니다.
  // useMemo를 사용해 ROI 결과가 바뀔 때만 다시 계산합니다.
  const roiPreviewRegions = useMemo(() => normalizeRoiRegions(roiPreviewResult), [roiPreviewResult]);
  const roiDisplayRegions = useMemo(
    () =>
      roiPreviewRegions.map((region) => ({
        ...region,
        style: getRoiRegionStyle(region, previewFrameSize, previewImageSize),
      })),
    [previewFrameSize, previewImageSize, roiPreviewRegions],
  );
  // 얼굴 관심 영역 확인이 끝났는지 판단하는 값입니다.
  // true가 되어야 실제 색소침착·주름 분석 요청 버튼 흐름으로 넘어갑니다.
  const hasConfirmedRoi = Boolean(roiPreviewResult) && isRoiResultReady(roiPreviewResult);
  const canStartAnalysis = Boolean(selectedFile) && !isSubmitting;
  // 버튼 문구는 현재 화면 흐름을 그대로 설명합니다.
  // 로그인 필요, 얼굴 영역 확인 전, 분석 요청 중 상태를 분리해 사용자가 다음 행동을 이해하게 합니다.
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

  // 선택한 이미지와 ROI 미리보기를 초기화합니다.
  // 업로드 ↔ 웹캠을 전환하거나 새 사진을 고를 때 이전 사진의 ROI가 남지 않게 합니다.
  const resetSelectedImage = () => {
    setSelectedFile(null);
    setSelectedFileName("");
    setRoiPreviewResult(null);
    setPreviewImageSize({ width: 0, height: 0 });
  };

  // 사용자가 "웹캠 촬영" 탭을 눌렀을 때 실행됩니다.
  // 입력 방식을 웹캠으로 바꾸고, 필요하면 이전 업로드 이미지를 초기화합니다.
  const handleSelectWebcam = () => {
    setSelectedMethod("webcam");
    setUploadError("");

    if (selectedMethod !== "webcam") {
      resetSelectedImage();
    }
  };

  // 사용자가 "이미지 업로드" 탭을 눌렀을 때 실행됩니다.
  // 웹캠이 켜져 있었다면 정리하고, 업로드 방식에 맞게 화면 상태를 되돌립니다.
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

  // 파일 선택 시에는 JPG/PNG만 허용하고, 기존 ROI 미리보기는 초기화합니다.
  // 다른 이미지를 고른 뒤 이전 ROI 박스가 남으면 사용자가 잘못된 사진을 확인할 수 있기 때문입니다.
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

  // 브라우저에 웹캠 권한을 요청하고 카메라 화면을 시작합니다.
  // 권한 거부, 브라우저 미지원, 기기 연결 문제를 사용자가 이해할 수 있는 문구로 처리합니다.
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

  // 현재 웹캠 화면을 캔버스에 그린 뒤 이미지 파일로 변환합니다.
  // 변환된 파일은 업로드 이미지와 같은 흐름으로 ROI 확인/분석 요청에 사용됩니다.
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
    // 캔버스 방향을 초기화한 뒤 미리보기와 같은 방향으로 좌우 보정합니다.
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0, width, height);
    context.setTransform(1, 0, 0, 1, 0, 0);

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

  // 첫 번째 단계는 얼굴 관심 영역 확인입니다.
  // 실제 점수 분석 전에 ROI를 먼저 보여줘 촬영 품질 문제를 사용자가 바로 알 수 있게 합니다.
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

  // 두 번째 단계는 같은 이미지로 색소침착·주름 분석을 요청하는 흐름입니다.
  // ROI 확인 없이 바로 분석하지 않도록 막아 실패 가능성과 사용자 혼란을 줄입니다.
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

  // 화면 하단의 주요 버튼이 눌렸을 때 실행됩니다.
  // ROI 확인 전이면 "얼굴 영역 확인", ROI 확인 후이면 "실제 분석 요청"으로 분기합니다.
  const handlePrimaryAction = () => {
    if (hasConfirmedRoi) {
      handleStartAnalysis();
      return;
    }

    handleConfirmFaceRegion();
  };

  return (
    <PageLayout>
      {/* 이 페이지 전용 스타일입니다.
          index.css 전체를 건드리지 않고 분석 촬영 화면만 빠르게 다듬기 위해 컴포넌트 안에 작성되어 있습니다. */}
      <style>
        {`
          .sf-capture-page {
            display: grid;
            gap: 18px;
            padding: 26px 0 42px;
          }

          .sf-capture-hero {
            display: grid;
            grid-template-columns: minmax(360px, 0.94fr) minmax(420px, 1.06fr);
            gap: 18px;
            align-items: stretch;
          }

          .sf-capture-intro,
          .sf-capture-workspace,
          .sf-capture-guide-card {
            border: 1px solid rgba(203, 213, 225, 0.74);
            background: rgba(255, 255, 255, 0.96);
            box-shadow: none;
          }

          .sf-capture-intro {
            display: flex;
            flex-direction: column;
            min-height: 100%;
            padding: 28px 24px;
          }

          .sf-capture-intro h1 {
            margin: 0 0 22px;
            color: #0f172a;
            font-size: clamp(34px, 3.7vw, 44px);
            line-height: 1.06;
            letter-spacing: -0.07em;
            word-break: keep-all;
          }

          .sf-title-line {
            display: block;
            white-space: nowrap;
          }

          .sf-gradient-text {
            display: inline-block;
            background: linear-gradient(90deg, #167d7f 0%, #14b8a6 58%, #22c5c8 100%);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
            -webkit-text-fill-color: transparent;
          }

          .sf-capture-note-list {
            display: grid;
            gap: 8px;
            margin: 0 0 20px;
          }

          .sf-note-row {
            display: grid;
            grid-template-columns: 18px 1fr;
            gap: 8px;
            align-items: flex-start;
            color: #475569;
            font-size: 12.5px;
            font-weight: 750;
            line-height: 1.62;
            word-break: keep-all;
          }

          .sf-note-row svg {
            margin-top: 2px;
            color: #167d7f;
          }

          .sf-flow-panel {
            margin-top: auto;
            padding: 14px;
            border-radius: 22px;
            border: 1px solid rgba(226, 232, 240, 0.9);
            background:
              radial-gradient(circle at 100% 100%, rgba(22, 125, 127, 0.08), transparent 34%),
              #ffffff;
          }

          .sf-section-label {
            display: block;
            margin-bottom: 10px;
            color: #167d7f;
            font-size: 11px;
            font-weight: 950;
            line-height: 1;
          }

          .sf-flow-list {
            display: grid;
            gap: 8px;
          }

          .sf-flow-item {
            display: grid;
            grid-template-columns: 40px minmax(0, 1fr) auto;
            gap: 12px;
            align-items: center;
            min-height: 58px;
            padding: 9px 10px;
            border-radius: 16px;
            border: 1px solid rgba(22, 125, 127, 0.12);
            background:
              linear-gradient(135deg, #ffffff 0%, #f8fafc 48%, #ecfeff 100%);
          }

          .sf-icon-tile {
            display: grid !important;
            place-items: center !important;
            width: 38px;
            height: 38px;
            min-width: 38px;
            min-height: 38px;
            border-radius: 15px;
            color: #167d7f;
            background: #ffffff;
            border: 1px solid rgba(226, 232, 240, 0.9);
            box-shadow: none;
            line-height: 0;
          }

          .sf-icon-tile svg {
            display: block;
            width: 18px !important;
            height: 18px !important;
            margin: 0;
            stroke-width: 2.2;
          }

          .sf-flow-copy strong,
          .sf-guide-row strong,
          .sf-method-copy strong {
            display: block;
            color: #0f172a;
            letter-spacing: -0.035em;
          }

          .sf-flow-copy strong {
            font-size: 13.5px;
          }

          .sf-flow-copy p {
            margin: 3px 0 0;
            color: #64748b;
            font-size: 11.5px;
            font-weight: 720;
            line-height: 1.45;
            word-break: keep-all;
          }

          .sf-flow-index {
            display: inline-grid;
            place-items: center;
            min-width: 28px;
            height: 22px;
            border-radius: 999px;
            color: #167d7f;
            background: rgba(22, 125, 127, 0.08);
            font-size: 10.5px;
            font-weight: 950;
          }

          .sf-capture-workspace {
            display: flex;
            flex-direction: column;
            gap: 12px;
            padding: 14px;
          }

          .sf-method-tabs {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }

          .sf-method-card {
            display: grid;
            grid-template-columns: 42px minmax(0, 1fr);
            gap: 12px;
            align-items: center;
            min-height: 74px;
            padding: 12px 14px;
            border-radius: 16px;
            border: 1px solid rgba(226, 232, 240, 0.92);
            background: #f8fafc;
            color: inherit;
            cursor: pointer;
            text-align: left;
            transition: border-color 0.18s ease, background 0.18s ease, transform 0.18s ease;
          }

          .sf-method-card:hover,
          .sf-method-card.is-active {
            border-color: rgba(22, 125, 127, 0.42);
            background:
              linear-gradient(135deg, #ffffff 0%, #f1fbfb 100%);
          }

          .sf-method-card.is-active {
            box-shadow: inset 0 0 0 1px rgba(22, 125, 127, 0.28);
          }

          .sf-method-card:focus {
            outline: none;
          }

          .sf-method-card:focus-visible {
            outline: 3px solid rgba(22, 125, 127, 0.18);
            outline-offset: 2px;
          }

          .sf-method-card:disabled {
            cursor: not-allowed;
            opacity: 0.64;
          }

          .sf-method-copy strong {
            font-size: 13.5px;
          }

          .sf-method-copy small {
            display: block;
            margin-top: 3px;
            color: #64748b;
            font-size: 11.5px;
            font-weight: 800;
            line-height: 1.35;
            word-break: keep-all;
          }

          .sf-upload-zone,
          .sf-webcam-zone {
            position: relative;
            display: grid;
            place-items: center;
            min-height: 318px;
            overflow: hidden;
            border-radius: 22px;
            border: 1px dashed rgba(22, 125, 127, 0.33);
            background:
              radial-gradient(circle at 78% 8%, rgba(22, 125, 127, 0.08), transparent 32%),
              radial-gradient(circle at 18% 86%, rgba(20, 184, 166, 0.07), transparent 30%),
              #f8fafc;
          }

          .sf-upload-zone {
            cursor: pointer;
          }

          .sf-upload-zone:hover,
          .sf-webcam-zone.is-clickable:hover {
            border-color: rgba(22, 125, 127, 0.5);
            background:
              radial-gradient(circle at 78% 8%, rgba(22, 125, 127, 0.1), transparent 32%),
              radial-gradient(circle at 18% 86%, rgba(20, 184, 166, 0.08), transparent 30%),
              #ffffff;
          }

          .sf-upload-zone input {
            position: absolute;
            inset: 0;
            opacity: 0;
            cursor: pointer;
          }

          .sf-upload-empty,
          .sf-webcam-placeholder-content {
            display: grid;
            justify-items: center;
            gap: 10px;
            padding: 22px;
            color: #0f172a;
            text-align: center;
          }

          .sf-upload-icon-large {
            display: grid;
            place-items: center;
            width: 56px;
            height: 56px;
            border-radius: 22px;
            color: #167d7f;
            background: #ffffff;
            border: 1px solid rgba(226, 232, 240, 0.95);
            box-shadow: none;
          }

          .sf-upload-empty h3,
          .sf-webcam-placeholder-content h3 {
            margin: 0;
            color: #0f172a;
            font-size: 20px;
            letter-spacing: -0.04em;
          }

          .sf-upload-empty p,
          .sf-webcam-placeholder-content p {
            max-width: 380px;
            margin: 0;
            color: #64748b;
            font-size: 12.5px;
            font-weight: 780;
            line-height: 1.58;
            word-break: keep-all;
          }

          .sf-upload-preview,
          .sf-webcam-panel {
            position: relative;
            width: 100%;
            min-height: 318px;
            overflow: hidden;
            border-radius: 22px;
            background: #f8fafc;
          }

          .sf-preview-media-frame {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 318px;
          }

          .sf-preview-media-frame img,
          .sf-webcam-panel video {
            display: block;
            width: 100%;
            height: 318px;
            object-fit: contain;
          }

          .sf-webcam-panel video {
            object-fit: cover;
            transform: scaleX(-1);
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
            background:
              radial-gradient(circle at 78% 8%, rgba(22, 125, 127, 0.11), transparent 34%),
              linear-gradient(135deg, #f8fafc 0%, #ffffff 58%, #ecfeff 100%);
          }

          .sf-webcam-canvas {
            display: none;
          }

          .sf-roi-overlay {
            position: absolute;
            inset: 0;
            pointer-events: none;
          }

          .sf-roi-preview-box {
            position: absolute;
            border: 2px solid rgba(22, 125, 127, 0.74);
            border-radius: 12px;
            background: rgba(22, 125, 127, 0.035);
          }

          .sf-roi-preview-box.is-skin {
            border-style: dashed;
            border-color: rgba(244, 63, 94, 0.58);
            background: rgba(244, 63, 94, 0.035);
          }

          .sf-webcam-actions {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }

          .sf-upload-actions {
            display: grid;
            grid-template-columns: 1fr;
            gap: 9px;
          }

          .sf-webcam-actions .sf-button,
          .sf-upload-actions .sf-button {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            min-height: 48px;
            box-shadow: none !important;
          }

          .sf-selected-file-chip {
            display: grid;
            grid-template-columns: auto minmax(0, 1fr) auto;
            gap: 8px;
            align-items: center;
            padding: 10px 12px;
            border-radius: 16px;
            color: #475569;
            background: #f8fafc;
            border: 1px solid rgba(226, 232, 240, 0.88);
            font-size: 12px;
            font-weight: 850;
          }

          .sf-selected-file-chip strong {
            overflow: hidden;
            color: #0f172a;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .sf-capture-error,
          .sf-roi-confirm-note {
            display: flex;
            align-items: flex-start;
            gap: 9px;
            padding: 11px 12px;
            border-radius: 16px;
            font-size: 12px;
            font-weight: 800;
            line-height: 1.52;
            word-break: keep-all;
          }

          .sf-capture-error {
            color: #be123c;
            background: rgba(244, 63, 94, 0.08);
            border: 1px solid rgba(244, 63, 94, 0.14);
          }

          .sf-roi-confirm-note {
            color: #475569;
            background: rgba(22, 125, 127, 0.07);
            border: 1px solid rgba(22, 125, 127, 0.13);
          }

          .sf-roi-confirm-note strong {
            display: block;
            margin-bottom: 2px;
            color: #0f172a;
          }

          .sf-start-help {
            margin: 0;
            color: #64748b;
            font-size: 11.5px;
            font-weight: 850;
            line-height: 1.5;
            text-align: center;
            word-break: keep-all;
          }

          .sf-action-label {
            display: inline-flex;
            align-items: center;
            line-height: 1;
          }

          .sf-action-label + svg {
            margin-left: 6px;
          }

          .sf-capture-guide-card {
            padding: 14px 16px;
            background:
              radial-gradient(circle at 100% 0%, rgba(22, 125, 127, 0.045), transparent 34%),
              rgba(248, 250, 252, 0.94);
          }

          .sf-guide-title {
            margin: 0 0 10px;
            color: #475569;
            font-size: 11px;
            font-weight: 950;
          }

          .sf-guide-list {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 10px;
          }

          .sf-guide-row {
            display: grid;
            grid-template-columns: 32px minmax(0, 1fr);
            gap: 10px;
            align-items: center;
            min-height: 56px;
            padding: 10px;
            border-radius: 14px;
            border: 1px solid rgba(226, 232, 240, 0.95);
            background: rgba(255, 255, 255, 0.88);
          }

          .sf-guide-row .sf-icon-tile {
            width: 30px;
            height: 30px;
            min-width: 30px;
            min-height: 30px;
            border-radius: 999px;
            background: rgba(22, 125, 127, 0.07);
            border-color: rgba(22, 125, 127, 0.13);
          }

          .sf-guide-row .sf-icon-tile svg {
            width: 15px !important;
            height: 15px !important;
          }

          .sf-guide-row strong {
            font-size: 13px;
          }

          .sf-guide-row span:not(.sf-icon-tile) {
            display: block;
            margin-top: 3px;
            color: #64748b;
            font-size: 11.3px;
            font-weight: 720;
            line-height: 1.42;
            word-break: keep-all;
          }

          @media (max-width: 1080px) {
            .sf-capture-hero {
              grid-template-columns: 1fr;
            }

            .sf-guide-list {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
          }

          @media (max-width: 720px) {
            .sf-capture-page {
              padding-top: 16px;
            }

            .sf-capture-intro,
            .sf-capture-workspace,
            .sf-capture-guide-card {
              padding: 16px;
            }

            .sf-capture-intro h1 {
              font-size: 32px;
            }

            .sf-title-line {
              white-space: normal;
            }

            .sf-method-tabs,
            .sf-webcam-actions,
            .sf-guide-list {
              grid-template-columns: 1fr;
            }

            .sf-flow-item {
              grid-template-columns: 38px minmax(0, 1fr) auto;
            }

            .sf-upload-zone,
            .sf-webcam-zone,
            .sf-upload-preview,
            .sf-webcam-panel,
            .sf-preview-media-frame,
            .sf-preview-media-frame img,
            .sf-webcam-panel video {
              min-height: 300px;
              height: 300px;
            }
          }
        `}
      </style>

      {/* 분석 촬영 화면의 전체 컨테이너입니다.
          왼쪽은 분석 흐름 안내, 오른쪽은 업로드/웹캠 작업 영역입니다. */}
      <div className="sf-capture-page">
        <section className="sf-capture-hero">
          <Card className="sf-capture-intro">
            <h1>
              <span className="sf-title-line">사진 업로드와 웹캠으로</span>
              <span className="sf-title-line sf-gradient-text">피부 분석을 시작하세요</span>
            </h1>

            <div className="sf-capture-note-list">
              <div className="sf-note-row">
                <CheckCircle2 size={16} />
                <span>얼굴이 중앙에 보이고 이마와 양볼이 가려지지 않은 사진을 사용해주세요.</span>
              </div>
              <div className="sf-note-row">
                <ShieldCheck size={16} />
                <span>결과는 피부 관리 참고 정보이며 추천 화면과 함께 확인할 수 있습니다.</span>
              </div>
            </div>

            <div className="sf-flow-panel">
              <span className="sf-section-label">분석 흐름</span>
              <div className="sf-flow-list">
                {flowSteps.map((step, index) => {
                  const StepIcon = index === 0 ? Upload : index === 1 ? ScanFace : Sparkles;

                  return (
                    <article className="sf-flow-item" key={step.title}>
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
            </div>
          </Card>

          <Card className="sf-capture-workspace">
            {/* 사용자가 이미지 업로드와 웹캠 촬영 중 하나를 고르는 탭 영역입니다. */}
            <div className="sf-method-tabs" aria-label="분석 이미지 입력 방식 선택">
              <button
                type="button"
                className={`sf-method-card ${selectedMethod === "upload" ? "is-active" : ""}`}
                onClick={handleSelectUpload}
                disabled={isSubmitting}
                aria-pressed={selectedMethod === "upload"}
              >
                <span className="sf-icon-tile" aria-hidden="true">
                  <Smartphone size={18} />
                </span>
                <div className="sf-method-copy">
                  <strong>이미지 업로드</strong>
                  <small>스마트폰 촬영 권장</small>
                </div>
              </button>

              <button
                type="button"
                className={`sf-method-card ${selectedMethod === "webcam" ? "is-active" : ""}`}
                onClick={handleSelectWebcam}
                disabled={isSubmitting}
                aria-pressed={selectedMethod === "webcam"}
              >
                <span className="sf-icon-tile" aria-hidden="true">
                  <Camera size={18} />
                </span>
                <div className="sf-method-copy">
                  <strong>웹캠 촬영</strong>
                  <small>기기 권한 필요</small>
                </div>
              </button>
            </div>

            {/* 선택한 입력 방식에 따라 웹캠 촬영 UI 또는 이미지 업로드 UI를 보여줍니다. */}
            {selectedMethod === "webcam" ? (
              <div
                className={`sf-webcam-zone ${!isWebcamActive && !selectedFile ? "is-clickable" : ""}`}
                role={!isWebcamActive && !selectedFile ? "button" : undefined}
                tabIndex={!isWebcamActive && !selectedFile ? 0 : undefined}
                onClick={!isWebcamActive && !selectedFile ? handleStartWebcam : undefined}
                onKeyDown={(event) => {
                  if (!isWebcamActive && !selectedFile && (event.key === "Enter" || event.key === " ")) {
                    event.preventDefault();
                    handleStartWebcam();
                  }
                }}
              >
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
                            <h3>{isStartingWebcam ? "웹캠 연결 중" : webcamStatus === "웹캠 준비 전" ? "웹캠 촬영" : webcamStatus}</h3>
                            <p>{isStartingWebcam ? "브라우저 권한을 확인하고 있습니다." : "이 영역을 클릭하면 웹캠이 시작됩니다."}</p>
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
                      <h3>이미지 업로드</h3>
                      <p>JPG 또는 PNG 파일을 선택하면 분석 시작 버튼이 활성화됩니다.</p>
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

            {selectedMethod === "webcam" && !selectedFile && (
              <div className="sf-webcam-actions">
                <Button
                  variant="secondary"
                  onClick={handleStartWebcam}
                  disabled={isSubmitting || isStartingWebcam || isWebcamActive}
                >
                  {isStartingWebcam ? "웹캠 연결 중" : isWebcamActive ? "웹캠 준비 완료" : "웹캠 켜기"}
                </Button>
                <Button
                  onClick={handleCaptureWebcam}
                  disabled={isSubmitting || isStartingWebcam || !isWebcamActive}
                >
                  촬영하기 <ArrowRight size={17} />
                </Button>
              </div>
            )}

            {selectedFile && (
              <div className="sf-selected-file-chip">
                <CheckCircle2 size={15} />
                <strong>{selectedFileName}</strong>
                <span>{selectedFile.type.replace("image/", "").toUpperCase()}</span>
              </div>
            )}

            {uploadError && (
              <div className="sf-capture-error">
                <AlertCircle size={17} />
                <span>{uploadError}</span>
              </div>
            )}

            {hasConfirmedRoi && (
              <div className="sf-roi-confirm-note">
                <CheckCircle2 size={17} />
                <span>
                  <strong>얼굴 영역 확인 완료</strong>
                  검출된 얼굴 관심 영역을 읽기 전용으로 표시했습니다. 이 사진으로 분석을 이어갈 수 있습니다.
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

        <Card className="sf-capture-guide-card">
          <p className="sf-guide-title">촬영 전 확인사항</p>
          <div className="sf-guide-list">
            {uploadGuideItems.map((item) => (
              <div className="sf-guide-row" key={item.title}>
                <span className="sf-icon-tile" aria-hidden="true">
                  <CheckCircle2 size={16} />
                </span>
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.description}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageLayout>
  );

}

export default AnalysisCapturePage;
