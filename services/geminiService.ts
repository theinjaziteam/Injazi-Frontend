// services/geminiService.ts
import { 
    Goal, Task, Difficulty, ChatMessage, GoalCategory, 
    FeedItem, Chapter, Course, GoalMode, ConnectedApp, TaskStatus, 
    BudgetSplit, DeepInsight, UserState, ExtraLog, Product, LessonContent,
    ChatAttachment
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
// ENHANCED CHAT RESPONSE WITH ATTACHMENT SUPPORT
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
    try {
        // Build rich context
        const completedTasks = currentTasks.filter(t => 
            t.status === TaskStatus.APPROVED || t.status === TaskStatus.COMPLETED
        );
        const pendingTasks = currentTasks.filter(t => 
            t.status !== TaskStatus.APPROVED && t.status !== TaskStatus.COMPLETED
        );
        
        // Separate daily tasks from lesson tasks
        const dailyPending = pendingTasks.filter(t => !t.isLessonTask);
        const lessonPending = pendingTasks.filter(t => t.isLessonTask);
        
        let taskContext = '';
        if (dailyPending.length > 0) {
            taskContext += `\nDAILY TASKS PENDING:\n${dailyPending.map((t, i) => `${i + 1}. "${t.title}" (${t.difficulty}, ~${t.estimatedTimeMinutes}min)`).join('\n')}`;
        }
        if (lessonPending.length > 0) {
            taskContext += `\n\nLESSON TASKS PENDING:\n${lessonPending.map((t, i) => `${i + 1}. "${t.title}" (~${t.estimatedTimeMinutes}min)`).join('\n')}`;
        }
        if (pendingTasks.length === 0) {
            taskContext = '\nAll tasks for today are completed! The user is doing great.';
        }

        // Calculate progress metrics
        const totalDays = goal.durationDays || 30;
        const currentDay = Math.min(history.length > 0 ? Math.ceil(Date.now() / (1000 * 60 * 60 * 24)) : 1, totalDays);
        const progressPercent = Math.round((currentDay / totalDays) * 100);
        
        const progressContext = `
USER PROGRESS SUMMARY:
- Goal: "${goal.title}" (Category: ${goal.category})
- Progress: Day ${currentDay} of ${totalDays} (${progressPercent}% through journey)
- Tasks completed today: ${completedTasks.length}/${currentTasks.length}
- Daily tasks remaining: ${dailyPending.length}
- Lesson tasks remaining: ${lessonPending.length}
- User profile notes: ${userProfile || 'New user, still learning about their style and preferences'}`;

        const recentLogs = extraLogs.slice(-5).map(log => `[${new Date(log.timestamp).toLocaleDateString()}] ${log.text}`).join('\n');
        const logsContext = recentLogs ? `\n\nUSER'S RECENT JOURNAL ENTRIES:\n${recentLogs}` : '';

        // Build conversation history (last 12 messages for better context)
        const recentHistory = history.slice(-12).map(m => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.text
        }));

        // Handle attachment context with detailed instructions
        let attachmentContext = '';
        let attachmentInstructions = '';
        
        if (attachment) {
            if (attachment.type === 'image') {
                attachmentContext = `\n\n📷 USER HAS ATTACHED AN IMAGE`;
                attachmentInstructions = `
ANALYZING THE IMAGE:
The user has shared an image with you. You should:
1. Describe what you observe in the image in detail
2. Identify how it relates to their goal "${goal.title}"
3. Provide specific, actionable feedback based on what you see
4. Ask a follow-up question to understand their intent better

Consider: Is this showing progress? A problem they're facing? Something they want feedback on? Evidence of work completed?`;
            } else if (attachment.type === 'pdf') {
                attachmentContext = `\n\n📄 USER HAS ATTACHED A PDF DOCUMENT`;
                attachmentInstructions = `
ANALYZING THE PDF:
The user has shared a document with you. You should:
1. Summarize the key points or contents of the document
2. Identify the most relevant information for their goal "${goal.title}"
3. Provide actionable insights or suggestions based on the content
4. Highlight anything that stands out as particularly important or concerning

Consider: Is this a plan? Research? A report? Something they created? Something they're studying?`;
            } else if (attachment.type === 'audio') {
                attachmentContext = `\n\n🎤 USER HAS ATTACHED AN AUDIO FILE`;
                attachmentInstructions = `
ANALYZING THE AUDIO:
The user has shared an audio recording with you. You should:
1. Transcribe or summarize what was said
2. Identify the key points or questions raised
3. Respond to the content thoughtfully
4. Ask clarifying questions if needed

Consider: Is this a voice note about their progress? A recording of something? A verbal question they preferred to speak?`;
            }
        }

        // Determine the user's current "zone" based on progress
        let zoneContext = '';
        if (progressPercent < 20) {
            zoneContext = 'The user is at the LAUNCH PAD - just starting their journey. Focus on building confidence, establishing habits, and celebrating small wins.';
        } else if (progressPercent < 40) {
            zoneContext = 'The user is in FOUNDATION VALLEY - building their base. Help them solidify habits, address early obstacles, and maintain momentum.';
        } else if (progressPercent < 60) {
            zoneContext = 'The user is in the GROWTH FOREST - expanding their skills. Challenge them to level up, introduce advanced concepts, and push beyond comfort zones.';
        } else if (progressPercent < 80) {
            zoneContext = 'The user is at CHALLENGE PEAKS - facing the hard part. Help them overcome obstacles, stay resilient, and maintain motivation through difficulty.';
        } else {
            zoneContext = 'The user is approaching MASTERY SUMMIT - near their goal! Help them finish strong, reflect on growth, and think about what comes next.';
        }

        // Enhanced system prompt
        const systemPrompt = `You are "The Guide" - an elite personal success coach and strategic advisor in the Injazi goal achievement app. You're guiding users through a transformative journey toward their goals.

═══════════════════════════════════════════
YOUR IDENTITY & PERSONALITY
═══════════════════════════════════════════

You are NOT a generic AI assistant. You are:
• A wise mentor who has helped thousands achieve their goals
• A strategic thinker who sees patterns and opportunities others miss
• A supportive friend who genuinely cares about the user's success
• A direct communicator who respects people's time and intelligence

Your tone is:
• Confident but not arrogant
• Warm but not soft - you push people when needed
• Specific and actionable - never vague or generic
• Conversational - like texting with a brilliant friend who happens to be a coach

═══════════════════════════════════════════
CURRENT USER CONTEXT
═══════════════════════════════════════════
${progressContext}
${taskContext}
${logsContext}

JOURNEY STAGE:
${zoneContext}
${attachmentContext}
${attachmentInstructions}

═══════════════════════════════════════════
HOW TO RESPOND
═══════════════════════════════════════════

FORMAT RULES:
• Keep responses under 150 words unless user asks for detailed analysis
• Use short paragraphs (2-3 sentences max)
• Use **bold** for key points or action items
• Use bullet points only for lists of 3+ items
• End with a question OR a clear next action (not both)

RESPONSE APPROACH:
1. ACKNOWLEDGE what they said/shared (briefly)
2. PROVIDE VALUE (insight, advice, perspective, or answer)
3. MOVE FORWARD (question or action step)

WHAT TO DO:
✓ Give specific, actionable advice with concrete examples
✓ Reference their actual tasks, progress, and context
✓ Challenge them when they're capable of more
✓ Celebrate genuine wins with enthusiasm
✓ Be honest when something isn't working
✓ Ask clarifying questions when you need more info
✓ Adapt your energy to match theirs

WHAT NOT TO DO:
✗ Never say "I'm just an AI" or "As an AI" - you ARE their guide
✗ Never give generic advice that could apply to anyone
✗ Never be preachy, lecture-y, or condescending
✗ Never use corporate buzzwords or empty motivational phrases
✗ Never ask multiple questions in one response
✗ Never ignore attachments they've shared
✗ Never be so positive that you're not helpful

═══════════════════════════════════════════
HANDLING COMMON SCENARIOS
═══════════════════════════════════════════

IF THEY'RE STUCK:
→ Identify the smallest possible next action
→ Remove overwhelm by focusing on just ONE thing
→ Ask what's specifically blocking them

IF THEY NEED MOTIVATION:
→ Don't rely on feelings - focus on systems and identity
→ Remind them of their progress and why they started
→ Make the next step so small it's impossible to fail

IF THEY'RE SUCCEEDING:
→ Celebrate genuinely, then raise the bar
→ Ask what they learned that they can repeat
→ Challenge them to go 10% further

IF THEY SHARE PROGRESS/WORK:
→ Give specific, constructive feedback
→ Point out what's working AND what could improve
→ Suggest concrete next iterations

IF THEY'RE CONFUSED ABOUT WHAT TO DO:
→ Look at their pending tasks and recommend one
→ Prioritize based on impact and energy level
→ Give them a clear decision, not more options

IF THEY WANT TO CHAT/VENT:
→ Listen and acknowledge their feelings
→ Gently redirect toward action when appropriate
→ Remember: progress is the best therapy

Remember: You're not here to be liked. You're here to help them succeed. Sometimes that means being the person who tells them what they need to hear, not what they want to hear.`;

        // Prepare the request body
        const requestBody: any = {
            systemPrompt,
            goal: { 
                title: goal.title, 
                category: goal.category,
                durationDays: goal.durationDays,
                mode: goal.mode
            },
            history: recentHistory,
            message: newMessage,
            userProfile,
            currentTasks: currentTasks.map(t => ({ 
                title: t.title, 
                status: t.status,
                difficulty: t.difficulty,
                estimatedTimeMinutes: t.estimatedTimeMinutes,
                isLessonTask: t.isLessonTask || false
            })),
            progressPercent,
            completedCount: completedTasks.length,
            pendingCount: pendingTasks.length
        };

        // Add attachment if present (for multimodal AI processing)
        if (attachment) {
            requestBody.attachment = {
                type: attachment.type,
                mimeType: attachment.mimeType,
                data: attachment.data
            };
        }

        const data = await callAI('chat', requestBody);

        return data.response || getSmartFallbackResponse(newMessage, goal, pendingTasks, completedTasks, attachment);
    } catch (error) {
        console.error("Chat error:", error);
        return getSmartFallbackResponse(
            newMessage, 
            goal, 
            currentTasks.filter(t => t.status !== TaskStatus.APPROVED && t.status !== TaskStatus.COMPLETED),
            currentTasks.filter(t => t.status === TaskStatus.APPROVED || t.status === TaskStatus.COMPLETED),
            attachment
        );
    }
}

