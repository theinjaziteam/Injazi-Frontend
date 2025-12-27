import React from 'react';
import { useApp } from '../contexts/AppContext';
import { AppView, TaskStatus, Difficulty } from '../types';
import { Icons, Card, Badge, Button } from '../components/UIComponents';

export default function TaskSelectionView() {
    const { user, setUser, setView } = useApp();

    const handleTaskSelect = (taskId: string) => {
        setUser(prev => {
            const updatedTasks = prev.dailyTasks.map(t => ({ ...t, isSelected: t.id === taskId }));
            return { ...prev, dailyTasks: updatedTasks, selectedTaskId: taskId };
        });
        setView(AppView.TASK_EXECUTION);
    };

    // Filter out completed/approved tasks and supplementary tasks from main list
    const activeTasks = user.dailyTasks.filter(t => 
        t.status !== TaskStatus.APPROVED && 
        t.status !== TaskStatus.COMPLETED &&
        t.status !== TaskStatus.REJECTED &&
        !t.isSupplementary // Don't show curriculum tasks here
    );

    // Count completed tasks (excluding supplementary)
    const completedCount = user.dailyTasks.filter(t => 
        (t.status === TaskStatus.APPROVED || t.status === TaskStatus.COMPLETED) &&
        !t.isSupplementary
    ).length;

    // Format status for display
    const formatStatus = (status: TaskStatus) => {
        switch(status) {
            case TaskStatus.IN_PROGRESS: return 'In Progress';
            case TaskStatus.PENDING: return 'Pending';
            case TaskStatus.VERIFYING: return 'Verifying';
            case TaskStatus.APPROVED: return 'Done';
            case TaskStatus.COMPLETED: return 'Done';
            case TaskStatus.REJECTED: return 'Failed';
            case TaskStatus.FAILED: return 'Failed';
            default: return status;
        }
    };

    // Get status badge color
    const getStatusColor = (status: TaskStatus) => {
        switch(status) {
            case TaskStatus.IN_PROGRESS: return 'bg-amber-100 text-amber-700';
            case TaskStatus.PENDING: return 'bg-gray-100 text-gray-600';
            case TaskStatus.VERIFYING: return 'bg-blue-100 text-blue-700';
            case TaskStatus.APPROVED: return 'bg-green-100 text-green-700';
            case TaskStatus.COMPLETED: return 'bg-green-100 text-green-700';
            case TaskStatus.REJECTED: return 'bg-red-100 text-red-700';
            case TaskStatus.FAILED: return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    return (
        <div className="h-full overflow-y-auto pb-safe scroll-smooth">
            <div className="min-h-full bg-white flex flex-col animate-fade-in pb-20">
                {/* Header */}
                <div className="p-6 pt-safe border-b border-gray-100 flex items-center gap-4 bg-white sticky top-0 z-10">
                    <button onClick={() => setView(AppView.DASHBOARD)} className="p-2 hover:bg-gray-100 rounded-full transition-colors mt-2">
                        <Icons.ChevronLeft className="w-6 h-6 text-primary"/>
                    </button>
                    <h1 className="text-2xl font-black text-primary mt-2 uppercase tracking-tighter">Mission Catalog</h1>
                </div>

                <div className="p-6 space-y-10">
                    {/* Daily Missions */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Daily Missions</h2>
                            {completedCount > 0 && (
                                <span className="text-xs font-bold text-green-600">{completedCount} done</span>
                            )}
                        </div>
                        
                        {activeTasks.length === 0 ? (
                            <Card className="p-8 text-center border-dashed border-2 border-gray-200 bg-gray-50/50">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Icons.Check className="w-8 h-8 text-green-600" />
                                </div>
                                <h3 className="font-bold text-primary mb-1">All Missions Complete!</h3>
                                <p className="text-sm text-gray-400">You've finished all your daily tasks</p>
                            </Card>
                        ) : (
                            <div className="space-y-4">
                                {activeTasks.map(task => (
                                    <Card 
                                        key={task.id} 
                                        onClick={() => handleTaskSelect(task.id)} 
                                        className="p-5 flex justify-between items-center hover:border-primary/20 hover:shadow-md transition-all active:scale-[0.99]"
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
                                            <p className="text-xs text-gray-400 font-medium mt-1 uppercase tracking-tighter">{task.estimatedTimeMinutes} Minutes</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {task.status === TaskStatus.IN_PROGRESS && (
                                                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                                            )}
                                            <Icons.ChevronRight className="w-6 h-6 text-gray-300" />
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}

                        {/* View Completed Tasks Button */}
                        {completedCount > 0 && (
                            <button 
                                onClick={() => setView(AppView.TASK_HISTORY)}
                                className="w-full mt-4 py-4 px-6 bg-gray-50 hover:bg-gray-100 rounded-2xl border border-gray-200 flex items-center justify-between transition-colors group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                                        <Icons.Check className="w-5 h-5 text-green-600" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-primary text-sm">View Completed Tasks</p>
                                        <p className="text-xs text-gray-400">{completedCount} mission{completedCount !== 1 ? 's' : ''} finished</p>
                                    </div>
                                </div>
                                <Icons.ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-400 transition-colors" />
                            </button>
                        )}
                    </section>

                    {/* Info Card - Curriculum Pointer */}
                    <section>
                        <Card className="p-6 bg-secondary/5 border-secondary/20">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <Icons.BookOpen className="w-6 h-6 text-secondary" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-primary mb-1">Looking for more learning?</h3>
                                    <p className="text-sm text-gray-500 mb-3">
                                        Access your full curriculum with 12+ lessons in the Curriculum tab.
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
                    </section>
                </div>
            </div>
        </div>
    );
}
