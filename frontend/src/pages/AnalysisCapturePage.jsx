import { useState } from "react";
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
  Upload,
} from "lucide-react";
import PageLayout from "../components/layout/PageLayout";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import Badge from "../components/common/Badge";
import SectionTitle from "../components/common/SectionTitle";
import { extractRoi } from "../api/analysisApi";

const captureTips = [
  "밝은 곳에서 정면 얼굴이 잘 보이도록 준비해주세요.",
  "머리카락, 마스크, 손 등으로 얼굴을 가리지 말아주세요.",
  "안경 반사, 강한 역광, 흔들림이 있는 이미지는 피해주세요.",
  "가능하면 매번 비슷한 환경에서 분석하면 변화 흐름을 비교하기 좋습니다.",
];

const checkItems = [
  {
    title: "정면 얼굴",
    description: "얼굴이 화면 중앙에 위치하고 양쪽 볼과 이마가 잘 보여야 합니다.",
  },
  {
    title: "충분한 조명",
    description: "너무 어둡거나 강한 역광이 있는 환경은 피해주세요.",
  },
  {
    title: "선명한 이미지",
    description: "흔들림이 적고 초점이 맞은 이미지를 사용하는 것이 좋습니다.",
  },
  {
    title: "가림 요소 제거",
    description: "마스크, 손, 머리카락 등 얼굴을 가리는 요소를 최소화해주세요.",
  },
];

const allowedImageTypes = ["image/jpeg", "image/png"];

