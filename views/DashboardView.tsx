// views/DashboardView.tsx
import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { useTheme } from '../hooks/useTheme';
import { AppView, TaskStatus, AgentAlert, Goal, Task } from '../types';
import { Button, Card, Badge, Icons } from '../components/UIComponents';
import { updateUserProfile, generateDailyTasks } from '../services/geminiService';
import { api } from '../services/api';

export default function DashboardView() {
    const { 
        user, setUser, setView, setShowCheckIn, showCheckIn,
        lessons
    } = useApp();
    const { colors } = useTheme();
    
    const [isEarnExpanded, setIsEarnExpanded] = useState(false);
    const [checkInText, setCheckInText] = useState('');
    const [isProcessingCheckIn, setIsProcessingCheckIn] = useState(false);
    const [isLoadingOffers, setIsLoadingOffers] = useState(false);
    const [adgemOffers, setAdgemOffers] = useState<any[]>([]);

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
        <div className="flex flex-col h-full" style={{ backgroundColor: colors.bgPrimary }}>
            {/* Header */}
            <div className="px-5 pt-[max(env(safe-area-inset-top),20px)]" style={{ backgroundColor: colors.bgSecondary }}>
                {/* Top Bar */}
                <div className="flex justify-between items-center py-4">
                    <h1 className="text-xl font-black tracking-tight" style={{ color: colors.textPrimary }}>
                        INJAZI
                    </h1>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setShowCheckIn(true)} 
                            className="w-11 h-11 rounded-full flex items-center justify-center active:scale-95 transition-transform shadow-sm"
                            style={{ backgroundColor: colors.bgAccentStrong }}
                        >
                            <Icons.Check className="w-5 h-5 text-white" />
                        </button>
                        <button 
                            onClick={() => setView(AppView.SETTINGS)} 
                            className="w-11 h-11 rounded-full flex items-center justify-center active:scale-95 transition-transform"
                            style={{ backgroundColor: colors.bgTertiary }}
                        >
                            <Icons.Settings className="w-5 h-5" style={{ color: colors.textSecondary }} />
                        </button>
                    </div>
                </div>

                {/* Goal Tabs */}
                <div className="flex items-center gap-3 pb-5 overflow-x-auto scrollbar-hide">
                    {allGoals.map((g, idx) => (
                        <button 
                            key={g.id}
                            onClick={() => switchGoal(g)} 
                            className="px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all active:scale-95"
                            style={{ 
                                backgroundColor: g.id === currentGoal.id ? colors.bgAccentStrong : colors.bgTertiary,
                                color: g.id === currentGoal.id ? '#FFFFFF' : colors.textSecondary
                            }}
                        >
                            Goal {idx + 1}
                        </button>
                    ))}
                    <button 
                        onClick={handleAddGoal} 
                        className="px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap active:scale-95 transition-all border-2 border-dashed"
                        style={{ 
                            borderColor: colors.bgAccentStrong,
                            color: colors.bgAccentStrong,
                            backgroundColor: 'transparent'
                        }}
                    >
                        + New
                    </button>
                </div>

                {/* Goal Card */}
                <div 
                    className="rounded-3xl p-5 mb-5 shadow-sm"
                    style={{ backgroundColor: colors.cardBg, border: `1px solid ${colors.cardBorder}` }}
                >
                    <div className="flex items-start gap-4">
                        {/* Progress Ring */}
                        <div className="relative w-20 h-20 flex-shrink-0">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="40" stroke={colors.bgTertiary} strokeWidth="8" fill="none" />
                                <circle 
                                    cx="50" cy="50" r="40" 
                                    stroke={colors.bgAccentStrong}
                                    strokeWidth="8" 
                                    fill="none" 
                                    strokeDasharray="251.2"
                                    strokeDashoffset={251.2 - (251.2 * progressPercent / 100)}
                                    strokeLinecap="round"
                                    className="transition-all duration-500"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-lg font-black" style={{ color: colors.textPrimary }}>
                                    {progressPercent}%
                                </span>
                            </div>
                        </div>

                        {/* Goal Info */}
                        <div className="flex-1 min-w-0 pt-1">
                            <h2 className="text-lg font-black leading-tight mb-2" style={{ color: colors.textPrimary }}>
                                {currentGoal.title}
                            </h2>
                            <div 
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg"
                                style={{ backgroundColor: colors.bgTertiary }}
                            >
                                <Icons.Calendar className="w-3.5 h-3.5" style={{ color: colors.textSecondary }} />
                                <span className="text-sm font-semibold" style={{ color: colors.textSecondary }}>
                                    Day {user.currentDay} of {currentGoal.durationDays}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Scrollable Content */}
            <div 
                className="flex-1 overflow-y-auto overscroll-contain px-5 pt-4 pb-32"
                style={{ backgroundColor: colors.bgPrimary }}
            >
                {/* Agent Alerts */}
                {agentAlerts.filter(a => !a.isRead).map(alert => (
                    <div 
                        key={alert.id}
                        onClick={() => setView(AppView.STATS)} 
                        className="mb-4 rounded-2xl p-4 flex items-center gap-4 shadow-sm border-l-4 active:scale-[0.98] transition-transform"
                        style={{ 
                            backgroundColor: colors.cardBg,
                            borderLeftColor: alert.severity === 'high' ? colors.error : colors.bgAccentStrong
                        }}
                    >
                        <div 
                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: alert.severity === 'high' ? '#fef2f2' : colors.bgAccent }}
                        >
                            <Icons.AlertTriangle 
                                className="w-5 h-5" 
                                style={{ color: alert.severity === 'high' ? colors.error : colors.textSecondary }}
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-sm" style={{ color: colors.textPrimary }}>{alert.title}</h3>
                            <p className="text-xs truncate" style={{ color: colors.textMuted }}>{alert.message}</p>
                        </div>
                        <Icons.ChevronRight className="w-5 h-5" style={{ color: colors.textMuted }} />
                    </div>
                ))}

                {/* Daily Missions */}
                <div 
                    className="rounded-2xl shadow-sm mb-5 overflow-hidden"
                    style={{ backgroundColor: colors.cardBg, border: `1px solid ${colors.cardBorder}` }}
                >
                    <div className="p-5 pb-4" style={{ borderBottom: `1px solid ${colors.cardBorder}` }}>
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-black" style={{ color: colors.textPrimary }}>Daily Missions</h3>
                            <span 
                                className="text-xs font-bold px-3 py-1 rounded-full text-white"
                                style={{ backgroundColor: colors.bgAccentStrong }}
                            >
                                {pendingDailyTasks.length} ACTIVE
                            </span>
                        </div>
                    </div>

                    {pendingDailyTasks.length === 0 ? (
                        <div className="p-8 text-center">
                            <div 
                                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
                                style={{ backgroundColor: '#dcfce7' }}
                            >
                                <Icons.Check className="w-7 h-7 text-emerald-500" />
                            </div>
                            <p className="font-semibold" style={{ color: colors.textPrimary }}>All done for today!</p>
                            <p className="text-sm mt-1" style={{ color: colors.textMuted }}>Great work. Rest up for tomorrow.</p>
                        </div>
                    ) : (
                        <div className="p-4 space-y-3">
                            {pendingDailyTasks.slice(0, 3).map((task, idx) => (
                                <div 
                                    key={task.id} 
                                    onClick={() => handleTaskSelect(task.id)} 
                                    className="p-4 rounded-xl flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-all"
                                    style={{ 
                                        backgroundColor: idx === 0 ? colors.bgAccent : colors.bgPrimary,
                                        border: `1px solid ${idx === 0 ? colors.bgAccentStrong : colors.cardBorder}`
                                    }}
                                >
                                    <div 
                                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                                        style={{ backgroundColor: idx === 0 ? colors.bgAccentStrong : colors.bgTertiary }}
                                    >
                                        <Icons.Zap className="w-5 h-5" style={{ color: idx === 0 ? '#FFFFFF' : colors.textSecondary }} />
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                        <span 
                                            className="text-[10px] font-bold uppercase tracking-wider"
                                            style={{ color: idx === 0 ? colors.textSecondary : colors.textMuted }}
                                        >
                                            Daily Task
                                        </span>
                                        <h4 className="font-bold text-sm leading-snug mt-0.5" style={{ color: colors.textPrimary }}>
                                            {task.title}
                                        </h4>
                                        <p className="text-xs mt-1" style={{ color: colors.textMuted }}>
                                            {task.estimatedTimeMinutes || 15} min · +{task.creditsReward || 50} CR
                                        </p>
                                    </div>

                                    <div 
                                        className="w-10 h-10 rounded-full flex items-center justify-center"
                                        style={{ backgroundColor: idx === 0 ? colors.bgAccentStrong : colors.bgTertiary }}
                                    >
                                        <Icons.ChevronRight className="w-5 h-5" style={{ color: idx === 0 ? '#FFFFFF' : colors.textSecondary }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {pendingDailyTasks.length > 0 && (
                        <div className="px-4 pb-4">
                            <button 
                                onClick={() => setView(AppView.TASK_SELECTION)} 
                                className="w-full py-3 text-sm font-semibold rounded-xl active:scale-[0.98] transition-all"
                                style={{ backgroundColor: colors.bgSecondary, color: colors.textSecondary }}
                            >
                                Browse All Tasks
                            </button>
                        </div>
                    )}
                </div>

                {/* Earn Credits */}
                <div 
                    className="rounded-2xl shadow-sm overflow-hidden"
                    style={{ backgroundColor: colors.cardBg, border: `1px solid ${colors.cardBorder}` }}
                >
                    <div 
                        className="p-5 flex items-center justify-between cursor-pointer active:opacity-90 transition-opacity" 
                        onClick={() => setIsEarnExpanded(!isEarnExpanded)}
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-amber-400 rounded-xl flex items-center justify-center shadow-lg shadow-amber-400/20">
                                <Icons.Coins className="w-6 h-6 text-amber-900" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black" style={{ color: colors.textPrimary }}>Earn Credits</h3>
                                <p className="text-xs" style={{ color: colors.textMuted }}>Complete offers to earn rewards</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <span className="text-lg font-black" style={{ color: colors.textPrimary }}>{user.credits.toLocaleString()}</span>
                                <span className="text-xs ml-1" style={{ color: colors.textMuted }}>CR</span>
                            </div>
                            <Icons.ChevronDown 
                                className={`w-5 h-5 transition-transform duration-300 ${isEarnExpanded ? 'rotate-180' : ''}`}
                                style={{ color: colors.textMuted }}
                            />
                        </div>
                    </div>
                    
                    {isEarnExpanded && (
                        <div className="px-5 pb-5" style={{ borderTop: `1px solid ${colors.cardBorder}` }}>
                            <div className="pt-4">
                                {isLoadingOffers ? (
                                    <div className="py-8 text-center">
                                        <div className="w-8 h-8 border-3 rounded-full animate-spin mx-auto mb-2" style={{ borderColor: colors.bgAccentStrong, borderTopColor: 'transparent' }}></div>
                                        <p className="text-sm" style={{ color: colors.textMuted }}>Loading offers...</p>
                                    </div>
                                ) : adgemOffers.length > 0 ? (
                                    <div className="space-y-3">
                                        {adgemOffers.slice(0, 4).map(offer => (
                                            <div 
                                                key={offer.id} 
                                                onClick={() => handleOfferClick(offer)}
                                                className="p-4 rounded-xl flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-all"
                                                style={{ backgroundColor: colors.bgPrimary, border: `1px solid ${colors.cardBorder}` }}
                                            >
                                                <div 
                                                    className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
                                                    style={{ backgroundColor: colors.bgTertiary }}
                                                >
                                                    {offer.icon ? (
                                                        <img src={offer.icon} alt={offer.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Icons.Gift className="w-5 h-5" style={{ color: colors.textMuted }} />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${getDifficultyColor(offer.completionDifficulty)}`}>
                                                        {getDifficultyLabel(offer.completionDifficulty)}
                                                    </span>
                                                    <h4 className="font-bold text-sm truncate mt-0.5" style={{ color: colors.textPrimary }}>{offer.name}</h4>
                                                </div>
                                                <div className="bg-amber-400 text-amber-900 px-3 py-1.5 rounded-lg flex-shrink-0">
                                                    <span className="font-black text-sm">+{offer.amount}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-8 text-center">
                                        <div 
                                            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
                                            style={{ backgroundColor: colors.bgTertiary }}
                                        >
                                            <Icons.Gift className="w-7 h-7" style={{ color: colors.textMuted }} />
                                        </div>
                                        <p className="text-sm" style={{ color: colors.textMuted }}>No offers available</p>
                                    </div>
                                )}
                                
                                <button 
                                    onClick={(e) => { e.stopPropagation(); fetchAdgemOffers(); }}
                                    disabled={isLoadingOffers}
                                    className="w-full mt-4 py-3 text-sm font-semibold rounded-xl transition-all disabled:opacity-50"
                                    style={{ backgroundColor: colors.bgSecondary, color: colors.textSecondary }}
                                >
                                    Refresh Offers
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Check-in Modal */}
            {showCheckIn && (
                <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ backgroundColor: colors.overlay }}>
                    <div 
                        className="w-full rounded-t-3xl pb-safe max-h-[85vh]"
                        style={{ backgroundColor: colors.cardBg }}
                    >
                        <div className="p-6">
                            <div className="w-12 h-1 rounded-full mx-auto mb-6" style={{ backgroundColor: colors.bgTertiary }} />
                            <h2 className="text-2xl font-black mb-2" style={{ color: colors.textPrimary }}>Daily Check-in</h2>
                            <p className="text-sm mb-6" style={{ color: colors.textMuted }}>What did you accomplish today?</p>
                            <textarea 
                                value={checkInText} 
                                onChange={(e) => setCheckInText(e.target.value)} 
                                className="w-full h-32 p-4 rounded-xl border resize-none focus:outline-none transition-colors"
                                style={{ 
                                    backgroundColor: colors.bgPrimary,
                                    borderColor: colors.cardBorder,
                                    color: colors.textPrimary
                                }}
                                placeholder="I researched 3 competitors, drafted the first section of my business plan..." 
                            />
                            <button 
                                onClick={submitDailyCheckIn}
                                disabled={isProcessingCheckIn || !checkInText.trim()}
                                className="w-full mt-4 py-4 rounded-xl font-bold disabled:opacity-50 active:scale-[0.98] transition-transform flex items-center justify-center gap-2 text-white"
                                style={{ backgroundColor: colors.textPrimary }}
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
                                className="w-full mt-3 py-3 text-sm font-semibold rounded-xl"
                                style={{ color: colors.textMuted }}
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
