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

    // Fetch AdGem offers
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

    const calculateRealTimeRemaining = (task: Task) => {
        let currentSeconds = task.timeLeft || 0;
        if (task.isTimerActive && task.lastUpdated) {
            const elapsed = Math.floor((Date.now() - task.lastUpdated) / 1000);
            currentSeconds = Math.max(0, currentSeconds - elapsed);
        }
        const mins = Math.ceil(currentSeconds / 60);
        return `${mins}m`;
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
        return (prevUser.allGoals || []).map(g => 
            g.id === prevUser.goal?.id ? { ...g, savedTasks: prevUser.dailyTasks || [] } : g
        );
    };
    
    const switchGoal = (targetGoal: Goal) => {
        if (targetGoal.id === user.goal?.id) return;
        setUser(prev => ({ 
            ...prev, 
            allGoals: saveCurrentGoalState(prev), 
            goal: targetGoal, 
            dailyTasks: targetGoal.savedTasks || [], 
            currentDay: targetGoal.savedDay || 1 
        }));
    };

    const handleAddGoal = () => {
        if (allGoals.length >= user.maxGoalSlots) {
            const confirmPurchase = window.confirm(`You have reached ${user.maxGoalSlots} goal slots.\n\nUnlock a new slot for $2.99?`);
            if (confirmPurchase) {
                setUser(prev => ({ ...prev, maxGoalSlots: prev.maxGoalSlots + 1 }));
                alert("Slot Unlocked!");
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

    const getDifficultyColor = (difficulty?: number) => {
        switch(difficulty) {
            case 1: return 'bg-green-100 text-green-700';
            case 2: return 'bg-yellow-100 text-yellow-700';
            case 3: return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-600';
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

    return (
        <div className="h-full flex flex-col bg-gray-50 overflow-hidden">
            {/* ===== FIXED HEADER ===== */}
            <div className="flex-shrink-0 bg-primary text-white pt-safe rounded-b-[2rem] shadow-xl relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />
                
                <div className="relative z-10 px-5 pb-5">
                    {/* Top Bar */}
                    <div className="flex justify-between items-center py-3">
                        <h2 className="text-xl font-black tracking-tighter">INJAZI</h2>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setShowCheckIn(true)} 
                                className="w-10 h-10 bg-accent text-primary rounded-full flex items-center justify-center shadow-lg shadow-accent/30 active:scale-95 transition-transform"
                            >
                                <Icons.Check className="w-5 h-5" />
                            </button>
                            <button 
                                onClick={() => setView(AppView.SETTINGS)} 
                                className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center active:scale-95 transition-transform"
                            >
                                <Icons.Settings className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Goal Tabs */}
                    <div className="flex justify-center items-center gap-3 mb-4">
                        {allGoals.map((g, idx) => (
                            <button 
                                key={g.id}
                                onClick={() => switchGoal(g)} 
                                className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full transition-all ${
                                    g.id === currentGoal.id 
                                        ? 'bg-white/20 text-white' 
                                        : 'text-white/40'
                                }`}
                            >
                                Goal {idx + 1}
                            </button>
                        ))}
                        <button 
                            onClick={handleAddGoal} 
                            className="text-[10px] font-bold uppercase tracking-wider text-white/40 hover:text-white px-2 py-1.5 transition-colors"
                        >
                            + New
                        </button>
                    </div>

                    {/* Progress Circle & Goal Info */}
                    <div className="flex items-center gap-5">
                        {/* Progress Ring */}
                        <div className="relative w-24 h-24 flex-shrink-0">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                <circle 
                                    cx="50" cy="50" r="40" 
                                    stroke="currentColor" 
                                    strokeWidth="8" 
                                    fill="none" 
                                    className="text-white/10" 
                                />
                                <circle 
                                    cx="50" cy="50" r="40" 
                                    stroke="currentColor" 
                                    strokeWidth="8" 
                                    fill="none" 
                                    className="text-accent" 
                                    strokeDasharray="251.2" 
                                    strokeDashoffset={251.2 - (251.2 * (user.currentDay / (currentGoal.durationDays || 30)))} 
                                    strokeLinecap="round" 
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-2xl font-black">
                                    {Math.round((user.currentDay / (currentGoal.durationDays || 30)) * 100)}%
                                </span>
                            </div>
                        </div>

                        {/* Goal Details */}
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-lg leading-tight line-clamp-2 mb-1">
                                {currentGoal.title}
                            </h3>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-white/50 bg-white/10 px-2.5 py-1 rounded-full">
                                    Day {user.currentDay}/{currentGoal.durationDays}
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
                                    🔥 {user.streak || 0} streak
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ===== SCROLLABLE CONTENT ===== */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
                <div className="px-4 py-4 space-y-4">
                    
                    {/* Agent Alerts */}
                    {agentAlerts.filter(a => !a.isRead).map(alert => (
                        <div 
                            key={alert.id}
                            onClick={() => setView(AppView.STATS)}
                            className={`bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm border-l-4 active:scale-[0.98] transition-transform ${
                                alert.severity === 'high' ? 'border-red-500' : 'border-blue-500'
                            }`}
                        >
                            <Icons.AlertTriangle className={`w-5 h-5 flex-shrink-0 ${
                                alert.severity === 'high' ? 'text-red-500' : 'text-blue-500'
                            }`}/>
                            <span className="font-bold text-primary text-sm flex-1 truncate">{alert.title}</span>
                            <Icons.ChevronRight className="w-4 h-4 text-gray-300" />
                        </div>
                    ))}

                    {/* Daily Missions */}
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-50">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-primary text-base">Daily Missions</h3>
                                <span className="text-[10px] font-bold uppercase bg-secondary text-white px-2.5 py-1 rounded-full">
                                    {pendingDailyTasks.length} Active
                                </span>
                            </div>
                        </div>
                        
                        <div className="p-3">
                            {pendingDailyTasks.length === 0 ? (
                                <div className="text-center py-6">
                                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                        <Icons.Check className="w-6 h-6 text-green-600" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-500">All tasks complete!</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {pendingDailyTasks.slice(0, 3).map(task => (
                                        <div 
                                            key={task.id} 
                                            onClick={() => handleTaskSelect(task.id)} 
                                            className="bg-gray-50 p-3 rounded-xl flex items-center gap-3 active:scale-[0.98] transition-transform"
                                        >
                                            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                                <Icons.Zap className="w-5 h-5 text-primary" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-primary text-sm truncate">{task.title}</h4>
                                                <p className="text-[10px] text-gray-400">
                                                    {task.estimatedTimeMinutes || 15} min • {task.creditsReward || 50} CR
                                                </p>
                                            </div>
                                            {task.timeLeft !== undefined && task.timeLeft > 0 && (
                                                <span className={`text-[9px] font-bold px-2 py-1 rounded-full ${
                                                    task.isTimerActive 
                                                        ? 'bg-green-100 text-green-700' 
                                                        : 'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                    {calculateRealTimeRemaining(task)}
                                                </span>
                                            )}
                                            <Icons.ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            <button 
                                onClick={() => setView(AppView.TASK_SELECTION)}
                                className="w-full mt-3 py-3 bg-primary text-white font-bold text-sm rounded-xl active:scale-[0.98] transition-transform"
                            >
                                View All Tasks
                            </button>
                        </div>
                    </div>

                    {/* Earn Credits */}
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                        <div 
                            onClick={() => setIsEarnExpanded(!isEarnExpanded)}
                            className="p-4 flex items-center gap-3 active:bg-gray-50 transition-colors"
                        >
                            <div className="w-12 h-12 bg-yellow-400 rounded-2xl flex items-center justify-center shadow-lg shadow-yellow-400/30 flex-shrink-0">
                                <Icons.Coins className="w-6 h-6 text-yellow-900" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-primary text-base">Earn Credits</h3>
                                <p className="text-[10px] text-gray-400">Complete offers for rewards</p>
                            </div>
                            <div className="text-right mr-2">
                                <span className="text-lg font-black text-primary">{(user.credits || 0).toLocaleString()}</span>
                                <span className="text-[10px] text-gray-400 ml-1">CR</span>
                            </div>
                            <Icons.ChevronDown className={`w-5 h-5 text-gray-300 transition-transform ${isEarnExpanded ? 'rotate-180' : ''}`} />
                        </div>
                        
                        {isEarnExpanded && (
                            <div className="px-4 pb-4 border-t border-gray-50">
                                {isLoadingOffers ? (
                                    <div className="py-8 text-center">
                                        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                        <p className="text-xs text-gray-400">Loading offers...</p>
                                    </div>
                                ) : adgemOffers.length > 0 ? (
                                    <div className="space-y-2 pt-3">
                                        {adgemOffers.slice(0, 5).map(offer => (
                                            <div 
                                                key={offer.id} 
                                                onClick={() => handleOfferClick(offer)}
                                                className="bg-gray-50 p-3 rounded-xl flex items-center gap-3 active:scale-[0.98] transition-transform"
                                            >
                                                <div className="w-12 h-12 rounded-xl bg-gray-200 overflow-hidden flex-shrink-0">
                                                    {offer.icon ? (
                                                        <img src={offer.icon} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <Icons.Gift className="w-5 h-5 text-gray-400" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5 mb-0.5">
                                                        <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${getDifficultyColor(offer.completionDifficulty)}`}>
                                                            {getDifficultyLabel(offer.completionDifficulty)}
                                                        </span>
                                                    </div>
                                                    <h4 className="font-bold text-primary text-sm truncate">{offer.name}</h4>
                                                    <p className="text-[10px] text-gray-400 truncate">{offer.shortDescription}</p>
                                                </div>
                                                <div className="bg-yellow-400 text-yellow-900 px-2.5 py-1.5 rounded-xl flex-shrink-0">
                                                    <span className="font-black text-sm">+{offer.amount}</span>
                                                </div>
                                            </div>
                                        ))}
                                        
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); fetchAdgemOffers(); }}
                                            disabled={isLoadingOffers}
                                            className="w-full py-2.5 text-[10px] font-bold text-primary uppercase tracking-wider hover:bg-gray-50 rounded-xl transition-colors"
                                        >
                                            Refresh Offers
                                        </button>
                                    </div>
                                ) : (
                                    <div className="py-8 text-center">
                                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                            <Icons.Gift className="w-6 h-6 text-gray-300" />
                                        </div>
                                        <p className="text-sm text-gray-400">No offers available</p>
                                        <p className="text-[10px] text-gray-300 mt-1">Check back later</p>
                                    </div>
                                )}

                                {/* Recent Transactions */}
                                {adgemTransactions.length > 0 && (
                                    <div className="mt-4 pt-3 border-t border-gray-100">
                                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                                            Recent Earnings
                                        </h4>
                                        <div className="space-y-1.5">
                                            {adgemTransactions.slice(-3).reverse().map((t: any) => (
                                                <div key={t.transactionId} className="bg-green-50 p-2.5 rounded-xl flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                                                        <Icons.Check className="w-3.5 h-3.5 text-green-600" />
                                                    </div>
                                                    <span className="font-medium text-green-700 text-xs flex-1 truncate">{t.offerName}</span>
                                                    <span className="text-xs font-bold text-green-600">+{t.credits}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
                            <Icons.Flame className="w-6 h-6 text-orange-500 mx-auto mb-1" />
                            <span className="text-xl font-black text-primary block">{user.streak || 0}</span>
                            <span className="text-[9px] text-gray-400 font-bold uppercase">Streak</span>
                        </div>
                        <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
                            <Icons.Check className="w-6 h-6 text-green-500 mx-auto mb-1" />
                            <span className="text-xl font-black text-primary block">
                                {dailyTasks.filter(t => t.status === TaskStatus.APPROVED || t.status === TaskStatus.COMPLETED).length}
                            </span>
                            <span className="text-[9px] text-gray-400 font-bold uppercase">Done</span>
                        </div>
                        <div 
                            onClick={() => setView(AppView.SHOP)}
                            className="bg-white rounded-2xl p-4 text-center shadow-sm active:scale-[0.98] transition-transform"
                        >
                            <Icons.Coins className="w-6 h-6 text-yellow-500 mx-auto mb-1" />
                            <span className="text-xl font-black text-primary block">{(user.credits || 0).toLocaleString()}</span>
                            <span className="text-[9px] text-gray-400 font-bold uppercase">Credits</span>
                        </div>
                    </div>

                </div>
            </div>

            {/* ===== CHECK-IN MODAL ===== */}
            {showCheckIn && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white w-full max-w-lg rounded-t-[2rem] p-5 shadow-2xl animate-slide-up">
                        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
                        
                        <h2 className="text-xl font-black text-primary mb-1">Daily Check-in</h2>
                        <p className="text-sm text-gray-400 mb-4">What did you accomplish today?</p>
                        
                        <textarea 
                            value={checkInText} 
                            onChange={(e) => setCheckInText(e.target.value)} 
                            className="w-full h-28 p-4 bg-gray-50 rounded-2xl border-2 border-gray-100 focus:border-primary/30 focus:outline-none text-sm resize-none" 
                            placeholder="I completed 3 lessons and practiced for 2 hours..." 
                        />
                        
                        <button 
                            onClick={submitDailyCheckIn}
                            disabled={!checkInText.trim() || isProcessingCheckIn}
                            className="w-full mt-4 py-4 bg-primary text-white font-bold rounded-2xl disabled:opacity-50 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
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
                            className="w-full mt-2 py-3 text-gray-400 font-bold text-sm"
                        >
                            Cancel
                        </button>
                        
                        {/* Safe area padding for home indicator */}
                        <div className="h-safe" />
                    </div>
                </div>
            )}
        </div>
    );
}
