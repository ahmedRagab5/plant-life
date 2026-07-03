const express = require('express');
const router = express.Router();
const {
  sendMessage,
  getAllProducts,
  getProductsByDisease,
} = require('../controllers/chatbot.controller');

// ─── Chatbot Routes (Public — no authentication required) ────────────────────

/**
 * @route   POST /api/chatbot/message
 * @desc    Send a question to the AI chatbot and get a reply
 * @access  Public
 * @body    { message: string }
 */
router.post('/message', sendMessage);

/**
 * @route   GET /api/chatbot/products
 * @desc    Get a summary list of all products in the dataset
 * @access  Public
 */
router.get('/products', getAllProducts);

/**
 * @route   GET /api/chatbot/products/disease/:diseaseName
 * @desc    Get products that target a specific disease
 * @access  Public
 * @param   diseaseName - e.g., "Late_blight", "Early_blight"
 */
router.get('/products/disease/:diseaseName', getProductsByDisease);

module.exports = router;
