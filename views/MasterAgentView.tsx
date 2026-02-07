// views/MasterAgentView.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { AppView } from '../types';
import { Icons } from '../components/UIComponents';

type TabType = 'chat' | 'tools' | 'automations' | 'memory' | 'settings';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    tools?: { name: string; status: 'running' | 'complete' | 'error'; result?: string }[];
}

interface Tool {
    id: string;
    name: string;
    description: string;
    icon: React.FC<any>;
    category: 'productivity' | 'communication' | 'automation' | 'analysis' | 'creative';
    enabled: boolean;
}

const AVAILABLE_TOOLS: Tool[] = [
    { id: 'web-search', name: 'Web Search', description: 'Search the internet for information', icon: Icons.Globe, category: 'productivity', enabled: true },
    { id: 'calendar', name: 'Calendar', description: 'Manage events and schedules', icon: Icons.Calendar, category: 'productivity', enabled: true },
    { id: 'email', name: 'Email', description: 'Read and send emails', icon: Icons.Mail, category: 'communication', enabled: true },
    { id: 'notes', name: 'Notes', description: 'Create and manage notes', icon: Icons.FileText, category: 'productivity', enabled: true },
    { id: 'reminders', name: 'Reminders', description: 'Set and manage reminders', icon: Icons.Bell, category: 'automation', enabled: true },
    { id: 'file-manager', name: 'Files', description: 'Browse and manage files', icon: Icons.File, category: 'productivity', enabled: false },
    { id: 'calculator', name: 'Calculator', description: 'Perform calculations', icon: Icons.BarChart, category: 'analysis', enabled: true },
    { id: 'translator', name: 'Translator', description: 'Translate text between languages', icon: Icons.Globe, category: 'communication', enabled: true },
    { id: 'image-gen', name: 'Image Generator', description: 'Generate images from text', icon: Icons.Image, category: 'creative', enabled: false },
    { id: 'code', name: 'Code Assistant', description: 'Write and debug code', icon: Icons.Cpu, category: 'productivity', enabled: true },
    { id: 'browser', name: 'Browser Control', description: 'Automate browser actions', icon: Icons.Globe, category: 'automation', enabled: false },
    { id: 'analytics', name: 'Analytics', description: 'Analyze data and trends', icon: Icons.PieChart, category: 'analysis', enabled: true },
];

