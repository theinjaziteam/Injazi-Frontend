import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserState, AppView, GoalCategory, ConnectedApp, FeedItem, Chapter, Course, Product, Friend, EarnTask, DAILY_EARN_TASKS, SocialSection, ExternalVideo, TaskStatus, Difficulty } from '../types';
import { getGoalCurriculum, getSocialMarketplace, getSocialAds, getFeedRecommendations } from '../services/geminiService';
import { api } from '../services/api';

// --- YOUR DATA (KEPT INTACT) ---
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
  // --- YOUR TASKS (KEPT INTACT) ---
  dailyTasks: [
    { id: 'dt-1', dayNumber: 1, title: 'Strategic Planning Block', description: 'Dedicate time to structure your goals and identify high-impact actions.', estimatedTimeMinutes: 15, difficulty: Difficulty.EASY, videoRequirements: 'None', creditsReward: 50, status: TaskStatus.PENDING },
    { id: 'dt-2', dayNumber: 1, title: 'Core Execution Phase', description: 'Engage in a focused block of activity directly related to your primary goal.', estimatedTimeMinutes: 45, difficulty: Difficulty.MEDIUM, videoRequirements: 'None', creditsReward: 100, status: TaskStatus.PENDING },
    { id: 'dt-3', dayNumber: 1, title: 'Daily Review & Feedback', description: 'Log your progress and identify areas for optimization for tomorrow.', estimatedTimeMinutes: 10, difficulty: Difficulty.EASY, videoRequirements: 'None', creditsReward: 30, status: TaskStatus.PENDING }
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
  
  // --- FRIENDS MOVED HERE FOR PERSISTENCE ---
  friends: [
    { id: 'f1', name: 'Sarah', streak: 12, avatar: 'https://picsum.photos/110', lastActive: '2m ago', goalTitle: 'Run Marathon', progress: 45 },
    { id: 'f2', name: 'Mike', streak: 5, avatar: 'https://picsum.photos/111', lastActive: '1h ago', goalTitle: 'Learn Python', progress: 20 },
    { id: 'f3', name: 'Emma', streak: 30, avatar: 'https://picsum.photos/112', lastActive: '4h ago', goalTitle: 'Save $10k', progress: 75 }
  ]
};

interface AppContextType {
    user: UserState;
    setUser: React.Dispatch<React.SetStateAction<UserState>>;
    view: AppView;
    setView: (view: AppView) => void;
    isAuthenticated: boolean;
    setIsAuthenticated: (auth: boolean) => void;
    feedItems: FeedItem[]; setFeedItems: React.Dispatch<React.SetStateAction<FeedItem[]>>;
    lessons: Chapter[]; setLessons: React.Dispatch<React.SetStateAction<Chapter[]>>;
    courses: Course[]; setCourses: React.Dispatch<React.SetStateAction<Course[]>>;
    adsFeed: Product[]; setAdsFeed: React.Dispatch<React.SetStateAction<Product[]>>;
    activeSocialSection: SocialSection; setActiveSocialSection: (section: SocialSection) => void;
    isLoadingLessons: boolean; setIsLoadingLessons: (loading: boolean) => void;
    recommendedVideos: ExternalVideo[]; setRecommendedVideos: React.Dispatch<React.SetStateAction<ExternalVideo[]>>;
    showGoalManager: boolean; setShowGoalManager: (show: boolean) => void;
    showCheckIn: boolean; setShowCheckIn: (show: boolean) => void;
    showAdOverlay: boolean; setShowAdOverlay: (show: boolean) => void;
    adCountdown: number; setAdCountdown: React.Dispatch<React.SetStateAction<number>>;
    
    // Kept friends setter for backward compatibility, but it updates user state now
    friends: Friend[]; 
    setFriends: (friends: Friend[]) => void; 
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // --- 1. LOAD FROM STORAGE ON BOOT (Fixes Logout Issue) ---
    const [user, setUser] = useState<UserState>(() => {
        const saved = localStorage.getItem('injazi_user');
        return saved ? JSON.parse(saved) : INITIAL_STATE;
    });

    const [view, setView] = useState<AppView>(user.email ? (user.goal ? AppView.DASHBOARD : AppView.ONBOARDING) : AppView.LOGIN);
    const [isAuthenticated, setIsAuthenticated] = useState(!!user.email);
    
    // Content State (Fetched from AI/Cloud)
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

