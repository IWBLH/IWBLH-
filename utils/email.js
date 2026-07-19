const nodemailer = require('nodemailer');
const ejs = require('ejs');
const path = require('path');

// Create a transporter
// For development, we can use Ethereal or just log to console if no env vars
// In production, use real SMTP credentials from .env
const createTransporter = async () => {
    // If we have real credentials
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        return nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT || 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }

    console.log('Skipping Ethereal (Test Account) creation due to potential timeout. Using Console Logger.');
    return null;
};

const renderTemplate = async (templateName, data) => {
    const templatePath = path.join(__dirname, '../views/emails', templateName);
    return await ejs.renderFile(templatePath, data);
};

const sendEmail = async (to, subject, htmlContent) => {
    try {
        const transporter = await createTransporter();

        if (!transporter) {
            console.log('--- Email Simulator ---');
            console.log(`To: ${to}`);
            console.log(`Subject: ${subject}`);
            console.log('--- Content Preview (First 500 chars) ---');
            console.log(htmlContent.substring(0, 500) + '...');
            console.log('-----------------------');
            return;
        }

        const mailOptions = {
            from: '"IWBLH" <noreply@modaimpeto.com>',
            to: to,
            subject: subject,
            html: htmlContent
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Message sent: %s", info.messageId);
        console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));

    } catch (error) {
        console.error("Error sending email:", error);
    }
};

const sendOrderConfirmation = async (order, userEmail) => {
    console.log('Sending order confirmation for order:', order.orderId);
    try {
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        const html = await renderTemplate('order_confirmation.ejs', { order, baseUrl });
        await sendEmail(userEmail, `Order Confirmation #${order.orderId}`, html);
    } catch (err) {
        console.error('Template rendering failed:', err);
    }
};

const sendOrderShipped = async (order, userEmail) => {
    console.log('Sending shipping notification for order:', order.orderId);
    try {
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        const html = await renderTemplate('order_shipped.ejs', { order, baseUrl });
        await sendEmail(userEmail, `Your Order #${order.orderId} Has Shipped`, html);
    } catch (err) {
        console.error('Template rendering failed:', err);
    }
};

module.exports = {
    sendOrderConfirmation,
    sendOrderShipped
};
