const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');
dotenv.config();
// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME, // Replace with your cloud name
  api_key: process.env.CLOUD_API_KEY,       // Replace with your API key
  api_secret: process.env.CLOUD_API_SECRET, // Replace with your API secret
});

module.exports = cloudinary;
