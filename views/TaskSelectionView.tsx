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

    // Flatten curriculum into supplementary tasks
    const supplementaryTasks = lessons.flatMap(chapter => 
        chapter.lessons.map(lesson => ({
            id: lesson.id,
            title: lesson.title,
            description: lesson.description || `Module from ${chapter.title}`,
            estimatedTimeMinutes: parseInt(lesson.duration) || 20,
            difficulty: Difficulty.MEDIUM,
            videoRequirements: 'Record your core insight from this module.',
            creditsReward: 0, 
            status: TaskStatus.PENDING,
            isSupplementary: true
        }))
    );

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
                        <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Architecture Daily Load</h2>
                        <div className="space-y-4">
                            {user.dailyTasks.map(task => (
                                <Card key={task.id} onClick={() => handleTaskSelect(task.id)} className="p-6 flex justify-between items-center hover:border-primary/20">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <Badge>{task.difficulty}</Badge>
                                            {task.status !== TaskStatus.PENDING && <Badge color="bg-primary text-white">{task.status}</Badge>}
                                        </div>
                                        <h4 className="font-black text-primary text-lg leading-tight uppercase">{task.title}</h4>
                                        <p className="text-xs text-gray-400 font-medium mt-1 uppercase tracking-tighter">{task.estimatedTimeMinutes} Minutes</p>
                                    </div>
                                    <Icons.ChevronRight className="w-6 h-6 text-gray-200" />
                                </Card>
                            ))}
                        </div>
                    </section>

                    {/* Supplementary Missions from Curriculum */}
                    <section>
                        <h2 className="text-xs font-black text-secondary uppercase tracking-[0.2em] mb-4">Supplementary Modules</h2>
                        <div className="space-y-4">
                            {supplementaryTasks.map(task => (
                                <Card key={task.id} onClick={() => handleTaskSelect(task.id)} className="p-6 border-secondary/20 bg-secondary/5 group">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 pr-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Badge color="bg-secondary text-white">Curriculum</Badge>
                                                {/* REMOVED THE 0 CR BADGE FROM HERE */}
                                            </div>
                                            <h4 className="font-black text-primary text-lg leading-tight uppercase group-hover:text-secondary transition-colors">{task.title}</h4>
                                            <p className="text-xs text-secondary/60 font-medium mt-2 line-clamp-2">{task.description}</p>
                                        </div>
                                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg text-secondary group-active:scale-95 transition-all">
                                            <Icons.Plus className="w-5 h-5"/>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}