import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { AppView, ConnectedApp, AgentAlert } from '../types';
import { Icons, Card, Badge, Button } from '../components/UIComponents';
import { calculateBudgetSplit, generateDeepInsights } from '../services/geminiService';

export default function StatsView() {
    const { user, setView } = useApp();
    const [selectedDate, setSelectedDate] = useState(Date.now());
    const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');
    const [budgetData, setBudgetData] = useState<any>(null);
    const [insights, setInsights] = useState<any>(null);

    useEffect(() => {
        if(user.goal) {
            calculateBudgetSplit(1000, user.goal, user.userProfile).then(setBudgetData);
            generateDeepInsights(user).then(setInsights);
        }
    }, [user]);

    const DonutChart = ({ data, size = 160 }: { data: { value: number; color: string }[], size?: number }) => {
        let cumulativePercent = 0;
        const total = data.reduce((acc, curr) => acc + curr.value, 0);
        
        return (
            <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
                <svg viewBox="0 0 100 100" className="-rotate-90 w-full h-full">
                    {data.map((slice, i) => {
                        const percent = slice.value / total;
                        const dashArray = percent * 314;
                        const offset = cumulativePercent * 314;
                        cumulativePercent += percent;
                        return (
                            <circle
                                key={i}
                                cx="50" cy="50" r="40"
                                fill="none"
                                stroke={slice.color}
                                strokeWidth="20"
                                strokeDasharray={`${dashArray} 314`}
                                strokeDashoffset={-offset}
                                className="transition-all duration-1000 ease-out"
                            />
                        );
                    })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-white m-[30%] shadow-inner">
                    <span className="text-[10px] font-bold text-gray-400">Total</span>
                    <span className="text-xs font-black text-primary">${total}</span>
                </div>
            </div>
        );
    };

    const LineChart = ({ data, color = "#4F46E5", height = 60 }: { data: number[], color?: string, height?: number }) => {
        const max = Math.max(...data);
        const min = Math.min(...data);
        const range = max - min || 1;
        const points = data.map((val, i) => {
            const x = (i / (data.length - 1)) * 100;
            const y = 100 - ((val - min) / range) * 100;
            return `${x},${y}`;
        }).join(" ");

        return (
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full overflow-visible" style={{ height }}>
                <polyline
                    fill="none"
                    stroke={color}
                    strokeWidth="3"
                    points={points}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                />
            </svg>
        );
    };

    const renderCalendarStrip = () => {
        const days = [];
        for (let i = -3; i <= 3; i++) {
            const d = new Date(selectedDate);
            d.setDate(d.getDate() + i);
            const isSelected = i === 0;
            days.push(
                <div key={i} onClick={() => setSelectedDate(d.getTime())} className={`flex flex-col items-center justify-center w-12 h-16 rounded-2xl transition-all cursor-pointer ${isSelected ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-110' : 'bg-white text-gray-400 border border-gray-100'}`}>
                    <span className="text-[10px] font-bold uppercase">{d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                    <span className="text-lg font-black">{d.getDate()}</span>
                    {isSelected && <div className="w-1 h-1 bg-white rounded-full mt-1"></div>}
                </div>
            );
        }
        return <div className="flex justify-between px-2 mb-8">{days}</div>;
    };

    const renderConnectedApps = () => {
        const relevantApps = user.connectedApps.filter(app => app.isConnected);
        
        if (relevantApps.length === 0) return (
            <div className="text-center p-8 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                <p className="text-gray-400 text-sm mb-4">No apps connected.</p>
                <Button onClick={() => setView(AppView.SETTINGS)} variant="outline" className="text-xs h-10 w-auto px-6">Connect Apps</Button>
            </div>
        );

        return (
            <div className="grid grid-cols-1 gap-4">
                {relevantApps.map(app => (
                    <Card key={app.id} className="p-5">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-gray-100 rounded-xl"><Icons.Activity className="w-5 h-5 text-primary"/></div>
                            <div>
                                <h4 className="font-bold text-primary">{app.name}</h4>
                                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Connected</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {app.metrics.map(metric => (
                                <div key={metric.id}>
                                    <div className="text-xs text-gray-400 mb-1">{metric.name}</div>
                                    <div className="flex items-end gap-2 mb-2">
                                        <span className="text-xl font-black text-primary">{metric.value}{metric.unit}</span>
                                        <span className={`text-[10px] font-bold mb-1 ${metric.status === 'good' ? 'text-green-500' : 'text-red-500'}`}>
                                            {metric.status === 'good' ? '▲' : '▼'}
                                        </span>
                                    </div>
                                    <LineChart data={metric.history} color={metric.status === 'good' ? '#10B981' : '#EF4444'} height={40} />
                                </div>
                            ))}
                        </div>
                    </Card>
                ))}
            </div>
        );
    };

    return (
        <div className="h-full overflow-y-auto pb-safe scroll-smooth">
            <div className="min-h-full bg-white pb-28 flex flex-col animate-fade-in">
                {/* Header - REMOVED pt-safe */}
                <div className="p-6 border-b border-gray-100 bg-white sticky top-0 z-20">
                    <div className="flex justify-between items-center mb-4 mt-2">
                        <h1 className="text-2xl font-bold text-primary">Analytics</h1>
                        <button onClick={() => setView(AppView.DASHBOARD)} className="p-2 bg-gray-50 rounded-full"><Icons.X className="w-5 h-5 text-gray-400"/></button>
                    </div>
                    {renderCalendarStrip()}
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* Main Insight */}
                    <Card className="bg-primary text-white p-6 shadow-2xl shadow-primary/20 border-none">
                        <h3 className="text-white/60 text-xs font-bold uppercase tracking-wider mb-1">Deep Insight</h3>
                        <p className="text-lg font-medium leading-relaxed mb-4">"{insights?.trend || "Analyzing data..."}"</p>
                        <div className="flex gap-4">
                            <div className="bg-white/10 rounded-xl p-3 flex-1">
                                <div className="text-[10px] text-white/60 uppercase">Prediction</div>
                                <div className="font-bold text-sm">{insights?.prediction || "..."}</div>
                            </div>
                            <div className="bg-white/10 rounded-xl p-3 flex-1">
                                <div className="text-[10px] text-white/60 uppercase">Focus Area</div>
                                <div className="font-bold text-sm">{insights?.focusArea || "..."}</div>
                            </div>
                        </div>
                    </Card>

                    {/* Budget Allocation (If Money Goal) */}
                    {user.goal?.category === 'Money & Career' && budgetData && (
                        <div>
                            <h3 className="font-bold text-primary mb-4 flex items-center gap-2"><Icons.PieChart className="w-5 h-5"/> Portfolio Allocation</h3>
                            <Card className="p-6 flex items-center gap-8">
                                <DonutChart data={[
                                    { value: budgetData.lowRisk.amount, color: '#10B981' },
                                    { value: budgetData.mediumRisk.amount, color: '#F59E0B' },
                                    { value: budgetData.highYield.amount, color: '#EF4444' }
                                ]} />
                                <div className="space-y-3 flex-1">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500"></span> Low Risk</span>
                                        <span className="font-bold">{budgetData.lowRisk.percent}%</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Medium</span>
                                        <span className="font-bold">{budgetData.mediumRisk.percent}%</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500"></span> High Yield</span>
                                        <span className="font-bold">{budgetData.highYield.percent}%</span>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    )}

                    {/* Connected Apps */}
                    <div>
                        <h3 className="font-bold text-primary mb-4 flex items-center gap-2"><Icons.Cpu className="w-5 h-5"/> Connected Integrations</h3>
                        {renderConnectedApps()}
                    </div>

                     {/* Reminders / Future */}
                     <div>
                        <h3 className="font-bold text-primary mb-4 flex items-center gap-2"><Icons.Clock className="w-5 h-5"/> Future Milestones</h3>
                        <div className="space-y-3">
                            <div className="flex gap-4 items-start p-4 bg-gray-50 rounded-2xl border border-gray-100 opacity-50">
                                <div className="w-12 text-center">
                                    <span className="block text-xs font-bold text-gray-400">DEC</span>
                                    <span className="block text-xl font-black text-gray-300">15</span>
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-400">Quarterly Review</h4>
                                    <p className="text-xs text-gray-400">Scheduled automated audit.</p>
                                </div>
                            </div>
                        </div>
                     </div>
                </div>
            </div>
        </div>
    );
}
