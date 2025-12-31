// views/StatsView.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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

// Local CoinIcon for gradient cards (gold filled version)
const CoinIcon = (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.2"/>
        <circle cx="12" cy="12" r="8" fill="currentColor"/>
        <text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">$</text>
    </svg>
);

export default function StatsView() {
    const { user, setView } = useApp();
    const [selectedDate, setSelectedDate] = useState(Date.now());
    const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');
    const [budgetData, setBudgetData] = useState<any>(null);
    const [insights, setInsights] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [animatedValues, setAnimatedValues] = useState<Record<string, number>>({});
    const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
    const [prevStats, setPrevStats] = useState<Record<string, number>>({});
    const dateScrollRef = useRef<HTMLDivElement>(null);
    
    // Calendar states
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
    const [showEventModal, setShowEventModal] = useState(false);
    const [selectedEventDate, setSelectedEventDate] = useState<Date | null>(null);
    const [newEvent, setNewEvent] = useState({ title: '', description: '' });
    const [showDayEvents, setShowDayEvents] = useState(false);

    // Scroll date selector to center on mount
    useEffect(() => {
        if (dateScrollRef.current) {
            setTimeout(() => {
                if (dateScrollRef.current) {
                    const scrollWidth = dateScrollRef.current.scrollWidth;
                    const clientWidth = dateScrollRef.current.clientWidth;
                    dateScrollRef.current.scrollLeft = (scrollWidth - clientWidth) / 2;
                }
            }, 100);
        }
    }, []);

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

    // Generate automatic milestones based on goal - only next 3
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
        
        // Only add 3 weekly review milestones (next 3)
        for (let i = 1; i <= 3; i++) {
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
        const tasks = user.dailyTasks || [];
        
        const allCompletedTasks = tasks.filter(t => 
            t.status === TaskStatus.COMPLETED || 
            t.status === TaskStatus.APPROVED ||
            t.status === 'completed' || 
            t.status === 'approved'
        );
        
        const filterByDate = (task: any) => {
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
        
        // Calculate period credits - check multiple field names, default 25 per task
        const periodCredits = filteredTasks.reduce((sum, t) => {
            const credits = t.creditsReward || t.credits || t.reward || t.creditReward || 25;
            return sum + credits;
        }, 0);
        
        // Total credits from user state
        const totalCredits = user.credits || user.gameState?.credits || 0;
        
        // Streak calculation
        let streak = user.streak || user.gameState?.streak || 0;
        
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

        // 7-period history data
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
                credits: dayTasks.reduce((sum, t) => sum + (t.creditsReward || t.credits || t.reward || 25), 0)
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
    }, [user.dailyTasks, user.credits, user.gameState, user.streak, selectedDate, viewMode]);

    // Animate numbers when stats change
    useEffect(() => {
        const newTargets = {
            tasksCompleted: calculatedStats.tasksCompleted,
            totalCredits: calculatedStats.totalCredits,
            periodCredits: calculatedStats.periodCredits,
            streak: calculatedStats.streak,
            allTimeCompleted: calculatedStats.allTimeCompleted
        };

        const hasChanges = Object.entries(newTargets).some(
            ([key, value]) => prevStats[key] !== value
        );

        if (!hasChanges && Object.keys(prevStats).length > 0) return;
        setPrevStats(newTargets);

        Object.entries(newTargets).forEach(([key, target]) => {
            const start = animatedValues[key] ?? 0;
            const diff = target - start;
            
            if (diff === 0) {
                setAnimatedValues(prev => ({ ...prev, [key]: target }));
                return;
            }
            
            let step = 0;
            const steps = 20;
            const animate = () => {
                step++;
                const progress = step / steps;
                const eased = 1 - Math.pow(1 - progress, 3);
                const current = Math.round(start + diff * eased);
                
                setAnimatedValues(prev => ({ ...prev, [key]: current }));
                
                if (step < steps) {
                    requestAnimationFrame(() => setTimeout(animate, 30));
                } else {
                    setAnimatedValues(prev => ({ ...prev, [key]: target }));
                }
            };
            animate();
        });
    }, [calculatedStats]);

    // Generate alerts from Guide and Master Agent data
    const alerts = useMemo(() => {
        const generatedAlerts: Alert[] = [];
        const tasks = user.dailyTasks || [];
        const completedTasks = tasks.filter(t => 
            t.status === TaskStatus.COMPLETED || t.status === TaskStatus.APPROVED ||
            t.status === 'completed' || t.status === 'approved'
        );
        const credits = calculatedStats.totalCredits;
        const streak = calculatedStats.streak;
        
        const chatHistory = user.chatHistory || [];
        const agentAlerts = user.agentAlerts || [];
        const unreadAgentAlerts = agentAlerts.filter((a: any) => !a.isRead);
        
        if (!user.goal) {
            generatedAlerts.push({
                id: 'no-goal', type: 'warning', title: 'Set Your First Goal',
                message: 'The Guide recommends setting a goal to start your journey.',
                icon: Icons.Trophy, source: 'guide',
                actionLabel: 'Talk to Guide', actionView: AppView.CHAT
            });
        }
        
        if (unreadAgentAlerts.length > 0) {
            generatedAlerts.push({
                id: 'agent-alerts', type: 'danger',
                title: `${unreadAgentAlerts.length} Alert${unreadAgentAlerts.length > 1 ? 's' : ''}`,
                message: 'Requires your attention.',
                icon: Icons.AlertTriangle, source: 'agent',
                actionLabel: 'View', actionView: AppView.DASHBOARD
            });
        }
        
        if (streak > 0 && streak < 3) {
            generatedAlerts.push({
                id: 'streak-risk', type: 'warning', title: 'Keep Your Streak!',
                message: `${streak} day streak - don't break it!`,
                icon: Icons.Flame, source: 'system',
                actionLabel: 'Do Task', actionView: AppView.DASHBOARD
            });
        }
        
        if (streak >= 7) {
            generatedAlerts.push({
                id: 'streak-celebrate', type: 'success',
                title: `${streak} Day Streak!`,
                message: "Amazing consistency! Keep it up!",
                icon: Icons.Trophy, source: 'guide'
            });
        }
        
        if (credits > 0 && credits < 50) {
            generatedAlerts.push({
                id: 'low-credits', type: 'info', title: 'Low Credits',
                message: `${credits} credits left. Earn more!`,
                icon: Icons.Zap, source: 'system',
                actionLabel: 'Earn', actionView: AppView.DASHBOARD
            });
        }
        
        return generatedAlerts.filter(alert => !dismissedAlerts.includes(alert.id));
    }, [user, calculatedStats, dismissedAlerts]);

    const dismissAlert = (alertId: string) => {
        const updated = [...dismissedAlerts, alertId];
        setDismissedAlerts(updated);
        localStorage.setItem('dismissedAlerts', JSON.stringify({ date: new Date().toDateString(), alerts: updated }));
    };

    // Enhanced mock insights
    const mockInsights = useMemo(() => {
        const tasks = user.dailyTasks || [];
        const completedTasks = tasks.filter(t => 
            t.status === TaskStatus.COMPLETED || t.status === TaskStatus.APPROVED ||
            t.status === 'completed' || t.status === 'approved'
        );
        const streak = calculatedStats.streak;
        const credits = calculatedStats.totalCredits;
        
        const tasksByDay: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
        const tasksByHour: Record<number, number> = {};
        
        completedTasks.forEach(t => {
            const date = new Date(t.completedAt || t.createdAt || Date.now());
            tasksByDay[date.getDay()]++;
            const hour = date.getHours();
            tasksByHour[hour] = (tasksByHour[hour] || 0) + 1;
        });
        
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const sortedDays = Object.entries(tasksByDay).sort((a, b) => b[1] - a[1]);
        const bestDay = dayNames[parseInt(sortedDays[0][0])];
        const worstDay = dayNames[parseInt(sortedDays[sortedDays.length - 1][0])];
        
        const sortedHours = Object.entries(tasksByHour).sort((a, b) => b[1] - a[1]);
        const peakHour = sortedHours.length > 0 ? parseInt(sortedHours[0][0]) : 9;
        const peakTimeLabel = peakHour < 12 ? `${peakHour || 12}AM` : peakHour === 12 ? '12PM' : `${peakHour - 12}PM`;
        
        const weeklyScore = Math.min(100, Math.round((completedTasks.length * 8) + (streak * 6) + (credits / 8)));
        const avgTasksPerDay = completedTasks.length > 0 ? (completedTasks.length / 7).toFixed(1) : '0';
        
        let personality = 'Explorer';
        let personalityDesc = 'Just getting started on your journey';
        
        if (streak >= 14 && completedTasks.length >= 20) {
            personality = 'Champion';
            personalityDesc = 'Unstoppable force of productivity';
        } else if (streak >= 7) {
            personality = 'Warrior';
            personalityDesc = 'Consistent and determined';
        } else if (completedTasks.length >= 10) {
            personality = 'Achiever';
            personalityDesc = 'Task completion machine';
        } else if (credits >= 100) {
            personality = 'Collector';
            personalityDesc = 'Building your treasure';
        }
        
        return {
            bestDay,
            worstDay,
            peakTime: peakTimeLabel,
            weeklyScore,
            avgTasksPerDay,
            personality,
            personalityDesc,
            totalCompleted: completedTasks.length,
            prediction: streak > 3 ? Math.min(95, 60 + streak * 5) : 40,
            momentum: completedTasks.length > 5 ? 'Rising' : completedTasks.length > 0 ? 'Building' : 'Starting',
            momentumColor: completedTasks.length > 5 ? '#10B981' : completedTasks.length > 0 ? '#F59E0B' : '#6B7280',
            trend: completedTasks.length > 0 
                ? `You're most productive on ${bestDay}s`
                : "Start completing tasks to see patterns",
            improvement: completedTasks.length > 0 
                ? `+${Math.min(25, completedTasks.length * 3)}% from last week` 
                : "No data yet",
            focusArea: completedTasks.length < 5 
                ? "Getting started" 
                : streak < 3 
                    ? "Building consistency" 
                    : "Maintaining momentum"
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
                    setInsights(mockInsights);
                }
            } else {
                setInsights(mockInsights);
            }
            setIsLoading(false);
        };
        fetchData();
    }, [user.goal]);

    const hasActivity = useCallback((date: Date) => {
        const tasks = user.dailyTasks || [];
        return tasks.some(t => {
            const taskDate = new Date(t.completedAt || t.updatedAt || t.createdAt || Date.now());
            return taskDate.toDateString() === date.toDateString() && 
                (t.status === TaskStatus.COMPLETED || t.status === TaskStatus.APPROVED ||
                 t.status === 'completed' || t.status === 'approved');
        });
    }, [user.dailyTasks]);

    const getEventsForDate = useCallback((date: Date) => {
        return allEvents.filter(e => new Date(e.date).toDateString() === date.toDateString());
    }, [allEvents]);

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

    const handleDeleteEvent = (eventId: string) => {
        setCalendarEvents(prev => prev.filter(e => e.id !== eventId));
    };

    // ==================== CHART COMPONENTS ====================

    // Smooth Line Chart - proper SVG with bezier curves, NO ugly circles
    const SmoothLineChart = ({ data, color = "#4F46E5", height = 120 }: { data: number[], color?: string, height?: number }) => {
        const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
        
        if (!data || data.length === 0) {
            return <div className="flex items-center justify-center text-gray-400 text-sm h-[120px]">No activity yet</div>;
        }
        
        const max = Math.max(...data, 1);
        const min = Math.min(...data, 0);
        const range = max - min || 1;
        
        const width = 280;
        const h = 100;
        const paddingX = 10;
        const paddingY = 15;
        
        const points = data.map((val, i) => ({
            x: paddingX + (i / Math.max(data.length - 1, 1)) * (width - paddingX * 2),
            y: paddingY + (h - paddingY * 2) - ((val - min) / range) * (h - paddingY * 2),
            value: val
        }));

        // Create smooth bezier curve
        let path = `M ${points[0].x} ${points[0].y}`;
        for (let i = 1; i < points.length; i++) {
            const prev = points[i - 1];
            const curr = points[i];
            const cpx = (prev.x + curr.x) / 2;
            path += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
        }

        const areaPath = `${path} L ${points[points.length - 1].x} ${h - paddingY} L ${points[0].x} ${h - paddingY} Z`;

        return (
            <div className="relative w-full" style={{ height }}>
                <svg viewBox={`0 0 ${width} ${h}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                    <defs>
                        <linearGradient id={`areaGrad-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
                        </linearGradient>
                        <linearGradient id={`lineGrad-${color.replace('#','')}`} x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor={color} stopOpacity="0.6" />
                            <stop offset="50%" stopColor={color} stopOpacity="1" />
                            <stop offset="100%" stopColor={color} stopOpacity="0.6" />
                        </linearGradient>
                    </defs>
                    
                    {/* Grid lines */}
                    {[0, 0.5, 1].map((ratio, i) => (
                        <line key={i} x1={paddingX} y1={paddingY + (h - paddingY * 2) * ratio}
                            x2={width - paddingX} y2={paddingY + (h - paddingY * 2) * ratio}
                            stroke="#E5E7EB" strokeWidth="1" strokeDasharray="4 4" />
                    ))}
                    
                    {/* Area fill */}
                    <path d={areaPath} fill={`url(#areaGrad-${color.replace('#','')})`} />
                    
                    {/* Line */}
                    <path d={path} fill="none" stroke={`url(#lineGrad-${color.replace('#','')})`} 
                        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    
                    {/* Hover points - small, subtle */}
                    {points.map((point, i) => (
                        <g key={i}>
                            <circle cx={point.x} cy={point.y} r={hoveredIndex === i ? 6 : 4}
                                fill="white" stroke={color} strokeWidth="2"
                                className="transition-all cursor-pointer"
                                onMouseEnter={() => setHoveredIndex(i)}
                                onMouseLeave={() => setHoveredIndex(null)} />
                            {hoveredIndex === i && (
                                <g>
                                    <rect x={point.x - 18} y={point.y - 28} width="36" height="20"
                                        rx="4" fill={color} />
                                    <text x={point.x} y={point.y - 14} textAnchor="middle"
                                        fill="white" fontSize="11" fontWeight="bold">
                                        {point.value}
                                    </text>
                                </g>
                            )}
                        </g>
                    ))}
                </svg>
            </div>
        );
    };

    // Mini Progress Ring
    const MiniRing = ({ progress, size = 44, color = "#4F46E5" }: { progress: number, size?: number, color?: string }) => {
        const radius = (size - 6) / 2;
        const circumference = radius * 2 * Math.PI;
        const offset = circumference - (progress / 100) * circumference;

        return (
            <svg width={size} height={size} className="transform -rotate-90">
                <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#E5E7EB" strokeWidth="3" />
                <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth="3"
                    strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
                    className="transition-all duration-1000" />
            </svg>
        );
    };

    // ==================== RENDER FUNCTIONS ====================

    // SCROLLABLE Date Selector - 30 days back, 7 days forward
    const renderScrollableDateSelector = () => {
        const dates: Date[] = [];
        for (let i = -30; i <= 7; i++) {
            const d = new Date();
            if (viewMode === 'monthly') d.setMonth(d.getMonth() + i);
            else if (viewMode === 'weekly') d.setDate(d.getDate() + i * 7);
            else d.setDate(d.getDate() + i);
            dates.push(d);
        }
        
        return (
            <div 
                ref={dateScrollRef}
                className="flex gap-2 overflow-x-auto pb-2 px-1 -mx-1"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
            >
                <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; }`}</style>
                {dates.map((d, idx) => {
                    const isSelected = d.toDateString() === new Date(selectedDate).toDateString();
                    const isToday = d.toDateString() === new Date().toDateString();
                    const hasData = hasActivity(d);
                    const events = getEventsForDate(d);
                    
                    return (
                        <button key={idx} onClick={() => { setSelectedDate(d.getTime()); setCurrentMonth(d); }}
                            className={`flex-shrink-0 flex flex-col items-center justify-center w-12 h-16 rounded-2xl transition-all ${
                                isSelected ? 'bg-white text-primary shadow-lg scale-105' 
                                : isToday ? 'bg-white/20 text-white'
                                : 'bg-white/5 text-white/60 hover:bg-white/10'
                            }`}
                        >
                            <span className={`text-[10px] font-medium uppercase ${isSelected ? 'text-primary/60' : ''}`}>
                                {viewMode === 'monthly' 
                                    ? d.toLocaleDateString('en-US', { month: 'short' })
                                    : d.toLocaleDateString('en-US', { weekday: 'short' })}
                            </span>
                            <span className={`text-lg font-black`}>
                                {viewMode === 'monthly' ? d.getFullYear().toString().slice(-2) : d.getDate()}
                            </span>
                            <div className="flex gap-0.5 mt-0.5 h-1.5">
                                {hasData && <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-green-500' : 'bg-green-400'}`} />}
                                {events.length > 0 && <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-purple-500' : 'bg-purple-400'}`} />}
                            </div>
                        </button>
                    );
                })}
            </div>
        );
    };

    const renderViewModeToggle = () => (
        <div className="flex bg-white/10 rounded-2xl p-1 mb-4">
            {(['daily', 'weekly', 'monthly'] as const).map(mode => (
                <button key={mode} onClick={() => setViewMode(mode)}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
                        viewMode === mode ? 'bg-white text-primary shadow-sm' : 'text-white/60 hover:text-white'
                    }`}
                >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
            ))}
        </div>
    );

    // Stats Cards - NO XP/Level, using CoinIcon for gradient, Icons.Zap elsewhere
    const renderStatsCards = () => (
        <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-gradient-to-br from-primary via-primary to-indigo-600 rounded-3xl p-4 text-white shadow-lg shadow-primary/20">
                <div className="flex items-center gap-1.5 mb-2 opacity-80">
                    <Icons.CheckCircle className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wide">Tasks</span>
                </div>
                <div className="text-3xl font-black">{animatedValues.tasksCompleted ?? calculatedStats.tasksCompleted}</div>
                <div className="text-[10px] opacity-60 mt-1">
                    {viewMode === 'daily' ? 'Today' : viewMode === 'weekly' ? 'This Week' : 'This Month'}
                </div>
            </div>
            
            <div className="bg-gradient-to-br from-amber-500 via-amber-500 to-orange-500 rounded-3xl p-4 text-white shadow-lg shadow-amber-500/20">
                <div className="flex items-center gap-1.5 mb-2 opacity-80">
                    <CoinIcon className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wide">Credits</span>
                </div>
                <div className="text-3xl font-black">{animatedValues.totalCredits ?? calculatedStats.totalCredits}</div>
                <div className="text-[10px] opacity-60 mt-1">
                    {(animatedValues.periodCredits ?? calculatedStats.periodCredits) > 0 
                        ? `+${animatedValues.periodCredits ?? calculatedStats.periodCredits} earned`
                        : viewMode === 'daily' ? 'Today' : viewMode === 'weekly' ? 'This Week' : 'This Month'
                    }
                </div>
            </div>
            
            <div className="bg-gradient-to-br from-rose-500 via-red-500 to-orange-500 rounded-3xl p-4 text-white shadow-lg shadow-rose-500/20">
                <div className="flex items-center gap-1.5 mb-2 opacity-80">
                    <Icons.Flame className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wide">Streak</span>
                </div>
                <div className="text-3xl font-black">{animatedValues.streak ?? calculatedStats.streak}</div>
                <div className="text-[10px] opacity-60 mt-1">
                    {(animatedValues.streak ?? calculatedStats.streak) > 0 ? 'Days' : 'Start today!'}
                </div>
            </div>
        </div>
    );

    // Alerts Section
    const renderAlerts = () => {
        if (alerts.length === 0) return null;
        
        return (
            <div className="space-y-2 mb-6">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <Icons.Bell className="w-4 h-4 text-primary" />
                        AI Alerts
                    </h3>
                    <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {alerts.length}
                    </span>
                </div>
                {alerts.slice(0, 3).map(alert => {
                    const colors: Record<string, string> = {
                        danger: 'bg-red-50 border-red-100 text-red-700',
                        warning: 'bg-amber-50 border-amber-100 text-amber-700',
                        success: 'bg-emerald-50 border-emerald-100 text-emerald-700',
                        info: 'bg-blue-50 border-blue-100 text-blue-700'
                    };
                    const IconComponent = alert.icon;
                    
                    return (
                        <div key={alert.id} className={`${colors[alert.type]} border rounded-2xl p-3 flex items-center gap-3`}>
                            <IconComponent className="w-5 h-5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm">{alert.title}</p>
                                <p className="text-xs opacity-80 truncate">{alert.message}</p>
                            </div>
                            {alert.actionLabel && (
                                <button onClick={() => alert.actionView && setView(alert.actionView)}
                                    className="px-3 py-1.5 bg-white/80 rounded-lg text-xs font-bold flex-shrink-0">
                                    {alert.actionLabel}
                                </button>
                            )}
                            <button onClick={() => dismissAlert(alert.id)} className="p-1 hover:bg-white/50 rounded-full flex-shrink-0">
                                <Icons.X className="w-4 h-4 opacity-50" />
                            </button>
                        </div>
                    );
                })}
            </div>
        );
    };

    // Goal Progress
    const renderGoalProgress = () => {
        if (!user.goal) return null;
        
        const daysElapsed = Math.floor((Date.now() - new Date(user.goal.createdAt || Date.now()).getTime()) / (1000 * 60 * 60 * 24));
        const totalDays = user.goal.durationDays || 30;
        const progress = Math.min(100, Math.round((daysElapsed / totalDays) * 100));
        
        return (
            <div className="bg-white rounded-3xl p-5 mb-4 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center">
                        <Icons.Target className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-gray-800">{user.goal.title}</h3>
                        <p className="text-xs text-gray-500">Day {Math.min(daysElapsed, totalDays)} of {totalDays}</p>
                    </div>
                    <span className="text-2xl font-black text-primary">{progress}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary to-indigo-500 rounded-full transition-all duration-1000"
                        style={{ width: `${progress}%` }} />
                </div>
            </div>
        );
    };

    // Activity Trend - Clean smooth line chart
    const renderActivityTrend = () => {
        const labels = calculatedStats.historyData.map((d, i) => {
            if (viewMode === 'daily') return d.date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2);
            else if (viewMode === 'weekly') return `W${i + 1}`;
            else return d.date.toLocaleDateString('en-US', { month: 'short' }).slice(0, 3);
        });

        return (
            <div className="bg-white rounded-3xl p-5 mb-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center">
                            <Icons.TrendingUp className="w-4 h-4 text-primary" />
                        </div>
                        Activity Trend
                    </h3>
                    <span className="text-xs text-gray-400">Last 7 {viewMode === 'daily' ? 'days' : viewMode === 'weekly' ? 'weeks' : 'months'}</span>
                </div>
                <SmoothLineChart data={calculatedStats.historyData.map(d => d.tasks)} color="#4F46E5" height={120} />
                <div className="flex justify-between mt-2 px-2">
                    {labels.map((label, i) => (
                        <span key={i} className="text-[10px] text-gray-400 font-medium">{label}</span>
                    ))}
                </div>
            </div>
        );
    };

    // Quick Stats Row
    const renderQuickStats = () => (
        <div className="flex gap-3 mb-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
            <div className="flex-shrink-0 bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <Icons.Check className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                    <p className="text-xl font-black text-gray-800">{calculatedStats.allTimeCompleted}</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide">All Time</p>
                </div>
            </div>
            
            <div className="flex-shrink-0 bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Icons.Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                    <p className="text-xl font-black text-gray-800">{calculatedStats.totalTasks}</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide">Total Tasks</p>
                </div>
            </div>
            
            <div className="flex-shrink-0 bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                    <Icons.Zap className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                    <p className="text-xl font-black text-gray-800">{calculatedStats.periodCredits}</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide">Period Credits</p>
                </div>
            </div>
        </div>
    );

    // Mini Calendar with visible dates and borders
    const renderMiniCalendar = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startingDay = firstDay.getDay();
        const totalDays = lastDay.getDate();
        
        const days: React.ReactNode[] = [];
        const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        
        for (let i = 0; i < startingDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-9" />);
        }
        
        for (let day = 1; day <= totalDays; day++) {
            const date = new Date(year, month, day);
            const isToday = date.toDateString() === new Date().toDateString();
            const isSelected = date.toDateString() === new Date(selectedDate).toDateString();
            const dayHasActivity = hasActivity(date);
            const dayEvents = getEventsForDate(date);
            
            days.push(
                <button key={day} onClick={() => { setSelectedDate(date.getTime()); setSelectedEventDate(date); if (dayEvents.length > 0) setShowDayEvents(true); }}
                    className={`h-9 w-full rounded-lg flex items-center justify-center text-sm font-semibold relative transition-all border ${
                        isSelected ? 'bg-primary text-white border-primary' 
                        : isToday ? 'bg-primary/10 text-primary font-bold border-primary/30' 
                        : 'text-gray-700 hover:bg-gray-50 border-gray-100'
                    }`}
                >
                    {day}
                    {(dayHasActivity || dayEvents.length > 0) && !isSelected && (
                        <div className="absolute bottom-1 w-1 h-1 rounded-full bg-green-500" />
                    )}
                </button>
            );
        }
        
        return (
            <div className="bg-white rounded-3xl p-5 mb-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                    <button onClick={() => { const n = new Date(currentMonth); n.setMonth(n.getMonth() - 1); setCurrentMonth(n); }} 
                        className="p-2 hover:bg-gray-100 rounded-xl">
                        <Icons.ChevronLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <h3 className="font-bold text-gray-800 text-lg">
                        {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </h3>
                    <button onClick={() => { const n = new Date(currentMonth); n.setMonth(n.getMonth() + 1); setCurrentMonth(n); }} 
                        className="p-2 hover:bg-gray-100 rounded-xl">
                        <Icons.ChevronRight className="w-5 h-5 text-gray-600" />
                    </button>
                </div>
                
                <div className="grid grid-cols-7 gap-1 mb-2">
                    {weekDays.map(day => (
                        <div key={day} className="text-center text-[11px] font-bold text-gray-400 h-6 flex items-center justify-center">
                            {day}
                        </div>
                    ))}
                </div>
                
                <div className="grid grid-cols-7 gap-1">
                    {days}
                </div>
                
                <button onClick={() => { setSelectedEventDate(new Date(selectedDate)); setShowEventModal(true); }}
                    className="w-full mt-4 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm font-medium hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2">
                    <Icons.Plus className="w-4 h-4" /> Add Event
                </button>
            </div>
        );
    };

    // Upcoming Events - next 5
    const renderUpcomingEvents = () => {
        const now = new Date();
        const upcomingEvents = allEvents
            .filter(e => new Date(e.date) >= now)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(0, 5);

        if (upcomingEvents.length === 0) return null;

        return (
            <div className="bg-white rounded-3xl p-5 mb-4 shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Icons.Calendar className="w-5 h-5 text-primary" />
                    Upcoming Events
                </h3>
                <div className="space-y-3">
                    {upcomingEvents.map(event => {
                        const eventDate = new Date(event.date);
                        const daysUntil = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                        
                        return (
                            <div key={event.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                                    style={{ backgroundColor: `${event.color}15` }}>
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: event.color }} />
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
                                    <button onClick={() => handleDeleteEvent(event.id)} className="p-1 hover:bg-gray-200 rounded-full">
                                        <Icons.X className="w-4 h-4 text-gray-400" />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // Creative AI Insights - at bottom
    const renderAIInsights = () => {
        const currentInsights = insights || mockInsights;
        
        return (
            <div className="mb-4">
                {/* Personality Card */}
                <div className="bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 rounded-3xl p-5 mb-4 text-white shadow-lg shadow-purple-500/20">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <p className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1">Your Profile</p>
                            <h3 className="text-2xl font-black">{currentInsights.personality}</h3>
                            <p className="text-white/70 text-sm mt-1">{currentInsights.personalityDesc}</p>
                        </div>
                        <div className="relative">
                            <MiniRing progress={currentInsights.weeklyScore} size={56} color="white" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-sm font-black">{currentInsights.weeklyScore}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white/10 backdrop-blur rounded-2xl p-3 text-center">
                            <p className="text-2xl font-black">{currentInsights.totalCompleted}</p>
                            <p className="text-[10px] text-white/60 uppercase tracking-wider">Completed</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur rounded-2xl p-3 text-center">
                            <p className="text-2xl font-black">{currentInsights.avgTasksPerDay}</p>
                            <p className="text-[10px] text-white/60 uppercase tracking-wider">Per Day</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur rounded-2xl p-3 text-center">
                            <p className="text-2xl font-black">{currentInsights.prediction}%</p>
                            <p className="text-[10px] text-white/60 uppercase tracking-wider">Success</p>
                        </div>
                    </div>
                </div>

                {/* Insights Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center">
                                <Icons.TrendingUp className="w-4 h-4 text-emerald-600" />
                            </div>
                            <span className="text-xs text-gray-500 font-medium">Best Day</span>
                        </div>
                        <p className="text-lg font-black text-gray-800">{currentInsights.bestDay}</p>
                    </div>
                    
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center">
                                <Icons.Clock className="w-4 h-4 text-amber-600" />
                            </div>
                            <span className="text-xs text-gray-500 font-medium">Peak Time</span>
                        </div>
                        <p className="text-lg font-black text-gray-800">{currentInsights.peakTime}</p>
                    </div>
                    
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
                                <Icons.Activity className="w-4 h-4 text-blue-600" />
                            </div>
                            <span className="text-xs text-gray-500 font-medium">Momentum</span>
                        </div>
                        <p className="text-lg font-black" style={{ color: currentInsights.momentumColor }}>
                            {currentInsights.momentum}
                        </p>
                    </div>
                    
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 bg-rose-100 rounded-xl flex items-center justify-center">
                                <Icons.Target className="w-4 h-4 text-rose-600" />
                            </div>
                            <span className="text-xs text-gray-500 font-medium">Focus On</span>
                        </div>
                        <p className="text-lg font-black text-gray-800">{currentInsights.worstDay}</p>
                    </div>
                </div>
            </div>
        );
    };

    // ==================== MAIN RENDER ====================

    return (
        <div className="h-full flex flex-col bg-[#F7F8FC]">
            {/* Fixed Header */}
            <div className="flex-shrink-0 bg-gradient-to-br from-[#171738] via-[#1e1e4a] to-[#2a2a5c] text-white px-5 pt-safe pb-4">
                <div className="flex items-center justify-between pt-4 mb-4">
                    <h1 className="text-xl font-black">Analytics</h1>
                    <button onClick={() => setView(AppView.DASHBOARD)}
                        className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-all">
                        <Icons.X className="w-5 h-5" />
                    </button>
                </div>
                
                {renderViewModeToggle()}
                {renderScrollableDateSelector()}
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-5 pt-6 pb-24">
                {/* 1. Stats Cards */}
                {renderStatsCards()}

                {/* 2. AI Alerts */}
                {renderAlerts()}

                {/* 3. Goal Progress */}
                {renderGoalProgress()}

                {/* 4. Activity Trend */}
                {renderActivityTrend()}

                {/* 5. Quick Stats */}
                {renderQuickStats()}

                {/* 6. Calendar */}
                {renderMiniCalendar()}

                {/* 7. Upcoming Events */}
                {renderUpcomingEvents()}

                {/* 8. AI Insights (Bottom) */}
                {renderAIInsights()}
            </div>

            {/* Add Event Modal */}
            {showEventModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-5">
                    <div className="bg-white rounded-3xl w-full max-w-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-800 text-lg">Add Event</h3>
                            <button onClick={() => setShowEventModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                <Icons.X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            <p className="text-sm text-gray-500">
                                Date: {selectedEventDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                            </p>
                            
                            <input type="text" placeholder="Event title" value={newEvent.title}
                                onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-primary text-gray-800" />
                            
                            <textarea placeholder="Description (optional)" value={newEvent.description}
                                onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-primary text-gray-800 resize-none"
                                rows={3} />
                            
                            <button onClick={handleAddEvent} disabled={!newEvent.title.trim()}
                                className="w-full py-3 bg-primary text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed">
                                Add Event
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Day Events Modal */}
            {showDayEvents && selectedEventDate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-5">
                    <div className="bg-white rounded-3xl w-full max-w-sm p-6 max-h-[80vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-800 text-lg">
                                {selectedEventDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                            </h3>
                            <button onClick={() => setShowDayEvents(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                <Icons.X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>
                        
                        <div className="space-y-3">
                            {getEventsForDate(selectedEventDate).map(event => (
                                <div key={event.id} className="p-4 rounded-xl border"
                                    style={{ borderColor: event.color, backgroundColor: `${event.color}10` }}>
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded"
                                                style={{ backgroundColor: event.color, color: 'white' }}>
                                                {event.type}
                                            </span>
                                            <h4 className="font-bold text-gray-800 mt-2">{event.title}</h4>
                                            {event.description && (
                                                <p className="text-sm text-gray-500 mt-1">{event.description}</p>
                                            )}
                                        </div>
                                        {event.type === 'custom' && (
                                            <button onClick={() => handleDeleteEvent(event.id)} className="p-1 hover:bg-white rounded-full">
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
                        
                        <button onClick={() => { setShowDayEvents(false); setShowEventModal(true); }}
                            className="w-full mt-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 text-sm font-medium hover:border-primary hover:text-primary transition-colors">
                            + Add Event
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
