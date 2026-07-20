const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    orderId: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Link to registered user
    customer: {
        email: String,
        firstName: String,
        lastName: String,
        country: String,
        address: String,
        apartment: String,
        city: String,
        state: String, // Ensure state is stored
        zipCode: String,
        phone: String
    },
    items: [{
        productId: String,
        name: String,
        price: Number,
        quantity: Number,
        image: String,
        size: String // Added size field
    }],
    totalAmount: { type: Number, required: true },
    shippingMethod: { type: String, default: 'Standard Shipping' },
    paymentMethod: { type: String, required: true },
    paymentIntentId: { type: String },
    paymentStatus: { type: String, default: 'pending', enum: ['pending', 'paid', 'failed', 'refunded'] },
    status: { type: String, default: 'Processing', enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'] },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', OrderSchema);
