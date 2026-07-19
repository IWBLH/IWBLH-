const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const Product = require('../models/Product');

const products = [
    {
        id: 1,
        name: 'IMPETO Leather Jacket',
        price: 128000,
        image: 'assets/products/product_jacket_1770300090044.png',
        images: ['assets/products/product_jacket_1770300090044.png', 'assets/products/jacket_back.png'],
        category: 'Outerwear',
        description: 'A masterpiece of rebellious elegance. Crafted from premium Italian calfskin, this jacket features a minimalist silhouette with brushed gunmetal hardware. The "IMPETO" signature is subtly embossed on the hem, embodying our philosophy of quiet danger.'
    },
    {
        id: 2,
        name: 'IMPETO Signature Hoodie',
        price: 48000,
        image: 'assets/products/product_hoodie_1770300104061.png',
        images: ['assets/products/product_hoodie_1770300104061.png', 'assets/products/hoodie_back.png'],
        category: 'Tops',
        description: 'The ultimate luxury essential. Made from heavyweight 500GSM organic cotton with a structured fit. Features a double-layered hood and the iconic IWBLH logo stitched in tonal silk thread. Built for the modern nomad.'
    },
    {
        id: 3,
        name: 'IMPETO Essential Tee',
        price: 18000,
        image: 'assets/products/product_tshirt_1770300121576.png',
        images: ['assets/products/product_tshirt_1770300121576.png'],
        category: 'Tops',
        description: 'Simplicity redefined. A clean-cut tee crafted from ultra-soft Pima cotton with a slight sheen. The oversized yet tailored fit ensures a sophisticated drape. A versatile foundation for any IWBLH silhouette.'
    },
    {
        id: 4,
        name: 'IMPETO Cargo Pants',
        price: 58000,
        image: 'assets/products/product_pants_1770300139239.png',
        images: ['assets/products/product_pants_1770300139239.png'],
        category: 'Bottoms',
        description: 'Utility meets high fashion. These cargo pants are engineered from a durable tech-silk blend, featuring multiple concealed pockets and adjustable ankle straps. Designed for functionality without compromising the sleek, dangerous aesthetic.'
    }
];

const resetDB = async () => {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/moda_impeto?directConnection=true');
        console.log('MongoDB Connected');

        // Clear existing data
        await Admin.deleteMany({});
        await Product.deleteMany({});
        console.log('Cleared existing data');

        // Seed Products
        await Product.insertMany(products);
        console.log('Products seeded');

        // Create Admin
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('00000', salt);
        const newAdmin = new Admin({ username: 'admin', password: hashedPassword });
        await newAdmin.save();
        console.log('Default Admin Created (admin / 00000)');

    } catch (err) {
        console.error(err);
    } finally {
        mongoose.connection.close();
    }
};

resetDB();
