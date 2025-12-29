// views/ChatView.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../contexts/AppContext';
import { AppView, ChatMessage } from '../types';
import { Icons } from '../components/UIComponents';
import { getChatResponse, checkContentSafety } from '../services/geminiService';

// Types
interface JourneyStep {
    id: string;
    title: string;
    content: string;
    position: { lat: number; lng: number };
    isActive: boolean;
    isCompleted: boolean;
}

interface Conversation {
    id: string;
    name: string;
    createdAt: number;
    messages: ChatMessage[];
    journeySteps: JourneyStep[];
    planetColor: string;
}

// Planet colors for different conversations
const PLANET_COLORS = [
    { primary: 'rgba(255, 255, 255, 0.1)', glow: 'rgba(255, 255, 255, 0.08)' },
    { primary: 'rgba(100, 200, 255, 0.1)', glow: 'rgba(100, 200, 255, 0.08)' },
    { primary: 'rgba(255, 150, 100, 0.1)', glow: 'rgba(255, 150, 100, 0.08)' },
    { primary: 'rgba(150, 255, 150, 0.1)', glow: 'rgba(150, 255, 150, 0.08)' },
    { primary: 'rgba(255, 100, 255, 0.1)', glow: 'rgba(255, 100, 255, 0.08)' },
];

