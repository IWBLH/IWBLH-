const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User'); // Import User model
const Line = require('../models/Line'); // Import Line model
const auth = require('../middleware/auth');
const { sendOrderConfirmation, sendOrderShipped } = require('../utils/email');

// ==========================================
// Config Routes
// ==========================================

// GET /api/config - Get public configuration
router.get('/config', (req, res) => {
    res.json({
        paypalClientId: process.env.PAYPAL_CLIENT_ID
    });
});

// ==========================================
// Product Routes
// ==========================================

// XSS Sanitization helper - escapes HTML special characters
const sanitize = (str) => {
    if (typeof str !== 'string') return str;
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

// Sanitize object fields
const sanitizeProduct = (data) => ({
    name: sanitize(data.name),
    price: Number(data.price) || 0,
    category: sanitize(data.category),
    description: sanitize(data.description),
    image: data.image, // URLs are not sanitized as they need to be valid
    images: Array.isArray(data.images) ? data.images : [],
    sizes: Array.isArray(data.sizes) ? data.sizes : [],
    isSoldOut: Boolean(data.isSoldOut),
    lineId: sanitize(data.lineId) || 'ANOTHER',
    isFeatured: Boolean(data.isFeatured)
});

// GET /api/products - Get all products
router.get('/products', async (req, res) => {
    try {
        const products = await Product.find().sort({ id: 1 });
        res.json(products);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/products/:id - Get single product (supports both _id and numeric id)
router.get('/products/:id', async (req, res) => {
    try {
        let product;
        // Check if id is a valid MongoDB ObjectId
        if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            product = await Product.findById(req.params.id);
        } else {
            product = await Product.findOne({ id: parseInt(req.params.id) });
        }
        if (!product) return res.status(404).json({ message: '商品が見つかりません' });
        res.json(product);
    } catch (err) {
        res.status(500).json({ message: 'サーバーエラーが発生しました' });
    }
});

// POST /api/products - Add new product (for Admin)
router.post('/products', auth, async (req, res) => {
    try {
        // Auto-increment ID simply for this prototype
        const lastProduct = await Product.findOne().sort({ id: -1 });
        const newId = lastProduct ? lastProduct.id + 1 : 1;

        const sanitizedData = sanitizeProduct(req.body);
        const product = new Product({
            id: newId,
            ...sanitizedData
        });

        const newProduct = await product.save();
        res.status(201).json(newProduct);
    } catch (err) {
        res.status(400).json({ message: '商品の追加に失敗しました' });
    }
});

// DELETE /api/products/:id - Delete product (Private)
router.delete('/products/:id', auth, async (req, res) => {
    try {
        const result = await Product.findOneAndDelete({ _id: req.params.id });
        if (!result) return res.status(404).json({ message: '商品が見つかりません' });
        res.json({ message: '商品を削除しました' });
    } catch (err) {
        res.status(500).json({ message: '商品の削除に失敗しました' });
    }
});

// PUT /api/products/:id - Update product (Private)
router.put('/products/:id', auth, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: '商品が見つかりません' });

        // Sanitize and update fields if provided
        if (req.body.name) product.name = sanitize(req.body.name);
        if (req.body.price) product.price = Number(req.body.price) || product.price;
        if (req.body.category) product.category = sanitize(req.body.category);
        if (req.body.description) product.description = sanitize(req.body.description);
        if (req.body.images) product.images = req.body.images;
        if (req.body.image) product.image = req.body.image;
        if (req.body.sizes) product.sizes = req.body.sizes;
        if (typeof req.body.isSoldOut !== 'undefined') product.isSoldOut = req.body.isSoldOut;
        if (req.body.lineId) product.lineId = sanitize(req.body.lineId);
        if (typeof req.body.isFeatured !== 'undefined') product.isFeatured = req.body.isFeatured;

        const updatedProduct = await product.save();
        res.json(updatedProduct);
    } catch (err) {
        res.status(400).json({ message: '商品の更新に失敗しました' });
    }
});

// ==========================================
// Line Routes
// ==========================================

