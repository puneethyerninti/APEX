"use client";
import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ConfirmationResult, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from '@/firebase.config';
import { useAuth } from '@/context/AuthContext';
import { isIndianMobile, isProfileName, phoneSignInError, resendSeconds } from '@/services/phoneSignIn';

export default function PhoneSignIn({ adminPortal = false }: { adminPortal?: boolean }) {
  const session = useAuth();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [deadline, setDeadline] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const verifier = useRef<RecaptchaVerifier | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const confirmation = useRef<ConfirmationResult | null>(null);
  const locked = useRef(false);
  const generation = useRef(0);
  const otpInput = useRef<HTMLInputElement>(null);
  const verified = useRef(false);
  const [otpVerified, setOtpVerified] = useState(false);

  const clearVerifier = () => { verifier.current?.clear(); verifier.current = null; };
  useEffect(() => () => { generation.current++; clearVerifier(); }, []);
  useEffect(() => {
    const tick = () => setRemaining(resendSeconds(deadline));
    tick(); const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [deadline]);
  useEffect(() => { if (step === 'otp') otpInput.current?.focus(); }, [step]);

  async function sendOtp() {
    if (locked.current || !isIndianMobile(phone) || resendSeconds(deadline) > 0) return;
    locked.current = true; setBusy(true); setError('');
    const request = ++generation.current;
    try {
      clearVerifier();
      verifier.current = new RecaptchaVerifier(auth, container.current!, { size: 'invisible' });
      const result = await signInWithPhoneNumber(auth, '+91' + phone, verifier.current);
      if (request !== generation.current) return;
      confirmation.current = result; verified.current = false; setOtpVerified(false);
      setStep('otp'); setOtp(''); setDeadline(Date.now() + 60000);
    } catch (failure: any) {
      if (request === generation.current) { setError(phoneSignInError(failure)); clearVerifier(); }
    } finally { if (request === generation.current) { locked.current = false; setBusy(false); } }
  }

  async function verifyOtp() {
    if (locked.current || verified.current || !/^\d{6}$/.test(otp) || !confirmation.current) return;
    locked.current = true; setBusy(true); setError('');
    const request = generation.current;
    try {
      await confirmation.current.confirm(otp);
      if (request === generation.current) { verified.current = true; setOtpVerified(true); setOtp(''); }
    } catch (failure: any) { if (request === generation.current) setError(phoneSignInError(failure)); }
    finally { if (request === generation.current) { locked.current = false; setBusy(false); } }
  }

  async function changeNumber() {
    if (locked.current || session.isLoading) return;
    locked.current = true; setBusy(true);
    generation.current++; confirmation.current = null; verified.current = false; setOtpVerified(false);
    clearVerifier(); setOtp(''); setName(''); setError('');
    try { await session.logout(); setStep('phone'); }
    finally { locked.current = false; setBusy(false); }
  }

  const registration = session.registrationRequired && !adminPortal;
  const field = 'w-full bg-[#F4F6FB] border border-gray-200 rounded-xl py-3.5 px-4 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#6C3FC5]/30';
  const button = 'w-full bg-[#6C3FC5] text-white font-bold py-3.5 rounded-xl hover:bg-[#5a34a8] disabled:opacity-50 transition-colors';
  return <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 relative">
    <div ref={container} />
    <div className="absolute top-0 w-full h-64 hero-gradient rounded-b-[40px] shadow-sm pointer-events-none" />
    <div className="w-full max-w-sm z-10 bg-white rounded-3xl shadow-xl p-6 sm:p-8">
      <div className="text-center mb-7">
        <img src="/icon.jpeg" alt="APEX" className="w-16 h-16 rounded-2xl mx-auto mb-4 object-cover" />
        <h1 className="text-2xl font-black text-gray-900">{adminPortal ? 'APEX Admin Portal' : registration ? 'Welcome to APEX' : 'Login to APEX'}</h1>
        <p className="text-xs text-gray-500 mt-2">Your Life. Simplified.</p>
      </div>
      {registration ? <form className="space-y-5" onSubmit={e => { e.preventDefault(); if (isProfileName(name)) void session.completeRegistration(name.trim()); }}>
        <p className="text-xs text-gray-500">Mobile verified: {session.registrationPhone}</p>
        <div><label htmlFor="register-name" className="block text-xs font-bold text-gray-700 mb-2">Full Name</label>
          <input id="register-name" className={field} autoComplete="name" value={name} maxLength={100} onChange={e => setName(e.target.value)} placeholder="Enter your full name" required disabled={session.isLoading} /></div>
        <button className={button} disabled={!isProfileName(name) || session.isLoading}>{session.isLoading ? 'Creating account...' : 'Create Account'}</button>
        <button type="button" onClick={() => void changeNumber()} disabled={session.isLoading} className="text-xs font-semibold text-[#6C3FC5]">Use another number</button>
      </form> : step === 'phone' ? <form className="space-y-5" onSubmit={e => { e.preventDefault(); void sendOtp(); }}>
        <div><label htmlFor="login-phone" className="block text-xs font-bold text-gray-700 mb-2">Mobile Number</label>
          <div className="relative"><span className="absolute left-4 top-3.5 text-sm text-gray-500">+91</span>
            <input id="login-phone" type="tel" inputMode="numeric" autoComplete="tel-national" className={field + ' pl-14'} value={phone} maxLength={10} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} placeholder="Enter 10-digit number" required disabled={busy} /></div></div>
        <button className={button} disabled={!isIndianMobile(phone) || busy || remaining > 0}>{busy ? 'Sending OTP...' : remaining ? `Get OTP in ${remaining}s` : 'Get OTP'}</button>
        <p className="text-[11px] text-gray-500 text-center">Continue with your mobile number to sign in or register.</p>
        <p className="text-[11px] text-gray-500">By choosing Get OTP, you consent to a verification SMS and Google processing this number for fraud prevention.</p>
      </form> : <form className="space-y-5" onSubmit={e => { e.preventDefault(); void verifyOtp(); }}>
        <p className="text-xs text-center text-gray-500">OTP sent to +91 {phone}</p>
        <label htmlFor="login-otp" className="block text-xs font-bold text-gray-700">Enter OTP</label>
        <input ref={otpInput} id="login-otp" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" aria-label="Six-digit OTP" className={field + ' text-center text-xl'} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} disabled={busy || otpVerified || session.isLoading} required />
        {otpVerified ? <button type="button" className={button} disabled={session.isLoading} onClick={session.retrySession}>{session.isLoading ? 'Signing in...' : 'Continue'}</button> : <button className={button} disabled={otp.length !== 6 || busy || session.isLoading}>{busy ? 'Checking OTP...' : 'Verify & Continue'}</button>}
        <div className="flex justify-between gap-3 text-xs font-semibold">
          <button type="button" onClick={() => void changeNumber()} disabled={busy || session.isLoading} className="text-gray-500">Change Number</button>
          {!otpVerified && <button type="button" onClick={() => void sendOtp()} disabled={remaining > 0 || busy} className="text-[#6C3FC5] disabled:text-gray-400">{remaining ? `Resend in ${remaining}s` : 'Resend OTP'}</button>}
        </div>
      </form>}
      {(error || session.error) && <p role="alert" className="text-red-600 text-xs mt-4">{error || session.error}</p>}
    </div>
    <Link href={adminPortal ? '/login' : '/admin-login'} className="mt-6 z-10 text-xs font-semibold text-gray-600">{adminPortal ? 'User Login' : 'Admin Portal'}</Link>
  </div>;
}
