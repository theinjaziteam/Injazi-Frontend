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
        return `${mins}m left`;
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
        <div className="h-full overflow-y-auto pb-safe">
            <div className="min-h-full bg-white pb-28">
                {/* Header Section */}
                <div className="bg-primary text-white px-5 pt-safe pb-14 rounded-b-[2.5rem]">
                    {/* Top Bar */}
                    <div className="flex justify-between items-center pt-4 mb-5">
                        <h2 className="text-lg font-black tracking-tight">INJAZI</h2>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setShowCheckIn(true)} 
                                className="w-10 h-10 bg-accent text-primary rounded-full flex items-center justify-center"
                            >
                                <Icons.Check className="w-5 h-5" />
                            </button>
                            <button 
                                onClick={() => setView(AppView.SETTINGS)} 
                                className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center"
                            >
                                <Icons.Settings className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                    
                    {/* Goal Tabs */}
                    <div className="flex items-center justify-center gap-3 mb-8">
                        {allGoals.map((g, idx) => (
                            <React.Fragment key={g.id}>
                                <button 
                                    onClick={() => switchGoal(g)} 
                                    className={`text-[10px] font-bold uppercase tracking-widest transition-all ${
                                        g.id === currentGoal.id 
                                            ? 'text-white' 
                                            : 'text-white/40'
                                    }`}
                                >
                                    Goal {idx + 1}
                                </button>
                                {idx < allGoals.length - 1 && <span className="text-white/20">|</span>}
                            </React.Fragment>
                        ))}
                        {allGoals.length > 0 && <span className="text-white/20">|</span>}
                        <button 
                            onClick={handleAddGoal} 
                            className="text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors"
                        >
                            + New
                        </button>
                    </div>

                    {/* Progress Circle */}
                    <div className="flex flex-col items-center">
                        <div className="relative w-28 h-28 mb-4">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="8" fill="none" className="text-white/10" />
                                <circle 
                                    cx="50" cy="50" r="42" 
                                    stroke="currentColor" 
                                    strokeWidth="8" 
                                    fill="none" 
                                    className="text-accent" 
                                    strokeDasharray="263.8" 
                                    strokeDashoffset={263.8 - (263.8 * (user.currentDay / (currentGoal.durationDays || 30)))} 
                                    strokeLinecap="round" 
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-2xl font-black">{Math.round((user.currentDay / (currentGoal.durationDays || 30)) * 100)}%</span>
                            </div>
                        </div>
                        <h3 className="font-bold text-xl mb-1">{currentGoal.title}</h3>
                        <p className="text-white/50 text-xs font-semibold">
                            Day {user.currentDay}/{currentGoal.durationDays} · {user.streak} Streak
                        </p>
                    </div>
                </div>

                {/* Content Cards */}
                <div className="px-5 -mt-6 space-y-4">
                    {/* Agent Alerts */}
                    {agentAlerts.filter(a => !a.isRead).map(alert => (
                        <div 
                            key={alert.id}
                            onClick={() => setView(AppView.STATS)} 
                            className={`rounded-2xl border-l-4 bg-white p-4 flex items-center justify-between cursor-pointer shadow-sm ${
                                alert.severity === 'high' ? 'border-red-500' : 'border-blue-500'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <Icons.AlertTriangle className={`w-5 h-5 ${alert.severity === 'high' ? 'text-red-500' : 'text-blue-500'}`}/>
                                <h3 className="font-bold text-primary text-sm">{alert.title}</h3>
                            </div>
                            <Icons.ChevronRight className="w-4 h-4 text-gray-300" />
                        </div>
                    ))}

                    {/* Daily Missions */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-5">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-primary">Daily Missions</h3>
                                <span className="text-[10px] font-bold bg-secondary text-white px-2.5 py-1 rounded-full uppercase">
                                    {pendingDailyTasks.length} Active
                                </span>
                            </div>
                            
                            {pendingDailyTasks.length === 0 ? (
                                <div className="text-center py-6">
                                    <Icons.Check className="w-10 h-10 text-green-500 mx-auto mb-2" />
                                    <p className="text-gray-500 text-sm">All daily tasks complete!</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {pendingDailyTasks.map(task => (
                                        <div 
                                            key={task.id} 
                                            onClick={() => handleTaskSelect(task.id)} 
                                            className="bg-gray-50 p-4 rounded-xl flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
                                        >
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className="w-9 h-9 bg-secondary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                                    <Icons.Zap className="w-4 h-4 text-secondary" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="font-semibold text-primary text-sm truncate">{task.title}</h4>
                                                    <p className="text-[11px] text-gray-400">{task.estimatedTimeMinutes} min · {task.creditsReward || 50} CR</p>
                                                </div>
                                            </div>
                                            <Icons.ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0"/>
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            <button 
                                onClick={() => setView(AppView.TASK_SELECTION)} 
                                className="w-full mt-4 py-3 bg-primary text-white rounded-xl font-semibold text-sm"
                            >
                                View All Tasks
                            </button>
                        </div>
                    </div>

                    {/* Earn Credits Section */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div 
                            className="p-5 flex items-center justify-between cursor-pointer" 
                            onClick={() => setIsEarnExpanded(!isEarnExpanded)}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 bg-yellow-400 rounded-2xl flex items-center justify-center">
                                    <Icons.Coins className="w-5 h-5 text-yellow-900" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-primary">Earn Credits</h3>
                                    <p className="text-[11px] text-gray-400">Complete offers for rewards</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-black text-primary">{user.credits.toLocaleString()}</span>
                                <span className="text-xs text-gray-400">CR</span>
                                <Icons.ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isEarnExpanded ? 'rotate-180' : ''}`} />
                            </div>
                        </div>
                        
                        {isEarnExpanded && (
                            <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                                {isLoadingOffers ? (
                                    <div className="py-6 text-center">
                                        <div className="w-8 h-8 border-3 border-secondary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                        <p className="text-xs text-gray-400">Loading offers...</p>
                                    </div>
                                ) : adgemOffers.length > 0 ? (
                                    <div className="space-y-2">
                                        {adgemOffers.map(offer => (
                                            <div 
                                                key={offer.id} 
                                                onClick={() => handleOfferClick(offer)}
                                                className="bg-gray-50 p-3 rounded-xl flex items-center gap-3 cursor-pointer hover:bg-gray-100 transition-colors"
                                            >
                                                <div className="w-12 h-12 rounded-xl bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                                                    {offer.icon ? (
                                                        <img src={offer.icon} alt={offer.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Icons.Gift className="w-5 h-5 text-gray-400" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1 mb-0.5">
                                                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${getDifficultyColor(offer.completionDifficulty)}`}>
                                                            {getDifficultyLabel(offer.completionDifficulty)}
                                                        </span>
                                                    </div>
                                                    <h4 className="font-semibold text-primary text-sm truncate">{offer.name}</h4>
                                                </div>
                                                <div className="bg-yellow-400 text-yellow-900 px-2.5 py-1 rounded-lg">
                                                    <span className="font-black text-sm">+{offer.amount}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-6 text-center">
                                        <Icons.Gift className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                                        <p className="text-sm text-gray-400">No offers available</p>
                                    </div>
                                )}
                                
                                <button 
                                    onClick={(e) => { e.stopPropagation(); fetchAdgemOffers(); }}
                                    disabled={isLoadingOffers}
                                    className="w-full mt-3 py-2 text-xs font-semibold text-secondary hover:bg-secondary/5 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    Refresh Offers
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100">
                            <div className="w-8 h-8 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                                <Icons.Flame className="w-4 h-4 text-orange-500" />
                            </div>
                            <span className="text-xl font-black text-primary block">{user.streak}</span>
                            <span className="text-[10px] text-gray-400 uppercase font-semibold">Streak</span>
                        </div>
                        <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100">
                            <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                                <Icons.Check className="w-4 h-4 text-green-500" />
                            </div>
                            <span className="text-xl font-black text-primary block">{completedToday}</span>
                            <span className="text-[10px] text-gray-400 uppercase font-semibold">Done</span>
                        </div>
                        <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100">
                            <div className="w-8 h-8 bg-yellow-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                                <Icons.Coins className="w-4 h-4 text-yellow-600" />
                            </div>
                            <span className="text-xl font-black text-primary block">{user.credits.toLocaleString()}</span>
                            <span className="text-[10px] text-gray-400 uppercase font-semibold">Credits</span>
                        </div>
                    </div>
                </div>

                {/* Check-in Modal */}
                {showCheckIn && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-5">
                        <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl">
                            <h2 className="text-xl font-bold text-primary mb-1">Daily Check-in</h2>
                            <p className="text-sm text-gray-400 mb-5">What did you accomplish today?</p>
                            <textarea 
                                value={checkInText} 
                                onChange={(e) => setCheckInText(e.target.value)} 
                                className="w-full h-28 p-4 bg-gray-50 rounded-xl border border-gray-200 mb-4 focus:outline-none focus:border-secondary resize-none" 
                                placeholder="I researched 3 competitors..." 
                            />
                            <button 
                                onClick={submitDailyCheckIn}
                                disabled={isProcessingCheckIn || !checkInText.trim()}
                                className="w-full py-3.5 bg-primary text-white rounded-xl font-semibold disabled:opacity-50"
                            >
                                {isProcessingCheckIn ? 'Processing...' : 'Submit Check-in'}
                            </button>
                            <button 
                                onClick={() => setShowCheckIn(false)} 
                                className="w-full mt-3 py-2 text-xs font-semibold text-gray-400 uppercase"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
