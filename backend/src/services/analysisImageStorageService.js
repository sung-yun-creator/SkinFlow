const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');

const UPLOAD_ROOT = path.resolve(__dirname, '../../upload/analysis-images');
const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);

// AI 서버가 반환한 개인정보 마스킹 이미지를 파일로 저장/삭제하는 보조 service입니다.
function normalizeExtension(extension) {
    const normalized = String(extension || '').toLowerCase().replace(/^\./, '');
    return ALLOWED_EXTENSIONS.has(normalized) ? normalized : 'jpg';
}

async function savePrivacyImage(privacyImage) {
    // 원본 사진이 아니라 마스킹된 base64 이미지만 서버 파일로 저장합니다.
    if (!privacyImage?.data_base64) {
        return null;
    }

    const fileExt = normalizeExtension(privacyImage.file_ext);
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = path.join(UPLOAD_ROOT, fileName);
    const fileBuffer = Buffer.from(privacyImage.data_base64, 'base64');

    await fs.mkdir(UPLOAD_ROOT, { recursive: true });
    await fs.writeFile(filePath, fileBuffer);

    return {
        fileName,
        filePath,
        fileSize: fileBuffer.length,
        fileExt,
        imageType: privacyImage.image_type || 'privacy_masked',
    };
}

async function deleteStoredImage(storedImage) {
    if (!storedImage?.filePath) {
        return;
    }

    await fs.unlink(storedImage.filePath).catch((error) => {
        if (error.code !== 'ENOENT') {
            throw error;
        }
    });
}

function toStoredImagePath(fileName) {
    // 파일명만 허용해서 upload 폴더 밖의 경로가 조합되지 않도록 막습니다.
    if (!fileName || path.basename(fileName) !== fileName) {
        return null;
    }

    return path.join(UPLOAD_ROOT, fileName);
}

module.exports = {
    deleteStoredImage,
    savePrivacyImage,
    toStoredImagePath,
};
