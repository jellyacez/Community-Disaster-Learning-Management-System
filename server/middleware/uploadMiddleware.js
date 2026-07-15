const multer = require('multer');
const multerS3 = require('multer-s3');
const { s3Client } = require('../services/s3Service');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const useS3 = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY;
const bucketName = process.env.AWS_S3_BUCKET_NAME || 'bacolor-lms-media';

// ─── SECURITY: Strict MIME type + extension whitelist ────────────────────────
// Two-layer check: MIME type AND file extension must both be on the allow-list.
// This prevents MIME spoofing (e.g. a .php file renamed to .mp4).
const ALLOWED_MIME_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/ogg',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
]);

const ALLOWED_EXTENSIONS = new Set([
  '.mp4', '.webm', '.ogg',
  '.jpg', '.jpeg', '.png', '.webp', '.gif',
  '.pdf', '.docx', '.doc',
]);

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeAllowed = ALLOWED_MIME_TYPES.has(file.mimetype);
  const extAllowed  = ALLOWED_EXTENSIONS.has(ext);

  if (mimeAllowed && extAllowed) {
    return cb(null, true);
  }

  // Reject — create a typed error so the wrapper can return the right response
  const err = new Error(
    `File type not permitted. Only videos (MP4, WebM, OGG), documents (PDF, DOCX), and images are accepted. Received: ${file.mimetype}`
  );
  err.code = 'INVALID_FILE_TYPE';
  return cb(err, false);
};
// ─────────────────────────────────────────────────────────────────────────────

let storage;

if (useS3) {
  storage = multerS3({
    s3: s3Client,
    bucket: bucketName,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const cleanName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '');
      cb(null, `modules/${uniqueSuffix}-${cleanName}`);
    }
  });
} else {
  // Local fallback for development
  const uploadDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const cleanName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '');
      cb(null, `${uniqueSuffix}-${cleanName}`);
    }
  });
}

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB limit for strict Node.js memory defense
  }
});

const uploadMiddleware = (req, res, next) => {
  const uploadSingle = upload.single('mediaFile');
  
  uploadSingle(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
          success: false, 
          message: 'File too large. Please compress the video or ensure it is under 50 MB.' 
        });
      }
      return res.status(400).json({ success: false, message: err.message });
    } else if (err && err.code === 'INVALID_FILE_TYPE') {
      // Rejected by our fileFilter — return a clean 400 with the reason
      return res.status(400).json({ success: false, message: err.message });
    } else if (err) {
      console.error("Upload Error:", err);
      return res.status(500).json({ success: false, message: 'An error occurred during file upload.' });
    }
    next();
  });
};

module.exports = uploadMiddleware;
