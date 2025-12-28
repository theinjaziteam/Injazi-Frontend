import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { AppView, COUNTRIES } from '../types';
import { Icons } from '../components/UIComponents';
import { api } from '../services/api';

type AuthMode = 'login' | 'register' | 'verify' | 'forgot' | 'reset';

export default function LoginView() {
    const { setIsAuthenticated, setView, setUser } = useApp();
    const [authMode, setAuthMode] = useState<AuthMode>('login');
    
    // Form State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [name, setName] = useState('');
    const [country, setCountry] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [privacyAccepted, setPrivacyAccepted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState<'success' | 'error'>('error');
    const [pendingUser, setPendingUser] = useState<any>(null);

    // Country Dropdown State
    const [showCountrySuggestions, setShowCountrySuggestions] = useState(false);
    const [countrySearch, setCountrySearch] = useState('');
    const countryInputRef = useRef<HTMLDivElement>(null);

    // Code input refs for individual digits
    const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const filteredCountries = COUNTRIES.filter(c => 
        c.name.toLowerCase().includes(countrySearch.toLowerCase())
    );

    const getFlagEmoji = (countryCode: string) => {
        const codePoints = countryCode.toUpperCase().split('').map(char => 127397 + char.charCodeAt(0));
        return String.fromCodePoint(...codePoints);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (countryInputRef.current && !countryInputRef.current.contains(event.target as Node)) {
                setShowCountrySuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Focus first code input when entering verify mode
    useEffect(() => {
        if (authMode === 'verify' || authMode === 'reset') {
            setTimeout(() => {
                codeInputRefs.current[0]?.focus();
            }, 100);
        }
    }, [authMode]);

    const showMessage = (msg: string, type: 'success' | 'error' = 'error') => {
        setMessage(msg);
        setMessageType(type);
    };

    // Handle individual code digit input
    const handleCodeInput = (index: number, value: string) => {
        // Only allow numbers
        value = value.replace(/[^0-9]/g, '');
        if (value.length > 1) value = value[value.length - 1];
        
        const newCode = verificationCode.split('');
        while (newCode.length < 6) newCode.push('');
        newCode[index] = value;
        setVerificationCode(newCode.join(''));

        // Auto-focus next input
        if (value && index < 5) {
            codeInputRefs.current[index + 1]?.focus();
        }
    };

    const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
            codeInputRefs.current[index - 1]?.focus();
        }
    };

    const handleCodePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
        setVerificationCode(pastedData);
        
        // Focus the next empty input or the last one
        const nextIndex = Math.min(pastedData.length, 5);
        codeInputRefs.current[nextIndex]?.focus();
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        
        if (authMode === 'register' && (!name || !country || !privacyAccepted)) {
            showMessage("Please fill all required fields and accept privacy policy.");
            return;
        }

        if (password.length < 6) {
            showMessage("Password must be at least 6 characters.");
            return;
        }
        
        setIsLoading(true);
        
        try {
            const result = await api.auth({
                email,
                password,
                name: authMode === 'register' ? name : undefined,
                country: authMode === 'register' ? country : undefined,
                isRegister: authMode === 'register'
            });

            console.log("✅ Auth Success:", result);

            if (result.requiresVerification && !result.user.isEmailVerified) {
                // Need to verify email
                setPendingUser(result.user);
                setAuthMode('verify');
                setVerificationCode('');
                showMessage('Check your email for the verification code!', 'success');
            } else {
                // Fully authenticated
                setUser(result.user);
                setIsAuthenticated(true);

                if (result.user.goal) {
                    setView(AppView.DASHBOARD);
                } else {
                    setView(AppView.ONBOARDING);
                }
            }

        } catch (error: any) {
            console.error("Auth Failed:", error);
            showMessage(error.message || "Connection Error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        
        const cleanCode = verificationCode.replace(/\s/g, '');
        if (cleanCode.length !== 6) {
            showMessage('Please enter the 6-digit code');
            return;
        }

        setIsLoading(true);

        try {
            await api.verifyEmail(email, cleanCode);
            
            // Update user and proceed
            if (pendingUser) {
                const updatedUser = { ...pendingUser, isEmailVerified: true };
                setUser(updatedUser);
                setIsAuthenticated(true);

                if (updatedUser.goal) {
                    setView(AppView.DASHBOARD);
                } else {
                    setView(AppView.ONBOARDING);
                }
            }
        } catch (error: any) {
            showMessage(error.message || 'Verification failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendCode = async () => {
        setIsLoading(true);
        setMessage('');

        try {
            await api.resendVerification(email);
            showMessage('New code sent! Check your email.', 'success');
        } catch (error: any) {
            showMessage(error.message || 'Failed to resend code');
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        
        if (!email) {
            showMessage('Please enter your email');
            return;
        }

        setIsLoading(true);

        try {
            await api.forgotPassword(email);
            setAuthMode('reset');
            setVerificationCode('');
            showMessage('Check your email for the reset code!', 'success');
        } catch (error: any) {
            showMessage(error.message || 'Request failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        
        const cleanCode = verificationCode.replace(/\s/g, '');
        if (cleanCode.length !== 6 || !newPassword) {
            showMessage('Please enter the code and new password');
            return;
        }

        if (newPassword.length < 6) {
            showMessage('Password must be at least 6 characters');
            return;
        }

        setIsLoading(true);

        try {
            await api.resetPassword(email, cleanCode, newPassword);
            showMessage('Password reset successful!', 'success');
            setTimeout(() => {
                setAuthMode('login');
                setPassword('');
                setVerificationCode('');
                setNewPassword('');
                setMessage('');
            }, 1500);
        } catch (error: any) {
            showMessage(error.message || 'Reset failed');
        } finally {
            setIsLoading(false);
        }
    };

    // Render verification code inputs
    const renderCodeInputs = () => (
        <div className="flex justify-center gap-2 mb-6">
            {[0, 1, 2, 3, 4, 5].map(index => (
                <input
                    key={index}
                    ref={el => codeInputRefs.current[index] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={verificationCode[index] || ''}
                    onChange={e => handleCodeInput(index, e.target.value)}
                    onKeyDown={e => handleCodeKeyDown(index, e)}
                    onPaste={index === 0 ? handleCodePaste : undefined}
                    className="w-11 h-14 bg-black/20 border-2 border-white/10 rounded-xl text-center text-2xl font-black text-white focus:outline-none focus:border-[#3423A6] focus:bg-black/30 transition-all"
                />
            ))}
        </div>
    );

    // Render message
    const renderMessage = () => {
        if (!message) return null;
        return (
            <div className={`p-3 rounded-xl mb-4 text-center text-sm font-medium ${
                messageType === 'success' 
                    ? 'bg-green-500/20 text-green-300' 
                    : 'bg-red-500/20 text-red-300'
            }`}>
                {message}
            </div>
        );
    };

    return (
        <div className="relative h-full w-full bg-[#171738] overflow-hidden flex flex-col items-center justify-center p-6 animate-fade-in font-sans">
            {/* Background Elements */}
            <div className="absolute top-[-20%] left-[-20%] w-[90vw] h-[90vw] bg-[#3423A6] rounded-full blur-[120px] opacity-40" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[80vw] h-[80vw] bg-[#DFF3E4] rounded-full blur-[100px] opacity-10" />
            <div className="absolute top-[20%] right-[10%] w-32 h-32 border border-white/10 rounded-full animate-[spin_20s_linear_infinite]" />

            {/* Content Container */}
            <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
                
                {/* Brand Logo */}
                <div className="mb-8 text-center">
                    <h1 className="text-5xl font-black text-white tracking-tighter mb-2">INJAZI</h1>
                    <div className="h-1 w-16 bg-[#3423A6] mx-auto rounded-full mb-3 shadow-[0_0_15px_rgba(52,35,166,0.8)]"></div>
                    <p className="text-[#DFF3E4] font-bold tracking-[0.2em] text-[9px] uppercase opacity-70">Success Architecture AI</p>
                </div>

                {/* Main Card */}
                <div className="w-full bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden">
                    
                    {/* ========== VERIFICATION VIEW ========== */}
                    {authMode === 'verify' && (
                        <form onSubmit={handleVerifyEmail} className="p-6">
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-[#3423A6]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <Icons.Shield className="w-8 h-8 text-[#DFF3E4]" />
                                </div>
                                <h2 className="text-xl font-black text-white mb-2">Verify Email</h2>
                                <p className="text-white/50 text-sm">Enter the 6-digit code sent to</p>
                                <p className="text-[#DFF3E4] font-bold text-sm truncate">{email}</p>
                            </div>

                            {renderCodeInputs()}
                            {renderMessage()}

                            <button 
                                type="submit" 
                                disabled={isLoading || verificationCode.replace(/\s/g, '').length !== 6}
                                className="w-full py-4 bg-[#3423A6] hover:bg-[#4330c9] disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <Icons.RefreshCw className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <Icons.Check className="w-5 h-5" />
                                        <span>Verify Email</span>
                                    </>
                                )}
                            </button>

                            <button 
                                type="button"
                                onClick={handleResendCode}
                                disabled={isLoading}
                                className="w-full mt-4 py-3 text-white/50 hover:text-white text-sm font-medium transition-colors disabled:opacity-50"
                            >
                                Didn't receive code? <span className="text-[#DFF3E4] underline">Resend</span>
                            </button>

                            <button 
                                type="button"
                                onClick={() => { setAuthMode('login'); setMessage(''); setVerificationCode(''); }}
                                className="w-full mt-2 py-2 text-white/30 hover:text-white/50 text-xs transition-colors flex items-center justify-center gap-1"
                            >
                                <Icons.ChevronLeft className="w-4 h-4" />
                                Back to Login
                            </button>
                        </form>
                    )}

                    {/* ========== FORGOT PASSWORD VIEW ========== */}
                    {authMode === 'forgot' && (
                        <form onSubmit={handleForgotPassword} className="p-6">
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <Icons.Lock className="w-8 h-8 text-amber-400" />
                                </div>
                                <h2 className="text-xl font-black text-white mb-2">Forgot Password</h2>
                                <p className="text-white/50 text-sm">Enter your email to receive a reset code</p>
                            </div>

                            <div className="relative group mb-4">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30">
                                    <Icons.User className="w-5 h-5" />
                                </div>
                                <input 
                                    type="email" 
                                    value={email} 
                                    onChange={e => setEmail(e.target.value)} 
                                    className="w-full bg-black/20 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-white/20 focus:outline-none focus:border-[#3423A6]/50 transition-all"
                                    placeholder="Email Address"
                                    required 
                                />
                            </div>

                            {renderMessage()}

                            <button 
                                type="submit" 
                                disabled={isLoading || !email}
                                className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <Icons.RefreshCw className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <Icons.Send className="w-5 h-5" />
                                        <span>Send Reset Code</span>
                                    </>
                                )}
                            </button>

                            <button 
                                type="button"
                                onClick={() => { setAuthMode('login'); setMessage(''); }}
                                className="w-full mt-4 py-2 text-white/30 hover:text-white/50 text-xs transition-colors flex items-center justify-center gap-1"
                            >
                                <Icons.ChevronLeft className="w-4 h-4" />
                                Back to Login
                            </button>
                        </form>
                    )}

                    {/* ========== RESET PASSWORD VIEW ========== */}
                    {authMode === 'reset' && (
                        <form onSubmit={handleResetPassword} className="p-6">
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <Icons.Lock className="w-8 h-8 text-amber-400" />
                                </div>
                                <h2 className="text-xl font-black text-white mb-2">Reset Password</h2>
                                <p className="text-white/50 text-sm">Enter the code and your new password</p>
                            </div>

                            {renderCodeInputs()}

                            <div className="relative group mb-4">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30">
                                    <Icons.Lock className="w-5 h-5" />
                                </div>
                                <input 
                                    type="password" 
                                    value={newPassword} 
                                    onChange={e => setNewPassword(e.target.value)} 
                                    className="w-full bg-black/20 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-white/20 focus:outline-none focus:border-[#3423A6]/50 transition-all"
                                    placeholder="New Password (min 6 characters)"
                                    required 
                                />
                            </div>

                            {renderMessage()}

                            <button 
                                type="submit" 
                                disabled={isLoading}
                                className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <Icons.RefreshCw className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <Icons.Check className="w-5 h-5" />
                                        <span>Reset Password</span>
                                    </>
                                )}
                            </button>

                            <button 
                                type="button"
                                onClick={() => { setAuthMode('forgot'); setMessage(''); setVerificationCode(''); }}
                                className="w-full mt-4 py-2 text-white/30 hover:text-white/50 text-xs transition-colors flex items-center justify-center gap-1"
                            >
                                <Icons.ChevronLeft className="w-4 h-4" />
                                Request New Code
                            </button>
                        </form>
                    )}

                    {/* ========== LOGIN / REGISTER VIEW ========== */}
                    {(authMode === 'login' || authMode === 'register') && (
                        <>
                            {/* Toggle Switch */}
                            <div className="flex relative bg-black/20 rounded-3xl p-1 m-2 mb-0">
                                <div 
                                    className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white/10 rounded-2xl transition-all duration-300 ${authMode === 'login' ? 'left-1' : 'left-[calc(50%+2px)]'}`}
                                ></div>
                                <button 
                                    type="button"
                                    onClick={() => { setAuthMode('login'); setMessage(''); }} 
                                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider z-10 transition-colors ${authMode === 'login' ? 'text-white' : 'text-white/40'}`}
                                >
                                    Log In
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => { setAuthMode('register'); setMessage(''); }} 
                                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider z-10 transition-colors ${authMode === 'register' ? 'text-white' : 'text-white/40'}`}
                                >
                                    Sign Up
                                </button>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleAuth} className="p-6 pt-4 space-y-4">
                                {renderMessage()}

                                <div className="space-y-4 overflow-y-auto max-h-[45vh] pr-1">
                                     {/* Email */}
                                     <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[#DFF3E4] transition-colors">
                                            <Icons.User className="w-5 h-5" />
                                        </div>
                                        <input 
                                            type="email" 
                                            value={email} 
                                            onChange={e => setEmail(e.target.value)} 
                                            className="w-full bg-black/20 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-white/20 focus:outline-none focus:bg-black/30 focus:border-[#3423A6]/50 transition-all font-medium"
                                            placeholder="Email Address"
                                            required 
                                        />
                                     </div>

                                     {/* Register-only fields */}
                                     {authMode === 'register' && (
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
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[#DFF3E4] transition-colors z-10">
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
                                                        {filteredCountries.slice(0, 10).map(c => (
                                                            <button 
                                                                key={c.code}
                                                                type="button"
                                                                onClick={() => {
                                                                    setCountry(c.name);
                                                                    setCountrySearch(c.name);
                                                                    setShowCountrySuggestions(false);
                                                                }}
                                                                className="w-full text-left px-5 py-3 hover:bg-white/10 flex items-center gap-3 text-white text-sm transition-colors"
                                                            >
                                                                <span className="text-lg">{getFlagEmoji(c.code)}</span>
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
                                            placeholder={authMode === 'register' ? "Password (min 6 characters)" : "Password"}
                                            required 
                                        />
                                     </div>

                                     {/* Privacy Policy Checkbox */}
                                     {authMode === 'register' && (
                                        <div className="flex items-start gap-3 p-2">
                                            <input 
                                                type="checkbox" 
                                                id="privacy"
                                                checked={privacyAccepted} 
                                                onChange={e => setPrivacyAccepted(e.target.checked)}
                                                className="mt-0.5 w-5 h-5 accent-[#3423A6] rounded cursor-pointer" 
                                            />
                                            <label htmlFor="privacy" className="text-white/50 text-[11px] leading-tight font-medium cursor-pointer">
                                                I accept the <span className="text-[#DFF3E4] underline">Privacy Policy</span> and <span className="text-[#DFF3E4] underline">Terms of Service</span>.
                                            </label>
                                        </div>
                                     )}
                                </div>
                                
                                {/* Submit Button */}
                                <button 
                                    type="submit" 
                                    disabled={isLoading || (authMode === 'register' && !privacyAccepted)}
                                    className="w-full py-4 mt-2 bg-[#3423A6] hover:bg-[#4330c9] disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-2xl font-bold text-lg shadow-lg shadow-[#3423A6]/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    {isLoading ? (
                                        <Icons.RefreshCw className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            <span>{authMode === 'login' ? 'Log In' : 'Create Account'}</span>
                                            <Icons.ArrowRight className="w-5 h-5" />
                                        </>
                                    )}
                                </button>

                                {/* Forgot Password Link */}
                                {authMode === 'login' && (
                                    <button 
                                        type="button"
                                        onClick={() => { setAuthMode('forgot'); setMessage(''); }}
                                        className="w-full py-2 text-white/40 hover:text-white/60 text-xs font-medium transition-colors"
                                    >
                                        Forgot password?
                                    </button>
                                )}
                            </form>
                        </>
                    )}
                </div>

                {/* Footer */}
                <p className="text-white/20 text-[10px] mt-6 text-center">
                    © {new Date().getFullYear()} InJazi. All rights reserved.
                </p>
            </div>
        </div>
    );
}
