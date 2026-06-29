const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const env = require('../config/env');

/**
 * Express middleware: verifies JWT from Authorization header.
 * Attaches `req.user` (the full user document).
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw ApiError.unauthorized('يرجى تسجيل الدخول أولاً');
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(decoded.id);

    if (!user) {
      throw ApiError.unauthorized('المستخدم غير موجود');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.unauthorized('رمز الوصول غير صالح أو منتهي');
  }
});

/**
 * Socket.IO middleware: verifies JWT from handshake auth.
 * Attaches `socket.user`.
 */
const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error('يرجى تسجيل الدخول'));
    }

    const decoded = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(decoded.id);

    if (!user) {
      return next(new Error('المستخدم غير موجود'));
    }

    socket.user = user;
    next();
  } catch (error) {
    next(new Error('رمز الوصول غير صالح'));
  }
};

module.exports = { protect, socketAuth };
