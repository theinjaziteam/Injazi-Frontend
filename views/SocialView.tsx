// views/SocialView.tsx
import React, { useState, useRef, useCallback, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { AppView, SocialSection, GoalCategory, Lesson, Course, Product, QuizQuestion, Chapter, Friend, TaskStatus } from '../types';
import { Icons, Button, Badge, Card } from '../components/UIComponents';
import { api } from '../services/api';
import { generateLessonContent, generateLessonTasks } from '../services/geminiService';

// Mock data for challenges
interface Challenge {
    id: string;
    title: string;
    description: string;
    type: 'tasks' | 'credits' | 'streak';
    duration: string;
    participants: Friend[];
    creatorId: string;
    creatorName: string;
    startDate: string;
    endDate: string;
    status: 'active' | 'pending' | 'completed';
    myScore?: number;
    leaderboard: { odlUserId: string; name: string; avatar: string; score: number }[];
}

interface FriendActivity {
    id: string;
    odlUserId: string;
    userName: string;
    userAvatar: string;
    type: 'course' | 'product' | 'video' | 'goal_complete' | 'streak';
    title: string;
    description?: string;
    thumbnail?: string;
    timestamp: string;
    itemId?: string;
}

// Mock Feed Videos
const MOCK_FEED_VIDEOS = [
    {
        id: 'feed1',
        creatorId: 'g1',
        creatorName: 'Alex Builder',
        creatorAvatar: 'https://picsum.photos/seed/alex/200',
        title: 'How I built my first startup in 30 days',
        description: 'The journey from idea to launch - sharing my experience and lessons learned along the way.',
        thumbnailUrl: 'https://picsum.photos/seed/startup1/800/1400',
        videoUrl: '',
        likes: 1247,
        comments: [{ id: '1', text: 'Amazing!', user: 'John' }],
        shares: 89,
        isLiked: false
    },
    {
        id: 'feed2',
        creatorId: 'g2',
        creatorName: 'Jordan Fit',
        creatorAvatar: 'https://picsum.photos/seed/jordan/200',
        title: 'Morning routine that changed my life',
        description: '5AM wake up, cold shower, workout - here\'s exactly what I do every morning.',
        thumbnailUrl: 'https://picsum.photos/seed/fitness1/800/1400',
        videoUrl: '',
        likes: 3421,
        comments: [{ id: '1', text: 'Inspiring!', user: 'Sarah' }, { id: '2', text: 'Need this energy', user: 'Mike' }],
        shares: 234,
        isLiked: true
    },
    {
        id: 'feed3',
        creatorId: 'g3',
        creatorName: 'Casey Code',
        creatorAvatar: 'https://picsum.photos/seed/casey/200',
        title: 'React tricks nobody talks about',
        description: 'Advanced patterns that will make your code cleaner and more maintainable.',
        thumbnailUrl: 'https://picsum.photos/seed/code1/800/1400',
        videoUrl: '',
        likes: 892,
        comments: [{ id: '1', text: 'Finally someone explains this!', user: 'Dev123' }],
        shares: 156,
        isLiked: false
    },
    {
        id: 'feed4',
        creatorId: 'g4',
        creatorName: 'Dana Design',
        creatorAvatar: 'https://picsum.photos/seed/dana/200',
        title: 'Design portfolio that got me hired at Google',
        description: 'Breaking down my portfolio piece by piece and what made it stand out.',
        thumbnailUrl: 'https://picsum.photos/seed/design1/800/1400',
        videoUrl: '',
        likes: 5678,
        comments: [{ id: '1', text: 'So helpful!', user: 'Designer99' }, { id: '2', text: 'Saved!', user: 'UXPro' }],
        shares: 445,
        isLiked: false
    },
    {
        id: 'feed5',
        creatorId: 'g5',
        creatorName: 'Sam Sales',
        creatorAvatar: 'https://picsum.photos/seed/sam/200',
        title: 'Closed $50k in one call - here\'s how',
        description: 'The exact script and techniques I used to close my biggest deal ever.',
        thumbnailUrl: 'https://picsum.photos/seed/sales1/800/1400',
        videoUrl: '',
        likes: 2134,
        comments: [{ id: '1', text: 'Gold content!', user: 'SalesGuru' }],
        shares: 312,
        isLiked: true
    }
];

const MOCK_GLOBAL_USERS: Friend[] = [
    { id: 'g1', name: 'Alex Builder', streak: 45, avatar: 'https://picsum.photos/seed/alex/200', lastActive: '5m ago', goalTitle: 'Launch Startup', progress: 60, credits: 12500, tasksCompleted: 89 },
    { id: 'g2', name: 'Jordan Fit', streak: 120, avatar: 'https://picsum.photos/seed/jordan/200', lastActive: '1h ago', goalTitle: 'Ironman Training', progress: 85, credits: 34200, tasksCompleted: 156 },
    { id: 'g3', name: 'Casey Code', streak: 8, avatar: 'https://picsum.photos/seed/casey/200', lastActive: '2d ago', goalTitle: 'Master React', progress: 15, credits: 4300, tasksCompleted: 23 },
    { id: 'g4', name: 'Dana Design', streak: 33, avatar: 'https://picsum.photos/seed/dana/200', lastActive: '10m ago', goalTitle: 'UX Portfolio', progress: 40, credits: 8900, tasksCompleted: 67 },
    { id: 'g5', name: 'Sam Sales', streak: 19, avatar: 'https://picsum.photos/seed/sam/200', lastActive: '4h ago', goalTitle: '1M Revenue', progress: 30, credits: 15600, tasksCompleted: 45 },
];

const MOCK_CHALLENGES: Challenge[] = [
    {
        id: 'ch1',
        title: 'Weekly Task Champion',
        description: 'Complete the most tasks this week',
        type: 'tasks',
        duration: '7 days',
        participants: [MOCK_GLOBAL_USERS[0], MOCK_GLOBAL_USERS[1]],
        creatorId: 'g1',
        creatorName: 'Alex Builder',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        myScore: 12,
        leaderboard: [
            { odlUserId: 'me', name: 'You', avatar: 'https://picsum.photos/seed/me/200', score: 12 },
            { odlUserId: 'g1', name: 'Alex Builder', avatar: 'https://picsum.photos/seed/alex/200', score: 15 },
            { odlUserId: 'g2', name: 'Jordan Fit', avatar: 'https://picsum.photos/seed/jordan/200', score: 8 },
        ]
    },
    {
        id: 'ch2',
        title: 'Credit Earners',
        description: 'Who can earn the most credits?',
        type: 'credits',
        duration: '30 days',
        participants: [MOCK_GLOBAL_USERS[2], MOCK_GLOBAL_USERS[3]],
        creatorId: 'g3',
        creatorName: 'Casey Code',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        myScore: 2450,
        leaderboard: [
            { odlUserId: 'g3', name: 'Casey Code', avatar: 'https://picsum.photos/seed/casey/200', score: 3200 },
            { odlUserId: 'me', name: 'You', avatar: 'https://picsum.photos/seed/me/200', score: 2450 },
            { odlUserId: 'g4', name: 'Dana Design', avatar: 'https://picsum.photos/seed/dana/200', score: 1800 },
        ]
    }
];

const MOCK_FRIEND_ACTIVITIES: FriendActivity[] = [
    { id: 'fa1', odlUserId: 'g1', userName: 'Alex Builder', userAvatar: 'https://picsum.photos/seed/alex/200', type: 'course', title: 'Published a new course', description: 'Startup Fundamentals 101', thumbnail: 'https://picsum.photos/seed/course1/400/300', timestamp: '2h ago' },
    { id: 'fa2', odlUserId: 'g2', userName: 'Jordan Fit', userAvatar: 'https://picsum.photos/seed/jordan/200', type: 'video', title: 'Posted a new video', description: 'My morning workout routine', thumbnail: 'https://picsum.photos/seed/video1/400/300', timestamp: '4h ago' },
    { id: 'fa3', odlUserId: 'g4', userName: 'Dana Design', userAvatar: 'https://picsum.photos/seed/dana/200', type: 'product', title: 'Listed a new product', description: 'UX Design Template Pack', thumbnail: 'https://picsum.photos/seed/product1/400/300', timestamp: '1d ago' },
    { id: 'fa4', odlUserId: 'g3', userName: 'Casey Code', userAvatar: 'https://picsum.photos/seed/casey/200', type: 'goal_complete', title: 'Completed a goal!', description: 'Learn TypeScript Basics', timestamp: '2d ago' },
    { id: 'fa5', odlUserId: 'g5', userName: 'Sam Sales', userAvatar: 'https://picsum.photos/seed/sam/200', type: 'streak', title: 'Hit a 20-day streak!', description: 'Consistency pays off', timestamp: '3d ago' },
];

export default function SocialView() {
    const { 
        user, setUser, setView,
        feedItems, 
        lessons, setLessons, activeSocialSection, setActiveSocialSection,
        courses, setCourses, recommendedVideos, adsFeed, setAdsFeed,
        isLoadingLessons
    } = useApp();

    const friends = user.friends || [];
    const dailyTasks = user.dailyTasks || [];

    // Use mock feed if no feed items
    const activeFeedItems = feedItems.length > 0 ? feedItems : MOCK_FEED_VIDEOS;

    const [viewingLesson, setViewingLesson] = useState<Lesson | null>(null);
    const [viewingProfile, setViewingProfile] = useState<Friend | null>(null);
    const [activeQuiz, setActiveQuiz] = useState<{ chapter: Chapter, questions: QuizQuestion[] } | null>(null);
    const [isLoadingLessonContent, setIsLoadingLessonContent] = useState(false);
    const [isStartingLesson, setIsStartingLesson] = useState(false);
    const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
    
    const [quizIndex, setQuizIndex] = useState(0);
    const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
    const [quizFinished, setQuizFinished] = useState(false);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [productSearchQuery, setProductSearchQuery] = useState('');
    const [courseSearchQuery, setCourseSearchQuery] = useState('');
    
    // List Item Modal State
    const [isAddingItem, setIsAddingItem] = useState(false);
    const [newItemTitle, setNewItemTitle] = useState('');
    const [newItemDesc, setNewItemDesc] = useState('');
    const [newItemPriceCredits, setNewItemPriceCredits] = useState<string>('');
    const [newItemAttachments, setNewItemAttachments] = useState<{ type: 'file' | 'link'; name: string; url: string }[]>([]);
    const [newLinkUrl, setNewLinkUrl] = useState('');
    const [showAddLink, setShowAddLink] = useState(false);

    // Community tab state
    const [communityTab, setCommunityTab] = useState<'friends' | 'challenges' | 'activity'>('friends');
    const [challenges, setChallenges] = useState<Challenge[]>(MOCK_CHALLENGES);
    const [friendActivities] = useState<FriendActivity[]>(MOCK_FRIEND_ACTIVITIES);
    const [showCreateChallenge, setShowCreateChallenge] = useState(false);
    const [newChallenge, setNewChallenge] = useState({ title: '', type: 'tasks' as 'tasks' | 'credits' | 'streak', duration: '7' });
    const [viewingChallenge, setViewingChallenge] = useState<Challenge | null>(null);

    // TikTok-style header visibility for Feed only
    const [isFeedHeaderVisible, setIsFeedHeaderVisible] = useState(true);
    const lastScrollY = useRef(0);
    const scrollTimeout = useRef<NodeJS.Timeout | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Filter products by search
    const filteredProducts = useMemo(() => {
        if (!productSearchQuery.trim()) return adsFeed;
        return adsFeed.filter(p => 
            p.title.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
            (p.description && p.description.toLowerCase().includes(productSearchQuery.toLowerCase())) ||
            (p.creatorName && p.creatorName.toLowerCase().includes(productSearchQuery.toLowerCase()))
        );
    }, [adsFeed, productSearchQuery]);

    // Filter courses by search
    const filteredCourses = useMemo(() => {
        if (!courseSearchQuery.trim()) return courses;
        return courses.filter(c => 
            c.title.toLowerCase().includes(courseSearchQuery.toLowerCase()) ||
            (c.description && c.description.toLowerCase().includes(courseSearchQuery.toLowerCase())) ||
            (c.creator && c.creator.toLowerCase().includes(courseSearchQuery.toLowerCase()))
        );
    }, [courses, courseSearchQuery]);

    const getCommunityList = () => {
        if (!searchQuery) return friends;
        const matchingFriends = friends.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchingStrangers = MOCK_GLOBAL_USERS.filter(u => 
            u.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
            !friends.some(f => f.id === u.id)
        );
        return [...matchingFriends, ...matchingStrangers];
    };

    const communityList = getCommunityList();

    // Handle feed scroll for TikTok-style header
    const handleFeedScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const currentScrollY = e.currentTarget.scrollTop;
        const scrollDiff = currentScrollY - lastScrollY.current;
        
        if (scrollTimeout.current) {
            clearTimeout(scrollTimeout.current);
        }
        
        if (scrollDiff > 8 && currentScrollY > 60) {
            setIsFeedHeaderVisible(false);
        }
        else if (scrollDiff < -8) {
            setIsFeedHeaderVisible(true);
        }
        
        scrollTimeout.current = setTimeout(() => {
            setIsFeedHeaderVisible(true);
        }, 2000);
        
        lastScrollY.current = currentScrollY;
    }, []);

    // Navigate to user profile in community
    const handleProfileClick = (profile: Friend) => {
        setViewingProfile(profile);
        setActiveSocialSection(SocialSection.FRIENDS);
    };

    // Check lesson status
    const getLessonStatus = (lessonId: string): 'not_started' | 'in_progress' | 'completed' => {
        const lessonTasks = dailyTasks.filter(t => t.sourceLessonId === lessonId && t.isLessonTask);
        
        if (lessonTasks.length === 0) return 'not_started';
        
        const allCompleted = lessonTasks.every(t => 
            t.status === TaskStatus.APPROVED || t.status === TaskStatus.COMPLETED
        );
        
        return allCompleted ? 'completed' : 'in_progress';
    };

    const getPendingTaskCount = (lessonId: string): number => {
        return dailyTasks.filter(t => 
            t.sourceLessonId === lessonId && 
            t.isLessonTask &&
            t.status !== TaskStatus.APPROVED && 
            t.status !== TaskStatus.COMPLETED
        ).length;
    };

    const handleLessonClick = async (lesson: Lesson, chapter: Chapter) => {
        if (lesson.isLocked) return;
        
        setCurrentChapter(chapter);
        
        if (lesson.content) {
            setViewingLesson(lesson);
            return;
        }
        
        setViewingLesson(lesson);
        setIsLoadingLessonContent(true);
        
        try {
            const content = await generateLessonContent(
                { id: lesson.id, title: lesson.title, description: lesson.description || '', duration: lesson.duration },
                user.goal!,
                chapter.title
            );
            
            if (content) {
                const updatedLesson = { ...lesson, content };
                setViewingLesson(updatedLesson);
                
                const updatedLessons = lessons.map(ch => {
                    if (ch.id === chapter.id) {
                        return { ...ch, lessons: ch.lessons.map(l => l.id === lesson.id ? { ...l, content } : l) };
                    }
                    return ch;
                });
                
                setLessons(updatedLessons);
                
                if (user.goal) {
                    setUser(prev => ({
                        ...prev,
                        goal: { ...prev.goal!, savedCurriculum: updatedLessons },
                        allGoals: prev.allGoals.map(g => g.id === prev.goal?.id ? { ...g, savedCurriculum: updatedLessons } : g)
                    }));
                }
            }
        } catch (error) {
            console.error('Failed to generate lesson content:', error);
        } finally {
            setIsLoadingLessonContent(false);
        }
    };

    const handleStartLesson = async () => {
        if (!viewingLesson || !viewingLesson.content || !user.goal) return;
        
        setIsStartingLesson(true);
        
        try {
            const lessonTasks = await generateLessonTasks(
                { id: viewingLesson.id, title: viewingLesson.title, description: viewingLesson.description || '' },
                user.goal,
                viewingLesson.content
            );
            
            setUser(prev => ({ ...prev, dailyTasks: [...(prev.dailyTasks || []), ...lessonTasks] }));
            closeLessonModal();
            setView(AppView.DASHBOARD);
        } catch (error) {
            console.error('Failed to start lesson:', error);
            alert('Failed to generate lesson tasks. Please try again.');
        } finally {
            setIsStartingLesson(false);
        }
    };

    const handleContinueLesson = () => {
        closeLessonModal();
        setView(AppView.DASHBOARD);
    };

    const handleToggleFriendship = async (targetUser: Friend) => {
        const isAlreadyFriend = friends.some(f => f.id === targetUser.id);
        let updatedFriends;

        if (isAlreadyFriend) {
            if(!window.confirm(`Disconnect from ${targetUser.name}?`)) return;
            updatedFriends = friends.filter(f => f.id !== targetUser.id);
        } else {
            updatedFriends = [...friends, targetUser];
        }

        const updatedUser = { ...user, friends: updatedFriends };
        setUser(updatedUser);
        
        try {
            await api.sync(updatedUser);
            if(isAlreadyFriend) setViewingProfile(null); 
        } catch(e) {
            console.error(e);
            alert("Connection error. Could not update friend list.");
        }
    };

    const handleQuizStart = (chapter: Chapter) => {
        if (!chapter.quiz || chapter.quiz.length === 0) return;
        setActiveQuiz({ chapter, questions: chapter.quiz });
        setQuizIndex(0);
        setQuizAnswers([]);
        setQuizFinished(false);
    };

    const handleAnswerSelect = (index: number) => {
        const newAnswers = [...quizAnswers, index];
        setQuizAnswers(newAnswers);
        if (quizIndex < (activeQuiz?.questions.length || 0) - 1) {
            setQuizIndex(quizIndex + 1);
        } else {
            setQuizFinished(true);
        }
    };

    const handleAddItem = () => {
        if (user.activePlanId !== 'creator') {
            alert("Upgrade to Creator Plan to publish assets.");
            return;
        }
        setIsAddingItem(true);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        
        Array.from(files).forEach(file => {
            // In real app, upload to server and get URL
            const fakeUrl = URL.createObjectURL(file);
            setNewItemAttachments(prev => [...prev, {
                type: 'file',
                name: file.name,
                url: fakeUrl
            }]);
        });
    };

    const handleAddLink = () => {
        if (!newLinkUrl.trim()) return;
        
        // Basic URL validation
        let url = newLinkUrl.trim();
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }
        
        setNewItemAttachments(prev => [...prev, {
            type: 'link',
            name: url,
            url: url
        }]);
        setNewLinkUrl('');
        setShowAddLink(false);
    };

    const removeAttachment = (index: number) => {
        setNewItemAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const confirmAddItem = () => {
        const priceCredits = parseInt(newItemPriceCredits);
        if (!newItemTitle || isNaN(priceCredits) || priceCredits < 100) {
            alert("Title and valid price (min 100 credits) are required.");
            return;
        }

        if (activeSocialSection === SocialSection.PRODUCTS) {
            const newProduct: Product = {
                id: Date.now().toString(),
                creatorId: 'me',
                creatorName: user.name,
                title: newItemTitle,
                description: newItemDesc,
                mediaUrls: newItemAttachments.length > 0 
                    ? newItemAttachments.map(a => a.url) 
                    : ['https://picsum.photos/600/401'],
                priceUsd: priceCredits / 4000,
                priceCredits: priceCredits,
                currencyType: 'credits',
                category: user.goal?.category || GoalCategory.OTHER,
                likes: 0,
                attachments: newItemAttachments
            };
            setAdsFeed(prev => [newProduct, ...prev]);
        } else {
            const newCourse: Course = {
                id: Date.now().toString(),
                title: newItemTitle,
                description: newItemDesc,
                creator: user.name,
                currencyType: 'credits',
                priceUsd: priceCredits / 4000,
                priceCredits: priceCredits,
                rating: 5,
                thumbnail: newItemAttachments.find(a => a.type === 'file')?.url || 'https://picsum.photos/600/402',
                attachments: newItemAttachments
            };
            setCourses(prev => [newCourse, ...prev]);
        }
        
        alert(`Published! Price: ${priceCredits.toLocaleString()} Credits`);
        resetAddItemForm();
    };

    const resetAddItemForm = () => {
        setIsAddingItem(false);
        setNewItemTitle('');
        setNewItemDesc('');
        setNewItemPriceCredits('');
        setNewItemAttachments([]);
        setNewLinkUrl('');
        setShowAddLink(false);
    };

    const handleBuyItem = (item: any) => {
        const priceCR = item.priceCredits || 1000;

        if (!window.confirm(`Purchase "${item.title}" for ${priceCR.toLocaleString()} Credits?`)) {
            return;
        }

        if (user.credits >= priceCR) {
            setUser(prev => ({ ...prev, credits: prev.credits - priceCR }));
            alert("Purchase complete! Check your downloads.");
        } else {
            alert(`Insufficient credits. You need ${priceCR.toLocaleString()} CR but have ${user.credits.toLocaleString()} CR.`);
        }
    };

    const handleCreateChallenge = () => {
        if (!newChallenge.title.trim()) {
            alert('Please enter a challenge title');
            return;
        }

        const challenge: Challenge = {
            id: `ch-${Date.now()}`,
            title: newChallenge.title,
            description: newChallenge.type === 'tasks' ? 'Complete the most tasks' : 
                         newChallenge.type === 'credits' ? 'Earn the most credits' : 'Maintain the longest streak',
            type: newChallenge.type,
            duration: `${newChallenge.duration} days`,
            participants: [],
            creatorId: 'me',
            creatorName: user.name,
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + parseInt(newChallenge.duration) * 24 * 60 * 60 * 1000).toISOString(),
            status: 'pending',
            myScore: 0,
            leaderboard: [{ odlUserId: 'me', name: 'You', avatar: 'https://picsum.photos/seed/me/200', score: 0 }]
        };

        setChallenges(prev => [challenge, ...prev]);
        setShowCreateChallenge(false);
        setNewChallenge({ title: '', type: 'tasks', duration: '7' });
        alert('Challenge created! Invite friends to join.');
    };

    const handleJoinChallenge = (challenge: Challenge) => {
        setChallenges(prev => prev.map(c => {
            if (c.id === challenge.id) {
                return {
                    ...c,
                    status: 'active' as const,
                    leaderboard: [...c.leaderboard, { odlUserId: 'me', name: 'You', avatar: 'https://picsum.photos/seed/me/200', score: 0 }]
                };
            }
            return c;
        }));
        alert('You joined the challenge!');
    };

    const closeLessonModal = () => {
        setViewingLesson(null);
        setIsLoadingLessonContent(false);
        setIsStartingLesson(false);
        setCurrentChapter(null);
    };

    // ==================== RENDER FUNCTIONS ====================

    const renderFeedHeader = () => (
        <div 
            className={`absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/70 via-black/40 to-transparent pt-safe transition-all duration-300 ease-out ${
                isFeedHeaderVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'
            }`}
        >
            <div className="flex overflow-x-auto no-scrollbar p-4 gap-3">
                {[
                  { id: SocialSection.LESSONS, label: 'Curriculum' },
                  { id: SocialSection.FOR_YOU, label: 'Feed' },
                  { id: SocialSection.RECOMMENDED, label: 'Resources' },
                  { id: SocialSection.FRIENDS, label: 'Community' },
                  { id: SocialSection.PRODUCTS, label: 'Products' },
                  { id: SocialSection.COURSES, label: 'Courses' }
                ].map(section => (
                    <button 
                        key={section.id}
                        onClick={() => {
                            setActiveSocialSection(section.id);
                            setIsFeedHeaderVisible(true);
                        }}
                        className={`whitespace-nowrap px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all backdrop-blur-sm flex-shrink-0
                            ${activeSocialSection === section.id 
                                ? 'bg-white text-primary shadow-lg' 
                                : 'bg-white/20 text-white hover:bg-white/30'
                            }`}
                    >
                        {section.label}
                    </button>
                ))}
            </div>
        </div>
    );

    const renderLessons = () => {
        if (isLoadingLessons) {
            return (
                <div className="h-full flex flex-col items-center justify-center p-10 text-center animate-fade-in bg-white/50 backdrop-blur-sm">
                    <div className="relative mb-10 scale-125">
                        <div className="w-24 h-24 rounded-full border-4 border-gray-100"></div>
                        <div className="absolute top-0 left-0 w-24 h-24 rounded-full border-4 border-primary border-t-transparent animate-[spin_0.6s_linear_infinite]"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Icons.BookOpen className="w-10 h-10 text-primary animate-pulse" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-black text-primary uppercase tracking-tighter mb-4">Building Your Path</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">Creating your personalized curriculum...</p>
                </div>
            );
        }

        return (
            <div className="p-5 pb-4 space-y-8 animate-fade-in">
                {lessons.length > 0 ? lessons.map((chapter, chapterIdx) => {
                    const completedInChapter = chapter.lessons.filter(l => getLessonStatus(l.id) === 'completed').length;
                    
                    return (
                        <div key={chapter.id} className="relative">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center text-lg font-black shadow-lg shadow-primary/20">
                                    {chapterIdx + 1}
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-primary tracking-tighter uppercase leading-none">{chapter.title}</h3>
                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.15em] mt-1 block">
                                        {chapter.lessons.length} Modules • {completedInChapter} Completed
                                    </span>
                                </div>
                            </div>
                            
                            <div className="space-y-3 ml-6 border-l-2 border-gray-200 pl-6">
                                {chapter.lessons.map((l, idx) => {
                                    const status = getLessonStatus(l.id);
                                    const pendingCount = getPendingTaskCount(l.id);
                                    
                                    return (
                                        <div 
                                            key={l.id} 
                                            className={`p-5 rounded-2xl border-2 transition-all group cursor-pointer
                                                ${l.isLocked 
                                                    ? 'bg-gray-50 border-gray-100 opacity-50 cursor-not-allowed' 
                                                    : status === 'completed'
                                                        ? 'bg-green-50 border-green-200 hover:border-green-300'
                                                        : status === 'in_progress'
                                                            ? 'bg-amber-50 border-amber-200 hover:border-amber-300'
                                                            : 'bg-white border-gray-200 hover:border-primary/30 hover:shadow-lg'
                                                }`}
                                            onClick={() => handleLessonClick(l, chapter)}
                                        >
                                            <div className="flex justify-between items-center">
                                                <div className="flex gap-4 items-center">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all
                                                        ${l.isLocked 
                                                            ? 'bg-gray-100' 
                                                            : status === 'completed'
                                                                ? 'bg-green-500 text-white'
                                                                : status === 'in_progress'
                                                                    ? 'bg-amber-500 text-white'
                                                                    : 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white'
                                                        }`}
                                                    >
                                                        {l.isLocked 
                                                            ? <Icons.Lock className="w-4 h-4 text-gray-400"/> 
                                                            : status === 'completed'
                                                                ? <Icons.Check className="w-5 h-5"/>
                                                                : status === 'in_progress'
                                                                    ? <Icons.Clock className="w-5 h-5"/>
                                                                    : <span className="font-black text-sm">{idx + 1}</span>
                                                        }
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className={`font-bold text-sm leading-tight transition-colors
                                                            ${status === 'completed' ? 'text-green-700' : status === 'in_progress' ? 'text-amber-700' : 'text-primary group-hover:text-secondary'}`}>
                                                            {l.title}
                                                        </h4>
                                                        <p className="text-xs text-gray-400 mt-1 line-clamp-1">{l.description}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 ml-4">
                                                    {status === 'completed' && (
                                                        <span className="text-[9px] font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full">DONE</span>
                                                    )}
                                                    {status === 'in_progress' && (
                                                        <span className="text-[9px] font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded-full">{pendingCount} LEFT</span>
                                                    )}
                                                    <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-3 py-1.5 rounded-full whitespace-nowrap">{l.duration}</span>
                                                    {!l.isLocked && (
                                                        <Icons.ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-primary transition-colors" />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {chapter.quiz && chapter.quiz.length > 0 && !chapter.lessons.some(l => l.isLocked) && (
                                    <div className="p-5 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/20">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2.5 bg-white/10 rounded-xl">
                                                    <Icons.Trophy className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-sm">Phase Validation</h4>
                                                    <p className="text-[10px] text-white/60">Pass the quiz to complete this phase</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleQuizStart(chapter)}
                                                className="px-5 py-2.5 bg-white text-primary rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-white/90 transition-colors"
                                            >
                                                Start Quiz
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                }) : (
                    <div className="text-center py-20">
                        <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Icons.BookOpen className="w-10 h-10 text-gray-300" />
                        </div>
                        <h3 className="text-xl font-bold text-primary mb-2">No Curriculum Yet</h3>
                        <p className="text-gray-400 text-sm max-w-xs mx-auto">
                            Complete your goal setup to generate a personalized learning path.
                        </p>
                    </div>
                )}
            </div>
        );
    };

    // Feed with clickable profile and mock videos
    const renderForYou = () => (
        <div 
            onScroll={handleFeedScroll}
            className="h-full overflow-y-scroll snap-y snap-mandatory bg-black no-scrollbar"
        >
            {activeFeedItems.length > 0 ? activeFeedItems.map((item: any, index) => (
                <div key={item.id} className="h-full w-full snap-start relative flex items-center justify-center bg-gray-900">
                    <img src={item.thumbnailUrl} className="absolute inset-0 w-full h-full object-cover opacity-70" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none" />
                    
                    {/* Play button overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                            <Icons.PlayCircle className="w-12 h-12 text-white" />
                        </div>
                    </div>
                    
                    {/* Content with clickable profile */}
                    <div className="absolute left-4 bottom-28 right-20 text-white animate-fade-in">
                        <button 
                            onClick={() => {
                                const mockUser = MOCK_GLOBAL_USERS.find(u => u.id === item.creatorId) || {
                                    id: item.creatorId || `creator-${index}`,
                                    name: item.creatorName,
                                    avatar: item.creatorAvatar,
                                    streak: Math.floor(Math.random() * 100) + 1,
                                    lastActive: 'Just now',
                                    goalTitle: 'Content Creator',
                                    progress: Math.floor(Math.random() * 100),
                                    credits: Math.floor(Math.random() * 50000),
                                    tasksCompleted: Math.floor(Math.random() * 200)
                                };
                                handleProfileClick(mockUser as Friend);
                            }}
                            className="flex items-center gap-3 mb-3 group"
                        >
                            <div className="relative">
                                <img src={item.creatorAvatar} className="w-12 h-12 rounded-full border-2 border-white/50 group-hover:border-secondary transition-colors" />
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-secondary rounded-full flex items-center justify-center border-2 border-black">
                                    <Icons.Plus className="w-3 h-3 text-white" />
                                </div>
                            </div>
                            <div className="text-left">
                                <h3 className="font-bold text-base group-hover:text-secondary transition-colors">@{item.creatorName}</h3>
                                <p className="text-[10px] text-white/60">Tap to view profile</p>
                            </div>
                        </button>
                        <p className="text-sm font-bold leading-tight mb-2">{item.title}</p>
                        {item.description && (
                            <p className="text-[11px] text-white/70 leading-relaxed max-w-[90%] line-clamp-2">{item.description}</p>
                        )}
                    </div>

                    {/* Action buttons */}
                    <div className="absolute right-4 bottom-32 flex flex-col gap-5 items-center">
                        {/* Profile button */}
                        <button 
                            onClick={() => {
                                const mockUser = MOCK_GLOBAL_USERS.find(u => u.id === item.creatorId) || {
                                    id: item.creatorId || `creator-${index}`,
                                    name: item.creatorName,
                                    avatar: item.creatorAvatar,
                                    streak: Math.floor(Math.random() * 100) + 1,
                                    lastActive: 'Just now',
                                    goalTitle: 'Content Creator',
                                    progress: Math.floor(Math.random() * 100),
                                    credits: Math.floor(Math.random() * 50000),
                                    tasksCompleted: Math.floor(Math.random() * 200)
                                };
                                handleProfileClick(mockUser as Friend);
                            }}
                            className="flex flex-col items-center group cursor-pointer"
                        >
                            <div className="relative">
                                <img src={item.creatorAvatar} className="w-12 h-12 rounded-full border-2 border-white/50 group-active:scale-90 transition-transform" />
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-5 bg-secondary rounded-full flex items-center justify-center border-2 border-black">
                                    <Icons.Plus className="w-3 h-3 text-white" />
                                </div>
                            </div>
                        </button>
                        
                        <div className="flex flex-col items-center group cursor-pointer">
                            <div className="p-3 bg-white/10 rounded-full backdrop-blur-md group-active:scale-90 transition-transform">
                                <Icons.Heart className={`w-7 h-7 ${item.isLiked ? 'text-red-500 fill-current' : 'text-white'}`}/>
                            </div>
                            <span className="text-[10px] text-white font-black mt-1">{item.likes?.toLocaleString()}</span>
                        </div>
                        <div className="flex flex-col items-center group cursor-pointer">
                            <div className="p-3 bg-white/10 rounded-full backdrop-blur-md group-active:scale-90 transition-transform">
                                <Icons.MessageCircle className="w-7 h-7 text-white"/>
                            </div>
                            <span className="text-[10px] text-white font-black mt-1">{item.comments?.length || 0}</span>
                        </div>
                        <div className="flex flex-col items-center group cursor-pointer">
                            <div className="p-3 bg-white/10 rounded-full backdrop-blur-md group-active:scale-90 transition-transform">
                                <Icons.Share2 className="w-7 h-7 text-white"/>
                            </div>
                            <span className="text-[10px] text-white font-black mt-1">{item.shares || 0}</span>
                        </div>
                    </div>

                    {index === 0 && (
                        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce">
                            <Icons.ChevronDown className="w-6 h-6 text-white/50" />
                            <span className="text-[9px] text-white/40 font-bold uppercase tracking-wider">Scroll</span>
                        </div>
                    )}
                </div>
            )) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-10">
                    <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-4">
                        <Icons.Film className="w-10 h-10 text-white/30" />
                    </div>
                    <h3 className="text-white/50 font-black uppercase tracking-widest text-sm mb-2">No Feed Items</h3>
                    <p className="text-white/30 text-xs">Content coming soon</p>
                </div>
            )}
        </div>
    );

    // Marketplace with search
    const renderMarketplace = (type: 'products' | 'courses') => {
        const items = type === 'courses' ? filteredCourses : filteredProducts;
        const searchValue = type === 'courses' ? courseSearchQuery : productSearchQuery;
        const setSearchValue = type === 'courses' ? setCourseSearchQuery : setProductSearchQuery;
        
        return (
            <div className="p-4 space-y-3">
                {/* Search Bar */}
                <div className="relative mb-4">
                    <Icons.Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300"/>
                    <input 
                        type="text" 
                        placeholder={`Search ${type}...`}
                        className="w-full pl-12 pr-10 py-3.5 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-primary/20 transition-all outline-none text-sm font-medium" 
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                    />
                    {searchValue && (
                        <button 
                            onClick={() => setSearchValue('')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors"
                        >
                            <Icons.X className="w-3 h-3 text-gray-500" />
                        </button>
                    )}
                </div>

                {searchValue && (
                    <p className="text-xs text-gray-400 mb-2">
                        {items.length} result{items.length !== 1 ? 's' : ''} for "{searchValue}"
                    </p>
                )}

                {items.length > 0 ? items.map(item => (
                    <div 
                        key={item.id} 
                        className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex gap-3 p-3 active:scale-[0.98] transition-transform"
                    >
                        <div className="w-24 h-24 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                            <img 
                                src={(item as any).thumbnail || (item as any).mediaUrls?.[0]} 
                                className="w-full h-full object-cover" 
                                alt={item.title}
                            />
                        </div>
                        
                        <div className="flex-1 flex flex-col justify-between min-w-0 py-0.5">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[8px] font-bold uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                        {type === 'courses' ? 'Course' : 'Product'}
                                    </span>
                                </div>
                                <h4 className="font-bold text-primary text-sm leading-tight line-clamp-1">
                                    {item.title}
                                </h4>
                                <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">
                                    By {(item as any).creator || (item as any).creatorName}
                                </p>
                            </div>
                            
                            <div className="flex items-center justify-between mt-2">
                                <div className="flex items-center gap-1">
                                    <Icons.Coins className="w-4 h-4 text-yellow-500" />
                                    <span className="text-base font-black text-primary">
                                        {((item as any).priceCredits || 1000).toLocaleString()}
                                    </span>
                                </div>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleBuyItem(item); }}
                                    className="bg-primary text-white text-[9px] font-bold uppercase tracking-wider px-4 py-2 rounded-xl active:scale-95 transition-transform"
                                >
                                    Buy
                                </button>
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="flex flex-col items-center justify-center py-16">
                        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                            {searchValue ? (
                                <Icons.Search className="w-7 h-7 text-gray-300" />
                            ) : (
                                <Icons.ShoppingBag className="w-7 h-7 text-gray-300" />
                            )}
                        </div>
                        <h3 className="text-gray-400 font-bold text-sm">
                            {searchValue ? 'No Results Found' : 'No Items Yet'}
                        </h3>
                        <p className="text-[11px] text-gray-300 mt-1">
                            {searchValue ? 'Try a different search term' : 'Check back soon!'}
                        </p>
                    </div>
                )}
            </div>
        );
    };

    // Enhanced Community with tabs
    const renderFriends = () => (
        <div className="p-5 pb-4 space-y-5">
            {/* Community Tabs */}
            <div className="flex gap-2 mb-4">
                {[
                    { id: 'friends', label: 'Friends', icon: Icons.Users },
                    { id: 'challenges', label: 'Challenges', icon: Icons.Trophy },
                    { id: 'activity', label: 'Activity', icon: Icons.Activity }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setCommunityTab(tab.id as any)}
                        className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                            communityTab === tab.id
                                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                : 'bg-gray-100 text-gray-400'
                        }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Friends Tab */}
            {communityTab === 'friends' && (
                <>
                    <div className="relative mb-4">
                        <Icons.Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300"/>
                        <input 
                            type="text" 
                            placeholder="Search friends..." 
                            className="w-full pl-12 p-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-primary/20 transition-all outline-none text-sm font-medium" 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {communityList.length > 0 ? communityList.map(f => {
                            const isFriend = friends.some(existing => existing.id === f.id);
                            return (
                                <Card 
                                    key={f.id} 
                                    onClick={() => setViewingProfile(f)}
                                    className={`p-5 text-center group cursor-pointer transition-all border-2
                                        ${!isFriend ? 'bg-gray-50 border-dashed border-gray-200' : 'bg-white border-gray-100 hover:border-primary/20'}`}
                                >
                                    <div className="w-16 h-16 rounded-full mx-auto bg-gray-200 border-4 border-white shadow-lg mb-3 overflow-hidden group-hover:scale-105 transition-transform">
                                        <img src={f.avatar} className="w-full h-full object-cover" />
                                    </div>
                                    <h4 className="font-bold text-sm text-primary truncate mb-1">{f.name}</h4>
                                    <span className="text-[10px] font-bold text-gray-400">{f.streak} day streak</span>
                                    {!isFriend && (
                                        <span className="block mt-2 text-[9px] bg-gray-200 text-gray-500 px-2 py-1 rounded-full font-bold">Suggested</span>
                                    )}
                                </Card>
                            );
                        }) : (
                            <div className="col-span-2 text-center py-10 text-gray-400 font-medium">No users found</div>
                        )}
                    </div>
                </>
            )}

            {/* Challenges Tab */}
            {communityTab === 'challenges' && (
                <div className="space-y-4">
                    <button
                        onClick={() => setShowCreateChallenge(true)}
                        className="w-full p-4 border-2 border-dashed border-primary/30 rounded-2xl flex items-center justify-center gap-3 text-primary hover:bg-primary/5 transition-colors"
                    >
                        <Icons.Plus className="w-5 h-5" />
                        <span className="font-bold text-sm">Create New Challenge</span>
                    </button>

                    <h3 className="font-black text-primary text-sm uppercase tracking-wider mt-6">Active Challenges</h3>
                    {challenges.filter(c => c.status === 'active').map(challenge => (
                        <div 
                            key={challenge.id}
                            onClick={() => setViewingChallenge(challenge)}
                            className="bg-gradient-to-br from-primary to-secondary p-5 rounded-2xl text-white cursor-pointer active:scale-[0.98] transition-transform"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h4 className="font-bold text-base">{challenge.title}</h4>
                                    <p className="text-[10px] text-white/60 mt-1">{challenge.description}</p>
                                </div>
                                <div className="px-3 py-1 bg-white/20 rounded-full text-[9px] font-bold uppercase">
                                    {challenge.type}
                                </div>
                            </div>
                            
                            <div className="bg-white/10 rounded-xl p-3 mt-3">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[9px] font-bold uppercase text-white/60">Leaderboard</span>
                                    <span className="text-[9px] font-bold text-white/60">{challenge.duration} left</span>
                                </div>
                                <div className="space-y-2">
                                    {challenge.leaderboard.slice(0, 3).map((entry, idx) => (
                                        <div key={entry.odlUserId} className="flex items-center gap-2">
                                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black ${
                                                idx === 0 ? 'bg-yellow-400 text-yellow-900' :
                                                idx === 1 ? 'bg-gray-300 text-gray-700' :
                                                'bg-amber-600 text-amber-100'
                                            }`}>
                                                {idx + 1}
                                            </span>
                                            <img src={entry.avatar} className="w-6 h-6 rounded-full" />
                                            <span className="flex-1 text-xs font-bold truncate">{entry.name}</span>
                                            <span className="text-xs font-black">{entry.score.toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}

                    {challenges.filter(c => c.status === 'pending').length > 0 && (
                        <>
                            <h3 className="font-black text-primary text-sm uppercase tracking-wider mt-6">Pending Invites</h3>
                            {challenges.filter(c => c.status === 'pending').map(challenge => (
                                <div key={challenge.id} className="bg-white border-2 border-gray-100 p-4 rounded-2xl">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h4 className="font-bold text-primary">{challenge.title}</h4>
                                            <p className="text-[10px] text-gray-400 mt-1">by {challenge.creatorName}</p>
                                        </div>
                                        <button
                                            onClick={() => handleJoinChallenge(challenge)}
                                            className="px-4 py-2 bg-primary text-white rounded-xl text-[10px] font-bold uppercase"
                                        >
                                            Join
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </>
                    )}

                    {challenges.length === 0 && (
                        <div className="text-center py-10">
                            <Icons.Trophy className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                            <p className="text-gray-400 font-medium">No challenges yet</p>
                            <p className="text-xs text-gray-300 mt-1">Create one to compete with friends!</p>
                        </div>
                    )}
                </div>
            )}

            {/* Activity Tab */}
            {communityTab === 'activity' && (
                <div className="space-y-4">
                    <h3 className="font-black text-primary text-sm uppercase tracking-wider">Friends' Activity</h3>
                    
                    {friendActivities.map(activity => (
                        <div key={activity.id} className="bg-white border border-gray-100 rounded-2xl p-4 flex gap-4">
                            <button 
                                onClick={() => {
                                    const friend = MOCK_GLOBAL_USERS.find(u => u.id === activity.odlUserId);
                                    if (friend) setViewingProfile(friend);
                                }}
                                className="flex-shrink-0"
                            >
                                <img src={activity.userAvatar} className="w-12 h-12 rounded-full" />
                            </button>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-bold text-primary text-sm">{activity.userName}</span>
                                    <span className="text-[9px] text-gray-400">{activity.timestamp}</span>
                                </div>
                                <p className="text-xs text-gray-600 mb-2">{activity.title}</p>
                                {activity.description && (
                                    <p className="text-[11px] text-gray-400 line-clamp-1">{activity.description}</p>
                                )}
                                {activity.thumbnail && (
                                    <div className="mt-2 rounded-xl overflow-hidden h-24">
                                        <img src={activity.thumbnail} className="w-full h-full object-cover" />
                                    </div>
                                )}
                                <div className="flex items-center gap-2 mt-2">
                                    <span className={`text-[9px] font-bold uppercase px-2 py-1 rounded-full ${
                                        activity.type === 'course' ? 'bg-blue-100 text-blue-600' :
                                        activity.type === 'product' ? 'bg-purple-100 text-purple-600' :
                                        activity.type === 'video' ? 'bg-red-100 text-red-600' :
                                        activity.type === 'goal_complete' ? 'bg-green-100 text-green-600' :
                                        'bg-orange-100 text-orange-600'
                                    }`}>
                                        {activity.type.replace('_', ' ')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}

                    {friendActivities.length === 0 && (
                        <div className="text-center py-10">
                            <Icons.Activity className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                            <p className="text-gray-400 font-medium">No activity yet</p>
                            <p className="text-xs text-gray-300 mt-1">Add friends to see their activity</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    const renderRecommended = () => (
        <div className="p-5 pb-4 space-y-5 animate-fade-in">
            <h3 className="font-black text-primary text-lg uppercase tracking-tight mb-4">Recommended Resources</h3>
            {recommendedVideos.length > 0 ? recommendedVideos.map(v => (
                <Card key={v.id} className="overflow-hidden border border-gray-100 shadow-lg shadow-gray-100/50 group cursor-pointer" onClick={() => window.open(v.url)}>
                    <div className="h-44 relative">
                        <img src={v.thumbnail} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                        <div className="absolute top-4 left-4">
                            <Badge color="bg-primary/90 text-white backdrop-blur-md">{v.platform}</Badge>
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                <Icons.PlayCircle className="w-6 h-6 text-primary" />
                            </div>
                        </div>
                    </div>
                    <div className="p-5">
                        <h3 className="font-bold text-primary text-base leading-tight mb-2">{v.title}</h3>
                        <p className="text-xs text-gray-500 line-clamp-2">{v.description}</p>
                    </div>
                </Card>
            )) : (
                <div className="py-20 text-center text-gray-300 font-bold">No Resources Yet</div>
            )}
        </div>
    );

    // ==================== MAIN RENDER ====================

    return (
        <div className="h-full flex flex-col bg-white overflow-hidden relative">
            {/* Fixed Header */}
            {activeSocialSection !== SocialSection.FOR_YOU && (
                <div className="flex-shrink-0 bg-white border-b border-gray-100 pt-safe">
                    <div className="flex overflow-x-auto no-scrollbar p-4 gap-3">
                        {[
                          { id: SocialSection.LESSONS, label: 'Curriculum' },
                          { id: SocialSection.FOR_YOU, label: 'Feed' },
                          { id: SocialSection.RECOMMENDED, label: 'Resources' },
                          { id: SocialSection.FRIENDS, label: 'Community' },
                          { id: SocialSection.PRODUCTS, label: 'Products' },
                          { id: SocialSection.COURSES, label: 'Courses' }
                        ].map(section => (
                            <button 
                                key={section.id}
                                onClick={() => setActiveSocialSection(section.id)}
                                className={`whitespace-nowrap px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex-shrink-0
                                    ${activeSocialSection === section.id 
                                        ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                                        : 'bg-gray-100 text-gray-400 hover:text-primary'
                                    }`}
                            >
                                {section.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            
            {activeSocialSection === SocialSection.FOR_YOU && renderFeedHeader()}
            
            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-hidden">
                {activeSocialSection === SocialSection.LESSONS && (
                    <div className="h-full overflow-y-auto overscroll-contain">
                        {renderLessons()}
                    </div>
                )}
                {activeSocialSection === SocialSection.FOR_YOU && renderForYou()}
                {activeSocialSection === SocialSection.RECOMMENDED && (
                    <div className="h-full overflow-y-auto overscroll-contain">
                        {renderRecommended()}
                    </div>
                )}
                {activeSocialSection === SocialSection.FRIENDS && (
                    <div className="h-full overflow-y-auto overscroll-contain">
                        {renderFriends()}
                    </div>
                )}
                {activeSocialSection === SocialSection.PRODUCTS && (
                    <div className="h-full overflow-y-auto overscroll-contain">
                        {renderMarketplace('products')}
                    </div>
                )}
                {activeSocialSection === SocialSection.COURSES && (
                    <div className="h-full overflow-y-auto overscroll-contain">
                        {renderMarketplace('courses')}
                    </div>
                )}
            </div>

            {/* Floating Add Button */}
            {(activeSocialSection === SocialSection.PRODUCTS || activeSocialSection === SocialSection.COURSES) && (
                <button 
                    onClick={handleAddItem} 
                    className="absolute bottom-6 right-5 w-14 h-14 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center z-40 active:scale-90 transition-transform"
                >
                    <Icons.Plus className="w-7 h-7" />
                </button>
            )}

            {/* ==================== MODALS ==================== */}

            {/* FIXED Profile Modal - No Goal (Private), App Colors, Visible X */}
            {viewingProfile && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
                    <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl relative overflow-visible">
                        {/* Close Button - Fixed visibility */}
                        <button 
                            onClick={() => setViewingProfile(null)} 
                            className="absolute top-4 right-4 p-2.5 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors z-10"
                        >
                            <Icons.X className="w-5 h-5 text-primary"/>
                        </button>
                        
                        {/* Profile Header */}
                        <div className="pt-4 pb-6 px-6 flex flex-col items-center text-center">
                            <div className="w-24 h-24 rounded-full border-4 border-white shadow-xl mb-4 overflow-hidden -mt-12 bg-gray-200">
                                <img src={viewingProfile.avatar} className="w-full h-full object-cover" />
                            </div>
                            
                            <h2 className="text-xl font-black text-primary uppercase tracking-tight">{viewingProfile.name}</h2>
                            <p className="text-xs text-gray-400 font-medium mt-1">{viewingProfile.lastActive}</p>
                        </div>

                        {/* Stats Grid - App Colors */}
                        <div className="px-6 pb-4">
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-orange-50 p-4 rounded-2xl text-center">
                                    <Icons.Flame className="w-6 h-6 text-orange-500 mx-auto mb-2" />
                                    <span className="block text-2xl font-black text-orange-600">{viewingProfile.streak}</span>
                                    <span className="text-[9px] text-orange-400 uppercase font-bold tracking-wider">Streak</span>
                                </div>
                                <div className="bg-yellow-50 p-4 rounded-2xl text-center">
                                    <Icons.Coins className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
                                    <span className="block text-2xl font-black text-yellow-600">{((viewingProfile as any).credits || 0).toLocaleString()}</span>
                                    <span className="text-[9px] text-yellow-400 uppercase font-bold tracking-wider">Credits</span>
                                </div>
                                <div className="bg-green-50 p-4 rounded-2xl text-center">
                                    <Icons.CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
                                    <span className="block text-2xl font-black text-green-600">{(viewingProfile as any).tasksCompleted || 0}</span>
                                    <span className="text-[9px] text-green-400 uppercase font-bold tracking-wider">Tasks</span>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="px-6 pb-6">
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => handleToggleFriendship(viewingProfile)} 
                                    className={`flex-1 py-4 rounded-2xl text-sm font-black uppercase tracking-wider transition-all active:scale-[0.98] ${
                                        friends.some(f => f.id === viewingProfile.id)
                                            ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            : 'bg-primary text-white hover:bg-primary/90'
                                    }`}
                                >
                                    {friends.some(f => f.id === viewingProfile.id) ? 'Remove Friend' : 'Add Friend'}
                                </button>
                                {friends.some(f => f.id === viewingProfile.id) && (
                                    <button 
                                        onClick={() => {
                                            setViewingProfile(null);
                                            setShowCreateChallenge(true);
                                        }} 
                                        className="p-4 bg-secondary/10 hover:bg-secondary/20 rounded-2xl transition-colors"
                                    >
                                        <Icons.Trophy className="w-5 h-5 text-secondary" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Challenge Modal */}
            {showCreateChallenge && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
                    <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-6 relative">
                        <button 
                            onClick={() => setShowCreateChallenge(false)} 
                            className="absolute top-4 right-4 p-2.5 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                        >
                            <Icons.X className="w-5 h-5 text-primary"/>
                        </button>
                        
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-primary/10 rounded-xl">
                                <Icons.Trophy className="w-6 h-6 text-primary" />
                            </div>
                            <h3 className="text-xl font-black text-primary uppercase tracking-tight">New Challenge</h3>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2">Challenge Title</label>
                                <input 
                                    value={newChallenge.title}
                                    onChange={(e) => setNewChallenge(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full p-4 bg-gray-50 rounded-xl border-2 border-transparent focus:border-primary/20 outline-none font-bold text-sm" 
                                    placeholder="e.g., Weekly Task Champion"
                                />
                            </div>

                            <div>
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2">Challenge Type</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: 'tasks', label: 'Tasks', icon: Icons.CheckCircle },
                                        { id: 'credits', label: 'Credits', icon: Icons.Coins },
                                        { id: 'streak', label: 'Streak', icon: Icons.Flame }
                                    ].map(type => (
                                        <button
                                            key={type.id}
                                            onClick={() => setNewChallenge(prev => ({ ...prev, type: type.id as any }))}
                                            className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-all ${
                                                newChallenge.type === type.id
                                                    ? 'bg-primary text-white'
                                                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                            }`}
                                        >
                                            <type.icon className="w-5 h-5" />
                                            <span className="text-[9px] font-bold uppercase">{type.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2">Duration (Days)</label>
                                <div className="flex gap-2">
                                    {['7', '14', '30'].map(days => (
                                        <button
                                            key={days}
                                            onClick={() => setNewChallenge(prev => ({ ...prev, duration: days }))}
                                            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                                                newChallenge.duration === days
                                                    ? 'bg-primary text-white'
                                                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                            }`}
                                        >
                                            {days}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button 
                                onClick={handleCreateChallenge} 
                                className="w-full py-4 bg-primary text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-primary/90 transition-colors mt-4"
                            >
                                Create Challenge
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Challenge Detail Modal */}
            {viewingChallenge && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
                    <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-6 relative max-h-[85vh] overflow-y-auto">
                        <button 
                            onClick={() => setViewingChallenge(null)} 
                            className="absolute top-4 right-4 p-2.5 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                        >
                            <Icons.X className="w-5 h-5 text-primary"/>
                        </button>
                        
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <Icons.Trophy className="w-8 h-8 text-white" />
                            </div>
                            <h2 className="text-xl font-black text-primary">{viewingChallenge.title}</h2>
                            <p className="text-xs text-gray-400 mt-1">{viewingChallenge.description}</p>
                        </div>

                        <div className="flex justify-between items-center bg-gray-50 rounded-xl p-4 mb-6">
                            <div className="text-center">
                                <span className="block text-lg font-black text-primary">{viewingChallenge.myScore?.toLocaleString() || 0}</span>
                                <span className="text-[9px] text-gray-400 uppercase font-bold">Your Score</span>
                            </div>
                            <div className="h-10 w-px bg-gray-200" />
                            <div className="text-center">
                                <span className="block text-lg font-black text-primary">{viewingChallenge.duration}</span>
                                <span className="text-[9px] text-gray-400 uppercase font-bold">Remaining</span>
                            </div>
                            <div className="h-10 w-px bg-gray-200" />
                            <div className="text-center">
                                <span className="block text-lg font-black text-primary">{viewingChallenge.leaderboard.length}</span>
                                <span className="text-[9px] text-gray-400 uppercase font-bold">Players</span>
                            </div>
                        </div>

                        <h3 className="font-black text-primary text-sm uppercase tracking-wider mb-4">Leaderboard</h3>
                        <div className="space-y-3">
                            {viewingChallenge.leaderboard.sort((a, b) => b.score - a.score).map((entry, idx) => (
                                <div 
                                    key={entry.odlUserId}
                                    className={`flex items-center gap-3 p-3 rounded-xl ${
                                        entry.odlUserId === 'me' ? 'bg-primary/10 border-2 border-primary/20' : 'bg-gray-50'
                                    }`}
                                >
                                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black ${
                                        idx === 0 ? 'bg-yellow-400 text-yellow-900' :
                                        idx === 1 ? 'bg-gray-300 text-gray-700' :
                                        idx === 2 ? 'bg-amber-600 text-amber-100' :
                                        'bg-gray-200 text-gray-500'
                                    }`}>
                                        {idx + 1}
                                    </span>
                                    <img src={entry.avatar} className="w-10 h-10 rounded-full" />
                                    <div className="flex-1">
                                        <span className="font-bold text-primary text-sm">{entry.name}</span>
                                        {entry.odlUserId === 'me' && (
                                            <span className="text-[9px] text-primary/60 ml-2">(You)</span>
                                        )}
                                    </div>
                                    <span className="text-lg font-black text-primary">{entry.score.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* FIXED List Item Modal - Credits pricing, attachments/links */}
            {isAddingItem && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
                    <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
                        <button 
                            onClick={resetAddItemForm} 
                            className="absolute top-4 right-4 p-2.5 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors z-10"
                        >
                            <Icons.X className="w-5 h-5 text-primary"/>
                        </button>
                        
                        <h3 className="text-xl font-black text-primary uppercase tracking-tight mb-6">
                            List {activeSocialSection === SocialSection.PRODUCTS ? 'Product' : 'Course'}
                        </h3>
                        
                        <div className="space-y-4">
                            {/* Title */}
                            <div>
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2">Title *</label>
                                <input 
                                    value={newItemTitle} 
                                    onChange={e => setNewItemTitle(e.target.value)} 
                                    className="w-full p-4 bg-gray-50 rounded-xl border-2 border-transparent focus:border-primary/20 outline-none font-bold text-sm" 
                                    placeholder="Enter title..." 
                                />
                            </div>
                            
                            {/* Description */}
                            <div>
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2">Description</label>
                                <textarea 
                                    value={newItemDesc} 
                                    onChange={e => setNewItemDesc(e.target.value)} 
                                    className="w-full p-4 bg-gray-50 rounded-xl border-2 border-transparent focus:border-primary/20 outline-none font-medium text-sm h-24 resize-none" 
                                    placeholder="Describe your item..." 
                                />
                            </div>
                            
                            {/* Price in Credits */}
                            <div>
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2">Price (Credits) *</label>
                                <div className="relative">
                                    <Icons.Coins className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-yellow-500" />
                                    <input 
                                        type="number" 
                                        value={newItemPriceCredits} 
                                        onChange={e => setNewItemPriceCredits(e.target.value)} 
                                        className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-xl border-2 border-transparent focus:border-primary/20 outline-none font-black text-lg" 
                                        placeholder="Min 100 credits"
                                        min="100"
                                    />
                                </div>
                                {newItemPriceCredits && parseInt(newItemPriceCredits) >= 100 && (
                                    <p className="text-[10px] text-gray-400 mt-2">
                                        ≈ ${(parseInt(newItemPriceCredits) / 4000).toFixed(2)} USD value
                                    </p>
                                )}
                            </div>

                            {/* Attachments Section */}
                            <div>
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2">Attachments</label>
                                
                                {/* Uploaded Files/Links */}
                                {newItemAttachments.length > 0 && (
                                    <div className="space-y-2 mb-3">
                                        {newItemAttachments.map((att, idx) => (
                                            <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                                <div className={`p-2 rounded-lg ${att.type === 'file' ? 'bg-blue-100' : 'bg-green-100'}`}>
                                                    {att.type === 'file' ? (
                                                        <Icons.File className="w-4 h-4 text-blue-600" />
                                                    ) : (
                                                        <Icons.Link className="w-4 h-4 text-green-600" />
                                                    )}
                                                </div>
                                                <span className="flex-1 text-sm font-medium text-primary truncate">{att.name}</span>
                                                <button 
                                                    onClick={() => removeAttachment(idx)}
                                                    className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                                                >
                                                    <Icons.X className="w-4 h-4 text-red-500" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Add Link Input */}
                                {showAddLink && (
                                    <div className="flex gap-2 mb-3">
                                        <input 
                                            value={newLinkUrl}
                                            onChange={e => setNewLinkUrl(e.target.value)}
                                            className="flex-1 p-3 bg-gray-50 rounded-xl border-2 border-transparent focus:border-primary/20 outline-none text-sm"
                                            placeholder="https://..."
                                        />
                                        <button 
                                            onClick={handleAddLink}
                                            className="px-4 bg-primary text-white rounded-xl font-bold text-sm"
                                        >
                                            Add
                                        </button>
                                        <button 
                                            onClick={() => { setShowAddLink(false); setNewLinkUrl(''); }}
                                            className="p-3 bg-gray-100 rounded-xl"
                                        >
                                            <Icons.X className="w-4 h-4 text-gray-500" />
                                        </button>
                                    </div>
                                )}

                                {/* Upload Buttons */}
                                <div className="flex gap-2">
                                    <input 
                                        ref={fileInputRef}
                                        type="file"
                                        multiple
                                        onChange={handleFileUpload}
                                        className="hidden"
                                        accept="image/*,video/*,.pdf,.doc,.docx,.zip"
                                    />
                                    <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex-1 p-3 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center gap-2 text-gray-400 hover:border-primary/30 hover:text-primary transition-colors"
                                    >
                                        <Icons.Upload className="w-5 h-5" />
                                        <span className="text-sm font-bold">Upload File</span>
                                    </button>
                                    <button 
                                        onClick={() => setShowAddLink(true)}
                                        className="flex-1 p-3 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center gap-2 text-gray-400 hover:border-primary/30 hover:text-primary transition-colors"
                                    >
                                        <Icons.Link className="w-5 h-5" />
                                        <span className="text-sm font-bold">Add Link</span>
                                    </button>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-2">
                                    Add files or links that buyers will receive after purchase
                                </p>
                            </div>

                            {/* Preview */}
                            {newItemTitle && newItemPriceCredits && (
                                <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                                    <h4 className="text-[9px] font-black text-primary/50 uppercase tracking-widest mb-2">Preview</h4>
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center">
                                            <Icons.ShoppingBag className="w-6 h-6 text-gray-400" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-primary text-sm">{newItemTitle}</p>
                                            <div className="flex items-center gap-1 mt-1">
                                                <Icons.Coins className="w-4 h-4 text-yellow-500" />
                                                <span className="font-black text-primary">{parseInt(newItemPriceCredits || '0').toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    {newItemAttachments.length > 0 && (
                                        <p className="text-[10px] text-gray-400 mt-2">
                                            Includes {newItemAttachments.length} attachment{newItemAttachments.length !== 1 ? 's' : ''}
                                        </p>
                                    )}
                                </div>
                            )}
                            
                            {/* Publish Button */}
                            <button 
                                onClick={confirmAddItem} 
                                disabled={!newItemTitle || !newItemPriceCredits || parseInt(newItemPriceCredits) < 100}
                                className="w-full py-4 bg-primary text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                            >
                                Publish
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Quiz Modal */}
            {activeQuiz && (
                <div className="fixed inset-0 z-[100] bg-white flex flex-col pt-safe animate-slide-up">
                    {!quizFinished ? (
                        <div className="flex-1 p-8 flex flex-col">
                            <div className="flex justify-between items-center mb-10 mt-2">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    Question {quizIndex + 1} of {activeQuiz.questions.length}
                                </span>
                                <button onClick={() => setActiveQuiz(null)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                                    <Icons.X className="w-5 h-5 text-primary"/>
                                </button>
                            </div>
                            <h2 className="text-2xl font-black text-primary tracking-tight mb-10">
                                {activeQuiz.questions[quizIndex].question}
                            </h2>
                            <div className="space-y-3 flex-1">
                                {activeQuiz.questions[quizIndex].options.map((opt, i) => (
                                    <button 
                                        key={i} 
                                        onClick={() => handleAnswerSelect(i)} 
                                        className="w-full p-5 text-left bg-gray-50 hover:bg-primary hover:text-white rounded-2xl border-2 border-transparent hover:border-primary transition-all font-medium"
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 p-10 flex flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 bg-green-100 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                                <Icons.Check className="w-10 h-10 text-green-600"/>
                            </div>
                            <h2 className="text-2xl font-black text-primary uppercase tracking-tight mb-2">Phase Complete!</h2>
                            <p className="text-gray-500 mb-8">Great job finishing this section.</p>
                            <button onClick={() => setActiveQuiz(null)} className="px-10 py-4 bg-primary text-white rounded-2xl text-sm font-black uppercase tracking-widest">Continue</button>
                        </div>
                    )}
                </div>
            )}

            {/* Lesson Viewer Modal */}
            {viewingLesson && (
                <div className="fixed inset-0 z-[80] bg-white pt-safe flex flex-col animate-slide-up overflow-hidden">
                    <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white flex-shrink-0">
                        <div>
                            <span className="text-[10px] font-bold text-primary/50 uppercase tracking-widest block mb-1">Lesson</span>
                            <h2 className="font-black text-primary text-lg tracking-tight">{viewingLesson.title}</h2>
                        </div>
                        <button onClick={closeLessonModal} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                            <Icons.X className="w-5 h-5 text-primary"/>
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 pb-32 space-y-8 no-scrollbar">
                        {isLoadingLessonContent ? (
                            <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
                                <div className="relative mb-8">
                                    <div className="w-20 h-20 rounded-full border-4 border-gray-100"></div>
                                    <div className="absolute top-0 left-0 w-20 h-20 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                                    <Icons.BookOpen className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-primary" />
                                </div>
                                <h3 className="text-lg font-bold text-primary mb-2">Generating Lesson...</h3>
                                <p className="text-sm text-gray-400 text-center max-w-xs">Creating personalized content tailored to your goal</p>
                            </div>
                        ) : viewingLesson.content ? (
                            <>
                                <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10">
                                    <h4 className="text-[10px] font-black text-primary/50 uppercase tracking-widest mb-3">Key Concept</h4>
                                    <p className="text-lg font-bold text-primary leading-relaxed">{viewingLesson.content.core_concept}</p>
                                </div>

                                {viewingLesson.content.subsections.map((sub, i) => (
                                    <div key={i}>
                                        <h3 className="text-lg font-black text-primary mb-3 flex items-center gap-3">
                                            <span className="text-4xl text-primary/10 font-black">{i + 1}</span>
                                            {sub.title}
                                        </h3>
                                        <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{sub.content}</p>
                                    </div>
                                ))}

                                <div className="p-6 bg-primary text-white rounded-2xl shadow-lg">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="p-2 bg-white/10 rounded-lg">
                                            <Icons.Zap className="w-5 h-5" />
                                        </div>
                                        <h4 className="font-black text-sm uppercase tracking-wide">The 1% Secret</h4>
                                    </div>
                                    <p className="text-white/90 leading-relaxed">{viewingLesson.content.the_1_percent_secret}</p>
                                </div>

                                <div className="p-6 bg-gradient-to-br from-secondary/5 to-primary/5 rounded-2xl border-2 border-secondary/20">
                                    {(() => {
                                        const status = getLessonStatus(viewingLesson.id);
                                        const pendingCount = getPendingTaskCount(viewingLesson.id);
                                        
                                        if (status === 'completed') {
                                            return (
                                                <div className="text-center">
                                                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                        <Icons.Check className="w-8 h-8 text-green-600" />
                                                    </div>
                                                    <h4 className="text-lg font-bold text-green-700 mb-2">Lesson Complete!</h4>
                                                    <p className="text-sm text-gray-500 mb-4">You've mastered this lesson.</p>
                                                    <button onClick={closeLessonModal} className="w-full py-4 border-2 border-gray-200 rounded-2xl font-bold text-gray-600">Close</button>
                                                </div>
                                            );
                                        }
                                        
                                        if (status === 'in_progress') {
                                            return (
                                                <div className="text-center">
                                                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                        <Icons.Clock className="w-8 h-8 text-amber-600" />
                                                    </div>
                                                    <h4 className="text-lg font-bold text-amber-700 mb-2">Lesson In Progress</h4>
                                                    <p className="text-sm text-gray-500 mb-4">
                                                        Complete {pendingCount} remaining task{pendingCount !== 1 ? 's' : ''} to finish.
                                                    </p>
                                                    <button onClick={handleContinueLesson} className="w-full py-4 bg-amber-500 text-white rounded-2xl font-black uppercase tracking-widest">
                                                        Go to Tasks
                                                    </button>
                                                </div>
                                            );
                                        }
                                        
                                        return (
                                            <>
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="p-2 bg-secondary/10 rounded-lg">
                                                        <Icons.Zap className="w-5 h-5 text-secondary" />
                                                    </div>
                                                    <h4 className="font-black text-sm text-secondary uppercase tracking-wide">Ready to Practice?</h4>
                                                </div>
                                                <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                                                    Start this lesson to unlock <strong>2 personalized practice tasks</strong> in your dashboard.
                                                </p>
                                                <div className="bg-white rounded-xl p-4 mb-6 border border-secondary/10">
                                                    <div className="flex items-center gap-3 text-sm text-gray-600">
                                                        <Icons.Check className="w-4 h-4 text-secondary flex-shrink-0" />
                                                        <span>Tasks based on lesson content</span>
                                                    </div>
                                                    <div className="flex items-center gap-3 text-sm text-gray-600 mt-2">
                                                        <Icons.Check className="w-4 h-4 text-secondary flex-shrink-0" />
                                                        <span>Track progress in dashboard</span>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={handleStartLesson} 
                                                    disabled={isStartingLesson}
                                                    className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest disabled:opacity-50"
                                                >
                                                    {isStartingLesson ? 'Starting...' : 'Start Lesson'}
                                                </button>
                                            </>
                                        );
                                    })()}
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-20">
                                <p className="text-gray-400">Failed to load lesson content.</p>
                                <button onClick={closeLessonModal} className="mt-4 px-6 py-3 border-2 border-gray-200 rounded-xl font-bold text-gray-600">Close</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
