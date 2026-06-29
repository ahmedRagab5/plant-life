const express = require('express');
const { body } = require('express-validator');
const healPlanController = require('../controllers/healPlan.controller');
const validate = require('../middleware/validate.middleware');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

// All routes require authentication
router.use(protect);

// GET /api/heal-plans/templates — Get available heal plan templates
router.get('/templates', healPlanController.getTemplates);

// POST /api/heal-plans — Accept a heal plan for a scan
router.post(
  '/',
  [
    body('scanId')
      .notEmpty()
      .withMessage('معرّف الفحص مطلوب')
      .isMongoId()
      .withMessage('معرّف الفحص غير صالح'),
    validate,
  ],
  healPlanController.acceptPlan
);

// GET /api/heal-plans — List user's heal plans
// Query params: page, limit, status (active|completed|cancelled)
router.get('/', healPlanController.listPlans);

// GET /api/heal-plans/:id — Get heal plan with task checklist
router.get('/:id', healPlanController.getPlan);

// PATCH /api/heal-plans/:id/tasks/:taskIndex — Toggle task completion
router.patch('/:id/tasks/:taskIndex', healPlanController.toggleTask);

// PATCH /api/heal-plans/:id/cancel — Cancel a heal plan
router.patch('/:id/cancel', healPlanController.cancelPlan);

module.exports = router;
