// views/ChatView.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../contexts/AppContext';
import { AppView, ChatMessage } from '../types';
import { Icons } from '../components/UIComponents';
import { getChatResponse, checkContentSafety } from '../services/geminiService';
import JourneysListView from './JourneysListView';

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
    
    // Journey State
    const [journeySteps, setJourneySteps] = useState<JourneyStep[]>([]);
    const [currentStepIndex, setCurrentStepIndex] = useState(-1);
    const [isJourneyActive, setIsJourneyActive] = useState(false);
    const [displayedText, setDisplayedText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const typingRef = useRef<NodeJS.Timeout | null>(null);
    
    // Canvas refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const animationRef = useRef<number>();
    const rotationRef = useRef({ x: 0.3, y: 0, autoRotate: true });
    const dragRef = useRef({ isDragging: false, lastX: 0, lastY: 0 });
    const starsRef = useRef<{ x: number; y: number; z: number; b: number }[]>([]);
    const markersRef = useRef<{ idx: number; x: number; y: number; r: number }[]>([]);

    // Save conversations to user
    useEffect(() => {
        setUser(prev => ({ ...prev, guideConversations: conversations } as any));
    }, [conversations]);

    // Load conversation data when switching
    useEffect(() => {
        const convo = conversations.find(c => c.id === activeConversationId);
        if (convo && convo.journeySteps?.length > 0) {
            setJourneySteps(convo.journeySteps);
            setIsJourneyActive(true);
            setCurrentStepIndex(0);
            setDisplayedText(convo.journeySteps[0].content);
        } else {
            setJourneySteps([]);
            setIsJourneyActive(false);
            setCurrentStepIndex(-1);
            setDisplayedText('');
        }
    }, [activeConversationId, conversations]);

    // Init stars
    useEffect(() => {
        starsRef.current = Array.from({ length: 200 }, () => ({
            x: Math.random() * 2 - 1,
            y: Math.random() * 2 - 1,
            z: Math.random(),
            b: Math.random()
        }));
    }, []);

    // Rotate to step
    useEffect(() => {
        if (currentStepIndex >= 0 && journeySteps[currentStepIndex]) {
            rotationRef.current.autoRotate = false;
        }
    }, [currentStepIndex, journeySteps]);

    // Canvas rendering - FULL 3D ROTATION
    useEffect(() => {
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

        const onDown = (e: PointerEvent) => {
            dragRef.current = { isDragging: true, lastX: e.clientX, lastY: e.clientY };
            rotationRef.current.autoRotate = false;
        };

        const onMove = (e: PointerEvent) => {
            if (!dragRef.current.isDragging) return;
            const dx = e.clientX - dragRef.current.lastX;
            const dy = e.clientY - dragRef.current.lastY;
            rotationRef.current.y += dx * 0.01;
            rotationRef.current.x += dy * 0.008;
            rotationRef.current.x = Math.max(-1.2, Math.min(1.2, rotationRef.current.x));
            dragRef.current.lastX = e.clientX;
            dragRef.current.lastY = e.clientY;
        };

        const onUp = () => { dragRef.current.isDragging = false; };

        const onClick = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            const cx = e.clientX - rect.left;
            const cy = e.clientY - rect.top;
            for (const m of markersRef.current) {
                if (Math.hypot(cx - m.x, cy - m.y) < m.r + 15) {
                    navigateToStep(m.idx);
                    break;
                }
            }
        };

        canvas.addEventListener('pointerdown', onDown);
        canvas.addEventListener('pointermove', onMove);
        canvas.addEventListener('pointerup', onUp);
        canvas.addEventListener('pointerleave', onUp);
        canvas.addEventListener('click', onClick);

        const draw = () => {
            const dpr = devicePixelRatio;
            const W = w / dpr, H = h / dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, W, H);

            // Stars
            starsRef.current.forEach(s => {
                const t = 0.3 + Math.sin(Date.now() * 0.001 + s.b * 10) * 0.4;
                ctx.fillStyle = `rgba(255,255,255,${s.z * t})`;
                ctx.beginPath();
                ctx.arc((s.x + 1) * W / 2, (s.y + 1) * H / 2, s.b + 0.5, 0, Math.PI * 2);
                ctx.fill();
            });

            const cx = W * 0.58, cy = H * 0.42, r = Math.min(W, H) * 0.26;

            // Auto rotate
            if (rotationRef.current.autoRotate && !dragRef.current.isDragging) {
                rotationRef.current.y += 0.003;
            }

            const rotY = rotationRef.current.y;
            const rotX = rotationRef.current.x;

            // Glow
            const glow = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r * 1.4);
            glow.addColorStop(0, 'rgba(255,255,255,0.06)');
            glow.addColorStop(1, 'transparent');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(cx, cy, r * 1.4, 0, Math.PI * 2);
            ctx.fill();

            // Planet
            ctx.fillStyle = '#080810';
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();

            // Grid - longitude
            ctx.strokeStyle = 'rgba(255,255,255,0.07)';
            ctx.lineWidth = 1;
            for (let i = 0; i < 12; i++) {
                const a = (i / 12) * Math.PI + rotY;
                const sx = Math.cos(a);
                if (Math.abs(sx) > 0.02) {
                    ctx.beginPath();
                    ctx.ellipse(cx, cy, Math.abs(sx) * r, r, 0, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }

            // Grid - latitude
            for (let i = 1; i < 6; i++) {
                const lr = r * Math.sin((i / 6) * Math.PI);
                const ly = cy - r * Math.cos((i / 6) * Math.PI);
                ctx.beginPath();
                ctx.ellipse(cx, ly, lr, lr * 0.3, 0, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Markers
            markersRef.current = [];
            
            journeySteps.forEach((step, idx) => {
                const lat = step.position.lat * Math.PI / 180;
                const lng = (step.position.lng * Math.PI / 180) + rotY;
                
                // 3D sphere projection
                const cosLat = Math.cos(lat);
                const sinLat = Math.sin(lat);
                const cosLng = Math.cos(lng);
                const sinLng = Math.sin(lng);
                
                // Apply X rotation (tilt)
                const y1 = sinLat;
                const z1 = cosLat * cosLng;
                const y2 = y1 * Math.cos(rotX) - z1 * Math.sin(rotX);
                const z2 = y1 * Math.sin(rotX) + z1 * Math.cos(rotX);
                
                // Check visibility (front of sphere)
                if (z2 < -0.1) return;
                
                const x = cx + cosLat * sinLng * r;
                const y = cy - y2 * r;
                const scale = 0.5 + (z2 + 1) * 0.25;
                const ms = 14 * scale;

                markersRef.current.push({ idx, x, y, r: ms });

                const isActive = idx === currentStepIndex;
                const isCompleted = idx < currentStepIndex;

                // Active glow
                if (isActive) {
                    const ps = ms * (2 + Math.sin(Date.now() * 0.005) * 0.5);
                    const g = ctx.createRadialGradient(x, y, 0, x, y, ps * 2);
                    g.addColorStop(0, 'rgba(255,255,255,0.5)');
                    g.addColorStop(0.5, 'rgba(255,255,255,0.1)');
                    g.addColorStop(1, 'transparent');
                    ctx.fillStyle = g;
                    ctx.beginPath();
                    ctx.arc(x, y, ps * 2, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Marker
                ctx.beginPath();
                ctx.arc(x, y, ms, 0, Math.PI * 2);
                ctx.fillStyle = isActive ? '#fff' : isCompleted ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)';
                if (isActive) {
                    ctx.shadowColor = '#fff';
                    ctx.shadowBlur = 15;
                }
                ctx.fill();
                ctx.shadowBlur = 0;

                ctx.strokeStyle = isActive ? '#fff' : 'rgba(255,255,255,0.4)';
                ctx.lineWidth = isActive ? 2 : 1;
                ctx.stroke();

                // Number
                ctx.fillStyle = isActive ? '#000' : '#fff';
                ctx.font = `bold ${13 * scale}px -apple-system, system-ui, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`${idx + 1}`, x, y);
            });

            // Planet border
            ctx.strokeStyle = 'rgba(255,255,255,0.1)';
            ctx.lineWidth = 1.5;
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
            canvas.removeEventListener('click', onClick);
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [journeySteps, currentStepIndex]);

    // Type text
    const typeText = useCallback((text: string) => {
        if (typingRef.current) clearInterval(typingRef.current);
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
        }, 8);
    }, []);

    // Navigate - FIXED
    const navigateToStep = useCallback((idx: number) => {
        if (idx < 0 || idx >= journeySteps.length) return;
        setCurrentStepIndex(idx);
        setJourneySteps(prev => prev.map((s, i) => ({
            ...s,
            isActive: i === idx,
            isCompleted: i < idx
        })));
        typeText(journeySteps[idx].content);
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
        rotationRef.current = { x: 0.3, y: 0, autoRotate: true };
        setShowJourneysList(false);
    };

    // Rename
    const renameConversation = (id: string, name: string) => {
        setConversations(prev => prev.map(c => c.id === id ? { ...c, name } : c));
    };

    // Delete
    const deleteConversation = (id: string) => {
        setConversations(prev => prev.filter(c => c.id !== id));
        if (activeConversationId === id) {
            setActiveConversationId(null);
            setJourneySteps([]);
            setIsJourneyActive(false);
        }
    };

    // Parse response - IMPROVED
    const parseSteps = (text: string): JourneyStep[] => {
        const clean = text.replace(/\*\*/g, '').trim();
        const steps: JourneyStep[] = [];

        // Try numbered
        const numReg = /(?:^|\n)\s*(\d+)[.):\-]\s*([^\n]+)/g;
        let m;
        while ((m = numReg.exec(clean)) !== null) {
            if (m[2]?.trim().length > 5) {
                steps.push({
                    id: `s-${steps.length}`,
                    title: `Step ${steps.length + 1}`,
                    content: m[2].trim(),
                    position: { lat: 30 - steps.length * 20, lng: -80 + steps.length * 45 },
                    isActive: false,
                    isCompleted: false
                });
            }
        }
        if (steps.length >= 2) return steps.slice(0, 6);

        // Try bullets
        const bulReg = /(?:^|\n)\s*[-•*]\s*([^\n]+)/g;
        while ((m = bulReg.exec(clean)) !== null) {
            if (m[1]?.trim().length > 5) {
                steps.push({
                    id: `s-${steps.length}`,
                    title: `Step ${steps.length + 1}`,
                    content: m[1].trim(),
                    position: { lat: 30 - steps.length * 20, lng: -80 + steps.length * 45 },
                    isActive: false,
                    isCompleted: false
                });
            }
        }
        if (steps.length >= 2) return steps.slice(0, 6);

        // Split sentences
        const sentences = clean.split(/(?<=[.!?])\s+/).filter(s => s.length > 20);
        if (sentences.length >= 3) {
            const count = Math.min(5, Math.ceil(sentences.length / 2));
            const per = Math.ceil(sentences.length / count);
            for (let i = 0; i < count; i++) {
                const content = sentences.slice(i * per, (i + 1) * per).join(' ').trim();
                if (content) {
                    steps.push({
                        id: `s-${i}`,
                        title: `Step ${i + 1}`,
                        content,
                        position: { lat: 30 - i * 20, lng: -80 + i * 45 },
                        isActive: false,
                        isCompleted: false
                    });
                }
            }
            if (steps.length >= 2) return steps;
        }

        // Single
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
    const handleSend = async () => {
        const msg = chatInput.trim();
        if (!msg || !user.goal) return;

        // Auto create conversation
        let convoId = activeConversationId;
        if (!convoId) {
            const newConvo: GuideConversation = {
                id: `j-${Date.now()}`,
                name: msg.slice(0, 30) + (msg.length > 30 ? '...' : ''),
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

        const userMsg: ChatMessage = { id: `${Date.now()}`, role: 'user', text: msg, timestamp: Date.now() };

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

            const aiMsg: ChatMessage = { id: `${Date.now() + 1}`, role: 'ai', text: response, timestamp: Date.now() };
            const steps = parseSteps(response);

            setConversations(prev => prev.map(c => 
                c.id === convoId ? { ...c, messages: [...c.messages, aiMsg], journeySteps: steps } : c
            ));

            setJourneySteps(steps);
            setIsJourneyActive(true);

            setTimeout(() => {
                setCurrentStepIndex(0);
                typeText(steps[0]?.content || '');
            }, 200);

        } catch (err) {
            console.error(err);
            setDisplayedText('Connection error. Please try again.');
            setIsJourneyActive(true);
        } finally {
            setIsChatLoading(false);
        }
    };

    // Navigation - FIXED
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

    // Show journeys list
    if (showJourneysList) {
        return (
            <JourneysListView
                conversations={conversations}
                onSelect={(id) => {
                    setActiveConversationId(id);
                    setShowJourneysList(false);
                }}
                onNew={createConversation}
                onRename={renameConversation}
                onDelete={deleteConversation}
                onClose={() => setShowJourneysList(false)}
                activeId={activeConversationId}
            />
        );
    }

    const activeConvo = conversations.find(c => c.id === activeConversationId);

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

                <button 
                    onClick={createConversation}
                    className="p-2 rounded-xl text-white/50 active:text-white"
                >
                    <Icons.Plus className="w-5 h-5" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 relative z-10 min-h-0">
                <div className="absolute left-0 top-0 bottom-0 w-[52%] flex flex-col justify-center pl-4 pr-2">
                    {!isJourneyActive && !isChatLoading && (
                        <div>
                            <p className="text-white/30 text-[10px] uppercase tracking-widest mb-2">Welcome</p>
                            <h2 className="text-white text-lg font-bold leading-tight mb-2">
                                What do you need help with?
                            </h2>
                            <p className="text-white/50 text-xs leading-relaxed">
                                Ask anything. I'll guide you step by step.
                            </p>
                        </div>
                    )}

                    {isChatLoading && (
                        <div>
                            <div className="flex gap-1 mb-2">
                                {[0, 1, 2].map(i => (
                                    <div key={i} className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                                ))}
                            </div>
                            <p className="text-white/40 text-xs">Thinking...</p>
                        </div>
                    )}

                    {isJourneyActive && journeySteps.length > 0 && currentStepIndex >= 0 && (
                        <div>
                            <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">
                                Step {currentStepIndex + 1} of {journeySteps.length}
                            </p>

                            <h3 className="text-white text-base font-bold mb-2">
                                {journeySteps[currentStepIndex]?.title}
                            </h3>

                            {/* Text - FIXED OVERFLOW */}
                            <div 
                                className="text-white/90 text-xs leading-relaxed mb-3 pr-1"
                                style={{ 
                                    maxHeight: '100px',
                                    overflowY: 'auto',
                                    WebkitOverflowScrolling: 'touch'
                                }}
                            >
                                {displayedText}
                                {isTyping && <span className="inline-block w-0.5 h-3 bg-white ml-0.5 animate-pulse" />}
                            </div>

                            {/* Buttons - FIXED */}
                            <div className="flex gap-2 mb-2">
                                <button
                                    onClick={goPrev}
                                    disabled={currentStepIndex === 0}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                        currentStepIndex === 0
                                            ? 'bg-white/5 text-white/20'
                                            : 'bg-white/10 text-white/80 active:bg-white/20'
                                    }`}
                                >
                                    Prev
                                </button>
                                <button
                                    onClick={goNext}
                                    disabled={currentStepIndex === journeySteps.length - 1}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                        currentStepIndex === journeySteps.length - 1
                                            ? 'bg-white/20 text-white/40'
                                            : 'bg-white text-black active:bg-white/90'
                                    }`}
                                >
                                    {currentStepIndex === journeySteps.length - 1 ? 'Done' : 'Next'}
                                </button>
                            </div>

                            {/* Dots */}
                            <div className="flex gap-1.5">
                                {journeySteps.map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => navigateToStep(i)}
                                        className={`h-1.5 rounded-full transition-all ${
                                            i === currentStepIndex ? 'bg-white w-4' : i < currentStepIndex ? 'bg-white/60 w-1.5' : 'bg-white/20 w-1.5'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Input - FIXED POSITIONING */}
            <div className="relative z-10 px-4 pb-4 flex-shrink-0" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
                <div className="bg-white/5 backdrop-blur rounded-xl border border-white/10">
                    <div className="flex items-center gap-2 px-3 py-2">
                        <input
                            type="text"
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            placeholder="Ask anything..."
                            className="flex-1 bg-transparent text-white text-sm placeholder:text-white/30 focus:outline-none"
                            style={{ fontSize: '16px' }}
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
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
