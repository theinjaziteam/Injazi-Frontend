import { GoogleGenAI } from "@google/genai";
import { 
    Goal, 
    Task, 
    Difficulty, 
    ChatMessage, 
    ChatAttachment, 
    GoalCategory, 
    FeedItem, 
    Chapter, 
    Course, 
    GoalMode, 
    ConnectedApp, 
    TaskStatus, 
    BudgetSplit, 
    DeepInsight, 
    UserState, 
    ExtraLog, 
    Product 
} from "../types";

// API Key and Client
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
const getClient = () => new GoogleGenAI({ apiKey });

// Model constants - using latest Gemini 2.5
const FAST_MODEL = 'gemini-2.0-flash';
const SMART_MODEL = 'gemini-2.0-flash';

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
    if (!apiKey) {
        console.warn('No Gemini API key found, using mock tasks');
        return [
            { id: `t1-${Date.now()}`, dayNumber: day, title: 'Strategic Morning Prep', description: `Prepare your environment for ${goal.category} success.`, estimatedTimeMinutes: 15, difficulty: Difficulty.EASY, videoRequirements: 'None', creditsReward: 0, status: TaskStatus.PENDING },
            { id: `t2-${Date.now()}`, dayNumber: day, title: 'Deep Work Session', description: `Perform 45 minutes of core practice for ${goal.title}.`, estimatedTimeMinutes: 45, difficulty: Difficulty.HARD, videoRequirements: 'None', creditsReward: 0, status: TaskStatus.PENDING },
            { id: `t3-${Date.now()}`, dayNumber: day, title: 'Audit & Log', description: `Review today's metrics and update your long-term roadmap.`, estimatedTimeMinutes: 10, difficulty: Difficulty.MEDIUM, videoRequirements: 'None', creditsReward: 0, status: TaskStatus.PENDING }
        ];
    }

    try {
        const ai = getClient();
        
        const response = await ai.models.generateContent({
            model: FAST_MODEL,
            contents: `Generate 3 specific, actionable tasks for Day ${day} of the goal "${goal.title}" (${goal.category}).
User Profile: ${userProfile}.
Previous Check-in Context: ${checkIn}.

Tasks should be:
- Achievable in one day
- Progressive (building toward the goal)
- Varied in difficulty
- Specific and actionable

Return ONLY a JSON array with this structure:
[{ 
  "title": "Short title (3-5 words)", 
  "description": "One sentence instruction", 
  "estimatedTimeMinutes": number (15-60), 
  "difficulty": "Easy"|"Medium"|"Hard"
}]`,
            config: { responseMimeType: "application/json" }
        });

        const responseText = response.text || '';
        const rawTasks = JSON.parse(responseText || '[]');
        
        return rawTasks.map((t: any, i: number) => ({
            ...t,
            id: `gen-task-${day}-${i}-${Date.now()}`,
            dayNumber: day,
            difficulty: t.difficulty === 'Easy' ? Difficulty.EASY : t.difficulty === 'Hard' ? Difficulty.HARD : Difficulty.MEDIUM,
            videoRequirements: 'None', 
            creditsReward: 0,
            status: TaskStatus.PENDING
        }));

    } catch (e) {
        console.error("AI Task Generation Failed:", e);
        return [
            { id: `err-${Date.now()}`, dayNumber: day, title: 'Core Practice Session', description: 'Focus on your main goal objective for 30 minutes.', estimatedTimeMinutes: 30, difficulty: Difficulty.MEDIUM, videoRequirements: 'None', creditsReward: 0, status: TaskStatus.PENDING }
        ];
    }
}

