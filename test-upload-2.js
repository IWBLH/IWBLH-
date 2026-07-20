require('dotenv').config();
const { v2: cloudinary } = require('cloudinary');

cloudinary.config({
    cloud_name: 'kx9yduny',
    api_key: '538228315598289',
    api_secret: 'Jmn3Xl4-Obw0h01eeDIlq24lfnU'
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
