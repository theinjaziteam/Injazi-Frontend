import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { SocialSection, GoalCategory, Lesson, Course, Product, QuizQuestion, Chapter, Friend } from '../types';
import { Icons, Button, Badge, Card } from '../components/UIComponents';
import { api } from '../services/api';
import { generateLessonContent } from '../services/geminiService';

const MOCK_GLOBAL_USERS: Friend[] = [
    { id: 'g1', name: 'Alex Builder', streak: 45, avatar: 'https://picsum.photos/seed/alex/200', lastActive: '5m ago', goalTitle: 'Launch Startup', progress: 60 },
    { id: 'g2', name: 'Jordan Fit', streak: 120, avatar: 'https://picsum.photos/seed/jordan/200', lastActive: '1h ago', goalTitle: 'Ironman Training', progress: 85 },
    { id: 'g3', name: 'Casey Code', streak: 8, avatar: 'https://picsum.photos/seed/casey/200', lastActive: '2d ago', goalTitle: 'Master React', progress: 15 },
    { id: 'g4', name: 'Dana Design', streak: 33, avatar: 'https://picsum.photos/seed/dana/200', lastActive: '10m ago', goalTitle: 'UX Portfolio', progress: 40 },
    { id: 'g5', name: 'Sam Sales', streak: 19, avatar: 'https://picsum.photos/seed/sam/200', lastActive: '4h ago', goalTitle: '1M Revenue', progress: 30 },
];

