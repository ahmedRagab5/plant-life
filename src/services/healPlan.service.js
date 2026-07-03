const HealPlan = require('../models/HealPlan');
const Scan = require('../models/Scan');
const notificationService = require('./notification.service');
const ApiError = require('../utils/ApiError');
const paginate = require('../utils/pagination');
const healPlanTemplates = require('../data/healPlans.json');

/**
 * Normalize disease name from AI model output to match heal plan template.
 *
 * The new healPlans.json uses Arabic disease names as the primary `disease` key.
 * The AI model still returns English keys (e.g. "Early_blight", "Bacterial_spot").
 *
 * We maintain a mapping from the English AI output to the Arabic template key.
 */
const AI_TO_ARABIC_MAP = {
  bacterial_spot: 'التبقع البكتيري',
  early_blight: 'اللفحة المبكرة',
  late_blight: 'اللفحة المتأخرة',
  leaf_mold: 'عفن الأوراق',
  septoria_leaf_spot: 'تبقع أوراق السبتوريا',
  spider_mites_two_spotted_spider_mite: 'العنكبوت الأحمر (الأكاروس)',
  target_spot: 'تبقع الهدف',
  tomato_mosaic_virus: 'فيروس موزاييك الطماطم',
  tomato_yellow_leaf_curl_virus: 'فيروس تجعد واصفرار أوراق الطماطم',
  powdery_mildew: 'البياض الدقيقي',
  healthy: 'نبات سليم',
};

const normalizeDiseaseKey = (diseaseName) => {
  if (!diseaseName) return null;

  // 1. Try exact match against Arabic disease keys
  const exact = healPlanTemplates.find((t) => t.disease === diseaseName);
  if (exact) return exact.disease;

  // 2. Normalize the input (lowercase, underscores) and look up in map
  const normalized = diseaseName.toLowerCase().replace(/[\s-]+/g, '_');
  const arabicKey = AI_TO_ARABIC_MAP[normalized];
  if (arabicKey) {
    const found = healPlanTemplates.find((t) => t.disease === arabicKey);
    if (found) return found.disease;
  }

  // 3. Partial / fuzzy fallback — strip underscores and compare
  const stripped = normalized.replace(/_/g, '');
  const fuzzy = healPlanTemplates.find((t) => {
    const tNorm = t.disease.toLowerCase().replace(/[\s_-]+/g, '');
    return tNorm === stripped;
  });
  if (fuzzy) return fuzzy.disease;

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
      `لا توجد خطة علاج متاحة للمرض: ${scan.result.main_disease}`
    );
  }

  const template = healPlanTemplates.find((t) => t.disease === diseaseKey);

  // 4. Build flat task list from the `days` array in the new schema
  const startDate = new Date();
  const tasks = [];

  const dayGroups = template.days || template.plan || [];
  dayGroups.forEach((dayGroup) => {
    const scheduledDate = new Date(startDate);
    scheduledDate.setDate(scheduledDate.getDate() + dayGroup.day);

    (dayGroup.tasks || []).forEach((task) => {
      tasks.push({
        day: dayGroup.day,
        dayTitle: dayGroup.title || '',
        title: task.title,
        description: task.description || '',
        why: task.why || '',
        tips: Array.isArray(task.tips) ? task.tips : [],
        warnings: Array.isArray(task.warnings) ? task.warnings : [],
        estimatedTime: task.estimatedTime || '',
        completed: false,
        completedAt: null,
        scheduledDate,
        notifiedAt: null,
      });
    });
  });

  // 5. Create heal plan, storing all rich template metadata
  const healPlan = await HealPlan.create({
    user: userId,
    scan: scanId,
    disease: template.disease,
    scientificName: template.scientificName || '',
    severity: template.severity || '',
    spreadSpeed: template.spreadSpeed || '',
    isCurable: template.isCurable !== undefined ? template.isCurable : true,
    successRate: template.successRate || '',
    recoverTime: template.recoverTime || '',
    cause: template.cause || '',
    symptoms: Array.isArray(template.symptoms) ? template.symptoms : [],
    prevention: Array.isArray(template.prevention) ? template.prevention : [],
    recommendedProducts: Array.isArray(template.recommendedProducts)
      ? template.recommendedProducts
      : [],
    whenToHarvest: template.whenToHarvest || '',
    emergency: template.emergency || false,
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
        type: 'plan_started',
        title: '📋 تم إنشاء خطة العلاج',
        message: `تم البدء بخطة علاج "${healPlan.disease}". تابع المهام المطلوبة لتعافي نباتك.`,
      },
      io
    );
  }

  const planObj = healPlan.toJSON();
  return { ...planObj, scanId };
};

/**
 * Get a single task's full details from a heal plan.
 *
 * @param {string} healPlanId
 * @param {number} taskIndex
 * @param {string} userId
 * @returns {Promise<object>} Task detail object
 */
const getTaskDetail = async (healPlanId, taskIndex, userId) => {
  const healPlan = await HealPlan.findOne({ _id: healPlanId, user: userId }).lean();

  if (!healPlan) {
    throw ApiError.notFound('خطة العلاج غير موجودة');
  }

  const idx = parseInt(taskIndex, 10);
  if (isNaN(idx) || idx < 0 || idx >= healPlan.tasks.length) {
    throw ApiError.badRequest('رقم المهمة غير صالح');
  }

  const task = healPlan.tasks[idx];

  return {
    taskIndex: idx,
    planId: healPlan._id,
    disease: healPlan.disease,
    planStatus: healPlan.status,
    task,
  };
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

    if (io) {
      await notificationService.createNotification(
        {
          user: userId,
          healPlan: healPlan._id,
          type: 'plan_completed',
          title: '🎉 تهانينا!',
          message: `تم إكمال خطة علاج "${healPlan.disease}" بنجاح! يمكنك الآن إجراء فحص جديد للتأكد من تعافي النبات.`,
        },
        io
      );
    }
  } else if (healPlan.status === 'completed') {
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
 */
const getPlanById = async (healPlanId, userId) => {
  const healPlan = await HealPlan.findOne({ _id: healPlanId, user: userId })
    .populate('scan', 'result.main_disease result.avg_severity_all_images images createdAt')
    .lean({ virtuals: true });

  if (!healPlan) {
    throw ApiError.notFound('خطة العلاج غير موجودة');
  }

  const scanId = healPlan.scan?._id ?? healPlan.scan ?? null;
  return { ...healPlan, scanId };
};

/**
 * List heal plans for a user with pagination.
 */
const listPlans = async (userId, query = {}) => {
  const filter = { user: userId };

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
 * Get available heal plan templates (summary list).
 */
const getTemplates = () => {
  return healPlanTemplates.map((t) => {
    let taskCount = 0;
    let maxDay = 0;
    const dayGroups = t.days || t.plan || [];
    dayGroups.forEach((dayGroup) => {
      taskCount += (dayGroup.tasks || []).length;
      if (dayGroup.day > maxDay) maxDay = dayGroup.day;
    });
    return {
      disease: t.disease,
      scientificName: t.scientificName || '',
      severity: t.severity || '',
      spreadSpeed: t.spreadSpeed || '',
      isCurable: t.isCurable !== undefined ? t.isCurable : true,
      successRate: t.successRate || '',
      recoverTime: t.recoverTime || '',
      emergency: t.emergency || false,
      taskCount,
      totalDays: maxDay,
    };
  });
};

module.exports = {
  acceptPlan,
  toggleTask,
  cancelPlan,
  getPlanById,
  getTaskDetail,
  listPlans,
  getTemplates,
  normalizeDiseaseKey,
};