"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUtilityTransactionStatus = exports.handleBBPSPayment = exports.handleUtilityRecharge = exports.getPlans = exports.payBill = exports.fetchBBPSBill = exports.getOperatorParams = exports.getBBPSOperatorsList = exports.getLocations = exports.getCategories = exports.createPendingUtilityTransaction = exports.updateUtilityTransactionStatus = void 0;
const notificationController_1 = require("./notificationController");
const UtilityTransaction_1 = __importDefault(require("../models/UtilityTransaction"));
const ekoService_1 = require("../services/ekoService");
const crypto_1 = __importDefault(require("crypto"));
const utilityFinalStatuses = ['eko_success', 'eko_failed', 'refunded', 'manual_review', 'Success', 'Failed'];
const makeClientRefId = (prefix = 'utl') => `${prefix}_${Date.now()}_${crypto_1.default.randomBytes(4).toString('hex')}`.substring(0, 32);
const getPrimaryAccountNumber = (params) => {
    if (params.utility_acc_no)
        return String(params.utility_acc_no);
    const ignored = new Set(['confirmation_mobile_no', 'sender_name', 'category', 'client_ref_id', 'source_ip', 'latlong', 'amount']);
    const firstValue = Object.entries(params).find(([key, value]) => !ignored.has(key) && value !== undefined && value !== null && value !== '');
    return firstValue ? String(firstValue[1]) : '';
};
const emitUtilityStatus = (io, transaction) => {
    if (!io || !transaction)
        return;
    io.to(`user_${transaction.userId}`).emit('utility_status_updated', {
        transactionId: transaction._id.toString(),
        status: transaction.status,
        message: transaction.failureReason || undefined,
        amount: transaction.amount,
        operator: transaction.operator,
        ekoTid: transaction.ekoTxId,
        bbpsTxnRefId: transaction.bbpsTxnRefId
    });
};
const updateUtilityTransactionStatus = async (id, status, message, patch = {}, io) => {
    const transaction = await UtilityTransaction_1.default.findByIdAndUpdate(id, {
        $set: { status, ...(message ? { failureReason: message } : {}), ...patch },
        $push: { statusHistory: { status, message, at: new Date() } }
    }, { new: true });
    emitUtilityStatus(io, transaction);
    return transaction;
};
exports.updateUtilityTransactionStatus = updateUtilityTransactionStatus;
const createPendingUtilityTransaction = async (userId, category, amount, metadata, razorpayOrderId) => {
    if (!['mobile_recharge', 'bbps_payment'].includes(category))
        return null;
    const isRecharge = category === 'mobile_recharge';
    const utility_acc_no = metadata?.utility_acc_no || metadata?.mobile || '';
    const clientRefId = metadata?.client_ref_id || makeClientRefId(isRecharge ? 'rch' : 'bbps');
    const transaction = await UtilityTransaction_1.default.findOneAndUpdate({ clientRefId }, {
        $setOnInsert: {
            userId,
            type: isRecharge ? 'Mobile Recharge' : 'Bill Payment',
            amount,
            operator: metadata?.operatorName || metadata?.operatorCode || 'Utility',
            mobileOrAccountNumber: utility_acc_no,
            clientRefId,
            razorpayOrderId,
            planDescription: metadata?.planDescription,
            status: 'payment_pending',
            metadata: { ...metadata, client_ref_id: clientRefId },
            requestPayload: metadata,
            statusHistory: [{ status: 'payment_pending', message: 'Waiting for payment confirmation', at: new Date() }]
        }
    }, { upsert: true, new: true });
    return transaction;
};
exports.createPendingUtilityTransaction = createPendingUtilityTransaction;
/**
 * Maps Eko BBPS category name OR integer to the correct integer category code for the Pay API.
 * Reference: Eko BBPS API documentation — operator_category_id values.
 */
