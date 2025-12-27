import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { AppView, TaskStatus, GoalMode, AgentAlert, Goal, Difficulty, Task } from '../types';
import { Button, Card, Badge, Icons } from '../components/UIComponents';
import { updateUserProfile, generateDailyTasks } from '../services/geminiService';

export default function DashboardView() {
    const { 
        user, setUser, setView, setShowCheckIn, showCheckIn,
        lessons
    } = useApp();
    const [isEarnExpanded, setIsEarnExpanded] = useState(false);
    const [checkInText, setCheckInText] = useState('');
    const [isProcessingCheckIn, setIsProcessingCheckIn] = useState(false);

    // --- SAFETY CHECKS ---
    const dailyTasks = user.dailyTasks || [];
    const allGoals = user.allGoals || [];
    const earnTasks = user.earnTasks || [];
    const agentAlerts = user.agentAlerts || [];
    const currentGoal = user.goal || { title: "Loading...", category: "General", durationDays: 30, mode: "Standard" };

    // Separate daily tasks from lesson tasks
    const pendingDailyTasks = dailyTasks.filter(t => 
        t.status !== TaskStatus.APPROVED && 
        t.status !== TaskStatus.COMPLETED &&
        !t.isLessonTask
    );
    
    const pendingLessonTasks = dailyTasks.filter(t => 
        t.status !== TaskStatus.APPROVED && 
        t.status !== TaskStatus.COMPLETED &&
        t.isLessonTask === true
    );

    // Get lesson name for a task
    const getLessonNameForTask = (task: Task): string | null => {
        if (!task.sourceLessonId || !lessons) return null;
        for (const chapter of lessons) {
            const lesson = chapter.lessons.find(l => l.id === task.sourceLessonId);
            if (lesson) return lesson.title;
        }
        return null;
    };

    // --- HELPER TO CALCULATE REAL TIME REMAINING ---
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
            } else {
                return;
            }
        }
        setUser(prev => ({ ...prev, allGoals: saveCurrentGoalState(prev) }));
        setView(AppView.ONBOARDING);
    };

    const handleEarnCreditProgress = (taskId: string) => {
        const task = earnTasks.find(t => t.id === taskId);
        if (!task || task.isCompleted) return;
        
        const newProgress = task.progress + 1;
        if (newProgress >= task.maxProgress) {
            setUser(prev => ({
                ...prev,
                credits: prev.credits + task.reward,
                earnTasks: (prev.earnTasks || []).map(t => t.id === taskId ? { ...t, progress: newProgress, isCompleted: true } : t)
            }));
            alert(`Bundle Completed! +${task.reward} credits!`);
        } else {
            setUser(prev => ({
                ...prev,
                earnTasks: (prev.earnTasks || []).map(t => t.id === taskId ? { ...t, progress: newProgress } : t)
            }));
        }
    }

    const AgentAlertCard: React.FC<{ alert: AgentAlert; onClick?: () => void }> = ({ alert, onClick }) => (
        <div onClick={onClick} className={`rounded-2xl mb-4 border-l-4 shadow-card bg-white p-4 flex items-center justify-between cursor-pointer hover:shadow-card-hover transition-all ${alert.severity === 'high' ? 'border-red-500' : 'border-secondary'}`}>
            <div className="flex items-center gap-3 overflow-hidden">
                <Icons.AlertTriangle className={`w-5 h-5 flex-shrink-0 ${alert.severity === 'high' ? 'text-red-500' : 'text-secondary'}`}/>
                <h3 className="font-bold text-primary text-sm truncate">{alert.title}</h3>
            </div>
            <Icons.ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
        </div>
    );

    // Get difficulty badge color
    const getDifficultyColor = (difficulty?: string) => {
        switch(difficulty?.toUpperCase()) {
            case 'EASY': return 'bg-green-100 text-green-700';
            case 'MEDIUM': return 'bg-blue-100 text-blue-700';
            case 'HARD': return 'bg-orange-100 text-orange-700';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    const totalPendingTasks = pendingDailyTasks.length + pendingLessonTasks.length;

    return (
        <div className="h-full overflow-y-auto pb-safe scroll-smooth">
            <div className="min-h-full bg-gray-50 pb-28 animate-fade-in">
                {/* Header with Gradient */}
                <div className="bg-gradient-to-br from-primary via-primary to-secondary text-white px-6 pt-safe pt-12 pb-16 rounded-b-[3rem] relative overflow-hidden shadow-xl">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
                    
                    <div className="flex justify-between items-center relative z-20 mb-6 mt-4">
                        <h2 className="text-xl font-black tracking-tighter">INJAZI</h2>
                        <div className="flex gap-2">
                            <button onClick={() => setShowCheckIn(true)} className="p-2.5 bg-accent text-primary rounded-xl hover:bg-white transition-all shadow-lg">
                                <Icons.Check className="w-5 h-5" />
                            </button>
                            <button onClick={() => setView(AppView.SETTINGS)} className="p-2.5 bg-white/10 rounded-xl hover:bg-white/20 transition-all backdrop-blur-sm">
                                <Icons.Settings className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                    
                    {/* Goal Switcher */}
                    <div className="relative z-20 w-full mb-10">
                        <div className="flex justify-center items-center flex-wrap gap-4 text-xs font-bold tracking-[0.2em] uppercase">
                            {allGoals.map((g, idx) => (
                                <React.Fragment key={g.id}>
                                    <button 
                                        onClick={() => switchGoal(g)} 
                                        className={`transition-all hover:scale-105 px-3 py-1 rounded-lg ${g.id === currentGoal.id ? 'text-white bg-white/20 backdrop-blur-sm' : 'text-white/40 hover:text-white/70'}`}
                                    >
                                        Goal {idx + 1}
                                    </button>
                                    <span className="text-white/10">|</span>
                                </React.Fragment>
                            ))}
                            <button onClick={handleAddGoal} className="text-white/40 hover:text-white transition-colors flex items-center gap-1 px-3 py-1 rounded-lg hover:bg-white/10">
                                <Icons.Plus className="w-3 h-3" /> New
                            </button>
                        </div>
                    </div>

                    {/* Progress Circle */}
                    <div className="flex flex-col items-center text-center relative z-10 animate-slide-up">
                        <div className="relative w-40 h-40 flex items-center justify-center mb-4">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="6" fill="none" className="text-white/10" />
                                <circle 
                                    cx="50" cy="50" r="42" 
                                    stroke="url(#progressGradient)" 
                                    strokeWidth="6" 
                                    fill="none" 
                                    strokeDasharray="263.8" 
                                    strokeDashoffset={263.8 - (263.8 * (user.currentDay / (currentGoal.durationDays || 365)))} 
                                    strokeLinecap="round" 
                                />
                                <defs>
                                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#10B981" />
                                        <stop offset="100%" stopColor="#6366F1" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center flex-col">
                                <span className="text-4xl font-black text-white tracking-tighter">{Math.round((user.currentDay/(currentGoal.durationDays || 365))*100)}%</span>
                            </div>
                        </div>
                        <h3 className="font-bold text-2xl leading-tight mb-2 max-w-[80%] mx-auto">{currentGoal.title}</h3>
                        <div className="flex items-center gap-3 mt-1">
                            <span className="text-white/80 text-xs font-semibold bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm">
                                Day {user.currentDay} of {currentGoal.durationDays}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="px-6 -mt-8 relative z-20 space-y-6">
                    {/* Agent Alerts */}
                    {agentAlerts.filter(a => !a.isRead).map(alert => (
                        <AgentAlertCard key={alert.id} alert={alert} onClick={() => setView(AppView.STATS)} />
                    ))}

                    {/* ALL TASKS - Combined Card */}
                    <Card className="p-0 overflow-hidden border-none shadow-lg bg-white">
                        {/* Header */}
                        <div className="p-5 border-b border-gray-100">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center">
                                        <Icons.Zap className="w-5 h-5 text-secondary" />
                                    </div>
                                    <h3 className="font-bold text-primary text-lg">All Tasks</h3>
                                </div>
                                <Badge color="bg-secondary/10 text-secondary">{totalPendingTasks} ACTIVE</Badge>
                            </div>
                        </div>
                        
                        <div className="p-5">
                            {/* Daily Tasks */}
                            {pendingDailyTasks.length > 0 && (
                                <div className="space-y-3 mb-6">
                                    {pendingDailyTasks.map(task => (
                                        <div 
                                            key={task.id} 
                                            onClick={() => handleTaskSelect(task.id)} 
                                            className="bg-gray-50 border border-gray-100 p-4 rounded-xl flex justify-between items-center cursor-pointer hover:shadow-md hover:border-secondary/30 transition-all group"
                                        >
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${getDifficultyColor(task.difficulty)}`}>
                                                        {task.difficulty || 'TASK'}
                                                    </span>
                                                </div>
                                                <h4 className="font-bold text-primary text-sm group-hover:text-secondary transition-colors uppercase">{task.title}</h4>
                                                <p className="text-xs text-gray-400 mt-0.5">{task.estimatedTimeMinutes || 20} min</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {(task.timeLeft !== undefined && task.timeLeft > 0 && task.timeLeft < ((task.estimatedTimeMinutes || 20) * 60)) && (
                                                    <Badge color={task.isTimerActive ? "bg-green-100 text-green-700 animate-pulse" : "bg-yellow-100 text-yellow-700"}>
                                                        {calculateRealTimeRemaining(task)}
                                                    </Badge>
                                                )}
                                                <Icons.ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-secondary transition-colors"/>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* LESSON TASKS Section */}
                            {pendingLessonTasks.length > 0 && (
                                <div className="mt-4">
                                    <h4 className="text-xs font-black text-secondary uppercase tracking-widest mb-4">Lesson Tasks</h4>
                                    <div className="space-y-3">
                                        {pendingLessonTasks.map(task => {
                                            const lessonName = getLessonNameForTask(task);
                                            return (
                                                <div 
                                                    key={task.id} 
                                                    onClick={() => handleTaskSelect(task.id)} 
                                                    className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl flex justify-between items-center cursor-pointer hover:shadow-md hover:border-secondary/40 transition-all group"
                                                >
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${getDifficultyColor(task.difficulty)}`}>
                                                                {task.difficulty || 'TASK'}
                                                            </span>
                                                        </div>
                                                        <h4 className="font-bold text-primary text-sm group-hover:text-secondary transition-colors uppercase">{task.title}</h4>
                                                        <p className="text-xs text-secondary/70 mt-0.5">
                                                            From: {lessonName || 'Curriculum'} • {task.estimatedTimeMinutes || 20} min
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        {(task.timeLeft !== undefined && task.timeLeft > 0 && task.timeLeft < ((task.estimatedTimeMinutes || 20) * 60)) && (
                                                            <Badge color={task.isTimerActive ? "bg-blue-100 text-blue-700 animate-pulse" : "bg-blue-100 text-blue-600"}>
                                                                {calculateRealTimeRemaining(task)}
                                                            </Badge>
                                                        )}
                                                        <Icons.ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-secondary transition-colors"/>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Empty State */}
                            {totalPendingTasks === 0 && (
                                <div className="text-center py-8 bg-green-50 rounded-2xl">
                                    <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Icons.Check className="w-7 h-7 text-green-600" />
                                    </div>
                                    <p className="text-primary font-semibold">All tasks complete!</p>
                                    <p className="text-gray-500 text-sm mt-1">Great progress today</p>
                                </div>
                            )}

                            {/* Want more tasks CTA */}
                            <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center">
                                        <Icons.BookOpen className="w-5 h-5 text-secondary" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-primary text-sm">Want more tasks?</h4>
                                        <p className="text-xs text-gray-500">Start lessons from your curriculum to unlock related tasks.</p>
                                    </div>
                                </div>
                            </div>
                            
                            <Button onClick={() => setView(AppView.TASK_SELECTION)} className="w-full mt-4" variant="secondary">
                                Browse All Tasks
                            </Button>
                        </div>
                    </Card>

                    {/* Earn Credits Section */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-6 overflow-hidden transition-all duration-300">
                      <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsEarnExpanded(!isEarnExpanded)}>
                          <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                                  <Icons.Coins className="w-5 h-5 text-yellow-600" />
                              </div>
                              <h3 className="text-lg font-bold text-primary">Earn Credits</h3>
                          </div>
                          <Icons.ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isEarnExpanded ? 'rotate-180' : ''}`} />
                      </div>
                      {isEarnExpanded && (
                          <div className="space-y-3 mt-6 animate-slide-up">
                              {earnTasks.map(task => (
                                  <div key={task.id} className={`w-full p-4 rounded-xl border transition-all ${task.isCompleted ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-200 hover:border-secondary/30'}`}>
                                      <div className="flex items-center justify-between mb-3">
                                          <div className="flex items-center gap-3">
                                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${task.isCompleted ? 'bg-gray-100 text-gray-400' : 'bg-secondary/10 text-secondary'}`}>
                                                  <Icons.Zap className="w-5 h-5"/>
                                              </div>
                                              <div>
                                                  <div className={`font-bold text-sm ${task.isCompleted ? 'text-gray-400 line-through' : 'text-primary'}`}>{task.title}</div>
                                                  <div className="text-xs text-gray-400">{task.subtitle}</div>
                                              </div>
                                          </div>
                                          <div className="text-right">
                                              <div className="font-black text-sm text-yellow-600">+{task.reward}</div>
                                          </div>
                                      </div>
                                      {!task.isCompleted ? (
                                          <Button onClick={() => handleEarnCreditProgress(task.id)} variant="outline" className="w-full py-2 text-xs h-10">
                                              Perform Action ({task.progress}/{task.maxProgress})
                                          </Button>
                                      ) : (
                                          <div className="mt-2 text-center text-xs font-bold text-green-600 bg-green-50 py-2 rounded-lg">
                                              Completed
                                          </div>
                                      )}
                                  </div>
                              ))}
                          </div>
                      )}
                    </div>
                </div>

                {/* Daily Check-in Modal */}
                {showCheckIn && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/90 backdrop-blur-md p-6 animate-fade-in">
                      <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl animate-scale-in">
                          <div className="flex items-center gap-3 mb-6">
                              <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center">
                                  <Icons.Check className="w-6 h-6 text-primary" />
                              </div>
                              <div>
                                  <h2 className="text-xl font-bold text-primary">Daily Check-in</h2>
                                  <p className="text-sm text-gray-500">What did you accomplish today?</p>
                              </div>
                          </div>
                          <textarea 
                              value={checkInText} 
                              onChange={(e) => setCheckInText(e.target.value)} 
                              className="w-full h-32 p-4 bg-gray-50 rounded-xl border-2 border-transparent focus:border-secondary/30 mb-6 focus:outline-none resize-none transition-colors" 
                              placeholder="I researched 3 competitors, made 5 sales calls..." 
                          />
                          <Button onClick={submitDailyCheckIn} isLoading={isProcessingCheckIn} disabled={!checkInText.trim()} className="w-full">
                              Submit Check-in
                          </Button>
                          <button onClick={() => setShowCheckIn(false)} className="w-full mt-4 text-sm font-semibold text-gray-400 hover:text-primary transition-colors py-2">
                              Cancel
                          </button>
                      </div>
                  </div>
                )}
            </div>
        </div>
    );
}
