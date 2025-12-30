// views/ChatView.tsx
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
    
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number | null>(null);
    const rotationRef = useRef({ y: 0, targetY: 0, velocity: 0 });
    const dragRef = useRef({ isDragging: false, lastX: 0 });
    const starsRef = useRef<{ x: number; y: number; z: number; brightness: number }[]>([]);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const saved = (user as any).guideConversations;
        if (Array.isArray(saved)) {
            setConversations(saved);
        }
    }, []);

    useEffect(() => {
        if (conversations.length > 0 || (user as any).guideConversations?.length > 0) {
            setUser(prev => ({ ...prev, guideConversations: conversations } as any));
        }
    }, [conversations]);

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

    useEffect(() => {
        if (viewMode === 'chat' && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [viewMode, conversations, activeConversationId]);

    useEffect(() => {
        starsRef.current = Array.from({ length: 200 }, () => ({
            x: Math.random() * 2 - 1,
            y: Math.random() * 2 - 1,
            z: Math.random(),
            brightness: Math.random()
        }));
    }, []);

    useEffect(() => {
        if (currentStepIndex >= 0 && journeySteps[currentStepIndex]) {
            const step = journeySteps[currentStepIndex];
            rotationRef.current.targetY = -step.position.lng * Math.PI / 180;
        }
    }, [currentStepIndex, journeySteps]);

    // Canvas rendering
    useEffect(() => {
        if (viewMode !== 'planet') return;
        
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

        const drawPlanet = () => {
            const dpr = window.devicePixelRatio || 1;
            const w = width / dpr;
            const h = height / dpr;
            
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, w, h);

            starsRef.current.forEach(star => {
                const twinkle = 0.3 + Math.sin(Date.now() * 0.002 + star.brightness * 10) * 0.5;
                ctx.fillStyle = `rgba(255, 255, 255, ${star.z * twinkle * 0.8})`;
                ctx.beginPath();
                ctx.arc((star.x + 1) * w / 2, (star.y + 1) * h / 2, star.brightness * 1.5 + 0.5, 0, Math.PI * 2);
                ctx.fill();
            });

            // Change planet center position - raise it higher
const centerX = w * 0.55;
const centerY = h * 0.25;  // Changed from 0.45 to 0.38 to raise planet
const radius = Math.min(w, h) * 0.30;  // Slightly smaller for better fit


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

            const glowGradient = ctx.createRadialGradient(centerX, centerY, radius * 0.9, centerX, centerY, radius * 1.5);
            glowGradient.addColorStop(0, 'rgba(100, 120, 255, 0.08)');
            glowGradient.addColorStop(1, 'transparent');
            ctx.fillStyle = glowGradient;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius * 1.5, 0, Math.PI * 2);
            ctx.fill();

            const planetGrad = ctx.createRadialGradient(centerX - radius * 0.3, centerY - radius * 0.3, 0, centerX, centerY, radius);
            planetGrad.addColorStop(0, '#1a1a2e');
            planetGrad.addColorStop(1, '#0a0a12');
            ctx.fillStyle = planetGrad;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.fill();

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
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [viewMode, journeySteps, currentStepIndex]);

    // Canvas pointer handlers
    useEffect(() => {
        if (viewMode !== 'planet') return;
        
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
    }, [viewMode]);

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
        setJourneySteps([]);
        setCurrentStepIndex(-1);
        setDisplayedText('');
        setIsJourneyActive(false);

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

            setTimeout(() => {
                setCurrentStepIndex(0);
                if (steps[0]?.content) {
                    typeText(steps[0].content);
                }
            }, 300);

        } catch (error) {
            console.error('Chat error:', error);
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

    const formatTime = (ts: number) => {
        return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const activeConvo = conversations.find(c => c.id === activeConversationId);

    // ========== JOURNEYS LIST VIEW ==========
    if (showJourneysList) {
        return (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', backgroundColor: '#000000' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <button 
                        onClick={() => setShowJourneysList(false)} 
                        style={{ padding: '8px', color: 'rgba(255,255,255,0.5)' }}
                    >
                        <Icons.ArrowLeft style={{ width: 20, height: 20 }} />
                    </button>
                    <div style={{ textAlign: 'center' }}>
                        <h1 style={{ color: '#fff', fontWeight: 'bold', fontSize: '18px', margin: 0 }}>Your Journeys</h1>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', margin: 0 }}>{conversations.length} saved</p>
                    </div>
                    <button 
                        onClick={createConversation} 
                        style={{ padding: '8px', color: 'rgba(255,255,255,0.5)' }}
                    >
                        <Icons.Plus style={{ width: 20, height: 20 }} />
                    </button>
                </div>

                {/* List */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
                    <button
                        onClick={createConversation}
                        style={{ width: '100%', padding: '20px', marginBottom: '20px', borderRadius: '16px', border: '2px dashed rgba(255,255,255,0.2)', background: 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}
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
                        <div style={{ textAlign: 'center', padding: '48px 0' }}>
                            <div style={{ width: 80, height: 80, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                <Icons.Globe style={{ width: 40, height: 40, color: 'rgba(255,255,255,0.2)' }} />
                            </div>
                            <p style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 500, margin: '0 0 4px' }}>No journeys yet</p>
                            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px', margin: 0 }}>Start exploring above</p>
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
                                                />
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button 
                                                        onClick={() => setEditingJourneyId(null)} 
                                                        style={{ flex: 1, padding: '10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)', backgroundColor: 'transparent', color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button 
                                                        onClick={saveRename} 
                                                        style={{ flex: 1, padding: '10px', borderRadius: '12px', backgroundColor: '#fff', color: '#000', fontSize: '14px', fontWeight: 'bold', border: 'none' }}
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
                                                    style={{ flex: 1, textAlign: 'left', minWidth: 0, background: 'none', border: 'none', padding: 0 }}
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
                                                    style={{ padding: '8px', color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none' }}
                                                >
                                                    <Icons.Edit style={{ width: 16, height: 16 }} />
                                                </button>
                                                <button 
                                                    onClick={() => { 
                                                        if (confirm('Delete this journey?')) {
                                                            deleteConversation(convo.id);
                                                        }
                                                    }} 
                                                    style={{ padding: '8px', color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none' }}
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

    // ========== CHAT VIEW ==========
    if (viewMode === 'chat') {
        return (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', backgroundColor: '#000000' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <button 
                        onClick={() => setView(AppView.DASHBOARD)} 
                        style={{ padding: '8px', color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none' }}
                    >
                        <Icons.ArrowLeft style={{ width: 20, height: 20 }} />
                    </button>
                    <button 
                        onClick={() => setShowJourneysList(true)} 
                        style={{ textAlign: 'center', padding: '4px 12px', borderRadius: '12px', background: 'none', border: 'none' }}
                    >
                        <h1 style={{ color: '#fff', fontWeight: 'bold', fontSize: '14px', margin: 0 }}>{activeConvo?.name || 'THE GUIDE'}</h1>
                        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', margin: 0 }}>Tap to see journeys</p>
                    </button>
                    <button 
                        onClick={() => setViewMode('planet')} 
                        style={{ padding: '8px', color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none' }}
                    >
                        <Icons.Globe style={{ width: 20, height: 20 }} />
                    </button>
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                    {(!activeConvo || activeConvo.messages.length === 0) && (
                        <div style={{ textAlign: 'center', padding: '48px 0' }}>
                            <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                <Icons.Zap style={{ width: 32, height: 32, color: 'rgba(255,255,255,0.3)' }} />
                            </div>
                            <h2 style={{ color: '#fff', fontWeight: 'bold', fontSize: '18px', margin: '0 0 8px' }}>Ask Your Guide</h2>
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', margin: 0 }}>What do you need help with?</p>
                        </div>
                    )}

                    {activeConvo?.messages.map((msg) => (
                        <div key={msg.id} style={{ display: 'flex', marginBottom: '16px', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                            <div style={{ maxWidth: '85%' }}>
                                {msg.role !== 'user' && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.05))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Icons.Zap style={{ width: 12, height: 12, color: 'rgba(255,255,255,0.6)' }} />
                                        </div>
                                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>Guide</span>
                                    </div>
                                )}
                                
                                {msg.attachment && msg.attachment.type === 'image' && (
                                    <img 
                                        src={`data:${msg.attachment.mimeType};base64,${msg.attachment.data}`}
                                        alt="Attachment"
                                        style={{ maxWidth: '100%', borderRadius: '12px', marginBottom: '8px' }}
                                    />
                                )}
                                {msg.attachment && msg.attachment.type === 'pdf' && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', padding: '8px 12px', marginBottom: '8px' }}>
                                        <Icons.FileText style={{ width: 20, height: 20, color: 'rgba(255,255,255,0.6)' }} />
                                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>PDF Document</span>
                                    </div>
                                )}
                                
                                <div style={{ 
                                    borderRadius: '16px', 
                                    padding: '12px 16px',
                                    backgroundColor: msg.role === 'user' ? '#fff' : 'rgba(255,255,255,0.1)',
                                    color: msg.role === 'user' ? '#111' : 'rgba(255,255,255,0.9)',
                                    border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.1)',
                                    borderBottomRightRadius: msg.role === 'user' ? '4px' : '16px',
                                    borderBottomLeftRadius: msg.role === 'user' ? '16px' : '4px'
                                }}>
                                    <p style={{ fontSize: '14px', lineHeight: 1.5, margin: 0, whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                                </div>
                                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', margin: '4px 0 0', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                                    {msg.timestamp ? formatTime(msg.timestamp) : ''}
                                </p>
                            </div>
                        </div>
                    ))}
                    
                    {isChatLoading && (
                        <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '16px' }}>
                            <div style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '16px', borderBottomLeftRadius: '4px', padding: '12px 16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    {[0, 1, 2].map(i => (
                                        <div key={i} className="animate-bounce" style={{ width: 8, height: 8, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: '50%', animationDelay: `${i * 150}ms` }} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div style={{ padding: '16px' }}>
                    {attachment && (
                        <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '8px' }}>
                            {attachment.type === 'image' && attachmentPreview && (
                                <img src={attachmentPreview} alt="Preview" style={{ width: 48, height: 48, borderRadius: '8px', objectFit: 'cover' }} />
                            )}
                            {attachment.type === 'pdf' && (
                                <div style={{ width: 48, height: 48, borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Icons.FileText style={{ width: 24, height: 24, color: 'rgba(255,255,255,0.6)' }} />
                                </div>
                            )}
                            <span style={{ flex: 1, color: 'rgba(255,255,255,0.6)', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{attachment.type} attached</span>
                            <button onClick={removeAttachment} style={{ padding: '4px', color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none' }}>
                                <Icons.X style={{ width: 16, height: 16 }} />
                            </button>
                        </div>
                    )}
                    
                    <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: isInputFocused ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px' }}>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                accept="image/*,.pdf,audio/*"
                                style={{ display: 'none' }}
                            />
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                style={{ padding: '8px', color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none' }}
                            >
                                <Icons.Paperclip style={{ width: 20, height: 20 }} />
                            </button>
                            <input
                                type="text"
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                onFocus={() => setIsInputFocused(true)}
                                onBlur={() => setIsInputFocused(false)}
                                placeholder="Ask anything..."
                                style={{ flex: 1, backgroundColor: 'transparent', color: '#fff', fontSize: '16px', border: 'none', outline: 'none' }}
                                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={(!chatInput.trim() && !attachment) || isChatLoading}
                                style={{ 
                                    padding: '8px', 
                                    borderRadius: '8px', 
                                    backgroundColor: (chatInput.trim() || attachment) && !isChatLoading ? '#fff' : 'rgba(255,255,255,0.1)',
                                    color: (chatInput.trim() || attachment) && !isChatLoading ? '#000' : 'rgba(255,255,255,0.3)',
                                    border: 'none'
                                }}
                            >
                                <Icons.Send style={{ width: 16, height: 16 }} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ========== PLANET VIEW ==========
return (
    <div style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex', 
        flexDirection: 'column', 
        overflow: 'hidden',
        backgroundColor: '#000000'
    }}>
        {/* Canvas - Full screen background */}
        <canvas 
            ref={canvasRef} 
            style={{ 
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                touchAction: 'none',
                zIndex: 0
            }}
        />

        {/* Header */}
        <div style={{
            position: 'relative',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px',
            paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))',
            pointerEvents: 'none'
        }}>
            <button 
                onClick={() => setView(AppView.DASHBOARD)} 
                className="p-2 rounded-xl text-white/50 active:text-white"
                style={{ pointerEvents: 'auto' }}
            >
                <Icons.ArrowLeft className="w-5 h-5" />
            </button>
            
            <button 
                onClick={() => setShowJourneysList(true)} 
                className="text-center px-3 py-1 rounded-xl active:bg-white/10"
                style={{ pointerEvents: 'auto' }}
            >
                <h1 className="text-white font-bold text-sm">{activeConvo?.name || 'THE GUIDE'}</h1>
                <p className="text-white/30 text-[10px]">Tap to see journeys</p>
            </button>

            <button 
                onClick={() => setViewMode('chat')} 
                className="p-2 rounded-xl text-white/50 active:text-white"
                style={{ pointerEvents: 'auto' }}
            >
                <Icons.MessageCircle className="w-5 h-5" />
            </button>
        </div>

        {/* AI Response Panel - Above planet */}
        {isJourneyActive && journeySteps.length > 0 && currentStepIndex >= 0 && (
            <div style={{
                position: 'relative',
                zIndex: 10,
                padding: '0 20px',
                marginBottom: '10px',
                pointerEvents: 'none'
            }}>
                <div style={{
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    borderRadius: '16px',
                    padding: '16px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(10px)',
                    pointerEvents: 'auto'
                }}>
                    <p className="text-white/40 text-xs uppercase tracking-widest mb-1">
                        Step {currentStepIndex + 1} of {journeySteps.length}
                    </p>
                    <h3 className="text-white text-base font-bold mb-2">
                        {journeySteps[currentStepIndex]?.title || ''}
                    </h3>
                    <div className="text-white/80 text-sm leading-relaxed max-h-[100px] overflow-y-auto">
                        {displayedText}
                        {isTyping && <span className="inline-block w-0.5 h-4 bg-white ml-1 animate-pulse" />}
                    </div>
                    
                    {/* Navigation buttons */}
                    <div className="flex gap-3 mt-3">
                        <button
                            onClick={goToPrevStep}
                            disabled={currentStepIndex === 0}
                            className={`flex-1 py-2 rounded-xl text-sm font-medium ${
                                currentStepIndex === 0 
                                    ? 'bg-white/5 text-white/30' 
                                    : 'bg-white/10 text-white active:bg-white/20'
                            }`}
                        >
                            Previous
                        </button>
                        <button
                            onClick={goToNextStep}
                            disabled={currentStepIndex === journeySteps.length - 1}
                            className={`flex-1 py-2 rounded-xl text-sm font-medium ${
                                currentStepIndex === journeySteps.length - 1 
                                    ? 'bg-white/5 text-white/30' 
                                    : 'bg-white text-black active:bg-white/90'
                            }`}
                        >
                            {currentStepIndex === journeySteps.length - 1 ? 'Done' : 'Next'}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Welcome text - only when no journey */}
        {!isJourneyActive && !isChatLoading && (
            <div style={{
                position: 'relative',
                zIndex: 10,
                padding: '0 20px',
                pointerEvents: 'none'
            }}>
                <p className="text-white/30 text-xs uppercase tracking-widest mb-2">Welcome</p>
                <h2 className="text-white text-xl font-bold leading-tight mb-2">
                    What would you like guidance on?
                </h2>
                <p className="text-white/50 text-sm leading-relaxed">
                    Share your challenges or goals.
                </p>
            </div>
        )}

        {/* Loading state */}
        {isChatLoading && (
            <div style={{
                position: 'relative',
                zIndex: 10,
                padding: '0 20px',
                pointerEvents: 'none'
            }}>
                <div className="flex gap-1.5 mb-2">
                    {[0, 1, 2].map(i => (
                        <div key={i} className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                    ))}
                </div>
                <p className="text-white/50 text-sm">Charting your journey...</p>
            </div>
        )}

        {/* Spacer to push input down */}
        <div style={{ flex: 1 }} />

        {/* Input at bottom */}
        <div style={{
            position: 'relative',
            zIndex: 10,
            padding: '16px 20px',
            paddingBottom: '20px',
            pointerEvents: 'auto'
        }}>
            {/* Attachment preview */}
            {attachment && (
                <div className="mb-2 flex items-center gap-2 bg-white/5 rounded-xl p-2">
                    {attachment.type === 'image' && attachmentPreview && (
                        <img src={attachmentPreview} alt="Preview" className="w-12 h-12 rounded-lg object-cover" />
                    )}
                    {attachment.type === 'pdf' && (
                        <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">
                            <Icons.FileText className="w-6 h-6 text-white/60" />
                        </div>
                    )}
                    <span className="flex-1 text-white/60 text-sm truncate">{attachment.type} attached</span>
                    <button onClick={removeAttachment} className="p-1 text-white/40 active:text-white">
                        <Icons.X className="w-4 h-4" />
                    </button>
                </div>
            )}
            
            <div className={`bg-white/5 backdrop-blur rounded-2xl border ${isInputFocused ? 'border-white/30' : 'border-white/10'}`}>
                <div className="flex items-center gap-2 px-3 py-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept="image/*,.pdf,audio/*"
                        className="hidden"
                    />
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-white/40 active:text-white rounded-lg"
                    >
                        <Icons.Paperclip className="w-5 h-5" />
                    </button>
                    <input
                        type="text"
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onFocus={() => setIsInputFocused(true)}
                        onBlur={() => setIsInputFocused(false)}
                        placeholder="Ask anything..."
                        className="flex-1 bg-transparent text-white text-sm placeholder:text-white/30 focus:outline-none"
                        style={{ fontSize: '16px' }}
                        onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={(!chatInput.trim() && !attachment) || isChatLoading}
                        className={`p-2 rounded-xl ${
                            (chatInput.trim() || attachment) && !isChatLoading 
                                ? 'bg-white text-black' 
                                : 'bg-white/10 text-white/30'
                        }`}
                    >
                        <Icons.Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    </div>
);