// ============================================
// CHAT BOT RESPONSE
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
    if (!apiKey) {
        return "I'm your AI Guide. To enable full AI features, please add your Gemini API key.";
    }
    
    try { 
        const ai = getClient();
        
        const taskContext = currentTasks.map(t => 
            `- ${t.title} (${t.status}, ${t.estimatedTimeMinutes}min)`
        ).join('\n');
        
        const contents: any[] = [];
        
        const recentHistory = history.slice(-10);
        for (const msg of recentHistory) {
            contents.push({ 
                role: msg.role === 'user' ? 'user' : 'model', 
                parts: [{ text: msg.text }] 
            });
        }
        
        const parts: any[] = [{ text: newMessage }];
        if (attachment && attachment.data) {
            parts.push({
                inlineData: {
                    mimeType: attachment.mimeType,
                    data: attachment.data
                }
            });
        }
        contents.push({ role: 'user', parts });
        
        const response = await ai.models.generateContent({ 
            model: FAST_MODEL, 
            contents: contents, 
            config: { 
                systemInstruction: `You are "The Guide" - a dedicated AI Success Coach.

USER'S GOAL: "${goal.title}" (${goal.category})
USER PROFILE: ${userProfile}
GOAL DURATION: ${goal.durationDays} days

TODAY'S TASKS:
${taskContext || 'No tasks yet'}

YOUR PERSONALITY:
- Concise and actionable (2-4 sentences usually)
- Motivating and positive, but not cheesy
- Direct and honest
- Reference their specific goal and progress
- Give practical advice they can use immediately

RULES:
- No markdown formatting (no **, no ##, no bullets)
- Keep responses conversational
- If they share an image/audio, acknowledge and respond to it
- If they're struggling, be empathetic but solution-focused` 
            } 
        }); 
        
        return response.text || "I'm here to help you succeed. What would you like to focus on?"; 
    } catch (error: any) { 
        console.error("Chat response error:", error);
        return "I had trouble processing that. Could you try rephrasing your question?"; 
    } 
}

// ============================================
// ONBOARDING QUESTION GENERATOR
// ============================================

export async function getNextOnboardingQuestion(
    category: GoalCategory, 
    mode: GoalMode, 
    history: {question: string, answer: string}[]
): Promise<{ type: 'question' | 'finish', content?: string }> { 
    if (!apiKey) return { type: 'finish' };
    
    try { 
        const ai = getClient(); 
        const historyStr = history.map(h => `Q: ${h.question}\nA: ${h.answer}`).join('\n'); 
        
        const response = await ai.models.generateContent({ 
            model: FAST_MODEL, 
            contents: `You are an AI Success Architect conducting an interview to understand the user's goal.

Goal Category: ${category}
Goal Mode: ${mode}
Questions Asked So Far: ${history.length}

Previous Conversation:
${historyStr || 'None yet'}

RULES:
- Ask maximum 5 questions total
- Questions should help understand: motivation, timeline, current level, obstacles, resources
- Be conversational and encouraging
- If you have enough info (after 3-5 questions), return finish

Return JSON only:
If more questions needed: { "type": "question", "content": "Your next question" }
If enough info gathered: { "type": "finish" }`, 
            config: { responseMimeType: "application/json" } 
        }); 
        
        return JSON.parse(response.text || '{"type": "finish"}'); 
    } catch (e) { 
        console.error("Onboarding question error:", e);
        return { type: 'finish' }; 
    } 
}

// ============================================
// GOAL ANALYZER
// ============================================

export async function analyzeGoal(
    history: {question: string, answer: string}[]
): Promise<any> { 
    if (!apiKey) {
        return { 
            title: "Your Success Journey", 
            summary: "A personalized path to achieving your goal.", 
            explanation: "Based on our conversation, we've created a tailored plan.", 
            difficultyProfile: "Intermediate", 
            durationDays: 30, 
            userProfile: "Motivated learner", 
            dailyQuestions: ["How did today's session go?", "What's your energy level?"] 
        };
    }
    
    try { 
        const ai = getClient(); 
        const historyStr = history.map(h => `Q: ${h.question}\nA: ${h.answer}`).join('\n'); 
        
        const response = await ai.models.generateContent({ 
            model: SMART_MODEL, 
            contents: `Build a success architecture based on this interview:

${historyStr}

Create an inspiring, personalized plan. Return JSON:
{
  "title": "Inspiring 3-5 word title for their journey",
  "summary": "One powerful sentence describing their mission",
  "explanation": "2-3 sentences explaining why this approach will work for them specifically",
  "difficultyProfile": "Beginner" | "Intermediate" | "Advanced",
  "durationDays": number (14-90 based on goal complexity),
  "userProfile": "2-3 word description of user type",
  "dailyQuestions": ["Question 1 for daily check-in", "Question 2"]
}`, 
            config: { responseMimeType: "application/json" } 
        }); 
        
        return JSON.parse(response.text || '{}'); 
    } catch (e) { 
        console.error("Goal analysis error:", e);
        return { 
            title: "Success Mission", 
            summary: "Mastering your goal step by step.", 
            explanation: "Based on our conversation, we've designed a progressive approach.", 
            difficultyProfile: "Intermediate", 
            durationDays: 30, 
            userProfile: "Focused achiever", 
            dailyQuestions: ["How did today go?", "What did you learn?"] 
        }; 
    } 
}

