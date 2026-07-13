const { S3Client } = require('@aws-sdk/client-s3');
require('dotenv').config();

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-southeast-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'dummy_key',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'dummy_secret',
  },
});

module.exports = { s3Client };
