// services/agentCoordinatorService.ts
// Multi-Agent Coordination System - Inspired by OpenClaw
// Handles complex workflows requiring multiple agents

import { 
    masterAgentService, 
    AgentType, 
    AgentStatus, 
    AgentAction,
    ActionPriority 
} from './masterAgentService';

export interface WorkflowStep {
    id: string;
    agentType: AgentType;
    action: string;
    dependencies: string[]; // IDs of steps that must complete first
    status: 'pending' | 'ready' | 'executing' | 'completed' | 'failed';
    result?: any;
    error?: string;
}

export interface Workflow {
    id: string;
    name: string;
    description: string;
    steps: WorkflowStep[];
    status: 'pending' | 'executing' | 'completed' | 'failed';
    createdAt: number;
    completedAt?: number;
    progress: number;
}

export interface AgentCollaboration {
    id: string;
    primaryAgent: AgentType;
    supportingAgents: AgentType[];
    task: string;
    context: any;
    status: 'planning' | 'executing' | 'completed' | 'failed';
    results: Record<AgentType, any>;
}

class AgentCoordinatorService {
    private workflows: Map<string, Workflow> = new Map();
    private collaborations: Map<string, AgentCollaboration> = new Map();

    // Create a new workflow
    createWorkflow(
        name: string,
        description: string,
        steps: Omit<WorkflowStep, 'id' | 'status'>[]
    ): Workflow {
        const workflow: Workflow = {
            id: `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name,
            description,
            steps: steps.map((step, index) => ({
                ...step,
                id: `step-${index}`,
                status: step.dependencies.length === 0 ? 'ready' : 'pending'
            })),
            status: 'pending',
            createdAt: Date.now(),
            progress: 0
        };

        this.workflows.set(workflow.id, workflow);
        return workflow;
    }

    // Execute a workflow
    async executeWorkflow(workflowId: string, userEmail: string): Promise<Workflow> {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) {
            throw new Error('Workflow not found');
        }

        workflow.status = 'executing';
        
        try {
            // Execute steps in dependency order
            while (this.hasReadySteps(workflow)) {
                const readySteps = workflow.steps.filter(s => s.status === 'ready');
                
                // Execute ready steps in parallel
                await Promise.all(
                    readySteps.map(step => this.executeStep(step, workflow, userEmail))
                );

                // Update workflow progress
                const completedSteps = workflow.steps.filter(s => s.status === 'completed').length;
                workflow.progress = Math.round((completedSteps / workflow.steps.length) * 100);

                // Check for failures
                const failedSteps = workflow.steps.filter(s => s.status === 'failed');
                if (failedSteps.length > 0) {
                    workflow.status = 'failed';
                    throw new Error(`Workflow failed at step: ${failedSteps[0].action}`);
                }

                // Update dependent steps
                this.updateDependentSteps(workflow);
            }

            workflow.status = 'completed';
            workflow.completedAt = Date.now();
            workflow.progress = 100;

        } catch (error) {
            workflow.status = 'failed';
            console.error('Workflow execution error:', error);
            throw error;
        }

        return workflow;
    }

    private hasReadySteps(workflow: Workflow): boolean {
        return workflow.steps.some(s => s.status === 'ready' || s.status === 'executing');
    }

    private async executeStep(
        step: WorkflowStep, 
        workflow: Workflow, 
        userEmail: string
    ): Promise<void> {
        step.status = 'executing';

        try {
            const result = await masterAgentService.executeAutonomousTask(
                userEmail,
                step.agentType,
                step.action,
                { workflowId: workflow.id, stepId: step.id }
            );

            step.result = result;
            step.status = 'completed';
        } catch (error) {
            step.status = 'failed';
            step.error = error instanceof Error ? error.message : 'Unknown error';
            throw error;
        }
    }

    private updateDependentSteps(workflow: Workflow): void {
        workflow.steps.forEach(step => {
            if (step.status === 'pending') {
                const allDependenciesCompleted = step.dependencies.every(depId => {
                    const depStep = workflow.steps.find(s => s.id === depId);
                    return depStep?.status === 'completed';
                });

                if (allDependenciesCompleted) {
                    step.status = 'ready';
                }
            }
        });
    }

    // Create agent collaboration
    async createCollaboration(
        primaryAgent: AgentType,
        supportingAgents: AgentType[],
        task: string,
        context: any,
        userEmail: string
    ): Promise<AgentCollaboration> {
        const collaboration: AgentCollaboration = {
            id: `collab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            primaryAgent,
            supportingAgents,
            task,
            context,
            status: 'planning',
            results: {} as Record<AgentType, any>
        };

        this.collaborations.set(collaboration.id, collaboration);

        // Execute collaboration
        try {
            collaboration.status = 'executing';

            // Primary agent leads
            const primaryResult = await masterAgentService.executeAutonomousTask(
                userEmail,
                primaryAgent,
                task,
                { ...context, collaborationId: collaboration.id }
            );
            collaboration.results[primaryAgent] = primaryResult;

            // Supporting agents contribute
            const supportingResults = await Promise.all(
                supportingAgents.map(async (agentType) => {
                    const result = await masterAgentService.executeAutonomousTask(
                        userEmail,
                        agentType,
                        `Support task: ${task}`,
                        { 
                            ...context, 
                            collaborationId: collaboration.id,
                            primaryResult 
                        }
                    );
                    return { agentType, result };
                })
            );

            supportingResults.forEach(({ agentType, result }) => {
                collaboration.results[agentType] = result;
            });

            collaboration.status = 'completed';
        } catch (error) {
            collaboration.status = 'failed';
            console.error('Collaboration error:', error);
            throw error;
        }

        return collaboration;
    }

