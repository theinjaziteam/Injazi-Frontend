
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

    return (
        <div className="h-full overflow-y-auto pb-safe scroll-smooth">
            <div className="min-h-full bg-white flex flex-col animate-fade-in">
                {/* Header */}
                <div className="p-6 pt-safe border-b border-gray-100 flex items-center gap-4 bg-white sticky top-0 z-10">
                    <button onClick={() => setView(AppView.DASHBOARD)} className="p-2 hover:bg-gray-100 rounded-full transition-colors mt-2">
                        <Icons.ChevronLeft className="w-6 h-6 text-primary"/>
                    </button>
                    <h1 className="text-2xl font-bold text-primary mt-2">Task History</h1>
                </div>

                <div className="flex-1 p-6">
                    {historyTasks.length === 0 ? (
                        <div className="text-center py-20 text-gray-400">
                            <Icons.Clock className="w-16 h-16 mx-auto mb-4 opacity-20" />
                            <p>No completed tasks yet.</p>
                            <button onClick={() => setView(AppView.DASHBOARD)} className="text-primary font-bold mt-2 text-sm">Start a task</button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {historyTasks.map(task => (
                                <Card key={task.id} className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                            task.status === TaskStatus.APPROVED || task.status === TaskStatus.COMPLETED 
                                                ? 'bg-green-100 text-green-600' 
                                                : 'bg-red-100 text-red-600'
                                        }`}>
                                            {task.status === TaskStatus.REJECTED ? <Icons.X className="w-5 h-5"/> : <Icons.Check className="w-5 h-5"/>}
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Day {task.dayNumber}</div>
                                            <h4 className="font-bold text-primary text-sm line-clamp-1">{task.title}</h4>
                                            <div className="text-xs text-gray-500 mt-1">
                                                {task.verificationMessage || (task.status === TaskStatus.REJECTED ? 'Verification Failed' : 'Verified')}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${
                                            task.status === TaskStatus.APPROVED ? 'bg-green-50 text-green-700' :
                                            task.status === TaskStatus.COMPLETED ? 'bg-blue-50 text-blue-700' :
                                            'bg-red-50 text-red-700'
                                        }`}>
                                            {task.status}
                                        </span>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