// ============================================
// SMART FALLBACK RESPONSES
// ============================================

function getSmartFallbackResponse(
    message: string, 
    goal: Goal, 
    pendingTasks: Task[], 
    completedTasks: Task[],
    attachment?: ChatAttachment
): string {
    const msg = message.toLowerCase();
    const goalTitle = goal.title;
    
    // Handle attachment-related responses first
    if (attachment) {
        if (attachment.type === 'image') {
            return `I can see you've shared an image! I'm having a brief connection issue, but I'd love to understand what you're showing me.\n\n**Tell me about this image:**\n\nIs it showing your progress on "${goalTitle}", a challenge you're facing, or something you want my feedback on?`;
        }
        if (attachment.type === 'pdf') {
            return `Thanks for sharing that document! I'm having trouble accessing it right now.\n\n**Help me understand:**\n\n• What's the document about?\n• What part would you like my thoughts on?\n\nI'll give you my best guidance based on what you share.`;
        }
        if (attachment.type === 'audio') {
            return `I received your audio! While I can't process it right now, I'm curious what's in it.\n\n**Is this:**\n\n• A voice note about your progress?\n• Something you recorded for feedback?\n• A question you prefer to ask verbally?\n\nLet me know and I'll help!`;
        }
    }
    
    // Get easiest and hardest pending tasks for recommendations
    const dailyTasks = pendingTasks.filter(t => !t.isLessonTask);
    const easiestTask = dailyTasks.find(t => t.difficulty === Difficulty.EASY) || dailyTasks[0];
    const hardestTask = dailyTasks.find(t => t.difficulty === Difficulty.HARD) || dailyTasks[dailyTasks.length - 1];
    
    // Stuck/Help/Confused patterns
    if (msg.includes('stuck') || msg.includes('help') || msg.includes("don't know") || msg.includes('confused') || msg.includes('lost')) {
        if (easiestTask) {
            return `When you're stuck, go small.\n\n**Your move:** Start "${easiestTask.title}" - just ${easiestTask.estimatedTimeMinutes} minutes.\n\nDon't aim to finish perfectly. Just open it and do the first tiny step. What would that first action be?`;
        }
        return `Being stuck means something needs to change.\n\n**Quick diagnosis:**\n\nDo you not know WHAT to do, or do you know but can't get yourself to do it?\n\nThose need different solutions. Which is it?`;
    }
    
    // Motivation/Energy patterns
    if (msg.includes('motivat') || msg.includes('tired') || msg.includes('exhausted') || msg.includes("can't") || msg.includes('no energy') || msg.includes('burnt out')) {
        return `Motivation is unreliable. Let's not wait for it.\n\n**The real question:**\n\nWhat's the absolute minimum you could do for "${goalTitle}" in the next 10 minutes?\n\nNot ideal. Not perfect. Just... something. What would that look like?`;
    }
    
    // Completed/Done patterns
    if (msg.includes('done') || msg.includes('finished') || msg.includes('completed') || msg.includes('did it') || msg.includes('made progress')) {
        const completionCount = completedTasks.length;
        if (completionCount > 0) {
            return `**${completionCount} task${completionCount > 1 ? 's' : ''} done.** That's real momentum.\n\nQuick reflection: What was the hardest part, and what helped you push through?\n\nUnderstanding your own patterns is how you become unstoppable.`;
        }
        return `Progress logged. Every action is evidence you CAN do this.\n\n**Capture the win:**\n\nWhat did you learn from doing it? What's the natural next step from here?`;
    }
    
    // Focus/Priority patterns
    if (msg.includes('focus') || msg.includes('priorit') || msg.includes('important') || msg.includes('should i') || msg.includes('what next') || msg.includes('where to start')) {
        if (hardestTask && easiestTask) {
            return `**For "${goalTitle}" right now:**\n\nHigh energy? Hit "${hardestTask.title}" - it'll move the needle most.\n\nLow energy? Start with "${easiestTask.title}" to build momentum.\n\nWhich matches where you're at?`;
        }
        if (dailyTasks.length > 0) {
            return `**My recommendation:**\n\nStart with "${dailyTasks[0].title}". It's ready and waiting.\n\nThe best task is usually the one you'll actually do. Does this one feel right, or is something else calling to you?`;
        }
        return `You've completed your daily tasks! That's worth celebrating.\n\n**What now:**\n\nYou could check for lesson tasks, get ahead on tomorrow, or just rest and let it sink in.\n\nWhat feels right?`;
    }
    
    // Progress/Review patterns
    if (msg.includes('progress') || msg.includes('review') || msg.includes('how am i') || msg.includes('doing') || msg.includes('update')) {
        const total = completedTasks.length + pendingTasks.length;
        const completionRate = total > 0 ? completedTasks.length / total : 0;
        
        if (completionRate >= 0.8) {
            return `**You're crushing it.** ${Math.round(completionRate * 100)}% completion rate.\n\nThis isn't luck - you're building the kind of consistency that compounds. Most people never get here.\n\n**Level up question:** How do you maintain this AND push a little harder?`;
        } else if (completionRate >= 0.5) {
            return `**Solid progress.** ${Math.round(completionRate * 100)}% complete.\n\nYou're showing up consistently. But I think you've got another gear.\n\n**Challenge:** Can you finish just one more task today? That's where growth happens.`;
        } else if (completionRate > 0) {
            return `**Honest assessment:** ${Math.round(completionRate * 100)}% completion is below where we want to be.\n\nNo judgment - let's fix it.\n\n**What's going on?** Are the tasks too big? Is the goal not exciting? Is life just chaotic right now?`;
        } else {
            return `**Starting point:** No tasks completed yet today.\n\nThat's okay - every streak starts somewhere. The only question that matters:\n\nWhat ONE task could you start in the next 5 minutes?`;
        }
    }
    
    // Accelerate/Faster patterns
    if (msg.includes('faster') || msg.includes('accelerate') || msg.includes('speed up') || msg.includes('quicker') || msg.includes('more progress')) {
        return `**You want to accelerate "${goalTitle}"?** Love that energy.\n\nThree ways to move faster:\n\n• **Increase frequency** - do something twice a day instead of once\n• **Remove friction** - what's slowing you down that you could eliminate?\n• **Raise stakes** - tell someone your deadline\n\nWhich one could you act on today?`;
    }
    
    // Celebrate/Happy patterns
    if (msg.includes('excited') || msg.includes('happy') || msg.includes('great') || msg.includes('amazing') || msg.includes('celebrate')) {
        return `**YES!** I can feel that energy. This is what progress feels like.\n\nSoak it in - you've earned it. These moments are fuel for the harder days.\n\n**While you're riding high:** What's one slightly scary next step you could commit to?`;
    }
    
    // Doubt/Fear patterns
    if (msg.includes('doubt') || msg.includes('scared') || msg.includes('afraid') || msg.includes('worry') || msg.includes('anxious') || msg.includes("can't do")) {
        return `Those doubts? They're normal. They mean you're attempting something that matters.\n\n**Here's what I know:**\n\nYou've already started. You're already further than most people who never try.\n\nWhat specific fear is loudest right now? Let's look at it directly.`;
    }
    
    // Planning/Strategy patterns
    if (msg.includes('plan') || msg.includes('strategy') || msg.includes('approach') || msg.includes('how should i')) {
        return `Let's get strategic about "${goalTitle}".\n\n**To give you a real plan, I need to know:**\n\nWhat's the ONE outcome you most want to achieve this week? Be specific - not "make progress" but something you could actually measure.`;
    }
    
    // Default - curious and engaging
    const pendingCount = pendingTasks.length;
    return `Got it. I want to give you something actually useful here.\n\n**Quick context:** You're working on "${goalTitle}" with ${pendingCount} task${pendingCount !== 1 ? 's' : ''} pending.\n\nWhat's the specific situation? The more detail you share, the better I can help.`;
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
        const systemPrompt = `You are a task generation expert for the Injazi goal achievement app. Create specific, actionable daily tasks that build momentum.

TASK REQUIREMENTS:
1. SPECIFIC - Not "work on project" but "write 500 words of chapter 2" or "complete 3 practice problems"
2. ACHIEVABLE - Must be completable in the given timeframe
3. PROGRESSIVE - Should build on previous days and create momentum
4. VARIED - Mix of difficulties (typically 1 easy, 1-2 medium, 1 hard)
5. CONTEXTUAL - Consider user's check-in and current state

DIFFICULTY GUIDELINES:
• EASY (10-15 min): Quick wins, low friction, builds confidence
• MEDIUM (20-30 min): Core work, moderate effort, meaningful progress  
• HARD (45-60 min): Deep work, significant effort, major progress

IMPORTANT: Tasks should feel achievable but stretching. The user should feel accomplished after completing them, not overwhelmed during.`;

        const data = await callAI('generate-tasks', {
            systemPrompt,
            goal: { 
                title: goal.title, 
                category: goal.category,
                mode: goal.mode 
            },
            day,
            userProfile,
            checkIn,
            pendingTasks: pending.map(t => t.title)
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
            status: TaskStatus.PENDING,
            isLessonTask: false
        }));

    } catch (e) {
        console.error("Task generation failed:", e);
        return getMockTasks(goal, day);
    }
}

