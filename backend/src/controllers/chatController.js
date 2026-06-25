const { getChatResponse } = require('../services/chatService');

// 챗봇 controller는 질문 길이와 필수값만 확인한 뒤 답변 생성 흐름으로 넘깁니다.
async function sendChatMessage(req, res) {
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';

    if (!message) {
        return res.status(400).json({
            code: 'CHAT_MESSAGE_REQUIRED',
            message: '질문 내용을 입력해 주세요.',
            result: null,
        });
    }

    if (message.length > 500) {
        return res.status(400).json({
            code: 'CHAT_MESSAGE_TOO_LONG',
            message: '질문은 500자 이내로 입력해 주세요.',
            result: null,
        });
    }

    // 분석 결과를 함께 보내면 챗봇 답변에서 사용자 상태 참고값으로 사용할 수 있습니다.
    const result = await getChatResponse({
        message,
        analysisResult: req.body?.analysisResult || null,
    });

    return res.json(result);
}

module.exports = {
    sendChatMessage,
};
