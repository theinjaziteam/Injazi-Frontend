// views/SettingsView.tsx
import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { AppView, COUNTRIES } from '../types';
import { Icons, Button, Toggle, Card, Badge } from '../components/UIComponents';
import { api } from '../services/api';

export default function SettingsView() {
    const { user, setUser, setView, setIsAuthenticated } = useApp();
    const [editMode, setEditMode] = useState(false);
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [pwd, setPwd] = useState(user?.password || '');
    const [showPwd, setShowPwd] = useState(false);
    const [country, setCountry] = useState(user?.country || '');
    const [showCountryPicker, setShowCountryPicker] = useState(false);
    const [showPlans, setShowPlans] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Sync state with user data
    useEffect(() => {
        if (user) {
            setName(user.name || '');
            setEmail(user.email || '');
            setPwd(user.password || '');
            setCountry(user.country || '');
        }
    }, [user]);

    const updateAndSave = async (updates: Partial<typeof user>) => {
        if (!user) return;
        
        setIsSaving(true);
        const updatedUser = { ...user, ...updates };
        setUser(updatedUser);
        
        try {
            console.log("💾 Saving Settings...");
            await api.sync(updatedUser);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000);
        } catch (e) {
            console.error("Settings Save Failed", e);
            alert("Could not save settings. Check connection.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveProfile = async () => {
        await updateAndSave({ name, email, password: pwd, country });
        setEditMode(false);
    };

    const handleCancelEdit = () => {
        setName(user?.name || '');
        setEmail(user?.email || '');
        setPwd(user?.password || '');
        setCountry(user?.country || '');
        setEditMode(false);
    };

    const handlePlanSelect = async (planId: string, isPremium: boolean) => {
        await updateAndSave({
            activePlanId: planId,
            isPremium: isPremium,
            maxGoalSlots: planId === 'free' ? 3 : 99,
        });
        setShowPlans(false);
    };

    const toggleAppConnection = (appId: string) => {
        if (!user?.connectedApps) return;
        
        const updatedApps = user.connectedApps.map(app => 
            app.id === appId ? { ...app, isConnected: !app.isConnected } : app
        );
        updateAndSave({ connectedApps: updatedApps });
    };

    const handleLogout = () => {
        if (window.confirm('Are you sure you want to log out?')) {
            localStorage.removeItem('injazi_token');
            localStorage.removeItem('injazi_user');
            setIsAuthenticated(false);
            setView(AppView.LOGIN);
        }
    };

    const handleDeleteAccount = () => {
        if (window.confirm('⚠️ This action is irreversible!\n\nAre you sure you want to delete your account and all associated data?')) {
            if (window.confirm('Final confirmation: Delete account permanently?')) {
                localStorage.clear();
                setIsAuthenticated(false);
                setView(AppView.LOGIN);
            }
        }
    };

    if (!user) {
        return (
            <div className="h-full flex items-center justify-center bg-white">
                <div className="text-center">
                    <Icons.RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
                    <p className="text-gray-500">Loading settings...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 overflow-y-auto">
            {/* NON-STICKY HEADER - Scrolls with content */}
            <div className="bg-white border-b border-gray-100">
                <div className="p-6 flex items-center gap-4">
                    <button 
                        onClick={() => setView(AppView.DASHBOARD)} 
                        className="p-2.5 hover:bg-gray-100 rounded-2xl transition-all duration-200 active:scale-95"
                    >
                        <Icons.ChevronLeft className="w-6 h-6 text-primary"/>
                    </button>
                    <div className="flex-1">
                        <h1 className="text-2xl font-black text-primary uppercase tracking-tight">Settings</h1>
                        <p className="text-xs text-gray-400 font-medium">Manage your account & preferences</p>
                    </div>
                    {saveSuccess && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100 rounded-full">
                            <Icons.Check className="w-4 h-4 text-emerald-600" />
                            <span className="text-xs font-bold text-emerald-600">Saved</span>
                        </div>
                    )}
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="p-4 space-y-6 pb-24">
                
                {/* ============ WALLET SECTION ============ */}
                <section>
                    <div className="grid grid-cols-2 gap-3">
                        {/* Credits Card */}
                        <div className="p-5 bg-primary rounded-3xl shadow-lg shadow-primary/20 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
                            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/5 rounded-full" />
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-2">
                                    <Icons.Coins className="w-4 h-4 text-white/60" />
                                    <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Credits</span>
                                </div>
                                <div className="text-3xl font-black text-white">
                                    {(user.credits || 0).toLocaleString()}
                                </div>
                            </div>
                        </div>
                        
                        {/* Balance Card */}
                        <div className="p-5 bg-emerald-600 rounded-3xl shadow-lg shadow-emerald-500/20 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
                            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/5 rounded-full" />
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-2">
                                    <Icons.TrendingUp className="w-4 h-4 text-white/60" />
                                    <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Balance</span>
                                </div>
                                <div className="text-3xl font-black text-white">
                                    ${(user.realMoneyBalance || 0).toFixed(2)}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ============ MEMBERSHIP CARD ============ */}
                <section>
                    <div className={`p-6 rounded-3xl border-2 transition-all duration-300 bg-white ${
                        user.isPremium ? 'border-secondary shadow-lg shadow-secondary/10' : 'border-gray-100'
                    }`}>
                        <div className="flex justify-between items-start mb-5">
                            <div>
                                <div className="text-[10px] font-bold text-secondary uppercase tracking-[0.2em] mb-1">
                                    Active Membership
                                </div>
                                <h3 className="text-xl font-black text-primary">
                                    {user.activePlanId === 'creator' ? 'Creator Architect' : 
                                     user.activePlanId === 'premium' ? 'Premium Architect' : 
                                     'Free Standard'}
                                </h3>
                            </div>
                            {user.isPremium && (
                                <div className="px-3 py-1 bg-secondary text-white text-[10px] font-black rounded-full uppercase tracking-wider">
                                    PRO
                                </div>
                            )}
                        </div>
                        
                        {/* Plan features preview */}
                        <div className="flex flex-wrap gap-2 mb-5">
                            {user.activePlanId === 'free' ? (
                                <>
                                    <span className="px-2.5 py-1 bg-gray-100 rounded-lg text-[10px] font-bold text-gray-600">3 Goals</span>
                                    <span className="px-2.5 py-1 bg-gray-100 rounded-lg text-[10px] font-bold text-gray-600">3 AI Tasks/Day</span>
                                    <span className="px-2.5 py-1 bg-gray-100 rounded-lg text-[10px] font-bold text-gray-600">Ad Supported</span>
                                </>
                            ) : user.activePlanId === 'premium' ? (
                                <>
                                    <span className="px-2.5 py-1 bg-secondary/10 rounded-lg text-[10px] font-bold text-secondary">Unlimited Goals</span>
                                    <span className="px-2.5 py-1 bg-secondary/10 rounded-lg text-[10px] font-bold text-secondary">No Ads</span>
                                    <span className="px-2.5 py-1 bg-secondary/10 rounded-lg text-[10px] font-bold text-secondary">AI Coaching</span>
                                </>
                            ) : (
                                <>
                                    <span className="px-2.5 py-1 bg-secondary/10 rounded-lg text-[10px] font-bold text-secondary">All Premium</span>
                                    <span className="px-2.5 py-1 bg-secondary/10 rounded-lg text-[10px] font-bold text-secondary">Sell Courses</span>
                                    <span className="px-2.5 py-1 bg-secondary/10 rounded-lg text-[10px] font-bold text-secondary">Creator Tools</span>
                                </>
                            )}
                        </div>
                        
                        <button 
                            onClick={() => setShowPlans(true)} 
                            className="w-full py-3.5 px-6 border-2 border-secondary text-secondary rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-200 hover:bg-secondary hover:text-white active:scale-[0.98]"
                        >
                            {user.isPremium ? 'Manage Membership' : 'Upgrade Plan'}
                        </button>
                    </div>
                </section>

                {/* ============ PROFILE SECTION ============ */}
                <section>
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-primary/10 rounded-xl">
                                <Icons.User className="w-5 h-5 text-primary"/>
                            </div>
                            <h2 className="text-lg font-black text-primary">Profile</h2>
                        </div>
                        {!editMode ? (
                            <button 
                                onClick={() => setEditMode(true)} 
                                className="px-4 py-2 bg-secondary/10 rounded-xl text-xs font-black text-secondary uppercase tracking-wider transition-all hover:bg-secondary/20 active:scale-95"
                            >
                                Edit
                            </button>
                        ) : (
                            <div className="flex gap-2">
                                <button 
                                    onClick={handleCancelEdit} 
                                    className="px-4 py-2 bg-gray-100 rounded-xl text-xs font-black text-gray-500 uppercase tracking-wider transition-all hover:bg-gray-200 active:scale-95"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleSaveProfile}
                                    disabled={isSaving}
                                    className="px-4 py-2 bg-secondary rounded-xl text-xs font-black text-white uppercase tracking-wider transition-all hover:bg-secondary/90 active:scale-95 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isSaving ? (
                                        <>
                                            <Icons.RefreshCw className="w-3 h-3 animate-spin" />
                                            Saving
                                        </>
                                    ) : (
                                        'Save'
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                    
                    <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
                        {/* Name Field */}
                        <div className="p-5 border-b border-gray-50">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                                Full Name
                            </label>
                            {editMode ? (
                                <input 
                                    value={name} 
                                    onChange={e => setName(e.target.value)} 
                                    className="w-full p-3.5 bg-gray-50 rounded-xl border-2 border-gray-100 font-bold text-primary text-base focus:border-secondary focus:outline-none transition-colors"
                                    placeholder="Enter your name"
                                />
                            ) : (
                                <div className="text-primary font-black text-lg">{user.name || 'Not set'}</div>
                            )}
                        </div>
                        
                        {/* Email Field */}
                        <div className="p-5 border-b border-gray-50">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                                Email Address
                            </label>
                            {editMode ? (
                                <input 
                                    type="email"
                                    value={email} 
                                    onChange={e => setEmail(e.target.value)} 
                                    className="w-full p-3.5 bg-gray-50 rounded-xl border-2 border-gray-100 font-bold text-primary text-base focus:border-secondary focus:outline-none transition-colors"
                                    placeholder="Enter your email"
                                />
                            ) : (
                                <div className="text-primary font-bold">{user.email || 'Not set'}</div>
                            )}
                        </div>
                        
                        {/* Password Field */}
                        <div className="p-5 border-b border-gray-50">
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                    Password
                                </label>
                                {editMode && (
                                    <button 
                                        onClick={() => setShowPwd(!showPwd)} 
                                        className="text-[9px] font-black text-secondary uppercase tracking-widest flex items-center gap-1 hover:text-secondary/80 transition-colors"
                                    >
                                        {showPwd ? (
                                            <><Icons.EyeOff className="w-3 h-3" /> Hide</>
                                        ) : (
                                            <><Icons.Eye className="w-3 h-3" /> Show</>
                                        )}
                                    </button>
                                )}
                            </div>
                            {editMode ? (
                                <input 
                                    type={showPwd ? "text" : "password"} 
                                    value={pwd} 
                                    onChange={e => setPwd(e.target.value)} 
                                    className="w-full p-3.5 bg-gray-50 rounded-xl border-2 border-gray-100 font-bold text-primary text-base focus:border-secondary focus:outline-none transition-colors"
                                    placeholder="Enter password"
                                />
                            ) : (
                                <div className="text-primary font-bold">••••••••</div>
                            )}
                        </div>
                        
                        {/* Country Field */}
                        <div className="p-5 border-b border-gray-50">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                                Country
                            </label>
                            {editMode ? (
                                <button
                                    onClick={() => setShowCountryPicker(true)}
                                    className="w-full p-3.5 bg-gray-50 rounded-xl border-2 border-gray-100 font-bold text-primary text-base text-left flex items-center justify-between hover:border-secondary transition-colors"
                                >
                                    <span>{country || 'Select country'}</span>
                                    <Icons.ChevronDown className="w-5 h-5 text-gray-400" />
                                </button>
                            ) : (
                                <div className="text-primary font-bold">{user.country || 'Not set'}</div>
                            )}
                        </div>
                        
                        {/* Account Info */}
                        <div className="p-5 bg-gray-50/50">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-wider block mb-1">
                                        Member Since
                                    </label>
                                    <div className="text-sm font-bold text-primary">
                                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric'
                                        }) : 'N/A'}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-wider block mb-1">
                                        User ID
                                    </label>
                                    <div className="text-sm font-bold text-primary font-mono">
                                        #{user.id?.slice(-8).toUpperCase() || 'N/A'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ============ CONNECTED APPS ============ */}
                {user.connectedApps && user.connectedApps.length > 0 && (
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 bg-primary/10 rounded-xl">
                                <Icons.Link className="w-5 h-5 text-primary"/>
                            </div>
                            <h2 className="text-lg font-black text-primary">Connected Apps</h2>
                        </div>
                        
                        <div className="space-y-3">
                            {user.connectedApps.map(app => (
                                <div 
                                    key={app.id} 
                                    className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between transition-all duration-200 hover:shadow-md"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-2xl transition-all duration-300 ${
                                            app.isConnected 
                                                ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                                                : 'bg-gray-100 text-gray-400'
                                        }`}>
                                            <Icons.Activity className="w-5 h-5"/>
                                        </div>
                                        <div>
                                            <span className="font-bold text-primary block">{app.name}</span>
                                            <span className={`text-[10px] font-bold uppercase tracking-widest ${
                                                app.isConnected ? 'text-emerald-500' : 'text-gray-400'
                                            }`}>
                                                {app.isConnected ? '● Connected' : '○ Disconnected'}
                                            </span>
                                        </div>
                                    </div>
                                    <Toggle 
                                        checked={app.isConnected} 
                                        onChange={() => toggleAppConnection(app.id)} 
                                    />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* ============ PREFERENCES ============ */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 bg-primary/10 rounded-xl">
                            <Icons.Settings className="w-5 h-5 text-primary"/>
                        </div>
                        <h2 className="text-lg font-black text-primary">Preferences</h2>
                    </div>
                    
                    <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
                        <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Icons.Bell className="w-5 h-5 text-gray-400" />
                                <span className="font-medium text-primary">Push Notifications</span>
                            </div>
                            <Toggle checked={true} onChange={() => {}} />
                        </div>
                        
                        <div className="h-px bg-gray-100" />
                        
                        <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Icons.Sun className="w-5 h-5 text-gray-400" />
                                <span className="font-medium text-primary">Dark Mode</span>
                            </div>
                            <Toggle checked={false} onChange={() => {}} />
                        </div>
                        
                        <div className="h-px bg-gray-100" />
                        
                        <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Icons.Mic className="w-5 h-5 text-gray-400" />
                                <span className="font-medium text-primary">Sound Effects</span>
                            </div>
                            <Toggle checked={true} onChange={() => {}} />
                        </div>
                    </div>
                </section>

                {/* ============ LEGAL & SUPPORT ============ */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 bg-primary/10 rounded-xl">
                            <Icons.Shield className="w-5 h-5 text-primary"/>
                        </div>
                        <h2 className="text-lg font-black text-primary">Legal & Support</h2>
                    </div>
                    
                    <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
                        <button
                            onClick={() => setView(AppView.LEGAL)}
                            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors active:bg-gray-100"
                        >
                            <div className="flex items-center gap-3">
                                <Icons.FileText className="w-5 h-5 text-gray-400" />
                                <span className="font-medium text-primary">Terms of Service</span>
                            </div>
                            <Icons.ChevronRight className="w-5 h-5 text-gray-300" />
                        </button>
                        
                        <div className="h-px bg-gray-100" />
                        
                        <button
                            onClick={() => setView(AppView.LEGAL)}
                            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors active:bg-gray-100"
                        >
                            <div className="flex items-center gap-3">
                                <Icons.Lock className="w-5 h-5 text-gray-400" />
                                <span className="font-medium text-primary">Privacy Policy</span>
                            </div>
                            <Icons.ChevronRight className="w-5 h-5 text-gray-300" />
                        </button>
                        
                        <div className="h-px bg-gray-100" />
                        
                        <button
                            onClick={() => window.open('mailto:support@injazi.app', '_blank')}
                            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors active:bg-gray-100"
                        >
                            <div className="flex items-center gap-3">
                                <Icons.HelpCircle className="w-5 h-5 text-gray-400" />
                                <span className="font-medium text-primary">Help & Support</span>
                            </div>
                            <Icons.ChevronRight className="w-5 h-5 text-gray-300" />
                        </button>
                        
                        <div className="h-px bg-gray-100" />
                        
                        <button
                            onClick={() => window.open('mailto:feedback@injazi.app', '_blank')}
                            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors active:bg-gray-100"
                        >
                            <div className="flex items-center gap-3">
                                <Icons.MessageCircle className="w-5 h-5 text-gray-400" />
                                <span className="font-medium text-primary">Send Feedback</span>
                            </div>
                            <Icons.ChevronRight className="w-5 h-5 text-gray-300" />
                        </button>
                    </div>
                </section>

                {/* ============ DANGER ZONE ============ */}
                <section>
                    <div className="space-y-3">
                        {/* Logout Button */}
                        <button 
                            onClick={handleLogout}
                            className="w-full p-4 bg-white border-2 border-gray-200 rounded-2xl text-primary font-bold flex items-center justify-center gap-3 hover:bg-gray-50 transition-all duration-200 active:scale-[0.98]"
                        >
                            <Icons.LogOut className="w-5 h-5" />
                            <span>Log Out</span>
                        </button>
                        
                        {/* Delete Account Button */}
                        <button 
                            onClick={handleDeleteAccount}
                            className="w-full p-4 bg-red-50 border-2 border-red-100 rounded-2xl text-red-500 font-bold flex items-center justify-center gap-3 hover:bg-red-100 hover:border-red-200 transition-all duration-200 active:scale-[0.98]"
                        >
                            <Icons.Trash className="w-5 h-5" />
                            <span>Delete Account</span>
                        </button>
                    </div>
                </section>

                {/* ============ APP VERSION ============ */}
                <div className="text-center py-6">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full mb-2">
                        <Icons.Smartphone className="w-4 h-4 text-gray-400" />
                        <span className="text-xs font-bold text-gray-500">InJazi v1.0.0</span>
                    </div>
                    <p className="text-[10px] text-gray-400">© 2024 InJazi. All rights reserved.</p>
                </div>
            </div>

            {/* ============ PLANS MODAL ============ */}
            {showPlans && (
                <div 
                    className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
                    onClick={(e) => e.target === e.currentTarget && setShowPlans(false)}
                >
                    <div className="w-full max-w-md bg-white rounded-t-[2rem] sm:rounded-[2rem] max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-black text-primary">Choose Plan</h2>
                                <p className="text-xs text-gray-400 mt-1">Select the best plan for you</p>
                            </div>
                            <button 
                                onClick={() => setShowPlans(false)} 
                                className="p-2.5 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                            >
                                <Icons.X className="w-5 h-5 text-primary"/>
                            </button>
                        </div>
                        
                        {/* Plans List */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {[
                                { 
                                    id: 'free', 
                                    name: 'Free', 
                                    price: '$0', 
                                    period: 'forever',
                                    description: 'Perfect for getting started',
                                    features: ['3 Goals Maximum', '3 AI Tasks per Day', 'Daily Questions', 'Basic Analytics', 'Community Access'],
                                    isPremium: false
                                },
                                { 
                                    id: 'premium', 
                                    name: 'Premium', 
                                    price: '$9.99', 
                                    period: '/month',
                                    description: 'For serious achievers',
                                    features: ['Unlimited Goals', 'Unlimited AI Tasks', 'Advanced AI Coaching', 'Deep Analytics', 'No Advertisements', 'Priority Support'],
                                    isPremium: true,
                                    popular: true
                                },
                                { 
                                    id: 'creator', 
                                    name: 'Creator', 
                                    price: '$19.99', 
                                    period: '/month',
                                    description: 'Build your audience',
                                    features: ['Everything in Premium', 'Create & Sell Courses', 'Run Advertisements', 'Creator Dashboard', 'Revenue Analytics', 'Dedicated Support'],
                                    isPremium: true
                                }
                            ].map((plan) => {
                                const isCurrent = user.activePlanId === plan.id;
                                
                                return (
                                    <div 
                                        key={plan.id}
                                        className={`relative p-5 rounded-2xl border-2 transition-all duration-300 ${
                                            isCurrent 
                                                ? 'border-secondary bg-secondary/5' 
                                                : 'border-gray-100 bg-white hover:border-gray-200'
                                        }`}
                                    >
                                        {plan.popular && !isCurrent && (
                                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-secondary text-white text-[9px] font-black rounded-full uppercase tracking-wider">
                                                Most Popular
                                            </div>
                                        )}
                                        
                                        {isCurrent && (
                                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-emerald-500 text-white text-[9px] font-black rounded-full uppercase tracking-wider">
                                                Current Plan
                                            </div>
                                        )}
                                        
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="text-lg font-black text-primary">{plan.name}</h3>
                                                <p className="text-xs text-gray-400">{plan.description}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-2xl font-black text-primary">{plan.price}</span>
                                                <span className="text-xs text-gray-400">{plan.period}</span>
                                            </div>
                                        </div>
                                        
                                        <ul className="space-y-2 mb-5">
                                            {plan.features.map((feature, idx) => (
                                                <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                                                    <Icons.Check className={`w-4 h-4 flex-shrink-0 ${
                                                        isCurrent ? 'text-secondary' : 'text-emerald-500'
                                                    }`} />
                                                    {feature}
                                                </li>
                                            ))}
                                        </ul>
                                        
                                        {!isCurrent && (
                                            <button 
                                                onClick={() => handlePlanSelect(plan.id, plan.isPremium)}
                                                className={`w-full py-3 rounded-xl font-bold text-sm transition-all duration-200 active:scale-[0.98] ${
                                                    plan.id === 'premium'
                                                        ? 'bg-secondary text-white hover:bg-secondary/90'
                                                        : plan.id === 'creator'
                                                        ? 'bg-primary text-white hover:bg-primary/90'
                                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                            >
                                                {plan.isPremium ? 'Upgrade Now' : 'Downgrade'}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        
                        {/* Modal Footer */}
                        <div className="p-4 border-t border-gray-100 bg-gray-50">
                            <p className="text-[10px] text-gray-400 text-center">
                                Plans renew automatically. Cancel anytime in settings.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* ============ COUNTRY PICKER MODAL ============ */}
            {showCountryPicker && (
                <div 
                    className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
                    onClick={(e) => e.target === e.currentTarget && setShowCountryPicker(false)}
                >
                    <div className="w-full max-w-md bg-white rounded-t-[2rem] sm:rounded-[2rem] max-h-[70vh] overflow-hidden flex flex-col">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-xl font-black text-primary">Select Country</h2>
                            <button 
                                onClick={() => setShowCountryPicker(false)} 
                                className="p-2.5 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                            >
                                <Icons.X className="w-5 h-5 text-primary"/>
                            </button>
                        </div>
                        
                        {/* Countries List */}
                        <div className="flex-1 overflow-y-auto">
                            {(COUNTRIES || ['United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 'Saudi Arabia', 'UAE', 'Egypt', 'Other']).map((c: string) => (
                                <button
                                    key={c}
                                    onClick={() => {
                                        setCountry(c);
                                        setShowCountryPicker(false);
                                    }}
                                    className={`w-full p-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors ${
                                        country === c ? 'bg-secondary/5' : ''
                                    }`}
                                >
                                    <span className={`font-medium ${country === c ? 'text-secondary' : 'text-primary'}`}>
                                        {c}
                                    </span>
                                    {country === c && (
                                        <Icons.Check className="w-5 h-5 text-secondary" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
