import { 
    Goal, Task, Difficulty, ChatMessage, ChatAttachment, GoalCategory, 
    FeedItem, Chapter, Course, GoalMode, ConnectedApp, TaskStatus, 
    BudgetSplit, DeepInsight, UserState, ExtraLog, Product 
} from "../types";

// Groq API Configuration
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';


// ============================================
// CORE API CALL FUNCTION
// ============================================

async function callGroq(messages: {role: string, content: string}[], jsonMode: boolean = false): Promise<string> {
    if (!GROQ_API_KEY) {
        throw new Error('No API key');
    }

    try {
        const response = await fetch(GROQ_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: MODEL,
                messages: messages,
                temperature: 0.7,
                max_tokens: 2048,
                ...(jsonMode && { response_format: { type: "json_object" } })
            })
        });

        const data = await response.json();
        
        if (data.error) {
            console.error('Groq API error:', data.error);
            throw new Error(data.error.message);
        }

        return data.choices?.[0]?.message?.content || '';
    } catch (error) {
        console.error('Groq API error:', error);
        throw error;
    }
}

// Safe JSON parser
function safeParseJSON(text: string, fallback: any = null): any {
    if (!text) return fallback;
    
    try {
        return JSON.parse(text);
    } catch {
        const arrayMatch = text.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
            try {
                return JSON.parse(arrayMatch[0]);
            } catch {}
        }
        
        const objectMatch = text.match(/\{[\s\S]*\}/);
        if (objectMatch) {
            try {
                return JSON.parse(objectMatch[0]);
            } catch {}
        }
        
        console.warn('Failed to parse JSON:', text.substring(0, 100));
        return fallback;
    }
}

// ============================================
// GENERATE DAILY TASKS - IMPROVED PROMPTS
// ============================================

