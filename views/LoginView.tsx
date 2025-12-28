// src/views/LoginView.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { User, AppView } from '../types';
import { Eye, EyeOff, Mail, Lock, User as UserIcon, Globe, ChevronDown, Check, AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

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
  { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬' },
  { code: 'AE', name: 'UAE', flag: '🇦🇪' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰' },
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { code: 'GR', name: 'Greece', flag: '🇬🇷' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷' },
  { code: 'RU', name: 'Russia', flag: '🇷🇺' },
  { code: 'UA', name: 'Ukraine', flag: '🇺🇦' },
  { code: 'PS', name: 'Palestine', flag: '🇵🇸' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
  { code: 'MA', name: 'Morocco', flag: '🇲🇦' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱' },
  { code: 'PE', name: 'Peru', flag: '🇵🇪' },
].sort((a, b) => a.name.localeCompare(b.name));

export const LoginView: React.FC = () => {
  const { setUser, setIsAuthenticated, setView } = useApp();
  
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  
  // Verification code - 6 separate inputs
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  // Reset code
  const [resetCode, setResetCode] = useState(['', '', '', '', '', '']);
  const resetCodeRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCountryDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-focus first code input when entering verify mode
  useEffect(() => {
    if (mode === 'verify') {
      setTimeout(() => codeInputRefs.current[0]?.focus(), 100);
    }
    if (mode === 'reset') {
      setTimeout(() => resetCodeRefs.current[0]?.focus(), 100);
    }
  }, [mode]);

  const filteredCountries = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.code.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const selectedCountry = COUNTRIES.find(c => c.name === country);

  // Handle verification code input
  const handleCodeChange = (index: number, value: string, isReset: boolean = false) => {
    const codes = isReset ? [...resetCode] : [...verificationCode];
    const refs = isReset ? resetCodeRefs : codeInputRefs;
    
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1);
    codes[index] = digit;
    
    if (isReset) {
      setResetCode(codes);
    } else {
      setVerificationCode(codes);
    }
    
    // Auto-focus next input
    if (digit && index < 5) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent, isReset: boolean = false) => {
    const codes = isReset ? resetCode : verificationCode;
    const refs = isReset ? resetCodeRefs : codeInputRefs;
    
    if (e.key === 'Backspace' && !codes[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent, isReset: boolean = false) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newCodes = pastedData.split('');
    
    if (isReset) {
      setResetCode([...newCodes, ...Array(6 - newCodes.length).fill('')]);
      if (newCodes.length === 6) {
        resetCodeRefs.current[5]?.focus();
      }
    } else {
      setVerificationCode([...newCodes, ...Array(6 - newCodes.length).fill('')]);
      if (newCodes.length === 6) {
        codeInputRefs.current[5]?.focus();
      }
    }
  };

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);

    try {
      // Validation for registration
      if (mode === 'register') {
        if (!name.trim()) {
          setError('Please enter your name');
          setLoading(false);
          return;
        }
        if (!country) {
          setError('Please select your country');
          setLoading(false);
          return;
        }
        if (!privacyAccepted) {
          setError('Please accept the Privacy Policy');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          setLoading(false);
          return;
        }
      }

      // Call API
      const result = await api.auth({
        email,
        password,
        name: mode === 'register' ? name : undefined,
        country: mode === 'register' ? country : undefined,
        isRegister: mode === 'register'
      });

      console.log('🔐 Auth result:', result);

      // REGISTRATION - Always require verification
      if (mode === 'register') {
        setSuccess('Verification code sent to your email! Check your inbox (and spam folder).');
        setMode('verify');
        setLoading(false);
        return;
      }

      // LOGIN - Check if user needs verification
      if (result.requiresVerification || result.user?.isEmailVerified === false) {
        setError('Please verify your email first.');
        setMode('verify');
        // Request a new verification code
        try {
          await api.resendVerification(email);
          setSuccess('A new verification code has been sent to your email.');
          setError('');
        } catch (resendErr) {
          console.error('Failed to resend verification:', resendErr);
        }
        setLoading(false);
        return;
      }

      // User is verified - proceed to app
      setUser(result.user as User);
      setIsAuthenticated(true);
      setView(result.user?.goal ? AppView.DASHBOARD : AppView.ONBOARDING);

    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    clearMessages();
    const code = verificationCode.join('');
    
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setLoading(true);

    try {
      const verifyResult = await api.verifyEmail(email, code);
      console.log('✅ Verify result:', verifyResult);
      
      setSuccess('Email verified successfully! Logging you in...');
      
      // Small delay for UX
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Now log in the user
      const result = await api.auth({ email, password, isRegister: false });
      console.log('🔐 Login after verify:', result);
      
      setUser(result.user as User);
      setIsAuthenticated(true);
      setView(result.user?.goal ? AppView.DASHBOARD : AppView.ONBOARDING);

    } catch (err: any) {
      console.error('Verification error:', err);
      if (err.message?.includes('expired')) {
        setError('Code expired. Please request a new one.');
      } else if (err.message?.includes('Invalid')) {
        setError('Invalid code. Please check and try again.');
      } else {
        setError(err.message || 'Verification failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    clearMessages();
    setLoading(true);

    try {
      await api.resendVerification(email);
      setSuccess('New verification code sent! Check your email.');
      setVerificationCode(['', '', '', '', '', '']);
      setTimeout(() => codeInputRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      console.error('Resend error:', err);
      setError(err.message || 'Failed to resend code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    clearMessages();
    
    if (!email) {
      setError('Please enter your email address first');
      return;
    }

    setLoading(true);

    try {
      await api.forgotPassword(email);
      setSuccess('If this email exists, a reset code has been sent. Check your inbox.');
      setMode('reset');
    } catch (err: any) {
      console.error('Forgot password error:', err);
      setError(err.message || 'Failed to send reset code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    clearMessages();
    const code = resetCode.join('');
    
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }
    
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await api.resetPassword(email, code, newPassword);
      setSuccess('Password reset successfully! You can now log in with your new password.');
      setMode('login');
      setPassword('');
      setNewPassword('');
      setResetCode(['', '', '', '', '', '']);
    } catch (err: any) {
      console.error('Reset password error:', err);
      if (err.message?.includes('expired')) {
        setError('Code expired. Please request a new one.');
      } else if (err.message?.includes('Invalid')) {
        setError('Invalid code. Please check and try again.');
      } else {
        setError(err.message || 'Failed to reset password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    clearMessages();
    setMode(newMode);
    if (newMode === 'login' || newMode === 'register') {
      setVerificationCode(['', '', '', '', '', '']);
      setResetCode(['', '', '', '', '', '']);
    }
  };

  // Render 6-digit code input
  const renderCodeInputs = (codes: string[], refs: React.MutableRefObject<(HTMLInputElement | null)[]>, isReset: boolean = false) => (
    <div className="flex justify-center gap-2 sm:gap-3">
      {codes.map((digit, index) => (
        <input
          key={index}
          ref={el => refs.current[index] = el}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleCodeChange(index, e.target.value, isReset)}
          onKeyDown={(e) => handleCodeKeyDown(index, e, isReset)}
          onPaste={(e) => handleCodePaste(e, isReset)}
          className="w-11 h-14 sm:w-12 sm:h-16 text-center text-2xl font-bold bg-white border-2 border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
        />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary to-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black text-white tracking-tight">INJAZI</h1>
          <p className="text-white/60 text-sm mt-2 tracking-widest uppercase">Success Architecture AI</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="p-6 pb-0">
            {(mode === 'verify' || mode === 'reset' || mode === 'forgot') && (
              <button
                onClick={() => switchMode('login')}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">Back to Login</span>
              </button>
            )}
            
            {mode === 'login' || mode === 'register' ? (
              <div className="flex bg-gray-100 rounded-2xl p-1 mb-6">
                <button
                  onClick={() => switchMode('login')}
                  className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                    mode === 'login'
                      ? 'bg-white text-primary shadow-md'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Log In
                </button>
                <button
                  onClick={() => switchMode('register')}
                  className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                    mode === 'register'
                      ? 'bg-white text-primary shadow-md'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Sign Up
                </button>
              </div>
            ) : (
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {mode === 'verify' && 'Verify Your Email'}
                {mode === 'forgot' && 'Forgot Password'}
                {mode === 'reset' && 'Reset Password'}
              </h2>
            )}
          </div>

          {/* Form */}
          <div className="p-6 pt-2">
            {/* Messages */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm">{error}</span>
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl flex items-start gap-2 text-green-700">
                <Check className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm">{success}</span>
              </div>
            )}

            {/* Login / Register Form */}
            {(mode === 'login' || mode === 'register') && (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name (Register only) */}
                {mode === 'register' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
                    <div className="relative">
                      <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                        className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value.toLowerCase().trim())}
                      placeholder="your@email.com"
                      className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Country (Register only) */}
                {mode === 'register' && (
                  <div ref={dropdownRef}>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Country</label>
                    <div className="relative">
                      <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
                      <button
                        type="button"
                        onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                        className="w-full pl-12 pr-10 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-left focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      >
                        {selectedCountry ? (
                          <span className="flex items-center gap-2">
                            <span>{selectedCountry.flag}</span>
                            <span>{selectedCountry.name}</span>
                          </span>
                        ) : (
                          <span className="text-gray-400">Select your country</span>
                        )}
                      </button>
                      <ChevronDown className={`absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 transition-transform ${showCountryDropdown ? 'rotate-180' : ''}`} />
                      
                      {showCountryDropdown && (
                        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-64 overflow-hidden">
                          <div className="p-2 border-b border-gray-100">
                            <input
                              type="text"
                              value={countrySearch}
                              onChange={(e) => setCountrySearch(e.target.value)}
                              placeholder="Search countries..."
                              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary"
                              autoFocus
                            />
                          </div>
                          <div className="max-h-48 overflow-y-auto">
                            {filteredCountries.map((c) => (
                              <button
                                key={c.code + c.name}
                                type="button"
                                onClick={() => {
                                  setCountry(c.name);
                                  setShowCountryDropdown(false);
                                  setCountrySearch('');
                                }}
                                className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors"
                              >
                                <span className="text-xl">{c.flag}</span>
                                <span className="text-gray-700">{c.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-12 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {mode === 'register' && (
                    <p className="text-xs text-gray-400 mt-1">Minimum 6 characters</p>
                  )}
                </div>

                {/* Forgot Password Link */}
                {mode === 'login' && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={loading}
                      className="text-sm text-primary hover:text-secondary transition-colors disabled:opacity-50"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                {/* Privacy Policy (Register only) */}
                {mode === 'register' && (
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative mt-0.5">
                      <input
                        type="checkbox"
                        checked={privacyAccepted}
                        onChange={(e) => setPrivacyAccepted(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${
                        privacyAccepted 
                          ? 'bg-primary border-primary' 
                          : 'border-gray-300 group-hover:border-gray-400'
                      }`}>
                        {privacyAccepted && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                    </div>
                    <span className="text-sm text-gray-600">
                      I agree to the{' '}
                      <a href="#" className="text-primary hover:text-secondary transition-colors">
                        Privacy Policy
                      </a>{' '}
                      and{' '}
                      <a href="#" className="text-primary hover:text-secondary transition-colors">
                        Terms of Service
                      </a>
                    </span>
                  </label>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-primary hover:bg-secondary text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary/30"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Please wait...</span>
                    </>
                  ) : (
                    <span>{mode === 'login' ? 'Log In' : 'Create Account'}</span>
                  )}
                </button>
              </form>
            )}

            {/* Email Verification */}
            {mode === 'verify' && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-gray-600">
                    We sent a 6-digit code to<br />
                    <span className="font-semibold text-gray-900">{email}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    Check your spam folder if you don't see it
                  </p>
                </div>

                {renderCodeInputs(verificationCode, codeInputRefs, false)}

                <button
                  onClick={handleVerifyEmail}
                  disabled={loading || verificationCode.join('').length !== 6}
                  className="w-full py-4 bg-primary hover:bg-secondary text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary/30"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>Verify Email</span>
                  )}
                </button>

                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-2">Didn't receive the code?</p>
                  <button
                    onClick={handleResendCode}
                    disabled={loading}
                    className="text-primary hover:text-secondary font-medium transition-colors disabled:opacity-50"
                  >
                    Resend Code
                  </button>
                </div>
              </div>
            )}

            {/* Reset Password */}
            {mode === 'reset' && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Lock className="w-8 h-8 text-red-500" />
                  </div>
                  <p className="text-gray-600">
                    Enter the 6-digit code sent to<br />
                    <span className="font-semibold text-gray-900">{email}</span>
                  </p>
                </div>

                {renderCodeInputs(resetCode, resetCodeRefs, true)}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-12 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Minimum 6 characters</p>
                </div>

                <button
                  onClick={handleResetPassword}
                  disabled={loading || resetCode.join('').length !== 6 || newPassword.length < 6}
                  className="w-full py-4 bg-primary hover:bg-secondary text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary/30"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Resetting...</span>
                    </>
                  ) : (
                    <span>Reset Password</span>
                  )}
                </button>

                <div className="text-center">
                  <button
                    onClick={handleForgotPassword}
                    disabled={loading}
                    className="text-primary hover:text-secondary font-medium transition-colors disabled:opacity-50"
                  >
                    Resend Code
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-white/40 text-xs mt-8">
          © {new Date().getFullYear()} InJazi. All rights reserved.
        </p>
      </div>
    </div>
  );
};