    // Get workflow status
    getWorkflow(workflowId: string): Workflow | undefined {
        return this.workflows.get(workflowId);
    }

    // Get all workflows
    getAllWorkflows(): Workflow[] {
        return Array.from(this.workflows.values());
    }

    // Get collaboration
    getCollaboration(collaborationId: string): AgentCollaboration | undefined {
        return this.collaborations.get(collaborationId);
    }

    // Cancel workflow
    cancelWorkflow(workflowId: string): void {
        const workflow = this.workflows.get(workflowId);
        if (workflow && workflow.status === 'executing') {
            workflow.status = 'failed';
            workflow.steps.forEach(step => {
                if (step.status === 'executing' || step.status === 'ready') {
                    step.status = 'failed';
                    step.error = 'Workflow cancelled by user';
                }
            });
        }
    }

    // Predefined workflow templates
    createEcommerceStoreSetupWorkflow(
        storeName: string,
        niche: string,
        productUrls: string[]
    ): Workflow {
        return this.createWorkflow(
            'Complete Store Setup',
            `Set up ${storeName} with products and marketing`,
            [
                {
                    agentType: AgentType.ECOMMERCE,
                    action: `Create Shopify store named "${storeName}" in ${niche} niche`,
                    dependencies: []
                },
                {
                    agentType: AgentType.ECOMMERCE,
                    action: `Scrape and import products from: ${productUrls.join(', ')}`,
                    dependencies: ['step-0']
                },
                {
                    agentType: AgentType.CONTENT,
                    action: `Generate product descriptions for ${niche} products`,
                    dependencies: ['step-1']
                },
                {
                    agentType: AgentType.ECOMMERCE,
                    action: 'Create welcome email campaign',
                    dependencies: ['step-0']
                },
                {
                    agentType: AgentType.ECOMMERCE,
                    action: 'Generate social media launch posts',
                    dependencies: ['step-0', 'step-1']
                }
            ]
        );
    }

    createContentMarketingWorkflow(
        productId: string,
        platforms: string[]
    ): Workflow {
        return this.createWorkflow(
            'Content Marketing Campaign',
            'Create and distribute content across platforms',
            [
                {
                    agentType: AgentType.RESEARCH,
                    action: `Research trending topics for product ${productId}`,
                    dependencies: []
                },
                {
                    agentType: AgentType.CONTENT,
                    action: 'Generate blog post based on research',
                    dependencies: ['step-0']
                },
                {
                    agentType: AgentType.ECOMMERCE,
                    action: `Create social posts for platforms: ${platforms.join(', ')}`,
                    dependencies: ['step-0', 'step-1']
                },
                {
                    agentType: AgentType.ECOMMERCE,
                    action: 'Generate email campaign promoting content',
                    dependencies: ['step-1']
                }
            ]
        );
    }

    createProductLaunchWorkflow(
        productName: string,
        targetAudience: string
    ): Workflow {
        return this.createWorkflow(
            'Product Launch',
            `Launch ${productName} to ${targetAudience}`,
            [
                {
                    agentType: AgentType.RESEARCH,
                    action: `Analyze ${targetAudience} market and competitors`,
                    dependencies: []
                },
                {
                    agentType: AgentType.CONTENT,
                    action: 'Create product landing page copy',
                    dependencies: ['step-0']
                },
                {
                    agentType: AgentType.ECOMMERCE,
                    action: 'Generate launch email sequence',
                    dependencies: ['step-0', 'step-1']
                },
                {
                    agentType: AgentType.ECOMMERCE,
                    action: 'Create social media launch campaign',
                    dependencies: ['step-0', 'step-1']
                },
                {
                    agentType: AgentType.ECOMMERCE,
                    action: 'Set up analytics tracking',
                    dependencies: ['step-1']
                }
            ]
        );
    }
}

// Export singleton instance
export const agentCoordinatorService = new AgentCoordinatorService();
