const axios = require("axios");
const vectorSearchService = require("./vectorSearchService");
const { fixedAnswers } = require("../../data/chatFaqs");
const { GoogleGenAI } = require("@google/genai");
const { getRelevantKnowledge } = require("./knowledgeService");

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
 async function getVectorKnowledge(message) {
  try {
    const response = await axios.post("http://localhost:8000/search", {
      query: message,
      top_k: 3,
    });

    const results = response.data.results || [];

    if (results.length === 0) {
      return "";
    }

    return results
      .map((item) => {
        return `
[문서명: ${item.file}]
${item.text}
`;
      })
      .join("\n\n---\n\n");
  } catch (error) {
    console.error("FAISS 검색 실패:", error.message);
    return "";
  }
}

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

  const vectorKnowledge =
  await getVectorKnowledge(trimmedMessage);

const keywordKnowledge =
  getRelevantKnowledge(trimmedMessage);

const knowledge =
  vectorKnowledge || keywordKnowledge;

  const prompt = `
너는 SkinFlow의 피부 상담 챗봇이다.

규칙:
- 피부 관리, 화장품 성분, 스킨케어 루틴, 생활습관 관련 질문에만 답변한다.
- 사용자의 피부 분석 결과가 있으면 그 결과를 우선 반영한다.
- 참고 문서가 있으면 반드시 참고 문서를 우선 기반으로 답변한다.
- 참고 문서에 없는 내용은 단정하지 않는다.
- 화장품 성분 설명이 가능하다.
- 피부 타입별 관리법을 알려준다.
- 생활습관과 식습관 조언이 가능하다.
- 의료 진단은 하지 않는다.
- 피부 질환은 병원 진료를 권장한다.
- "치료된다", "완치된다", "없어진다", "반드시 개선된다", "100% 효과" 같은 표현은 사용하지 않는다.
- "도움을 줄 수 있다", "활용될 수 있다", "개인차가 있다" 표현을 사용한다.
- 답변은 최대 3~5문장으로 작성한다.
- 번호 목록을 사용하지 않는다.
- 마크다운을 사용하지 않는다.
- 불필요한 인사말은 하지 않는다.
- 같은 질문에는 최대한 같은 구조와 표현으로 답변한다.
- 핵심만 간결하게 설명한다.

${analysisText}

참고 문서:
${knowledge || "관련 참고 문서 없음"}

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