function AnalysisCapturePage() {
  const navigate = useNavigate();

  const [selectedMethod, setSelectedMethod] = useState("webcam");
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLoggedIn = Boolean(localStorage.getItem("skinflow_token"));

  const selectedMethodLabel = selectedMethod === "webcam" ? "웹캠 촬영" : "이미지 업로드";

  const handleSelectWebcam = () => {
    setSelectedMethod("webcam");
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
      setUploadError("이미지 업로드 방식을 선택한 경우 파일을 먼저 선택해주세요.");
      return;
    }

    if (selectedMethod === "webcam") {
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

      const roiResponse = await extractRoi(selectedFile);

      navigate("/analysis/loading", {
        state: {
          analysisInput: {
            method: "upload",
            fileName: selectedFile.name,
            roiResult: roiResponse?.result || null,
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
      setUploadError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageLayout>
      <section className="capture-hero">
        <div className="capture-copy">
          <Badge>피부 분석 준비</Badge>

          <h1>
            얼굴 이미지를 준비하고
            <br />
            분석 흐름을 시작하세요
          </h1>

          <p>
            웹캠 촬영 또는 이미지 업로드 중 원하는 방식을 선택한 뒤, 색소침착과
            주름 중심의 피부 분석 결과를 확인할 수 있습니다. 분석 결과는 피부
            관리에 참고할 수 있는 정보로 제공됩니다.
          </p>

          <div className="capture-tip-list">
            {captureTips.map((tip) => (
              <div className="capture-tip-item" key={tip}>
                <CheckCircle2 size={18} />
                <span>{tip}</span>
              </div>
            ))}
          </div>
        </div>

        <Card className="capture-camera-card">
          <div className="camera-card-top">
            <div>
              <span className="capture-card-label">선택한 입력 방식</span>
              <h2>{selectedMethodLabel}</h2>
            </div>
            <Badge variant={isLoggedIn ? "primary" : "accent"}>
              {isLoggedIn ? "분석 가능" : "로그인 필요"}
            </Badge>
          </div>

          <div className="camera-preview-box">
            <div className="face-guide">
              <ScanFace size={72} />
              <span>
                {selectedMethod === "webcam"
                  ? "얼굴을 가이드 영역에 맞춰주세요"
                  : selectedFileName || "업로드할 얼굴 이미지를 선택해주세요"}
              </span>
            </div>

            <div className="corner corner-left-top" />
            <div className="corner corner-right-top" />
            <div className="corner corner-left-bottom" />
            <div className="corner corner-right-bottom" />
          </div>

          {uploadError && (
            <div className="auth-message error">
              <AlertCircle size={18} />
              <span>{uploadError}</span>
            </div>
          )}

          <div className="camera-action-row">
            <Button
              variant={selectedMethod === "webcam" ? "primary" : "secondary"}
              full
              onClick={handleSelectWebcam}
              disabled={isSubmitting}
            >
              웹캠 촬영 선택 <Camera size={18} />
            </Button>

            <Button full onClick={handleStartAnalysis} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  ROI 분석 요청 중 <Loader2 size={18} />
                </>
              ) : (
                <>
                  {isLoggedIn ? "분석 진행하기" : "로그인 후 분석하기"} <ArrowRight size={18} />
                </>
              )}
            </Button>
          </div>
        </Card>
      </section>

      <section className="capture-section">
        <SectionTitle
          eyebrow="입력 방식"
          title="분석에 사용할 얼굴 이미지를 선택하세요"
          description="웹캠 촬영과 이미지 업로드 중 편한 방식을 선택할 수 있습니다. 현재 화면은 분석 시작 전 사용자 흐름을 안내하며, 실제 분석 결과는 이후 분석 진행 화면에서 확인합니다."
        />

        <div className="capture-input-grid">
          <Card className="capture-input-card">
            <div className="input-card-icon">
              <Camera size={28} />
            </div>
            <h3>웹캠 촬영</h3>
            <p>
              현재 기기에서 바로 얼굴 이미지를 준비하는 방식입니다. 정면 얼굴과
              조명 상태를 확인한 뒤 분석 흐름으로 이동할 수 있습니다.
            </p>
            <Button
              variant={selectedMethod === "webcam" ? "primary" : "secondary"}
              size="sm"
              onClick={handleSelectWebcam}
              disabled={isSubmitting}
            >
              웹캠 촬영 선택
            </Button>
          </Card>

          <Card className="capture-input-card upload-card">
            <div className="input-card-icon">
              <ImagePlus size={28} />
            </div>
            <h3>이미지 업로드</h3>
            <p>
              이미 촬영해 둔 얼굴 이미지를 분석에 사용할 수 있습니다. 선명하고
              얼굴이 잘 보이는 JPG 또는 PNG 파일을 권장합니다.
            </p>

            <label className="upload-dropzone">
              <Upload size={22} />
              <span>{selectedFileName || "이미지 파일 선택"}</span>
              <small>JPG, PNG 파일 권장</small>
              <input
                type="file"
                accept="image/png, image/jpeg"
                onChange={handleFileChange}
                disabled={isSubmitting}
              />
            </label>
          </Card>
        </div>
      </section>

      <section className="capture-bottom-grid">
        <Card className="capture-check-card">
          <div className="capture-card-header">
            <div className="capture-icon-box">
              <ShieldCheck size={24} />
            </div>
            <div>
              <span className="capture-card-label">분석 전 확인</span>
              <h2>촬영 품질 체크리스트</h2>
            </div>
          </div>

          <div className="capture-check-list">
            {checkItems.map((item) => (
              <div className="capture-check-item" key={item.title}>
                <CheckCircle2 size={20} />
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.description}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="capture-notice-card">
          <div className="capture-card-header">
            <div className="capture-icon-box accent">
              <Lightbulb size={24} />
            </div>
            <div>
              <span className="capture-card-label">안내 사항</span>
              <h2>분석 결과 활용 안내</h2>
            </div>
          </div>

          <div className="capture-notice-content">
            <div className="notice-row">
              <AlertCircle size={20} />
              <p>
                SkinFlow의 피부 분석 결과는 피부 관리 참고 정보이며, 의료적 판단이나
                치료 목적의 정보가 아닙니다.
              </p>
            </div>

            <div className="notice-row">
              <AlertCircle size={20} />
              <p>
                이미지 품질, 조명, 각도에 따라 분석 결과가 달라질 수 있습니다.
                변화 흐름을 비교하려면 비슷한 환경에서 주기적으로 분석하는 것을 권장합니다.
              </p>
            </div>

            <div className="notice-row">
              <AlertCircle size={20} />
              <p>
                분석 후에는 색소침착, 주름 중심의 결과와 함께 성분 추천, 제품 추천,
                식습관 가이드, 분석 이력 흐름으로 이어집니다.
              </p>
            </div>
          </div>

          <Button full onClick={handleStartAnalysis} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                ROI 분석 요청 중 <Loader2 size={18} />
              </>
            ) : (
              <>
                {isLoggedIn ? "분석 진행 화면으로 이동" : "로그인하고 분석 시작하기"}{" "}
                <ArrowRight size={18} />
              </>
            )}
          </Button>
        </Card>
      </section>
    </PageLayout>
  );
}

export default AnalysisCapturePage;