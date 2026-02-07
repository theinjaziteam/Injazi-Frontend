// services/masterAgentService.ts
// AI Master Agent Orchestrator - Similar to OpenClaw
// Coordinates multiple specialized agents to automate user tasks

const API_URL = import.meta.env.VITE_API_URL || 'https://injazi-backend.onrender.com';

export enum AgentType {
    ECOMMERCE = 'ecommerce',
    PRODUCTIVITY = 'productivity',
    LEARNING = 'learning',
    HEALTH = 'health',
    FINANCE = 'finance',
    SOCIAL = 'social',
    RESEARCH = 'research',
    CONTENT = 'content'
}

export enum AgentStatus {
    IDLE = 'idle',
    THINKING = 'thinking',
    EXECUTING = 'executing',
    WAITING_APPROVAL = 'waiting_approval',
    COMPLETED = 'completed',
    FAILED = 'failed'
}

export enum ActionPriority {
    CRITICAL = 'critical',
    HIGH = 'high',
    MEDIUM = 'medium',
    LOW = 'low'
}

export interface AgentAction {
    id: string;
    agentType: AgentType;
    title: string;
    description: string;
    priority: ActionPriority;
    status: AgentStatus;
    requiresApproval: boolean;
    estimatedTime?: string;
    progress?: number;
    result?: any;
    error?: string;
    createdAt: number;
    updatedAt: number;
    metadata?: Record<string, any>;
}

export interface AgentCapability {
    name: string;
    description: string;
    parameters?: Record<string, any>;
    requiresAuth?: boolean;
    platforms?: string[];
}

export interface AgentProfile {
    type: AgentType;
    name: string;
    description: string;
    capabilities: AgentCapability[];
    status: AgentStatus;
    isActive: boolean;
    lastActive?: number;
    tasksCompleted: number;
    successRate: number;
}

export interface OrchestratorRequest {
    userEmail: string;
    userMessage: string;
    context?: {
        goal?: any;
        currentTasks?: any[];
        userProfile?: string;
        connectedApps?: any[];
        recentActions?: AgentAction[];
    };
    autoExecute?: boolean;
}

export interface OrchestratorResponse {
    success: boolean;
    intent: string;
    confidence: number;
    selectedAgent: AgentType;
    reasoning: string;
    response: string;
    suggestedActions: AgentAction[];
    requiresUserInput: string[];
    nextSteps: string;
    estimatedCompletionTime?: string;
}

export interface AgentMemory {
    userId: string;
    agentType: AgentType;
    interactions: {
        timestamp: number;
        userMessage: string;
        agentResponse: string;
        actionsTaken: string[];
        outcome: 'success' | 'failure' | 'partial';
    }[];
    preferences: Record<string, any>;
    learnings: string[];
}

class MasterAgentService {
    private agents: Map<AgentType, AgentProfile> = new Map();
    private activeActions: Map<string, AgentAction> = new Map();
    private memory: Map<string, AgentMemory> = new Map();

    constructor() {
        this.initializeAgents();
    }

