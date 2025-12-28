// views/LoginView.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { AppView, COUNTRIES } from '../types';
import { Icons } from '../components/UIComponents';
import { api } from '../services/api';

type AuthMode = 'login' | 'register' | 'verify' | 'forgot' | 'reset';

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

    // Cooldown timer (in seconds)
    const [cooldown, setCooldown] = useState(0);

    // Verification Code
    const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
    const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);
    
    // Reset Code
    const [resetCode, setResetCode] = useState(['', '', '', '', '', '']);
    const resetCodeRefs = useRef<(HTMLInputElement | null)[]>([]);

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
            const result = await api.auth({
                email,
                password,
                name: mode === 'register' ? name : undefined,
                country: mode === 'register' ? country : undefined,
                isRegister: mode === 'register'
            });

            console.log("✅ Auth result:", result);

            // Registration - go to verify
            if (mode === 'register' || result.requiresVerification) {
                setSuccess('Verification code sent to your email!');
                setCooldown(300); // 5 minutes
                setMode('verify');
                setIsLoading(false);
                return;
            }

            // Login success - user is verified
            setUser(result.user);
            setIsAuthenticated(true);
            setView(result.user.goal ? AppView.DASHBOARD : AppView.ONBOARDING);

        } catch (error: any) {
            console.error("Auth Failed:", error);
            // Check if there's a cooldown in the error
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
        if (code.length !== 6) { setError('Please enter the complete 6-digit code'); return; }
        
        setIsLoading(true);
        try {
            const result = await api.verifyEmail(email, code);
            setSuccess('Email verified successfully!');
            
            // The verify endpoint now returns the user and token
            if (result.user && result.token) {
                setUser(result.user);
                setIsAuthenticated(true);
                setView(result.user.goal ? AppView.DASHBOARD : AppView.ONBOARDING);
            } else {
                // Fallback - login after verification
                await new Promise(r => setTimeout(r, 500));
                const loginResult = await api.auth({ email, password, isRegister: false });
                setUser(loginResult.user);
                setIsAuthenticated(true);
                setView(loginResult.user.goal ? AppView.DASHBOARD : AppView.ONBOARDING);
            }
        } catch (err: any) {
            if (err.message?.includes('expired')) {
                setError('Code expired. Please register again.');
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
            const result = await api.resendVerification(email);
            setSuccess('New verification code sent!');
            setCooldown(result.cooldownRemaining || 300); // 5 minutes
            setVerificationCode(['', '', '', '', '', '']);
            setTimeout(() => codeInputRefs.current[0]?.focus(), 100);
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
        if (!email) { setError('Please enter your email first'); return; }
        setIsLoading(true);
        try {
            await api.forgotPassword(email);
            setSuccess('If this email exists, a reset code was sent.');
            setCooldown(300);
            setMode('reset');
        } catch (err: any) {
            if (err.cooldownRemaining) {
                setCooldown(err.cooldownRemaining);
            }
            setError(err.message || 'Failed to send reset code');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async () => {
        clearMessages();
        const code = resetCode.join('');
        if (code.length !== 6) { setError('Please enter the complete 6-digit code'); return; }
        if (newPassword.length < 6) { setError('Password must be at least 6 characters'); return; }
        
        setIsLoading(true);
        try {
            await api.resetPassword(email, code, newPassword);
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
            {/* Toggle Switch */}
            <div className="flex relative bg-black/20 rounded-3xl p-1 mb-6">
                <div 
                    className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white/10 rounded-2xl transition-all duration-300 shadow-sm ${mode === 'login' ? 'left-1' : 'left-[calc(50%+4px)]'}`}
                ></div>
                <button 
                    type="button"
                    onClick={() => { setMode('login'); clearMessages(); }}
                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider z-10 transition-colors ${mode === 'login' ? 'text-white' : 'text-white/40'}`}
                >
                    Log In
                </button>
                <button 
                    type="button"
                    onClick={() => { setMode('register'); clearMessages(); }}
                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider z-10 transition-colors ${mode === 'register' ? 'text-white' : 'text-white/40'}`}
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
                            <Icons.User className="w-5 h-5" />
                        </div>
                        <input 
                            type="email" 
                            value={email} 
                            onChange={e => setEmail(e.target.value.toLowerCase().trim())} 
                            className="w-full bg-black/20 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-white/20 focus:outline-none focus:bg-black/30 focus:border-[#3423A6]/50 transition-all font-medium"
                            placeholder="Email Address"
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
                            required 
                        />
                    </div>

                    {/* Forgot Password */}
                    {mode === 'login' && (
                        <div className="text-right">
                            <button
                                type="button"
                                onClick={handleForgotPassword}
                                className="text-[#DFF3E4]/60 text-xs hover:text-[#DFF3E4] transition-colors"
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
                                className="mt-1 w-5 h-5 accent-[#3423A6]" 
                                required
                            />
                            <p className="text-white/50 text-[10px] leading-tight font-medium">
                                I accept the <span className="text-[#DFF3E4] underline cursor-pointer">Privacy Policies</span> and Architecture Protocols.
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
                            <span className="relative z-10">{mode === 'login' ? 'Authenticate' : 'Initialize'}</span>
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
                    <Icons.Shield className="w-8 h-8 text-[#DFF3E4]" />
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
                    <p className="text-[#DFF3E4] font-bold tracking-[0.25em] text-[10px] uppercase opacity-70">Success Architecture AI</p>
                </div>

                {/* Main Card */}
                <div className="w-full bg-white/5 backdrop-blur-2xl border border-white/10 p-2 rounded-[2.5rem] shadow-2xl overflow-hidden">
                    
                    {/* Error/Success Messages */}
                    {(error || success) && (
                        <div className={`mx-4 mt-4 p-3 rounded-xl text-sm font-medium ${
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
                    {mode === 'reset' && renderResetForm()}
                </div>
            </div>
        </div>
    );
}
