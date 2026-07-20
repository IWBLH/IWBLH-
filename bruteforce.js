require('dotenv').config();
const { v2: cloudinary } = require('cloudinary');

const cloud_name = 'kx9yduny';
const api_key = '538228315598289';

const pos6 = ['l', 'I'];
const pos19 = ['l', 'I'];
const pos20 = ['l', 'I'];
const pos24 = ['l', 'I'];

async function bruteForce() {
    for (let c6 of pos6) {
        for (let c19 of pos19) {
            for (let c20 of pos20) {
                for (let c24 of pos24) {
                    const secret = `Jmn3X${c6}4-Obw0h01eeD${c19}${c20}q24${c24}fnU`;
                    cloudinary.config({
                        cloud_name, api_key, api_secret: secret
                    });
                    
                    try {
                        const result = await cloudinary.uploader.upload('assets/iwblh-logo-transparent.png', {
                            folder: 'moda-impeto-products'
                        });
                        console.log('SUCCESS! The correct secret is:', secret);
                        return; // Stop on first success
                    } catch (e) {
                        // ignore and continue
                    }
                }
            }
        }
    }
    console.log('Failed to find correct secret.');
}

bruteForce();
