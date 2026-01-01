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
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 0 1-8 0"/>
        </svg>
    ),
    TikTok: (props: any) => (
        <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
        </svg>
    ),
    Instagram: (props: any) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
        </svg>
    ),
    Google: (props: any) => (
        <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
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
    
    // FIX #19: Improved scrollable calendar refs
    const calendarStripRef = useRef<HTMLDivElement>(null);
    const [calendarDays, setCalendarDays] = useState<Date[]>([]);
    const isScrollingRef = useRef(false);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isUserScrollingRef = useRef(false);

    // FIX #20: Track hovered/touched point for charts
    const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
    const touchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Generate calendar days centered on selected date
    useEffect(() => {
        const days: Date[] = [];
        const centerDate = new Date(selectedDate);
        
        for (let i = -30; i <= 30; i++) {
            const d = new Date(centerDate);
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
    }, [viewMode]);

    // Scroll to selected date when it changes (from click)
    useEffect(() => {
        if (calendarStripRef.current && !isScrollingRef.current && !isUserScrollingRef.current) {
            const container = calendarStripRef.current;
            const itemWidth = 52; // width + gap
            
            const selectedIndex = calendarDays.findIndex(d => 
                d.toDateString() === new Date(selectedDate).toDateString()
            );
            
            if (selectedIndex !== -1) {
                const scrollPosition = selectedIndex * itemWidth - container.clientWidth / 2 + itemWidth / 2;
                container.scrollTo({ left: scrollPosition, behavior: 'smooth' });
            }
        }
    }, [selectedDate, calendarDays]);

    // Initial scroll to center (today)
    useEffect(() => {
        if (calendarStripRef.current && calendarDays.length > 0) {
            const container = calendarStripRef.current;
            const itemWidth = 52;
            const centerIndex = 30;
            const scrollPosition = centerIndex * itemWidth - container.clientWidth / 2 + itemWidth / 2;
            
            setTimeout(() => {
                container.scrollLeft = scrollPosition;
            }, 100);
        }
    }, [calendarDays.length]);

    // FIX #19: Improved scroll handler with debouncing
    const handleCalendarScroll = useCallback(() => {
        if (!calendarStripRef.current) return;
        
        isScrollingRef.current = true;
        isUserScrollingRef.current = true;
        
        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
        }
        
        // FIX #19: Increased debounce timeout for smoother experience
        scrollTimeoutRef.current = setTimeout(() => {
            if (!calendarStripRef.current) return;
            
            const container = calendarStripRef.current;
            const itemWidth = 52;
            const centerOffset = container.scrollLeft + container.clientWidth / 2;
            const nearestIndex = Math.round(centerOffset / itemWidth - 0.5);
            
            if (calendarDays[nearestIndex]) {
                const newDate = calendarDays[nearestIndex];
                
                // Use requestAnimationFrame for smoother updates
                requestAnimationFrame(() => {
                    setSelectedDate(newDate.getTime());
                    setCurrentMonth(newDate);
                    
                    // Smooth snap to center
                    const snapPosition = nearestIndex * itemWidth - container.clientWidth / 2 + itemWidth / 2;
                    container.scrollTo({ left: snapPosition, behavior: 'smooth' });
                });
            }
            
            isScrollingRef.current = false;
            
            // Reset user scrolling flag after a delay
            setTimeout(() => {
                isUserScrollingRef.current = false;
            }, 300);
        }, 200);
    }, [calendarDays]);

    // Click on date
    const handleDateClick = useCallback((date: Date, index: number) => {
        isUserScrollingRef.current = false;
        setSelectedDate(date.getTime());
        setCurrentMonth(date);
        
        if (calendarStripRef.current) {
            const container = calendarStripRef.current;
            const itemWidth = 52;
            const scrollPosition = index * itemWidth - container.clientWidth / 2 + itemWidth / 2;
            container.scrollTo({ left: scrollPosition, behavior: 'smooth' });
        }
    }, []);

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

    // Calculated stats
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
        
        let topStrength = 'Getting Started';
        if (streak >= 7) topStrength = 'Consistency';
        else if (streak >= 3) topStrength = 'Building Habits';
        else if (completedTasks.length >= 10) topStrength = 'Task Completion';
        else if (completedTasks.length >= 5) topStrength = 'Taking Action';
        else if (credits >= 100) topStrength = 'Earning Rewards';
        
        let focusArea = 'Getting Started';
        if (completedTasks.length < 3) focusArea = 'Complete First Tasks';
        else if (streak < 3) focusArea = 'Build Your Streak';
        else if (streak < 7) focusArea = 'Maintain Consistency';
        else focusArea = 'Push Your Limits';
        
        return {
            trend: completedTasks.length > 0 
                ? `You're most productive on ${productiveDayName}s with ${mostProductiveDay[1]} tasks completed.`
                : "Start completing tasks to see your productivity patterns.",
            prediction: streak > 3 
                ? `${Math.min(95, 60 + streak * 5)}% likely to maintain streak` 
                : "Build a streak to see predictions",
            focusArea,
            weeklyScore,
            topStrength
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
                    setInsights({ ...mockInsights, ...insightData });
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

    // Connected apps data
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
                    { id: 'orders', name: 'Orders', value: 0, unit: '', change: 0, history: [0, 0, 0, 0, 0, 0, 0] }
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
                    { id: 'followers', name: 'Followers', value: 0, unit: '', change: 0, history: [0, 0, 0, 0, 0, 0, 0] }
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
                    { id: 'engagement', name: 'Engagement', value: 0, unit: '%', change: 0, history: [0, 0, 0, 0, 0, 0, 0] }
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
                    { id: 'clicks', name: 'Clicks', value: 0, unit: '', change: 0, history: [0, 0, 0, 0, 0, 0, 0] }
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

    // FIX #20: LineChart with touch support
    const LineChart = ({ data, color = "#4F46E5", height = 100, labels = [] }: { 
        data: number[], color?: string, height?: number, labels?: string[]
    }) => {
        const [localHovered, setLocalHovered] = useState<number | null>(null);
        
        // FIX #20: Handle touch events
        const handleTouchStart = (index: number) => {
            setLocalHovered(index);
            if (touchTimeoutRef.current) clearTimeout(touchTimeoutRef.current);
        };
        
        const handleTouchEnd = () => {
            touchTimeoutRef.current = setTimeout(() => {
                setLocalHovered(null);
            }, 2000);
        };
        
        if (!data || data.length === 0) {
            return (
                <div className="flex items-center justify-center text-gray-400 text-sm" style={{ height }}>
                    No data
                </div>
            );
        }
        
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
                            <stop offset="0%" stopColor={color} stopOpacity="0.15" />
                            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
                        </linearGradient>
                    </defs>
                    <path d={areaPath} fill={`url(#gradient-${color.replace('#', '')})`} />
                    <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    {points.map((point, i) => (
                        <g key={i}>
                            {/* FIX #20: Larger touch target */}
                            <circle 
                                cx={point.x} 
                                cy={point.y} 
                                r={20} 
                                fill="transparent"
                                className="cursor-pointer"
                                onMouseEnter={() => setLocalHovered(i)}
                                onMouseLeave={() => setLocalHovered(null)}
                                onTouchStart={() => handleTouchStart(i)}
                                onTouchEnd={handleTouchEnd}
                            />
                            <circle 
                                cx={point.x} 
                                cy={point.y} 
                                r={localHovered === i ? 6 : 4} 
                                fill="white" 
                                stroke={color} 
                                strokeWidth="2"
                                className="transition-all pointer-events-none"
                            />
                            {localHovered === i && (
                                <g>
                                    <rect x={point.x - 18} y={point.y - 26} width="36" height="18" rx="4" fill={color} />
                                    <text x={point.x} y={point.y - 13} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">{point.value}</text>
                                </g>
                            )}
                        </g>
                    ))}
                </svg>
                {labels.length > 0 && (
                    <div className="flex justify-between px-2 mt-1">
                        {labels.map((label, i) => (
                            <span key={i} className="text-[9px] text-gray-400">{label}</span>
                        ))}
                    </div>
                )}
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

    // FIX #20: BarChart with touch support
    const BarChart = ({ data, height = 120 }: { data: { label: string; value: number; color?: string }[], height?: number }) => {
        const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
        const max = Math.max(...data.map(d => d.value), 1);
        
        const handleTouchStart = (index: number) => {
            setHoveredIndex(index);
            if (touchTimeoutRef.current) clearTimeout(touchTimeoutRef.current);
        };
        
        const handleTouchEnd = () => {
            touchTimeoutRef.current = setTimeout(() => {
                setHoveredIndex(null);
            }, 2000);
        };

        return (
            <div className="flex items-end justify-between gap-1" style={{ height }}>
                {data.map((item, i) => {
                    const barHeight = (item.value / max) * 100;
                    return (
                        <div 
                            key={i} 
                            className="flex-1 flex flex-col items-center gap-1" 
                            onMouseEnter={() => setHoveredIndex(i)} 
                            onMouseLeave={() => setHoveredIndex(null)}
                            onTouchStart={() => handleTouchStart(i)}
                            onTouchEnd={handleTouchEnd}
                        >
                            <div className="relative w-full flex justify-center">
                                {hoveredIndex === i && (
                                    <div className="absolute -top-6 bg-gray-800 text-white text-[10px] px-1.5 py-0.5 rounded z-10">
                                        {item.value}
                                    </div>
                                )}
                                <div 
                                    className="w-full max-w-[28px] rounded-t transition-all cursor-pointer"
                                    style={{ 
                                        height: `${barHeight}%`, 
                                        minHeight: 4, 
                                        backgroundColor: item.color || '#4F46E5', 
                                        opacity: hoveredIndex === i ? 1 : 0.7 
                                    }} 
                                />
                            </div>
                            <span className="text-[9px] text-gray-400">{item.label}</span>
                        </div>
                    );
                })}
            </div>
        );
    };

    const ProgressRing = ({ progress, size = 80, strokeWidth = 8, color = "#4F46E5", label, value }: { 
        progress: number, size?: number, strokeWidth?: number, color?: string, label?: string, value?: string | number 
    }) => {
        const radius = (size - strokeWidth) / 2;
        const circumference = radius * 2 * Math.PI;
        const offset = circumference - (progress / 100) * circumference;

        return (
            <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
                <svg className="transform -rotate-90" width={size} height={size}>
                    <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#F3F4F6" strokeWidth={strokeWidth} />
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
                    {value !== undefined && <span className="text-base font-black text-gray-800">{value}</span>}
                    {label && <span className="text-[9px] text-gray-500">{label}</span>}
                </div>
            </div>
        );
    };

    // FIX #19: Scrollable Calendar Strip with improved behavior
    const renderCalendarStrip = () => {
        const isToday = (date: Date) => date.toDateString() === new Date().toDateString();
        const isSelected = (date: Date) => date.toDateString() === new Date(selectedDate).toDateString();

        return (
            <div 
                ref={calendarStripRef}
                onScroll={handleCalendarScroll}
                className="flex gap-2 overflow-x-auto py-2 px-4 scrollbar-hide scroll-smooth"
                style={{ 
                    scrollSnapType: 'x mandatory',
                    WebkitOverflowScrolling: 'touch'
                }}
            >
                {calendarDays.map((d, i) => {
                    const selected = isSelected(d);
                    const today = isToday(d);
                    const hasData = hasActivity(d);
                    const events = getEventsForDate(d);
                    
                    return (
                        <button 
                            key={i} 
                            onClick={() => handleDateClick(d, i)}
                            style={{ scrollSnapAlign: 'center' }}
                            className={`flex flex-col items-center justify-center min-w-[48px] w-12 h-16 rounded-xl transition-all flex-shrink-0 ${
                                selected 
                                    ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                                    : today 
                                        ? 'bg-primary/10 text-primary' 
                                        : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                            }`}
                            aria-label={`Select ${d.toLocaleDateString()}`}
                            aria-pressed={selected}
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
                                {hasData && <div className={`w-1 h-1 rounded-full ${selected ? 'bg-white' : 'bg-emerald-500'}`} />}
                                {events.length > 0 && <div className={`w-1 h-1 rounded-full ${selected ? 'bg-white/60' : 'bg-violet-500'}`} />}
                            </div>
                        </button>
                    );
                })}
            </div>
        );
    };

    // FIX #22: Connected Apps with horizontal scroll and snap
    const [selectedAppIndex, setSelectedAppIndex] = useState(0);
    const connectedApp = connectedAppsData[selectedAppIndex];

    return (
        <div className="h-full overflow-y-auto bg-gray-50" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="min-h-full pb-24">
                {/* Header */}
                <div className="bg-white border-b border-gray-100 sticky top-0 z-20">
                    <div className="p-4 flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-black text-primary">Analytics</h1>
                            <p className="text-xs text-gray-400">Track your progress</p>
                        </div>
                        <button 
                            onClick={() => setView(AppView.SETTINGS)}
                            className="p-2 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                            aria-label="Open settings"
                        >
                            <Icons.Settings className="w-5 h-5 text-gray-600" />
                        </button>
                    </div>
                    
                    {/* View Mode Toggle */}
                    <div className="px-4 pb-3 flex gap-2">
                        {(['daily', 'weekly', 'monthly'] as const).map((mode) => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                                    viewMode === mode 
                                        ? 'bg-primary text-white' 
                                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                }`}
                                aria-pressed={viewMode === mode}
                            >
                                {mode.charAt(0).toUpperCase() + mode.slice(1)}
                            </button>
                        ))}
                    </div>
                    
                    {/* FIX #19: Calendar Strip */}
                    {renderCalendarStrip()}
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    {/* FIX #21: Alerts Section with larger dismiss button */}
                    {alerts.length > 0 && (
                        <div className="space-y-2">
                            {alerts.map((alert) => {
                                const AlertIcon = alert.icon;
                                const bgColor = {
                                    warning: 'bg-amber-50 border-amber-200',
                                    danger: 'bg-red-50 border-red-200',
                                    info: 'bg-blue-50 border-blue-200',
                                    success: 'bg-green-50 border-green-200'
                                }[alert.type];
                                const textColor = {
                                    warning: 'text-amber-700',
                                    danger: 'text-red-700',
                                    info: 'text-blue-700',
                                    success: 'text-green-700'
                                }[alert.type];
                                const iconColor = {
                                    warning: 'text-amber-500',
                                    danger: 'text-red-500',
                                    info: 'text-blue-500',
                                    success: 'text-green-500'
                                }[alert.type];
                                
                                return (
                                    <div 
                                        key={alert.id}
                                        className={`relative p-4 rounded-2xl border ${bgColor}`}
                                    >
                                        {/* FIX #21: Larger dismiss button for mobile */}
                                        <button 
                                            onClick={() => dismissAlert(alert.id)} 
                                            className="absolute top-2 right-2 p-2 hover:bg-black/10 rounded-full transition-colors touch-target"
                                            aria-label={`Dismiss ${alert.title} alert`}
                                        >
                                            <Icons.X className="w-4 h-4 text-gray-400" />
                                        </button>
                                        
                                        <div className="flex gap-3 pr-8">
                                            <div className={`p-2 rounded-xl bg-white/50 ${iconColor}`}>
                                                <AlertIcon className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className={`font-bold text-sm ${textColor}`}>{alert.title}</h4>
                                                    <span className="text-[9px] font-bold text-gray-400 uppercase">
                                                        {alert.source}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-600 mb-2">{alert.message}</p>
                                                {alert.actionLabel && alert.actionView && (
                                                    <button
                                                        onClick={() => setView(alert.actionView!)}
                                                        className={`text-xs font-bold ${textColor} hover:underline`}
                                                    >
                                                        {alert.actionLabel} →
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 gap-3">
                        <Card className="p-4 bg-white">
                            <div className="flex items-center gap-2 mb-2">
                                <Icons.CheckCircle className="w-4 h-4 text-emerald-500" />
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Tasks</span>
                            </div>
                            <div className="text-2xl font-black text-primary">
                                {animatedValues.tasksCompleted ?? calculatedStats.tasksCompleted}
                            </div>
                            <div className="text-[10px] text-gray-400">
                                {viewMode === 'daily' ? 'Today' : viewMode === 'weekly' ? 'This Week' : 'This Month'}
                            </div>
                        </Card>
                        
                        <Card className="p-4 bg-white">
                            <div className="flex items-center gap-2 mb-2">
                                <Icons.Flame className="w-4 h-4 text-orange-500" />
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Streak</span>
                            </div>
                            <div className="text-2xl font-black text-primary">
                                {animatedValues.streak ?? calculatedStats.streak}
                            </div>
                            <div className="text-[10px] text-gray-400">
                                Best: {calculatedStats.longestStreak} days
                            </div>
                        </Card>
                        
                        <Card className="p-4 bg-white">
                            <div className="flex items-center gap-2 mb-2">
                                <Icons.Coins className="w-4 h-4 text-yellow-500" />
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Credits</span>
                            </div>
                            <div className="text-2xl font-black text-primary">
                                {(animatedValues.totalCredits ?? calculatedStats.totalCredits).toLocaleString()}
                            </div>
                            <div className="text-[10px] text-emerald-500">
                                +{calculatedStats.periodCredits} this period
                            </div>
                        </Card>
                        
                        <Card className="p-4 bg-white">
                            <div className="flex items-center gap-2 mb-2">
                                <Icons.TrendingUp className="w-4 h-4 text-blue-500" />
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Score</span>
                            </div>
                            <div className="text-2xl font-black text-primary">
                                {insights?.weeklyScore || 0}%
                            </div>
                            <div className="text-[10px] text-gray-400">
                                Weekly performance
                            </div>
                        </Card>
                    </div>

                    {/* Activity Chart */}
                    <Card className="p-4 bg-white">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-primary">Activity</h3>
                            <span className="text-xs text-gray-400">Last 7 {viewMode === 'daily' ? 'days' : viewMode === 'weekly' ? 'weeks' : 'months'}</span>
                        </div>
                        <LineChart 
                            data={calculatedStats.historyData.map(d => d.tasks)}
                            color="#4F46E5"
                            height={120}
                            labels={calculatedStats.historyData.map(d => {
                                if (viewMode === 'monthly') {
                                    return d.date.toLocaleDateString('en-US', { month: 'short' });
                                }
                                return d.date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2);
                            })}
                        />
                    </Card>

                    {/* Insights Card */}
                    {insights && (
                        <Card className="p-4 bg-white">
                            <div className="flex items-center gap-2 mb-4">
                                <Icons.Zap className="w-5 h-5 text-primary" />
                                <h3 className="font-bold text-primary">Insights</h3>
                            </div>
                            
                            <div className="space-y-3">
                                <div className="p-3 bg-gray-50 rounded-xl">
                                    <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Top Strength</div>
                                    <div className="text-sm font-bold text-primary">{insights.topStrength}</div>
                                </div>
                                
                                <div className="p-3 bg-gray-50 rounded-xl">
                                    <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Focus Area</div>
                                    <div className="text-sm font-bold text-primary">{insights.focusArea}</div>
                                </div>
                                
                                <div className="p-3 bg-blue-50 rounded-xl">
                                    <div className="text-[10px] font-bold text-blue-400 uppercase mb-1">Trend</div>
                                    <div className="text-sm text-blue-700">{insights.trend}</div>
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* FIX #22: Connected Apps Section with scroll snap */}
                    <Card className="p-4 bg-white">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-primary">Connected Apps</h3>
                            <button 
                                onClick={() => setView(AppView.SETTINGS)}
                                className="text-xs text-primary font-bold"
                            >
                                Manage
                            </button>
                        </div>
                        
                        {/* FIX #22: Horizontal scrolling app tabs with snap */}
                        <div 
                            className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide scroll-smooth pb-1"
                            style={{ scrollSnapType: 'x mandatory' }}
                        >
                            {connectedAppsData.map((app, index) => {
                                const AppIcon = app.Icon;
                                return (
                                    <button
                                        key={app.id}
                                        onClick={() => setSelectedAppIndex(index)}
                                        style={{ scrollSnapAlign: 'start' }}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-xl flex-shrink-0 transition-all ${
                                            selectedAppIndex === index
                                                ? 'bg-primary text-white'
                                                : app.isConnected
                                                    ? 'bg-gray-100 text-gray-700'
                                                    : 'bg-gray-50 text-gray-400'
                                        }`}
                                        aria-pressed={selectedAppIndex === index}
                                    >
                                        <AppIcon className="w-4 h-4" />
                                        <span className="text-xs font-bold whitespace-nowrap">{app.name}</span>
                                        {!app.isConnected && (
                                            <span className="text-[8px] px-1.5 py-0.5 bg-gray-200 rounded-full text-gray-500">
                                                Not connected
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        
                        {/* Selected App Metrics */}
                        {connectedApp && (
                            <div>
                                {connectedApp.isConnected ? (
                                    <div className="grid grid-cols-2 gap-3">
                                        {connectedApp.metrics?.map((metric: any) => (
                                            <div key={metric.id} className="p-3 bg-gray-50 rounded-xl">
                                                <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">
                                                    {metric.name}
                                                </div>
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-lg font-black text-primary">
                                                        {metric.unit === '$' && '$'}{metric.value.toLocaleString()}{metric.unit === '%' && '%'}
                                                    </span>
                                                    {metric.change !== 0 && (
                                                        <span className={`text-[10px] font-bold ${metric.change > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                            {metric.change > 0 ? '+' : ''}{metric.change}%
                                                        </span>
                                                    )}
                                                </div>
                                                {metric.history && <MiniSparkline data={metric.history} color={connectedApp.color} />}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6">
                                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <connectedApp.Icon className="w-6 h-6 text-gray-400" />
                                        </div>
                                        <p className="text-sm text-gray-500 mb-3">Connect {connectedApp.name} to see metrics</p>
                                        <button 
                                            onClick={() => setView(AppView.SETTINGS)}
                                            className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg"
                                        >
                                            Connect App
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </Card>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setView(AppView.DASHBOARD)}
                            className="p-4 bg-white rounded-2xl border border-gray-100 text-left hover:shadow-md transition-all"
                        >
                            <Icons.Target className="w-5 h-5 text-primary mb-2" />
                            <div className="font-bold text-sm text-primary">View Goals</div>
                            <div className="text-[10px] text-gray-400">Track your progress</div>
                        </button>
                        
                        <button
                            onClick={() => setView(AppView.SHOP)}
                            className="p-4 bg-white rounded-2xl border border-gray-100 text-left hover:shadow-md transition-all"
                        >
                            <Icons.Shop className="w-5 h-5 text-primary mb-2" />
                            <div className="font-bold text-sm text-primary">Asset Store</div>
                            <div className="text-[10px] text-gray-400">Manage credits</div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
