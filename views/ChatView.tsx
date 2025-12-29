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
    
    // Conversations
    const [conversations, setConversations] = useState<GuideConversation[]>(() => {
        return (user as any).guideConversations || [];
    });
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [showJourneysList, setShowJourneysList] = useState(false);
    
    // Toggle between planet and chat format
    const [usePlanetView, setUsePlanetView] = useState(true);
    
    // Renaming state
    const [editingJourneyId, setEditingJourneyId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    
    // Journey State
    const [journeySteps, setJourneySteps] = useState<JourneyStep[]>([]);
    const [currentStepIndex, setCurrentStepIndex] = useState(-1);
    const [isJourneyActive, setIsJourneyActive] = useState(false);
    const [displayedText, setDisplayedText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const typingRef = useRef<NodeJS.Timeout | null>(null);
    
    // Canvas refs for planet
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const animationRef = useRef<number>();
    const rotationRef = useRef({ x: 0.3, y: 0, velocityX: 0, velocityY: 0 });
    const dragRef = useRef({ isDragging: false, lastX: 0, lastY: 0, lastTime: 0 });
    const starsRef = useRef<{ x: number; y: number; z: number; b: number }[]>([]);
    const markersRef = useRef<{ idx: number; x: number; y: number; r: number }[]>([]);
    
    // Scroll ref for chat view
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Save conversations to user
    useEffect(() => {
        setUser(prev => ({ ...prev, guideConversations: conversations } as any));
    }, [conversations, setUser]);

    // Load conversation data when switching
    useEffect(() => {
        const convo = conversations.find(c => c.id === activeConversationId);
        if (convo) {
            if (convo.journeySteps?.length > 0) {
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
        } else {
            setJourneySteps([]);
            setIsJourneyActive(false);
            setCurrentStepIndex(-1);
            setDisplayedText('');
        }
    }, [activeConversationId, conversations]);

    // Auto-scroll for chat view
    useEffect(() => {
        if (!usePlanetView) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [usePlanetView, conversations, activeConversationId]);

    // Init stars
    useEffect(() => {
        starsRef.current = Array.from({ length: 300 }, () => ({
            x: Math.random() * 2 - 1,
            y: Math.random() * 2 - 1,
            z: Math.random(),
            b: Math.random()
        }));
    }, []);

    // Canvas rendering - FULLY SPINNABLE PLANET WITH MOMENTUM
    useEffect(() => {
        if (!usePlanetView) return;
        
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let w = 0, h = 0;

        const resize = () => {
            const rect = canvas.parentElement?.getBoundingClientRect();
            if (rect) {
                w = rect.width * devicePixelRatio;
                h = rect.height * devicePixelRatio;
                canvas.width = w;
                canvas.height = h;
                canvas.style.width = rect.width + 'px';
                canvas.style.height = rect.height + 'px';
            }
        };
        
        resize();
        window.addEventListener('resize', resize);

        // Pointer handlers for planet rotation with MOMENTUM
        const onDown = (e: PointerEvent) => {
            dragRef.current = { 
                isDragging: true, 
                lastX: e.clientX, 
                lastY: e.clientY,
                lastTime: Date.now()
            };
            // Stop momentum when grabbing
            rotationRef.current.velocityX = 0;
            rotationRef.current.velocityY = 0;
            canvas.style.cursor = 'grabbing';
        };

        const onMove = (e: PointerEvent) => {
            if (!dragRef.current.isDragging) return;
            
            const now = Date.now();
            const dt = Math.max(1, now - dragRef.current.lastTime);
            
            const dx = e.clientX - dragRef.current.lastX;
            const dy = e.clientY - dragRef.current.lastY;
            
            // Apply rotation
            rotationRef.current.y += dx * 0.008;
            rotationRef.current.x += dy * 0.006;
            
            // No clamping - allow full rotation!
            // rotationRef.current.x = Math.max(-Math.PI, Math.min(Math.PI, rotationRef.current.x));
            
            // Track velocity for momentum
            rotationRef.current.velocityY = (dx * 0.008) / dt * 16;
            rotationRef.current.velocityX = (dy * 0.006) / dt * 16;
            
            dragRef.current.lastX = e.clientX;
            dragRef.current.lastY = e.clientY;
            dragRef.current.lastTime = now;
        };

        const onUp = () => { 
            dragRef.current.isDragging = false;
            canvas.style.cursor = 'grab';
        };

        const onClick = (e: MouseEvent) => {
            // Only handle click if not dragging with momentum
            if (Math.abs(rotationRef.current.velocityX) > 0.001 || Math.abs(rotationRef.current.velocityY) > 0.001) {
                return;
            }
            
            const rect = canvas.getBoundingClientRect();
            const cx = e.clientX - rect.left;
            const cy = e.clientY - rect.top;
            for (const m of markersRef.current) {
                if (Math.hypot(cx - m.x, cy - m.y) < m.r + 20) {
                    navigateToStep(m.idx);
                    break;
                }
            }
        };

        canvas.style.cursor = 'grab';
        canvas.addEventListener('pointerdown', onDown);
        canvas.addEventListener('pointermove', onMove);
        canvas.addEventListener('pointerup', onUp);
        canvas.addEventListener('pointerleave', onUp);
        canvas.addEventListener('pointercancel', onUp);
        canvas.addEventListener('click', onClick);

        const draw = () => {
            const dpr = devicePixelRatio;
            const W = w / dpr, H = h / dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            
            // Deep space background
            const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
            bgGrad.addColorStop(0, '#050508');
            bgGrad.addColorStop(1, '#000000');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, W, H);

            // Twinkling stars
            starsRef.current.forEach(s => {
                const twinkle = 0.4 + Math.sin(Date.now() * 0.002 + s.b * 20) * 0.6;
                ctx.fillStyle = `rgba(255,255,255,${s.z * twinkle * 0.8})`;
                ctx.beginPath();
                ctx.arc((s.x + 1) * W / 2, (s.y + 1) * H / 2, s.b * 1.5 + 0.3, 0, Math.PI * 2);
                ctx.fill();
            });

            // Planet position and size
            const cx = W * 0.6, cy = H * 0.45, r = Math.min(W, H) * 0.28;

            // Apply momentum (friction decay)
            if (!dragRef.current.isDragging) {
                rotationRef.current.y += rotationRef.current.velocityY;
                rotationRef.current.x += rotationRef.current.velocityX;
                
                // Friction - slow down gradually
                rotationRef.current.velocityY *= 0.96;
                rotationRef.current.velocityX *= 0.96;
                
                // Add gentle auto-rotation when nearly stopped
                if (Math.abs(rotationRef.current.velocityY) < 0.0005) {
                    rotationRef.current.velocityY = 0.001;
                }
            }

            const rotY = rotationRef.current.y;
            const rotX = rotationRef.current.x;

            // Outer glow
            const glow = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r * 1.8);
            glow.addColorStop(0, 'rgba(100, 100, 255, 0.08)');
            glow.addColorStop(0.5, 'rgba(50, 50, 200, 0.03)');
            glow.addColorStop(1, 'transparent');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(cx, cy, r * 1.8, 0, Math.PI * 2);
            ctx.fill();

            // Planet body
            const planetGrad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0, cx, cy, r);
            planetGrad.addColorStop(0, '#151525');
            planetGrad.addColorStop(1, '#080810');
            ctx.fillStyle = planetGrad;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();

            // Grid lines - longitude
            ctx.strokeStyle = 'rgba(255,255,255,0.06)';
            ctx.lineWidth = 1;
            for (let i = 0; i < 16; i++) {
                const a = (i / 16) * Math.PI + rotY;
                const sx = Math.cos(a);
                if (Math.abs(sx) > 0.02) {
                    ctx.beginPath();
                    ctx.ellipse(cx, cy, Math.abs(sx) * r, r, 0, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }

            // Grid lines - latitude
            for (let i = 1; i < 8; i++) {
                const latAngle = (i / 8) * Math.PI;
                const lr = r * Math.sin(latAngle);
                const ly = cy - r * Math.cos(latAngle) * Math.cos(rotX);
                ctx.beginPath();
                ctx.ellipse(cx, ly, lr, lr * Math.abs(Math.sin(rotX)) * 0.3 + lr * 0.1, 0, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Draw journey markers
            markersRef.current = [];
            
            journeySteps.forEach((step, idx) => {
                const lat = step.position.lat * Math.PI / 180;
                const lng = (step.position.lng * Math.PI / 180) + rotY;
                
                // 3D sphere projection with full rotation
                const cosLat = Math.cos(lat);
                const sinLat = Math.sin(lat);
                const cosLng = Math.cos(lng);
                const sinLng = Math.sin(lng);
                
                // Rotate around X axis
                let y1 = sinLat;
                let z1 = cosLat * cosLng;
                const y2 = y1 * Math.cos(rotX) - z1 * Math.sin(rotX);
                const z2 = y1 * Math.sin(rotX) + z1 * Math.cos(rotX);
                
                // Only show if on front side
                if (z2 < -0.05) return;
                
                const x = cx + cosLat * sinLng * r;
                const y = cy - y2 * r;
                const depth = (z2 + 1) / 2;
                const scale = 0.5 + depth * 0.5;
                const ms = 16 * scale;

                markersRef.current.push({ idx, x, y, r: ms });

                const isActive = idx === currentStepIndex;
                const isCompleted = idx < currentStepIndex;

                // Glow for active marker
                if (isActive) {
                    const pulseSize = ms * (2.5 + Math.sin(Date.now() * 0.004) * 0.5);
                    const activeGlow = ctx.createRadialGradient(x, y, 0, x, y, pulseSize * 2);
                    activeGlow.addColorStop(0, 'rgba(255,255,255,0.6)');
                    activeGlow.addColorStop(0.4, 'rgba(255,255,255,0.2)');
                    activeGlow.addColorStop(1, 'transparent');
                    ctx.fillStyle = activeGlow;
                    ctx.beginPath();
                    ctx.arc(x, y, pulseSize * 2, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Marker circle
                ctx.beginPath();
                ctx.arc(x, y, ms, 0, Math.PI * 2);
                
                if (isActive) {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.shadowColor = '#FFFFFF';
                    ctx.shadowBlur = 20;
                } else if (isCompleted) {
                    ctx.fillStyle = 'rgba(255,255,255,0.75)';
                    ctx.shadowBlur = 0;
                } else {
                    ctx.fillStyle = 'rgba(255,255,255,0.25)';
                    ctx.shadowBlur = 0;
                }
                ctx.fill();
                ctx.shadowBlur = 0;

                // Marker border
                ctx.strokeStyle = isActive ? '#FFFFFF' : 'rgba(255,255,255,0.4)';
                ctx.lineWidth = isActive ? 2.5 : 1.5;
                ctx.stroke();

                // Step number
                ctx.fillStyle = isActive ? '#000000' : 'rgba(255,255,255,0.9)';
                ctx.font = `bold ${14 * scale}px -apple-system, system-ui, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`${idx + 1}`, x, y);
            });

            // Planet edge highlight
            const edgeGrad = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.4, 0, cx, cy, r);
            edgeGrad.addColorStop(0, 'rgba(255,255,255,0.1)');
            edgeGrad.addColorStop(0.6, 'transparent');
            ctx.fillStyle = edgeGrad;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();

            // Planet border
            ctx.strokeStyle = 'rgba(255,255,255,0.12)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.stroke();

            animationRef.current = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            window.removeEventListener('resize', resize);
            canvas.removeEventListener('pointerdown', onDown);
            canvas.removeEventListener('pointermove', onMove);
            canvas.removeEventListener('pointerup', onUp);
            canvas.removeEventListener('pointerleave', onUp);
            canvas.removeEventListener('pointercancel', onUp);
            canvas.removeEventListener('click', onClick);
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [usePlanetView, journeySteps, currentStepIndex]);

    // Type text with cleanup
    const typeText = useCallback((text: string) => {
        if (typingRef.current) clearInterval(typingRef.current);
        if (!text) {
            setDisplayedText('');
            setIsTyping(false);
            return;
        }
        setIsTyping(true);
        setDisplayedText('');
        let i = 0;
        typingRef.current = setInterval(() => {
            if (i < text.length) {
                setDisplayedText(t => t + text[i]);
                i++;
            } else {
                if (typingRef.current) clearInterval(typingRef.current);
                setIsTyping(false);
            }
        }, 6);
    }, []);

    // Navigate to step - FIXED
    const navigateToStep = useCallback((idx: number) => {
        if (idx < 0 || idx >= journeySteps.length) return;
        
        setCurrentStepIndex(idx);
        setJourneySteps(prev => prev.map((s, i) => ({
            ...s,
            isActive: i === idx,
            isCompleted: i < idx
        })));
        
        // Get the content and type it
        const step = journeySteps[idx];
        if (step?.content) {
            typeText(step.content);
        }
    }, [journeySteps, typeText]);

    // Create conversation
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
        setJourneySteps([]);
        setCurrentStepIndex(-1);
        setIsJourneyActive(false);
        setDisplayedText('');
        rotationRef.current = { x: 0.3, y: 0, velocityX: 0, velocityY: 0.001 };
        setShowJourneysList(false);
    };

    // Start renaming
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
            setJourneySteps([]);
            setIsJourneyActive(false);
        }
    };

    // IMPROVED: Parse response into steps - better extraction
    const parseSteps = (text: string): JourneyStep[] => {
        if (!text || typeof text !== 'string') {
            return [{
                id: 's-0',
                title: 'Guidance',
                content: 'I encountered an issue processing the response. Please try again.',
                position: { lat: 20, lng: 0 },
                isActive: false,
                isCompleted: false
            }];
        }

        // Clean the text thoroughly
        let clean = text
            .replace(/\*\*/g, '')
            .replace(/\*/g, '')
            .replace(/undefined/gi, '')
            .replace(/null/gi, '')
            .trim();
        
        const steps: JourneyStep[] = [];
        
        // Generate positions spread around the planet
        const getPosition = (index: number, total: number) => ({
            lat: 35 - (index * (70 / Math.max(total - 1, 1))),
            lng: -120 + (index * (240 / Math.max(total - 1, 1)))
        });

        // Pattern 1: Numbered steps like "1." or "1)" or "1:" or "Step 1:"
        const numberedRegex = /(?:^|\n)\s*(?:Step\s*)?(\d+)[.):\-]\s*([^\n]+(?:\n(?!\s*(?:Step\s*)?\d+[.):\-])(?!\n)[^\n]*)*)/gi;
        let match;
        const numberedMatches: string[] = [];
        
        while ((match = numberedRegex.exec(clean)) !== null) {
            const content = (match[2] || '').replace(/\n/g, ' ').trim();
            if (content.length > 15) {
                numberedMatches.push(content);
            }
        }
        
        if (numberedMatches.length >= 2) {
            const total = Math.min(numberedMatches.length, 6);
            return numberedMatches.slice(0, total).map((content, i) => ({
                id: `s-${i}`,
                title: `Step ${i + 1}`,
                content,
                position: getPosition(i, total),
                isActive: false,
                isCompleted: false
            }));
        }

        // Pattern 2: Bullet points
        const bulletRegex = /(?:^|\n)\s*[-•]\s*([^\n]+)/g;
        const bulletMatches: string[] = [];
        
        while ((match = bulletRegex.exec(clean)) !== null) {
            const content = (match[1] || '').trim();
            if (content.length > 15) {
                bulletMatches.push(content);
            }
        }
        
        if (bulletMatches.length >= 2) {
            const total = Math.min(bulletMatches.length, 6);
            return bulletMatches.slice(0, total).map((content, i) => ({
                id: `s-${i}`,
                title: `Step ${i + 1}`,
                content,
                position: getPosition(i, total),
                isActive: false,
                isCompleted: false
            }));
        }

        // Pattern 3: Paragraphs (double newline separated)
        const paragraphs = clean.split(/\n\n+/).filter(p => p.trim().length > 40);
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

        // Pattern 4: Split by sentences into chunks
        const sentences = clean.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 10);
        if (sentences.length >= 3) {
            const numSteps = Math.min(Math.max(Math.ceil(sentences.length / 2), 3), 5);
            const perStep = Math.ceil(sentences.length / numSteps);
            const chunks: string[] = [];
            
            for (let i = 0; i < numSteps; i++) {
                const chunk = sentences.slice(i * perStep, (i + 1) * perStep).join(' ').trim();
                if (chunk.length > 20) {
                    chunks.push(chunk);
                }
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

        // Fallback: Single step with full response
        return [{
            id: 's-0',
            title: 'Guidance',
            content: clean || 'No response received. Please try again.',
            position: { lat: 20, lng: 0 },
            isActive: false,
            isCompleted: false
        }];
    };

    // Send message
    const handleSend = async () => {
        const msg = chatInput.trim();
        if (!msg || !user.goal) return;

        // Auto create conversation if needed
        let convoId = activeConversationId;
        if (!convoId) {
            const newConvo: GuideConversation = {
                id: `j-${Date.now()}`,
                name: msg.slice(0, 35) + (msg.length > 35 ? '...' : ''),
                createdAt: Date.now(),
                messages: [],
                journeySteps: []
            };
            setConversations(prev => [...prev, newConvo]);
            convoId = newConvo.id;
            setActiveConversationId(convoId);
        }

        const safe = await checkContentSafety(msg);
        if (!safe.isSafe) {
            alert('Please keep it appropriate.');
            return;
        }

        const userMsg: ChatMessage = { 
            id: `${Date.now()}`, 
            role: 'user', 
            text: msg, 
            timestamp: Date.now() 
        };

        // Update conversation with user message
        setConversations(prev => prev.map(c => 
            c.id === convoId ? { ...c, messages: [...c.messages, userMsg] } : c
        ));

        setChatInput('');
        setIsChatLoading(true);
        setJourneySteps([]);
        setCurrentStepIndex(-1);
        setDisplayedText('');

        try {
            const convo = conversations.find(c => c.id === convoId);
            const history = convo?.messages || [];

            const response = await getChatResponse(
                user.goal,
                history,
                msg,
                user.userProfile || '',
                user.dailyTasks || [],
                user.connectedApps || [],
                undefined,
                user.extraLogs || []
            );

            const validResponse = (response && typeof response === 'string') 
                ? response 
                : 'I apologize, but I had trouble generating a response. Please try again.';

            const aiMsg: ChatMessage = { 
                id: `${Date.now() + 1}`, 
                role: 'ai', 
                text: validResponse, 
                timestamp: Date.now() 
            };
            
            const steps = parseSteps(validResponse);

            // Update conversation
            setConversations(prev => prev.map(c => 
                c.id === convoId ? { 
                    ...c, 
                    messages: [...c.messages, aiMsg], 
                    journeySteps: steps 
                } : c
            ));

            setJourneySteps(steps);
            setIsJourneyActive(true);

            // Navigate to first step
            setTimeout(() => {
                setCurrentStepIndex(0);
                if (steps[0]?.content) {
                    typeText(steps[0].content);
                }
            }, 300);

        } catch (err) {
            console.error('Chat error:', err);
            setDisplayedText('Connection error. Please try again.');
            setIsJourneyActive(true);
        } finally {
            setIsChatLoading(false);
        }
    };

    // Navigation - FIXED buttons
    const goNext = () => {
        if (currentStepIndex < journeySteps.length - 1) {
            navigateToStep(currentStepIndex + 1);
        }
    };

    const goPrev = () => {
        if (currentStepIndex > 0) {
            navigateToStep(currentStepIndex - 1);
        }
    };

    // Format time
    const formatTime = (ts: number) => {
        return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Get active conversation
    const activeConvo = conversations.find(c => c.id === activeConversationId);

    // ========== JOURNEYS LIST VIEW ==========
    if (showJourneysList) {
        return (
            <div className="h-full w-full bg-black flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-safe pb-4 border-b border-white/10">
                    <button 
                        onClick={() => setShowJourneysList(false)}
                        className="p-2 -ml-2 rounded-xl text-white/50 active:text-white"
                    >
                        <Icons.ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-white font-bold text-lg">Your Journeys</h1>
                    <button 
                        onClick={createConversation}
                        className="p-2 -mr-2 rounded-xl text-white/50 active:text-white"
                    >
                        <Icons.Plus className="w-5 h-5" />
                    </button>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto px-5 py-4 pb-safe">
                    {/* New Journey Button */}
                    <button
                        onClick={createConversation}
                        className="w-full p-4 mb-4 border-2 border-dashed border-white/20 rounded-2xl text-white/50 active:text-white active:border-white/40 transition-all flex items-center justify-center gap-3"
                    >
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                            <Icons.Plus className="w-5 h-5" />
                        </div>
                        <span className="font-medium">Start New Journey</span>
                    </button>

                    {conversations.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                                <Icons.MessageCircle className="w-8 h-8 text-white/20" />
                            </div>
                            <p className="text-white/40 text-sm">No journeys yet</p>
                            <p className="text-white/30 text-xs mt-1">Start a conversation to begin</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {conversations.map(convo => (
                                <div
                                    key={convo.id}
                                    className={`rounded-2xl transition-all overflow-hidden ${
                                        convo.id === activeConversationId 
                                            ? 'bg-white/10 ring-2 ring-white/20' 
                                            : 'bg-white/5'
                                    }`}
                                >
                                    {editingJourneyId === convo.id ? (
                                        // Editing mode
                                        <div className="p-4">
                                            <input
                                                type="text"
                                                value={editingName}
                                                onChange={e => setEditingName(e.target.value)}
                                                className="w-full bg-white/10 border border-white/30 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/50 mb-3"
                                                autoFocus
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') saveRename();
                                                    if (e.key === 'Escape') setEditingJourneyId(null);
                                                }}
                                                placeholder="Journey name..."
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setEditingJourneyId(null)}
                                                    className="flex-1 py-2.5 rounded-xl border border-white/20 text-white/60 text-sm font-medium active:bg-white/10"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={saveRename}
                                                    className="flex-1 py-2.5 rounded-xl bg-white text-black text-sm font-bold active:bg-white/90"
                                                >
                                                    Save
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        // Normal mode
                                        <div className="p-4 flex items-center gap-4">
                                            {/* Planet Icon */}
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center flex-shrink-0 relative">
                                                <div className="absolute inset-1 rounded-full border border-white/20" />
                                                <span className="text-white/60 text-xs font-bold">
                                                    {convo.journeySteps?.length || convo.messages?.length || 0}
                                                </span>
                                            </div>

                                            {/* Info - tap to select */}
                                            <button
                                                onClick={() => {
                                                    setActiveConversationId(convo.id);
                                                    setShowJourneysList(false);
                                                }}
                                                className="flex-1 text-left min-w-0"
                                            >
                                                <h3 className="text-white font-semibold text-sm truncate">
                                                    {convo.name}
                                                </h3>
                                                <p className="text-white/40 text-xs mt-0.5">
                                                    {convo.messages?.length || 0} messages · {new Date(convo.createdAt).toLocaleDateString()}
                                                </p>
                                            </button>

                                            {/* Edit button */}
                                            <button
                                                onClick={() => startRename(convo)}
                                                className="p-2 text-white/30 active:text-white rounded-lg"
                                            >
                                                <Icons.Edit className="w-4 h-4" />
                                            </button>

                                            {/* Delete button */}
                                            <button
                                                onClick={() => {
                                                    if (confirm('Delete this journey?')) {
                                                        deleteConversation(convo.id);
                                                    }
                                                }}
                                                className="p-2 text-white/30 active:text-red-400 rounded-lg"
                                            >
                                                <Icons.Trash className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ========== CHAT FORMAT VIEW ==========
    if (!usePlanetView) {
        return (
            <div className="h-full w-full bg-black flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-4 pt-safe pb-2 border-b border-white/10 flex-shrink-0">
                    <button 
                        onClick={() => setView(AppView.DASHBOARD)}
                        className="p-2 rounded-xl text-white/50 active:text-white"
                    >
                        <Icons.ArrowLeft className="w-5 h-5" />
                    </button>
                    
                    <button 
                        onClick={() => setShowJourneysList(true)}
                        className="text-center px-3 py-1 rounded-xl active:bg-white/10"
                    >
                        <h1 className="text-white font-bold text-sm">
                            {activeConvo?.name || 'THE GUIDE'}
                        </h1>
                        <p className="text-white/30 text-[10px]">Tap to see journeys</p>
                    </button>

                    <button 
                        onClick={() => setUsePlanetView(true)}
                        className="px-3 py-1.5 rounded-lg bg-white/10 text-white/70 text-xs font-medium active:bg-white/20"
                    >
                        Planet
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-4">
                    <div className="space-y-4">
                        {/* Welcome message if no conversation */}
                        {(!activeConvo || activeConvo.messages.length === 0) && (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl">✨</span>
                                </div>
                                <h2 className="text-white font-bold text-lg mb-2">Ask Your Guide</h2>
                                <p className="text-white/40 text-sm">What do you need help with?</p>
                            </div>
                        )}

                        {activeConvo?.messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className="max-w-[85%]">
                                    {msg.role !== 'user' && (
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center">
                                                <span className="text-xs">✨</span>
                                            </div>
                                            <span className="text-white/40 text-xs">Guide</span>
                                        </div>
                                    )}
                                    <div
                                        className={`rounded-2xl px-4 py-3 ${
                                            msg.role === 'user'
                                                ? 'bg-white text-gray-900 rounded-br-md'
                                                : 'bg-white/10 text-white/90 border border-white/10 rounded-bl-md'
                                        }`}
                                    >
                                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                                    </div>
                                    <p className={`text-[10px] text-white/30 mt-1 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                                        {msg.timestamp ? formatTime(msg.timestamp) : ''}
                                    </p>
                                </div>
                            </div>
                        ))}
                        
                        {isChatLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white/10 rounded-2xl rounded-bl-md px-4 py-3 border border-white/10">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* Input */}
                <div className="px-4 pb-4 flex-shrink-0" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
                    <div className="bg-white/5 backdrop-blur rounded-xl border border-white/10">
                        <div className="flex items-center gap-2 px-3 py-2">
                            <input
                                type="text"
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                placeholder="Ask anything..."
                                className="flex-1 bg-transparent text-white text-sm placeholder:text-white/30 focus:outline-none"
                                style={{ fontSize: '16px' }}
                                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                            />
                            <button
                                onClick={handleSend}
                                disabled={!chatInput.trim() || isChatLoading}
                                className={`p-2 rounded-lg transition-colors ${
                                    chatInput.trim() && !isChatLoading ? 'bg-white text-black' : 'bg-white/10 text-white/30'
                                }`}
                            >
                                <Icons.Send className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ========== PLANET VIEW (default) ==========
    return (
        <div ref={containerRef} className="h-full w-full bg-black flex flex-col overflow-hidden">
            {/* Canvas */}
            <canvas 
                ref={canvasRef} 
                className="absolute inset-0 w-full h-full"
                style={{ touchAction: 'none' }}
            />

            {/* Header */}
            <div className="relative z-10 flex items-center justify-between px-4 pt-safe pb-2 flex-shrink-0">
                <button 
                    onClick={() => setView(AppView.DASHBOARD)}
                    className="p-2 rounded-xl text-white/50 active:text-white"
                >
                    <Icons.ArrowLeft className="w-5 h-5" />
                </button>
                
                <button 
                    onClick={() => setShowJourneysList(true)}
                    className="text-center px-3 py-1 rounded-xl active:bg-white/10"
                >
                    <h1 className="text-white font-bold text-sm">
                        {activeConvo?.name || 'THE GUIDE'}
                    </h1>
                    <p className="text-white/30 text-[10px]">Tap to see journeys</p>
                </button>

                {/* Toggle to Chat button */}
                <button 
                    onClick={() => setUsePlanetView(false)}
                    className="px-3 py-1.5 rounded-lg bg-white/10 text-white/70 text-xs font-medium active:bg-white/20"
                >
                    Chat
                </button>
            </div>

            {/* Content - Left Panel */}
            <div className="flex-1 relative z-10 min-h-0">
                <div className="absolute left-0 top-0 bottom-0 w-[55%] flex flex-col justify-center pl-5 pr-3">
                    {!isJourneyActive && !isChatLoading && (
                        <div>
                            <p className="text-white/30 text-[10px] uppercase tracking-widest mb-2">Welcome</p>
                            <h2 className="text-white text-xl font-bold leading-tight mb-3">
                                What do you need help with?
                            </h2>
                            <p className="text-white/50 text-sm leading-relaxed mb-4">
                                Ask anything. I'll guide you step by step on your journey.
                            </p>
                            <p className="text-white/30 text-xs">
                                💡 Spin the planet for fun!
                            </p>
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
                            {/* Step indicator */}
                            <p className="text-white/50 text-xs uppercase tracking-wider mb-2">
                                Step {currentStepIndex + 1} of {journeySteps.length}
                            </p>

                            {/* Step title */}
                            <h3 className="text-white text-lg font-bold mb-3">
                                {journeySteps[currentStepIndex]?.title || `Step ${currentStepIndex + 1}`}
                            </h3>

                            {/* Content with scroll */}
                            <div 
                                className="text-white/85 text-sm leading-relaxed mb-4 pr-2 overflow-y-auto"
                                style={{ 
                                    maxHeight: '140px',
                                    WebkitOverflowScrolling: 'touch'
                                }}
                            >
                                {displayedText}
                                {isTyping && <span className="inline-block w-0.5 h-4 bg-white ml-1 animate-pulse" />}
                            </div>

                            {/* Navigation buttons - FIXED */}
                            <div className="flex gap-3 mb-3">
                                <button
                                    onClick={goPrev}
                                    disabled={currentStepIndex === 0}
                                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                                        currentStepIndex === 0
                                            ? 'bg-white/5 text-white/30 cursor-not-allowed'
                                            : 'bg-white/15 text-white active:bg-white/25'
                                    }`}
                                >
                                    ← Prev
                                </button>
                                
                                {currentStepIndex < journeySteps.length - 1 ? (
                                    <button
                                        onClick={goNext}
                                        className="px-4 py-2 rounded-xl bg-white text-black text-sm font-bold active:bg-white/90"
                                    >
                                        Next →
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => {
                                            // Reset for new question
                                            setIsJourneyActive(false);
                                            setJourneySteps([]);
                                            setCurrentStepIndex(-1);
                                            setDisplayedText('');
                                        }}
                                        className="px-4 py-2 rounded-xl bg-green-500 text-white text-sm font-bold active:bg-green-600"
                                    >
                                        ✓ Done
                                    </button>
                                )}
                            </div>

                            {/* Step dots */}
                            <div className="flex gap-2">
                                {journeySteps.map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => navigateToStep(i)}
                                        className={`h-2 rounded-full transition-all ${
                                            i === currentStepIndex 
                                                ? 'bg-white w-6' 
                                                : i < currentStepIndex 
                                                    ? 'bg-white/60 w-2' 
                                                    : 'bg-white/25 w-2'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Input */}
            <div className="relative z-10 px-4 pb-4 flex-shrink-0" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
                <div className="bg-white/8 backdrop-blur-xl rounded-2xl border border-white/15">
                    <div className="flex items-center gap-3 px-4 py-3">
                        <input
                            type="text"
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            placeholder="Ask anything..."
                            className="flex-1 bg-transparent text-white text-sm placeholder:text-white/40 focus:outline-none"
                            style={{ fontSize: '16px' }}
                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!chatInput.trim() || isChatLoading}
                            className={`p-2.5 rounded-xl transition-all ${
                                chatInput.trim() && !isChatLoading 
                                    ? 'bg-white text-black' 
                                    : 'bg-white/10 text-white/30'
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
