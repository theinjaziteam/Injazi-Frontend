// views/TaskExecutionView.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../contexts/AppContext';
import { AppView, TaskStatus } from '../types';
import { Icons, Button, Card } from '../components/UIComponents';

export default function TaskExecutionView() {
    const { user, setUser, setView, triggerConfetti } = useApp();
    const task = user.dailyTasks.find(t => t.id === user.selectedTaskId);
    const initRef = useRef(false);

    // Calculate initial time - FIXED VERSION
    const getInitialTime = useCallback(() => {
        if (!task) return 0;
        
        const totalDuration = (task.estimatedTimeMinutes || 15) * 60;
        
        // FIX: If timeLeft is 0 or undefined AND task isn't completed, reset to full duration
        if (
            (task.timeLeft === undefined || task.timeLeft === null || task.timeLeft === 0) &&
            task.status !== TaskStatus.APPROVED &&
            task.status !== TaskStatus.COMPLETED
        ) {
            console.log('Timer init: Resetting to full duration:', totalDuration);
            return totalDuration;
        }
        
        let storedTime = task.timeLeft!;
        console.log('Timer init: Stored timeLeft:', storedTime);

        // If timer was active, calculate elapsed time while away
        if (task.isTimerActive && task.lastUpdated && task.lastUpdated > 0) {
            const now = Date.now();
            const secondsPassed = Math.floor((now - task.lastUpdated) / 1000);
            storedTime = Math.max(0, storedTime - secondsPassed);
            console.log('Timer init: Was active, seconds passed:', secondsPassed, 'new time:', storedTime);
        }
        
        return storedTime;
    }, [task]);

    const [timeLeft, setTimeLeft] = useState(getInitialTime);
    
    const [isTimerRunning, setIsTimerRunning] = useState(() => {
        if (!task) return false;
        const initialTime = getInitialTime();
        return task.isTimerActive === true && initialTime > 0;
    });
    
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);

    // Initialize timer properties if they don't exist
    useEffect(() => {
        if (!task || initRef.current) return;
        initRef.current = true;
        
        const totalDuration = (task.estimatedTimeMinutes || 15) * 60;
        
        // Initialize if timeLeft is undefined OR 0 (and not completed)
        if (
            (task.timeLeft === undefined || task.timeLeft === 0) &&
            task.status !== TaskStatus.APPROVED &&
            task.status !== TaskStatus.COMPLETED
        ) {
            console.log('Initializing task with timer properties, duration:', totalDuration);
            setUser(prev => ({
                ...prev,
                dailyTasks: prev.dailyTasks.map(t => 
                    t.id === task.id 
                        ? { 
                            ...t, 
                            timeLeft: totalDuration,
                            isTimerActive: false,
                            lastUpdated: 0
                          } 
                        : t
                )
            }));
            setTimeLeft(totalDuration);
        }
    }, [task, setUser]);

    const playAlert = useCallback(() => {
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    }, []);

    // Timer countdown
    useEffect(() => {
        if (!isTimerRunning || timeLeft <= 0) return;
        
        const interval = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    setIsTimerRunning(false);
                    playAlert();
                    setShowCompleteModal(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        
        return () => clearInterval(interval);
    }, [isTimerRunning, playAlert]);

    // Auto-save while running
    useEffect(() => {
        if (!task || !isTimerRunning) return;
        
        const saveInterval = setInterval(() => {
            console.log('Auto-saving timer state:', timeLeft);
            setUser(prev => ({
                ...prev,
                dailyTasks: prev.dailyTasks.map(t => 
                    t.id === task.id 
                        ? { 
                            ...t, 
                            timeLeft: timeLeft, 
                            lastUpdated: Date.now(),
                            isTimerActive: true,
                            status: TaskStatus.IN_PROGRESS
                          } 
                        : t
                )
            }));
        }, 10000);
        
        return () => clearInterval(saveInterval);
    }, [task, isTimerRunning, timeLeft, setUser]);

    // Save on visibility change / unmount
    useEffect(() => {
        const saveState = () => {
            if (!task) return;
            setUser(prev => ({
                ...prev,
                dailyTasks: prev.dailyTasks.map(t => 
                    t.id === task.id 
                        ? { 
                            ...t, 
                            timeLeft: timeLeft, 
                            lastUpdated: isTimerRunning ? Date.now() : 0,
                            isTimerActive: isTimerRunning
                          } 
                        : t
                )
            }));
        };

        const handleVisibilityChange = () => {
            if (document.hidden) saveState();
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', saveState);
        
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', saveState);
            saveState();
        };
    }, [task, timeLeft, isTimerRunning, setUser]);

    const handleBack = () => {
        if (task) {
            const totalDuration = (task.estimatedTimeMinutes || 15) * 60;
            const newStatus = timeLeft < totalDuration && timeLeft > 0 
                ? TaskStatus.IN_PROGRESS 
                : task.status;
            
            setUser(prev => ({
                ...prev,
                dailyTasks: prev.dailyTasks.map(t => 
                    t.id === task.id 
                        ? { 
                            ...t, 
                            timeLeft: timeLeft, 
                            lastUpdated: isTimerRunning ? Date.now() : 0,
                            isTimerActive: isTimerRunning,
                            status: newStatus
                          } 
                        : t
                )
            }));
        }
        setView(AppView.DASHBOARD);
    };

    const formatTime = (seconds: number) => {
        const s = Math.max(0, seconds);
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleStartPause = () => {
        const newState = !isTimerRunning;
        setIsTimerRunning(newState);
        
        if (task) {
            setUser(prev => ({
                ...prev,
                dailyTasks: prev.dailyTasks.map(t => 
                    t.id === task.id 
                        ? { 
                            ...t, 
                            timeLeft: timeLeft, 
                            lastUpdated: newState ? Date.now() : 0,
                            isTimerActive: newState,
                            status: TaskStatus.IN_PROGRESS
                          } 
                        : t
                )
            }));
        }
    };

    const handleAddTime = (minutes: number) => {
        const newTime = timeLeft + (minutes * 60);
        setTimeLeft(newTime);
        setIsTimerRunning(true);
        setShowCompleteModal(false);
        
        if (task) {
            setUser(prev => ({
                ...prev,
                dailyTasks: prev.dailyTasks.map(t => 
                    t.id === task.id 
                        ? { 
                            ...t, 
                            timeLeft: newTime, 
                            lastUpdated: Date.now(),
                            isTimerActive: true
                          } 
                        : t
                )
            }));
        }
    };

    const handleCompleteTask = () => {
        if (!task) return;
        setIsCompleted(true);
        setIsTimerRunning(false);
        
        // Trigger confetti celebration!
        triggerConfetti();
        
        setTimeout(() => {
            setUser(prev => ({
                ...prev,
                dailyTasks: prev.dailyTasks.map(t => 
                    t.id === task.id 
                        ? { 
                            ...t, 
                            status: TaskStatus.APPROVED, 
                            timeLeft: 0,
                            isTimerActive: false,
                            lastUpdated: 0
                          } 
                        : t
                ),
                selectedTaskId: null
            }));
            setView(AppView.DASHBOARD);
        }, 1500);
    };

    if (!task) {
        return (
            <div className="h-full bg-primary text-white flex items-center justify-center">
                <div className="text-center">
                    <p className="text-xl mb-4">Task Not Found</p>
                    <Button onClick={() => setView(AppView.DASHBOARD)}>Go Back</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full bg-primary text-white flex flex-col relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-secondary/20 rounded-full blur-[100px] transition-all duration-1000 ${isTimerRunning ? 'scale-110 opacity-50' : 'scale-100 opacity-20'}`} />
            </div>

            <div className="p-6 pt-safe flex justify-between items-center relative z-10">
              <button 
    onClick={handleBack} 
    className="p-2 bg-white/10 rounded-full hover:bg-white/20 active:scale-95 transition-all"
    aria-label="Go back to dashboard"
>
    <Icons.ChevronLeft className="w-6 h-6"/>
</button>

                <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Focus Mode</span>
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-6">
                <div className="text-center mb-10">
                    <h2 className="text-2xl font-black uppercase tracking-tight mb-2">{task.title}</h2>
                    <p className="text-white/60 text-sm max-w-xs mx-auto">{task.description}</p>
                </div>

                <div className="relative mb-12">
                    <div className="text-6xl sm:text-7xl md:text-8xl font-black tracking-tighter tabular-nums">
    {formatTime(timeLeft)}
</div>
                    <div className="text-center text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 mt-2">
                        {isTimerRunning ? 'Focus Mode Active' : (timeLeft > 0 ? 'Tap to Start' : 'Timer Finished')}
                    </div>
                </div>

                {!isCompleted ? (
                    <div className="flex gap-4">
                        <button 
                            onClick={handleStartPause} 
                            className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-95 ${isTimerRunning ? 'bg-white text-primary' : 'bg-secondary text-white'}`}
                        >
                            {isTimerRunning ? <Icons.Pause className="w-8 h-8" /> : <Icons.PlayCircle className="w-8 h-8" />}
                        </button>
                        {!isTimerRunning && (
                            <button 
                                onClick={() => setShowCompleteModal(true)} 
                                className="px-8 h-20 rounded-[2.5rem] bg-white/10 border-2 border-white/20 text-white font-black uppercase tracking-widest active:scale-95 transition-all"
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
                        <h3 className="text-2xl font-black uppercase tracking-widest">Complete!</h3>
                    </div>
                )}
            </div>

            {showCompleteModal && (
    <div className="fixed inset-0 z-50 bg-primary/90 backdrop-blur-xl flex items-center justify-center p-6 animate-fade-in">
        <Card className="w-full max-w-sm bg-white p-8 text-center rounded-[2rem]">
            <h3 className="text-2xl font-black text-primary uppercase tracking-tight mb-2">
                {timeLeft <= 0 ? 'Timer Finished!' : 'Finish Task?'}
            </h3>
            <p className="text-gray-500 text-sm mb-8">Did you complete the objective?</p>
            
            <div className="space-y-3">
                <Button 
                    onClick={handleCompleteTask} 
                    className="w-full py-5 text-sm font-black uppercase tracking-widest"
                >
                    Yes, Task Complete
                </Button>
                <div className="grid grid-cols-2 gap-3">
                    <Button 
                        variant="outline" 
                        onClick={() => handleAddTime(5)}
                        className="py-4"
                    >
                        +5 Mins
                    </Button>
                    <Button 
                        variant="outline" 
                        onClick={() => handleAddTime(15)}
                        className="py-4"
                    >
                        +15 Mins
                    </Button>
                </div>
                <button 
                    onClick={() => setShowCompleteModal(false)} 
                    className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-4 py-2 w-full hover:text-gray-600 transition-colors"
                    aria-label="Cancel and continue timer"
                >
                    Cancel
                </button>
            </div>
        </Card>
    </div>
)}
        </div>
    );
}
