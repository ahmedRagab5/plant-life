const ApiError = require('../utils/ApiError');
const env = require('../config/env');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let error = err;

  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = ApiError.badRequest('حجم الملف يتجاوز الحد المسموح (10MB)');
  }

  // Multer file count error
  if (err.code === 'LIMIT_FILE_COUNT') {
    error = ApiError.badRequest('عدد الملفات يتجاوز الحد المسموح (10 ملفات)');
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    error = ApiError.badRequest(messages.join('. '));
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue).join(', ');
    error = ApiError.badRequest(`القيمة مكررة: ${field}`);
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    error = ApiError.badRequest(`معرّف غير صالح: ${err.value}`);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = ApiError.unauthorized('رمز الوصول غير صالح');
  }
  if (err.name === 'TokenExpiredError') {
    error = ApiError.unauthorized('انتهت صلاحية رمز الوصول');
  }

  const statusCode = error.statusCode || 500;
  const message = error.message || 'خطأ في الخادم';

  // Log errors in development
  if (env.isDev) {
    console.error('❌ Error:', {
      statusCode,
      message,
      stack: err.stack,
    });
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors: error.errors || [],
    ...(env.isDev && { stack: err.stack }),
  });
};

module.exports = errorHandler;
