// views/StatsView.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { AppView } from '../types';
import { Icons, Card, CoinIcon } from '../components/UIComponents';
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

// SVG Icons for Connected Apps
const AppIcons = {
    Shopify: (props: any) => (
        <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
            <path d="M15.337 3.415c-.022-.165-.173-.247-.288-.258-.115-.011-2.455-.066-2.455-.066s-1.634-1.629-1.804-1.799c-.17-.17-.503-.119-.632-.082-.003.001-.264.081-.674.208-.402-1.159-1.11-2.223-2.358-2.223-.034 0-.069.001-.104.003C6.582-.246 6.065.11 5.607.658 4.47 1.969 3.794 4.012 3.556 5.415c-1.459.452-2.482.768-2.61.808-.814.251-.839.276-.946 1.042C-.106 8.16 0 19.482 0 19.482l14.463 2.518.915-18.585zM9.958 4.159V4.03c0-.162-.005-.313-.014-.455-.503.156-.988.306-1.439.446.278-1.07.801-2.127 1.44-2.631.259-.204.552-.317.869-.338.359.683.578 1.654.578 2.994 0 .037 0 .075-.001.113h-.019c-.469.001-.955 0-1.414 0zm1.427-.066c.003-.126.005-.248.005-.366 0-1.118-.156-2.013-.419-2.68.52.077.946.474 1.258 1.079.298.577.478 1.292.527 2.154-.461-.063-.921-.127-1.371-.187zm1.427.203c.006.001-.427.068-.427.068V4.03c0-.162.005-.314.015-.457-.153-.017-.305-.033-.457-.049.076-.922.299-1.701.633-2.295.131-.234.285-.428.456-.571.485.747.751 1.855.751 3.342 0 .067-.001.134-.003.201-.322.029-.645.059-.968.095z"/>
        </svg>
    ),
    TikTok: (props: any) => (
        <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
        </svg>
    ),
    Instagram: (props: any) => (
        <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
        </svg>
    ),
    Google: (props: any) => (
        <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
    ),
    Meta: (props: any) => (
        <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
            <path d="M12 2.04c-5.5 0-10 4.49-10 10.02 0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.23.19 2.23.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33v7a10 10 0 0 0 8.44-9.9c0-5.53-4.5-10.02-10-10.02z"/>
        </svg>
    )
};

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
    
    // Scrollable calendar ref
    const calendarStripRef = useRef<HTMLDivElement>(null);
    const [calendarDays, setCalendarDays] = useState<Date[]>([]);
    const [hasScrolledToCenter, setHasScrolledToCenter] = useState(false);

    // Generate calendar days (30 days before and after today)
    useEffect(() => {
        const days: Date[] = [];
        const today = new Date();
        for (let i = -30; i <= 30; i++) {
            const d = new Date(today);
            if (viewMode === 'monthly') {
                d.setMonth(d.getMonth() + i);
            } else if (viewMode === 'weekly') {
                d.setDate(d.getDate() + i * 7);
            } else {
                d.setDate(d.getDate() + i);
            }
            days.push(d);
        }
        setCalendarDays(days);
        setHasScrolledToCenter(false);
    }, [viewMode]);

    // Scroll to center (today) on mount and when days change
    useEffect(() => {
        if (calendarStripRef.current && calendarDays.length > 0 && !hasScrolledToCenter) {
            const container = calendarStripRef.current;
            const centerIndex = 30; // Today is at index 30
            const itemWidth = 46; // Width of each day button + gap
            const scrollPosition = centerIndex * itemWidth - container.clientWidth / 2 + itemWidth / 2;
            
            // Use setTimeout to ensure DOM is ready
            setTimeout(() => {
                container.scrollLeft = scrollPosition;
                setHasScrolledToCenter(true);
            }, 50);
        }
    }, [calendarDays, hasScrolledToCenter]);

    // Handle scroll to change selected date
    const handleCalendarScroll = useCallback(() => {
        if (!calendarStripRef.current || !hasScrolledToCenter) return;
        const container = calendarStripRef.current;
        const itemWidth = 46;
        const centerOffset = container.scrollLeft + container.clientWidth / 2;
        const centerIndex = Math.round(centerOffset / itemWidth);
        
        if (calendarDays[centerIndex]) {
            const newDate = calendarDays[centerIndex].getTime();
            if (Math.abs(newDate - selectedDate) > 1000 * 60 * 60) {
                setSelectedDate(newDate);
                setCurrentMonth(calendarDays[centerIndex]);
            }
        }
    }, [calendarDays, selectedDate, hasScrolledToCenter]);

    // Load dismissed alerts
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

    // Load calendar events
    useEffect(() => {
        const savedEvents = localStorage.getItem('statsCalendarEvents');
        if (savedEvents) {
            try {
                setCalendarEvents(JSON.parse(savedEvents));
            } catch (e) {}
        }
    }, []);

    // Save calendar events
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
        
        return [...calendarEvents, ...autoMilestones];
    }, [calendarEvents, user.goal]);

    // REAL-TIME calculated stats
    const calculatedStats = useMemo(() => {
        const now = new Date(selectedDate);
        const dailyTasks = user.dailyTasks || [];
        const goalTasks = user.goal?.savedTasks || [];
        const allGoalsTasks = (user.allGoals || []).flatMap(g => g.savedTasks || []);
        const tasks = [...dailyTasks, ...goalTasks, ...allGoalsTasks];
        
        const uniqueTasks = tasks.filter((task, index, self) => 
            index === self.findIndex(t => t.id === task.id)
        );
        
        const allCompletedTasks = uniqueTasks.filter(t => 
            t.status === 'completed' || t.status === 'approved'
        );
        
        const filterByDate = (task: any) => {
            const taskDate = new Date(task.completedAt || task.lastUpdated || task.createdAt || Date.now());
            
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
        const periodCredits = filteredTasks.reduce((sum, t) => sum + (t.creditsReward || t.credits || t.reward || 0), 0);
        const totalCredits = user.credits || 0;
        const streak = user.streak || 0;
        const longestStreak = user.longestStreak || 0;

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
                const taskDate = new Date(t.completedAt || t.lastUpdated || t.createdAt || Date.now());
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
            longestStreak,
            historyData,
            totalTasks: uniqueTasks.length,
            allTimeCompleted: allCompletedTasks.length,
            realMoneyBalance: user.realMoneyBalance || 0,
            totalAdsWatched: user.totalAdsWatched || 0,
            dailyAdCount: user.dailyAdCount || 0,
            adsRemaining: Math.max(0, 25 - (user.dailyAdCount || 0)),
            currentDay: user.currentDay || 1
        };
    }, [user, selectedDate, viewMode]);

    // Animate numbers
    useEffect(() => {
        const newTargets = {
            tasksCompleted: calculatedStats.tasksCompleted,
            totalCredits: calculatedStats.totalCredits,
            periodCredits: calculatedStats.periodCredits,
            streak: calculatedStats.streak,
            allTimeCompleted: calculatedStats.allTimeCompleted
        };

        const hasChanges = Object.entries(newTargets).some(([key, value]) => prevStats[key] !== value);
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

    // Generate alerts
    const alerts = useMemo(() => {
        const generatedAlerts: Alert[] = [];
        const dailyTasks = user.dailyTasks || [];
        const completedTasks = dailyTasks.filter(t => t.status === 'completed' || t.status === 'approved');
        const credits = calculatedStats.totalCredits;
        const streak = calculatedStats.streak;
        
        const guideConversations = user.guideConversations || [];
        const lastGuideConversation = guideConversations[guideConversations.length - 1];
        const lastMessage = lastGuideConversation?.messages?.[lastGuideConversation.messages.length - 1];
        const aiActionLogs = user.aiActionLogs || [];
        const failedAgentTasks = aiActionLogs.filter((t: any) => t.status === 'failed');
        
        const lastConversationDate = lastMessage?.timestamp ? new Date(lastMessage.timestamp) : null;
        const daysSinceLastConversation = lastConversationDate ? Math.floor((Date.now() - lastConversationDate.getTime()) / (1000 * 60 * 60 * 24)) : 999;
        
        if (daysSinceLastConversation > 2 && guideConversations.length > 0) {
            generatedAlerts.push({
                id: 'guide-inactive', type: 'info', title: 'Check in with The Guide',
                message: `It's been ${daysSinceLastConversation} days since your last conversation.`,
                icon: Icons.MessageCircle, source: 'guide', actionLabel: 'Open Guide', actionView: AppView.CHAT
            });
        }
        
        if (!user.goal) {
            generatedAlerts.push({
                id: 'no-goal', type: 'warning', title: 'Set Your First Goal',
                message: 'The Guide recommends setting a goal to start your journey.',
                icon: Icons.Trophy, source: 'guide', actionLabel: 'Talk to Guide', actionView: AppView.CHAT
            });
        }
        
        if (failedAgentTasks.length > 0) {
            generatedAlerts.push({
                id: 'agent-failed', type: 'danger', title: `${failedAgentTasks.length} Automation Failed`,
                message: 'Some Master Agent tasks encountered errors.',
                icon: Icons.AlertTriangle, source: 'agent', actionLabel: 'View Details', actionView: AppView.DASHBOARD
            });
        }
        
        if (streak > 0 && streak < 3) {
            generatedAlerts.push({
                id: 'streak-risk', type: 'warning', title: 'Streak at Risk',
                message: `Your ${streak}-day streak needs attention!`,
                icon: Icons.Flame, source: 'system', actionLabel: 'View Tasks', actionView: AppView.DASHBOARD
            });
        }
        
        if (credits > 0 && credits < 50) {
            generatedAlerts.push({
                id: 'low-credits', type: 'info', title: 'Low on Credits',
                message: `Only ${credits} credits remaining.`,
                icon: Icons.Coins, source: 'system', actionLabel: 'Earn More', actionView: AppView.DASHBOARD
            });
        }
        
        if (streak >= 7) {
            generatedAlerts.push({
                id: 'streak-celebrate', type: 'success', title: `${streak} Day Streak!`,
                message: "Amazing consistency!", icon: Icons.Trophy, source: 'guide'
            });
        }
        
        return generatedAlerts.filter(alert => !dismissedAlerts.includes(alert.id));
    }, [user, calculatedStats, dismissedAlerts]);

    const dismissAlert = (alertId: string) => {
        const updated = [...dismissedAlerts, alertId];
        setDismissedAlerts(updated);
        localStorage.setItem('dismissedAlerts', JSON.stringify({ date: new Date().toDateString(), alerts: updated }));
    };

    // Mock insights
    const mockInsights = useMemo(() => {
        const dailyTasks = user.dailyTasks || [];
        const completedTasks = dailyTasks.filter(t => t.status === 'completed' || t.status === 'approved');
        const streak = calculatedStats.streak;
        const credits = calculatedStats.totalCredits;
        
        const tasksByDay: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
        completedTasks.forEach(t => {
            const day = new Date(t.completedAt || t.lastUpdated || Date.now()).getDay();
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
            prediction: streak > 3 ? `${Math.min(95, 60 + streak * 5)}% likely to maintain your streak` : "Build a streak to improve prediction",
            focusArea: completedTasks.length < 5 ? "Getting started" : streak < 3 ? "Building consistency" : "Maintaining momentum",
            weeklyScore,
            improvement: completedTasks.length > 0 ? `+${Math.min(25, completedTasks.length * 3)}% from last week` : "No data yet",
            topStrength: streak > 5 ? "Consistency" : completedTasks.length > 10 ? "Task completion" : "Getting started"
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
    }, [user, mockInsights]);

    const hasActivity = useCallback((date: Date) => {
        const dailyTasks = user.dailyTasks || [];
        return dailyTasks.some(t => {
            const taskDate = new Date(t.completedAt || t.lastUpdated || Date.now());
            return taskDate.toDateString() === date.toDateString() && (t.status === 'completed' || t.status === 'approved');
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

    // Default connected apps data with SVG icons
    const connectedAppsData = useMemo(() => {
        const apps = user.connectedApps || [];
        
        const defaultApps = [
            {
                id: 'shopify',
                name: 'Shopify',
                Icon: AppIcons.Shopify,
                isConnected: false,
                color: '#96BF48',
                metrics: [
                    { id: 'revenue', name: 'Revenue', value: 0, unit: '$', change: 0, history: [0, 0, 0, 0, 0, 0, 0] },
                    { id: 'orders', name: 'Orders', value: 0, unit: '', change: 0, history: [0, 0, 0, 0, 0, 0, 0] },
                    { id: 'visitors', name: 'Visitors', value: 0, unit: '', change: 0, history: [0, 0, 0, 0, 0, 0, 0] },
                    { id: 'conversion', name: 'Conversion', value: 0, unit: '%', change: 0, history: [0, 0, 0, 0, 0, 0, 0] }
                ]
            },
            {
                id: 'tiktok',
                name: 'TikTok',
                Icon: AppIcons.TikTok,
                isConnected: false,
                color: '#000000',
                metrics: [
                    { id: 'views', name: 'Views', value: 0, unit: '', change: 0, history: [0, 0, 0, 0, 0, 0, 0] },
                    { id: 'followers', name: 'Followers', value: 0, unit: '', change: 0, history: [0, 0, 0, 0, 0, 0, 0] },
                    { id: 'likes', name: 'Likes', value: 0, unit: '', change: 0, history: [0, 0, 0, 0, 0, 0, 0] },
                    { id: 'engagement', name: 'Engagement', value: 0, unit: '%', change: 0, history: [0, 0, 0, 0, 0, 0, 0] }
                ]
            },
            {
                id: 'instagram',
                name: 'Instagram',
                Icon: AppIcons.Instagram,
                isConnected: false,
                color: '#E1306C',
                metrics: [
                    { id: 'reach', name: 'Reach', value: 0, unit: '', change: 0, history: [0, 0, 0, 0, 0, 0, 0] },
                    { id: 'followers', name: 'Followers', value: 0, unit: '', change: 0, history: [0, 0, 0, 0, 0, 0, 0] },
                    { id: 'engagement', name: 'Engagement', value: 0, unit: '%', change: 0, history: [0, 0, 0, 0, 0, 0, 0] },
                    { id: 'posts', name: 'Posts', value: 0, unit: '', change: 0, history: [0, 0, 0, 0, 0, 0, 0] }
                ]
            },
            {
                id: 'google',
                name: 'Google Ads',
                Icon: AppIcons.Google,
                isConnected: false,
                color: '#4285F4',
                metrics: [
                    { id: 'spend', name: 'Spend', value: 0, unit: '$', change: 0, history: [0, 0, 0, 0, 0, 0, 0] },
                    { id: 'clicks', name: 'Clicks', value: 0, unit: '', change: 0, history: [0, 0, 0, 0, 0, 0, 0] },
                    { id: 'impressions', name: 'Impressions', value: 0, unit: '', change: 0, history: [0, 0, 0, 0, 0, 0, 0] },
                    { id: 'roas', name: 'ROAS', value: 0, unit: 'x', change: 0, history: [0, 0, 0, 0, 0, 0, 0] }
                ]
            }
        ];

        return defaultApps.map(defaultApp => {
            const actualApp = apps.find(a => a.id === defaultApp.id || a.name?.toLowerCase() === defaultApp.name.toLowerCase());
            if (actualApp?.isConnected) {
                return { ...defaultApp, ...actualApp, isConnected: true };
            }
            return defaultApp;
        });
    }, [user.connectedApps]);

    // Chart Components
    const LineChart = ({ data, color = "#4F46E5", height = 100, labels = [], showArea = true, showPoints = true }: { 
        data: number[], color?: string, height?: number, labels?: string[], showArea?: boolean, showPoints?: boolean 
    }) => {
        const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
        if (!data || data.length === 0) return <div className="flex items-center justify-center text-gray-400 text-sm" style={{ height }}>No data</div>;
        
        const max = Math.max(...data, 1);
        const min = Math.min(...data, 0);
        const range = max - min || 1;
        const width = 300, chartHeight = 80, paddingX = 10, paddingY = 10;
        
        const points = data.map((val, i) => ({
            x: paddingX + (data.length > 1 ? (i / (data.length - 1)) * (width - paddingX * 2) : (width - paddingX * 2) / 2),
            y: paddingY + (chartHeight - paddingY * 2) - (((val - min) / range) * (chartHeight - paddingY * 2)),
            value: val
        }));

        const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
        const areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z`;

        return (
            <div className="relative w-full">
                <svg viewBox={`0 0 ${width} ${chartHeight}`} className="w-full" style={{ height }} preserveAspectRatio="none">
                    <defs>
                        <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
                        </linearGradient>
                    </defs>
                    {showArea && <path d={areaPath} fill={`url(#gradient-${color.replace('#', '')})`} />}
                    <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    {showPoints && points.map((point, i) => (
                        <g key={i}>
                            <circle cx={point.x} cy={point.y} r={hoveredPoint === i ? 6 : 4} fill="white" stroke={color} strokeWidth="2"
                                className="transition-all cursor-pointer" onMouseEnter={() => setHoveredPoint(i)} onMouseLeave={() => setHoveredPoint(null)} />
                            {hoveredPoint === i && (
                                <g>
                                    <rect x={point.x - 18} y={point.y - 26} width="36" height="18" rx="4" fill={color} />
                                    <text x={point.x} y={point.y - 13} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">{point.value}</text>
                                </g>
                            )}
                        </g>
                    ))}
                </svg>
                {labels.length > 0 && <div className="flex justify-between px-2 mt-1">{labels.map((label, i) => <span key={i} className="text-[9px] text-gray-400">{label}</span>)}</div>}
            </div>
        );
    };

    const MiniSparkline = ({ data, color = "#4F46E5", height = 32 }: { data: number[], color?: string, height?: number }) => {
        if (!data || data.length === 0) return null;
        const max = Math.max(...data, 1);
        const min = Math.min(...data, 0);
        const range = max - min || 1;
        const width = 60;
        
        const points = data.map((val, i) => ({
            x: (i / (data.length - 1)) * width,
            y: height - 4 - (((val - min) / range) * (height - 8))
        }));

        const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

        return (
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
                <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        );
    };

    const BarChart = ({ data, height = 120 }: { data: { label: string; value: number; color?: string }[], height?: number }) => {
        const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
        const max = Math.max(...data.map(d => d.value), 1);

        return (
            <div className="flex items-end justify-between gap-1" style={{ height }}>
                {data.map((item, i) => {
                    const barHeight = (item.value / max) * 100;
                    return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1" onMouseEnter={() => setHoveredIndex(i)} onMouseLeave={() => setHoveredIndex(null)}>
                            <div className="relative w-full flex justify-center">
                                {hoveredIndex === i && <div className="absolute -top-6 bg-gray-800 text-white text-[10px] px-1.5 py-0.5 rounded z-10">{item.value}</div>}
                                <div className="w-full max-w-[28px] rounded-t transition-all cursor-pointer"
                                    style={{ height: `${barHeight}%`, minHeight: 4, backgroundColor: item.color || '#4F46E5', opacity: hoveredIndex === i ? 1 : 0.7 }} />
                            </div>
                            <span className="text-[9px] text-gray-400">{item.label}</span>
                        </div>
                    );
                })}
            </div>
        );
    };

    const ProgressRing = ({ progress, size = 80, strokeWidth = 8, color = "#4F46E5", label, value }: { progress: number, size?: number, strokeWidth?: number, color?: string, label?: string, value?: string | number }) => {
        const radius = (size - strokeWidth) / 2;
        const circumference = radius * 2 * Math.PI;
        const offset = circumference - (progress / 100) * circumference;

        return (
            <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
                <svg className="transform -rotate-90" width={size} height={size}>
                    <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#F3F4F6" strokeWidth={strokeWidth} />
                    <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
                        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    {value !== undefined && <span className="text-base font-black text-gray-800">{value}</span>}
                    {label && <span className="text-[9px] text-gray-500">{label}</span>}
                </div>
            </div>
        );
    };

    // Scrollable Calendar Strip - starts centered on today
    const renderCalendarStrip = () => {
        const isToday = (date: Date) => date.toDateString() === new Date().toDateString();
        const isSelected = (date: Date) => date.toDateString() === new Date(selectedDate).toDateString();

        return (
            <div 
                ref={calendarStripRef}
                onScroll={handleCalendarScroll}
                className="flex gap-2 overflow-x-auto scrollbar-hide py-1 px-4"
                style={{ scrollBehavior: 'smooth' }}
            >
                {calendarDays.map((d, i) => {
                    const selected = isSelected(d);
                    const today = isToday(d);
                    const hasData = hasActivity(d);
                    const events = getEventsForDate(d);
                    
                    return (
                        <button 
                            key={i} 
                            onClick={() => { setSelectedDate(d.getTime()); setCurrentMonth(d); }}
                            className={`flex flex-col items-center justify-center min-w-[44px] w-11 h-14 rounded-xl transition-all flex-shrink-0 ${
                                selected 
                                    ? 'bg-primary text-white shadow-lg' 
                                    : today 
                                        ? 'bg-primary/10 text-primary' 
                                        : 'bg-white text-gray-600 border border-gray-200'
                            }`}
                        >
                            <span className={`text-[9px] font-bold uppercase ${selected ? 'text-white/70' : today ? 'text-primary/70' : 'text-gray-400'}`}>
                                {viewMode === 'monthly' 
                                    ? d.toLocaleDateString('en-US', { month: 'short' }).slice(0, 3) 
                                    : d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2)
                                }
                            </span>
                            <span className="text-base font-black">
                                {viewMode === 'monthly' ? d.getFullYear().toString().slice(-2) : d.getDate()}
                            </span>
                            <div className="flex gap-0.5 h-1.5">
                                {hasData && <div className={`w-1 h-1 rounded-full ${selected ? 'bg-white' : 'bg-emerald-500'}`}></div>}
                                {events.length > 0 && <div className={`w-1 h-1 rounded-full ${selected ? 'bg-white/60' : 'bg-violet-500'}`}></div>}
                            </div>
                        </button>
                    );
                })}
            </div>
        );
    };

    const renderFullCalendar = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startingDay = firstDay.getDay();
        const totalDays = lastDay.getDate();
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        
        const days = [];
        const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        
        for (let i = startingDay - 1; i >= 0; i--) days.push(<div key={`prev-${i}`} className="h-9 flex items-center justify-center text-gray-300 text-xs">{prevMonthLastDay - i}</div>);
        
        for (let day = 1; day <= totalDays; day++) {
            const date = new Date(year, month, day);
            const isToday = date.toDateString() === new Date().toDateString();
            const isSelectedDay = date.toDateString() === new Date(selectedDate).toDateString();
            const dayHasActivity = hasActivity(date);
            const dayEvents = getEventsForDate(date);
            
            days.push(
                <button key={day} onClick={() => { setSelectedDate(date.getTime()); setSelectedEventDate(date); if (dayEvents.length > 0) setShowDayEvents(true); }}
                    className={`h-9 rounded-lg flex flex-col items-center justify-center relative transition-all ${
                        isSelectedDay ? 'bg-primary text-white' : isToday ? 'bg-primary/10 text-primary font-bold' : 'text-gray-700 hover:bg-gray-50'
                    }`}>
                    <span className="text-xs font-semibold">{day}</span>
                    {(dayHasActivity || dayEvents.length > 0) && (
                        <div className="flex gap-0.5 absolute bottom-0.5">
                            {dayHasActivity && <div className={`w-1 h-1 rounded-full ${isSelectedDay ? 'bg-white' : 'bg-emerald-500'}`}></div>}
                            {dayEvents.length > 0 && <div className={`w-1 h-1 rounded-full ${isSelectedDay ? 'bg-white/60' : 'bg-violet-500'}`}></div>}
                        </div>
                    )}
                </button>
            );
        }
        
        const remainingDays = 42 - days.length;
        for (let i = 1; i <= remainingDays; i++) days.push(<div key={`next-${i}`} className="h-9 flex items-center justify-center text-gray-300 text-xs">{i}</div>);
        
        return (
            <Card className="p-4 bg-white border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                    <button onClick={() => { const n = new Date(currentMonth); n.setMonth(n.getMonth() - 1); setCurrentMonth(n); }} className="p-1.5 hover:bg-gray-100 rounded-full">
                        <Icons.ChevronLeft className="w-4 h-4 text-gray-500" />
                    </button>
                    <h3 className="font-bold text-gray-800 text-sm">{currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
                    <button onClick={() => { const n = new Date(currentMonth); n.setMonth(n.getMonth() + 1); setCurrentMonth(n); }} className="p-1.5 hover:bg-gray-100 rounded-full">
                        <Icons.ChevronRight className="w-4 h-4 text-gray-500" />
                    </button>
                </div>
                <div className="grid grid-cols-7 gap-0.5 mb-1">{weekDays.map(day => <div key={day} className="text-center text-[10px] font-bold text-gray-400 py-1">{day}</div>)}</div>
                <div className="grid grid-cols-7 gap-0.5">{days}</div>
                <button onClick={() => { setSelectedEventDate(new Date(selectedDate)); setShowEventModal(true); }} className="w-full mt-4 py-2.5 border border-dashed border-gray-300 rounded-xl text-gray-400 text-xs font-medium hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1">
                    <Icons.Plus className="w-3 h-3" /> Add Event
                </button>
            </Card>
        );
    };

    const renderViewModeToggle = () => (
        <div className="flex bg-gray-100 rounded-full p-0.5">
            {(['daily', 'weekly', 'monthly'] as const).map(mode => (
                <button key={mode} onClick={() => setViewMode(mode)}
                    className={`flex-1 py-1.5 px-3 rounded-full text-[10px] font-bold transition-all ${viewMode === mode ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
            ))}
        </div>
    );

    // Stats Cards
    const renderStatsCards = () => (
        <div className="grid grid-cols-3 gap-3">
            <Card className="p-3 bg-gradient-to-br from-primary to-primary/80 text-white border-none shadow-sm">
                <div className="flex items-center gap-1 mb-0.5">
                    <Icons.Check className="w-3 h-3 text-white/60" />
                    <span className="text-[8px] font-bold uppercase text-white/60">Tasks</span>
                </div>
                <div className="text-xl font-black">{animatedValues.tasksCompleted ?? calculatedStats.tasksCompleted}</div>
                <div className="text-[9px] text-white/60">{viewMode === 'daily' ? 'Today' : viewMode === 'weekly' ? 'Week' : 'Month'}</div>
            </Card>
            
            <Card className="p-3 bg-gradient-to-br from-amber-500 to-amber-400 text-white border-none shadow-sm">
                <div className="flex items-center gap-1 mb-0.5">
                    <CoinIcon className="w-3 h-3 opacity-60" />
                    <span className="text-[8px] font-bold uppercase text-white/60">Credits</span>
                </div>
                <div className="text-xl font-black">{animatedValues.totalCredits ?? calculatedStats.totalCredits}</div>
                <div className="text-[9px] text-white/60">+{animatedValues.periodCredits ?? calculatedStats.periodCredits}</div>
            </Card>
            
            <Card className="p-3 bg-gradient-to-br from-red-500 to-orange-400 text-white border-none shadow-sm">
                <div className="flex items-center gap-1 mb-0.5">
                    <Icons.Flame className="w-3 h-3 text-white/60" />
                    <span className="text-[8px] font-bold uppercase text-white/60">Streak</span>
                </div>
                <div className="text-xl font-black">{animatedValues.streak ?? calculatedStats.streak}</div>
                <div className="text-[9px] text-white/60">Best: {calculatedStats.longestStreak}</div>
            </Card>
        </div>
    );

    const renderAlerts = () => {
        if (alerts.length === 0) return null;
        
        const getAlertStyles = (type: string) => {
            switch (type) {
                case 'danger': return { bg: 'bg-red-50', border: 'border-red-200', icon: 'bg-red-100 text-red-600', title: 'text-red-800', message: 'text-red-600', button: 'bg-red-600 text-white' };
                case 'warning': return { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'bg-amber-100 text-amber-600', title: 'text-amber-800', message: 'text-amber-600', button: 'bg-amber-600 text-white' };
                case 'success': return { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'bg-emerald-100 text-emerald-600', title: 'text-emerald-800', message: 'text-emerald-600', button: 'bg-emerald-600 text-white' };
                default: return { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'bg-blue-100 text-blue-600', title: 'text-blue-800', message: 'text-blue-600', button: 'bg-blue-600 text-white' };
            }
        };
        
        return (
            <div className="space-y-3">
                {alerts.slice(0, 2).map(alert => {
                    const styles = getAlertStyles(alert.type);
                    const IconComponent = alert.icon;
                    return (
                        <div key={alert.id} className={`${styles.bg} border ${styles.border} rounded-xl p-3 relative`}>
                            <button onClick={() => dismissAlert(alert.id)} className="absolute top-2 right-2 p-0.5 hover:bg-black/5 rounded-full"><Icons.X className="w-3 h-3 text-gray-400" /></button>
                            <div className="flex gap-2 items-start">
                                <div className={`${styles.icon} p-1.5 rounded-lg flex-shrink-0`}><IconComponent className="w-4 h-4" /></div>
                                <div className="flex-1 pr-4">
                                    <h4 className={`${styles.title} font-bold text-xs`}>{alert.title}</h4>
                                    <p className={`${styles.message} text-[10px]`}>{alert.message}</p>
                                    {alert.actionLabel && (
                                        <button className={`${styles.button} mt-2 px-2 py-1 rounded text-[10px] font-bold`} onClick={() => { dismissAlert(alert.id); if (alert.actionView) setView(alert.actionView); }}>
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

    const renderGoalProgress = () => {
        if (!user.goal) return null;
        const daysElapsed = user.goal.createdAt ? Math.floor((Date.now() - new Date(user.goal.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0;
        const totalDays = user.goal.durationDays || 30;
        const progress = Math.min((daysElapsed / totalDays) * 100, 100);

        return (
            <Card className="p-4 bg-white border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-gray-800 text-sm flex items-center gap-1.5"><Icons.Trophy className="w-4 h-4 text-primary" />Goal Progress</h3>
                    <span className="text-[10px] text-gray-400">Day {calculatedStats.currentDay}/{totalDays}</span>
                </div>
                <div className="flex items-center gap-4">
                    <ProgressRing progress={progress} size={70} strokeWidth={8} color="#4F46E5" value={`${Math.round(progress)}%`} />
                    <div className="flex-1">
                        <h4 className="font-bold text-gray-800 text-sm mb-0.5 line-clamp-1">{user.goal.title}</h4>
                        <p className="text-[10px] text-gray-400 mb-2">{user.goal.category}</p>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div className="bg-primary h-1.5 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
                        </div>
                    </div>
                </div>
            </Card>
        );
    };

    // UPGRADED Activity Trend
    const renderActivityChart = () => {
        const chartLabels = calculatedStats.historyData.map(d => {
            if (viewMode === 'daily') return d.date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2);
            if (viewMode === 'weekly') return `W${Math.ceil(d.date.getDate() / 7)}`;
            return d.date.toLocaleDateString('en-US', { month: 'short' }).slice(0, 3);
        });
        const hasData = calculatedStats.historyData.some(d => d.tasks > 0);
        const totalTasks = calculatedStats.historyData.reduce((sum, d) => sum + d.tasks, 0);
        const avgTasks = totalTasks / 7;
        const maxTasks = Math.max(...calculatedStats.historyData.map(d => d.tasks));
        const trend = calculatedStats.historyData[6]?.tasks > calculatedStats.historyData[0]?.tasks ? 'up' : 'down';

        return (
            <Card className="p-4 bg-white border border-gray-200">
                <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-gray-800 text-sm flex items-center gap-1.5"><Icons.Activity className="w-4 h-4 text-primary" />Activity</h3>
                    <div className="flex items-center gap-2">
                        {hasData && (
                            <div className={`flex items-center gap-0.5 text-[10px] font-bold ${trend === 'up' ? 'text-emerald-600' : 'text-red-500'}`}>
                                {trend === 'up' ? <Icons.TrendingUp className="w-3 h-3" /> : <Icons.TrendingDown className="w-3 h-3" />}
                                {trend === 'up' ? '+' : ''}{Math.round((calculatedStats.historyData[6]?.tasks - calculatedStats.historyData[0]?.tasks))}
                            </div>
                        )}
                        <span className="text-[10px] text-gray-400">7 {viewMode === 'daily' ? 'days' : viewMode === 'weekly' ? 'weeks' : 'months'}</span>
                    </div>
                </div>
                
                {hasData && (
                    <div className="flex gap-3 mb-4 mt-3">
                        <div className="flex-1 bg-gray-50 rounded-lg p-2.5 text-center">
                            <div className="text-lg font-black text-gray-800">{totalTasks}</div>
                            <div className="text-[9px] text-gray-400">Total</div>
                        </div>
                        <div className="flex-1 bg-gray-50 rounded-lg p-2.5 text-center">
                            <div className="text-lg font-black text-gray-800">{avgTasks.toFixed(1)}</div>
                            <div className="text-[9px] text-gray-400">Avg/day</div>
                        </div>
                        <div className="flex-1 bg-gray-50 rounded-lg p-2.5 text-center">
                            <div className="text-lg font-black text-gray-800">{maxTasks}</div>
                            <div className="text-[9px] text-gray-400">Best</div>
                        </div>
                    </div>
                )}
                
                {hasData ? (
                    <LineChart data={calculatedStats.historyData.map(d => d.tasks)} color="#4F46E5" height={90} labels={chartLabels} />
                ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                        <Icons.Activity className="w-10 h-10 mb-2 opacity-20" />
                        <p className="text-xs text-gray-400">Complete tasks to see trends</p>
                    </div>
                )}
            </Card>
        );
    };

    // Connected Apps Statistics with SVG icons
    const renderConnectedAppsStats = () => {
        const [activeAppIndex, setActiveAppIndex] = useState(0);
        const activeApp = connectedAppsData[activeAppIndex];
        const AppIcon = activeApp.Icon;

        return (
            <Card className="p-4 bg-white border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-800 text-sm flex items-center gap-1.5">
                        <Icons.Cpu className="w-4 h-4 text-primary" />
                        Integrations
                    </h3>
                    <button onClick={() => setView(AppView.SETTINGS)} className="text-[10px] text-primary font-bold">
                        Manage
                    </button>
                </div>
                
                {/* App tabs with SVG icons */}
                <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide">
                    {connectedAppsData.map((app, i) => {
                        const Icon = app.Icon;
                        return (
                            <button
                                key={app.id}
                                onClick={() => setActiveAppIndex(i)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all border ${
                                    activeAppIndex === i 
                                        ? 'bg-gray-900 text-white border-gray-900' 
                                        : app.isConnected 
                                            ? 'bg-white text-gray-700 border-gray-200' 
                                            : 'bg-gray-50 text-gray-400 border-gray-100'
                                }`}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                {app.name}
                                {app.isConnected && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>}
                            </button>
                        );
                    })}
                </div>

                {/* Active app content */}
                {activeApp.isConnected ? (
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            {activeApp.metrics.slice(0, 4).map(metric => (
                                <div key={metric.id} className="bg-gray-50 rounded-xl p-3">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[9px] text-gray-400 uppercase font-medium">{metric.name}</span>
                                        {metric.change !== 0 && (
                                            <span className={`text-[9px] font-bold ${metric.change > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                {metric.change > 0 ? '+' : ''}{metric.change}%
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-end justify-between">
                                        <span className="text-base font-black text-gray-800">
                                            {metric.unit === '$' ? '$' : ''}{metric.value}{metric.unit === '%' ? '%' : metric.unit === 'x' ? 'x' : ''}
                                        </span>
                                        <MiniSparkline data={metric.history} color={activeApp.color} height={24} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-6">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gray-100 flex items-center justify-center">
                            <AppIcon className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-xs text-gray-500 mb-3">Connect {activeApp.name} to see stats</p>
                        <button 
                            onClick={() => setView(AppView.SETTINGS)}
                            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-xs font-bold"
                        >
                            Connect
                        </button>
                    </div>
                )}
            </Card>
        );
    };

    // Credits Chart
    const renderCreditsChart = () => {
        const hasData = calculatedStats.historyData.some(d => d.credits > 0);
        return (
            <Card className="p-4 bg-white border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-gray-800 text-sm flex items-center gap-1.5"><CoinIcon className="w-4 h-4" />Earnings</h3>
                    <div className="flex items-center gap-2 text-[10px]">
                        <span className="text-gray-400">Total:</span>
                        <span className="font-bold text-amber-600 flex items-center gap-0.5"><CoinIcon className="w-3 h-3" />{calculatedStats.totalCredits}</span>
                    </div>
                </div>
                {hasData ? (
                    <BarChart data={calculatedStats.historyData.map((d, i) => ({
                        label: viewMode === 'daily' ? d.date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2) : viewMode === 'weekly' ? `W${i + 1}` : d.date.toLocaleDateString('en-US', { month: 'short' }).slice(0, 3),
                        value: d.credits,
                        color: i === calculatedStats.historyData.length - 1 ? '#F59E0B' : '#FCD34D'
                    }))} height={80} />
                ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                        <CoinIcon className="w-10 h-10 mb-2 opacity-20" />
                        <p className="text-xs text-gray-400">Earn credits to see history</p>
                    </div>
                )}
            </Card>
        );
    };

    const renderUpcomingMilestones = () => {
        const upcomingEvents = allEvents.filter(e => new Date(e.date) >= new Date()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 3);
        if (upcomingEvents.length === 0) return null;
        
        return (
            <div>
                <h3 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-1.5"><Icons.Clock className="w-4 h-4 text-primary" />Upcoming</h3>
                <div className="space-y-2">
                    {upcomingEvents.map(event => {
                        const eventDate = new Date(event.date);
                        const daysUntil = Math.ceil((eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                        return (
                            <div key={event.id} className="flex gap-3 items-center p-3 bg-white rounded-xl border border-gray-200">
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-black" style={{ backgroundColor: `${event.color}15`, color: event.color }}>
                                    {eventDate.getDate()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-gray-800 text-xs truncate">{event.title}</h4>
                                    <p className="text-[10px] text-gray-400">{eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                                </div>
                                <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${daysUntil <= 3 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                                    {daysUntil === 0 ? 'Today' : daysUntil === 1 ? '1d' : `${daysUntil}d`}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderInsights = () => {
        const displayInsights = insights || mockInsights;
        return (
            <Card className="bg-gradient-to-br from-gray-800 via-gray-900 to-black text-white p-4 border-none relative overflow-hidden shadow-sm">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-white/50 text-[10px] font-bold uppercase flex items-center gap-1"><Icons.Sparkles className="w-3 h-3" />AI Insight</h3>
                        {displayInsights.weeklyScore && <div className="bg-white/10 px-2 py-0.5 rounded-full text-[10px] font-bold">{displayInsights.weeklyScore}/100</div>}
                    </div>
                    {isLoading ? (
                        <div className="flex items-center gap-2 py-3"><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div><span className="text-white/50 text-xs">Analyzing...</span></div>
                    ) : (
                        <>
                            <p className="text-sm font-medium leading-relaxed mb-3">"{displayInsights.trend}"</p>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-white/10 rounded-lg p-2.5">
                                    <div className="text-[9px] text-white/50 uppercase">Focus</div>
                                    <div className="font-bold text-xs">{displayInsights.focusArea}</div>
                                </div>
                                <div className="bg-white/10 rounded-lg p-2.5">
                                    <div className="text-[9px] text-white/50 uppercase">Strength</div>
                                    <div className="font-bold text-xs">{displayInsights.topStrength}</div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </Card>
        );
    };

    // Modals
    const renderEventModal = () => {
        if (!showEventModal) return null;
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <Card className="w-full max-w-sm p-4 bg-white border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-gray-800 text-sm">Add Event</h3>
                        <button onClick={() => setShowEventModal(false)} className="p-1 hover:bg-gray-100 rounded-full"><Icons.X className="w-4 h-4 text-gray-400" /></button>
                    </div>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                            <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-700 text-sm">{selectedEventDate?.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
                            <input type="text" value={newEvent.title} onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))} placeholder="Event title" className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary text-sm" />
                        </div>
                        <div className="flex gap-2 pt-1">
                            <button onClick={() => setShowEventModal(false)} className="flex-1 py-2 border border-gray-200 rounded-lg font-medium text-gray-600 text-sm">Cancel</button>
                            <button onClick={handleAddEvent} disabled={!newEvent.title.trim()} className="flex-1 py-2 bg-primary text-white rounded-lg font-medium text-sm disabled:opacity-50">Add</button>
                        </div>
                    </div>
                </Card>
            </div>
        );
    };

    const renderDayEventsModal = () => {
        if (!showDayEvents) return null;
        const dayEvents = getEventsForDate(new Date(selectedDate));
        return (
            <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
                <Card className="w-full max-w-md rounded-t-2xl rounded-b-none p-4 max-h-[60vh] overflow-y-auto bg-white border-t border-x border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h3 className="font-bold text-gray-800 text-sm">{new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</h3>
                            <p className="text-[10px] text-gray-400">{dayEvents.length} event(s)</p>
                        </div>
                        <button onClick={() => setShowDayEvents(false)} className="p-1 hover:bg-gray-100 rounded-full"><Icons.X className="w-4 h-4 text-gray-400" /></button>
                    </div>
                    {dayEvents.length === 0 ? (
                        <div className="text-center py-6"><Icons.Clock className="w-8 h-8 mx-auto mb-1 opacity-20 text-gray-400" /><p className="text-xs text-gray-400">No events</p></div>
                    ) : (
                        <div className="space-y-2">
                            {dayEvents.map(event => (
                                <div key={event.id} className="p-3 bg-gray-50 rounded-lg" style={{ borderLeft: `3px solid ${event.color}` }}>
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h4 className="font-bold text-gray-800 text-sm">{event.title}</h4>
                                            <span className="text-[9px] uppercase font-bold text-gray-400">{event.type}</span>
                                        </div>
                                        {event.type === 'custom' && <button onClick={() => handleDeleteEvent(event.id)} className="text-gray-300 hover:text-red-500"><Icons.Trash className="w-3 h-3" /></button>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    <button onClick={() => { setShowDayEvents(false); setShowEventModal(true); }} className="w-full mt-3 py-2 bg-primary text-white rounded-lg font-medium text-sm flex items-center justify-center gap-1">
                        <Icons.Plus className="w-3 h-3" />Add Event
                    </button>
                </Card>
            </div>
        );
    };

    return (
        <div className="h-full overflow-y-auto pb-safe scroll-smooth">
            <div className="min-h-full bg-gray-50 pb-28 flex flex-col">
                {/* Header - NOT STICKY */}
                <div className="p-4 pb-3 bg-white border-b border-gray-200">
                    <div className="flex justify-between items-center mb-3">
                        <h1 className="text-xl font-bold text-gray-800">Analytics</h1>
                        <button onClick={() => setView(AppView.DASHBOARD)} className="p-1.5 bg-gray-100 rounded-full hover:bg-gray-200"><Icons.X className="w-4 h-4 text-gray-500" /></button>
                    </div>
                    {renderViewModeToggle()}
                </div>
                
                {/* Scrollable Calendar Strip - starts centered on today */}
                <div className="bg-white border-b border-gray-200 py-2">
                    {renderCalendarStrip()}
                </div>

                {/* Content with more spacing */}
                <div className="flex-1 p-4 space-y-5">
                    {renderStatsCards()}
                    
                    {renderAlerts()}
                    
                    {renderGoalProgress()}
                    
                    {renderActivityChart()}
                    
                    {renderConnectedAppsStats()}
                    
                    {renderCreditsChart()}
                    
                    {renderUpcomingMilestones()}
                    
                    <div>
                        <h3 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-1.5"><Icons.Clock className="w-4 h-4 text-primary" />Calendar</h3>
                        {renderFullCalendar()}
                    </div>
                    
                    <div>
                        <h3 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-1.5"><Icons.Sparkles className="w-4 h-4 text-primary" />AI Analysis</h3>
                        {renderInsights()}
                    </div>
                </div>
            </div>
            {renderEventModal()}
            {renderDayEventsModal()}
        </div>
    );
}
