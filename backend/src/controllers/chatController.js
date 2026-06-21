const { getChatResponse } = require('../services/chatService');

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

    const result = await getChatResponse({
        message,
        analysisResult: req.body?.analysisResult || null,
    });

    return res.json(result);
}

module.exports = {
    sendChatMessage,
};
