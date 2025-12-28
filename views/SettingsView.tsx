// views/SettingsView.tsx
import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { useTheme } from '../hooks/useTheme';
import { AppView, COUNTRIES } from '../types';
import { Icons, Button, Toggle, Card, Badge } from '../components/UIComponents';
import { api } from '../services/api';

export default function SettingsView() {
    const { user, setUser, setView, setIsAuthenticated } = useApp();
    const { colors, mode, toggle, isLight } = useTheme();
    
    const [editMode, setEditMode] = useState(false);
    const [name, setName] = useState(user.name);
    const [email, setEmail] = useState(user.email);
    const [pwd, setPwd] = useState(user.password || '••••••••');
    const [showPwd, setShowPwd] = useState(false);
    const [country, setCountry] = useState(user.country);
    const [showPrivacy, setShowPrivacy] = useState(false);
    const [showPlans, setShowPlans] = useState(false);

    const updateAndSave = async (updates: Partial<typeof user>) => {
        const updatedUser = { ...user, ...updates };
        setUser(updatedUser);
        try {
            await api.sync(updatedUser);
        } catch (e) {
            console.error("Settings Save Failed", e);
        }
    };

    const handleSaveProfile = () => {
        updateAndSave({ name, email, password: pwd, country });
        setEditMode(false);
    };

    const handlePlanSelect = (planId: string, isPremium: boolean) => {
        updateAndSave({
            activePlanId: planId,
            isPremium: isPremium,
            maxGoalSlots: planId === 'free' ? 3 : 99,
        });
        setShowPlans(false);
    };

    const toggleAppConnection = (appId: string) => {
        const updatedApps = user.connectedApps.map(app => 
            app.id === appId ? { ...app, isConnected: !app.isConnected } : app
        );
        updateAndSave({ connectedApps: updatedApps });
    };

    return (
        <div className="h-full overflow-y-auto pb-safe" style={{ backgroundColor: colors.bgPrimary }}>
            <div className="min-h-full flex flex-col pb-20">
                {/* Header */}
                <div 
                    className="p-6 pt-safe border-b flex items-center gap-4 sticky top-0 z-30"
                    style={{ backgroundColor: colors.bgPrimary, borderColor: colors.cardBorder }}
                >
                    <button 
                        onClick={() => setView(AppView.DASHBOARD)} 
                        className="p-2 mt-2 rounded-full transition-colors"
                        style={{ backgroundColor: colors.bgSecondary }}
                    >
                        <Icons.ChevronLeft className="w-6 h-6" style={{ color: colors.textPrimary }}/>
                    </button>
                    <h1 className="text-2xl font-black mt-2 uppercase tracking-tighter" style={{ color: colors.textPrimary }}>
                        Settings
                    </h1>
                </div>

                <div className="p-6 space-y-8">
                    {/* Appearance Section - NEW */}
                    <section>
                        <h2 className="text-lg font-black mb-4 flex items-center gap-2" style={{ color: colors.textPrimary }}>
                            <Icons.Sun className="w-5 h-5" style={{ color: colors.bgAccentStrong }}/> Appearance
                        </h2>
                        <div 
                            className="p-5 rounded-2xl flex items-center justify-between"
                            style={{ backgroundColor: colors.cardBg, border: `1px solid ${colors.cardBorder}` }}
                        >
                            <div className="flex items-center gap-4">
                                <div 
                                    className="p-3 rounded-xl"
                                    style={{ backgroundColor: colors.bgSecondary }}
                                >
                                    {isLight ? (
                                        <Icons.Sun className="w-5 h-5" style={{ color: colors.textSecondary }} />
                                    ) : (
                                        <Icons.Sun className="w-5 h-5" style={{ color: colors.textSecondary }} />
                                    )}
                                </div>
                                <div>
                                    <span className="font-bold block" style={{ color: colors.textPrimary }}>
                                        {isLight ? 'Light Mode' : 'Dark Mode'}
                                    </span>
                                    <span className="text-xs" style={{ color: colors.textMuted }}>
                                        {isLight ? 'Easy on the eyes during the day' : 'Perfect for night owls'}
                                    </span>
                                </div>
                            </div>
                            <Toggle checked={!isLight} onChange={toggle} />
                        </div>
                    </section>

                    {/* Wallet Section */}
                    <section className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div 
                                className="p-5 rounded-3xl shadow-xl relative overflow-hidden"
                                style={{ backgroundColor: colors.bgAccentStrong }}
                            >
                                <div className="relative z-10">
                                    <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Credits</span>
                                    <div className="text-2xl font-black mt-1 text-white">{(user.credits || 0).toLocaleString()}</div>
                                </div>
                                <Icons.Coins className="absolute -bottom-4 -right-4 w-16 h-16 text-white/10 rotate-12" />
                            </div>
                            <div className="p-5 bg-emerald-600 text-white rounded-3xl shadow-xl relative overflow-hidden">
                                <div className="relative z-10">
                                    <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Balance</span>
                                    <div className="text-2xl font-black mt-1 text-white">${(user.realMoneyBalance || 0).toFixed(2)}</div>
                                </div>
                                <Icons.TrendingUp className="absolute -bottom-4 -right-4 w-16 h-16 text-white/10 -rotate-12" />
                            </div>
                        </div>
                        
                        <div 
                            className="p-6 rounded-2xl"
                            style={{ 
                                backgroundColor: colors.cardBg, 
                                border: `2px solid ${user.isPremium ? colors.bgAccentStrong : colors.cardBorder}` 
                            }}
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1" style={{ color: colors.bgAccentStrong }}>
                                        Active Plan
                                    </div>
                                    <h3 className="text-xl font-black" style={{ color: colors.textPrimary }}>
                                        {user.activePlanId === 'creator' ? 'Creator' : user.activePlanId === 'premium' ? 'Premium' : 'Free'}
                                    </h3>
                                </div>
                                {user.isPremium && <Badge color="bg-[#A7B0F4] text-white">PRO</Badge>}
                            </div>
                            <button 
                                onClick={() => setShowPlans(true)} 
                                className="px-6 py-3 rounded-xl text-sm font-bold border-2 transition-all active:scale-[0.98]"
                                style={{ borderColor: colors.bgAccentStrong, color: colors.bgAccentStrong }}
                            >
                                Manage Plan
                            </button>
                        </div>
                    </section>

                    {/* Profile Section */}
                    <section>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-black flex items-center gap-2" style={{ color: colors.textPrimary }}>
                                <Icons.User className="w-5 h-5" style={{ color: colors.bgAccentStrong }}/> Profile
                            </h2>
                            <button 
                                onClick={() => editMode ? handleSaveProfile() : setEditMode(true)} 
                                className="text-xs font-black uppercase tracking-widest"
                                style={{ color: colors.bgAccentStrong }}
                            >
                                {editMode ? 'Save' : 'Edit'}
                            </button>
                        </div>
                        <div 
                            className="p-6 rounded-2xl"
                            style={{ backgroundColor: colors.cardBg, border: `1px solid ${colors.cardBorder}` }}
                        >
                            <div className="space-y-6">
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-widest" style={{ color: colors.textMuted }}>Name</label>
                                    {editMode ? (
                                        <input 
                                            value={name} 
                                            onChange={e => setName(e.target.value)} 
                                            className="w-full mt-2 p-3 rounded-xl border font-bold"
                                            style={{ backgroundColor: colors.bgPrimary, borderColor: colors.cardBorder, color: colors.textPrimary }}
                                        />
                                    ) : (
                                        <div className="text-lg font-black mt-1" style={{ color: colors.textPrimary }}>{user.name}</div>
                                    )}
                                </div>
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-widest" style={{ color: colors.textMuted }}>Email</label>
                                    {editMode ? (
                                        <input 
                                            value={email} 
                                            onChange={e => setEmail(e.target.value)} 
                                            className="w-full mt-2 p-3 rounded-xl border font-bold"
                                            style={{ backgroundColor: colors.bgPrimary, borderColor: colors.cardBorder, color: colors.textPrimary }}
                                        />
                                    ) : (
                                        <div className="font-bold mt-1" style={{ color: colors.textPrimary }}>{user.email}</div>
                                    )}
                                </div>
                                <div className="pt-4 grid grid-cols-2 gap-4" style={{ borderTop: `1px solid ${colors.cardBorder}` }}>
                                    <div>
                                        <label className="text-[8px] font-black uppercase" style={{ color: colors.textMuted }}>Country</label>
                                        <div className="text-xs font-bold" style={{ color: colors.textPrimary }}>{user.country}</div>
                                    </div>
                                    <div>
                                        <label className="text-[8px] font-black uppercase" style={{ color: colors.textMuted }}>Joined</label>
                                        <div className="text-xs font-bold" style={{ color: colors.textPrimary }}>{new Date(user.createdAt).toLocaleDateString()}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Connected Apps */}
                    <section>
                        <h2 className="text-lg font-black mb-4 flex items-center gap-2" style={{ color: colors.textPrimary }}>
                            <Icons.Link className="w-5 h-5" style={{ color: colors.bgAccentStrong }}/> Connected Apps
                        </h2>
                        <div className="space-y-3">
                            {user.connectedApps.map(app => (
                                <div 
                                    key={app.id} 
                                    className="p-4 rounded-2xl flex items-center justify-between"
                                    style={{ backgroundColor: colors.cardBg, border: `1px solid ${colors.cardBorder}` }}
                                >
                                    <div className="flex items-center gap-4">
                                        <div 
                                            className="p-3 rounded-xl"
                                            style={{ 
                                                backgroundColor: app.isConnected ? colors.bgAccentStrong : colors.bgSecondary,
                                                color: app.isConnected ? '#FFFFFF' : colors.textMuted
                                            }}
                                        >
                                            <Icons.Activity className="w-5 h-5"/>
                                        </div>
                                        <div>
                                            <span className="font-bold block" style={{ color: colors.textPrimary }}>{app.name}</span>
                                            <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: colors.textMuted }}>
                                                {app.isConnected ? 'Connected' : 'Offline'}
                                            </span>
                                        </div>
                                    </div>
                                    <Toggle checked={app.isConnected} onChange={() => toggleAppConnection(app.id)} />
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Privacy & Legal */}
                    <section>
                        <h2 className="text-lg font-black mb-4 flex items-center gap-2" style={{ color: colors.textPrimary }}>
                            <Icons.Shield className="w-5 h-5" style={{ color: colors.bgAccentStrong }}/> Privacy
                        </h2>
                        <div className="space-y-3">
                            <button 
                                onClick={() => setShowPrivacy(true)} 
                                className="w-full text-left p-5 rounded-2xl font-bold text-xs flex justify-between items-center active:scale-[0.98] transition-all"
                                style={{ backgroundColor: colors.bgSecondary, color: colors.textPrimary }}
                            >
                                Privacy Policy <Icons.ChevronRight className="w-4 h-4 opacity-30"/>
                            </button>
                            <div 
                                className="w-full text-left p-5 rounded-2xl font-bold text-xs flex justify-between items-center opacity-50"
                                style={{ backgroundColor: colors.bgSecondary, color: colors.textPrimary }}
                            >
                                Terms of Service <Icons.ChevronRight className="w-4 h-4 opacity-30"/>
                            </div>
                        </div>
                    </section>

                    {/* Logout */}
                    <button 
                        onClick={() => setIsAuthenticated(false)} 
                        className="w-full flex items-center justify-center gap-2 text-red-500 font-black text-sm py-5 hover:bg-red-50 rounded-2xl transition-all"
                    >
                        <Icons.LogOut className="w-5 h-5"/> Sign Out
                    </button>
                </div>
            </div>

            {/* Plans Modal */}
            {showPlans && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-6" style={{ backgroundColor: colors.overlay }}>
                    <div 
                        className="p-8 w-full max-w-sm rounded-3xl relative overflow-hidden flex flex-col max-h-[85vh]"
                        style={{ backgroundColor: colors.cardBg }}
                    >
                        <button 
                            onClick={() => setShowPlans(false)} 
                            className="absolute top-6 right-6 p-2 rounded-full z-20"
                            style={{ backgroundColor: colors.bgSecondary }}
                        >
                            <Icons.X className="w-4 h-4" style={{ color: colors.textPrimary }}/>
                        </button>
                        <h2 className="text-2xl font-black mb-6 text-center" style={{ color: colors.textPrimary }}>Plans</h2>
                        
                        <div className="flex-1 overflow-y-auto space-y-4">
                            {[
                                { id: 'free', name: 'Free', price: 'Free', features: ['3 Goals', 'Basic AI', 'Ads'], isCurrent: user.activePlanId === 'free', isPremium: false },
                                { id: 'premium', name: 'Premium', price: '$9.99/mo', features: ['Unlimited Goals', 'No Ads', 'Advanced AI'], isCurrent: user.activePlanId === 'premium', isPremium: true },
                                { id: 'creator', name: 'Creator', price: '$19.99/mo', features: ['Everything in Premium', 'Sell Courses', 'Analytics'], isCurrent: user.activePlanId === 'creator', isPremium: true }
                            ].map((plan) => (
                                <div 
                                    key={plan.id} 
                                    className="p-6 rounded-2xl border-2 transition-all"
                                    style={{ 
                                        backgroundColor: plan.isCurrent ? colors.bgAccentStrong : colors.bgPrimary,
                                        borderColor: plan.isCurrent ? colors.bgAccentStrong : colors.cardBorder,
                                        color: plan.isCurrent ? '#FFFFFF' : colors.textPrimary
                                    }}
                                >
                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className="font-black text-sm uppercase">{plan.name}</h4>
                                        <span className="font-black">{plan.price}</span>
                                    </div>
                                    <ul className="space-y-2 mb-4">
                                        {plan.features.map((feat, idx) => (
                                            <li key={idx} className="flex items-center gap-2 text-xs font-bold opacity-80">
                                                <Icons.Check className="w-3 h-3"/> {feat}
                                            </li>
                                        ))}
                                    </ul>
                                    {!plan.isCurrent && (
                                        <button 
                                            onClick={() => handlePlanSelect(plan.id, plan.isPremium)} 
                                            className="w-full py-3 rounded-xl font-bold text-sm text-white"
                                            style={{ backgroundColor: colors.bgAccentStrong }}
                                        >
                                            {plan.id === 'free' ? 'Downgrade' : 'Upgrade'}
                                        </button>
                                    )}
                                    {plan.isCurrent && (
                                        <div className="text-center text-xs font-bold uppercase py-2 opacity-80">Current Plan</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Privacy Modal */}
            {showPrivacy && (
                <div className="fixed inset-0 z-[100] p-8 pt-safe overflow-y-auto" style={{ backgroundColor: colors.bgPrimary }}>
                    <div className="flex justify-between items-center mb-10 mt-2">
                        <h2 className="text-2xl font-black" style={{ color: colors.textPrimary }}>Privacy Policy</h2>
                        <button onClick={() => setShowPrivacy(false)} className="p-3 rounded-full" style={{ backgroundColor: colors.bgSecondary }}>
                            <Icons.X style={{ color: colors.textPrimary }}/>
                        </button>
                    </div>
                    <div className="space-y-6" style={{ color: colors.textSecondary }}>
                        <p>InJazi protects your data with industry-standard encryption.</p>
                        <div className="p-6 rounded-2xl" style={{ backgroundColor: colors.bgSecondary }}>
                            <h4 className="font-black text-xs uppercase mb-3" style={{ color: colors.textPrimary }}>Data Protection</h4>
                            <p className="text-sm">Your goals and progress are encrypted and never shared with third parties.</p>
                        </div>
                        <div className="p-6 rounded-2xl" style={{ backgroundColor: colors.bgSecondary }}>
                            <h4 className="font-black text-xs uppercase mb-3" style={{ color: colors.textPrimary }}>Your Rights</h4>
                            <p className="text-sm">You can export or delete your data at any time from your account settings.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