const getCategoryNumber = (categoryNameOrId) => {
    if (typeof categoryNameOrId === 'number' && categoryNameOrId > 0)
        return categoryNameOrId;
    const name = String(categoryNameOrId || '').toLowerCase();
    if (name.includes('broadband'))
        return 1;
    if (name.includes('lpg') || name.includes('cylinder'))
        return 18;
    if (name.includes('gas'))
        return 2;
    if (name.includes('dth') || name.includes('cable tv'))
        return 4;
    if (name.includes('prepaid'))
        return 5;
    if (name.includes('credit card'))
        return 7;
    if (name.includes('electric'))
        return 8;
    if (name.includes('landline'))
        return 9;
    if (name.includes('postpaid'))
        return 10;
    if (name.includes('water'))
        return 11;
    if (name.includes('housing'))
        return 12;
    if (name.includes('subscription'))
        return 13;
    if (name.includes('education'))
        return 14;
    if (name.includes('municipal tax'))
        return 15;
    if (name.includes('club') || name.includes('association'))
        return 16;
    if (name.includes('cable'))
        return 17;
    if (name.includes('hospital'))
        return 19;
    if (name.includes('insurance'))
        return 20;
    if (name.includes('loan') || name.includes('emi'))
        return 21;
    if (name.includes('fastag'))
        return 22;
    if (name.includes('municipal serv'))
        return 23;
    if (name.includes('rental'))
        return 24;
    if (name.includes('tax'))
        return 6;
    if (name.includes('challan'))
        return 27;
    if (name.includes('ev recharge'))
        return 30;
    return 5; // Default: Mobile Prepaid
};
// ─── Discovery Endpoints ───────────────────────────────────────────────
const getCategories = async (req, res) => {
    try {
        const raw = await (0, ekoService_1.fetchCategories)();
        // Normalize: extract the list_elements array for the frontend
        const categories = raw?.param_attributes?.list_elements || [];
        res.status(200).json({ success: true, data: categories });
    }
    catch (error) {
        console.error('Error in getCategories:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch categories' });
    }
};
exports.getCategories = getCategories;
const getLocations = async (req, res) => {
    try {
        const raw = await (0, ekoService_1.fetchLocations)();
        const locations = raw?.param_attributes?.list_elements || [];
        res.status(200).json({ success: true, data: locations });
    }
    catch (error) {
        console.error('Error in getLocations:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch locations' });
    }
};
exports.getLocations = getLocations;
const getBBPSOperatorsList = async (req, res) => {
    try {
        const { category, location } = req.query;
        const raw = await (0, ekoService_1.fetchBBPSOperators)(category, location);
        const operators = raw?.param_attributes?.list_elements || [];
        res.status(200).json({ success: true, data: operators });
    }
    catch (error) {
        console.error('Error in getBBPSOperatorsList:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch operators' });
    }
};
exports.getBBPSOperatorsList = getBBPSOperatorsList;
const getOperatorParams = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id)
            return res.status(400).json({ success: false, message: 'Operator ID is required' });
        const raw = await (0, ekoService_1.fetchOperatorParameters)(id);
        // Return the full param_attributes so frontend can use list_elements + fetchBill flag
        const paramData = raw?.data?.param_attributes || raw?.param_attributes || {};
        res.status(200).json({ success: true, data: paramData });
    }
    catch (error) {
        console.error('Error in getOperatorParams:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch operator parameters' });
    }
};
exports.getOperatorParams = getOperatorParams;
// ─── Bill Fetch ──────────────────────────────────────────────────────
const fetchBBPSBill = async (req, res) => {
    try {
        const { phone_operator_code, ...otherParams } = req.body;
        if (!phone_operator_code) {
            return res.status(400).json({ success: false, message: 'phone_operator_code is required' });
        }
        const client_ref_id = otherParams.client_ref_id || makeClientRefId('bill');
        // Eko requires confirmation_mobile_no but it MUST be a real number.
        // The frontend sends it via otherParams. Fallback to the initiator_id (which is a real mobile).
        const confirmation_mobile_no = otherParams.confirmation_mobile_no || process.env.EKO_INITIATOR_ID || '';
        delete otherParams.confirmation_mobile_no;
        const utility_acc_no = getPrimaryAccountNumber(otherParams);
        const raw = await (0, ekoService_1.fetchBill)({
            phone_operator_code,
            utility_acc_no,
            client_ref_id,
            confirmation_mobile_no,
            sender_name: otherParams.sender_name || 'Customer',
            source_ip: (0, ekoService_1.getClientIp)(req),
            category: otherParams.category,
            ...otherParams
        });
        console.log('[fetchBBPSBill] Eko response:', JSON.stringify(raw));
        if (raw.status === 0 && raw.data) {
            res.status(200).json({
                success: true,
                data: {
                    amount: raw.data.amount,
                    utilitycustomername: raw.data.utilitycustomername || '',
                    billDueDate: raw.data.billDueDate || '',
                    customer_id: raw.data.customer_id || '',
                    bbpstrxnrefid: raw.data.bbpstrxnrefid || '',
                    client_ref_id,
                    billfetchresponse: raw.data.billfetchresponse || raw.data.billFetchResponse || raw.data,
                    ekoFetchResponse: raw
                }
            });
        }
        else {
            // Map Eko error codes to user-friendly messages
            let errorMsg = raw.message || 'Could not fetch bill';
            const data = raw.data || {};
            if (errorMsg === 'No key for Response') {
                errorMsg = 'No pending bill found, or invalid account number.';
            }
            else if (errorMsg === 'Unable to fetch bill' || data.reason?.includes('server is down')) {
                errorMsg = `Biller's server is temporarily unavailable. Please try again later.`;
            }
            else if (raw.status === 97 && raw.invalid_params) {
                // Eko parameter validation error — pass field-level errors
                const fields = Object.values(raw.invalid_params).join(', ');
                errorMsg = `Invalid input: ${fields}`;
            }
            res.status(400).json({
                success: false,
                message: errorMsg,
                ekoStatus: raw.status,
                data: raw.data
            });
        }
    }
    catch (error) {
        console.error('Error in fetchBBPSBill:', error.response?.data || error.message);
        const ekoData = error.response?.data || {};
        let ekoMsg = ekoData.message || error.message;
        if (ekoMsg === 'No key for Response') {
            ekoMsg = 'No pending bill found, or invalid account number.';
        }
        res.status(500).json({ success: false, message: ekoMsg || 'Failed to fetch bill' });
    }
};
exports.fetchBBPSBill = fetchBBPSBill;
// ─── Pay Bill ──────────────────────────────────────────────────────────
const payBill = async (req, res) => {
    try {
        const { userId, operatorCode, operatorName, amount, utility_acc_no, confirmation_mobile_no, sender_name, category, utilitycustomername, client_ref_id, ...extraParams } = req.body;
        if (!userId || !operatorCode || !amount || !utility_acc_no) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }
        // Generate client_ref_id if not provided (e.g., direct recharge without fetch-bill)
        const refId = client_ref_id || `ref_${Date.now()}_${crypto_1.default.randomBytes(4).toString('hex')}`.substring(0, 20);
        // 1. Create Pending Transaction in DB
        const transaction = new UtilityTransaction_1.default({
            userId,
            type: category ? 'Bill Payment' : 'Mobile Recharge',
            amount: parseFloat(amount),
            operator: operatorName || operatorCode,
            mobileOrAccountNumber: utility_acc_no,
            status: 'Pending'
        });
        await transaction.save();
        try {
            // 2. Call Eko Pay Bill API (Section 6 of PDF)
            const ekoResult = await (0, ekoService_1.payBBPSBill)({
                phone_operator_code: operatorCode.toString(),
                utility_acc_no,
                confirmation_mobile_no: confirmation_mobile_no || utility_acc_no,
                sender_name: sender_name || 'Customer',
                category: getCategoryNumber(category || operatorName || ''),
                amount: parseFloat(amount),
                utilitycustomername: utilitycustomername || sender_name || 'Customer',
                client_ref_id: refId,
                source_ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || '1.1.1.1',
                ...extraParams
            });
            // 3. Check result
            if (ekoResult.status === 0 || ekoResult.response_type_id === 333) {
                transaction.status = 'Success';
                transaction.ekoTxId = ekoResult.data?.tid || refId;
                await transaction.save();
                await (0, notificationController_1.createNotification)(userId, 'Payment Successful', `Your payment of ₹${amount} for ${operatorName || operatorCode} was successful. (TxID: ${transaction.ekoTxId})`, 'success');
                return res.status(200).json({
                    success: true,
                    data: {
                        transaction,
                        ekoData: ekoResult.data
                    }
                });
            }
            else {
                transaction.status = 'Failed';
                await transaction.save();
                return res.status(400).json({
                    success: false,
                    message: ekoResult.message || 'Payment failed at biller end',
                    data: ekoResult
                });
            }
        }
        catch (error) {
            console.error('Eko Pay Bill failed:', error.response?.data || error.message);
            transaction.status = 'Failed';
            await transaction.save();
            await (0, notificationController_1.createNotification)(userId, 'Payment Failed', `Your payment of ₹${amount} for ${operatorName || operatorCode} failed. Please try again.`, 'error');
            return res.status(500).json({
                success: false,
                message: error.response?.data?.message || 'Payment failed'
            });
        }
    }
    catch (error) {
        console.error('Error in payBill:', error);
        res.status(500).json({ success: false, message: error.message || 'Payment failed' });
    }
};
exports.payBill = payBill;
// ─── Recharge Flow (Mobile Prepaid / DTH) ──────────────────────────────
const getPlans = async (req, res) => {
    try {
        const { mobile } = req.query;
        if (!mobile) {
            return res.status(400).json({ success: false, message: 'Mobile number is required' });
        }
        const { phone_operator_code, circleid } = await (0, ekoService_1.getOperatorCodeAndCircle)(mobile);
        const plans = await (0, ekoService_1.fetchRechargePlans)(mobile, phone_operator_code, circleid);
        res.status(200).json({
            success: true,
            data: plans,
            meta: { phone_operator_code, circleid }
        });
    }
    catch (error) {
        console.error('Error in getPlans:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch recharge plans' });
    }
};
exports.getPlans = getPlans;
/**
 * Handle recharge triggered after Razorpay payment verification
 */
