const User = require('../models/User');
const ApiError = require('../utils/ApiError');

/**
 * Register a new user.
 */
const register = async ({ name, email, password }) => {
  // Check if email already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw ApiError.badRequest('البريد الإلكتروني مسجل بالفعل');
  }

  const user = await User.create({ name, email, password });

  // Generate tokens
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  // Store refresh token in DB
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
    },
    accessToken,
    refreshToken,
  };
};

/**
 * Login an existing user.
 */
const login = async ({ email, password }) => {
  // Find user with password field
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    throw ApiError.unauthorized('البريد الإلكتروني أو كلمة المرور غير صحيحة');
  }

  const isPasswordCorrect = await user.comparePassword(password);
  if (!isPasswordCorrect) {
    throw ApiError.unauthorized('البريد الإلكتروني أو كلمة المرور غير صحيحة');
  }

  // Generate tokens
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  // Store refresh token in DB
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
    },
    accessToken,
    refreshToken,
  };
};

/**
 * Refresh access token using a valid refresh token.
 */
const refreshAccessToken = async (refreshToken) => {
  const jwt = require('jsonwebtoken');
  const env = require('../config/env');

  if (!refreshToken) {
    throw ApiError.unauthorized('رمز التحديث مطلوب');
  }

  try {
    const decoded = jwt.verify(refreshToken, env.jwtRefreshSecret);
    const user = await User.findById(decoded.id).select('+refreshToken');

    if (!user || user.refreshToken !== refreshToken) {
      throw ApiError.unauthorized('رمز التحديث غير صالح');
    }

    // Generate new tokens
    const newAccessToken = user.generateAccessToken();
    const newRefreshToken = user.generateRefreshToken();

    user.refreshToken = newRefreshToken;
    await user.save({ validateBeforeSave: false });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.unauthorized('رمز التحديث غير صالح أو منتهي');
  }
};

module.exports = { register, login, refreshAccessToken };
