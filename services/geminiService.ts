/**
 * GENERATE DAILY TASKS
 */
export async function generateDailyTasks(goal: Goal, day: number, userProfile: string, checkIn: string, pending: any[]): Promise<Task[]> {
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
            
            Return ONLY a JSON array:
            [{ 
              "title": "Short title (3-5 words)", 
              "description": "One sentence instruction", 
              "estimatedTimeMinutes": number (15-60), 
              "difficulty": "Easy"|"Medium"|"Hard"
            }]`,
            config: { responseMimeType: "application/json" }
        });

        // FIX: Use response.text not response.text()
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

/**
 * CHAT BOT RESPONSE
 */
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

TODAY'S TASKS:
${taskContext || 'No tasks yet'}

Be concise (2-4 sentences), motivating, and actionable. No markdown formatting.` 
            } 
        }); 
        
        // FIX: Use response.text not response.text()
        return response.text || "I'm here to help you succeed. What would you like to focus on?"; 
    } catch (error: any) { 
        console.error("Chat response error:", error);
        return "I had trouble processing that. Could you try rephrasing your question?"; 
    } 
}

/**
 * ONBOARDING QUESTION GENERATOR
 */
export async function getNextOnboardingQuestion(category: GoalCategory, mode: GoalMode, history: {question: string, answer: string}[]): Promise<{ type: 'question' | 'finish', content?: string }> { 
    if (!apiKey) return { type: 'finish' };
    
    try { 
        const ai = getClient(); 
        const historyStr = history.map(h => `Q: ${h.question}\nA: ${h.answer}`).join('\n'); 
        
        const response = await ai.models.generateContent({ 
            model: FAST_MODEL, 
            contents: `You are an AI Success Architect conducting an interview.
Goal Category: ${category}
Goal Mode: ${mode}
Questions Asked: ${history.length}

Previous Conversation:
${historyStr || 'None yet'}

Ask maximum 5 questions total. If enough info gathered, return finish.

Return JSON only:
{ "type": "question", "content": "Your question" }
or
{ "type": "finish" }`, 
            config: { responseMimeType: "application/json" } 
        }); 
        
        // FIX: Use response.text not response.text()
        return JSON.parse(response.text || '{"type": "finish"}'); 
    } catch (e) { 
        console.error("Onboarding question error:", e);
        return { type: 'finish' }; 
    } 
}

/**
 * GOAL ANALYZER
 */
export async function analyzeGoal(history: {question: string, answer: string}[]): Promise<any> { 
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

Return JSON:
{
  "title": "Inspiring 3-5 word title",
  "summary": "One sentence mission",
  "explanation": "2-3 sentences why this works",
  "difficultyProfile": "Beginner" | "Intermediate" | "Advanced",
  "durationDays": number (14-90),
  "userProfile": "2-3 word description",
  "dailyQuestions": ["Question 1", "Question 2"]
}`, 
            config: { responseMimeType: "application/json" } 
        }); 
        
        // FIX: Use response.text not response.text()
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

/**
 * SAFETY CHECK
 */
export async function checkContentSafety(text: string): Promise<{isSafe: boolean, reason?: string}> { 
    if (!text.trim()) return { isSafe: true };
    if (!apiKey) return { isSafe: true };
    
    try { 
        const ai = getClient(); 
        const response = await ai.models.generateContent({ 
            model: FAST_MODEL, 
            contents: `Check if this message is safe: "${text}"
Return JSON: { "isSafe": true/false }`, 
            config: { responseMimeType: "application/json" } 
        }); 
        
        // FIX: Use response.text not response.text()
        return JSON.parse(response.text || '{"isSafe": true}'); 
    } catch (e) { 
        return { isSafe: true }; 
    } 
}

/**
 * CURRICULUM GENERATOR
 */
export async function getGoalCurriculum(goal: Goal): Promise<Chapter[]> { 
    if (!apiKey) return [];
    
    try { 
        const ai = getClient(); 
        const response = await ai.models.generateContent({ 
            model: SMART_MODEL, 
            contents: `Generate a 4-Phase Learning Curriculum for "${goal.title}" (${goal.category}).
Level: ${goal.difficultyProfile}.

Return JSON array of chapters with lessons and quizzes.`, 
            config: { responseMimeType: "application/json" } 
        }); 
        
        // FIX: Use response.text not response.text()
        return JSON.parse(response.text || '[]'); 
    } catch (e) { 
        console.error("Curriculum generation error:", e);
        return []; 
    } 
}

/**
 * DEEP INSIGHTS
 */
export async function generateDeepInsights(user: UserState): Promise<DeepInsight | null> {
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
            contents: `Analyze progress:
Goal: ${user.goal.title}
Completed Tasks: ${completedTasks}
Streak: ${user.streak}

Return JSON:
{
  "trend": "2-3 words",
  "prediction": "One sentence",
  "focusArea": "2-4 words",
  "title": "2-3 words",
  "description": "One sentence",
  "type": "positive" | "negative" | "neutral"
}`,
            config: { responseMimeType: "application/json" }
        });
        
        // FIX: Use response.text not response.text()
        return JSON.parse(response.text || 'null');
    } catch (e) {
        console.error("Deep insights error:", e);
        return {
            trend: "Analyzing",
            prediction: "More data needed.",
            focusArea: "Consistency",
            title: "Keep Going",
            description: "Your progress is being tracked.",
            type: "neutral"
        };
    }
}
