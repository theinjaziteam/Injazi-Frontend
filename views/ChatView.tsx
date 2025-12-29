// views/ChatView.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
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

export default function ChatView() {
    const { user, setUser, setView } = useApp();
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [isInputFocused, setIsInputFocused] = useState(false);
    
    // Journey State
    const [journeySteps, setJourneySteps] = useState<JourneyStep[]>([]);
    const [currentStepIndex, setCurrentStepIndex] = useState(-1);
    const [isJourneyActive, setIsJourneyActive] = useState(false);
    const [displayedText, setDisplayedText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    
    // Canvas refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>();
    const rotationRef = useRef({ x: 0, y: 0, targetY: 0 });
    const starsRef = useRef<{ x: number; y: number; z: number; brightness: number }[]>([]);
    
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Initialize stars
    useEffect(() => {
        starsRef.current = Array.from({ length: 150 }, () => ({
            x: Math.random() * 2 - 1,
            y: Math.random() * 2 - 1,
            z: Math.random(),
            brightness: Math.random()
        }));
    }, []);

    // 3D Planet Rendering with Canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = 0;
        let height = 0;

        const resize = () => {
            const rect = canvas.parentElement?.getBoundingClientRect();
            if (rect) {
                width = rect.width * window.devicePixelRatio;
                height = rect.height * window.devicePixelRatio;
                canvas.width = width;
                canvas.height = height;
                canvas.style.width = rect.width + 'px';
                canvas.style.height = rect.height + 'px';
            }
        };
        
        resize();
        window.addEventListener('resize', resize);

        const drawPlanet = () => {
            const w = width / window.devicePixelRatio;
            const h = height / window.devicePixelRatio;
            
            ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
            
            // Clear with black
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, w, h);

            // Draw twinkling stars
            starsRef.current.forEach(star => {
                const twinkle = 0.3 + Math.sin(Date.now() * 0.002 + star.brightness * 10) * 0.7;
                const alpha = star.z * twinkle * 0.6;
                ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                ctx.beginPath();
                ctx.arc(
                    (star.x + 1) * w / 2,
                    (star.y + 1) * h / 2,
                    star.brightness * 1.5 + 0.5,
                    0,
                    Math.PI * 2
                );
                ctx.fill();
            });

            // Planet center - positioned to right side
            const centerX = w * 0.65;
            const centerY = h * 0.5;
            const radius = Math.min(w, h) * 0.35;

            // Smooth rotation
            rotationRef.current.y += (rotationRef.current.targetY - rotationRef.current.y) * 0.03;
            const rotation = rotationRef.current.y;

            // Planet outer glow
            const glowGradient = ctx.createRadialGradient(centerX, centerY, radius * 0.9, centerX, centerY, radius * 1.6);
            glowGradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
            glowGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.03)');
            glowGradient.addColorStop(1, 'transparent');
            ctx.fillStyle = glowGradient;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius * 1.6, 0, Math.PI * 2);
            ctx.fill();

            // Planet body - subtle dark fill
            ctx.fillStyle = 'rgba(10, 10, 15, 0.95)';
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.fill();

            // Wireframe grid - longitude lines
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

            // Latitude lines
            for (let i = 1; i < 6; i++) {
                const latRadius = radius * Math.sin((i / 6) * Math.PI);
                const y = centerY - radius * Math.cos((i / 6) * Math.PI);
                ctx.beginPath();
                ctx.ellipse(centerX, y, latRadius, latRadius * 0.3, 0, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Draw journey markers
            journeySteps.forEach((step, index) => {
                const lat = step.position.lat * Math.PI / 180;
                const lng = (step.position.lng * Math.PI / 180) + rotation;
                
                // Check visibility (front of planet)
                const visibility = Math.cos(lng);
                if (visibility < -0.1) return;

                const x = centerX + Math.sin(lng) * Math.cos(lat) * radius;
                const y = centerY - Math.sin(lat) * radius;
                const scale = 0.5 + visibility * 0.5;
                const markerSize = 8 * scale;

                // Connection lines between markers
                if (index > 0 && (step.isCompleted || step.isActive || journeySteps[index - 1].isCompleted)) {
                    const prevStep = journeySteps[index - 1];
                    const prevLat = prevStep.position.lat * Math.PI / 180;
                    const prevLng = (prevStep.position.lng * Math.PI / 180) + rotation;
                    const prevVisibility = Math.cos(prevLng);
                    
                    if (prevVisibility > -0.1) {
                        const prevX = centerX + Math.sin(prevLng) * Math.cos(prevLat) * radius;
                        const prevY = centerY - Math.sin(prevLat) * radius;
                        
                        ctx.beginPath();
                        ctx.moveTo(prevX, prevY);
                        ctx.lineTo(x, y);
                        ctx.strokeStyle = step.isCompleted || journeySteps[index - 1].isCompleted 
                            ? 'rgba(255, 255, 255, 0.4)' 
                            : 'rgba(255, 255, 255, 0.15)';
                        ctx.lineWidth = 1.5;
                        ctx.setLineDash([4, 4]);
                        ctx.stroke();
                        ctx.setLineDash([]);
                    }
                }

                // Marker glow for active
                if (step.isActive) {
                    const pulseSize = markerSize * (2 + Math.sin(Date.now() * 0.005) * 0.5);
                    const glowGrad = ctx.createRadialGradient(x, y, 0, x, y, pulseSize * 2);
                    glowGrad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
                    glowGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
                    glowGrad.addColorStop(1, 'transparent');
                    ctx.fillStyle = glowGrad;
                    ctx.beginPath();
                    ctx.arc(x, y, pulseSize * 2, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Marker circle
                ctx.beginPath();
                ctx.arc(x, y, markerSize, 0, Math.PI * 2);
                
                if (step.isActive) {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.shadowColor = '#FFFFFF';
                    ctx.shadowBlur = 15;
                } else if (step.isCompleted) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                    ctx.shadowBlur = 0;
                } else {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                    ctx.shadowBlur = 0;
                }
                ctx.fill();
                ctx.shadowBlur = 0;

                // Marker ring
                ctx.strokeStyle = step.isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.3)';
                ctx.lineWidth = step.isActive ? 2 : 1;
                ctx.stroke();

                // Step number
                ctx.fillStyle = step.isActive ? '#000000' : 'rgba(255, 255, 255, 0.8)';
                ctx.font = `bold ${9 * scale}px Inter, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`${index + 1}`, x, y);
            });

            // Planet edge highlight
            const edgeGradient = ctx.createRadialGradient(
                centerX - radius * 0.3, centerY - radius * 0.3, 0,
                centerX, centerY, radius
            );
            edgeGradient.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
            edgeGradient.addColorStop(0.7, 'transparent');
            ctx.fillStyle = edgeGradient;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.fill();

            // Planet border
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.stroke();

            animationRef.current = requestAnimationFrame(drawPlanet);
        };

        drawPlanet();

        return () => {
            window.removeEventListener('resize', resize);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [journeySteps]);

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
        }, 15);

        return () => clearInterval(interval);
    }, []);

    // Navigate to step
    const navigateToStep = useCallback((stepIndex: number) => {
        if (stepIndex < 0 || stepIndex >= journeySteps.length) return;

        const step = journeySteps[stepIndex];
        
        // Rotate planet to focus on marker
        rotationRef.current.targetY = -step.position.lng * Math.PI / 180;

        // Update step states
        setJourneySteps(prev => prev.map((s, i) => ({
            ...s,
            isActive: i === stepIndex,
            isCompleted: i < stepIndex
        })));
        
        setCurrentStepIndex(stepIndex);

        // Type the explanation
        typeText(step.content);
    }, [journeySteps, typeText]);

    // Parse AI response into steps
    const parseAIResponseToSteps = (response: string): JourneyStep[] => {
        // Try to extract numbered steps from AI response
        const stepPatterns = [
            /(?:^|\n)(\d+)[.)]\s*(.+?)(?=\n\d+[.)]|\n\n|$)/gs,
            /(?:^|\n)(?:Step\s*)?(\d+)[.:]\s*(.+?)(?=\n(?:Step\s*)?\d+[.:]|\n\n|$)/gis,
            /(?:^|\n)[•\-]\s*(.+?)(?=\n[•\-]|\n\n|$)/gs
        ];

        let steps: JourneyStep[] = [];
        
        // Try numbered patterns first
        for (const pattern of stepPatterns.slice(0, 2)) {
            const matches = [...response.matchAll(pattern)];
            if (matches.length >= 2) {
                steps = matches.map((match, index) => ({
                    id: `step-${index}`,
                    title: `Step ${index + 1}`,
                    content: match[2]?.trim() || match[1]?.trim() || '',
                    position: {
                        lat: (Math.random() - 0.5) * 120,
                        lng: (index * 60) - 90 + (Math.random() - 0.5) * 30
                    },
                    isActive: false,
                    isCompleted: false
                }));
                break;
            }
        }

        // Try bullet points
        if (steps.length < 2) {
            const bulletMatches = [...response.matchAll(stepPatterns[2])];
            if (bulletMatches.length >= 2) {
                steps = bulletMatches.map((match, index) => ({
                    id: `step-${index}`,
                    title: `Step ${index + 1}`,
                    content: match[1]?.trim() || '',
                    position: {
                        lat: (Math.random() - 0.5) * 120,
                        lng: (index * 60) - 90 + (Math.random() - 0.5) * 30
                    },
                    isActive: false,
                    isCompleted: false
                }));
            }
        }

        // If no steps found, split by sentences or paragraphs
        if (steps.length < 2) {
            const paragraphs = response.split(/\n\n+/).filter(p => p.trim().length > 20);
            if (paragraphs.length >= 2) {
                steps = paragraphs.slice(0, 5).map((p, index) => ({
                    id: `step-${index}`,
                    title: `Step ${index + 1}`,
                    content: p.trim(),
                    position: {
                        lat: (Math.random() - 0.5) * 120,
                        lng: (index * 60) - 90 + (Math.random() - 0.5) * 30
                    },
                    isActive: false,
                    isCompleted: false
                }));
            } else {
                // Single response - show as one step
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

        // Save user message to chat history
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

            // Save AI response to chat history
            const aiMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                text: response,
                timestamp: Date.now()
            };
            setUser(prev => ({ ...prev, chatHistory: [...prev.chatHistory, aiMessage] }));

            // Parse into journey steps
            const steps = parseAIResponseToSteps(response);
            setJourneySteps(steps);
            setIsJourneyActive(true);

            // Start journey after short delay
            setTimeout(() => {
                navigateToStep(0);
            }, 500);

        } catch (error) {
            console.error('Chat error:', error);
            setDisplayedText("I'm having trouble connecting. Please try again.");
        } finally {
            setIsChatLoading(false);
        }
    };

    // Navigation controls
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

    return (
        <div className="h-full w-full bg-black flex flex-col overflow-hidden relative">
            {/* 3D Planet Canvas - Full Screen Background */}
            <canvas 
                ref={canvasRef} 
                className="absolute inset-0 w-full h-full"
            />

            {/* Top Header */}
            <div className="relative z-10 flex items-center justify-between px-5 pt-safe pb-3">
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
            <div className="flex-1 relative z-10 flex">
                {/* Left Panel - AI Text */}
                <div className="w-1/2 flex flex-col justify-center px-6 py-8">
                    {!isJourneyActive && !isChatLoading && (
                        <div className="animate-fade-in">
                            <p className="text-white/30 text-xs uppercase tracking-widest mb-3">Welcome</p>
                            <h2 className="text-white text-2xl font-bold leading-tight mb-4">
                                What would you like guidance on today?
                            </h2>
                            <p className="text-white/50 text-sm leading-relaxed">
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

                    {isJourneyActive && journeySteps.length > 0 && (
                        <div className="animate-fade-in">
                            {/* Step indicator */}
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-white/30 text-xs uppercase tracking-widest">
                                    Step {currentStepIndex + 1} of {journeySteps.length}
                                </span>
                            </div>

                            {/* Step title */}
                            <h3 className="text-white text-xl font-bold mb-4">
                                {journeySteps[currentStepIndex]?.title}
                            </h3>

                            {/* AI explanation with typewriter */}
                            <div className="text-white/80 text-sm leading-relaxed mb-6 min-h-[100px]">
                                {displayedText}
                                {isTyping && <span className="inline-block w-0.5 h-4 bg-white ml-1 animate-pulse" />}
                            </div>

                            {/* Navigation */}
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

                            {/* Step dots */}
                            <div className="flex items-center gap-2 mt-6">
                                {journeySteps.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => navigateToStep(idx)}
                                        className={`w-2 h-2 rounded-full transition-all ${
                                            idx === currentStepIndex 
                                                ? 'bg-white w-6' 
                                                : idx < currentStepIndex 
                                                    ? 'bg-white/50' 
                                                    : 'bg-white/20'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Panel - Planet (handled by canvas) */}
                <div className="w-1/2" />
            </div>

            {/* Bottom Input */}
            <div className="relative z-10 px-5 pb-safe">
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

            {/* CSS Animations */}
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
