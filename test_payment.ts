import { createRazorpayOrder } from './src/controllers/financeController';
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

// Mock response object
const mockRes = () => {
    const res: any = {};
    res.status = (code: number) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data: any) => {
        res.data = data;
        return res;
    };
    return res;
};

// Mock Razorpay API so we don't make real requests
const razorpayMock = {
    orders: {
        create: async (options: any) => {
            return { id: 'order_mock123', amount: options.amount, currency: options.currency };
        }
    }
};

// Mock Transaction
const mockTransactionCreate = async (data: any) => {
    return { ...data, _id: 'tx_mock123' };
};

// We need to override require cache or mock it before testing.
// A simpler way is to just call createRazorpayOrder but intercept what we need.
// However, since createRazorpayOrder uses imports directly, mocking them via proxyquire or jest is easier.

console.log('Test file created. Please run using Jest or a mock framework.');