export default function ChatView() {
    const { user, setUser, setView } = useApp();
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [isInputFocused, setIsInputFocused] = useState(false);
    
    // Conversations State
    const [conversations, setConversations] = useState<Conversation[]>(() => {
        // Load from user's guideConversations or initialize empty
        return user.guideConversations || [];
    });
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [showConversationList, setShowConversationList] = useState(false);
    const [showRenameModal, setShowRenameModal] = useState(false);
    const [renameInput, setRenameInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    
    // Journey State
    const [journeySteps, setJourneySteps] = useState<JourneyStep[]>([]);
    const [currentStepIndex, setCurrentStepIndex] = useState(-1);
    const [isJourneyActive, setIsJourneyActive] = useState(false);
    const [displayedText, setDisplayedText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    
    // Canvas refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>();
    const rotationRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0, velocityX: 0, velocityY: 0 });
    const dragRef = useRef({ isDragging: false, lastX: 0, lastY: 0 });
    const starsRef = useRef<{ x: number; y: number; z: number; brightness: number }[]>([]);
    const markerPositionsRef = useRef<{ index: number; x: number; y: number; radius: number }[]>([]);

    // Get active conversation
    const activeConversation = conversations.find(c => c.id === activeConversationId);

    // Save conversations to user state whenever they change
    useEffect(() => {
        setUser(prev => ({ ...prev, guideConversations: conversations }));
    }, [conversations, setUser]);

    // Load journey steps when active conversation changes
    useEffect(() => {
        if (activeConversation) {
            setJourneySteps(activeConversation.journeySteps || []);
            if (activeConversation.journeySteps?.length > 0) {
                setIsJourneyActive(true);
                setCurrentStepIndex(0);
                setDisplayedText(activeConversation.journeySteps[0]?.content || '');
            }
        } else {
            setJourneySteps([]);
            setIsJourneyActive(false);
            setCurrentStepIndex(-1);
            setDisplayedText('');
        }
    }, [activeConversationId]);

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
            rotationRef.current.targetX = step.position.lat * Math.PI / 180 * 0.3;
        }
    }, [currentStepIndex, journeySteps]);

    // Canvas rendering
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

        // Pointer handlers for rotation (supports both X and Y)
        const handlePointerDown = (e: PointerEvent) => {
            dragRef.current.isDragging = true;
            dragRef.current.lastX = e.clientX;
            dragRef.current.lastY = e.clientY;
            canvas.style.cursor = 'grabbing';
        };

        const handlePointerMove = (e: PointerEvent) => {
            if (!dragRef.current.isDragging) return;
            
            const deltaX = e.clientX - dragRef.current.lastX;
            const deltaY = e.clientY - dragRef.current.lastY;
            
            rotationRef.current.velocityY = deltaX * 0.008;
            rotationRef.current.velocityX = deltaY * 0.005;
            
            rotationRef.current.y += deltaX * 0.008;
            rotationRef.current.x += deltaY * 0.005;
            
            // Clamp vertical rotation
            rotationRef.current.x = Math.max(-0.8, Math.min(0.8, rotationRef.current.x));
            
            rotationRef.current.targetY = rotationRef.current.y;
            rotationRef.current.targetX = rotationRef.current.x;
            
            dragRef.current.lastX = e.clientX;
            dragRef.current.lastY = e.clientY;
        };

        const handlePointerUp = () => {
            dragRef.current.isDragging = false;
            canvas.style.cursor = 'grab';
        };

        // Click handler for markers
        const handleClick = (e: PointerEvent) => {
            const rect = canvas.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;
            
            // Check if click is on any marker
            for (const marker of markerPositionsRef.current) {
                const distance = Math.sqrt(
                    Math.pow(clickX - marker.x, 2) + Math.pow(clickY - marker.y, 2)
                );
                if (distance <= marker.radius + 10) {
                    navigateToStep(marker.index);
                    break;
                }
            }
        };

        canvas.addEventListener('pointerdown', handlePointerDown);
        canvas.addEventListener('pointermove', handlePointerMove);
        canvas.addEventListener('pointerup', handlePointerUp);
        canvas.addEventListener('pointerleave', handlePointerUp);
        canvas.addEventListener('click', handleClick);
        canvas.style.cursor = 'grab';
        canvas.style.touchAction = 'none';

        const drawPlanet = () => {
            const w = width / window.devicePixelRatio;
            const h = height / window.devicePixelRatio;
            
            ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
            
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, w, h);

            // Stars
            starsRef.current.forEach(star => {
                const twinkle = 0.3 + Math.sin(Date.now() * 0.002 + star.brightness * 10) * 0.5;
                const alpha = star.z * twinkle * 0.8;
                ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                ctx.beginPath();
                ctx.arc((star.x + 1) * w / 2, (star.y + 1) * h / 2, star.brightness * 1.5 + 0.5, 0, Math.PI * 2);
                ctx.fill();
            });

            const centerX = w * 0.6;
            const centerY = h * 0.45;
            const radius = Math.min(w, h) * 0.28;

            // Smooth rotation with momentum
            if (!dragRef.current.isDragging) {
                rotationRef.current.y += (rotationRef.current.targetY - rotationRef.current.y) * 0.05;
                rotationRef.current.x += (rotationRef.current.targetX - rotationRef.current.x) * 0.05;
                
                rotationRef.current.velocityY *= 0.95;
                rotationRef.current.velocityX *= 0.95;
                
                rotationRef.current.y += rotationRef.current.velocityY;
                rotationRef.current.x += rotationRef.current.velocityX;
                
                rotationRef.current.x = Math.max(-0.8, Math.min(0.8, rotationRef.current.x));
                
                rotationRef.current.targetY = rotationRef.current.y;
                rotationRef.current.targetX = rotationRef.current.x;
            }
            
            // Auto-rotation when idle
            if (!dragRef.current.isDragging && 
                Math.abs(rotationRef.current.velocityY) < 0.001 && 
                Math.abs(rotationRef.current.velocityX) < 0.001 && 
                journeySteps.length === 0) {
                rotationRef.current.y += 0.002;
                rotationRef.current.targetY = rotationRef.current.y;
            }
            
            const rotationY = rotationRef.current.y;
            const rotationX = rotationRef.current.x;

            // Planet glow
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

            // Grid lines - longitude
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.lineWidth = 1;
            
            for (let i = 0; i < 12; i++) {
                const angle = (i / 12) * Math.PI + rotationY;
                const xScale = Math.cos(angle);
                
                if (Math.abs(xScale) > 0.01) {
                    ctx.beginPath();
                    ctx.ellipse(centerX, centerY + rotationX * radius * 0.5, Math.abs(xScale) * radius, radius * Math.cos(rotationX * 0.5), 0, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }

            // Grid lines - latitude
            for (let i = 1; i < 6; i++) {
                const latRadius = radius * Math.sin((i / 6) * Math.PI);
                const y = centerY - radius * Math.cos((i / 6) * Math.PI) * Math.cos(rotationX * 0.5) + rotationX * radius * 0.3;
                ctx.beginPath();
                ctx.ellipse(centerX, y, latRadius, latRadius * 0.3, 0, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Connection lines
            if (journeySteps.length > 1) {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
                ctx.lineWidth = 1.5;
                ctx.setLineDash([5, 4]);
                
                for (let i = 0; i < journeySteps.length - 1; i++) {
                    const step = journeySteps[i];
                    const nextStep = journeySteps[i + 1];
                    
                    const lat1 = step.position.lat * Math.PI / 180;
                    const lng1 = (step.position.lng * Math.PI / 180) + rotationY;
                    const lat2 = nextStep.position.lat * Math.PI / 180;
                    const lng2 = (nextStep.position.lng * Math.PI / 180) + rotationY;
                    
                    const vis1 = Math.cos(lng1);
                    const vis2 = Math.cos(lng2);
                    
                    if (vis1 > -0.1 && vis2 > -0.1) {
                        const x1 = centerX + Math.sin(lng1) * Math.cos(lat1) * radius;
                        const y1 = centerY - Math.sin(lat1 + rotationX) * radius;
                        const x2 = centerX + Math.sin(lng2) * Math.cos(lat2) * radius;
                        const y2 = centerY - Math.sin(lat2 + rotationX) * radius;
                        
                        ctx.beginPath();
                        ctx.moveTo(x1, y1);
                        ctx.lineTo(x2, y2);
                        ctx.stroke();
                    }
                }
                ctx.setLineDash([]);
            }

            // Clear marker positions for click detection
            markerPositionsRef.current = [];

            // Journey markers
            journeySteps.forEach((step, index) => {
                const lat = step.position.lat * Math.PI / 180;
                const lng = (step.position.lng * Math.PI / 180) + rotationY;
                
                const visibility = Math.cos(lng);
                if (visibility < -0.1) return;

                const x = centerX + Math.sin(lng) * Math.cos(lat) * radius;
                const y = centerY - Math.sin(lat + rotationX) * radius;
                const scale = 0.5 + visibility * 0.5;
                const markerSize = 12 * scale;

                // Store marker position for click detection
                markerPositionsRef.current.push({ index, x, y, radius: markerSize });

                const isActive = index === currentStepIndex;
                const isCompleted = index < currentStepIndex;

                // Active glow
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
                    ctx.shadowBlur = 15;
                } else if (isCompleted) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                    ctx.shadowBlur = 0;
                } else {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                    ctx.shadowBlur = 0;
                }
                ctx.fill();
                ctx.shadowBlur = 0;

                ctx.strokeStyle = isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.4)';
                ctx.lineWidth = isActive ? 2 : 1.5;
                ctx.stroke();

                // Step number
                ctx.fillStyle = isActive ? '#000000' : 'rgba(255, 255, 255, 0.9)';
                ctx.font = `bold ${12 * scale}px -apple-system, BlinkMacSystemFont, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`${index + 1}`, x, y);
            });

            // Planet highlight
            const edgeGradient = ctx.createRadialGradient(
                centerX - radius * 0.3, centerY - radius * 0.3, 0,
                centerX, centerY, radius
            );
            edgeGradient.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
            edgeGradient.addColorStop(0.7, 'transparent');
            ctx.fillStyle = edgeGradient;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.fill();

            // Planet border
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
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
            canvas.removeEventListener('click', handleClick);
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
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
        }, 10);

        return () => clearInterval(interval);
    }, []);

    // Navigate to step - FIXED
    const navigateToStep = useCallback((stepIndex: number) => {
        if (stepIndex < 0 || stepIndex >= journeySteps.length) return;

        const step = journeySteps[stepIndex];
        
        setJourneySteps(prev => prev.map((s, i) => ({
            ...s,
            isActive: i === stepIndex,
            isCompleted: i < stepIndex
        })));
        
        setCurrentStepIndex(stepIndex);
        
        // Immediately show text then type it
        if (step.content) {
            typeText(step.content);
        }
    }, [journeySteps, typeText]);

    // Create new conversation
    const createNewConversation = () => {
        const newConvo: Conversation = {
            id: `convo-${Date.now()}`,
            name: `Journey ${conversations.length + 1}`,
            createdAt: Date.now(),
            messages: [],
            journeySteps: [],
            planetColor: PLANET_COLORS[conversations.length % PLANET_COLORS.length].primary
        };
        
        setConversations(prev => [...prev, newConvo]);
        setActiveConversationId(newConvo.id);
        setJourneySteps([]);
        setCurrentStepIndex(-1);
        setIsJourneyActive(false);
        setDisplayedText('');
        setShowConversationList(false);
        
        // Reset rotation
        rotationRef.current = { x: 0, y: 0, targetX: 0, targetY: 0, velocityX: 0, velocityY: 0 };
    };

    // Rename conversation
    const renameConversation = () => {
        if (!activeConversationId || !renameInput.trim()) return;
        
        setConversations(prev => prev.map(c => 
            c.id === activeConversationId ? { ...c, name: renameInput.trim() } : c
        ));
        setShowRenameModal(false);
        setRenameInput('');
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

    // Parse AI response into steps - IMPROVED
    const parseAIResponseToSteps = (response: string): JourneyStep[] => {
        const steps: JourneyStep[] = [];
        const cleanResponse = response.replace(/\*\*/g, '').trim();
        
        // Pattern 1: Numbered steps
        const numberedRegex = /(?:^|\n)\s*(\d+)[.):\s]+\s*([^\n]+(?:\n(?!\s*\d+[.):\s]).*)*)/g;
        let matches = [...cleanResponse.matchAll(numberedRegex)];
        
        if (matches.length >= 2) {
            matches.slice(0, 6).forEach((match, index) => {
                const content = match[2]?.trim();
                if (content && content.length > 5) {
                    steps.push({
                        id: `step-${index}`,
                        title: `Step ${index + 1}`,
                        content: content,
                        position: {
                            lat: 35 - (index * 18),
                            lng: -90 + (index * 50)
                        },
                        isActive: false,
                        isCompleted: false
                    });
                }
            });
            if (steps.length >= 2) return steps;
        }
        
        // Pattern 2: Bullet points
        const bulletRegex = /(?:^|\n)\s*[-•*]\s*([^\n]+)/g;
        matches = [...cleanResponse.matchAll(bulletRegex)];
        
        if (matches.length >= 2) {
            matches.slice(0, 6).forEach((match, index) => {
                const content = match[1]?.trim();
                if (content && content.length > 5) {
                    steps.push({
                        id: `step-${index}`,
                        title: `Step ${index + 1}`,
                        content: content,
                        position: {
                            lat: 35 - (index * 18),
                            lng: -90 + (index * 50)
                        },
                        isActive: false,
                        isCompleted: false
                    });
                }
            });
            if (steps.length >= 2) return steps;
        }
        
        // Pattern 3: Split by sentences
        const sentences = cleanResponse.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 15);
        
        if (sentences.length >= 3) {
            const stepsCount = Math.min(5, Math.max(3, Math.ceil(sentences.length / 2)));
            const perStep = Math.ceil(sentences.length / stepsCount);
            
            for (let i = 0; i < stepsCount; i++) {
                const content = sentences.slice(i * perStep, (i + 1) * perStep).join(' ').trim();
                if (content.length > 10) {
                    steps.push({
                        id: `step-${i}`,
                        title: `Step ${i + 1}`,
                        content: content,
                        position: {
                            lat: 35 - (i * 18),
                            lng: -90 + (i * 50)
                        },
                        isActive: false,
                        isCompleted: false
                    });
                }
            }
            if (steps.length >= 2) return steps;
        }
        
        // Fallback: single step
        return [{
            id: 'step-0',
            title: 'Guidance',
            content: cleanResponse,
            position: { lat: 20, lng: 0 },
            isActive: false,
            isCompleted: false
        }];
    };

    // Send message
    const handleSendMessage = async () => {
        const message = chatInput.trim();
        if (!message || !user.goal) return;

        // Create conversation if none exists
        if (!activeConversationId) {
            createNewConversation();
            // Wait for state to update
            await new Promise(resolve => setTimeout(resolve, 100));
        }

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

        // Update conversation with user message
        setConversations(prev => prev.map(c => 
            c.id === activeConversationId 
                ? { ...c, messages: [...c.messages, userMessage] }
                : c
        ));

        setChatInput('');
        setIsChatLoading(true);
        setJourneySteps([]);
        setCurrentStepIndex(-1);
        setDisplayedText('');

        try {
            const currentConvo = conversations.find(c => c.id === activeConversationId);
            const history = currentConvo?.messages || [];

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

            const aiMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                text: response,
                timestamp: Date.now()
            };

            // Parse steps
            const steps = parseAIResponseToSteps(response);

            // Update conversation with AI response and steps
            setConversations(prev => prev.map(c => 
                c.id === activeConversationId 
                    ? { ...c, messages: [...c.messages, aiMessage], journeySteps: steps }
                    : c
            ));

            setJourneySteps(steps);
            setIsJourneyActive(true);

            // Navigate to first step
            setTimeout(() => {
                if (steps.length > 0) {
                    setCurrentStepIndex(0);
                    typeText(steps[0].content);
                }
            }, 300);

        } catch (error) {
            console.error('Chat error:', error);
            setDisplayedText("I'm having trouble connecting. Please try again.");
            setIsJourneyActive(true);
        } finally {
            setIsChatLoading(false);
        }
    };

    // Navigation - FIXED
    const goToNextStep = () => {
        const nextIndex = currentStepIndex + 1;
        if (nextIndex < journeySteps.length) {
            navigateToStep(nextIndex);
        }
    };

    const goToPrevStep = () => {
        const prevIndex = currentStepIndex - 1;
        if (prevIndex >= 0) {
            navigateToStep(prevIndex);
        }
    };

    // Filter conversations by search
    const filteredConversations = conversations.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="h-full w-full bg-black flex flex-col overflow-hidden relative">
            {/* Canvas */}
            <canvas 
                ref={canvasRef} 
                className="absolute inset-0 w-full h-full"
                style={{ touchAction: 'none' }}
            />

            {/* Header */}
            <div className="relative z-10 flex items-center justify-between px-4 pt-safe pb-2">
                <button 
                    onClick={() => setView(AppView.DASHBOARD)}
                    className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-all"
                >
                    <Icons.ArrowLeft className="w-5 h-5" />
                </button>
                
                <button 
                    onClick={() => setShowConversationList(true)}
                    className="text-center"
                >
                    <h1 className="text-white font-bold text-sm tracking-wide">
                        {activeConversation?.name || 'THE GUIDE'}
                    </h1>
                    <p className="text-white/30 text-[10px]">Tap to see all journeys</p>
                </button>

                <button 
                    onClick={createNewConversation}
                    className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-all"
                >
                    <Icons.Plus className="w-5 h-5" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 relative z-10 pointer-events-none">
                <div className="absolute left-0 top-0 bottom-0 w-[50%] flex flex-col justify-center pl-4 pr-2 py-4 pointer-events-auto">
                    {!isJourneyActive && !isChatLoading && (
                        <div className="animate-fade-in">
                            <p className="text-white/30 text-[10px] uppercase tracking-widest mb-2">Welcome</p>
                            <h2 className="text-white text-lg font-bold leading-tight mb-2">
                                What would you like guidance on?
                            </h2>
                            <p className="text-white/50 text-xs leading-relaxed">
                                Ask me anything about your goals. I'll guide you step by step.
                            </p>
                        </div>
                    )}

                    {isChatLoading && (
                        <div className="animate-pulse">
                            <div className="flex items-center gap-1.5 mb-2">
                                <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" />
                                <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                            <p className="text-white/40 text-xs">Thinking...</p>
                        </div>
                    )}

                    {isJourneyActive && journeySteps.length > 0 && currentStepIndex >= 0 && (
                        <div className="animate-fade-in">
                            <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1">
                                Step {currentStepIndex + 1} of {journeySteps.length}
                            </p>

                            <h3 className="text-white text-base font-bold mb-2">
                                {journeySteps[currentStepIndex]?.title}
                            </h3>

                            {/* Text content - FIXED FOR IPHONE */}
                            <div 
                                className="text-white/90 text-xs leading-relaxed mb-3 overflow-y-auto"
                                style={{ 
                                    minHeight: '60px',
                                    maxHeight: '120px',
                                    WebkitOverflowScrolling: 'touch'
                                }}
                            >
                                {displayedText || journeySteps[currentStepIndex]?.content}
                                {isTyping && <span className="inline-block w-0.5 h-3 bg-white ml-0.5 animate-pulse" />}
                            </div>

                            {/* Navigation - FIXED */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={goToPrevStep}
                                    disabled={currentStepIndex <= 0}
                                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                                        currentStepIndex <= 0
                                            ? 'border-white/10 text-white/20 cursor-not-allowed'
                                            : 'border-white/30 text-white/70 hover:bg-white/10 active:bg-white/20'
                                    }`}
                                >
                                    Prev
                                </button>
                                <button
                                    onClick={goToNextStep}
                                    disabled={currentStepIndex >= journeySteps.length - 1}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        currentStepIndex >= journeySteps.length - 1
                                            ? 'bg-white/20 text-white/40 cursor-not-allowed'
                                            : 'bg-white text-black hover:bg-white/90 active:bg-white/80'
                                    }`}
                                >
                                    {currentStepIndex >= journeySteps.length - 1 ? 'Done' : 'Next'}
                                </button>
                            </div>

                            {/* Step dots */}
                            <div className="flex items-center gap-1.5 mt-3">
                                {journeySteps.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => navigateToStep(idx)}
                                        className={`h-1.5 rounded-full transition-all ${
                                            idx === currentStepIndex 
                                                ? 'bg-white w-4' 
                                                : idx < currentStepIndex 
                                                    ? 'bg-white/60 w-1.5' 
                                                    : 'bg-white/25 w-1.5'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Input */}
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
                            style={{ fontSize: '16px' }} // Prevents zoom on iOS
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

            {/* Conversation List Modal */}
            {showConversationList && (
                <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col">
                    <div className="flex items-center justify-between px-4 pt-safe pb-3 border-b border-white/10">
                        <h2 className="text-white font-bold">Your Journeys</h2>
                        <button 
                            onClick={() => setShowConversationList(false)}
                            className="p-2 text-white/50 hover:text-white"
                        >
                            <Icons.X className="w-5 h-5" />
                        </button>
                    </div>
                    
                    {/* Search */}
                    <div className="px-4 py-3">
                        <div className="bg-white/5 rounded-lg px-3 py-2 flex items-center gap-2">
                            <Icons.Search className="w-4 h-4 text-white/30" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search journeys..."
                                className="flex-1 bg-transparent text-white text-sm placeholder:text-white/30 focus:outline-none"
                            />
                        </div>
                    </div>
                    
                    {/* List */}
                    <div className="flex-1 overflow-y-auto px-4 pb-4">
                        <button
                            onClick={createNewConversation}
                            className="w-full p-3 mb-2 border border-dashed border-white/20 rounded-xl text-white/50 text-sm hover:bg-white/5 transition-all flex items-center justify-center gap-2"
                        >
                            <Icons.Plus className="w-4 h-4" />
                            New Journey
                        </button>
                        
                        {filteredConversations.length === 0 ? (
                            <p className="text-white/30 text-sm text-center py-8">No journeys yet</p>
                        ) : (
                            filteredConversations.map(convo => (
                                <div
                                    key={convo.id}
                                    className={`p-3 mb-2 rounded-xl transition-all ${
                                        convo.id === activeConversationId 
                                            ? 'bg-white/10 border border-white/20' 
                                            : 'bg-white/5 hover:bg-white/10'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <button
                                            onClick={() => {
                                                setActiveConversationId(convo.id);
                                                setShowConversationList(false);
                                            }}
                                            className="flex-1 text-left"
                                        >
                                            <h3 className="text-white font-medium text-sm">{convo.name}</h3>
                                            <p className="text-white/40 text-[10px]">
                                                {convo.messages.length} messages • {new Date(convo.createdAt).toLocaleDateString()}
                                            </p>
                                        </button>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => {
                                                    setActiveConversationId(convo.id);
                                                    setRenameInput(convo.name);
                                                    setShowRenameModal(true);
                                                }}
                                                className="p-1.5 text-white/30 hover:text-white"
                                            >
                                                <Icons.Edit className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => deleteConversation(convo.id)}
                                                className="p-1.5 text-white/30 hover:text-red-400"
                                            >
                                                <Icons.Trash className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Rename Modal */}
            {showRenameModal && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
                    <div className="bg-[#1a1a2e] rounded-2xl p-5 w-full max-w-sm border border-white/10">
                        <h3 className="text-white font-bold mb-4">Rename Journey</h3>
                        <input
                            type="text"
                            value={renameInput}
                            onChange={e => setRenameInput(e.target.value)}
                            placeholder="Enter name..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-white/30 mb-4"
                            autoFocus
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowRenameModal(false)}
                                className="flex-1 py-2 rounded-xl border border-white/20 text-white/60 text-sm font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={renameConversation}
                                className="flex-1 py-2 rounded-xl bg-white text-black text-sm font-bold"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-in 0.3s ease-out;
                }
            `}</style>
        </div>
    );
}
