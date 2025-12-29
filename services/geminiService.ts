// services/geminiService.ts
import { 
    Goal, Task, Difficulty, ChatMessage, GoalCategory, 
    FeedItem, Chapter, Course, GoalMode, ConnectedApp, TaskStatus, 
    BudgetSplit, DeepInsight, UserState, ExtraLog, Product, LessonContent
} from "../types";

const API_URL = import.meta.env.VITE_API_URL || 'https://injazi-backend.onrender.com';

// ============================================
// CORE API CALL FUNCTION
// ============================================

async function callAI(endpoint: string, body: object): Promise<any> {
    try {
        const response = await fetch(`${API_URL}/api/ai/${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        
        if (!response.ok) {
            console.error(`AI ${endpoint} error:`, data.error);
            throw new Error(data.error || 'AI request failed');
        }

        return data;
    } catch (error) {
        console.error(`AI ${endpoint} error:`, error);
        throw error;
    }
}

// ============================================
// ENHANCED CHAT RESPONSE - Much better prompting
// ============================================

export async function getChatResponse(
    goal: Goal, 
    history: ChatMessage[], 
    newMessage: string, 
    userProfile: string, 
    currentTasks: Task[], 
    connectedApps: ConnectedApp[], 
    attachment?: any, 
    extraLogs: ExtraLog[] = []
): Promise<string> { 
    try {
        // Build rich context
        const completedTasks = currentTasks.filter(t => 
            t.status === TaskStatus.APPROVED || t.status === TaskStatus.COMPLETED
        );
        const pendingTasks = currentTasks.filter(t => 
            t.status !== TaskStatus.APPROVED && t.status !== TaskStatus.COMPLETED
        );
        
        const taskContext = pendingTasks.length > 0 
            ? `\nCURRENT PENDING TASKS:\n${pendingTasks.map((t, i) => `${i + 1}. "${t.title}" (${t.difficulty}, ~${t.estimatedTimeMinutes}min)`).join('\n')}`
            : '\nAll tasks for today are completed!';
        
        const progressContext = `
PROGRESS SUMMARY:
- Tasks completed today: ${completedTasks.length}/${currentTasks.length}
- Goal: "${goal.title}" (${goal.category})
- User context: ${userProfile || 'New user, still learning about them'}`;

        const recentLogs = extraLogs.slice(-3).map(log => log.text).join(' | ');
        const logsContext = recentLogs ? `\nRECENT USER NOTES: ${recentLogs}` : '';

        // Build conversation history (last 10 messages for context)
        const recentHistory = history.slice(-10).map(m => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.text
        }));

        // Enhanced system prompt
        const systemPrompt = `You are an elite personal success coach and strategic advisor embedded in the Injazi goal achievement app. Your name is "The Guide" and you have a warm but direct personality.

YOUR CORE IDENTITY:
- You're like a blend of a wise mentor, strategic consultant, and supportive friend
- You speak with confidence and authority, but also warmth and understanding
- You give specific, actionable advice - never vague platitudes
- You remember context from the conversation and build on it
- You celebrate wins genuinely but also push for growth
- You're honest when something isn't working and suggest pivots

YOUR APPROACH:
1. UNDERSTAND before advising - ask clarifying questions when needed
2. Be SPECIFIC - give exact steps, timeframes, and examples
3. Be CONCISE - respect the user's time, get to the point
4. Be STRATEGIC - think about the bigger picture and long-term success
5. Be MOTIVATING - but through substance, not empty cheerleading

COMMUNICATION STYLE:
- Use short paragraphs (2-3 sentences max)
- Use bullet points for action items or lists
- Bold **key points** for emphasis
- Be conversational but professional
- Match the user's energy - if they're frustrated, acknowledge it; if they're excited, match it
- End with a question or clear next step when appropriate

WHAT YOU KNOW ABOUT THIS USER:
${progressContext}
${taskContext}
${logsContext}

IMPORTANT RULES:
- Never say "I'm just an AI" or similar - you ARE their guide
- Don't be preachy or lecture them
- If they're struggling, focus on ONE small win they can achieve
- If they're succeeding, help them think bigger
- If they ask something outside your scope, redirect to how it connects to their goal
- Keep responses under 200 words unless they ask for detailed analysis`;

        const data = await callAI('chat', {
            systemPrompt,
            goal: { title: goal.title, category: goal.category },
            history: recentHistory,
            message: newMessage,
            userProfile,
            currentTasks: currentTasks.map(t => ({ 
                title: t.title, 
                status: t.status,
                difficulty: t.difficulty,
                estimatedTimeMinutes: t.estimatedTimeMinutes
            }))
        });

        return data.response || getSmartFallbackResponse(newMessage, goal, pendingTasks, completedTasks);
    } catch (error) {
        console.error("Chat error:", error);
        return getSmartFallbackResponse(newMessage, goal, 
            currentTasks.filter(t => t.status !== TaskStatus.APPROVED && t.status !== TaskStatus.COMPLETED),
            currentTasks.filter(t => t.status === TaskStatus.APPROVED || t.status === TaskStatus.COMPLETED)
        );
    }
}

function getSmartFallbackResponse(
    message: string, 
    goal: Goal, 
    pendingTasks: Task[], 
    completedTasks: Task[]
): string {
    const msg = message.toLowerCase();
    const goalTitle = goal.title;
    
    // Stuck/Help patterns
    if (msg.includes('stuck') || msg.includes('help') || msg.includes("don't know") || msg.includes('confused')) {
        if (pendingTasks.length > 0) {
            const easiestTask = pendingTasks.find(t => t.difficulty === Difficulty.EASY) || pendingTasks[0];
            return `I hear you. When we're stuck, the best move is usually the smallest one.\n\n**Here's what I suggest:**\n\nLook at "${easiestTask.title}" - it's about ${easiestTask.estimatedTimeMinutes} minutes. Don't think about finishing it perfectly. Just open it and do the first tiny step.\n\nWhat's literally the first physical action you'd need to take?`;
        }
        return `Being stuck is actually useful information - it tells us something needs to change.\n\n**Let's diagnose this:**\n\nIs it that you don't know WHAT to do next, or you know what to do but can't get yourself to do it?\n\nTell me more about where the friction is.`;
    }
    
    // Motivation patterns
    if (msg.includes('motivat') || msg.includes('tired') || msg.includes('exhausted') || msg.includes("can't")) {
        return `I get it. Motivation is unreliable - that's why we don't depend on it.\n\n**Here's what actually works:**\n\nForget about feeling motivated. What's the absolute minimum you could do for "${goalTitle}" in the next 10 minutes that would let you say "I showed up today"?\n\nSometimes progress is just not quitting.`;
    }
    
    // Progress/Done patterns
    if (msg.includes('done') || msg.includes('finished') || msg.includes('completed') || msg.includes('did it')) {
        if (completedTasks.length > 0) {
            return `**That's momentum right there.** ${completedTasks.length} task${completedTasks.length > 1 ? 's' : ''} down.\n\nQuick reflection: What was the hardest part? And what made you push through it?\n\nUnderstanding your own patterns is how you build unstoppable consistency.`;
        }
        return `Excellent. Every completed action is evidence that you CAN do this.\n\n**Capture this win:**\n\nWhat did you learn from doing it? And what's the natural next step from here?`;
    }
    
    // Focus patterns
    if (msg.includes('focus') || msg.includes('priorit') || msg.includes('important') || msg.includes('should i')) {
        if (pendingTasks.length > 0) {
            const hardTask = pendingTasks.find(t => t.difficulty === Difficulty.HARD);
            const suggestion = hardTask || pendingTasks[0];
            return `**For "${goalTitle}", here's how I'd prioritize:**\n\nYour highest-leverage task right now is "${suggestion.title}". It's ${suggestion.difficulty?.toLowerCase() || 'moderate'} difficulty but will move the needle most.\n\nBut if your energy is low, start with something easier to build momentum first.\n\nWhat's your energy level right now, 1-10?`;
        }
        return `Great question. Focus is everything.\n\n**Here's my take:**\n\nFor "${goalTitle}", what's the ONE thing that, if you did it this week, would make everything else easier or unnecessary?\n\nStart there.`;
    }
    
    // Progress review patterns
    if (msg.includes('progress') || msg.includes('review') || msg.includes('how am i') || msg.includes('doing')) {
        const completionRate = completedTasks.length / Math.max(completedTasks.length + pendingTasks.length, 1);
        if (completionRate >= 0.8) {
            return `**You're crushing it.** ${Math.round(completionRate * 100)}% completion rate.\n\nSeriously - most people don't get close to this. You're building the kind of consistency that compounds.\n\n**Next level question:** What would it look like to maintain this AND increase the difficulty slightly?`;
        } else if (completionRate >= 0.5) {
            return `**Solid progress.** ${Math.round(completionRate * 100)}% of tasks complete.\n\nYou're showing up, which is more than most. But I think you have another gear.\n\n**Challenge:** Can you finish one more task today? Just one. That small push is where growth happens.`;
        } else {
            return `**Real talk:** ${Math.round(completionRate * 100)}% completion is below where we want to be.\n\nBut here's the thing - we're not here to judge, we're here to adjust.\n\n**Let's figure this out:**\n\nAre the tasks too big? Is the goal not exciting enough? Or is life just chaotic right now?\n\nWhat's actually going on?`;
        }
    }
    
    // Accelerate/faster patterns
    if (msg.includes('faster') || msg.includes('accelerate') || msg.includes('speed up') || msg.includes('quicker')) {
        return `**You want to accelerate "${goalTitle}"? I love that energy.**\n\nHere are three ways to move faster:\n\n• **Increase frequency** - Can you do something for this goal twice a day instead of once?\n• **Remove friction** - What's slowing you down that you could eliminate?\n• **Raise stakes** - Tell someone your deadline. Social pressure works.\n\nWhich one resonates most with your situation?`;
    }
    
    // Default - curious and engaging
    return `Thanks for sharing that. I want to make sure I understand and give you something actually useful.\n\n**Quick context:**\n\nYou're working on "${goalTitle}" with ${pendingTasks.length} task${pendingTasks.length !== 1 ? 's' : ''} pending.\n\nWhat's the specific situation you're dealing with? The more detail you give me, the more targeted my advice can be.`;
}

// ============================================
// GENERATE DAILY TASKS - Enhanced
// ============================================

export async function generateDailyTasks(
    goal: Goal, 
    day: number, 
    userProfile: string = '', 
    checkIn: string = '', 
    pending: any[] = []
): Promise<Task[]> {
    try {
        const systemPrompt = `You are a task generation system for goal achievement. Create specific, actionable daily tasks.

RULES:
1. Tasks must be SPECIFIC - not "work on project" but "write 500 words of chapter 2"
2. Tasks must be ACHIEVABLE in the given timeframe
3. Include a mix of difficulties (1 easy, 1-2 medium, 1 hard)
4. Tasks should build on each other and create momentum
5. Consider the user's check-in if provided - adapt to their current state`;

        const data = await callAI('generate-tasks', {
            systemPrompt,
            goal: { title: goal.title, category: goal.category },
            day,
            userProfile,
            checkIn
        });

        if (!data.tasks || !Array.isArray(data.tasks) || data.tasks.length === 0) {
            console.warn('⚠️ AI returned no tasks, using fallback');
            return getMockTasks(goal, day);
        }

        console.log('✅ AI generated', data.tasks.length, 'tasks');

        return data.tasks.map((t: any, i: number) => ({
            id: `task-${day}-${i}-${Date.now()}`,
            dayNumber: day,
            title: t.title || `Task ${i + 1}`,
            description: t.description || 'Complete this task',
            estimatedTimeMinutes: parseInt(t.estimatedTimeMinutes) || 20,
            difficulty: t.difficulty === 'EASY' || t.difficulty === 'Easy' ? Difficulty.EASY 
                      : t.difficulty === 'HARD' || t.difficulty === 'Hard' ? Difficulty.HARD 
                      : Difficulty.MEDIUM,
            videoRequirements: 'None',
            creditsReward: 0,
            status: TaskStatus.PENDING
        }));

    } catch (e) {
        console.error("Task generation failed:", e);
        return getMockTasks(goal, day);
    }
}

function getMockTasks(goal: Goal, day: number): Task[] {
    const ts = Date.now();
    return [
        { 
            id: `t1-${ts}`, 
            dayNumber: day, 
            title: 'Morning Strategy Session', 
            description: `Open your notes app or journal. Write down your top 3 priorities for ${goal.title} today. For each priority, write one specific action you can take. Set a timer for 10 minutes and brainstorm without editing yourself.`, 
            estimatedTimeMinutes: 15, 
            difficulty: Difficulty.EASY, 
            videoRequirements: 'None', 
            creditsReward: 0, 
            status: TaskStatus.PENDING 
        },
        { 
            id: `t2-${ts}`, 
            dayNumber: day, 
            title: 'Deep Work Block', 
            description: `Block 45 minutes on your calendar. Turn off all notifications. Use the Pomodoro technique (25 min work, 5 min break, repeat). Focus entirely on making progress toward ${goal.title}. Track what you accomplish in a simple log.`, 
            estimatedTimeMinutes: 45, 
            difficulty: Difficulty.HARD, 
            videoRequirements: 'None', 
            creditsReward: 0, 
            status: TaskStatus.PENDING 
        },
        { 
            id: `t3-${ts}`, 
            dayNumber: day, 
            title: 'Daily Review & Planning', 
            description: 'Open your task list or journal. Write 3 things you accomplished today. Note 1 thing that was challenging and how you handled it. Write your top priority for tomorrow. Rate your energy level 1-10 to track patterns.', 
            estimatedTimeMinutes: 10, 
            difficulty: Difficulty.MEDIUM, 
            videoRequirements: 'None', 
            creditsReward: 0, 
            status: TaskStatus.PENDING 
        }
    ];
}

// ============================================
// CURRICULUM GENERATOR
// ============================================

export async function getGoalCurriculum(goal: Goal): Promise<Chapter[]> { 
    try {
        const data = await callAI('curriculum', {
            goal: { title: goal.title, category: goal.category }
        });

        if (data.chapters && Array.isArray(data.chapters) && data.chapters.length > 0) {
            console.log('✅ Curriculum generated:', data.chapters.length, 'phases');
            return data.chapters;
        }
        
        console.warn('⚠️ No curriculum returned');
        return [];
    } catch (e) {
        console.error("Curriculum generation failed:", e);
        return [];
    }
}

// ============================================
// ONBOARDING
// ============================================

export async function getNextOnboardingQuestion(
    category: GoalCategory, 
    mode: GoalMode, 
    history: {question: string, answer: string}[]
): Promise<{ type: 'question' | 'finish', content?: string }> { 
    const questions = [
        "What specifically do you want to achieve? Be as detailed as possible.",
        "Why is this goal important to you right now? What will change when you achieve it?",
        "What's your target timeline? When do you want to see results?",
        "What's been stopping you from achieving this before? What obstacles do you anticipate?"
    ];
    
    if (history.length >= 4) return { type: 'finish' };
    return { type: 'question', content: questions[history.length] };
}

// ============================================
// GOAL ANALYZER
// ============================================

export async function analyzeGoal(
    history: {question: string, answer: string}[]
): Promise<any> { 
    try {
        const historyStr = history.map(h => `Q: ${h.question}\nA: ${h.answer}`).join('\n');
        
        const data = await callAI('completion', {
            messages: [
                {
                    role: 'system',
                    content: 'You are a goal strategist. Analyze the user interview and create a personalized goal plan. Return ONLY valid JSON.'
                },
                {
                    role: 'user',
                    content: `Based on this interview, create a compelling goal plan:

${historyStr}

Return ONLY this JSON:
{
  "title": "Inspiring 3-5 word goal title that feels personal",
  "summary": "One powerful sentence describing what they'll achieve",
  "explanation": "2-3 sentences explaining why this plan will work for them specifically",
  "difficultyProfile": "Beginner" or "Intermediate" or "Advanced",
  "durationDays": realistic number between 14-90,
  "userProfile": "Brief 3-5 word description of this person",
  "dailyQuestions": ["Personalized check-in question 1", "Personalized check-in question 2"]
}`
                }
            ],
            jsonMode: true
        });

        if (data.content) {
            try {
                return JSON.parse(data.content);
            } catch {
                return getDefaultGoalAnalysis(history);
            }
        }
        return getDefaultGoalAnalysis(history);
    } catch (e) {
        console.error("Goal analysis failed:", e);
        return getDefaultGoalAnalysis(history);
    }
}

function getDefaultGoalAnalysis(history: {question: string, answer: string}[]): any {
    const firstAnswer = history[0]?.answer || 'your goal';
    return { 
        title: `Master ${firstAnswer.slice(0, 25)}`, 
        summary: "A focused path to achieving your goal with daily action steps.", 
        explanation: "We've created a structured daily approach based on your answers. Each day builds on the last, creating momentum toward your goal.", 
        difficultyProfile: "Intermediate", 
        durationDays: 30, 
        userProfile: "Committed achiever", 
        dailyQuestions: ["What progress did you make today?", "What's your energy level and focus?"] 
    };
}

// ============================================
// LESSON CONTENT GENERATOR
// ============================================

export async function generateLessonContent(
    lesson: { id: string; title: string; description: string; duration: string },
    goal: Goal,
    chapterTitle: string
): Promise<LessonContent | null> {
    try {
        const data = await callAI('completion', {
            messages: [
                {
                    role: 'system',
                    content: `You are an expert educator creating detailed, actionable lesson content. 
Your lessons should be practical, engaging, and directly applicable.
Write in a conversational but professional tone.
Include specific examples, tools, and techniques the learner can use immediately.`
                },
                {
                    role: 'user',
                    content: `Create detailed lesson content for:

GOAL: "${goal.title}" (${goal.category})
CHAPTER: "${chapterTitle}"
LESSON: "${lesson.title}"
DESCRIPTION: "${lesson.description}"
DURATION: ${lesson.duration}

Return ONLY valid JSON:
{
  "lesson_title": "${lesson.title}",
  "difficulty_level": "Beginner" or "Intermediate" or "Advanced",
  "estimated_read_time": "${lesson.duration}",
  "core_concept": "One powerful sentence summarizing the key insight",
  "subsections": [
    {"title": "Understanding the Fundamentals", "content": "2-3 detailed paragraphs..."},
    {"title": "Practical Application", "content": "2-3 detailed paragraphs..."},
    {"title": "Taking It Further", "content": "2-3 detailed paragraphs..."}
  ],
  "the_1_percent_secret": "A powerful insider tip most people don't know",
  "actionable_task": "Step 1: ...\\n\\nStep 2: ...\\n\\nStep 3: ..."
}`
                }
            ],
            jsonMode: true,
            maxTokens: 4096
        });

        if (data.content) {
            try {
                const parsed = JSON.parse(data.content);
                if (parsed.core_concept && parsed.subsections) {
                    return parsed as LessonContent;
                }
            } catch {}
        }
        return getDefaultLessonContent(lesson, goal);
    } catch (e) {
        console.error("Lesson content generation failed:", e);
        return getDefaultLessonContent(lesson, goal);
    }
}

function getDefaultLessonContent(lesson: { id: string; title: string; description: string; duration: string }, goal: Goal): LessonContent {
    return {
        lesson_title: lesson.title,
        difficulty_level: "Intermediate",
        estimated_read_time: lesson.duration,
        core_concept: `Master the fundamentals of ${lesson.title.toLowerCase()} to accelerate your progress toward ${goal.title}.`,
        subsections: [
            {
                title: "Understanding the Basics",
                content: `${lesson.description}\n\nThis foundational knowledge is essential for your journey toward ${goal.title}. Take time to understand these concepts deeply, as they will serve as building blocks for everything that follows.`
            },
            {
                title: "Putting It Into Practice",
                content: `Now that you understand the theory, it's time to apply it. The best learning happens through doing, so don't just read—take action.\n\nStart small and build momentum. Even 10 minutes of focused practice is better than hours of passive consumption.`
            },
            {
                title: "Building Momentum",
                content: `As you continue practicing, you'll start to see patterns and develop intuition. This is when real mastery begins to emerge.\n\nLook for opportunities to apply what you've learned in different contexts.`
            }
        ],
        the_1_percent_secret: `The most successful people in ${goal.category} don't just learn—they teach. Try explaining what you've learned to someone else.`,
        actionable_task: `Step 1: Open your notes app or grab a piece of paper.\n\nStep 2: Write down the 3 most important things you learned from this lesson.\n\nStep 3: For each point, write one specific action you can take this week to apply it.`
    };
}

// ============================================
// CONTENT SAFETY
// ============================================

export async function checkContentSafety(text: string): Promise<{isSafe: boolean, reason?: string}> { 
    if (!text.trim()) return { isSafe: true };
    const badPatterns = /\b(hack|exploit|illegal|spam|scam)\b/i;
    return { isSafe: !badPatterns.test(text) };
}

// ============================================
// DEEP INSIGHTS
// ============================================

export async function generateDeepInsights(user: UserState): Promise<DeepInsight | null> {
    const completed = user.dailyTasks.filter(t => 
        t.status === TaskStatus.APPROVED || t.status === TaskStatus.COMPLETED
    ).length;
    const total = user.dailyTasks.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    if (percentage >= 80) {
        return {
            trend: "Exceptional Progress",
            prediction: "At this rate, you'll exceed your goals ahead of schedule!",
            focusArea: "Maintain momentum",
            title: "You're Crushing It!",
            description: `${completed}/${total} tasks complete (${percentage}%). Your consistency is paying off.`,
            type: "positive"
        };
    } else if (percentage >= 50) {
        return {
            trend: "Solid Progress",
            prediction: "You're building good habits. Keep pushing!",
            focusArea: "Increase completion rate",
            title: "Good Momentum",
            description: `${completed}/${total} tasks complete. Try to finish one more today!`,
            type: "positive"
        };
    } else {
        return {
            trend: "Building Up",
            prediction: "Small steps lead to big changes. Start with one task.",
            focusArea: "Start with quick wins",
            title: "Time to Focus",
            description: `${completed}/${total} tasks complete. Pick the easiest task and knock it out!`,
            type: "neutral"
        };
    }
}

// ============================================
// REMAINING FUNCTIONS (unchanged)
// ============================================

export async function getSocialMarketplace(): Promise<Course[]> { return []; }
export async function getSocialAds(category: any): Promise<Product[]> { return []; }
export async function getFeedRecommendations(goal: any): Promise<FeedItem[]> { return []; }

export async function generateGoalVisualization(title: string, category: string): Promise<string> { 
    return `https://picsum.photos/seed/${encodeURIComponent(title.replace(/\s/g, ''))}/800/450`; 
}

export async function verifyTaskVideo(task: Task, videoBase64: string, mimeType: string): Promise<{status: 'APPROVED' | 'REJECTED', reason?: string}> { 
    return { status: 'APPROVED' };
}

export async function updateUserProfile(profile: string, checkin: string): Promise<string> { 
    const timestamp = new Date().toLocaleDateString();
    return profile ? `${profile} | [${timestamp}] ${checkin}` : `[${timestamp}] ${checkin}`;
}

export async function analyzeMetricChange(metric: any): Promise<any> { 
    return { analysis: "Metric tracking active.", recommendation: "Continue monitoring for trends." }; 
}

export async function calculateBudgetSplit(amount: number, goal: any, profile: any): Promise<BudgetSplit | null> {
    return {
        lowRisk: { amount: amount * 0.5, percent: 50 },
        mediumRisk: { amount: amount * 0.3, percent: 30 },
        highYield: { amount: amount * 0.2, percent: 20 }
    };
}

export async function generateLessonTasks(
    lesson: { id: string; title: string; description: string },
    goal: Goal,
    lessonContent: LessonContent
): Promise<Task[]> {
    try {
        const data = await callAI('completion', {
            messages: [
                {
                    role: 'system',
                    content: `You are a task coach creating practical tasks based on lesson content.
Each task should directly apply what was taught in the lesson.
Make tasks specific, actionable, and achievable in the given time.`
                },
                {
                    role: 'user',
                    content: `Create 2 practical tasks based on this lesson:

LESSON: "${lesson.title}"
KEY CONCEPT: "${lessonContent.core_concept}"
ACTION ITEM FROM LESSON: "${lessonContent.actionable_task}"

GOAL CONTEXT: "${goal.title}" (${goal.category})

Create 2 tasks:
- Task 1: A quick application task (10-15 min, EASY)
- Task 2: A deeper practice task (20-30 min, MEDIUM)

Return ONLY valid JSON:
{"tasks": [
  {"title": "Quick task title", "description": "Detailed steps...", "estimatedTimeMinutes": 12, "difficulty": "EASY"},
  {"title": "Practice task title", "description": "Detailed steps...", "estimatedTimeMinutes": 25, "difficulty": "MEDIUM"}
]}`
                }
            ],
            jsonMode: true
        });

        if (data.content) {
            try {
                const parsed = JSON.parse(data.content);
                const tasks = parsed.tasks || parsed;
                
                if (Array.isArray(tasks) && tasks.length > 0) {
                    return tasks.map((t: any, i: number) => ({
                        id: `lesson-task-${lesson.id}-${i}-${Date.now()}`,
                        dayNumber: 0,
                        title: t.title || `Lesson Task ${i + 1}`,
                        description: t.description || 'Complete this task',
                        estimatedTimeMinutes: parseInt(t.estimatedTimeMinutes) || 15,
                        difficulty: t.difficulty === 'EASY' || t.difficulty === 'Easy' ? Difficulty.EASY 
                                  : t.difficulty === 'HARD' || t.difficulty === 'Hard' ? Difficulty.HARD 
                                  : Difficulty.MEDIUM,
                        videoRequirements: 'None',
                        creditsReward: 0,
                        status: TaskStatus.PENDING,
                        sourceLessonId: lesson.id,
                        isLessonTask: true
                    }));
                }
            } catch {}
        }
        return getDefaultLessonTasks(lesson, goal);
    } catch (e) {
        console.error("Lesson task generation failed:", e);
        return getDefaultLessonTasks(lesson, goal);
    }
}

function getDefaultLessonTasks(lesson: { id: string; title: string; description: string }, goal: Goal): Task[] {
    const ts = Date.now();
    return [
        {
            id: `lesson-task-${lesson.id}-0-${ts}`,
            dayNumber: 0,
            title: `Apply: ${lesson.title}`,
            description: `Take 10 minutes to apply what you learned in "${lesson.title}". Write down 3 key insights and one immediate action you can take today.`,
            estimatedTimeMinutes: 10,
            difficulty: Difficulty.EASY,
            videoRequirements: 'None',
            creditsReward: 0,
            status: TaskStatus.PENDING,
            sourceLessonId: lesson.id,
            isLessonTask: true
        },
        {
            id: `lesson-task-${lesson.id}-1-${ts}`,
            dayNumber: 0,
            title: `Practice: ${lesson.title}`,
            description: `Spend 20 minutes practicing the concepts from "${lesson.title}". Focus on one specific technique and try it in a real situation.`,
            estimatedTimeMinutes: 20,
            difficulty: Difficulty.MEDIUM,
            videoRequirements: 'None',
            creditsReward: 0,
            status: TaskStatus.PENDING,
            sourceLessonId: lesson.id,
            isLessonTask: true
        }
    ];
}
