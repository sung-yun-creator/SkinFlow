const { GoogleGenAI } = require("@google/genai");

console.log("KEY EXISTS:", !!process.env.GEMINI_API_KEY);

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

const getChatResponse = async (message, analysisResult) => {
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
- 피부 관리 중심으로 답변한다.
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
- 핵심만 간결하게 설명한다.

${analysisText}

사용자 질문:
${message}
`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
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