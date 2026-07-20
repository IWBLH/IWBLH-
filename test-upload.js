require('dotenv').config();
const { v2: cloudinary } = require('cloudinary');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

async function testUpload() {
    try {
        const result = await cloudinary.uploader.upload('assets/iwblh-logo-transparent.png', {
            folder: 'moda-impeto-products'
        });
        console.log('Success:', result.secure_url);
    } catch (e) {
        console.error('Error:', e);
    }
}
testUpload();
