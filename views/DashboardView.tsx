import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { useTheme } from '../contexts/ThemeContext';
import { AppView, TaskStatus, AgentAlert, Goal, Task } from '../types';
import { Button, Card, Badge, Icons } from '../components/UIComponents';
import { updateUserProfile, generateDailyTasks } from '../services/geminiService';
import { api } from '../services/api';

export default function DashboardView() {
    const { user, setUser, setView, setShowCheckIn, showCheckIn, lessons } = useApp();
    const { theme, toggleTheme } = useTheme();
    const [isEarnExpanded, setIsEarnExpanded] = useState(false);
    const [checkInText, setCheckInText] = useState('');
    const [isProcessingCheckIn, setIsProcessingCheckIn] = useState(false);
    const [isLoadingOffers, setIsLoadingOffers] = useState(false);
    const [adgemOffers, setAdgemOffers] = useState<any[]>([]);

    const dailyTasks = user.dailyTasks || [];
    const allGoals = user.allGoals || [];
    const agentAlerts = user.agentAlerts || [];
    const adgemTransactions = (user as any).adgemTransactions || [];
    const currentGoal = user.goal || { title: "Loading...", category: "General", durationDays: 30, mode: "Standard" };

    const pendingDailyTasks = dailyTasks.filter(t => 
        t.status !== TaskStatus.APPROVED && 
        t.status !== TaskStatus.COMPLETED &&
        !t.isLessonTask
    );

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
        return `${Math.ceil(currentSeconds / 60)}m left`;
    };

    const handleTaskSelect = (taskId: string) => {
        setUser(prev => ({ ...prev, selectedTaskId: taskId }));
        setView(AppView.TASK_EXECUTION);
    };

    const submitDailyCheckIn = async () => {
        if (!checkInText.trim() || !user.goal) return;
        setIsProcessingCheckIn(true);
        try {
            const updatedProfile = await updateUserProfile(user.userProfile, checkInText);
            const newTasks = await generateDailyTasks(user.goal!, user.currentDay, updatedProfile, checkInText, pendingDailyTasks);
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
        if (offer.clickUrl) window.open(offer.clickUrl, '_blank');
    };

    const getDifficultyLabel = (difficulty?: number) => {
        switch(difficulty) { case 1: return 'Easy'; case 2: return 'Medium'; case 3: return 'Hard'; default: return 'Easy'; }
    };

    const getDifficultyColor = (difficulty?: number) => {
        switch(difficulty) { case 1: return 'bg-green-100 text-green-700'; case 2: return 'bg-yellow-100 text-yellow-700'; case 3: return 'bg-red-100 text-red-700'; default: return 'bg-gray-100 text-gray-600'; }
    };

    const AgentAlertCard: React.FC<{ alert: AgentAlert; onClick?: () => void }> = ({ alert, onClick }) => (
        <div onClick={onClick} className={`rounded-2xl mb-4 border-l-4 shadow-lg p-4 flex items-center justify-between cursor-pointer hover:opacity-90 transition-colors ${alert.severity === 'high' ? 'border-red-500' : 'border-blue-500'}`} style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="flex items-center gap-3 overflow-hidden">
                <Icons.AlertTriangle className={`w-5 h-5 flex-shrink-0 ${alert.severity === 'high' ? 'text-red-500' : 'text-blue-500'}`}/>
                <h3 className="font-bold text-sm truncate" style={{ color: 'var(--text-on-card)' }}>{alert.title}</h3>
            </div>
            <Icons.ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
        </div>
    );

    return (
        <div className="h-full overflow-y-auto pb-safe scroll-smooth">
            <div className="min-h-full pb-28 animate-fade-in" style={{ backgroundColor: 'var(--bg-primary)' }}>
                {/* Header */}
                <div className="text-white px-6 pt-12 pb-16 rounded-b-[3rem] relative overflow-hidden shadow-2xl transition-colors duration-300" style={{ backgroundColor: 'var(--header-bg)', paddingTop: 'max(env(safe-area-inset-top), 3rem)' }}>
                    <div className="flex justify-between items-center relative z-20 mb-6 mt-4">
                        <h2 className="text-xl font-black tracking-tighter">INJAZI</h2>
                        <div className="flex gap-2">
                            {/* Theme Toggle */}
                            <button onClick={toggleTheme} className="p-2 rounded-full transition-colors" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                                {theme === 'dark' ? <Icons.Sun className="w-5 h-5 text-yellow-300" /> : <Icons.Moon className="w-5 h-5" />}
                            </button>
                            <button onClick={() => setShowCheckIn(true)} className="p-2 rounded-full shadow-lg" style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-dark)' }}>
                                <Icons.Check className="w-5 h-5" />
                            </button>
                            <button onClick={() => setView(AppView.SETTINGS)} className="p-2 rounded-full transition-colors" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                                <Icons.Settings className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                    
                    {/* Goal Tabs */}
                    <div className="relative z-20 w-full mb-10">
                        <div className="flex justify-center items-center flex-wrap gap-4 text-xs font-bold tracking-[0.2em] uppercase">
                            {allGoals.map((g, idx) => (
                                <React.Fragment key={g.id}>
                                    <button onClick={() => switchGoal(g)} className={`transition-all hover:scale-105 ${g.id === currentGoal.id ? 'text-white border-b-2 pb-0.5' : 'text-white/40'}`} style={{ borderColor: g.id === currentGoal.id ? 'var(--accent)' : 'transparent' }}>
                                        Goal {idx + 1}
                                    </button>
                                    <span className="text-white/10">|</span>
                                </React.Fragment>
                            ))}
                            <button onClick={handleAddGoal} className="text-white/40 hover:text-white transition-colors flex items-center gap-1">+ New</button>
                        </div>
                    </div>

                    {/* Progress Ring */}
                    <div className="flex flex-col items-center text-center relative z-10 animate-slide-up">
                        <div className="relative w-40 h-40 flex items-center justify-center mb-4">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="6" fill="none" className="text-white/5" />
                                <circle cx="50" cy="50" r="42" stroke="var(--accent)" strokeWidth="6" fill="none" strokeDasharray="263.8" strokeDashoffset={263.8 - (263.8 * (user.currentDay / (currentGoal.durationDays || 365)))} strokeLinecap="round" />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center flex-col">
                                <span className="text-4xl font-black text-white tracking-tighter">{Math.round((user.currentDay / (currentGoal.durationDays || 365)) * 100)}%</span>
                            </div>
                        </div>
                        <h3 className="font-bold text-2xl leading-tight mb-2 max-w-[80%] mx-auto">{currentGoal.title}</h3>
                        <div className="flex items-center gap-3 mt-1">
                            <span className="text-white/60 text-xs font-bold uppercase tracking-wide bg-white/5 px-3 py-1 rounded-lg">Day {user.currentDay} of {currentGoal.durationDays}</span>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="px-6 -mt-8 relative z-20 space-y-6">
                    {/* Alerts */}
                    {agentAlerts.filter(a => !a.isRead).map(alert => (
                        <AgentAlertCard key={alert.id} alert={alert} onClick={() => setView(AppView.STATS)} />
                    ))}

                    {/* Daily Missions Card */}
                    <Card className="p-0 overflow-hidden">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-lg" style={{ color: 'var(--text-on-card)' }}>Daily Missions</h3>
                                <Badge color="bg-[var(--brand-secondary)] text-white">{pendingDailyTasks.length} ACTIVE</Badge>
                            </div>
                            
                            {pendingDailyTasks.length === 0 ? (
                                <div className="text-center py-6">
                                    <Icons.Check className="w-10 h-10 text-green-500 mx-auto mb-2" />
                                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>All daily tasks complete!</p>
                                </div>
                            ) : (
                                <div className="space-y-3 mb-6">
                                    {pendingDailyTasks.map(task => (
                                        <div key={task.id} onClick={() => handleTaskSelect(task.id)} className="p-4 rounded-xl flex justify-between items-center cursor-pointer hover:shadow-md transition-all group" style={{ backgroundColor: 'var(--bg-surface)' }}>
                                            <div>
                                                <div className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--brand-secondary)' }}>Daily Task</div>
                                                <h4 className="font-bold text-sm" style={{ color: 'var(--text-on-card)' }}>{task.title}</h4>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {(task.timeLeft !== undefined && task.timeLeft > 0 && task.timeLeft < ((task.estimatedTimeMinutes || 20) * 60)) && (
                                                    <Badge color={task.isTimerActive ? "bg-green-100 text-green-700 animate-pulse" : "bg-yellow-100 text-yellow-700"}>
                                                        {calculateRealTimeRemaining(task)}
                                                    </Badge>
                                                )}
                                                <Icons.ChevronRight className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            <Button onClick={() => setView(AppView.TASK_SELECTION)} variant="secondary">Browse All Tasks</Button>
                        </div>
                    </Card>

                    {/* Earn Credits Section */}
                    <Card className="overflow-hidden">
                        <div className="p-6 flex items-center justify-between cursor-pointer hover:opacity-90 transition-colors" onClick={() => setIsEarnExpanded(!isEarnExpanded)}>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-yellow-400 rounded-2xl flex items-center justify-center shadow-lg shadow-yellow-400/30">
                                    <Icons.Coins className="w-6 h-6 text-yellow-900" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black" style={{ color: 'var(--text-on-card)' }}>Earn Credits</h3>
                                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Complete offers to earn rewards</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="text-right">
                                    <span className="text-lg font-black" style={{ color: 'var(--text-on-card)' }}>{user.credits}</span>
                                    <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>CR</span>
                                </div>
                                <Icons.ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isEarnExpanded ? 'rotate-180' : ''}`} style={{ color: 'var(--text-muted)' }} />
                            </div>
                        </div>
                        
                        {isEarnExpanded && (
                            <div className="px-6 pb-6 animate-slide-up">
                                {isLoadingOffers && (
                                    <div className="py-8 text-center">
                                        <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: 'var(--brand-secondary)', borderTopColor: 'transparent' }}></div>
                                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading offers...</p>
                                    </div>
                                )}

                                {!isLoadingOffers && adgemOffers.length > 0 && (
                                    <div className="space-y-3">
                                        {adgemOffers.map(offer => (
                                            <div key={offer.id} onClick={() => handleOfferClick(offer)} className="p-4 rounded-2xl flex items-center gap-4 cursor-pointer hover:shadow-lg transition-all group" style={{ backgroundColor: 'var(--bg-surface)' }}>
                                                <div className="w-14 h-14 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0" style={{ backgroundColor: 'var(--bg-input)' }}>
                                                    {offer.icon ? <img src={offer.icon} alt={offer.name} className="w-full h-full object-cover" /> : <Icons.Gift className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${getDifficultyColor(offer.completionDifficulty)}`}>
                                                            {getDifficultyLabel(offer.completionDifficulty)}
                                                        </span>
                                                    </div>
                                                    <h4 className="font-bold text-sm leading-tight truncate" style={{ color: 'var(--text-on-card)' }}>{offer.name}</h4>
                                                    <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'var(--text-muted)' }}>{offer.shortDescription || offer.description}</p>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <div className="bg-yellow-400 text-yellow-900 px-3 py-1.5 rounded-xl">
                                                        <span className="font-black text-sm">+{offer.amount}</span>
                                                    </div>
                                                    <span className="text-[9px] mt-1 block" style={{ color: 'var(--text-muted)' }}>credits</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {!isLoadingOffers && adgemOffers.length === 0 && (
                                    <div className="py-8 text-center">
                                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: 'var(--bg-surface)' }}>
                                            <Icons.Gift className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />
                                        </div>
                                        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>No offers available</p>
                                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Check back later for new offers</p>
                                    </div>
                                )}

                                {adgemTransactions.length > 0 && (
                                    <div className="mt-6 pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
                                        <h4 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                                            Recently Completed ({adgemTransactions.length})
                                        </h4>
                                        <div className="space-y-2">
                                            {adgemTransactions.slice(-3).reverse().map((t: any) => (
                                                <div key={t.transactionId} className="bg-green-50 p-3 rounded-xl flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                                                        <Icons.Check className="w-4 h-4 text-green-600" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-semibold text-green-700 text-sm truncate">{t.offerName}</h4>
                                                    </div>
                                                    <span className="text-xs font-bold text-green-600">+{t.credits}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <button onClick={(e) => { e.stopPropagation(); fetchAdgemOffers(); }} disabled={isLoadingOffers} className="w-full mt-4 py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-colors disabled:opacity-50" style={{ color: 'var(--brand-secondary)' }}>
                                    {isLoadingOffers ? 'Refreshing...' : 'Refresh Offers'}
                                </button>
                            </div>
                        )}
                    </Card>
                </div>

                {/* Check-in Modal */}
                {showCheckIn && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 animate-fade-in" style={{ backgroundColor: 'var(--overlay)' }}>
                        <Card className="w-full max-w-md p-8 animate-scale-in">
                            <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-on-card)' }}>Daily Check-in</h2>
                            <p className="text-sm mb-6" style={{ color: 'var(--brand-secondary)' }}>What did you accomplish today?</p>
                            <textarea 
                                value={checkInText} 
                                onChange={(e) => setCheckInText(e.target.value)} 
                                className="w-full h-32 p-4 rounded-xl mb-6 focus:outline-none resize-none" 
                                style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-on-card)', border: '1px solid var(--border-color)' }}
                                placeholder="I researched 3 competitors..." 
                            />
                            <Button onClick={submitDailyCheckIn} isLoading={isProcessingCheckIn} disabled={!checkInText.trim()}>Submit Check-in</Button>
                            <button onClick={() => setShowCheckIn(false)} className="w-full mt-4 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Cancel</button>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}
