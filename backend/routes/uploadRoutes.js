const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { uploadReviewAttachment } = require('../config/reviewUpload');

// Route to handle review attachment uploads (up to 5 files)
router.post('/review-attachments', (req, res, next) => {
  console.log('Upload request received, fields:', req.body);
  console.log('Files in request:', req.files);
  
  // Log what field name we're expecting
  console.log('Looking for field name: attachments');
  
  next();
}, uploadReviewAttachment.array('attachments', 5), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      console.log('No files received in request');
      return res.status(400).json({
        success: false,
        message: 'No files were uploaded'
      });
    }

    // Return information about the uploaded files
    const uploadedFiles = req.files.map(file => ({
      filename: file.filename,
      originalname: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      path: `/uploads/${file.filename}`
    }));

    console.log('Files uploaded successfully:', uploadedFiles);
    console.log('Files physical paths:', req.files.map(f => f.path));
    
    // Verify files actually exist on disk
    uploadedFiles.forEach(file => {
      const filePath = path.join(__dirname, '..', 'uploads', file.filename);
      if (fs.existsSync(filePath)) {
        console.log(`✅ File exists on disk: ${filePath}`);
      } else {
        console.error(`❌ File MISSING on disk: ${filePath}`);
      }
    });
    
    res.status(200).json({
      success: true,
      message: `Successfully uploaded ${req.files.length} file(s)`,
      files: uploadedFiles
    });
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({
      success: false,
      message: `Error uploading files: ${error.message}`
    });
  }
});

// Generic upload endpoint for single file uploads
router.post('/', uploadReviewAttachment.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file was uploaded'
      });
    }

    // Return information about the uploaded file
    const fileInfo = {
      filename: req.file.filename,
      originalname: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      path: `/uploads/${req.file.filename}`
    };

    res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      file: fileInfo
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({
      success: false,
      message: `Error uploading file: ${error.message}`
    });
  }
});

module.exports = router;
