const { createUser, findUserByEmail } = require('../services/userService');
const {
    checkEmailAvailable,
    clearEmailVerification,
    isEmailVerified,
    sendVerificationCode,
    verifyEmailCode,
} = require('../services/emailVerificationService');
const { hashPassword, verifyPassword } = require('../utils/password');
const { signToken } = require('../utils/token');

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
        return res.status(400).json({ message: 'All signup fields are required.' });
    }

    if (password.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }

    if (!isEmailVerified(email)) {
        return res.status(400).json({ message: 'Email verification is required.' });
    }

    const existingUser = await findUserByEmail(email);

    if (existingUser) {
        return res.status(409).json({ message: 'This email is already registered.' });
    }

    const user = await createUser({
        name,
        email,
        passwordHash: await hashPassword(password),
        gender,
        birthDate,
        skinType,
    });
    const token = signToken({ userId: user.user_id, email: user.email });

    clearEmailVerification(email);

    return res.status(201).json({ user: toPublicUser(user), token });
}

async function login(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await findUserByEmail(email);

    if (!user || !(await verifyPassword(password, user.password_hash))) {
        return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = signToken({ userId: user.user_id, email: user.email });

    return res.json({ user: toPublicUser(user), token });
}

async function checkEmail(req, res) {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Email is required.' });
    }

    const available = await checkEmailAvailable(email);

    return res.json({ available });
}

async function sendEmailCode(req, res) {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Email is required.' });
    }

    const result = await sendVerificationCode(email);

    if (!result.available) {
        return res.status(409).json({ message: 'This email is already registered.', available: false });
    }

    return res.json({
        message: 'Verification code sent.',
        expiresIn: result.expiresIn,
    });
}

async function verifyEmail(req, res) {
    const { email, code } = req.body;

    if (!email || !code) {
        return res.status(400).json({ message: 'Email and verification code are required.' });
    }

    const verified = verifyEmailCode(email, code);

    if (!verified) {
        return res.status(400).json({ message: 'Invalid or expired verification code.', verified: false });
    }

    return res.json({ verified: true });
}

module.exports = {
    checkEmail,
    signup,
    sendEmailCode,
    verifyEmail,
    login,
};
