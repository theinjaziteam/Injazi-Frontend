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

// Safe JSON parser - extracts JSON from text
function safeParseJSON(text: string, fallback: any = null): any {
    if (!text) return fallback;
    
    try {
        // First, try direct parse
        return JSON.parse(text);
    } catch {
        // Try to find JSON array in response
        const arrayMatch = text.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
            try {
                return JSON.parse(arrayMatch[0]);
            } catch {}
        }
        
        // Try to find JSON object in response
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
// GENERATE DAILY TASKS
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
                content: 'You are a task generator. Return ONLY a valid JSON array with no additional text or explanation.'
            },
            {
                role: 'user',
                content: `Generate exactly 3 daily tasks for Day ${day} of achieving: "${goal.title}" (Category: ${goal.category}).

Tasks should be specific, actionable, and achievable in one day.

Return ONLY this JSON format:
[
  {"title": "Task 1 name", "description": "What to do in one sentence", "estimatedTimeMinutes": 15, "difficulty": "EASY"},
  {"title": "Task 2 name", "description": "What to do in one sentence", "estimatedTimeMinutes": 30, "difficulty": "MEDIUM"},
  {"title": "Task 3 name", "description": "What to do in one sentence", "estimatedTimeMinutes": 45, "difficulty": "HARD"}
]`
            }
        ], true);

        const rawTasks = safeParseJSON(response, null);
        
        // Validate we got an array
        if (!Array.isArray(rawTasks) || rawTasks.length === 0) {
            console.warn('⚠️ AI returned invalid format, using mock tasks');
            return getMockTasks(goal, day);
        }

        return rawTasks.map((t: any, i: number) => ({
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
            description: `Plan your priorities for ${goal.title}.`, 
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
            description: `Focus intensely on making progress toward ${goal.title}.`, 
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
            description: 'Review today\'s progress and plan tomorrow\'s actions.', 
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
                content: `You are "The Guide" - a motivating AI coach helping with "${goal.title}".
Be concise (2-3 sentences). Be encouraging but practical. No markdown formatting.

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
                content: 'You are a goal strategist. Return ONLY valid JSON with no additional text.'
            },
            {
                role: 'user',
                content: `Based on this interview, create a goal plan:

${historyStr}

Return ONLY this JSON format:
{
  "title": "Inspiring 3-5 word title",
  "summary": "One sentence mission statement",
  "explanation": "2-3 sentences on why this plan works",
  "difficultyProfile": "Beginner",
  "durationDays": 30,
  "userProfile": "2-3 word user description",
  "dailyQuestions": ["Check-in question 1", "Check-in question 2"]
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
    if (!GROQ_API_KEY) {
        console.log('⚠️ No API key for curriculum');
        return [];
    }
    
    try {
        const response = await callGroq([
            {
                role: 'system',
                content: 'You are a curriculum designer. Return ONLY a valid JSON array with no additional text.'
            },
            {
                role: 'user',
                content: `Create a 4-phase learning curriculum for "${goal.title}".

Each phase should have 3 lessons. Return ONLY this JSON format:
[
  {
    "id": "ch-1",
    "title": "Phase 1: Foundation",
    "lessons": [
      {"id": "l1", "title": "Understanding the Basics", "duration": "10 min", "isLocked": false, "description": "Learn the fundamentals"},
      {"id": "l2", "title": "Setting Up", "duration": "15 min", "isLocked": false, "description": "Prepare your environment"},
      {"id": "l3", "title": "First Steps", "duration": "10 min", "isLocked": false, "description": "Take initial action"}
    ],
    "quiz": []
  },
  {
    "id": "ch-2",
    "title": "Phase 2: Building Skills",
    "lessons": [
      {"id": "l4", "title": "Core Techniques", "duration": "12 min", "isLocked": false, "description": "Master key skills"},
      {"id": "l5", "title": "Practice Methods", "duration": "15 min", "isLocked": false, "description": "Effective practice"},
      {"id": "l6", "title": "Common Mistakes", "duration": "10 min", "isLocked": false, "description": "Avoid pitfalls"}
    ],
    "quiz": []
  },
  {
    "id": "ch-3",
    "title": "Phase 3: Advanced Strategies",
    "lessons": [
      {"id": "l7", "title": "Level Up", "duration": "12 min", "isLocked": false, "description": "Advanced techniques"},
      {"id": "l8", "title": "Optimization", "duration": "10 min", "isLocked": false, "description": "Fine-tune your approach"},
      {"id": "l9", "title": "Overcoming Challenges", "duration": "15 min", "isLocked": false, "description": "Handle obstacles"}
    ],
    "quiz": []
  },
  {
    "id": "ch-4",
    "title": "Phase 4: Mastery",
    "lessons": [
      {"id": "l10", "title": "Long-term Success", "duration": "10 min", "isLocked": false, "description": "Maintain progress"},
      {"id": "l11", "title": "Expert Tips", "duration": "12 min", "isLocked": false, "description": "Pro-level insights"},
      {"id": "l12", "title": "Next Steps", "duration": "10 min", "isLocked": false, "description": "Plan your future"}
    ],
    "quiz": []
  }
]`
            }
        ], true);

        const parsed = safeParseJSON(response, []);
        
        if (Array.isArray(parsed) && parsed.length > 0) {
            console.log('✅ Curriculum generated:', parsed.length, 'phases');
            return parsed;
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