// GET /api/lines - Get all lines
router.get('/lines', async (req, res) => {
    try {
        const lines = await Line.find().sort({ order: 1, createdAt: 1 });
        res.json(lines);
    } catch (err) {
        res.status(500).json({ message: 'ラインの取得に失敗しました' });
    }
});

// POST /api/lines - Add new line (Admin)
router.post('/lines', auth, async (req, res) => {
    try {
        const { name, description, order } = req.body;
        if (!name) return res.status(400).json({ message: 'ライン名は必須です' });
        
        const line = new Line({
            name: sanitize(name),
            description: sanitize(description),
            order: Number(order) || 0
        });
        const newLine = await line.save();
        res.status(201).json(newLine);
    } catch (err) {
        res.status(400).json({ message: 'ラインの追加に失敗しました (名前が重複している可能性があります)' });
    }
});

// PUT /api/lines/:id - Update line (Admin)
router.put('/lines/:id', auth, async (req, res) => {
    try {
        const line = await Line.findById(req.params.id);
        if (!line) return res.status(404).json({ message: 'ラインが見つかりません' });

        if (req.body.name) line.name = sanitize(req.body.name);
        if (typeof req.body.description !== 'undefined') line.description = sanitize(req.body.description);
        if (typeof req.body.order !== 'undefined') line.order = Number(req.body.order) || 0;

        const updatedLine = await line.save();
        res.json(updatedLine);
    } catch (err) {
        res.status(400).json({ message: 'ラインの更新に失敗しました' });
    }
});

// DELETE /api/lines/:id - Delete line (Admin)
router.delete('/lines/:id', auth, async (req, res) => {
    try {
        const line = await Line.findByIdAndDelete(req.params.id);
        if (!line) return res.status(404).json({ message: 'ラインが見つかりません' });
        // Optionally, reset products that were in this line to 'ANOTHER'
        await Product.updateMany({ lineId: line.name }, { lineId: 'ANOTHER' });
        res.json({ message: 'ラインを削除しました' });
    } catch (err) {
        res.status(500).json({ message: 'ラインの削除に失敗しました' });
    }
});

// PUT /api/lines/reorder - Reorder lines (Admin)
router.put('/lines/reorder', auth, async (req, res) => {
    try {
        const { lineOrders } = req.body; // Array of { id, order }
        if (!Array.isArray(lineOrders)) return res.status(400).json({ message: '無効なデータ形式です' });

        const bulkOps = lineOrders.map(lo => ({
            updateOne: {
                filter: { _id: lo.id },
                update: { order: lo.order }
            }
        }));

        await Line.bulkWrite(bulkOps);
        res.json({ message: '並び順を更新しました' });
    } catch (err) {
        res.status(500).json({ message: '並び順の更新に失敗しました' });
    }
});

// ==========================================
// Order Routes
// ==========================================

// Sanitize order customer data
const sanitizeCustomer = (customer) => ({
    email: sanitize(customer?.email || ''),
    firstName: sanitize(customer?.firstName || ''),
    lastName: sanitize(customer?.lastName || ''),
    address: sanitize(customer?.address || ''),
    apartment: sanitize(customer?.apartment || ''),
    city: sanitize(customer?.city || ''),
    zipCode: sanitize(customer?.zipCode || ''),
    phone: sanitize(customer?.phone || '')
});