    private initializeAgents() {
        // Ecommerce Agent
        this.agents.set(AgentType.ECOMMERCE, {
            type: AgentType.ECOMMERCE,
            name: 'Commerce Master',
            description: 'Manages online stores, products, marketing, and sales automation',
            capabilities: [
                {
                    name: 'Store Setup',
                    description: 'Create and configure Shopify stores',
                    requiresAuth: true,
                    platforms: ['shopify']
                },
                {
                    name: 'Product Management',
                    description: 'Scrape, optimize, and publish products',
                    parameters: { maxProducts: 100 }
                },
                {
                    name: 'Email Marketing',
                    description: 'Generate and schedule email campaigns',
                    requiresAuth: true,
                    platforms: ['klaviyo', 'mailchimp']
                },
                {
                    name: 'Social Media',
                    description: 'Create and post social content',
                    requiresAuth: true,
                    platforms: ['tiktok', 'instagram', 'facebook']
                },
                {
                    name: 'Analytics',
                    description: 'Track and analyze store performance'
                }
            ],
            status: AgentStatus.IDLE,
            isActive: true,
            tasksCompleted: 0,
            successRate: 0
        });

        // Productivity Agent
        this.agents.set(AgentType.PRODUCTIVITY, {
            type: AgentType.PRODUCTIVITY,
            name: 'Productivity Optimizer',
            description: 'Manages tasks, schedules, and workflow automation',
            capabilities: [
                {
                    name: 'Task Management',
                    description: 'Create, organize, and prioritize tasks',
                    requiresAuth: true,
                    platforms: ['todoist', 'notion', 'asana']
                },
                {
                    name: 'Calendar Sync',
                    description: 'Manage calendar events and scheduling',
                    requiresAuth: true,
                    platforms: ['google_calendar', 'outlook']
                },
                {
                    name: 'Email Management',
                    description: 'Filter, categorize, and respond to emails',
                    requiresAuth: true,
                    platforms: ['gmail', 'outlook']
                },
                {
                    name: 'Document Automation',
                    description: 'Generate and organize documents',
                    requiresAuth: true,
                    platforms: ['google_docs', 'notion']
                }
            ],
            status: AgentStatus.IDLE,
            isActive: true,
            tasksCompleted: 0,
            successRate: 0
        });

        // Learning Agent
        this.agents.set(AgentType.LEARNING, {
            type: AgentType.LEARNING,
            name: 'Learning Architect',
            description: 'Creates personalized learning paths and educational content',
            capabilities: [
                {
                    name: 'Curriculum Generation',
                    description: 'Create structured learning paths'
                },
                {
                    name: 'Content Curation',
                    description: 'Find and organize learning resources'
                },
                {
                    name: 'Quiz Generation',
                    description: 'Create assessments and quizzes'
                },
                {
                    name: 'Progress Tracking',
                    description: 'Monitor learning progress and adapt'
                }
            ],
            status: AgentStatus.IDLE,
            isActive: true,
            tasksCompleted: 0,
            successRate: 0
        });

        // Research Agent
        this.agents.set(AgentType.RESEARCH, {
            type: AgentType.RESEARCH,
            name: 'Research Assistant',
            description: 'Conducts research, analyzes data, and generates insights',
            capabilities: [
                {
                    name: 'Web Research',
                    description: 'Search and analyze web content'
                },
                {
                    name: 'Data Analysis',
                    description: 'Process and visualize data'
                },
                {
                    name: 'Report Generation',
                    description: 'Create comprehensive research reports'
                },
                {
                    name: 'Trend Analysis',
                    description: 'Identify patterns and trends'
                }
            ],
            status: AgentStatus.IDLE,
            isActive: true,
            tasksCompleted: 0,
            successRate: 0
        });

        // Content Agent
        this.agents.set(AgentType.CONTENT, {
            type: AgentType.CONTENT,
            name: 'Content Creator',
            description: 'Generates various types of content for different platforms',
            capabilities: [
                {
                    name: 'Blog Writing',
                    description: 'Create blog posts and articles'
                },
                {
                    name: 'Social Posts',
                    description: 'Generate social media content',
                    platforms: ['twitter', 'linkedin', 'instagram']
                },
                {
                    name: 'Video Scripts',
                    description: 'Write scripts for videos'
                },
                {
                    name: 'SEO Optimization',
                    description: 'Optimize content for search engines'
                }
            ],
            status: AgentStatus.IDLE,
            isActive: true,
            tasksCompleted: 0,
            successRate: 0
        });

        // Health Agent
        this.agents.set(AgentType.HEALTH, {
            type: AgentType.HEALTH,
            name: 'Health Coach',
            description: 'Tracks health metrics and provides wellness guidance',
            capabilities: [
                {
                    name: 'Fitness Tracking',
                    description: 'Monitor workouts and activity',
                    requiresAuth: true,
                    platforms: ['apple_health', 'google_fit', 'strava']
                },
                {
                    name: 'Nutrition Planning',
                    description: 'Create meal plans and track nutrition'
                },
                {
                    name: 'Sleep Analysis',
                    description: 'Monitor and improve sleep quality'
                },
                {
                    name: 'Wellness Reminders',
                    description: 'Send health and wellness reminders'
                }
            ],
            status: AgentStatus.IDLE,
            isActive: true,
            tasksCompleted: 0,
            successRate: 0
        });

        // Finance Agent
        this.agents.set(AgentType.FINANCE, {
            type: AgentType.FINANCE,
            name: 'Finance Manager',
            description: 'Manages budgets, expenses, and financial planning',
            capabilities: [
                {
                    name: 'Expense Tracking',
                    description: 'Track and categorize expenses'
                },
                {
                    name: 'Budget Planning',
                    description: 'Create and monitor budgets'
                },
                {
                    name: 'Investment Analysis',
                    description: 'Analyze investment opportunities'
                },
                {
                    name: 'Bill Reminders',
                    description: 'Track and remind about bills'
                }
            ],
            status: AgentStatus.IDLE,
            isActive: true,
            tasksCompleted: 0,
            successRate: 0
        });

        // Social Agent
        this.agents.set(AgentType.SOCIAL, {
            type: AgentType.SOCIAL,
            name: 'Social Coordinator',
            description: 'Manages social interactions and networking',
            capabilities: [
                {
                    name: 'Event Planning',
                    description: 'Organize and manage events'
                },
                {
                    name: 'Network Management',
                    description: 'Track and nurture relationships'
                },
                {
                    name: 'Message Drafting',
                    description: 'Help compose messages and responses'
                },
                {
                    name: 'Social Analytics',
                    description: 'Analyze social media engagement'
                }
            ],
            status: AgentStatus.IDLE,
            isActive: true,
            tasksCompleted: 0,
            successRate: 0
        });
    }

