// views/MasterAgentView.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { AppView } from '../types';
import { Icons } from '../components/UIComponents';
import { oauthService, ConnectedAccount } from '../services/oauthService';
import BridgeHub from '../components/BridgeHub';

const API_URL = import.meta.env.VITE_API_URL || 'https://injazi-backend.onrender.com';

// ============================================
// MASTER AGENT SERVICE
// ============================================
const masterAgentService = {
    // Main chat endpoint that handles tool execution
    chat: async (email: string, message: string, context: {
        connectedPlatforms: string[];
        activeTools: string[];
        goal?: any;
        userName: string;
        history: { role: string; content: string }[];
        userTasks?: any[];
    }) => {
        try {
            const response = await fetch(`${API_URL}/api/master-agent/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, message, ...context })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Chat request failed');
            }
            
            return response.json();
        } catch (error) {
            console.error('Master agent chat error:', error);
            // Fallback to regular chat endpoint if master-agent endpoint doesn't exist
            return masterAgentService.fallbackChat(email, message, context);
        }
    },

    // Fallback to regular AI chat
    fallbackChat: async (email: string, message: string, context: any) => {
        const systemPrompt = `You are Master Agent - a powerful personal AI assistant that helps users accomplish tasks using their connected apps and services.

YOUR CAPABILITIES:
${context.activeTools?.map((t: string) => `- ${t}`).join('\n') || '- General assistance'}

CONNECTED PLATFORMS:
${context.connectedPlatforms?.length > 0 ? context.connectedPlatforms.map((p: string) => `- ${p}`).join('\n') : '- No platforms connected yet'}

USER CONTEXT:
- Name: ${context.userName}
- Current Goal: ${context.goal?.title || 'Not set'}

IMPORTANT INSTRUCTIONS:
1. If the user asks to use a connected platform (like GitHub, Google, Shopify), tell them you're accessing it and provide helpful information.
2. If a platform is not connected but needed, suggest they connect it in Settings.
3. Be concise, helpful, and action-oriented.
4. Format responses nicely with **bold** for emphasis.
5. Always suggest next steps.

When users ask about their connected accounts:
- For GitHub: Offer to list repos, check issues, view profile
- For Google: Offer to check calendar, read emails, create events
- For Shopify: Offer to check orders, products, analytics
- For other platforms: Explain what you can help with

If you cannot actually perform an action, explain what would need to be done and offer alternatives.`;

        const response = await fetch(`${API_URL}/api/ai/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                systemPrompt,
                goal: context.goal || { title: 'General Assistant', category: 'OTHER' },
                history: context.history || [],
                message,
                userProfile: '',
                currentTasks: context.userTasks || [],
                connectedPlatforms: context.connectedPlatforms,
                activeTools: context.activeTools
            })
        });

        if (!response.ok) {
            throw new Error('Chat request failed');
        }

        return response.json();
    },

    // Execute a specific tool action
    executeTool: async (email: string, tool: string, action: string, params?: any) => {
        const response = await fetch(`${API_URL}/api/master-agent/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, tool, action, params })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Tool execution failed');
        }
        
        return response.json();
    },

    // Get available actions for connected platforms
    getAvailableActions: async (email: string) => {
        try {
            const response = await fetch(`${API_URL}/api/master-agent/actions/${encodeURIComponent(email)}`);
            if (!response.ok) return { actions: [] };
            return response.json();
        } catch {
            return { actions: [] };
        }
    }
};

// ============================================
// TYPES
// ============================================
type TabType = 'chat' | 'tools' | 'automations' | 'settings';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    isThinking?: boolean;
    toolUsed?: string;
    actionTaken?: string;
}

interface Tool {
    id: string;
    name: string;
    description: string;
    icon: React.FC<any>;
    category: 'productivity' | 'communication' | 'automation' | 'analysis' | 'creative';
    enabled: boolean;
    requiresConnection?: string;
}

interface Automation {
    id: string;
    name: string;
    trigger: string;
    action: string;
    enabled: boolean;
    lastRun?: number;
    icon: React.FC<any>;
}

// ============================================
// AVAILABLE TOOLS
// ============================================
const AVAILABLE_TOOLS: Tool[] = [
    { id: 'web-search', name: 'Web Search', description: 'Search the internet for real-time information', icon: Icons.Globe, category: 'productivity', enabled: true },
    { id: 'github', name: 'GitHub', description: 'Manage repositories, issues, and code', icon: Icons.Cpu, category: 'productivity', enabled: true, requiresConnection: 'github' },
    { id: 'calendar', name: 'Calendar', description: 'Manage events and schedules', icon: Icons.Calendar, category: 'productivity', enabled: true, requiresConnection: 'google' },
    { id: 'email', name: 'Email', description: 'Read, compose and send emails', icon: Icons.Mail, category: 'communication', enabled: true, requiresConnection: 'google' },
    { id: 'notes', name: 'Notes', description: 'Create and manage notes', icon: Icons.FileText, category: 'productivity', enabled: true },
    { id: 'reminders', name: 'Reminders', description: 'Set and manage reminders', icon: Icons.Bell, category: 'automation', enabled: true },
    { id: 'shopify', name: 'Shopify', description: 'Manage your e-commerce store', icon: Icons.Shop, category: 'productivity', enabled: true, requiresConnection: 'shopify' },
    { id: 'analytics', name: 'Analytics', description: 'Analyze data and generate insights', icon: Icons.PieChart, category: 'analysis', enabled: true },
    { id: 'code', name: 'Code Assistant', description: 'Write, explain, and debug code', icon: Icons.Cpu, category: 'creative', enabled: true },
    { id: 'social', name: 'Social Media', description: 'Create and schedule social posts', icon: Icons.Users, category: 'communication', enabled: true, requiresConnection: 'instagram' },
    { id: 'tasks', name: 'Task Manager', description: 'Create and manage your tasks', icon: Icons.CheckCircle, category: 'productivity', enabled: true },
    { id: 'discord', name: 'Discord', description: 'Manage Discord servers and messages', icon: Icons.MessageCircle, category: 'communication', enabled: true, requiresConnection: 'discord' },
];

// ============================================
// MAIN COMPONENT
// ============================================
export default function MasterAgentView() {
    const { user, setUser, setView } = useApp();
    const [activeTab, setActiveTab] = useState<TabType>('chat');
    const [isLoading, setIsLoading] = useState(false);
    
    // Chat state
    const [chatInput, setChatInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isInputFocused, setIsInputFocused] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    
    // Tools state
    const [tools, setTools] = useState<Tool[]>(AVAILABLE_TOOLS);
    
    // Connected accounts
    const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);
    const [showBridgeHub, setShowBridgeHub] = useState(false);
    const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
    
    // Automations state
    const [automations, setAutomations] = useState<Automation[]>([
        { id: '1', name: 'Daily Summary', trigger: 'Every day at 8:00 AM', action: 'Send task and goal summary', enabled: true, icon: Icons.Sun },
        { id: '2', name: 'Goal Check-in', trigger: 'Every 4 hours', action: 'Remind about pending tasks', enabled: false, icon: Icons.Target },
        { id: '3', name: 'Weekly Report', trigger: 'Every Sunday at 9:00 PM', action: 'Generate weekly progress report', enabled: true, icon: Icons.BarChart },
    ]);
    
    // Settings state
    const [settings, setSettings] = useState({
        notifications: true,
        soundEffects: true,
        autoSave: true,
        darkMode: true,
        voiceEnabled: false,
    });
    
    // Canvas animation
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number | null>(null);
    const starsRef = useRef<{ x: number; y: number; z: number; brightness: number; speed: number }[]>([]);
    const isAnimatingRef = useRef(true);
    const [canvasKey, setCanvasKey] = useState(0);

    // ============================================
    // EFFECTS
    // ============================================
    
    // Scroll to bottom when messages change
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Load connected accounts on mount
    useEffect(() => {
        if (user?.email) {
            loadConnectedAccounts();
        }
    }, [user?.email]);

    // Refresh accounts when BridgeHub closes
    useEffect(() => {
        if (!showBridgeHub && user?.email) {
            loadConnectedAccounts();
        }
    }, [showBridgeHub]);

    // Initialize stars
    useEffect(() => {
        if (starsRef.current.length === 0) {
            starsRef.current = Array.from({ length: 300 }, () => ({
                x: Math.random() * 2 - 1,
                y: Math.random() * 2 - 1,
                z: Math.random(),
                brightness: Math.random(),
                speed: 0.0002 + Math.random() * 0.0008
            }));
        }
    }, []);

    // Visibility change handler
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                isAnimatingRef.current = false;
                if (animationRef.current) {
                    cancelAnimationFrame(animationRef.current);
                    animationRef.current = null;
                }
            } else {
                isAnimatingRef.current = true;
                setCanvasKey(prev => prev + 1);
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    // Canvas animation
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = 0, height = 0, isRunning = true;
        let shootingStars: { x: number; y: number; vx: number; vy: number; life: number; maxLife: number }[] = [];

        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            width = rect.width * dpr;
            height = rect.height * dpr;
            canvas.width = width;
            canvas.height = height;
        };
        
        resize();
        window.addEventListener('resize', resize);

        let lastFrameTime = 0;
        const frameInterval = 1000 / 30;

        const drawStars = (currentTime: number) => {
            if (!isRunning || !isAnimatingRef.current) return;
            
            const elapsed = currentTime - lastFrameTime;
            if (elapsed < frameInterval) {
                animationRef.current = requestAnimationFrame(drawStars);
                return;
            }
            lastFrameTime = currentTime - (elapsed % frameInterval);
            
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const w = width / dpr;
            const h = height / dpr;
            
            if (w === 0 || h === 0) {
                animationRef.current = requestAnimationFrame(drawStars);
                return;
            }
            
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            
            // Deep space gradient
            const bgGradient = ctx.createLinearGradient(0, 0, 0, h);
            bgGradient.addColorStop(0, '#000000');
            bgGradient.addColorStop(0.5, '#0a0a1a');
            bgGradient.addColorStop(1, '#000000');
            ctx.fillStyle = bgGradient;
            ctx.fillRect(0, 0, w, h);

            // Draw stars
            starsRef.current.forEach(star => {
                const twinkle = 0.4 + Math.sin(currentTime * star.speed * 10 + star.brightness * 20) * 0.4;
                const size = star.brightness * 2 + 0.5;
                
                const glowSize = size * 3;
                const glow = ctx.createRadialGradient(
                    (star.x + 1) * w / 2, (star.y + 1) * h / 2, 0,
                    (star.x + 1) * w / 2, (star.y + 1) * h / 2, glowSize
                );
                glow.addColorStop(0, `rgba(255, 255, 255, ${star.z * twinkle * 0.8})`);
                glow.addColorStop(1, 'transparent');
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc((star.x + 1) * w / 2, (star.y + 1) * h / 2, glowSize, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.fillStyle = `rgba(255, 255, 255, ${star.z * twinkle})`;
                ctx.beginPath();
                ctx.arc((star.x + 1) * w / 2, (star.y + 1) * h / 2, size, 0, Math.PI * 2);
                ctx.fill();
            });

            // Purple nebula
            const nebula1 = ctx.createRadialGradient(w * 0.2, h * 0.3, 0, w * 0.2, h * 0.3, w * 0.5);
            nebula1.addColorStop(0, 'rgba(139, 92, 246, 0.15)');
            nebula1.addColorStop(0.5, 'rgba(139, 92, 246, 0.05)');
            nebula1.addColorStop(1, 'transparent');
            ctx.fillStyle = nebula1;
            ctx.fillRect(0, 0, w, h);

            // Blue nebula
            const nebula2 = ctx.createRadialGradient(w * 0.8, h * 0.7, 0, w * 0.8, h * 0.7, w * 0.4);
            nebula2.addColorStop(0, 'rgba(59, 130, 246, 0.1)');
            nebula2.addColorStop(0.5, 'rgba(59, 130, 246, 0.03)');
            nebula2.addColorStop(1, 'transparent');
            ctx.fillStyle = nebula2;
            ctx.fillRect(0, 0, w, h);

            // Shooting stars
            if (Math.random() < 0.003 && shootingStars.length < 3) {
                shootingStars.push({
                    x: Math.random() * w * 0.5,
                    y: Math.random() * h * 0.3,
                    vx: 4 + Math.random() * 6,
                    vy: 2 + Math.random() * 4,
                    life: 0,
                    maxLife: 25 + Math.random() * 35
                });
            }

            shootingStars = shootingStars.filter(ss => {
                ss.x += ss.vx;
                ss.y += ss.vy;
                ss.life++;
                
                const alpha = 1 - (ss.life / ss.maxLife);
                const gradient = ctx.createLinearGradient(ss.x, ss.y, ss.x - ss.vx * 15, ss.y - ss.vy * 15);
                gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
                gradient.addColorStop(0.3, `rgba(167, 139, 250, ${alpha * 0.5})`);
                gradient.addColorStop(1, 'transparent');
                
                ctx.strokeStyle = gradient;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(ss.x, ss.y);
                ctx.lineTo(ss.x - ss.vx * 15, ss.y - ss.vy * 15);
                ctx.stroke();
                
                return ss.life < ss.maxLife;
            });

            animationRef.current = requestAnimationFrame(drawStars);
        };

        animationRef.current = requestAnimationFrame(drawStars);

        return () => {
            isRunning = false;
            window.removeEventListener('resize', resize);
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [canvasKey]);

    // ============================================
    // HELPER FUNCTIONS
    // ============================================

    const loadConnectedAccounts = async () => {
        if (!user?.email) return;
        setIsLoadingAccounts(true);
        try {
            const accounts = await oauthService.getConnectedAccounts(user.email);
            setConnectedAccounts(accounts);
        } catch (error) {
            console.error('Error loading connected accounts:', error);
        } finally {
            setIsLoadingAccounts(false);
        }
    };

    const isToolConnected = (tool: Tool): boolean => {
        if (!tool.requiresConnection) return true;
        return connectedAccounts.some(a => 
            a.platform.toLowerCase() === tool.requiresConnection?.toLowerCase() && 
            a.isConnected && 
            !a.isExpired
        );
    };

    const getActiveTools = (): string[] => {
        return tools
            .filter(t => t.enabled && isToolConnected(t))
            .map(t => t.name);
    };

    const getConnectedPlatforms = (): string[] => {
        return connectedAccounts
            .filter(a => a.isConnected && !a.isExpired)
            .map(a => a.platform);
    };

    // ============================================
    // CHAT HANDLER
    // ============================================

    const handleSendMessage = async () => {
        if (!chatInput.trim() || isLoading) return;
        
        const userMessage: Message = {
            id: `msg-${Date.now()}`,
            role: 'user',
            content: chatInput.trim(),
            timestamp: Date.now()
        };
        
        setMessages(prev => [...prev, userMessage]);
        const currentInput = chatInput.trim();
        setChatInput('');
        setIsLoading(true);

        // Add thinking message
        const thinkingId = `thinking-${Date.now()}`;
        setMessages(prev => [...prev, {
            id: thinkingId,
            role: 'assistant',
            content: '',
            timestamp: Date.now(),
            isThinking: true
        }]);

        try {
            const activeTools = getActiveTools();
            const connectedPlatforms = getConnectedPlatforms();
            
            // Call master agent service
            const response = await masterAgentService.chat(user.email, currentInput, {
                connectedPlatforms,
                activeTools,
                goal: user.goal,
                userName: user.name,
                history: messages.filter(m => !m.isThinking).slice(-10).map(m => ({ 
                    role: m.role, 
                    content: m.content 
                })),
                userTasks: user.dailyTasks
            });

            // Remove thinking and add response
            setMessages(prev => {
                const filtered = prev.filter(m => m.id !== thinkingId);
                return [...filtered, {
                    id: `msg-${Date.now() + 1}`,
                    role: 'assistant',
                    content: response.response || response.message || "I'm here to help! What would you like to do?",
                    timestamp: Date.now(),
                    toolUsed: response.toolUsed,
                    actionTaken: response.actionTaken
                }];
            });
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => {
                const filtered = prev.filter(m => m.id !== thinkingId);
                return [...filtered, {
                    id: `msg-${Date.now() + 1}`,
                    role: 'assistant',
                    content: "I'm having trouble connecting right now. Please try again.",
                    timestamp: Date.now()
                }];
            });
        } finally {
            setIsLoading(false);
        }
    };

    const toggleTool = (toolId: string) => {
        setTools(prev => prev.map(t => 
            t.id === toolId ? { ...t, enabled: !t.enabled } : t
        ));
    };

    const toggleAutomation = (automationId: string) => {
        setAutomations(prev => prev.map(a => 
            a.id === automationId ? { ...a, enabled: !a.enabled } : a
        ));
    };

    const handleDisconnect = async (platform: string) => {
        if (!user?.email) return;
        const success = await oauthService.disconnect(user.email, platform);
        if (success) {
            loadConnectedAccounts();
        }
    };

    // ============================================
    // UI COMPONENTS
    // ============================================

    const GlassCard: React.FC<{ 
        children: React.ReactNode; 
        style?: React.CSSProperties; 
        onClick?: () => void;
        hover?: boolean;
    }> = ({ children, style, onClick, hover = true }) => {
        const [isHovered, setIsHovered] = useState(false);
        
        return (
            <div 
                style={{
                    background: isHovered && hover ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.03)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: isHovered && hover ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '16px',
                    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                    cursor: onClick ? 'pointer' : 'default',
                    transition: 'all 0.3s ease',
                    transform: isHovered && hover && onClick ? 'translateY(-2px)' : 'translateY(0)',
                    ...style
                }}
                onClick={onClick}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {children}
            </div>
        );
    };

    const TabButton: React.FC<{ tab: TabType; icon: React.FC<any>; label: string }> = ({ tab, icon: TabIcon, label }) => (
        <button
            onClick={() => setActiveTab(tab)}
            style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                padding: '10px 4px',
                background: activeTab === tab ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                border: activeTab === tab ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid transparent',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
            }}
        >
            <TabIcon style={{ 
                width: 22, 
                height: 22, 
                color: activeTab === tab ? 'rgba(167, 139, 250, 1)' : 'rgba(255, 255, 255, 0.4)',
                transition: 'color 0.3s ease'
            }} />
            <span style={{ 
                fontSize: '10px', 
                fontWeight: 600,
                color: activeTab === tab ? 'rgba(167, 139, 250, 1)' : 'rgba(255, 255, 255, 0.4)',
                transition: 'color 0.3s ease'
            }}>
                {label}
            </span>
        </button>
    );

    const TypingIndicator = () => (
        <div style={{ display: 'flex', gap: '4px', padding: '4px 0' }}>
            {[0, 1, 2].map(i => (
                <div
                    key={i}
                    style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: 'rgba(167, 139, 250, 0.8)',
                        animation: `bounce 1.4s ease-in-out ${i * 0.16}s infinite`
                    }}
                />
            ))}
            <style>{`
                @keyframes bounce {
                    0%, 60%, 100% { transform: translateY(0); }
                    30% { transform: translateY(-8px); }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes slideIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `}</style>
        </div>
    );

    // ============================================
    // RENDER CHAT TAB
    // ============================================

    const renderChatTab = () => (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Connection Banner */}
            {connectedAccounts.filter(a => a.isConnected && !a.isExpired).length === 0 && (
                <div style={{ padding: '12px 16px 0' }}>
                    <GlassCard 
                        style={{ 
                            padding: '12px 16px',
                            background: 'rgba(139, 92, 246, 0.1)',
                            border: '1px solid rgba(139, 92, 246, 0.2)'
                        }}
                        onClick={() => setShowBridgeHub(true)}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Icons.Link style={{ width: 18, height: 18, color: 'rgba(167, 139, 250, 1)' }} />
                                <div>
                                    <p style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)', margin: 0 }}>
                                        Connect your apps to unlock superpowers
                                    </p>
                                    <p style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', margin: 0 }}>
                                        GitHub, Google, Shopify, Discord & more
                                    </p>
                                </div>
                            </div>
                            <Icons.ChevronRight style={{ width: 18, height: 18, color: 'rgba(255, 255, 255, 0.4)' }} />
                        </div>
                    </GlassCard>
                </div>
            )}

            {/* Connected Apps Pills */}
            {connectedAccounts.filter(a => a.isConnected && !a.isExpired).length > 0 && (
                <div style={{ padding: '12px 16px 0' }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {connectedAccounts.filter(a => a.isConnected && !a.isExpired).map(account => (
                            <div
                                key={account.platform}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '6px 12px',
                                    background: 'rgba(34, 197, 94, 0.1)',
                                    borderRadius: '20px',
                                    border: '1px solid rgba(34, 197, 94, 0.2)'
                                }}
                            >
                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
                                <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.8)', textTransform: 'capitalize', fontWeight: 500 }}>
                                    {account.platform}
                                </span>
                            </div>
                        ))}
                        <button
                            onClick={() => setShowBridgeHub(true)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '6px 12px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                borderRadius: '20px',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                cursor: 'pointer',
                                color: 'rgba(255, 255, 255, 0.5)',
                                fontSize: '11px',
                                fontWeight: 500
                            }}
                        >
                            <Icons.Plus style={{ width: 12, height: 12 }} />
                            Add
                        </button>
                    </div>
                </div>
            )}
            
            {/* Chat Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', WebkitOverflowScrolling: 'touch' }}>
                {messages.length === 0 && (
                    <div style={{ textAlign: 'center', paddingTop: '40px', paddingBottom: '40px', animation: 'slideIn 0.5s ease' }}>
                        <div style={{ 
                            width: 90, 
                            height: 90, 
                            margin: '0 auto 20px',
                            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(59, 130, 246, 0.2))',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid rgba(139, 92, 246, 0.3)',
                            boxShadow: '0 0 40px rgba(139, 92, 246, 0.2)'
                        }}>
                            <Icons.Zap style={{ width: 44, height: 44, color: 'rgba(167, 139, 250, 1)' }} />
                        </div>
                        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>Master Agent</h2>
                        <p style={{ color: 'rgba(255, 255, 255, 0.5)', marginBottom: '8px', fontSize: '14px' }}>
                            Your AI assistant with superpowers
                        </p>
                        <p style={{ color: 'rgba(139, 92, 246, 0.8)', marginBottom: '28px', fontSize: '12px' }}>
                            {connectedAccounts.filter(a => a.isConnected).length} apps connected
                        </p>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', maxWidth: '340px', margin: '0 auto' }}>
                            {[
                                { text: 'Check my GitHub repos', icon: Icons.Cpu },
                                { text: 'Read my emails', icon: Icons.Mail },
                                { text: 'Analyze my progress', icon: Icons.BarChart },
                                { text: 'Help me code', icon: Icons.Cpu }
                            ].map((prompt, i) => (
                                <GlassCard
                                    key={i}
                                    onClick={() => {
                                        setChatInput(prompt.text);
                                        setTimeout(handleSendMessage, 100);
                                    }}
                                    style={{
                                        padding: '14px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        animation: `slideIn 0.5s ease ${i * 0.1}s both`
                                    }}
                                >
                                    <prompt.icon style={{ width: 18, height: 18, color: 'rgba(167, 139, 250, 0.8)', flexShrink: 0 }} />
                                    <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.8)', textAlign: 'left' }}>{prompt.text}</span>
                                </GlassCard>
                            ))}
                        </div>
                    </div>
                )}
                
                {messages.map((msg) => (
                    <div 
                        key={msg.id} 
                        style={{ 
                            display: 'flex', 
                            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', 
                            marginBottom: '14px',
                            animation: 'slideIn 0.3s ease'
                        }}
                    >
                        {msg.role === 'assistant' && (
                            <div style={{
                                width: 32,
                                height: 32,
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.5), rgba(59, 130, 246, 0.3))',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: '10px',
                                flexShrink: 0
                            }}>
                                <Icons.Zap style={{ width: 16, height: 16, color: '#fff' }} />
                            </div>
                        )}
                        <div style={{
                            maxWidth: '80%',
                            padding: msg.isThinking ? '12px 16px' : '14px 18px',
                            borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                            backgroundColor: msg.role === 'user' 
                                ? 'rgba(139, 92, 246, 0.8)' 
                                : 'rgba(255, 255, 255, 0.08)',
                            color: '#fff',
                            border: msg.role === 'user' ? 'none' : '1px solid rgba(255, 255, 255, 0.08)'
                        }}>
                            {msg.isThinking ? (
                                <TypingIndicator />
                            ) : (
                                <>
                                    <p style={{ 
                                        fontSize: '14px', 
                                        whiteSpace: 'pre-wrap', 
                                        wordBreak: 'break-word', 
                                        margin: 0, 
                                        lineHeight: 1.6 
                                    }}>
                                        {msg.content}
                                    </p>
                                    {msg.toolUsed && (
                                        <div style={{
                                            marginTop: '10px',
                                            paddingTop: '10px',
                                            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}>
                                            <Icons.Zap style={{ width: 12, height: 12, color: 'rgba(167, 139, 250, 0.8)' }} />
                                            <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)' }}>
                                                Used {msg.toolUsed} {msg.actionTaken ? `(${msg.actionTaken})` : ''}
                                            </span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                ))}
                <div ref={chatEndRef} />
            </div>
            
            {/* Chat Input */}
            <div style={{ 
                padding: '12px 16px', 
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
                background: 'rgba(0, 0, 0, 0.3)'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    borderRadius: '24px',
                    padding: '6px 6px 6px 18px',
                    border: isInputFocused ? '2px solid rgba(139, 92, 246, 0.5)' : '2px solid rgba(255, 255, 255, 0.08)',
                    transition: 'all 0.3s ease'
                }}>
                    <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onFocus={() => setIsInputFocused(true)}
                        onBlur={() => setIsInputFocused(false)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                        placeholder="Ask me anything..."
                        disabled={isLoading}
                        style={{
                            flex: 1,
                            backgroundColor: 'transparent',
                            border: 'none',
                            outline: 'none',
                            color: '#FFFFFF',
                            fontSize: '15px'
                        }}
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={isLoading || !chatInput.trim()}
                        style={{
                            padding: '10px',
                            background: chatInput.trim() && !isLoading
                                ? 'linear-gradient(135deg, rgba(139, 92, 246, 1), rgba(109, 62, 216, 1))'
                                : 'rgba(255, 255, 255, 0.1)',
                            borderRadius: '50%',
                            border: 'none',
                            color: chatInput.trim() && !isLoading ? '#fff' : 'rgba(255, 255, 255, 0.3)',
                            cursor: chatInput.trim() && !isLoading ? 'pointer' : 'default',
                            transition: 'all 0.3s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        {isLoading ? (
                            <Icons.RefreshCw style={{ width: 20, height: 20, animation: 'spin 1s linear infinite' }} />
                        ) : (
                            <Icons.Send style={{ width: 20, height: 20 }} />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );

    // ============================================
    // RENDER TOOLS TAB
    // ============================================

    const renderToolsTab = () => (
        <div style={{ padding: '16px', overflowY: 'auto', WebkitOverflowScrolling: 'touch', height: '100%' }}>
            <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Tools & Capabilities</h3>
                <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)' }}>
                    {tools.filter(t => t.enabled && isToolConnected(t)).length} of {tools.length} active
                </p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {tools.map((tool, index) => {
                    const connected = isToolConnected(tool);
                    
                    return (
                        <GlassCard 
                            key={tool.id} 
                            style={{ 
                                padding: '14px 16px',
                                animation: `slideIn 0.3s ease ${index * 0.03}s both`,
                                opacity: !connected ? 0.6 : 1
                            }}
                            onClick={() => connected && toggleTool(tool.id)}
                            hover={connected}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <div style={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: '12px',
                                        background: tool.enabled && connected 
                                            ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(59, 130, 246, 0.2))'
                                            : 'rgba(255, 255, 255, 0.05)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: tool.enabled && connected 
                                            ? '1px solid rgba(139, 92, 246, 0.3)' 
                                            : '1px solid rgba(255, 255, 255, 0.08)',
                                        transition: 'all 0.3s ease'
                                    }}>
                                        <tool.icon style={{ 
                                            width: 22, 
                                            height: 22, 
                                            color: tool.enabled && connected 
                                                ? 'rgba(167, 139, 250, 1)' 
                                                : 'rgba(255, 255, 255, 0.3)'
                                        }} />
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <h5 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', margin: 0 }}>{tool.name}</h5>
                                            {!connected && tool.requiresConnection && (
                                                <span style={{
                                                    fontSize: '9px',
                                                    fontWeight: 600,
                                                    color: 'rgba(251, 191, 36, 1)',
                                                    background: 'rgba(251, 191, 36, 0.2)',
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    textTransform: 'uppercase'
                                                }}>
                                                    Connect
                                                </span>
                                            )}
                                        </div>
                                        <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)', margin: 0 }}>{tool.description}</p>
                                    </div>
                                </div>
                                {connected ? (
                                    <div style={{
                                        width: 48,
                                        height: 26,
                                        borderRadius: '13px',
                                        background: tool.enabled 
                                            ? 'linear-gradient(135deg, rgba(139, 92, 246, 1), rgba(109, 62, 216, 1))'
                                            : 'rgba(255, 255, 255, 0.1)',
                                        padding: '2px',
                                        cursor: 'pointer'
                                    }}>
                                        <div style={{
                                            width: 22,
                                            height: 22,
                                            borderRadius: '11px',
                                            background: '#fff',
                                            transform: tool.enabled ? 'translateX(22px)' : 'translateX(0)',
                                            transition: 'transform 0.3s ease',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                        }} />
                                    </div>
                                ) : (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setShowBridgeHub(true); }}
                                        style={{
                                            padding: '6px 12px',
                                            background: 'rgba(139, 92, 246, 0.2)',
                                            border: '1px solid rgba(139, 92, 246, 0.3)',
                                            borderRadius: '8px',
                                            color: 'rgba(167, 139, 250, 1)',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Connect
                                    </button>
                                )}
                            </div>
                        </GlassCard>
                    );
                })}
            </div>
        </div>
    );

    // ============================================
    // RENDER AUTOMATIONS TAB
    // ============================================

    const renderAutomationsTab = () => (
        <div style={{ padding: '16px', overflowY: 'auto', WebkitOverflowScrolling: 'touch', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Automations</h3>
                    <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)' }}>
                        {automations.filter(a => a.enabled).length} active
                    </p>
                </div>
                <button style={{
                    padding: '10px 18px',
                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 1), rgba(109, 62, 216, 1))',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)'
                }}>
                    <Icons.Plus style={{ width: 16, height: 16 }} />
                    New
                </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {automations.map((automation, index) => (
                    <GlassCard 
                        key={automation.id} 
                        style={{ padding: '16px', animation: `slideIn 0.3s ease ${index * 0.1}s both` }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', gap: '14px', flex: 1 }}>
                                <div style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: '12px',
                                    background: automation.enabled 
                                        ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(59, 130, 246, 0.2))'
                                        : 'rgba(255, 255, 255, 0.05)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: automation.enabled ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                                    flexShrink: 0
                                }}>
                                    <automation.icon style={{ 
                                        width: 22, 
                                        height: 22, 
                                        color: automation.enabled ? 'rgba(167, 139, 250, 1)' : 'rgba(255, 255, 255, 0.3)' 
                                    }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>{automation.name}</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Icons.Clock style={{ width: 12, height: 12, color: 'rgba(255, 255, 255, 0.4)' }} />
                                            <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>{automation.trigger}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Icons.Zap style={{ width: 12, height: 12, color: 'rgba(255, 255, 255, 0.4)' }} />
                                            <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>{automation.action}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div 
                                onClick={() => toggleAutomation(automation.id)}
                                style={{
                                    width: 48,
                                    height: 26,
                                    borderRadius: '13px',
                                    background: automation.enabled 
                                        ? 'linear-gradient(135deg, rgba(139, 92, 246, 1), rgba(109, 62, 216, 1))'
                                        : 'rgba(255, 255, 255, 0.1)',
                                    padding: '2px',
                                    cursor: 'pointer'
                                }}
                            >
                                <div style={{
                                    width: 22,
                                    height: 22,
                                    borderRadius: '11px',
                                    background: '#fff',
                                    transform: automation.enabled ? 'translateX(22px)' : 'translateX(0)',
                                    transition: 'transform 0.3s ease',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                }} />
                            </div>
                        </div>
                    </GlassCard>
                ))}
            </div>
        </div>
    );

    // ============================================
    // RENDER SETTINGS TAB
    // ============================================

    const renderSettingsTab = () => (
        <div style={{ padding: '16px', overflowY: 'auto', WebkitOverflowScrolling: 'touch', height: '100%' }}>
            <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Settings</h3>
                <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)' }}>Configure Master Agent</p>
            </div>
            
            {/* Connected Apps */}
            <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
                    Connected Apps
                </h4>
                
                <GlassCard style={{ padding: '16px', marginBottom: '10px' }} onClick={() => setShowBridgeHub(true)}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div style={{
                                width: 44, height: 44, borderRadius: '12px',
                                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(59, 130, 246, 0.2))',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: '1px solid rgba(139, 92, 246, 0.3)'
                            }}>
                                <Icons.Link style={{ width: 22, height: 22, color: 'rgba(167, 139, 250, 1)' }} />
                            </div>
                            <div>
                                <h5 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', margin: 0 }}>Bridge Hub</h5>
                                <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)', margin: 0 }}>
                                    {isLoadingAccounts ? 'Loading...' : `${connectedAccounts.filter(a => a.isConnected && !a.isExpired).length} apps connected`}
                                </p>
                            </div>
                        </div>
                        <Icons.ChevronRight style={{ width: 20, height: 20, color: 'rgba(255, 255, 255, 0.3)' }} />
                    </div>
                </GlassCard>

                {connectedAccounts.filter(a => a.isConnected && !a.isExpired).length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                        {connectedAccounts.filter(a => a.isConnected && !a.isExpired).map(account => (
                            <div key={account.platform} style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '8px 12px', background: 'rgba(255, 255, 255, 0.05)',
                                borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.1)'
                            }}>
                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
                                <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)', textTransform: 'capitalize' }}>
                                    {account.platform}
                                </span>
                                <button onClick={(e) => { e.stopPropagation(); handleDisconnect(account.platform); }}
                                    style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', display: 'flex' }}>
                                    <Icons.X style={{ width: 12, height: 12, color: 'rgba(255, 255, 255, 0.4)' }} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Preferences */}
            <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
                    Preferences
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[
                        { key: 'notifications', label: 'Notifications', desc: 'Get notified about updates', icon: Icons.Bell },
                        { key: 'soundEffects', label: 'Sound Effects', desc: 'Play sounds for actions', icon: Icons.Activity },
                        { key: 'autoSave', label: 'Auto Save', desc: 'Save conversations automatically', icon: Icons.RefreshCw },
                        { key: 'voiceEnabled', label: 'Voice Mode', desc: 'Enable voice interactions', icon: Icons.Mic },
                    ].map((item, index) => (
                        <GlassCard key={item.key} style={{ padding: '14px 16px', animation: `slideIn 0.3s ease ${index * 0.05}s both` }}
                            onClick={() => setSettings(s => ({ ...s, [item.key]: !s[item.key as keyof typeof settings] }))}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <item.icon style={{ width: 20, height: 20, color: 'rgba(255, 255, 255, 0.5)' }} />
                                    <div>
                                        <h5 style={{ fontSize: '14px', fontWeight: 500, color: '#fff', margin: 0 }}>{item.label}</h5>
                                        <p style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)', margin: 0 }}>{item.desc}</p>
                                    </div>
                                </div>
                                <div style={{
                                    width: 48, height: 26, borderRadius: '13px',
                                    background: settings[item.key as keyof typeof settings]
                                        ? 'linear-gradient(135deg, rgba(139, 92, 246, 1), rgba(109, 62, 216, 1))'
                                        : 'rgba(255, 255, 255, 0.1)',
                                    padding: '2px'
                                }}>
                                    <div style={{
                                        width: 22, height: 22, borderRadius: '11px', background: '#fff',
                                        transform: settings[item.key as keyof typeof settings] ? 'translateX(22px)' : 'translateX(0)',
                                        transition: 'transform 0.3s ease', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                    }} />
                                </div>
                            </div>
                        </GlassCard>
                    ))}
                </div>
            </div>

            {/* Data & Privacy */}
            <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
                    Data & Privacy
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <GlassCard style={{ padding: '14px 16px' }} onClick={() => setView(AppView.LEGAL)}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <Icons.Shield style={{ width: 20, height: 20, color: 'rgba(255, 255, 255, 0.5)' }} />
                                <div>
                                    <h5 style={{ fontSize: '14px', fontWeight: 500, color: '#fff', margin: 0 }}>Privacy Policy</h5>
                                    <p style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)', margin: 0 }}>View our privacy policy</p>
                                </div>
                            </div>
                            <Icons.ChevronRight style={{ width: 20, height: 20, color: 'rgba(255, 255, 255, 0.3)' }} />
                        </div>
                    </GlassCard>
                    
                    <GlassCard style={{ padding: '14px 16px' }}
                        onClick={() => { if (window.confirm('Clear all chat history?')) setMessages([]); }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <Icons.Trash style={{ width: 20, height: 20, color: 'rgba(239, 68, 68, 0.7)' }} />
                                <div>
                                    <h5 style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(239, 68, 68, 0.9)', margin: 0 }}>Clear History</h5>
                                    <p style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)', margin: 0 }}>Delete all conversations</p>
                                </div>
                            </div>
                            <Icons.ChevronRight style={{ width: 20, height: 20, color: 'rgba(255, 255, 255, 0.3)' }} />
                        </div>
                    </GlassCard>
                </div>
            </div>

            {/* Version */}
            <div style={{ textAlign: 'center', paddingTop: '20px', paddingBottom: '20px' }}>
                <p style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.3)' }}>Master Agent v1.0.0</p>
                <p style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.2)', marginTop: '4px' }}>Powered by Injazi AI</p>
            </div>
        </div>
    );

    // ============================================
    // MAIN RENDER
    // ============================================

    const renderContent = () => {
        switch (activeTab) {
            case 'chat': return renderChatTab();
            case 'tools': return renderToolsTab();
            case 'automations': return renderAutomationsTab();
            case 'settings': return renderSettingsTab();
            default: return renderChatTab();
        }
    };

    return (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', backgroundColor: '#000' }}>
            <canvas key={canvasKey} ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
            
            {/* Header */}
            <div style={{ 
                position: 'relative', zIndex: 10, padding: '12px 16px',
                paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                background: 'rgba(0, 0, 0, 0.3)', backdropFilter: 'blur(10px)'
            }}>
                <button onClick={() => setView(AppView.CHAT)} style={{ 
                    padding: '10px', background: 'rgba(255, 255, 255, 0.05)', 
                    border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', cursor: 'pointer'
                }}>
                    <Icons.ArrowLeft style={{ width: 20, height: 20, color: 'rgba(255, 255, 255, 0.7)' }} />
                </button>
                
                <div style={{ textAlign: 'center' }}>
                    <h1 style={{ fontSize: '17px', fontWeight: 700, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                        <Icons.Zap style={{ width: 18, height: 18, color: 'rgba(167, 139, 250, 1)' }} />
                        Master Agent
                    </h1>
                    <p style={{ fontSize: '11px', color: 'rgba(167, 139, 250, 0.8)', margin: 0 }}>
                        {tools.filter(t => t.enabled && isToolConnected(t)).length} tools active
                    </p>
                </div>
                
                <button onClick={() => setActiveTab('settings')} style={{ 
                    padding: '10px', 
                    background: activeTab === 'settings' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)', 
                    border: activeTab === 'settings' ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px', cursor: 'pointer'
                }}>
                    <Icons.Settings style={{ width: 20, height: 20, color: activeTab === 'settings' ? 'rgba(167, 139, 250, 1)' : 'rgba(255, 255, 255, 0.7)' }} />
                </button>
            </div>
            
            {/* Content */}
            <div style={{ position: 'relative', zIndex: 10, flex: 1, overflow: 'hidden' }}>
                {renderContent()}
            </div>
            
            {/* Tab Bar */}
            <div style={{ 
                position: 'relative', zIndex: 10, padding: '8px 16px',
                paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))',
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(20px)'
            }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                    <TabButton tab="chat" icon={Icons.MessageCircle} label="Chat" />
                    <TabButton tab="tools" icon={Icons.Grid} label="Tools" />
                    <TabButton tab="automations" icon={Icons.Zap} label="Auto" />
                    <TabButton tab="settings" icon={Icons.Settings} label="Settings" />
                </div>
            </div>

            <BridgeHub isOpen={showBridgeHub} onClose={() => setShowBridgeHub(false)} />
        </div>
    );
}
