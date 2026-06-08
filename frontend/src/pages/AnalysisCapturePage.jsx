import {
  AlertCircle,
  ArrowRight,
  Camera,
  CheckCircle2,
  ImagePlus,
  Lightbulb,
  ScanFace,
  ShieldCheck,
  Upload,
} from "lucide-react";
import PageLayout from "../components/layout/PageLayout";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import Badge from "../components/common/Badge";
import SectionTitle from "../components/common/SectionTitle";

const captureTips = [
  "밝은 곳에서 정면 얼굴이 잘 보이도록 촬영해주세요.",
  "머리카락, 마스크, 손 등으로 얼굴을 가리지 말아주세요.",
  "흔들림이 적고 선명한 이미지를 사용하면 분석 안정성이 높아집니다.",
];

const checkItems = [
  {
    title: "정면 얼굴",
    description: "얼굴이 화면 중앙에 위치해야 합니다.",
  },
  {
    title: "충분한 조명",
    description: "너무 어둡거나 강한 역광은 피해주세요.",
  },
  {
    title: "선명한 이미지",
    description: "흔들림이 적은 이미지를 권장합니다.",
  },
];

function AnalysisCapturePage() {
  return (
    <PageLayout>
      <section className="capture-hero">
        <div className="capture-copy">
          <Badge>Skin Analysis</Badge>

          <h1>
            얼굴 이미지를 준비하고
            <br />
            피부 분석을 시작하세요
          </h1>

          <p>
            웹캠으로 촬영하거나 이미지를 업로드하면 색소침착과 주름 지표를
            기반으로 피부 상태를 분석합니다.
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
              <span className="capture-card-label">Webcam Preview</span>
              <h2>촬영 준비</h2>
            </div>
            <Badge variant="primary">대기중</Badge>
          </div>

          <div className="camera-preview-box">
            <div className="face-guide">
              <ScanFace size={72} />
              <span>얼굴을 가이드 영역에 맞춰주세요</span>
            </div>

            <div className="corner corner-left-top" />
            <div className="corner corner-right-top" />
            <div className="corner corner-left-bottom" />
            <div className="corner corner-right-bottom" />
          </div>

          <div className="camera-action-row">
            <Button variant="secondary" full>
              웹캠 켜기 <Camera size={18} />
            </Button>
            <Button to="/analysis/loading" full>
              분석 요청하기 <ArrowRight size={18} />
            </Button>
          </div>
        </Card>
      </section>

      <section className="capture-section">
        <SectionTitle
          eyebrow="Input Method"
          title="분석 이미지를 선택하는 두 가지 방법"
          description="현재 단계에서는 UI 흐름을 먼저 구성하고, 이후 웹캠 및 이미지 업로드 기능을 API와 연동할 예정입니다."
        />

        <div className="capture-input-grid">
          <Card className="capture-input-card">
            <div className="input-card-icon">
              <Camera size={28} />
            </div>
            <h3>웹캠 촬영</h3>
            <p>
              웹캠을 이용해 정면 얼굴 이미지를 촬영하고 바로 피부 분석을 요청할 수 있습니다.
            </p>
            <Button variant="secondary" size="sm">
              웹캠 촬영 선택
            </Button>
          </Card>

          <Card className="capture-input-card upload-card">
            <div className="input-card-icon">
              <ImagePlus size={28} />
            </div>
            <h3>이미지 업로드</h3>
            <p>
              이미 촬영된 얼굴 이미지를 업로드하여 피부 분석에 사용할 수 있습니다.
            </p>

            <label className="upload-dropzone">
              <Upload size={22} />
              <span>이미지 파일 선택</span>
              <small>JPG, PNG 파일 권장</small>
              <input type="file" accept="image/png, image/jpeg" />
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
              <span className="capture-card-label">Before Analysis</span>
              <h2>분석 전 체크리스트</h2>
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
              <span className="capture-card-label">Notice</span>
              <h2>분석 안내</h2>
            </div>
          </div>

          <div className="capture-notice-content">
            <div className="notice-row">
              <AlertCircle size={20} />
              <p>
                SkinFlow의 피부 분석 결과는 피부 관리 참고 정보이며 의료적 판단이나
                치료 목적의 정보가 아닙니다.
              </p>
            </div>

            <div className="notice-row">
              <AlertCircle size={20} />
              <p>
                이미지 품질, 조명, 각도에 따라 분석 결과가 달라질 수 있으므로 동일한
                환경에서 주기적으로 분석하는 것을 권장합니다.
              </p>
            </div>
          </div>

          <Button to="/analysis/loading" full>
            분석 진행 화면으로 이동 <ArrowRight size={18} />
          </Button>
        </Card>
      </section>
    </PageLayout>
  );
}

export default AnalysisCapturePage;