import React, { useState, useRef, useCallback } from 'react';
import { useApp } from '../contexts/AppContext';
import { AppView, SocialSection, GoalCategory, Lesson, Course, Product, QuizQuestion, Chapter, Friend, TaskStatus } from '../types';
import { Icons, Button, Badge, Card } from '../components/UIComponents';
import { api } from '../services/api';
import { generateLessonContent, generateLessonTasks } from '../services/geminiService';

const MOCK_GLOBAL_USERS: Friend[] = [
    { id: 'g1', name: 'Alex Builder', streak: 45, avatar: 'https://picsum.photos/seed/alex/200', lastActive: '5m ago', goalTitle: 'Launch Startup', progress: 60 },
    { id: 'g2', name: 'Jordan Fit', streak: 120, avatar: 'https://picsum.photos/seed/jordan/200', lastActive: '1h ago', goalTitle: 'Ironman Training', progress: 85 },
    { id: 'g3', name: 'Casey Code', streak: 8, avatar: 'https://picsum.photos/seed/casey/200', lastActive: '2d ago', goalTitle: 'Master React', progress: 15 },
    { id: 'g4', name: 'Dana Design', streak: 33, avatar: 'https://picsum.photos/seed/dana/200', lastActive: '10m ago', goalTitle: 'UX Portfolio', progress: 40 },
    { id: 'g5', name: 'Sam Sales', streak: 19, avatar: 'https://picsum.photos/seed/sam/200', lastActive: '4h ago', goalTitle: '1M Revenue', progress: 30 },
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
    const [isAddingItem, setIsAddingItem] = useState(false);
    const [newItemTitle, setNewItemTitle] = useState('');
    const [newItemDesc, setNewItemDesc] = useState('');
    const [newItemPriceUsd, setNewItemPriceUsd] = useState<string>('');

    // TikTok-style header visibility for Feed only
    const [isFeedHeaderVisible, setIsFeedHeaderVisible] = useState(true);
    const lastScrollY = useRef(0);
    const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

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
        
        // Clear existing timeout
        if (scrollTimeout.current) {
            clearTimeout(scrollTimeout.current);
        }
        
        // Scrolling down - hide header
        if (scrollDiff > 8 && currentScrollY > 60) {
            setIsFeedHeaderVisible(false);
        }
        // Scrolling up - show header
        else if (scrollDiff < -8) {
            setIsFeedHeaderVisible(true);
        }
        
        // Show header after scroll stops
        scrollTimeout.current = setTimeout(() => {
            setIsFeedHeaderVisible(true);
        }, 2000);
        
        lastScrollY.current = currentScrollY;
    }, []);

    // Check lesson status
    const getLessonStatus = (lessonId: string): 'not_started' | 'in_progress' | 'completed' => {
        const lessonTasks = dailyTasks.filter(t => t.sourceLessonId === lessonId && t.isLessonTask);
        
        if (lessonTasks.length === 0) {
            return 'not_started';
        }
        
        const allCompleted = lessonTasks.every(t => 
            t.status === TaskStatus.APPROVED || t.status === TaskStatus.COMPLETED
        );
        
        if (allCompleted) {
            return 'completed';
        }
        
        return 'in_progress';
    };

    // Get pending task count for a lesson
    const getPendingTaskCount = (lessonId: string): number => {
        return dailyTasks.filter(t => 
            t.sourceLessonId === lessonId && 
            t.isLessonTask &&
            t.status !== TaskStatus.APPROVED && 
            t.status !== TaskStatus.COMPLETED
        ).length;
    };

    // Handle lesson click - generates content on demand
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
                { 
                    id: lesson.id, 
                    title: lesson.title, 
                    description: lesson.description || '', 
                    duration: lesson.duration 
                },
                user.goal!,
                chapter.title
            );
            
            if (content) {
                const updatedLesson = { ...lesson, content };
                setViewingLesson(updatedLesson);
                
                const updatedLessons = lessons.map(ch => {
                    if (ch.id === chapter.id) {
                        return {
                            ...ch,
                            lessons: ch.lessons.map(l => 
                                l.id === lesson.id ? { ...l, content } : l
                            )
                        };
                    }
                    return ch;
                });
                
                setLessons(updatedLessons);
                
                if (user.goal) {
                    setUser(prev => ({
                        ...prev,
                        goal: {
                            ...prev.goal!,
                            savedCurriculum: updatedLessons
                        },
                        allGoals: prev.allGoals.map(g =>
                            g.id === prev.goal?.id 
                                ? { ...g, savedCurriculum: updatedLessons }
                                : g
                        )
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
                {
                    id: viewingLesson.id,
                    title: viewingLesson.title,
                    description: viewingLesson.description || ''
                },
                user.goal,
                viewingLesson.content
            );
            
            setUser(prev => ({
                ...prev,
                dailyTasks: [...(prev.dailyTasks || []), ...lessonTasks]
            }));
            
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

    const confirmAddItem = () => {
        const basePrice = parseFloat(newItemPriceUsd);
        if (!newItemTitle || isNaN(basePrice)) {
            alert("Title and valid USD Price are required.");
            return;
        }
        const fee = basePrice * 0.05;
        const finalPriceUsd = basePrice + fee;
        const creditsPrice = Math.round(finalPriceUsd * 4000);

        if (activeSocialSection === SocialSection.PRODUCTS) {
            const newProduct: Product = {
                id: Date.now().toString(),
                creatorId: 'me',
                creatorName: user.name,
                title: newItemTitle,
                description: newItemDesc,
                mediaUrls: ['https://picsum.photos/600/401'],
                priceUsd: finalPriceUsd,
                priceCredits: creditsPrice,
                currencyType: 'both',
                category: user.goal?.category || GoalCategory.OTHER,
                likes: 0
            };
            setAdsFeed(prev => [newProduct, ...prev]);
        } else {
            const newCourse: Course = {
                id: Date.now().toString(),
                title: newItemTitle,
                description: newItemDesc,
                creator: user.name,
                currencyType: 'both',
                priceUsd: finalPriceUsd,
                priceCredits: creditsPrice,
                rating: 5,
                thumbnail: 'https://picsum.photos/600/402'
            };
            setCourses(prev => [newCourse, ...prev]);
        }
        alert(`Published! Price: $${finalPriceUsd.toFixed(2)} (${creditsPrice.toLocaleString()} CR).`);
        setIsAddingItem(false);
        setNewItemTitle('');
        setNewItemDesc('');
        setNewItemPriceUsd('');
    };

    const handleBuyItem = (item: any) => {
        const priceCR = item.priceCredits || (item.priceUsd ? item.priceUsd * 4000 : 40000);
        const priceUSD = item.priceUsd || (priceCR / 4000);

        const choice = window.confirm(
            `Purchase "${item.title}"?\n\n` +
            `Option A: ${priceCR.toLocaleString()} Credits\n` +
            `Option B: $${priceUSD.toFixed(2)}\n\n` +
            `Press OK for Balance ($), Cancel for Credits.`
        );

        if (choice) { 
            if (user.realMoneyBalance >= priceUSD) {
                setUser(prev => ({ ...prev, realMoneyBalance: prev.realMoneyBalance - priceUSD }));
                alert("Purchase complete!");
            } else {
                alert("Insufficient balance.");
            }
        } else { 
            if (user.credits >= priceCR) {
                setUser(prev => ({ ...prev, credits: prev.credits - priceCR }));
                alert("Purchase complete!");
            } else {
                alert("Insufficient credits.");
            }
        }
    };

    const closeLessonModal = () => {
        setViewingLesson(null);
        setIsLoadingLessonContent(false);
        setIsStartingLesson(false);
        setCurrentChapter(null);
    };

    // ==================== RENDER FUNCTIONS ====================

    // Standard header for non-Feed sections
    const renderHeader = () => (
        <div className="sticky top-0 z-40 bg-white border-b border-gray-100 pt-safe">
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
                        className={`whitespace-nowrap px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all 
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
    );

    // TikTok-style header for Feed section (transparent, slides away)
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
                        className={`whitespace-nowrap px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all backdrop-blur-sm
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

    // Feed with TikTok-style scroll behavior
    const renderForYou = () => (
        <div 
            onScroll={handleFeedScroll}
            className="h-full overflow-y-scroll snap-y snap-mandatory bg-black no-scrollbar"
        >
            {feedItems.length > 0 ? feedItems.map((item, index) => (
                <div key={item.id} className="h-full w-full snap-start relative flex items-center justify-center bg-gray-900">
                    <img src={item.thumbnailUrl} className="absolute inset-0 w-full h-full object-cover opacity-70" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none" />
                    
                    {/* Content */}
                    <div className="absolute left-4 bottom-28 right-20 text-white animate-fade-in">
                        <div className="flex items-center gap-3 mb-3">
                            <img src={item.creatorAvatar} className="w-10 h-10 rounded-full border-2 border-white/30" />
                            <div>
                                <h3 className="font-bold text-base">@{item.creatorName}</h3>
                                <p className="text-[10px] text-white/60">Creator</p>
                            </div>
                        </div>
                        <p className="text-sm font-bold leading-tight mb-2">{item.title}</p>
                        {item.description && (
                            <p className="text-[11px] text-white/70 leading-relaxed max-w-[90%] line-clamp-2">{item.description}</p>
                        )}
                    </div>

                    {/* Action buttons */}
                    <div className="absolute right-4 bottom-32 flex flex-col gap-5 items-center">
                        <div className="flex flex-col items-center group cursor-pointer">
                            <div className="p-3 bg-white/10 rounded-full backdrop-blur-md group-active:scale-90 transition-transform">
                                <Icons.Heart className={`w-7 h-7 ${item.isLiked ? 'text-red-500 fill-red-500' : 'text-white'}`}/>
                            </div>
                            <span className="text-[10px] text-white font-black mt-1">{item.likes}</span>
                        </div>
                        <div className="flex flex-col items-center group cursor-pointer">
                            <div className="p-3 bg-white/10 rounded-full backdrop-blur-md group-active:scale-90 transition-transform">
                                <Icons.MessageCircle className="w-7 h-7 text-white"/>
                            </div>
                            <span className="text-[10px] text-white font-black mt-1">{item.comments.length}</span>
                        </div>
                        <div className="flex flex-col items-center group cursor-pointer">
                            <div className="p-3 bg-white/10 rounded-full backdrop-blur-md group-active:scale-90 transition-transform">
                                <Icons.Share2 className="w-7 h-7 text-white"/>
                            </div>
                            <span className="text-[10px] text-white font-black mt-1">{item.shares}</span>
                        </div>
                    </div>

                    {/* Scroll hint on first item */}
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

    const renderMarketplace = (type: 'products' | 'courses') => {
    const items = type === 'courses' ? courses : adsFeed;
    
    return (
        <div className="p-4 space-y-3">
            {items.length > 0 ? items.map(item => (
                <div 
                    key={item.id} 
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex gap-3 p-3 active:scale-[0.98] transition-transform"
                >
                    {/* Thumbnail - Square, compact */}
                    <div className="w-24 h-24 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                        <img 
                            src={(item as any).thumbnail || (item as any).mediaUrls?.[0]} 
                            className="w-full h-full object-cover" 
                            alt={item.title}
                        />
                    </div>
                    
                    {/* Content */}
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
                            <div className="text-base font-black text-primary">
                                {((item as any).priceCredits || Math.round(((item as any).priceUsd || 10) * 4000)).toLocaleString()} 
                                <span className="text-[10px] font-bold text-gray-400 ml-0.5">CR</span>
                            </div>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleBuyItem(item); }}
                                className="bg-primary text-white text-[9px] font-bold uppercase tracking-wider px-4 py-2 rounded-xl active:scale-95 transition-transform"
                            >
                                Get
                            </button>
                        </div>
                    </div>
                </div>
            )) : (
                <div className="flex flex-col items-center justify-center py-16">
                    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                        <Icons.ShoppingBag className="w-7 h-7 text-gray-300" />
                    </div>
                    <h3 className="text-gray-400 font-bold text-sm">No Items Yet</h3>
                    <p className="text-[11px] text-gray-300 mt-1">Check back soon!</p>
                </div>
            )}
        </div>
    );
};

    const renderFriends = () => (
        <div className="p-5 pb-4 space-y-5">
            <div className="relative mb-6">
                <Icons.Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300"/>
                <input 
                    type="text" 
                    placeholder="Search community..." 
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
        {/* Fixed Header - use flex-shrink-0 */}
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
        
        {/* Feed Header - Absolute positioned for TikTok style */}
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

            {/* Profile Modal */}
            {viewingProfile && (
                <div className="fixed inset-0 z-[100] bg-primary/80 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
                    <Card className="p-8 w-full max-w-sm bg-white border-none shadow-2xl rounded-[2rem] relative flex flex-col items-center text-center overflow-visible">
                        <button onClick={() => setViewingProfile(null)} className="absolute top-5 right-5 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                            <Icons.X className="w-4 h-4"/>
                        </button>
                        
                        <div className="w-24 h-24 rounded-full border-4 border-white shadow-xl -mt-16 mb-4 overflow-hidden">
                            <img src={viewingProfile.avatar} className="w-full h-full object-cover" />
                        </div>
                        
                        <h2 className="text-xl font-black text-primary uppercase tracking-tight mb-1">{viewingProfile.name}</h2>
                        <p className="text-xs text-gray-400 font-medium mb-6">{viewingProfile.lastActive}</p>

                        <div className="grid grid-cols-2 gap-4 w-full mb-6">
                            <div className="bg-gray-50 p-4 rounded-xl">
                                <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Streak</span>
                                <span className="block text-2xl font-black text-primary">{viewingProfile.streak}</span>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-xl">
                                <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Goal</span>
                                <span className="block text-sm font-bold text-primary leading-tight truncate">{viewingProfile.goalTitle}</span>
                            </div>
                        </div>

                        <Button 
                            onClick={() => handleToggleFriendship(viewingProfile)} 
                            variant={friends.some(f => f.id === viewingProfile.id) ? 'outline' : 'primary'}
                            className="w-full py-4 text-xs font-black uppercase tracking-widest rounded-xl"
                        >
                            {friends.some(f => f.id === viewingProfile.id) ? 'Remove Friend' : 'Add Friend'}
                        </Button>
                    </Card>
                </div>
            )}

            {/* Add Item Modal */}
            {isAddingItem && (
                <div className="fixed inset-0 z-[100] bg-primary/80 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
                    <Card className="p-8 w-full max-w-sm bg-white border-none shadow-2xl rounded-[2rem] relative max-h-[90vh] overflow-y-auto">
                        <button onClick={() => setIsAddingItem(false)} className="absolute top-5 right-5 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                            <Icons.X className="w-4 h-4"/>
                        </button>
                        <h3 className="text-xl font-black text-primary uppercase tracking-tight mb-6">List Item</h3>
                        <div className="space-y-4">
                            <input 
                                value={newItemTitle} 
                                onChange={e => setNewItemTitle(e.target.value)} 
                                className="w-full p-4 bg-gray-50 rounded-xl border-2 border-transparent focus:border-primary/20 outline-none font-bold text-sm" 
                                placeholder="Title" 
                            />
                            <textarea 
                                value={newItemDesc} 
                                onChange={e => setNewItemDesc(e.target.value)} 
                                className="w-full p-4 bg-gray-50 rounded-xl border-2 border-transparent focus:border-primary/20 outline-none font-medium text-sm h-24 resize-none" 
                                placeholder="Description" 
                            />
                            <input 
                                type="number" 
                                value={newItemPriceUsd} 
                                onChange={e => setNewItemPriceUsd(e.target.value)} 
                                className="w-full p-4 bg-gray-50 rounded-xl border-2 border-transparent focus:border-primary/20 outline-none font-black text-lg" 
                                placeholder="Price (USD)" 
                            />
                            {newItemPriceUsd && (
                                <div className="p-4 bg-gray-50 rounded-xl space-y-2">
                                    <div className="flex justify-between text-xs font-medium text-gray-500">
                                        <span>Base Price</span>
                                        <span>${parseFloat(newItemPriceUsd).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-medium text-gray-500">
                                        <span>Platform Fee (5%)</span>
                                        <span>+${(parseFloat(newItemPriceUsd) * 0.05).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm font-black text-primary pt-2 border-t border-gray-200">
                                        <span>Buyer Pays</span>
                                        <span>${(parseFloat(newItemPriceUsd) * 1.05).toFixed(2)}</span>
                                    </div>
                                </div>
                            )}
                            <Button onClick={confirmAddItem} className="w-full py-4 text-xs font-black uppercase tracking-widest mt-4">Publish</Button>
                        </div>
                    </Card>
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
                                    <Icons.X className="w-5 h-5"/>
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
                            <Button onClick={() => setActiveQuiz(null)} className="px-10 py-4 text-sm font-black uppercase tracking-widest">Continue</Button>
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
                            <Icons.X className="w-5 h-5"/>
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
                                                    <Button onClick={closeLessonModal} variant="outline" className="w-full py-4">Close</Button>
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
                                                    <Button onClick={handleContinueLesson} className="w-full py-4 text-sm font-black uppercase tracking-widest bg-amber-500 hover:bg-amber-600">
                                                        Go to Tasks
                                                    </Button>
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
                                                <Button 
                                                    onClick={handleStartLesson} 
                                                    isLoading={isStartingLesson}
                                                    className="w-full py-4 text-sm font-black uppercase tracking-widest"
                                                >
                                                    Start Lesson
                                                </Button>
                                            </>
                                        );
                                    })()}
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-20">
                                <p className="text-gray-400">Failed to load lesson content.</p>
                                <Button onClick={closeLessonModal} variant="outline" className="mt-4">Close</Button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
