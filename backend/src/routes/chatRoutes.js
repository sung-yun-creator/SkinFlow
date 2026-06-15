const express = require("express");
const { getChatResponse } = require("../services/chatService");

const router = express.Router();

router.post("/", async (req, res, next) => {
    try {
        const { message, analysisResult } = req.body;

        if (!message) {
            return res.status(400).json({
                message: "message가 필요합니다.",
            });
        }

        const answer = await getChatResponse(message, analysisResult);

        return res.json({
            success: true,
            answer,
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;