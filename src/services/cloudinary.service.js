const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

/**
 * Upload multiple image buffers to Cloudinary in parallel.
 *
 * @param {Array<{buffer: Buffer, originalname: string}>} files - Multer file objects
 * @param {string} folder - Cloudinary folder name
 * @returns {Promise<Array<{url: string, publicId: string, filename: string}>>}
 */
const uploadImages = async (files, folder = 'tomato-scans') => {
  const uploadPromises = files.map((file) => {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
              filename: file.originalname,
            });
          }
        }
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  });

  return Promise.all(uploadPromises);
};

/**
 * Delete an image from Cloudinary by public ID.
 *
 * @param {string} publicId
 */
const deleteImage = async (publicId) => {
  await cloudinary.uploader.destroy(publicId);
};

/**
 * Delete multiple images from Cloudinary.
 *
 * @param {string[]} publicIds
 */
const deleteImages = async (publicIds) => {
  if (publicIds.length === 0) return;
  await Promise.all(publicIds.map((id) => deleteImage(id)));
};

module.exports = { uploadImages, deleteImage, deleteImages };