    // Main orchestration method
    async orchestrate(request: OrchestratorRequest): Promise<OrchestratorResponse> {
        try {
            const response = await fetch(`${API_URL}/api/master-agent/orchestrate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(request)
            });

            if (!response.ok) {
                throw new Error('Orchestration failed');
            }

            const data = await response.json();
            
            // Store actions in memory
            if (data.suggestedActions) {
                data.suggestedActions.forEach((action: AgentAction) => {
                    this.activeActions.set(action.id, action);
                });
            }

            return data;
        } catch (error) {
            console.error('Master Agent orchestration error:', error);
            throw error;
        }
    }

    // Get all available agents
    getAgents(): AgentProfile[] {
        return Array.from(this.agents.values());
    }

    // Get specific agent
    getAgent(type: AgentType): AgentProfile | undefined {
        return this.agents.get(type);
    }

    // Get active actions
    getActiveActions(): AgentAction[] {
        return Array.from(this.activeActions.values());
    }

    // Get actions by status
    getActionsByStatus(status: AgentStatus): AgentAction[] {
        return Array.from(this.activeActions.values()).filter(
            action => action.status === status
        );
    }

    // Approve an action
    async approveAction(actionId: string, userEmail: string): Promise<any> {
        try {
            const response = await fetch(`${API_URL}/api/master-agent/actions/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ actionId, userEmail })
            });

            if (!response.ok) {
                throw new Error('Action approval failed');
            }

            const data = await response.json();
            
            // Update local action status
            const action = this.activeActions.get(actionId);
            if (action) {
                action.status = AgentStatus.EXECUTING;
                action.updatedAt = Date.now();
            }

            return data;
        } catch (error) {
            console.error('Action approval error:', error);
            throw error;
        }
    }

    // Reject an action
    async rejectAction(actionId: string, userEmail: string, reason?: string): Promise<any> {
        try {
            const response = await fetch(`${API_URL}/api/master-agent/actions/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ actionId, userEmail, reason })
            });

            if (!response.ok) {
                throw new Error('Action rejection failed');
            }

            const data = await response.json();
            
            // Update local action status
            const action = this.activeActions.get(actionId);
            if (action) {
                action.status = AgentStatus.FAILED;
                action.error = reason || 'Rejected by user';
                action.updatedAt = Date.now();
            }

            return data;
        } catch (error) {
            console.error('Action rejection error:', error);
            throw error;
        }
    }

    // Get action status
    async getActionStatus(actionId: string, userEmail: string): Promise<AgentAction> {
        try {
            const response = await fetch(
                `${API_URL}/api/master-agent/actions/${actionId}?email=${encodeURIComponent(userEmail)}`
            );

            if (!response.ok) {
                throw new Error('Failed to get action status');
            }

            const data = await response.json();
            
            // Update local cache
            if (data.action) {
                this.activeActions.set(actionId, data.action);
            }

            return data.action;
        } catch (error) {
            console.error('Get action status error:', error);
            throw error;
        }
    }

    // Get agent memory
    getMemory(userId: string, agentType?: AgentType): AgentMemory | AgentMemory[] {
        if (agentType) {
            const key = `${userId}-${agentType}`;
            return this.memory.get(key) || {
                userId,
                agentType,
                interactions: [],
                preferences: {},
                learnings: []
            };
        }
        
        // Return all memories for user
        return Array.from(this.memory.values()).filter(m => m.userId === userId);
    }

    // Update agent memory
    updateMemory(memory: AgentMemory): void {
        const key = `${memory.userId}-${memory.agentType}`;
        this.memory.set(key, memory);
    }

    // Execute autonomous task
    async executeAutonomousTask(
        userEmail: string,
        agentType: AgentType,
        task: string,
        context?: any
    ): Promise<AgentAction> {
        try {
            const response = await fetch(`${API_URL}/api/master-agent/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userEmail,
                    agentType,
                    task,
                    context,
                    autoExecute: true
                })
            });

            if (!response.ok) {
                throw new Error('Task execution failed');
            }

            const data = await response.json();
            
            // Store action
            if (data.action) {
                this.activeActions.set(data.action.id, data.action);
            }

            return data.action;
        } catch (error) {
            console.error('Autonomous task execution error:', error);
            throw error;
        }
    }

    // Get agent analytics
    async getAgentAnalytics(userEmail: string, agentType?: AgentType): Promise<any> {
        try {
            const params = new URLSearchParams({ email: userEmail });
            if (agentType) {
                params.set('agentType', agentType);
            }

            const response = await fetch(
                `${API_URL}/api/master-agent/analytics?${params}`
            );

            if (!response.ok) {
                throw new Error('Failed to get analytics');
            }

            return await response.json();
        } catch (error) {
            console.error('Get agent analytics error:', error);
            throw error;
        }
    }

    // Clear completed actions
    clearCompletedActions(): void {
        for (const [id, action] of this.activeActions.entries()) {
            if (action.status === AgentStatus.COMPLETED || action.status === AgentStatus.FAILED) {
                this.activeActions.delete(id);
            }
        }
    }
}

// Export singleton instance
export const masterAgentService = new MasterAgentService();