const API_URL = import.meta.env.VITE_API_URL || 'https://injazi-backend.onrender.com';

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
    
    // Automations state
    const [automations, setAutomations] = useState<{ id: string; name: string; trigger: string; action: string; enabled: boolean }[]>([
        { id: '1', name: 'Daily Summary', trigger: 'Every day at 8 AM', action: 'Send task summary', enabled: true },
        { id: '2', name: 'Goal Reminder', trigger: 'Every 3 hours', action: 'Check goal progress', enabled: false },
    ]);
    
    // Memory state
    const [memories, setMemories] = useState<{ id: string; content: string; timestamp: number; category: string }[]>([]);
    
    // Canvas animation
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number | null>(null);
    const starsRef = useRef<{ x: number; y: number; z: number; brightness: number }[]>([]);
    const isAnimatingRef = useRef(true);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Initialize stars
    useEffect(() => {
        if (starsRef.current.length === 0) {
            starsRef.current = Array.from({ length: 200 }, () => ({
                x: Math.random() * 2 - 1,
                y: Math.random() * 2 - 1,
                z: Math.random(),
                brightness: Math.random()
            }));
        }
    }, []);

    // Visibility handler
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
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    // Stars animation
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = 0, height = 0, isRunning = true;

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
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, w, h);

            starsRef.current.forEach(star => {
                const twinkle = 0.3 + Math.sin(currentTime * 0.002 + star.brightness * 10) * 0.5;
                ctx.fillStyle = `rgba(255, 255, 255, ${star.z * twinkle * 0.8})`;
                ctx.beginPath();
                ctx.arc((star.x + 1) * w / 2, (star.y + 1) * h / 2, star.brightness * 1.5 + 0.5, 0, Math.PI * 2);
                ctx.fill();
            });

            // Purple nebula glow for Master Agent
            const nebulaGradient = ctx.createRadialGradient(w * 0.3, h * 0.4, 0, w * 0.3, h * 0.4, w * 0.5);
            nebulaGradient.addColorStop(0, 'rgba(139, 92, 246, 0.1)');
            nebulaGradient.addColorStop(1, 'transparent');
            ctx.fillStyle = nebulaGradient;
            ctx.fillRect(0, 0, w, h);

            animationRef.current = requestAnimationFrame(drawStars);
        };

        animationRef.current = requestAnimationFrame(drawStars);

        return () => {
            isRunning = false;
            window.removeEventListener('resize', resize);
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, []);

    const handleSendMessage = async () => {
        if (!chatInput.trim()) return;
        
        const userMessage: Message = {
            id: `msg-${Date.now()}`,
            role: 'user',
            content: chatInput.trim(),
            timestamp: Date.now()
        };
        
        setMessages(prev => [...prev, userMessage]);
        setChatInput('');
        setIsLoading(true);

        try {
            const enabledTools = tools.filter(t => t.enabled).map(t => t.name).join(', ');
            
            const response = await fetch(`${API_URL}/api/ai/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    systemPrompt: `You are Master Agent - a powerful personal AI assistant running locally for the user. You are like having a brilliant assistant who can help with anything.

YOUR CAPABILITIES:
- Answering questions and providing information
- Task management and productivity advice
- Creative writing, brainstorming, and ideation
- Code assistance, debugging, and explanations
- Data analysis and calculations
- Learning and education support
- Goal tracking and accountability

ENABLED TOOLS: ${enabledTools}

PERSONALITY:
- Concise but thorough when needed
- Proactive - suggest follow-up actions
- Friendly but professional
- Direct and actionable advice

USER CONTEXT:
- Name: ${user.name}
- Current Goal: ${user.goal?.title || 'Not set'}
- Streak: ${user.streak || 0} days

Always be helpful and suggest concrete next steps when appropriate.`,
                    goal: user.goal || { title: 'General Assistant', category: 'OTHER' },
                    history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
                    message: chatInput.trim(),
                    userProfile: user.userProfile || '',
                    currentTasks: user.dailyTasks || []
                })
            });

            const data = await response.json();
            
            const assistantMessage: Message = {
                id: `msg-${Date.now() + 1}`,
                role: 'assistant',
                content: data.response || "I'm here to help! What would you like to accomplish?",
                timestamp: Date.now()
            };
            
            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, {
                id: `msg-${Date.now() + 1}`,
                role: 'assistant',
                content: "I'm having trouble connecting right now. Please check your connection and try again.",
                timestamp: Date.now()
            }]);
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

    // Glassy card component
    const GlassCard: React.FC<{ 
        children: React.ReactNode; 
        style?: React.CSSProperties; 
        onClick?: () => void;
        className?: string;
    }> = ({ children, style, onClick, className }) => (
        <div 
            className={className}
            style={{
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                cursor: onClick ? 'pointer' : 'default',
                transition: 'all 0.2s',
                ...style
            }}
            onClick={onClick}
        >
            {children}
        </div>
    );

    // Tab button component
    const TabButton: React.FC<{ 
        tab: TabType; 
        icon: React.FC<any>; 
        label: string 
    }> = ({ tab, icon: TabIcon, label }) => (
        <button
            onClick={() => setActiveTab(tab)}
            style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                padding: '8px 4px',
                background: activeTab === tab ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s'
            }}
        >
            <TabIcon style={{ 
                width: 20, 
                height: 20, 
                color: activeTab === tab ? 'rgba(167, 139, 250, 1)' : 'rgba(255, 255, 255, 0.4)' 
            }} />
            <span style={{ 
                fontSize: '10px', 
                fontWeight: 500,
                color: activeTab === tab ? 'rgba(167, 139, 250, 1)' : 'rgba(255, 255, 255, 0.4)'
            }}>
                {label}
            </span>
        </button>
    );

    const renderChatTab = () => (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Chat Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', WebkitOverflowScrolling: 'touch' }}>
                {messages.length === 0 && (
                    <div style={{ textAlign: 'center', paddingTop: '48px', paddingBottom: '48px' }}>
                        <div style={{ 
                            width: 80, 
                            height: 80, 
                            margin: '0 auto 16px',
                            background: 'rgba(139, 92, 246, 0.2)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid rgba(139, 92, 246, 0.3)'
                        }}>
                            <Icons.Zap style={{ width: 40, height: 40, color: 'rgba(167, 139, 250, 1)' }} />
                        </div>
                        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>Master Agent</h2>
                        <p style={{ color: 'rgba(255, 255, 255, 0.5)', marginBottom: '24px', fontSize: '14px' }}>Your personal AI assistant - ready to help with anything</p>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', maxWidth: '320px', margin: '0 auto' }}>
                            {[
                                { text: 'Help me plan my day', icon: Icons.Calendar },
                                { text: 'Summarize my progress', icon: Icons.BarChart },
                                { text: 'Write some code', icon: Icons.Cpu },
                                { text: 'Brainstorm ideas', icon: Icons.Sparkles }
                            ].map((prompt, i) => (
                                <button
                                    key={i}
                                    onClick={() => {
                                        setChatInput(prompt.text);
                                        setTimeout(() => handleSendMessage(), 100);
                                    }}
                                    style={{
                                        padding: '12px',
                                        fontSize: '13px',
                                        textAlign: 'left',
                                        background: 'rgba(255, 255, 255, 0.03)',
                                        backdropFilter: 'blur(12px)',
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                        borderRadius: '12px',
                                        color: 'rgba(255, 255, 255, 0.7)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    <prompt.icon style={{ width: 16, height: 16, flexShrink: 0 }} />
                                    <span>{prompt.text}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                
                {messages.map((msg) => (
                    <div key={msg.id} style={{ 
                        display: 'flex', 
                        justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', 
                        marginBottom: '12px' 
                    }}>
                        <div style={{
                            maxWidth: '85%',
                            padding: '12px 16px',
                            borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                            backgroundColor: msg.role === 'user' 
                                ? 'rgba(139, 92, 246, 0.8)' 
                                : 'rgba(255,255,255,0.1)',
                            color: '#fff'
                        }}>
                            <p style={{ fontSize: '14px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, lineHeight: 1.5 }}>
                                {msg.content}
                            </p>
                        </div>
                    </div>
                ))}
                
                {isLoading && (
                    <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '12px' }}>
                        <div style={{
                            padding: '12px 16px',
                            borderRadius: '16px 16px 16px 4px',
                            backgroundColor: 'rgba(255,255,255,0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <Icons.RefreshCw style={{ width: 16, height: 16, color: 'rgba(167, 139, 250, 1)', animation: 'spin 1s linear infinite' }} />
                            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>Thinking...</span>
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>
            
            {/* Chat Input */}
            <div style={{ 
                padding: '12px 16px', 
                borderTop: '1px solid rgba(255,255,255,0.1)',
                paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    borderRadius: '24px',
                    padding: '8px 16px',
                    border: isInputFocused ? '2px solid rgba(139, 92, 246, 0.5)' : '2px solid transparent',
                    transition: 'border-color 0.2s'
                }}>
                    <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onFocus={() => setIsInputFocused(true)}
                        onBlur={() => setIsInputFocused(false)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                        placeholder="Ask me anything..."
                        style={{
                            flex: 1,
                            backgroundColor: 'transparent',
                            border: 'none',
                            outline: 'none',
                            color: '#FFFFFF',
                            fontSize: '14px'
                        }}
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={isLoading || !chatInput.trim()}
                        style={{
                            padding: '8px',
                            background: chatInput.trim() ? 'rgba(139, 92, 246, 1)' : 'transparent',
                            borderRadius: '50%',
                            border: 'none',
                            color: chatInput.trim() ? '#fff' : 'rgba(255, 255, 255, 0.3)',
                            cursor: chatInput.trim() ? 'pointer' : 'default',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Icons.Send style={{ width: 20, height: 20 }} />
                    </button>
                </div>
            </div>
        </div>
    );

    const renderToolsTab = () => (
        <div style={{ padding: '16px', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>Available Tools</h3>
                <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)' }}>Enable tools to expand my capabilities</p>
            </div>
            
            {['productivity', 'communication', 'automation', 'analysis', 'creative'].map(category => {
                const categoryTools = tools.filter(t => t.category === category);
                if (categoryTools.length === 0) return null;
                
                return (
                    <div key={category} style={{ marginBottom: '24px' }}>
                        <h4 style={{ 
                            fontSize: '11px', 
                            fontWeight: 600, 
                            color: 'rgba(255, 255, 255, 0.4)', 
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            marginBottom: '12px'
                        }}>
                            {category}
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {categoryTools.map(tool => (
                                <GlassCard 
                                    key={tool.id} 
                                    style={{ padding: '12px 16px' }}
                                    onClick={() => toggleTool(tool.id)}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: '10px',
                                                background: tool.enabled ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <tool.icon style={{ 
                                                    width: 20, 
                                                    height: 20, 
                                                    color: tool.enabled ? 'rgba(167, 139, 250, 1)' : 'rgba(255, 255, 255, 0.3)' 
                                                }} />
                                            </div>
                                            <div>
                                                <h5 style={{ fontSize: '14px', fontWeight: 500, color: '#fff', margin: 0 }}>{tool.name}</h5>
                                                <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)', margin: 0 }}>{tool.description}</p>
                                            </div>
                                        </div>
                                        <div style={{
                                            width: 44,
                                            height: 24,
                                            borderRadius: '12px',
                                            background: tool.enabled ? 'rgba(139, 92, 246, 1)' : 'rgba(255, 255, 255, 0.1)',
                                            padding: '2px',
                                            transition: 'background 0.2s'
                                        }}>
                                            <div style={{
                                                width: 20,
                                                height: 20,
                                                borderRadius: '10px',
                                                background: '#fff',
                                                transform: tool.enabled ? 'translateX(20px)' : 'translateX(0)',
                                                transition: 'transform 0.2s'
                                            }} />
                                        </div>
                                    </div>
                                </GlassCard>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );

    const renderAutomationsTab = () => (
        <div style={{ padding: '16px', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>Automations</h3>
                    <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)' }}>Set up recurring actions</p>
                </div>
                <button style={{
                    padding: '8px 16px',
                    background: 'rgba(139, 92, 246, 1)',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                }}>
                    <Icons.Plus style={{ width: 16, height: 16 }} />
                    New
                </button>
            </div>
            
            {automations.length === 0 ? (
                <GlassCard style={{ padding: '48px', textAlign: 'center' }}>
                    <Icons.Zap style={{ width: 48, height: 48, color: 'rgba(255, 255, 255, 0.2)', margin: '0 auto 12px' }} />
                    <p style={{ color: 'rgba(255, 255, 255, 0.5)' }}>No automations yet</p>
                </GlassCard>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {automations.map(automation => (
                        <GlassCard key={automation.id} style={{ padding: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>{automation.name}</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Icons.Clock style={{ width: 14, height: 14, color: 'rgba(255, 255, 255, 0.4)' }} />
                                            <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>{automation.trigger}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Icons.Zap style={{ width: 14, height: 14, color: 'rgba(255, 255, 255, 0.4)' }} />
                                            <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>{automation.action}</span>
                                        </div>
                                    </div>
                                </div>
                                <div 
                                    onClick={() => toggleAutomation(automation.id)}
                                    style={{
                                        width: 44,
                                        height: 24,
                                        borderRadius: '12px',
                                        background: automation.enabled ? 'rgba(139, 92, 246, 1)' : 'rgba(255, 255, 255, 0.1)',
                                        padding: '2px',
                                        cursor: 'pointer',
                                        transition: 'background 0.2s'
                                    }}
                                >
                                    <div style={{
                                        width: 20,
                                        height: 20,
                                        borderRadius: '10px',
                                        background: '#fff',
                                        transform: automation.enabled ? 'translateX(20px)' : 'translateX(0)',
                                        transition: 'transform 0.2s'
                                    }} />
                                </div>
                            </div>
                        </GlassCard>
                    ))}
                </div>
            )}
        </div>
    );

    const renderMemoryTab = () => (
        <div style={{ padding: '16px', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>Memory</h3>
                <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)' }}>Things I remember about you</p>
            </div>
            
            <GlassCard style={{ padding: '48px', textAlign: 'center' }}>
                <Icons.BookOpen style={{ width: 48, height: 48, color: 'rgba(255, 255, 255, 0.2)', margin: '0 auto 12px' }} />
                <p style={{ color: 'rgba(255, 255, 255, 0.5)', marginBottom: '16px' }}>Memory feature coming soon</p>
                <p style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '12px' }}>I will learn your preferences and remember important details</p>
            </GlassCard>
        </div>
    );

    const renderSettingsTab = () => (
        <div style={{ padding: '16px', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>Settings</h3>
                <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)' }}>Configure Master Agent</p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <GlassCard style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Icons.Bell style={{ width: 20, height: 20, color: 'rgba(255, 255, 255, 0.5)' }} />
                            <div>
                                <h5 style={{ fontSize: '14px', fontWeight: 500, color: '#fff', margin: 0 }}>Notifications</h5>
                                <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)', margin: 0 }}>Get notified about updates</p>
                            </div>
                        </div>
                        <Icons.ChevronRight style={{ width: 20, height: 20, color: 'rgba(255, 255, 255, 0.3)' }} />
                    </div>
                </GlassCard>
                
                <GlassCard style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Icons.Shield style={{ width: 20, height: 20, color: 'rgba(255, 255, 255, 0.5)' }} />
                            <div>
                                <h5 style={{ fontSize: '14px', fontWeight: 500, color: '#fff', margin: 0 }}>Privacy</h5>
                                <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)', margin: 0 }}>Manage your data</p>
                            </div>
                        </div>
                        <Icons.ChevronRight style={{ width: 20, height: 20, color: 'rgba(255, 255, 255, 0.3)' }} />
                    </div>
                </GlassCard>
                
                <GlassCard style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Icons.Link style={{ width: 20, height: 20, color: 'rgba(255, 255, 255, 0.5)' }} />
                            <div>
                                <h5 style={{ fontSize: '14px', fontWeight: 500, color: '#fff', margin: 0 }}>Connected Apps</h5>
                                <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)', margin: 0 }}>Manage integrations</p>
                            </div>
                        </div>
                        <Icons.ChevronRight style={{ width: 20, height: 20, color: 'rgba(255, 255, 255, 0.3)' }} />
                    </div>
                </GlassCard>
            </div>
        </div>
    );

    const renderContent = () => {
        switch (activeTab) {
            case 'chat': return renderChatTab();
            case 'tools': return renderToolsTab();
            case 'automations': return renderAutomationsTab();
            case 'memory': return renderMemoryTab();
            case 'settings': return renderSettingsTab();
            default: return renderChatTab();
        }
    };

    return (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', backgroundColor: '#000' }}>
            {/* Stars Background */}
            <canvas 
                ref={canvasRef} 
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} 
            />
            
            {/* Header */}
            <div style={{ 
                position: 'relative', 
                zIndex: 10, 
                padding: '12px 16px',
                paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
                <button 
                    onClick={() => setView(AppView.GUIDE)}
                    style={{ 
                        padding: '8px', 
                        background: 'rgba(255, 255, 255, 0.05)', 
                        border: 'none', 
                        borderRadius: '10px',
                        cursor: 'pointer'
                    }}
                >
                    <Icons.ArrowLeft style={{ width: 20, height: 20, color: 'rgba(255, 255, 255, 0.7)' }} />
                </button>
                
                <div style={{ textAlign: 'center' }}>
                    <h1 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', margin: 0 }}>Master Agent</h1>
                    <p style={{ fontSize: '11px', color: 'rgba(167, 139, 250, 1)', margin: 0 }}>
                        {tools.filter(t => t.enabled).length} tools active
                    </p>
                </div>
                
                <button 
                    onClick={() => setActiveTab('settings')}
                    style={{ 
                        padding: '8px', 
                        background: 'rgba(255, 255, 255, 0.05)', 
                        border: 'none', 
                        borderRadius: '10px',
                        cursor: 'pointer'
                    }}
                >
                    <Icons.Settings style={{ width: 20, height: 20, color: 'rgba(255, 255, 255, 0.7)' }} />
                </button>
            </div>
            
            {/* Main Content */}
            <div style={{ position: 'relative', zIndex: 10, flex: 1, overflow: 'hidden' }}>
                {renderContent()}
            </div>
            
            {/* Tab Bar */}
            <div style={{ 
                position: 'relative', 
                zIndex: 10,
                padding: '8px 16px',
                paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(0, 0, 0, 0.5)',
                backdropFilter: 'blur(12px)'
            }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                    <TabButton tab="chat" icon={Icons.MessageCircle} label="Chat" />
                    <TabButton tab="tools" icon={Icons.Grid} label="Tools" />
                    <TabButton tab="automations" icon={Icons.Zap} label="Auto" />
                    <TabButton tab="memory" icon={Icons.BookOpen} label="Memory" />
                    <TabButton tab="settings" icon={Icons.Settings} label="Settings" />
                </div>
            </div>
        </div>
    );
}
