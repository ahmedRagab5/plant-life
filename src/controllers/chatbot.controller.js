const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const chatbotService = require('../services/chatbot.service');

/**
 * POST /api/chatbot/message
 * Send a message to the chatbot and receive a reply.
 *
 * Body: { message: string }
 * Response: { success, data: { reply, language, relatedProducts } }
 */
const sendMessage = asyncHandler(async (req, res) => {
  const { message } = req.body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    throw ApiError.badRequest('الرسالة مطلوبة ويجب أن تكون نصاً / Message is required and must be a non-empty string.');
  }

  if (message.trim().length > 1000) {
    throw ApiError.badRequest('الرسالة طويلة جداً. الحد الأقصى 1000 حرف / Message is too long. Maximum 1000 characters.');
  }

  const result = await chatbotService.chat(message.trim());

  res.status(200).json({
    success: true,
    data: {
      reply: result.reply,
      language: result.language,
      relatedProducts: result.relatedProducts,
    },
  });
});

/**
 * GET /api/chatbot/products
 * Returns a summary list of all products in the dataset.
 */
const getAllProducts = asyncHandler(async (req, res) => {
  const products = chatbotService.getAllProducts();
  res.status(200).json({
    success: true,
    count: products.length,
    data: products,
  });
});

/**
 * GET /api/chatbot/products/disease/:diseaseName
 * Returns products that target a specific disease.
 */
const getProductsByDisease = asyncHandler(async (req, res) => {
  const { diseaseName } = req.params;
  const products = chatbotService.getProductsByDisease(diseaseName);

  if (products.length === 0) {
    throw ApiError.notFound(
      `لا توجد منتجات لهذا المرض في قاعدة البيانات / No products found for disease: ${diseaseName}`
    );
  }

  res.status(200).json({
    success: true,
    count: products.length,
    data: products,
  });
});

module.exports = { sendMessage, getAllProducts, getProductsByDisease };
