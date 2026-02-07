// views/AgentDashboardView.tsx
import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { AppView } from '../types';
import { Icons } from '../components/UIComponents';
import {
    masterAgentService,
    AgentType,
    AgentStatus,
    AgentProfile,
    AgentAction,
    ActionPriority
} from '../services/masterAgentService';
import { agentCoordinatorService, Workflow } from '../services/agentCoordinatorService';
import { agentLearningService } from '../services/agentLearningService';

export default function AgentDashboardView() {
    const { user, setView } = useApp();
    const [agents, setAgents] = useState<AgentProfile[]>([]);
    const [activeActions, setActiveActions] = useState<AgentAction[]>([]);
    const [selectedAgent, setSelectedAgent] = useState<AgentProfile | null>(null);
    const [chatInput, setChatInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
    const [analytics, setAnalytics] = useState<any>(null);
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [showWorkflowTemplates, setShowWorkflowTemplates] = useState(false);
    const [autonomousMode, setAutonomousMode] = useState(false);

    useEffect(() => {
        loadAgents();
        loadActiveActions();
        loadAnalytics();
        loadWorkflows();
    }, []);

    const loadAgents = () => {
        const allAgents = masterAgentService.getAgents();
        setAgents(allAgents);
    };

    const loadActiveActions = () => {
        const actions = masterAgentService.getActiveActions();
        setActiveActions(actions);
    };

    const loadAnalytics = async () => {
        if (user?.email) {
            try {
                const data = await masterAgentService.getAgentAnalytics(user.email);
                setAnalytics(data);
            } catch (error) {
                console.error('Failed to load analytics:', error);
            }
        }
    };

    const loadWorkflows = () => {
        const allWorkflows = agentCoordinatorService.getAllWorkflows();
        setWorkflows(allWorkflows);
    };

    const handleCreateWorkflow = (template: 'store' | 'marketing' | 'launch') => {
        let workflow: Workflow;
        
        switch (template) {
            case 'store':
                workflow = agentCoordinatorService.createEcommerceStoreSetupWorkflow(
                    'My Store',
                    'General',
                    []
                );
                break;
            case 'marketing':
                workflow = agentCoordinatorService.createContentMarketingWorkflow(
                    'product-1',
                    ['tiktok', 'instagram']
                );
                break;
            case 'launch':
                workflow = agentCoordinatorService.createProductLaunchWorkflow(
                    'New Product',
                    'Target Audience'
                );
                break;
        }
        
        loadWorkflows();
        setShowWorkflowTemplates(false);
    };

    const handleExecuteWorkflow = async (workflowId: string) => {
        if (!user?.email) return;
        
        try {
            await agentCoordinatorService.executeWorkflow(workflowId, user.email);
            loadWorkflows();
            loadActiveActions();
        } catch (error) {
            console.error('Workflow execution error:', error);
        }
    };

    const handleSendMessage = async () => {
        if (!chatInput.trim() || !user?.email) return;

        const userMessage = chatInput.trim();
        setChatInput('');
        setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsProcessing(true);

        try {
            const response = await masterAgentService.orchestrate({
                userEmail: user.email,
                userMessage,
                context: {
                    goal: user.goal,
                    currentTasks: user.dailyTasks,
                    userProfile: user.userProfile,
                    connectedApps: user.connectedApps,
                    recentActions: activeActions
                }
            });

            setChatHistory(prev => [...prev, { 
                role: 'assistant', 
                content: response.response 
            }]);

            // Reload actions if new ones were created
            if (response.suggestedActions && response.suggestedActions.length > 0) {
                loadActiveActions();
            }
        } catch (error) {
            console.error('Orchestration error:', error);
            setChatHistory(prev => [...prev, { 
                role: 'assistant', 
                content: 'Sorry, I encountered an error. Please try again.' 
            }]);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleApproveAction = async (actionId: string) => {
        if (!user?.email) return;
        
        try {
            await masterAgentService.approveAction(actionId, user.email);
            loadActiveActions();
        } catch (error) {
            console.error('Approve action error:', error);
        }
    };

    const handleRejectAction = async (actionId: string) => {
        if (!user?.email) return;
        
        try {
            await masterAgentService.rejectAction(actionId, user.email, 'User rejected');
            loadActiveActions();
        } catch (error) {
            console.error('Reject action error:', error);
        }
    };

    const getAgentIcon = (type: AgentType) => {
        switch (type) {
            case AgentType.ECOMMERCE: return Icons.Shop;
            case AgentType.PRODUCTIVITY: return Icons.Zap;
            case AgentType.LEARNING: return Icons.BookOpen;
            case AgentType.HEALTH: return Icons.Activity;
            case AgentType.FINANCE: return Icons.DollarSign;
            case AgentType.SOCIAL: return Icons.Users;
            case AgentType.RESEARCH: return Icons.Search;
            case AgentType.CONTENT: return Icons.FileText;
            default: return Icons.Bot;
        }
    };

    const getStatusColor = (status: AgentStatus) => {
        switch (status) {
            case AgentStatus.EXECUTING: return 'bg-blue-500';
            case AgentStatus.WAITING_APPROVAL: return 'bg-yellow-500';
            case AgentStatus.COMPLETED: return 'bg-green-500';
            case AgentStatus.FAILED: return 'bg-red-500';
            default: return 'bg-gray-400';
        }
    };

    const getPriorityColor = (priority: ActionPriority) => {
        switch (priority) {
            case ActionPriority.CRITICAL: return 'bg-red-100 text-red-700 border-red-200';
            case ActionPriority.HIGH: return 'bg-orange-100 text-orange-700 border-orange-200';
            case ActionPriority.MEDIUM: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case ActionPriority.LOW: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const pendingActions = activeActions.filter(a => a.status === AgentStatus.WAITING_APPROVAL);
    const executingActions = activeActions.filter(a => a.status === AgentStatus.EXECUTING);

    return (
        <div className="h-full flex flex-col bg-gray-50 overflow-hidden">
            {/* Header */}
            <div className="flex-shrink-0 bg-gradient-to-br from-[#171738] via-[#1e1e4a] to-[#2a2a5c] text-white px-5 pt-safe pb-6">
                <div className="flex items-center justify-between mb-4">
                    <button 
                        onClick={() => setView(AppView.DASHBOARD)}
                        className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-all"
                        aria-label="Back to dashboard"
                    >
                        <Icons.ChevronLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-xl font-black tracking-tight">AI Agents</h1>
                    <div className="w-10" />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                        <div className="text-2xl font-black">{agents.filter(a => a.isActive).length}</div>
                        <div className="text-xs text-white/60 font-medium">Active Agents</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                        <div className="text-2xl font-black">{pendingActions.length}</div>
                        <div className="text-xs text-white/60 font-medium">Pending</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                        <div className="text-2xl font-black">{executingActions.length}</div>
                        <div className="text-xs text-white/60 font-medium">Running</div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Pending Actions */}
                {pendingActions.length > 0 && (
                    <section>
                        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
                            Awaiting Approval
                        </h2>
                        <div className="space-y-3">
                            {pendingActions.map(action => {
                                const AgentIcon = getAgentIcon(action.agentType);
                                return (
                                    <div 
                                        key={action.id}
                                        className="bg-white rounded-2xl p-4 border-2 border-yellow-200 shadow-sm"
                                    >
                                        <div className="flex items-start gap-3 mb-3">
                                            <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                                <AgentIcon className="w-5 h-5 text-yellow-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-bold text-primary">{action.title}</h3>
                                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border ${getPriorityColor(action.priority)}`}>
                                                        {action.priority}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-600">{action.description}</p>
                                                {action.estimatedTime && (
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        Est. time: {action.estimatedTime}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleApproveAction(action.id)}
                                                className="flex-1 py-2 bg-green-500 text-white rounded-xl text-sm font-bold hover:bg-green-600 transition-all active:scale-95"
                                            >
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => handleRejectAction(action.id)}
                                                className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-300 transition-all active:scale-95"
                                            >
                                                Reject
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* Executing Actions */}
                {executingActions.length > 0 && (
                    <section>
                        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
                            In Progress
                        </h2>
                        <div className="space-y-3">
                            {executingActions.map(action => {
                                const AgentIcon = getAgentIcon(action.agentType);
                                return (
                                    <div 
                                        key={action.id}
                                        className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                                <AgentIcon className="w-5 h-5 text-blue-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-primary mb-1">{action.title}</h3>
                                                <p className="text-sm text-gray-600 mb-2">{action.description}</p>
                                                {action.progress !== undefined && (
                                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                                        <div 
                                                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                                            style={{ width: `${action.progress}%` }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* Autonomous Mode Toggle */}
                <section>
                    <div className="bg-white rounded-2xl p-4 border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                                    <Icons.Zap className="w-5 h-5 text-purple-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-primary text-sm">Autonomous Mode</h3>
                                    <p className="text-xs text-gray-500">Auto-execute approved actions</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setAutonomousMode(!autonomousMode)}
                                className={`relative w-12 h-6 rounded-full transition-all ${
                                    autonomousMode ? 'bg-green-500' : 'bg-gray-300'
                                }`}
                            >
                                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                                    autonomousMode ? 'translate-x-6' : 'translate-x-0'
                                }`} />
                            </button>
                        </div>
                    </div>
                </section>

                {/* Workflow Templates */}
                <section>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">
                            Workflow Templates
                        </h2>
                        <button
                            onClick={() => setShowWorkflowTemplates(!showWorkflowTemplates)}
                            className="text-xs font-bold text-primary hover:text-primary/80 transition-colors"
                        >
                            {showWorkflowTemplates ? 'Hide' : 'Show All'}
                        </button>
                    </div>
                    
                    {showWorkflowTemplates && (
                        <div className="space-y-3">
                            <button
                                onClick={() => handleCreateWorkflow('store')}
                                className="w-full bg-white rounded-2xl p-4 border border-gray-200 hover:border-primary/30 hover:shadow-md transition-all active:scale-95 text-left"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <Icons.Shop className="w-5 h-5 text-primary" />
                                    <h3 className="font-bold text-primary">Complete Store Setup</h3>
                                </div>
                                <p className="text-xs text-gray-500">
                                    Create store, import products, set up marketing
                                </p>
                            </button>

                            <button
                                onClick={() => handleCreateWorkflow('marketing')}
                                className="w-full bg-white rounded-2xl p-4 border border-gray-200 hover:border-primary/30 hover:shadow-md transition-all active:scale-95 text-left"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <Icons.TrendingUp className="w-5 h-5 text-primary" />
                                    <h3 className="font-bold text-primary">Content Marketing Campaign</h3>
                                </div>
                                <p className="text-xs text-gray-500">
                                    Research, create content, distribute across platforms
                                </p>
                            </button>

                            <button
                                onClick={() => handleCreateWorkflow('launch')}
                                className="w-full bg-white rounded-2xl p-4 border border-gray-200 hover:border-primary/30 hover:shadow-md transition-all active:scale-95 text-left"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <Icons.Rocket className="w-5 h-5 text-primary" />
                                    <h3 className="font-bold text-primary">Product Launch</h3>
                                </div>
                                <p className="text-xs text-gray-500">
                                    Market research, landing page, email & social campaigns
                                </p>
                            </button>
                        </div>
                    )}
                </section>

                {/* Active Workflows */}
                {workflows.length > 0 && (
                    <section>
                        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
                            Active Workflows
                        </h2>
                        <div className="space-y-3">
                            {workflows.map(workflow => (
                                <div
                                    key={workflow.id}
                                    className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-bold text-primary">{workflow.name}</h3>
                                        <span className={`text-[9px] font-bold px-2 py-1 rounded-full uppercase ${
                                            workflow.status === 'completed' ? 'bg-green-100 text-green-700' :
                                            workflow.status === 'executing' ? 'bg-blue-100 text-blue-700' :
                                            workflow.status === 'failed' ? 'bg-red-100 text-red-700' :
                                            'bg-gray-100 text-gray-700'
                                        }`}>
                                            {workflow.status}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-3">{workflow.description}</p>
                                    
                                    {/* Progress Bar */}
                                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                                        <div
                                            className="bg-primary h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${workflow.progress}%` }}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-gray-400">
                                            {workflow.steps.filter(s => s.status === 'completed').length}/{workflow.steps.length} steps
                                        </span>
                                        {workflow.status === 'pending' && (
                                            <button
                                                onClick={() => handleExecuteWorkflow(workflow.id)}
                                                className="text-primary font-bold hover:text-primary/80"
                                            >
                                                Execute
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Available Agents */}
                <section>
                    <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
                        Available Agents
                    </h2>
                    <div className="grid grid-cols-2 gap-3">
                        {agents.map(agent => {
                            const AgentIcon = getAgentIcon(agent.type);
                            return (
                                <button
                                    key={agent.type}
                                    onClick={() => setSelectedAgent(agent)}
                                    className="bg-white rounded-2xl p-4 border border-gray-200 hover:border-primary/30 hover:shadow-md transition-all active:scale-95 text-left"
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                                            <AgentIcon className="w-5 h-5 text-primary" />
                                        </div>
                                        <div className={`w-2 h-2 rounded-full ${agent.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                                    </div>
                                    <h3 className="font-bold text-primary text-sm mb-1">{agent.name}</h3>
                                    <p className="text-xs text-gray-500 line-clamp-2">{agent.description}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-xs text-gray-400">{agent.tasksCompleted} tasks</span>
                                        {agent.successRate > 0 && (
                                            <>
                                                <span className="text-xs text-gray-300">•</span>
                                                <span className="text-xs text-green-600">{agent.successRate}% success</span>
                                            </>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* Chat with Master Agent */}
                <section>
                    <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
                        Command Center
                    </h2>
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                        {/* Chat History */}
                        {chatHistory.length > 0 && (
                            <div className="p-4 max-h-60 overflow-y-auto space-y-3 border-b border-gray-100">
                                {chatHistory.map((msg, idx) => (
                                    <div 
                                        key={idx}
                                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                                            msg.role === 'user' 
                                                ? 'bg-primary text-white' 
                                                : 'bg-gray-100 text-gray-800'
                                        }`}>
                                            <p className="text-sm">{msg.content}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Input */}
                        <div className="p-4 flex gap-2">
                            <input
                                type="text"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                placeholder="Tell agents what to do..."
                                className="flex-1 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-primary transition-colors text-sm"
                                disabled={isProcessing}
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={isProcessing || !chatInput.trim()}
                                className="px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isProcessing ? (
                                    <Icons.RefreshCw className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Icons.Send className="w-5 h-5" />
                                )}
                            </button>
                        </div>
                    </div>
                </section>
            </div>

            {/* Agent Detail Modal */}
            {selectedAgent && (
                <div 
                    className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center animate-fade-in"
                    onClick={() => setSelectedAgent(null)}
                >
                    <div 
                        className="bg-white w-full max-w-lg rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto animate-slide-up"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
                        
                        <div className="flex items-center gap-4 mb-6">
                            {(() => {
                                const AgentIcon = getAgentIcon(selectedAgent.type);
                                return (
                                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
                                        <AgentIcon className="w-8 h-8 text-primary" />
                                    </div>
                                );
                            })()}
                            <div>
                                <h2 className="text-xl font-black text-primary">{selectedAgent.name}</h2>
                                <p className="text-sm text-gray-500">{selectedAgent.description}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                                    Capabilities
                                </h3>
                                <div className="space-y-2">
                                    {selectedAgent.capabilities.map((cap, idx) => (
                                        <div key={idx} className="bg-gray-50 rounded-xl p-3">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Icons.Check className="w-4 h-4 text-green-500" />
                                                <span className="font-bold text-sm text-primary">{cap.name}</span>
                                            </div>
                                            <p className="text-xs text-gray-600 ml-6">{cap.description}</p>
                                            {cap.platforms && cap.platforms.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-2 ml-6">
                                                    {cap.platforms.map(platform => (
                                                        <span 
                                                            key={platform}
                                                            className="text-[9px] font-bold px-2 py-0.5 bg-primary/10 text-primary rounded-full uppercase"
                                                        >
                                                            {platform}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={() => setSelectedAgent(null)}
                                className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all active:scale-95"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
