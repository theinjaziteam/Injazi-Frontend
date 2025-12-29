// views/ChatView.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../contexts/AppContext';
import { AppView, ChatMessage } from '../types';
import { Icons } from '../components/UIComponents';
import { getChatResponse, checkContentSafety } from '../services/geminiService';

interface JourneyStep {
    id: string;
    title: string;
    content: string;
    position: { lat: number; lng: number };
    isActive: boolean;
    isCompleted: boolean;
}

interface GuideConversation {
    id: string;
    name: string;
    createdAt: number;
    messages: ChatMessage[];
    journeySteps: JourneyStep[];
}

export default function ChatView() {
    const { user, setUser, setView } = useApp();
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [isInputFocused, setIsInputFocused] = useState(false);
    
    // Conversations state
    const [conversations, setConversations] = useState<GuideConversation[]>(() => {
        return (user as any).guideConversations || [];
    });
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [showJourneysList, setShowJourneysList] = useState(false);
    const [editingJourneyId, setEditingJourneyId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    
    // View mode toggle
    const [usePlanetView, setUsePlanetView] = useState(true);
    
    // Journey State
    const [journeySteps, setJourneySteps] = useState<JourneyStep[]>([]);
    const [currentStepIndex, setCurrentStepIndex] = useState(-1);
    const [isJourneyActive, setIsJourneyActive] = useState(false);
    const [displayedText, setDisplayedText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const typingRef = useRef<number | null>(null);
    
    // Canvas refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>();
    const rotationRef = useRef({ y: 0, targetY: 0, velocity: 0 });
    const dragRef = useRef({ isDragging: false, lastX: 0 });
    const starsRef = useRef<{ x: number; y: number; z: number; brightness: number }[]>([]);
    
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Save conversations to user state
    useEffect(() => {
        setUser(prev => ({ ...prev, guideConversations: conversations } as any));
    }, [conversations, setUser]);

    // Load conversation when switching
    useEffect(() => {
        const convo = conversations.find(c => c.id === activeConversationId);
        if (convo && convo.journeySteps?.length > 0) {
            setJourneySteps(convo.journeySteps);
            setIsJourneyActive(true);
            setCurrentStepIndex(0);
            setDisplayedText(convo.journeySteps[0]?.content || '');
        } else {
            setJourneySteps([]);
            setIsJourneyActive(false);
            setCurrentStepIndex(-1);
            setDisplayedText('');
        }
    }, [activeConversationId, conversations]);

    // Auto-scroll chat view
    useEffect(() => {
        if (!usePlanetView) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [usePlanetView, conversations, activeConversationId]);

    // Initialize stars
    useEffect(() => {
        starsRef.current = Array.from({ length: 200 }, () => ({
            x: Math.random() * 2 - 1,
            y: Math.random() * 2 - 1,
            z: Math.random(),
            brightness: Math.random()
        }));
    }, []);

    // Handle rotation when step changes
    useEffect(() => {
        if (currentStepIndex >= 0 && journeySteps[currentStepIndex]) {
            const step = journeySteps[currentStepIndex];
            rotationRef.current.targetY = -step.position.lng * Math.PI / 180;
        }
    }, [currentStepIndex, journeySteps]);

    // 2D Canvas Planet Rendering
    useEffect(() => {
        if (!usePlanetView) return;
        
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = 0;
        let height = 0;

        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            width = rect.width * dpr;
            height = rect.height * dpr;
            canvas.width = width;
            canvas.height = height;
        };
        
        resize();
        window.addEventListener('resize', resize);

        // Mouse/touch handlers
        const handlePointerDown = (e: PointerEvent) => {
            dragRef.current.isDragging = true;
            dragRef.current.lastX = e.clientX;
            canvas.style.cursor = 'grabbing';
        };

        const handlePointerMove = (e: PointerEvent) => {
            if (!dragRef.current.isDragging) return;
            const deltaX = e.clientX - dragRef.current.lastX;
            rotationRef.current.velocity = deltaX * 0.008;
            rotationRef.current.y += deltaX * 0.008;
            rotationRef.current.targetY = rotationRef.current.y;
            dragRef.current.lastX = e.clientX;
        };

        const handlePointerUp = () => {
            dragRef.current.isDragging = false;
            canvas.style.cursor = 'grab';
        };

        canvas.addEventListener('pointerdown', handlePointerDown);
        canvas.addEventListener('pointermove', handlePointerMove);
        canvas.addEventListener('pointerup', handlePointerUp);
        canvas.addEventListener('pointerleave', handlePointerUp);
        canvas.style.cursor = 'grab';

        const drawPlanet = () => {
            const dpr = window.devicePixelRatio || 1;
            const w = width / dpr;
            const h = height / dpr;
            
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, w, h);

            // Stars
            starsRef.current.forEach(star => {
                const twinkle = 0.3 + Math.sin(Date.now() * 0.002 + star.brightness * 10) * 0.5;
                ctx.fillStyle = `rgba(255, 255, 255, ${star.z * twinkle * 0.8})`;
                ctx.beginPath();
                ctx.arc((star.x + 1) * w / 2, (star.y + 1) * h / 2, star.brightness * 1.5 + 0.5, 0, Math.PI * 2);
                ctx.fill();
            });

            const centerX = w * 0.62;
            const centerY = h * 0.48;
            const radius = Math.min(w, h) * 0.30;

            // Rotation with momentum
            if (!dragRef.current.isDragging) {
                rotationRef.current.y += (rotationRef.current.targetY - rotationRef.current.y) * 0.05;
                rotationRef.current.velocity *= 0.96;
                rotationRef.current.y += rotationRef.current.velocity;
                rotationRef.current.targetY = rotationRef.current.y;
            }
            
            if (!dragRef.current.isDragging && Math.abs(rotationRef.current.velocity) < 0.001 && journeySteps.length === 0) {
                rotationRef.current.y += 0.002;
                rotationRef.current.targetY = rotationRef.current.y;
            }
            
            const rotation = rotationRef.current.y;

            // Planet glow
            const glowGradient = ctx.createRadialGradient(centerX, centerY, radius * 0.9, centerX, centerY, radius * 1.5);
            glowGradient.addColorStop(0, 'rgba(100, 120, 255, 0.08)');
            glowGradient.addColorStop(0.5, 'rgba(100, 120, 255, 0.02)');
            glowGradient.addColorStop(1, 'transparent');
            ctx.fillStyle = glowGradient;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius * 1.5, 0, Math.PI * 2);
            ctx.fill();

            // Planet body
            const planetGrad = ctx.createRadialGradient(centerX - radius * 0.3, centerY - radius * 0.3, 0, centerX, centerY, radius);
            planetGrad.addColorStop(0, '#1a1a2e');
            planetGrad.addColorStop(1, '#0a0a12');
            ctx.fillStyle = planetGrad;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.fill();

            // Grid lines
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.lineWidth = 1;
            
            for (let i = 0; i < 12; i++) {
                const angle = (i / 12) * Math.PI + rotation;
                const xScale = Math.cos(angle);
                if (Math.abs(xScale) > 0.01) {
                    ctx.beginPath();
                    ctx.ellipse(centerX, centerY, Math.abs(xScale) * radius, radius, 0, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }

            for (let i = 1; i < 6; i++) {
                const latRadius = radius * Math.sin((i / 6) * Math.PI);
                const y = centerY - radius * Math.cos((i / 6) * Math.PI);
                ctx.beginPath();
                ctx.ellipse(centerX, y, latRadius, latRadius * 0.3, 0, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Connection lines
            if (journeySteps.length > 1) {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
                ctx.lineWidth = 1.5;
                ctx.setLineDash([6, 4]);
                
                for (let i = 0; i < journeySteps.length - 1; i++) {
                    const step = journeySteps[i];
                    const nextStep = journeySteps[i + 1];
                    
                    const lat1 = step.position.lat * Math.PI / 180;
                    const lng1 = (step.position.lng * Math.PI / 180) + rotation;
                    const lat2 = nextStep.position.lat * Math.PI / 180;
                    const lng2 = (nextStep.position.lng * Math.PI / 180) + rotation;
                    
                    const vis1 = Math.cos(lng1);
                    const vis2 = Math.cos(lng2);
                    
                    if (vis1 > -0.1 && vis2 > -0.1) {
                        const x1 = centerX + Math.sin(lng1) * Math.cos(lat1) * radius;
                        const y1 = centerY - Math.sin(lat1) * radius;
                        const x2 = centerX + Math.sin(lng2) * Math.cos(lat2) * radius;
                        const y2 = centerY - Math.sin(lat2) * radius;
                        
                        ctx.beginPath();
                        ctx.moveTo(x1, y1);
                        ctx.lineTo(x2, y2);
                        ctx.stroke();
                    }
                }
                ctx.setLineDash([]);
            }

            // Journey markers
            journeySteps.forEach((step, index) => {
                const lat = step.position.lat * Math.PI / 180;
                const lng = (step.position.lng * Math.PI / 180) + rotation;
                const visibility = Math.cos(lng);
                if (visibility < -0.1) return;

                const x = centerX + Math.sin(lng) * Math.cos(lat) * radius;
                const y = centerY - Math.sin(lat) * radius;
                const scale = 0.5 + visibility * 0.5;
                const markerSize = 12 * scale;

                const isActive = index === currentStepIndex;
                const isCompleted = index < currentStepIndex;

                if (isActive) {
                    const pulseSize = markerSize * (2.5 + Math.sin(Date.now() * 0.004) * 0.8);
                    const glowGrad = ctx.createRadialGradient(x, y, 0, x, y, pulseSize * 2);
                    glowGrad.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
                    glowGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.15)');
                    glowGrad.addColorStop(1, 'transparent');
                    ctx.fillStyle = glowGrad;
                    ctx.beginPath();
                    ctx.arc(x, y, pulseSize * 2, 0, Math.PI * 2);
                    ctx.fill();
                }

                ctx.beginPath();
                ctx.arc(x, y, markerSize, 0, Math.PI * 2);
                
                if (isActive) {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.shadowColor = '#FFFFFF';
                    ctx.shadowBlur = 20;
                } else if (isCompleted) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                    ctx.shadowBlur = 0;
                } else {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
                    ctx.shadowBlur = 0;
                }
                ctx.fill();
                ctx.shadowBlur = 0;

                ctx.strokeStyle = isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.4)';
                ctx.lineWidth = isActive ? 2.5 : 1.5;
                ctx.stroke();

                ctx.fillStyle = isActive ? '#000000' : 'rgba(255, 255, 255, 0.9)';
                ctx.font = `bold ${11 * scale}px system-ui, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`${index + 1}`, x, y);
            });

            // Planet highlight
            const edgeGradient = ctx.createRadialGradient(centerX - radius * 0.3, centerY - radius * 0.3, 0, centerX, centerY, radius);
            edgeGradient.addColorStop(0, 'rgba(255, 255, 255, 0.06)');
            edgeGradient.addColorStop(0.7, 'transparent');
            ctx.fillStyle = edgeGradient;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.stroke();

            animationRef.current = requestAnimationFrame(drawPlanet);
        };

        drawPlanet();

        return () => {
            window.removeEventListener('resize', resize);
            canvas.removeEventListener('pointerdown', handlePointerDown);
            canvas.removeEventListener('pointermove', handlePointerMove);
            canvas.removeEventListener('pointerup', handlePointerUp);
            canvas.removeEventListener('pointerleave', handlePointerUp);
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [usePlanetView, journeySteps, currentStepIndex]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 100) + 'px';
        }
    }, [chatInput]);

    // Typewriter effect
    const typeText = useCallback((text: string) => {
        if (typingRef.current) clearInterval(typingRef.current);
        if (!text) { setDisplayedText(''); setIsTyping(false); return; }
        
        setIsTyping(true);
        setDisplayedText('');
        let i = 0;
        
        typingRef.current = window.setInterval(() => {
            if (i < text.length) {
                setDisplayedText(prev => prev + text[i]);
                i++;
            } else {
                if (typingRef.current) clearInterval(typingRef.current);
                setIsTyping(false);
            }
        }, 12);
    }, []);

    // Navigate to step
    const navigateToStep = useCallback((stepIndex: number) => {
        if (stepIndex < 0 || stepIndex >= journeySteps.length) return;

        setJourneySteps(prev => prev.map((s, i) => ({
            ...s,
            isActive: i === stepIndex,
            isCompleted: i < stepIndex
        })));
        
        setCurrentStepIndex(stepIndex);
        typeText(journeySteps[stepIndex]?.content || '');
    }, [journeySteps, typeText]);

    // Create new conversation
    const createConversation = () => {
        const newConvo: GuideConversation = {
            id: `j-${Date.now()}`,
            name: `Journey ${conversations.length + 1}`,
            createdAt: Date.now(),
            messages: [],
            journeySteps: []
        };
        setConversations(prev => [...prev, newConvo]);
        setActiveConversationId(newConvo.id);
        resetJourney();
        setShowJourneysList(false);
    };

    // Start rename
    const startRename = (convo: GuideConversation) => {
        setEditingJourneyId(convo.id);
        setEditingName(convo.name);
    };

    // Save rename
    const saveRename = () => {
        if (editingJourneyId && editingName.trim()) {
            setConversations(prev => prev.map(c => 
                c.id === editingJourneyId ? { ...c, name: editingName.trim() } : c
            ));
        }
        setEditingJourneyId(null);
        setEditingName('');
    };

    // Delete conversation
    const deleteConversation = (id: string) => {
        setConversations(prev => prev.filter(c => c.id !== id));
        if (activeConversationId === id) {
            setActiveConversationId(null);
            resetJourney();
        }
    };

    // IMPROVED: Parse AI response into multiple steps
    const parseAIResponseToSteps = (response: string): JourneyStep[] => {
        if (!response || typeof response !== 'string') {
            return [{ id: 's-0', title: 'Guidance', content: 'No response received.', position: { lat: 20, lng: 0 }, isActive: false, isCompleted: false }];
        }

        // Clean the response
        let clean = response.replace(/\*\*/g, '').replace(/\*/g, '').trim();
        
        const steps: JourneyStep[] = [];
        
        // Generate spread positions
        const getPosition = (index: number, total: number) => ({
            lat: 35 - (index * (70 / Math.max(total - 1, 1))) + (Math.random() - 0.5) * 10,
            lng: -120 + (index * (240 / Math.max(total - 1, 1))) + (Math.random() - 0.5) * 10
        });

        // Pattern 1: Numbered steps (1. or 1) or Step 1:)
        const numberedRegex = /(?:^|\n)\s*(?:Step\s*)?(\d+)[.):\-]\s*([^\n]+(?:\n(?!\s*(?:Step\s*)?\d+[.):\-])[^\n]*)*)/gi;
        let match;
        const numberedSteps: { num: number; content: string }[] = [];
        
        while ((match = numberedRegex.exec(clean)) !== null) {
            const content = (match[2] || '').replace(/\n+/g, ' ').trim();
            if (content.length > 10) {
                numberedSteps.push({ num: parseInt(match[1]), content });
            }
        }
        
        if (numberedSteps.length >= 2) {
            numberedSteps.sort((a, b) => a.num - b.num);
            const total = Math.min(numberedSteps.length, 6);
            return numberedSteps.slice(0, total).map((s, i) => ({
                id: `s-${i}`,
                title: `Step ${i + 1}`,
                content: s.content,
                position: getPosition(i, total),
                isActive: false,
                isCompleted: false
            }));
        }

        // Pattern 2: Bullet points
        const bulletRegex = /(?:^|\n)\s*[-•]\s*([^\n]+)/g;
        const bulletSteps: string[] = [];
        
        while ((match = bulletRegex.exec(clean)) !== null) {
            const content = (match[1] || '').trim();
            if (content.length > 10) {
                bulletSteps.push(content);
            }
        }
        
        if (bulletSteps.length >= 2) {
            const total = Math.min(bulletSteps.length, 6);
            return bulletSteps.slice(0, total).map((content, i) => ({
                id: `s-${i}`,
                title: `Step ${i + 1}`,
                content,
                position: getPosition(i, total),
                isActive: false,
                isCompleted: false
            }));
        }

        // Pattern 3: Paragraphs
        const paragraphs = clean.split(/\n\n+/).filter(p => p.trim().length > 30);
        if (paragraphs.length >= 2) {
            const total = Math.min(paragraphs.length, 5);
            return paragraphs.slice(0, total).map((p, i) => ({
                id: `s-${i}`,
                title: `Step ${i + 1}`,
                content: p.replace(/\n/g, ' ').trim(),
                position: getPosition(i, total),
                isActive: false,
                isCompleted: false
            }));
        }

        // Pattern 4: Split by sentences
        const sentences = clean.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 15);
        if (sentences.length >= 3) {
            const numSteps = Math.min(Math.max(Math.ceil(sentences.length / 2), 3), 5);
            const perStep = Math.ceil(sentences.length / numSteps);
            const chunks: string[] = [];
            
            for (let i = 0; i < numSteps; i++) {
                const chunk = sentences.slice(i * perStep, (i + 1) * perStep).join(' ').trim();
                if (chunk.length > 20) chunks.push(chunk);
            }
            
            if (chunks.length >= 2) {
                return chunks.map((content, i) => ({
                    id: `s-${i}`,
                    title: `Step ${i + 1}`,
                    content,
                    position: getPosition(i, chunks.length),
                    isActive: false,
                    isCompleted: false
                }));
            }
        }

        // Fallback: single step
        return [{
            id: 's-0',
            title: 'Guidance',
            content: clean,
            position: { lat: 20, lng: 0 },
            isActive: false,
            isCompleted: false
        }];
    };

    // Send message
    const handleSendMessage = async () => {
        const message = chatInput.trim();
        if (!message || !user.goal) return;

        const safetyCheck = await checkContentSafety(message);
        if (!safetyCheck.isSafe) {
            alert("Please keep the conversation appropriate.");
            return;
        }

        // Auto-create conversation if needed
        let convoId = activeConversationId;
        if (!convoId) {
            const newConvo: GuideConversation = {
                id: `j-${Date.now()}`,
                name: message.slice(0, 35) + (message.length > 35 ? '...' : ''),
                createdAt: Date.now(),
                messages: [],
                journeySteps: []
            };
            setConversations(prev => [...prev, newConvo]);
            convoId = newConvo.id;
            setActiveConversationId(convoId);
        }

        // Save user message
        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            text: message,
            timestamp: Date.now()
        };
        
        setConversations(prev => prev.map(c => 
            c.id === convoId ? { ...c, messages: [...c.messages, userMessage] } : c
        ));

        setChatInput('');
        setIsChatLoading(true);
        setJourneySteps([]);
        setCurrentStepIndex(-1);
        setDisplayedText('');
        setIsJourneyActive(false);

        try {
            const convo = conversations.find(c => c.id === convoId);
            const history = convo?.messages || [];

            const response = await getChatResponse(
                user.goal,
                history,
                message,
                user.userProfile || '',
                user.dailyTasks || [],
                user.connectedApps || [],
                undefined,
                user.extraLogs || []
            );

            const validResponse = (response && typeof response === 'string') 
                ? response 
                : 'I had trouble generating a response. Please try again.';

            // Save AI response
            const aiMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                text: validResponse,
                timestamp: Date.now()
            };

            // Parse into steps
            const steps = parseAIResponseToSteps(validResponse);

            // Update conversation
            setConversations(prev => prev.map(c => 
                c.id === convoId ? { 
                    ...c, 
                    messages: [...c.messages, aiMessage],
                    journeySteps: steps
                } : c
            ));

            setJourneySteps(steps);
            setIsJourneyActive(true);

            // Navigate to first step
            setTimeout(() => {
                setCurrentStepIndex(0);
                typeText(steps[0]?.content || '');
            }, 400);

        } catch (error) {
            console.error('Chat error:', error);
            setDisplayedText("I'm having trouble connecting. Please try again.");
            setIsJourneyActive(true);
        } finally {
            setIsChatLoading(false);
        }
    };

    const goToNextStep = () => {
        if (currentStepIndex < journeySteps.length - 1) {
            navigateToStep(currentStepIndex + 1);
        }
    };

    const goToPrevStep = () => {
        if (currentStepIndex > 0) {
            navigateToStep(currentStepIndex - 1);
        }
    };

    const resetJourney = () => {
        setJourneySteps([]);
        setCurrentStepIndex(-1);
        setIsJourneyActive(false);
        setDisplayedText('');
        rotationRef.current.targetY = 0;
    };

    const formatTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const activeConvo = conversations.find(c => c.id === activeConversationId);

    // ========== JOURNEYS LIST VIEW ==========
    if (showJourneysList) {
        return (
            <div className="h-full w-full flex flex-col" style={{ backgroundColor: '#000000' }}>
                {/* Animated stars */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {Array.from({ length: 40 }).map((_, i) => (
                        <div
                            key={i}
                            className="absolute rounded-full bg-white animate-pulse"
                            style={{
                                width: Math.random() * 2 + 1 + 'px',
                                height: Math.random() * 2 + 1 + 'px',
                                left: Math.random() * 100 + '%',
                                top: Math.random() * 100 + '%',
                                opacity: Math.random() * 0.6 + 0.2,
                                animationDelay: Math.random() * 3 + 's',
                                animationDuration: Math.random() * 2 + 2 + 's'
                            }}
                        />
                    ))}
                </div>

                {/* Header */}
                <div className="relative z-10 flex items-center justify-between px-5 pt-safe pb-4 border-b border-white/10">
                    <button onClick={() => setShowJourneysList(false)} className="p-2 -ml-2 rounded-xl text-white/50 active:text-white">
                        <Icons.ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="text-center">
                        <h1 className="text-white font-bold text-lg">Your Journeys</h1>
                        <p className="text-white/40 text-xs">{conversations.length} explorations</p>
                    </div>
                    <button onClick={createConversation} className="p-2 -mr-2 rounded-xl text-white/50 active:text-white">
                        <Icons.Plus className="w-5 h-5" />
                    </button>
                </div>

                {/* List */}
                <div className="relative z-10 flex-1 overflow-y-auto px-5 py-4 pb-safe">
                    {/* New Journey */}
                    <button
                        onClick={createConversation}
                        className="w-full p-5 mb-5 rounded-2xl border-2 border-dashed border-white/20 active:border-white/40 flex flex-col items-center gap-3"
                    >
                        <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
                            <Icons.Plus className="w-7 h-7 text-white/50" />
                        </div>
                        <div className="text-center">
                            <p className="text-white/70 font-medium">Start New Journey</p>
                            <p className="text-white/30 text-xs mt-1">Ask your guide anything</p>
                        </div>
                    </button>

                    {conversations.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                                <Icons.Globe className="w-10 h-10 text-white/20" />
                            </div>
                            <p className="text-white/50 font-medium mb-1">No journeys yet</p>
                            <p className="text-white/30 text-sm">Start exploring above</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {conversations.map((convo, index) => {
                                const isActive = convo.id === activeConversationId;
                                const hue = (index * 47) % 360;
                                
                                return (
                                    <div
                                        key={convo.id}
                                        className={`rounded-2xl overflow-hidden transition-all ${isActive ? 'ring-2 ring-white/30' : ''}`}
                                        style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                                    >
                                        {editingJourneyId === convo.id ? (
                                            <div className="p-4">
                                                <input
                                                    type="text"
                                                    value={editingName}
                                                    onChange={e => setEditingName(e.target.value)}
                                                    className="w-full bg-white/10 border border-white/30 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/50 mb-3"
                                                    autoFocus
                                                    onKeyDown={e => { if (e.key === 'Enter') saveRename(); if (e.key === 'Escape') setEditingJourneyId(null); }}
                                                    placeholder="Journey name..."
                                                />
                                                <div className="flex gap-2">
                                                    <button onClick={() => setEditingJourneyId(null)} className="flex-1 py-2.5 rounded-xl border border-white/20 text-white/60 text-sm font-medium">Cancel</button>
                                                    <button onClick={saveRename} className="flex-1 py-2.5 rounded-xl bg-white text-black text-sm font-bold">Save</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-4 flex items-center gap-4">
                                                {/* Mini planet */}
                                                <div className="relative flex-shrink-0">
                                                    <div 
                                                        className="w-14 h-14 rounded-full flex items-center justify-center"
                                                        style={{ 
                                                            background: `radial-gradient(circle at 30% 30%, hsl(${hue}, 40%, 25%), #0a0a12)`,
                                                            boxShadow: `0 0 20px hsla(${hue}, 50%, 40%, 0.3), inset -3px -3px 8px rgba(0,0,0,0.5)`
                                                        }}
                                                    >
                                                        <div className="absolute inset-2 rounded-full border border-white/10" />
                                                        <span className="text-white font-bold text-sm">
                                                            {convo.journeySteps?.length || convo.messages?.length || 0}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Info */}
                                                <button
                                                    onClick={() => { setActiveConversationId(convo.id); setShowJourneysList(false); }}
                                                    className="flex-1 text-left min-w-0"
                                                >
                                                    <h3 className="text-white font-semibold text-sm truncate">{convo.name}</h3>
                                                    <p className="text-white/40 text-xs mt-1">
                                                        {convo.journeySteps?.length || 0} steps · {new Date(convo.createdAt).toLocaleDateString()}
                                                    </p>
                                                </button>

                                                {/* Actions */}
                                                <button onClick={() => startRename(convo)} className="p-2 text-white/30 active:text-white rounded-lg">
                                                    <Icons.Edit className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => { if (confirm('Delete journey?')) deleteConversation(convo.id); }} className="p-2 text-white/30 active:text-red-400 rounded-lg">
                                                    <Icons.Trash className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ========== CHAT VIEW ==========
    if (!usePlanetView) {
        return (
            <div className="h-full w-full flex flex-col" style={{ backgroundColor: '#000000' }}>
                <div className="flex items-center justify-between px-4 pt-safe pb-2 border-b border-white/10">
                    <button onClick={() => setView(AppView.DASHBOARD)} className="p-2 rounded-xl text-white/50 active:text-white">
                        <Icons.ArrowLeft className="w-5 h-5" />
                    </button>
                    <button onClick={() => setShowJourneysList(true)} className="text-center px-3 py-1 rounded-xl active:bg-white/10">
                        <h1 className="text-white font-bold text-sm">{activeConvo?.name || 'THE GUIDE'}</h1>
                        <p className="text-white/30 text-[10px]">Tap to see journeys</p>
                    </button>
                    <button onClick={() => setUsePlanetView(true)} className="p-2 rounded-xl text-white/50 active:text-white">
                        <Icons.Globe className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4">
                    {(!activeConvo || activeConvo.messages.length === 0) && (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                                <Icons.Zap className="w-8 h-8 text-white/30" />
                            </div>
                            <h2 className="text-white font-bold text-lg mb-2">Ask Your Guide</h2>
                            <p className="text-white/40 text-sm">What do you need help with?</p>
                        </div>
                    )}

                    {activeConvo?.messages.map((msg) => (
                        <div key={msg.id} className={`flex mb-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className="max-w-[85%]">
                                {msg.role !== 'user' && (
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center">
                                            <Icons.Zap className="w-3 h-3 text-white/60" />
                                        </div>
                                        <span className="text-white/40 text-xs">Guide</span>
                                    </div>
                                )}
                                <div className={`rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-white text-gray-900 rounded-br-md' : 'bg-white/10 text-white/90 border border-white/10 rounded-bl-md'}`}>
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                                </div>
                                <p className={`text-[10px] text-white/30 mt-1 ${msg.role === 'user' ? 'text-right' : ''}`}>
                                    {msg.timestamp ? formatTime(msg.timestamp) : ''}
                                </p>
                            </div>
                        </div>
                    ))}
                    
                    {isChatLoading && (
                        <div className="flex justify-start mb-4">
                            <div className="bg-white/10 rounded-2xl rounded-bl-md px-4 py-3 border border-white/10">
                                <div className="flex gap-1.5">
                                    {[0, 1, 2].map(i => (
                                        <div key={i} className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="px-4 pb-4" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
                    <div className="bg-white/5 backdrop-blur rounded-xl border border-white/10">
                        <div className="flex items-center gap-2 px-3 py-2">
                            <input
                                type="text"
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                placeholder="Ask anything..."
                                className="flex-1 bg-transparent text-white text-sm placeholder:text-white/30 focus:outline-none"
                                style={{ fontSize: '16px' }}
                                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={!chatInput.trim() || isChatLoading}
                                className={`p-2 rounded-lg ${chatInput.trim() && !isChatLoading ? 'bg-white text-black' : 'bg-white/10 text-white/30'}`}
                            >
                                <Icons.Send className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ========== PLANET VIEW ==========
    return (
        <div className="h-full w-full flex flex-col overflow-hidden relative" style={{ backgroundColor: '#000000' }}>
            <canvas 
                ref={canvasRef} 
                className="absolute inset-0 w-full h-full"
                style={{ touchAction: 'none' }}
            />

            {/* Header */}
            <div className="relative z-10 flex items-center justify-between px-5 pt-safe pb-3">
                <button onClick={() => setView(AppView.DASHBOARD)} className="p-2 rounded-xl text-white/50 active:text-white">
                    <Icons.ArrowLeft className="w-5 h-5" />
                </button>
                
                <button onClick={() => setShowJourneysList(true)} className="text-center px-3 py-1 rounded-xl active:bg-white/10">
                    <h1 className="text-white font-bold text-sm">{activeConvo?.name || 'THE GUIDE'}</h1>
                    <p className="text-white/30 text-[10px]">Tap to see journeys</p>
                </button>

                <button onClick={() => setUsePlanetView(false)} className="p-2 rounded-xl text-white/50 active:text-white">
                    <Icons.MessageCircle className="w-5 h-5" />
                </button>
            </div>

            {/* Left Panel Content - FIXED TO SHOW */}
            <div className="flex-1 relative z-10">
                <div className="absolute left-0 top-0 bottom-0 w-[50%] flex flex-col justify-center pl-5 pr-3">
                    {!isJourneyActive && !isChatLoading && (
                        <div>
                            <p className="text-white/30 text-xs uppercase tracking-widest mb-3">Welcome</p>
                            <h2 className="text-white text-xl font-bold leading-tight mb-3">
                                What would you like guidance on?
                            </h2>
                            <p className="text-white/50 text-sm leading-relaxed mb-4">
                                Share your challenges or goals. I'll guide you step by step.
                            </p>
                            <div className="flex items-center gap-2 text-white/30 text-xs">
                                <Icons.RefreshCw className="w-3 h-3" />
                                <span>Drag to spin the planet</span>
                            </div>
                        </div>
                    )}

                    {isChatLoading && (
                        <div>
                            <div className="flex gap-1.5 mb-3">
                                {[0, 1, 2].map(i => (
                                    <div key={i} className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                                ))}
                            </div>
                            <p className="text-white/50 text-sm">Charting your journey...</p>
                        </div>
                    )}

                    {isJourneyActive && journeySteps.length > 0 && currentStepIndex >= 0 && (
                        <div>
                            <p className="text-white/40 text-xs uppercase tracking-widest mb-2">
                                Step {currentStepIndex + 1} of {journeySteps.length}
                            </p>

                            <h3 className="text-white text-lg font-bold mb-3">
                                {journeySteps[currentStepIndex]?.title}
                            </h3>

                            <div className="text-white/80 text-sm leading-relaxed mb-4 max-h-[140px] overflow-y-auto pr-2">
                                {displayedText}
                                {isTyping && <span className="inline-block w-0.5 h-4 bg-white ml-1 animate-pulse" />}
                            </div>

                            <div className="flex gap-3 mb-3">
                                <button
                                    onClick={goToPrevStep}
                                    disabled={currentStepIndex === 0}
                                    className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-1 ${
                                        currentStepIndex === 0 ? 'bg-white/5 text-white/30' : 'bg-white/15 text-white active:bg-white/25'
                                    }`}
                                >
                                    <Icons.ChevronLeft className="w-4 h-4" /> Prev
                                </button>
                                
                                {currentStepIndex < journeySteps.length - 1 ? (
                                    <button
                                        onClick={goToNextStep}
                                        disabled={isTyping}
                                        className="px-4 py-2 rounded-xl bg-white text-black text-sm font-bold flex items-center gap-1 active:bg-white/90 disabled:opacity-50"
                                    >
                                        Next <Icons.ChevronRight className="w-4 h-4" />
                                    </button>
                                ) : (
                                    <button
                                        onClick={resetJourney}
                                        className="px-4 py-2 rounded-xl bg-green-500 text-white text-sm font-bold flex items-center gap-1 active:bg-green-600"
                                    >
                                        <Icons.Check className="w-4 h-4" /> Done
                                    </button>
                                )}
                            </div>

                            <div className="flex gap-2">
                                {journeySteps.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => navigateToStep(idx)}
                                        className={`h-2 rounded-full transition-all ${
                                            idx === currentStepIndex ? 'bg-white w-6' : idx < currentStepIndex ? 'bg-white/60 w-2' : 'bg-white/25 w-2'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {isJourneyActive && displayedText && journeySteps.length === 0 && (
                        <p className="text-white/80 text-sm leading-relaxed">{displayedText}</p>
                    )}
                </div>
            </div>

            {/* Input */}
            <div className="relative z-10 px-5 pb-4" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
                <div className={`bg-white/5 backdrop-blur-xl rounded-2xl border transition-all ${isInputFocused ? 'border-white/30' : 'border-white/10'}`}>
                    <div className="flex items-end gap-2 p-3">
                        <textarea
                            ref={textareaRef}
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            onFocus={() => setIsInputFocused(true)}
                            onBlur={() => setIsInputFocused(false)}
                            placeholder="Ask for guidance..."
                            className="flex-1 bg-transparent text-white text-sm placeholder:text-white/30 resize-none focus:outline-none leading-relaxed"
                            rows={1}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={!chatInput.trim() || isChatLoading}
                            className={`p-3 rounded-xl transition-all ${
                                chatInput.trim() && !isChatLoading ? 'bg-white text-black' : 'bg-white/10 text-white/30'
                            }`}
                        >
                            <Icons.Send className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
