// views/LoginView.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { AppView, COUNTRIES } from '../types';
import { Icons } from '../components/UIComponents';
import emailjs from '@emailjs/browser';

// EmailJS Configuration - Move these to environment variables in production
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
const EMAILJS_RESET_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_RESET_TEMPLATE_ID;

// Add validation
if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
    console.warn('⚠️ EmailJS not configured - check environment variables');
}


const API_URL = import.meta.env.VITE_API_URL || 'https://injazi-backend.onrender.com';

type AuthMode = 'login' | 'register' | 'verify' | 'forgot' | 'reset';

// Initialize EmailJS
emailjs.init(EMAILJS_PUBLIC_KEY);

export default function LoginView() {
    const { setIsAuthenticated, setView, setUser } = useApp();
    const [mode, setMode] = useState<AuthMode>('login');
    
    // Form State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [name, setName] = useState('');
    const [country, setCountry] = useState('');
    const [privacyAccepted, setPrivacyAccepted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showLegal, setShowLegal] = useState<'terms' | 'privacy' | null>(null);

    // Cooldown timer (in seconds)
    const [cooldown, setCooldown] = useState(0);

    // Verification Code
    const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
    const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);
    
    // Reset Code
    const [resetCode, setResetCode] = useState(['', '', '', '', '', '']);
    const resetCodeRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Store data for verification/reset flows
    const [pendingUserData, setPendingUserData] = useState<{
        email: string;
        name: string;
    } | null>(null);

    // Country Dropdown State
    const [showCountrySuggestions, setShowCountrySuggestions] = useState(false);
    const [countrySearch, setCountrySearch] = useState('');
    const countryInputRef = useRef<HTMLDivElement>(null);

    const filteredCountries = COUNTRIES.filter(c => 
        c.name.toLowerCase().includes(countrySearch.toLowerCase())
    );

    const getFlagEmoji = (countryCode: string) => {
        const codePoints = countryCode.toUpperCase().split('').map(char => 127397 + char.charCodeAt(0));
        return String.fromCodePoint(...codePoints);
    };

    // Cooldown timer effect
    useEffect(() => {
        if (cooldown > 0) {
            const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [cooldown]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (countryInputRef.current && !countryInputRef.current.contains(event.target as Node)) {
                setShowCountrySuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (mode === 'verify') setTimeout(() => codeInputRefs.current[0]?.focus(), 100);
        if (mode === 'reset') setTimeout(() => resetCodeRefs.current[0]?.focus(), 100);
    }, [mode]);

    const clearMessages = () => { setError(''); setSuccess(''); };

    const formatCooldown = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // ============================================
    // EMAIL SENDING FUNCTIONS
    // ============================================

    const sendVerificationEmail = async (toEmail: string, toName: string, code: string): Promise<boolean> => {
        try {
            console.log('📧 Sending verification email to:', toEmail);
            
            const result = await emailjs.send(
                EMAILJS_SERVICE_ID,
                EMAILJS_TEMPLATE_ID,
                {
                    to_email: toEmail,
                    to_name: toName || 'User',
                    verification_code: code,
                    app_name: 'InJazi',
                    subject: 'Your InJazi Verification Code'
                }
            );
            
            console.log('✅ Email sent successfully:', result.status);
            return true;
        } catch (error) {
            console.error('❌ Failed to send email:', error);
            return false;
        }
    };

    const sendPasswordResetEmail = async (toEmail: string, toName: string, code: string): Promise<boolean> => {
        try {
            console.log('📧 Sending password reset email to:', toEmail);
            
            const result = await emailjs.send(
                EMAILJS_SERVICE_ID,
                EMAILJS_RESET_TEMPLATE_ID || EMAILJS_TEMPLATE_ID, // Fallback to main template
                {
                    to_email: toEmail,
                    to_name: toName || 'User',
                    verification_code: code,
                    app_name: 'InJazi',
                    subject: 'Reset Your InJazi Password'
                }
            );
            
            console.log('✅ Reset email sent successfully:', result.status);
            return true;
        } catch (error) {
            console.error('❌ Failed to send reset email:', error);
            return false;
        }
    };

    // ============================================
    // API FUNCTIONS
    // ============================================

    const apiRegister = async (data: { email: string; password: string; name: string; country?: string }) => {
        const response = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (!response.ok) throw result;
        return result;
    };

    const apiLogin = async (data: { email: string; password: string }) => {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (!response.ok) throw result;
        if (result.token) localStorage.setItem('injazi_token', result.token);
        return result;
    };

    const apiVerify = async (email: string, code: string) => {
        const response = await fetch(`${API_URL}/api/auth/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code })
        });
        const result = await response.json();
        if (!response.ok) throw result;
        if (result.token) localStorage.setItem('injazi_token', result.token);
        return result;
    };

    const apiResendCode = async (email: string) => {
        const response = await fetch(`${API_URL}/api/auth/resend`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const result = await response.json();
        if (!response.ok) throw result;
        return result;
    };

    const apiForgotPassword = async (email: string) => {
        const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const result = await response.json();
        if (!response.ok) throw result;
        return result;
    };

    const apiResetPassword = async (email: string, code: string, newPassword: string) => {
        const response = await fetch(`${API_URL}/api/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code, newPassword })
        });
        const result = await response.json();
        if (!response.ok) throw result;
        return result;
    };

    // ============================================
    // CODE INPUT HANDLERS
    // ============================================

    const handleCodeChange = (index: number, value: string, isReset: boolean = false) => {
        const codes = isReset ? [...resetCode] : [...verificationCode];
        const refs = isReset ? resetCodeRefs : codeInputRefs;
        const digit = value.replace(/\D/g, '').slice(-1);
        codes[index] = digit;
        if (isReset) setResetCode(codes);
        else setVerificationCode(codes);
        if (digit && index < 5) refs.current[index + 1]?.focus();
    };

    const handleCodeKeyDown = (index: number, e: React.KeyboardEvent, isReset: boolean = false) => {
        const codes = isReset ? resetCode : verificationCode;
        const refs = isReset ? resetCodeRefs : codeInputRefs;
        if (e.key === 'Backspace' && !codes[index] && index > 0) refs.current[index - 1]?.focus();
    };

    const handleCodePaste = (e: React.ClipboardEvent, isReset: boolean = false) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        const newCodes = pastedData.split('');
        if (isReset) {
            setResetCode([...newCodes, ...Array(6 - newCodes.length).fill('')]);
            if (newCodes.length === 6) resetCodeRefs.current[5]?.focus();
        } else {
            setVerificationCode([...newCodes, ...Array(6 - newCodes.length).fill('')]);
            if (newCodes.length === 6) codeInputRefs.current[5]?.focus();
        }
    };

    // ============================================
    // AUTH HANDLERS
    // ============================================

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        clearMessages();
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError("Please enter a valid email address.");
            return;
        }
        
        if (mode === 'register' && (!name || !country || !privacyAccepted)) {
            setError("Please fill all required fields and accept privacy policy.");
            return;
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }
        
        setIsLoading(true);
        
        try {
            if (mode === 'register') {
                // REGISTER FLOW
                const result = await apiRegister({
                    email: email.toLowerCase().trim(),
                    password,
                    name: name.trim(),
                    country
                });

                console.log("📝 Registration result:", result);

                // Backend returns the verification code - we need to send it via email
                if (result.success && result.code) {
                    // Send verification email via EmailJS
                    const emailSent = await sendVerificationEmail(
                        result.email,
                        result.name,
                        result.code
                    );

                    if (emailSent) {
                        setPendingUserData({
                            email: result.email,
                            name: result.name,
                        });
                        setSuccess('Verification code sent to your email!');
                        setCooldown(300); // 5 minutes
                        setMode('verify');
                    } else {
                        setError('Failed to send verification email. Please try again.');
                    }
                }
            } else {
                // LOGIN FLOW
                const result = await apiLogin({
                    email: email.toLowerCase().trim(),
                    password
                });

                console.log("🔐 Login result:", result);

                // Check if user needs to verify email first
                if (result.requiresVerification) {
                    setError('Please verify your email first.');
                    // Optionally switch to verify mode
                    setMode('verify');
                    return;
                }

                // Login success
                setUser(result.user);
                setIsAuthenticated(true);
                setView(result.user.goal ? AppView.DASHBOARD : AppView.ONBOARDING);
            }

        } catch (error: any) {
            console.error("Auth Failed:", error);
            if (error.cooldownRemaining) {
                setCooldown(error.cooldownRemaining);
            }
            setError(error.message || "Connection Error. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyEmail = async () => {
        clearMessages();
        const code = verificationCode.join('');
        if (code.length !== 6) { 
            setError('Please enter the complete 6-digit code'); 
            return; 
        }
        
        setIsLoading(true);
        try {
            const result = await apiVerify(email.toLowerCase().trim(), code);
            setSuccess('Email verified successfully!');
            
            // The verify endpoint returns the user and token
            if (result.user && result.token) {
                setTimeout(() => {
                    setUser(result.user);
                    setIsAuthenticated(true);
                    setView(result.user.goal ? AppView.DASHBOARD : AppView.ONBOARDING);
                }, 500);
            }
        } catch (err: any) {
            if (err.message?.includes('expired')) {
                setError('Code expired. Please request a new one.');
                setCooldown(0);
            } else if (err.message?.includes('Invalid')) {
                setError('Invalid code. Please check and try again.');
            } else if (err.message?.includes('No pending')) {
                setError('Registration expired. Please sign up again.');
                setMode('register');
            } else {
                setError(err.message || 'Verification failed');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendCode = async () => {
        if (cooldown > 0) return;
        
        clearMessages();
        setIsLoading(true);
        try {
            const result = await apiResendCode(email.toLowerCase().trim());
            
            // Send new code via email
            if (result.success && result.code) {
                const emailSent = await sendVerificationEmail(
                    result.email,
                    result.name,
                    result.code
                );

                if (emailSent) {
                    setSuccess('New verification code sent!');
                    setCooldown(result.cooldownRemaining || 300);
                    setVerificationCode(['', '', '', '', '', '']);
                    setTimeout(() => codeInputRefs.current[0]?.focus(), 100);
                } else {
                    setError('Failed to send email. Please try again.');
                }
            }
        } catch (err: any) {
            if (err.cooldownRemaining) {
                setCooldown(err.cooldownRemaining);
            }
            setError(err.message || 'Failed to resend code');
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        clearMessages();
        if (!email) { 
            setError('Please enter your email first'); 
            return; 
        }
        
        setIsLoading(true);
        try {
            const result = await apiForgotPassword(email.toLowerCase().trim());
            
            // Send reset code via email if we got one
            if (result.success && result.code) {
                const emailSent = await sendPasswordResetEmail(
                    result.email,
                    result.name,
                    result.code
                );

                if (emailSent) {
                    setSuccess('Password reset code sent to your email.');
                    setCooldown(300);
                    setMode('reset');
                } else {
                    // Still show success for security (don't reveal if email exists)
                    setSuccess('If this email exists, a reset code was sent.');
                    setMode('reset');
                }
            } else {
                // Generic success message for security
                setSuccess('If this email exists, a reset code was sent.');
                setMode('reset');
            }
        } catch (err: any) {
            if (err.cooldownRemaining) {
                setCooldown(err.cooldownRemaining);
                setError(`Please wait ${Math.ceil(err.cooldownRemaining / 60)} minutes before requesting again.`);
            } else {
                // Generic message for security
                setSuccess('If this email exists, a reset code was sent.');
                setMode('reset');
            }
        } finally {
            setIsLoading(false);
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
        
        setIsLoading(true);
        try {
            await apiResetPassword(email.toLowerCase().trim(), code, newPassword);
            setSuccess('Password reset successfully! You can now log in.');
            setMode('login');
            setPassword('');
            setNewPassword('');
            setResetCode(['', '', '', '', '', '']);
            setCooldown(0);
        } catch (err: any) {
            setError(err.message || 'Reset failed');
        } finally {
            setIsLoading(false);
        }
    };

    // ============================================
    // RENDER FUNCTIONS
    // ============================================

    const renderCodeInputs = (codes: string[], refs: React.MutableRefObject<(HTMLInputElement | null)[]>, isReset: boolean = false) => (
        <div className="flex justify-center gap-2">
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
                    className="w-11 h-14 text-center text-2xl font-bold bg-black/20 border border-white/10 rounded-xl text-white focus:border-[#3423A6]/50 focus:bg-black/30 outline-none transition-all"
                />
            ))}
        </div>
    );

    // Login/Register View
    const renderAuthForm = () => (
        <>
            {/* Toggle Switch - BETTER FIX */}
<div className="flex relative bg-black/20 rounded-3xl p-1 mb-6 overflow-hidden">
    <div 
        className={`absolute top-1 bottom-1 rounded-2xl transition-all duration-300 shadow-sm bg-white/10 ${
            mode === 'login' 
                ? 'left-1 right-[50%] mr-0.5' 
                : 'left-[50%] right-1 ml-0.5'
        }`}
    ></div>
    <button 
        type="button"
        onClick={() => { setMode('login'); clearMessages(); }}
        className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider z-10 transition-colors ${
            mode === 'login' ? 'text-white' : 'text-white/40'
        }`}
    >
        Log In
    </button>
    <button 
        type="button"
        onClick={() => { setMode('register'); clearMessages(); }}
        className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider z-10 transition-colors ${
            mode === 'register' ? 'text-white' : 'text-white/40'
        }`}
    >
        Sign Up
    </button>
</div>

            {/* Form */}
            <form onSubmit={handleAuth} className="px-6 pb-6 space-y-4">
                <div className="space-y-4 overflow-y-auto max-h-[50vh] pr-1">
                    {/* Email */}
                    <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[#DFF3E4] transition-colors">
                            <Icons.Mail className="w-5 h-5" />
                        </div>
                        <input 
                            type="email" 
                            value={email} 
                            onChange={e => setEmail(e.target.value)} 
                            className="w-full bg-black/20 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-white/20 focus:outline-none focus:bg-black/30 focus:border-[#3423A6]/50 transition-all font-medium"
                            placeholder="Email Address"
                            autoComplete="email"
                            required 
                        />
                    </div>

                    {mode === 'register' && (
                        <>
                            {/* Name */}
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[#DFF3E4] transition-colors">
                                    <Icons.User className="w-5 h-5" />
                                </div>
                                <input 
                                    type="text" 
                                    value={name} 
                                    onChange={e => setName(e.target.value)} 
                                    className="w-full bg-black/20 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-white/20 focus:outline-none focus:bg-black/30 focus:border-[#3423A6]/50 transition-all font-medium"
                                    placeholder="Full Name"
                                    autoComplete="name"
                                    required 
                                />
                            </div>

                            {/* Country */}
                            <div className="relative group" ref={countryInputRef}>
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[#DFF3E4] transition-colors">
                                    <Icons.Globe className="w-5 h-5" />
                                </div>
                                <input 
                                    type="text" 
                                    value={showCountrySuggestions ? countrySearch : country} 
                                    onChange={e => {
                                        setCountrySearch(e.target.value);
                                        setShowCountrySuggestions(true);
                                        if(!e.target.value) setCountry('');
                                    }}
                                    onFocus={() => {
                                        setCountrySearch(country);
                                        setShowCountrySuggestions(true);
                                    }}
                                    className="w-full bg-black/20 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-white/20 focus:outline-none focus:bg-black/30 focus:border-[#3423A6]/50 transition-all font-medium"
                                    placeholder="Country"
                                    autoComplete="off"
                                    required 
                                />
                                {showCountrySuggestions && filteredCountries.length > 0 && (
                                    <div className="absolute z-50 left-0 right-0 mt-2 bg-[#171738] border border-white/10 rounded-2xl shadow-2xl max-h-40 overflow-y-auto">
                                        {filteredCountries.map(c => (
                                            <button 
                                                key={c.code}
                                                type="button"
                                                onClick={() => {
                                                    setCountry(c.name);
                                                    setCountrySearch(c.name);
                                                    setShowCountrySuggestions(false);
                                                }}
                                                className="w-full text-left px-5 py-3 hover:bg-white/10 flex items-center gap-3 text-white text-sm"
                                            >
                                                <span>{getFlagEmoji(c.code)}</span>
                                                <span>{c.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* Password */}
                    <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[#DFF3E4] transition-colors">
                            <Icons.Lock className="w-5 h-5" />
                        </div>
                        <input 
                            type="password" 
                            value={password} 
                            onChange={e => setPassword(e.target.value)} 
                            className="w-full bg-black/20 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-white/20 focus:outline-none focus:bg-black/30 focus:border-[#3423A6]/50 transition-all font-medium"
                            placeholder="Password"
                            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                            required 
                        />
                    </div>

                    {/* Forgot Password */}
                    {mode === 'login' && (
                        <div className="text-right">
                            <button
                                type="button"
                                onClick={handleForgotPassword}
                                disabled={isLoading}
                                className="text-[#DFF3E4]/60 text-xs hover:text-[#DFF3E4] transition-colors disabled:opacity-50"
                            >
                                Forgot password?
                            </button>
                        </div>
                    )}

                    {/* Privacy Policy */}
{mode === 'register' && (
    <div className="flex items-start gap-3 p-2">
        <input 
            type="checkbox" 
            checked={privacyAccepted} 
            onChange={e => setPrivacyAccepted(e.target.checked)}
            className="mt-1 w-5 h-5 accent-[#3423A6] cursor-pointer" 
            required
        />
        <p className="text-white/50 text-[10px] leading-tight font-medium">
            I accept the{' '}
            <button 
                type="button"
                onClick={() => setShowLegal('privacy')}
                className="text-[#DFF3E4] underline"
            >
                Privacy Policy
            </button>
            {' '}and{' '}
            <button 
                type="button"
                onClick={() => setShowLegal('terms')}
                className="text-[#DFF3E4] underline"
            >
                Terms of Service
            </button>.
        </p>
    </div>
)}
                </div>
                
                <button 
                    type="submit" 
                    disabled={isLoading || (mode === 'register' && !privacyAccepted)}
                    className="w-full py-4 mt-2 bg-[#3423A6] hover:bg-[#4330c9] disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-2xl font-bold text-lg shadow-[0_0_20px_rgba(52,35,166,0.5)] hover:shadow-[0_0_30px_rgba(52,35,166,0.7)] transition-all active:scale-95 flex items-center justify-center gap-2 group relative overflow-hidden"
                >
                    {isLoading ? (
                        <Icons.RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                        <>
                            <span className="relative z-10">{mode === 'login' ? 'Log In' : 'Create Account'}</span>
                            <Icons.ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
                        </>
                    )}
                </button>
            </form>
        </>
    );

    // Verification View
const renderVerifyForm = () => (
    <div className="px-6 pb-6 space-y-6">
        <button
            onClick={() => { setMode('register'); clearMessages(); setCooldown(0); }}
            className="flex items-center gap-2 text-white/50 hover:text-white transition-colors"
        >
            <Icons.ChevronLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
        </button>

        <div className="text-center">
            <div className="w-16 h-16 bg-[#3423A6]/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icons.Mail className="w-8 h-8 text-[#DFF3E4]" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Verify Your Email</h2>
            <p className="text-white/50 text-sm">
                We sent a 6-digit code to<br />
                <span className="text-[#DFF3E4] font-medium">{email}</span>
            </p>
        </div>

        {renderCodeInputs(verificationCode, codeInputRefs, false)}

        <button 
            onClick={handleVerifyEmail}
            disabled={isLoading || verificationCode.join('').length !== 6}
            className="w-full py-4 bg-[#3423A6] hover:bg-[#4330c9] disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-2xl font-bold text-lg shadow-[0_0_20px_rgba(52,35,166,0.5)] transition-all flex items-center justify-center gap-2"
        >
            {isLoading ? (
                <Icons.RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
                'Verify Email'
            )}
        </button>

        <div className="text-center">
            <p className="text-white/40 text-xs mb-2">Didn't receive the code?</p>
            {cooldown > 0 ? (
                <p className="text-white/60 text-sm font-medium">
                    Resend available in <span className="text-[#DFF3E4]">{formatCooldown(cooldown)}</span>
                </p>
            ) : (
                <button
                    onClick={handleResendCode}
                    disabled={isLoading}
                    className="text-[#DFF3E4] text-sm font-medium hover:underline disabled:opacity-50"
                >
                    Resend Code
                </button>
            )}
        </div>
    </div>
);
    // Reset Password View
    const renderResetForm = () => (
        <div className="px-6 pb-6 space-y-6">
            <button
                onClick={() => { setMode('login'); clearMessages(); setCooldown(0); }}
                className="flex items-center gap-2 text-white/50 hover:text-white transition-colors"
            >
                <Icons.ChevronLeft className="w-4 h-4" />
                <span className="text-sm">Back to Login</span>
            </button>

            <div className="text-center">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icons.Lock className="w-8 h-8 text-red-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Reset Password</h2>
                <p className="text-white/50 text-sm">
                    Enter the code sent to<br />
                    <span className="text-[#DFF3E4] font-medium">{email}</span>
                </p>
            </div>

            {renderCodeInputs(resetCode, resetCodeRefs, true)}

            {/* New Password */}
            <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[#DFF3E4] transition-colors">
                    <Icons.Lock className="w-5 h-5" />
                </div>
                <input 
                    type="password" 
                    value={newPassword} 
                    onChange={e => setNewPassword(e.target.value)} 
                    className="w-full bg-black/20 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-white/20 focus:outline-none focus:bg-black/30 focus:border-[#3423A6]/50 transition-all font-medium"
                    placeholder="New Password (min 6 chars)"
                    autoComplete="new-password"
                    minLength={6}
                />
            </div>

            <button 
                onClick={handleResetPassword}
                disabled={isLoading || resetCode.join('').length !== 6 || newPassword.length < 6}
                className="w-full py-4 bg-[#3423A6] hover:bg-[#4330c9] disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-2xl font-bold text-lg shadow-[0_0_20px_rgba(52,35,166,0.5)] transition-all flex items-center justify-center gap-2"
            >
                {isLoading ? (
                    <Icons.RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                    'Reset Password'
                )}
            </button>

            <div className="text-center">
                {cooldown > 0 ? (
                    <p className="text-white/60 text-sm font-medium">
                        Resend available in <span className="text-[#DFF3E4]">{formatCooldown(cooldown)}</span>
                    </p>
                ) : (
                    <button
                        onClick={handleForgotPassword}
                        disabled={isLoading}
                        className="text-[#DFF3E4] text-sm font-medium hover:underline disabled:opacity-50"
                    >
                        Resend Code
                    </button>
                )}
            </div>
        </div>
    );

    // ============================================
    // MAIN RENDER
    // ============================================

    return (
        <div className="relative h-full w-full bg-[#171738] overflow-hidden flex flex-col items-center justify-center p-6 animate-fade-in font-sans">
            {/* Background Elements */}
            <div className="absolute top-[-20%] left-[-20%] w-[90vw] h-[90vw] bg-[#3423A6] rounded-full blur-[120px] opacity-40 animate-pulse duration-[4000ms]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[80vw] h-[80vw] bg-[#DFF3E4] rounded-full blur-[100px] opacity-10 animate-pulse duration-[5000ms]" />
            <div className="absolute top-[20%] right-[10%] w-32 h-32 border border-white/10 rounded-full animate-[spin_10s_linear_infinite]" />

            {/* Content Container */}
            <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
                
                {/* Brand Logo */}
                <div className="mb-10 text-center relative group">
                    <h1 className="text-6xl font-black text-white tracking-tighter mb-2 font-display">INJAZI</h1>
                    <div className="h-1 w-16 bg-[#3423A6] mx-auto rounded-full mb-3 shadow-[0_0_15px_rgba(52,35,166,0.8)]"></div>
                    <p className="text-[#DFF3E4] font-bold tracking-[0.25em] text-[10px] uppercase opacity-70">Goal Achievement Platform</p>
                </div>

                {/* Main Card */}
                <div className="w-full bg-white/5 backdrop-blur-2xl border border-white/10 p-2 rounded-[2.5rem] shadow-2xl overflow-hidden">
                    
                    {/* Error/Success Messages */}
                    {(error || success) && (
                        <div className={`mx-4 mt-4 p-3 rounded-xl text-sm font-medium animate-fade-in ${
                            error 
                                ? 'bg-red-500/20 border border-red-500/30 text-red-300' 
                                : 'bg-green-500/20 border border-green-500/30 text-green-300'
                        }`}>
                            {error || success}
                        </div>
                    )}

                    {/* Render appropriate form based on mode */}
                    {(mode === 'login' || mode === 'register') && renderAuthForm()}
                    {mode === 'verify' && renderVerifyForm()}
                    {(mode === 'forgot' || mode === 'reset') && renderResetForm()}
                </div>

                {/* Footer */}
<p className="mt-6 text-white/30 text-[10px] text-center">
    By continuing, you agree to our{' '}
    <button 
        type="button"
        onClick={() => setShowLegal('terms')}
        className="underline hover:text-white/50"
    >
        Terms of Service
    </button>
</p>
            </div>
            {/* Legal Modal */}
{showLegal && (
    <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md overflow-hidden">
        <div className="h-full bg-white flex flex-col">
            {/* Modal Header */}
            <div className="flex-shrink-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-[#171738]">
                    {showLegal === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
                </h2>
                <button 
                    onClick={() => setShowLegal(null)}
                    className="p-2 bg-gray-100 rounded-full"
                >
                    <Icons.X className="w-5 h-5 text-[#171738]" />
                </button>
            </div>
            
            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 pb-20 text-[#171738] text-sm leading-relaxed">
                {showLegal === 'terms' ? (
                    <div className="space-y-6">
                        <p className="text-xs text-gray-400">Last Updated: December 30, 2024</p>
                        
                        <section>
                            <h3 className="font-bold text-base mb-2">1. Acceptance of Terms</h3>
                            <p className="text-gray-600">By accessing or using InJazi, you agree to be bound by these Terms of Service. InJazi is a goal achievement and personal development platform that uses artificial intelligence to help users set, track, and accomplish their personal and professional goals.</p>
                        </section>
                        
                        <section>
                            <h3 className="font-bold text-base mb-2">2. Eligibility</h3>
                            <p className="text-gray-600">You must be at least 13 years of age to use InJazi. If you are under 18, you must have parental or guardian consent.</p>
                        </section>
                        
                        <section>
                            <h3 className="font-bold text-base mb-2">3. Account Registration</h3>
                            <p className="text-gray-600">You agree to provide accurate information, keep your password secure, and be responsible for all activities under your account.</p>
                        </section>
                        
                        <section>
                            <h3 className="font-bold text-base mb-2">4. Credits and Virtual Currency</h3>
                            <p className="text-gray-600">Architect Credits have no real-world monetary value until redeemed. Minimum redemption: 3,000 Credits = $1.00 USD. We reserve the right to modify Credit values and redemption terms at any time. Fraudulent activity will result in account termination.</p>
                        </section>
                        
                        <section>
                            <h3 className="font-bold text-base mb-2">5. Subscription Plans</h3>
                            <p className="text-gray-600">Free Plan: 3 goals, 3 AI tasks/day. Premium ($9.99/mo): Unlimited goals and tasks. Creator ($19.99/mo): All Premium features plus marketplace publishing. Subscriptions auto-renew unless cancelled.</p>
                        </section>
                        
                        <section>
                            <h3 className="font-bold text-base mb-2">6. AI-Generated Content</h3>
                            <p className="text-gray-600">AI recommendations are for informational and motivational purposes only, not professional advice. Consult qualified professionals for specific advice. We are not liable for decisions made based on AI content.</p>
                        </section>
                        
                        <section>
                            <h3 className="font-bold text-base mb-2">7. User Conduct</h3>
                            <p className="text-gray-600">You agree NOT to upload illegal or harmful content, impersonate others, violate laws, attempt unauthorized access, or exploit bugs for unfair advantage.</p>
                        </section>
                        
                        <section>
                            <h3 className="font-bold text-base mb-2">8. Intellectual Property</h3>
                            <p className="text-gray-600">All InJazi content is protected by intellectual property laws. You may not reproduce or distribute without permission.</p>
                        </section>
                        
                        <section>
                            <h3 className="font-bold text-base mb-2">9. Disclaimer</h3>
                            <p className="text-gray-600">THE APP IS PROVIDED "AS IS" WITHOUT WARRANTIES. We do not guarantee uninterrupted service, accuracy of AI recommendations, or achievement of specific outcomes.</p>
                        </section>
                        
                        <section>
                            <h3 className="font-bold text-base mb-2">10. Limitation of Liability</h3>
                            <p className="text-gray-600">InJazi shall not be liable for any indirect, incidental, or consequential damages arising from your use of the App.</p>
                        </section>
                        
                        <section>
                            <h3 className="font-bold text-base mb-2">11. Contact</h3>
                            <p className="text-gray-600">Email: legal@injazi.app | Support: support@injazi.app</p>
                        </section>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <p className="text-xs text-gray-400">Last Updated: December 30, 2024</p>
                        
                        <section>
                            <h3 className="font-bold text-base mb-2">1. Introduction</h3>
                            <p className="text-gray-600">InJazi is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information.</p>
                        </section>
                        
                        <section>
                            <h3 className="font-bold text-base mb-2">2. Information We Collect</h3>
                            <p className="text-gray-600 mb-2"><strong>Personal Info:</strong> Name, email, password, country, goals, preferences, task submissions, uploaded files (images, documents, audio).</p>
                            <p className="text-gray-600 mb-2"><strong>Automatic:</strong> Device info, usage data, IP address, general location.</p>
                            <p className="text-gray-600"><strong>Third Parties:</strong> Data from connected apps (Google Calendar, Apple Health, Notion, Todoist) and AdGem offers.</p>
                        </section>
                        
                        <section>
                            <h3 className="font-bold text-base mb-2">3. How We Use Your Information</h3>
                            <p className="text-gray-600">To provide and improve services, personalize AI recommendations, process transactions, send communications, provide support, analyze usage, detect fraud, and comply with legal obligations.</p>
                        </section>
                        
                        <section>
                            <h3 className="font-bold text-base mb-2">4. AI and Data Processing</h3>
                            <p className="text-gray-600">We use Google's Gemini AI. Your goals and tasks are processed for personalized recommendations. AI interactions are processed in real-time and not stored beyond your active session unless explicitly saved.</p>
                        </section>
                        
                        <section>
                            <h3 className="font-bold text-base mb-2">5. Information Sharing</h3>
                            <p className="text-gray-600 mb-2">We share with: cloud providers, email services (EmailJS), payment processors, analytics providers, AI services (Google Gemini).</p>
                            <p className="text-gray-600 font-semibold">We do NOT sell your personal information to third parties.</p>
                        </section>
                        
                        <section>
                            <h3 className="font-bold text-base mb-2">6. Data Security</h3>
                            <p className="text-gray-600">We use encryption (HTTPS/TLS), secure password hashing, access controls, and regular security assessments. However, no method is 100% secure.</p>
                        </section>
                        
                        <section>
                            <h3 className="font-bold text-base mb-2">7. Data Retention</h3>
                            <p className="text-gray-600">We retain your information while your account is active. Upon deletion, we remove your data within 30 days, except where required by law.</p>
                        </section>
                        
                        <section>
                            <h3 className="font-bold text-base mb-2">8. Your Rights</h3>
                            <p className="text-gray-600">You may request to access, correct, delete, or export your data. Contact privacy@injazi.app or use in-app Settings.</p>
                        </section>
                        
                        <section>
                            <h3 className="font-bold text-base mb-2">9. Children's Privacy</h3>
                            <p className="text-gray-600">InJazi is not intended for children under 13. We do not knowingly collect data from children under 13.</p>
                        </section>
                        
                        <section>
                            <h3 className="font-bold text-base mb-2">10. Changes to Policy</h3>
                            <p className="text-gray-600">We may update this policy periodically. We will notify you of material changes via email or in-app notification.</p>
                        </section>
                        
                        <section>
                            <h3 className="font-bold text-base mb-2">11. Contact</h3>
                            <p className="text-gray-600">Email: privacy@injazi.app | Support: support@injazi.app</p>
                        </section>
                    </div>
                )}
            </div>
        </div>
    </div>
)}
        </div>
    );
}