function getMockTasks(goal: Goal, day: number): Task[] {
    const ts = Date.now();
    const goalTitle = goal.title;
    
    return [
        { 
            id: `t1-${ts}`, 
            dayNumber: day, 
            title: 'Morning Strategy Session', 
            description: `Open your notes app or journal. Write down your top 3 priorities for "${goalTitle}" today. For each priority, identify one specific action. Set a 10-minute timer and brainstorm freely without editing yourself. This clarity will make everything else easier.`, 
            estimatedTimeMinutes: 15, 
            difficulty: Difficulty.EASY, 
            videoRequirements: 'None', 
            creditsReward: 0, 
            status: TaskStatus.PENDING,
            isLessonTask: false
        },
        { 
            id: `t2-${ts}`, 
            dayNumber: day, 
            title: 'Deep Work Block', 
            description: `Block 45 minutes of uninterrupted time. Turn off all notifications and close unnecessary tabs. Use the Pomodoro technique: 25 min focused work, 5 min break, repeat. Focus entirely on your most important task for "${goalTitle}". Track what you accomplish.`, 
            estimatedTimeMinutes: 45, 
            difficulty: Difficulty.HARD, 
            videoRequirements: 'None', 
            creditsReward: 0, 
            status: TaskStatus.PENDING,
            isLessonTask: false
        },
        { 
            id: `t3-${ts}`, 
            dayNumber: day, 
            title: 'Daily Review & Planning', 
            description: 'Spend 10 minutes reflecting: (1) Write 3 things you accomplished today. (2) Note 1 challenge you faced and how you handled it. (3) Identify your #1 priority for tomorrow. (4) Rate your energy level 1-10 to track patterns over time.', 
            estimatedTimeMinutes: 10, 
            difficulty: Difficulty.MEDIUM, 
            videoRequirements: 'None', 
            creditsReward: 0, 
            status: TaskStatus.PENDING,
            isLessonTask: false
        }
    ];
}

