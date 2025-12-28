// views/DashboardView.tsx
import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { AppView, TaskStatus, AgentAlert, Goal, Task } from '../types';
import { Button, Card, Badge, Icons } from '../components/UIComponents';
import { updateUserProfile, generateDailyTasks } from '../services/geminiService';
import { api } from '../services/api';

// Color Palette
const COLORS = {
    spaceIndigo: '#171738',      // Primary dark
    vividRoyal: '#3423A6',       // Accent purple
    glaucous: '#7180B9',         // Muted purple/grey
    honeydew: '#DFF3E4',         // Light green tint
    honeydewLight: 'rgba(223, 243, 228, 0.5)', // 50% honeydew
    white: '#FFFFFF',
};

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
            case 2: return 'bg-amber-100 text-amber-700';
            case 3: return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    return (
        <div className="flex flex-col h-full" style={{ backgroundColor: COLORS.spaceIndigo }}>
            {/* Header Section */}
            <div className="px-5 pt-safe" style={{ backgroundColor: COLORS.spaceIndigo }}>
                {/* Top Bar */}
                <div className="flex justify-between items-center pt-4 pb-3">
                    <h2 className="text-lg font-black tracking-tight text-white">INJAZI</h2>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setShowCheckIn(true)} 
                            className="w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-transform"
                            style={{ backgroundColor: COLORS.honeydew }}
                        >
                            <Icons.Check className="w-5 h-5" style={{ color: COLORS.spaceIndigo }} />
                        </button>
                        <button 
                            onClick={() => setView(AppView.SETTINGS)} 
                            className="w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-transform"
                            style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                        >
                            <Icons.Settings className="w-5 h-5 text-white" />
                        </button>
                    </div>
                </div>
                
                {/* Goal Tabs - Scrollable Pills */}
                <div className="flex items-center gap-2 pb-4 overflow-x-auto scrollbar-hide">
                    {allGoals.map((g) => (
                        <button 
                            key={g.id}
                            onClick={() => switchGoal(g)} 
                            className="px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all active:scale-95"
                            style={{ 
                                backgroundColor: g.id === currentGoal.id ? COLORS.honeydew : 'rgba(255,255,255,0.1)',
                                color: g.id === currentGoal.id ? COLORS.spaceIndigo : 'rgba(255,255,255,0.6)'
                            }}
                        >
                            {g.title?.substring(0, 20) || 'Goal'}{g.title && g.title.length > 20 ? '...' : ''}
                        </button>
                    ))}
                    <button 
                        onClick={handleAddGoal} 
                        className="px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all active:scale-95"
                        style={{ backgroundColor: COLORS.vividRoyal, color: COLORS.white }}
                    >
                        + Add Goal
                    </button>
                </div>

                {/* Progress Card */}
                <div 
                    className="rounded-2xl p-5 mb-4"
                    style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
                >
                    {/* Goal Title - Full width, no truncation */}
                    <h3 className="font-bold text-lg text-white mb-1 leading-snug">
                        {currentGoal.title}
                    </h3>
                    <p className="text-sm mb-5" style={{ color: COLORS.glaucous }}>
                        {currentGoal.category} · {currentGoal.mode}
                    </p>
                    
                    {/* Progress Bar - On Brand Colors */}
                    <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-medium" style={{ color: COLORS.glaucous }}>
                                Day {user.currentDay} of {currentGoal.durationDays}
                            </span>
                            <span className="text-sm font-bold" style={{ color: COLORS.honeydew }}>
                                {progressPercent}%
                            </span>
                        </div>
                        {/* Track: Darker indigo, Filled: Honeydew */}
                        <div 
                            className="h-2.5 rounded-full overflow-hidden"
                            style={{ backgroundColor: COLORS.vividRoyal }}
                        >
                            <div 
                                className="h-full rounded-full transition-all duration-500"
                                style={{ 
                                    width: `${progressWidth}%`,
                                    backgroundColor: COLORS.honeydew 
                                }}
                            />
                        </div>
                    </div>
                    
                    {/* View Stats Button */}
                    <button 
                        onClick={() => setView(AppView.STATS)}
                        className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
                        style={{ 
                            backgroundColor: 'rgba(255,255,255,0.1)', 
                            color: COLORS.white 
                        }}
                    >
                        View Statistics
                    </button>
                </div>
            </div>

            {/* Main Content - Clean Edge Transition */}
            <div 
                className="flex-1 overflow-y-auto overscroll-contain px-5 pt-5 pb-32"
                style={{ backgroundColor: COLORS.honeydewLight }}
            >
                {/* Agent Alerts */}
                {agentAlerts.filter(a => !a.isRead).length > 0 && (
                    <div className="mb-4">
                        {agentAlerts.filter(a => !a.isRead).map(alert => (
                            <div 
                                key={alert.id}
                                onClick={() => setView(AppView.STATS)} 
                                className="rounded-xl p-4 flex items-center gap-3 cursor-pointer mb-2 border-l-4 active:opacity-90 transition-opacity"
                                style={{ 
                                    backgroundColor: COLORS.white,
                                    borderLeftColor: alert.severity === 'high' ? '#EF4444' : COLORS.vividRoyal
                                }}
                            >
                                <div 
                                    className="w-10 h-10 rounded-full flex items-center justify-center"
                                    style={{ 
                                        backgroundColor: alert.severity === 'high' ? '#FEE2E2' : `${COLORS.vividRoyal}20`
                                    }}
                                >
                                    <Icons.AlertTriangle 
                                        className="w-5 h-5" 
                                        style={{ color: alert.severity === 'high' ? '#EF4444' : COLORS.vividRoyal }}
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-sm" style={{ color: COLORS.spaceIndigo }}>
                                        {alert.title}
                                    </h3>
                                    <p className="text-xs mt-0.5" style={{ color: COLORS.glaucous }}>
                                        {alert.message?.substring(0, 50)}...
                                    </p>
                                </div>
                                <Icons.ChevronRight className="w-5 h-5" style={{ color: COLORS.glaucous }} />
                            </div>
                        ))}
                    </div>
                )}

                {/* Today's Missions */}
                <div 
                    className="rounded-2xl overflow-hidden mb-4"
                    style={{ backgroundColor: COLORS.white }}
                >
                    <div className="p-4 border-b" style={{ borderColor: `${COLORS.glaucous}20` }}>
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold" style={{ color: COLORS.spaceIndigo }}>
                                Today's Missions
                            </h3>
                            <span 
                                className="text-xs font-semibold px-3 py-1 rounded-full"
                                style={{ backgroundColor: COLORS.spaceIndigo, color: COLORS.white }}
                            >
                                {pendingDailyTasks.length} left
                            </span>
                        </div>
                    </div>
                    
                    {pendingDailyTasks.length === 0 ? (
                        <div className="p-8 text-center">
                            <div 
                                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
                                style={{ backgroundColor: COLORS.honeydew }}
                            >
                                <Icons.Check className="w-7 h-7" style={{ color: COLORS.spaceIndigo }} />
                            </div>
                            <p className="font-semibold" style={{ color: COLORS.spaceIndigo }}>
                                All done for today!
                            </p>
                            <p className="text-sm mt-1" style={{ color: COLORS.glaucous }}>
                                Great work. Rest up for tomorrow.
                            </p>
                        </div>
                    ) : (
                        <div>
                            {pendingDailyTasks.slice(0, 3).map((task, idx) => (
                                <div 
                                    key={task.id} 
                                    onClick={() => handleTaskSelect(task.id)} 
                                    className="p-4 flex items-center gap-3 cursor-pointer active:bg-gray-50 transition-colors"
                                    style={{ 
                                        borderTop: idx !== 0 ? `1px solid ${COLORS.glaucous}15` : 'none'
                                    }}
                                >
                                    {/* Icon - Circular to match header buttons */}
                                    <div 
                                        className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                                        style={{ 
                                            backgroundColor: idx === 0 ? COLORS.honeydew : `${COLORS.spaceIndigo}08`
                                        }}
                                    >
                                        <Icons.Zap 
                                            className="w-5 h-5" 
                                            style={{ color: idx === 0 ? COLORS.spaceIndigo : COLORS.glaucous }}
                                        />
                                    </div>
                                    
                                    {/* Content - Full task name visible */}
                                    <div className="flex-1 min-w-0">
                                        <h4 
                                            className="font-semibold text-sm leading-snug"
                                            style={{ color: COLORS.spaceIndigo }}
                                        >
                                            {task.title}
                                        </h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs" style={{ color: COLORS.glaucous }}>
                                                {task.estimatedTimeMinutes || 15} min
                                            </span>
                                            <span style={{ color: COLORS.glaucous }}>·</span>
                                            <span 
                                                className="text-xs font-medium"
                                                style={{ color: COLORS.vividRoyal }}
                                            >
                                                +{task.creditsReward || 50} CR
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {/* Action Arrow - Equal padding, centered */}
                                    <div 
                                        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                                        style={{ 
                                            backgroundColor: idx === 0 ? COLORS.vividRoyal : `${COLORS.spaceIndigo}08`
                                        }}
                                    >
                                        <Icons.ChevronRight 
                                            className="w-4 h-4" 
                                            style={{ color: idx === 0 ? COLORS.white : COLORS.glaucous }}
                                        />
                                    </div>
                                </div>
                            ))}
                            
                            {pendingDailyTasks.length > 3 && (
                                <button 
                                    onClick={() => setView(AppView.TASK_SELECTION)} 
                                    className="w-full p-3 text-center text-sm font-medium transition-colors active:bg-gray-50"
                                    style={{ 
                                        borderTop: `1px solid ${COLORS.glaucous}15`,
                                        color: COLORS.glaucous 
                                    }}
                                >
                                    +{pendingDailyTasks.length - 3} more tasks
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Earn Credits Section */}
                <div 
                    className="rounded-2xl overflow-hidden"
                    style={{ backgroundColor: COLORS.white }}
                >
                    <div 
                        className="p-4 flex items-center justify-between cursor-pointer active:bg-gray-50 transition-colors" 
                        onClick={() => setIsEarnExpanded(!isEarnExpanded)}
                    >
                        <div className="flex items-center gap-3">
                            <div 
                                className="w-11 h-11 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: `${COLORS.vividRoyal}15` }}
                            >
                                <Icons.Coins className="w-5 h-5" style={{ color: COLORS.vividRoyal }} />
                            </div>
                            <div>
                                <h3 className="font-bold" style={{ color: COLORS.spaceIndigo }}>
                                    Earn Credits
                                </h3>
                                <p className="text-xs" style={{ color: COLORS.glaucous }}>
                                    Complete offers for rewards
                                </p>
                            </div>
                        </div>
                        <Icons.ChevronDown 
                            className={`w-5 h-5 transition-transform duration-200 ${isEarnExpanded ? 'rotate-180' : ''}`}
                            style={{ color: COLORS.glaucous }}
                        />
                    </div>
                    
                    {isEarnExpanded && (
                        <div 
                            className="px-4 pb-4 pt-3"
                            style={{ borderTop: `1px solid ${COLORS.glaucous}15` }}
                        >
                            {isLoadingOffers ? (
                                <div className="py-8 text-center">
                                    <div 
                                        className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-2"
                                        style={{ borderColor: COLORS.vividRoyal, borderTopColor: 'transparent' }}
                                    />
                                    <p className="text-xs" style={{ color: COLORS.glaucous }}>
                                        Loading offers...
                                    </p>
                                </div>
                            ) : adgemOffers.length > 0 ? (
                                <div className="space-y-2">
                                    {adgemOffers.slice(0, 4).map(offer => (
                                        <div 
                                            key={offer.id} 
                                            onClick={() => handleOfferClick(offer)}
                                            className="p-3 rounded-xl flex items-center gap-3 cursor-pointer active:opacity-80 transition-opacity"
                                            style={{ backgroundColor: `${COLORS.spaceIndigo}05` }}
                                        >
                                            <div 
                                                className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0"
                                                style={{ backgroundColor: `${COLORS.glaucous}20` }}
                                            >
                                                {offer.icon ? (
                                                    <img src={offer.icon} alt={offer.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <Icons.Gift className="w-5 h-5" style={{ color: COLORS.glaucous }} />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${getDifficultyColor(offer.completionDifficulty)}`}>
                                                    {getDifficultyLabel(offer.completionDifficulty)}
                                                </span>
                                                <h4 
                                                    className="font-semibold text-sm truncate mt-0.5"
                                                    style={{ color: COLORS.spaceIndigo }}
                                                >
                                                    {offer.name}
                                                </h4>
                                            </div>
                                            <div 
                                                className="px-3 py-1.5 rounded-lg"
                                                style={{ backgroundColor: COLORS.vividRoyal }}
                                            >
                                                <span className="font-bold text-sm text-white">
                                                    +{offer.amount}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-8 text-center">
                                    <div 
                                        className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-2"
                                        style={{ backgroundColor: `${COLORS.glaucous}15` }}
                                    >
                                        <Icons.Gift className="w-7 h-7" style={{ color: COLORS.glaucous }} />
                                    </div>
                                    <p className="text-sm" style={{ color: COLORS.glaucous }}>
                                        No offers available right now
                                    </p>
                                </div>
                            )}
                            
                            <button 
                                onClick={(e) => { e.stopPropagation(); fetchAdgemOffers(); }}
                                disabled={isLoadingOffers}
                                className="w-full mt-3 py-2.5 text-sm font-semibold rounded-xl transition-all active:scale-[0.98] disabled:opacity-50"
                                style={{ 
                                    backgroundColor: `${COLORS.spaceIndigo}08`,
                                    color: COLORS.spaceIndigo 
                                }}
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
                    <div 
                        className="w-full rounded-t-3xl pb-safe"
                        style={{ backgroundColor: COLORS.white, maxHeight: '85vh' }}
                    >
                        <div className="p-5">
                            {/* Handle */}
                            <div 
                                className="w-10 h-1 rounded-full mx-auto mb-5"
                                style={{ backgroundColor: COLORS.glaucous }}
                            />
                            
                            <h2 
                                className="text-xl font-bold mb-1"
                                style={{ color: COLORS.spaceIndigo }}
                            >
                                Daily Check-in
                            </h2>
                            <p className="text-sm mb-5" style={{ color: COLORS.glaucous }}>
                                What did you accomplish today?
                            </p>
                            
                            <textarea 
                                value={checkInText} 
                                onChange={(e) => setCheckInText(e.target.value)} 
                                className="w-full h-32 p-4 rounded-xl border resize-none focus:outline-none transition-colors"
                                style={{ 
                                    backgroundColor: `${COLORS.honeydew}50`,
                                    borderColor: `${COLORS.glaucous}30`,
                                    color: COLORS.spaceIndigo
                                }}
                                placeholder="I researched 3 competitors, drafted the first section of my business plan..." 
                            />
                            
                            <button 
                                onClick={submitDailyCheckIn}
                                disabled={isProcessingCheckIn || !checkInText.trim()}
                                className="w-full mt-4 py-4 rounded-xl font-semibold disabled:opacity-50 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                                style={{ backgroundColor: COLORS.spaceIndigo, color: COLORS.white }}
                            >
                                {isProcessingCheckIn ? (
                                    <>
                                        <div 
                                            className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                                            style={{ borderColor: COLORS.white, borderTopColor: 'transparent' }}
                                        />
                                        Processing...
                                    </>
                                ) : (
                                    'Submit Check-in'
                                )}
                            </button>
                            
                            <button 
                                onClick={() => setShowCheckIn(false)} 
                                className="w-full mt-3 py-3 text-sm font-semibold rounded-xl transition-colors active:bg-gray-50"
                                style={{ color: COLORS.glaucous }}
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
