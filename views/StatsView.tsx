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

// SVG Icons for Connected Apps - Clean versions
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
    
    // Scrollable calendar ref
    const calendarStripRef = useRef<HTMLDivElement>(null);
    const [calendarDays, setCalendarDays] = useState<Date[]>([]);
    const isScrollingRef = useRef(false);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        if (calendarStripRef.current && !isScrollingRef.current) {
            const container = calendarStripRef.current;
            const itemWidth = 48; // width + gap
            
            // Find index of selected date
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
            const itemWidth = 48;
            const centerIndex = 30; // Today is at index 30
            const scrollPosition = centerIndex * itemWidth - container.clientWidth / 2 + itemWidth / 2;
            
            setTimeout(() => {
                container.scrollLeft = scrollPosition;
            }, 100);
        }
    }, [calendarDays.length]);

    // Handle scroll end to snap to nearest date
    const handleCalendarScroll = useCallback(() => {
        if (!calendarStripRef.current) return;
        
        isScrollingRef.current = true;
        
        // Clear existing timeout
        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
        }
        
        // Set new timeout to detect scroll end
        scrollTimeoutRef.current = setTimeout(() => {
            if (!calendarStripRef.current) return;
            
            const container = calendarStripRef.current;
            const itemWidth = 48;
            const centerOffset = container.scrollLeft + container.clientWidth / 2;
            const nearestIndex = Math.round(centerOffset / itemWidth - 0.5);
            
            if (calendarDays[nearestIndex]) {
                const newDate = calendarDays[nearestIndex];
                setSelectedDate(newDate.getTime());
                setCurrentMonth(newDate);
            }
            
            isScrollingRef.current = false;
        }, 150);
    }, [calendarDays]);

    // Click on date - scroll to it
    const handleDateClick = useCallback((date: Date, index: number) => {
        setSelectedDate(date.getTime());
        setCurrentMonth(date);
        
        if (calendarStripRef.current) {
            const container = calendarStripRef.current;
            const itemWidth = 48;
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

    // Mock insights - FIXED to always include all fields
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
        
        // Determine strength based on user performance
        let topStrength = 'Getting Started';
        if (streak >= 7) {
            topStrength = 'Consistency';
        } else if (streak >= 3) {
            topStrength = 'Building Habits';
        } else if (completedTasks.length >= 10) {
            topStrength = 'Task Completion';
        } else if (completedTasks.length >= 5) {
            topStrength = 'Taking Action';
        } else if (credits >= 100) {
            topStrength = 'Earning Rewards';
        }
        
        // Determine focus area
        let focusArea = 'Getting Started';
        if (completedTasks.length < 3) {
            focusArea = 'Complete First Tasks';
        } else if (streak < 3) {
            focusArea = 'Build Your Streak';
        } else if (streak < 7) {
            focusArea = 'Maintain Consistency';
        } else {
            focusArea = 'Push Your Limits';
        }
        
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
                    // Merge with mock insights to ensure all fields exist
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
    const LineChart = ({ data, color = "#4F46E5", height = 100, labels = [] }: { 
        data: number[], color?: string, height?: number, labels?: string[]
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
                            <stop offset="0%" stopColor={color} stopOpacity="0.15" />
                            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
                        </linearGradient>
                    </defs>
                    <path d={areaPath} fill={`url(#gradient-${color.replace('#', '')})`} />
                    <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    {points.map((point, i) => (
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

    // Scrollable Calendar Strip - FIXED scrolling behavior
    const renderCalendarStrip = () => {
        const isToday = (date: Date) => date.toDateString() === new Date().toDateString();
        const isSelected = (date: Date) => date.toDateString() === new Date(selectedDate).toDateString();

        return (
            <div 
                ref={calendarStripRef}
                onScroll={handleCalendarScroll}
                className="flex gap-2 overflow-x-auto py-2 px-4 scrollbar-hide"
                style={{ scrollSnapType: 'x mandatory' }}
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

    // IMPROVED Activity Section
    const renderActivityChart = () => {
        const chartLabels = calculatedStats.historyData.map(d => {
            if (viewMode === 'daily') return d.date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2);
            if (viewMode === 'weekly') return `W${Math.ceil(d.date.getDate() / 7)}`;
            return d.date.toLocaleDateString('en-US', { month: 'short' }).slice(0, 3);
        });
        
        const hasData = calculatedStats.historyData.some(d => d.tasks > 0);
        const totalTasks = calculatedStats.historyData.reduce((sum, d) => sum + d.tasks, 0);
        const avgTasks = (totalTasks / 7).toFixed(1);
        const maxTasks = Math.max(...calculatedStats.historyData.map(d => d.tasks));
        const minTasks = Math.min(...calculatedStats.historyData.map(d => d.tasks));
        
        // Calculate trend percentage
        const firstHalf = calculatedStats.historyData.slice(0, 3).reduce((s, d) => s + d.tasks, 0);
        const secondHalf = calculatedStats.historyData.slice(4).reduce((s, d) => s + d.tasks, 0);
        const trendPercent = firstHalf > 0 ? Math.round(((secondHalf - firstHalf) / firstHalf) * 100) : secondHalf > 0 ? 100 : 0;
        const isUp = trendPercent >= 0;

        return (
            <Card className="p-4 bg-white border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-800 text-sm flex items-center gap-1.5">
                        <Icons.Activity className="w-4 h-4 text-primary" />
                        Activity Overview
                    </h3>
                    <span className="text-[10px] text-gray-400">
                        Last 7 {viewMode === 'daily' ? 'days' : viewMode === 'weekly' ? 'weeks' : 'months'}
                    </span>
                </div>
                
                {hasData ? (
                    <>
                        {/* Stats Row */}
                        <div className="grid grid-cols-4 gap-2 mb-4">
                            <div className="text-center">
                                <div className="text-lg font-black text-gray-800">{totalTasks}</div>
                                <div className="text-[9px] text-gray-400 uppercase">Total</div>
                            </div>
                            <div className="text-center">
                                <div className="text-lg font-black text-gray-800">{avgTasks}</div>
                                <div className="text-[9px] text-gray-400 uppercase">Average</div>
                            </div>
                            <div className="text-center">
                                <div className="text-lg font-black text-gray-800">{maxTasks}</div>
                                <div className="text-[9px] text-gray-400 uppercase">Best</div>
                            </div>
                            <div className="text-center">
                                <div className={`text-lg font-black flex items-center justify-center gap-0.5 ${isUp ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {isUp ? <Icons.TrendingUp className="w-3.5 h-3.5" /> : <Icons.TrendingDown className="w-3.5 h-3.5" />}
                                    {Math.abs(trendPercent)}%
                                </div>
                                <div className="text-[9px] text-gray-400 uppercase">Trend</div>
                            </div>
                        </div>
                        
                        {/* Chart */}
                        <LineChart 
                            data={calculatedStats.historyData.map(d => d.tasks)} 
                            color="#4F46E5" 
                            height={100} 
                            labels={chartLabels} 
                        />
                        
                        {/* Daily breakdown */}
                        <div className="mt-4 pt-3 border-t border-gray-100">
                            <div className="flex justify-between items-center">
                                {calculatedStats.historyData.map((d, i) => {
                                    const isMax = d.tasks === maxTasks && maxTasks > 0;
                                    const isToday = d.date.toDateString() === new Date().toDateString();
                                    return (
                                        <div key={i} className="flex flex-col items-center">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                                                isMax ? 'bg-primary text-white' : 
                                                isToday ? 'bg-primary/10 text-primary' : 
                                                d.tasks > 0 ? 'bg-gray-100 text-gray-700' : 'bg-gray-50 text-gray-300'
                                            }`}>
                                                {d.tasks}
                                            </div>
                                            <span className={`text-[8px] mt-1 ${isToday ? 'text-primary font-bold' : 'text-gray-400'}`}>
                                                {chartLabels[i]}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                            <Icons.Activity className="w-8 h-8 text-gray-300" />
                        </div>
                        <p className="text-sm text-gray-500 font-medium">No activity yet</p>
                        <p className="text-xs text-gray-400 mt-1">Complete tasks to see your trends</p>
                    </div>
                )}
            </Card>
        );
    };

    // Connected Apps Statistics with clean SVG icons
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
                
                {/* App tabs with clean SVG icons */}
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
                    <div className="text-center py-8">
                        <div className="w-14 h-14 mx-auto mb-3 rounded-xl bg-gray-100 flex items-center justify-center">
                            <AppIcon className="w-7 h-7 text-gray-400" />
                        </div>
                        <p className="text-sm text-gray-600 font-medium mb-1">Connect {activeApp.name}</p>
                        <p className="text-xs text-gray-400 mb-4">View your analytics here</p>
                        <button 
                            onClick={() => setView(AppView.SETTINGS)}
                            className="px-5 py-2 bg-gray-900 text-white rounded-lg text-xs font-bold"
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

    // FIXED AI Insights - always shows all fields
    const renderInsights = () => {
        const displayInsights = insights || mockInsights;
        
        return (
            <Card className="bg-gradient-to-br from-gray-800 via-gray-900 to-black text-white p-5 border-none relative overflow-hidden shadow-sm">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
                
                <div className="relative">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-white/50 text-[10px] font-bold uppercase flex items-center gap-1.5">
                            <Icons.Sparkles className="w-3.5 h-3.5" />
                            AI Insight
                        </h3>
                        {displayInsights?.weeklyScore !== undefined && (
                            <div className="bg-white/15 px-2.5 py-1 rounded-full text-[10px] font-bold">
                                Score: {displayInsights.weeklyScore}/100
                            </div>
                        )}
                    </div>
                    
                    {isLoading ? (
                        <div className="flex items-center gap-2 py-4">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span className="text-white/50 text-xs">Analyzing your progress...</span>
                        </div>
                    ) : (
                        <>
                            {/* Main insight */}
                            <p className="text-sm font-medium leading-relaxed mb-4 text-white/90">
                                "{displayInsights?.trend || 'Start completing tasks to see insights.'}"
                            </p>
                            
                            {/* Stats grid - 3 columns now */}
                            <div className="grid grid-cols-3 gap-2">
                                <div className="bg-white/10 rounded-xl p-3">
                                    <div className="text-[9px] text-white/40 uppercase font-medium mb-1">Focus</div>
                                    <div className="font-bold text-xs text-white">
                                        {displayInsights?.focusArea || 'Getting Started'}
                                    </div>
                                </div>
                                <div className="bg-white/10 rounded-xl p-3">
                                    <div className="text-[9px] text-white/40 uppercase font-medium mb-1">Strength</div>
                                    <div className="font-bold text-xs text-white">
                                        {displayInsights?.topStrength || 'Getting Started'}
                                    </div>
                                </div>
                                <div className="bg-white/10 rounded-xl p-3">
                                    <div className="text-[9px] text-white/40 uppercase font-medium mb-1">Prediction</div>
                                    <div className="font-bold text-xs text-white truncate">
                                        {displayInsights?.prediction?.split(' ').slice(0, 3).join(' ') || 'Build streak'}
                                    </div>
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
                {/* Header */}
                <div className="p-4 pb-3 bg-white border-b border-gray-200">
                    <div className="flex justify-between items-center mb-3">
                        <h1 className="text-xl font-bold text-gray-800">Analytics</h1>
                        <button onClick={() => setView(AppView.DASHBOARD)} className="p-1.5 bg-gray-100 rounded-full hover:bg-gray-200"><Icons.X className="w-4 h-4 text-gray-500" /></button>
                    </div>
                    {renderViewModeToggle()}
                </div>
                
                {/* Scrollable Calendar Strip */}
                <div className="bg-white border-b border-gray-200">
                    {renderCalendarStrip()}
                </div>

                {/* Content */}
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
