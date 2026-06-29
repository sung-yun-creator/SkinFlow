// chatApi.js
// 채팅 위젯에서 사용하는 API 함수입니다.
// 화면 컴포넌트는 메시지를 넘기고, 이 파일은 백엔드 /api/chat 엔드포인트로 요청을 보냅니다.
import http from "./http";

// message는 사용자가 입력한 질문입니다.
// analysisResult는 필요할 때 현재 분석 결과를 함께 보내 답변 맥락으로 사용할 수 있는 선택 값입니다.
async function sendChatMessage(message, analysisResult = null) {
  return http.post("/api/chat", {
    message,
    analysisResult,
  });
}

export {
  sendChatMessage,
};
