import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { SocialSection, GoalCategory, Lesson, Course, Product, QuizQuestion, Chapter, Friend } from '../types';
import { Icons, Button, Badge, Card } from '../components/UIComponents';
import { api } from '../services/api';

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
        lessons, activeSocialSection, setActiveSocialSection,
        courses, setCourses, recommendedVideos, adsFeed, setAdsFeed,
        isLoadingLessons
    } = useApp();

    const friends = user.friends || [];

    const [viewingLesson, setViewingLesson] = useState<Lesson | null>(null);
    const [viewingProfile, setViewingProfile] = useState<Friend | null>(null);
    const [activeQuiz, setActiveQuiz] = useState<{ chapter: Chapter, questions: QuizQuestion[] } | null>(null);
    
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

    // ==================== RENDER FUNCTIONS ====================

    const renderHeader = () => (
        <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 pt-safe">
            <div className="flex overflow-x-auto no-scrollbar p-3 gap-2">
                {[
                  { id: SocialSection.LESSONS, label: 'Curriculum', icon: Icons.BookOpen },
                  { id: SocialSection.FOR_YOU, label: 'Feed', icon: Icons.Play },
                  { id: SocialSection.RECOMMENDED, label: 'Resources', icon: Icons.Star },
                  { id: SocialSection.FRIENDS, label: 'Community', icon: Icons.Users },
                  { id: SocialSection.PRODUCTS, label: 'Assets', icon: Icons.Shop },
                  { id: SocialSection.COURSES, label: 'Courses', icon: Icons.Award }
                ].map(section => (
                    <button 
                        key={section.id}
                        onClick={() => setActiveSocialSection(section.id)}
                        className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2
                            ${activeSocialSection === section.id 
                                ? 'bg-primary text-white shadow-lg' 
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                    >
                        {section.label}
                    </button>
                ))}
            </div>
        </div>
    );

    const renderLessons = () => (
        <div className="p-4 pb-28 space-y-8 animate-fade-in">
            {isLoadingLessons ? (
                <div className="text-center py-20">
                    <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400 font-medium">Loading curriculum...</p>
                </div>
            ) : lessons.length > 0 ? (
                lessons.map((chapter, chapterIdx) => (
                    <div key={chapter.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                        {/* Chapter Header */}
                        <div className="p-4 bg-gray-50 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center text-sm font-black">
                                    {chapterIdx + 1}
                                </div>
                                <div>
                                    <h3 className="font-bold text-primary text-sm">{chapter.title}</h3>
                                    <span className="text-xs text-gray-400">{chapter.lessons.length} lessons</span>
                                </div>
                            </div>
                        </div>
                        
                        {/* Lessons List */}
                        <div className="divide-y divide-gray-50">
                            {chapter.lessons.map((lesson, idx) => (
                                <div 
                                    key={lesson.id} 
                                    onClick={() => !lesson.isLocked && setViewingLesson(lesson)}
                                    className={`p-4 flex items-center gap-4 transition-all
                                        ${lesson.isLocked 
                                            ? 'opacity-50 cursor-not-allowed' 
                                            : 'cursor-pointer hover:bg-gray-50 active:bg-gray-100'
                                        }`}
                                >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold
                                        ${lesson.isLocked 
                                            ? 'bg-gray-100 text-gray-400' 
                                            : 'bg-primary/10 text-primary'
                                        }`}
                                    >
                                        {lesson.isLocked ? <Icons.Lock className="w-3 h-3" /> : idx + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-primary text-sm truncate">{lesson.title}</h4>
                                        <p className="text-xs text-gray-400 truncate">{lesson.description}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                                            {lesson.duration}
                                        </span>
                                        {!lesson.isLocked && (
                                            <Icons.ChevronRight className="w-4 h-4 text-gray-300" />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Quiz Section */}
                        {chapter.quiz && chapter.quiz.length > 0 && (
                            <div className="p-4 bg-gradient-to-r from-primary to-secondary">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 text-white">
                                        <Icons.Trophy className="w-5 h-5" />
                                        <div>
                                            <span className="font-bold text-sm">Phase Quiz</span>
                                            <p className="text-xs text-white/70">{chapter.quiz.length} questions</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleQuizStart(chapter)}
                                        className="px-4 py-2 bg-white text-primary rounded-lg text-xs font-bold"
                                    >
                                        Start
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))
            ) : (
                <div className="text-center py-20">
                    <Icons.BookOpen className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <p className="text-gray-400 font-medium mb-2">No curriculum yet</p>
                    <p className="text-gray-300 text-sm">Complete onboarding to generate your learning path</p>
                </div>
            )}
        </div>
    );

    const renderForYou = () => (
        <div className="h-full overflow-y-scroll snap-y snap-mandatory bg-black no-scrollbar">
            {feedItems.length > 0 ? feedItems.map((item) => (
                <div key={item.id} className="h-full w-full snap-start relative flex items-center justify-center bg-gray-900">
                    <img src={item.thumbnailUrl} className="absolute inset-0 w-full h-full object-cover opacity-70" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute left-4 bottom-24 right-20 text-white">
                        <div className="flex items-center gap-2 mb-3">
                            <img src={item.creatorAvatar} className="w-8 h-8 rounded-full border border-white/20" />
                            <h3 className="font-bold">@{item.creatorName}</h3>
                        </div>
                        <p className="text-sm font-bold mb-2">{item.title}</p>
                        <p className="text-xs opacity-70 line-clamp-2">{item.description}</p>
                    </div>
                    <div className="absolute right-4 bottom-28 flex flex-col gap-6 items-center">
                        <div className="flex flex-col items-center">
                            <div className="p-3 bg-white/10 rounded-full backdrop-blur-md">
                                <Icons.Heart className={`w-6 h-6 ${item.isLiked ? 'text-red-500 fill-red-500' : 'text-white'}`}/>
                            </div>
                            <span className="text-xs text-white font-bold mt-1">{item.likes}</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="p-3 bg-white/10 rounded-full backdrop-blur-md">
                                <Icons.MessageCircle className="w-6 h-6 text-white"/>
                            </div>
                            <span className="text-xs text-white font-bold mt-1">{item.comments.length}</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="p-3 bg-white/10 rounded-full backdrop-blur-md">
                                <Icons.Share2 className="w-6 h-6 text-white"/>
                            </div>
                            <span className="text-xs text-white font-bold mt-1">{item.shares}</span>
                        </div>
                    </div>
                </div>
            )) : (
                <div className="h-full flex items-center justify-center text-white/50 font-medium">
                    No feed items yet
                </div>
            )}
        </div>
    );

    const renderMarketplace = (type: 'products' | 'courses') => {
        const items = type === 'courses' ? courses : adsFeed;
        return (
            <div className="p-4 pb-28 space-y-4 animate-fade-in">
                {items.length > 0 ? items.map(item => (
                    <Card key={item.id} className="overflow-hidden border border-gray-100">
                        <div className="h-40 relative bg-gray-100">
                            <img src={(item as any).thumbnail || (item as any).mediaUrls?.[0]} className="w-full h-full object-cover" />
                            <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-primary">
                                {type === 'courses' ? 'Course' : 'Asset'}
                            </div>
                        </div>
                        <div className="p-4">
                            <h4 className="font-bold text-primary mb-1">{item.title}</h4>
                            <p className="text-xs text-gray-500 mb-4 line-clamp-2">{item.description}</p>
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-xs text-gray-400">By {(item as any).creator || (item as any).creatorName}</span>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-primary">
                                        {((item as any).priceCredits || Math.round(((item as any).priceUsd || 10) * 4000)).toLocaleString()} CR
                                    </div>
                                    <Button onClick={() => handleBuyItem(item)} className="mt-2 py-1.5 px-4 text-xs">
                                        Get
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </Card>
                )) : (
                    <div className="py-20 text-center text-gray-400 font-medium">
                        No items yet
                    </div>
                )}
            </div>
        );
    };

    const renderFriends = () => (
        <div className="p-4 pb-28 space-y-4">
            <div className="relative">
                <Icons.Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
                <input 
                    type="text" 
                    placeholder="Search community..." 
                    className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-xl border-none focus:ring-2 focus:ring-primary outline-none text-sm" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            <div className="grid grid-cols-2 gap-3">
                {communityList.length > 0 ? communityList.map(f => {
                    const isFriend = friends.some(existing => existing.id === f.id);
                    return (
                        <Card 
                            key={f.id} 
                            onClick={() => setViewingProfile(f)}
                            className={`p-4 text-center cursor-pointer transition-all border
                                ${!isFriend ? 'bg-gray-50 border-dashed border-gray-200' : 'bg-white border-gray-100'}`}
                        >
                            <div className="w-16 h-16 rounded-full mx-auto bg-gray-200 mb-3 overflow-hidden">
                                <img src={f.avatar} className="w-full h-full object-cover" />
                            </div>
                            <h4 className="font-bold text-sm text-primary truncate">{f.name}</h4>
                            <span className="text-xs text-gray-400">{f.streak} day streak</span>
                            {!isFriend && (
                                <span className="block mt-2 text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">
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
        <div className="p-4 pb-28 space-y-4 animate-fade-in">
            <h3 className="font-bold text-primary mb-4">Recommended Resources</h3>
            {recommendedVideos.map(v => (
                <Card key={v.id} className="overflow-hidden border border-gray-100" onClick={() => window.open(v.url)}>
                    <div className="h-36 relative">
                        <img src={v.thumbnail} className="w-full h-full object-cover" />
                        <div className="absolute top-3 left-3">
                            <Badge color="bg-primary/90 text-white">{v.platform}</Badge>
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                                <Icons.Play className="w-5 h-5 text-primary ml-1" />
                            </div>
                        </div>
                    </div>
                    <div className="p-4">
                        <h3 className="font-bold text-primary text-sm mb-1">{v.title}</h3>
                        <p className="text-xs text-gray-500 line-clamp-2">{v.description}</p>
                    </div>
                </Card>
            ))}
            {recommendedVideos.length === 0 && (
                <div className="py-20 text-center text-gray-400 font-medium">
                    No resources yet
                </div>
            )}
        </div>
    );

    // ==================== MAIN RENDER ====================

    return (
        <div className="h-full flex flex-col bg-gray-50 overflow-hidden relative">
            {renderHeader()}
            
            <div className="flex-1 relative overflow-y-auto no-scrollbar scroll-smooth bg-white">
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
                    className="absolute bottom-24 right-4 w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center z-50 active:scale-95 transition-transform"
                >
                    <Icons.Plus className="w-6 h-6" />
                </button>
            )}

            {/* ==================== MODALS ==================== */}

            {/* Profile Modal */}
            {viewingProfile && (
                <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <Card className="p-6 w-full max-w-sm bg-white rounded-2xl relative">
                        <button onClick={() => setViewingProfile(null)} className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full">
                            <Icons.X className="w-4 h-4"/>
                        </button>
                        
                        <div className="text-center">
                            <div className="w-20 h-20 rounded-full mx-auto mb-4 overflow-hidden">
                                <img src={viewingProfile.avatar} className="w-full h-full object-cover" />
                            </div>
                            <h2 className="text-xl font-bold text-primary mb-1">{viewingProfile.name}</h2>
                            <p className="text-xs text-gray-400 mb-4">{viewingProfile.lastActive}</p>

                            <div className="grid grid-cols-2 gap-3 mb-6">
                                <div className="bg-gray-50 p-3 rounded-xl">
                                    <span className="block text-xs text-gray-400 mb-1">Streak</span>
                                    <span className="block text-xl font-bold text-primary">{viewingProfile.streak}</span>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-xl">
                                    <span className="block text-xs text-gray-400 mb-1">Goal</span>
                                    <span className="block text-sm font-bold text-primary truncate">{viewingProfile.goalTitle}</span>
                                </div>
                            </div>

                            <Button 
                                onClick={() => handleToggleFriendship(viewingProfile)} 
                                variant={friends.some(f => f.id === viewingProfile.id) ? 'outline' : 'primary'}
                                className="w-full"
                            >
                                {friends.some(f => f.id === viewingProfile.id) ? 'Remove Friend' : 'Add Friend'}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Add Item Modal */}
            {isAddingItem && (
                <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <Card className="p-6 w-full max-w-sm bg-white rounded-2xl relative">
                        <button onClick={() => setIsAddingItem(false)} className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full">
                            <Icons.X className="w-4 h-4"/>
                        </button>
                        <h3 className="text-xl font-bold text-primary mb-4">Add New Item</h3>
                        <div className="space-y-3">
                            <input 
                                value={newItemTitle} 
                                onChange={e => setNewItemTitle(e.target.value)} 
                                className="w-full p-3 bg-gray-100 rounded-xl border-none focus:ring-2 focus:ring-primary outline-none text-sm" 
                                placeholder="Title" 
                            />
                            <textarea 
                                value={newItemDesc} 
                                onChange={e => setNewItemDesc(e.target.value)} 
                                className="w-full p-3 bg-gray-100 rounded-xl border-none focus:ring-2 focus:ring-primary outline-none text-sm h-24 resize-none" 
                                placeholder="Description" 
                            />
                            <input 
                                type="number" 
                                value={newItemPriceUsd} 
                                onChange={e => setNewItemPriceUsd(e.target.value)} 
                                className="w-full p-3 bg-gray-100 rounded-xl border-none focus:ring-2 focus:ring-primary outline-none text-sm" 
                                placeholder="Price (USD)" 
                            />
                            <Button onClick={confirmAddItem} className="w-full mt-4">Publish</Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Quiz Modal */}
            {activeQuiz && (
                <div className="fixed inset-0 z-[100] bg-white flex flex-col pt-safe">
                    {!quizFinished ? (
                        <div className="flex-1 p-6 flex flex-col">
                            <div className="flex justify-between items-center mb-8">
                                <span className="text-xs font-bold text-gray-400">
                                    Question {quizIndex + 1} of {activeQuiz.questions.length}
                                </span>
                                <button onClick={() => setActiveQuiz(null)} className="p-2 bg-gray-100 rounded-full">
                                    <Icons.X className="w-4 h-4"/>
                                </button>
                            </div>
                            <h2 className="text-2xl font-bold text-primary mb-8">
                                {activeQuiz.questions[quizIndex].question}
                            </h2>
                            <div className="space-y-3 flex-1">
                                {activeQuiz.questions[quizIndex].options.map((opt, i) => (
                                    <button 
                                        key={i} 
                                        onClick={() => handleAnswerSelect(i)} 
                                        className="w-full p-4 text-left bg-gray-100 hover:bg-primary hover:text-white rounded-xl transition-all font-medium"
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                                <Icons.Check className="w-10 h-10 text-green-600"/>
                            </div>
                            <h2 className="text-2xl font-bold text-primary mb-2">Quiz Complete!</h2>
                            <p className="text-gray-500 mb-8">Great job finishing this phase.</p>
                            <Button onClick={() => setActiveQuiz(null)} className="px-8">Continue</Button>
                        </div>
                    )}
                </div>
            )}

            {/* Lesson Viewer Modal */}
            {viewingLesson && (
                <div className="fixed inset-0 z-[80] bg-white pt-safe flex flex-col overflow-hidden">
                    <div className="p-4 border-b flex justify-between items-center bg-white">
                        <div>
                            <span className="text-xs font-bold text-primary/60 uppercase tracking-wide">Lesson</span>
                            <h2 className="font-bold text-primary">{viewingLesson.title}</h2>
                        </div>
                        <button onClick={() => setViewingLesson(null)} className="p-2 bg-gray-100 rounded-full">
                            <Icons.X className="w-5 h-5"/>
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 pb-32 space-y-8">
                        {viewingLesson.content ? (
                            <>
                                {/* Core Concept */}
                                <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10">
                                    <h4 className="text-xs font-bold text-primary/60 uppercase tracking-wide mb-2">Key Concept</h4>
                                    <p className="text-lg font-medium text-primary">{viewingLesson.content.core_concept}</p>
                                </div>

                                {/* Subsections */}
                                {viewingLesson.content.subsections.map((sub, i) => (
                                    <div key={i}>
                                        <h3 className="text-lg font-bold text-primary mb-3 flex items-center gap-3">
                                            <span className="text-3xl text-primary/20">{i + 1}</span>
                                            {sub.title}
                                        </h3>
                                        <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{sub.content}</p>
                                    </div>
                                ))}

                                {/* Pro Tip */}
                                <div className="p-6 bg-primary text-white rounded-2xl">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Icons.Zap className="w-5 h-5" />
                                        <h4 className="font-bold">Pro Tip</h4>
                                    </div>
                                    <p className="text-white/90">{viewingLesson.content.the_1_percent_secret}</p>
                                </div>

                                {/* Action Item */}
                                <div className="p-6 bg-gray-100 rounded-2xl text-center">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Your Action Item</h4>
                                    <p className="text-lg font-bold text-primary mb-6">{viewingLesson.content.actionable_task}</p>
                                    <Button onClick={() => setViewingLesson(null)} className="w-full">
                                        Complete Lesson
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-20">
                                <p className="text-gray-400 mb-4">Lesson content is being prepared...</p>
                                <p className="text-gray-300 text-sm">{viewingLesson.description}</p>
                                <Button onClick={() => setViewingLesson(null)} className="mt-8">
                                    Close
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
