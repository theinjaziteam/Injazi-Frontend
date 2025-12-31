// views/StatsView.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../contexts/AppContext';
import { AppView } from '../types';
import { Icons, Card, Button } from '../components/UIComponents';
import { calculateBudgetSplit, generateDeepInsights } from '../services/geminiService';

interface CalendarEvent {
    id: string;
    date: string;
    title: string;
    description?: string;
    type: 'milestone' | 'goal' | 'task' | 'custom';
    color: string;
}

interface Alert {
    id: string;
    type: 'warning' | 'danger' | 'info';
    title: string;
    message: string;
    icon: any;
    action?: string;
    actionLabel?: string;
}

export default function StatsView() {
    const { user, setView } = useApp();
    const [selectedDate, setSelectedDate] = useState(Date.now());
    const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');
    const [budgetData, setBudgetData] = useState<any>(null);
    const [insights, setInsights] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedCard, setExpandedCard] = useState<string | null>(null);
    const [animatedValues, setAnimatedValues] = useState<Record<string, number>>({});
    const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
    
    // Calendar states
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
    const [showEventModal, setShowEventModal] = useState(false);
    const [selectedEventDate, setSelectedEventDate] = useState<Date | null>(null);
    const [newEvent, setNewEvent] = useState({ title: '', description: '' });
    const [showDayEvents, setShowDayEvents] = useState(false);

    // Load dismissed alerts from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('dismissedAlerts');
        if (saved) {
            try {
                setDismissedAlerts(JSON.parse(saved));
            } catch (e) {
                console.error('Error parsing dismissed alerts:', e);
            }
        }
    }, []);

    // Load events from localStorage
    useEffect(() => {
        const savedEvents = localStorage.getItem('statsCalendarEvents');
        if (savedEvents) {
            try {
                setCalendarEvents(JSON.parse(savedEvents));
            } catch (e) {
                console.error('Error parsing saved events:', e);
            }
        }
    }, []);

    // Save events to localStorage
    useEffect(() => {
        const customEvents = calendarEvents.filter(e => e.type === 'custom');
        localStorage.setItem('statsCalendarEvents', JSON.stringify(customEvents));
    }, [calendarEvents]);

    // Generate automatic milestones
    const allEvents = useMemo(() => {
        const autoMilestones: CalendarEvent[] = [];
        
        if (user.goal?.createdAt) {
            const goalEnd = new Date(new Date(user.goal.createdAt).getTime() + (user.goal.durationDays || 30) * 24 * 60 * 60 * 1000);
            autoMilestones.push({
                id: 'goal-completion',
                date: goalEnd.toISOString(),
                title: 'Goal Target Date',
                description: user.goal.title,
                type: 'goal',
                color: '#4F46E5'
            });
        }
        
        for (let i = 1; i <= 4; i++) {
            const reviewDate = new Date();
            reviewDate.setDate(reviewDate.getDate() + (7 * i) - reviewDate.getDay());
            autoMilestones.push({
                id: `weekly-review-${i}`,
                date: reviewDate.toISOString(),
                title: `Week ${i} Review`,
                description: 'Evaluate progress and adjust goals',
                type: 'milestone',
                color: '#10B981'
            });
        }
        
        const currentStreak = user.gameState?.streak || 0;
        const nextStreakMilestone = Math.ceil((currentStreak + 1) / 7) * 7;
        const daysUntilMilestone = nextStreakMilestone - currentStreak;
        const streakDate = new Date();
        streakDate.setDate(streakDate.getDate() + daysUntilMilestone);
        autoMilestones.push({
            id: 'streak-milestone',
            date: streakDate.toISOString(),
            title: `${nextStreakMilestone} Day Streak`,
            description: `${daysUntilMilestone} days to go!`,
            type: 'milestone',
            color: '#F59E0B'
        });
        
        return [...calendarEvents, ...autoMilestones];
    }, [calendarEvents, user.goal, user.gameState?.streak]);

    // Generate AI Alerts based on user data
    const alerts = useMemo(() => {
        const generatedAlerts: Alert[] = [];
        const tasks = user.tasks || [];
        const completedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'approved');
        const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
        const streak = user.gameState?.streak || 0;
        
        // Check for streak break risk
        if (streak > 0 && streak < 3) {
            generatedAlerts.push({
                id: 'streak-risk',
                type: 'warning',
                title: 'Streak at Risk',
                message: `You have a ${streak}-day streak. Complete a task today to keep it going!`,
                icon: Icons.Flame,
                actionLabel: 'View Tasks'
            });
        }
        
        // Check for no activity in last 3 days
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        const recentActivity = completedTasks.some(t => {
            const taskDate = new Date(t.completedAt || t.createdAt || 0);
            return taskDate >= threeDaysAgo;
        });
        
        if (!recentActivity && tasks.length > 0) {
            generatedAlerts.push({
                id: 'no-activity',
                type: 'danger',
                title: 'No Recent Activity',
                message: "You haven't completed any tasks in the last 3 days. Getting back on track is important!",
                icon: Icons.AlertTriangle,
                actionLabel: 'Start Now'
            });
        }
        
        // Check for overdue tasks
        const overdueTasks = pendingTasks.filter(t => {
            if (!t.dueDate) return false;
            return new Date(t.dueDate) < new Date();
        });
        
        if (overdueTasks.length > 0) {
            generatedAlerts.push({
                id: 'overdue-tasks',
                type: 'danger',
                title: `${overdueTasks.length} Overdue Task${overdueTasks.length > 1 ? 's' : ''}`,
                message: `You have tasks past their due date. Consider rescheduling or completing them soon.`,
                icon: Icons.Clock,
                actionLabel: 'View Overdue'
            });
        }
        
        // Check goal progress
        if (user.goal?.createdAt) {
            const daysElapsed = Math.floor((Date.now() - new Date(user.goal.createdAt).getTime()) / (1000 * 60 * 60 * 24));
            const totalDays = user.goal.durationDays || 30;
            const expectedProgress = (daysElapsed / totalDays) * 100;
            const actualTasksCompleted = completedTasks.length;
            const expectedTasks = Math.floor((daysElapsed / totalDays) * (tasks.length || 10));
            
            if (actualTasksCompleted < expectedTasks * 0.5 && daysElapsed > 3) {
                generatedAlerts.push({
                    id: 'goal-behind',
                    type: 'warning',
                    title: 'Falling Behind on Goal',
                    message: `You're ${Math.round(expectedProgress)}% through your goal timeline but only ${Math.round((actualTasksCompleted / Math.max(expectedTasks, 1)) * 100)}% of expected tasks are done.`,
                    icon: Icons.TrendingDown,
                    actionLabel: 'Adjust Goal'
                });
            }
        }
        
        // Low credits warning (mock scenario)
        const totalCredits = user.gameState?.credits || 0;
        if (totalCredits < 50 && totalCredits > 0) {
            generatedAlerts.push({
                id: 'low-credits',
                type: 'info',
                title: 'Low on Credits',
                message: `You only have ${totalCredits} credits remaining. Complete more tasks to earn credits!`,
                icon: Icons.Zap,
                actionLabel: 'Earn More'
            });
        }
        
        // Money goal specific alerts
        if (user.goal?.category === 'Money & Career') {
            // Mock: Investment performance warning
            generatedAlerts.push({
                id: 'investment-alert',
                type: 'warning',
                title: 'Market Volatility Detected',
                message: 'Your high-risk investments may be affected. Consider reviewing your portfolio allocation.',
                icon: Icons.TrendingDown,
                actionLabel: 'Review Portfolio'
            });
        }
        
        // Positive reinforcement (not always warnings!)
        if (streak >= 7) {
            generatedAlerts.push({
                id: 'streak-celebration',
                type: 'info',
                title: `${streak} Day Streak! 🔥`,
                message: "Amazing consistency! You're building great habits. Keep it up!",
                icon: Icons.Trophy
            });
        }
        
        // Filter out dismissed alerts
        return generatedAlerts.filter(alert => !dismissedAlerts.includes(alert.id));
    }, [user, dismissedAlerts]);

    // Dismiss an alert
    const dismissAlert = (alertId: string) => {
        const updated = [...dismissedAlerts, alertId];
        setDismissedAlerts(updated);
        localStorage.setItem('dismissedAlerts', JSON.stringify(updated));
    };

    // Mock AI Insights data
    const mockInsights = {
        trend: "Based on your activity patterns, you're most productive on Tuesday and Wednesday mornings. Consider scheduling important tasks during these times.",
        prediction: "87% likely to hit your goal if you maintain current pace",
        focusArea: "Task completion consistency",
        weeklyScore: 78,
        improvement: "+12% from last week",
        topStrength: "Morning productivity",
        areaToImprove: "Weekend engagement"
    };

    // Fetch AI data
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            if (user.goal) {
                try {
                    const [budget, insightData] = await Promise.all([
                        calculateBudgetSplit(1000, user.goal, user.userProfile),
                        generateDeepInsights(user)
                    ]);
                    setBudgetData(budget);
                    setInsights(insightData || mockInsights);
                } catch (error) {
                    console.error('Error fetching data:', error);
                    setInsights(mockInsights);
                }
            } else {
                setInsights(mockInsights);
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
        const streak = user.gameState?.streak || 0;
        
        const easyTasks = filteredTasks.filter(t => t.difficulty === 'Easy').length;
        const mediumTasks = filteredTasks.filter(t => t.difficulty === 'Medium').length;
        const hardTasks = filteredTasks.filter(t => t.difficulty === 'Hard').length;

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
                credits: dayTasks.reduce((sum, t) => sum + (t.creditsReward || 0), 0)
            };
        });

        return {
            tasksCompleted: filteredTasks.length,
            totalCredits,
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
                const eased = 1 - Math.pow(1 - progress, 3);
                const current = Math.round(start + diff * eased);
                
                setAnimatedValues(prev => ({ ...prev, [key]: current }));
                
                if (step < steps) {
                    setTimeout(animate, stepDuration);
                }
            };
            animate();
        });
    }, [calculatedStats.tasksCompleted, calculatedStats.totalCredits, calculatedStats.streak]);

    // Check if a date has activity
    const hasActivity = useCallback((date: Date) => {
        const tasks = user.tasks || [];
        return tasks.some(t => {
            const taskDate = new Date(t.completedAt || t.createdAt || Date.now());
            return taskDate.toDateString() === date.toDateString() && (t.status === 'completed' || t.status === 'approved');
        });
    }, [user.tasks]);

    // Get events for a specific date
    const getEventsForDate = useCallback((date: Date) => {
        return allEvents.filter(e => new Date(e.date).toDateString() === date.toDateString());
    }, [allEvents]);

    // Add new event
    const handleAddEvent = () => {
        if (!newEvent.title.trim() || !selectedEventDate) return;
        
        const event: CalendarEvent = {
            id: `custom-${Date.now()}`,
            date: selectedEventDate.toISOString(),
            title: newEvent.title,
            description: newEvent.description,
            type: 'custom',
            color: '#8B5CF6'
        };
        
        setCalendarEvents(prev => [...prev, event]);
        setNewEvent({ title: '', description: '' });
        setShowEventModal(false);
    };

    // Delete event
    const handleDeleteEvent = (eventId: string) => {
        setCalendarEvents(prev => prev.filter(e => e.id !== eventId));
    };

    // Donut Chart Component
    const DonutChart = ({ data, size = 160, showLegend = true }: { 
        data: { value: number; color: string; label: string }[], 
        size?: number,
        showLegend?: boolean 
    }) => {
        const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
        let cumulativePercent = 0;
        const total = data.reduce((acc, curr) => acc + curr.value, 0);
        
        if (total === 0) {
            return (
                <div className="flex items-center justify-center p-8 text-gray-400 text-sm">
                    No task data available
                </div>
            );
        }
        
        return (
            <div className="flex items-center gap-6">
                <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
                    <svg viewBox="0 0 100 100" className="-rotate-90 w-full h-full">
                        {data.map((slice, i) => {
                            const percent = total > 0 ? slice.value / total : 0;
                            const dashArray = percent * 251.2;
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

    // Fixed Line Chart Component
    const LineChart = ({ 
        data, 
        color = "#4F46E5", 
        height = 100,
        labels = []
    }: { 
        data: number[], 
        color?: string, 
        height?: number,
        labels?: string[]
    }) => {
        const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
        
        if (!data || data.length === 0) {
            return (
                <div className="flex items-center justify-center text-gray-400 text-sm" style={{ height }}>
                    No data available
                </div>
            );
        }
        
        const max = Math.max(...data, 1);
        const min = 0;
        const range = max - min || 1;
        
        const width = 300;
        const chartHeight = 80;
        const paddingX = 20;
        const paddingY = 10;
        
        const points = data.map((val, i) => ({
            x: paddingX + (data.length > 1 ? (i / (data.length - 1)) * (width - paddingX * 2) : (width - paddingX * 2) / 2),
            y: paddingY + (chartHeight - paddingY * 2) - ((val - min) / range) * (chartHeight - paddingY * 2),
            value: val
        }));

        const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
        const areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z`;

        return (
            <div className="relative w-full">
                <svg 
                    viewBox={`0 0 ${width} ${chartHeight}`} 
                    className="w-full"
                    style={{ height }}
                    preserveAspectRatio="none"
                >
                    <defs>
                        <linearGradient id={`lineGradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                            <stop offset="100%" stopColor={color} stopOpacity="0.05" />
                        </linearGradient>
                    </defs>
                    
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
                        <line
                            key={i}
                            x1={paddingX}
                            y1={paddingY + (chartHeight - paddingY * 2) * ratio}
                            x2={width - paddingX}
                            y2={paddingY + (chartHeight - paddingY * 2) * ratio}
                            stroke="#E5E7EB"
                            strokeWidth="1"
                            strokeDasharray="4 4"
                        />
                    ))}
                    
                    <path
                        d={areaPath}
                        fill={`url(#lineGradient-${color.replace('#', '')})`}
                    />
                    
                    <path
                        d={linePath}
                        fill="none"
                        stroke={color}
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    
                    {points.map((point, i) => (
                        <g key={i}>
                            <circle
                                cx={point.x}
                                cy={point.y}
                                r={hoveredPoint === i ? 8 : 5}
                                fill="white"
                                stroke={color}
                                strokeWidth="3"
                                className="transition-all duration-200 cursor-pointer"
                                onMouseEnter={() => setHoveredPoint(i)}
                                onMouseLeave={() => setHoveredPoint(null)}
                            />
                            {hoveredPoint === i && (
                                <g>
                                    <rect
                                        x={point.x - 20}
                                        y={point.y - 30}
                                        width="40"
                                        height="20"
                                        rx="4"
                                        fill={color}
                                    />
                                    <text
                                        x={point.x}
                                        y={point.y - 16}
                                        textAnchor="middle"
                                        fill="white"
                                        fontSize="11"
                                        fontWeight="bold"
                                    >
                                        {point.value}
                                    </text>
                                </g>
                            )}
                        </g>
                    ))}
                </svg>
                
                {labels.length > 0 && (
                    <div className="flex justify-between px-5 mt-1">
                        {labels.map((label, i) => (
                            <span key={i} className="text-[10px] text-gray-400 font-medium">{label}</span>
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
                                    <div className="absolute -top-8 bg-primary text-white text-xs px-2 py-1 rounded-lg shadow-lg z-10">
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

    // Calendar Strip (Quick Navigation)
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
            const events = getEventsForDate(d);
            
            days.push(
                <button 
                    key={i} 
                    onClick={() => {
                        setSelectedDate(d.getTime());
                        setCurrentMonth(d);
                    }} 
                    className={`flex flex-col items-center justify-center w-12 h-16 rounded-2xl transition-all ${
                        isSelected 
                            ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-110' 
                            : 'bg-white text-gray-600 border border-gray-200 hover:border-primary/30 hover:bg-primary/5'
                    }`}
                >
                    <span className={`text-[10px] font-bold uppercase ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>
                        {viewMode === 'monthly' 
                            ? d.toLocaleDateString('en-US', { month: 'short' })
                            : d.toLocaleDateString('en-US', { weekday: 'short' })
                        }
                    </span>
                    <span className="text-lg font-black">
                        {viewMode === 'monthly' ? d.getFullYear().toString().slice(-2) : d.getDate()}
                    </span>
                    <div className="flex gap-0.5 mt-0.5">
                        {hasData && <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-green-500'}`}></div>}
                        {events.length > 0 && <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/60' : 'bg-purple-500'}`}></div>}
                    </div>
                </button>
            );
        }
        return <div className="flex justify-between px-2">{days}</div>;
    };

    // Full Calendar Component - FIXED VISIBILITY
    const renderFullCalendar = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startingDay = firstDay.getDay();
        const totalDays = lastDay.getDate();
        
        // Get previous month's last days for filling
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        
        const days = [];
        const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        // Previous month's trailing days
        for (let i = startingDay - 1; i >= 0; i--) {
            const dayNum = prevMonthLastDay - i;
            days.push(
                <div key={`prev-${i}`} className="h-11 flex flex-col items-center justify-center text-gray-300">
                    <span className="text-sm">{dayNum}</span>
                </div>
            );
        }
        
        // Current month's days
        for (let day = 1; day <= totalDays; day++) {
            const date = new Date(year, month, day);
            const isToday = date.toDateString() === new Date().toDateString();
            const isSelected = date.toDateString() === new Date(selectedDate).toDateString();
            const dayHasActivity = hasActivity(date);
            const dayEvents = getEventsForDate(date);
            
            days.push(
                <button
                    key={day}
                    onClick={() => {
                        setSelectedDate(date.getTime());
                        setSelectedEventDate(date);
                        if (dayEvents.length > 0) {
                            setShowDayEvents(true);
                        }
                    }}
                    className={`h-11 rounded-xl flex flex-col items-center justify-center relative transition-all ${
                        isSelected
                            ? 'bg-primary text-white shadow-md'
                            : isToday
                            ? 'bg-primary/10 text-primary font-bold border-2 border-primary/30'
                            : 'text-gray-700 hover:bg-gray-100'
                    }`}
                >
                    <span className={`text-sm font-semibold ${isSelected ? 'text-white' : ''}`}>{day}</span>
                    {(dayHasActivity || dayEvents.length > 0) && (
                        <div className="flex gap-0.5 absolute bottom-1">
                            {dayHasActivity && (
                                <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-green-500'}`}></div>
                            )}
                            {dayEvents.slice(0, 2).map((e, i) => (
                                <div 
                                    key={i} 
                                    className="w-1.5 h-1.5 rounded-full" 
                                    style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.8)' : e.color }}
                                ></div>
                            ))}
                            {dayEvents.length > 2 && (
                                <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/60' : 'bg-gray-400'}`}></div>
                            )}
                        </div>
                    )}
                </button>
            );
        }
        
        // Next month's leading days
        const remainingDays = 42 - days.length; // 6 rows * 7 days = 42
        for (let i = 1; i <= remainingDays; i++) {
            days.push(
                <div key={`next-${i}`} className="h-11 flex flex-col items-center justify-center text-gray-300">
                    <span className="text-sm">{i}</span>
                </div>
            );
        }
        
        return (
            <Card className="p-4 mb-6 bg-white border border-gray-200">
                {/* Calendar Header */}
                <div className="flex items-center justify-between mb-4">
                    <button 
                        onClick={() => {
                            const newMonth = new Date(currentMonth);
                            newMonth.setMonth(newMonth.getMonth() - 1);
                            setCurrentMonth(newMonth);
                        }}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <Icons.ChevronLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <h3 className="font-bold text-gray-800 text-lg">
                        {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </h3>
                    <button 
                        onClick={() => {
                            const newMonth = new Date(currentMonth);
                            newMonth.setMonth(newMonth.getMonth() + 1);
                            setCurrentMonth(newMonth);
                        }}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <Icons.ChevronRight className="w-5 h-5 text-gray-600" />
                    </button>
                </div>
                
                {/* Week Days Header */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                    {weekDays.map(day => (
                        <div key={day} className="text-center text-xs font-bold text-gray-500 uppercase py-2">
                            {day}
                        </div>
                    ))}
                </div>
                
                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1 border-t border-gray-100 pt-2">
                    {days}
                </div>
                
                {/* Add Event Button */}
                <button
                    onClick={() => {
                        setSelectedEventDate(new Date(selectedDate));
                        setShowEventModal(true);
                    }}
                    className="w-full mt-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 text-sm font-medium hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
                >
                    <Icons.Plus className="w-4 h-4" />
                    Add Event
                </button>
                
                {/* Legend */}
                <div className="flex flex-wrap items-center justify-center gap-4 mt-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
                        Activity
                    </span>
                    <span className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 bg-purple-500 rounded-full"></div>
                        Custom
                    </span>
                    <span className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 bg-primary rounded-full"></div>
                        Goal
                    </span>
                    <span className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 bg-amber-500 rounded-full"></div>
                        Milestone
                    </span>
                </div>
            </Card>
        );
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
        <div className="grid grid-cols-3 gap-3 mb-6">
            <Card className="p-4 bg-gradient-to-br from-primary to-primary/80 text-white border-none">
                <div className="flex items-center gap-1 mb-1">
                    <Icons.Check className="w-3 h-3 text-white/60" />
                    <span className="text-[9px] font-bold uppercase text-white/60">Tasks</span>
                </div>
                <div className="text-2xl font-black">{animatedValues.tasksCompleted || 0}</div>
                <div className="text-[10px] text-white/60 mt-0.5">
                    {viewMode === 'daily' ? 'Today' : viewMode === 'weekly' ? 'This Week' : 'This Month'}
                </div>
            </Card>
            
            <Card className="p-4 bg-gradient-to-br from-amber-500 to-amber-400 text-white border-none">
                <div className="flex items-center gap-1 mb-1">
                    <Icons.Zap className="w-3 h-3 text-white/60" />
                    <span className="text-[9px] font-bold uppercase text-white/60">Credits</span>
                </div>
                <div className="text-2xl font-black">{animatedValues.totalCredits || 0}</div>
                <div className="text-[10px] text-white/60 mt-0.5">Earned</div>
            </Card>
            
            <Card className="p-4 bg-gradient-to-br from-red-500 to-orange-400 text-white border-none">
                <div className="flex items-center gap-1 mb-1">
                    <Icons.Flame className="w-3 h-3 text-white/60" />
                    <span className="text-[9px] font-bold uppercase text-white/60">Streak</span>
                </div>
                <div className="text-2xl font-black">{animatedValues.streak || 0}</div>
                <div className="text-[10px] text-white/60 mt-0.5">Days</div>
            </Card>
        </div>
    );

    // AI Alerts Section - NEW
    const renderAlerts = () => {
        if (alerts.length === 0) return null;
        
        const getAlertStyles = (type: string) => {
            switch (type) {
                case 'danger':
                    return {
                        bg: 'bg-red-50',
                        border: 'border-red-200',
                        icon: 'bg-red-100 text-red-600',
                        title: 'text-red-800',
                        message: 'text-red-600',
                        button: 'bg-red-600 hover:bg-red-700 text-white'
                    };
                case 'warning':
                    return {
                        bg: 'bg-amber-50',
                        border: 'border-amber-200',
                        icon: 'bg-amber-100 text-amber-600',
                        title: 'text-amber-800',
                        message: 'text-amber-600',
                        button: 'bg-amber-600 hover:bg-amber-700 text-white'
                    };
                case 'info':
                default:
                    return {
                        bg: 'bg-blue-50',
                        border: 'border-blue-200',
                        icon: 'bg-blue-100 text-blue-600',
                        title: 'text-blue-800',
                        message: 'text-blue-600',
                        button: 'bg-blue-600 hover:bg-blue-700 text-white'
                    };
            }
        };
        
        return (
            <div className="space-y-3 mb-6">
                <h3 className="font-bold text-primary flex items-center gap-2">
                    <Icons.Bell className="w-5 h-5" />
                    AI Alerts
                    <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {alerts.length}
                    </span>
                </h3>
                
                {alerts.map(alert => {
                    const styles = getAlertStyles(alert.type);
                    const IconComponent = alert.icon;
                    
                    return (
                        <div 
                            key={alert.id}
                            className={`${styles.bg} ${styles.border} border rounded-2xl p-4 relative overflow-hidden`}
                        >
                            {/* Dismiss button */}
                            <button 
                                onClick={() => dismissAlert(alert.id)}
                                className="absolute top-2 right-2 p-1 hover:bg-black/5 rounded-full transition-colors"
                            >
                                <Icons.X className="w-4 h-4 text-gray-400" />
                            </button>
                            
                            <div className="flex gap-3">
                                <div className={`${styles.icon} p-2.5 rounded-xl flex-shrink-0`}>
                                    <IconComponent className="w-5 h-5" />
                                </div>
                                <div className="flex-1 pr-6">
                                    <h4 className={`${styles.title} font-bold text-sm mb-1`}>{alert.title}</h4>
                                    <p className={`${styles.message} text-xs leading-relaxed`}>{alert.message}</p>
                                    
                                    {alert.actionLabel && (
                                        <button 
                                            className={`${styles.button} mt-3 px-4 py-2 rounded-lg text-xs font-bold transition-colors`}
                                            onClick={() => {
                                                dismissAlert(alert.id);
                                                if (alert.id.includes('task') || alert.id.includes('activity')) {
                                                    setView(AppView.DASHBOARD);
                                                }
                                            }}
                                        >
                                            {alert.actionLabel}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    // AI Insights Section - WITH MOCK DATA
    const renderInsights = () => {
        const displayInsights = insights || mockInsights;
        
        return (
            <Card className="bg-gradient-to-br from-primary via-primary to-indigo-700 text-white p-6 shadow-2xl shadow-primary/20 border-none mb-6 relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
                
                <div className="relative">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-white/60 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                            <Icons.Sparkles className="w-4 h-4" />
                            AI Insight
                        </h3>
                        {displayInsights.weeklyScore && (
                            <div className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold">
                                Score: {displayInsights.weeklyScore}/100
                            </div>
                        )}
                    </div>
                    
                    {isLoading ? (
                        <div className="flex items-center gap-2 py-4">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span className="text-white/60">Analyzing your data...</span>
                        </div>
                    ) : (
                        <>
                            <p className="text-lg font-medium leading-relaxed mb-4">
                                "{displayInsights.trend}"
                            </p>
                            
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className="bg-white/10 backdrop-blur rounded-xl p-3">
                                    <div className="text-[10px] text-white/60 uppercase mb-1">Prediction</div>
                                    <div className="font-bold text-sm">{displayInsights.prediction}</div>
                                </div>
                                <div className="bg-white/10 backdrop-blur rounded-xl p-3">
                                    <div className="text-[10px] text-white/60 uppercase mb-1">Focus Area</div>
                                    <div className="font-bold text-sm">{displayInsights.focusArea}</div>
                                </div>
                            </div>
                            
                            {displayInsights.improvement && (
                                <div className="flex items-center justify-between text-sm border-t border-white/10 pt-3">
                                    <div className="flex items-center gap-2">
                                        <Icons.TrendingUp className="w-4 h-4 text-green-400" />
                                        <span className="text-white/80">{displayInsights.improvement}</span>
                                    </div>
                                    <div className="text-white/60 text-xs">
                                        Strength: {displayInsights.topStrength}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </Card>
        );
    };

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

        const hasData = calculatedStats.historyData.some(d => d.tasks > 0);

        return (
            <Card className="p-5 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-primary flex items-center gap-2">
                        <Icons.Activity className="w-5 h-5" />
                        Activity Trend
                    </h3>
                    <span className="text-xs text-gray-400">
                        Last 7 {viewMode === 'daily' ? 'days' : viewMode === 'weekly' ? 'weeks' : 'months'}
                    </span>
                </div>
                {hasData ? (
                    <LineChart 
                        data={calculatedStats.historyData.map(d => d.tasks)}
                        color="#4F46E5"
                        height={120}
                        labels={chartLabels}
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                        <Icons.Activity className="w-12 h-12 mb-2 opacity-30" />
                        <p className="text-sm">No activity data yet</p>
                        <p className="text-xs">Complete tasks to see your trend</p>
                    </div>
                )}
            </Card>
        );
    };

    // Task Breakdown Section
    const renderTaskBreakdown = () => {
        const hasData = calculatedStats.easyTasks > 0 || calculatedStats.mediumTasks > 0 || calculatedStats.hardTasks > 0;
        
        return (
            <Card className="p-5 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-primary flex items-center gap-2">
                        <Icons.PieChart className="w-5 h-5" />
                        Task Breakdown
                    </h3>
                </div>
                {hasData ? (
                    <DonutChart 
                        data={[
                            { value: calculatedStats.easyTasks, color: '#10B981', label: 'Easy' },
                            { value: calculatedStats.mediumTasks, color: '#F59E0B', label: 'Medium' },
                            { value: calculatedStats.hardTasks, color: '#EF4444', label: 'Hard' }
                        ]}
                        size={140}
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                        <Icons.PieChart className="w-12 h-12 mb-2 opacity-30" />
                        <p className="text-sm">No completed tasks</p>
                        <p className="text-xs">Complete tasks to see breakdown</p>
                    </div>
                )}
            </Card>
        );
    };

    // Credits Bar Chart
    const renderCreditsChart = () => {
        const hasData = calculatedStats.historyData.some(d => d.credits > 0);
        
        return (
            <Card className="p-5 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-primary flex items-center gap-2">
                        <Icons.BarChart className="w-5 h-5" />
                        Credits Earned
                    </h3>
                </div>
                {hasData ? (
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
                ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                        <Icons.BarChart className="w-12 h-12 mb-2 opacity-30" />
                        <p className="text-sm">No credits earned yet</p>
                        <p className="text-xs">Complete tasks to earn credits</p>
                    </div>
                )}
            </Card>
        );
    };

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
                        <Icons.Trophy className="w-5 h-5" />
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

    // Upcoming Events Section
    const renderUpcomingEvents = () => {
        const upcomingEvents = allEvents
            .filter(e => new Date(e.date) >= new Date())
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(0, 5);
        
        if (upcomingEvents.length === 0) {
            return (
                <Card className="p-6 text-center border border-dashed border-gray-200 mb-6">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Icons.Clock className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-gray-400 text-sm mb-2">No upcoming events</p>
                    <p className="text-gray-300 text-xs">Add events from the calendar above</p>
                </Card>
            );
        }
        
        return (
            <div className="space-y-3 mb-6">
                {upcomingEvents.map((event) => {
                    const eventDate = new Date(event.date);
                    const daysUntil = Math.ceil((eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    
                    return (
                        <div 
                            key={event.id} 
                            className="flex gap-4 items-start p-4 bg-white rounded-2xl border border-gray-200 transition-all hover:border-primary/30 hover:shadow-sm"
                        >
                            <div className="w-12 text-center">
                                <span className="block text-xs font-bold text-gray-400">
                                    {eventDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                                </span>
                                <span className="block text-xl font-black text-primary">
                                    {eventDate.getDate()}
                                </span>
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-gray-800 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: event.color }}></span>
                                    {event.title}
                                </h4>
                                {event.description && (
                                    <p className="text-xs text-gray-400">{event.description}</p>
                                )}
                            </div>
                            <div className="text-right flex flex-col items-end gap-1">
                                <span className={`text-xs font-bold ${daysUntil <= 3 ? 'text-amber-500' : 'text-gray-400'}`}>
                                    {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil}d`}
                                </span>
                                {event.type === 'custom' && (
                                    <button 
                                        onClick={() => handleDeleteEvent(event.id)}
                                        className="text-gray-300 hover:text-red-500 transition-colors"
                                    >
                                        <Icons.Trash className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    // Connected Apps Section
    const renderConnectedApps = () => {
        const relevantApps = (user.connectedApps || []).filter(app => app.isConnected);
        
        if (relevantApps.length === 0) return null;

        return (
            <div className="mb-6">
                <h3 className="font-bold text-primary mb-4 flex items-center gap-2">
                    <Icons.Cpu className="w-5 h-5"/> 
                    Connected Integrations
                </h3>
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
                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                                    {app.metrics?.map(metric => (
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
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>
                    ))}
                </div>
            </div>
        );
    };

    // Event Modal
    const renderEventModal = () => {
        if (!showEventModal) return null;
        
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <Card className="w-full max-w-md p-6 bg-white">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-primary text-lg">Add Event</h3>
                        <button 
                            onClick={() => setShowEventModal(false)}
                            className="p-2 hover:bg-gray-100 rounded-full"
                        >
                            <Icons.X className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                            <div className="px-4 py-3 bg-gray-50 rounded-xl text-gray-600 font-medium">
                                {selectedEventDate?.toLocaleDateString('en-US', { 
                                    weekday: 'long', 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric' 
                                })}
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                            <input
                                type="text"
                                value={newEvent.title}
                                onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                                placeholder="Event title"
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-gray-800"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                                value={newEvent.description}
                                onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Optional description"
                                rows={3}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none text-gray-800"
                            />
                        </div>
                        
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setShowEventModal(false)}
                                className="flex-1 py-3 border border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddEvent}
                                disabled={!newEvent.title.trim()}
                                className="flex-1 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Add Event
                            </button>
                        </div>
                    </div>
                </Card>
            </div>
        );
    };

    // Day Events Modal
    const renderDayEventsModal = () => {
        if (!showDayEvents || !selectedEventDate) return null;
        
        const dayEvents = getEventsForDate(new Date(selectedDate));
        
        return (
            <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
                <Card className="w-full max-w-md rounded-t-3xl rounded-b-none p-6 max-h-[70vh] overflow-y-auto bg-white">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="font-bold text-primary text-lg">
                                {new Date(selectedDate).toLocaleDateString('en-US', { 
                                    weekday: 'long', 
                                    month: 'long', 
                                    day: 'numeric' 
                                })}
                            </h3>
                            <p className="text-sm text-gray-400">{dayEvents.length} event(s)</p>
                        </div>
                        <button 
                            onClick={() => setShowDayEvents(false)}
                            className="p-2 hover:bg-gray-100 rounded-full"
                        >
                            <Icons.X className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>
                    
                    {dayEvents.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                            <Icons.Clock className="w-12 h-12 mx-auto mb-2 opacity-30" />
                            <p>No events on this day</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {dayEvents.map(event => (
                                <div 
                                    key={event.id}
                                    className="p-4 bg-gray-50 rounded-xl border-l-4"
                                    style={{ borderLeftColor: event.color }}
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h4 className="font-bold text-gray-800">{event.title}</h4>
                                            {event.description && (
                                                <p className="text-xs text-gray-400 mt-1">{event.description}</p>
                                            )}
                                            <span className="text-[10px] uppercase font-bold text-gray-400 mt-2 inline-block">
                                                {event.type}
                                            </span>
                                        </div>
                                        {event.type === 'custom' && (
                                            <button 
                                                onClick={() => handleDeleteEvent(event.id)}
                                                className="text-gray-300 hover:text-red-500 transition-colors"
                                            >
                                                <Icons.Trash className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    <button
                        onClick={() => {
                            setShowDayEvents(false);
                            setShowEventModal(true);
                        }}
                        className="w-full mt-4 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                    >
                        <Icons.Plus className="w-4 h-4" />
                        Add Event
                    </button>
                </Card>
            </div>
        );
    };

    return (
        <div className="h-full overflow-y-auto pb-safe scroll-smooth">
            <div className="min-h-full bg-gray-50 pb-28 flex flex-col animate-fade-in">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 bg-white sticky top-0 z-20">
                    <div className="flex justify-between items-center mb-4 mt-2">
                        <h1 className="text-2xl font-bold text-primary">Analytics</h1>
                        <button 
                            onClick={() => setView(AppView.DASHBOARD)} 
                            className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                        >
                            <Icons.X className="w-5 h-5 text-gray-500"/>
                        </button>
                    </div>
                    {renderViewModeToggle()}
                    {renderCalendarStrip()}
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Stats Cards */}
                    {renderStatsCards()}
                    
                    {/* AI Alerts - NEW SECTION */}
                    {renderAlerts()}
                    
                    {/* AI Insights */}
                    {renderInsights()}
                    
                    {/* Goal Progress */}
                    {renderGoalProgress()}
                    
                    {/* Full Calendar */}
                    <div>
                        <h3 className="font-bold text-primary mb-4 flex items-center gap-2">
                            <Icons.Clock className="w-5 h-5"/> 
                            Calendar
                        </h3>
                        {renderFullCalendar()}
                    </div>
                    
                    {/* Upcoming Events */}
                    <div>
                        <h3 className="font-bold text-primary mb-4 flex items-center gap-2">
                            <Icons.Bell className="w-5 h-5"/> 
                            Upcoming Events
                        </h3>
                        {renderUpcomingEvents()}
                    </div>
                    
                    {/* Activity Trend */}
                    {renderActivityChart()}
                    
                    {/* Task Breakdown */}
                    {renderTaskBreakdown()}
                    
                    {/* Credits Chart */}
                    {renderCreditsChart()}

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
                    {renderConnectedApps()}
                </div>
            </div>
            
            {/* Modals */}
            {renderEventModal()}
            {renderDayEventsModal()}
        </div>
    );
}
