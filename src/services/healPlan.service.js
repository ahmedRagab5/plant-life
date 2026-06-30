const HealPlan = require('../models/HealPlan');
const Scan = require('../models/Scan');
const notificationService = require('./notification.service');
const ApiError = require('../utils/ApiError');
const paginate = require('../utils/pagination');
const healPlanTemplates = require('../data/healPlans.json');

/**
 * Normalize disease name from AI model output to match heal plan template.
 * AI model may return: "Early_blight", "early_blight", "Early Blight", etc.
 */
const normalizeDiseaseKey = (diseaseName) => {
  if (!diseaseName) return null;

  // Try exact match first
  const exact = healPlanTemplates.find((t) => t.disease === diseaseName);
  if (exact) return exact.disease;

  // Try case-insensitive match with underscores
  const normalized = diseaseName.toLowerCase().replace(/\s+/g, '_');
  const fuzzy = healPlanTemplates.find(
    (t) => t.disease.toLowerCase() === normalized
  );
  if (fuzzy) return fuzzy.disease;

  // Try matching the display name
  const displayMatch = healPlanTemplates.find(
    (t) => t.disease_display.toLowerCase().replace(/\s+/g, '_') === normalized
  );
  if (displayMatch) return displayMatch.disease;

  return null;
};

/**
 * Accept a heal plan for a scan — creates from template with computed scheduled dates.
 *
 * @param {string} userId
 * @param {string} scanId
 * @param {object} [io] - Socket.IO instance
 * @returns {Promise<object>} Created heal plan
 */
const acceptPlan = async (userId, scanId, io = null) => {
  // 1. Get the scan
  const scan = await Scan.findOne({ _id: scanId, user: userId });
  if (!scan) {
    throw ApiError.notFound('الفحص غير موجود');
  }

  // 2. Check if scan already has a heal plan
  if (scan.linkedHealPlan) {
    throw ApiError.badRequest('هذا الفحص لديه خطة علاج بالفعل');
  }

  // 3. Find the heal plan template for this disease
  const diseaseKey = normalizeDiseaseKey(scan.result.main_disease);
  if (!diseaseKey) {
    throw ApiError.badRequest(
     ' لا توجد خطة علاج متاحة للمرض: ${scan.result.main_disease}'
    );
  }

  const template = healPlanTemplates.find((t) => t.disease === diseaseKey);

  // 4. Compute scheduled dates based on task days
  const startDate = new Date();
  const tasks = template.tasks.map((task) => {
    const scheduledDate = new Date(startDate);
    scheduledDate.setDate(scheduledDate.getDate() + task.day);
    return {
      day: task.day,
      title: task.title,
      description: task.description,
      completed: false,
      completedAt: null,
      scheduledDate,
      notifiedAt: null,
    };
  });

  // 5. Create heal plan
  const healPlan = await HealPlan.create({
    user: userId,
    scan: scanId,
    disease: template.disease_display,
    status: 'active',
    tasks,
    startDate,
  });

  // 6. Link heal plan to scan
  scan.linkedHealPlan = healPlan._id;
  await scan.save();

  // 7. Emit real-time notification
  if (io) {
    await notificationService.createNotification(
      {
        user: userId,
        healPlan: healPlan._id,
        type: 'plan_completed', // Wait, maybe use a different type or just use an existing one, or simply generic. The frontend just displays the message.
        title: '📋 تم إنشاء خطة العلاج',
        message:' تم البدء بخطة علاج "${healPlan.disease}". تابع المهام المطلوبة لتعافي نباتك.',
      },
      io
    );
  }

  // Expose scanId as a top-level field
  const planObj = healPlan.toJSON();
  return { ...planObj, scanId };
};

/**
 * Toggle a task's completion status.
 *
 * @param {string} healPlanId
 * @param {number} taskIndex
 * @param {string} userId
 * @param {object} [io] - Socket.IO instance
 * @returns {Promise<object>} Updated heal plan
 */
