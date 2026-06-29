const axios = require('axios');
const FormData = require('form-data');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

/**
 * Send image buffers to the AI model for analysis.
 * The AI model expects multipart/form-data with files under the key "files".
 *
 * @param {Array<{buffer: Buffer, originalname: string, mimetype: string}>} files - Multer file objects
 * @returns {Promise<object>} AI model response (tree_status, diseases, per_image_details, etc.)
 */
const analyzeImages = async (files) => {
  try {
    const formData = new FormData();

    files.forEach((file) => {
      formData.append('images', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      });
    });

    const response = await axios.post(env.aiModelUrl, formData, {
      headers: {
        ...formData.getHeaders(),
      },
      timeout: 60000, // 60 second timeout for AI processing
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    return response.data;
  } catch (error) {
    if (error.response) {
      console.error('AI Model error response:', JSON.stringify(error.response.data, null, 2));
      const detail = typeof error.response.data?.detail === 'object' 
        ? JSON.stringify(error.response.data.detail) 
        : error.response.data?.detail;
        
      throw ApiError.badRequest(
        `خطأ في نموذج الذكاء الاصطناعي: ${detail || error.response.statusText}`
      );
    }

    if (error.code === 'ECONNREFUSED') {
      throw ApiError.internal(
        'تعذر الاتصال بنموذج الذكاء الاصطناعي. تأكد من تشغيله على ' + env.aiModelUrl
      );
    }

    throw ApiError.internal('خطأ غير متوقع أثناء تحليل الصور');
  }
};

module.exports = { analyzeImages };
