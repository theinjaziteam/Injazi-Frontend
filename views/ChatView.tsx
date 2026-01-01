// views/ChatView.tsx
import { WelcomeIntro, TourOverlay } from '../components/GuideWelcome';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../contexts/AppContext';
import { AppView, ChatMessage, ChatAttachment } from '../types';
import { Icons } from '../components/UIComponents';
import { getChatResponse } from '../services/geminiService';

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

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = error => reject(error);
    });
};

export default function ChatView() {
    const { user, setUser, setView } = useApp();
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [isInputFocused, setIsInputFocused] = useState(false);
    
    // Welcome/Tour state
    const [welcomePhase, setWelcomePhase] = useState<'intro' | 'tour' | 'complete'>(() => {
        const hasSeenWelcome = localStorage.getItem('guideWelcomeSeen');
        return hasSeenWelcome ? 'complete' : 'intro';
    });
    const [tourStep, setTourStep] = useState(0);
    
    const [attachment, setAttachment] = useState<ChatAttachment | null>(null);
    const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [conversations, setConversations] = useState<GuideConversation[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [showJourneysList, setShowJourneysList] = useState(false);
    const [editingJourneyId, setEditingJourneyId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    
    const [viewMode, setViewMode] = useState<'planet' | 'chat'>('planet');
    
    const [journeySteps, setJourneySteps] = useState<JourneyStep[]>([]);
    const [currentStepIndex, setCurrentStepIndex] = useState(-1);
    const [isJourneyActive, setIsJourneyActive] = useState(false);
    const [displayedText, setDisplayedText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const typingRef = useRef<number | null>(null);
    
    const [canvasKey, setCanvasKey] = useState(0);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number | null>(null);
    const rotationRef = useRef({ y: 0, targetY: 0, velocity: 0 });
    const dragRef = useRef({ isDragging: false, lastX: 0 });
    const starsRef = useRef<{ x: number; y: number; z: number; brightness: number }[]>([]);
    
    // FIX #8: Track if canvas should be animating
    const isAnimatingRef = useRef(true);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Load conversations from user
    useEffect(() => {
        const saved = (user as any).guideConversations;
        if (Array.isArray(saved)) {
            setConversations(saved);
        }
    }, []);

    // Save conversations to user
    useEffect(() => {
        if (conversations.length > 0 || (user as any).guideConversations?.length > 0) {
            setUser(prev => ({ ...prev, guideConversations: conversations } as any));
        }
    }, [conversations]);

    // FIX #8: Pause animation when tab is not visible
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
                // Canvas will restart on next render cycle
                setCanvasKey(prev => prev + 1);
            }
        };
        
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    // Welcome/Tour handlers
    const handleStartTour = () => {
        setWelcomePhase('tour');
    };

    const handleSkipWelcome = () => {
        localStorage.setItem('guideWelcomeSeen', 'true');
        setWelcomePhase('complete');
    };

    const handleTourNext = () => {
        if (tourStep < 4) {
            setTourStep(prev => prev + 1);
        } else {
            localStorage.setItem('guideWelcomeSeen', 'true');
            setWelcomePhase('complete');
        }
    };

    const handleTourBack = () => {
        if (tourStep > 0) {
            setTourStep(prev => prev - 1);
        }
    };

    // Handle active conversation change
    useEffect(() => {
        if (!activeConversationId) {
            setJourneySteps([]);
            setIsJourneyActive(false);
            setCurrentStepIndex(-1);
            setDisplayedText('');
            return;
        }
        
        const convo = conversations.find(c => c.id === activeConversationId);
        if (convo && Array.isArray(convo.journeySteps) && convo.journeySteps.length > 0) {
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

    // Scroll to bottom in chat mode
    useEffect(() => {
        if (viewMode === 'chat' && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [viewMode, conversations, activeConversationId]);

    // Initialize stars once
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

    // Update rotation target when step changes
    useEffect(() => {
        if (currentStepIndex >= 0 && journeySteps[currentStepIndex]) {
            const step = journeySteps[currentStepIndex];
            rotationRef.current.targetY = -step.position.lng * Math.PI / 180;
        }
    }, [currentStepIndex, journeySteps]);

    // Force canvas re-render when returning from journeys list
    useEffect(() => {
        if ((!showJourneysList && viewMode === 'planet') || welcomePhase === 'tour') {
            setTimeout(() => {
                setCanvasKey(prev => prev + 1);
            }, 50);
        }
    }, [showJourneysList, viewMode, welcomePhase]);

    // FIX #8: Canvas rendering with visibility check
    useEffect(() => {
        if (viewMode !== 'planet' || showJourneysList || welcomePhase === 'intro' || !isAnimatingRef.current) {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
                animationRef.current = null;
            }
            return;
        }
        
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = 0;
        let height = 0;
        let isRunning = true;

        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, 2); // FIX #8: Cap DPR for performance
            width = rect.width * dpr;
            height = rect.height * dpr;
            canvas.width = width;
            canvas.height = height;
        };
        
        resize();
        window.addEventListener('resize', resize);

        if (starsRef.current.length === 0) {
            starsRef.current = Array.from({ length: 200 }, () => ({
                x: Math.random() * 2 - 1,
                y: Math.random() * 2 - 1,
                z: Math.random(),
                brightness: Math.random()
            }));
        }

        // FIX #8: Throttle animation for better performance
        let lastFrameTime = 0;
        const targetFPS = 30;
        const frameInterval = 1000 / targetFPS;

        const drawPlanet = (currentTime: number) => {
            if (!isRunning || !isAnimatingRef.current) return;
            
            // Throttle frame rate
            const elapsed = currentTime - lastFrameTime;
            if (elapsed < frameInterval) {
                animationRef.current = requestAnimationFrame(drawPlanet);
                return;
            }
            lastFrameTime = currentTime - (elapsed % frameInterval);
            
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const w = width / dpr;
            const h = height / dpr;
            
            if (w === 0 || h === 0) {
                animationRef.current = requestAnimationFrame(drawPlanet);
                return;
            }
            
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, w, h);

            // Draw stars
            starsRef.current.forEach(star => {
                const twinkle = 0.3 + Math.sin(currentTime * 0.002 + star.brightness * 10) * 0.5;
                ctx.fillStyle = `rgba(255, 255, 255, ${star.z * twinkle * 0.8})`;
                ctx.beginPath();
                ctx.arc((star.x + 1) * w / 2, (star.y + 1) * h / 2, star.brightness * 1.5 + 0.5, 0, Math.PI * 2);
                ctx.fill();
            });

            // Planet position
            const topOffset = 180;
            const bottomOffset = 190;
            const availableHeight = h - topOffset - bottomOffset;
            const centerX = w * 0.5;
            const centerY = topOffset + (availableHeight / 2);
            const radius = Math.min(w, h) * 0.25;

            // Handle rotation
            if (!dragRef.current.isDragging) {
                rotationRef.current.y += (rotationRef.current.targetY - rotationRef.current.y) * 0.05;
                rotationRef.current.velocity *= 0.96;
                rotationRef.current.y += rotationRef.current.velocity;
                rotationRef.current.targetY = rotationRef.current.y;
                
                if (Math.abs(rotationRef.current.velocity) < 0.001 && journeySteps.length === 0) {
                    rotationRef.current.y += 0.002;
                    rotationRef.current.targetY = rotationRef.current.y;
                }
            }
            
            const rotation = rotationRef.current.y;

            // Glow
            const glowGradient = ctx.createRadialGradient(centerX, centerY, radius * 0.9, centerX, centerY, radius * 1.5);
            glowGradient.addColorStop(0, 'rgba(100, 120, 255, 0.08)');
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

            // Journey connections
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
                    
                    if (Math.cos(lng1) > -0.1 && Math.cos(lng2) > -0.1) {
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
                    const pulseSize = markerSize * (2.5 + Math.sin(currentTime * 0.004) * 0.8);
                    const glowGrad = ctx.createRadialGradient(x, y, 0, x, y, pulseSize * 2);
                    glowGrad.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
                    glowGrad.addColorStop(1, 'transparent');
                    ctx.fillStyle = glowGrad;
                    ctx.beginPath();
                    ctx.arc(x, y, pulseSize * 2, 0, Math.PI * 2);
                    ctx.fill();
                }

                ctx.beginPath();
                ctx.arc(x, y, markerSize, 0, Math.PI * 2);
                ctx.fillStyle = isActive ? '#FFFFFF' : isCompleted ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)';
                ctx.fill();

                ctx.fillStyle = isActive ? '#000000' : 'rgba(255,255,255,0.9)';
                ctx.font = `bold ${11 * scale}px system-ui`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`${index + 1}`, x, y);
            });

            // Planet outline
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.stroke();

            animationRef.current = requestAnimationFrame(drawPlanet);
        };

        animationRef.current = requestAnimationFrame(drawPlanet);

        return () => {
            isRunning = false;
            window.removeEventListener('resize', resize);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
                animationRef.current = null;
            }
        };
    }, [viewMode, showJourneysList, canvasKey, journeySteps, currentStepIndex, welcomePhase]);

    // Canvas pointer handlers
    useEffect(() => {
        if (viewMode !== 'planet' || showJourneysList || welcomePhase === 'intro') return;
        
        const canvas = canvasRef.current;
        if (!canvas) return;

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

        return () => {
            canvas.removeEventListener('pointerdown', handlePointerDown);
            canvas.removeEventListener('pointermove', handlePointerMove);
            canvas.removeEventListener('pointerup', handlePointerUp);
            canvas.removeEventListener('pointerleave', handlePointerUp);
        };
    }, [viewMode, showJourneysList, canvasKey, welcomePhase]);

    const typeText = useCallback((text: string) => {
        if (typingRef.current) clearInterval(typingRef.current);
        if (!text) { 
            setDisplayedText(''); 
            setIsTyping(false); 
            return; 
        }
        
        setIsTyping(true);
        setDisplayedText('');
        let index = 0;
        
        typingRef.current = window.setInterval(() => {
            if (index < text.length) {
                setDisplayedText(text.substring(0, index + 1));
                index++;
            } else {
                if (typingRef.current) clearInterval(typingRef.current);
                setIsTyping(false);
            }
        }, 15);
    }, []);

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

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            alert('File too large. Maximum size is 10MB.');
            return;
        }

        try {
            const base64 = await fileToBase64(file);
            
            let type: 'image' | 'pdf' | 'audio' = 'image';
            if (file.type.includes('pdf')) type = 'pdf';
            else if (file.type.includes('audio')) type = 'audio';
            
            setAttachment({
                type,
                mimeType: file.type,
                data: base64
            });
            
            setAttachmentPreview(URL.createObjectURL(file));
        } catch (error) {
            console.error('Error reading file:', error);
            alert('Could not read file. Please try again.');
        }
        
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const removeAttachment = () => {
        setAttachment(null);
        if (attachmentPreview) {
            URL.revokeObjectURL(attachmentPreview);
            setAttachmentPreview(null);
        }
    };

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
        setIsJourneyActive(false);
        setCurrentStepIndex(-1);
        setDisplayedText('');
        setShowJourneysList(false);
    };

    const saveRename = () => {
        if (editingJourneyId && editingName.trim()) {
            setConversations(prev => prev.map(c => 
                c.id === editingJourneyId ? { ...c, name: editingName.trim() } : c
            ));
        }
        setEditingJourneyId(null);
        setEditingName('');
    };

    const deleteConversation = (id: string) => {
        setConversations(prev => prev.filter(c => c.id !== id));
        if (activeConversationId === id) {
            setActiveConversationId(null);
            setJourneySteps([]);
            setIsJourneyActive(false);
            setCurrentStepIndex(-1);
            setDisplayedText('');
        }
    };

    const parseAIResponseToSteps = (response: string | undefined | null): JourneyStep[] => {
        if (!response || typeof response !== 'string' || response.trim().length === 0) {
            return [{
                id: 's-0',
                title: 'Guidance',
                content: 'I could not generate a proper response. Please try again.',
                position: { lat: 20, lng: 0 },
                isActive: false,
                isCompleted: false
            }];
        }

        let clean = response.replace(/undefined/gi, '').replace(/\*\*/g, '').replace(/\*/g, '').trim();
        
        if (clean.length === 0) {
            return [{
                id: 's-0',
                title: 'Guidance',
                content: 'I could not generate a proper response. Please try again.',
                position: { lat: 20, lng: 0 },
                isActive: false,
                isCompleted: false
            }];
        }

        const getPosition = (index: number, total: number) => ({
            lat: 35 - (index * (70 / Math.max(total - 1, 1))) + (Math.random() - 0.5) * 10,
            lng: -120 + (index * (240 / Math.max(total - 1, 1))) + (Math.random() - 0.5) * 10
        });

        const numberedRegex = /(?:^|\n)\s*(?:Step\s*)?(\d+)[.):\-]\s*([^\n]+(?:\n(?!\s*(?:Step\s*)?\d+[.):\-])[^\n]*)*)/gi;
        let match;
        const numberedSteps: { num: number; content: string }[] = [];
        
        while ((match = numberedRegex.exec(clean)) !== null) {
            const content = (match[2] || '').replace(/\n+/g, ' ').replace(/undefined/gi, '').trim();
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

        const bulletRegex = /(?:^|\n)\s*[-]\s*([^\n]+)/g;
        const bulletSteps: string[] = [];
        
        while ((match = bulletRegex.exec(clean)) !== null) {
            const content = (match[1] || '').replace(/undefined/gi, '').trim();
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

        const paragraphs = clean.split(/\n\n+/).filter(p => p.trim().length > 30);
        if (paragraphs.length >= 2) {
            const total = Math.min(paragraphs.length, 5);
            return paragraphs.slice(0, total).map((p, i) => ({
                id: `s-${i}`,
                title: `Step ${i + 1}`,
                content: p.replace(/\n/g, ' ').replace(/undefined/gi, '').trim(),
                position: getPosition(i, total),
                isActive: false,
                isCompleted: false
            }));
        }

        const sentences = clean.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 15);
        if (sentences.length >= 3) {
            const numSteps = Math.min(Math.max(Math.ceil(sentences.length / 2), 3), 5);
            const perStep = Math.ceil(sentences.length / numSteps);
            const chunks: string[] = [];
            
            for (let i = 0; i < numSteps; i++) {
                const chunk = sentences.slice(i * perStep, (i + 1) * perStep).join(' ').replace(/undefined/gi, '').trim();
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

        return [{
            id: 's-0',
            title: 'Guidance',
            content: clean,
            position: { lat: 20, lng: 0 },
            isActive: false,
            isCompleted: false
        }];
    };

    const handleSendMessage = async () => {
        const message = chatInput.trim();
        if (!message && !attachment) return;
        if (!user.goal) {
            alert('Please set a goal first.');
            return;
        }

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

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            text: message || (attachment ? `[Sent ${attachment.type}]` : ''),
            timestamp: Date.now(),
            attachment: attachment || undefined
        };
        
        const currentConvoId = convoId;
        setConversations(prev => prev.map(c => 
            c.id === currentConvoId ? { ...c, messages: [...c.messages, userMessage] } : c
        ));

        setChatInput('');
        removeAttachment();
        setIsChatLoading(true);

        try {
            const convo = conversations.find(c => c.id === currentConvoId);
            const history = convo?.messages || [];

            const response = await getChatResponse(
                user.goal,
                history,
                message,
                user.userProfile || '',
                user.dailyTasks || [],
                user.connectedApps || [],
                attachment || undefined,
                user.extraLogs || []
            );

            let validResponse = '';
            if (response && typeof response === 'string') {
                validResponse = response.replace(/undefined/gi, '').trim();
            }
            
            if (!validResponse || validResponse.length === 0) {
                validResponse = 'I had trouble generating a response. Could you please rephrase your question?';
            }

            const aiMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: validResponse,
                timestamp: Date.now()
            };

            const steps = parseAIResponseToSteps(validResponse);

            setConversations(prev => prev.map(c => 
                c.id === currentConvoId ? { 
                    ...c, 
                    messages: [...c.messages, aiMessage],
                    journeySteps: steps
                } : c
            ));

            setJourneySteps(steps);
            setIsJourneyActive(true);
            setIsChatLoading(false);

            setTimeout(() => {
                setCurrentStepIndex(0);
                if (steps[0]?.content) {
                    typeText(steps[0].content);
                }
            }, 300);

        } catch (error) {
            console.error('Chat error:', error);
            setIsChatLoading(false);
            const errorSteps: JourneyStep[] = [{
                id: 's-error',
                title: 'Connection Issue',
                content: 'I\'m having trouble connecting. Please check your connection and try again.',
                position: { lat: 20, lng: 0 },
                isActive: true,
                isCompleted: false
            }];
            setJourneySteps(errorSteps);
            setIsJourneyActive(true);
            setCurrentStepIndex(0);
            setDisplayedText(errorSteps[0].content);
        }
    };

    const goToNextStep = () => {
        if (currentStepIndex < journeySteps.length - 1) {
            navigateToStep(currentStepIndex + 1);
        }
    };

    const handleDone = () => {
        setIsJourneyActive(false);
        setJourneySteps([]);
        setCurrentStepIndex(-1);
        setDisplayedText('');
    };

    const goToPrevStep = () => {
        if (currentStepIndex > 0) {
            navigateToStep(currentStepIndex - 1);
        }
    };

    const formatTime = (ts: number) => {
        return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const activeConvo = conversations.find(c => c.id === activeConversationId);

    // FIX #10: Master Agent Button with responsive positioning
    const MasterAgentButton = () => (
        <button
            onClick={() => setView(AppView.ECOMMERCE_AGENT)}
            aria-label="Open Master Agent"
            style={{
                position: 'absolute',
                bottom: 'calc(env(safe-area-inset-bottom, 0px) + 200px)',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 24px',
                borderRadius: '40px',
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                pointerEvents: 'auto'
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                e.currentTarget.style.transform = 'translateX(-50%) translateY(-2px)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.transform = 'translateX(-50%) translateY(0)';
            }}
        >
            <Icons.Zap style={{ width: 16, height: 16, color: 'rgba(255, 255, 255, 0.6)' }} />
            <span style={{ 
                color: 'rgba(255, 255, 255, 0.7)', 
                fontWeight: 500, 
                fontSize: '13px',
                letterSpacing: '0.2px'
            }}>
                Master Agent
            </span>
            <Icons.ChevronRight style={{ width: 14, height: 14, color: 'rgba(255, 255, 255, 0.3)' }} />
        </button>
    );

    // Master Agent Quick Action Card (for Chat Mode)
    const MasterAgentQuickActionCard = () => (
        <button
            onClick={() => setView(AppView.ECOMMERCE_AGENT)}
            aria-label="Open Master Agent - AI-powered automation"
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px',
                marginBottom: '16px',
                borderRadius: '16px',
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'left'
            }}
        >
            <div style={{
                width: 44,
                height: 44,
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
            }}>
                <Icons.Zap style={{ width: 22, height: 22, color: 'rgba(255, 255, 255, 0.7)' }} />
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <h3 style={{ color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600, fontSize: '15px', margin: 0 }}>
                        Master Agent
                    </h3>
                    <span style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'rgba(255, 255, 255, 0.5)',
                        fontSize: '10px',
                        fontWeight: 600,
                        textTransform: 'uppercase'
                    }}>
                        NEW
                    </span>
                </div>
                <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '12px', margin: 0 }}>
                    AI-powered automation for your business
                </p>
            </div>
            <Icons.ChevronRight style={{ width: 20, height: 20, color: 'rgba(255, 255, 255, 0.3)' }} />
        </button>
    );

    // Welcome Intro
    if (welcomePhase === 'intro') {
        return <WelcomeIntro onStartTour={handleStartTour} onSkip={handleSkipWelcome} />;
    }

    // Journeys List View
    if (showJourneysList) {
        return (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', backgroundColor: '#000000' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <button 
                        onClick={() => setShowJourneysList(false)} 
                        style={{ padding: '8px', color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer' }}
                        aria-label="Close journeys list"
                    >
                        <Icons.ArrowLeft style={{ width: 20, height: 20 }} />
                    </button>
                    <div style={{ textAlign: 'center' }}>
                        <h1 style={{ color: '#fff', fontWeight: 'bold', fontSize: '18px', margin: 0 }}>Your Journeys</h1>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', margin: 0 }}>{conversations.length} saved</p>
                    </div>
                    <button 
                        onClick={createConversation} 
                        style={{ padding: '8px', color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer' }}
                        aria-label="Create new journey"
                    >
                        <Icons.Plus style={{ width: 20, height: 20 }} />
                    </button>
                </div>

                {/* List */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', WebkitOverflowScrolling: 'touch' }}>
                    <button
                        onClick={createConversation}
                        style={{ width: '100%', padding: '20px', marginBottom: '20px', borderRadius: '16px', border: '2px dashed rgba(255,255,255,0.2)', background: 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                        aria-label="Start new journey"
                    >
                        <div style={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icons.Plus style={{ width: 28, height: 28, color: 'rgba(255,255,255,0.5)' }} />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 500, margin: 0 }}>Start New Journey</p>
                            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', marginTop: '4px' }}>Ask your guide anything</p>
                        </div>
                    </button>

                    {conversations.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                                <Icons.Globe style={{ width: 28, height: 28, color: 'rgba(255,255,255,0.2)' }} />
                            </div>
                            <h3 className="empty-state-title" style={{ color: 'rgba(255,255,255,0.5)' }}>No journeys yet</h3>
                            <p className="empty-state-description" style={{ color: 'rgba(255,255,255,0.3)' }}>Start exploring above</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {conversations.map((convo, index) => {
                                const isActive = convo.id === activeConversationId;
                                const hue = (index * 47) % 360;
                                const stepsCount = Array.isArray(convo.journeySteps) ? convo.journeySteps.length : 0;
                                const messagesCount = Array.isArray(convo.messages) ? convo.messages.length : 0;
                                
                                return (
                                    <div
                                        key={convo.id}
                                        style={{ borderRadius: '16px', overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.05)', border: isActive ? '2px solid rgba(255,255,255,0.3)' : 'none' }}
                                    >
                                        {editingJourneyId === convo.id ? (
                                            <div style={{ padding: '16px' }}>
                                                <input
                                                    type="text"
                                                    value={editingName}
                                                    onChange={e => setEditingName(e.target.value)}
                                                    style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '12px', padding: '12px 16px', color: '#fff', fontSize: '14px', marginBottom: '12px', outline: 'none' }}
                                                    autoFocus
                                                    onKeyDown={e => { 
                                                        if (e.key === 'Enter') saveRename(); 
                                                        if (e.key === 'Escape') setEditingJourneyId(null); 
                                                    }}
                                                    placeholder="Journey name..."
                                                    aria-label="Journey name"
                                                />
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button 
                                                        onClick={() => setEditingJourneyId(null)} 
                                                        style={{ flex: 1, padding: '10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)', backgroundColor: 'transparent', color: 'rgba(255,255,255,0.6)', fontSize: '14px', cursor: 'pointer' }}
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button 
                                                        onClick={saveRename} 
                                                        style={{ flex: 1, padding: '10px', borderRadius: '12px', backgroundColor: '#fff', color: '#000', fontSize: '14px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
                                                    >
                                                        Save
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                <div 
                                                    style={{ 
                                                        width: 48, 
                                                        height: 48, 
                                                        borderRadius: '50%', 
                                                        flexShrink: 0, 
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        justifyContent: 'center',
                                                        background: `radial-gradient(circle at 30% 30%, hsl(${hue}, 40%, 25%), #0a0a12)`
                                                    }}
                                                    aria-hidden="true"
                                                >
                                                    <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '12px' }}>
                                                        {stepsCount || messagesCount}
                                                    </span>
                                                </div>

                                                <button
                                                    onClick={() => { 
                                                        setActiveConversationId(convo.id); 
                                                        setShowJourneysList(false); 
                                                    }}
                                                    style={{ flex: 1, textAlign: 'left', minWidth: 0, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                                                    aria-label={`Open journey: ${convo.name || 'Untitled'}`}
                                                >
                                                    <h3 style={{ color: '#fff', fontWeight: 600, fontSize: '14px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{convo.name || 'Untitled'}</h3>
                                                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', margin: '4px 0 0' }}>
                                                        {stepsCount} steps · {new Date(convo.createdAt).toLocaleDateString()}
                                                    </p>
                                                </button>

                                                <button 
                                                    onClick={() => {
                                                        setEditingJourneyId(convo.id);
                                                        setEditingName(convo.name || '');
                                                    }} 
                                                    style={{ padding: '8px', color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer' }}
                                                    aria-label={`Rename journey: ${convo.name || 'Untitled'}`}
                                                >
                                                    <Icons.Edit style={{ width: 16, height: 16 }} />
                                                </button>
                                                <button 
                                                    onClick={() => { 
                                                        if (confirm('Delete this journey?')) {
                                                            deleteConversation(convo.id);
                                                        }
                                                    }} 
                                                    style={{ padding: '8px', color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer' }}
                                                    aria-label={`Delete journey: ${convo.name || 'Untitled'}`}
                                                >
                                                    <Icons.Trash style={{ width: 16, height: 16 }} />
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

    // Chat View
    if (viewMode === 'chat') {
        return (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', backgroundColor: '#000000' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <button 
                        onClick={() => setView(AppView.DASHBOARD)} 
                        style={{ padding: '8px', color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer' }}
                        aria-label="Go back to dashboard"
                    >
                        <Icons.ArrowLeft style={{ width: 20, height: 20 }} />
                    </button>
                    <div style={{ textAlign: 'center', flex: 1 }}>
                        <h1 style={{ color: '#fff', fontWeight: 'bold', fontSize: '16px', margin: 0 }}>
                            {activeConvo?.name || 'The Guide'}
                        </h1>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                            onClick={() => setViewMode('planet')} 
                            style={{ padding: '8px', color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer' }}
                            aria-label="Switch to planet view"
                        >
                            <Icons.Globe style={{ width: 20, height: 20 }} />
                        </button>
                        <button 
                            onClick={() => setShowJourneysList(true)} 
                            style={{ padding: '8px', color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer' }}
                            aria-label="View all journeys"
                        >
                            <Icons.List style={{ width: 20, height: 20 }} />
                        </button>
                    </div>
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px', WebkitOverflowScrolling: 'touch' }}>
                    <MasterAgentQuickActionCard />
                    
                    {activeConvo?.messages.map((msg, i) => (
                        <div 
                            key={msg.id || i} 
                            style={{
                                display: 'flex',
                                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                marginBottom: '12px'
                            }}
                        >
                            <div style={{
                                maxWidth: '80%',
                                padding: '12px 16px',
                                borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                backgroundColor: msg.role === 'user' ? 'rgba(52, 35, 166, 0.8)' : 'rgba(255,255,255,0.1)',
                                color: '#fff'
                            }}>
                                {/* FIX #9: Proper text wrapping */}
                                <p style={{ 
                                    margin: 0, 
                                    fontSize: '14px', 
                                    lineHeight: 1.5,
                                    wordBreak: 'break-word',
                                    overflowWrap: 'break-word',
                                    whiteSpace: 'pre-wrap'
                                }}>
                                    {msg.text}
                                </p>
                                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '4px', display: 'block' }}>
                                    {formatTime(msg.timestamp)}
                                </span>
                            </div>
                        </div>
                    ))}
                    
                    {isChatLoading && (
                        <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '12px' }}>
                            <div style={{
                                padding: '12px 16px',
                                borderRadius: '16px 16px 16px 4px',
                                backgroundColor: 'rgba(255,255,255,0.1)'
                            }}>
                                <div className="loading-dots" style={{ color: 'rgba(255,255,255,0.5)' }}>
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                </div>

                {/* FIX #11: Chat Input with proper focus state */}
                <div style={{ 
                    padding: '12px 16px', 
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))'
                }}>
                    {/* Attachment Preview */}
                    {attachmentPreview && (
                        <div style={{ marginBottom: '8px', position: 'relative', display: 'inline-block' }}>
                            <img 
                                src={attachmentPreview} 
                                alt="Attachment preview" 
                                style={{ height: '60px', borderRadius: '8px' }}
                            />
                            <button 
                                onClick={removeAttachment}
                                style={{
                                    position: 'absolute',
                                    top: '-8px',
                                    right: '-8px',
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    backgroundColor: 'rgba(255,0,0,0.8)',
                                    border: 'none',
                                    color: '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer'
                                }}
                                aria-label="Remove attachment"
                            >
                                <Icons.X style={{ width: 14, height: 14 }} />
                            </button>
                        </div>
                    )}
                    
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        backgroundColor: 'rgba(255,255,255,0.08)',
                        borderRadius: '24px',
                        padding: '8px 16px',
                        border: isInputFocused ? '2px solid rgba(255,255,255,0.3)' : '2px solid transparent',
                        transition: 'border-color 0.2s'
                    }}>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileSelect} 
                            accept="image/*,audio/*,.pdf" 
                            style={{ display: 'none' }}
                            aria-hidden="true"
                        />
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            style={{ padding: '4px', color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer' }}
                            aria-label="Attach file"
                        >
                            <Icons.Paperclip style={{ width: 20, height: 20 }} />
                        </button>
                        
                        <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onFocus={() => setIsInputFocused(true)}
                            onBlur={() => setIsInputFocused(false)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                            placeholder="Ask your guide..."
                            style={{
                                flex: 1,
                                backgroundColor: 'transparent',
                                border: 'none',
                                outline: 'none',
                                color: '#FFFFFF',
                                fontSize: '16px'
                            }}
                            aria-label="Message input"
                        />
                        
                        <button
                            onClick={handleSendMessage}
                            disabled={isChatLoading || (!chatInput.trim() && !attachment)}
                            style={{
                                padding: '8px',
                                backgroundColor: (chatInput.trim() || attachment) ? '#3423A6' : 'transparent',
                                borderRadius: '50%',
                                border: 'none',
                                color: (chatInput.trim() || attachment) ? '#fff' : 'rgba(255,255,255,0.3)',
                                cursor: (chatInput.trim() || attachment) ? 'pointer' : 'default',
                                transition: 'all 0.2s'
                            }}
                            aria-label="Send message"
                        >
                            <Icons.Send style={{ width: 20, height: 20 }} />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Planet View (Default)
    return (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', backgroundColor: '#000000' }}>
            {/* Tour Overlay */}
            {welcomePhase === 'tour' && (
                <TourOverlay 
                    step={tourStep} 
                    onNext={handleTourNext} 
                    onBack={handleTourBack}
                    onSkip={handleSkipWelcome}
                />
            )}
            
            {/* Header */}
            <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                padding: '12px 16px',
                paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))'
            }}>
                <button 
                    onClick={() => setView(AppView.DASHBOARD)} 
                    style={{ padding: '8px', color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer' }}
                    aria-label="Go back to dashboard"
                >
                    <Icons.ArrowLeft style={{ width: 20, height: 20 }} />
                </button>
                <div style={{ textAlign: 'center' }}>
                    <h1 style={{ color: '#fff', fontWeight: 'bold', fontSize: '16px', margin: 0 }}>The Guide</h1>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', margin: 0 }}>
                        {activeConvo ? activeConvo.name : 'Your AI Companion'}
                    </p>
                </div>
                <button 
                    onClick={() => setShowJourneysList(true)} 
                    style={{ padding: '8px', color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer' }}
                    aria-label="View all journeys"
                >
                    <Icons.List style={{ width: 20, height: 20 }} />
                </button>
            </div>

            {/* Canvas Container */}
            <div style={{ flex: 1, position: 'relative' }}>
                <canvas 
                    key={canvasKey}
                    ref={canvasRef} 
                    style={{ 
                        position: 'absolute', 
                        inset: 0, 
                        width: '100%', 
                        height: '100%',
                        touchAction: 'none'
                    }}
                    aria-hidden="true"
                />
                
                {/* Journey Step Panel - FIX #9 */}
                {isJourneyActive && journeySteps.length > 0 && currentStepIndex >= 0 && (
                    <div style={{
                        position: 'absolute',
                        top: '16px',
                        left: '16px',
                        right: '16px',
                        zIndex: 5
                    }}>
                        {/* Step indicator */}
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'center', 
                            gap: '6px', 
                            marginBottom: '12px' 
                        }}>
                            {journeySteps.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => navigateToStep(i)}
                                    style={{
                                        width: i === currentStepIndex ? '24px' : '8px',
                                        height: '8px',
                                        borderRadius: '4px',
                                        backgroundColor: i === currentStepIndex 
                                            ? '#fff' 
                                            : i < currentStepIndex 
                                                ? 'rgba(255,255,255,0.5)' 
                                                : 'rgba(255,255,255,0.2)',
                                        border: 'none',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s'
                                    }}
                                    aria-label={`Go to step ${i + 1}`}
                                    aria-current={i === currentStepIndex ? 'step' : undefined}
                                />
                            ))}
                        </div>
                        
                        {/* Content Card - FIX #9: Proper text overflow */}
                        <div style={{ 
                            backgroundColor: 'rgba(255,255,255,0.08)', 
                            borderRadius: '16px', 
                            padding: '16px', 
                            border: '1px solid rgba(255,255,255,0.1)', 
                            maxHeight: '120px', 
                            overflowY: 'auto'
                        }}>
                            <p style={{ 
                                color: 'rgba(255,255,255,0.9)', 
                                fontSize: '14px', 
                                lineHeight: 1.6, 
                                margin: 0,
                                wordBreak: 'break-word',
                                overflowWrap: 'break-word',
                                whiteSpace: 'pre-wrap'
                            }}>
                                {displayedText}
                                {isTyping && <span style={{ animation: 'blink 1s infinite' }}>|</span>}
                            </p>
                        </div>
                    </div>
                )}
                
                {/* Navigation Buttons */}
                {isJourneyActive && journeySteps.length > 1 && (
                    <div style={{
                        position: 'absolute',
                        bottom: 'calc(260px + env(safe-area-inset-bottom, 0px))',
                        left: '16px',
                        right: '16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        zIndex: 5
                    }}>
                        <button
                            onClick={goToPrevStep}
                            disabled={currentStepIndex <= 0}
                            style={{
                                padding: '10px 16px',
                                borderRadius: '20px',
                                backgroundColor: currentStepIndex > 0 ? 'rgba(255,255,255,0.1)' : 'transparent',
                                border: 'none',
                                color: currentStepIndex > 0 ? '#fff' : 'rgba(255,255,255,0.2)',
                                fontSize: '13px',
                                fontWeight: 500,
                                cursor: currentStepIndex > 0 ? 'pointer' : 'default',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                            aria-label="Previous step"
                        >
                            <Icons.ChevronLeft style={{ width: 16, height: 16 }} />
                            Previous
                        </button>
                        
                        {currentStepIndex < journeySteps.length - 1 ? (
                            <button
                                onClick={goToNextStep}
                                style={{
                                    padding: '10px 16px',
                                    borderRadius: '20px',
                                    backgroundColor: 'rgba(255,255,255,0.1)',
                                    border: 'none',
                                    color: '#fff',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                                aria-label="Next step"
                            >
                                Next
                                <Icons.ChevronRight style={{ width: 16, height: 16 }} />
                            </button>
                        ) : (
                            <button
                                onClick={handleDone}
                                style={{
                                    padding: '10px 20px',
                                    borderRadius: '20px',
                                    backgroundColor: '#3423A6',
                                    border: 'none',
                                    color: '#fff',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                                aria-label="Complete journey"
                            >
                                Done
                            </button>
                        )}
                    </div>
                )}
                
                {/* FIX #10: Master Agent Button with responsive positioning */}
                <MasterAgentButton />
            </div>

            {/* Bottom Input Area */}
            <div style={{ 
                padding: '16px', 
                paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
                backgroundColor: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)'
            }}>
                {/* Mode Toggle */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                    <div style={{
                        display: 'flex',
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        borderRadius: '20px',
                        padding: '4px'
                    }}>
                        <button
                            onClick={() => setViewMode('planet')}
                            style={{
                                padding: '6px 16px',
                                borderRadius: '16px',
                                backgroundColor: viewMode === 'planet' ? 'rgba(255,255,255,0.2)' : 'transparent',
                                border: 'none',
                                color: viewMode === 'planet' ? '#fff' : 'rgba(255,255,255,0.5)',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                            aria-pressed={viewMode === 'planet'}
                        >
                            Planet
                        </button>
                        <button
                            onClick={() => setViewMode('chat')}
                            style={{
                                padding: '6px 16px',
                                borderRadius: '16px',
                                backgroundColor: viewMode === 'chat' ? 'rgba(255,255,255,0.2)' : 'transparent',
                                border: 'none',
                                color: viewMode === 'chat' ? '#fff' : 'rgba(255,255,255,0.5)',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                            aria-pressed={viewMode === 'chat'}
                        >
                            Chat
                        </button>
                    </div>
                </div>
                
                {/* FIX #11: Input with proper focus state */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    borderRadius: '24px',
                    padding: '8px 16px',
                    border: isInputFocused ? '2px solid rgba(255,255,255,0.3)' : '2px solid transparent',
                    transition: 'border-color 0.2s'
                }}>
                    <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onFocus={() => setIsInputFocused(true)}
                        onBlur={() => setIsInputFocused(false)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                            }
                        }}
                        placeholder="Ask your guide anything..."
                        style={{
                            flex: 1,
                            backgroundColor: 'transparent',
                            border: 'none',
                            outline: 'none',
                            color: '#FFFFFF',
                            fontSize: '16px'
                        }}
                        aria-label="Message input"
                    />
                    
                    <button
                        onClick={handleSendMessage}
                        disabled={isChatLoading || !chatInput.trim()}
                        style={{
                            padding: '8px',
                            backgroundColor: chatInput.trim() ? '#3423A6' : 'transparent',
                            borderRadius: '50%',
                            border: 'none',
                            color: chatInput.trim() ? '#fff' : 'rgba(255,255,255,0.3)',
                            cursor: chatInput.trim() ? 'pointer' : 'default',
                            transition: 'all 0.2s'
                        }}
                        aria-label="Send message"
                    >
                        {isChatLoading ? (
                            <div className="loading-spinner loading-spinner-sm" />
                        ) : (
                            <Icons.Send style={{ width: 20, height: 20 }} />
                        )}
                    </button>
                </div>
            </div>
            
            <style>{`
                @keyframes blink {
                    0%, 50% { opacity: 1; }
                    51%, 100% { opacity: 0; }
                }
            `}</style>
        </div>
    );
}
