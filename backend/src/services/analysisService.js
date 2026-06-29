const analysisRepository = require('../repositories/analysisRepository');
const { deleteStoredImage, savePrivacyImage } = require('./analysisImageStorageService');
const { analyzeSkin, extractRoi } = require('./analysis/analysisAiClient');
const { normalizeAnalysisResult } = require('./analysis/analysisResultNormalizer');

// 분석 service는 AI 서버 호출, 결과 정규화, DB 저장 여부 판단을 담당합니다.
function toStoredRois(roiResult) {
    // AI 서버가 ok 상태로 반환한 얼굴/부위 ROI만 DB 저장 대상 좌표로 변환합니다.
    if (roiResult?.roi?.status !== 'ok') {
        return [];
    }

    const regions = [];

    if (roiResult.roi.face?.pixel) {
        regions.push(roiResult.roi.face);
    }

    if (Array.isArray(roiResult.roi.regions)) {
        regions.push(...roiResult.roi.regions);
    }

    return regions.filter((region) => region.name && region.pixel);
}

async function extractAndSaveRoi(userId, analysisId, file) {
    // 다른 사용자의 분석 이력에 ROI가 저장되지 않도록 먼저 소유자 검사를 합니다.
    const analysis = await analysisRepository.findAnalysisByIdAndUserId(userId, analysisId);

    if (!analysis) {
        return null;
    }

    const roiResult = await extractRoi(file);
    const rois = toStoredRois(roiResult);

    if (roiResult?.roi?.status !== 'ok') {
        return {
            ...roiResult,
            saved: {
                analysisId,
                roiCount: 0,
                skipped: true,
            },
        };
    }

    const savedCount = await analysisRepository.replaceAnalysisRois(analysisId, rois);

    return {
        ...roiResult,
        saved: {
            analysisId,
            roiCount: savedCount,
        },
    };
}

async function analyzeAndSaveSkin(userId, file) {
    const aiResult = await analyzeSkin(file);
    const normalized = normalizeAnalysisResult(aiResult);

    if (!normalized.persistable) {
        // 실패/대기/비정상 결과는 사용자에게 반환만 하고 DB 분석 이력은 만들지 않습니다.
        return {
            saved: false,
            ...normalized,
        };
    }

    // 저장 가능한 결과일 때만 마스킹 이미지를 파일로 남기고 분석 데이터와 연결합니다.
    const storedImage = await savePrivacyImage(aiResult?.privacy_image);

    try {
        const savedAnalysis = await analysisRepository.createAnalysisWithMetrics(userId, normalized, storedImage);

        return {
            saved: true,
            ...savedAnalysis,
            roi: normalized.roi,
        };
    } catch (error) {
        await deleteStoredImage(storedImage).catch(() => {});
        throw error;
    }
}

module.exports = {
    analyzeAndSaveSkin,
    analyzeSkin,
    extractAndSaveRoi,
    extractRoi,
    normalizeAnalysisResult,
};
