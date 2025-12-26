import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { Icons, Button, Card, Badge } from '../components/UIComponents';
import { api } from '../services/api'; // <--- IMPORT API

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

    // --- FORCE SAVE FUNCTION ---
    const updateAndSave = async (updates: Partial<typeof user>) => {
        const newUserState = { ...user, ...updates };
        setUser(newUserState); // Update UI
        try {
            await api.sync(newUserState); // Force DB Save
            console.log("✅ Transaction Saved to DB");
        } catch (e) {
            console.error("Save Failed", e);
            alert("Transaction local only. Check internet.");
        }
    };

    const handleBuy = (tier: any) => {
        setIsProcessing(true);
        setProcessingType('buy');

        setTimeout(() => {
            const newCredits = (user.credits || 0) + tier.credits;
            
            updateAndSave({ credits: newCredits }); // <--- USES FORCE SAVE
            
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

            updateAndSave({ 
                credits: newCredits,
                realMoneyBalance: newBalance 
            }); // <--- USES FORCE SAVE

            setIsProcessing(false);
            setProcessingType(null);
            setShowRedeem(false);
            setCustomRedeem('');
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2000);
        }, 2000);
    };

    return (
        <div className="h-full overflow-y-auto pb-safe scroll-smooth bg-gray-50">
            {/* Header / Wallet Card */}
            <div className="bg-[#171738] p-6 pt-safe rounded-b-[2.5rem] shadow-xl relative overflow-hidden mb-6">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#3423A6] rounded-full blur-[80px] opacity-20 translate-x-1/2 -translate-y-1/2"></div>
                
                <div className="relative z-10">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-black text-white tracking-tight">Asset Store</h1>
                        <div className="p-2 bg-white/10 rounded-full backdrop-blur-md">
                            <Icons.Shop className="w-6 h-6 text-white"/>
                        </div>
                    </div>

                    <div className="bg-white/10 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] relative overflow-hidden group">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-bold text-white/60 uppercase tracking-[0.2em]">Available Equity</span>
                            {user.isPremium && <Badge color="bg-[#DFF3E4] text-[#171738]">Premium</Badge>}
                        </div>
                        
                        <div className="flex items-baseline gap-2 mb-6">
                            <span className="text-5xl font-black text-white tracking-tighter">{(user.credits || 0).toLocaleString()}</span>
                            <span className="text-sm font-bold text-white/50">CR</span>
                        </div>

                        <div className="flex gap-3">
                            <div className="flex-1 bg-black/20 rounded-xl p-3 flex items-center gap-3">
                                <div className="p-2 bg-[#DFF3E4] rounded-full text-[#171738]"><Icons.DollarSign className="w-4 h-4"/></div>
                                <div>
                                    <div className="text-[10px] text-white/50 font-bold uppercase">Cash Value</div>
                                    <div className="text-white font-bold">${(user.realMoneyBalance || 0).toFixed(2)}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex px-6 mb-6 gap-4">
                <button 
                    onClick={() => setShopTab('credits')}
                    className={`flex-1 py-3 rounded-2xl font-bold text-sm transition-all ${shopTab === 'credits' ? 'bg-[#171738] text-white shadow-lg' : 'bg-white text-gray-400 hover:bg-gray-100'}`}
                >
                    Get Credits
                </button>
                <button 
                    onClick={() => setShopTab('marketplace')}
                    className={`flex-1 py-3 rounded-2xl font-bold text-sm transition-all ${shopTab === 'marketplace' ? 'bg-[#171738] text-white shadow-lg' : 'bg-white text-gray-400 hover:bg-gray-100'}`}
                >
                    Marketplace
                </button>
            </div>

            {/* Content Area */}
            <div className="px-6 pb-32">
                {shopTab === 'credits' ? (
                    <div className="space-y-4 animate-fade-in">
                        <div 
                            onClick={() => setShowRedeem(true)}
                            className="bg-white border-2 border-[#DFF3E4] p-4 rounded-[2rem] flex items-center justify-between cursor-pointer hover:shadow-lg transition-all group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-[#DFF3E4] rounded-full flex items-center justify-center text-[#171738] group-hover:scale-110 transition-transform">
                                    <Icons.RefreshCw className="w-6 h-6"/>
                                </div>
                                <div>
                                    <h3 className="font-bold text-[#171738]">Redeem Holdings</h3>
                                    <p className="text-xs text-gray-500">Convert Credits to Cash</p>
                                </div>
                            </div>
                            <Icons.ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-[#171738]"/>
                        </div>

                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mt-8 mb-4 ml-2">Purchase Allocations</h3>
                        
                        <div className="grid grid-cols-2 gap-4">
                            {buyTiers.map((tier) => (
                                <button 
                                    key={tier.id}
                                    onClick={() => handleBuy(tier)}
                                    disabled={isProcessing}
                                    className={`relative bg-white p-5 rounded-[2rem] text-left border-2 transition-all hover:shadow-xl active:scale-95 flex flex-col justify-between h-48 ${tier.popular ? 'border-[#3423A6]' : 'border-transparent'}`}
                                >
                                    {tier.popular && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#3423A6] text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                                            Best Value
                                        </div>
                                    )}
                                    <div>
                                        <div className="text-3xl font-black text-[#171738] mb-1">{tier.credits.toLocaleString()}</div>
                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Credits</div>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div className="text-lg font-bold text-[#3423A6]">${tier.price}</div>
                                        <div className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center text-gray-400">
                                            <Icons.Plus className="w-4 h-4"/>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-20 animate-fade-in">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Icons.Shop className="w-8 h-8 text-gray-300"/>
                        </div>
                        <h3 className="text-gray-400 font-bold">Marketplace Offline</h3>
                        <p className="text-xs text-gray-300 mt-2">Connect to server to fetch assets.</p>
                    </div>
                )}
            </div>

            {/* --- MODALS --- */}
            {showRedeem && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#171738]/90 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl animate-slide-up">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-xl font-black text-[#171738]">Cash Out</h2>
                            <button onClick={() => setShowRedeem(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><Icons.X className="w-5 h-5"/></button>
                        </div>
                        
                        <div className="bg-gray-50 p-6 rounded-[2rem] mb-6 text-center">
                            <input 
                                type="number" 
                                value={customRedeem}
                                onChange={(e) => setCustomRedeem(e.target.value)}
                                placeholder="3000"
                                className="w-full bg-transparent text-center text-4xl font-black text-[#171738] outline-none placeholder:text-gray-200"
                            />
                            <div className="text-xs font-bold text-gray-400 mt-2 uppercase tracking-widest">Credits to Burn</div>
                        </div>

                        <div className="flex justify-between items-center px-4 mb-8">
                            <span className="text-sm font-medium text-gray-400">Estimated Value</span>
                            <span className="text-xl font-black text-green-600">
                                ${customRedeem ? (parseInt(customRedeem) / 3000).toFixed(2) : '0.00'}
                            </span>
                        </div>

                        <Button 
                            onClick={handleRedeem}
                            disabled={!customRedeem || parseInt(customRedeem) < 3000 || parseInt(customRedeem) > user.credits}
                            className="w-full py-5 text-lg shadow-xl shadow-[#3423A6]/20"
                        >
                            Confirm Transfer
                        </Button>
                        
                        <p className="text-center text-[10px] text-gray-300 mt-4 font-medium">
                            Minimum 3,000 CR required. Immediate liquidity.
                        </p>
                    </div>
                </div>
            )}

            {isProcessing && (
                <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-[#171738]/95 backdrop-blur-md animate-fade-in">
                    <div className="w-20 h-20 border-4 border-white/10 border-t-white rounded-full animate-spin mb-8"></div>
                    <h2 className="text-2xl font-black text-white tracking-widest uppercase animate-pulse">
                        {processingType === 'buy' ? 'Securing Asset' : 'Liquidating'}
                    </h2>
                    <p className="text-white/40 text-xs font-bold mt-2 tracking-[0.2em]">DO NOT CLOSE APP</p>
                </div>
            )}

            {showSuccess && (
                <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-green-500 animate-fade-in">
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-2xl animate-scale-in mb-6">
                        <Icons.Check className="w-12 h-12 text-green-600"/>
                    </div>
                    <h2 className="text-4xl font-black text-white tracking-tighter">SUCCESS</h2>
                    <p className="text-white/80 font-bold mt-2">Balance Updated</p>
                </div>
            )}
        </div>
    );
}