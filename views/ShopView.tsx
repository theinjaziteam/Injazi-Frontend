import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Icons, Button, Card, Badge } from '../components/UIComponents';
import { api } from '../services/api';

export default function ShopView() {
    const { user, setUser } = useApp();
    const [shopTab, setShopTab] = useState<'credits' | 'marketplace'>('credits');
    const [showRedeem, setShowRedeem] = useState(false);
    const [customRedeem, setCustomRedeem] = useState('');
    
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingType, setProcessingType] = useState<'buy' | 'sell' | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);

    const buyTiers = [
        { id: 'b1', price: 5, credits: 2500, label: 'Starter Bundle', popular: false },
        { id: 'b2', price: 10, credits: 6000, label: 'Pro Allocation', popular: true },
        { id: 'b3', price: 25, credits: 17500, label: 'Elite Liquidity', popular: false },
        { id: 'b4', price: 100, credits: 75000, label: 'Architect Max', popular: false }
    ];

    const updateAndSave = async (updates: Partial<typeof user>) => {
        const newUserState = { ...user, ...updates };
        setUser(newUserState);
        try {
            await api.sync(newUserState);
        } catch (e) {
            console.error("Save Failed", e);
        }
    };

    const handleBuy = (tier: any) => {
        setIsProcessing(true);
        setProcessingType('buy');
        setTimeout(() => {
            const newCredits = (user.credits || 0) + tier.credits;
            updateAndSave({ credits: newCredits });
            setIsProcessing(false);
            setProcessingType(null);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2000);
        }, 1500);
    };

    const handleRedeem = () => {
        const amount = parseInt(customRedeem);
        if (isNaN(amount) || amount < 3000) return;
        if (amount > (user.credits || 0)) {
            alert("Insufficient Equity.");
            return;
        }
        setIsProcessing(true);
        setProcessingType('sell');
        setTimeout(() => {
            const cashValue = amount / 3000;
            const newCredits = user.credits - amount;
            const newBalance = (user.realMoneyBalance || 0) + cashValue;
            updateAndSave({ credits: newCredits, realMoneyBalance: newBalance });
            setIsProcessing(false);
            setProcessingType(null);
            setShowRedeem(false);
            setCustomRedeem('');
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2000);
        }, 2000);
    };

    return (
        <div className="h-full flex flex-col overflow-hidden theme-transition theme-bg-page">
            {/* ===== FIXED HEADER with Safe Area ===== */}
            <div className="flex-shrink-0 bg-[#171738] pt-safe rounded-b-[2rem] shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#3423A6] rounded-full blur-[80px] opacity-20 translate-x-1/2 -translate-y-1/2"></div>
                
                <div className="relative z-10 p-5">
                    {/* Title Row */}
                    <div className="flex justify-between items-center mb-4">
                        <h1 className="text-xl font-black text-white tracking-tight">Asset Store</h1>
                        <div className="p-2 bg-white/10 rounded-full backdrop-blur-md">
                            <Icons.Shop className="w-5 h-5 text-white"/>
                        </div>
                    </div>

                    {/* Wallet Card */}
                    <div className="bg-white/10 backdrop-blur-xl border border-white/10 p-4 rounded-2xl">
                        <div className="flex justify-between items-start mb-1">
                            <span className="text-[9px] font-bold text-white/60 uppercase tracking-[0.15em]">Available Equity</span>
                            {user.isPremium && <Badge color="bg-[#DFF3E4] text-[#171738]">Premium</Badge>}
                        </div>
                        
                        <div className="flex items-baseline gap-2 mb-3">
                            <span className="text-4xl font-black text-white tracking-tighter">{(user.credits || 0).toLocaleString()}</span>
                            <span className="text-sm font-bold text-white/50">CR</span>
                        </div>

                        <div className="bg-black/20 rounded-xl p-2.5 flex items-center gap-3">
                            <div className="p-1.5 bg-[#DFF3E4] rounded-full text-[#171738]">
                                <Icons.DollarSign className="w-3.5 h-3.5"/>
                            </div>
                            <div>
                                <div className="text-[9px] text-white/50 font-bold uppercase">Cash Balance</div>
                                <div className="text-white font-bold text-sm">${(user.realMoneyBalance || 0).toFixed(2)}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ===== TAB NAVIGATION - Fixed ===== */}
            <div className="flex-shrink-0 flex px-5 py-3 gap-3 theme-bg-page">
                <button 
                    onClick={() => setShopTab('credits')}
                    className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
                        shopTab === 'credits' 
                            ? 'bg-[#171738] text-white shadow-lg' 
                            : 'theme-bg-card theme-text-muted hover:theme-bg-hover'
                    }`}
                >
                    Get Credits
                </button>
                <button 
                    onClick={() => setShopTab('marketplace')}
                    className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
                        shopTab === 'marketplace' 
                            ? 'bg-[#171738] text-white shadow-lg' 
                            : 'theme-bg-card theme-text-muted hover:theme-bg-hover'
                    }`}
                >
                    Marketplace
                </button>
            </div>

            {/* ===== SCROLLABLE CONTENT AREA ===== */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-4">
                {shopTab === 'credits' ? (
                    <div className="space-y-3 animate-fade-in">
                        {/* Redeem Button */}
                        <div 
                            onClick={() => setShowRedeem(true)}
                            className="theme-bg-card border-2 border-[#DFF3E4] p-4 rounded-2xl flex items-center justify-between cursor-pointer hover:theme-shadow-lg transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 bg-[#DFF3E4] rounded-full flex items-center justify-center text-[#171738] group-hover:scale-110 transition-transform">
                                    <Icons.RefreshCw className="w-5 h-5"/>
                                </div>
                                <div>
                                    <h3 className="font-bold theme-text-primary text-sm">Liquidate Holdings</h3>
                                    <p className="text-[10px] theme-text-muted">Convert Credits → Cash</p>
                                </div>
                            </div>
                            <Icons.ChevronRight className="w-5 h-5 theme-text-muted group-hover:theme-text-primary"/>
                        </div>

                        <h3 className="text-[10px] font-black theme-text-muted uppercase tracking-widest mt-5 mb-2 ml-1">Purchase Allocations</h3>
                        
                        {/* Buy Tiers */}
                        {buyTiers.map((tier) => (
                            <button 
                                key={tier.id}
                                onClick={() => handleBuy(tier)}
                                disabled={isProcessing}
                                className={`relative w-full theme-bg-card p-4 rounded-2xl text-left border-2 transition-all hover:theme-shadow-lg active:scale-[0.98] flex items-center justify-between ${
                                    tier.popular ? 'border-[#3423A6]' : 'border-transparent theme-border'
                                }`}
                            >
                                {tier.popular && (
                                    <div className="absolute -top-2.5 left-5 bg-[#3423A6] text-white text-[8px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                        Best Value
                                    </div>
                                )}
                                <div>
                                    <div className="text-xl font-black theme-text-primary">{tier.credits.toLocaleString()}</div>
                                    <div className="text-[9px] font-bold theme-text-muted uppercase tracking-wider">Credits</div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-lg font-bold text-[#3423A6]">${tier.price}</div>
                                    <div className="w-10 h-10 theme-brand-primary rounded-full flex items-center justify-center text-white shadow-lg">
                                        <Icons.Plus className="w-5 h-5"/>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center py-10 animate-fade-in">
                        <div className="w-16 h-16 theme-bg-surface rounded-full flex items-center justify-center mb-4">
                            <Icons.Shop className="w-7 h-7 theme-text-muted"/>
                        </div>
                        <h3 className="theme-text-muted font-bold text-sm">Marketplace Coming Soon</h3>
                        <p className="text-xs theme-text-muted mt-1">Browse courses, assets, and more.</p>
                    </div>
                )}
            </div>

            {/* ===== MODALS ===== */}
            {showRedeem && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="theme-bg-card w-full max-w-lg rounded-t-[2rem] p-6 theme-shadow-xl animate-slide-up safe-bottom">
                        <div className="w-10 h-1 theme-bg-surface rounded-full mx-auto mb-5"/>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-black theme-text-primary">Cash Out</h2>
                            <button onClick={() => setShowRedeem(false)} className="p-2 theme-bg-surface rounded-full">
                                <Icons.X className="w-4 h-4 theme-text-muted"/>
                            </button>
                        </div>
                        
                        <div className="theme-bg-surface p-5 rounded-2xl mb-5 text-center">
                            <input 
                                type="number" 
                                value={customRedeem}
                                onChange={(e) => setCustomRedeem(e.target.value)}
                                placeholder="3000"
                                className="w-full bg-transparent text-center text-3xl font-black theme-text-primary outline-none placeholder:theme-text-muted"
                            />
                            <div className="text-[10px] font-bold theme-text-muted mt-1 uppercase tracking-widest">Credits to Convert</div>
                        </div>

                        <div className="flex justify-between items-center px-2 mb-6">
                            <span className="text-sm font-medium theme-text-muted">You'll Receive</span>
                            <span className="text-xl font-black text-green-600">
                                ${customRedeem ? (parseInt(customRedeem) / 3000).toFixed(2) : '0.00'}
                            </span>
                        </div>

                        <Button 
                            onClick={handleRedeem}
                            disabled={!customRedeem || parseInt(customRedeem) < 3000 || parseInt(customRedeem) > user.credits}
                            className="w-full py-4 text-base"
                        >
                            Confirm Transfer
                        </Button>
                        
                        <p className="text-center text-[9px] theme-text-muted mt-3 font-medium">
                            Minimum 3,000 CR required
                        </p>
                    </div>
                </div>
            )}

            {isProcessing && (
                <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-[#171738]/95 backdrop-blur-md animate-fade-in">
                    <div className="w-16 h-16 border-4 border-white/10 border-t-white rounded-full animate-spin mb-6"></div>
                    <h2 className="text-xl font-black text-white tracking-widest uppercase animate-pulse">
                        {processingType === 'buy' ? 'Processing' : 'Liquidating'}
                    </h2>
                </div>
            )}

            {showSuccess && (
                <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-green-500 animate-fade-in">
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl mb-4">
                        <Icons.Check className="w-10 h-10 text-green-600"/>
                    </div>
                    <h2 className="text-3xl font-black text-white">SUCCESS</h2>
                </div>
            )}
        </div>
    );
}
