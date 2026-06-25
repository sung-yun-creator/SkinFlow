const fs = require('fs/promises');

const analysisRepository = require('../repositories/analysisRepository');
const { toStoredImagePath } = require('./analysisImageStorageService');

const DEFAULT_IMAGE_RETENTION_DAYS = 30;
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

// 오래된 마스킹 이미지 파일과 DB 행을 주기적으로 정리하는 service입니다.
function getImageRetentionDays() {
    const days = Number(process.env.IMAGE_RETENTION_DAYS || DEFAULT_IMAGE_RETENTION_DAYS);

    return Number.isFinite(days) && days > 0 ? Math.floor(days) : DEFAULT_IMAGE_RETENTION_DAYS;
}

async function deleteFileIfExists(fileName) {
    const filePath = toStoredImagePath(fileName);

    if (!filePath) {
        return false;
    }

    await fs.unlink(filePath).catch((error) => {
        if (error.code !== 'ENOENT') {
            throw error;
        }
    });

    return true;
}

async function cleanupExpiredAnalysisImages() {
    // 보관 기간이 지난 이미지 파일을 먼저 지우고, 이후 연결된 DB 이미지 행을 정리합니다.
    const retentionDays = getImageRetentionDays();
    const expiredImages = await analysisRepository.findExpiredPrivacyImages(retentionDays);

    if (expiredImages.length === 0) {
        return {
            retentionDays,
            fileCount: 0,
            rowCount: 0,
        };
    }

    let fileCount = 0;

    for (const image of expiredImages) {
        const deleted = await deleteFileIfExists(image.file_name);
        fileCount += deleted ? 1 : 0;
    }

    const rowCount = await analysisRepository.deleteImagesByIds(
        expiredImages.map((image) => image.analysis_image_id),
    );

    return {
        retentionDays,
        fileCount,
        rowCount,
    };
}

function startAnalysisImageCleanupSchedule() {
    // 서버 시작 직후 한 번 실행하고, 이후 하루 간격으로 반복합니다.
    cleanupExpiredAnalysisImages()
        .then((result) => {
            if (result.rowCount > 0 || result.fileCount > 0) {
                console.log(`Expired analysis images cleaned: files=${result.fileCount}, rows=${result.rowCount}`);
            }
        })
        .catch((error) => {
            console.error('Expired analysis image cleanup failed:', error);
        });

    return setInterval(() => {
        cleanupExpiredAnalysisImages().catch((error) => {
            console.error('Expired analysis image cleanup failed:', error);
        });
    }, CLEANUP_INTERVAL_MS);
}

module.exports = {
    cleanupExpiredAnalysisImages,
    getImageRetentionDays,
    startAnalysisImageCleanupSchedule,
};
