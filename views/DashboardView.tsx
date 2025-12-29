// views/DashboardView.tsx
import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { AppView, TaskStatus, AgentAlert, Goal, Task, Difficulty } from '../types';
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
    const [showConfetti, setShowConfetti] = useState(false);
    const [progressAnimated, setProgressAnimated] = useState(false);

    // --- SAFETY CHECKS ---
    const dailyTasks = user.dailyTasks || [];
    const allGoals = user.allGoals || [];
    const agentAlerts = user.agentAlerts || [];
    const adgemTransactions = (user as any).adgemTransactions || [];
    const currentGoal = user.goal || { title: "Loading...", category: "General", durationDays: 30, mode: "Standard" };

    // Separate daily tasks from lesson tasks
    const pendingDailyTasks = dailyTasks.filter(t => 
        t.status !== TaskStatus.APPROVED && 
        t.status !== TaskStatus.COMPLETED &&
        !t.isLessonTask
    );

    const completedTodayCount = dailyTasks.filter(t => 
        t.status === TaskStatus.APPROVED || t.status === TaskStatus.COMPLETED
    ).length;

    // Animate progress ring on mount
    useEffect(() => {
        const timer = setTimeout(() => setProgressAnimated(true), 300);
        return () => clearTimeout(timer);
    }, []);

    // Show confetti when all tasks complete
    useEffect(() => {
        if (pendingDailyTasks.length === 0 && completedTodayCount > 0 && !showConfetti) {
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 3000);
        }
    }, [pendingDailyTasks.length, completedTodayCount]);

    // Get greeting based on time
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    };

    // Get first name
    const firstName = user.name?.split(' ')[0] || 'Architect';

    // Fetch AdGem offers when section expands
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
                alert("Payment Successful! Slot Authorized.");
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

    const getDifficultyLabel = (difficulty?: number | string) => {
        if (difficulty === Difficulty.EASY || difficulty === 'EASY' || difficulty === 1) return 'Easy';
        if (difficulty === Difficulty.HARD || difficulty === 'HARD' || difficulty === 3) return 'Hard';
        return 'Medium';
    };

    const getDifficultyColor = (difficulty?: number | string) => {
        if (difficulty === Difficulty.EASY || difficulty === 'EASY' || difficulty === 1) return 'bg-emerald-100 text-emerald-700';
        if (difficulty === Difficulty.HARD || difficulty === 'HARD' || difficulty === 3) return 'bg-rose-100 text-rose-700';
        return 'bg-amber-100 text-amber-700';
    };

    const getTaskIcon = (difficulty?: string) => {
        if (difficulty === 'EASY' || difficulty === Difficulty.EASY) return '⚡';
        if (difficulty === 'HARD' || difficulty === Difficulty.HARD) return '🔥';
        return '💪';
    };

    // Progress calculation
    const progressPercent = Math.round((user.currentDay / (currentGoal.durationDays || 365)) * 100);
    const circumference = 2 * Math.PI * 42;
    const strokeDashoffset = progressAnimated ? circumference - (circumference * progressPercent / 100) : circumference;

    return (
        <div className="h-full overflow-y-auto pb-safe scroll-smooth">
            {/* Confetti Animation */}
            {showConfetti && (
                <div className="fixed inset-0 pointer-events-none z-50">
                    {[...Array(50)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute animate-confetti"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: '-10px',
                                animationDelay: `${Math.random() * 2}s`,
                                animationDuration: `${2 + Math.random() * 2}s`,
                            }}
                        >
                            <div 
                                className="w-3 h-3 rounded-sm"
                                style={{
                                    backgroundColor: ['#3423A6', '#DFF3E4', '#FFD700', '#FF6B6B', '#4ECDC4'][Math.floor(Math.random() * 5)],
                                    transform: `rotate(${Math.random() * 360}deg)`,
                                }}
                            />
                        </div>
                    ))}
                </div>
            )}

            <div className="min-h-full bg-gradient-to-b from-gray-50 to-white pb-28 animate-fade-in">
                {/* Header Section */}
                <div className="bg-primary text-white px-6 pt-safe pt-12 pb-20 rounded-b-[3rem] relative overflow-hidden shadow-2xl shadow-primary/30">
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
                    
                    {/* Top Bar */}
                    <div className="flex justify-between items-center relative z-20 mb-8 mt-4">
                        <div>
                            <p className="text-white/60 text-xs font-medium">{getGreeting()}</p>
                            <h2 className="text-xl font-black tracking-tight">{firstName}</h2>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setShowCheckIn(true)} 
                                className="p-2.5 bg-accent text-primary rounded-xl hover:bg-white transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                            >
                                <Icons.Check className="w-5 h-5" />
                            </button>
                            <button 
                                onClick={() => setView(AppView.SETTINGS)} 
                                className="p-2.5 bg-white/10 rounded-xl hover:bg-white/20 transition-all hover:scale-105 active:scale-95"
                            >
                                <Icons.Settings className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                    
                    {/* Goal Tabs */}
                    <div className="relative z-20 w-full mb-8">
                        <div className="flex justify-center items-center flex-wrap gap-3">
                            {allGoals.map((g, idx) => (
                                <button 
                                    key={g.id}
                                    onClick={() => switchGoal(g)} 
                                    className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                                        g.id === currentGoal.id 
                                            ? 'bg-white text-primary shadow-lg scale-105' 
                                            : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
                                    }`}
                                >
                                    Goal {idx + 1}
                                </button>
                            ))}
                            <button 
                                onClick={handleAddGoal} 
                                className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-white/5 text-white/40 hover:bg-white/10 hover:text-white transition-all border border-dashed border-white/20"
                            >
                                + Add
                            </button>
                        </div>
                    </div>

                    {/* Progress Ring */}
                    <div className="flex flex-col items-center text-center relative z-10 animate-slide-up">
                        <div className="relative w-44 h-44 flex items-center justify-center mb-4">
                            {/* Glow effect */}
                            <div className="absolute inset-0 bg-accent/20 rounded-full blur-xl animate-pulse" />
                            
                            <svg className="w-full h-full -rotate-90 relative z-10" viewBox="0 0 100 100">
                                {/* Background circle */}
                                <circle 
                                    cx="50" cy="50" r="42" 
                                    stroke="currentColor" 
                                    strokeWidth="8" 
                                    fill="none" 
                                    className="text-white/10" 
                                />
                                {/* Progress circle */}
                                <circle 
                                    cx="50" cy="50" r="42" 
                                    stroke="currentColor" 
                                    strokeWidth="8" 
                                    fill="none" 
                                    className="text-accent transition-all duration-1000 ease-out" 
                                    strokeDasharray={circumference}
                                    strokeDashoffset={strokeDashoffset}
                                    strokeLinecap="round"
                                />
                            </svg>
                            
                            <div className="absolute inset-0 flex items-center justify-center flex-col">
                                <span className="text-5xl font-black text-white tracking-tighter">{progressPercent}%</span>
                                <span className="text-white/40 text-xs font-medium mt-1">Complete</span>
                            </div>
                        </div>
                        
                        <h3 className="font-bold text-2xl leading-tight mb-3 max-w-[85%] mx-auto">{currentGoal.title}</h3>
                        
                        <div className="flex items-center gap-2">
                            <span className="text-white/50 text-xs font-bold uppercase tracking-wide bg-white/10 px-4 py-1.5 rounded-full">
                                Day {user.currentDay} of {currentGoal.durationDays}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Quick Stats Bar */}
                <div className="px-6 -mt-6 relative z-20 mb-6">
                    <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-4 flex justify-around items-center border border-gray-100">
                        {/* Streak */}
                        <div className="text-center">
                            <div className="flex items-center justify-center gap-1 mb-1">
                                <span className="text-2xl">🔥</span>
                                <span className="text-2xl font-black text-primary">{user.streak || 0}</span>
                            </div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Streak</p>
                        </div>
                        
                        <div className="w-px h-10 bg-gray-100" />
                        
                        {/* Completed Today */}
                        <div className="text-center">
                            <div className="flex items-center justify-center gap-1 mb-1">
                                <span className="text-2xl">✅</span>
                                <span className="text-2xl font-black text-primary">{completedTodayCount}</span>
                            </div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Done Today</p>
                        </div>
                        
                        <div className="w-px h-10 bg-gray-100" />
                        
                        {/* Credits */}
                        <div className="text-center">
                            <div className="flex items-center justify-center gap-1 mb-1">
                                <span className="text-2xl">💰</span>
                                <span className="text-2xl font-black text-primary">{user.credits || 0}</span>
                            </div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Credits</p>
                        </div>
                    </div>
                </div>

                <div className="px-6 relative z-20 space-y-6">
                    {/* Agent Alerts */}
                    {agentAlerts.filter(a => !a.isRead).map(alert => (
                        <div 
                            key={alert.id}
                            onClick={() => setView(AppView.STATS)} 
                            className={`rounded-2xl border-l-4 shadow-lg bg-white p-4 flex items-center justify-between cursor-pointer hover:shadow-xl transition-all active:scale-[0.98] ${
                                alert.severity === 'high' ? 'border-rose-500 shadow-rose-500/10' : 'border-blue-500 shadow-blue-500/10'
                            }`}
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                    alert.severity === 'high' ? 'bg-rose-100' : 'bg-blue-100'
                                }`}>
                                    <Icons.AlertTriangle className={`w-5 h-5 ${
                                        alert.severity === 'high' ? 'text-rose-500' : 'text-blue-500'
                                    }`}/>
                                </div>
                                <div>
                                    <h3 className="font-bold text-primary text-sm">{alert.title}</h3>
                                    <p className="text-xs text-gray-400">Tap to view details</p>
                                </div>
                            </div>
                            <Icons.ChevronRight className="w-5 h-5 text-gray-300" />
                        </div>
                    ))}

                    {/* Daily Missions Card */}
                    <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 overflow-hidden border border-gray-100">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-5">
                                <div>
                                    <h3 className="font-black text-primary text-xl">Today's Missions</h3>
                                    <p className="text-xs text-gray-400 mt-0.5">Complete tasks to build momentum</p>
                                </div>
                                <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                                    pendingDailyTasks.length === 0 
                                        ? 'bg-emerald-100 text-emerald-700' 
                                        : 'bg-secondary/10 text-secondary'
                                }`}>
                                    {pendingDailyTasks.length === 0 ? '✓ ALL DONE' : `${pendingDailyTasks.length} ACTIVE`}
                                </div>
                            </div>
                            
                            {pendingDailyTasks.length === 0 ? (
                                <div className="text-center py-10 px-4">
                                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                                        <span className="text-4xl">🎉</span>
                                    </div>
                                    <h4 className="font-bold text-primary text-lg mb-2">All tasks complete!</h4>
                                    <p className="text-gray-400 text-sm mb-4">Amazing work today. Keep the streak going!</p>
                                    <button 
                                        onClick={() => setShowCheckIn(true)}
                                        className="text-secondary font-bold text-sm hover:underline"
                                    >
                                        Log your progress →
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {pendingDailyTasks.map((task, index) => (
                                        <div 
                                            key={task.id} 
                                            onClick={() => handleTaskSelect(task.id)} 
                                            className="bg-gray-50 border border-gray-100 p-4 rounded-2xl cursor-pointer hover:shadow-lg hover:border-secondary/20 transition-all active:scale-[0.98] group"
                                            style={{ animationDelay: `${index * 100}ms` }}
                                        >
                                            <div className="flex items-start gap-4">
                                                {/* Task Icon */}
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${
                                                    task.difficulty === Difficulty.EASY || task.difficulty === 'EASY' 
                                                        ? 'bg-emerald-100' 
                                                        : task.difficulty === Difficulty.HARD || task.difficulty === 'HARD'
                                                            ? 'bg-rose-100'
                                                            : 'bg-amber-100'
                                                }`}>
                                                    {getTaskIcon(task.difficulty as string)}
                                                </div>
                                                
                                                {/* Task Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${getDifficultyColor(task.difficulty)}`}>
                                                            {getDifficultyLabel(task.difficulty)}
                                                        </span>
                                                        <span className="text-[9px] font-medium text-gray-400">
                                                            {task.estimatedTimeMinutes || 15} min
                                                        </span>
                                                    </div>
                                                    <h4 className="font-bold text-primary text-sm leading-tight group-hover:text-secondary transition-colors">
                                                        {task.title}
                                                    </h4>
                                                    <p className="text-xs text-gray-400 mt-1 line-clamp-1">
                                                        {task.description}
                                                    </p>
                                                </div>
                                                
                                                {/* Timer/Arrow */}
                                                <div className="flex flex-col items-end gap-2">
                                                    {(task.timeLeft !== undefined && task.timeLeft > 0 && task.timeLeft < ((task.estimatedTimeMinutes || 20) * 60)) ? (
                                                        <div className={`px-2 py-1 rounded-lg text-xs font-bold ${
                                                            task.isTimerActive 
                                                                ? 'bg-emerald-100 text-emerald-700 animate-pulse' 
                                                                : 'bg-amber-100 text-amber-700'
                                                        }`}>
                                                            {calculateRealTimeRemaining(task)}
                                                        </div>
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-secondary group-hover:text-white transition-all">
                                                            <Icons.ChevronRight className="w-4 h-4" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            <button 
                                onClick={() => setView(AppView.TASK_SELECTION)} 
                                className="w-full mt-5 py-3.5 bg-gray-100 hover:bg-gray-200 text-primary font-bold text-sm rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                <Icons.Grid className="w-4 h-4" />
                                Browse All Tasks
                            </button>
                        </div>
                    </div>

                    {/* Earn Credits Section */}
                    <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 overflow-hidden border border-gray-100 transition-all duration-300">
                        <div 
                            className="p-6 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors active:bg-gray-100" 
                            onClick={() => setIsEarnExpanded(!isEarnExpanded)}
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-2xl flex items-center justify-center shadow-lg shadow-yellow-400/30">
                                    <Icons.Coins className="w-7 h-7 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-primary">Earn Credits</h3>
                                    <p className="text-xs text-gray-400">Complete offers for rewards</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="text-right">
                                    <span className="text-2xl font-black text-primary">{user.credits || 0}</span>
                                    <span className="text-xs text-gray-400 ml-1">CR</span>
                                </div>
                                <div className={`w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center transition-transform duration-300 ${isEarnExpanded ? 'rotate-180' : ''}`}>
                                    <Icons.ChevronDown className="w-5 h-5 text-gray-400" />
                                </div>
                            </div>
                        </div>
                        
                        {isEarnExpanded && (
                            <div className="px-6 pb-6 animate-slide-up">
                                {isLoadingOffers && (
                                    <div className="py-10 text-center">
                                        <div className="w-12 h-12 border-4 border-secondary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                        <p className="text-sm text-gray-400">Finding best offers...</p>
                                    </div>
                                )}

                                {!isLoadingOffers && adgemOffers.length > 0 && (
                                    <div className="space-y-3">
                                        {adgemOffers.map(offer => (
                                            <div 
                                                key={offer.id} 
                                                onClick={() => handleOfferClick(offer)}
                                                className="bg-gray-50 border border-gray-100 p-4 rounded-2xl flex items-center gap-4 cursor-pointer hover:shadow-lg hover:border-secondary/30 transition-all active:scale-[0.98]"
                                            >
                                                <div className="w-14 h-14 rounded-xl bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                                                    {offer.icon ? (
                                                        <img src={offer.icon} alt={offer.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Icons.Gift className="w-6 h-6 text-gray-400" />
                                                    )}
                                                </div>
                                                
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-primary text-sm leading-tight truncate">
                                                        {offer.name}
                                                    </h4>
                                                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                                                        {offer.shortDescription || offer.description}
                                                    </p>
                                                </div>
                                                
                                                <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-3 py-2 rounded-xl flex-shrink-0">
                                                    <span className="font-black text-sm">+{offer.amount}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {!isLoadingOffers && adgemOffers.length === 0 && (
                                    <div className="py-10 text-center">
                                        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                            <span className="text-3xl">📦</span>
                                        </div>
                                        <p className="text-sm text-gray-500 font-medium">No offers right now</p>
                                        <p className="text-xs text-gray-400 mt-1">Check back later for new opportunities</p>
                                    </div>
                                )}

                                {adgemTransactions.length > 0 && (
                                    <div className="mt-6 pt-4 border-t border-gray-100">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                                            Recent Earnings
                                        </h4>
                                        <div className="space-y-2">
                                            {adgemTransactions.slice(-3).reverse().map((t: any) => (
                                                <div key={t.transactionId} className="bg-emerald-50 p-3 rounded-xl flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                                                        <Icons.Check className="w-4 h-4 text-emerald-600" />
                                                    </div>
                                                    <span className="flex-1 font-medium text-emerald-700 text-sm truncate">{t.offerName}</span>
                                                    <span className="text-xs font-bold text-emerald-600">+{t.credits}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <button 
                                    onClick={(e) => { e.stopPropagation(); fetchAdgemOffers(); }}
                                    disabled={isLoadingOffers}
                                    className="w-full mt-4 py-3 text-xs font-bold text-secondary uppercase tracking-wider hover:bg-secondary/5 rounded-xl transition-colors disabled:opacity-50"
                                >
                                    {isLoadingOffers ? 'Refreshing...' : 'Refresh Offers'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Check-in Modal */}
                {showCheckIn && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 animate-fade-in">
                        <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl animate-scale-in">
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <span className="text-3xl">📝</span>
                                </div>
                                <h2 className="text-2xl font-black text-primary">Daily Check-in</h2>
                                <p className="text-sm text-gray-400 mt-1">What did you accomplish today?</p>
                            </div>
                            
                            <textarea 
                                value={checkInText} 
                                onChange={(e) => setCheckInText(e.target.value)} 
                                className="w-full h-32 p-4 bg-gray-50 rounded-2xl border-2 border-gray-100 focus:border-secondary focus:outline-none resize-none text-primary placeholder-gray-300 transition-colors" 
                                placeholder="I researched 3 competitors, drafted the intro..." 
                            />
                            
                            <div className="mt-6 space-y-3">
                                <Button 
                                    onClick={submitDailyCheckIn} 
                                    isLoading={isProcessingCheckIn} 
                                    disabled={!checkInText.trim()}
                                >
                                    Submit & Generate Tasks
                                </Button>
                                <button 
                                    onClick={() => setShowCheckIn(false)} 
                                    className="w-full py-3 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Add confetti animation styles */}
            <style>{`
                @keyframes confetti {
                    0% { transform: translateY(0) rotate(0deg); opacity: 1; }
                    100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
                }
                .animate-confetti {
                    animation: confetti 3s ease-out forwards;
                }
            `}</style>
        </div>
    );
}