// ============================================
// CURRICULUM GENERATOR
// ============================================

export async function getGoalCurriculum(goal: Goal): Promise<Chapter[]> { 
    if (!apiKey) return [];
    
    try { 
        const ai = getClient(); 
        const response = await ai.models.generateContent({ 
            model: SMART_MODEL, 
            contents: `Generate a 4-Phase Learning Curriculum for "${goal.title}" (${goal.category}).
Difficulty Level: ${goal.difficultyProfile}.
Duration: ${goal.durationDays} days.

Create progressive phases that build on each other. Return JSON array:
[{
  "id": "chapter-1",
  "title": "Phase 1: Foundation",
  "lessons": [
    { 
      "id": "lesson-1-1", 
      "title": "Lesson title", 
      "duration": "15 min", 
      "isLocked": false, 
      "description": "What they'll learn",
      "keyTakeaways": ["Key point 1", "Key point 2"],
      "content": {
        "lesson_title": "Full title",
        "difficulty_level": "Beginner",
        "estimated_read_time": "10 min",
        "core_concept": "Main idea explained clearly",
        "subsections": [{"title": "Section", "content": "Content"}],
        "the_1_percent_secret": "Pro tip",
        "actionable_task": "What to do after"
      }
    }
  ],
  "quiz": [
    {
      "id": "q1",
      "question": "Quiz question?",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "Why this is correct"
    }
  ]
}]

Generate 4 chapters with 3-4 lessons each.`, 
            config: { responseMimeType: "application/json" } 
        }); 
        
        return JSON.parse(response.text || '[]'); 
    } catch (e) { 
        console.error("Curriculum generation error:", e);
        return []; 
    } 
}

// ============================================
// SAFETY CHECK
// ============================================

export async function checkContentSafety(
    text: string
): Promise<{isSafe: boolean, reason?: string}> { 
    if (!text.trim()) return { isSafe: true };
    if (!apiKey) return { isSafe: true };
    
    try { 
        const ai = getClient(); 
        const response = await ai.models.generateContent({ 
            model: FAST_MODEL, 
            contents: `Check if this message is safe and appropriate for a goal-tracking app. 

Message: "${text}"

Return JSON only: { "isSafe": true/false, "reason": "brief reason if unsafe" }`, 
            config: { responseMimeType: "application/json" } 
        }); 
        
        return JSON.parse(response.text || '{"isSafe": true}'); 
    } catch (e) { 
        return { isSafe: true }; 
    } 
}

// ============================================
// DEEP INSIGHTS
// ============================================

export async function generateDeepInsights(
    user: UserState
): Promise<DeepInsight | null> {
    if (!apiKey || !user.goal) {
        return {
            trend: "Getting Started",
            prediction: "Complete your first tasks to see predictions.",
            focusArea: "Building momentum",
            title: "Welcome",
            description: "Start your journey to unlock personalized insights.",
            type: "neutral"
        };
    }
    
    try {
        const ai = getClient();
        
        const completedTasks = user.dailyTasks.filter(t => 
            t.status === TaskStatus.APPROVED || t.status === TaskStatus.COMPLETED
        ).length;
        
        const response = await ai.models.generateContent({
            model: FAST_MODEL,
            contents: `Analyze this user's progress and generate insights:

Goal: ${user.goal.title}
Category: ${user.goal.category}
Current Day: ${user.currentDay}
Completed Tasks: ${completedTasks}
Total Duration: ${user.goal.durationDays} days
Current Streak: ${user.streak}

Return JSON:
{
  "trend": "Short trend description (2-3 words)",
  "prediction": "One sentence prediction",
  "focusArea": "What they should focus on (2-4 words)",
  "title": "Insight title (2-3 words)",
  "description": "One sentence insight",
  "type": "positive" | "negative" | "neutral"
}`,
            config: { responseMimeType: "application/json" }
        });
        
        return JSON.parse(response.text || 'null');
    } catch (e) {
        console.error("Deep insights error:", e);
        return {
            trend: "Analyzing",
            prediction: "More data needed for accurate predictions.",
            focusArea: "Consistency",
            title: "Keep Going",
            description: "Your progress is being tracked.",
            type: "neutral"
        };
    }
}

