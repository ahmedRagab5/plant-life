const multer = require('multer');
const ApiError = require('../utils/ApiError');

// Use memory storage — files stay in RAM, streamed directly to Cloudinary
const storage = multer.memoryStorage();

// Only allow image files
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'يُسمح فقط بملفات الصور'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB per file
    files: 10, // Max 10 files per request
  },
});

module.exports = upload;
