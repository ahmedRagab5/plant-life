const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

/**
 * Middleware that runs after express-validator checks.
 * If there are validation errors, throws an ApiError with details.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));

    throw ApiError.badRequest('بيانات غير صالحة', formattedErrors);
  }

  next();
};

module.exports = validate;