const toggleTask = async (healPlanId, taskIndex, userId, io = null) => {
  const healPlan = await HealPlan.findOne({ _id: healPlanId, user: userId });

  if (!healPlan) {
    throw ApiError.notFound('خطة العلاج غير موجودة');
  }

  if (healPlan.status === 'cancelled') {
    throw ApiError.badRequest('خطة العلاج ملغاة');
  }
if (taskIndex < 0 || taskIndex >= healPlan.tasks.length) {
    throw ApiError.badRequest('رقم المهمة غير صالح');
  }

  const task = healPlan.tasks[taskIndex];

  // Toggle completion
  if (task.completed) {
    task.completed = false;
    task.completedAt = null;
  } else {
    task.completed = true;
    task.completedAt = new Date();
  }

  // Check if all tasks are now completed
  const allCompleted = healPlan.tasks.every((t) => t.completed);
  if (allCompleted) {
    healPlan.status = 'completed';

    // Notify user
    if (io) {
      await notificationService.createNotification(
        {
          user: userId,
          healPlan: healPlan._id,
          type: 'plan_completed',
          title: '🎉 تهانينا!',
          message:' تم إكمال خطة علاج "${healPlan.disease}" بنجاح! يمكنك الآن إجراء فحص جديد للتأكد من تعافي النبات.',
        },
        io
      );
    }
  } else if (healPlan.status === 'completed') {
    // Un-completing a task after plan was marked completed
    healPlan.status = 'active';
  }

  await healPlan.save();
  return healPlan;
};

/**
 * Cancel a heal plan.
 */
const cancelPlan = async (healPlanId, userId) => {
  const healPlan = await HealPlan.findOne({ _id: healPlanId, user: userId });

  if (!healPlan) {
    throw ApiError.notFound('خطة العلاج غير موجودة');
  }

  if (healPlan.status === 'completed') {
    throw ApiError.badRequest('لا يمكن إلغاء خطة مكتملة');
  }

  healPlan.status = 'cancelled';
  await healPlan.save();

  return healPlan;
};

/**
 * Get a heal plan by ID.
 * Returns the plan with an explicit top-level scanId field.
 */
const getPlanById = async (healPlanId, userId) => {
  const healPlan = await HealPlan.findOne({ _id: healPlanId, user: userId })
    .populate('scan', 'result.main_disease result.avg_severity_all_images images createdAt')
    .lean({ virtuals: true });

  if (!healPlan) {
    throw ApiError.notFound('خطة العلاج غير موجودة');
  }

  // Expose scanId as a top-level field for the mobile app
  const scanId = healPlan.scan?._id ?? healPlan.scan ?? null;
  return { ...healPlan, scanId };
};

/**
 * List heal plans for a user with pagination.
 */
const listPlans = async (userId, query = {}) => {
  const filter = { user: userId };

  // Filter by status
  if (query.status && ['active', 'completed', 'cancelled'].includes(query.status)) {
    filter.status = query.status;
  }

  const total = await HealPlan.countDocuments(filter);
  const paginationInfo = paginate(query, total);

  const healPlans = await HealPlan.find(filter)
    .sort({ createdAt: -1 })
    .skip(paginationInfo.skip)
    .limit(paginationInfo.limit)
    .populate('scan', 'result.main_disease result.tree_status_ar images createdAt')
    .lean({ virtuals: true });

  // Expose scanId as a top-level field on each plan
  const healPlansWithScanId = healPlans.map((plan) => ({
    ...plan,
    scanId: plan.scan?._id ?? plan.scan ?? null,
  }));

  return {
    healPlans: healPlansWithScanId,
    pagination: {
      page: paginationInfo.page,
      limit: paginationInfo.limit,
      totalPages: paginationInfo.totalPages,
      total: paginationInfo.total,
    },
  };
};

/**
 * Get available heal plan templates.
 */
const getTemplates = () => {
  return healPlanTemplates.map((t) => ({
    disease: t.disease,
    disease_display: t.disease_display,
    taskCount: t.tasks.length,
    totalDays: Math.max(...t.tasks.map((task) => task.day)),
  }));
};

module.exports = {
  acceptPlan,
  toggleTask,
  cancelPlan,
  getPlanById,
  listPlans,
  getTemplates,
  normalizeDiseaseKey,
};

