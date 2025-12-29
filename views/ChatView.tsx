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
    const rotationRef = useRef({ y: 0, targetY: 0, velocity: 0 });
    const dragRef = useRef({ isDragging: false, lastX: 0 });
    const starsRef = useRef<{ x: number; y: number; z: number; brightness: number }[]>([]);

    // Initialize stars
    useEffect(() => {
        starsRef.current = Array.from({ length: 150 }, () => ({
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

        // Mouse/touch handlers for rotation
        const handlePointerDown = (e: PointerEvent) => {
            dragRef.current.isDragging = true;
            dragRef.current.lastX = e.clientX;
            canvas.style.cursor = 'grabbing';
        };

        const handlePointerMove = (e: PointerEvent) => {
            if (!dragRef.current.isDragging) return;
            const deltaX = e.clientX - dragRef.current.lastX;
            rotationRef.current.velocity = deltaX * 0.01;
            rotationRef.current.y += deltaX * 0.01;
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
            const w = width / window.devicePixelRatio;
            const h = height / window.devicePixelRatio;
            
            ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
            
            // Clear with black
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, w, h);

            // Draw twinkling stars
            starsRef.current.forEach(star => {
                const twinkle = 0.3 + Math.sin(Date.now() * 0.002 + star.brightness * 10) * 0.5;
                const alpha = star.z * twinkle * 0.8;
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
            const centerX = w * 0.62;
            const centerY = h * 0.45;
            const radius = Math.min(w, h) * 0.3;

            // Smooth rotation with momentum
            if (!dragRef.current.isDragging) {
                rotationRef.current.y += (rotationRef.current.targetY - rotationRef.current.y) * 0.05;
                rotationRef.current.velocity *= 0.95;
                rotationRef.current.y += rotationRef.current.velocity;
                rotationRef.current.targetY = rotationRef.current.y;
            }
            
            // Slow auto-rotation when idle
            if (!dragRef.current.isDragging && Math.abs(rotationRef.current.velocity) < 0.001 && journeySteps.length === 0) {
                rotationRef.current.y += 0.002;
                rotationRef.current.targetY = rotationRef.current.y;
            }
            
            const rotation = rotationRef.current.y;

            // Planet outer glow
            const glowGradient = ctx.createRadialGradient(centerX, centerY, radius * 0.9, centerX, centerY, radius * 1.5);
            glowGradient.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
            glowGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.02)');
            glowGradient.addColorStop(1, 'transparent');
            ctx.fillStyle = glowGradient;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius * 1.5, 0, Math.PI * 2);
            ctx.fill();

            // Planet body
            ctx.fillStyle = 'rgba(8, 8, 12, 0.98)';
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.fill();

            // Wireframe grid - longitude lines
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
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

            // Draw connection lines between markers
            if (journeySteps.length > 1) {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
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

            // Draw journey markers
            journeySteps.forEach((step, index) => {
                const lat = step.position.lat * Math.PI / 180;
                const lng = (step.position.lng * Math.PI / 180) + rotation;
                
                const visibility = Math.cos(lng);
                if (visibility < -0.1) return;

                const x = centerX + Math.sin(lng) * Math.cos(lat) * radius;
                const y = centerY - Math.sin(lat) * radius;
                const scale = 0.5 + visibility * 0.5;
                const markerSize = 10 * scale;

                const isActive = index === currentStepIndex;
                const isCompleted = index < currentStepIndex;

                // Marker glow for active
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

                // Marker circle
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

                // Marker ring
                ctx.strokeStyle = isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.4)';
                ctx.lineWidth = isActive ? 2.5 : 1.5;
                ctx.stroke();

                // Step number
                ctx.fillStyle = isActive ? '#000000' : 'rgba(255, 255, 255, 0.9)';
                ctx.font = `bold ${11 * scale}px Inter, system-ui, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`${index + 1}`, x, y);
            });

            // Planet edge highlight
            const edgeGradient = ctx.createRadialGradient(
                centerX - radius * 0.3, centerY - radius * 0.3, 0,
                centerX, centerY, radius
            );
            edgeGradient.addColorStop(0, 'rgba(255, 255, 255, 0.06)');
            edgeGradient.addColorStop(0.7, 'transparent');
            ctx.fillStyle = edgeGradient;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.fill();

            // Planet border
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
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [journeySteps, currentStepIndex]);

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

    // IMPROVED: Parse AI response into multiple steps
    const parseAIResponseToSteps = (response: string): JourneyStep[] => {
        const steps: JourneyStep[] = [];
        
        // Clean up the response
        const cleanResponse = response.trim();
        
        // Pattern 1: Numbered steps like "1." or "1)" or "Step 1:"
        const numberedRegex = /(?:^|\n)\s*(?:Step\s*)?(\d+)[.):]\s*(.+?)(?=(?:\n\s*(?:Step\s*)?\d+[.):])|$)/gis;
        let matches = [...cleanResponse.matchAll(numberedRegex)];
        
        if (matches.length >= 2) {
            matches.slice(0, 6).forEach((match, index) => {
                const content = match[2]?.trim();
                if (content && content.length > 10) {
                    steps.push({
                        id: `step-${index}`,
                        title: `Step ${index + 1}`,
                        content: content.replace(/\*\*/g, '').trim(),
                        position: {
                            lat: 40 - (index * 20) + (Math.random() - 0.5) * 15,
                            lng: -100 + (index * 55) + (Math.random() - 0.5) * 10
                        },
                        isActive: false,
                        isCompleted: false
                    });
                }
            });
        }
        
        // Pattern 2: Bullet points with - or • or *
        if (steps.length < 2) {
            const bulletRegex = /(?:^|\n)\s*[-•*]\s*(.+?)(?=(?:\n\s*[-•*])|$)/gs;
            matches = [...cleanResponse.matchAll(bulletRegex)];
            
            if (matches.length >= 2) {
                matches.slice(0, 6).forEach((match, index) => {
                    const content = match[1]?.trim();
                    if (content && content.length > 10) {
                        steps.push({
                            id: `step-${index}`,
                            title: `Step ${index + 1}`,
                            content: content.replace(/\*\*/g, '').trim(),
                            position: {
                                lat: 40 - (index * 20) + (Math.random() - 0.5) * 15,
                                lng: -100 + (index * 55) + (Math.random() - 0.5) * 10
                            },
                            isActive: false,
                            isCompleted: false
                        });
                    }
                });
            }
        }
        
        // Pattern 3: Split by sentences if response is long enough
        if (steps.length < 2) {
            const sentences = cleanResponse
                .replace(/\*\*/g, '')
                .split(/(?<=[.!?])\s+/)
                .filter(s => s.trim().length > 20);
            
            if (sentences.length >= 3) {
                // Group sentences into 3-5 steps
                const stepsCount = Math.min(5, Math.max(3, Math.floor(sentences.length / 2)));
                const sentencesPerStep = Math.ceil(sentences.length / stepsCount);
                
                for (let i = 0; i < stepsCount; i++) {
                    const start = i * sentencesPerStep;
                    const end = Math.min(start + sentencesPerStep, sentences.length);
                    const content = sentences.slice(start, end).join(' ').trim();
                    
                    if (content.length > 15) {
                        steps.push({
                            id: `step-${i}`,
                            title: `Step ${i + 1}`,
                            content: content,
                            position: {
                                lat: 40 - (i * 20) + (Math.random() - 0.5) * 15,
                                lng: -100 + (i * 55) + (Math.random() - 0.5) * 10
                            },
                            isActive: false,
                            isCompleted: false
                        });
                    }
                }
            }
        }
        
        // Pattern 4: Split by double newlines (paragraphs)
        if (steps.length < 2) {
            const paragraphs = cleanResponse
                .split(/\n\n+/)
                .map(p => p.replace(/\*\*/g, '').trim())
                .filter(p => p.length > 30);
            
            if (paragraphs.length >= 2) {
                paragraphs.slice(0, 5).forEach((p, index) => {
                    steps.push({
                        id: `step-${index}`,
                        title: `Step ${index + 1}`,
                        content: p,
                        position: {
                            lat: 40 - (index * 20) + (Math.random() - 0.5) * 15,
                            lng: -100 + (index * 55) + (Math.random() - 0.5) * 10
                        },
                        isActive: false,
                        isCompleted: false
                    });
                });
            }
        }
        
        // Fallback: Single step with full response
        if (steps.length === 0) {
            steps.push({
                id: 'step-0',
                title: 'Guidance',
                content: cleanResponse.replace(/\*\*/g, '').trim(),
                position: { lat: 20, lng: 0 },
                isActive: false,
                isCompleted: false
            });
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

        // Save user message
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
        setIsJourneyActive(false);

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

            // Save AI response
            const aiMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                text: response,
                timestamp: Date.now()
            };
            setUser(prev => ({ ...prev, chatHistory: [...prev.chatHistory, aiMessage] }));

            // Parse into journey steps
            const steps = parseAIResponseToSteps(response);
            console.log('Parsed steps:', steps.length, steps);
            
            setJourneySteps(steps);
            setIsJourneyActive(true);

            // Navigate to first step
            setTimeout(() => {
                navigateToStep(0);
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

    return (
        <div className="h-full w-full bg-black flex flex-col overflow-hidden relative">
            {/* Canvas Background */}
            <canvas 
                ref={canvasRef} 
                className="absolute inset-0 w-full h-full touch-none"
            />

            {/* Top Header */}
            <div className="relative z-10 flex items-center justify-between px-5 pt-safe pb-2">
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
                <div className="absolute left-0 top-0 bottom-0 w-[48%] flex flex-col justify-center pl-5 pr-3 py-4 pointer-events-auto">
                    {!isJourneyActive && !isChatLoading && (
                        <div className="animate-fade-in">
                            <p className="text-white/30 text-[10px] uppercase tracking-widest mb-2">Welcome</p>
                            <h2 className="text-white text-xl font-bold leading-tight mb-3">
                                What would you like<br />guidance on today?
                            </h2>
                            <p className="text-white/50 text-xs leading-relaxed">
                                Share your challenges, questions, or goals. I'll guide you step by step.
                            </p>
                        </div>
                    )}

                    {isChatLoading && (
                        <div className="animate-pulse">
                            <div className="flex items-center gap-1.5 mb-3">
                                <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                            <p className="text-white/40 text-xs">Charting your journey...</p>
                        </div>
                    )}

                    {isJourneyActive && journeySteps.length > 0 && currentStepIndex >= 0 && (
                        <div className="animate-fade-in">
                            {/* Step indicator */}
                            <p className="text-white/30 text-[10px] uppercase tracking-widest mb-2">
                                Step {currentStepIndex + 1} of {journeySteps.length}
                            </p>

                            {/* Step title */}
                            <h3 className="text-white text-lg font-bold mb-3">
                                {journeySteps[currentStepIndex]?.title}
                            </h3>

                            {/* AI explanation with typewriter */}
                            <div className="text-white/80 text-xs leading-relaxed mb-4 min-h-[80px] max-h-[140px] overflow-y-auto pr-2 scrollbar-thin">
                                {displayedText}
                                {isTyping && <span className="inline-block w-0.5 h-3 bg-white ml-0.5 animate-pulse" />}
                            </div>

                            {/* Navigation */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={goToPrevStep}
                                    disabled={currentStepIndex === 0}
                                    className="px-3 py-1.5 rounded-lg border border-white/20 text-white/60 text-xs font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-all"
                                >
                                    Prev
                                </button>
                                <button
                                    onClick={goToNextStep}
                                    disabled={currentStepIndex === journeySteps.length - 1 || isTyping}
                                    className="px-3 py-1.5 rounded-lg bg-white text-black text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/90 transition-all"
                                >
                                    {currentStepIndex === journeySteps.length - 1 ? 'Done' : 'Next'}
                                </button>
                            </div>

                            {/* Step dots */}
                            <div className="flex items-center gap-1.5 mt-4">
                                {journeySteps.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => navigateToStep(idx)}
                                        className={`h-1.5 rounded-full transition-all ${
                                            idx === currentStepIndex 
                                                ? 'bg-white w-4' 
                                                : idx < currentStepIndex 
                                                    ? 'bg-white/50 w-1.5' 
                                                    : 'bg-white/20 w-1.5'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Error state */}
                    {isJourneyActive && displayedText && journeySteps.length === 0 && (
                        <div className="animate-fade-in">
                            <p className="text-white/80 text-xs leading-relaxed">{displayedText}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Input - SMALLER */}
            <div className="relative z-10 px-4 pb-safe">
                <div className={`bg-white/5 backdrop-blur-xl rounded-xl border transition-all ${
                    isInputFocused ? 'border-white/30' : 'border-white/10'
                }`}>
                    <div className="flex items-center gap-2 px-3 py-2">
                        <input
                            type="text"
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            onFocus={() => setIsInputFocused(true)}
                            onBlur={() => setIsInputFocused(false)}
                            placeholder="Ask for guidance..."
                            className="flex-1 bg-transparent text-white text-sm placeholder:text-white/30 focus:outline-none"
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={!chatInput.trim() || isChatLoading}
                            className={`p-2 rounded-lg transition-all ${
                                chatInput.trim() && !isChatLoading
                                    ? 'bg-white text-black'
                                    : 'bg-white/10 text-white/30'
                            }`}
                        >
                            <Icons.Send className="w-4 h-4" />
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
                    animation: fade-in 0.4s ease-out;
                }
                .scrollbar-thin::-webkit-scrollbar {
                    width: 3px;
                }
                .scrollbar-thin::-webkit-scrollbar-track {
                    background: transparent;
                }
                .scrollbar-thin::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,0.2);
                    border-radius: 3px;
                }
            `}</style>
        </div>
    );
}
