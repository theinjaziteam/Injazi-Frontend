import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { SocialSection, GoalCategory, Lesson, Course, Product, QuizQuestion, Chapter, Friend } from '../types';
import { Icons, Button, Badge, Card } from '../components/UIComponents';
import { api } from '../services/api';

// --- MOCK GLOBAL USERS (People you can find and add) ---
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

    // View States
    const [viewingLesson, setViewingLesson] = useState<Lesson | null>(null);
    const [viewingProfile, setViewingProfile] = useState<Friend | null>(null); // <--- NEW: Selected User State
    const [activeQuiz, setActiveQuiz] = useState<{ chapter: Chapter, questions: QuizQuestion[] } | null>(null);
    
    // Quiz States
    const [quizIndex, setQuizIndex] = useState(0);
    const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
    const [quizFinished, setQuizFinished] = useState(false);
    
    // Search & Modal States
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddingItem, setIsAddingItem] = useState(false);
    const [newItemTitle, setNewItemTitle] = useState('');
    const [newItemDesc, setNewItemDesc] = useState('');
    const [newItemPriceUsd, setNewItemPriceUsd] = useState<string>('');

    // --- LOGIC: Combine Friends + Global Search ---
    const getCommunityList = () => {
        if (!searchQuery) return friends; // If no search, show only friends
        
        // If searching, show Friends matching name + Global Users matching name (who aren't already friends)
        const matchingFriends = friends.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
        
        const matchingStrangers = MOCK_GLOBAL_USERS.filter(u => 
            u.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
            !friends.some(f => f.id === u.id) // Exclude if already friend
        );

        return [...matchingFriends, ...matchingStrangers];
    };

    const communityList = getCommunityList();

    // --- LOGIC: ADD / REMOVE FRIEND ---
    const handleToggleFriendship = async (targetUser: Friend) => {
        const isAlreadyFriend = friends.some(f => f.id === targetUser.id);
        let updatedFriends;

        if (isAlreadyFriend) {
            // Unfriend
            if(!window.confirm(`Disconnect from ${targetUser.name}?`)) return;
            updatedFriends = friends.filter(f => f.id !== targetUser.id);
        } else {
            // Add Friend
            updatedFriends = [...friends, targetUser];
        }

        // Update State & DB
        const updatedUser = { ...user, friends: updatedFriends };
        setUser(updatedUser);
        
        try {
            await api.sync(updatedUser);
            // Close modal if unfriending, or keep open to show updated status
            if(isAlreadyFriend) setViewingProfile(null); 
        } catch(e) {
            console.error(e);
            alert("Connection error. Could not update friend list.");
        }
    };

    // --- EXISTING QUIZ & ITEM LOGIC ---
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
            alert("Standard and Premium tiers are unauthorized for market listing. Upgrade to Creator Plan to publish assets.");
            return;
        }
        setIsAddingItem(true);
    };

    const confirmAddItem = () => {
        const basePrice = parseFloat(newItemPriceUsd);
        if (!newItemTitle || isNaN(basePrice)) {
            alert("Title and valid USD Price are mandatory.");
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
        alert(`Protocol Published. Final Price: $${finalPriceUsd.toFixed(2)} (${creditsPrice.toLocaleString()} CR).`);
        setIsAddingItem(false);
        setNewItemTitle('');
        setNewItemDesc('');
        setNewItemPriceUsd('');
    };

    const handleBuyItem = (item: any) => {
        const priceCR = item.priceCredits || (item.priceUsd ? item.priceUsd * 4000 : 40000);
        const priceUSD = item.priceUsd || (priceCR / 4000);

        const choice = window.confirm(
            `Authorize Acquisition of "${item.title}"?\n\n` +
            `Option A: ${priceCR.toLocaleString()} Credits\n` +
            `Option B: $${priceUSD.toFixed(2)} (Direct Balance)\n\n` +
            `Press OK to prioritize Balance ($), Cancel for Credits (CR).`
        );

        if (choice) { 
            if (user.realMoneyBalance >= priceUSD) {
                setUser(prev => ({ ...prev, realMoneyBalance: prev.realMoneyBalance - priceUSD }));
                alert("Transaction Authorized. Content Unlocked.");
            } else {
                alert("Insufficient Global Balance.");
            }
        } else { 
            if (user.credits >= priceCR) {
                setUser(prev => ({ ...prev, credits: prev.credits - priceCR }));
                alert("Credit Exchange Authorized. Content Unlocked.");
            } else {
                alert("Insufficient Credit Liquidity.");
            }
        }
    };

    // --- RENDER SECTIONS ---

    const renderHeader = () => (
        <div className="sticky top-0 z-40 bg-white border-b border-gray-100 pt-safe">
            <div className="flex overflow-x-auto no-scrollbar p-4 gap-4">
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
                        className={`whitespace-nowrap px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeSocialSection === section.id ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'bg-gray-100 text-gray-400 hover:text-primary'}`}
                    >
                        {section.label}
                    </button>
                ))}
            </div>
        </div>
    );

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
                            <div className="p-3 bg-white/10 rounded-full backdrop-blur-md group-active:scale-90 transition-transform"><Icons.Heart className={`w-7 h-7 ${item.isLiked ? 'text-red-500 fill-red-500' : 'text-white'}`}/></div>
                            <span className="text-[10px] text-white font-black mt-1 tracking-tighter">{item.likes}</span>
                        </div>
                        <div className="flex flex-col items-center group cursor-pointer">
                            <div className="p-3 bg-white/10 rounded-full backdrop-blur-md group-active:scale-90 transition-transform"><Icons.MessageCircle className="w-7 h-7 text-white"/></div>
                            <span className="text-[10px] text-white font-black mt-1 tracking-tighter">{item.comments.length}</span>
                        </div>
                        <div className="flex flex-col items-center group cursor-pointer">
                            <div className="p-3 bg-white/10 rounded-full backdrop-blur-md group-active:scale-90 transition-transform"><Icons.Share2 className="w-7 h-7 text-white"/></div>
                            <span className="text-[10px] text-white font-black mt-1 tracking-tighter">{item.shares}</span>
                        </div>
                    </div>
                </div>
            )) : <div className="h-full flex items-center justify-center text-white/50 font-black uppercase tracking-widest text-xs">No Feed Items Found</div>}
        </div>
    );

    const renderMarketplace = (type: 'products' | 'courses') => {
        const items = type === 'courses' ? courses : adsFeed;
        return (
            <div className="p-6 pb-28 grid grid-cols-1 gap-8 animate-fade-in">
                {items.length > 0 ? items.map(item => (
                    <Card key={item.id} className="overflow-hidden group border-none shadow-xl shadow-gray-100">
                        <div className="h-56 relative bg-gray-100">
                             <img src={(item as any).thumbnail || (item as any).mediaUrls?.[0]} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                             <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl text-[9px] font-black uppercase text-primary shadow-lg">
                                 {type === 'courses' ? 'User Masterclass' : 'Community Asset'}
                             </div>
                        </div>
                        <div className="p-6">
                            <h4 className="font-black text-primary text-xl leading-tight mb-2 tracking-tight group-hover:text-secondary transition-colors uppercase">{item.title}</h4>
                            <p className="text-xs text-gray-500 mb-6 leading-relaxed line-clamp-2">{item.description}</p>
                            <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-accent" />
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">By {(item as any).creator || (item as any).creatorName}</span>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-black text-primary mb-2">
                                        <div className="flex flex-col items-end">
                                            <span className="text-primary">{(item as any).priceCredits?.toLocaleString() || (Math.round(((item as any).priceUsd || 10) * 4000)).toLocaleString()} CR</span>
                                            <span className="text-[8px] text-gray-400 uppercase tracking-widest">Digital Credits ONLY</span>
                                        </div>
                                    </div>
                                    <Button onClick={() => handleBuyItem(item)} className="py-2 h-9 text-[10px] uppercase tracking-widest px-4 rounded-xl">Acquire</Button>
                                </div>
                            </div>
                        </div>
                    </Card>
                )) : <div className="py-20 text-center text-gray-300 font-black uppercase tracking-widest text-xs">No Items Listed Yet</div>}
            </div>
        );
    };

    const renderLessons = () => (
        <div className="p-6 pb-28 space-y-12 animate-fade-in">
            {isLoadingLessons ? (
                <div className="text-center py-20 text-gray-300 animate-pulse font-black uppercase tracking-widest">Synchronizing Curriculum...</div>
            ) : lessons.map(chapter => (
                <div key={chapter.id} className="relative">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 rounded-[1.25rem] bg-primary text-white flex items-center justify-center text-lg font-black shadow-2xl shadow-primary/20">{chapter.id.replace('c','')}</div>
                        <div>
                            <h3 className="text-2xl font-black text-primary tracking-tighter uppercase leading-none">{chapter.title}</h3>
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1 block">Phase Intelligence Block</span>
                        </div>
                    </div>
                    <div className="space-y-4 ml-6 border-l-2 border-accent pl-8">
                        {chapter.lessons.map((l, idx) => (
                            <div key={l.id} className={`p-6 rounded-[2.5rem] border-2 transition-all group ${l.isLocked ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-accent shadow-sm hover:shadow-xl hover:border-primary/20'}`}>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex gap-4">
                                        <div className={`w-12 h-12 rounded-3xl flex items-center justify-center transition-all group-hover:scale-110 ${l.isLocked ? 'bg-gray-200' : 'bg-primary text-white shadow-lg shadow-primary/20'}`}>
                                            {l.isLocked ? <Icons.Lock className="w-5 h-5 text-gray-400"/> : <span className="font-black text-base">{idx + 1}</span>}
                                        </div>
                                        <div>
                                            <h4 className="font-black text-primary text-base leading-tight group-hover:text-secondary transition-colors">{l.title}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge color="bg-accent text-secondary">{l.duration}</Badge>
                                                {l.isLocked && <Badge color="bg-gray-200 text-gray-500">Locked</Badge>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {!l.isLocked && (
                                    <>
                                        <p className="text-xs text-gray-500 mb-6 leading-relaxed line-clamp-2 font-medium">{l.description}</p>
                                        <Button onClick={() => setViewingLesson(l)} variant="secondary" className="py-2 text-[9px] h-10 w-auto px-8 font-black uppercase tracking-widest rounded-2xl shadow-none hover:shadow-lg transition-all">Begin Module</Button>
                                    </>
                                )}
                            </div>
                        ))}
                        {!chapter.lessons.some(l => l.isLocked) && chapter.quiz && (
                            <div className="p-6 rounded-[2.5rem] bg-secondary text-white shadow-xl shadow-secondary/20">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="p-3 bg-white/10 rounded-2xl"><Icons.Trophy className="w-6 h-6" /></div>
                                    <div>
                                        <h4 className="font-black text-sm uppercase tracking-widest">Phase Validation</h4>
                                        <p className="text-[10px] text-white/60 font-bold">Pass the quiz to fully authorize this phase.</p>
                                    </div>
                                </div>
                                <Button onClick={() => handleQuizStart(chapter)} className="bg-white text-secondary py-3 text-[10px] uppercase font-black tracking-widest rounded-2xl shadow-none">Start Quiz</Button>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );

    const renderFriends = () => (
        <div className="p-6 pb-28 space-y-6">
            <div className="relative mb-8">
                <Icons.Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300"/>
                <input 
                    type="text" 
                    placeholder="Find Partners (Search 'Alex', 'Jordan')..." 
                    className="w-full pl-14 p-6 bg-gray-50 rounded-[2.5rem] border-2 border-transparent focus:border-accent transition-all outline-none text-sm font-bold" 
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
                            className={`p-6 text-center group cursor-pointer transition-all ${!isFriend ? 'bg-gray-50 border-dashed border-2' : 'bg-white'}`}
                        >
                            <div className="w-20 h-20 rounded-full mx-auto bg-accent border-4 border-white shadow-xl mb-4 overflow-hidden group-hover:scale-105 transition-transform">
                                <img src={f.avatar} className="w-full h-full object-cover" />
                            </div>
                            <h4 className="font-black text-sm text-primary tracking-tight uppercase mb-1">{f.name}</h4>
                            <span className="text-[9px] font-bold text-secondary uppercase tracking-widest block mb-2">{f.streak} Day Streak</span>
                            {!isFriend && <span className="text-[8px] bg-gray-200 text-gray-500 px-2 py-1 rounded-full uppercase font-bold">Suggested</span>}
                        </Card>
                    );
                }) : (
                    <div className="col-span-2 text-center py-10 text-gray-300 font-black uppercase text-xs tracking-widest">
                        No Partners Found
                    </div>
                )}
            </div>
        </div>
    );

    const renderRecommended = () => (
        <div className="p-6 pb-28 space-y-8 animate-fade-in">
            <h3 className="font-black text-primary text-xl uppercase tracking-tighter mb-6">High-Value Assets</h3>
            {recommendedVideos.map(v => (
                <Card key={v.id} className="overflow-hidden border-none shadow-xl shadow-primary/5 group" onClick={() => window.open(v.url)}>
                    <div className="h-48 relative">
                        <img src={v.thumbnail} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                        <div className="absolute top-4 left-4">
                            <Badge color="bg-primary/90 text-white backdrop-blur-md">{v.platform}</Badge>
                        </div>
                    </div>
                    <div className="p-6">
                        <h3 className="font-black text-primary text-lg leading-tight mb-2 uppercase tracking-tight">{v.title}</h3>
                        <p className="text-xs text-gray-500 font-medium line-clamp-2">{v.description}</p>
                    </div>
                </Card>
            ))}
        </div>
    );

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

            {(activeSocialSection === SocialSection.PRODUCTS || activeSocialSection === SocialSection.COURSES) && (
                <button onClick={handleAddItem} className="absolute bottom-28 right-6 w-16 h-16 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center z-50 hover:scale-110 active:scale-90 transition-all">
                    <Icons.Plus className="w-8 h-8" />
                </button>
            )}

            {/* --- MODALS --- */}

            {/* Profile Modal */}
            {viewingProfile && (
                <div className="fixed inset-0 z-[100] bg-primary/90 backdrop-blur-xl flex items-center justify-center p-6 animate-fade-in">
                    <Card className="p-8 w-full max-w-sm bg-white border-none shadow-2xl rounded-[3rem] relative flex flex-col items-center text-center overflow-visible">
                        <button onClick={() => setViewingProfile(null)} className="absolute top-6 right-6 p-2 bg-gray-50 rounded-full hover:bg-gray-100"><Icons.X className="w-4 h-4"/></button>
                        
                        <div className="w-28 h-28 rounded-full border-[6px] border-white shadow-2xl -mt-16 mb-4 overflow-hidden relative z-10">
                            <img src={viewingProfile.avatar} className="w-full h-full object-cover" />
                        </div>
                        
                        <h2 className="text-2xl font-black text-primary uppercase tracking-tighter mb-1">{viewingProfile.name}</h2>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-6">{viewingProfile.lastActive}</p>

                        <div className="grid grid-cols-2 gap-4 w-full mb-8">
                            <div className="bg-gray-50 p-4 rounded-[2rem]">
                                <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Current Streak</span>
                                <span className="block text-2xl font-black text-accent">{viewingProfile.streak} <span className="text-xs text-gray-400">Days</span></span>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-[2rem]">
                                <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Primary Goal</span>
                                <span className="block text-sm font-black text-primary leading-tight mt-1">{viewingProfile.goalTitle}</span>
                            </div>
                        </div>

                        <Button 
                            onClick={() => handleToggleFriendship(viewingProfile)} 
                            variant={friends.some(f => f.id === viewingProfile.id) ? 'outline' : 'primary'}
                            className="w-full py-5 text-xs font-black uppercase tracking-widest rounded-2xl"
                        >
                            {friends.some(f => f.id === viewingProfile.id) ? 'Disconnect Partner' : 'Connect +'}
                        </Button>
                    </Card>
                </div>
            )}

            {isAddingItem && (
                <div className="fixed inset-0 z-[100] bg-primary/80 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
                    <Card className="p-8 w-full max-w-sm bg-white border-none shadow-2xl rounded-[2.5rem] relative">
                        <button onClick={() => setIsAddingItem(false)} className="absolute top-6 right-6 p-2 bg-gray-50 rounded-full"><Icons.X className="w-4 h-4"/></button>
                        <h3 className="text-2xl font-black text-primary uppercase tracking-tighter mb-6">List Asset</h3>
                        <div className="space-y-4">
                            <input value={newItemTitle} onChange={e => setNewItemTitle(e.target.value)} className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none font-bold" placeholder="Mission Strategy V.1" />
                            <textarea value={newItemDesc} onChange={e => setNewItemDesc(e.target.value)} className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none font-medium h-24 resize-none" placeholder="Explain the value..." />
                            <input type="number" value={newItemPriceUsd} onChange={e => setNewItemPriceUsd(e.target.value)} className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none font-black text-lg" placeholder="10.00" />
                            <Button onClick={confirmAddItem} variant="primary" className="mt-8 py-5 text-xs font-black uppercase tracking-widest">Publish Protocol</Button>
                        </div>
                    </Card>
                </div>
            )}

            {activeQuiz && (
                <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-slide-up pt-safe">
                    {!quizFinished ? (
                        <div className="flex-1 p-8 flex flex-col">
                            <div className="flex justify-between items-center mb-10 mt-2">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Question {quizIndex + 1} of {activeQuiz.questions.length}</span>
                                <button onClick={() => setActiveQuiz(null)} className="p-2 bg-gray-50 rounded-full"><Icons.X/></button>
                            </div>
                            <h2 className="text-3xl font-black text-primary tracking-tighter uppercase mb-12">{activeQuiz.questions[quizIndex].question}</h2>
                            <div className="space-y-4 flex-1">
                                {activeQuiz.questions[quizIndex].options.map((opt, i) => (
                                    <button key={i} onClick={() => handleAnswerSelect(i)} className="w-full p-8 text-left bg-gray-50 hover:bg-primary hover:text-white rounded-[2.5rem] border-2 border-transparent transition-all font-bold text-lg">{opt}</button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 p-12 flex flex-col items-center justify-center text-center">
                            <div className="w-24 h-24 bg-accent rounded-[2.5rem] flex items-center justify-center mb-8 shadow-2xl shadow-accent/50 animate-bounce"><Icons.Check className="w-12 h-12 text-secondary"/></div>
                            <h2 className="text-4xl font-black text-primary tracking-tighter uppercase mb-4">Phase Completed</h2>
                            <Button onClick={() => setActiveQuiz(null)} className="py-6 text-base tracking-widest uppercase font-black rounded-[2.5rem] shadow-2xl shadow-primary/20">Continue Curriculum</Button>
                        </div>
                    )}
                </div>
            )}

            {viewingLesson && (
                <div className="fixed inset-0 z-[80] bg-white pt-safe flex flex-col animate-slide-up overflow-hidden">
                    <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10 shadow-sm">
                        <div>
                            <span className="text-[10px] font-black text-secondary uppercase tracking-[0.3em] mb-1 block">Architecture Session</span>
                            <h2 className="font-black text-primary text-xl tracking-tighter uppercase leading-none">{viewingLesson.title}</h2>
                        </div>
                        <button onClick={() => setViewingLesson(null)} className="p-2 bg-gray-50 rounded-full"><Icons.X className="w-6 h-6"/></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-10 space-y-12 pb-32 no-scrollbar scroll-smooth">
                        {viewingLesson.content ? (
                          <>
                            <div className="p-10 bg-accent/30 rounded-[3rem] border-2 border-accent relative overflow-hidden group">
                                <h4 className="text-[11px] font-black uppercase text-secondary mb-4 tracking-[0.4em]">Strategic Thesis</h4>
                                <p className="text-xl font-bold text-primary leading-snug relative z-10">{viewingLesson.content.core_concept}</p>
                                <Icons.Zap className="absolute -bottom-8 -right-8 w-32 h-32 text-accent rotate-12 opacity-50 transition-transform group-hover:scale-110" />
                            </div>
                            {viewingLesson.content.subsections.map((sub, i) => (
                                <div key={i} className="space-y-6">
                                    <h3 className="text-2xl font-black text-primary uppercase tracking-tighter flex items-center gap-4">
                                        <span className="text-secondary opacity-30 text-5xl">0{i+1}</span>
                                        {sub.title}
                                    </h3>
                                    <p className="text-primary/80 leading-[2] font-medium text-[17px] whitespace-pre-wrap">{sub.content}</p>
                                </div>
                            ))}
                            <Card className="bg-primary text-white p-12 border-none shadow-2xl shadow-primary/30 rounded-[3rem] relative overflow-hidden">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="p-3 bg-white/10 rounded-2xl"><Icons.Trophy className="w-6 h-6" /></div>
                                    <h4 className="text-xs font-black uppercase tracking-[0.3em] text-white/50">Success Protocol X1</h4>
                                </div>
                                <p className="text-2xl font-black leading-tight tracking-tight relative z-10">{viewingLesson.content.the_1_percent_secret}</p>
                            </Card>
                            <div className="bg-gray-50 p-12 rounded-[3.5rem] border-2 border-gray-100 text-center">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase mb-6 tracking-[0.4em]">Mission Milestone</h4>
                                <p className="text-2xl font-black text-primary mb-10 tracking-tight uppercase">{viewingLesson.content.actionable_task}</p>
                                <Button onClick={() => setViewingLesson(null)} className="w-full py-6 text-base tracking-widest uppercase font-black rounded-[2.5rem]">Authorize Module</Button>
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-20 text-gray-300 animate-pulse font-black uppercase tracking-widest">Synchronizing Curriculum...</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}