const express = require('express');
const scanController = require('../controllers/scan.controller');
const { protect } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

const router = express.Router();

// All routes require authentication
router.use(protect);

// POST /api/scans — Upload images → analyze → save
router.post('/', upload.array('images', 10), scanController.createScan);

// GET /api/scans — List user scans (paginated + searchable)
// Query params: page, limit, q (search term)
router.get('/', scanController.listScans);

// GET /api/scans/:scanId/rescans — Get all rescans for a parent scan (Recovery Timeline)
// ⚠️ Must be declared BEFORE /:id to avoid "rescans" being parsed as an ID
router.get('/:scanId/rescans', scanController.getRescansByScan);

// GET /api/scans/:id — Get single scan details
router.get('/:id', scanController.getScan);

// POST /api/scans/:id/rescan — Upload new images for comparison
router.post('/:id/rescan', upload.array('images', 10), scanController.rescan);

module.exports = router;