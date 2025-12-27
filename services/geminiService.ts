import { 
    Goal, Task, Difficulty, ChatMessage, ChatAttachment, GoalCategory, 
    FeedItem, Chapter, Course, GoalMode, ConnectedApp, TaskStatus, 
    BudgetSplit, DeepInsight, UserState, ExtraLog, Product 
} from "../types";

// Groq API Configuration
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-4-scout-17b-16e-instruct';

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
                max_tokens: 1024,
                ...(jsonMode && { response_format: { type: "json_object" } })
            })
        });

        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error.message);
        }

        return data.choices?.[0]?.message?.content || '';
    } catch (error) {
        console.error('Groq API error:', error);
        throw error;
    }
}

// ============================================
// GENERATE DAILY TASKS
// ============================================

export async function generateDailyTasks(
    goal: Goal, 
    day: number, 
    userProfile: string, 
    checkIn: string, 
    pending: any[]
): Promise<Task[]> {
    if (!GROQ_API_KEY) {
        return getMockTasks(goal, day);
    }

    try {
        const response = await callGroq([
            {
                role: 'system',
                content: 'You are a task generator. Return ONLY valid JSON array, no other text.'
            },
            {
                role: 'user',
                content: `Generate 3 specific tasks for Day ${day} of goal "${goal.title}" (${goal.category}).

Return JSON array:
[
  {"title": "Task name", "description": "One sentence", "estimatedTimeMinutes": 15, "difficulty": "Easy"},
  {"title": "Task name", "description": "One sentence", "estimatedTimeMinutes": 30, "difficulty": "Medium"},
  {"title": "Task name", "description": "One sentence", "estimatedTimeMinutes": 45, "difficulty": "Hard"}
]`
            }
        ], true);

        const rawTasks = JSON.parse(response);
        
        return rawTasks.map((t: any, i: number) => ({
            ...t,
            id: `task-${day}-${i}-${Date.now()}`,
            dayNumber: day,
            difficulty: t.difficulty === 'Easy' ? Difficulty.EASY : t.difficulty === 'Hard' ? Difficulty.HARD : Difficulty.MEDIUM,
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
    return [
        { id: `t1-${Date.now()}`, dayNumber: day, title: 'Morning Strategy', description: `Plan your ${goal.category} priorities.`, estimatedTimeMinutes: 15, difficulty: Difficulty.EASY, videoRequirements: 'None', creditsReward: 0, status: TaskStatus.PENDING },
        { id: `t2-${Date.now()}`, dayNumber: day, title: 'Deep Work Session', description: `Focus on ${goal.title} for 45 minutes.`, estimatedTimeMinutes: 45, difficulty: Difficulty.HARD, videoRequirements: 'None', creditsReward: 0, status: TaskStatus.PENDING },
        { id: `t3-${Date.now()}`, dayNumber: day, title: 'Daily Review', description: 'Review progress and plan tomorrow.', estimatedTimeMinutes: 10, difficulty: Difficulty.MEDIUM, videoRequirements: 'None', creditsReward: 0, status: TaskStatus.PENDING }
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
                content: `You are "The Guide" - a motivating AI coach helping with "${goal.title}".
Be concise (2-3 sentences). Be encouraging but practical. No markdown.

User's tasks today:
${taskList || 'No tasks yet'}`
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
        return `Break "${goal.title}" into smaller steps. What's one thing you can do in the next 5 minutes?`;
    }
    if (msg.includes('motivat') || msg.includes('tired')) {
        return `Remember why you started. Every small step toward "${goal.title}" counts. You've got this!`;
    }
    return `Stay focused on "${goal.title}". What specific challenge can I help you with?`;
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
        "What specifically do you want to achieve?",
        "Why is this goal important to you right now?",
        "What's your target timeline?",
        "What's been stopping you before?"
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
                content: 'You are a goal strategist. Return ONLY valid JSON, no other text.'
            },
            {
                role: 'user',
                content: `Based on this interview, create a goal plan:

${historyStr}

Return JSON:
{
  "title": "Inspiring 3-5 word title",
  "summary": "One sentence mission statement",
  "explanation": "2-3 sentences on why this plan works",
  "difficultyProfile": "Beginner" or "Intermediate" or "Advanced",
  "durationDays": number between 14-90,
  "userProfile": "2-3 word user description",
  "dailyQuestions": ["Check-in question 1", "Check-in question 2"]
}`
            }
        ], true);

        return JSON.parse(response);
    } catch (e) {
        console.error("Goal analysis failed:", e);
        return getDefaultGoalAnalysis(history);
    }
}

function getDefaultGoalAnalysis(history: {question: string, answer: string}[]): any {
    const firstAnswer = history[0]?.answer || 'your goal';
    return { 
        title: `Master ${firstAnswer.slice(0, 25)}`, 
        summary: "A focused path to achieving your goal.", 
        explanation: "We've created a structured daily approach based on your answers.", 
        difficultyProfile: "Intermediate", 
        durationDays: 30, 
        userProfile: "Focused achiever", 
        dailyQuestions: ["How did today go?", "What did you learn?"] 
    };
}

// ============================================
// CURRICULUM GENERATOR
// ============================================

export async function getGoalCurriculum(goal: Goal): Promise<Chapter[]> { 
    if (!GROQ_API_KEY) return [];
    
    try {
        const response = await callGroq([
            {
                role: 'system',
                content: 'You are a curriculum designer. Return ONLY valid JSON array.'
            },
            {
                role: 'user',
                content: `Create a 3-phase curriculum for "${goal.title}".

Return JSON array:
[
  {
    "id": "ch1",
    "title": "Phase 1: Foundation",
    "lessons": [
      {"id": "l1", "title": "Lesson title", "duration": "10 min", "isLocked": false, "description": "What you'll learn"}
    ],
    "quiz": []
  }
]`
            }
        ], true);

        return JSON.parse(response);
    } catch (e) {
        console.error("Curriculum failed:", e);
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
    
    return {
        trend: completed > 2 ? "Strong Momentum" : "Building Up",
        prediction: "Stay consistent and you'll see results!",
        focusArea: "Daily habits",
        title: completed > 2 ? "Great Progress!" : "Keep Going",
        description: `${completed} tasks done. Every step counts!`,
        type: completed > 2 ? "positive" : "neutral"
    };
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
    return `${profile} | ${checkin}`;
}

export async function analyzeMetricChange(metric: any): Promise<any> { 
    return { analysis: "Tracking active." }; 
}

export async function calculateBudgetSplit(amount: number, goal: any, profile: any): Promise<BudgetSplit | null> {
    return {
        lowRisk: { amount: amount * 0.5, percent: 50 },
        mediumRisk: { amount: amount * 0.3, percent: 30 },
        highYield: { amount: amount * 0.2, percent: 20 }
    };
}
