class ApiError extends Error {
  constructor(statusCode, message, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, errors = []) {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message = 'غير مصرح لك بالوصول') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'ليس لديك صلاحية') {
    return new ApiError(403, message);
  }

  static notFound(message = 'المورد غير موجود') {
    return new ApiError(404, message);
  }

  static internal(message = 'خطأ في الخادم') {
    return new ApiError(500, message);
  }
}

module.exports = ApiError;
