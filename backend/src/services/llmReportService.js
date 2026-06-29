const llmReportRepository = require('../repositories/llmReportRepository');
const { getRecommendationSnapshotForAnalysis } = require('./recommendationService');
const {
    buildFingerprint,
    findReusableReport,
    toCompactInput,
    toPromptEnvelope,
    toReportResponse,
} = require('./llmReport/llmReportFormatter');
const { requestGeminiReport } = require('./llmReport/llmReportGeminiClient');

// LLM 리포트 service는 분석/추천 스냅샷을 짧은 JSON 리포트로 생성하거나 재사용합니다.
async function getOrCreateLlmReport(userId, analysisId) {
    // 이미 저장된 리포트가 있으면 API 비용 없이 DB 결과를 바로 반환합니다.
    const existing = await llmReportRepository.findReportByAnalysisId(userId, analysisId);

    if (existing) {
        return toReportResponse(existing, 'database');
    }

    const snapshot = await getRecommendationSnapshotForAnalysis(userId, analysisId);

    if (!snapshot) {
        return null;
    }

    snapshot.careGuides = await llmReportRepository.findCareGuidesByAnalysisId(userId, analysisId);

    const compactInput = toCompactInput(snapshot);
    const fingerprint = buildFingerprint(compactInput);
    const reusableReport = findReusableReport(
        await llmReportRepository.findRecentReportsByUserId(userId, analysisId),
        fingerprint,
    );

    if (reusableReport) {
        // 최근 리포트 중 입력 지문이 같으면 내용을 복사해 현재 분석 이력에 연결합니다.
        const copied = await llmReportRepository.createReport({
            analysisId,
            promptText: toPromptEnvelope({
                fingerprint,
                compactInput,
                provider: 'copied',
                reusedFromAnalysisId: reusableReport.skin_analysis_id,
            }),
            explanationText: reusableReport.explanation_text,
            languageCode: reusableReport.language_code || 'ko',
        });

        return toReportResponse(copied, 'copied');
    }

    const generated = await requestGeminiReport(compactInput);
    const created = await llmReportRepository.createReport({
        analysisId,
        promptText: toPromptEnvelope({
            fingerprint,
            compactInput,
            provider: generated.model,
        }),
        explanationText: JSON.stringify(generated.report),
        languageCode: 'ko',
    });

    return toReportResponse(created, 'generated');
}

module.exports = {
    getOrCreateLlmReport,
};
