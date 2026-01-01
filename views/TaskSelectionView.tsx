// views/TaskSelectionView.tsx
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
            case TaskStatus.IN_PROGRESS: return 'bg-amber-100 text-amber-700 border border-amber-200';
            case TaskStatus.PENDING: return 'bg-gray-100 text-gray-600 border border-gray-200';
            default: return 'bg-gray-100 text-gray-600 border border-gray-200';
        }
    };

    return (
        <div className="h-full overflow-y-auto pb-safe scroll-smooth">
            <div className="min-h-full bg-white flex flex-col animate-fade-in pb-20">
                {/* Header */}
                <div className="p-6 pt-safe border-b border-gray-100 flex items-center gap-4 bg-white sticky top-0 z-10">
                    <button 
                        onClick={() => setView(AppView.DASHBOARD)} 
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        aria-label="Back to dashboard"
                    >
                        <Icons.ChevronLeft className="w-6 h-6 text-primary"/>
                    </button>
                    <h1 className="text-2xl font-black text-primary mt-2 uppercase tracking-tighter">All Tasks</h1>
                </div>

                <div className="p-6 space-y-8">
                    {/* Daily Missions */}
                    <section aria-labelledby="daily-missions-heading">
                        {/* FIX #28: Consistent section header alignment */}
                        <div className="flex items-center justify-between mb-4">
                            <h2 
                                id="daily-missions-heading" 
                                className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]"
                            >
                                Daily Missions
                            </h2>
                            {completedDailyCount > 0 && (
                                <span className="text-xs font-bold text-green-600" aria-label={`${completedDailyCount} tasks completed`}>
                                    {completedDailyCount} done
                                </span>
                            )}
                        </div>
                        
                        {dailyTasks.length === 0 ? (
                            <Card className="p-6 text-center border-dashed border-2 border-gray-200 bg-gray-50/50">
                                <Icons.Check className="w-10 h-10 text-green-500 mx-auto mb-2" aria-hidden="true" />
                                <p className="text-gray-500 text-sm">All daily tasks complete!</p>
                            </Card>
                        ) : (
                            <div className="space-y-3" role="list" aria-label="Daily mission tasks">
                                {dailyTasks.map(task => (
                                    <Card 
                                        key={task.id} 
                                        onClick={() => handleTaskSelect(task.id)} 
                                        className="p-5 flex justify-between items-center hover:border-primary/20 hover:shadow-md transition-all active:scale-[0.99] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                                        role="listitem"
                                        tabIndex={0}
                                        onKeyDown={(e) => e.key === 'Enter' && handleTaskSelect(task.id)}
                                        aria-label={`${task.title}, ${task.difficulty} difficulty, ${task.estimatedTimeMinutes} minutes`}
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
                                            <h4 className="font-black text-primary text-lg leading-tight uppercase">{task.title}</h4>
                                            <p className="text-xs text-gray-400 font-medium mt-1">{task.estimatedTimeMinutes} Minutes</p>
                                        </div>
                                        <Icons.ChevronRight className="w-6 h-6 text-gray-300" aria-hidden="true" />
                                    </Card>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Lesson Tasks - FIX #29: Subtle but clear differentiation */}
                    {lessonTasks.length > 0 && (
                        <section aria-labelledby="lesson-tasks-heading">
                            <div className="flex items-center justify-between mb-4">
                                <h2 
                                    id="lesson-tasks-heading" 
                                    className="text-xs font-black text-indigo-700 uppercase tracking-[0.2em]"
                                >
                                    Lesson Tasks
                                </h2>
                                {completedLessonCount > 0 && (
                                    <span className="text-xs font-bold text-green-600" aria-label={`${completedLessonCount} lesson tasks completed`}>
                                        {completedLessonCount} done
                                    </span>
                                )}
                            </div>
                            
                            <div className="space-y-3" role="list" aria-label="Lesson-based tasks">
                                {lessonTasks.map(task => {
                                    const lessonName = getLessonNameForTask(task.sourceLessonId);
                                    return (
                                        <Card 
                                            key={task.id} 
                                            onClick={() => handleTaskSelect(task.id)} 
                                            /* FIX #29: Refined lesson task styling - subtle background tint with clear border */
                                            className="p-5 bg-indigo-50/70 border-2 border-indigo-200/80 flex justify-between items-center hover:border-indigo-400 hover:shadow-md hover:bg-indigo-50 transition-all active:scale-[0.99] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                                            role="listitem"
                                            tabIndex={0}
                                            onKeyDown={(e) => e.key === 'Enter' && handleTaskSelect(task.id)}
                                            aria-label={`Lesson task: ${task.title}, ${task.difficulty} difficulty, ${task.estimatedTimeMinutes} minutes${lessonName ? `, from ${lessonName}` : ''}`}
                                        >
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    {/* FIX #29: Consistent badge styling for lesson tasks */}
                                                    <Badge color="bg-indigo-600 text-white">{task.difficulty}</Badge>
                                                    {task.status !== TaskStatus.PENDING && (
                                                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${getStatusColor(task.status)}`}>
                                                            {formatStatus(task.status)}
                                                        </span>
                                                    )}
                                                </div>
                                                <h4 className="font-black text-indigo-900 text-lg leading-tight uppercase">{task.title}</h4>
                                                <p className="text-xs text-indigo-600/80 font-medium mt-1">
                                                    {lessonName ? `From: ${lessonName}` : 'Lesson Task'} • {task.estimatedTimeMinutes} min
                                                </p>
                                            </div>
                                            <Icons.ChevronRight className="w-6 h-6 text-indigo-400" aria-hidden="true" />
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
                            className="w-full py-4 px-6 bg-gray-50 hover:bg-gray-100 rounded-2xl border border-gray-200 flex items-center justify-between transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                            aria-label={`View ${completedDailyCount + completedLessonCount} completed tasks`}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                                    <Icons.Check className="w-5 h-5 text-green-600" aria-hidden="true" />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-primary text-sm">View Completed Tasks</p>
                                    <p className="text-xs text-gray-400">{completedDailyCount + completedLessonCount} tasks finished</p>
                                </div>
                            </div>
                            <Icons.ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-400 transition-colors" aria-hidden="true" />
                        </button>
                    )}

                    {/* Curriculum Pointer */}
                    <Card className="p-6 bg-secondary/5 border-secondary/20">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                <Icons.BookOpen className="w-6 h-6 text-secondary" aria-hidden="true" />
                            </div>
                            <div>
                                <h3 className="font-bold text-primary mb-1">Want more tasks?</h3>
                                <p className="text-sm text-gray-500 mb-3">
                                    Start lessons from your curriculum to unlock related tasks.
                                </p>
                                <Button 
                                    onClick={() => setView(AppView.SOCIAL)} 
                                    variant="outline" 
                                    className="py-2 px-4 text-xs"
                                    aria-label="Go to curriculum to unlock more tasks"
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
