const asyncHandler = require('../utils/asyncHandler');
const healPlanService = require('../services/healPlan.service');
const { StatusCodes } = require('http-status-codes');

/**
 * POST /api/heal-plans
 * Accept a heal plan for a scan
 */
const acceptPlan = asyncHandler(async (req, res) => {
  const io = req.app.get('io');
  const { scanId } = req.body;

  const healPlan = await healPlanService.acceptPlan(req.user._id, scanId, io);

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: 'تم قبول خطة العلاج بنجاح',
    data: { healPlan },
  });
});

/**
 * GET /api/heal-plans
 * List user's heal plans with pagination
 */
const listPlans = asyncHandler(async (req, res) => {
  const result = await healPlanService.listPlans(req.user._id, req.query);

  res.status(StatusCodes.OK).json({
    success: true,
    data: result,
  });
});

/**
 * GET /api/heal-plans/templates
 * Get available heal plan templates
 */
const getTemplates = asyncHandler(async (req, res) => {
  const templates = healPlanService.getTemplates();

  res.status(StatusCodes.OK).json({
    success: true,
    data: { templates },
  });
});

/**
 * GET /api/heal-plans/:id
 * Get heal plan with task checklist
 */
const getPlan = asyncHandler(async (req, res) => {
  const healPlan = await healPlanService.getPlanById(req.params.id, req.user._id);

  res.status(StatusCodes.OK).json({
    success: true,
    data: { healPlan },
  });
});

/**
 * PATCH /api/heal-plans/:id/tasks/:taskIndex
 * Toggle task completion ✅
 */
const toggleTask = asyncHandler(async (req, res) => {
  const io = req.app.get('io');
  const { id, taskIndex } = req.params;

  const healPlan = await healPlanService.toggleTask(
    id,
    parseInt(taskIndex, 10),
    req.user._id,
    io
  );

  res.status(StatusCodes.OK).json({
    success: true,
    message: 'تم تحديث المهمة',
    data: { healPlan },
  });
});

/**
 * PATCH /api/heal-plans/:id/cancel
 * Cancel a heal plan
 */
const cancelPlan = asyncHandler(async (req, res) => {
  const healPlan = await healPlanService.cancelPlan(req.params.id, req.user._id);

  res.status(StatusCodes.OK).json({
    success: true,
    message: 'تم إلغاء خطة العلاج',
    data: { healPlan },
  });
});

module.exports = { acceptPlan, listPlans, getTemplates, getPlan, toggleTask, cancelPlan };
