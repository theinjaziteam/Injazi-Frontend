// views/DashboardView.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { AppView, TaskStatus, AgentAlert, Goal, Task, Difficulty } from '../types';
import { Button, Card, Badge, Icons } from '../components/UIComponents';
import { updateUserProfile, generateDailyTasks } from '../services/geminiService';
import { api } from '../services/api';

export default function DashboardView() {
    const { 
       user, setUser, setView, setShowCheckIn, showCheckIn,
    lessons, showConfetti
    } = useApp();
    const [isEarnExpanded, setIsEarnExpanded] = useState(false);
    const [checkInText, setCheckInText] = useState('');
    const [isProcessingCheckIn, setIsProcessingCheckIn] = useState(false);
    const [isLoadingOffers, setIsLoadingOffers] = useState(false);
    const [adgemOffers, setAdgemOffers] = useState<any[]>([]);
    const [progressAnimated, setProgressAnimated] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

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

    // ============================================
    // UPDATED: Difficulty colors using PRIMARY shades
    // Primary: #171738 (dark navy/indigo)
    // Easy = Light shade, Medium = Mid shade, Hard = Dark shade
    // ============================================
    const getDifficultyLabel = (difficulty?: number | string) => {
        if (difficulty === Difficulty.EASY || difficulty === 'EASY' || difficulty === 1) return 'Easy';
        if (difficulty === Difficulty.HARD || difficulty === 'HARD' || difficulty === 3) return 'Hard';
        return 'Medium';
    };

    // CHANGED: Now uses shades of primary (#171738) instead of green/yellow/red
    const getDifficultyColor = (difficulty?: number | string) => {
        // Easy = lightest primary shade (good contrast on light bg)
        if (difficulty === Difficulty.EASY || difficulty === 'EASY' || difficulty === 1) {
            return 'bg-[#E8E8F0] text-[#171738]';
        }
        // Hard = darkest primary shade
        if (difficulty === Difficulty.HARD || difficulty === 'HARD' || difficulty === 3) {
            return 'bg-[#171738] text-white';
        }
        // Medium = mid primary shade
        return 'bg-[#3423A6] text-white';
    };

    // CHANGED: Task icon background colors to match primary shades
    const getDifficultyBgColor = (difficulty?: number | string) => {
        if (difficulty === Difficulty.EASY || difficulty === 'EASY' || difficulty === 1) {
            return 'bg-[#E8E8F0]';
        }
        if (difficulty === Difficulty.HARD || difficulty === 'HARD' || difficulty === 3) {
            return 'bg-[#2A2A5A]';
        }
        return 'bg-[#4A3DC7]/20';
    };

    // CHANGED: Task icon colors to use primary shades
    const getDifficultyIconColor = (difficulty?: number | string) => {
        if (difficulty === Difficulty.EASY || difficulty === 'EASY' || difficulty === 1) {
            return 'text-[#3423A6]';
        }
        if (difficulty === Difficulty.HARD || difficulty === 'HARD' || difficulty === 3) {
            return 'text-[#9B93D9]';
        }
        return 'text-[#3423A6]';
    };

    // SVG Icons for tasks - UPDATED to use primary color scheme
    const TaskIcon = ({ difficulty }: { difficulty?: string }) => {
        const colorClass = getDifficultyIconColor(difficulty);
        
        if (difficulty === 'EASY' || difficulty === Difficulty.EASY) {
            return (
                <svg className={`w-6 h-6 ${colorClass}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
            );
        }
        if (difficulty === 'HARD' || difficulty === Difficulty.HARD) {
            return (
                <svg className={`w-6 h-6 ${colorClass}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
                </svg>
            );
        }
        return (
            <svg className={`w-6 h-6 ${colorClass}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
        );
    };

    // SVG Icons for stats
    const FlameIcon = () => (
        <svg className="w-6 h-6 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 23c-3.866 0-7-3.134-7-7 0-2.551 1.27-4.484 2.659-6.233.694-.875 1.436-1.707 2.095-2.57.394-.516.751-1.05 1.046-1.63.256-.504.449-1.04.578-1.567-.418 1.573-.075 3.156.64 4.424.715 1.27 1.782 2.262 2.982 2.965V9c0-1 .5-3 2-4.5 0 2.5 1 4 2 5s2 3 2 5c0 3.866-3.134 7-7 7z"/>
        </svg>
    );

    const CheckCircleIcon = () => (
        <svg className="w-6 h-6 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
    );

    // CHANGED: Credits icon now uses a warm gold/amber color (not gradient)
    const CoinsIcon = () => (
        <svg className="w-6 h-6 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8" cy="8" r="6"/>
            <path d="M18.09 10.37A6 6 0 1 1 10.34 18"/>
            <path d="M7 6h1v4"/>
        </svg>
    );

    const CelebrationIcon = () => (
        <svg className="w-12 h-12 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5.8 11.3 2 22l10.7-3.79"/>
            <path d="M4 3h.01"/>
            <path d="M22 8h.01"/>
            <path d="M15 2h.01"/>
            <path d="M22 20h.01"/>
            <path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12v0c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10"/>
            <path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11v0c-.11.7-.72 1.22-1.43 1.22H17"/>
            <path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98v0C9.52 4.9 9 5.52 9 6.23V7"/>
            <path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z"/>
        </svg>
    );

    // Progress calculation
    const progressPercent = Math.round((user.currentDay / (currentGoal.durationDays || 365)) * 100);
    const circumference = 2 * Math.PI * 42;
    const strokeDashoffset = progressAnimated ? circumference - (circumference * progressPercent / 100) : circumference;

    return (
        <div 
            ref={scrollRef}
            className="h-full overflow-y-auto overflow-x-hidden overscroll-none"
            style={{ 
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'none'
            }}
        >
            {/* Confetti Animation */}
            {showConfetti && (
                <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
                    {[...Array(30)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: '-20px',
                                animation: `confetti-fall ${2 + Math.random() * 1.5}s ease-out forwards`,
                                animationDelay: `${Math.random() * 0.5}s`,
                            }}
                        >
                            <svg 
                                width="12" 
                                height="12" 
                                viewBox="0 0 12 12"
                                style={{
                                    transform: `rotate(${Math.random() * 360}deg)`,
                                    fill: ['#3423A6', '#DFF3E4', '#F59E0B', '#171738', '#4ECDC4', '#9B59B6'][Math.floor(Math.random() * 6)],
                                }}
                            >
                                {Math.random() > 0.5 ? (
                                    <rect width="12" height="12" rx="2" />
                                ) : (
                                    <circle cx="6" cy="6" r="6" />
                                )}
                            </svg>
                        </div>
                    ))}
                </div>
            )}

            <div className="min-h-full bg-gray-50">
                {/* Header Section - Fixed visual at top */}
                <div className="bg-primary text-white px-6 pt-safe pb-20 rounded-b-[2.5rem] relative overflow-hidden shadow-2xl shadow-primary/30">
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
                    
                    {/* Top Bar */}
                    <div className="flex justify-between items-center relative z-20 pt-4 mb-8">
                        <div>
                            <p className="text-white/60 text-xs font-medium">{getGreeting()}</p>
                            <h2 className="text-xl font-black tracking-tight">{firstName}</h2>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setShowCheckIn(true)} 
                                className="p-2.5 bg-accent text-primary rounded-xl hover:bg-white transition-all shadow-lg active:scale-95"
                            >
                                <Icons.Check className="w-5 h-5" />
                            </button>
                            <button 
                                onClick={() => setView(AppView.SETTINGS)} 
                                className="p-2.5 bg-white/10 rounded-xl hover:bg-white/20 transition-all active:scale-95"
                            >
                                <Icons.Settings className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                    
                    {/* Goal Tabs */}
                    <div className="relative z-20 w-full mb-8">
                        <div className="flex justify-center items-center flex-wrap gap-2">
                            {allGoals.map((g, idx) => (
                                <button 
                                    key={g.id}
                                    onClick={() => switchGoal(g)} 
                                    className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 ${
                                        g.id === currentGoal.id 
                                            ? 'bg-white text-primary shadow-lg' 
                                            : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
                                    }`}
                                >
                                    Goal {idx + 1}
                                </button>
                            ))}
                            <button 
                                onClick={handleAddGoal} 
                                className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-white/5 text-white/40 hover:bg-white/10 hover:text-white transition-all border border-dashed border-white/20 active:scale-95"
                            >
                                + Add
                            </button>
                        </div>
                    </div>

                    {/* Progress Ring */}
                    <div className="flex flex-col items-center text-center relative z-10">
                        <div className="relative w-40 h-40 flex items-center justify-center mb-4">
                            {/* Glow effect */}
                            <div className="absolute inset-2 bg-accent/20 rounded-full blur-xl" />
                            
                            <svg className="w-full h-full -rotate-90 relative z-10" viewBox="0 0 100 100">
                                <circle 
                                    cx="50" cy="50" r="42" 
                                    stroke="currentColor" 
                                    strokeWidth="8" 
                                    fill="none" 
                                    className="text-white/10" 
                                />
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
                                <span className="text-4xl font-black text-white tracking-tighter">{progressPercent}%</span>
                                <span className="text-white/40 text-[10px] font-medium mt-0.5">Complete</span>
                            </div>
                        </div>
                        
                        <h3 className="font-bold text-xl leading-tight mb-2 max-w-[85%] mx-auto">{currentGoal.title}</h3>
                        
                        <span className="text-white/50 text-xs font-bold uppercase tracking-wide bg-white/10 px-4 py-1.5 rounded-full">
                            Day {user.currentDay} of {currentGoal.durationDays}
                        </span>
                    </div>
                </div>

                {/* Quick Stats Bar */}
                <div className="px-5 -mt-6 relative z-20 mb-5">
                    <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 p-3 flex justify-around items-center border border-gray-100">
                        <div className="text-center flex-1">
                            <div className="flex items-center justify-center gap-1.5 mb-0.5">
                                <FlameIcon />
                                <span className="text-xl font-black text-primary">{user.streak || 0}</span>
                            </div>
                            <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Streak</p>
                        </div>
                        
                        <div className="w-px h-8 bg-gray-100" />
                        
                        <div className="text-center flex-1">
                            <div className="flex items-center justify-center gap-1.5 mb-0.5">
                                <CheckCircleIcon />
                                <span className="text-xl font-black text-primary">{completedTodayCount}</span>
                            </div>
                            <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Done</p>
                        </div>
                        
                        <div className="w-px h-8 bg-gray-100" />
                        
                        <div className="text-center flex-1">
                            <div className="flex items-center justify-center gap-1.5 mb-0.5">
                                <CoinsIcon />
                                <span className="text-xl font-black text-primary">{user.credits || 0}</span>
                            </div>
                            <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Credits</p>
                        </div>
                    </div>
                </div>

                <div className="px-5 relative z-20 space-y-5 pb-32">
                    {/* Agent Alerts */}
                    {agentAlerts.filter(a => !a.isRead).map(alert => (
                        <div 
                            key={alert.id}
                            onClick={() => setView(AppView.STATS)} 
                            className={`rounded-2xl border-l-4 shadow-md bg-white p-4 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform ${
                                alert.severity === 'high' ? 'border-rose-500' : 'border-blue-500'
                            }`}
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                    alert.severity === 'high' ? 'bg-rose-100' : 'bg-blue-100'
                                }`}>
                                    <Icons.AlertTriangle className={`w-5 h-5 ${
                                        alert.severity === 'high' ? 'text-rose-500' : 'text-blue-500'
                                    }`}/>
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-bold text-primary text-sm truncate">{alert.title}</h3>
                                    <p className="text-[10px] text-gray-400">Tap to view</p>
                                </div>
                            </div>
                            <Icons.ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
                        </div>
                    ))}

                    {/* Daily Missions Card */}
                    <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100">
                        <div className="p-5">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h3 className="font-black text-primary text-lg">Today's Missions</h3>
                                    <p className="text-[10px] text-gray-400 mt-0.5">Complete tasks to build momentum</p>
                                </div>
                                <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                    pendingDailyTasks.length === 0 
                                        ? 'bg-emerald-100 text-emerald-700' 
                                        : 'bg-secondary/10 text-secondary'
                                }`}>
                                    {pendingDailyTasks.length === 0 ? ' DONE' : `${pendingDailyTasks.length} LEFT`}
                                </div>
                            </div>
                            
                            {pendingDailyTasks.length === 0 ? (
                                <div className="text-center py-8 px-4">
                                    <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                        <CelebrationIcon />
                                    </div>
                                    <h4 className="font-bold text-primary text-base mb-1">All tasks complete!</h4>
                                    <p className="text-gray-400 text-xs mb-3">Amazing work. Keep the momentum!</p>
                                    <button 
                                        onClick={() => setShowCheckIn(true)}
                                        className="text-secondary font-bold text-xs active:scale-95 transition-transform"
                                    >
                                        Log your progress 
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2.5">
                                    {pendingDailyTasks.map((task) => (
                                        <div 
                                            key={task.id} 
                                            onClick={() => handleTaskSelect(task.id)} 
                                            className="bg-gray-50 border border-gray-100 p-3.5 rounded-xl cursor-pointer active:scale-[0.98] transition-transform"
                                        >
                                            <div className="flex items-center gap-3">
                                                {/* Task Icon - CHANGED: Uses primary color shades */}
                                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${getDifficultyBgColor(task.difficulty)}`}>
                                                    <TaskIcon difficulty={task.difficulty as string} />
                                                </div>
                                                
                                                {/* Task Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        {/* CHANGED: Difficulty badge uses primary shades */}
                                                        <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${getDifficultyColor(task.difficulty)}`}>
                                                            {getDifficultyLabel(task.difficulty)}
                                                        </span>
                                                        <span className="text-[9px] font-medium text-gray-400">
                                                            {task.estimatedTimeMinutes || 15}m
                                                        </span>
                                                    </div>
                                                    <h4 className="font-bold text-primary text-sm leading-tight truncate">
                                                        {task.title}
                                                    </h4>
                                                </div>
                                                
                                                {/* Timer/Arrow */}
                                                {(task.timeLeft !== undefined && task.timeLeft > 0 && task.timeLeft < ((task.estimatedTimeMinutes || 20) * 60)) ? (
                                                    <div className={`px-2 py-1 rounded-lg text-[10px] font-bold flex-shrink-0 ${
                                                        task.isTimerActive 
                                                            ? 'bg-[#DFF3E4] text-[#171738]' 
                                                            : 'bg-[#E8E8F0] text-[#171738]'
                                                    }`}>
                                                        {calculateRealTimeRemaining(task)}
                                                    </div>
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                                        <Icons.ChevronRight className="w-4 h-4 text-gray-400" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            <button 
                                onClick={() => setView(AppView.TASK_SELECTION)} 
                                className="w-full mt-4 py-3 bg-gray-100 text-primary font-bold text-sm rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                <Icons.Grid className="w-4 h-4" />
                                Browse All Tasks
                            </button>
                        </div>
                    </div>

                    {/* Earn Credits Section - CHANGED: Solid amber/gold instead of gradient */}
                    <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100">
                        <div 
                            className="p-5 flex items-center justify-between cursor-pointer active:bg-gray-50 transition-colors" 
                            onClick={() => setIsEarnExpanded(!isEarnExpanded)}
                        >
                            <div className="flex items-center gap-3">
                                {/* CHANGED: Solid amber background instead of gradient */}
                                <div className="w-12 h-12 bg-amber-400 rounded-xl flex items-center justify-center shadow-lg shadow-amber-400/30">
                                    <svg className="w-6 h-6 text-amber-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="8" cy="8" r="6"/>
                                        <path d="M18.09 10.37A6 6 0 1 1 10.34 18"/>
                                        <path d="M7 6h1v4"/>
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-primary">Earn Credits</h3>
                                    <p className="text-[10px] text-gray-400">Complete offers for rewards</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="text-right">
                                    <span className="text-xl font-black text-primary">{user.credits || 0}</span>
                                    <span className="text-[10px] text-gray-400 ml-0.5">CR</span>
                                </div>
                                <div className={`w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center transition-transform duration-300 ${isEarnExpanded ? 'rotate-180' : ''}`}>
                                    <Icons.ChevronDown className="w-4 h-4 text-gray-400" />
                                </div>
                            </div>
                        </div>
                        
                        {isEarnExpanded && (
                            <div className="px-5 pb-5 border-t border-gray-50">
                                {isLoadingOffers && (
                                    <div className="py-8 text-center">
                                        <div className="w-10 h-10 border-3 border-secondary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                                        <p className="text-xs text-gray-400">Finding offers...</p>
                                    </div>
                                )}

                                {!isLoadingOffers && adgemOffers.length > 0 && (
                                    <div className="space-y-2.5 pt-4">
                                        {adgemOffers.map(offer => (
                                            <div 
                                                key={offer.id} 
                                                onClick={() => handleOfferClick(offer)}
                                                className="bg-gray-50 border border-gray-100 p-3 rounded-xl flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform"
                                            >
                                                <div className="w-12 h-12 rounded-xl bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                                                    {offer.icon ? (
                                                        <img src={offer.icon} alt={offer.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Icons.Gift className="w-5 h-5 text-gray-400" />
                                                    )}
                                                </div>
                                                
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-primary text-sm leading-tight truncate">
                                                        {offer.name}
                                                    </h4>
                                                    <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                                                        {offer.shortDescription || offer.description}
                                                    </p>
                                                </div>
                                                
                                                {/* CHANGED: Solid amber badge instead of gradient */}
                                                <div className="bg-amber-400 text-amber-900 px-2.5 py-1.5 rounded-lg flex-shrink-0">
                                                    <span className="font-black text-xs">+{offer.amount}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {!isLoadingOffers && adgemOffers.length === 0 && (
                                    <div className="py-8 text-center">
                                        <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                                            <svg className="w-7 h-7 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                                                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                                                <line x1="12" y1="22.08" x2="12" y2="12"/>
                                            </svg>
                                        </div>
                                        <p className="text-sm text-gray-500 font-medium">No offers right now</p>
                                        <p className="text-[10px] text-gray-400 mt-1">Check back later</p>
                                    </div>
                                )}

                                {adgemTransactions.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                                            Recent Earnings
                                        </h4>
                                        <div className="space-y-1.5">
                                            {adgemTransactions.slice(-3).reverse().map((t: any) => (
                                                <div key={t.transactionId} className="bg-emerald-50 p-2.5 rounded-lg flex items-center gap-2.5">
                                                    <div className="w-7 h-7 rounded-md bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                                        <Icons.Check className="w-3.5 h-3.5 text-emerald-600" />
                                                    </div>
                                                    <span className="flex-1 font-medium text-emerald-700 text-xs truncate">{t.offerName}</span>
                                                    <span className="text-[10px] font-bold text-emerald-600">+{t.credits}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <button 
                                    onClick={(e) => { e.stopPropagation(); fetchAdgemOffers(); }}
                                    disabled={isLoadingOffers}
                                    className="w-full mt-4 py-2.5 text-[10px] font-bold text-secondary uppercase tracking-wider active:bg-secondary/5 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {isLoadingOffers ? 'Refreshing...' : 'Refresh Offers'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Check-in Modal */}
            {showCheckIn && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-5">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <div className="text-center mb-5">
                            <div className="w-14 h-14 bg-accent rounded-xl flex items-center justify-center mx-auto mb-3">
                                <svg className="w-7 h-7 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                            </div>
                            <h2 className="text-xl font-black text-primary">Daily Check-in</h2>
                            <p className="text-xs text-gray-400 mt-1">What did you accomplish today?</p>
                        </div>
                        
                        <textarea 
                            value={checkInText} 
                            onChange={(e) => setCheckInText(e.target.value)} 
                            className="w-full h-28 p-3.5 bg-gray-50 rounded-xl border-2 border-gray-100 focus:border-secondary focus:outline-none resize-none text-primary text-sm placeholder-gray-300 transition-colors" 
                            placeholder="I researched 3 competitors, drafted the intro..." 
                        />
                        
                        <div className="mt-5 space-y-2.5">
                            <Button 
                                onClick={submitDailyCheckIn} 
                                isLoading={isProcessingCheckIn} 
                                disabled={!checkInText.trim()}
                            >
                                Submit & Generate Tasks
                            </Button>
                            <button 
                                onClick={() => setShowCheckIn(false)} 
                                className="w-full py-2.5 text-xs font-bold text-gray-400 active:text-gray-600 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confetti CSS */}
            <style>{`
                @keyframes confetti-fall {
                    0% {
                        transform: translateY(0) rotate(0deg);
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(100vh) rotate(720deg);
                        opacity: 0;
                    }
                }
            `}</style>
        </div>
    );
}
