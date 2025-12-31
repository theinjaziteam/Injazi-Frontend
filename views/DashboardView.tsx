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
    const [liquidFill, setLiquidFill] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);

    // --- SAFETY CHECKS ---
    const dailyTasks = user.dailyTasks || [];
    const allGoals = user.allGoals || [];
    const agentAlerts = user.agentAlerts || [];
    const adgemTransactions = (user as any).adgemTransactions || [];
    const currentGoal = user.goal || { title: "Loading...", category: "General", durationDays: 30, mode: "Standard" };

    // Daily tasks only (for the progress counter)
    const dailyOnlyTasks = dailyTasks.filter(t => !t.isLessonTask);
    
    // ALL pending tasks (daily + lesson) for the missions list
    const allPendingTasks = dailyTasks.filter(t => 
        t.status !== TaskStatus.APPROVED && 
        t.status !== TaskStatus.COMPLETED
    );

    // Separate them for display purposes
    const pendingDailyTasks = allPendingTasks.filter(t => !t.isLessonTask);
    const pendingLessonTasks = allPendingTasks.filter(t => t.isLessonTask);

    // Daily progress counts (only daily tasks)
    const completedDailyCount = dailyOnlyTasks.filter(t => 
        t.status === TaskStatus.APPROVED || t.status === TaskStatus.COMPLETED
    ).length;
    const totalDailyTasks = dailyOnlyTasks.length;

    // All tasks complete check (daily only for the progress badge)
    const allDailyTasksComplete = pendingDailyTasks.length === 0 && totalDailyTasks > 0;
    
    // Check if ALL tasks (including lessons) are complete
    const allTasksComplete = allPendingTasks.length === 0 && dailyTasks.length > 0;

    // Animate progress on mount
    useEffect(() => {
        const timer = setTimeout(() => {
            setProgressAnimated(true);
            const targetFill = Math.round((user.currentDay / (currentGoal.durationDays || 365)) * 100);
            let current = 0;
            const interval = setInterval(() => {
                current += 1;
                if (current >= targetFill) {
                    setLiquidFill(targetFill);
                    clearInterval(interval);
                } else {
                    setLiquidFill(current);
                }
            }, 20);
            return () => clearInterval(interval);
        }, 300);
        return () => clearTimeout(timer);
    }, [user.currentDay, currentGoal.durationDays]);

    // Get greeting based on time
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    };

    const firstName = user.name?.split(' ')[0] || 'Architect';

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

    const formatCredits = (num: number) => {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toLocaleString();
    };

    // UPDATED: Difficulty styling using PRIMARY color shades
    // Easy = Lightest, Medium = Mid, Hard = Darkest
    const getDifficultyLabel = (difficulty?: number | string) => {
        if (difficulty === Difficulty.EASY || difficulty === 'EASY' || difficulty === 1) return 'Easy';
        if (difficulty === Difficulty.HARD || difficulty === 'HARD' || difficulty === 3) return 'Hard';
        return 'Medium';
    };

    // Primary color shades for difficulty badges
    const getDifficultyColor = (difficulty?: number | string) => {
        // Easy - Lightest primary shade
        if (difficulty === Difficulty.EASY || difficulty === 'EASY' || difficulty === 1) {
            return 'bg-[#E8E8F0] text-[#3423A6] border border-[#D0D0E0]';
        }
        // Hard - Darkest primary shade
        if (difficulty === Difficulty.HARD || difficulty === 'HARD' || difficulty === 3) {
            return 'bg-[#171738] text-white border border-[#171738]';
        }
        // Medium - Mid primary shade
        return 'bg-[#3423A6] text-white border border-[#3423A6]';
    };

    // Background colors for task icons - primary shades
    const getDifficultyBgColor = (difficulty?: number | string) => {
        // Easy - Very light primary
        if (difficulty === Difficulty.EASY || difficulty === 'EASY' || difficulty === 1) {
            return 'bg-gradient-to-br from-[#F0F0F8] to-[#E8E8F0]';
        }
        // Hard - Dark primary
        if (difficulty === Difficulty.HARD || difficulty === 'HARD' || difficulty === 3) {
            return 'bg-gradient-to-br from-[#2A2A5C] to-[#171738]';
        }
        // Medium - Mid primary
        return 'bg-gradient-to-br from-[#4834C7]/20 to-[#3423A6]/20';
    };

    // Icon colors for tasks - primary shades
    const getDifficultyIconColor = (difficulty?: number | string) => {
        // Easy - Medium primary for contrast on light bg
        if (difficulty === Difficulty.EASY || difficulty === 'EASY' || difficulty === 1) {
            return 'text-[#3423A6]';
        }
        // Hard - Light color for contrast on dark bg
        if (difficulty === Difficulty.HARD || difficulty === 'HARD' || difficulty === 3) {
            return 'text-[#A5A5D0]';
        }
        // Medium
        return 'text-[#3423A6]';
    };

    const TaskIcon = ({ difficulty }: { difficulty?: string }) => {
        const colorClass = getDifficultyIconColor(difficulty);
        
        if (difficulty === 'EASY' || difficulty === Difficulty.EASY) {
            return (
                <svg className={`w-5 h-5 ${colorClass}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
            );
        }
        if (difficulty === 'HARD' || difficulty === Difficulty.HARD) {
            return (
                <svg className={`w-5 h-5 ${colorClass}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
                </svg>
            );
        }
        return (
            <svg className={`w-5 h-5 ${colorClass}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
            </svg>
        );
    };

    // Lesson Task Icon
    const LessonIcon = () => (
        <svg className="w-5 h-5 text-[#3423A6]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            <path d="M8 7h8"/>
            <path d="M8 11h6"/>
        </svg>
    );

    // Custom Coin Icon Component
    const CoinIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
        <svg className={className} viewBox="0 0 24 24" fill="none">
            <ellipse cx="12" cy="14" rx="9" ry="4" fill="#D97706"/>
            <ellipse cx="12" cy="12" rx="9" ry="4" fill="url(#coinGradient)"/>
            <ellipse cx="12" cy="12" rx="6.5" ry="2.8" fill="none" stroke="#D97706" strokeWidth="0.8"/>
            <circle cx="12" cy="12" r="2" fill="#D97706"/>
            <ellipse cx="9" cy="11" rx="1.5" ry="0.8" fill="white" fillOpacity="0.4"/>
            <defs>
                <linearGradient id="coinGradient" x1="3" y1="8" x2="21" y2="16">
                    <stop offset="0%" stopColor="#FCD34D"/>
                    <stop offset="50%" stopColor="#FBBF24"/>
                    <stop offset="100%" stopColor="#F59E0B"/>
                </linearGradient>
            </defs>
        </svg>
    );

    const progressPercent = Math.round((user.currentDay / (currentGoal.durationDays || 365)) * 100);

    return (
        <div 
            ref={scrollRef}
            className="h-full overflow-y-auto overflow-x-hidden overscroll-none bg-[#F7F8FC]"
            style={{ 
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'none'
            }}
        >
            {/* Confetti Animation */}
            {showConfetti && (
                <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
                    {[...Array(40)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: '-20px',
                                animation: `confetti-fall ${2.5 + Math.random() * 2}s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`,
                                animationDelay: `${Math.random() * 0.8}s`,
                            }}
                        >
                            <div 
                                style={{
                                    width: `${8 + Math.random() * 8}px`,
                                    height: `${8 + Math.random() * 8}px`,
                                    background: ['#3423A6', '#171738', '#4834C7', '#6B5DD3', '#DFF3E4', '#A7F3D0'][Math.floor(Math.random() * 6)],
                                    borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                                    transform: `rotate(${Math.random() * 360}deg)`,
                                }}
                            />
                        </div>
                    ))}
                </div>
            )}

            <div className="min-h-full">
                {/* Header Section */}
                <div className="bg-gradient-to-br from-[#171738] via-[#1e1e4a] to-[#2a2a5c] text-white px-5 pt-safe pb-24 relative overflow-hidden">
                    {/* Subtle organic background shapes */}
                    <div className="absolute top-0 right-0 w-80 h-80 bg-[#3423A6]/20 rounded-full blur-[100px] -translate-y-1/3 translate-x-1/4" />
                    <div className="absolute bottom-0 left-0 w-60 h-60 bg-[#DFF3E4]/10 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4" />
                    <div className="absolute top-1/2 left-1/2 w-40 h-40 bg-[#3423A6]/10 rounded-full blur-[60px] -translate-x-1/2 -translate-y-1/2" />
                    
                    {/* Top Bar */}
                    <div className="flex justify-between items-start relative z-20 pt-4 mb-6">
                        <div>
                            <p className="text-white/50 text-[11px] font-medium tracking-wide uppercase">{getGreeting()}</p>
                            <h2 className="text-2xl font-black tracking-tight mt-0.5">{firstName}</h2>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            {/* Credits - Integrated design */}
                            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/10">
                                <CoinIcon className="w-5 h-5" />
                                <span className="text-sm font-bold text-white/90">{formatCredits(user.credits || 0)}</span>
                            </div>
                            
                            {/* FIX #6: Added aria-label and focus-visible for accessibility */}
                            <button 
                                onClick={() => setView(AppView.SETTINGS)} 
                                className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-all active:scale-95 backdrop-blur-sm focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                                aria-label="Open settings"
                            >
                                <Icons.Settings className="w-5 h-5 text-white/80" />
                            </button>
                        </div>
                    </div>
                    
                    {/* Goal Tabs */}
                    <div className="relative z-20 w-full mb-8">
                        <div className="flex justify-center items-center flex-wrap gap-1.5">
                            {allGoals.map((g, idx) => (
                                <button 
                                    key={g.id}
                                    onClick={() => switchGoal(g)} 
                                    className={`px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95 ${
                                        g.id === currentGoal.id 
                                            ? 'bg-white text-[#171738] shadow-lg shadow-black/20' 
                                            : 'bg-white/8 text-white/50 hover:bg-white/15 hover:text-white/80'
                                    }`}
                                >
                                    Goal {idx + 1}
                                </button>
                            ))}
                            <button 
                                onClick={handleAddGoal} 
                                className="px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-transparent text-white/30 hover:text-white/60 transition-all border border-dashed border-white/20 active:scale-95"
                            >
                                + Add
                            </button>
                        </div>
                    </div>

                    {/* Progress Circle */}
                    <div className="flex flex-col items-center text-center relative z-10">
                        <div className="relative w-44 h-44 flex items-center justify-center mb-5">
                            <div className="absolute inset-0 bg-[#DFF3E4]/10 rounded-full blur-2xl scale-110" />
                            
                            <div className="relative w-full h-full">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                    <circle 
                                        cx="50" cy="50" r="46" 
                                        fill="none"
                                        stroke="rgba(255,255,255,0.05)" 
                                        strokeWidth="2"
                                    />
                                    
                                    <circle 
                                        cx="50" cy="50" r="42" 
                                        fill="none"
                                        stroke="rgba(255,255,255,0.1)" 
                                        strokeWidth="8"
                                        strokeLinecap="round"
                                    />
                                    
                                    <defs>
                                        <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                            <stop offset="0%" stopColor="#DFF3E4" />
                                            <stop offset="50%" stopColor="#A7F3D0" />
                                            <stop offset="100%" stopColor="#6EE7B7" />
                                        </linearGradient>
                                        <filter id="glow">
                                            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                                            <feMerge>
                                                <feMergeNode in="coloredBlur"/>
                                                <feMergeNode in="SourceGraphic"/>
                                            </feMerge>
                                        </filter>
                                    </defs>
                                    
                                    <circle 
                                        cx="50" cy="50" r="42" 
                                        fill="none"
                                        stroke="url(#progressGradient)" 
                                        strokeWidth="8"
                                        strokeLinecap="round"
                                        strokeDasharray={`${2 * Math.PI * 42}`}
                                        strokeDashoffset={progressAnimated ? 2 * Math.PI * 42 * (1 - liquidFill / 100) : 2 * Math.PI * 42}
                                        className="transition-all duration-1000 ease-out"
                                        filter="url(#glow)"
                                    />
                                </svg>
                                
                                <div className="absolute inset-0 flex items-center justify-center flex-col">
                                    <div className="relative">
                                        {/* FIX #4: Added tabular-nums for consistent number width */}
                                        <span className="text-5xl font-black text-white tracking-tighter tabular-nums">{liquidFill}</span>
                                        <span className="text-xl font-bold text-white/60">%</span>
                                    </div>
                                    <span className="text-white/40 text-[10px] font-semibold tracking-wider uppercase mt-1">Complete</span>
                                </div>
                            </div>
                        </div>
                        
                        {/* Goal Title Group */}
                        <div className="space-y-1.5">
                            <h3 className="font-black text-[22px] leading-tight max-w-[280px] mx-auto tracking-tight">
                                {currentGoal.title}
                            </h3>
                            <p className="text-white/40 text-xs font-medium">
                                Day {user.currentDay} of {currentGoal.durationDays}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Daily Progress Card */}
                <div className="px-5 -mt-8 relative z-20 mb-5">
                    <div 
                        className="bg-white rounded-2xl p-4 flex items-center justify-between"
                        style={{
                            boxShadow: '0 4px 20px -2px rgba(23, 23, 56, 0.08), 0 2px 8px -2px rgba(23, 23, 56, 0.04)'
                        }}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                                allDailyTasksComplete 
                                    ? 'bg-gradient-to-br from-emerald-400 to-emerald-500' 
                                    : 'bg-gradient-to-br from-[#3423A6]/10 to-[#3423A6]/5'
                            }`}>
                                {allDailyTasksComplete ? (
                                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"/>
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5 text-[#3423A6]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                                    </svg>
                                )}
                            </div>
                            <div>
                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Daily Progress</p>
                                <p className="text-lg font-black text-[#171738]">
                                    {completedDailyCount}/{totalDailyTasks}
                                    <span className="text-sm font-medium text-gray-400 ml-1.5">
                                        {allDailyTasksComplete ? 'Complete!' : 'tasks'}
                                    </span>
                                </p>
                            </div>
                        </div>
                        
                        <button 
                            onClick={() => setShowCheckIn(true)} 
                            className="px-4 py-2.5 bg-gradient-to-r from-[#3423A6] to-[#4834c7] text-white rounded-xl text-xs font-bold shadow-lg shadow-[#3423A6]/20 hover:shadow-[#3423A6]/30 transition-all active:scale-95"
                        >
                            Check In
                        </button>
                    </div>
                </div>

                <div className="px-5 relative z-20 space-y-4 pb-32">
                    {/* Agent Alerts */}
                    {agentAlerts.filter(a => !a.isRead).map(alert => (
                        <div 
                            key={alert.id}
                            onClick={() => setView(AppView.STATS)} 
                            className={`rounded-2xl bg-white p-4 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform border-l-4 ${
                                alert.severity === 'high' ? 'border-rose-400' : 'border-blue-400'
                            }`}
                            style={{
                                boxShadow: '0 2px 12px -2px rgba(23, 23, 56, 0.06)'
                            }}
                        >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                alert.severity === 'high' ? 'bg-rose-50' : 'bg-blue-50'
                            }`}>
                                <Icons.AlertTriangle className={`w-5 h-5 ${
                                    alert.severity === 'high' ? 'text-rose-500' : 'text-blue-500'
                                }`}/>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-[#171738] text-sm truncate">{alert.title}</h3>
                                <p className="text-[10px] text-gray-400 mt-0.5">Tap to view details</p>
                            </div>
                            <Icons.ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
                        </div>
                    ))}

                    {/* Today's Missions - Shows ALL tasks (daily + lesson) */}
                    <div 
                        className="bg-white rounded-2xl overflow-hidden"
                        style={{
                            boxShadow: '0 4px 24px -4px rgba(23, 23, 56, 0.08), 0 2px 8px -4px rgba(23, 23, 56, 0.04)'
                        }}
                    >
                        <div className="p-5">
                            {/* FIX #1 & #2: Changed items-start to items-center, mb-5 to mb-6 */}
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="font-black text-[#171738] text-lg tracking-tight">Today's Missions</h3>
                                    <p className="text-[11px] text-gray-400 mt-0.5 font-medium">Small steps, big progress</p>
                                </div>
                                {allPendingTasks.length > 0 && (
                                    /* FIX #1: Added self-start mt-0.5 for proper badge alignment */
                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#3423A6]/10 text-[#3423A6] self-start mt-0.5">
                                        {allPendingTasks.length} remaining
                                    </span>
                                )}
                            </div>
                            
                            {allTasksComplete ? (
                                /* All Tasks Complete State */
                                <div className="py-6 px-4">
                                    <div className="flex items-start gap-4">
                                        <div className="relative flex-shrink-0">
                                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center">
                                                <svg className="w-8 h-8 text-emerald-500" viewBox="0 0 24 24" fill="none">
                                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="currentColor" fillOpacity="0.2"/>
                                                    <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                            </div>
                                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#3423A6]/60 rounded-full" />
                                            <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-[#3423A6]/30 rounded-full" />
                                        </div>
                                        
                                        <div className="flex-1 pt-1">
                                            <h4 className="font-bold text-[#171738] text-base mb-1">You crushed it today!</h4>
                                            <p className="text-gray-400 text-sm leading-relaxed mb-3">
                                                All tasks complete. Ready to plan what's next?
                                            </p>
                                            {/* Navigate to AI Chat */}
                                            <button 
                                                onClick={() => setView(AppView.CHAT)}
                                                className="text-[#3423A6] font-bold text-sm flex items-center gap-1.5 group"
                                            >
                                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                                                </svg>
                                                <span>Share your next steps with the Guide</span>
                                                <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M5 12h14M12 5l7 7-7 7"/>
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : dailyTasks.length === 0 ? (
                                /* No tasks state */
                                <div className="py-8 text-center">
                                    <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                        <Icons.Sun className="w-6 h-6 text-gray-300" />
                                    </div>
                                    <p className="text-gray-500 font-medium text-sm mb-1">No tasks yet</p>
                                    <p className="text-gray-400 text-xs">Check in to generate your daily missions</p>
                                </div>
                            ) : (
                                /* Task List - Daily tasks first, then lesson tasks */
                                <div className="space-y-2.5">
                                    {/* Daily Tasks */}
                                    {pendingDailyTasks.map((task, index) => (
                                        <div 
                                            key={task.id} 
                                            onClick={() => handleTaskSelect(task.id)} 
                                            className="group bg-gray-50/80 hover:bg-gray-50 border border-gray-100 p-3.5 rounded-xl cursor-pointer active:scale-[0.98] transition-all"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${getDifficultyBgColor(task.difficulty)}`}>
                                                    <TaskIcon difficulty={task.difficulty as string} />
                                                </div>
                                                
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md ${getDifficultyColor(task.difficulty)}`}>
                                                            {getDifficultyLabel(task.difficulty)}
                                                        </span>
                                                        {/* FIX #5: Removed ~ from time display */}
                                                        <span className="text-[10px] font-medium text-gray-400">
                                                            {task.estimatedTimeMinutes || 15} min
                                                        </span>
                                                    </div>
                                                    <h4 className="font-semibold text-[#171738] text-[13px] leading-snug line-clamp-1 group-hover:text-[#3423A6] transition-colors">
                                                        {task.title}
                                                    </h4>
                                                </div>
                                                
                                                {(task.timeLeft !== undefined && task.timeLeft > 0 && task.timeLeft < ((task.estimatedTimeMinutes || 20) * 60)) ? (
                                                    <div className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex-shrink-0 ${
                                                        task.isTimerActive 
                                                            ? 'bg-[#DFF3E4] text-[#171738]' 
                                                            : 'bg-gray-100 text-gray-600'
                                                    }`}>
                                                        {calculateRealTimeRemaining(task)}
                                                    </div>
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-gray-100 group-hover:bg-[#3423A6]/10 flex items-center justify-center flex-shrink-0 transition-colors">
                                                        <Icons.ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#3423A6] transition-colors" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {/* Lesson Tasks Section */}
                                    {pendingLessonTasks.length > 0 && (
                                        <>
                                            {/* Divider if there are daily tasks above */}
                                            {pendingDailyTasks.length > 0 && (
                                                <div className="flex items-center gap-3 py-2">
                                                    <div className="flex-1 h-px bg-gray-200" />
                                                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">From Lessons</span>
                                                    <div className="flex-1 h-px bg-gray-200" />
                                                </div>
                                            )}
                                            
                                            {pendingLessonTasks.map((task) => (
                                                <div 
                                                    key={task.id} 
                                                    onClick={() => handleTaskSelect(task.id)} 
                                                    className="group bg-[#3423A6]/5 hover:bg-[#3423A6]/10 border border-[#3423A6]/10 p-3.5 rounded-xl cursor-pointer active:scale-[0.98] transition-all"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3423A6]/10 to-[#3423A6]/20 flex items-center justify-center flex-shrink-0">
                                                            <LessonIcon />
                                                        </div>
                                                        
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-0.5">
                                                                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-[#3423A6]/10 text-[#3423A6] border border-[#3423A6]/20">
                                                                    Lesson
                                                                </span>
                                                                {/* FIX #5: Removed ~ from time display */}
                                                                <span className="text-[10px] font-medium text-gray-400">
                                                                    {task.estimatedTimeMinutes || 15} min
                                                                </span>
                                                            </div>
                                                            <h4 className="font-semibold text-[#171738] text-[13px] leading-snug line-clamp-1 group-hover:text-[#3423A6] transition-colors">
                                                                {task.title}
                                                            </h4>
                                                        </div>
                                                        
                                                        <div className="w-8 h-8 rounded-full bg-[#3423A6]/10 group-hover:bg-[#3423A6]/20 flex items-center justify-center flex-shrink-0 transition-colors">
                                                            <Icons.ChevronRight className="w-4 h-4 text-[#3423A6]/60 group-hover:text-[#3423A6] transition-colors" />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                </div>
                            )}
                            
                            {dailyTasks.length > 0 && (
                                <button 
                                    onClick={() => setView(AppView.TASK_SELECTION)} 
                                    className="w-full mt-4 py-3 bg-gray-50 hover:bg-gray-100 text-[#171738] font-semibold text-sm rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 border border-gray-100"
                                >
                                    <Icons.Grid className="w-4 h-4 text-gray-400" />
                                    <span>Browse All Tasks</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Earn Credits Section */}
                    <div 
                        className="bg-white rounded-2xl overflow-hidden"
                        style={{
                            boxShadow: '0 2px 16px -4px rgba(23, 23, 56, 0.06)'
                        }}
                    >
                        <div 
                            className="p-4 flex items-center justify-between cursor-pointer active:bg-gray-50 transition-colors" 
                            onClick={() => setIsEarnExpanded(!isEarnExpanded)}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 bg-gradient-to-br from-amber-100 to-amber-200 rounded-xl flex items-center justify-center shadow-sm">
                                    <CoinIcon className="w-7 h-7" />
                                </div>
                                <div>
                                    <h3 className="text-[15px] font-bold text-[#171738]">Earn More Credits</h3>
                                    <p className="text-[10px] text-gray-400 font-medium">Complete offers for rewards</p>
                                </div>
                            </div>
                            <div className={`w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center transition-transform duration-300 ${isEarnExpanded ? 'rotate-180' : ''}`}>
                                <Icons.ChevronDown className="w-4 h-4 text-gray-400" />
                            </div>
                        </div>
                        
                        {isEarnExpanded && (
                            <div className="px-4 pb-4 border-t border-gray-50">
                                {isLoadingOffers && (
                                    <div className="py-8 text-center">
                                        <div className="w-8 h-8 border-2 border-[#3423A6] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                                        <p className="text-xs text-gray-400">Finding offers...</p>
                                    </div>
                                )}

                                {!isLoadingOffers && adgemOffers.length > 0 && (
                                    <div className="space-y-2 pt-4">
                                        {adgemOffers.map(offer => (
                                            <div 
                                                key={offer.id} 
                                                onClick={() => handleOfferClick(offer)}
                                                className="bg-gray-50 border border-gray-100 p-3 rounded-xl flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform hover:bg-gray-100"
                                            >
                                                <div className="w-11 h-11 rounded-xl bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                                                    {offer.icon ? (
                                                        <img src={offer.icon} alt={offer.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Icons.Gift className="w-5 h-5 text-gray-400" />
                                                    )}
                                                </div>
                                                
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-semibold text-[#171738] text-sm leading-tight truncate">
                                                        {offer.name}
                                                    </h4>
                                                    <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                                                        {offer.shortDescription || offer.description}
                                                    </p>
                                                </div>
                                                
                                                <div className="flex items-center gap-1 bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200 px-2 py-1.5 rounded-lg flex-shrink-0">
                                                    <CoinIcon className="w-4 h-4" />
                                                    <span className="font-black text-xs text-amber-700">+{offer.amount}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {!isLoadingOffers && adgemOffers.length === 0 && (
                                    <div className="py-8 text-center">
                                        <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                                            <svg className="w-6 h-6 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                                                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                                                <line x1="12" y1="22.08" x2="12" y2="12"/>
                                            </svg>
                                        </div>
                                        <p className="text-sm text-gray-500 font-medium">No offers available</p>
                                        <p className="text-[10px] text-gray-400 mt-1">Check back later for new opportunities</p>
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
                                                    <div className="w-6 h-6 rounded-md bg-emerald-100 flex items-center justify-center flex-shrink-0">
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
                                    className="w-full mt-4 py-2.5 text-[11px] font-bold text-[#3423A6] uppercase tracking-wider hover:bg-[#3423A6]/5 rounded-lg transition-colors disabled:opacity-50"
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-5">
                    <div 
                        className="bg-white rounded-3xl w-full max-w-sm p-6 animate-scale-in"
                        style={{
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                        }}
                    >
                        <div className="text-center mb-5">
                            <div className="w-14 h-14 bg-gradient-to-br from-[#DFF3E4] to-[#A7F3D0] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#DFF3E4]/50">
                                <svg className="w-7 h-7 text-[#171738]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                            </div>
                            <h2 className="text-xl font-black text-[#171738] tracking-tight">Daily Check-in</h2>
                            <p className="text-xs text-gray-400 mt-1.5 font-medium">What did you accomplish today?</p>
                        </div>
                        
                        <textarea 
                            value={checkInText} 
                            onChange={(e) => setCheckInText(e.target.value)} 
                            className="w-full h-28 p-4 bg-gray-50 rounded-2xl border-2 border-gray-100 focus:border-[#3423A6] focus:bg-white focus:outline-none resize-none text-[#171738] text-sm placeholder-gray-300 transition-all" 
                            placeholder="I researched 3 competitors, drafted the intro..." 
                        />
                        
                        <div className="mt-5 space-y-2.5">
                            <button 
                                onClick={submitDailyCheckIn}
                                disabled={!checkInText.trim() || isProcessingCheckIn}
                                className="w-full py-4 bg-gradient-to-r from-[#171738] to-[#2a2a5c] text-white rounded-2xl font-bold text-sm tracking-wide transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[#171738]/20"
                            >
                                {isProcessingCheckIn ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>Processing...</span>
                                    </>
                                ) : (
                                    <span>Submit & Generate Tasks</span>
                                )}
                            </button>
                            <button 
                                onClick={() => setShowCheckIn(false)} 
                                className="w-full py-3 text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Animations */}
            <style>{`
                @keyframes confetti-fall {
                    0% {
                        transform: translateY(0) rotate(0deg) scale(1);
                        opacity: 1;
                    }
                    50% {
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(100vh) rotate(720deg) scale(0.5);
                        opacity: 0;
                    }
                }
                
                @keyframes scale-in {
                    0% {
                        opacity: 0;
                        transform: scale(0.95);
                    }
                    100% {
                        opacity: 1;
                        transform: scale(1);
                    }
                }
                
                .animate-scale-in {
                    animation: scale-in 0.2s ease-out;
                }
                
                .line-clamp-1 {
                    display: -webkit-box;
                    -webkit-line-clamp: 1;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
            `}</style>
        </div>
    );
}
