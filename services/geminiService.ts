import { 
    Goal, Task, Difficulty, ChatMessage, GoalCategory, 
    FeedItem, Chapter, Course, GoalMode, ConnectedApp, TaskStatus, 
    BudgetSplit, DeepInsight, UserState, ExtraLog, Product, LessonContent
} from "../types";

// API Configuration - now points to YOUR backend
const API_URL = import.meta.env.VITE_API_URL || 'https://injazi-backend.onrender.com';

// ============================================
// CORE API CALL FUNCTION - NOW CALLS YOUR BACKEND
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
// GENERATE DAILY TASKS
// ============================================

export async function generateDailyTasks(
    goal: Goal, 
    day: number, 
    userProfile: string = '', 
    checkIn: string = '', 
    pending: any[] = []
): Promise<Task[]> {
    try {
        const data = await callAI('generate-tasks', {
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
// CHAT RESPONSE
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
        const data = await callAI('chat', {
            goal: { title: goal.title, category: goal.category },
            history: history.map(m => ({ role: m.role, text: m.text })),
            message: newMessage,
            userProfile,
            currentTasks: currentTasks.map(t => ({ title: t.title, status: t.status }))
        });

        return data.response || getFallbackResponse(newMessage, goal);
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
// ONBOARDING - KEPT LOCAL (no AI needed)
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
// GOAL ANALYZER - Uses generic completion endpoint
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
// CONTENT SAFETY - KEPT LOCAL
// ============================================

export async function checkContentSafety(text: string): Promise<{isSafe: boolean, reason?: string}> { 
    if (!text.trim()) return { isSafe: true };
    const badPatterns = /\b(hack|exploit|illegal|spam|scam)\b/i;
    return { isSafe: !badPatterns.test(text) };
}

// ============================================
// DEEP INSIGHTS - KEPT LOCAL
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
// PLACEHOLDER FUNCTIONS - UNCHANGED
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

// ============================================
// LESSON TASK GENERATOR
// ============================================

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
