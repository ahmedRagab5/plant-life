const asyncHandler = require('../utils/asyncHandler');
const scanService = require('../services/scan.service');
const { StatusCodes } = require('http-status-codes');

/**
 * POST /api/scans
 * Upload images → Cloudinary → AI model → save scan
 */
const createScan = asyncHandler(async (req, res) => {
  const io = req.app.get('io');
  const scan = await scanService.createScan(req.user._id, req.files, io);

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: 'تم تحليل الصور بنجاح',
    data: { scan },
  });
});

/**
 * POST /api/scans/:id/rescan
 * Upload new images for comparison with a previous scan
 */
const rescan = asyncHandler(async (req, res) => {
  const io = req.app.get('io');
  const scan = await scanService.rescan(
    req.user._id,
    req.params.id,
    req.files,
    io
  );

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: 'تم إجراء الفحص المقارن بنجاح',
    data: {
      scan,
      comparison: {
        severityDelta: scan.severityDelta,
        improved: scan.severityDelta < 0,
        parentSeverity: scan.result.avg_severity_all_images - scan.severityDelta,
        currentSeverity: scan.result.avg_severity_all_images,
      },
    },
  });
});

/**
 * GET /api/scans
 * List user scans with pagination and search
 */
const listScans = asyncHandler(async (req, res) => {
  const result = await scanService.listScans(req.user._id, req.query);

  res.status(StatusCodes.OK).json({
    success: true,
    data: result,
  });
});

/**
 * GET /api/scans/:id
 * Get single scan details
 */
const getScan = asyncHandler(async (req, res) => {
  const scan = await scanService.getScanById(req.params.id, req.user._id);

  res.status(StatusCodes.OK).json({
    success: true,
    data: { scan },
  });
});

module.exports = { createScan, rescan, listScans, getScan };
