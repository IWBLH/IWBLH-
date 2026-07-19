const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true }, // Keeping manual ID for compatibility with frontend
    name: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, required: true },
    images: [{ type: String }],
    sizes: [{ type: String }], // e.g. ['S', 'M', 'L', 'XL']
    category: { type: String, required: true },
    description: { type: String },
    isSoldOut: { type: Boolean, default: false },
    lineId: { type: String, default: 'ANOTHER' }, // Uses line name or ID
    isFeatured: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Product', ProductSchema);