// ============================================
// CURRICULUM GENERATOR
// ============================================

export async function getGoalCurriculum(goal: Goal): Promise<Chapter[]> { 
    try {
        const systemPrompt = `You are a curriculum designer creating a structured learning path for goal achievement. Create chapters (phases) with lessons that progressively build skills and knowledge.

Each chapter should:
1. Have a clear theme and learning objective
2. Contain 3-4 lessons that build on each other
3. Progress from foundational to advanced concepts
4. Include practical, actionable content

Lesson structure:
- Clear, engaging titles
- Realistic time estimates (8-15 minutes)
- Descriptions that explain the value`;

        const data = await callAI('curriculum', {
            systemPrompt,
            goal: { 
                title: goal.title, 
                category: goal.category,
                mode: goal.mode,
                durationDays: goal.durationDays
            }
        });

        if (data.chapters && Array.isArray(data.chapters) && data.chapters.length > 0) {
            console.log('✅ Curriculum generated:', data.chapters.length, 'phases');
            return data.chapters;
        }
        
        console.warn('⚠️ No curriculum returned, using default');
        return getDefaultCurriculum(goal);
    } catch (e) {
        console.error("Curriculum generation failed:", e);
        return getDefaultCurriculum(goal);
    }
}

function getDefaultCurriculum(goal: Goal): Chapter[] {
    return [
        {
            id: 'ch-1',
            title: 'Phase 1: Foundation',
            lessons: [
                { id: 'l1', title: 'Understanding Your Goal', duration: '10 min', isLocked: false, description: `Learn the fundamentals of ${goal.title} and set yourself up for success` },
                { id: 'l2', title: 'Setting Up For Success', duration: '12 min', isLocked: false, description: 'Create your environment and systems for consistent progress' },
                { id: 'l3', title: 'Your First Steps', duration: '10 min', isLocked: false, description: 'Take your first actionable steps with confidence' }
            ],
            quiz: []
        },
        {
            id: 'ch-2',
            title: 'Phase 2: Building Momentum',
            lessons: [
                { id: 'l4', title: 'Daily Routines That Work', duration: '12 min', isLocked: false, description: 'Establish consistent daily practices that stick' },
                { id: 'l5', title: 'Tracking Your Progress', duration: '10 min', isLocked: false, description: 'Monitor and measure your growth effectively' },
                { id: 'l6', title: 'Staying Motivated', duration: '10 min', isLocked: false, description: 'Build intrinsic motivation that lasts' }
            ],
            quiz: []
        },
        {
            id: 'ch-3',
            title: 'Phase 3: Advanced Strategies',
            lessons: [
                { id: 'l7', title: 'Overcoming Obstacles', duration: '15 min', isLocked: false, description: 'Handle challenges and setbacks effectively' },
                { id: 'l8', title: 'Accelerating Your Growth', duration: '12 min', isLocked: false, description: 'Level up your approach and results' },
                { id: 'l9', title: 'Optimizing Your Results', duration: '10 min', isLocked: false, description: 'Fine-tune your methods for maximum impact' }
            ],
            quiz: []
        },
        {
            id: 'ch-4',
            title: 'Phase 4: Mastery',
            lessons: [
                { id: 'l10', title: 'Long-term Success', duration: '10 min', isLocked: false, description: 'Maintain your achievements and build lasting habits' },
                { id: 'l11', title: 'Teaching Others', duration: '10 min', isLocked: false, description: 'Solidify your knowledge by sharing it' },
                { id: 'l12', title: 'Your Next Journey', duration: '10 min', isLocked: false, description: 'Plan your continued growth and new goals' }
            ],
            quiz: []
        }
    ];
}

