const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');

const UPLOAD_ROOT = path.resolve(__dirname, '../../upload/analysis-images');
const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);

function normalizeExtension(extension) {
    const normalized = String(extension || '').toLowerCase().replace(/^\./, '');
    return ALLOWED_EXTENSIONS.has(normalized) ? normalized : 'jpg';
}

async function savePrivacyImage(privacyImage) {
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
