// views/StatsView.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../contexts/AppContext';
import { AppView, TaskStatus } from '../types';
import { Icons, Card } from '../components/UIComponents';
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
    type: 'warning' | 'danger' | 'info' | 'success';
    title: string;
    message: string;
    icon: any;
    source: 'guide' | 'agent' | 'system';
    actionLabel?: string;
    actionView?: AppView;
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
    const [prevStats, setPrevStats] = useState<Record<string, number>>({});
    
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
                const parsed = JSON.parse(saved);
                const today = new Date().toDateString();
                if (parsed.date !== today) {
                    setDismissedAlerts([]);
                    localStorage.setItem('dismissedAlerts', JSON.stringify({ date: today, alerts: [] }));
                } else {
                    setDismissedAlerts(parsed.alerts || []);
                }
            } catch (e) {}
        }
    }, []);

    // Load calendar events from localStorage
    useEffect(() => {
        const savedEvents = localStorage.getItem('statsCalendarEvents');
        if (savedEvents) {
            try {
                setCalendarEvents(JSON.parse(savedEvents));
            } catch (e) {}
        }
    }, []);

    // Save calendar events to localStorage
    useEffect(() => {
        const customEvents = calendarEvents.filter(e => e.type === 'custom');
        localStorage.setItem('statsCalendarEvents', JSON.stringify(customEvents));
    }, [calendarEvents]);

    // Generate automatic milestones based on goal
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
        
        // Add weekly review milestones
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
        
        return [...calendarEvents, ...autoMilestones];
    }, [calendarEvents, user.goal]);

    // REAL calculated stats - using user.dailyTasks and user.credits
    const calculatedStats = useMemo(() => {
        const now = new Date(selectedDate);
        
        // Use dailyTasks from user state - this is the correct source
        const tasks = user.dailyTasks || [];
        
        // Filter completed/approved tasks
        const allCompletedTasks = tasks.filter(t => 
            t.status === TaskStatus.COMPLETED || 
            t.status === TaskStatus.APPROVED ||
            t.status === 'completed' || 
            t.status === 'approved'
        );
        
        // Filter tasks by selected date/period
        const filterByDate = (task: any) => {
            // Use completedAt if available, otherwise fall back to other date fields
            const taskDate = new Date(task.completedAt || task.updatedAt || task.createdAt || Date.now());
            
            if (viewMode === 'daily') {
                return taskDate.toDateString() === now.toDateString();
            } else if (viewMode === 'weekly') {
                const weekStart = new Date(now);
                weekStart.setDate(now.getDate() - now.getDay());
                weekStart.setHours(0, 0, 0, 0);
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 7);
                return taskDate >= weekStart && taskDate < weekEnd;
            } else {
                return taskDate.getMonth() === now.getMonth() && taskDate.getFullYear() === now.getFullYear();
            }
        };

        const filteredTasks = allCompletedTasks.filter(filterByDate);
        
        // Calculate credits earned in this period from completed tasks
        const periodCredits = filteredTasks.reduce((sum, t) => {
            return sum + (t.creditsReward || t.credits || t.reward || 0);
        }, 0);
        
        // Total credits - use user.credits directly (the actual source of truth)
        const totalCredits = user.credits || 0;
        
        // Calculate streak from user state or compute from tasks
        let streak = user.streak || 0;
        
        // If no streak in user state, calculate from completed tasks
        if (streak === 0 && allCompletedTasks.length > 0) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            for (let i = 0; i < 365; i++) {
                const checkDate = new Date(today);
                checkDate.setDate(checkDate.getDate() - i);
                
                const hasTaskOnDay = allCompletedTasks.some(t => {
                    const taskDate = new Date(t.completedAt || t.updatedAt || t.createdAt || 0);
                    return taskDate.toDateString() === checkDate.toDateString();
                });
                
                if (hasTaskOnDay) {
                    streak++;
                } else if (i > 0) {
                    break;
                }
            }
        }
        
        // Task breakdown by difficulty
        const easyTasks = filteredTasks.filter(t => {
            const diff = (t.difficulty || '').toString().toLowerCase();
            return diff === 'easy' || diff === '1';
        }).length;
        
        const mediumTasks = filteredTasks.filter(t => {
            const diff = (t.difficulty || '').toString().toLowerCase();
            return diff === 'medium' || diff === '2';
        }).length;
        
        const hardTasks = filteredTasks.filter(t => {
            const diff = (t.difficulty || '').toString().toLowerCase();
            return diff === 'hard' || diff === '3';
        }).length;

        // Generate 7-period history data for charts
        const historyData = Array.from({ length: 7 }, (_, i) => {
            const date = new Date(now);
            if (viewMode === 'daily') {
                date.setDate(date.getDate() - (6 - i));
            } else if (viewMode === 'weekly') {
                date.setDate(date.getDate() - (6 - i) * 7);
            } else {
                date.setMonth(date.getMonth() - (6 - i));
            }
            
            const dayTasks = allCompletedTasks.filter(t => {
                const taskDate = new Date(t.completedAt || t.updatedAt || t.createdAt || Date.now());
                if (viewMode === 'daily') {
                    return taskDate.toDateString() === date.toDateString();
                } else if (viewMode === 'weekly') {
                    const weekStart = new Date(date);
                    weekStart.setDate(date.getDate() - date.getDay());
                    weekStart.setHours(0, 0, 0, 0);
                    const weekEnd = new Date(weekStart);
                    weekEnd.setDate(weekStart.getDate() + 7);
                    return taskDate >= weekStart && taskDate < weekEnd;
                } else {
                    return taskDate.getMonth() === date.getMonth() && taskDate.getFullYear() === date.getFullYear();
                }
            });
            
            return {
                date,
                tasks: dayTasks.length,
                credits: dayTasks.reduce((sum, t) => sum + (t.creditsReward || t.credits || t.reward || 0), 0)
            };
        });

        return {
            tasksCompleted: filteredTasks.length,
            periodCredits,
            totalCredits,
            streak,
            easyTasks,
            mediumTasks,
            hardTasks,
            historyData,
            totalTasks: tasks.length,
            allTimeCompleted: allCompletedTasks.length
        };
    }, [user.dailyTasks, user.credits, user.streak, selectedDate, viewMode]);

    // Animate numbers when stats change
    useEffect(() => {
        const newTargets = {
            tasksCompleted: calculatedStats.tasksCompleted,
            totalCredits: calculatedStats.totalCredits,
            periodCredits: calculatedStats.periodCredits,
            streak: calculatedStats.streak,
            allTimeCompleted: calculatedStats.allTimeCompleted
        };

        // Check if any values actually changed
        const hasChanges = Object.entries(newTargets).some(
            ([key, value]) => prevStats[key] !== value
        );

        if (!hasChanges && Object.keys(prevStats).length > 0) return;

        setPrevStats(newTargets);

        const duration = 600;
        const steps = 20;
        const stepDuration = duration / steps;

        Object.entries(newTargets).forEach(([key, target]) => {
            const start = animatedValues[key] ?? 0;
            const diff = target - start;
            
            if (diff === 0) {
                setAnimatedValues(prev => ({ ...prev, [key]: target }));
                return;
            }
            
            let step = 0;
            const animate = () => {
                step++;
                const progress = step / steps;
                const eased = 1 - Math.pow(1 - progress, 3);
                const current = Math.round(start + diff * eased);
                
                setAnimatedValues(prev => ({ ...prev, [key]: current }));
                
                if (step < steps) {
                    requestAnimationFrame(() => setTimeout(animate, stepDuration));
                } else {
                    setAnimatedValues(prev => ({ ...prev, [key]: target }));
                }
            };
            animate();
        });
    }, [calculatedStats]);

    // Generate alerts based on real data from Guide and Master Agent
    const alerts = useMemo(() => {
        const generatedAlerts: Alert[] = [];
        const tasks = user.dailyTasks || [];
        const completedTasks = tasks.filter(t => 
            t.status === TaskStatus.COMPLETED || 
            t.status === TaskStatus.APPROVED ||
            t.status === 'completed' || 
            t.status === 'approved'
        );
        const pendingTasks = tasks.filter(t => 
            t.status === TaskStatus.PENDING || 
            t.status === 'pending' || 
            t.status === 'in_progress'
        );
        const credits = calculatedStats.totalCredits;
        const streak = calculatedStats.streak;
        
        // Guide data
        const chatHistory = user.chatHistory || [];
        const lastGuideMessage = chatHistory.length > 0 ? chatHistory[chatHistory.length - 1] : null;
        
        // Master Agent data
        const agentAlerts = user.agentAlerts || [];
        const unreadAgentAlerts = agentAlerts.filter((a: any) => !a.isRead);
        
        // Guide-based alerts
        if (chatHistory.length > 0 && lastGuideMessage?.timestamp) {
            const lastConversationDate = new Date(lastGuideMessage.timestamp);
            const daysSinceLastConversation = Math.floor((Date.now() - lastConversationDate.getTime()) / (1000 * 60 * 60 * 24));
            
            if (daysSinceLastConversation > 2) {
                generatedAlerts.push({
                    id: 'guide-inactive',
                    type: 'info',
                    title: 'Check in with The Guide',
                    message: `It's been ${daysSinceLastConversation} days since your last conversation.`,
                    icon: Icons.MessageCircle,
                    source: 'guide',
                    actionLabel: 'Open Guide',
                    actionView: AppView.CHAT
                });
            }
        }
        
        if (!user.goal) {
            generatedAlerts.push({
                id: 'no-goal',
                type: 'warning',
                title: 'Set Your First Goal',
                message: 'The Guide recommends setting a goal to start your journey.',
                icon: Icons.Trophy,
                source: 'guide',
                actionLabel: 'Talk to Guide',
                actionView: AppView.CHAT
            });
        }
        
        // Agent-based alerts
        if (unreadAgentAlerts.length > 0) {
            const highSeverityAlerts = unreadAgentAlerts.filter((a: any) => a.severity === 'high');
            if (highSeverityAlerts.length > 0) {
                generatedAlerts.push({
                    id: 'agent-high-severity',
                    type: 'danger',
                    title: `${highSeverityAlerts.length} Critical Alert${highSeverityAlerts.length > 1 ? 's' : ''}`,
                    message: highSeverityAlerts[0].title || 'Requires immediate attention.',
                    icon: Icons.AlertTriangle,
                    source: 'agent',
                    actionLabel: 'View Details',
                    actionView: AppView.DASHBOARD
                });
            }
        }
        
        // System alerts based on data
        if (streak > 0 && streak < 3) {
            generatedAlerts.push({
                id: 'streak-risk',
                type: 'warning',
                title: 'Streak at Risk',
                message: `Your ${streak}-day streak needs attention! Complete a task today.`,
                icon: Icons.Flame,
                source: 'system',
                actionLabel: 'View Tasks',
                actionView: AppView.DASHBOARD
            });
        }
        
        // No recent activity alert
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        const recentActivity = completedTasks.some(t => {
            const taskDate = new Date(t.completedAt || t.updatedAt || t.createdAt || 0);
            return taskDate >= threeDaysAgo;
        });
        
        if (!recentActivity && tasks.length > 0) {
            generatedAlerts.push({
                id: 'no-activity',
                type: 'danger',
                title: 'No Recent Activity',
                message: "You haven't completed any tasks in 3+ days. Let's get back on track!",
                icon: Icons.AlertTriangle,
                source: 'system',
                actionLabel: 'Start Now',
                actionView: AppView.DASHBOARD
            });
        }
        
        // Goal progress alert
        if (user.goal?.createdAt) {
            const daysElapsed = Math.floor((Date.now() - new Date(user.goal.createdAt).getTime()) / (1000 * 60 * 60 * 24));
            const totalDays = user.goal.durationDays || 30;
            const expectedProgress = (daysElapsed / totalDays) * 100;
            const expectedTasks = Math.floor((daysElapsed / totalDays) * (tasks.length || 10));
            
            if (completedTasks.length < expectedTasks * 0.5 && daysElapsed > 3) {
                generatedAlerts.push({
                    id: 'goal-behind',
                    type: 'warning',
                    title: 'Falling Behind on Goal',
                    message: `You're ${Math.round(expectedProgress)}% through your timeline but behind on tasks.`,
                    icon: Icons.TrendingDown,
                    source: 'guide',
                    actionLabel: 'Get Advice',
                    actionView: AppView.CHAT
                });
            }
        }
        
        // Low credits alert - FIXED: Icons.Coins doesn't exist, use Icons.Zap
        if (credits > 0 && credits < 50) {
            generatedAlerts.push({
                id: 'low-credits',
                type: 'info',
                title: 'Low on Credits',
                message: `Only ${credits} credits remaining. Complete tasks to earn more!`,
                icon: Icons.Zap,
                source: 'system',
                actionLabel: 'Earn More',
                actionView: AppView.DASHBOARD
            });
        }
        
        // Positive alerts
        if (streak >= 7) {
            generatedAlerts.push({
                id: 'streak-celebrate',
                type: 'success',
                title: `${streak} Day Streak!`,
                message: "Amazing consistency! Keep up the great work!",
                icon: Icons.Trophy,
                source: 'guide'
            });
        }
        
        return generatedAlerts.filter(alert => !dismissedAlerts.includes(alert.id));
    }, [user, calculatedStats, dismissedAlerts]);

    const dismissAlert = (alertId: string) => {
        const updated = [...dismissedAlerts, alertId];
        setDismissedAlerts(updated);
        localStorage.setItem('dismissedAlerts', JSON.stringify({ 
            date: new Date().toDateString(), 
            alerts: updated 
        }));
    };

    // Mock insights based on real data
    const mockInsights = useMemo(() => {
        const tasks = user.dailyTasks || [];
        const completedTasks = tasks.filter(t => 
            t.status === TaskStatus.COMPLETED || 
            t.status === TaskStatus.APPROVED ||
            t.status === 'completed' || 
            t.status === 'approved'
        );
        const streak = calculatedStats.streak;
        const credits = calculatedStats.totalCredits;
        
        // Analyze productivity by day of week
        const tasksByDay: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
        completedTasks.forEach(t => {
            const day = new Date(t.completedAt || t.createdAt || Date.now()).getDay();
            tasksByDay[day]++;
        });
        
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const mostProductiveDay = Object.entries(tasksByDay).sort((a, b) => b[1] - a[1])[0];
        const productiveDayName = dayNames[parseInt(mostProductiveDay[0])];
        
        const weeklyScore = Math.min(100, Math.round((completedTasks.length * 10) + (streak * 5) + (credits / 10)));
        
        return {
            trend: completedTasks.length > 0 
                ? `You're most productive on ${productiveDayName}s with ${mostProductiveDay[1]} tasks completed.`
                : "Start completing tasks to see your productivity patterns.",
            prediction: streak > 3 
                ? `${Math.min(95, 60 + streak * 5)}% likely to maintain your streak` 
                : "Build a streak to improve prediction",
            focusArea: completedTasks.length < 5 
                ? "Getting started" 
                : streak < 3 
                    ? "Building consistency" 
                    : "Maintaining momentum",
            weeklyScore,
            improvement: completedTasks.length > 0 
                ? `+${Math.min(25, completedTasks.length * 3)}% from last week` 
                : "No data yet",
            topStrength: streak > 5 
                ? "Consistency" 
                : completedTasks.length > 10 
                    ? "Task completion" 
                    : "Getting started"
        };
    }, [user.dailyTasks, calculatedStats]);

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
                    console.error('Failed to fetch AI data:', error);
                    setInsights(mockInsights);
                }
            } else {
                setInsights(mockInsights);
            }
            setIsLoading(false);
        };
        fetchData();
    }, [user.goal, mockInsights]);

    // Check if a date has completed task activity
    const hasActivity = useCallback((date: Date) => {
        const tasks = user.dailyTasks || [];
        return tasks.some(t => {
            const taskDate = new Date(t.completedAt || t.updatedAt || t.createdAt || Date.now());
            return taskDate.toDateString() === date.toDateString() && 
                (t.status === TaskStatus.COMPLETED || 
                 t.status === TaskStatus.APPROVED ||
                 t.status === 'completed' || 
                 t.status === 'approved');
        });
    }, [user.dailyTasks]);

    // Get events for a specific date
    const getEventsForDate = useCallback((date: Date) => {
        return allEvents.filter(e => new Date(e.date).toDateString() === date.toDateString());
    }, [allEvents]);

    // Handle adding a new event
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

    // Handle deleting an event
    const handleDeleteEvent = (eventId: string) => {
        setCalendarEvents(prev => prev.filter(e => e.id !== eventId));
    };

    // ==================== CHART COMPONENTS ====================

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
                <div className="flex items-center justify-center p-8 text-gray-500 text-sm">
                    No data available
                </div>
            );
        }
        
        return (
            <div className="flex items-center gap-6">
                <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
                    <svg viewBox="0 0 100 100" className="-rotate-90 w-full h-full">
                        {data.map((slice, i) => {
                            const percent = slice.value / total;
                            const dashArray = percent * 251.2;
                            const offset = cumulativePercent * 251.2;
                            cumulativePercent += percent;
                            return (
                                <circle
                                    key={i}
                                    cx="50"
                                    cy="50"
                                    r="40"
                                    fill="none"
                                    stroke={slice.color}
                                    strokeWidth={hoveredIndex === i ? 24 : 20}
                                    strokeDasharray={`${dashArray} 251.2`}
                                    strokeDashoffset={-offset}
                                    className="transition-all duration-300 cursor-pointer"
                                    onMouseEnter={() => setHoveredIndex(i)}
                                    onMouseLeave={() => setHoveredIndex(null)}
                                />
                            );
                        })}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xs font-bold text-gray-500">
                            {hoveredIndex !== null ? data[hoveredIndex].label : 'Total'}
                        </span>
                        <span className="text-xl font-black text-gray-800">
                            {hoveredIndex !== null ? data[hoveredIndex].value : total}
                        </span>
                    </div>
                </div>
                {showLegend && (
                    <div className="space-y-2 flex-1">
                        {data.map((item, i) => (
                            <div
                                key={i}
                                className={`flex items-center justify-between text-xs p-2 rounded-lg cursor-pointer transition-colors ${
                                    hoveredIndex === i ? 'bg-gray-100' : ''
                                }`}
                                onMouseEnter={() => setHoveredIndex(i)}
                                onMouseLeave={() => setHoveredIndex(null)}
                            >
                                <span className="flex items-center gap-2 text-gray-700">
                                    <span 
                                        className="w-3 h-3 rounded-full" 
                                        style={{ backgroundColor: item.color }}
                                    />
                                    {item.label}
                                </span>
                                <span className="font-bold text-gray-800">
                                    {Math.round((item.value / total) * 100)}%
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const LineChart = ({ data, color = "#4F46E5", height = 100, labels = [] }: { 
        data: number[], 
        color?: string, 
        height?: number, 
        labels?: string[] 
    }) => {
        const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
        
        if (!data || data.length === 0) {
            return (
                <div className="flex items-center justify-center text-gray-400 text-sm" style={{ height }}>
                    No data
                </div>
            );
        }
        
        const max = Math.max(...data, 1);
        const width = 300;
        const chartHeight = 80;
        const paddingX = 20;
        const paddingY = 10;
        
        const points = data.map((val, i) => ({
            x: paddingX + (data.length > 1 ? (i / (data.length - 1)) * (width - paddingX * 2) : (width - paddingX * 2) / 2),
            y: paddingY + (chartHeight - paddingY * 2) - ((val / max) * (chartHeight - paddingY * 2)),
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
                        <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                            <stop offset="100%" stopColor={color} stopOpacity="0.05" />
                        </linearGradient>
                    </defs>
                    
                    {/* Grid lines */}
                    {[0, 0.5, 1].map((ratio, i) => (
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
                    
                    {/* Area fill */}
                    <path d={areaPath} fill={`url(#gradient-${color.replace('#', '')})`} />
                    
                    {/* Line */}
                    <path 
                        d={linePath} 
                        fill="none" 
                        stroke={color} 
                        strokeWidth="3" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                    />
                    
                    {/* Data points */}
                    {points.map((point, i) => (
                        <g key={i}>
                            <circle
                                cx={point.x}
                                cy={point.y}
                                r={hoveredPoint === i ? 8 : 5}
                                fill="white"
                                stroke={color}
                                strokeWidth="3"
                                className="transition-all cursor-pointer"
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
                            <span key={i} className="text-[10px] text-gray-500">{label}</span>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const BarChart = ({ data, height = 120 }: { 
        data: { label: string; value: number; color?: string }[], 
        height?: number 
    }) => {
        const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
        const max = Math.max(...data.map(d => d.value), 1);

        return (
            <div className="flex items-end justify-between gap-2" style={{ height }}>
                {data.map((item, i) => {
                    const barHeight = (item.value / max) * 100;
                    return (
                        <div
                            key={i}
                            className="flex-1 flex flex-col items-center gap-2"
                            onMouseEnter={() => setHoveredIndex(i)}
                            onMouseLeave={() => setHoveredIndex(null)}
                        >
                            <div className="relative w-full flex justify-center">
                                {hoveredIndex === i && (
                                    <div className="absolute -top-8 bg-primary text-white text-xs px-2 py-1 rounded-lg z-10">
                                        {item.value}
                                    </div>
                                )}
                                <div
                                    className="w-full max-w-[40px] rounded-t-lg transition-all cursor-pointer"
                                    style={{
                                        height: `${barHeight}%`,
                                        minHeight: 4,
                                        backgroundColor: item.color || '#4F46E5',
                                        opacity: hoveredIndex === i ? 1 : 0.8
                                    }}
                                />
                            </div>
                            <span className="text-[10px] text-gray-500">{item.label}</span>
                        </div>
                    );
                })}
            </div>
        );
    };

    const ProgressRing = ({ progress, size = 80, strokeWidth = 8, color = "#4F46E5", label, value }: { 
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
                        className="transition-all duration-1000"
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    {value !== undefined && (
                        <span className="text-lg font-black text-gray-800">{value}</span>
                    )}
                    {label && (
                        <span className="text-[10px] text-gray-500">{label}</span>
                    )}
                </div>
            </div>
        );
    };

    // ==================== RENDER FUNCTIONS ====================

    const renderCalendarStrip = () => {
        const days = [];
        for (let i = -3; i <= 3; i++) {
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
                            ? 'bg-primary text-white shadow-lg scale-110'
                            : 'bg-white text-gray-600 border border-gray-200 hover:border-primary/30'
                    }`}
                >
                    <span className={`text-[10px] font-bold uppercase ${
                        isSelected ? 'text-white/80' : 'text-gray-400'
                    }`}>
                        {viewMode === 'monthly'
                            ? d.toLocaleDateString('en-US', { month: 'short' })
                            : d.toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                    <span className="text-lg font-black">
                        {viewMode === 'monthly' ? d.getFullYear().toString().slice(-2) : d.getDate()}
                    </span>
                    <div className="flex gap-0.5 mt-0.5">
                        {hasData && (
                            <div className={`w-1.5 h-1.5 rounded-full ${
                                isSelected ? 'bg-white' : 'bg-green-500'
                            }`} />
                        )}
                        {events.length > 0 && (
                            <div className={`w-1.5 h-1.5 rounded-full ${
                                isSelected ? 'bg-white/60' : 'bg-purple-500'
                            }`} />
                        )}
                    </div>
                </button>
            );
        }
        return <div className="flex justify-between px-2">{days}</div>;
    };

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

    // Stats Cards - NO LEVEL/XP, using Icons.Zap for credits (Icons.Coins doesn't exist)
    const renderStatsCards = () => (
        <div className="grid grid-cols-3 gap-3 mb-6">
            {/* Tasks Card */}
            <Card className="p-4 bg-gradient-to-br from-primary to-primary/80 text-white border-none">
                <div className="flex items-center gap-1 mb-1">
                    <Icons.Check className="w-3 h-3 text-white/60" />
                    <span className="text-[9px] font-bold uppercase text-white/60">Tasks</span>
                </div>
                <div className="text-2xl font-black">
                    {animatedValues.tasksCompleted ?? calculatedStats.tasksCompleted}
                </div>
                <div className="text-[10px] text-white/60 mt-0.5">
                    {viewMode === 'daily' ? 'Today' : viewMode === 'weekly' ? 'This Week' : 'This Month'}
                </div>
            </Card>
            
            {/* Credits Card - FIXED: Using Icons.Zap instead of Icons.Coins */}
            <Card className="p-4 bg-gradient-to-br from-amber-500 to-amber-400 text-white border-none">
                <div className="flex items-center gap-1 mb-1">
                    <Icons.Zap className="w-3 h-3 text-white/60" />
                    <span className="text-[9px] font-bold uppercase text-white/60">Credits</span>
                </div>
                <div className="text-2xl font-black">
                    {animatedValues.totalCredits ?? calculatedStats.totalCredits}
                </div>
                <div className="text-[10px] text-white/60 mt-0.5">
                    +{animatedValues.periodCredits ?? calculatedStats.periodCredits} {viewMode === 'daily' ? 'today' : viewMode === 'weekly' ? 'this week' : 'this month'}
                </div>
            </Card>
            
            {/* Streak Card */}
            <Card className="p-4 bg-gradient-to-br from-red-500 to-orange-400 text-white border-none">
                <div className="flex items-center gap-1 mb-1">
                    <Icons.Flame className="w-3 h-3 text-white/60" />
                    <span className="text-[9px] font-bold uppercase text-white/60">Streak</span>
                </div>
                <div className="text-2xl font-black">
                    {animatedValues.streak ?? calculatedStats.streak}
                </div>
                <div className="text-[10px] text-white/60 mt-0.5">Days</div>
            </Card>
        </div>
    );

    // Summary Stats - NO LEVEL, using Icons.Zap for credits
    const renderSummaryStats = () => (
        <div className="grid grid-cols-3 gap-2 mb-6">
            <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
                <div className="text-lg font-black text-gray-800">
                    {animatedValues.allTimeCompleted ?? calculatedStats.allTimeCompleted}
                </div>
                <div className="text-[10px] text-gray-500">All Time Tasks</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
                <div className="text-lg font-black text-gray-800">
                    {calculatedStats.totalTasks}
                </div>
                <div className="text-[10px] text-gray-500">Total Tasks</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
                <div className="text-lg font-black text-amber-600 flex items-center justify-center gap-1">
                    <Icons.Zap className="w-4 h-4" />
                    {animatedValues.totalCredits ?? calculatedStats.totalCredits}
                </div>
                <div className="text-[10px] text-gray-500">Total Credits</div>
            </div>
        </div>
    );

    // Alerts Section
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
                case 'success':
                    return {
                        bg: 'bg-green-50',
                        border: 'border-green-200',
                        icon: 'bg-green-100 text-green-600',
                        title: 'text-green-800',
                        message: 'text-green-600',
                        button: 'bg-green-600 hover:bg-green-700 text-white'
                    };
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

        const getSourceLabel = (source: string) => {
            switch (source) {
                case 'guide':
                    return { label: 'The Guide', color: 'bg-purple-100 text-purple-700' };
                case 'agent':
                    return { label: 'Master Agent', color: 'bg-indigo-100 text-indigo-700' };
                default:
                    return { label: 'System', color: 'bg-gray-100 text-gray-700' };
            }
        };
        
        return (
            <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <Icons.Bell className="w-5 h-5 text-primary" />
                        AI Alerts
                    </h3>
                    <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {alerts.length}
                    </span>
                </div>
                {alerts.map(alert => {
                    const styles = getAlertStyles(alert.type);
                    const sourceInfo = getSourceLabel(alert.source);
                    const IconComponent = alert.icon;
                    return (
                        <div key={alert.id} className={`${styles.bg} ${styles.border} border rounded-2xl p-4 relative`}>
                            <button
                                onClick={() => dismissAlert(alert.id)}
                                className="absolute top-2 right-2 p-1 hover:bg-black/5 rounded-full"
                            >
                                <Icons.X className="w-4 h-4 text-gray-400" />
                            </button>
                            <div className="flex items-start gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${styles.icon}`}>
                                    <IconComponent className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0 pr-6">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${sourceInfo.color}`}>
                                            {sourceInfo.label}
                                        </span>
                                    </div>
                                    <h4 className={`font-bold text-sm ${styles.title}`}>{alert.title}</h4>
                                    <p className={`text-xs mt-1 ${styles.message}`}>{alert.message}</p>
                                    {alert.actionLabel && alert.actionView && (
                                        <button
                                            onClick={() => setView(alert.actionView!)}
                                            className={`mt-3 px-3 py-1.5 rounded-lg text-xs font-bold ${styles.button}`}
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

    // Goal Progress Section
    const renderGoalProgress = () => {
        if (!user.goal) return null;
        
        const daysElapsed = Math.floor((Date.now() - new Date(user.goal.createdAt || Date.now()).getTime()) / (1000 * 60 * 60 * 24));
        const totalDays = user.goal.durationDays || 30;
        const progress = Math.min(100, Math.round((daysElapsed / totalDays) * 100));
        
        return (
            <Card className="p-4 bg-white border border-gray-200 mb-6">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <Icons.Target className="w-5 h-5 text-primary" />
                        Goal Progress
                    </h3>
                    <span className="text-xs text-gray-500">
                        Day {Math.min(daysElapsed, totalDays)} of {totalDays}
                    </span>
                </div>
                <div className="mb-2">
                    <p className="font-semibold text-gray-700 text-sm">{user.goal.title}</p>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-1000"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                    <span>{progress}% complete</span>
                    <span>{totalDays - daysElapsed} days remaining</span>
                </div>
            </Card>
        );
    };

    // Activity Trend (Line Chart)
    const renderActivityTrend = () => {
        const labels = calculatedStats.historyData.map((d, i) => {
            if (viewMode === 'daily') {
                return d.date.toLocaleDateString('en-US', { weekday: 'short' });
            } else if (viewMode === 'weekly') {
                return `W${i + 1}`;
            } else {
                return d.date.toLocaleDateString('en-US', { month: 'short' });
            }
        });

        return (
            <Card className="p-4 bg-white border border-gray-200 mb-6">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Icons.TrendingUp className="w-5 h-5 text-primary" />
                    Activity Trend
                </h3>
                <LineChart
                    data={calculatedStats.historyData.map(d => d.tasks)}
                    color="#4F46E5"
                    height={120}
                    labels={labels}
                />
            </Card>
        );
    };

    // Task Breakdown (Donut Chart)
    const renderTaskBreakdown = () => {
        const data = [
            { value: calculatedStats.easyTasks, color: '#10B981', label: 'Easy' },
            { value: calculatedStats.mediumTasks, color: '#F59E0B', label: 'Medium' },
            { value: calculatedStats.hardTasks, color: '#EF4444', label: 'Hard' }
        ].filter(d => d.value > 0);

        if (data.length === 0) {
            return (
                <Card className="p-4 bg-white border border-gray-200 mb-6">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Icons.PieChart className="w-5 h-5 text-primary" />
                        Task Breakdown
                    </h3>
                    <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
                        Complete tasks to see breakdown
                    </div>
                </Card>
            );
        }

        return (
            <Card className="p-4 bg-white border border-gray-200 mb-6">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Icons.PieChart className="w-5 h-5 text-primary" />
                    Task Breakdown
                </h3>
                <DonutChart data={data} size={140} />
            </Card>
        );
    };

    // Credits Chart - FIXED: Using Icons.Zap
    const renderCreditsChart = () => {
        const labels = calculatedStats.historyData.map((d, i) => {
            if (viewMode === 'daily') {
                return d.date.toLocaleDateString('en-US', { weekday: 'short' });
            } else if (viewMode === 'weekly') {
                return `W${i + 1}`;
            } else {
                return d.date.toLocaleDateString('en-US', { month: 'short' });
            }
        });

        return (
            <Card className="p-4 bg-white border border-gray-200 mb-6">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Icons.Zap className="w-5 h-5 text-amber-500" />
                    Credits Earned
                </h3>
                <BarChart
                    data={calculatedStats.historyData.map((d, i) => ({
                        label: labels[i],
                        value: d.credits,
                        color: '#F59E0B'
                    }))}
                    height={100}
                />
            </Card>
        );
    };

    // Portfolio Allocation (Budget Split) - Fixed text visibility
    const renderPortfolioAllocation = () => {
        if (!budgetData || !user.goal) return null;

        return (
            <Card className="p-4 bg-white border border-gray-200 mb-6">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Icons.DollarSign className="w-5 h-5 text-green-500" />
                    Budget Allocation
                </h3>
                <div className="space-y-3">
                    {budgetData.allocations?.map((item: any, i: number) => (
                        <div key={i} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: ['#4F46E5', '#10B981', '#F59E0B', '#EF4444'][i % 4] }}
                                />
                                <span className="text-sm text-gray-700">{item.category}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-gray-800">${item.amount}</span>
                                <span className="text-xs text-gray-500">({item.percentage}%)</span>
                            </div>
                        </div>
                    )) || (
                        <div className="text-center py-4 text-gray-400 text-sm">
                            Loading allocation data...
                        </div>
                    )}
                </div>
            </Card>
        );
    };

    // Connected Apps Section
    const renderConnectedApps = () => {
        const apps = user.connectedApps || [];
        const connectedApps = apps.filter(a => a.isConnected);
        
        if (connectedApps.length === 0) return null;

        return (
            <Card className="p-4 bg-white border border-gray-200 mb-6">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Icons.Link className="w-5 h-5 text-primary" />
                    Connected Apps
                </h3>
                <div className="space-y-3">
                    {connectedApps.map(app => (
                        <div key={app.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Icons.Activity className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-800 text-sm">{app.name}</p>
                                    <p className="text-xs text-gray-500">
                                        {app.metrics?.length || 0} metrics tracked
                                    </p>
                                </div>
                            </div>
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                        </div>
                    ))}
                </div>
            </Card>
        );
    };

    // Upcoming Milestones - Show only next 3 - FIXED: Icons.Flag doesn't exist, use Icons.Calendar
    const renderUpcomingMilestones = () => {
        const now = new Date();
        const upcomingEvents = allEvents
            .filter(e => new Date(e.date) >= now)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(0, 3); // Only show next 3

        if (upcomingEvents.length === 0) return null;

        return (
            <Card className="p-4 bg-white border border-gray-200 mb-6">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Icons.Calendar className="w-5 h-5 text-primary" />
                    Upcoming Milestones
                </h3>
                <div className="space-y-3">
                    {upcomingEvents.map(event => {
                        const eventDate = new Date(event.date);
                        const daysUntil = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                        
                        return (
                            <div key={event.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                <div 
                                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                                    style={{ backgroundColor: `${event.color}20` }}
                                >
                                    <div 
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: event.color }}
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-gray-800 text-sm truncate">{event.title}</p>
                                    <p className="text-xs text-gray-500">
                                        {eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        {' • '}
                                        {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                                    </p>
                                </div>
                                {event.type === 'custom' && (
                                    <button
                                        onClick={() => handleDeleteEvent(event.id)}
                                        className="p-1 hover:bg-gray-200 rounded-full"
                                    >
                                        <Icons.X className="w-4 h-4 text-gray-400" />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </Card>
        );
    };

    // Full Calendar
    const renderFullCalendar = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startingDay = firstDay.getDay();
        const totalDays = lastDay.getDate();
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        
        const days = [];
        const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        // Previous month days
        for (let i = startingDay - 1; i >= 0; i--) {
            days.push(
                <div key={`prev-${i}`} className="h-11 flex items-center justify-center text-gray-300 text-sm">
                    {prevMonthLastDay - i}
                </div>
            );
        }
        
        // Current month days
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
                        if (dayEvents.length > 0) setShowDayEvents(true);
                    }}
                    className={`h-11 rounded-xl flex flex-col items-center justify-center relative transition-all ${
                        isSelected
                            ? 'bg-primary text-white shadow-md'
                            : isToday
                                ? 'bg-primary/10 text-primary font-bold border-2 border-primary/30'
                                : 'text-gray-700 hover:bg-gray-100'
                    }`}
                >
                    <span className="text-sm font-semibold">{day}</span>
                    {(dayHasActivity || dayEvents.length > 0) && (
                        <div className="flex gap-0.5 absolute bottom-1">
                            {dayHasActivity && (
                                <div className={`w-1.5 h-1.5 rounded-full ${
                                    isSelected ? 'bg-white' : 'bg-green-500'
                                }`} />
                            )}
                            {dayEvents.slice(0, 2).map((e, i) => (
                                <div
                                    key={i}
                                    className="w-1.5 h-1.5 rounded-full"
                                    style={{ backgroundColor: isSelected ? 'white' : e.color }}
                                />
                            ))}
                        </div>
                    )}
                </button>
            );
        }
        
        // Next month days
        const remainingDays = 42 - days.length;
        for (let i = 1; i <= remainingDays; i++) {
            days.push(
                <div key={`next-${i}`} className="h-11 flex items-center justify-center text-gray-300 text-sm">
                    {i}
                </div>
            );
        }
        
        return (
            <Card className="p-4 bg-white border border-gray-200 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={() => {
                            const n = new Date(currentMonth);
                            n.setMonth(n.getMonth() - 1);
                            setCurrentMonth(n);
                        }}
                        className="p-2 hover:bg-gray-100 rounded-full"
                    >
                        <Icons.ChevronLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <h3 className="font-bold text-gray-800 text-lg">
                        {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </h3>
                    <button
                        onClick={() => {
                            const n = new Date(currentMonth);
                            n.setMonth(n.getMonth() + 1);
                            setCurrentMonth(n);
                        }}
                        className="p-2 hover:bg-gray-100 rounded-full"
                    >
                        <Icons.ChevronRight className="w-5 h-5 text-gray-600" />
                    </button>
                </div>
                
                <div className="grid grid-cols-7 gap-1 mb-2">
                    {weekDays.map(day => (
                        <div key={day} className="text-center text-xs font-bold text-gray-500 uppercase py-2">
                            {day}
                        </div>
                    ))}
                </div>
                
                <div className="grid grid-cols-7 gap-1 border-t border-gray-100 pt-2">
                    {days}
                </div>
                
                <button
                    onClick={() => {
                        setSelectedEventDate(new Date(selectedDate));
                        setShowEventModal(true);
                    }}
                    className="w-full mt-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 text-sm font-medium hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
                >
                    <Icons.Plus className="w-4 h-4" />
                    Add Event
                </button>
                
                <div className="flex flex-wrap items-center justify-center gap-4 mt-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 bg-green-500 rounded-full" />
                        Activity
                    </span>
                    <span className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 bg-purple-500 rounded-full" />
                        Custom
                    </span>
                    <span className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 bg-primary rounded-full" />
                        Goal
                    </span>
                    <span className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 bg-amber-500 rounded-full" />
                        Milestone
                    </span>
                </div>
            </Card>
        );
    };

    // AI Insights Section
    const renderAIInsights = () => {
        const currentInsights = insights || mockInsights;
        
        return (
            <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 mb-6">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Icons.Sparkles className="w-5 h-5 text-primary" />
                    AI Insights
                </h3>
                <div className="space-y-4">
                    <div className="bg-white/80 rounded-xl p-3">
                        <p className="text-xs font-bold text-gray-500 uppercase mb-1">Productivity Trend</p>
                        <p className="text-sm text-gray-700">{currentInsights.trend}</p>
                    </div>
                    <div className="bg-white/80 rounded-xl p-3">
                        <p className="text-xs font-bold text-gray-500 uppercase mb-1">Prediction</p>
                        <p className="text-sm text-gray-700">{currentInsights.prediction}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/80 rounded-xl p-3 text-center">
                            <p className="text-2xl font-black text-primary">{currentInsights.weeklyScore}</p>
                            <p className="text-xs text-gray-500">Weekly Score</p>
                        </div>
                        <div className="bg-white/80 rounded-xl p-3 text-center">
                            <p className="text-sm font-bold text-green-600">{currentInsights.improvement}</p>
                            <p className="text-xs text-gray-500">vs Last Week</p>
                        </div>
                    </div>
                    <div className="bg-white/80 rounded-xl p-3">
                        <p className="text-xs font-bold text-gray-500 uppercase mb-1">Focus Area</p>
                        <p className="text-sm font-semibold text-primary">{currentInsights.focusArea}</p>
                    </div>
                </div>
            </Card>
        );
    };

    // ==================== MAIN RENDER ====================

    return (
        <div className="min-h-full bg-[#F7F8FC] pb-24">
            {/* Header */}
            <div className="bg-gradient-to-br from-[#171738] via-[#1e1e4a] to-[#2a2a5c] text-white px-5 pt-safe pb-6">
                <div className="flex items-center justify-between pt-4 mb-4">
                    <h1 className="text-xl font-black">Analytics</h1>
                    <button
                        onClick={() => setView(AppView.DASHBOARD)}
                        className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-all"
                    >
                        <Icons.X className="w-5 h-5" />
                    </button>
                </div>
                
                {/* View Mode Toggle */}
                {renderViewModeToggle()}
                
                {/* Calendar Strip */}
                {renderCalendarStrip()}
            </div>

            <div className="px-5 pt-6">
                {/* 1. Stats Cards (Most Important) */}
                {renderStatsCards()}

                {/* 2. AI Alerts */}
                {renderAlerts()}

                {/* 3. Goal Progress */}
                {renderGoalProgress()}

                {/* 4. Activity Trend */}
                {renderActivityTrend()}

                {/* 5. Task Breakdown */}
                {renderTaskBreakdown()}

                {/* 6. Credits Chart */}
                {renderCreditsChart()}

                {/* 7. Portfolio Allocation */}
                {renderPortfolioAllocation()}

                {/* 8. Connected Apps */}
                {renderConnectedApps()}

                {/* 9. Upcoming Milestones (Only 3) */}
                {renderUpcomingMilestones()}

                {/* 10. Full Calendar */}
                {renderFullCalendar()}

                {/* 11. AI Insights (Bottom) */}
                {renderAIInsights()}
            </div>

            {/* Add Event Modal */}
            {showEventModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-5">
                    <div className="bg-white rounded-3xl w-full max-w-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-800 text-lg">Add Event</h3>
                            <button
                                onClick={() => setShowEventModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-full"
                            >
                                <Icons.X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-gray-500 mb-2">
                                    Date: {selectedEventDate?.toLocaleDateString('en-US', { 
                                        weekday: 'long', 
                                        month: 'long', 
                                        day: 'numeric' 
                                    })}
                                </p>
                            </div>
                            
                            <input
                                type="text"
                                placeholder="Event title"
                                value={newEvent.title}
                                onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-primary text-gray-800"
                            />
                            
                            <textarea
                                placeholder="Description (optional)"
                                value={newEvent.description}
                                onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-primary text-gray-800 resize-none"
                                rows={3}
                            />
                            
                            <button
                                onClick={handleAddEvent}
                                disabled={!newEvent.title.trim()}
                                className="w-full py-3 bg-primary text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Add Event
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Day Events Modal - FIXED: Icons.Trash2 doesn't exist, use Icons.Trash */}
            {showDayEvents && selectedEventDate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-5">
                    <div className="bg-white rounded-3xl w-full max-w-sm p-6 max-h-[80vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-800 text-lg">
                                {selectedEventDate.toLocaleDateString('en-US', { 
                                    month: 'long', 
                                    day: 'numeric' 
                                })}
                            </h3>
                            <button
                                onClick={() => setShowDayEvents(false)}
                                className="p-2 hover:bg-gray-100 rounded-full"
                            >
                                <Icons.X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>
                        
                        <div className="space-y-3">
                            {getEventsForDate(selectedEventDate).map(event => (
                                <div
                                    key={event.id}
                                    className="p-4 rounded-xl border"
                                    style={{ borderColor: event.color, backgroundColor: `${event.color}10` }}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <span
                                                className="text-[10px] font-bold uppercase px-2 py-0.5 rounded"
                                                style={{ backgroundColor: event.color, color: 'white' }}
                                            >
                                                {event.type}
                                            </span>
                                            <h4 className="font-bold text-gray-800 mt-2">{event.title}</h4>
                                            {event.description && (
                                                <p className="text-sm text-gray-500 mt-1">{event.description}</p>
                                            )}
                                        </div>
                                        {event.type === 'custom' && (
                                            <button
                                                onClick={() => handleDeleteEvent(event.id)}
                                                className="p-1 hover:bg-white rounded-full"
                                            >
                                                <Icons.Trash className="w-4 h-4 text-red-400" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            
                            {getEventsForDate(selectedEventDate).length === 0 && (
                                <p className="text-center text-gray-400 py-4">No events on this day</p>
                            )}
                        </div>
                        
                        <button
                            onClick={() => {
                                setShowDayEvents(false);
                                setShowEventModal(true);
                            }}
                            className="w-full mt-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 text-sm font-medium hover:border-primary hover:text-primary transition-colors"
                        >
                            + Add Event
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
