import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { AppView, TaskStatus } from '../types';
import { Icons, Button, Card, Badge } from '../components/UIComponents';

export default function TaskExecutionView() {
    const { user, setUser, setView } = useApp();
    const task = user.dailyTasks.find(t => t.id === user.selectedTaskId);

    // 1. Initialize Logic (Calculates elapsed time while you were away)
    const [timeLeft, setTimeLeft] = useState(() => {
        if (!task) return 0;
        
        // Safety: Default to 15m if estimate is missing
        const totalDuration = (task.estimatedTimeMinutes || 15) * 60;
        let storedTime = task.timeLeft !== undefined ? task.timeLeft : totalDuration;

        // --- BACKGROUND TIMER FIX ---
        // If the timer was active when we left, subtract the time that passed since then.
        if (task.isTimerActive && task.lastUpdated) {
            const now = Date.now();
            const secondsPassed = Math.floor((now - task.lastUpdated) / 1000);
            storedTime = Math.max(0, storedTime - secondsPassed);
        }
        
        return storedTime;
    });
    
    // Auto-resume if it was active
    const [isTimerRunning, setIsTimerRunning] = useState(task?.isTimerActive || false);
    
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);

    const playAlert = () => {
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    };

    // 2. Timer Countdown Loop
    useEffect(() => {
        let interval: any;
        if (isTimerRunning && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft <= 0 && isTimerRunning) {
            // Timer Finished
            setIsTimerRunning(false);
            playAlert();
            setShowCompleteModal(true);
        }
        return () => clearInterval(interval);
    }, [isTimerRunning, timeLeft]);

    // 3. SAVE STATE ON BACK (Saves the Timestamp)
    const handleBack = () => {
        if (task) {
            setUser(prev => ({
                ...prev,
                dailyTasks: prev.dailyTasks.map(t => 
                    t.id === task.id 
                        ? { 
                            ...t, 
                            timeLeft: timeLeft, 
                            lastUpdated: Date.now(), // Save WHEN we left
                            isTimerActive: isTimerRunning, // Save if it was running
                            status: timeLeft < ((task.estimatedTimeMinutes || 15) * 60) && timeLeft > 0 ? TaskStatus.IN_PROGRESS : t.status 
                          } 
                        : t
                )
            }));
        }
        setView(AppView.DASHBOARD);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleAddTime = (minutes: number) => {
        setTimeLeft(minutes * 60);
        setIsTimerRunning(true);
        setShowCompleteModal(false);
    };

    const handleCompleteTask = () => {
        if (!task) return;
        setIsCompleted(true);
        setIsTimerRunning(false);
        
        setTimeout(() => {
            setUser(prev => ({
                ...prev,
                dailyTasks: prev.dailyTasks.map(t => 
                    t.id === task.id ? { 
                        ...t, 
                        status: TaskStatus.APPROVED, 
                        timeLeft: 0,
                        isTimerActive: false,
                        lastUpdated: 0
                    } : t
                ),
                selectedTaskId: null
            }));
            setView(AppView.DASHBOARD);
        }, 1500);
    };

    if (!task) return <div className="p-10 text-center">Task Not Found</div>;

    return (
        <div className="h-full bg-primary text-white flex flex-col relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-secondary/20 rounded-full blur-[100px] transition-all duration-1000 ${isTimerRunning ? 'scale-110 opacity-50' : 'scale-100 opacity-20'}`} />
            </div>

            <div className="p-6 pt-safe flex justify-between items-center relative z-10">
                <button onClick={handleBack} className="p-2 bg-white/10 rounded-full hover:bg-white/20">
                    <Icons.ChevronLeft className="w-6 h-6"/>
                </button>
                <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Focus Mode</span>
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center relative z-10">
                <div className="text-center mb-10 px-6">
                    <h2 className="text-2xl font-black uppercase tracking-tighter mb-2">{task.title}</h2>
                    <p className="text-white/60 text-sm">{task.description}</p>
                </div>

                <div className="relative mb-12">
                    <div className="text-8xl font-black tracking-tighter tabular-nums">
                        {formatTime(Math.max(0, timeLeft))}
                    </div>
                    <div className="text-center text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 mt-2">
                        {isTimerRunning ? 'Focus Mode Active' : 'Timer Paused'}
                    </div>
                </div>

                {!isCompleted ? (
                    <div className="flex gap-4">
                        <button 
                            onClick={() => setIsTimerRunning(!isTimerRunning)} 
                            className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-95 ${isTimerRunning ? 'bg-white text-primary' : 'bg-secondary text-white'}`}
                        >
                            {isTimerRunning ? <Icons.Pause className="w-8 h-8" /> : <Icons.PlayCircle className="w-8 h-8" />}
                        </button>
                        {!isTimerRunning && (
                            <button 
                                onClick={() => setShowCompleteModal(true)} 
                                className="px-8 h-20 rounded-[2.5rem] bg-white/10 border-2 border-white/20 text-white font-black uppercase tracking-widest hover:bg-white/20 transition-all"
                            >
                                Finish Early
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center animate-scale-in">
                        <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-4 shadow-2xl shadow-green-500/50">
                            <Icons.Check className="w-10 h-10 text-white" />
                        </div>
                        <h3 className="text-2xl font-black uppercase tracking-widest">Complete</h3>
                    </div>
                )}
            </div>

            {showCompleteModal && (
                <div className="fixed inset-0 z-50 bg-primary/90 backdrop-blur-xl flex items-center justify-center p-6 animate-fade-in">
                    <Card className="w-full max-w-sm bg-white p-8 text-center rounded-[3rem]">
                        <h3 className="text-2xl font-black text-primary uppercase tracking-tighter mb-2">Timer Finished</h3>
                        <p className="text-gray-500 text-sm mb-8">Did you complete the objective?</p>
                        
                        <div className="space-y-3">
                            <Button onClick={handleCompleteTask} className="py-5 text-sm font-black uppercase tracking-widest">Yes, Task Complete</Button>
                            <div className="grid grid-cols-2 gap-3">
                                <Button variant="outline" onClick={() => handleAddTime(5)}>+5 Mins</Button>
                                <Button variant="outline" onClick={() => handleAddTime(15)}>+15 Mins</Button>
                            </div>
                            <button onClick={() => setShowCompleteModal(false)} className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-4">Cancel</button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}