const handleUtilityRecharge = async (userId, metadata) => {
    const { mobile, amount, operatorCode, circleid, planDescription, razorpayOrderId, razorpayPaymentId, operatorName, utilityTransactionId } = metadata;
    if (!mobile || !amount || !operatorCode || !userId) {
        throw new Error('Missing required fields');
    }
    const existing = utilityTransactionId ? await UtilityTransaction_1.default.findById(utilityTransactionId) : null;
    if (existing && utilityFinalStatuses.includes(existing.status)) {
        return existing;
    }
    const clientRefId = existing?.clientRefId || metadata.client_ref_id || makeClientRefId('rch');
    const transaction = existing || await UtilityTransaction_1.default.create({
        userId,
        type: 'Mobile Recharge',
        amount: parseFloat(amount),
        operator: operatorName || operatorCode,
        mobileOrAccountNumber: mobile,
        clientRefId,
        razorpayOrderId,
        razorpayPaymentId,
        planDescription,
        status: 'fulfillment_pending',
        metadata: { circleid, operatorCode, operatorName },
        statusHistory: [{ status: 'fulfillment_pending', message: 'Recharge queued after payment', at: new Date() }]
    });
    await (0, exports.updateUtilityTransactionStatus)(transaction._id.toString(), 'eko_processing', 'Recharge request sent to operator', {
        razorpayOrderId,
        razorpayPaymentId,
        requestPayload: metadata
    }, metadata.appIo);
    try {
        const ekoResult = await (0, ekoService_1.payBBPSBill)({
            phone_operator_code: operatorCode,
            utility_acc_no: mobile,
            confirmation_mobile_no: mobile,
            sender_name: 'Customer',
            category: 5, // Mobile Prepaid
            amount: amount,
            utilitycustomername: 'Customer',
            client_ref_id: clientRefId,
            source_ip: metadata.source_ip || '127.0.0.1'
        });
        if (ekoResult.status === 0 || ekoResult.response_type_id === 333) {
            const updated = await (0, exports.updateUtilityTransactionStatus)(transaction._id.toString(), 'eko_success', undefined, {
                ekoTxId: ekoResult.data?.tid || ekoResult.tid || clientRefId,
                bbpsTxnRefId: ekoResult.data?.bbpstrxnrefid || ekoResult.bbpstrxnrefid,
                ekoPayResponse: ekoResult
            }, metadata.appIo);
            await (0, notificationController_1.createNotification)(userId, 'Recharge Successful', `Your recharge of ₹${amount} for ${mobile} was successful. (TxID: ${updated?.ekoTxId || clientRefId})`, 'success');
            return updated;
        }
        else {
            throw new Error(ekoResult.message || 'Recharge failed.');
        }
    }
    catch (error) {
        console.error('Recharge failed:', error.message);
        await (0, exports.updateUtilityTransactionStatus)(transaction._id.toString(), 'eko_failed', error.response?.data?.message || error.message, {
            ekoPayResponse: error.response?.data
        }, metadata.appIo);
        throw error;
    }
};
exports.handleUtilityRecharge = handleUtilityRecharge;
/**
 * handleBBPSPayment - Called by financeController after Razorpay payment is verified
 * for BBPS bill payments (Electricity, Water, Gas, Postpaid, DTH, Credit Card, etc.)
 */