// ============================================
// SOCIAL MARKETPLACE
// ============================================

export async function getSocialMarketplace(): Promise<Course[]> { 
    // Returns empty array - can be expanded later for marketplace features
    return []; 
}

// ============================================
// SOCIAL ADS
// ============================================

export async function getSocialAds(category: any): Promise<Product[]> { 
    // Returns empty array - can be expanded later for product recommendations
    return []; 
}

// ============================================
// FEED RECOMMENDATIONS
// ============================================

export async function getFeedRecommendations(goal: any): Promise<FeedItem[]> { 
    // Returns empty array - can be expanded later for social feed
    return []; 
}

// ============================================
// GOAL VISUALIZATION
// ============================================

export async function generateGoalVisualization(
    title: string, 
    category: string
): Promise<string> { 
    // Using placeholder images - could integrate DALL-E or other image APIs
    const seed = encodeURIComponent(title.replace(/\s/g, '-'));
    return `https://picsum.photos/seed/${seed}/800/450`; 
}

// ============================================
// VERIFY TASK VIDEO
// ============================================

export async function verifyTaskVideo(
    task: Task, 
    videoBase64: string, 
    mimeType: string
): Promise<{status: 'APPROVED' | 'REJECTED', reason?: string}> { 
    if (!apiKey) return { status: 'APPROVED' };
    
    try {
        const ai = getClient();
        
        const response = await ai.models.generateContent({
            model: FAST_MODEL,
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: `Verify if this video shows completion of the task: "${task.title}" - ${task.description}

Does the video show genuine effort toward completing this task? Be lenient but ensure it's not completely unrelated.

Return JSON: { "status": "APPROVED" or "REJECTED", "reason": "brief explanation" }` },
                        { inlineData: { mimeType, data: videoBase64 } }
                    ]
                }
            ],
            config: { responseMimeType: "application/json" }
        });
        
        return JSON.parse(response.text || '{"status": "APPROVED"}');
    } catch (e) {
        console.error("Video verification error:", e);
        return { status: 'APPROVED' };
    }
}

// ============================================
// UPDATE USER PROFILE
// ============================================

export async function updateUserProfile(
    profile: string, 
    checkin: string
): Promise<string> { 
    if (!apiKey) return `${profile} | Recent: ${checkin}`;
    
    try {
        const ai = getClient();
        
        const response = await ai.models.generateContent({
            model: FAST_MODEL,
            contents: `Current user profile: "${profile}"
New check-in data: "${checkin}"

Update the profile to incorporate new insights. Keep it concise (under 50 words).
Return just the updated profile text, no JSON.`
        });
        
        return response.text || profile;
    } catch (e) {
        return `${profile} | ${checkin}`;
    }
}

// ============================================
// ANALYZE METRIC CHANGE
// ============================================

export async function analyzeMetricChange(metric: any): Promise<any> { 
    return { 
        analysis: "Metric tracking active.", 
        recommendation: "Continue current approach." 
    }; 
}

// ============================================
// CALCULATE BUDGET SPLIT
// ============================================

export async function calculateBudgetSplit(
    amount: number, 
    goal: any, 
    profile: any
): Promise<BudgetSplit | null> {
    return {
        lowRisk: { amount: amount * 0.5, percent: 50 },
        mediumRisk: { amount: amount * 0.3, percent: 30 },
        highYield: { amount: amount * 0.2, percent: 20 }
    };
}
