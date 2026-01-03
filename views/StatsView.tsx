// views/StatsView.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { AppView } from '../types';
import { Icons, Card, CoinIcon } from '../components/UIComponents';
import { calculateBudgetSplit, generateDeepInsights } from '../services/geminiService';
import BridgeHub from '../components/BridgeHub';
import { oauthService, ConnectedAccount, PlatformInfo, CATEGORIES } from '../services/oauthService';

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

// Platform icon mapping
const PLATFORM_ICONS: Record<string, { icon: string; color: string; bgColor: string }> = {
    discord: { icon: '🎮', color: '#5865F2', bgColor: 'rgba(88, 101, 242, 0.15)' },
    slack: { icon: '💬', color: '#4A154B', bgColor: 'rgba(74, 21, 75, 0.15)' },
    github: { icon: '🐙', color: '#24292F', bgColor: 'rgba(36, 41, 47, 0.15)' },
    google: { icon: '🔍', color: '#4285F4', bgColor: 'rgba(66, 133, 244, 0.15)' },
    spotify: { icon: '🎵', color: '#1DB954', bgColor: 'rgba(29, 185, 84, 0.15)' },
    twitter: { icon: '🐦', color: '#1DA1F2', bgColor: 'rgba(29, 161, 242, 0.15)' },
    linkedin: { icon: '💼', color: '#0A66C2', bgColor: 'rgba(10, 102, 194, 0.15)' },
    shopify: { icon: '🛒', color: '#96BF48', bgColor: 'rgba(150, 191, 72, 0.15)' },
    mailchimp: { icon: '📧', color: '#FFE01B', bgColor: 'rgba(255, 224, 27, 0.15)' },
    klaviyo: { icon: '📊', color: '#000000', bgColor: 'rgba(100, 100, 100, 0.15)' },
    notion: { icon: '📝', color: '#000000', bgColor: 'rgba(100, 100, 100, 0.15)' },
    airtable: { icon: '📋', color: '#18BFFF', bgColor: 'rgba(24, 191, 255, 0.15)' },
    stripe: { icon: '💳', color: '#635BFF', bgColor: 'rgba(99, 91, 255, 0.15)' },
    tiktok: { icon: '🎬', color: '#000000', bgColor: 'rgba(100, 100, 100, 0.15)' },
    instagram: { icon: '📷', color: '#E4405F', bgColor: 'rgba(228, 64, 95, 0.15)' },
    facebook: { icon: '👤', color: '#1877F2', bgColor: 'rgba(24, 119, 242, 0.15)' },
    youtube: { icon: '▶️', color: '#FF0000', bgColor: 'rgba(255, 0, 0, 0.15)' },
    twitch: { icon: '🎮', color: '#9146FF', bgColor: 'rgba(145, 70, 255, 0.15)' },
    default: { icon: '🔗', color: '#6B7280', bgColor: 'rgba(107, 114, 128, 0.15)' }
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
    
    // Bridge Hub state
    const [showBridgeHub, setShowBridgeHub] = useState(false);
    
    // Connected accounts state from OAuth service
    const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);
    const [allPlatforms, setAllPlatforms] = useState<PlatformInfo[]>([]);
    const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
    const [refreshingPlatform, setRefreshingPlatform] = useState<string | null>(null);
    
    // Calendar states
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
    const [showEventModal, setShowEventModal] = useState(false);
    const [selectedEventDate, setSelectedEventDate] = useState<Date | null>(null);
    const [newEvent, setNewEvent] = useState({ title: '', description: '' });
    const [showDayEvents, setShowDayEvents] = useState(false);
    
    // Calendar refs
    const calendarStripRef = useRef<HTMLDivElement>(null);
    const [calendarDays, setCalendarDays] = useState<Date[]>([]);
    const isScrollingRef = useRef(false);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isUserScrollingRef = useRef(false);

    // Touch support refs
    const touchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Stars animation
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number | null>(null);
    const starsRef = useRef<{ x: number; y: number; z: number; brightness: number }[]>([]);
    const isAnimatingRef = useRef(true);

    // Load connected accounts from OAuth service
    useEffect(() => {
        const loadConnectedAccounts = async () => {
            if (!user?.email) {
                setIsLoadingAccounts(false);
                return;
            }
            
            try {
                setIsLoadingAccounts(true);
                const [accountsRes, platformsRes] = await Promise.all([
                    oauthService.getConnectedAccounts(user.email),
                    oauthService.getAllPlatforms()
                ]);
                
                if (accountsRes.success && accountsRes.accounts) {
                    setConnectedAccounts(accountsRes.accounts);
                }
                if (platformsRes.success && platformsRes.platforms) {
                    setAllPlatforms(platformsRes.platforms);
                }
            } catch (error) {
                console.error('Failed to load connected accounts:', error);
            } finally {
                setIsLoadingAccounts(false);
            }
        };

        loadConnectedAccounts();
    }, [user?.email]);

    // Initialize stars
    useEffect(() => {
        if (starsRef.current.length === 0) {
            starsRef.current = Array.from({ length: 120 }, () => ({
                x: Math.random() * 2 - 1,
                y: Math.random() * 2 - 1,
                z: Math.random(),
                brightness: Math.random()
            }));
        }
    }, []);

    // Pause animation when tab is not visible
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                isAnimatingRef.current = false;
                if (animationRef.current) {
                    cancelAnimationFrame(animationRef.current);
                    animationRef.current = null;
                }
            } else {
                isAnimatingRef.current = true;
            }
        };
        
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    // Stars canvas animation
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = 0;
        let height = 0;
        let isRunning = true;

        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            width = rect.width * dpr;
            height = rect.height * dpr;
            canvas.width = width;
            canvas.height = height;
        };
        
        resize();
        window.addEventListener('resize', resize);

        if (starsRef.current.length === 0) {
            starsRef.current = Array.from({ length: 120 }, () => ({
                x: Math.random() * 2 - 1,
                y: Math.random() * 2 - 1,
                z: Math.random(),
                brightness: Math.random()
            }));
        }

        let lastFrameTime = 0;
        const targetFPS = 30;
        const frameInterval = 1000 / targetFPS;

        const drawStars = (currentTime: number) => {
            if (!isRunning || !isAnimatingRef.current) return;
            
            const elapsed = currentTime - lastFrameTime;
            if (elapsed < frameInterval) {
                animationRef.current = requestAnimationFrame(drawStars);
                return;
            }
            lastFrameTime = currentTime - (elapsed % frameInterval);
            
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const w = width / dpr;
            const h = height / dpr;
            
            if (w === 0 || h === 0) {
                animationRef.current = requestAnimationFrame(drawStars);
                return;
            }
            
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            
            // Gradient background
            const gradient = ctx.createLinearGradient(0, 0, 0, h);
            gradient.addColorStop(0, '#000000');
            gradient.addColorStop(0.5, '#0a0a15');
            gradient.addColorStop(1, '#000000');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, w, h);

            // Draw stars with twinkling effect
            starsRef.current.forEach(star => {
                const twinkle = 0.3 + Math.sin(currentTime * 0.002 + star.brightness * 10) * 0.5;
                ctx.fillStyle = `rgba(255, 255, 255, ${star.z * twinkle * 0.6})`;
                ctx.beginPath();
                ctx.arc((star.x + 1) * w / 2, (star.y + 1) * h / 2, star.brightness * 1.2 + 0.3, 0, Math.PI * 2);
                ctx.fill();
            });

            // Subtle nebula glow
            const nebulaGradient = ctx.createRadialGradient(w * 0.3, h * 0.4, 0, w * 0.3, h * 0.4, w * 0.5);
            nebulaGradient.addColorStop(0, 'rgba(52, 35, 166, 0.03)');
            nebulaGradient.addColorStop(1, 'transparent');
            ctx.fillStyle = nebulaGradient;
            ctx.fillRect(0, 0, w, h);

            animationRef.current = requestAnimationFrame(drawStars);
        };

        animationRef.current = requestAnimationFrame(drawStars);

        return () => {
            isRunning = false;
            window.removeEventListener('resize', resize);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
                animationRef.current = null;
            }
        };
    }, []);

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

    // Scroll to selected date when it changes
    useEffect(() => {
        if (calendarStripRef.current && !isScrollingRef.current && !isUserScrollingRef.current) {
            const container = calendarStripRef.current;
            const itemWidth = 52;
            
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

    // Scroll handler with debouncing
    const handleCalendarScroll = useCallback(() => {
        if (!calendarStripRef.current) return;
        
        isScrollingRef.current = true;
        isUserScrollingRef.current = true;
        
        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
        }
        
        scrollTimeoutRef.current = setTimeout(() => {
            if (!calendarStripRef.current) return;
            
            const container = calendarStripRef.current;
            const itemWidth = 52;
            const centerOffset = container.scrollLeft + container.clientWidth / 2;
            const nearestIndex = Math.round(centerOffset / itemWidth - 0.5);
            
            if (calendarDays[nearestIndex]) {
                const newDate = calendarDays[nearestIndex];
                
                requestAnimationFrame(() => {
                    setSelectedDate(newDate.getTime());
                    setCurrentMonth(newDate);
                    
                    const snapPosition = nearestIndex * itemWidth - container.clientWidth / 2 + itemWidth / 2;
                    container.scrollTo({ left: snapPosition, behavior: 'smooth' });
                });
            }
            
            isScrollingRef.current = false;
            
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

    // Handle disconnect
    const handleDisconnect = async (platformId: string) => {
        if (!user?.email) return;
        
        try {
            const result = await oauthService.disconnect(user.email, platformId);
            if (result.success) {
                setConnectedAccounts(prev => prev.filter(a => a.platform !== platformId));
            }
        } catch (error) {
            console.error('Failed to disconnect:', error);
        }
    };

    // Handle refresh token
    const handleRefreshToken = async (platformId: string) => {
        if (!user?.email) return;
        
        setRefreshingPlatform(platformId);
        try {
            const result = await oauthService.refreshToken(user.email, platformId);
            if (result.success) {
                const accountsRes = await oauthService.getConnectedAccounts(user.email);
                if (accountsRes.success && accountsRes.accounts) {
                    setConnectedAccounts(accountsRes.accounts);
                }
            }
        } catch (error) {
            console.error('Failed to refresh token:', error);
        } finally {
            setRefreshingPlatform(null);
        }
    };

    // Get platform info
    const getPlatformInfo = (platformId: string): PlatformInfo | undefined => {
        return allPlatforms.find(p => p.id === platformId);
    };

    // Glassy card component
    const GlassCard: React.FC<{ children: React.ReactNode; className?: string; style?: React.CSSProperties }> = ({ children, className, style }) => (
        <div 
            className={className}
            style={{
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                ...style
            }}
        >
            {children}
        </div>
    );

    // LineChart with touch support
    const LineChart = ({ data, color = "#3423A6", height = 100, labels = [] }: { 
        data: number[], color?: string, height?: number, labels?: string[]
    }) => {
        const [localHovered, setLocalHovered] = useState<number | null>(null);
        
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
                <div className="flex items-center justify-center text-white/40 text-sm" style={{ height }}>
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
                            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
                        </linearGradient>
                    </defs>
                    <path d={areaPath} fill={`url(#gradient-${color.replace('#', '')})`} />
                    <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    {points.map((point, i) => (
                        <g key={i}>
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
                                fill="#000" 
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
                            <span key={i} className="text-[9px] text-white/40">{label}</span>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const MiniSparkline = ({ data, color = "#3423A6", height = 32 }: { data: number[], color?: string, height?: number }) => {
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

    const ProgressRing = ({ progress, size = 80, strokeWidth = 8, color = "#3423A6", label, value }: { 
        progress: number, size?: number, strokeWidth?: number, color?: string, label?: string, value?: string | number 
    }) => {
        const radius = (size - strokeWidth) / 2;
        const circumference = radius * 2 * Math.PI;
        const offset = circumference - (progress / 100) * circumference;

        return (
            <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
                <svg className="transform -rotate-90" width={size} height={size}>
                    <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={strokeWidth} />
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
                    {value !== undefined && <span className="text-base font-black text-white">{value}</span>}
                    {label && <span className="text-[9px] text-white/50">{label}</span>}
                </div>
            </div>
        );
    };

    // Scrollable Calendar Strip
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
                                    ? 'bg-[#3423A6] text-white shadow-lg shadow-[#3423A6]/30' 
                                    : today 
                                        ? 'bg-[#3423A6]/20 text-[#3423A6] border border-[#3423A6]/30' 
                                        : 'bg-white/5 text-white/60 border border-white/10 hover:border-white/20'
                            }`}
                            aria-label={`Select ${d.toLocaleDateString()}`}
                            aria-pressed={selected}
                        >
                            <span className={`text-[9px] font-bold uppercase ${selected ? 'text-white/70' : today ? 'text-[#3423A6]/70' : 'text-white/40'}`}>
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

    // Connected account count
    const connectedCount = connectedAccounts.length;
    const totalPlatforms = allPlatforms.length;
    const expiredCount = connectedAccounts.filter(a => 
        a.tokenExpiry && new Date(a.tokenExpiry) < new Date()
    ).length;

    return (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', backgroundColor: '#000000' }}>
            {/* Stars Canvas Background */}
            <canvas 
                ref={canvasRef} 
                style={{ 
                    position: 'absolute', 
                    inset: 0, 
                    width: '100%', 
                    height: '100%',
                    pointerEvents: 'none'
                }}
                aria-hidden="true"
            />
            
            {/* Header */}
            <div style={{ 
                position: 'relative',
                zIndex: 10,
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))',
                background: 'rgba(0, 0, 0, 0.5)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)'
            }}>
                <div style={{ padding: '0 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#fff' }}>Analytics</h1>
                        <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>Track your progress</p>
                    </div>
                    <button 
                        onClick={() => setView(AppView.SETTINGS)}
                        style={{
                            padding: '8px',
                            background: 'rgba(255, 255, 255, 0.08)',
                            borderRadius: '12px',
                            border: 'none',
                            cursor: 'pointer'
                        }}
                        aria-label="Open settings"
                    >
                        <Icons.Settings style={{ width: 20, height: 20, color: 'rgba(255, 255, 255, 0.6)' }} />
                    </button>
                </div>
                
                {/* View Mode Toggle */}
                <div style={{ padding: '0 16px 12px', display: 'flex', gap: '8px' }}>
                    {(['daily', 'weekly', 'monthly'] as const).map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            style={{
                                flex: 1,
                                padding: '10px',
                                borderRadius: '12px',
                                fontSize: '13px',
                                fontWeight: 600,
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                background: viewMode === mode ? '#3423A6' : 'rgba(255, 255, 255, 0.08)',
                                color: viewMode === mode ? '#fff' : 'rgba(255, 255, 255, 0.6)',
                                boxShadow: viewMode === mode ? '0 4px 12px rgba(52, 35, 166, 0.4)' : 'none'
                            }}
                            aria-pressed={viewMode === mode}
                        >
                            {mode.charAt(0).toUpperCase() + mode.slice(1)}
                        </button>
                    ))}
                </div>
                
                {/* Calendar Strip */}
                {renderCalendarStrip()}
            </div>

            {/* Content */}
            <div style={{ 
                flex: 1, 
                overflowY: 'auto', 
                padding: '16px',
                paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
                position: 'relative',
                zIndex: 5,
                WebkitOverflowScrolling: 'touch'
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    {/* Alerts Section */}
                    {alerts.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {alerts.map((alert) => {
                                const AlertIcon = alert.icon;
                                const colors = {
                                    warning: { bg: 'rgba(234, 179, 8, 0.1)', border: 'rgba(234, 179, 8, 0.2)', text: 'rgba(253, 224, 71, 0.9)', icon: 'rgba(234, 179, 8, 0.8)' },
                                    danger: { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.2)', text: 'rgba(252, 165, 165, 0.9)', icon: 'rgba(239, 68, 68, 0.8)' },
                                    info: { bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.2)', text: 'rgba(147, 197, 253, 0.9)', icon: 'rgba(59, 130, 246, 0.8)' },
                                    success: { bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.2)', text: 'rgba(134, 239, 172, 0.9)', icon: 'rgba(34, 197, 94, 0.8)' }
                                }[alert.type];
                                
                                return (
                                    <GlassCard 
                                        key={alert.id}
                                        style={{ 
                                            padding: '16px', 
                                            position: 'relative',
                                            background: colors.bg,
                                            border: `1px solid ${colors.border}`
                                        }}
                                    >
                                        <button 
                                            onClick={() => dismissAlert(alert.id)} 
                                            style={{
                                                position: 'absolute',
                                                top: '8px',
                                                right: '8px',
                                                padding: '8px',
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                borderRadius: '50%'
                                            }}
                                            aria-label={`Dismiss ${alert.title} alert`}
                                        >
                                            <Icons.X style={{ width: 16, height: 16, color: 'rgba(255, 255, 255, 0.4)' }} />
                                        </button>
                                        
                                        <div style={{ display: 'flex', gap: '12px', paddingRight: '32px' }}>
                                            <div style={{ 
                                                padding: '8px', 
                                                borderRadius: '12px', 
                                                background: 'rgba(255, 255, 255, 0.05)'
                                            }}>
                                                <AlertIcon style={{ width: 20, height: 20, color: colors.icon }} />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                    <h4 style={{ fontWeight: 600, fontSize: '14px', color: colors.text }}>{alert.title}</h4>
                                                    <span style={{ fontSize: '9px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase' }}>
                                                        {alert.source}
                                                    </span>
                                                </div>
                                                <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px' }}>{alert.message}</p>
                                                {alert.actionLabel && alert.actionView && (
                                                    <button
                                                        onClick={() => setView(alert.actionView!)}
                                                        style={{
                                                            fontSize: '12px',
                                                            fontWeight: 600,
                                                            color: colors.text,
                                                            background: 'none',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            padding: 0
                                                        }}
                                                    >
                                                        {alert.actionLabel} →
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </GlassCard>
                                );
                            })}
                        </div>
                    )}

                    {/* Stats Cards Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <GlassCard style={{ padding: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <Icons.CheckCircle style={{ width: 16, height: 16, color: 'rgba(34, 197, 94, 0.8)' }} />
                                <span style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase' }}>Tasks</span>
                            </div>
                            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#fff' }}>
                                {animatedValues.tasksCompleted ?? calculatedStats.tasksCompleted}
                            </div>
                            <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.4)' }}>
                                {viewMode === 'daily' ? 'Today' : viewMode === 'weekly' ? 'This Week' : 'This Month'}
                            </div>
                        </GlassCard>
                        
                        <GlassCard style={{ padding: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <Icons.Flame style={{ width: 16, height: 16, color: 'rgba(249, 115, 22, 0.8)' }} />
                                <span style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase' }}>Streak</span>
                            </div>
                            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#fff' }}>
                                {animatedValues.streak ?? calculatedStats.streak}
                            </div>
                            <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.4)' }}>
                                Best: {calculatedStats.longestStreak} days
                            </div>
                        </GlassCard>
                        
                        <GlassCard style={{ padding: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <Icons.Coins style={{ width: 16, height: 16, color: 'rgba(234, 179, 8, 0.8)' }} />
                                <span style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase' }}>Credits</span>
                            </div>
                            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#fff' }}>
                                {(animatedValues.totalCredits ?? calculatedStats.totalCredits).toLocaleString()}
                            </div>
                            <div style={{ fontSize: '10px', color: 'rgba(34, 197, 94, 0.8)' }}>
                                +{calculatedStats.periodCredits} this period
                            </div>
                        </GlassCard>
                        
                        <GlassCard style={{ padding: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <Icons.TrendingUp style={{ width: 16, height: 16, color: 'rgba(59, 130, 246, 0.8)' }} />
                                <span style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase' }}>Score</span>
                            </div>
                            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#fff' }}>
                                {insights?.weeklyScore || 0}%
                            </div>
                            <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.4)' }}>
                                Weekly performance
                            </div>
                        </GlassCard>
                    </div>

                    {/* Activity Chart */}
                    <GlassCard style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <h3 style={{ fontWeight: 600, color: '#fff', fontSize: '15px' }}>Activity</h3>
                            <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)' }}>Last 7 {viewMode === 'daily' ? 'days' : viewMode === 'weekly' ? 'weeks' : 'months'}</span>
                        </div>
                        <LineChart 
                            data={calculatedStats.historyData.map(d => d.tasks)}
                            color="#3423A6"
                            height={120}
                            labels={calculatedStats.historyData.map(d => {
                                if (viewMode === 'monthly') {
                                    return d.date.toLocaleDateString('en-US', { month: 'short' });
                                }
                                return d.date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2);
                            })}
                        />
                    </GlassCard>

                    {/* Connected Apps Section - UPDATED */}
                    <GlassCard style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <h3 style={{ fontWeight: 600, color: '#fff', fontSize: '15px' }}>Connected Apps</h3>
                                {connectedCount > 0 && (
                                    <span style={{
                                        padding: '4px 8px',
                                        borderRadius: '12px',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        background: 'rgba(34, 197, 94, 0.2)',
                                        color: 'rgba(134, 239, 172, 0.9)'
                                    }}>
                                        {connectedCount} Connected
                                    </span>
                                )}
                            </div>
                            <button 
                                onClick={() => setShowBridgeHub(true)}
                                style={{
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    color: '#3423A6',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                Manage
                            </button>
                        </div>
                        
                        {isLoadingAccounts ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {[1, 2].map(i => (
                                    <div key={i} style={{ 
                                        padding: '12px', 
                                        borderRadius: '12px', 
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        animation: 'pulse 2s infinite'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(255, 255, 255, 0.1)' }} />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ height: 14, width: 80, borderRadius: 4, background: 'rgba(255, 255, 255, 0.1)', marginBottom: 6 }} />
                                                <div style={{ height: 10, width: 120, borderRadius: 4, background: 'rgba(255, 255, 255, 0.05)' }} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : connectedCount === 0 ? (
                            <div style={{ textAlign: 'center', padding: '24px 0' }}>
                                <div style={{ 
                                    width: 56, 
                                    height: 56, 
                                    margin: '0 auto 12px',
                                    background: 'rgba(52, 35, 166, 0.2)',
                                    borderRadius: '16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Icons.Link style={{ width: 28, height: 28, color: 'rgba(255, 255, 255, 0.4)' }} />
                                </div>
                                <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '16px' }}>No apps connected yet</p>
                                <button 
                                    onClick={() => setShowBridgeHub(true)}
                                    style={{
                                        padding: '10px 20px',
                                        background: '#3423A6',
                                        border: 'none',
                                        borderRadius: '12px',
                                        color: '#fff',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    Connect Your First App
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {connectedAccounts.map((account) => {
                                    const platformStyle = PLATFORM_ICONS[account.platform] || PLATFORM_ICONS.default;
                                    const platform = getPlatformInfo(account.platform);
                                    const isExpired = account.tokenExpiry && new Date(account.tokenExpiry) < new Date();
                                    
                                    return (
                                        <div 
                                            key={account.platform}
                                            style={{
                                                padding: '12px',
                                                borderRadius: '12px',
                                                background: isExpired ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                                                border: isExpired ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(255, 255, 255, 0.08)',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{
                                                        width: 40,
                                                        height: 40,
                                                        borderRadius: '10px',
                                                        background: platformStyle.bgColor,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '20px'
                                                    }}>
                                                        {platformStyle.icon}
                                                    </div>
                                                    <div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span style={{ fontWeight: 600, color: '#fff', fontSize: '14px', textTransform: 'capitalize' }}>
                                                                {platform?.name || account.platform}
                                                            </span>
                                                            {isExpired ? (
                                                                <span style={{
                                                                    padding: '2px 6px',
                                                                    borderRadius: '6px',
                                                                    fontSize: '9px',
                                                                    fontWeight: 600,
                                                                    background: 'rgba(239, 68, 68, 0.2)',
                                                                    color: 'rgba(252, 165, 165, 0.9)'
                                                                }}>
                                                                    Expired
                                                                </span>
                                                            ) : (
                                                                <span style={{
                                                                    width: 6,
                                                                    height: 6,
                                                                    borderRadius: '50%',
                                                                    background: 'rgba(34, 197, 94, 0.8)'
                                                                }} />
                                                            )}
                                                        </div>
                                                        {/* CONNECTED ACCOUNT NAME - THE KEY FEATURE */}
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                                            {account.avatar && (
                                                                <img 
                                                                    src={account.avatar} 
                                                                    alt="" 
                                                                    style={{ 
                                                                        width: 14, 
                                                                        height: 14, 
                                                                        borderRadius: '50%',
                                                                        border: '1px solid rgba(255, 255, 255, 0.2)'
                                                                    }} 
                                                                />
                                                            )}
                                                            <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                                                                {account.username || account.email || account.accountId || 'Connected'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {isExpired ? (
                                                    <button
                                                        onClick={() => handleRefreshToken(account.platform)}
                                                        disabled={refreshingPlatform === account.platform}
                                                        style={{
                                                            padding: '6px 12px',
                                                            borderRadius: '8px',
                                                            fontSize: '11px',
                                                            fontWeight: 600,
                                                            background: 'rgba(239, 68, 68, 0.2)',
                                                            color: 'rgba(252, 165, 165, 0.9)',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px'
                                                        }}
                                                    >
                                                        <Icons.RefreshCw style={{ 
                                                            width: 12, 
                                                            height: 12,
                                                            animation: refreshingPlatform === account.platform ? 'spin 1s linear infinite' : 'none'
                                                        }} />
                                                        Reconnect
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => setShowBridgeHub(true)}
                                                        style={{
                                                            padding: '6px 12px',
                                                            borderRadius: '8px',
                                                            fontSize: '11px',
                                                            fontWeight: 600,
                                                            background: 'rgba(255, 255, 255, 0.08)',
                                                            color: 'rgba(255, 255, 255, 0.6)',
                                                            border: 'none',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        Manage
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </GlassCard>

                    {/* Bridge Hub Quick Access Card */}
                    <button
                        onClick={() => setShowBridgeHub(true)}
                        style={{
                            width: '100%',
                            padding: '16px',
                            background: 'linear-gradient(135deg, #171738 0%, #3423A6 100%)',
                            borderRadius: '16px',
                            border: 'none',
                            textAlign: 'left',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ 
                                    width: 40, 
                                    height: 40, 
                                    background: 'rgba(255, 255, 255, 0.1)', 
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Icons.Link style={{ width: 20, height: 20, color: '#fff' }} />
                                </div>
                                <div>
                                    <h3 style={{ fontWeight: 600, color: '#fff', fontSize: '14px' }}>Bridge Hub</h3>
                                    <p style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.6)' }}>Connect 40+ platforms</p>
                                </div>
                            </div>
                            <Icons.ChevronRight style={{ width: 20, height: 20, color: 'rgba(255, 255, 255, 0.4)' }} />
                        </div>
                    </button>

                    {/* Insights Card */}
                    {insights && (
                        <GlassCard style={{ padding: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                <Icons.Zap style={{ width: 20, height: 20, color: '#3423A6' }} />
                                <h3 style={{ fontWeight: 600, color: '#fff', fontSize: '15px' }}>Insights</h3>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px' }}>
                                    <div style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', marginBottom: '4px' }}>Top Strength</div>
                                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>{insights.topStrength}</div>
                                </div>
                                
                                <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px' }}>
                                    <div style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', marginBottom: '4px' }}>Focus Area</div>
                                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>{insights.focusArea}</div>
                                </div>
                                
                                <div style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                    <div style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(147, 197, 253, 0.8)', textTransform: 'uppercase', marginBottom: '4px' }}>Trend</div>
                                    <div style={{ fontSize: '13px', color: 'rgba(147, 197, 253, 0.9)' }}>{insights.trend}</div>
                                </div>
                            </div>
                        </GlassCard>
                    )}

                    {/* Quick Actions */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <button
                            onClick={() => setView(AppView.DASHBOARD)}
                            style={{
                                padding: '16px',
                                background: 'rgba(255, 255, 255, 0.03)',
                                backdropFilter: 'blur(12px)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: '16px',
                                textAlign: 'left',
                                cursor: 'pointer'
                            }}
                        >
                            <Icons.Target style={{ width: 20, height: 20, color: '#3423A6', marginBottom: '8px' }} />
                            <div style={{ fontWeight: 600, fontSize: '14px', color: '#fff' }}>View Goals</div>
                            <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.4)' }}>Track your progress</div>
                        </button>
                        
                        <button
                            onClick={() => setView(AppView.SHOP)}
                            style={{
                                padding: '16px',
                                background: 'rgba(255, 255, 255, 0.03)',
                                backdropFilter: 'blur(12px)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: '16px',
                                textAlign: 'left',
                                cursor: 'pointer'
                            }}
                        >
                            <Icons.Shop style={{ width: 20, height: 20, color: '#3423A6', marginBottom: '8px' }} />
                            <div style={{ fontWeight: 600, fontSize: '14px', color: '#fff' }}>Asset Store</div>
                            <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.4)' }}>Manage credits</div>
                        </button>
                    </div>
                </div>
            </div>

            {/* Bridge Hub Modal */}
            <BridgeHub 
                isOpen={showBridgeHub} 
                onClose={() => {
                    setShowBridgeHub(false);
                    // Reload connected accounts when Bridge Hub closes
                    if (user?.email) {
                        oauthService.getConnectedAccounts(user.email).then(res => {
                            if (res.success && res.accounts) {
                                setConnectedAccounts(res.accounts);
                            }
                        });
                    }
                }} 
            />

            {/* Animations */}
            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
