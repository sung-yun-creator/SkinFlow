const { GoogleGenAI } = require("@google/genai");

console.log("KEY EXISTS:", !!process.env.GEMINI_API_KEY);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const blockMessage =
  "SkinFlow 챗봇은 피부 관리, 화장품 성분, 스킨케어 루틴, 생활습관 관련 질문에만 답변할 수 있습니다.";

const allowedKeywords = [
  "피부", "스킨케어", "화장품", "성분",
  "색소침착", "기미", "잡티", "미백",
  "모공", "피지", "블랙헤드",
  "주름", "탄력", "노화",
  "여드름", "트러블",
  "건성", "지성", "복합성", "민감성",
  "보습", "수분", "장벽", "진정",
  "선크림", "자외선", "클렌징", "세안",
  "운동", "땀", "식습관", "수면", "생활습관",
  "나이아신아마이드", "비타민", "레티놀", "아데노신",
];

const fixedAnswers = {
  "운동 후 스킨케어 루틴 알려줘":
    "운동 후에는 땀과 피지가 피부에 오래 남지 않도록 가볍게 세안하는 것이 좋습니다. 건성 피부라면 세안 후 수분감 있는 제품과 보습제를 함께 사용해 피부 장벽을 보호해주세요. 색소침착이 고민이라면 낮 운동 후 자외선 차단제를 다시 바르는 것도 중요합니다.",

  "건성 피부 관리법 알려줘":
    "건성 피부는 세안 후 피부 장벽을 지키는 보습 관리가 중요합니다. 세안 직후 수분감 있는 토너나 에센스로 피부를 정돈하고, 세라마이드나 히알루론산 계열 보습제를 충분히 발라주세요. 색소침착 점수가 높은 편이라면 아침에는 자외선 차단제를 꼭 사용하고, 자극이 강한 각질 제거는 자주 하지 않는 것이 좋습니다.",

  "색소침착 관리 방법 알려줘":
    "색소침착 관리는 자외선 차단이 가장 중요합니다. 아침에는 자외선 차단제를 충분히 바르고, 나이아신아마이드나 비타민 C 유도체 같은 브라이트닝 성분을 참고할 수 있습니다. 건성 피부라면 미백 성분만 단독으로 쓰기보다 보습제를 함께 사용해 자극을 줄이는 것이 좋습니다.",

  "지성피부관리법":
    "지성 피부는 과도한 피지를 부드럽게 조절하면서 피부 장벽을 무너뜨리지 않는 관리가 중요합니다. 세안은 하루 2회 정도로 유지하고, 가벼운 젤 타입 보습제를 사용해 수분 균형을 맞춰주세요. 모공과 피지가 고민이라면 나이아신아마이드 성분을 참고할 수 있으며, 자극적인 각질 제거는 자주 하지 않는 것이 좋습니다.",

  "지성 피부 관리법 알려줘":
    "지성 피부는 과도한 피지를 부드럽게 조절하면서 피부 장벽을 무너뜨리지 않는 관리가 중요합니다. 세안은 하루 2회 정도로 유지하고, 가벼운 젤 타입 보습제를 사용해 수분 균형을 맞춰주세요. 모공과 피지가 고민이라면 나이아신아마이드 성분을 참고할 수 있으며, 자극적인 각질 제거는 자주 하지 않는 것이 좋습니다.",

  "모공 관리법 알려줘":
    "모공 관리는 피지 조절과 피부 장벽 관리가 함께 필요합니다. 과도한 세안이나 강한 스크럽은 피하고, 가벼운 클렌징과 충분한 보습으로 피부 균형을 유지하는 것이 좋습니다. 피지와 모공이 고민이라면 나이아신아마이드 성분을 참고할 수 있으며, 자외선 차단도 함께 관리해야 합니다.",

  "주름 관리법 알려줘":
    "주름 관리는 보습, 자외선 차단, 피부 장벽 관리가 기본입니다. 건조함이 심하면 잔주름이 더 도드라져 보일 수 있으므로 세안 후 보습제를 충분히 사용해주세요. 아데노신이나 레티놀 계열 성분을 참고할 수 있지만, 자극이 느껴지면 사용 빈도를 줄이는 것이 좋습니다.",

  "선크림 사용법 알려줘":
    "선크림은 아침 스킨케어 마지막 단계에서 충분한 양을 고르게 바르는 것이 중요합니다. 야외 활동이나 땀이 많은 날에는 2~3시간 간격으로 덧바르는 것이 좋습니다. 색소침착이 고민이라면 흐린 날이나 실내에서도 자외선 차단을 꾸준히 하는 것이 도움이 됩니다.",

  "여드름 관리법 알려줘":
    "여드름 관리는 과도한 피지와 자극을 줄이는 방향으로 접근하는 것이 좋습니다. 세안은 부드럽게 하고, 무거운 제품보다는 논코메도제닉이나 가벼운 제형을 선택하는 것이 도움이 됩니다. 염증이 심하거나 반복되는 여드름은 피부과 진료를 권장합니다.",

  "민감성 피부 관리법 알려줘":
    "민감성 피부는 새로운 성분을 한 번에 많이 추가하기보다 최소한의 제품으로 피부 반응을 확인하는 것이 중요합니다. 세안은 순한 제품으로 짧게 하고, 진정과 보습 중심의 제품을 사용하는 것이 좋습니다. 따가움이나 붉어짐이 지속되면 사용 중인 제품을 줄이고 전문 진료를 권장합니다.",
};

