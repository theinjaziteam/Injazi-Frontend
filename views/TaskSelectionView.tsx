import React from 'react';
import { useApp } from '../contexts/AppContext';
import { AppView, TaskStatus, Difficulty } from '../types';
import { Icons, Card, Badge, Button } from '../components/UIComponents';

export default function TaskSelectionView() {
    const { user, setUser, setView, lessons } = useApp();

    const handleTaskSelect = (taskId: string) => {
        setUser(prev => {
            const updatedTasks = prev.dailyTasks.map(t => ({ ...t, isSelected: t.id === taskId }));
            return { ...prev, dailyTasks: updatedTasks, selectedTaskId: taskId };
        });
        setView(AppView.TASK_EXECUTION);
    };

    // Filter tasks - separate daily tasks from lesson tasks
    const dailyTasks = user.dailyTasks.filter(t => 
        t.status !== TaskStatus.APPROVED && 
        t.status !== TaskStatus.COMPLETED &&
        t.status !== TaskStatus.REJECTED &&
        !t.isLessonTask
    );

    const lessonTasks = user.dailyTasks.filter(t => 
        t.status !== TaskStatus.APPROVED && 
        t.status !== TaskStatus.COMPLETED &&
        t.status !== TaskStatus.REJECTED &&
        t.isLessonTask === true
    );

    // Count completed tasks
    const completedDailyCount = user.dailyTasks.filter(t => 
        (t.status === TaskStatus.APPROVED || t.status === TaskStatus.COMPLETED) &&
        !t.isLessonTask
    ).length;

    const completedLessonCount = user.dailyTasks.filter(t => 
        (t.status === TaskStatus.APPROVED || t.status === TaskStatus.COMPLETED) &&
        t.isLessonTask === true
    ).length;

    // Get lesson name for a task
    const getLessonNameForTask = (lessonId: string | undefined): string | null => {
        if (!lessonId || !lessons) return null;
        for (const chapter of lessons) {
            const lesson = chapter.lessons.find(l => l.id === lessonId);
            if (lesson) return lesson.title;
        }
        return null;
    };

    const formatStatus = (status: TaskStatus) => {
        switch(status) {
            case TaskStatus.IN_PROGRESS: return 'In Progress';
            case TaskStatus.PENDING: return 'Pending';
            default: return status;
        }
    };

    const getStatusColor = (status: TaskStatus) => {
        switch(status) {
            case TaskStatus.IN_PROGRESS: return 'bg-amber-100 text-amber-700';
            case TaskStatus.PENDING: return 'bg-gray-100 text-gray-600';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    return (
        <div className="h-full overflow-y-auto pb-safe scroll-smooth">
            <div className="min-h-full flex flex-col animate-fade-in pb-20 theme-transition theme-bg-page">
                {/* Header */}
                <div className="p-6 pt-safe border-b flex items-center gap-4 sticky top-0 z-10 theme-border theme-bg-card">
                    <button onClick={() => setView(AppView.DASHBOARD)} className="p-2 hover:theme-bg-hover rounded-full transition-colors mt-2">
                        <Icons.ChevronLeft className="w-6 h-6 theme-text-primary"/>
                    </button>
                    <h1 className="text-2xl font-black theme-text-primary mt-2 uppercase tracking-tighter">All Tasks</h1>
                </div>

                <div className="p-6 space-y-8">
                    {/* Daily Missions */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xs font-black theme-text-muted uppercase tracking-[0.2em]">Daily Missions</h2>
                            {completedDailyCount > 0 && (
                                <span className="text-xs font-bold text-green-600">{completedDailyCount} done</span>
                            )}
                        </div>
                        
                        {dailyTasks.length === 0 ? (
                            <Card className="p-6 text-center border-dashed border-2 theme-border theme-bg-surface">
                                <Icons.Check className="w-10 h-10 text-green-500 mx-auto mb-2" />
                                <p className="theme-text-muted text-sm">All daily tasks complete!</p>
                            </Card>
                        ) : (
                            <div className="space-y-3">
                                {dailyTasks.map(task => (
                                    <Card 
                                        key={task.id} 
                                        onClick={() => handleTaskSelect(task.id)} 
                                        className="p-5 flex justify-between items-center hover:theme-shadow-md transition-all active:scale-[0.99]"
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Badge>{task.difficulty}</Badge>
                                                {task.status !== TaskStatus.PENDING && (
                                                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${getStatusColor(task.status)}`}>
                                                        {formatStatus(task.status)}
                                                    </span>
                                                )}
                                            </div>
                                            <h4 className="font-black theme-text-primary text-lg leading-tight uppercase">{task.title}</h4>
                                            <p className="text-xs theme-text-muted font-medium mt-1">{task.estimatedTimeMinutes} Minutes</p>
                                        </div>
                                        <Icons.ChevronRight className="w-6 h-6 theme-text-muted" />
                                    </Card>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Lesson Tasks - DARKER COLOR */}
                    {lessonTasks.length > 0 && (
                        <section>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xs font-black text-indigo-700 uppercase tracking-[0.2em]">Lesson Tasks</h2>
                                {completedLessonCount > 0 && (
                                    <span className="text-xs font-bold text-green-600">{completedLessonCount} done</span>
                                )}
                            </div>
                            
                            <div className="space-y-3">
                                {lessonTasks.map(task => {
                                    const lessonName = getLessonNameForTask(task.sourceLessonId);
                                    return (
                                        <Card 
                                            key={task.id} 
                                            onClick={() => handleTaskSelect(task.id)} 
                                            className="p-5 bg-indigo-100 border-indigo-200 flex justify-between items-center hover:border-indigo-400 hover:shadow-md transition-all active:scale-[0.99]"
                                        >
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Badge color="bg-indigo-600 text-white">{task.difficulty}</Badge>
                                                    {task.status !== TaskStatus.PENDING && (
                                                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${getStatusColor(task.status)}`}>
                                                            {formatStatus(task.status)}
                                                        </span>
                                                    )}
                                                </div>
                                                <h4 className="font-black text-indigo-900 text-lg leading-tight uppercase">{task.title}</h4>
                                                <p className="text-xs text-indigo-600 font-medium mt-1">
                                                    {lessonName ? `From: ${lessonName}` : 'Lesson Task'} • {task.estimatedTimeMinutes} min
                                                </p>
                                            </div>
                                            <Icons.ChevronRight className="w-6 h-6 text-indigo-400" />
                                        </Card>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {/* View History Button */}
                    {(completedDailyCount > 0 || completedLessonCount > 0) && (
                        <button 
                            onClick={() => setView(AppView.TASK_HISTORY)}
                            className="w-full py-4 px-6 theme-bg-surface hover:theme-bg-hover rounded-2xl border theme-border flex items-center justify-between transition-colors group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                                    <Icons.Check className="w-5 h-5 text-green-600" />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold theme-text-primary text-sm">View Completed Tasks</p>
                                    <p className="text-xs theme-text-muted">{completedDailyCount + completedLessonCount} tasks finished</p>
                                </div>
                            </div>
                            <Icons.ChevronRight className="w-5 h-5 theme-text-muted group-hover:theme-text-secondary transition-colors" />
                        </button>
                    )}

                    {/* Curriculum Pointer */}
                    <Card className="p-6 bg-secondary/5 border-secondary/20">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                <Icons.BookOpen className="w-6 h-6 text-secondary" />
                            </div>
                            <div>
                                <h3 className="font-bold theme-text-primary mb-1">Want more tasks?</h3>
                                <p className="text-sm theme-text-muted mb-3">
                                    Start lessons from your curriculum to unlock related tasks.
                                </p>
                                <Button 
                                    onClick={() => setView(AppView.SOCIAL)} 
                                    variant="outline" 
                                    className="py-2 px-4 text-xs"
                                >
                                    Go to Curriculum
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
