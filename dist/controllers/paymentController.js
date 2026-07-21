"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyPayment = exports.createOrder = void 0;
const razorpay_1 = __importDefault(require("razorpay"));
const crypto_1 = __importDefault(require("crypto"));
let razorpay;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpay = new razorpay_1.default({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
}
const createOrder = async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || isNaN(amount)) {
            res.status(400).json({ success: false, message: 'Valid amount is required' });
            return;
        }
        const options = {
            amount: Math.round(amount * 100), // amount in the smallest currency unit (paise for INR)
            currency: "INR",
            receipt: `receipt_${Date.now()}`
        };
        if (!razorpay) {
            console.log("=== MOCK RAZORPAY ORDER CREATED ===");
            res.status(200).json({
                success: true,
                mockMode: true,
                order: {
                    id: `order_mock_${Date.now()}`,
                    amount: options.amount,
                    currency: options.currency,
                    receipt: options.receipt
                }
            });
            return;
        }
        const order = await razorpay.orders.create(options);
        res.status(200).json({
            success: true,
            order,
        });
    }
    catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
exports.createOrder = createOrder;
const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        if (!razorpay) {
            console.log("=== MOCK RAZORPAY PAYMENT VERIFIED ===");
            res.status(200).json({ success: true, mockMode: true, message: "Payment verified successfully (Mock)" });
            return;
        }
        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto_1.default
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(sign.toString())
            .digest("hex");
        if (razorpay_signature === expectedSign) {
            // Signature is valid. Payment is successful.
            // Here you could update the user's wallet, save transaction to DB, etc.
            res.status(200).json({ success: true, message: "Payment verified successfully" });
        }
        else {
            // Invalid signature
            res.status(400).json({ success: false, message: "Invalid payment signature" });
        }
    }
    catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
exports.verifyPayment = verifyPayment;
