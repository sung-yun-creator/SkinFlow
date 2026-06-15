import axios from "axios";

export const sendChatMessage = async (message) => {
  const response = await axios.post("http://localhost:3000/api/chat", {
    message,
  });

  return response.data;
};