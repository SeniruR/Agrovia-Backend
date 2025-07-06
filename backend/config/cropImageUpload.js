const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure crop images directory exists
const cropImagesDir = path.join(__dirname, '../uploads/crop-images');
if (!fs.existsSync(cropImagesDir)) {
  fs.mkdirSync(cropImagesDir, { recursive: true });
}

// Configure storage for crop images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, cropImagesDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `crop-${uniqueSuffix}${ext}`);
  }
});

// File filter for crop images
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, JPG, PNG, and WebP images are allowed.'), false);
  }
};

// Configure multer for crop images
const cropImageUpload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per image
    files: 5 // Maximum 5 images
  },
  fileFilter: fileFilter
});

module.exports = cropImageUpload;
