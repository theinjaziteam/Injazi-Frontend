// views/DashboardView.tsx
import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { AppView, TaskStatus, AgentAlert, Goal, Task } from '../types';
import { Button, Card, Badge, Icons } from '../components/UIComponents';
import { updateUserProfile, generateDailyTasks } from '../services/geminiService';
import { api } from '../services/api';

export default function DashboardView() {
    const { 
        user, setUser, setView, setShowCheckIn, showCheckIn,
        lessons
    } = useApp();
    const [isEarnExpanded, setIsEarnExpanded] = useState(false);
    const [checkInText, setCheckInText] = useState('');
    const [isProcessingCheckIn, setIsProcessingCheckIn] = useState(false);
    const [isLoadingOffers, setIsLoadingOffers] = useState(false);
    const [adgemOffers, setAdgemOffers] = useState<any[]>([]);

    // Safety checks
    const dailyTasks = user.dailyTasks || [];
    const allGoals = user.allGoals || [];
    const agentAlerts = user.agentAlerts || [];
    const adgemTransactions = (user as any).adgemTransactions || [];
    const currentGoal = user.goal || { title: "Set Your Goal", category: "General", durationDays: 30, mode: "Standard" };

    const pendingDailyTasks = dailyTasks.filter(t => 
        t.status !== TaskStatus.APPROVED && 
        t.status !== TaskStatus.COMPLETED &&
        !t.isLessonTask
    );

    const progressPercent = Math.round((user.currentDay / (currentGoal.durationDays || 30)) * 100);

    useEffect(() => {
        if (isEarnExpanded && user.email && adgemOffers.length === 0) {
            fetchAdgemOffers();
        }
    }, [isEarnExpanded]);

    const fetchAdgemOffers = async () => {
        if (isLoadingOffers) return;
        setIsLoadingOffers(true);
        try {
            const response = await api.getAdgemOffers(user.email);
            if (response.offers?.length > 0) {
                setAdgemOffers(response.offers);
            }
        } catch (error) {
            console.error('Failed to fetch offers:', error);
        } finally {
            setIsLoadingOffers(false);
        }
    };

    const handleTaskSelect = (taskId: string) => {
        setUser(prev => ({ ...prev, selectedTaskId: taskId }));
        setView(AppView.TASK_EXECUTION);
    };

    const submitDailyCheckIn = async () => {
        if(!checkInText.trim() || !user.goal) return;
        setIsProcessingCheckIn(true);
        try {
            const updatedProfile = await updateUserProfile(user.userProfile, checkInText);
            const newTasks = await generateDailyTasks(
                user.goal!, 
                user.currentDay, 
                updatedProfile, 
                checkInText,
                pendingDailyTasks
            );
            const existingLessonTasks = dailyTasks.filter(t => t.isLessonTask);
            setUser(prev => ({ 
                ...prev, 
                userProfile: updatedProfile, 
                dailyTasks: [...pendingDailyTasks, ...existingLessonTasks, ...newTasks], 
                lastCheckInDate: Date.now() 
            }));
            setShowCheckIn(false);
            setCheckInText('');
        } catch (e) {
            console.error("Checkin Error", e);
        } finally {
            setIsProcessingCheckIn(false);
        }
    };

    const saveCurrentGoalState = (prevUser: typeof user) => {
        if (!prevUser.goal) return prevUser.allGoals || [];
        return (prevUser.allGoals || []).map(g => g.id === prevUser.goal?.id ? { ...g, savedTasks: prevUser.dailyTasks || [] } : g);
    };
    
    const switchGoal = (targetGoal: Goal) => {
        if (targetGoal.id === user.goal?.id) return;
        setUser(prev => ({ ...prev, allGoals: saveCurrentGoalState(prev), goal: targetGoal, dailyTasks: targetGoal.savedTasks || [], currentDay: targetGoal.savedDay || 1 }));
    };

    const handleAddGoal = () => {
        if (allGoals.length >= user.maxGoalSlots) {
            const confirmPurchase = window.confirm(`You have reached the limit of ${user.maxGoalSlots} goal slots.\n\nUnlock a new Goal Slot for $2.99?`);
            if (confirmPurchase) {
                setUser(prev => ({ ...prev, maxGoalSlots: prev.maxGoalSlots + 1 }));
            } else return;
        }
        setUser(prev => ({ ...prev, allGoals: saveCurrentGoalState(prev) }));
        setView(AppView.ONBOARDING);
    };

    const handleOfferClick = (offer: any) => {
        if (offer.clickUrl) window.open(offer.clickUrl, '_blank');
    };

    const getDifficultyLabel = (d?: number) => d === 1 ? 'Easy' : d === 2 ? 'Medium' : d === 3 ? 'Hard' : 'Easy';
    const getDifficultyColor = (d?: number) => d === 1 ? 'bg-emerald-100 text-emerald-700' : d === 2 ? 'bg-amber-100 text-amber-700' : d === 3 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600';

    return (
        <div className="flex flex-col h-full bg-[#0f0f1a]">
            {/* Header - Safe Area Respected */}
            <div className="bg-[#0f0f1a] px-5 pt-[max(env(safe-area-inset-top),24px)]">
                {/* Top Bar - Moved down for notch/dynamic island */}
                <div className="flex justify-between items-center py-4">
                    <h1 className="text-xl font-black tracking-tight text-white">INJAZI</h1>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setShowCheckIn(true)} 
                            className="w-11 h-11 bg-[#22c55e] rounded-full flex items-center justify-center active:scale-95 transition-transform shadow-lg shadow-[#22c55e]/20"
                        >
                            <Icons.Check className="w-5 h-5 text-white" />
                        </button>
                        <button 
                            onClick={() => setView(AppView.SETTINGS)} 
                            className="w-11 h-11 bg-white/10 rounded-full flex items-center justify-center active:scale-95 transition-transform"
                        >
                            <Icons.Settings className="w-5 h-5 text-white/70" />
                        </button>
                    </div>
                </div>

                {/* Goal Tabs */}
                <div className="flex items-center gap-3 pb-5 overflow-x-auto scrollbar-hide">
                    {allGoals.map((g, idx) => (
                        <button 
                            key={g.id}
                            onClick={() => switchGoal(g)} 
                            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all active:scale-95 ${
                                g.id === currentGoal.id 
                                    ? 'bg-[#6366f1] text-white shadow-lg shadow-[#6366f1]/30' 
                                    : 'bg-white/5 text-white/50'
                            }`}
                        >
                            Goal {idx + 1}
                        </button>
                    ))}
                    <button 
                        onClick={handleAddGoal} 
                        className="px-4 py-2 rounded-full text-sm font-semibold bg-[#6366f1]/20 text-[#6366f1] whitespace-nowrap active:scale-95 transition-all"
                    >
                        + New
                    </button>
                </div>

                {/* Hero Goal Card - Glass Effect */}
                <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 mb-6 border border-white/10">
                    <div className="flex items-start gap-5">
                        {/* Progress Ring with Track */}
                        <div className="relative w-24 h-24 flex-shrink-0">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                {/* Track (background) */}
                                <circle 
                                    cx="50" cy="50" r="40" 
                                    stroke="#ffffff10" 
                                    strokeWidth="8" 
                                    fill="none" 
                                />
                                {/* Progress Fill */}
                                <circle 
                                    cx="50" cy="50" r="40" 
                                    stroke="#22c55e" 
                                    strokeWidth="8" 
                                    fill="none" 
                                    strokeDasharray="251.2"
                                    strokeDashoffset={251.2 - (251.2 * progressPercent / 100)}
                                    strokeLinecap="round"
                                    className="transition-all duration-500"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-2xl font-black text-white">{progressPercent}%</span>
                            </div>
                        </div>

                        {/* Goal Info - Better Hierarchy */}
                        <div className="flex-1 min-w-0 pt-1">
                            {/* Goal Title - BIGGER & BOLDER */}
                            <h2 className="text-xl font-black text-white leading-tight mb-2">
                                {currentGoal.title}
                            </h2>
                            
                            {/* Day Pill - Lighter tint with dark text */}
                            <div className="inline-flex items-center gap-2 bg-[#6366f1]/20 px-3 py-1.5 rounded-lg">
                                <Icons.Calendar className="w-3.5 h-3.5 text-[#a5b4fc]" />
                                <span className="text-sm font-semibold text-[#a5b4fc]">
                                    Day {user.currentDay} of {currentGoal.durationDays}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain bg-[#f8f9fb] rounded-t-[2rem] px-5 pt-6 pb-32">
                {/* Agent Alerts */}
                {agentAlerts.filter(a => !a.isRead).map(alert => (
                    <div 
                        key={alert.id}
                        onClick={() => setView(AppView.STATS)} 
                        className={`mb-4 rounded-2xl bg-white p-4 flex items-center gap-4 shadow-sm border-l-4 active:scale-[0.98] transition-transform ${
                            alert.severity === 'high' ? 'border-red-500' : 'border-[#6366f1]'
                        }`}
                    >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            alert.severity === 'high' ? 'bg-red-100' : 'bg-[#6366f1]/10'
                        }`}>
                            <Icons.AlertTriangle className={`w-5 h-5 ${alert.severity === 'high' ? 'text-red-500' : 'text-[#6366f1]'}`}/>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-[#0f0f1a] text-sm">{alert.title}</h3>
                            <p className="text-xs text-gray-500 truncate">{alert.message}</p>
                        </div>
                        <Icons.ChevronRight className="w-5 h-5 text-gray-300" />
                    </div>
                ))}

                {/* Daily Missions Card - Standardized Radius & Spacing */}
                <div className="bg-white rounded-2xl shadow-sm mb-5 overflow-hidden">
                    {/* Header */}
                    <div className="p-5 pb-4 border-b border-gray-100">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-black text-[#0f0f1a]">Daily Missions</h3>
                            <span className="text-xs font-bold bg-[#6366f1] text-white px-3 py-1 rounded-full">
                                {pendingDailyTasks.length} ACTIVE
                            </span>
                        </div>
                    </div>

                    {/* Tasks List */}
                    {pendingDailyTasks.length === 0 ? (
                        <div className="p-8 text-center">
                            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Icons.Check className="w-7 h-7 text-emerald-500" />
                            </div>
                            <p className="font-semibold text-[#0f0f1a]">All done for today!</p>
                            <p className="text-sm text-gray-500 mt-1">Great work. Rest up for tomorrow.</p>
                        </div>
                    ) : (
                        <div className="p-4 space-y-3">
                            {pendingDailyTasks.slice(0, 3).map((task, idx) => (
                                <div 
                                    key={task.id} 
                                    onClick={() => handleTaskSelect(task.id)} 
                                    className={`p-4 rounded-xl flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-all ${
                                        idx === 0 
                                            ? 'bg-gradient-to-r from-[#6366f1]/10 to-[#8b5cf6]/10 border border-[#6366f1]/20' 
                                            : 'bg-gray-50 border border-gray-100'
                                    }`}
                                >
                                    {/* Duotone Icon */}
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                        idx === 0 ? 'bg-[#6366f1]' : 'bg-gray-200'
                                    }`}>
                                        <Icons.Zap className={`w-5 h-5 ${idx === 0 ? 'text-white' : 'text-gray-500'}`} />
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                        {/* Task Label */}
                                        <span className={`text-[10px] font-bold uppercase tracking-wider ${
                                            idx === 0 ? 'text-[#6366f1]' : 'text-gray-400'
                                        }`}>
                                            Daily Task
                                        </span>
                                        {/* Task Title - BOLD */}
                                        <h4 className="font-bold text-[#0f0f1a] text-sm leading-snug mt-0.5">
                                            {task.title}
                                        </h4>
                                        {/* Metadata - Muted */}
                                        <p className="text-xs text-gray-400 mt-1">
                                            {task.estimatedTimeMinutes || 15} min · +{task.creditsReward || 50} CR
                                        </p>
                                    </div>

                                    {/* Arrow CTA */}
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                        idx === 0 ? 'bg-[#6366f1]' : 'bg-gray-100'
                                    }`}>
                                        <Icons.ChevronRight className={`w-5 h-5 ${idx === 0 ? 'text-white' : 'text-gray-400'}`} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Browse Button - More Breathing Room */}
                    {pendingDailyTasks.length > 0 && (
                        <div className="px-4 pb-4">
                            <button 
                                onClick={() => setView(AppView.TASK_SELECTION)} 
                                className="w-full py-3 text-sm font-semibold text-[#6366f1] bg-[#6366f1]/5 rounded-xl active:bg-[#6366f1]/10 transition-colors"
                            >
                                Browse All Tasks
                            </button>
                        </div>
                    )}
                </div>

                {/* Earn Credits - Same Radius, Asymmetric Layout */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <div 
                        className="p-5 flex items-center justify-between cursor-pointer active:bg-gray-50 transition-colors" 
                        onClick={() => setIsEarnExpanded(!isEarnExpanded)}
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-amber-400 rounded-xl flex items-center justify-center shadow-lg shadow-amber-400/20">
                                <Icons.Coins className="w-6 h-6 text-amber-900" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-[#0f0f1a]">Earn Credits</h3>
                                <p className="text-xs text-gray-400">Complete offers for rewards</p>
                            </div>
                        </div>
                        
                        {/* Credits - Aligned Right with Redeem Option */}
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <span className="text-xl font-black text-[#0f0f1a]">{user.credits.toLocaleString()}</span>
                                <span className="text-xs text-gray-400 ml-1">CR</span>
                            </div>
                            <Icons.ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isEarnExpanded ? 'rotate-180' : ''}`} />
                        </div>
                    </div>
                    
                    {isEarnExpanded && (
                        <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                            {isLoadingOffers ? (
                                <div className="py-8 text-center">
                                    <div className="w-8 h-8 border-3 border-[#6366f1] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                    <p className="text-sm text-gray-400">Loading offers...</p>
                                </div>
                            ) : adgemOffers.length > 0 ? (
                                <div className="space-y-3">
                                    {adgemOffers.slice(0, 4).map(offer => (
                                        <div 
                                            key={offer.id} 
                                            onClick={() => handleOfferClick(offer)}
                                            className="p-4 rounded-xl bg-gray-50 border border-gray-100 flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-all"
                                        >
                                            <div className="w-12 h-12 rounded-xl bg-gray-200 overflow-hidden flex-shrink-0">
                                                {offer.icon ? (
                                                    <img src={offer.icon} alt={offer.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Icons.Gift className="w-5 h-5 text-gray-400" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${getDifficultyColor(offer.completionDifficulty)}`}>
                                                        {getDifficultyLabel(offer.completionDifficulty)}
                                                    </span>
                                                </div>
                                                <h4 className="font-bold text-[#0f0f1a] text-sm truncate">{offer.name}</h4>
                                            </div>
                                            <div className="bg-amber-400 text-amber-900 px-3 py-1.5 rounded-lg flex-shrink-0">
                                                <span className="font-black text-sm">+{offer.amount}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-8 text-center">
                                    <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Icons.Gift className="w-7 h-7 text-gray-300" />
                                    </div>
                                    <p className="text-sm text-gray-500">No offers available</p>
                                </div>
                            )}
                            
                            <button 
                                onClick={(e) => { e.stopPropagation(); fetchAdgemOffers(); }}
                                disabled={isLoadingOffers}
                                className="w-full mt-4 py-3 text-sm font-semibold text-[#6366f1] bg-[#6366f1]/5 rounded-xl active:bg-[#6366f1]/10 transition-colors disabled:opacity-50"
                            >
                                Refresh Offers
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Check-in Modal */}
            {showCheckIn && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
                    <div className="w-full bg-white rounded-t-3xl pb-safe max-h-[85vh]">
                        <div className="p-6">
                            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-6" />
                            <h2 className="text-2xl font-black text-[#0f0f1a] mb-2">Daily Check-in</h2>
                            <p className="text-sm text-gray-500 mb-6">What did you accomplish today?</p>
                            <textarea 
                                value={checkInText} 
                                onChange={(e) => setCheckInText(e.target.value)} 
                                className="w-full h-32 p-4 bg-gray-50 rounded-xl border border-gray-200 resize-none focus:outline-none focus:border-[#6366f1] focus:ring-2 focus:ring-[#6366f1]/20 text-[#0f0f1a]" 
                                placeholder="I researched 3 competitors, drafted the first section of my business plan..." 
                            />
                            <button 
                                onClick={submitDailyCheckIn}
                                disabled={isProcessingCheckIn || !checkInText.trim()}
                                className="w-full mt-4 py-4 bg-[#0f0f1a] text-white rounded-xl font-bold disabled:opacity-50 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                            >
                                {isProcessingCheckIn ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Processing...
                                    </>
                                ) : 'Submit Check-in'}
                            </button>
                            <button 
                                onClick={() => setShowCheckIn(false)} 
                                className="w-full mt-3 py-3 text-sm font-semibold text-gray-400"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