const normalizeText = (text) => {
  return text.replace(/\s/g, "").toLowerCase();
};

const isSkinRelatedQuestion = (message) => {
  const normalizedMessage = normalizeText(message);

  return allowedKeywords.some((keyword) =>
    normalizedMessage.includes(normalizeText(keyword))
  );
};
const getFixedAnswer = (message) => {
  const normalizedMessage = normalizeText(message);

  const matchedQuestion = Object.keys(fixedAnswers).find((question) => {
    return normalizeText(question) === normalizedMessage;
  });
 
  return matchedQuestion ? fixedAnswers[matchedQuestion] : null;
};

const getChatResponse = async (message, analysisResult) => {
  const trimmedMessage = message.trim();

const fixedAnswer = getFixedAnswer(trimmedMessage);

if (fixedAnswer) {
  return fixedAnswer;
}

  if (!isSkinRelatedQuestion(trimmedMessage)) {
  return "";
}

  const analysisText = analysisResult
    ? `
사용자 피부 분석 결과:
- 피부 타입: ${analysisResult.skinType ?? "정보 없음"}
- 색소침착: ${analysisResult.pigmentation ?? "정보 없음"}
- 모공: ${analysisResult.pore ?? "정보 없음"}
- 주름: ${analysisResult.wrinkle ?? "정보 없음"}
`
    : `
사용자 피부 분석 결과:
- 아직 제공되지 않음
`;

  const prompt = `
너는 SkinFlow의 피부 상담 챗봇이다.

규칙:
- 피부 관리, 화장품 성분, 스킨케어 루틴, 생활습관 관련 질문에만 답변한다.
- 사용자의 피부 분석 결과가 있으면 그 결과를 우선 반영한다.
- 화장품 성분 설명이 가능하다.
- 피부 타입별 관리법을 알려준다.
- 생활습관과 식습관 조언이 가능하다.
- 의료 진단은 하지 않는다.
- 피부 질환은 병원 진료를 권장한다.
- 답변은 최대 3~5문장으로 작성한다.
- 번호 목록을 사용하지 않는다.
- 마크다운을 사용하지 않는다.
- 불필요한 인사말은 하지 않는다.
- 같은 질문에는 최대한 같은 구조와 표현으로 답변한다.
- 핵심만 간결하게 설명한다.

${analysisText}

사용자 질문:
${trimmedMessage}
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.2,
        topP: 0.8,
      },
    });

    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);

    return "현재 AI 서버 사용량이 많아 답변을 생성하지 못했습니다. 잠시 후 다시 시도해주세요.";
  }
};

module.exports = {
  getChatResponse,
};