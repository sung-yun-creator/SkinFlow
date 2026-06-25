const nodemailer = require('nodemailer');
const { findUserByEmail } = require('./userService');

const verificationCodes = new Map();
const CODE_TTL_MS = 10 * 60 * 1000;

function createVerificationCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

function createTransporter() {
    return nodemailer.createTransport({
        host: process.env.MAIL_HOST,
        port: Number(process.env.MAIL_PORT || 587),
        secure: process.env.MAIL_SECURE === 'true',
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS,
        },
    });
}

function assertMailConfig() {
    const requiredValues = ['MAIL_HOST', 'MAIL_USER', 'MAIL_PASS', 'MAIL_FROM'];
    const missingValues = requiredValues.filter((key) => !process.env[key]);

    if (missingValues.length > 0) {
        throw new Error(`메일 설정이 누락되었습니다: ${missingValues.join(', ')}`);
    }
}

async function checkEmailAvailable(email) {
    const user = await findUserByEmail(email);

    return !user;
}

async function sendVerificationCode(email) {
    // 회원가입용 인증은 아직 가입되지 않은 이메일에만 발송합니다.
    const available = await checkEmailAvailable(email);

    if (!available) {
        return { available: false };
    }

    assertMailConfig();

    const code = createVerificationCode();
    const expiresAt = Date.now() + CODE_TTL_MS;
    const transporter = createTransporter();

    await transporter.sendMail({
        from: process.env.MAIL_FROM,
        to: email,
        subject: '[SkinFlow] 이메일 인증번호',
        text: `SkinFlow 이메일 인증번호는 ${code}입니다. 10분 안에 입력해주세요.`,
    });

    verificationCodes.set(email, {
        code,
        expiresAt,
        verified: false,
    });

    return { available: true, expiresIn: CODE_TTL_MS / 1000 };
}

async function sendExistingEmailVerificationCode(email) {
    // 비밀번호 변경/재설정용 인증은 이미 가입된 이메일에만 발송합니다.
    const user = await findUserByEmail(email);

    if (!user) {
        return { exists: false };
    }

    assertMailConfig();

    const code = createVerificationCode();
    const expiresAt = Date.now() + CODE_TTL_MS;
    const transporter = createTransporter();

    await transporter.sendMail({
        from: process.env.MAIL_FROM,
        to: email,
        subject: '[SkinFlow] 비밀번호 변경 인증번호',
        text: `SkinFlow 비밀번호 변경 인증번호는 ${code}입니다. 10분 안에 입력해주세요.`,
    });

    verificationCodes.set(email, {
        code,
        expiresAt,
        verified: false,
    });

    return { exists: true, expiresIn: CODE_TTL_MS / 1000 };
}

function verifyEmailCode(email, code) {
    const verification = verificationCodes.get(email);

    // 만료된 코드는 즉시 삭제해서 같은 코드가 재사용되지 않도록 합니다.
    if (!verification || verification.expiresAt < Date.now()) {
        verificationCodes.delete(email);
        return false;
    }

    if (verification.code !== code) {
        return false;
    }

    verificationCodes.set(email, {
        ...verification,
        verified: true,
    });

    return true;
}

function isEmailVerified(email) {
    const verification = verificationCodes.get(email);

    return Boolean(verification && verification.verified && verification.expiresAt >= Date.now());
}

function clearEmailVerification(email) {
    verificationCodes.delete(email);
}

module.exports = {
    checkEmailAvailable,
    clearEmailVerification,
    isEmailVerified,
    sendExistingEmailVerificationCode,
    sendVerificationCode,
    verifyEmailCode,
};
