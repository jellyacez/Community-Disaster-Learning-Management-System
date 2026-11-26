const multer = require('multer');
const multerS3 = require('multer-s3');
const { s3Client } = require('../services/s3Service');
const fs = require('fs');
const path = require('path');
const { PassThrough, pipeline } = require('stream');
const { LOGO_TYPES } = require('../utils/branding');
require('dotenv').config();

const useS3 = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY;
const bucketName = process.env.AWS_S3_BUCKET_NAME || 'bacolor-lms-media';

// What the module builder uploads: images (thumbnail, situational illustration), PDF/DOCX/video step media.
// Extension, declared MIME type and leading bytes must all name the same kind, so an HTML or SVG
// file renamed .png, or a PNG sent as application/pdf, is refused before it reaches storage.
const ascii = (b, offset, text) => b.length >= offset + text.length && b.toString('latin1', offset, offset + text.length) === text;
const KINDS = {
  png: { exts: ['.png'], mimes: ['image/png'], sniff: LOGO_TYPES.png },
  jpeg: { exts: ['.jpg', '.jpeg'], mimes: ['image/jpeg', 'image/jpg'], sniff: LOGO_TYPES.jpeg },
  webp: { exts: ['.webp'], mimes: ['image/webp'], sniff: LOGO_TYPES.webp },
  gif: { exts: ['.gif'], mimes: ['image/gif'], sniff: (b) => ascii(b, 0, 'GIF87a') || ascii(b, 0, 'GIF89a') },
  pdf: { exts: ['.pdf'], mimes: ['application/pdf'], sniff: (b) => ascii(b, 0, '%PDF-') },
  // a DOCX is a ZIP container; its local file header is all a cheap sniff can check
  docx: {
    exts: ['.docx'],
    mimes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    sniff: (b) => b.length >= 4 && b.readUInt32BE(0) === 0x504b0304,
  },
  mp4: { exts: ['.mp4'], mimes: ['video/mp4'], sniff: (b) => ascii(b, 4, 'ftyp') },
  webm: { exts: ['.webm'], mimes: ['video/webm'], sniff: (b) => b.length >= 4 && b.readUInt32BE(0) === 0x1a45dfa3 },
  ogg: { exts: ['.ogg'], mimes: ['video/ogg'], sniff: (b) => ascii(b, 0, 'OggS') },
};
const SNIFF_BYTES = 12;

const kindOf = (file) => {
  const ext = path.extname(file.originalname).toLowerCase();
  return Object.keys(KINDS).find((k) => KINDS[k].exts.includes(ext) && KINDS[k].mimes.includes(file.mimetype));
};

const invalidType = (message) => {
  // typed error so the wrapper can return a 400 with the reason
  const err = new Error(message);
  err.code = 'INVALID_FILE_TYPE';
  return err;
};

const fileFilter = (req, file, cb) => {
  if (kindOf(file)) return cb(null, true);
  return cb(invalidType(
    `File type not permitted. Only videos (MP4, WebM, OGG), documents (PDF, DOCX), and images (PNG, JPG, WEBP, GIF) are accepted. Received: ${file.mimetype}`
  ), false);
};

// Wraps a storage engine: reads the first bytes off the upload stream and checks them before the
// inner engine (disk or S3) sees anything, so a mismatched file is never written or sent to S3.
const sniffingStorage = (inner) => ({
  _handleFile(req, file, cb) {
    const src = file.stream;
    const chunks = [];
    let length = 0;
    let settled = false;
    const cleanup = () => {
      src.off('data', onData);
      src.off('end', onEnd);
      src.off('error', onError);
    };
    const proceed = (ended) => {
      if (settled) return;
      settled = true;
      cleanup();
      src.pause();
      const head = Buffer.concat(chunks);
      if (!KINDS[kindOf(file)].sniff(head)) {
        src.resume(); // drain the rest so the request can finish
        return cb(invalidType("The file's contents don't match its type. Only real videos (MP4, WebM, OGG), documents (PDF, DOCX), and images (PNG, JPG, WEBP, GIF) are accepted."));
      }
      const body = new PassThrough();
      body.write(head);
      if (ended) body.end();
      // pipeline, not pipe: an aborted request destroys src, and that must reach body and the
      // inner engine, which closes its file (disk) or aborts the upload (S3). The engine reports it.
      else pipeline(src, body, () => {});
      // multer's own file object, so the path disk storage sets on it is seen by multer's abort cleanup
      Object.defineProperty(file, 'stream', { configurable: true, enumerable: false, value: body });
      inner._handleFile(req, file, cb);
    };
    function onData(chunk) {
      chunks.push(chunk);
      length += chunk.length;
      if (length >= SNIFF_BYTES) proceed(false);
    }
    function onEnd() { proceed(true); }
    function onError(err) {
      if (settled) return;
      settled = true;
      cleanup();
      cb(err);
    }
    src.on('data', onData);
    src.once('end', onEnd);
    src.once('error', onError);
  },
  _removeFile(req, file, cb) {
    inner._removeFile(req, file, cb);
  },
});

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
  // local fallback for development
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
  storage: sniffingStorage(storage),
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // keeps uploads from exhausting Node memory
    // the builder sends exactly one part: the mediaFile file, no text fields
    files: 1,
    fields: 0,
    parts: 1,
    fieldSize: 1024,
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
      return res.status(400).json({ success: false, message: err.message });
    } else if (err) {
      console.error("Upload Error:", err);
      return res.status(500).json({ success: false, message: 'An error occurred during file upload.' });
    }
    next();
  });
};

module.exports = uploadMiddleware;
