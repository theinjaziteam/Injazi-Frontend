// views/StatsView.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../contexts/AppContext';
import { AppView } from '../types';
import { Icons, Card, Button } from '../components/UIComponents';
import { calculateBudgetSplit, generateDeepInsights } from '../services/geminiService';

export default function StatsView() {
    const { user, setView } = useApp();
    const [selectedDate, setSelectedDate] = useState(Date.now());
    const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');
    const [budgetData, setBudgetData] = useState<any>(null);
    const [insights, setInsights] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedCard, setExpandedCard] = useState<string | null>(null);
    const [animatedValues, setAnimatedValues] = useState<Record<string, number>>({});

    // Fetch AI data
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            if (user.goal) {
                const [budget, insightData] = await Promise.all([
                    calculateBudgetSplit(1000, user.goal, user.userProfile),
                    generateDeepInsights(user)
                ]);
                setBudgetData(budget);
                setInsights(insightData);
            }
            setIsLoading(false);
        };
        fetchData();
    }, [user]);

    // Calculate stats based on selected date and view mode
    const calculatedStats = useMemo(() => {
        const now = new Date(selectedDate);
        const tasks = user.tasks || [];
        const completedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'approved');
        
        // Filter tasks based on view mode
        const filterByDate = (task: any) => {
            const taskDate = new Date(task.completedAt || task.createdAt || Date.now());
            
            if (viewMode === 'daily') {
                return taskDate.toDateString() === now.toDateString();
            } else if (viewMode === 'weekly') {
                const weekStart = new Date(now);
                weekStart.setDate(now.getDate() - now.getDay());
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);
                return taskDate >= weekStart && taskDate <= weekEnd;
            } else {
                return taskDate.getMonth() === now.getMonth() && taskDate.getFullYear() === now.getFullYear();
            }
        };

        const filteredTasks = completedTasks.filter(filterByDate);
        const totalCredits = filteredTasks.reduce((sum, t) => sum + (t.creditsReward || 0), 0);
        const totalXP = filteredTasks.length * 25; // Assuming 25 XP per task
        
        // Calculate streak
        const streak = user.gameState?.streak || 0;
        
        // Task breakdown by difficulty
        const easyTasks = filteredTasks.filter(t => t.difficulty === 'Easy').length;
        const mediumTasks = filteredTasks.filter(t => t.difficulty === 'Medium').length;
        const hardTasks = filteredTasks.filter(t => t.difficulty === 'Hard').length;

        // Generate history data for charts (last 7 days or weeks or months)
        const historyData = Array.from({ length: 7 }, (_, i) => {
            const date = new Date(now);
            if (viewMode === 'daily') {
                date.setDate(date.getDate() - (6 - i));
            } else if (viewMode === 'weekly') {
                date.setDate(date.getDate() - (6 - i) * 7);
            } else {
                date.setMonth(date.getMonth() - (6 - i));
            }
            
            const dayTasks = completedTasks.filter(t => {
                const taskDate = new Date(t.completedAt || t.createdAt || Date.now());
                if (viewMode === 'daily') {
                    return taskDate.toDateString() === date.toDateString();
                } else if (viewMode === 'weekly') {
                    const weekStart = new Date(date);
                    weekStart.setDate(date.getDate() - date.getDay());
                    const weekEnd = new Date(weekStart);
                    weekEnd.setDate(weekStart.getDate() + 6);
                    return taskDate >= weekStart && taskDate <= weekEnd;
                } else {
                    return taskDate.getMonth() === date.getMonth() && taskDate.getFullYear() === date.getFullYear();
                }
            });
            
            return {
                date,
                tasks: dayTasks.length,
                credits: dayTasks.reduce((sum, t) => sum + (t.creditsReward || 0), 0),
                xp: dayTasks.length * 25
            };
        });

        return {
            tasksCompleted: filteredTasks.length,
            totalCredits,
            totalXP,
            streak,
            easyTasks,
            mediumTasks,
            hardTasks,
            historyData,
            level: user.gameState?.level || 1,
            totalTasks: tasks.length
        };
    }, [user, selectedDate, viewMode]);

    // Animate numbers on change
    useEffect(() => {
        const targets = {
            tasksCompleted: calculatedStats.tasksCompleted,
            totalCredits: calculatedStats.totalCredits,
            totalXP: calculatedStats.totalXP,
            streak: calculatedStats.streak
        };

        const duration = 1000;
        const steps = 30;
        const stepDuration = duration / steps;

        Object.entries(targets).forEach(([key, target]) => {
            const start = animatedValues[key] || 0;
            const diff = target - start;
            let step = 0;

            const animate = () => {
                step++;
                const progress = step / steps;
                const eased = 1 - Math.pow(1 - progress, 3); // Ease out cubic
                const current = Math.round(start + diff * eased);
                
                setAnimatedValues(prev => ({ ...prev, [key]: current }));
                
                if (step < steps) {
                    setTimeout(animate, stepDuration);
                }
            };
            animate();
        });
    }, [calculatedStats]);

    // Check if a date has activity
    const hasActivity = useCallback((date: Date) => {
        const tasks = user.tasks || [];
        return tasks.some(t => {
            const taskDate = new Date(t.completedAt || t.createdAt || Date.now());
            return taskDate.toDateString() === date.toDateString() && (t.status === 'completed' || t.status === 'approved');
        });
    }, [user.tasks]);

    // Donut Chart Component
    const DonutChart = ({ data, size = 160, showLegend = true }: { 
        data: { value: number; color: string; label: string }[], 
        size?: number,
        showLegend?: boolean 
    }) => {
        const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
        let cumulativePercent = 0;
        const total = data.reduce((acc, curr) => acc + curr.value, 0);
        
        return (
            <div className="flex items-center gap-6">
                <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
                    <svg viewBox="0 0 100 100" className="-rotate-90 w-full h-full">
                        {data.map((slice, i) => {
                            const percent = total > 0 ? slice.value / total : 0;
                            const dashArray = percent * 251.2; // 2 * PI * 40
                            const offset = cumulativePercent * 251.2;
                            cumulativePercent += percent;
                            const isHovered = hoveredIndex === i;
                            return (
                                <circle
                                    key={i}
                                    cx="50" cy="50" r="40"
                                    fill="none"
                                    stroke={slice.color}
                                    strokeWidth={isHovered ? 24 : 20}
                                    strokeDasharray={`${dashArray} 251.2`}
                                    strokeDashoffset={-offset}
                                    className="transition-all duration-300 ease-out cursor-pointer"
                                    style={{ 
                                        filter: isHovered ? 'brightness(1.2)' : 'none',
                                        transformOrigin: 'center'
                                    }}
                                    onMouseEnter={() => setHoveredIndex(i)}
                                    onMouseLeave={() => setHoveredIndex(null)}
                                />
                            );
                        })}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xs font-bold text-gray-400">
                            {hoveredIndex !== null ? data[hoveredIndex].label : 'Total'}
                        </span>
                        <span className="text-xl font-black text-primary">
                            {hoveredIndex !== null ? data[hoveredIndex].value : total}
                        </span>
                    </div>
                </div>
                {showLegend && (
                    <div className="space-y-2 flex-1">
                        {data.map((item, i) => (
                            <div 
                                key={i} 
                                className={`flex items-center justify-between text-xs p-2 rounded-lg transition-all cursor-pointer ${hoveredIndex === i ? 'bg-gray-100' : ''}`}
                                onMouseEnter={() => setHoveredIndex(i)}
                                onMouseLeave={() => setHoveredIndex(null)}
                            >
                                <span className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                                    {item.label}
                                </span>
                                <span className="font-bold">{total > 0 ? Math.round((item.value / total) * 100) : 0}%</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    // Enhanced Line Chart with gradient and points
    const LineChart = ({ 
        data, 
        color = "#4F46E5", 
        height = 80,
        showPoints = true,
        showGradient = true,
        labels = []
    }: { 
        data: number[], 
        color?: string, 
        height?: number,
        showPoints?: boolean,
        showGradient?: boolean,
        labels?: string[]
    }) => {
        const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
        const max = Math.max(...data, 1);
        const min = Math.min(...data, 0);
        const range = max - min || 1;
        
        const points = data.map((val, i) => ({
            x: data.length > 1 ? (i / (data.length - 1)) * 100 : 50,
            y: 100 - ((val - min) / range) * 80 - 10,
            value: val
        }));

        const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
        const gradientPath = `${pathD} L ${points[points.length - 1]?.x || 0} 100 L ${points[0]?.x || 0} 100 Z`;

        return (
            <div className="relative">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full overflow-visible" style={{ height }}>
                    <defs>
                        <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                            <stop offset="100%" stopColor={color} stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    
                    {showGradient && (
                        <path
                            d={gradientPath}
                            fill={`url(#gradient-${color.replace('#', '')})`}
                            className="transition-all duration-500"
                        />
                    )}
                    
                    <path
                        d={pathD}
                        fill="none"
                        stroke={color}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                        className="transition-all duration-500"
                    />
                    
                    {showPoints && points.map((point, i) => (
                        <g key={i}>
                            <circle
                                cx={point.x}
                                cy={point.y}
                                r={hoveredPoint === i ? 6 : 4}
                                fill="white"
                                stroke={color}
                                strokeWidth="2"
                                className="transition-all duration-200 cursor-pointer"
                                onMouseEnter={() => setHoveredPoint(i)}
                                onMouseLeave={() => setHoveredPoint(null)}
                            />
                        </g>
                    ))}
                </svg>
                
                {/* Tooltip */}
                {hoveredPoint !== null && (
                    <div 
                        className="absolute bg-primary text-white text-xs px-2 py-1 rounded-lg shadow-lg pointer-events-none transform -translate-x-1/2 -translate-y-full"
                        style={{ 
                            left: `${points[hoveredPoint].x}%`, 
                            top: `${(points[hoveredPoint].y / 100) * height - 8}px` 
                        }}
                    >
                        {points[hoveredPoint].value}
                        {labels[hoveredPoint] && <span className="text-white/60 ml-1">{labels[hoveredPoint]}</span>}
                    </div>
                )}
                
                {/* X-axis labels */}
                {labels.length > 0 && (
                    <div className="flex justify-between mt-2">
                        {labels.map((label, i) => (
                            <span key={i} className="text-[10px] text-gray-400">{label}</span>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    // Bar Chart Component
    const BarChart = ({ 
        data, 
        height = 120,
        barColor = "#4F46E5"
    }: { 
        data: { label: string; value: number; color?: string }[], 
        height?: number,
        barColor?: string
    }) => {
        const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
        const max = Math.max(...data.map(d => d.value), 1);

        return (
            <div className="flex items-end justify-between gap-2" style={{ height }}>
                {data.map((item, i) => {
                    const barHeight = (item.value / max) * 100;
                    const isHovered = hoveredIndex === i;
                    return (
                        <div 
                            key={i} 
                            className="flex-1 flex flex-col items-center gap-2"
                            onMouseEnter={() => setHoveredIndex(i)}
                            onMouseLeave={() => setHoveredIndex(null)}
                        >
                            <div className="relative w-full flex justify-center">
                                {isHovered && (
                                    <div className="absolute -top-8 bg-primary text-white text-xs px-2 py-1 rounded-lg shadow-lg">
                                        {item.value}
                                    </div>
                                )}
                                <div 
                                    className="w-full max-w-[40px] rounded-t-lg transition-all duration-300 cursor-pointer"
                                    style={{ 
                                        height: `${barHeight}%`,
                                        minHeight: 4,
                                        backgroundColor: item.color || barColor,
                                        opacity: isHovered ? 1 : 0.8,
                                        transform: isHovered ? 'scaleY(1.05)' : 'scaleY(1)',
                                        transformOrigin: 'bottom'
                                    }}
                                />
                            </div>
                            <span className="text-[10px] text-gray-400 font-medium">{item.label}</span>
                        </div>
                    );
                })}
            </div>
        );
    };

    // Progress Ring Component
    const ProgressRing = ({ 
        progress, 
        size = 80, 
        strokeWidth = 8,
        color = "#4F46E5",
        label,
        value
    }: { 
        progress: number, 
        size?: number, 
        strokeWidth?: number,
        color?: string,
        label?: string,
        value?: string | number
    }) => {
        const radius = (size - strokeWidth) / 2;
        const circumference = radius * 2 * Math.PI;
        const offset = circumference - (progress / 100) * circumference;

        return (
            <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
                <svg className="transform -rotate-90" width={size} height={size}>
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke="#E5E7EB"
                        strokeWidth={strokeWidth}
                    />
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke={color}
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    {value !== undefined && <span className="text-lg font-black text-primary">{value}</span>}
                    {label && <span className="text-[10px] text-gray-400">{label}</span>}
                </div>
            </div>
        );
    };

    // Calendar Strip with activity indicators
    const renderCalendarStrip = () => {
        const days = [];
        const range = viewMode === 'monthly' ? 3 : 3;
        
        for (let i = -range; i <= range; i++) {
            const d = new Date(selectedDate);
            if (viewMode === 'monthly') {
                d.setMonth(d.getMonth() + i);
            } else if (viewMode === 'weekly') {
                d.setDate(d.getDate() + i * 7);
            } else {
                d.setDate(d.getDate() + i);
            }
            
            const isSelected = i === 0;
            const hasData = hasActivity(d);
            
            days.push(
                <button 
                    key={i} 
                    onClick={() => setSelectedDate(d.getTime())} 
                    className={`flex flex-col items-center justify-center w-12 h-16 rounded-2xl transition-all ${
                        isSelected 
                            ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-110' 
                            : 'bg-white text-gray-400 border border-gray-100 hover:border-primary/30 hover:bg-primary/5'
                    }`}
                >
                    <span className="text-[10px] font-bold uppercase">
                        {viewMode === 'monthly' 
                            ? d.toLocaleDateString('en-US', { month: 'short' })
                            : d.toLocaleDateString('en-US', { weekday: 'short' })
                        }
                    </span>
                    <span className="text-lg font-black">
                        {viewMode === 'monthly' ? d.getFullYear().toString().slice(-2) : d.getDate()}
                    </span>
                    {hasData && !isSelected && (
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-0.5"></div>
                    )}
                    {isSelected && <div className="w-1 h-1 bg-white rounded-full mt-1"></div>}
                </button>
            );
        }
        return <div className="flex justify-between px-2">{days}</div>;
    };

    // View Mode Toggle
    const renderViewModeToggle = () => (
        <div className="flex bg-gray-100 rounded-full p-1 mb-4">
            {(['daily', 'weekly', 'monthly'] as const).map(mode => (
                <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`flex-1 py-2 px-4 rounded-full text-xs font-bold transition-all ${
                        viewMode === mode 
                            ? 'bg-white text-primary shadow-sm' 
                            : 'text-gray-400 hover:text-gray-600'
                    }`}
                >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
            ))}
        </div>
    );

    // Stats Cards
    const renderStatsCards = () => (
        <div className="grid grid-cols-2 gap-4 mb-6">
            <Card className="p-4 bg-gradient-to-br from-primary to-primary/80 text-white border-none">
                <div className="flex items-center gap-2 mb-2">
                    <Icons.CheckCircle className="w-4 h-4 text-white/60" />
                    <span className="text-[10px] font-bold uppercase text-white/60">Tasks Done</span>
                </div>
                <div className="text-3xl font-black">{animatedValues.tasksCompleted || 0}</div>
                <div className="text-xs text-white/60 mt-1">
                    {viewMode === 'daily' ? 'Today' : viewMode === 'weekly' ? 'This Week' : 'This Month'}
                </div>
            </Card>
            
            <Card className="p-4 bg-gradient-to-br from-amber-500 to-amber-400 text-white border-none">
                <div className="flex items-center gap-2 mb-2">
                    <Icons.Zap className="w-4 h-4 text-white/60" />
                    <span className="text-[10px] font-bold uppercase text-white/60">Credits</span>
                </div>
                <div className="text-3xl font-black">{animatedValues.totalCredits || 0}</div>
                <div className="text-xs text-white/60 mt-1">Earned</div>
            </Card>
            
            <Card className="p-4 bg-gradient-to-br from-green-500 to-green-400 text-white border-none">
                <div className="flex items-center gap-2 mb-2">
                    <Icons.TrendingUp className="w-4 h-4 text-white/60" />
                    <span className="text-[10px] font-bold uppercase text-white/60">XP Gained</span>
                </div>
                <div className="text-3xl font-black">{animatedValues.totalXP || 0}</div>
                <div className="text-xs text-white/60 mt-1">Level {calculatedStats.level}</div>
            </Card>
            
            <Card className="p-4 bg-gradient-to-br from-red-500 to-orange-400 text-white border-none">
                <div className="flex items-center gap-2 mb-2">
                    <Icons.Flame className="w-4 h-4 text-white/60" />
                    <span className="text-[10px] font-bold uppercase text-white/60">Streak</span>
                </div>
                <div className="text-3xl font-black">{animatedValues.streak || 0}</div>
                <div className="text-xs text-white/60 mt-1">Days</div>
            </Card>
        </div>
    );

    // Activity Chart Section
    const renderActivityChart = () => {
        const chartLabels = calculatedStats.historyData.map(d => {
            if (viewMode === 'daily') {
                return d.date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2);
            } else if (viewMode === 'weekly') {
                return `W${Math.ceil(d.date.getDate() / 7)}`;
            } else {
                return d.date.toLocaleDateString('en-US', { month: 'short' }).slice(0, 3);
            }
        });

        return (
            <Card className="p-5 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-primary flex items-center gap-2">
                        <Icons.Activity className="w-5 h-5" />
                        Activity Trend
                    </h3>
                    <span className="text-xs text-gray-400">Last 7 {viewMode === 'daily' ? 'days' : viewMode === 'weekly' ? 'weeks' : 'months'}</span>
                </div>
                <LineChart 
                    data={calculatedStats.historyData.map(d => d.tasks)}
                    color="#4F46E5"
                    height={100}
                    showPoints={true}
                    showGradient={true}
                    labels={chartLabels}
                />
            </Card>
        );
    };

    // Task Breakdown Section
    const renderTaskBreakdown = () => (
        <Card className="p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-primary flex items-center gap-2">
                    <Icons.PieChart className="w-5 h-5" />
                    Task Breakdown
                </h3>
            </div>
            <DonutChart 
                data={[
                    { value: calculatedStats.easyTasks, color: '#10B981', label: 'Easy' },
                    { value: calculatedStats.mediumTasks, color: '#F59E0B', label: 'Medium' },
                    { value: calculatedStats.hardTasks, color: '#EF4444', label: 'Hard' }
                ]}
                size={140}
            />
        </Card>
    );

    // Credits/XP Comparison Bar Chart
    const renderComparisonChart = () => (
        <Card className="p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-primary flex items-center gap-2">
                    <Icons.BarChart2 className="w-5 h-5" />
                    Performance
                </h3>
            </div>
            <BarChart 
                data={calculatedStats.historyData.map((d, i) => ({
                    label: viewMode === 'daily' 
                        ? d.date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2)
                        : viewMode === 'weekly'
                        ? `W${i + 1}`
                        : d.date.toLocaleDateString('en-US', { month: 'short' }).slice(0, 3),
                    value: d.credits,
                    color: i === calculatedStats.historyData.length - 1 ? '#4F46E5' : '#CBD5E1'
                }))}
                height={100}
            />
        </Card>
    );

    // Goal Progress Section
    const renderGoalProgress = () => {
        if (!user.goal) return null;
        
        const daysElapsed = user.goal.createdAt 
            ? Math.floor((Date.now() - new Date(user.goal.createdAt).getTime()) / (1000 * 60 * 60 * 24))
            : 0;
        const totalDays = user.goal.durationDays || 30;
        const progress = Math.min((daysElapsed / totalDays) * 100, 100);

        return (
            <Card className="p-5 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-primary flex items-center gap-2">
                        <Icons.Target className="w-5 h-5" />
                        Goal Progress
                    </h3>
                    <span className="text-xs text-gray-400">{daysElapsed}/{totalDays} days</span>
                </div>
                <div className="flex items-center gap-6">
                    <ProgressRing 
                        progress={progress} 
                        size={100} 
                        strokeWidth={10}
                        color="#4F46E5"
                        value={`${Math.round(progress)}%`}
                        label="Complete"
                    />
                    <div className="flex-1">
                        <h4 className="font-bold text-primary mb-1">{user.goal.title}</h4>
                        <p className="text-xs text-gray-400 mb-3">{user.goal.category}</p>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                            <div 
                                className="bg-primary h-2 rounded-full transition-all duration-1000"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                </div>
            </Card>
        );
    };

    // Connected Apps Section
    const renderConnectedApps = () => {
        const relevantApps = (user.connectedApps || []).filter(app => app.isConnected);
        
        if (relevantApps.length === 0) return (
            <Card className="p-6 text-center border border-dashed border-gray-200">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Icons.Link className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-gray-400 text-sm mb-4">No apps connected yet</p>
                <Button onClick={() => setView(AppView.SETTINGS)} variant="outline" className="text-xs">
                    Connect Apps
                </Button>
            </Card>
        );

        return (
            <div className="space-y-4">
                {relevantApps.map(app => (
                    <Card 
                        key={app.id} 
                        className={`p-5 cursor-pointer transition-all ${expandedCard === app.id ? 'ring-2 ring-primary' : ''}`}
                        onClick={() => setExpandedCard(expandedCard === app.id ? null : app.id)}
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-primary/10 rounded-xl">
                                <Icons.Activity className="w-5 h-5 text-primary"/>
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-primary">{app.name}</h4>
                                <span className="text-[10px] text-green-500 uppercase font-bold tracking-wider flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                                    Connected
                                </span>
                            </div>
                            <Icons.ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${expandedCard === app.id ? 'rotate-180' : ''}`} />
                        </div>
                        
                        {expandedCard === app.id && (
                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 animate-fade-in">
                                {app.metrics.map(metric => (
                                    <div key={metric.id} className="bg-gray-50 rounded-xl p-3">
                                        <div className="text-xs text-gray-400 mb-1">{metric.name}</div>
                                        <div className="flex items-end gap-2 mb-2">
                                            <span className="text-xl font-black text-primary">{metric.value}</span>
                                            <span className="text-xs text-gray-400 mb-1">{metric.unit}</span>
                                        </div>
                                        <LineChart 
                                            data={metric.history || [0, 0, 0, 0, 0]} 
                                            color={metric.status === 'good' ? '#10B981' : '#EF4444'} 
                                            height={40}
                                            showPoints={false}
                                            showGradient={true}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                ))}
            </div>
        );
    };

    // Deep Insights Section
    const renderInsights = () => (
        <Card className="bg-primary text-white p-6 shadow-2xl shadow-primary/20 border-none mb-6">
            <h3 className="text-white/60 text-xs font-bold uppercase tracking-wider mb-1">AI Insight</h3>
            {isLoading ? (
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span className="text-white/60">Analyzing your data...</span>
                </div>
            ) : (
                <>
                    <p className="text-lg font-medium leading-relaxed mb-4">
                        "{insights?.trend || "Keep up the great work! Your consistency is building momentum."}"
                    </p>
                    <div className="flex gap-3">
                        <div className="bg-white/10 rounded-xl p-3 flex-1">
                            <div className="text-[10px] text-white/60 uppercase mb-1">Prediction</div>
                            <div className="font-bold text-sm">{insights?.prediction || "On track for success"}</div>
                        </div>
                        <div className="bg-white/10 rounded-xl p-3 flex-1">
                            <div className="text-[10px] text-white/60 uppercase mb-1">Focus Area</div>
                            <div className="font-bold text-sm">{insights?.focusArea || "Consistency"}</div>
                        </div>
                    </div>
                </>
            )}
        </Card>
    );

    // Future Milestones Section
    const renderMilestones = () => {
        const milestones = [
            {
                date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                title: 'Weekly Review',
                description: 'Evaluate your progress and adjust goals',
                icon: Icons.Calendar
            },
            {
                date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
                title: 'Streak Milestone',
                description: `${(user.gameState?.streak || 0) + 14} day streak achievement`,
                icon: Icons.Flame
            },
            {
                date: user.goal?.createdAt 
                    ? new Date(new Date(user.goal.createdAt).getTime() + (user.goal.durationDays || 30) * 24 * 60 * 60 * 1000)
                    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                title: 'Goal Completion',
                description: 'Target date for your current goal',
                icon: Icons.Target
            }
        ];

        return (
            <div className="space-y-3">
                {milestones.map((milestone, i) => {
                    const Icon = milestone.icon;
                    const daysUntil = Math.ceil((milestone.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    
                    return (
                        <div 
                            key={i} 
                            className={`flex gap-4 items-start p-4 bg-gray-50 rounded-2xl border border-gray-100 transition-all hover:border-primary/30 ${daysUntil < 0 ? 'opacity-50' : ''}`}
                        >
                            <div className="w-12 text-center">
                                <span className="block text-xs font-bold text-gray-400">
                                    {milestone.date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                                </span>
                                <span className="block text-xl font-black text-primary">
                                    {milestone.date.getDate()}
                                </span>
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-primary flex items-center gap-2">
                                    <Icon className="w-4 h-4" />
                                    {milestone.title}
                                </h4>
                                <p className="text-xs text-gray-400">{milestone.description}</p>
                            </div>
                            <div className="text-right">
                                <span className={`text-xs font-bold ${daysUntil <= 3 ? 'text-amber-500' : 'text-gray-400'}`}>
                                    {daysUntil > 0 ? `${daysUntil}d` : 'Past'}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="h-full overflow-y-auto pb-safe scroll-smooth">
            <div className="min-h-full bg-white pb-28 flex flex-col animate-fade-in">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 bg-white sticky top-0 z-20">
                    <div className="flex justify-between items-center mb-4 mt-2">
                        <h1 className="text-2xl font-bold text-primary">Analytics</h1>
                        <button 
                            onClick={() => setView(AppView.DASHBOARD)} 
                            className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors"
                        >
                            <Icons.X className="w-5 h-5 text-gray-400"/>
                        </button>
                    </div>
                    {renderViewModeToggle()}
                    {renderCalendarStrip()}
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Stats Cards */}
                    {renderStatsCards()}
                    
                    {/* AI Insights */}
                    {renderInsights()}
                    
                    {/* Goal Progress */}
                    {renderGoalProgress()}
                    
                    {/* Activity Trend */}
                    {renderActivityChart()}
                    
                    {/* Task Breakdown */}
                    {renderTaskBreakdown()}
                    
                    {/* Performance Bar Chart */}
                    {renderComparisonChart()}

                    {/* Budget Allocation (Money Goals Only) */}
                    {user.goal?.category === 'Money & Career' && budgetData && (
                        <div>
                            <h3 className="font-bold text-primary mb-4 flex items-center gap-2">
                                <Icons.PieChart className="w-5 h-5"/> 
                                Portfolio Allocation
                            </h3>
                            <Card className="p-6">
                                <DonutChart 
                                    data={[
                                        { value: budgetData.lowRisk?.amount || 0, color: '#10B981', label: 'Low Risk' },
                                        { value: budgetData.mediumRisk?.amount || 0, color: '#F59E0B', label: 'Medium' },
                                        { value: budgetData.highYield?.amount || 0, color: '#EF4444', label: 'High Yield' }
                                    ]} 
                                />
                            </Card>
                        </div>
                    )}

                    {/* Connected Apps */}
                    <div>
                        <h3 className="font-bold text-primary mb-4 flex items-center gap-2">
                            <Icons.Cpu className="w-5 h-5"/> 
                            Connected Integrations
                        </h3>
                        {renderConnectedApps()}
                    </div>

                    {/* Future Milestones */}
                    <div>
                        <h3 className="font-bold text-primary mb-4 flex items-center gap-2">
                            <Icons.Clock className="w-5 h-5"/> 
                            Upcoming Milestones
                        </h3>
                        {renderMilestones()}
                    </div>
                </div>
            </div>
        </div>
    );
}
