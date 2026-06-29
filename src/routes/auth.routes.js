const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const validate = require('../middleware/validate.middleware');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

// POST /api/auth/register
router.post(
  '/register',
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('الاسم مطلوب')
      .isLength({ min: 2, max: 50 })
      .withMessage('الاسم يجب أن يكون بين 2 و 50 حرفًا'),
    body('email')
      .trim()
      .notEmpty()
      .withMessage('البريد الإلكتروني مطلوب')
      .isEmail()
      .withMessage('يرجى إدخال بريد إلكتروني صحيح')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('كلمة المرور مطلوبة')
      .isLength({ min: 6 })
      .withMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
    validate,
  ],
  authController.register
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('البريد الإلكتروني مطلوب')
      .isEmail()
      .withMessage('يرجى إدخال بريد إلكتروني صحيح')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('كلمة المرور مطلوبة'),
    validate,
  ],
  authController.login
);

// POST /api/auth/refresh-token
router.post(
  '/refresh-token',
  [
    body('refreshToken')
      .notEmpty()
      .withMessage('رمز التحديث مطلوب'),
    validate,
  ],
  authController.refreshToken
);

// GET /api/auth/me (protected)
router.get('/me', protect, authController.getMe);

module.exports = router;
