const Scan = require('../models/Scan');
const cloudinaryService = require('./cloudinary.service');
const aiModelService = require('./aiModel.service');
const notificationService = require('./notification.service');
const ApiError = require('../utils/ApiError');
const paginate = require('../utils/pagination');

/**
 * Create a new scan: upload images to Cloudinary + analyze via AI model.
 *
 * @param {string} userId
 * @param {Array} files - Multer file objects
 * @param {object} [io] - Socket.IO instance
 * @returns {Promise<object>} Created scan document
 */
const createScan = async (userId, files, io = null) => {
  if (!files || files.length === 0) {
    throw ApiError.badRequest('يرجى رفع صورة واحدة على الأقل');
  }

  // 1. Upload images to Cloudinary (parallel)
  const cloudinaryImages = await cloudinaryService.uploadImages(files);

  // 2. Send original buffers to AI model for analysis
  let aiResult;
  try {
    aiResult = await aiModelService.analyzeImages(files);
  } catch (error) {
    // If AI fails, we still have the images on Cloudinary — clean up
    await cloudinaryService.deleteImages(cloudinaryImages.map((img) => img.publicId));
    throw error;
  }

  // 3. Save scan document
  const scan = await Scan.create({
    user: userId,
    images: cloudinaryImages,
    result: aiResult,
  });

  return scan;
};

/**
 * Re-scan: upload new images for comparison with a previous scan.
 *
 * @param {string} userId
 * @param {string} parentScanId - ID of the previous scan
 * @param {Array} files - Multer file objects
 * @param {object} [io] - Socket.IO instance
 * @returns {Promise<object>} New scan with severity comparison
 */
const rescan = async (userId, parentScanId, files, io = null) => {
  // Verify parent scan exists and belongs to user
  const parentScan = await Scan.findOne({ _id: parentScanId, user: userId });
  if (!parentScan) {
    throw ApiError.notFound('الفحص السابق غير موجود');
  }

  if (!files || files.length === 0) {
    throw ApiError.badRequest('يرجى رفع صورة واحدة على الأقل');
  }

  // 1. Upload + Analyze (same as createScan)
  const cloudinaryImages = await cloudinaryService.uploadImages(files);

  let aiResult;
  try {
    aiResult = await aiModelService.analyzeImages(files);
  } catch (error) {
    await cloudinaryService.deleteImages(cloudinaryImages.map((img) => img.publicId));
    throw error;
  }

  // 2. Compute severity delta
  const parentSeverity = parentScan.result.avg_severity_all_images || 0;
  const currentSeverity = aiResult.avg_severity_all_images || 0;
  const severityDelta = currentSeverity - parentSeverity;

  // 3. Save new scan with parent reference
  const scan = await Scan.create({
    user: userId,
    images: cloudinaryImages,
    result: aiResult,
    parentScan: parentScanId,
    severityDelta,
  });

  // 4. Send comparison notification
  if (io) {
    let notifType, title, message;

    if (!aiResult.is_infected) {
      notifType = 'plant_healed';
      title = '🎉 النبات تعافى!';
      message = 'لم يتم اكتشاف أي أمراض. النبات أصبح سليمًا!';
    } else if (severityDelta < 0) {
      notifType = 'severity_improved';
      title = '🌱 تحسن ملحوظ!';
      message = `انخفضت شدة الإصابة من ${parentSeverity.toFixed(1)}% إلى ${currentSeverity.toFixed(1)}%`;
    } else {
      notifType = 'severity_worsened';
      title = '⚠️ تنبيه';
      message = `ارتفعت شدة الإصابة من ${parentSeverity.toFixed(1)}% إلى ${currentSeverity.toFixed(1)}%. يرجى مراجعة خطة العلاج.`;
    }

    await notificationService.createNotification(
      {
        user: userId,
        scan: scan._id,
        type: notifType,
        title,
        message,
      },
      io
    );
  }

  return scan;
};

/**
 * Get paginated scan history for a user, with optional search.
 */
const listScans = async (userId, query = {}) => {
  const filter = { user: userId };

  // Text search on disease name / tree status
  if (query.q && query.q.trim()) {
    filter.$text = { $search: query.q.trim() };
  }

  const total = await Scan.countDocuments(filter);
  const paginationInfo = paginate(query, total);

  const scans = await Scan.find(filter)
    .sort({ createdAt: -1 })
    .skip(paginationInfo.skip)
    .limit(paginationInfo.limit)
    .populate('linkedHealPlan', 'status progress disease')
    .lean();

  return {
    scans,
    pagination: {
      page: paginationInfo.page,
      limit: paginationInfo.limit,
      totalPages: paginationInfo.totalPages,
      total: paginationInfo.total,
    },
  };
};

/**
 * Get a single scan with full details.
 */
const getScanById = async (scanId, userId) => {
  const scan = await Scan.findOne({ _id: scanId, user: userId })
    .populate('linkedHealPlan')
    .populate('parentScan', 'result.avg_severity_all_images createdAt');

  if (!scan) {
    throw ApiError.notFound('الفحص غير موجود');
  }

  return scan;
};

module.exports = { createScan, rescan, listScans, getScanById };
