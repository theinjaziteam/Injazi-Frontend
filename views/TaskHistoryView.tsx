import React from 'react';
import { useApp } from '../contexts/AppContext';
import { AppView, TaskStatus } from '../types';
import { Icons, Card } from '../components/UIComponents';

export default function TaskHistoryView() {
    const { user, setView } = useApp();

    const historyTasks = user.dailyTasks.filter(t => 
        t.status === TaskStatus.APPROVED || 
        t.status === TaskStatus.COMPLETED ||
        t.status === TaskStatus.REJECTED
    ).sort((a, b) => b.dayNumber - a.dayNumber);

    const formatStatus = (status: TaskStatus) => {
        switch(status) {
            case TaskStatus.APPROVED: return 'Completed';
            case TaskStatus.COMPLETED: return 'Done';
            case TaskStatus.REJECTED: return 'Failed';
            default: return status;
        }
    };

    return (
        <div className="h-full overflow-y-auto pb-safe scroll-smooth bg-gray-50">
            <div className="min-h-full flex flex-col animate-fade-in">
                {/* Header */}
                <div className="p-6 pt-safe border-b border-gray-200 flex items-center gap-4 bg-white sticky top-0 z-10">
                    <button onClick={() => setView(AppView.TASK_SELECTION)} className="p-2 hover:bg-gray-100 rounded-full transition-colors mt-2">
                        <Icons.ChevronLeft className="w-6 h-6 text-primary"/>
                    </button>
                    <div className="mt-2">
                        <h1 className="text-2xl font-black text-primary uppercase tracking-tight">Completed Tasks</h1>
                        <p className="text-xs text-gray-400">{historyTasks.length} task{historyTasks.length !== 1 ? 's' : ''} finished</p>
                    </div>
                </div>

                <div className="flex-1 p-6">
                    {historyTasks.length === 0 ? (
                        <div className="text-center py-20 text-gray-400">
                            <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Icons.Check className="w-10 h-10 text-gray-400" />
                            </div>
                            <p className="font-medium">No completed tasks yet</p>
                            <p className="text-sm mt-1">Complete your first mission!</p>
                            <button 
                                onClick={() => setView(AppView.TASK_SELECTION)} 
                                className="mt-4 px-6 py-2 bg-primary text-white rounded-full text-sm font-bold"
                            >
                                View Missions
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {historyTasks.map((task, index) => (
                                <div 
                                    key={task.id} 
                                    className="p-4 bg-white rounded-2xl border-2 border-gray-200 shadow-sm"
                                    style={{ animationDelay: `${index * 50}ms` }}
                                >
                                    <div className="flex items-center gap-4">
                                        {/* Simple solid icon */}
                                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                            task.status === TaskStatus.APPROVED || task.status === TaskStatus.COMPLETED 
                                                ? 'bg-green-500 text-white' 
                                                : 'bg-red-500 text-white'
                                        }`}>
                                            {task.status === TaskStatus.REJECTED 
                                                ? <Icons.X className="w-5 h-5"/> 
                                                : <Icons.Check className="w-5 h-5"/>
                                            }
                                        </div>
                                        
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                                    Day {task.dayNumber}
                                                </span>
                                                <span className="text-[10px] text-gray-300">•</span>
                                                <span className="text-[10px] text-gray-400">
                                                    {task.estimatedTimeMinutes} min
                                                </span>
                                            </div>
                                            <h4 className="font-bold text-primary line-clamp-1">{task.title}</h4>
                                        </div>
                                        
                                        <span className={`text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wide ${
                                            task.status === TaskStatus.APPROVED || task.status === TaskStatus.COMPLETED
                                                ? 'bg-green-100 text-green-700 border border-green-200' 
                                                : 'bg-red-100 text-red-700 border border-red-200'
                                        }`}>
                                            {formatStatus(task.status)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
