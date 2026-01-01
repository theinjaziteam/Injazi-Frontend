// views/ShopView.tsx
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

    const handleBuy = (tier: typeof buyTiers[0]) => {
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
            const newCredits = (user.credits || 0) - amount;
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

    // FIX #45: Handle backdrop click for modals
    const handleBackdropClick = (e: React.MouseEvent, closeModal: () => void) => {
        if (e.target === e.currentTarget) {
            closeModal();
        }
    };

    return (
        <div className="h-full flex flex-col bg-gray-50 overflow-hidden">
            {/* ===== FIXED HEADER ===== */}
            <div className="flex-shrink-0 bg-[#171738] rounded-b-[2rem] shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#3423A6] rounded-full blur-[80px] opacity-20 translate-x-1/2 -translate-y-1/2" />
                
                <div className="relative z-10 p-5 pt-safe">
                    {/* Title Row */}
                    <div className="flex justify-between items-center mb-4">
                        <h1 className="text-xl font-black text-white tracking-tight">Asset Store</h1>
                        <div 
                            className="p-2 bg-white/10 rounded-full backdrop-blur-md"
                            aria-hidden="true"
                        >
                            <Icons.Shop className="w-5 h-5 text-white"/>
                        </div>
                    </div>

                    {/* Wallet Card */}
                    <div className="bg-white/10 backdrop-blur-xl border border-white/10 p-4 rounded-2xl">
                        <div className="flex justify-between items-start mb-1">
                            <span className="text-[9px] font-bold text-white/60 uppercase tracking-[0.15em]">
                                Available Equity
                            </span>
                            {user.isPremium && (
                                <Badge color="bg-[#DFF3E4] text-[#171738]">Premium</Badge>
                            )}
                        </div>
                        
                        <div className="flex items-baseline gap-2 mb-3">
                            <span className="text-4xl font-black text-white tracking-tighter">
                                {(user.credits || 0).toLocaleString()}
                            </span>
                            <span className="text-sm font-bold text-white/50">CR</span>
                        </div>

                        <div className="bg-black/20 rounded-xl p-2.5 flex items-center gap-3">
                            <div className="p-1.5 bg-[#DFF3E4] rounded-full text-[#171738]">
                                <Icons.DollarSign className="w-3.5 h-3.5"/>
                            </div>
                            <div>
                                <div className="text-[9px] text-white/50 font-bold uppercase">Cash Balance</div>
                                <div className="text-white font-bold text-sm">
                                    ${(user.realMoneyBalance || 0).toFixed(2)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ===== FIX #16: TAB NAVIGATION WITH BETTER ACTIVE STATE ===== */}
            <div className="flex-shrink-0 flex px-5 py-3 gap-3 bg-gray-50">
                <button 
                    onClick={() => setShopTab('credits')}
                    className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${
                        shopTab === 'credits' 
                            ? 'bg-[#171738] text-white shadow-lg ring-2 ring-[#3423A6]/50' 
                            : 'bg-white text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                    }`}
                    aria-pressed={shopTab === 'credits'}
                    aria-label="View credit packages"
                >
                    Get Credits
                </button>
                <button 
                    onClick={() => setShopTab('marketplace')}
                    className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${
                        shopTab === 'marketplace' 
                            ? 'bg-[#171738] text-white shadow-lg ring-2 ring-[#3423A6]/50' 
                            : 'bg-white text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                    }`}
                    aria-pressed={shopTab === 'marketplace'}
                    aria-label="View marketplace"
                >
                    Marketplace
                </button>
            </div>

            {/* ===== SCROLLABLE CONTENT AREA ===== */}
            <div 
                className="flex-1 overflow-y-auto overscroll-contain px-5 pb-4"
                style={{ WebkitOverflowScrolling: 'touch' }}
            >
                {shopTab === 'credits' ? (
                    <div className="space-y-3 animate-fade-in">
                        {/* Redeem Button */}
                        <button 
                            onClick={() => setShowRedeem(true)}
                            className="w-full bg-white border-2 border-[#DFF3E4] p-4 rounded-2xl flex items-center justify-between cursor-pointer hover:shadow-lg transition-all group text-left"
                            aria-label="Open cash out modal"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 bg-[#DFF3E4] rounded-full flex items-center justify-center text-[#171738] group-hover:scale-110 transition-transform">
                                    <Icons.RefreshCw className="w-5 h-5"/>
                                </div>
                                <div>
                                    <h3 className="font-bold text-[#171738] text-sm">Liquidate Holdings</h3>
                                    <p className="text-[10px] text-gray-500">Convert Credits → Cash</p>
                                </div>
                            </div>
                            <Icons.ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[#171738] transition-colors"/>
                        </button>

                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-5 mb-2 ml-1">
                            Purchase Allocations
                        </h3>
                        
                        {/* Buy Tiers */}
                        {buyTiers.map((tier) => (
                            <button 
                                key={tier.id}
                                onClick={() => handleBuy(tier)}
                                disabled={isProcessing}
                                className={`relative w-full bg-white p-4 rounded-2xl text-left border-2 transition-all hover:shadow-lg active:scale-[0.98] flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed ${
                                    tier.popular ? 'border-[#3423A6]' : 'border-transparent hover:border-gray-200'
                                }`}
                                aria-label={`Buy ${tier.credits.toLocaleString()} credits for $${tier.price}`}
                            >
                                {tier.popular && (
                                    <div className="absolute -top-2.5 left-5 bg-[#3423A6] text-white text-[8px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                        Best Value
                                    </div>
                                )}
                                <div>
                                    <div className="text-xl font-black text-[#171738]">
                                        {tier.credits.toLocaleString()}
                                    </div>
                                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                                        Credits
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-lg font-bold text-[#3423A6]">${tier.price}</div>
                                    <div className="w-10 h-10 bg-[#3423A6] rounded-full flex items-center justify-center text-white shadow-lg shadow-[#3423A6]/30">
                                        <Icons.Plus className="w-5 h-5"/>
                                    </div>
                                </div>
                            </button>
                        ))}

                        {/* Info Card */}
                        <div className="mt-6 p-4 bg-gray-100 rounded-2xl">
                            <div className="flex items-start gap-3">
                                <Icons.Info className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-sm font-bold text-gray-700 mb-1">How Credits Work</h4>
                                    <p className="text-xs text-gray-500 leading-relaxed">
                                        Credits can be used for premium features and redeemed for cash at a rate of 3,000 CR = $1.00 USD. Minimum redemption is 3,000 credits.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* FIX #44: Standardized empty state */
                    <div className="empty-state animate-fade-in">
                        <div className="empty-state-icon">
                            <Icons.Shop className="w-7 h-7 text-gray-300"/>
                        </div>
                        <h3 className="empty-state-title">Marketplace Coming Soon</h3>
                        <p className="empty-state-description">
                            Browse courses, digital assets, templates, and more from creators in the community.
                        </p>
                        <button 
                            onClick={() => setShopTab('credits')}
                            className="empty-state-action"
                        >
                            Get Credits Instead
                        </button>
                    </div>
                )}
            </div>

            {/* ===== REDEEM MODAL - FIX #17 & #45 ===== */}
            {showRedeem && (
                <div 
                    className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
                    onClick={(e) => handleBackdropClick(e, () => setShowRedeem(false))}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="redeem-modal-title"
                >
                    <div 
                        className="bg-white w-full max-w-lg rounded-t-[2rem] p-6 shadow-2xl animate-slide-up"
                        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5"/>
                        
                        <div className="flex justify-between items-center mb-6">
                            <h2 id="redeem-modal-title" className="text-lg font-black text-[#171738]">
                                Cash Out
                            </h2>
                            <button 
                                onClick={() => setShowRedeem(false)} 
                                className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                                aria-label="Close cash out modal"
                            >
                                <Icons.X className="w-4 h-4"/>
                            </button>
                        </div>
                        
                        <div className="bg-gray-50 p-5 rounded-2xl mb-5 text-center">
                            <label htmlFor="redeem-amount" className="sr-only">
                                Credits to convert
                            </label>
                            <input 
                                id="redeem-amount"
                                type="number" 
                                value={customRedeem}
                                onChange={(e) => setCustomRedeem(e.target.value)}
                                placeholder="3000"
                                min="3000"
                                max={user.credits || 0}
                                className="w-full bg-transparent text-center text-3xl font-black text-[#171738] outline-none placeholder:text-gray-200 focus-visible:ring-2 focus-visible:ring-[#3423A6]/50 rounded-lg"
                                aria-describedby="redeem-help"
                            />
                            <div id="redeem-help" className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">
                                Credits to Convert
                            </div>
                        </div>

                        {/* Available Credits Info */}
                        <div className="flex justify-between items-center px-2 mb-3 text-sm">
                            <span className="text-gray-400">Available</span>
                            <span className="font-bold text-[#171738]">
                                {(user.credits || 0).toLocaleString()} CR
                            </span>
                        </div>

                        <div className="flex justify-between items-center px-2 mb-6">
                            <span className="text-sm font-medium text-gray-400">You'll Receive</span>
                            <span className="text-xl font-black text-green-600">
                                ${customRedeem ? (parseInt(customRedeem) / 3000).toFixed(2) : '0.00'}
                            </span>
                        </div>

                        {/* Validation Messages */}
                        {customRedeem && parseInt(customRedeem) < 3000 && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 flex items-center gap-2">
                                <Icons.AlertCircle className="w-4 h-4 flex-shrink-0" />
                                Minimum redemption is 3,000 credits
                            </div>
                        )}
                        
                        {customRedeem && parseInt(customRedeem) > (user.credits || 0) && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 flex items-center gap-2">
                                <Icons.AlertCircle className="w-4 h-4 flex-shrink-0" />
                                Insufficient credits
                            </div>
                        )}

                        <Button 
                            onClick={handleRedeem}
                            disabled={
                                !customRedeem || 
                                parseInt(customRedeem) < 3000 || 
                                parseInt(customRedeem) > (user.credits || 0)
                            }
                            className="w-full py-4 text-base"
                        >
                            Confirm Transfer
                        </Button>
                        
                        <p className="text-center text-[9px] text-gray-300 mt-3 font-medium">
                            Minimum 3,000 CR required • Rate: 3,000 CR = $1.00
                        </p>
                    </div>
                </div>
            )}

            {/* ===== FIX #18: PROCESSING OVERLAY WITH CORRECT Z-INDEX ===== */}
            {isProcessing && (
                <div 
                    className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#171738]/95 backdrop-blur-md animate-fade-in"
                    role="status"
                    aria-live="polite"
                    aria-label={processingType === 'buy' ? 'Processing purchase' : 'Processing redemption'}
                >
                    <div className="w-16 h-16 border-4 border-white/10 border-t-white rounded-full animate-spin mb-6" />
                    <h2 className="text-xl font-black text-white tracking-widest uppercase animate-pulse">
                        {processingType === 'buy' ? 'Processing' : 'Liquidating'}
                    </h2>
                    <p className="text-white/50 text-sm mt-2">Please wait...</p>
                </div>
            )}

            {/* ===== SUCCESS OVERLAY ===== */}
            {showSuccess && (
                <div 
                    className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-green-500 animate-fade-in"
                    role="status"
                    aria-live="polite"
                    aria-label="Transaction successful"
                >
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl mb-4 animate-bounce-in">
                        <Icons.Check className="w-10 h-10 text-green-600"/>
                    </div>
                    <h2 className="text-3xl font-black text-white">SUCCESS</h2>
                    <p className="text-white/80 text-sm mt-2">Transaction completed</p>
                </div>
            )}
        </div>
    );
}