export async function generateDailyTasks(
    goal: Goal, 
    day: number, 
    userProfile: string = '', 
    checkIn: string = '', 
    pending: any[] = []
): Promise<Task[]> {
    if (!GROQ_API_KEY) {
        console.log('⚠️ No API key, using mock tasks');
        return getMockTasks(goal, day);
    }

    try {
        const response = await callGroq([
            {
                role: 'system',
                content: `You are an expert task coach creating highly actionable daily tasks. 

RULES FOR GOOD TASKS:
1. Title: Clear, specific action (e.g., "Create Emergency Fund Spreadsheet" not "Check finances")
2. Description: MUST include:
   - Exact steps to complete the task
   - Specific tools, apps, websites, or resources to use
   - What "done" looks like (success criteria)
   - Pro tips if relevant

EXAMPLE OF EXCELLENT TASK:
{
  "title": "Build Your Emergency Fund Tracker",
  "description": "Open Google Sheets or Excel. Create columns: Date, Income, Expenses, Savings, Emergency Fund Total. List your last 3 months of expenses to find your monthly average. Your target is 3-6 months of expenses saved. Add a progress bar using conditional formatting to visualize your goal.",
  "estimatedTimeMinutes": 25,
  "difficulty": "MEDIUM"
}

EXAMPLE OF BAD TASK (never do this):
{
  "title": "Work on savings",
  "description": "Think about your savings goals",
  "estimatedTimeMinutes": 10,
  "difficulty": "EASY"
}

Be specific. Be actionable. Include real tools and steps.`
            },
            {
                role: 'user',
                content: `Create 3 highly detailed tasks for Day ${day} of: "${goal.title}" (${goal.category}).
${checkIn ? `\nUser's update: "${checkIn}"` : ''}
${userProfile ? `\nAbout user: ${userProfile}` : ''}

Requirements:
- Task 1: Quick win (15-20 min, EASY) - Something they can start immediately
- Task 2: Core work (30-45 min, MEDIUM) - Main progress task for the day  
- Task 3: Deep work (45-60 min, HARD) - Challenging task that moves the needle

Each description must have specific steps and tools/resources.

Return ONLY valid JSON:
{"tasks": [
  {"title": "Quick Win Task", "description": "Detailed steps with specific tools...", "estimatedTimeMinutes": 15, "difficulty": "EASY"},
  {"title": "Core Work Task", "description": "Detailed steps with specific tools...", "estimatedTimeMinutes": 35, "difficulty": "MEDIUM"},
  {"title": "Deep Work Task", "description": "Detailed steps with specific tools...", "estimatedTimeMinutes": 50, "difficulty": "HARD"}
]}`
            }
        ], true);

        console.log('🤖 Raw AI response:', response);

        let tasks: any[] = [];
        
        try {
            const parsed = JSON.parse(response);
            if (Array.isArray(parsed)) {
                tasks = parsed;
            } else if (parsed.tasks && Array.isArray(parsed.tasks)) {
                tasks = parsed.tasks;
            }
        } catch {
            const arrayMatch = response.match(/\[[\s\S]*?\]/);
            if (arrayMatch) {
                try {
                    tasks = JSON.parse(arrayMatch[0]);
                } catch {
                    console.warn('Failed to parse array match');
                }
            }
        }

        if (!Array.isArray(tasks) || tasks.length === 0) {
            console.warn('⚠️ AI returned invalid format, response was:', response);
            return getMockTasks(goal, day);
        }

        console.log('✅ AI generated', tasks.length, 'tasks');

        return tasks.map((t: any, i: number) => ({
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
// CHAT RESPONSE
// ============================================

export async function getChatResponse(
    goal: Goal, 
    history: ChatMessage[], 
    newMessage: string, 
    userProfile: string, 
    currentTasks: Task[], 
    connectedApps: ConnectedApp[], 
    attachment?: ChatAttachment, 
    extraLogs: ExtraLog[] = []
): Promise<string> { 
    if (!GROQ_API_KEY) {
        return getFallbackResponse(newMessage, goal);
    }
    
    try {
        const taskList = currentTasks.map(t => `- ${t.title} (${t.status})`).join('\n');
        
        const messages = [
            {
                role: 'system',
                content: `You are "The Guide" - a supportive AI coach helping someone achieve "${goal.title}".

Your personality:
- Warm, encouraging, but practical
- Give specific actionable advice, not generic motivation
- Keep responses concise (2-4 sentences unless they ask for detail)
- Reference their specific tasks and goal when relevant
- Ask follow-up questions to understand their challenges

User's current tasks:
${taskList || 'No tasks yet'}

${userProfile ? `About them: ${userProfile}` : ''}`
            },
            ...history.slice(-8).map(msg => ({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.text
            })),
            { role: 'user', content: newMessage }
        ];

        return await callGroq(messages as any);
    } catch (error) {
        console.error("Chat error:", error);
        return getFallbackResponse(newMessage, goal);
    }
}

function getFallbackResponse(message: string, goal: Goal): string {
    const msg = message.toLowerCase();
    if (msg.includes('help') || msg.includes('stuck')) {
        return `Let's break this down. What's the smallest next step you could take toward "${goal.title}" in the next 5 minutes? Sometimes starting tiny builds momentum.`;
    }
    if (msg.includes('motivat') || msg.includes('tired') || msg.includes('hard')) {
        return `I hear you - this is challenging work. Remember why you started "${goal.title}". What originally excited you about this goal? Sometimes reconnecting with that spark helps.`;
    }
    if (msg.includes('done') || msg.includes('finished') || msg.includes('completed')) {
        return `That's fantastic progress! Every completed task is a step forward. What did you learn from this that you can apply tomorrow?`;
    }
    return `I'm here to help with "${goal.title}". What specific challenge are you facing right now? The more detail you share, the better I can help.`;
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
    if (!GROQ_API_KEY) {
        return getDefaultGoalAnalysis(history);
    }
    
    try {
        const historyStr = history.map(h => `Q: ${h.question}\nA: ${h.answer}`).join('\n');
        
        const response = await callGroq([
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
        ], true);

        const parsed = safeParseJSON(response, null);
        return parsed || getDefaultGoalAnalysis(history);
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
// CURRICULUM GENERATOR
// ============================================

export async function getGoalCurriculum(goal: Goal): Promise<Chapter[]> { 
    if (!GROQ_API_KEY) {
        console.log('⚠️ No API key for curriculum');
        return [];
    }
    
    try {
        const response = await callGroq([
            {
                role: 'system',
                content: `You are an expert curriculum designer. Create a structured learning path with practical, actionable lessons. Each lesson should teach something specific and useful.`
            },
            {
                role: 'user',
                content: `Create a 4-phase learning curriculum for: "${goal.title}"

Each phase should have exactly 3 lessons. Make lessons specific and practical.

Return ONLY this JSON:
{"chapters": [
  {
    "id": "ch-1",
    "title": "Phase 1: Foundation",
    "lessons": [
      {"id": "l1", "title": "Specific Lesson Title", "duration": "10 min", "isLocked": false, "description": "What you'll learn and be able to do after this lesson"},
      {"id": "l2", "title": "Specific Lesson Title", "duration": "12 min", "isLocked": false, "description": "What you'll learn and be able to do after this lesson"},
      {"id": "l3", "title": "Specific Lesson Title", "duration": "10 min", "isLocked": false, "description": "What you'll learn and be able to do after this lesson"}
    ],
    "quiz": []
  },
  {
    "id": "ch-2", 
    "title": "Phase 2: Building Skills",
    "lessons": [
      {"id": "l4", "title": "Specific Lesson Title", "duration": "15 min", "isLocked": false, "description": "Description"},
      {"id": "l5", "title": "Specific Lesson Title", "duration": "12 min", "isLocked": false, "description": "Description"},
      {"id": "l6", "title": "Specific Lesson Title", "duration": "10 min", "isLocked": false, "description": "Description"}
    ],
    "quiz": []
  },
  {
    "id": "ch-3",
    "title": "Phase 3: Advanced Techniques",
    "lessons": [
      {"id": "l7", "title": "Specific Lesson Title", "duration": "15 min", "isLocked": false, "description": "Description"},
      {"id": "l8", "title": "Specific Lesson Title", "duration": "12 min", "isLocked": false, "description": "Description"},
      {"id": "l9", "title": "Specific Lesson Title", "duration": "15 min", "isLocked": false, "description": "Description"}
    ],
    "quiz": []
  },
  {
    "id": "ch-4",
    "title": "Phase 4: Mastery & Beyond",
    "lessons": [
      {"id": "l10", "title": "Specific Lesson Title", "duration": "10 min", "isLocked": false, "description": "Description"},
      {"id": "l11", "title": "Specific Lesson Title", "duration": "12 min", "isLocked": false, "description": "Description"},
      {"id": "l12", "title": "Specific Lesson Title", "duration": "10 min", "isLocked": false, "description": "Description"}
    ],
    "quiz": []
  }
]}`
            }
        ], true);

        console.log('🤖 Curriculum response received');

        let chapters: any[] = [];
        
        try {
            const parsed = JSON.parse(response);
            if (Array.isArray(parsed)) {
                chapters = parsed;
            } else if (parsed.chapters && Array.isArray(parsed.chapters)) {
                chapters = parsed.chapters;
            }
        } catch {
            const arrayMatch = response.match(/\[[\s\S]*\]/);
            if (arrayMatch) {
                try {
                    chapters = JSON.parse(arrayMatch[0]);
                } catch {}
            }
        }
        
        if (Array.isArray(chapters) && chapters.length > 0) {
            console.log('✅ Curriculum generated:', chapters.length, 'phases');
            return chapters;
        }
        
        console.warn('⚠️ Invalid curriculum format');
        return [];
    } catch (e) {
        console.error("Curriculum generation failed:", e);
        return [];
    }
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
// PLACEHOLDER FUNCTIONS
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