export default function SocialView() {
    const { 
        user, setUser, 
        feedItems, 
        lessons, setLessons, activeSocialSection, setActiveSocialSection,
        courses, setCourses, recommendedVideos, adsFeed, setAdsFeed,
        isLoadingLessons
    } = useApp();

    const friends = user.friends || [];

    const [viewingLesson, setViewingLesson] = useState<Lesson | null>(null);
    const [viewingProfile, setViewingProfile] = useState<Friend | null>(null);
    const [activeQuiz, setActiveQuiz] = useState<{ chapter: Chapter, questions: QuizQuestion[] } | null>(null);
    const [isLoadingLessonContent, setIsLoadingLessonContent] = useState(false);
    const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
    
    const [quizIndex, setQuizIndex] = useState(0);
    const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
    const [quizFinished, setQuizFinished] = useState(false);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddingItem, setIsAddingItem] = useState(false);
    const [newItemTitle, setNewItemTitle] = useState('');
    const [newItemDesc, setNewItemDesc] = useState('');
    const [newItemPriceUsd, setNewItemPriceUsd] = useState<string>('');

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

    // Handle lesson click - generates content on demand
    const handleLessonClick = async (lesson: Lesson, chapter: Chapter) => {
        if (lesson.isLocked) return;
        
        setCurrentChapter(chapter);
        
        // If content already exists, just show it
        if (lesson.content) {
            setViewingLesson(lesson);
            return;
        }
        
        // Otherwise, show modal with loading state and generate content
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
                // Update the lesson with content
                const updatedLesson = { ...lesson, content };
                setViewingLesson(updatedLesson);
                
                // Save to lessons state so it persists in memory
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
                
                // Save to goal for persistence to database
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

    const handleRetryLessonContent = () => {
        if (viewingLesson && currentChapter) {
            handleLessonClick(viewingLesson, currentChapter);
        }
    };

    const closeLessonModal = () => {
        setViewingLesson(null);
        setIsLoadingLessonContent(false);
        setCurrentChapter(null);
    };

    // ==================== RENDER FUNCTIONS ====================

    const renderHeader = () => (
        <div className="sticky top-0 z-40 bg-white border-b border-gray-100 pt-safe">
            <div className="flex overflow-x-auto no-scrollbar p-4 gap-3">
                {[
                  { id: SocialSection.LESSONS, label: 'Curriculum' },
                  { id: SocialSection.FOR_YOU, label: 'Feed' },
                  { id: SocialSection.RECOMMENDED, label: 'Resources' },
                  { id: SocialSection.FRIENDS, label: 'Community' },
                  { id: SocialSection.PRODUCTS, label: 'Assets' },
                  { id: SocialSection.COURSES, label: 'User Courses' }
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
                        <div className="absolute -bottom-2 -right-2 bg-primary/10 p-2 rounded-xl shadow-lg animate-bounce">
                            <Icons.Zap className="w-4 h-4 text-primary"/>
                        </div>
                    </div>
                    <h3 className="text-2xl font-black text-primary uppercase tracking-tighter mb-4">Building Your Path</h3>
                    <div className="max-w-[280px] space-y-3">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] leading-relaxed">
                            Creating your personalized curriculum...
                        </p>
                        <div className="w-full bg-gray-100 h-1 rounded-full overflow-hidden">
                             <div className="h-full bg-primary animate-[shimmer_1s_infinite] w-2/3 rounded-full"></div>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="p-6 pb-28 space-y-10 animate-fade-in">
                {lessons.length > 0 ? lessons.map((chapter, chapterIdx) => (
                    <div key={chapter.id} className="relative">
                        {/* Chapter Header */}
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center text-lg font-black shadow-lg shadow-primary/20">
                                {chapterIdx + 1}
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-primary tracking-tighter uppercase leading-none">{chapter.title}</h3>
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.15em] mt-1 block">
                                    {chapter.lessons.length} Learning Modules
                                </span>
                            </div>
                        </div>
                        
                        {/* Lessons List */}
                        <div className="space-y-3 ml-6 border-l-2 border-gray-200 pl-6">
                            {chapter.lessons.map((l, idx) => (
                                <div 
                                    key={l.id} 
                                    className={`p-5 rounded-2xl border-2 transition-all group cursor-pointer
                                        ${l.isLocked 
                                            ? 'bg-gray-50 border-gray-100 opacity-50 cursor-not-allowed' 
                                            : 'bg-white border-gray-200 hover:border-primary/30 hover:shadow-lg'
                                        }`}
                                    onClick={() => handleLessonClick(l, chapter)}
                                >
                                    <div className="flex justify-between items-center">
                                        <div className="flex gap-4 items-center">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all
                                                ${l.isLocked 
                                                    ? 'bg-gray-100' 
                                                    : l.content 
                                                        ? 'bg-green-100 text-green-600'
                                                        : 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white'
                                                }`}
                                            >
                                                {l.isLocked 
                                                    ? <Icons.Lock className="w-4 h-4 text-gray-400"/> 
                                                    : l.content
                                                        ? <Icons.Check className="w-5 h-5"/>
                                                        : <span className="font-black text-sm">{idx + 1}</span>
                                                }
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-primary text-sm leading-tight group-hover:text-secondary transition-colors">
                                                    {l.title}
                                                </h4>
                                                <p className="text-xs text-gray-400 mt-1 line-clamp-1">{l.description}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 ml-4">
                                            <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-3 py-1.5 rounded-full whitespace-nowrap">
                                                {l.duration}
                                            </span>
                                            {!l.isLocked && (
                                                <Icons.ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-primary transition-colors" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Phase Quiz */}
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
                )) : (
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

    const renderForYou = () => (
        <div className="h-full overflow-y-scroll snap-y snap-mandatory bg-black no-scrollbar">
            {feedItems.length > 0 ? feedItems.map((item) => (
                <div key={item.id} className="h-full w-full snap-start relative flex items-center justify-center bg-gray-900">
                    <img src={item.thumbnailUrl} className="absolute inset-0 w-full h-full object-cover opacity-70" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                    
                    <div className="absolute left-4 bottom-24 right-20 text-white animate-fade-in">
                        <div className="flex items-center gap-2 mb-3">
                            <img src={item.creatorAvatar} className="w-8 h-8 rounded-full border border-white/20" />
                            <h3 className="font-bold text-lg">@{item.creatorName}</h3>
                        </div>
                        <p className="text-sm font-bold opacity-100 leading-tight mb-2">{item.title}</p>
                        {item.description && <p className="text-[10px] opacity-70 leading-relaxed max-w-[80%] line-clamp-2">{item.description}</p>}
                    </div>

                    <div className="absolute right-4 bottom-28 flex flex-col gap-6 items-center">
                        <div className="flex flex-col items-center group cursor-pointer">
                            <div className="p-3 bg-white/10 rounded-full backdrop-blur-md group-active:scale-90 transition-transform">
                                <Icons.Heart className={`w-7 h-7 ${item.isLiked ? 'text-red-500 fill-red-500' : 'text-white'}`}/>
                            </div>
                            <span className="text-[10px] text-white font-black mt-1 tracking-tighter">{item.likes}</span>
                        </div>
                        <div className="flex flex-col items-center group cursor-pointer">
                            <div className="p-3 bg-white/10 rounded-full backdrop-blur-md group-active:scale-90 transition-transform">
                                <Icons.MessageCircle className="w-7 h-7 text-white"/>
                            </div>
                            <span className="text-[10px] text-white font-black mt-1 tracking-tighter">{item.comments.length}</span>
                        </div>
                        <div className="flex flex-col items-center group cursor-pointer">
                            <div className="p-3 bg-white/10 rounded-full backdrop-blur-md group-active:scale-90 transition-transform">
                                <Icons.Share2 className="w-7 h-7 text-white"/>
                            </div>
                            <span className="text-[10px] text-white font-black mt-1 tracking-tighter">{item.shares}</span>
                        </div>
                    </div>
                </div>
            )) : (
                <div className="h-full flex items-center justify-center text-white/50 font-black uppercase tracking-widest text-xs">No Feed Items Found</div>
            )}
        </div>
    );

    const renderMarketplace = (type: 'products' | 'courses') => {
        const items = type === 'courses' ? courses : adsFeed;
        return (
            <div className="p-6 pb-28 grid grid-cols-1 gap-6 animate-fade-in">
                {items.length > 0 ? items.map(item => (
                    <Card key={item.id} className="overflow-hidden group border border-gray-100 shadow-lg shadow-gray-100/50">
                        <div className="h-48 relative bg-gray-100">
                             <img src={(item as any).thumbnail || (item as any).mediaUrls?.[0]} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                             <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl text-[9px] font-black uppercase text-primary shadow-lg">
                                 {type === 'courses' ? 'Masterclass' : 'Asset'}
                             </div>
                        </div>
                        <div className="p-5">
                            <h4 className="font-black text-primary text-lg leading-tight mb-2 tracking-tight group-hover:text-secondary transition-colors">{item.title}</h4>
                            <p className="text-xs text-gray-500 mb-5 leading-relaxed line-clamp-2">{item.description}</p>
                            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-gray-200" />
                                    <span className="text-[10px] font-bold text-gray-400">By {(item as any).creator || (item as any).creatorName}</span>
                                </div>
                                <div className="text-right">
                                    <div className="text-base font-black text-primary mb-2">
                                        {(item as any).priceCredits?.toLocaleString() || (Math.round(((item as any).priceUsd || 10) * 4000)).toLocaleString()} CR
                                    </div>
                                    <Button onClick={() => handleBuyItem(item)} className="py-2 h-9 text-[10px] uppercase tracking-widest px-4 rounded-xl">Acquire</Button>
                                </div>
                            </div>
                        </div>
                    </Card>
                )) : (
                    <div className="py-20 text-center text-gray-300 font-bold">No Items Listed Yet</div>
                )}
            </div>
        );
    };

    const renderFriends = () => (
        <div className="p-6 pb-28 space-y-6">
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
                                <span className="block mt-2 text-[9px] bg-gray-200 text-gray-500 px-2 py-1 rounded-full font-bold">
                                    Suggested
                                </span>
                            )}
                        </Card>
                    );
                }) : (
                    <div className="col-span-2 text-center py-10 text-gray-400 font-medium">
                        No users found
                    </div>
                )}
            </div>
        </div>
    );

    const renderRecommended = () => (
        <div className="p-6 pb-28 space-y-6 animate-fade-in">
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
                                <Icons.Play className="w-6 h-6 text-primary ml-1" />
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
            {renderHeader()}
            
            <div className="flex-1 relative overflow-y-auto no-scrollbar scroll-smooth">
                {activeSocialSection === SocialSection.LESSONS && renderLessons()}
                {activeSocialSection === SocialSection.FOR_YOU && renderForYou()}
                {activeSocialSection === SocialSection.RECOMMENDED && renderRecommended()}
                {activeSocialSection === SocialSection.FRIENDS && renderFriends()}
                {activeSocialSection === SocialSection.PRODUCTS && renderMarketplace('products')}
                {activeSocialSection === SocialSection.COURSES && renderMarketplace('courses')}
            </div>

            {/* Add Button for Products/Courses */}
            {(activeSocialSection === SocialSection.PRODUCTS || activeSocialSection === SocialSection.COURSES) && (
                <button 
                    onClick={handleAddItem} 
                    className="absolute bottom-28 right-6 w-14 h-14 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center z-50 hover:scale-110 active:scale-90 transition-all"
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
                    <Card className="p-8 w-full max-w-sm bg-white border-none shadow-2xl rounded-[2rem] relative">
                        <button onClick={() => setIsAddingItem(false)} className="absolute top-5 right-5 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                            <Icons.X className="w-4 h-4"/>
                        </button>
                        <h3 className="text-xl font-black text-primary uppercase tracking-tight mb-6">List Asset</h3>
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
                            <div className="flex justify-between items-center mb-10">
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

            {/* Lesson Viewer Modal - UPDATED WITH LOADING STATE */}
            {viewingLesson && (
                <div className="fixed inset-0 z-[80] bg-white pt-safe flex flex-col animate-slide-up overflow-hidden">
                    <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white">
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
                            // Loading state while generating content
                            <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
                                <div className="relative mb-8">
                                    <div className="w-20 h-20 rounded-full border-4 border-gray-100"></div>
                                    <div className="absolute top-0 left-0 w-20 h-20 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                                    <Icons.BookOpen className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-primary" />
                                </div>
                                <h3 className="text-lg font-bold text-primary mb-2">Generating Lesson...</h3>
                                <p className="text-sm text-gray-400 text-center max-w-xs">Creating personalized content tailored to your goal</p>
                                <div className="mt-6 w-48 bg-gray-100 h-1 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '60%' }}></div>
                                </div>
                            </div>
                        ) : viewingLesson.content ? (
                            // Full lesson content
                            <>
                                {/* Core Concept */}
                                <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10">
                                    <h4 className="text-[10px] font-black text-primary/50 uppercase tracking-widest mb-3">Key Concept</h4>
                                    <p className="text-lg font-bold text-primary leading-relaxed">{viewingLesson.content.core_concept}</p>
                                </div>

                                {/* Subsections */}
                                {viewingLesson.content.subsections.map((sub, i) => (
                                    <div key={i}>
                                        <h3 className="text-lg font-black text-primary mb-3 flex items-center gap-3">
                                            <span className="text-4xl text-primary/10 font-black">{i + 1}</span>
                                            {sub.title}
                                        </h3>
                                        <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{sub.content}</p>
                                    </div>
                                ))}

                                {/* Pro Tip */}
                                <div className="p-6 bg-primary text-white rounded-2xl shadow-lg">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="p-2 bg-white/10 rounded-lg">
                                            <Icons.Zap className="w-5 h-5" />
                                        </div>
                                        <h4 className="font-black text-sm uppercase tracking-wide">The 1% Secret</h4>
                                    </div>
                                    <p className="text-white/90 leading-relaxed">{viewingLesson.content.the_1_percent_secret}</p>
                                </div>

                                {/* Action Item */}
                                <div className="p-6 bg-gray-50 rounded-2xl text-center border border-gray-100">
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Your Action Item</h4>
                                    <p className="text-base font-bold text-primary mb-6 leading-relaxed">{viewingLesson.content.actionable_task}</p>
                                    <Button onClick={closeLessonModal} className="w-full py-4 text-sm font-black uppercase tracking-widest">
                                        Complete Lesson
                                    </Button>
                                </div>
                            </>
                        ) : (
                            // Fallback if content generation failed
                            <div className="text-center py-20">
                                <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <Icons.AlertTriangle className="w-8 h-8 text-red-400" />
                                </div>
                                <p className="text-gray-600 font-medium mb-2">Could not load lesson content</p>
                                <p className="text-gray-400 text-sm mb-6 max-w-xs mx-auto">{viewingLesson.description}</p>
                                <div className="flex flex-col gap-3 max-w-xs mx-auto">
                                    <Button onClick={handleRetryLessonContent}>
                                        Try Again
                                    </Button>
                                    <Button onClick={closeLessonModal} variant="outline">
                                        Close
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