// ============================================
// ONBOARDING QUESTIONS
// ============================================

export async function getNextOnboardingQuestion(
    category: GoalCategory, 
    mode: GoalMode, 
    history: {question: string, answer: string}[]
): Promise<{ type: 'question' | 'finish', content?: string }> { 
    const questions = [
        "What specifically do you want to achieve? Be as detailed as possible - the clearer you are, the better I can help.",
        "Why is this goal important to you right now? What will change in your life when you achieve it?",
        "What's your target timeline? When do you want to see real results?",
        "What's been stopping you from achieving this before? What obstacles do you anticipate this time?"
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
        const historyStr = history.map(h => `Q: ${h.question}\nA: ${h.answer}`).join('\n\n');
        
        const systemPrompt = `You are a goal strategist analyzing user responses to create a personalized achievement plan. Based on their answers, create a compelling and realistic goal plan.

Be specific and personal - reference their actual words and situation. The plan should feel custom-made for them, not generic.`;

        const data = await callAI('completion', {
            messages: [
                {
                    role: 'system',
                    content: systemPrompt
                },
                {
                    role: 'user',
                    content: `Based on this interview, create a personalized goal plan:

${historyStr}

Return ONLY valid JSON with this exact structure:
{
  "title": "Inspiring 3-5 word goal title that feels personal to them",
  "summary": "One powerful sentence describing what they'll achieve",
  "explanation": "2-3 sentences explaining why this specific plan will work for their situation",
  "difficultyProfile": "Beginner" or "Intermediate" or "Advanced",
  "durationDays": number between 14-90 based on their timeline,
  "userProfile": "Brief 3-5 word description of this person's style/situation",
  "dailyQuestions": ["Personalized check-in question 1", "Personalized check-in question 2"]
}`
                }
            ],
            jsonMode: true
        });

        if (data.content) {
            try {
                const parsed = JSON.parse(data.content);
                if (parsed.title && parsed.summary) {
                    return parsed;
                }
            } catch {
                console.warn('Failed to parse goal analysis, using default');
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
    const whyAnswer = history[1]?.answer || '';
    
    // Try to extract a meaningful title from their first answer
    const words = firstAnswer.split(' ').slice(0, 5).join(' ');
    const title = words.length > 3 ? `Master: ${words}` : 'Your Personal Journey';
    
    return { 
        title, 
        summary: "A focused path to achieving your goal with daily action steps and accountability.", 
        explanation: `Based on what you've shared, we've created a structured approach that breaks down your goal into daily actions. ${whyAnswer ? "Your motivation is clear, and we'll build on that." : ""} Each day builds on the last, creating unstoppable momentum.`, 
        difficultyProfile: "Intermediate", 
        durationDays: 30, 
        userProfile: "Determined achiever", 
        dailyQuestions: [
            "What progress did you make today toward your goal?", 
            "What's your energy and focus level right now?"
        ] 
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
        const systemPrompt = `You are an expert educator creating engaging, actionable lesson content. Your lessons should be:

1. PRACTICAL - Include specific examples, tools, and techniques
2. ENGAGING - Use conversational tone and relatable scenarios
3. ACTIONABLE - Every section should lead to something the learner can DO
4. FOCUSED - Stay on topic and respect the time estimate

Write as if you're a knowledgeable friend explaining something important.`;

        const data = await callAI('completion', {
            messages: [
                {
                    role: 'system',
                    content: systemPrompt
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
  "core_concept": "One powerful sentence summarizing THE key insight of this lesson",
  "subsections": [
    {"title": "Section 1 Title", "content": "2-3 detailed paragraphs with specific examples and actionable advice..."},
    {"title": "Section 2 Title", "content": "2-3 detailed paragraphs..."},
    {"title": "Section 3 Title", "content": "2-3 detailed paragraphs..."}
  ],
  "the_1_percent_secret": "A powerful insider tip that most people don't know - make it genuinely valuable",
  "actionable_task": "Step 1: Specific action...\\n\\nStep 2: Specific action...\\n\\nStep 3: Specific action..."
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
            } catch {
                console.warn('Failed to parse lesson content');
            }
        }
        return getDefaultLessonContent(lesson, goal);
    } catch (e) {
        console.error("Lesson content generation failed:", e);
        return getDefaultLessonContent(lesson, goal);
    }
}

function getDefaultLessonContent(
    lesson: { id: string; title: string; description: string; duration: string }, 
    goal: Goal
): LessonContent {
    return {
        lesson_title: lesson.title,
        difficulty_level: "Intermediate",
        estimated_read_time: lesson.duration,
        core_concept: `Master the fundamentals of ${lesson.title.toLowerCase()} to accelerate your progress toward ${goal.title}.`,
        subsections: [
            {
                title: "Understanding the Basics",
                content: `${lesson.description}\n\nThis foundational knowledge is essential for your journey toward ${goal.title}. Take time to understand these concepts deeply - they'll serve as building blocks for everything that follows.\n\nThe key is not just knowing this information, but internalizing it so it becomes second nature.`
            },
            {
                title: "Putting It Into Practice",
                content: `Theory without practice is just entertainment. Now it's time to apply what you've learned.\n\nStart small and build momentum. Even 10 minutes of focused practice beats hours of passive consumption. The goal isn't perfection - it's progress.\n\nRemember: every expert was once a beginner who refused to give up.`
            },
            {
                title: "Building Momentum",
                content: `As you continue practicing, you'll start seeing patterns and developing intuition. This is when real mastery begins to emerge.\n\nLook for opportunities to apply what you've learned in different contexts. The more connections you make, the deeper your understanding becomes.\n\nConsistency beats intensity. Show up every day, even if it's just for a few minutes.`
            }
        ],
        the_1_percent_secret: `The most successful people in ${goal.category} don't just learn - they teach. Try explaining what you've learned to someone else, even if it's just writing it in your own words. This forces deeper understanding.`,
        actionable_task: `Step 1: Open your notes app or grab a piece of paper.\n\nStep 2: Write down the 3 most important insights from this lesson in your own words.\n\nStep 3: For each insight, write one specific action you can take this week to apply it.\n\nStep 4: Choose the easiest action and do it within the next 24 hours.`
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
        const systemPrompt = `You are a task coach creating practical application tasks based on lesson content. Each task should:

1. Directly apply concepts from the lesson
2. Be specific and achievable in the given time
3. Build real skills, not just check boxes
4. Feel meaningful, not like busywork`;

        const data = await callAI('completion', {
            messages: [
                {
                    role: 'system',
                    content: systemPrompt
                },
                {
                    role: 'user',
                    content: `Create 2 practical tasks based on this lesson:

LESSON: "${lesson.title}"
CORE CONCEPT: "${lessonContent.core_concept}"
ACTION FROM LESSON: "${lessonContent.actionable_task}"
GOAL CONTEXT: "${goal.title}" (${goal.category})

Create exactly 2 tasks:
- Task 1: Quick application (10-15 min, EASY) - immediate practice
- Task 2: Deeper practice (20-30 min, MEDIUM) - meaningful application

Return ONLY valid JSON:
{"tasks": [
  {"title": "Specific task title", "description": "Detailed steps explaining exactly what to do...", "estimatedTimeMinutes": 12, "difficulty": "EASY"},
  {"title": "Specific task title", "description": "Detailed steps explaining exactly what to do...", "estimatedTimeMinutes": 25, "difficulty": "MEDIUM"}
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
                        description: t.description || 'Complete this task to apply what you learned',
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
            } catch {
                console.warn('Failed to parse lesson tasks');
            }
        }
        return getDefaultLessonTasks(lesson, goal);
    } catch (e) {
        console.error("Lesson task generation failed:", e);
        return getDefaultLessonTasks(lesson, goal);
    }
}

function getDefaultLessonTasks(
    lesson: { id: string; title: string; description: string }, 
    goal: Goal
): Task[] {
    const ts = Date.now();
    return [
        {
            id: `lesson-task-${lesson.id}-0-${ts}`,
            dayNumber: 0,
            title: `Quick Practice: ${lesson.title}`,
            description: `Take 10 minutes to immediately apply what you learned in "${lesson.title}":\n\n1. Write down the key insight in your own words\n2. Identify one situation where you can use this today\n3. Take that first small action right now`,
            estimatedTimeMinutes: 12,
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
            title: `Deep Practice: ${lesson.title}`,
            description: `Spend 20-25 minutes deeply applying the concepts from "${lesson.title}":\n\n1. Review your notes from the lesson\n2. Choose a real challenge you're facing related to "${goal.title}"\n3. Apply the lesson's framework to that challenge\n4. Document what you learned from the process`,
            estimatedTimeMinutes: 25,
            difficulty: Difficulty.MEDIUM,
            videoRequirements: 'None',
            creditsReward: 0,
            status: TaskStatus.PENDING,
            sourceLessonId: lesson.id,
            isLessonTask: true
        }
    ];
}

// ============================================
// CONTENT SAFETY CHECK
// ============================================

export async function checkContentSafety(text: string): Promise<{isSafe: boolean, reason?: string}> { 
    if (!text.trim()) return { isSafe: true };
    
    // Basic client-side check for obvious issues
    const dangerousPatterns = /\b(hack|exploit|illegal|spam|scam|kill|suicide|self.?harm)\b/i;
    
    if (dangerousPatterns.test(text)) {
        return { isSafe: false, reason: 'Content flagged for review' };
    }
    
    return { isSafe: true };
}

// ============================================
// DEEP INSIGHTS GENERATOR
// ============================================

export async function generateDeepInsights(user: UserState): Promise<DeepInsight | null> {
    const completed = user.dailyTasks.filter(t => 
        t.status === TaskStatus.APPROVED || t.status === TaskStatus.COMPLETED
    ).length;
    const total = user.dailyTasks.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // Calculate streak impact
    const streakBonus = user.streak > 7 ? 'Your streak is building serious momentum!' : 
                        user.streak > 3 ? 'Nice streak going - keep it alive!' : 
                        'Focus on building a streak for compound results.';
    
    if (percentage >= 80) {
        return {
            trend: "Exceptional Execution",
            prediction: "At this pace, you'll hit your goal ahead of schedule. Consider raising the bar.",
            focusArea: "Maintain and elevate",
            title: "You're in the Zone",
            description: `${completed}/${total} tasks complete (${percentage}%). ${streakBonus}`,
            type: "positive"
        };
    } else if (percentage >= 50) {
        return {
            trend: "Building Momentum",
            prediction: "You're on track. One more push today could accelerate your progress significantly.",
            focusArea: "Increase completion rate",
            title: "Good Progress",
            description: `${completed}/${total} tasks complete. You're showing up - now let's finish strong.`,
            type: "positive"
        };
    } else if (percentage > 0) {
        return {
            trend: "Getting Started",
            prediction: "You've begun - that's more than most. Focus on completing one more task.",
            focusArea: "Build momentum with quick wins",
            title: "Keep Pushing",
            description: `${completed}/${total} tasks complete. Pick the easiest remaining task and knock it out.`,
            type: "neutral"
        };
    } else {
        return {
            trend: "Ready to Begin",
            prediction: "Today is a fresh start. One completed task changes everything.",
            focusArea: "Start with your easiest task",
            title: "Time to Start",
            description: `No tasks completed yet. That's okay - open your task list and pick the quickest one.`,
            type: "neutral"
        };
    }
}

// ============================================
// USER PROFILE UPDATER
// ============================================

export async function updateUserProfile(profile: string, checkin: string): Promise<string> { 
    const timestamp = new Date().toLocaleDateString();
    const newEntry = `[${timestamp}] ${checkin}`;
    
    if (!profile) {
        return newEntry;
    }
    
    // Keep last 10 entries to maintain context without getting too long
    const entries = profile.split(' | ');
    const recentEntries = entries.slice(-9);
    recentEntries.push(newEntry);
    
    return recentEntries.join(' | ');
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export async function getSocialMarketplace(): Promise<Course[]> { 
    return []; 
}

export async function getSocialAds(category: any): Promise<Product[]> { 
    return []; 
}

export async function getFeedRecommendations(goal: any): Promise<FeedItem[]> { 
    return []; 
}

export async function generateGoalVisualization(title: string, category: string): Promise<string> { 
    // Generate a deterministic but varied image URL
    const seed = encodeURIComponent(title.replace(/\s/g, '-').toLowerCase());
    return `https://picsum.photos/seed/${seed}/800/450`; 
}

export async function verifyTaskVideo(
    task: Task, 
    videoBase64: string, 
    mimeType: string
): Promise<{status: 'APPROVED' | 'REJECTED', reason?: string}> { 
    // In production, this would send to AI for verification
    // For now, auto-approve
    return { status: 'APPROVED' };
}

export async function analyzeMetricChange(metric: any): Promise<any> { 
    return { 
        analysis: "Metric tracking is active.", 
        recommendation: "Continue monitoring for trends over time." 
    }; 
}

export async function calculateBudgetSplit(
    amount: number, 
    goal: any, 
    profile: any
): Promise<BudgetSplit | null> {
    // Simple default split - could be AI-powered in production
    return {
        lowRisk: { amount: Math.round(amount * 0.5), percent: 50 },
        mediumRisk: { amount: Math.round(amount * 0.3), percent: 30 },
        highYield: { amount: Math.round(amount * 0.2), percent: 20 }
    };
}
