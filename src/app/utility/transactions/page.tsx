"use client";

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/services/api';
import { useSocket } from '@/context/SocketContext';

type UtilityStatus =
  | 'created'
  | 'details_validated'
  | 'bill_fetched'
  | 'payment_pending'
  | 'payment_success'
  | 'fulfillment_pending'
  | 'eko_processing'
  | 'eko_success'
  | 'eko_failed'
  | 'refund_pending'
  | 'refunded'
  | 'manual_review'
  | 'Pending'
  | 'Success'
  | 'Failed';

interface UtilityTransactionView {
  id: string;
  status: UtilityStatus;
  amount: number;
  operator: string;
  mobileOrAccountNumber: string;
  ekoTxId?: string;
  bbpsTxnRefId?: string;
  failureReason?: string;
  refundStatus?: string;
  updatedAt?: string;
  statusHistory?: Array<{ status: UtilityStatus; message?: string; at: string }>;
}

const finalStatuses = new Set<UtilityStatus>(['eko_success', 'eko_failed', 'refunded', 'manual_review', 'Success', 'Failed']);

function UtilityTransactionStatusContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { socket } = useSocket();
  const transactionId = searchParams.get('id') || '';
  const [transaction, setTransaction] = useState<UtilityTransactionView | null>(null);
  const [error, setError] = useState('');

  const loadStatus = async () => {
    if (!transactionId) {
      setError('Missing utility transaction id.');
      return;
    }
    try {
      const res = await api.get(`/utility/transactions/${transactionId}/status`);
      if (res.data.success) {
        setTransaction(res.data.data);
        setError('');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to load utility transaction status.');
    }
  };

  useEffect(() => {
    loadStatus();
  }, [transactionId]);

  useEffect(() => {
    if (!transactionId || (transaction?.status && finalStatuses.has(transaction.status))) return;
    const interval = window.setInterval(loadStatus, 4000);
    return () => window.clearInterval(interval);
  }, [transactionId, transaction?.status]);

  useEffect(() => {
    if (!socket || !transactionId) return;
    const handler = (event: any) => {
      if (event.transactionId === transactionId) {
        loadStatus();
      }
    };
    socket.on('utility_status_updated', handler);
    return () => {
      socket.off('utility_status_updated', handler);
    };
  }, [socket, transactionId]);

  const view = useMemo(() => {
    const status = transaction?.status;
    if (status === 'eko_success' || status === 'Success') {
      return {
        icon: 'fa-solid fa-check',
        iconClass: 'bg-green-100 text-green-600',
        title: 'Service Successful',
        message: 'Your recharge or bill payment has been completed successfully.',
        button: 'Done'
      };
    }
    if (status === 'eko_failed' || status === 'Failed') {
      return {
        icon: 'fa-solid fa-triangle-exclamation',
        iconClass: 'bg-red-100 text-red-600',
        title: 'Service Failed',
        message: transaction?.failureReason || 'The operator could not complete this utility service.',
        button: 'Back to Utilities'
      };
    }
    if (status === 'refunded') {
      return {
        icon: 'fa-solid fa-rotate-left',
        iconClass: 'bg-blue-100 text-blue-600',
        title: 'Payment Refunded',
        message: 'The service could not be delivered, so the payment was refunded.',
        button: 'Done'
      };
    }
    if (status === 'manual_review') {
      return {
        icon: 'fa-solid fa-headset',
        iconClass: 'bg-amber-100 text-amber-600',
        title: 'Under Review',
        message: transaction?.failureReason || 'This transaction needs manual verification by support.',
        button: 'Back to Utilities'
      };
    }
    return {
      icon: 'fa-solid fa-spinner fa-spin',
      iconClass: 'bg-indigo-100 text-[#2D1B69]',
      title: 'Processing Service',
      message: 'Payment received. Waiting for operator confirmation.',
      button: ''
    };
  }, [transaction]);

  return (
    <div className="min-h-screen bg-[#F4F6FB]">
      <div className="bg-[#2D1B69] text-white p-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <button onClick={() => router.back()} className="text-white hover:text-gray-200 transition-colors p-2 -ml-2">
          <i className="fa-solid fa-arrow-left text-lg"></i>
        </button>
        <h1 className="text-[17px] font-bold">Utility Status</h1>
        <Link href="/" className="text-white hover:text-gray-200 transition-colors p-2 -mr-2">
          <i className="fa-solid fa-house text-[17px]"></i>
        </Link>
      </div>

      <div className="p-4">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${view.iconClass}`}>
            <i className={`${view.icon} text-2xl`}></i>
          </div>
          <h2 className="text-xl font-black text-gray-900 mb-2">{view.title}</h2>
          <p className="text-sm text-gray-500 mb-6">{error || view.message}</p>

          {transaction && (
            <div className="bg-gray-50 rounded-xl p-4 text-left space-y-3 mb-6">
              <div className="flex justify-between gap-4">
                <span className="text-xs text-gray-500 font-semibold">Status</span>
                <span className="text-xs font-bold text-gray-800 text-right">{transaction.status.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-xs text-gray-500 font-semibold">Amount</span>
                <span className="text-sm font-black text-[#2D1B69]">₹{transaction.amount}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-xs text-gray-500 font-semibold">Operator</span>
                <span className="text-xs font-bold text-gray-800 text-right">{transaction.operator}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-xs text-gray-500 font-semibold">Account</span>
                <span className="text-xs font-bold text-gray-800 text-right">{transaction.mobileOrAccountNumber}</span>
              </div>
              {transaction.ekoTxId && (
                <div className="flex justify-between gap-4">
                  <span className="text-xs text-gray-500 font-semibold">Eko TxID</span>
                  <span className="text-xs font-bold text-gray-800 text-right">{transaction.ekoTxId}</span>
                </div>
              )}
            </div>
          )}

          {view.button && (
            <Link href="/utility" className="block w-full py-3 bg-[#2D1B69] text-white font-bold rounded-xl">
              {view.button}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default function UtilityTransactionStatusPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F4F6FB]">
        <div className="bg-[#2D1B69] text-white p-4 py-3 flex items-center justify-center sticky top-0 z-50 shadow-md">
          <h1 className="text-[17px] font-bold">Utility Status</h1>
        </div>
        <div className="p-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-indigo-100 text-[#2D1B69]">
              <i className="fa-solid fa-spinner fa-spin text-2xl"></i>
            </div>
            <h2 className="text-xl font-black text-gray-900 mb-2">Processing Service</h2>
            <p className="text-sm text-gray-500 mb-6">Loading transaction status...</p>
          </div>
        </div>
      </div>
    }>
      <UtilityTransactionStatusContent />
    </Suspense>
  );
}