    // Wrapper to keep existing code working while updating User state
    const setFriends = (newFriends: any) => {
        const updatedFriends = typeof newFriends === 'function' ? newFriends(user.friends || []) : newFriends;
        setUser(prev => ({ ...prev, friends: updatedFriends }));
    };

    // --- 2. SAVE TO STORAGE ON CHANGE ---
    useEffect(() => {
        if (user.email) {
            localStorage.setItem('injazi_user', JSON.stringify(user));
        } else {
            localStorage.removeItem('injazi_user');
        }
    }, [user]);

    // --- 3. AUTO-SYNC TO DB ---
    useEffect(() => {
        if (isAuthenticated && user.email) {
            const saveTimer = setTimeout(() => {
                console.log("☁️ Auto-Syncing State...");
                api.sync(user).catch(err => console.error("Sync failed", err));
            }, 2000);
            return () => clearTimeout(saveTimer);
        }
    }, [
        user.credits,
        user.dailyTasks,
        user.goal,
        user.realMoneyBalance,
        user.friends,
        user.isPremium,
        user.activePlanId
    ]);

    // --- ASSET LOADING LOGIC ---
    useEffect(() => {
        if (view === AppView.SOCIAL && user.goal) {
            const currentGoal = user.goal;
            const loadContent = async () => {
                let updatedLessons = lessons;
                let updatedCourses = courses;
                let updatedFeed = feedItems;
                let updatedAds = adsFeed;
                let updatedVideos = recommendedVideos;
                let needsSync = false;

                if (currentGoal.savedCurriculum?.length) updatedLessons = currentGoal.savedCurriculum;
                else { setIsLoadingLessons(true); updatedLessons = await getGoalCurriculum(currentGoal); setIsLoadingLessons(false); needsSync = true; }

                if (currentGoal.savedCourses?.length) updatedCourses = currentGoal.savedCourses;
                else { updatedCourses = await getSocialMarketplace(); needsSync = true; }

                if (currentGoal.savedFeed?.length) updatedFeed = currentGoal.savedFeed;
                else { updatedFeed = await getFeedRecommendations(currentGoal); needsSync = true; }

                if (currentGoal.savedProducts?.length) updatedAds = currentGoal.savedProducts;
                else { updatedAds = await getSocialAds(currentGoal.category); needsSync = true; }

                if (currentGoal.savedVideos?.length) {
                    updatedVideos = currentGoal.savedVideos;
                } else {
                    updatedVideos = [
                        { id: 'v1', platform: 'YouTube', title: 'Goal Mastery', url: 'https://youtube.com', thumbnail: 'https://picsum.photos/400/225', description: 'Deep dive into your domain.' },
                        { id: 'v2', platform: 'TikTok', title: 'Quick Strategy', url: 'https://tiktok.com', thumbnail: 'https://picsum.photos/400/226', description: 'Leapfrog milestones.' }
                    ] as ExternalVideo[];
                    needsSync = true;
                }

                setLessons(updatedLessons);
                setCourses(updatedCourses);
                setFeedItems(updatedFeed);
                setAdsFeed(updatedAds);
                setRecommendedVideos(updatedVideos);

                if (needsSync) {
                    const updatedGoalData = { savedCurriculum: updatedLessons, savedCourses: updatedCourses, savedFeed: updatedFeed, savedProducts: updatedAds, savedVideos: updatedVideos };
                    setUser(prev => ({
                        ...prev,
                        goal: { ...prev.goal!, ...updatedGoalData },
                        allGoals: prev.allGoals.map(g => g.id === currentGoal.id ? { ...g, ...updatedGoalData } : g)
                    }));
                }
            };
            loadContent();
        }
    }, [view, user.goal?.id]);

    return (
        <AppContext.Provider value={{
            user, setUser, view, setView, isAuthenticated, setIsAuthenticated,
            feedItems, setFeedItems, lessons, setLessons, courses, setCourses, adsFeed, setAdsFeed,
            activeSocialSection, setActiveSocialSection, isLoadingLessons, setIsLoadingLessons,
            recommendedVideos, setRecommendedVideos,
            showGoalManager, setShowGoalManager, showCheckIn, setShowCheckIn, showAdOverlay, setShowAdOverlay, adCountdown, setAdCountdown,
            friends: user.friends || [], setFriends // Expose friends from user
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