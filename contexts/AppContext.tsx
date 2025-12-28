// contexts/AppContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserState, AppView, GoalCategory, ConnectedApp, FeedItem, Chapter, Course, Product, Friend, EarnTask, DAILY_EARN_TASKS, SocialSection, ExternalVideo, TaskStatus, Difficulty, Goal } from '../types';
import { getGoalCurriculum, getSocialMarketplace, getSocialAds, getFeedRecommendations } from '../services/geminiService';
import { api } from '../services/api';

function getDefaultCurriculum(goal: Goal): Chapter[] {
    return [
        {
            id: 'ch-1',
            title: 'Phase 1: Foundation',
            lessons: [
                { id: 'l1', title: 'Understanding Your Goal', duration: '10 min', isLocked: false, description: `Learn the fundamentals of ${goal.title}` },
                { id: 'l2', title: 'Setting Up For Success', duration: '15 min', isLocked: false, description: 'Prepare your environment and mindset' },
                { id: 'l3', title: 'Your First Steps', duration: '10 min', isLocked: false, description: 'Take your first actionable steps' }
            ],
            quiz: []
        },
        {
            id: 'ch-2',
            title: 'Phase 2: Building Habits',
            lessons: [
                { id: 'l4', title: 'Daily Routines', duration: '12 min', isLocked: false, description: 'Establish consistent daily practices' },
                { id: 'l5', title: 'Tracking Progress', duration: '10 min', isLocked: false, description: 'Monitor and measure your growth' },
                { id: 'l6', title: 'Staying Motivated', duration: '10 min', isLocked: false, description: 'Keep your momentum going' }
            ],
            quiz: []
        },
        {
            id: 'ch-3',
            title: 'Phase 3: Advanced Strategies',
            lessons: [
                { id: 'l7', title: 'Overcoming Obstacles', duration: '15 min', isLocked: false, description: 'Handle challenges effectively' },
                { id: 'l8', title: 'Accelerating Growth', duration: '12 min', isLocked: false, description: 'Level up your approach' },
                { id: 'l9', title: 'Optimizing Results', duration: '10 min', isLocked: false, description: 'Fine-tune your methods' }
            ],
            quiz: []
        },
        {
            id: 'ch-4',
            title: 'Phase 4: Mastery',
            lessons: [
                { id: 'l10', title: 'Long-term Success', duration: '10 min', isLocked: false, description: 'Maintain your achievements' },
                { id: 'l11', title: 'Teaching Others', duration: '10 min', isLocked: false, description: 'Share your knowledge' },
                { id: 'l12', title: 'Next Level Goals', duration: '10 min', isLocked: false, description: 'Plan your next journey' }
            ],
            quiz: []
        }
    ];
}

const INITIAL_CONNECTED_APPS: ConnectedApp[] = [
    {
        id: 'app1',
        name: 'Google Ads',
        icon: 'Activity',
        isConnected: false,
        allowedCategories: [GoalCategory.MONEY, GoalCategory.PRODUCTIVITY],
        metrics: [
            { id: 'm1', name: 'ROAS', value: 3.2, unit: 'x', threshold: 2.0, condition: 'lt', status: 'good', history: [3.0, 3.1, 3.2, 3.1, 3.3, 3.2, 3.4, 3.1, 3.2, 3.2] },
            { id: 'm2', name: 'Spend', value: 150, unit: '$', threshold: 500, condition: 'gt', status: 'good', history: [120, 130, 140, 145, 150, 155, 150, 148, 150, 150] }
        ]
    },
    {
        id: 'app2',
        name: 'Meta Analytics',
        icon: 'Users',
        isConnected: false,
        allowedCategories: [GoalCategory.SOCIAL, GoalCategory.MONEY],
        metrics: []
    }
];