const handleBBPSPayment = async (userId, metadata) => {
    const { operatorCode, operatorName, utility_acc_no, confirmation_mobile_no, category, utilitycustomername, client_ref_id, amount, razorpayOrderId, razorpayPaymentId, formValues, utilityTransactionId, billfetchresponse, ekoFetchResponse } = metadata;
    if (!operatorCode || !utility_acc_no || !amount) {
        throw new Error('Missing required BBPS payment fields in metadata');
    }
    const existing = utilityTransactionId ? await UtilityTransaction_1.default.findById(utilityTransactionId) : null;
    if (existing && utilityFinalStatuses.includes(existing.status)) {
        return existing;
    }
    const refId = existing?.clientRefId || client_ref_id || makeClientRefId('bbps');
    const transaction = existing || await UtilityTransaction_1.default.create({
        userId,
        type: 'Bill Payment',
        amount: parseFloat(amount),
        operator: operatorName || operatorCode,
        mobileOrAccountNumber: utility_acc_no,
        clientRefId: refId,
        razorpayOrderId,
        razorpayPaymentId,
        status: 'fulfillment_pending',
        metadata: { ...formValues, category, utilitycustomername },
        ekoFetchResponse,
        statusHistory: [{ status: 'fulfillment_pending', message: 'Bill payment queued after payment', at: new Date() }]
    });
    await (0, exports.updateUtilityTransactionStatus)(transaction._id.toString(), 'eko_processing', 'Bill payment request sent to biller', {
        razorpayOrderId,
        razorpayPaymentId,
        requestPayload: metadata,
        ekoFetchResponse
    }, metadata.appIo);
    try {
        const ekoResult = await (0, ekoService_1.payBBPSBill)({
            phone_operator_code: operatorCode.toString(),
            utility_acc_no,
            confirmation_mobile_no: confirmation_mobile_no || utility_acc_no,
            sender_name: 'Customer',
            category: getCategoryNumber(category || operatorName || ''),
            amount: parseFloat(amount),
            utilitycustomername: utilitycustomername || 'Customer',
            client_ref_id: refId,
            source_ip: metadata.source_ip || '127.0.0.1',
            ...(billfetchresponse ? { billfetchresponse } : {}),
            ...(formValues || {})
        });
        if (ekoResult.status === 0 || ekoResult.response_type_id === 333) {
            const updated = await (0, exports.updateUtilityTransactionStatus)(transaction._id.toString(), 'eko_success', undefined, {
                ekoTxId: ekoResult.data?.tid || ekoResult.tid || refId,
                bbpsTxnRefId: ekoResult.data?.bbpstrxnrefid || ekoResult.bbpstrxnrefid,
                ekoPayResponse: ekoResult
            }, metadata.appIo);
            await (0, notificationController_1.createNotification)(userId, 'Bill Payment Successful', `Your bill payment of ₹${amount} for ${operatorName || operatorCode} was successful. TxID: ${updated?.ekoTxId || refId}`, 'success');
            return updated;
        }
        else {
            throw new Error(ekoResult.message || 'Bill payment failed at biller end');
        }
    }
    catch (error) {
        console.error('handleBBPSPayment failed:', error.response?.data || error.message);
        await (0, exports.updateUtilityTransactionStatus)(transaction._id.toString(), 'eko_failed', error.response?.data?.message || error.message, {
            ekoPayResponse: error.response?.data
        }, metadata.appIo);
        throw error;
    }
};
exports.handleBBPSPayment = handleBBPSPayment;
const getUtilityTransactionStatus = async (req, res) => {
    try {
        const transaction = await UtilityTransaction_1.default.findById(req.params.id).lean();
        if (!transaction) {
            return res.status(404).json({ success: false, message: 'Utility transaction not found' });
        }
        res.json({
            success: true,
            data: {
                id: transaction._id,
                status: transaction.status,
                amount: transaction.amount,
                operator: transaction.operator,
                mobileOrAccountNumber: transaction.mobileOrAccountNumber,
                ekoTxId: transaction.ekoTxId,
                bbpsTxnRefId: transaction.bbpsTxnRefId,
                failureReason: transaction.failureReason,
                refundStatus: transaction.refundStatus,
                statusHistory: transaction.statusHistory || [],
                updatedAt: transaction.updatedAt
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to get transaction status' });
    }
};
exports.getUtilityTransactionStatus = getUtilityTransactionStatus;
