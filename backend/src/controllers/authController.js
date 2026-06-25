const { createUser, findUserByEmail, updateUserPasswordHash } = require('../services/userService');
const {
    checkEmailAvailable,
    clearEmailVerification,
    isEmailVerified,
    sendExistingEmailVerificationCode,
    sendVerificationCode,
    verifyEmailCode,
} = require('../services/emailVerificationService');
const { hashPassword, verifyPassword } = require('../utils/password');
const { signToken } = require('../utils/token');
const { touchSessionActivity } = require('../services/authSessionService');

// 비밀번호 해시처럼 프론트에 보내면 안 되는 값은 제외하고 사용자 정보만 정리합니다.
function toPublicUser(user) {
    return {
        id: user.user_id,
        name: user.user_name,
        email: user.email,
        gender: user.gender,
        birthDate: user.birth_date || null,
        skinType: user.skin_type || null,
    };
}

async function signup(req, res) {
    const { name, email, password, gender, birthDate, skinType } = req.body;

    if (!name || !email || !password || !gender || !birthDate || !skinType) {
        return res.status(400).json({ message: '회원가입에 필요한 정보를 모두 입력해 주세요.' });
    }

    if (password.length < 8) {
        return res.status(400).json({ message: '비밀번호는 8자 이상이어야 합니다.' });
    }

    if (!isEmailVerified(email)) {
        return res.status(400).json({ message: '이메일 인증이 필요합니다.' });
    }

    const existingUser = await findUserByEmail(email);

    if (existingUser) {
        return res.status(409).json({ message: '이미 가입된 이메일입니다.' });
    }

    const user = await createUser({
        name,
        email,
        passwordHash: await hashPassword(password),
        gender,
        birthDate,
        skinType,
    });
    // 회원가입 직후에도 로그인 상태로 사용할 수 있도록 JWT를 함께 발급합니다.
    const token = signToken({ userId: user.user_id, email: user.email });
    touchSessionActivity({ userId: user.user_id });

    clearEmailVerification(email);

    return res.status(201).json({ user: toPublicUser(user), token });
}

async function login(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: '이메일과 비밀번호를 입력해 주세요.' });
    }

    const user = await findUserByEmail(email);

    if (!user || !(await verifyPassword(password, user.password_hash))) {
        return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    // 이후 보호 API 요청에서 Authorization 헤더에 넣을 토큰입니다.
    const token = signToken({ userId: user.user_id, email: user.email });
    touchSessionActivity({ userId: user.user_id });

    return res.json({ user: toPublicUser(user), token });
}

async function checkEmail(req, res) {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: '이메일을 입력해 주세요.' });
    }

    const available = await checkEmailAvailable(email);

    return res.json({ available });
}

async function sendEmailCode(req, res) {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: '이메일을 입력해 주세요.' });
    }

    const result = await sendVerificationCode(email);

    if (!result.available) {
        return res.status(409).json({ message: '이미 가입된 이메일입니다.', available: false });
    }

    return res.json({
        message: '인증 코드가 발송되었습니다.',
        expiresIn: result.expiresIn,
    });
}

async function verifyEmail(req, res) {
    const { email, code } = req.body;

    if (!email || !code) {
        return res.status(400).json({ message: '이메일과 인증 코드를 입력해 주세요.' });
    }

    const verified = verifyEmailCode(email, code);

    if (!verified) {
        return res.status(400).json({ message: '인증 코드가 올바르지 않거나 만료되었습니다.', verified: false });
    }

    return res.json({ verified: true });
}

async function sendPasswordResetCode(req, res) {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: '이메일을 입력해 주세요.' });
    }

    // 비밀번호 찾기는 기존 회원 이메일이어야 하므로 회원가입용 인증 발송과 분리합니다.
    const result = await sendExistingEmailVerificationCode(email);

    if (!result.exists) {
        return res.status(404).json({ message: '가입된 이메일을 찾을 수 없습니다.' });
    }

    return res.json({
        message: '비밀번호 재설정 인증 코드가 발송되었습니다.',
        expiresIn: result.expiresIn,
    });
}

async function resetPassword(req, res) {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
        return res.status(400).json({ message: '이메일, 인증 코드, 새 비밀번호를 입력해 주세요.' });
    }

    if (newPassword.length < 8) {
        return res.status(400).json({ message: '비밀번호는 8자 이상이어야 합니다.' });
    }

    const user = await findUserByEmail(email);

    if (!user) {
        return res.status(404).json({ message: '가입된 이메일을 찾을 수 없습니다.' });
    }

    // 이메일로 받은 인증 코드를 먼저 확인한 뒤에만 비밀번호 해시를 새로 저장합니다.
    const verified = verifyEmailCode(email, code);

    if (!verified) {
        return res.status(400).json({ message: '인증 코드가 올바르지 않거나 만료되었습니다.' });
    }

    // 비밀번호는 평문으로 저장하지 않고 bcrypt 해시로만 교체합니다.
    await updateUserPasswordHash(user.user_id, await hashPassword(newPassword));
    clearEmailVerification(email);

    return res.json({ message: '비밀번호가 재설정되었습니다.' });
}

module.exports = {
    checkEmail,
    resetPassword,
    signup,
    sendPasswordResetCode,
    sendEmailCode,
    verifyEmail,
    login,
};
