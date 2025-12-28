import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { useTheme } from '../contexts/ThemeContext';
import { AppView, COUNTRIES } from '../types';
import { Icons, Button, Toggle, Card, Badge } from '../components/UIComponents';
import { api } from '../services/api';

export default function SettingsView() {
    const { user, setUser, setView, setIsAuthenticated } = useApp();
    const { theme, toggleTheme, isLight } = useTheme();
    
    const [editMode, setEditMode] = useState(false);
    const [name, setName] = useState(user.name);
    const [email, setEmail] = useState(user.email);
    const [pwd, setPwd] = useState(user.password || '••••••••');
    const [showPwd, setShowPwd] = useState(false);
    const [country, setCountry] = useState(user.country);
    const [showPrivacy, setShowPrivacy] = useState(false);
    const [showPlans, setShowPlans] = useState(false);

    // --- HELPER: FORCE DB SAVE ---
    const updateAndSave = async (updates: Partial<typeof user>) => {
        const updatedUser = { ...user, ...updates };
        
        // 1. Update UI immediately
        setUser(updatedUser);
        
        // 2. Force Save to Database
        try {
            console.log("💾 Saving Settings...");
            await api.sync(updatedUser);
        } catch (e) {
            console.error("Settings Save Failed", e);
            alert("Could not save settings. Check connection.");
        }
    };

    const handleSaveProfile = () => {
        updateAndSave({ name, email, password: pwd, country });
        setEditMode(false);
    };

    const handlePlanSelect = (planId: string, isPremium: boolean) => {
        // Force save the plan change
        updateAndSave({
            activePlanId: planId,
            isPremium: isPremium,
            maxGoalSlots: planId === 'free' ? 3 : 99,
        });
        
        setShowPlans(false);
        alert(`Plan Update: Authorization complete for the ${planId.toUpperCase()} tier.`);
    };

    const toggleAppConnection = (appId: string) => {
        const updatedApps = user.connectedApps.map(app => 
            app.id === appId ? { ...app, isConnected: !app.isConnected } : app
        );
        updateAndSave({ connectedApps: updatedApps });
    };

    return (
        <div className="h-full overflow-y-auto pb-safe scroll-smooth">
            <div className="min-h-full flex flex-col animate-fade-in pb-20 theme-transition theme-bg-page">
                {/* Header */}
                <div className="p-6 pt-safe border-b flex items-center gap-4 sticky top-0 z-30 theme-bg-card theme-border">
                    <button 
                        onClick={() => setView(AppView.DASHBOARD)} 
                        className="p-2 mt-2 rounded-full transition-colors hover:theme-bg-hover"
                    >
                        <Icons.ChevronLeft className="w-6 h-6 theme-text-primary"/>
                    </button>
                    <h1 className="text-2xl font-black theme-text-primary mt-2 uppercase tracking-tighter">Identity</h1>
                </div>

                <div className="p-6 space-y-8">
                    {/* Theme Toggle Section */}
                    <section>
                        <h2 className="text-lg font-black theme-text-primary mb-4 flex items-center gap-2">
                            {isLight ? <Icons.Sun className="w-5 h-5 text-secondary"/> : <Icons.Moon className="w-5 h-5 text-secondary"/>}
                            Appearance
                        </h2>
                        <Card className="p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-2xl ${
                                        isLight 
                                            ? 'bg-yellow-100 text-yellow-600' 
                                            : 'bg-indigo-100 text-indigo-600'
                                    }`}>
                                        {isLight ? <Icons.Sun className="w-5 h-5"/> : <Icons.Moon className="w-5 h-5"/>}
                                    </div>
                                    <div>
                                        <span className="font-bold theme-text-primary block">Theme Mode</span>
                                        <span className="text-[9px] font-bold theme-text-muted uppercase tracking-widest">
                                            {isLight ? 'Light Mode Active' : 'Dark Mode Active'}
                                        </span>
                                    </div>
                                </div>
                                <Toggle checked={isLight} onChange={toggleTheme} />
                            </div>
                            <p className="text-xs theme-text-muted mt-4">
                                Switch between light and dark themes. Your preference will be saved automatically.
                            </p>
                        </Card>
                    </section>

                    {/* Wallet Section */}
                    <section className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            {/* Credits Box */}
                            <div className="p-5 theme-brand-primary text-white rounded-3xl shadow-xl relative overflow-hidden group">
                                <div className="relative z-10">
                                    <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Architect Credits</span>
                                    <div className="text-2xl font-black mt-1 group-hover:scale-105 transition-transform origin-left text-white">
                                        {(user.credits || 0).toLocaleString()}
                                    </div>
                                </div>
                                <Icons.Coins className="absolute -bottom-4 -right-4 w-16 h-16 text-white/10 rotate-12" />
                            </div>
                            {/* Balance Box */}
                            <div className="p-5 bg-emerald-600 text-white rounded-3xl shadow-xl relative overflow-hidden group">
                                <div className="relative z-10">
                                    <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Global Balance</span>
                                    <div className="text-2xl font-black mt-1 group-hover:scale-105 transition-transform origin-left text-white">
                                        ${(user.realMoneyBalance || 0).toFixed(2)}
                                    </div>
                                </div>
                                <Icons.TrendingUp className="absolute -bottom-4 -right-4 w-16 h-16 text-white/10 -rotate-12" />
                            </div>
                        </div>
                        
                        <Card className={`p-6 border-2 transition-all duration-300 ${
                            user.isPremium ? 'border-secondary bg-secondary/5' : 'theme-border'
                        }`}>
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <div className="text-[10px] font-bold text-secondary uppercase tracking-[0.2em] mb-1">Active Membership</div>
                                    <h3 className="text-xl font-black theme-text-primary">
                                        {user.activePlanId === 'creator' ? 'Creator Architect' : user.activePlanId === 'premium' ? 'Premium Architect' : 'Free Standard'}
                                    </h3>
                                </div>
                                {user.isPremium && <Badge color="bg-secondary text-white">PRO</Badge>}
                            </div>
                            <Button onClick={() => setShowPlans(true)} variant="outline" className="border-secondary text-secondary py-3 text-xs h-10 w-auto px-6">
                                Manage Membership
                            </Button>
                        </Card>
                    </section>

                    {/* Identity Section */}
                    <section>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-black theme-text-primary flex items-center gap-2">
                                <Icons.User className="w-5 h-5 text-secondary"/> Profile Identity
                            </h2>
                            <button 
                                onClick={() => editMode ? handleSaveProfile() : setEditMode(true)} 
                                className="text-xs font-black text-secondary uppercase tracking-widest"
                            >
                                {editMode ? 'Confirm' : 'Modify'}
                            </button>
                        </div>
                        <Card className="p-6">
                            <div className="space-y-6">
                                <div>
                                    <label className="text-[9px] font-black theme-text-muted uppercase tracking-widest">Full Name</label>
                                    {editMode ? (
                                        <input 
                                            value={name} 
                                            onChange={e => setName(e.target.value)} 
                                            className="w-full mt-2 p-3 rounded-xl border font-bold theme-bg-input theme-border theme-text-primary" 
                                        />
                                    ) : (
                                        <div className="theme-text-primary font-black text-lg mt-1">{user.name}</div>
                                    )}
                                </div>
                                <div>
                                    <label className="text-[9px] font-black theme-text-muted uppercase tracking-widest">Account Identity (Email)</label>
                                    {editMode ? (
                                        <input 
                                            value={email} 
                                            onChange={e => setEmail(e.target.value)} 
                                            className="w-full mt-2 p-3 rounded-xl border font-bold theme-bg-input theme-border theme-text-primary" 
                                        />
                                    ) : (
                                        <div className="theme-text-primary font-bold mt-1">{user.email}</div>
                                    )}
                                </div>
                                <div>
                                    <div className="flex justify-between items-center">
                                        <label className="text-[9px] font-black theme-text-muted uppercase tracking-widest">Access Passcode</label>
                                        {editMode && (
                                            <button 
                                                onClick={() => setShowPwd(!showPwd)} 
                                                className="text-[9px] font-black text-secondary uppercase tracking-widest flex items-center gap-1"
                                            >
                                                {showPwd ? 'Hide' : 'Show'}
                                            </button>
                                        )}
                                    </div>
                                    {editMode ? (
                                        <input 
                                            type={showPwd ? "text" : "password"} 
                                            value={pwd} 
                                            onChange={e => setPwd(e.target.value)} 
                                            className="w-full mt-2 p-3 rounded-xl border font-bold theme-bg-input theme-border theme-text-primary" 
                                        />
                                    ) : (
                                        <div className="theme-text-primary mt-1">••••••••</div>
                                    )}
                                </div>
                                <div className="pt-4 border-t theme-border grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[8px] font-black theme-text-muted uppercase">Geo Location</label>
                                        <div className="text-xs font-bold theme-text-primary">{user.country}</div>
                                    </div>
                                    <div>
                                        <label className="text-[8px] font-black theme-text-muted uppercase">Architecture Date</label>
                                        <div className="text-xs font-bold theme-text-primary">{new Date(user.createdAt).toLocaleDateString()}</div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </section>

                    {/* Bridge Integrations */}
                    <section>
                        <h2 className="text-lg font-black theme-text-primary mb-4 flex items-center gap-2">
                            <Icons.Link className="w-5 h-5 text-secondary"/> Bridge Hub
                        </h2>
                        <div className="space-y-3">
                            {user.connectedApps.map(app => (
                                <Card key={app.id} className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-2xl ${
                                            app.isConnected 
                                                ? 'theme-brand-primary text-white shadow-lg' 
                                                : 'theme-bg-surface theme-text-muted'
                                        }`}>
                                            <Icons.Activity className="w-5 h-5"/>
                                        </div>
                                        <div>
                                            <span className="font-bold theme-text-primary block">{app.name}</span>
                                            <span className="text-[9px] font-bold theme-text-muted uppercase tracking-widest">
                                                {app.isConnected ? 'Sync Active' : 'Offline'}
                                            </span>
                                        </div>
                                    </div>
                                    <Toggle checked={app.isConnected} onChange={() => toggleAppConnection(app.id)} />
                                </Card>
                            ))}
                        </div>
                    </section>

                    {/* Legal & Safety */}
                    <section>
                        <h2 className="text-lg font-black theme-text-primary mb-4 flex items-center gap-2">
                            <Icons.Shield className="w-5 h-5 text-secondary"/> Protocol Safety
                        </h2>
                        <div className="space-y-3">
                            <button 
                                onClick={() => setShowPrivacy(true)} 
                                className="w-full text-left p-5 rounded-3xl font-black text-xs theme-text-primary flex justify-between items-center transition-all active:scale-[0.98] theme-bg-surface hover:theme-bg-hover"
                            >
                                Global Privacy Protocol <Icons.ChevronRight className="w-4 h-4 opacity-30"/>
                            </button>
                            <div className="w-full text-left p-5 rounded-3xl font-black text-xs theme-text-primary flex justify-between items-center transition-all opacity-50 theme-bg-surface">
                                Terms of Architecture <Icons.ChevronRight className="w-4 h-4 opacity-30"/>
                            </div>
                        </div>
                    </section>

                    <button 
                        onClick={() => setIsAuthenticated(false)} 
                        className="w-full flex items-center justify-center gap-2 text-red-500 font-black text-sm py-5 hover:bg-red-50 rounded-3xl transition-all"
                    >
                        <Icons.LogOut className="w-5 h-5"/> Terminate Identity Session
                    </button>
                </div>
            </div>

            {/* Plans Modal */}
            {showPlans && (
                <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-2xl flex items-center justify-center p-6 animate-fade-in">
                    <Card className="p-8 w-full max-w-sm theme-bg-card border-none theme-shadow-xl rounded-[3rem] relative overflow-hidden flex flex-col max-h-[85vh]">
                        <button onClick={() => setShowPlans(false)} className="absolute top-6 right-6 p-2 theme-bg-surface rounded-full z-20">
                            <Icons.X className="w-4 h-4 theme-text-muted"/>
                        </button>
                        <h2 className="text-3xl font-black theme-text-primary mb-6 uppercase tracking-tighter text-center">Architect Plans</h2>
                        
                        <div className="flex-1 overflow-y-auto pr-1 space-y-4 no-scrollbar">
                            {[
                                { 
                                    id: 'free', 
                                    name: 'Free Plan', 
                                    price: 'Free', 
                                    features: ['3 Goals Max', '3 AI Tasks/Day', 'Daily Questions', 'Social Tab Access', 'Basic Analytics', 'Ad Supported', 'Upload Short Videos'],
                                    isCurrent: user.activePlanId === 'free',
                                    isPremium: false
                                },
                                { 
                                    id: 'premium', 
                                    name: 'Premium Plan', 
                                    price: '$9.99/mo', 
                                    features: ['Unlimited Goals', 'Remove All Ads', 'Advanced AI Coaching', 'Deep Strategy & Reviews', 'Premium Lessons', 'Detailed Analytics', 'Custom Themes'],
                                    isCurrent: user.activePlanId === 'premium',
                                    isPremium: true
                                },
                                { 
                                    id: 'creator', 
                                    name: 'Creator Plan', 
                                    price: '$19.99/mo', 
                                    features: ['Everything in Premium', 'Upload & Sell Courses', 'Run Ads for Your Content', 'Creator Profile Page', 'Marketplace Promotion', 'Sales Analytics'],
                                    isCurrent: user.activePlanId === 'creator',
                                    isPremium: true
                                }
                            ].map((plan, i) => (
                                <div key={i} className={`p-6 rounded-[2.5rem] border-2 transition-all flex flex-col ${
                                    plan.isCurrent 
                                        ? 'theme-brand-primary text-white border-transparent shadow-xl' 
                                        : 'theme-bg-surface theme-border'
                                }`}>
                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className={`font-black text-sm uppercase tracking-widest ${plan.isCurrent ? 'text-white' : 'theme-text-primary'}`}>{plan.name}</h4>
                                        <span className={`font-black text-base ${plan.isCurrent ? 'text-accent' : 'theme-text-primary'}`}>{plan.price}</span>
                                    </div>
                                    <ul className="space-y-2 mb-6">
                                        {plan.features.map((feat, idx) => (
                                            <li key={idx} className={`flex items-start gap-2 text-[10px] font-bold opacity-80 uppercase tracking-tight leading-none ${plan.isCurrent ? 'text-white' : 'theme-text-secondary'}`}>
                                                <Icons.Check className="w-3 h-3 flex-shrink-0 mt-[-1px]"/> {feat}
                                            </li>
                                        ))}
                                    </ul>
                                    {!plan.isCurrent && (
                                        <Button 
                                            onClick={() => handlePlanSelect(plan.id, plan.isPremium)} 
                                            variant={plan.id === 'creator' ? 'secondary' : 'primary'} 
                                            className="py-3 text-[10px] h-10 rounded-2xl shadow-none font-black uppercase tracking-widest"
                                        >
                                            Authorize {plan.id === 'free' ? 'Downgrade' : 'Upgrade'}
                                        </Button>
                                    )}
                                    {plan.isCurrent && (
                                        <div className="text-center text-[10px] font-black uppercase tracking-widest text-accent py-2">
                                            Active Protocol
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            )}

            {/* Privacy Modal */}
            {showPrivacy && (
              <div className="fixed inset-0 z-[100] p-8 pt-safe overflow-y-auto animate-slide-up theme-bg-page">
                <div className="flex justify-between items-center mb-10 mt-2">
                  <h2 className="text-3xl font-black theme-text-primary uppercase tracking-tighter">Global Protocol</h2>
                  <button onClick={() => setShowPrivacy(false)} className="p-3 theme-bg-surface rounded-full">
                      <Icons.X className="theme-text-muted"/>
                  </button>
                </div>
                <div className="prose prose-sm theme-text-secondary space-y-6 font-medium leading-relaxed">
                  <p>InJazi leverages sovereign encryption to safeguard your success data. We understand the high-leverage nature of your architecture.</p>
                  <div className="p-8 rounded-[2.5rem] border-2 theme-bg-card theme-border">
                    <h4 className="font-black theme-text-primary mb-3 text-xs uppercase tracking-[0.2em]">I. Data Sovereignity</h4>
                    <p className="theme-text-secondary">Your goal inputs and video proofs are analyzed by ephemeral AI instances. We do not persist raw biometric data beyond the verification cycle.</p>
                  </div>
                  <div className="p-8 rounded-[2.5rem] border-2 theme-bg-card theme-border">
                    <h4 className="font-black theme-text-primary mb-3 text-xs uppercase tracking-[0.2em]">II. Financial Integrity</h4>
                    <p className="theme-text-secondary">All credit redemptions are processed via Tier-1 liquidity providers. We maintain a 1:1 reserve for all redeemable architect capital.</p>
                  </div>
                </div>
              </div>
            )}
        </div>
    );
}
