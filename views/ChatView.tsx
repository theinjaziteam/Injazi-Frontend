// views/ChatView.tsx
import React, { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useApp } from '../contexts/AppContext';
import { AppView, ChatMessage } from '../types';
import { Icons } from '../components/UIComponents';
import { getChatResponse, checkContentSafety } from '../services/geminiService';

// Types for journey steps
interface JourneyStep {
    id: string;
    title: string;
    content: string;
    position: { lat: number; lng: number };
    isActive: boolean;
    isCompleted: boolean;
}

// Error boundary for 3D canvas
class Canvas3DErrorBoundary extends React.Component<
    { children: React.ReactNode; fallback: React.ReactNode },
    { hasError: boolean }
> {
    constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('3D Canvas Error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback;
        }
        return this.props.children;
    }
}

// Lazy load Three.js components
const ThreeCanvas = React.lazy(() => import('./ChatView3D'));

// Fallback 2D Canvas Planet
function Fallback2DPlanet({ journeySteps, currentStepIndex }: { journeySteps: JourneyStep[], currentStepIndex: number }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>();
    const rotationRef = useRef(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resize = () => {
            const rect = canvas.parentElement?.getBoundingClientRect();
            if (rect) {
                canvas.width = rect.width * window.devicePixelRatio;
                canvas.height = rect.height * window.devicePixelRatio;
                canvas.style.width = rect.width + 'px';
                canvas.style.height = rect.height + 'px';
            }
        };

        resize();
        window.addEventListener('resize', resize);

        const draw = () => {
            const w = canvas.width / window.devicePixelRatio;
            const h = canvas.height / window.devicePixelRatio;
            
            ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, w, h);

            // Stars
            for (let i = 0; i < 100; i++) {
                const x = (Math.sin(i * 123.456) * 0.5 + 0.5) * w;
                const y = (Math.cos(i * 789.012) * 0.5 + 0.5) * h;
                const twinkle = 0.3 + Math.sin(Date.now() * 0.002 + i) * 0.4;
                ctx.fillStyle = `rgba(255, 255, 255, ${twinkle})`;
                ctx.beginPath();
                ctx.arc(x, y, 1, 0, Math.PI * 2);
                ctx.fill();
            }

            const centerX = w * 0.65;
            const centerY = h * 0.5;
            const radius = Math.min(w, h) * 0.3;

            rotationRef.current += 0.002;

            // Planet glow
            const glow = ctx.createRadialGradient(centerX, centerY, radius * 0.9, centerX, centerY, radius * 1.4);
            glow.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
            glow.addColorStop(1, 'transparent');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius * 1.4, 0, Math.PI * 2);
            ctx.fill();

            // Planet body
            ctx.fillStyle = 'rgba(10, 10, 15, 0.95)';
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.fill();

            // Grid lines
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;

            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI + rotationRef.current;
                const xScale = Math.cos(angle);
                if (Math.abs(xScale) > 0.05) {
                    ctx.beginPath();
                    ctx.ellipse(centerX, centerY, Math.abs(xScale) * radius, radius, 0, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }

            for (let i = 1; i < 5; i++) {
                const latRadius = radius * Math.sin((i / 5) * Math.PI);
                const y = centerY - radius * Math.cos((i / 5) * Math.PI);
                ctx.beginPath();
                ctx.ellipse(centerX, y, latRadius, latRadius * 0.3, 0, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Journey markers
            journeySteps.forEach((step, index) => {
                const lat = step.position.lat * Math.PI / 180;
                const lng = (step.position.lng * Math.PI / 180) + rotationRef.current;
                const visibility = Math.cos(lng);
                if (visibility < -0.1) return;

                const x = centerX + Math.sin(lng) * Math.cos(lat) * radius;
                const y = centerY - Math.sin(lat) * radius;
                const scale = 0.5 + visibility * 0.5;
                const markerSize = 8 * scale;

                const isActive = index === currentStepIndex;
                const isCompleted = index < currentStepIndex;

                if (isActive) {
                    const pulseSize = markerSize * (2 + Math.sin(Date.now() * 0.005) * 0.5);
                    const glowGrad = ctx.createRadialGradient(x, y, 0, x, y, pulseSize * 2);
                    glowGrad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
                    glowGrad.addColorStop(1, 'transparent');
                    ctx.fillStyle = glowGrad;
                    ctx.beginPath();
                    ctx.arc(x, y, pulseSize * 2, 0, Math.PI * 2);
                    ctx.fill();
                }

                ctx.beginPath();
                ctx.arc(x, y, markerSize, 0, Math.PI * 2);
                ctx.fillStyle = isActive ? '#FFFFFF' : isCompleted ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.2)';
                ctx.fill();

                ctx.strokeStyle = isActive ? '#FFFFFF' : 'rgba(255,255,255,0.3)';
                ctx.lineWidth = isActive ? 2 : 1;
                ctx.stroke();

                ctx.fillStyle = isActive ? '#000000' : 'rgba(255,255,255,0.8)';
                ctx.font = `bold ${9 * scale}px Inter, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`${index + 1}`, x, y);
            });

            // Planet border
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.stroke();

            animationRef.current = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            window.removeEventListener('resize', resize);
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [journeySteps, currentStepIndex]);

    return <canvas ref={canvasRef} className="w-full h-full" />;
}

export default function ChatView() {
    const { user, setUser, setView } = useApp();
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [isInputFocused, setIsInputFocused] = useState(false);
    const [use3D, setUse3D] = useState(true);
    
    // Journey State
    const [journeySteps, setJourneySteps] = useState<JourneyStep[]>([]);
    const [currentStepIndex, setCurrentStepIndex] = useState(-1);
    const [isJourneyActive, setIsJourneyActive] = useState(false);
    const [displayedText, setDisplayedText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Check WebGL support
    useEffect(() => {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (!gl) {
                console.warn('WebGL not supported, falling back to 2D');
                setUse3D(false);
            }
        } catch (e) {
            console.warn('WebGL check failed, falling back to 2D');
            setUse3D(false);
        }
    }, []);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 100) + 'px';
        }
    }, [chatInput]);

    // Typewriter effect
    const typeText = useCallback((text: string, onComplete?: () => void) => {
        setIsTyping(true);
        setDisplayedText('');
        let index = 0;
        
        const interval = setInterval(() => {
            if (index < text.length) {
                setDisplayedText(prev => prev + text[index]);
                index++;
            } else {
                clearInterval(interval);
                setIsTyping(false);
                onComplete?.();
            }
        }, 12);

        return () => clearInterval(interval);
    }, []);

    // Navigate to step
    const navigateToStep = useCallback((stepIndex: number) => {
        if (stepIndex < 0 || stepIndex >= journeySteps.length) return;

        const step = journeySteps[stepIndex];
        
        setJourneySteps(prev => prev.map((s, i) => ({
            ...s,
            isActive: i === stepIndex,
            isCompleted: i < stepIndex
        })));
        
        setCurrentStepIndex(stepIndex);
        typeText(step.content);
    }, [journeySteps, typeText]);

    // Parse AI response into steps
    const parseAIResponseToSteps = (response: string): JourneyStep[] => {
        const stepPatterns = [
            /(?:^|\n)(\d+)[.)]\s*(.+?)(?=\n\d+[.)]|\n\n|$)/gs,
            /(?:^|\n)(?:Step\s*)?(\d+)[.:]\s*(.+?)(?=\n(?:Step\s*)?\d+[.:]|\n\n|$)/gis,
            /(?:^|\n)[\-]\s*(.+?)(?=\n[\-]|\n\n|$)/gs
        ];

        let steps: JourneyStep[] = [];
        
        for (const pattern of stepPatterns.slice(0, 2)) {
            const matches = [...response.matchAll(pattern)];
            if (matches.length >= 2) {
                steps = matches.map((match, index) => ({
                    id: `step-${index}`,
                    title: `Step ${index + 1}`,
                    content: match[2]?.trim() || match[1]?.trim() || '',
                    position: {
                        lat: (Math.random() - 0.5) * 100,
                        lng: (index * 72) - 144 + (Math.random() - 0.5) * 20
                    },
                    isActive: false,
                    isCompleted: false
                }));
                break;
            }
        }

        if (steps.length < 2) {
            const bulletMatches = [...response.matchAll(stepPatterns[2])];
            if (bulletMatches.length >= 2) {
                steps = bulletMatches.map((match, index) => ({
                    id: `step-${index}`,
                    title: `Step ${index + 1}`,
                    content: match[1]?.trim() || '',
                    position: {
                        lat: (Math.random() - 0.5) * 100,
                        lng: (index * 72) - 144 + (Math.random() - 0.5) * 20
                    },
                    isActive: false,
                    isCompleted: false
                }));
            }
        }

        if (steps.length < 2) {
            const paragraphs = response.split(/\n\n+/).filter(p => p.trim().length > 20);
            if (paragraphs.length >= 2) {
                steps = paragraphs.slice(0, 5).map((p, index) => ({
                    id: `step-${index}`,
                    title: `Step ${index + 1}`,
                    content: p.trim(),
                    position: {
                        lat: (Math.random() - 0.5) * 100,
                        lng: (index * 72) - 144 + (Math.random() - 0.5) * 20
                    },
                    isActive: false,
                    isCompleted: false
                }));
            } else {
                steps = [{
                    id: 'step-0',
                    title: 'Guidance',
                    content: response.trim(),
                    position: { lat: 20, lng: 0 },
                    isActive: false,
                    isCompleted: false
                }];
            }
        }

        return steps;
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

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            text: message,
            timestamp: Date.now()
        };
        setUser(prev => ({ ...prev, chatHistory: [...prev.chatHistory, userMessage] }));

        setChatInput('');
        setIsChatLoading(true);
        setJourneySteps([]);
        setCurrentStepIndex(-1);
        setDisplayedText('');

        try {
            const response = await getChatResponse(
                user.goal,
                user.chatHistory,
                message,
                user.userProfile,
                user.dailyTasks,
                user.connectedApps,
                undefined,
                user.extraLogs
            );

            const aiMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                text: response,
                timestamp: Date.now()
            };
            setUser(prev => ({ ...prev, chatHistory: [...prev.chatHistory, aiMessage] }));

            const steps = parseAIResponseToSteps(response);
            setJourneySteps(steps);
            setIsJourneyActive(true);

            setTimeout(() => {
                navigateToStep(0);
            }, 500);

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
    };

    return (
        <div className="h-full w-full bg-black flex flex-col overflow-hidden relative">
            {/* 3D/2D Canvas Background */}
            <div className="absolute inset-0">
                <Canvas3DErrorBoundary 
                    fallback={<Fallback2DPlanet journeySteps={journeySteps} currentStepIndex={currentStepIndex} />}
                >
                    {use3D ? (
                        <Suspense fallback={<Fallback2DPlanet journeySteps={journeySteps} currentStepIndex={currentStepIndex} />}>
                            <ThreeCanvas journeySteps={journeySteps} currentStepIndex={currentStepIndex} onMarkerClick={navigateToStep} />
                        </Suspense>
                    ) : (
                        <Fallback2DPlanet journeySteps={journeySteps} currentStepIndex={currentStepIndex} />
                    )}
                </Canvas3DErrorBoundary>
            </div>

            {/* Top Header */}
            <div className="relative z-10 flex items-center justify-between px-6 pt-safe pb-3">
                <button 
                    onClick={() => setView(AppView.DASHBOARD)}
                    className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-all"
                >
                    <Icons.ArrowLeft className="w-5 h-5" />
                </button>
                
                <div className="text-center">
                    <h1 className="text-white font-bold text-sm tracking-wide">THE GUIDE</h1>
                    <p className="text-white/30 text-[10px]">Your AI Journey Coach</p>
                </div>

                {isJourneyActive ? (
                    <button 
                        onClick={resetJourney}
                        className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-all"
                    >
                        <Icons.X className="w-5 h-5" />
                    </button>
                ) : (
                    <div className="w-9" />
                )}
            </div>

            {/* Content Overlay - Left Side Text */}
            <div className="flex-1 relative z-10 pointer-events-none">
                <div className="absolute left-0 top-0 bottom-0 w-[45%] flex flex-col justify-center px-8 py-8 pointer-events-auto">
                    {!isJourneyActive && !isChatLoading && (
                        <div className="animate-fade-in">
                            <p className="text-white/30 text-xs uppercase tracking-widest mb-3">Welcome</p>
                            <h2 className="text-white text-2xl font-bold leading-tight mb-4">
                                What would you like<br />guidance on today?
                            </h2>
                            <p className="text-white/50 text-sm leading-relaxed max-w-[320px]">
                                Share your challenges, questions, or goals. I'll guide you through step by step on your journey.
                            </p>
                        </div>
                    )}

                    {isChatLoading && (
                        <div className="animate-pulse">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                            <p className="text-white/40 text-sm">Charting your journey...</p>
                        </div>
                    )}

                    {isJourneyActive && journeySteps.length > 0 && currentStepIndex >= 0 && (
                        <div className="animate-fade-in">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-white/30 text-xs uppercase tracking-widest">
                                    Step {currentStepIndex + 1} of {journeySteps.length}
                                </span>
                            </div>

                            <h3 className="text-white text-xl font-bold mb-4">
                                {journeySteps[currentStepIndex]?.title}
                            </h3>

                            <div className="text-white/80 text-sm leading-relaxed mb-6 min-h-[120px] max-w-[380px]">
                                {displayedText}
                                {isTyping && <span className="inline-block w-0.5 h-4 bg-white ml-1 animate-pulse" />}
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={goToPrevStep}
                                    disabled={currentStepIndex === 0}
                                    className="px-4 py-2 rounded-lg border border-white/20 text-white/60 text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-all"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={goToNextStep}
                                    disabled={currentStepIndex === journeySteps.length - 1 || isTyping}
                                    className="px-4 py-2 rounded-lg bg-white text-black text-sm font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/90 transition-all"
                                >
                                    {currentStepIndex === journeySteps.length - 1 ? 'Complete' : 'Next Step'}
                                </button>
                            </div>

                            <div className="flex items-center gap-2 mt-6">
                                {journeySteps.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => navigateToStep(idx)}
                                        className={`h-2 rounded-full transition-all ${
                                            idx === currentStepIndex 
                                                ? 'bg-white w-6' 
                                                : idx < currentStepIndex 
                                                    ? 'bg-white/50 w-2' 
                                                    : 'bg-white/20 w-2'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {isJourneyActive && displayedText && journeySteps.length === 0 && (
                        <div className="animate-fade-in">
                            <p className="text-white/80 text-sm leading-relaxed">{displayedText}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Input */}
            <div className="relative z-10 px-6 pb-safe">
                <div className={`bg-white/5 backdrop-blur-xl rounded-2xl border transition-all ${
                    isInputFocused ? 'border-white/30' : 'border-white/10'
                }`}>
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

            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-in 0.5s ease-out;
                }
            `}</style>
        </div>
    );
}
