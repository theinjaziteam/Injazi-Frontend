import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../App';
import { Icons, Button } from '../UIComponents';
import { AppView } from '../types';
import emailjs from '@emailjs/browser';
import * as api from '../api';

// EmailJS Configuration
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
const EMAILJS_RESET_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_RESET_TEMPLATE_ID;

// Validate configuration
if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
  console.warn('EmailJS configuration missing. Email verification will not work.');
}

const API_URL = import.meta.env.VITE_API_URL || 'https://injazi-backend.onrender.com';

type AuthMode = 'login' | 'register' | 'verify' | 'forgot' | 'reset';

const COUNTRIES = [
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'RU', name: 'Russia', flag: '🇷🇺' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪' },
];

// Initialize EmailJS
emailjs.init(EMAILJS_PUBLIC_KEY);

const LoginView: React.FC = () => {
  const { setUser, setView, setIsAuthenticated } = useApp();
  
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [country, setCountry] = useState('US');
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [resetCode, setResetCode] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [pendingUserData, setPendingUserData] = useState<any>(null);
  const [showCountrySuggestions, setShowCountrySuggestions] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [showLegal, setShowLegal] = useState<'terms' | 'privacy' | null>(null);
  
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const resetCodeInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const countryInputRef = useRef<HTMLInputElement>(null);

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const sendVerificationEmail = async (toEmail: string, code: string, userName: string) => {
    try {
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          to_email: toEmail,
          to_name: userName,
          verification_code: code,
          from_name: 'INJAZI',
        },
        EMAILJS_PUBLIC_KEY
      );
      return true;
    } catch (error) {
      console.error('Failed to send verification email:', error);
      return false;
    }
  };

  const sendResetEmail = async (toEmail: string, code: string) => {
    try {
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_RESET_TEMPLATE_ID || EMAILJS_TEMPLATE_ID,
        {
          to_email: toEmail,
          to_name: 'User',
          verification_code: code,
          from_name: 'INJAZI',
        },
        EMAILJS_PUBLIC_KEY
      );
      return true;
    } catch (error) {
      console.error('Failed to send reset email:', error);
      return false;
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!privacyAccepted) {
      setError('Please accept the Terms of Service and Privacy Policy');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const result = await api.register(name, email, password, country);
      
      if (result.code) {
        // Send verification email
        const emailSent = await sendVerificationEmail(email, result.code, name);
        if (!emailSent) {
          setError('Failed to send verification email. Please try again.');
          setIsLoading(false);
          return;
        }
        
        setPendingUserData({ name, email, password, country });
        setCooldown(300); // 5 minutes
        setMode('verify');
        setSuccess('Verification code sent to your email');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const result = await api.login(email, password);
      
      if (result.requiresVerification) {
        setError('Please verify your email first');
        setPendingUserData({ email, password });
        setMode('verify');
        return;
      }
      
      localStorage.setItem('injazi_token', result.token);
      localStorage.setItem('injazi_user', JSON.stringify(result.user));
      setUser(result.user);
      setIsAuthenticated(true);
      
      // Check if user completed onboarding
      if (result.user.goal) {
        setView(AppView.DASHBOARD);
      } else {
        setView(AppView.ONBOARDING);
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    const code = verificationCode.join('');
    if (code.length !== 6) {
      setError('Please enter the complete verification code');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const result = await api.verify(email || pendingUserData?.email, code);
      
      localStorage.setItem('injazi_token', result.token);
      localStorage.setItem('injazi_user', JSON.stringify(result.user));
      setUser(result.user);
      setIsAuthenticated(true);
      setView(AppView.ONBOARDING);
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (cooldown > 0) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const result = await api.resendCode(email || pendingUserData?.email);
      
      if (result.code) {
        await sendVerificationEmail(
          email || pendingUserData?.email,
          result.code,
          pendingUserData?.name || 'User'
        );
        setVerificationCode(['', '', '', '', '', '']);
        setCooldown(300);
        setSuccess('New verification code sent');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to resend code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const result = await api.forgotPassword(email);
      
      if (result.code) {
        await sendResetEmail(email, result.code);
        setMode('reset');
        setSuccess('Reset code sent to your email');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send reset code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = resetCode.join('');
    if (code.length !== 6) {
      setError('Please enter the complete reset code');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      await api.resetPassword(email, code, newPassword);
      setSuccess('Password reset successful! Please login.');
      setMode('login');
      setPassword('');
      setNewPassword('');
      setResetCode(['', '', '', '', '', '']);
    } catch (err: any) {
      setError(err.message || 'Password reset failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeInput = (index: number, value: string, isReset = false) => {
    const codes = isReset ? [...resetCode] : [...verificationCode];
    const refs = isReset ? resetCodeInputRefs : codeInputRefs;
    
    // Handle paste
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      digits.forEach((digit, i) => {
        if (i < 6) codes[i] = digit;
      });
      if (isReset) {
        setResetCode(codes);
      } else {
        setVerificationCode(codes);
      }
      refs.current[Math.min(digits.length, 5)]?.focus();
      return;
    }
    
    // Handle single digit
    codes[index] = value.replace(/\D/g, '');
    if (isReset) {
      setResetCode(codes);
    } else {
      setVerificationCode(codes);
    }
    
    // Auto-focus next input
    if (value && index < 5) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent, isReset = false) => {
    const codes = isReset ? resetCode : verificationCode;
    const refs = isReset ? resetCodeInputRefs : codeInputRefs;
    
    if (e.key === 'Backspace' && !codes[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const filteredCountries = COUNTRIES.filter(c => 
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.code.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const selectedCountry = COUNTRIES.find(c => c.code === country);

  const formatCooldown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#171738] flex flex-col">
      {/* Header */}
      <div className="px-6 pt-12 pb-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#3423A6] to-[#5B4BC4] flex items-center justify-center">
          <Icons.Target className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white">INJAZI</h1>
        <p className="text-white/60 text-sm mt-1">AI-Powered Goal Achievement</p>
      </div>

      {/* Form Container */}
      <div className="flex-1 px-6 pb-8">
        {/* Error/Success Messages */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-500/30">
            <p className="text-red-400 text-sm text-center">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 rounded-xl bg-green-500/20 border border-green-500/30">
            <p className="text-green-400 text-sm text-center">{success}</p>
          </div>
        )}

        {/* Login Form */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-white/60 text-xs mb-2 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/30 focus:outline-none focus:border-[#3423A6] focus:ring-1 focus:ring-[#3423A6] transition-all"
                placeholder="Enter your email"
                required
              />
            </div>
            <div>
              <label className="text-white/60 text-xs mb-2 block">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/30 focus:outline-none focus:border-[#3423A6] focus:ring-1 focus:ring-[#3423A6] transition-all"
                placeholder="Enter your password"
                required
              />
            </div>
            <button
              type="button"
              onClick={() => setMode('forgot')}
              className="text-[#3423A6] text-sm hover:underline"
            >
              Forgot password?
            </button>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#3423A6] text-white py-4 rounded-xl font-semibold hover:bg-[#3423A6]/90 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
            <p className="text-center text-white/60 text-sm">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('register')}
                className="text-[#3423A6] font-medium hover:underline"
              >
                Sign Up
              </button>
            </p>
          </form>
        )}

        {/* Register Form */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="text-white/60 text-xs mb-2 block">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/30 focus:outline-none focus:border-[#3423A6] focus:ring-1 focus:ring-[#3423A6] transition-all"
                placeholder="Enter your name"
                required
              />
            </div>
            <div>
              <label className="text-white/60 text-xs mb-2 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/30 focus:outline-none focus:border-[#3423A6] focus:ring-1 focus:ring-[#3423A6] transition-all"
                placeholder="Enter your email"
                required
              />
            </div>
            <div>
              <label className="text-white/60 text-xs mb-2 block">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/30 focus:outline-none focus:border-[#3423A6] focus:ring-1 focus:ring-[#3423A6] transition-all"
                placeholder="Create a password"
                required
                minLength={8}
              />
            </div>
            {/* FIX #2: Country dropdown with proper z-index */}
            <div className="relative">
              <label className="text-white/60 text-xs mb-2 block">Country</label>
              <button
                type="button"
                onClick={() => setShowCountrySuggestions(!showCountrySuggestions)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white text-left flex items-center justify-between focus:outline-none focus:border-[#3423A6]"
              >
                <span className="flex items-center gap-2">
                  <span className="text-xl">{selectedCountry?.flag}</span>
                  <span>{selectedCountry?.name}</span>
                </span>
                <Icons.ChevronDown className={`w-5 h-5 text-white/40 transition-transform ${showCountrySuggestions ? 'rotate-180' : ''}`} />
              </button>
              {showCountrySuggestions && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#1E1E42] border border-white/10 rounded-xl overflow-hidden z-50 shadow-xl max-h-60 overflow-y-auto">
                  <div className="sticky top-0 bg-[#1E1E42] p-2 border-b border-white/10">
                    <input
                      ref={countryInputRef}
                      type="text"
                      value={countrySearch}
                      onChange={(e) => setCountrySearch(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:border-[#3423A6]"
                      placeholder="Search countries..."
                      autoFocus
                    />
                  </div>
                  {filteredCountries.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => {
                        setCountry(c.code);
                        setShowCountrySuggestions(false);
                        setCountrySearch('');
                      }}
                      className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors ${
                        country === c.code ? 'bg-[#3423A6]/20' : ''
                      }`}
                    >
                      <span className="text-xl">{c.flag}</span>
                      <span className="text-white text-sm">{c.name}</span>
                      {country === c.code && (
                        <Icons.Check className="w-4 h-4 text-[#3423A6] ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Privacy Checkbox */}
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => setPrivacyAccepted(!privacyAccepted)}
                className={`w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors ${
                  privacyAccepted ? 'bg-[#3423A6] border-[#3423A6]' : 'border-white/20'
                }`}
                aria-label="Accept terms and privacy policy"
              >
                {privacyAccepted && <Icons.Check className="w-3 h-3 text-white" />}
              </button>
              <p className="text-white/60 text-sm">
                I agree to the{' '}
                <button type="button" onClick={() => setShowLegal('terms')} className="text-[#3423A6] hover:underline">
                  Terms of Service
                </button>{' '}
                and{' '}
                <button type="button" onClick={() => setShowLegal('privacy')} className="text-[#3423A6] hover:underline">
                  Privacy Policy
                </button>
              </p>
            </div>
            <Button
              type="submit"
              disabled={isLoading || !privacyAccepted}
              className="w-full bg-[#3423A6] text-white py-4 rounded-xl font-semibold hover:bg-[#3423A6]/90 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Creating account...' : 'Create Account'}
            </Button>
            <p className="text-center text-white/60 text-sm">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-[#3423A6] font-medium hover:underline"
              >
                Sign In
              </button>
            </p>
          </form>
        )}

        {/* Verification Form */}
        {mode === 'verify' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-white mb-2">Verify Your Email</h2>
              <p className="text-white/60 text-sm">
                We sent a 6-digit code to<br />
                <span className="text-white font-medium">{email || pendingUserData?.email}</span>
              </p>
            </div>
            {/* FIX: Code input styling consistency */}
            <div className="flex justify-center gap-2">
              {verificationCode.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (codeInputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={digit}
                  onChange={(e) => handleCodeInput(index, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(index, e)}
                  className="w-12 h-14 bg-white/5 border border-white/10 rounded-xl text-center text-xl font-bold text-white focus:outline-none focus:border-[#3423A6] focus:ring-1 focus:ring-[#3423A6] transition-all"
                />
              ))}
            </div>
            <Button
              onClick={handleVerifyEmail}
              disabled={isLoading || verificationCode.join('').length !== 6}
              className="w-full bg-[#3423A6] text-white py-4 rounded-xl font-semibold hover:bg-[#3423A6]/90 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Verifying...' : 'Verify Email'}
            </Button>
            <div className="text-center">
              {cooldown > 0 ? (
                <p className="text-white/40 text-sm">
                  Resend code in {formatCooldown(cooldown)}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={isLoading}
                  className="text-[#3423A6] text-sm hover:underline disabled:opacity-50"
                >
                  Resend verification code
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setMode('login')}
              className="w-full text-white/60 text-sm hover:text-white"
            >
              ← Back to login
            </button>
          </div>
        )}

        {/* Forgot Password Form */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-white mb-2">Reset Password</h2>
              <p className="text-white/60 text-sm">Enter your email to receive a reset code</p>
            </div>
            <div>
              <label className="text-white/60 text-xs mb-2 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/30 focus:outline-none focus:border-[#3423A6] focus:ring-1 focus:ring-[#3423A6] transition-all"
                placeholder="Enter your email"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#3423A6] text-white py-4 rounded-xl font-semibold hover:bg-[#3423A6]/90 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Sending...' : 'Send Reset Code'}
            </Button>
            <button
              type="button"
              onClick={() => setMode('login')}
              className="w-full text-white/60 text-sm hover:text-white"
            >
              ← Back to login
            </button>
          </form>
        )}

        {/* Reset Password Form */}
        {mode === 'reset' && (
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-white mb-2">Enter Reset Code</h2>
              <p className="text-white/60 text-sm">
                We sent a 6-digit code to<br />
                <span className="text-white font-medium">{email}</span>
              </p>
            </div>
            <div className="flex justify-center gap-2">
              {resetCode.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (resetCodeInputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={digit}
                  onChange={(e) => handleCodeInput(index, e.target.value, true)}
                  onKeyDown={(e) => handleCodeKeyDown(index, e, true)}
                  className="w-12 h-14 bg-white/5 border border-white/10 rounded-xl text-center text-xl font-bold text-white focus:outline-none focus:border-[#3423A6] focus:ring-1 focus:ring-[#3423A6] transition-all"
                />
              ))}
            </div>
            <div>
              <label className="text-white/60 text-xs mb-2 block">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/30 focus:outline-none focus:border-[#3423A6] focus:ring-1 focus:ring-[#3423A6] transition-all"
                placeholder="Enter new password"
                required
                minLength={8}
              />
            </div>
            <Button
              type="submit"
              disabled={isLoading || resetCode.join('').length !== 6}
              className="w-full bg-[#3423A6] text-white py-4 rounded-xl font-semibold hover:bg-[#3423A6]/90 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </Button>
            <button
              type="button"
              onClick={() => setMode('login')}
              className="w-full text-white/60 text-sm hover:text-white"
            >
              ← Back to login
            </button>
          </form>
        )}
      </div>

      {/* Legal Modal - FIX: Added aria-label */}
      {showLegal && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-end"
          role="dialog"
          aria-modal="true"
          aria-label={showLegal === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
        >
          <div className="w-full bg-[#171738] rounded-t-3xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="sticky top-0 bg-[#171738] px-5 py-4 border-b border-white/10 flex items-center justify-between flex-shrink-0">
              <h2 className="text-lg font-semibold text-white">
                {showLegal === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
              </h2>
              <button 
                onClick={() => setShowLegal(null)}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"
                aria-label="Close"
              >
                <Icons.X className="w-4 h-4 text-white" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-5">
              {showLegal === 'terms' ? (
                <div className="text-white/70 text-sm space-y-4">
                  <h3 className="text-white font-semibold">1. Terms of Use</h3>
                  <p>By accessing and using INJAZI, you accept and agree to be bound by the terms and provision of this agreement.</p>
                  <h3 className="text-white font-semibold">2. User Account</h3>
                  <p>You are responsible for maintaining the confidentiality of your account and password and for restricting access to your device.</p>
                  <h3 className="text-white font-semibold">3. Acceptable Use</h3>
                  <p>You agree not to use the service for any unlawful purpose or any purpose prohibited under this clause.</p>
                  <h3 className="text-white font-semibold">4. Intellectual Property</h3>
                  <p>The service and its original content, features, and functionality are owned by INJAZI and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.</p>
                  <h3 className="text-white font-semibold">5. Termination</h3>
                  <p>We may terminate or suspend your account and bar access to the service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever.</p>
                </div>
              ) : (
                <div className="text-white/70 text-sm space-y-4">
                  <h3 className="text-white font-semibold">1. Information Collection</h3>
                  <p>We collect information you provide directly to us, such as when you create an account, make a purchase, or contact us for support.</p>
                  <h3 className="text-white font-semibold">2. Use of Information</h3>
                  <p>We use the information we collect to provide, maintain, and improve our services, to process transactions, and to communicate with you.</p>
                  <h3 className="text-white font-semibold">3. Information Sharing</h3>
                  <p>We do not share your personal information with third parties except as described in this privacy policy or with your consent.</p>
                  <h3 className="text-white font-semibold">4. Data Security</h3>
                  <p>We take reasonable measures to help protect your personal information from loss, theft, misuse, unauthorized access, disclosure, alteration, and destruction.</p>
                  <h3 className="text-white font-semibold">5. Your Rights</h3>
                  <p>You have the right to access, correct, or delete your personal information. You can also object to or restrict certain processing of your information.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginView;
