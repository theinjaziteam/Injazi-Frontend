import { GoogleGenAI } from "@google/genai";
import { Goal, Task, Difficulty, AgentAlert, ChatMessage, ChatAttachment, GoalCategory, FeedItem, Chapter, Course, GoalMode, ConnectedApp, TaskStatus, Lesson, QuizQuestion, BudgetSplit, DeepInsight, UserState, ExtraLog, Product } from "../types";

// Ensure API Key is loaded
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || 'PLACEHOLDER';
const getClient = () => new GoogleGenAI({ apiKey });

/**
 * GENERATE DAILY TASKS (AI POWERED)
 * Generates 3 unique tasks based on the user's goal, day, and profile.
 */
export async function generateDailyTasks(goal: Goal, day: number, userProfile: string, checkIn: string, pending: any[]): Promise<Task[]> {
    try {
        // If no API key, return specific mock data to prevent crash
        if (apiKey === 'PLACEHOLDER') {
             return [
                { id: `t1-${Date.now()}`, dayNumber: day, title: 'Strategic Morning Prep', description: `Prepare your environment for ${goal.category} success.`, estimatedTimeMinutes: 15, difficulty: Difficulty.EASY, videoRequirements: 'None', creditsReward: 50, status: TaskStatus.PENDING },
                { id: `t2-${Date.now()}`, dayNumber: day, title: 'Deep Work Session', description: `Perform 45 minutes of core practice for ${goal.title}.`, estimatedTimeMinutes: 45, difficulty: Difficulty.HARD, videoRequirements: 'None', creditsReward: 150, status: TaskStatus.PENDING },
                { id: `t3-${Date.now()}`, dayNumber: day, title: 'Audit & Log', description: `Review today's metrics and update your long-term roadmap.`, estimatedTimeMinutes: 10, difficulty: Difficulty.MEDIUM, videoRequirements: 'None', creditsReward: 75, status: TaskStatus.PENDING }
            ];
        }

        const ai = getClient();
        
        // Use Gemini 3 Flash for maximum speed
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-exp', // Updated to latest stable flash if preview fails, or keep gemini-1.5-flash
            contents: `Generate 3 specific, actionable tasks for Day ${day} of the goal "${goal.title}" (${goal.category}).
            User Profile: ${userProfile}.
            Previous Check-in Context: ${checkIn}.
            
            Return a JSON array of objects with this structure:
            [{ 
              "title": "Short energetic title", 
              "description": "One sentence instruction", 
              "estimatedTimeMinutes": number (15-60), 
              "difficulty": "Easy"|"Medium"|"Hard", 
              "creditsReward": number (20-100)
            }]`,
            config: { responseMimeType: "application/json" }
        });

        const rawTasks = JSON.parse(response.text() || '[]');
        
        return rawTasks.map((t: any, i: number) => ({
    ...t,
    id: `gen-task-${day}-${i}-${Date.now()}`,
    dayNumber: day,
    videoRequirements: 'None', 
    creditsReward: 0, // <--- FORCE 0 CREDITS
    status: TaskStatus.PENDING
        }));

    } catch (e) {
        console.error("AI Task Generation Failed:", e);
        // Fallback if AI fails
        return [
            { id: `err-${Date.now()}`, dayNumber: day, title: 'Core Practice Session', description: 'Focus on your main goal objective for 30 minutes.', estimatedTimeMinutes: 30, difficulty: Difficulty.MEDIUM, videoRequirements: 'None', creditsReward: 50, status: TaskStatus.PENDING }
        ];
    }
}

/**
 * ONBOARDING QUESTION GENERATOR
 */
export async function getNextOnboardingQuestion(category: GoalCategory, mode: GoalMode, history: {question: string, answer: string}[]): Promise<{ type: 'question' | 'finish', content?: string }> { 
    try { 
        const ai = getClient(); 
        const historyStr = history.map(h => `Q: ${h.question}\nA: ${h.answer}`).join('\n'); 
        
        const response = await ai.models.generateContent({ 
            model: 'gemini-1.5-flash', 
            contents: `You are an AI Success Architect conducting an interview.
            Goal: ${category} (${mode}).
            History:
            ${historyStr}
            
            If you have enough info to build a plan, return JSON { "type": "finish" }.
            Otherwise, return JSON { "type": "question", "content": "Your next question" }.`, 
            config: { responseMimeType: "application/json" } 
        }); 
        return JSON.parse(response.text() || '{"type": "finish"}'); 
    } catch (e) { return { type: 'finish' }; } 
}

/**
 * GOAL ANALYZER (Creates the Strategy)
 */