// POST /api/orders - Create new order
router.post('/orders', async (req, res) => {
    try {
        let userId = undefined;

        // Check for token to associate order with user
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (token) {
            try {
                const jwt = require('jsonwebtoken');
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretKey');
                userId = decoded.id;
            } catch (e) {
                console.warn('Invalid token provided for order creation');
                // Proceed as guest if token is invalid, or you could return error
            }
        }

        const sanitizedData = {
            ...req.body,
            userId: userId, // Override client-provided userId with verified one
            orderId: req.body.orderId || `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            customer: sanitizeCustomer(req.body.customer)
        };
        const order = new Order(sanitizedData);
        const newOrder = await order.save();

        // Send Confirmation Email
        sendOrderConfirmation(newOrder, newOrder.customer.email).catch(err => console.error('Email sending failed:', err));

        res.status(201).json(newOrder);
    } catch (err) {
        console.error('Order create error:', err);
        res.status(400).json({ message: '注文の作成に失敗しました: ' + err.message });
    }
});

// GET /api/orders/me - Get current user's orders
router.get('/orders/me', async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) return res.status(401).json({ message: '認証トークンがありません' });

        const jwt = require('jsonwebtoken'); // Ensure jwt is available
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const orders = await Order.find({ userId: decoded.id }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: '注文履歴の取得に失敗しました' });
    }
});

// GET /api/orders - Get all orders (for Admin)
router.get('/orders', auth, async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: '注文の取得に失敗しました' });
    }
});

// PUT /api/orders/:id/status - Update order status
router.put('/orders/:id/status', auth, async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: '無効なステータスです' });
        }

        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: '注文が見つかりません' });

        const oldStatus = order.status;
        order.status = status;
        const updatedOrder = await order.save();

        // Send Email if status changed to Shipped
        if (status === 'Shipped' && oldStatus !== 'Shipped') {
            // Import on demand or ensure it's imported at top.
            // It is imported at top as: const { sendOrderConfirmation } = require('../utils/email');
            // I need to update the import to include sendOrderShipped
            const { sendOrderShipped } = require('../utils/email');
            sendOrderShipped(updatedOrder, updatedOrder.customer.email).catch(err => console.error('Email sending failed:', err));
        }

        res.json(updatedOrder);
    } catch (err) {
        console.error(err);
        res.status(400).json({ message: 'ステータスの更新に失敗しました' });
    }
});

// DELETE /api/orders/:id - Delete order (Admin only)
router.delete('/orders/:id', auth, async (req, res) => {
    try {
        const order = await Order.findByIdAndDelete(req.params.id);
        if (!order) return res.status(404).json({ message: '注文が見つかりません' });
        res.json({ message: '注文を削除しました' });
    } catch (err) {
        res.status(500).json({ message: '注文の削除に失敗しました' });
    }
});

// POST /api/my-orders - Get orders by IDs (Public)
router.post('/my-orders', async (req, res) => {
    try {
        const { orderIds } = req.body;
        if (!Array.isArray(orderIds) || orderIds.length === 0) {
            return res.json([]);
        }

        // Find orders where orderId is in the provided list
        // Sort by createdAt descending (newest first)
        const orders = await Order.find({ orderId: { $in: orderIds } }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: '注文履歴の取得に失敗しました' });
    }
});

// POST /api/orders/:id/cancel - Cancel order (Public with conditions)
router.post('/orders/:id/cancel', async (req, res) => {
    try {
        // Find by local orderId (e.g., ORD-...) not _id
        const order = await Order.findOne({ orderId: req.params.id });
        if (!order) return res.status(404).json({ message: '注文が見つかりません' });

        // Check if cancellable status
        if (!['Pending', 'Processing'].includes(order.status)) {
            return res.status(400).json({ message: 'この注文はキャンセルできません（発送済みまたは完了済み）' });
        }

        // Check time limit (24 hours)
        const now = new Date();
        const orderDate = new Date(order.createdAt);
        const diffHours = (now - orderDate) / (1000 * 60 * 60);

        if (diffHours > 24) {
            return res.status(400).json({ message: '注文から24時間が経過しているためキャンセルできません' });
        }

        order.status = 'Cancelled';
        await order.save();

        res.json({ message: '注文をキャンセルしました', order });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: '注文のキャンセルに失敗しました' });
    }
});

// GET /api/users - Get all users (Admin only)
router.get('/users', auth, async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: 'ユーザー一覧の取得に失敗しました' });
    }
});

// GET /api/users/:id - Get user details with order history (Admin only)
router.get('/users/:id', auth, async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) return res.status(404).json({ message: 'ユーザーが見つかりません' });

        const orders = await Order.find({ userId: req.params.id }).sort({ createdAt: -1 });

        res.json({ user, orders });
    } catch (err) {
        res.status(500).json({ message: 'ユーザー情報の取得に失敗しました' });
    }
});

module.exports = router;
