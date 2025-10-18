const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const reviewsUploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(reviewsUploadDir)) {
  fs.mkdirSync(reviewsUploadDir, { recursive: true });
  console.log('Created uploads directory at:', reviewsUploadDir);
} else {
  console.log('Uploads directory exists at:', reviewsUploadDir);
}

// Disk storage for review attachments
const reviewsStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log('Saving file to:', reviewsUploadDir);
    // Make sure the directory exists
    if (!fs.existsSync(reviewsUploadDir)) {
      fs.mkdirSync(reviewsUploadDir, { recursive: true });
      console.log('Created directory for upload:', reviewsUploadDir);
    }
    cb(null, reviewsUploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp and random number
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = `${uniqueSuffix}${ext}`;
    console.log('Generated filename:', filename);
    cb(null, filename);
  }
});

// File filter for review attachments (PDF and images)
const reviewFileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPEG, JPG, and PNG files are allowed.'), false);
  }
};

// Create the upload middleware for reviews
const uploadReviewAttachment = multer({
  storage: reviewsStorage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
    files: 5 // Maximum 5 files per upload
  },
  fileFilter: reviewFileFilter
});

module.exports = {
  uploadReviewAttachment,
  reviewsUploadDir
};