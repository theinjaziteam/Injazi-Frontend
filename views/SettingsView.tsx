import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { AppView, COUNTRIES } from '../types';
import { Icons, Button, Toggle, Card, Badge } from '../components/UIComponents';
import { api } from '../services/api';

export default function SettingsView() {
    const { user, setUser, setView, setIsAuthenticated } = useApp();
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
        <div className="h-full overflow-y-auto pb scroll-smooth" style={{ backgroundColor: '#FFFFFF' }}>
            <div className="min-h-full bg-white flex flex-col animate-fade-in pb-20">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center gap-4 bg-white sticky top-0 z-30">
                    <button onClick={() => setView(AppView.DASHBOARD)} className="p-2 mt-2 hover:bg-gray-100 rounded-full transition-colors">
                        <Icons.ChevronLeft className="w-6 h-6 text-primary"/>
                    </button>
                    <h1 className="text-2xl font-black text-primary mt-2 uppercase tracking-tighter">Identity</h1>
                </div>

                <div className="p-6 space-y-8">
                    {/* Wallet Section */}
                    <section className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-5 bg-primary rounded-3xl shadow-xl shadow-primary/20 relative overflow-hidden group">
                                <div className="relative z-10">
                                    <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Architect Credits</span>
                                    <div className="text-2xl font-black mt-1 group-hover:scale-105 transition-transform origin-left text-white">{(user.credits || 0).toLocaleString()}</div>
                                </div>
                                <Icons.Coins className="absolute -bottom-4 -right-4 w-16 h-16 text-white/10 rotate-12" />
                            </div>
                            <div className="p-5 bg-emerald-600 rounded-3xl shadow-xl shadow-emerald-500/20 relative overflow-hidden group">
                                <div className="relative z-10">
                                    <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Global Balance</span>
                                    <div className="text-2xl font-black mt-1 group-hover:scale-105 transition-transform origin-left text-white">${(user.realMoneyBalance || 0).toFixed(2)}</div>
                                </div>
                                <Icons.TrendingUp className="absolute -bottom-4 -right-4 w-16 h-16 text-white/10 -rotate-12" />
                            </div>
                        </div>
                        <Card className={`p-6 border-2 transition-all duration-300 ${user.isPremium ? 'border-secondary bg-secondary/5' : 'border-gray-100'}`}>
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <div className="text-[10px] font-bold text-secondary uppercase tracking-[0.2em] mb-1">Active Membership</div>
                                    <h3 className="text-xl font-black text-primary">
                                        {user.activePlanId === 'creator' ? 'Creator Architect' : user.activePlanId === 'premium' ? 'Premium Architect' : 'Free Standard'}
                                    </h3>
                                </div>
                                {user.isPremium && <Badge color="bg-secondary text-white">PRO</Badge>}
                            </div>
                            <Button onClick={() => setShowPlans(true)} variant="outline" className="border-secondary text-secondary py-3 text-xs h-10 w-auto px-6">Manage Membership</Button>
                        </Card>
                    </section>

                    {/* Identity Section */}
                    <section>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-black text-primary flex items-center gap-2"><Icons.User className="w-5 h-5 text-secondary"/> Profile Identity</h2>
                            <button onClick={() => editMode ? handleSaveProfile() : setEditMode(true)} className="text-xs font-black text-secondary uppercase tracking-widest">
                                {editMode ? 'Confirm' : 'Modify'}
                            </button>
                        </div>
                        <Card className="p-6">
                            <div className="space-y-6">
                                <div>
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Full Name</label>
                                    {editMode ? (
                                        <input 
                                            value={name} 
                                            onChange={e => setName(e.target.value)} 
                                            className="w-full mt-2 p-3 bg-gray-50 rounded-xl border border-gray-100 font-bold text-primary"
                                            style={{ color: '#171738' }}
                                        />
                                    ) : (
                                        <div className="text-primary font-black text-lg mt-1">{user.name}</div>
                                    )}
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Account Identity (Email)</label>
                                    {editMode ? (
                                        <input 
                                            value={email} 
                                            onChange={e => setEmail(e.target.value)} 
                                            className="w-full mt-2 p-3 bg-gray-50 rounded-xl border border-gray-100 font-bold text-primary"
                                            style={{ color: '#171738' }}
                                        />
                                    ) : (
                                        <div className="text-primary font-bold mt-1">{user.email}</div>
                                    )}
                                </div>
                                <div>
                                    <div className="flex justify-between items-center">
                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Access Passcode</label>
                                        {editMode && (
                                            <button onClick={() => setShowPwd(!showPwd)} className="text-[9px] font-black text-secondary uppercase tracking-widest flex items-center gap-1">
                                                {showPwd ? 'Hide' : 'Show'}
                                            </button>
                                        )}
                                    </div>
                                    {editMode ? (
                                        <input 
                                            type={showPwd ? "text" : "password"} 
                                            value={pwd} 
                                            onChange={e => setPwd(e.target.value)} 
                                            className="w-full mt-2 p-3 bg-gray-50 rounded-xl border border-gray-100 font-bold text-primary"
                                            style={{ color: '#171738' }}
                                        />
                                    ) : (
                                        <div className="text-primary mt-1">••••••••</div>
                                    )}
                                </div>
                                <div className="pt-4 border-t border-gray-50 grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[8px] font-black text-gray-400 uppercase">Geo Location</label>
                                        <div className="text-xs font-bold text-primary">{user.country}</div>
                                    </div>
                                    <div>
                                        <label className="text-[8px] font-black text-gray-400 uppercase">Architecture Date</label>
                                        <div className="text-xs font-bold text-primary">{new Date(user.createdAt).toLocaleDateString()}</div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </section>

                    {/* Bridge Integrations */}
                    <section>
                        <h2 className="text-lg font-black text-primary mb-4 flex items-center gap-2"><Icons.Link className="w-5 h-5 text-secondary"/> Bridge Hub</h2>
                        <div className="space-y-3">
                            {user.connectedApps.map(app => (
                                <Card key={app.id} className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-2xl ${app.isConnected ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-gray-100 text-gray-300'}`}>
                                            <Icons.Activity className="w-5 h-5"/>
                                        </div>
                                        <div>
                                            <span className="font-bold text-primary block">{app.name}</span>
                                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{app.isConnected ? 'Sync Active' : 'Offline'}</span>
                                        </div>
                                    </div>
                                    <Toggle checked={app.isConnected} onChange={() => toggleAppConnection(app.id)} />
                                </Card>
                            ))}
                        </div>
                    </section>

                    {/* Legal & Safety */}
                    <div className="space-y-2">
    <button
        onClick={() => setView(AppView.LEGAL)}
        className="w-full bg-gray-50 p-4 rounded-xl text-left"
    >
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <Icons.FileText className="w-5 h-5 text-gray-400" />
                <span className="font-medium text-primary">Terms of Service</span>
            </div>
            <Icons.ChevronRight className="w-5 h-5 text-gray-400" />
        </div>
    </button>
    
    <button
        onClick={() => setView(AppView.LEGAL)}
        className="w-full bg-gray-50 p-4 rounded-xl text-left"
    >
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <Icons.Shield className="w-5 h-5 text-gray-400" />
                <span className="font-medium text-primary">Privacy Policy</span>
            </div>
            <Icons.ChevronRight className="w-5 h-5 text-gray-400" />
        </div>
    </button>
</div>
            {/* Plans Modal */}
            {showPlans && (
                <div className="fixed inset-0 z-[110] bg-primary/95 backdrop-blur-2xl flex items-center justify-center p-6 animate-fade-in">
                    <Card className="p-8 w-full max-w-sm bg-white border-none shadow-[0_40px_100px_rgba(0,0,0,0.5)] rounded-[3rem] relative overflow-hidden flex flex-col max-h-[85vh]">
                        <button onClick={() => setShowPlans(false)} className="absolute top-6 right-6 p-2 bg-gray-100 rounded-full z-20"><Icons.X className="w-4 h-4 text-primary"/></button>
                        <h2 className="text-3xl font-black text-primary mb-6 uppercase tracking-tighter text-center">Architect Plans</h2>
                        
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
                                <div 
                                    key={i} 
                                    className={`p-6 rounded-[2.5rem] border-2 transition-all flex flex-col ${
                                        plan.isCurrent 
                                            ? 'bg-primary border-primary shadow-xl shadow-primary/20' 
                                            : 'bg-gray-50 border-gray-100'
                                    }`}
                                >
                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className={`font-black text-sm uppercase tracking-widest ${plan.isCurrent ? 'text-white' : 'text-primary'}`}>
                                            {plan.name}
                                        </h4>
                                        <span className={`font-black text-base ${plan.isCurrent ? 'text-accent' : 'text-primary'}`}>
                                            {plan.price}
                                        </span>
                                    </div>
                                    <ul className="space-y-2 mb-6">
                                        {plan.features.map((feat, idx) => (
                                            <li 
                                                key={idx} 
                                                className={`flex items-start gap-2 text-[10px] font-bold uppercase tracking-tight leading-none ${
                                                    plan.isCurrent ? 'text-white/80' : 'text-primary/80'
                                                }`}
                                            >
                                                <Icons.Check className={`w-3 h-3 flex-shrink-0 mt-[-1px] ${plan.isCurrent ? 'text-accent' : 'text-secondary'}`}/> 
                                                {feat}
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
              <div className="fixed inset-0 z-[100] bg-white p-8 overflow-y-auto animate-slide-up">
                <div className="flex justify-between items-center mb-10 mt-2">
                  <h2 className="text-3xl font-black text-primary uppercase tracking-tighter">Global Protocol</h2>
                  <button onClick={() => setShowPrivacy(false)} className="p-3 bg-gray-100 rounded-full"><Icons.X className="text-primary"/></button>
                </div>
                <div className="prose prose-sm text-gray-600 space-y-6 font-medium leading-relaxed">
                  <p>InJazi leverages sovereign encryption to safeguard your success data. We understand the high-leverage nature of your architecture.</p>
                  <div className="p-8 bg-gray-50 rounded-[2.5rem] border-2 border-gray-50">
                    <h4 className="font-black text-primary mb-3 text-xs uppercase tracking-[0.2em]">I. Data Sovereignity</h4>
                    <p className="text-gray-600">Your goal inputs and video proofs are analyzed by ephemeral AI instances. We do not persist raw biometric data beyond the verification cycle.</p>
                  </div>
                  <div className="p-8 bg-gray-50 rounded-[2.5rem] border-2 border-gray-50">
                    <h4 className="font-black text-primary mb-3 text-xs uppercase tracking-[0.2em]">II. Financial Integrity</h4>
                    <p className="text-gray-600">All credit redemptions are processed via Tier-1 liquidity providers. We maintain a 1:1 reserve for all redeemable architect capital.</p>
                  </div>
                </div>
              </div>
            )}
        </div>
    );
}