export async function analyzeGoal(history: {question: string, answer: string}[]): Promise<any> { 
    try { 
        const ai = getClient(); 
        const historyStr = history.map(h => `Q: ${h.question}\nA: ${h.answer}`).join('\n'); 
        
        const response = await ai.models.generateContent({ 
            model: 'gemini-1.5-pro', 
            contents: `Build a success architecture based on this interview:
            ${historyStr}
            
            Return JSON:
            {
              "title": "Inspiring Title",
              "summary": "Mission statement",
              "explanation": "Why this path works",
              "difficultyProfile": "Beginner/Intermediate/Advanced",
              "durationDays": 30,
              "userProfile": "Tags",
              "dailyQuestions": ["Q1", "Q2"]
            }`, 
            config: { responseMimeType: "application/json" } 
        }); 
        return JSON.parse(response.text() || '{}'); 
    } catch (e) { 
        return { title: "Success Mission", summary: "Mastering your goal.", explanation: "Based on our conversation...", difficultyProfile: "Medium", durationDays: 30, userProfile: "Focused", dailyQuestions: ["How did today go?"] }; 
    } 
}

/**
 * CURRICULUM GENERATOR (For Social/Learning Mode)
 */
export async function getGoalCurriculum(goal: Goal): Promise<Chapter[]> { 
    try { 
        const ai = getClient(); 
        const response = await ai.models.generateContent({ 
            model: 'gemini-1.5-pro', 
            contents: `Generate a 4-Phase Curriculum for "${goal.title}" (${goal.category}).
            Level: ${goal.difficultyProfile}.
            
            Return JSON matching Chapter[] interface:
            [{
              "id": "c1", "title": "Phase 1: Foundation",
              "lessons": [{ "id": "l1", "title": "...", "duration": "15m", "isLocked": false, "description": "...", "content": { "core_concept": "...", "actionable_task": "..." } }],
              "quiz": []
            }]`, 
            config: { responseMimeType: "application/json" } 
        }); 
        return JSON.parse(response.text() || '[]'); 
    } catch (e) { return []; } 
}

/**
 * CHAT BOT RESPONSE
 */
export async function getChatResponse(goal: Goal, history: ChatMessage[], newMessage: string, userProfile: string, currentTasks: Task[], connectedApps: ConnectedApp[], attachment?: ChatAttachment, extraLogs: ExtraLog[] = []): Promise<string> { 
    try { 
        const ai = getClient(); 
        
        const contents: any[] = history.map(msg => ({ 
            role: msg.role === 'user' ? 'user' : 'model', 
            parts: [{ text: msg.text }] 
        })); 
        
        contents.push({ role: 'user', parts: [{ text: newMessage }] }); 
        
        const response = await ai.models.generateContent({ 
            model: 'gemini-1.5-pro', 
            contents: contents, 
            config: { 
                systemInstruction: `You are a dedicated AI Guide for the goal: "${goal.title}".
                User Profile: ${userProfile}.
                Keep answers concise, motivating, and actionable. No markdown formatting.` 
            } 
        }); 
        return response.text() || "I am processing your success architecture."; 
    } catch (error: any) { return "Connection interrupted. Still monitoring your mission."; } 
}

/**
 * SAFETY CHECK
 */
export async function checkContentSafety(text: string): Promise<{isSafe: boolean, reason?: string}> { 
    try { 
        const ai = getClient(); 
        const response = await ai.models.generateContent({ 
            model: 'gemini-1.5-flash', 
            contents: `Check safety: "${text}". Return JSON { "isSafe": boolean }`, 
            config: { responseMimeType: "application/json" } 
        }); 
        return JSON.parse(response.text() || '{"isSafe": true}'); 
    } catch (e) { return { isSafe: true }; } 
}

// --- UTILITIES & PLACEHOLDERS ---

export async function generateGoalVisualization(title: string, cat: string): Promise<string> { 
    return `https://picsum.photos/seed/${title.replace(/\s/g, '')}/800/450`; 
}

export async function verifyTaskVideo(task: Task, videoBase64: string, mimeType: string): Promise<{status: 'APPROVED' | 'REJECTED', reason?: string}> { 
    return { status: 'APPROVED' }; 
}

export async function updateUserProfile(profile: string, checkin: string): Promise<string> { 
    return `${profile} | Recent Log: ${checkin}`; 
}

export async function analyzeMetricChange(metric: any): Promise<any> { 
    return { analysis: "Metric optimization active." }; 
}

export async function getSocialMarketplace(): Promise<Course[]> { 
    return []; 
}

export async function getSocialAds(c: any): Promise<Product[]> { 
    return []; 
}

export async function getFeedRecommendations(g: any): Promise<FeedItem[]> { 
    return []; 
}

// --- MISSING FUNCTIONS RESTORED ---

export async function calculateBudgetSplit(amount: number, goal: any, profile: any): Promise<BudgetSplit | null> {
    // Mocking this for now to prevent crashes, or you can hook up AI here
    return {
        lowRisk: { amount: amount * 0.5, percent: 50 },
        mediumRisk: { amount: amount * 0.3, percent: 30 },
        highYield: { amount: amount * 0.2, percent: 20 }
    };
}

export async function generateDeepInsights(user: UserState): Promise<DeepInsight | null> {
    return {
        trend: "Upward Trajectory",
        prediction: "Goal completion likely in 12 days.",
        focusArea: "Consistency in morning routine.",
        title: "Performance Analysis",
        description: "Your current streak indicates strong momentum.",
        type: "positive"
    };
}