const INITIAL_STATE: UserState = {
    email: "",
    password: "",
    createdAt: Date.now(),
    name: "",
    country: "",
    privacyAccepted: false,
    goal: null,
    allGoals: [],
    currentDay: 1,
    credits: 0,
    streak: 0,
    isPremium: false,
    activePlanId: 'free',
    realMoneyBalance: 0,
    earnings: [],
    dailyTasks: [
        { id: 'dt-1', dayNumber: 1, title: 'Strategic Planning Block', description: 'Dedicate time to structure your goals and identify high-impact actions.', estimatedTimeMinutes: 15, difficulty: Difficulty.EASY, videoRequirements: 'None', creditsReward: 0, status: TaskStatus.PENDING },
        { id: 'dt-2', dayNumber: 1, title: 'Core Execution Phase', description: 'Engage in a focused block of activity directly related to your primary goal.', estimatedTimeMinutes: 45, difficulty: Difficulty.MEDIUM, videoRequirements: 'None', creditsReward: 0, status: TaskStatus.PENDING },
        { id: 'dt-3', dayNumber: 1, title: 'Daily Review & Feedback', description: 'Log your progress and identify areas for optimization for tomorrow.', estimatedTimeMinutes: 10, difficulty: Difficulty.EASY, videoRequirements: 'None', creditsReward: 0, status: TaskStatus.PENDING }
    ],
    todoList: [],
    extraLogs: [],
    earnTasks: DAILY_EARN_TASKS,
    selectedTaskId: null,
    chatHistory: [],
    connectedApps: INITIAL_CONNECTED_APPS,
    agentAlerts: [],
    userProfile: "",
    lastCheckInDate: 0,
    completedLessonIds: [],
    completedPhaseIds: [],
    maxGoalSlots: 3,
    history: [],
    reminders: [],
    myCourses: [],
    myProducts: [],
    myVideos: [],
    friends: [
        { id: 'f1', name: 'Sarah', streak: 12, avatar: 'https://picsum.photos/110', lastActive: '2m ago', goalTitle: 'Run Marathon', progress: 45 },
        { id: 'f2', name: 'Mike', streak: 5, avatar: 'https://picsum.photos/111', lastActive: '1h ago', goalTitle: 'Learn Python', progress: 20 },
        { id: 'f3', name: 'Emma', streak: 30, avatar: 'https://picsum.photos/112', lastActive: '4h ago', goalTitle: 'Save $10k', progress: 75 }
    ]
};

// Theme type
export type ThemeMode = 'light' | 'dark';

interface AppContextType {
    user: UserState;
    setUser: React.Dispatch<React.SetStateAction<UserState>>;
    view: AppView;
    setView: (view: AppView) => void;
    isAuthenticated: boolean;
    setIsAuthenticated: (auth: boolean) => void;
    feedItems: FeedItem[];
    setFeedItems: React.Dispatch<React.SetStateAction<FeedItem[]>>;
    lessons: Chapter[];
    setLessons: React.Dispatch<React.SetStateAction<Chapter[]>>;
    courses: Course[];
    setCourses: React.Dispatch<React.SetStateAction<Course[]>>;
    adsFeed: Product[];
    setAdsFeed: React.Dispatch<React.SetStateAction<Product[]>>;
    activeSocialSection: SocialSection;
    setActiveSocialSection: (section: SocialSection) => void;
    isLoadingLessons: boolean;
    setIsLoadingLessons: (loading: boolean) => void;
    recommendedVideos: ExternalVideo[];
    setRecommendedVideos: React.Dispatch<React.SetStateAction<ExternalVideo[]>>;
    showGoalManager: boolean;
    setShowGoalManager: (show: boolean) => void;
    showCheckIn: boolean;
    setShowCheckIn: (show: boolean) => void;
    showAdOverlay: boolean;
    setShowAdOverlay: (show: boolean) => void;
    adCountdown: number;
    setAdCountdown: React.Dispatch<React.SetStateAction<number>>;
    friends: Friend[];
    setFriends: (friends: Friend[]) => void;
    // Theme
    theme: ThemeMode;
    setTheme: (theme: ThemeMode) => void;
    toggleTheme: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<UserState>(() => {
        const saved = localStorage.getItem('injazi_user');
        return saved ? JSON.parse(saved) : INITIAL_STATE;
    });

    const [view, setView] = useState<AppView>(
        user.email ? (user.goal ? AppView.DASHBOARD : AppView.ONBOARDING) : AppView.LOGIN
    );
    const [isAuthenticated, setIsAuthenticated] = useState(!!user.email);

