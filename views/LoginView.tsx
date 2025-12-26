import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { AppView, COUNTRIES } from '../types';
import { Icons } from '../components/UIComponents';
import { api } from '../services/api'; // <--- IMPORT THE API

export default function LoginView() {
    const { setIsAuthenticated, setView, setUser } = useApp();
    const [isLoginMode, setIsLoginMode] = useState(true);
    
    // Form State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [country, setCountry] = useState('');
    const [privacyAccepted, setPrivacyAccepted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

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

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (countryInputRef.current && !countryInputRef.current.contains(event.target as Node)) {
                setShowCountrySuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!isLoginMode && (!name || !country || !privacyAccepted)) {
            alert("Please fill all required fields and accept privacy policy.");
            return;
        }
        
        setIsLoading(true);
        
        try {
            console.log("🚀 Attempting Auth...");
            // CALL THE REAL SERVER
            const userFromDB = await api.auth({
                email,
                password,
                name: !isLoginMode ? name : undefined,
                country: !isLoginMode ? country : undefined,
                isRegister: !isLoginMode
            });

            console.log("✅ Auth Success:", userFromDB);

            // Update Global State
            setUser(userFromDB);
            setIsAuthenticated(true);

            // Routing Logic
            if (userFromDB.goal) {
                setView(AppView.DASHBOARD);
            } else {
                setView(AppView.ONBOARDING);
            }

        } catch (error: any) {
            console.error("Auth Failed:", error);
            alert(error.message || "Connection Error. Is the backend server running?");
        } finally {
            setIsLoading(false);
        }
    };

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
                    
                    {/* Toggle Switch */}
                    <div className="flex relative bg-black/20 rounded-3xl p-1 mb-6">
                        <div 
                            className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white/10 rounded-2xl transition-all duration-300 shadow-sm ${isLoginMode ? 'left-1' : 'left-[calc(50%+4px)]'}`}
                        ></div>
                        <button 
                            onClick={() => setIsLoginMode(true)} 
                            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider z-10 transition-colors ${isLoginMode ? 'text-white' : 'text-white/40'}`}
                        >
                            Log In
                        </button>
                        <button 
                            onClick={() => setIsLoginMode(false)} 
                            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider z-10 transition-colors ${!isLoginMode ? 'text-white' : 'text-white/40'}`}
                        >
                            Sign Up
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleAuth} className="px-6 pb-6 space-y-4">
                        <div className="space-y-4 overflow-y-auto max-h-[50vh] pr-1">
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

                             {!isLoginMode && (
                                <>
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
                                        {showCountrySuggestions && (
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

                             {!isLoginMode && (
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
                            disabled={isLoading || (!isLoginMode && !privacyAccepted)}
                            className="w-full py-4 mt-2 bg-[#3423A6] hover:bg-[#4330c9] disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-2xl font-bold text-lg shadow-[0_0_20px_rgba(52,35,166,0.5)] hover:shadow-[0_0_30px_rgba(52,35,166,0.7)] transition-all active:scale-95 flex items-center justify-center gap-2 group relative overflow-hidden"
                        >
                            {isLoading ? (
                                <Icons.RefreshCw className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <span className="relative z-10">{isLoginMode ? 'Authenticate' : 'Initialize'}</span>
                                    <Icons.ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}