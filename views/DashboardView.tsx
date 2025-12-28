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

    // Separate daily tasks from lesson tasks
    const pendingDailyTasks = dailyTasks.filter(t => 
        t.status !== TaskStatus.APPROVED && 
        t.status !== TaskStatus.COMPLETED &&
        !t.isLessonTask
    );

    // Completed tasks count
    const completedToday = dailyTasks.filter(t => 
        t.status === TaskStatus.APPROVED || t.status === TaskStatus.COMPLETED
    ).length;

    // Progress calculation
    const progressPercent = Math.round((user.currentDay / (currentGoal.durationDays || 30)) * 100);
    const progressWidth = Math.min(100, progressPercent);

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
            if (response.offers && response.offers.length > 0) {
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
        if (offer.clickUrl) {
            window.open(offer.clickUrl, '_blank');
        }
    };

    const getDifficultyLabel = (difficulty?: number) => {
        switch(difficulty) {
            case 1: return 'Easy';
            case 2: return 'Medium';
            case 3: return 'Hard';
            default: return 'Easy';
        }
    };

    const getDifficultyColor = (difficulty?: number) => {
        switch(difficulty) {
            case 1: return 'bg-green-100 text-green-700';
            case 2: return 'bg-yellow-100 text-yellow-700';
            case 3: return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#0D1B2A]">
            {/* Unified Header - extends into content */}
            <div className="bg-[#0D1B2A] pt-safe px-5">
                {/* Top Bar */}
                <div className="flex justify-between items-center pt-4 pb-3">
                    <h2 className="text-lg font-black tracking-tight text-white">INJAZI</h2>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setShowCheckIn(true)} 
                            className="w-10 h-10 bg-[#00D4AA] text-[#0D1B2A] rounded-full flex items-center justify-center active:scale-95 transition-transform"
                        >
                            <Icons.Check className="w-5 h-5" />
                        </button>
                        <button 
                            onClick={() => setView(AppView.SETTINGS)} 
                            className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center active:scale-95 transition-transform"
                        >
                            <Icons.Settings className="w-5 h-5 text-white" />
                        </button>
                    </div>
                </div>
                
                {/* Goal Tabs - Pill Style */}
                <div className="flex items-center gap-2 pb-4 overflow-x-auto scrollbar-hide">
                    {allGoals.map((g, idx) => (
                        <button 
                            key={g.id}
                            onClick={() => switchGoal(g)} 
                            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                                g.id === currentGoal.id 
                                    ? 'bg-[#00D4AA] text-[#0D1B2A]' 
                                    : 'bg-white/10 text-white/60 active:bg-white/20'
                            }`}
                        >
                            {g.title?.substring(0, 15) || `Goal ${idx + 1}`}{g.title?.length > 15 ? '...' : ''}
                        </button>
                    ))}
                    <button 
                        onClick={handleAddGoal} 
                        className="px-4 py-2 rounded-full text-xs font-semibold bg-white/5 text-white/40 border border-dashed border-white/20 whitespace-nowrap active:bg-white/10 transition-colors"
                    >
                        + Add Goal
                    </button>
                </div>
            </div>

            {/* Main Content - Scrollable */}
            <div className="flex-1 overflow-y-auto overscroll-contain bg-[#0D1B2A]">
                {/* Goal Progress Card - Main Hero */}
                <div className="px-5 pb-4">
                    <div className="bg-gradient-to-br from-[#1B3A4B] to-[#0D1B2A] rounded-2xl p-5 border border-white/10">
                        {/* Goal Title */}
                        <h3 className="font-bold text-lg text-white mb-1 leading-tight">
                            {currentGoal.title}
                        </h3>
                        <p className="text-white/50 text-sm mb-4">
                            {currentGoal.category} • {currentGoal.mode}
                        </p>
                        
                        {/* Progress Bar - Full Width */}
                        <div className="mb-3">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-white/60 text-xs font-medium">Progress</span>
                                <span className="text-[#00D4AA] text-sm font-bold">{progressPercent}%</span>
                            </div>
                            <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-[#00D4AA] to-[#00A896] rounded-full transition-all duration-500"
                                    style={{ width: `${progressWidth}%` }}
                                />
                            </div>
                        </div>
                        
                        {/* Day Counter */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                                    <Icons.Calendar className="w-4 h-4 text-white/60" />
                                </div>
                                <div>
                                    <span className="text-white font-bold text-lg">Day {user.currentDay}</span>
                                    <span className="text-white/40 text-sm"> / {currentGoal.durationDays}</span>
                                </div>
                            </div>
                            <button 
                                onClick={() => setView(AppView.STATS)}
                                className="px-4 py-2 bg-white/10 rounded-lg text-xs font-semibold text-white/80 active:bg-white/20 transition-colors"
                            >
                                View Stats
                            </button>
                        </div>
                    </div>
                </div>

                {/* Transition to lighter section */}
                <div className="bg-gradient-to-b from-[#0D1B2A] to-[#F8F9FA] h-8" />

                {/* Content Cards on Light Background */}
                <div className="bg-[#F8F9FA] px-5 pb-32">
                    {/* Agent Alerts */}
                    {agentAlerts.filter(a => !a.isRead).length > 0 && (
                        <div className="mb-4">
                            {agentAlerts.filter(a => !a.isRead).map(alert => (
                                <div 
                                    key={alert.id}
                                    onClick={() => setView(AppView.STATS)} 
                                    className={`rounded-xl bg-white p-4 flex items-center gap-3 cursor-pointer shadow-sm mb-2 border-l-4 active:bg-gray-50 transition-colors ${
                                        alert.severity === 'high' ? 'border-red-500' : 'border-blue-500'
                                    }`}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                        alert.severity === 'high' ? 'bg-red-100' : 'bg-blue-100'
                                    }`}>
                                        <Icons.AlertTriangle className={`w-5 h-5 ${alert.severity === 'high' ? 'text-red-500' : 'text-blue-500'}`}/>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-[#0D1B2A] text-sm">{alert.title}</h3>
                                        <p className="text-xs text-gray-500 mt-0.5">{alert.message?.substring(0, 50)}...</p>
                                    </div>
                                    <Icons.ChevronRight className="w-5 h-5 text-gray-300" />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Daily Missions - Primary Focus */}
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
                        <div className="p-4 border-b border-gray-100">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-[#0D1B2A]">Today's Missions</h3>
                                <span className="text-xs font-semibold bg-[#0D1B2A] text-white px-3 py-1 rounded-full">
                                    {pendingDailyTasks.length} left
                                </span>
                            </div>
                        </div>
                        
                        {pendingDailyTasks.length === 0 ? (
                            <div className="p-8 text-center">
                                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <Icons.Check className="w-7 h-7 text-green-500" />
                                </div>
                                <p className="font-semibold text-[#0D1B2A]">All done for today!</p>
                                <p className="text-sm text-gray-500 mt-1">Great work. Rest up for tomorrow.</p>
                            </div>
                        ) : (
                            <div>
                                {pendingDailyTasks.slice(0, 3).map((task, idx) => (
                                    <div 
                                        key={task.id} 
                                        onClick={() => handleTaskSelect(task.id)} 
                                        className={`p-4 flex items-center gap-3 cursor-pointer active:bg-gray-50 transition-colors ${
                                            idx !== 0 ? 'border-t border-gray-100' : ''
                                        }`}
                                    >
                                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                            idx === 0 ? 'bg-[#00D4AA]' : 'bg-[#0D1B2A]/5'
                                        }`}>
                                            <Icons.Zap className={`w-5 h-5 ${idx === 0 ? 'text-[#0D1B2A]' : 'text-[#0D1B2A]/60'}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-semibold text-[#0D1B2A] text-sm leading-snug">
                                                {task.title}
                                            </h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs text-gray-500">
                                                    {task.estimatedTimeMinutes || 15} min
                                                </span>
                                                <span className="text-gray-300">•</span>
                                                <span className="text-xs text-[#00A896] font-medium">
                                                    +{task.creditsReward || 50} CR
                                                </span>
                                            </div>
                                        </div>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                            idx === 0 ? 'bg-[#00D4AA]' : 'bg-gray-100'
                                        }`}>
                                            <Icons.ChevronRight className={`w-4 h-4 ${idx === 0 ? 'text-[#0D1B2A]' : 'text-gray-400'}`}/>
                                        </div>
                                    </div>
                                ))}
                                
                                {pendingDailyTasks.length > 3 && (
                                    <button 
                                        onClick={() => setView(AppView.TASK_SELECTION)} 
                                        className="w-full p-3 text-center text-sm font-medium text-[#0D1B2A]/60 border-t border-gray-100 active:bg-gray-50 transition-colors"
                                    >
                                        +{pendingDailyTasks.length - 3} more tasks
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Earn Credits Section */}
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                        <div 
                            className="p-4 flex items-center justify-between cursor-pointer active:bg-gray-50 transition-colors" 
                            onClick={() => setIsEarnExpanded(!isEarnExpanded)}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-xl flex items-center justify-center">
                                    <Icons.Coins className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-[#0D1B2A]">Earn Credits</h3>
                                    <p className="text-xs text-gray-500">Complete offers for rewards</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Icons.ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isEarnExpanded ? 'rotate-180' : ''}`} />
                            </div>
                        </div>
                        
                        {isEarnExpanded && (
                            <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                                {isLoadingOffers ? (
                                    <div className="py-8 text-center">
                                        <div className="w-8 h-8 border-2 border-[#00D4AA] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                        <p className="text-xs text-gray-400">Loading offers...</p>
                                    </div>
                                ) : adgemOffers.length > 0 ? (
                                    <div className="space-y-2">
                                        {adgemOffers.slice(0, 4).map(offer => (
                                            <div 
                                                key={offer.id} 
                                                onClick={() => handleOfferClick(offer)}
                                                className="bg-gray-50 p-3 rounded-xl flex items-center gap-3 cursor-pointer active:bg-gray-100 transition-colors"
                                            >
                                                <div className="w-12 h-12 rounded-xl bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                                                    {offer.icon ? (
                                                        <img src={offer.icon} alt={offer.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Icons.Gift className="w-5 h-5 text-gray-400" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${getDifficultyColor(offer.completionDifficulty)}`}>
                                                        {getDifficultyLabel(offer.completionDifficulty)}
                                                    </span>
                                                    <h4 className="font-semibold text-[#0D1B2A] text-sm truncate mt-0.5">{offer.name}</h4>
                                                </div>
                                                <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-2.5 py-1.5 rounded-lg">
                                                    <span className="font-bold text-sm">+{offer.amount}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-8 text-center">
                                        <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                            <Icons.Gift className="w-7 h-7 text-gray-300" />
                                        </div>
                                        <p className="text-sm text-gray-400">No offers available right now</p>
                                    </div>
                                )}
                                
                                <button 
                                    onClick={(e) => { e.stopPropagation(); fetchAdgemOffers(); }}
                                    disabled={isLoadingOffers}
                                    className="w-full mt-3 py-2.5 text-sm font-semibold text-[#0D1B2A] bg-gray-100 rounded-xl active:bg-gray-200 transition-colors disabled:opacity-50"
                                >
                                    Refresh Offers
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Check-in Modal */}
            {showCheckIn && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
                    <div 
                        className="w-full bg-white rounded-t-3xl pb-safe animate-slide-up"
                        style={{ maxHeight: '85vh' }}
                    >
                        <div className="p-5">
                            {/* Handle */}
                            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-5" />
                            
                            <h2 className="text-xl font-bold text-[#0D1B2A] mb-1">Daily Check-in</h2>
                            <p className="text-sm text-gray-500 mb-5">What did you accomplish today?</p>
                            
                            <textarea 
                                value={checkInText} 
                                onChange={(e) => setCheckInText(e.target.value)} 
                                className="w-full h-32 p-4 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-[#00D4AA] focus:ring-2 focus:ring-[#00D4AA]/20 resize-none text-[#0D1B2A]" 
                                placeholder="I researched 3 competitors, drafted the first section of my business plan..." 
                            />
                            
                            <button 
                                onClick={submitDailyCheckIn}
                                disabled={isProcessingCheckIn || !checkInText.trim()}
                                className="w-full mt-4 py-4 bg-[#0D1B2A] text-white rounded-xl font-semibold disabled:opacity-50 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                            >
                                {isProcessingCheckIn ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    'Submit Check-in'
                                )}
                            </button>
                            
                            <button 
                                onClick={() => setShowCheckIn(false)} 
                                className="w-full mt-3 py-3 text-sm font-semibold text-gray-500 active:bg-gray-50 rounded-xl transition-colors"
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