    const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
    const [lessons, setLessons] = useState<Chapter[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [adsFeed, setAdsFeed] = useState<Product[]>([]);
    const [recommendedVideos, setRecommendedVideos] = useState<ExternalVideo[]>([]);
    const [activeSocialSection, setActiveSocialSection] = useState<SocialSection>(SocialSection.LESSONS);
    const [isLoadingLessons, setIsLoadingLessons] = useState(false);

    const [showGoalManager, setShowGoalManager] = useState(false);
    const [showCheckIn, setShowCheckIn] = useState(false);
    const [showAdOverlay, setShowAdOverlay] = useState(false);
    const [adCountdown, setAdCountdown] = useState(0);

    // Theme State
    const [theme, setTheme] = useState<ThemeMode>(() => {
        const saved = localStorage.getItem('injazi_theme');
        return (saved as ThemeMode) || 'light';
    });

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    // Save theme to localStorage
    useEffect(() => {
        localStorage.setItem('injazi_theme', theme);
    }, [theme]);

    const setFriends = (newFriends: any) => {
        const updatedFriends = typeof newFriends === 'function' ? newFriends(user.friends || []) : newFriends;
        setUser(prev => ({ ...prev, friends: updatedFriends }));
    };

    useEffect(() => {
        if (user.email) {
            localStorage.setItem('injazi_user', JSON.stringify(user));
        } else {
            localStorage.removeItem('injazi_user');
        }
    }, [user]);

    useEffect(() => {
        if (isAuthenticated && user.email) {
            const saveTimer = setTimeout(() => {
                console.log(" Auto-Syncing State...");
                api.sync(user).catch(err => console.error("Sync failed", err));
            }, 2000);
            return () => clearTimeout(saveTimer);
        }
    }, [user.credits, user.dailyTasks, user.goal, user.realMoneyBalance, user.friends, user.isPremium, user.activePlanId]);

    useEffect(() => {
        if (view === AppView.SOCIAL && user.goal) {
            const currentGoal = user.goal;

            const loadContent = async () => {
                let updatedLessons: Chapter[] = [];
                let updatedCourses: Course[] = [];
                let updatedFeed: FeedItem[] = [];
                let updatedAds: Product[] = [];
                let updatedVideos: ExternalVideo[] = [];
                let needsSync = false;

                if (currentGoal.savedCurriculum && currentGoal.savedCurriculum.length > 0) {
                    updatedLessons = currentGoal.savedCurriculum;
                } else {
                    setIsLoadingLessons(true);
                    try {
                        const generated = await getGoalCurriculum(currentGoal);
                        if (generated && generated.length > 0) {
                            updatedLessons = generated;
                        } else {
                            updatedLessons = getDefaultCurriculum(currentGoal);
                        }
                    } catch (e) {
                        updatedLessons = getDefaultCurriculum(currentGoal);
                    }
                    setIsLoadingLessons(false);
                    needsSync = true;
                }

                if (currentGoal.savedCourses && currentGoal.savedCourses.length > 0) {
                    updatedCourses = currentGoal.savedCourses;
                } else {
                    try {
                        updatedCourses = await getSocialMarketplace();
                    } catch (e) {
                        updatedCourses = [];
                    }
                    needsSync = true;
                }

                if (currentGoal.savedFeed && currentGoal.savedFeed.length > 0) {
                    updatedFeed = currentGoal.savedFeed;
                } else {
                    try {
                        updatedFeed = await getFeedRecommendations(currentGoal);
                    } catch (e) {
                        updatedFeed = [];
                    }
                    needsSync = true;
                }

                if (currentGoal.savedProducts && currentGoal.savedProducts.length > 0) {
                    updatedAds = currentGoal.savedProducts;
                } else {
                    try {
                        updatedAds = await getSocialAds(currentGoal.category);
                    } catch (e) {
                        updatedAds = [];
                    }
                    needsSync = true;
                }

                if (currentGoal.savedVideos && currentGoal.savedVideos.length > 0) {
                    updatedVideos = currentGoal.savedVideos;
                } else {
                    updatedVideos = [
                        { id: 'v1', platform: 'YouTube', title: 'Goal Mastery Techniques', url: 'https://youtube.com', thumbnail: 'https://picsum.photos/400/225', description: 'Deep dive into achieving your goals.' },
                        { id: 'v2', platform: 'TikTok', title: 'Quick Wins Strategy', url: 'https://tiktok.com', thumbnail: 'https://picsum.photos/400/226', description: 'Fast tips for daily progress.' },
                        { id: 'v3', platform: 'YouTube', title: 'Mindset for Success', url: 'https://youtube.com', thumbnail: 'https://picsum.photos/400/227', description: 'Build the right mental framework.' }
                    ] as ExternalVideo[];
                    needsSync = true;
                }

                setLessons(updatedLessons);
                setCourses(updatedCourses);
                setFeedItems(updatedFeed);
                setAdsFeed(updatedAds);
                setRecommendedVideos(updatedVideos);

                if (needsSync) {
                    const updatedGoalData = {
                        savedCurriculum: updatedLessons,
                        savedCourses: updatedCourses,
                        savedFeed: updatedFeed,
                        savedProducts: updatedAds,
                        savedVideos: updatedVideos
                    };

                    setUser(prev => ({
                        ...prev,
                        goal: { ...prev.goal!, ...updatedGoalData },
                        allGoals: prev.allGoals.map(g =>
                            g.id === currentGoal.id ? { ...g, ...updatedGoalData } : g
                        )
                    }));
                }
            };

            loadContent();
        }
    }, [view, user.goal?.id]);

    return (
        <AppContext.Provider value={{
            user, setUser,
            view, setView,
            isAuthenticated, setIsAuthenticated,
            feedItems, setFeedItems,
            lessons, setLessons,
            courses, setCourses,
            adsFeed, setAdsFeed,
            activeSocialSection, setActiveSocialSection,
            isLoadingLessons, setIsLoadingLessons,
            recommendedVideos, setRecommendedVideos,
            showGoalManager, setShowGoalManager,
            showCheckIn, setShowCheckIn,
            showAdOverlay, setShowAdOverlay,
            adCountdown, setAdCountdown,
            friends: user.friends || [],
            setFriends,
            theme, setTheme, toggleTheme
        }}>
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => {
    const context = useContext(AppContext);
    if (context === undefined) throw new Error('useApp error');
    return context;
};
