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

export const sendChatMessage = async (message) => {
  const response = await axios.post("http://localhost:3000/api/chat", {
    message,
  });

  return response.data;
};
