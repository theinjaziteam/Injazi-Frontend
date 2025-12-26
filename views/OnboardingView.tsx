import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { AppView, GoalCategory, GoalMode, Goal, TaskStatus, Difficulty } from '../types';
import { Button, Icons, Card } from '../components/UIComponents';
import { getNextOnboardingQuestion, analyzeGoal, generateGoalVisualization, checkContentSafety, generateDailyTasks } from '../services/geminiService';
import { api } from '../services/api'; // <--- IMPORT API

export default function OnboardingView() {
    const { user, setUser, setView } = useApp();
    const [onboardStep, setOnboardStep] = useState(1); 
    const [selectedCategory, setSelectedCategory] = useState<GoalCategory | null>(null);
    const [selectedMode, setSelectedMode] = useState<GoalMode | null>(null);
    
    // AI Interaction State
    const [onboardingHistory, setOnboardingHistory] = useState<{question: string, answer: string}[]>([]);
    const [currentOnboardingQuestion, setCurrentOnboardingQuestion] = useState<string>("");
    const [onboardingInput, setOnboardingInput] = useState('');
    const [isOnboardingLoading, setIsOnboardingLoading] = useState(false);
    
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [proposedGoal, setProposedGoal] = useState<any>(null);
    const [isCommitting, setIsCommitting] = useState(false);

    const CATEGORY_ICONS: Record<GoalCategory, React.ReactNode> = {
      [GoalCategory.HEALTH]: <Icons.Activity className="w-6 h-6" />,
      [GoalCategory.LEARNING]: <Icons.Book className="w-6 h-6" />,
      [GoalCategory.PRODUCTIVITY]: <Icons.Zap className="w-6 h-6" />,
      [GoalCategory.MONEY]: <Icons.Briefcase className="w-6 h-6" />,
      [GoalCategory.SOCIAL]: <Icons.Users className="w-6 h-6" />,
      [GoalCategory.LIFESTYLE]: <Icons.Sun className="w-6 h-6" />,
      [GoalCategory.ENVIRONMENT]: <Icons.Globe className="w-6 h-6" />,
      [GoalCategory.OTHER]: <Icons.Grid className="w-6 h-6" />
    };

    const CATEGORY_THEMES: Record<GoalCategory, string> = {
        [GoalCategory.HEALTH]: "bg-red-50 border-red-100 text-red-600 hover:border-red-300",
        [GoalCategory.LEARNING]: "bg-blue-50 border-blue-100 text-blue-600 hover:border-blue-300",
        [GoalCategory.PRODUCTIVITY]: "bg-purple-50 border-purple-100 text-purple-600 hover:border-purple-300",
        [GoalCategory.MONEY]: "bg-emerald-50 border-emerald-100 text-emerald-600 hover:border-emerald-300",
        [GoalCategory.SOCIAL]: "bg-pink-50 border-pink-100 text-pink-600 hover:border-pink-300",
        [GoalCategory.LIFESTYLE]: "bg-orange-50 border-orange-100 text-orange-600 hover:border-orange-300",
        [GoalCategory.ENVIRONMENT]: "bg-teal-50 border-teal-100 text-teal-600 hover:border-teal-300",
        [GoalCategory.OTHER]: "bg-gray-50 border-gray-100 text-gray-600 hover:border-gray-300"
    };

    const handleCategorySelect = (category: GoalCategory) => {
        setSelectedCategory(category);
        setOnboardStep(2);
    };

    const handleModeSelect = (mode: GoalMode) => {
        setSelectedMode(mode);
        setOnboardStep(3);
        const startQ = mode === GoalMode.LEARNING 
            ? `Excellent. Starting your mastery in ${selectedCategory}. Describe your absolute dream outcome—no matter how big.`
            : `Tracking ${selectedCategory}. What specific metrics or routines are you trying to stabilize?`;
        setCurrentOnboardingQuestion(startQ);
        setOnboardingHistory([]);
        setOnboardingInput('');
    };

    const handleOnboardingAnswer = async (answer: string) => {
        if (!answer.trim() || !selectedCategory || !selectedMode) return;
        
        const newHistory = [...onboardingHistory, { question: currentOnboardingQuestion, answer }];
        setOnboardingHistory(newHistory);
        setOnboardingInput('');
        setIsOnboardingLoading(true);

        // AI decides if we need more info
        const result = await getNextOnboardingQuestion(selectedCategory, selectedMode, newHistory);
        
        if (result.type === 'finish') {
           generatePlan(newHistory);
        } else {
           setCurrentOnboardingQuestion(result.content || "Tell me more about your constraints.");
           setIsOnboardingLoading(false);
        }
    };

    const generatePlan = async (history: {question: string, answer: string}[]) => {
        setIsOnboardingLoading(false);
        setIsAnalyzing(true);
        try {
          // Flatten history for the prompt
          const historyStr = history.map(h => `Guide: ${h.question}\nUser: ${h.answer}`).join('\n');
          const category = selectedCategory || "General";
          const mode = selectedMode || GoalMode.LEARNING;
          
          // Pass the HISTORY ARRAY, not a string, because geminiService expects an array
          const analysis = await analyzeGoal(history); 
          
          const visual = await generateGoalVisualization(analysis.title, category);
          setProposedGoal({ ...analysis, visualUrl: visual });
          setOnboardStep(4); 
        } catch (error) { 
          alert("Strategic analysis failed. Retrying..."); 
          setOnboardStep(1);
        } finally { 
          setIsAnalyzing(false); 
        }
    };

    const handleRegenerate = () => {
        setProposedGoal(null);
        setOnboardStep(1);
        setSelectedCategory(null);
        setSelectedMode(null);
    };

    const confirmGoal = async () => {
        if (isCommitting || !proposedGoal || !selectedCategory || !selectedMode) return;
        setIsCommitting(true);

        try {
            const safetyCheck = await checkContentSafety(proposedGoal.title + " " + proposedGoal.summary);
            if (!safetyCheck.isSafe) {
                alert("Goal Rejected: Architecture flagged as inappropriate.");
                setIsCommitting(false);
                setOnboardStep(1);
                return;
            }
            
            const newGoal: Goal = {
                id: `goal-${Date.now()}`,
                userDescription: JSON.stringify(onboardingHistory),
                category: selectedCategory,
                mode: selectedMode,
                title: proposedGoal.title,
                summary: proposedGoal.summary,
                explanation: proposedGoal.explanation,
                difficultyProfile: proposedGoal.difficultyProfile || "Medium",
                durationDays: proposedGoal.durationDays || 30,
                createdAt: Date.now(),
                visualUrl: proposedGoal.visualUrl,
                dailyQuestions: proposedGoal.dailyQuestions || [],
                savedTasks: [],
                savedCurriculum: [],
                savedFeed: []
            };
            
            const initialTasks = await generateDailyTasks(newGoal, 1, [], []);
            
            // --- CRITICAL FIX: FORCE SAVE TO DATABASE IMMEDIATELY ---
            const updatedUser = { 
                ...user, 
                goal: newGoal,
                allGoals: [...(user.allGoals || []), { ...newGoal, savedTasks: initialTasks, savedDay: 1 }],
                dailyTasks: initialTasks,
                lastCheckInDate: Date.now(),
                currentDay: 1
            };

            // 1. Update Local State
            setUser(updatedUser);

            // 2. FORCE SYNC TO SERVER
            console.log("💾 Forcing Database Save...");
            await api.sync(updatedUser);
            
            // 3. Navigate only after sync starts
            setTimeout(() => setView(AppView.DASHBOARD), 100);

        } catch (error) {
            console.error("Confirmation Error:", error);
            alert("Could not save goal to database. Check connection.");
            setIsCommitting(false);
        }
    };

    if (isAnalyzing) {
        return (
            <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center animate-fade-in">
                <div className="relative mb-8">
                    <div className="w-24 h-24 rounded-full border-4 border-gray-100"></div>
                    <div className="absolute top-0 left-0 w-24 h-24 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                    <Icons.Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-primary animate-pulse" />
                </div>
                <h2 className="text-2xl font-black text-primary mb-2 animate-pulse uppercase tracking-tighter">Architecting Your Mission</h2>
                <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Building Success Roadmap...</p>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto pb-safe scroll-smooth">
            <div className="min-h-full bg-white px-6 pt-safe pt-6 pb-20 animate-fade-in flex flex-col">
                
                <h1 className="text-3xl font-black text-primary mb-2 uppercase tracking-tighter">Mission Setup</h1>
                <div className="w-full mb-8">
                    <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: `${(onboardStep / 4) * 100}%` }}></div>
                    </div>
                </div>

                {onboardStep === 1 && (
                    <div className="animate-slide-up">
                        <h2 className="text-xl font-black text-primary mb-6 uppercase tracking-tight">Select Domain</h2>
                        <div className="grid grid-cols-2 gap-4 mb-10">
                            {Object.values(GoalCategory).map((cat) => (
                                <button 
                                    key={cat} 
                                    onClick={() => handleCategorySelect(cat)} 
                                    className={`p-6 rounded-[2rem] text-left h-40 w-full border-2 transition-all active:scale-95 ${CATEGORY_THEMES[cat]}`}
                                >
                                    <div className="p-3 rounded-2xl mb-3 inline-block bg-white/60 backdrop-blur-md shadow-sm">{CATEGORY_ICONS[cat]}</div>
                                    <span className="font-black text-xs uppercase tracking-widest block leading-tight">{cat}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {onboardStep === 2 && (
                    <div className="animate-slide-up space-y-4">
                        <h2 className="text-xl font-black text-primary mb-6 uppercase tracking-tight">Mission Type</h2>
                        <button onClick={() => handleModeSelect(GoalMode.LEARNING)} className="w-full p-8 rounded-[2.5rem] bg-primary text-white text-left shadow-2xl shadow-primary/20 group">
                            <div className="bg-white/10 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:rotate-6 transition-transform"><Icons.BookOpen className="w-7 h-7"/></div>
                            <h3 className="text-xl font-black mb-1 uppercase tracking-tighter">Full Learning</h3>
                            <p className="text-sm text-white/50 font-medium">Build mastery from level zero. Deep academic focus.</p>
                        </button>
                        <button onClick={() => handleModeSelect(GoalMode.TRACKING)} className="w-full p-8 rounded-[2.5rem] bg-white border-2 border-accent text-primary text-left group">
                            <div className="bg-accent w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:rotate-6 transition-transform"><Icons.BarChart className="w-7 h-7 text-secondary"/></div>
                            <h3 className="text-xl font-black mb-1 uppercase tracking-tighter">Elite Tracking</h3>
                            <p className="text-sm text-secondary font-medium">Maintain existing success. Focus on stabilization.</p>
                        </button>
                        <Button variant="outline" onClick={() => setOnboardStep(1)} className="mt-8">Back to Domains</Button>
                    </div>
                )}

                {onboardStep === 3 && (
                    <div className="flex flex-col h-full animate-slide-up">
                        <div className="flex items-start mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center mr-4 flex-shrink-0 shadow-xl shadow-primary/10">
                                {isOnboardingLoading ? <Icons.RefreshCw className="w-6 h-6 animate-spin" /> : <Icons.Bot className="w-6 h-6" />}
                            </div>
                            <div>
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Architecture Intelligence</span>
                                <p className="text-lg font-bold text-primary leading-tight">{isOnboardingLoading ? "Processing Insight..." : currentOnboardingQuestion}</p>
                            </div>
                        </div>
                        <textarea 
                            className="w-full h-56 p-8 rounded-[2.5rem] bg-accent/30 border-2 border-accent text-lg text-primary focus:outline-none placeholder:text-primary/20 font-medium" 
                            placeholder="Type your strategic response..." 
                            disabled={isOnboardingLoading} 
                            autoFocus 
                            value={onboardingInput}
                            onChange={(e) => setOnboardingInput(e.target.value)}
                            onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleOnboardingAnswer(onboardingInput); } }} 
                        />
                        <div className="flex mt-8 gap-4">
                            <button onClick={() => setOnboardStep(2)} className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-6 py-2">Restart</button>
                            <button onClick={() => handleOnboardingAnswer(onboardingInput)} disabled={!onboardingInput.trim() || isOnboardingLoading} className="ml-auto flex items-center bg-primary text-white font-black uppercase text-[10px] tracking-[0.2em] px-10 py-4 rounded-full shadow-2xl shadow-primary/20 transition-all hover:scale-105 active:scale-95">Analyze <Icons.ArrowRight className="w-4 h-4 ml-2"/></button>
                        </div>
                    </div>
                )}

                {onboardStep === 4 && proposedGoal && (
                      <div className="flex flex-col h-full animate-slide-up pb-10">
                        <div className="relative w-full h-64 rounded-[3rem] overflow-hidden shadow-2xl shadow-primary/30 mb-10 flex-shrink-0">
                            {proposedGoal.visualUrl ? <img src={proposedGoal.visualUrl} alt="Goal" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-100" />}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                            <div className="absolute top-6 left-6 flex gap-2">
                                <span className="bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest border border-white/10">{selectedMode}</span>
                                <span className="bg-primary text-white px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest">{proposedGoal.difficultyProfile}</span>
                            </div>
                            <div className="absolute bottom-6 left-6 right-6">
                                <h2 className="text-3xl font-black text-white leading-none tracking-tighter uppercase mb-2">{proposedGoal.title}</h2>
                                <div className="text-[10px] text-white/60 font-black uppercase tracking-[0.3em]">{proposedGoal.durationDays} Day Architecture</div>
                            </div>
                        </div>

                        <div className="flex-1 space-y-8">
                            <div className="bg-accent/30 p-8 rounded-[2.5rem] border-2 border-accent">
                                <h4 className="text-[10px] font-black text-secondary uppercase tracking-[0.3em] mb-4">Strategic Logic</h4>
                                <div className="text-sm font-bold text-primary leading-relaxed whitespace-pre-wrap">{proposedGoal.explanation}</div>
                            </div>
                            
                            <div className="px-2">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-3 text-center">Outcome Guarantee</h4>
                                <p className="text-sm text-center font-medium text-gray-500 italic leading-relaxed">"{proposedGoal.summary}"</p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4 mt-10">
                            <Button onClick={confirmGoal} variant="secondary" disabled={isCommitting} isLoading={isCommitting} className="w-full py-6 text-base tracking-widest uppercase font-black rounded-[2rem]">Authorize Architecture</Button>
                            <button onClick={handleRegenerate} disabled={isCommitting} className="text-[10px] font-black text-gray-400 hover:text-primary uppercase tracking-[0.3em] mx-auto py-4">Regenerate Roadmap</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}