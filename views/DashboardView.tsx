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
            
            // Keep existing lesson tasks, add new daily tasks
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
        <div onClick={onClick} className={`rounded-2xl mb-4 border-l-4 shadow-lg bg-white p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors ${alert.severity === 'high' ? 'border-red-500 shadow-red-500/10' : 'border-blue-500 shadow-blue-500/10'}`}>
            <div className="flex items-center gap-3 overflow-hidden">
                <Icons.AlertTriangle className={`w-5 h-5 flex-shrink-0 ${alert.severity === 'high' ? 'text-red-500' : 'text-blue-500'}`}/>
                <h3 className="font-bold text-primary text-sm truncate">{alert.title}</h3>
            </div>
            <Icons.ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
        </div>
    );

    return (
        <div className="h-full overflow-y-auto pb-safe scroll-smooth">
            <div className="min-h-full bg-white pb-28 animate-fade-in">
                 <div className="bg-primary text-white px-6 pt-safe pt-12 pb-16 rounded-b-[3rem] relative overflow-hidden shadow-2xl shadow-primary/20">
                    <div className="flex justify-between items-center relative z-20 mb-6 mt-4">
                        <h2 className="text-xl font-black tracking-tighter">INJAZI</h2>
                        <div className="flex gap-2">
                            <button onClick={() => setShowCheckIn(true)} className="p-2 bg-[#DFF3E4] text-primary rounded-full hover:bg-white transition-colors shadow-lg"><Icons.Check className="w-5 h-5" /></button>
                            <button onClick={() => setView(AppView.SETTINGS)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"><Icons.Settings className="w-5 h-5" /></button>
                        </div>
                    </div>
                    
                    <div className="relative z-20 w-full mb-10">
                         <div className="flex justify-center items-center flex-wrap gap-4 text-xs font-bold tracking-[0.2em] uppercase">
                             {allGoals.map((g, idx) => (<React.Fragment key={g.id}><button onClick={() => switchGoal(g)} className={`transition-all hover:scale-105 ${g.id === currentGoal.id ? 'text-white border-b-2 border-accent pb-0.5' : 'text-white/40'}`}>Goal {idx + 1}</button><span className="text-white/10">|</span></React.Fragment>))}
                             <button onClick={handleAddGoal} className="text-white/40 hover:text-white transition-colors flex items-center gap-1">+ New</button>
                         </div>
                    </div>

                    <div className="flex flex-col items-center text-center relative z-10 animate-slide-up">
                        <div className="relative w-40 h-40 flex items-center justify-center mb-4">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="6" fill="none" className="text-white/5" />
                                <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="6" fill="none" className="text-accent" strokeDasharray="263.8" strokeDashoffset={263.8 - (263.8 * (user.currentDay / (currentGoal.durationDays || 365)))} strokeLinecap="round" />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center flex-col">
                                <span className="text-4xl font-black text-white tracking-tighter">{Math.round((user.currentDay/(currentGoal.durationDays || 365))*100)}%</span>
                            </div>
                        </div>
                        <h3 className="font-bold text-2xl leading-tight mb-2 max-w-[80%] mx-auto">{currentGoal.title}</h3>
                        <div className="flex items-center gap-3 mt-1"><span className="text-white/60 text-xs font-bold uppercase tracking-wide bg-white/5 px-3 py-1 rounded-lg">Day {user.currentDay} of {currentGoal.durationDays}</span></div>
                    </div>
                </div>

                <div className="px-6 -mt-8 relative z-20 space-y-6">
                    {agentAlerts.filter(a => !a.isRead).map(alert => (<AgentAlertCard key={alert.id} alert={alert} onClick={() => setView(AppView.STATS)} />))}

                    {/* Active Daily Missions Card */}
                    <Card className="p-0 overflow-hidden border-none shadow-xl shadow-primary/10">
                        <div className="bg-white p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-primary text-lg">Daily Missions</h3>
                                <Badge color="bg-secondary text-white">{pendingDailyTasks.length} ACTIVE</Badge>
                            </div>
                            
                            {pendingDailyTasks.length === 0 ? (
                                <div className="text-center py-6">
                                    <Icons.Check className="w-10 h-10 text-green-500 mx-auto mb-2" />
                                    <p className="text-gray-500 text-sm">All daily tasks complete!</p>
                                </div>
                            ) : (
                                <div className="space-y-3 mb-6">
                                   {pendingDailyTasks.map(task => (
                                       <div key={task.id} onClick={() => handleTaskSelect(task.id)} className="bg-gray-50 border border-gray-100 p-4 rounded-xl flex justify-between items-center cursor-pointer hover:shadow-md transition-all group">
                                           <div>
                                               <div className="text-[9px] font-black uppercase text-secondary tracking-widest mb-1">Daily Task</div>
                                               <h4 className="font-bold text-primary text-sm group-hover:text-secondary transition-colors">{task.title}</h4>
                                           </div>
                                           <div className="flex items-center gap-3">
                                               {(task.timeLeft !== undefined && task.timeLeft > 0 && task.timeLeft < ((task.estimatedTimeMinutes || 20) * 60)) && (
                                                   <Badge color={task.isTimerActive ? "bg-green-100 text-green-700 animate-pulse" : "bg-yellow-100 text-yellow-700"}>
                                                       {calculateRealTimeRemaining(task)}
                                                   </Badge>
                                               )}
                                               <Icons.ChevronRight className="w-5 h-5 text-gray-300"/>
                                           </div>
                                       </div>
                                   ))}
                                </div>
                            )}
                            
                            <Button onClick={() => setView(AppView.TASK_SELECTION)} className="w-full group" variant="secondary">Browse All Tasks</Button>
                        </div>
                    </Card>

                    {/* REMOVED: Separate Lesson Tasks Card with purple/pink gradient */}

                    {/* Earn Credits Section */}
                    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-md p-6 overflow-hidden transition-all duration-300">
                      <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsEarnExpanded(!isEarnExpanded)}>
                          <h3 className="text-xl font-black text-primary flex items-center gap-2"><Icons.Coins className="w-6 h-6 text-yellow-500" /> Earn Credits</h3>
                          <Icons.ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isEarnExpanded ? 'rotate-180' : ''}`} />
                      </div>
                      {isEarnExpanded && (
                          <div className="space-y-3 mt-6 animate-slide-up">
                              {earnTasks.map(task => (
                                  <div key={task.id} className={`w-full p-4 rounded-2xl border transition-all ${task.isCompleted ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-200'}`}>
                                      <div className="flex items-center justify-between mb-2">
                                          <div className="flex items-center gap-3">
                                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${task.isCompleted ? 'bg-gray-200 text-gray-400' : 'bg-blue-50 text-blue-600'}`}>
                                                  <Icons.Zap className="w-5 h-5"/>
                                              </div>
                                              <div>
                                                  <div className={`font-bold text-sm ${task.isCompleted ? 'text-gray-400 line-through' : 'text-primary'}`}>{task.title}</div>
                                                  <div className="text-xs text-gray-400">{task.subtitle}</div>
                                              </div>
                                          </div>
                                          <div className="text-right"><div className="font-black text-sm text-primary">+{task.reward}</div></div>
                                      </div>
                                      {!task.isCompleted ? (
                                          <Button onClick={() => handleEarnCreditProgress(task.id)} variant="outline" className="py-2 text-xs h-8">Perform Action ({task.progress}/{task.maxProgress})</Button>
                                      ) : <div className="mt-2 text-center text-xs font-bold text-green-600 bg-green-50 py-1 rounded-lg">Completed</div>}
                                  </div>
                              ))}
                          </div>
                      )}
                    </div>
                </div>

                {showCheckIn && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/80 backdrop-blur-sm p-6 animate-fade-in">
                      <div className="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl animate-scale-in">
                          <h2 className="text-2xl font-bold text-primary mb-2">Daily Check-in</h2>
                          <p className="text-sm text-secondary mb-6">What did you accomplish today?</p>
                          <textarea value={checkInText} onChange={(e) => setCheckInText(e.target.value)} className="w-full h-32 p-4 bg-accent/30 rounded-xl border border-accent mb-6 focus:outline-none" placeholder="I researched 3 competitors..." />
                          <Button onClick={submitDailyCheckIn} isLoading={isProcessingCheckIn} disabled={!checkInText.trim()}>Submit Check-in</Button>
                          <button onClick={() => setShowCheckIn(false)} className="w-full mt-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Cancel</button>
                      </div>
                  </div>
                )}
            </div>
        </div>
    );
}
