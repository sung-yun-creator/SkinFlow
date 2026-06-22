import http from "./http";

async function sendChatMessage(message, analysisResult = null) {
  return http.post("/api/chat", {
    message,
    analysisResult,
  });
}

export {
  sendChatMessage,
};
