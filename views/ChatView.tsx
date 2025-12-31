import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { AppView, ChatMessage, ChatAttachment } from '../types';
import { Icons } from '../components/UIComponents';
import { getChatResponse } from '../services/geminiService';
import { WelcomeIntro, TourOverlay } from '../components/GuideWelcome';

// Types
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

// Utility function outside component to prevent recreation
const fileToBase64 = (file: File): Promise<string> => 
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

const formatTime = (ts: number) => 
    new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const getPosition = (index: number, total: number) => ({
    lat: 35 - (index * (70 / Math.max(total - 1, 1))) + (Math.random() - 0.5) * 10,
    lng: -120 + (index * (240 / Math.max(total - 1, 1))) + (Math.random() - 0.5) * 10
});

// Parse AI response to journey steps
const parseAIResponseToSteps = (response: string | undefined | null): JourneyStep[] => {
    if (!response?.trim()) {
        return [{ id: 's-0', title: 'Guidance', content: 'I could not generate a proper response. Please try again.', position: { lat: 20, lng: 0 }, isActive: false, isCompleted: false }];
    }

    const clean = response.replace(/undefined|\*\*/gi, '').replace(/\*/g, '').trim();
    if (!clean) return [{ id: 's-0', title: 'Guidance', content: 'I could not generate a proper response. Please try again.', position: { lat: 20, lng: 0 }, isActive: false, isCompleted: false }];

    // Try numbered steps
    const numberedRegex = /(?:^|\n)\s*(?:Step\s*)?(\d+)[.):\-]\s*([^\n]+(?:\n(?!\s*(?:Step\s*)?\d+[.):\-])[^\n]*)*)/gi;
    const numberedSteps: { num: number; content: string }[] = [];
    let match;
    while ((match = numberedRegex.exec(clean)) !== null) {
        const content = (match[2] || '').replace(/\n+/g, ' ').trim();
        if (content.length > 10) numberedSteps.push({ num: parseInt(match[1]), content });
    }
    if (numberedSteps.length >= 2) {
        numberedSteps.sort((a, b) => a.num - b.num);
        const total = Math.min(numberedSteps.length, 6);
        return numberedSteps.slice(0, total).map((s, i) => ({
            id: `s-${i}`, title: `Step ${i + 1}`, content: s.content, position: getPosition(i, total), isActive: false, isCompleted: false
        }));
    }

    // Try bullet points
    const bulletRegex = /(?:^|\n)\s*[-]\s*([^\n]+)/g;
    const bulletSteps: string[] = [];
    while ((match = bulletRegex.exec(clean)) !== null) {
        const content = (match[1] || '').trim();
        if (content.length > 10) bulletSteps.push(content);
    }
    if (bulletSteps.length >= 2) {
        const total = Math.min(bulletSteps.length, 6);
        return bulletSteps.slice(0, total).map((content, i) => ({
            id: `s-${i}`, title: `Step ${i + 1}`, content, position: getPosition(i, total), isActive: false, isCompleted: false
        }));
    }

    // Try paragraphs
    const paragraphs = clean.split(/\n\n+/).filter(p => p.trim().length > 30);
    if (paragraphs.length >= 2) {
        const total = Math.min(paragraphs.length, 5);
        return paragraphs.slice(0, total).map((p, i) => ({
            id: `s-${i}`, title: `Step ${i + 1}`, content: p.replace(/\n/g, ' ').trim(), position: getPosition(i, total), isActive: false, isCompleted: false
        }));
    }

    return [{ id: 's-0', title: 'Guidance', content: clean, position: { lat: 20, lng: 0 }, isActive: false, isCompleted: false }];
};

// Main component
export default function ChatView() {
    const { user, setUser, setView } = useApp();
    
    // Welcome/Tour state
    const [welcomePhase, setWelcomePhase] = useState<'intro' | 'tour' | 'complete'>(() => 
        localStorage.getItem('guideWelcomeSeen') ? 'complete' : 'intro'
    );
    const [tourStep, setTourStep] = useState(0);
    const TOUR_STEPS = 5;

    // Chat state
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [attachment, setAttachment] = useState<ChatAttachment | null>(null);
    const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Conversation state
    const [conversations, setConversations] = useState<GuideConversation[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [showJourneysList, setShowJourneysList] = useState(false);
    const [editingJourneyId, setEditingJourneyId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    
    // View state
    const [viewMode, setViewMode] = useState<'planet' | 'chat'>('planet');
    
    // Journey state
    const [journeySteps, setJourneySteps] = useState<JourneyStep[]>([]);
    const [currentStepIndex, setCurrentStepIndex] = useState(-1);
    const [isJourneyActive, setIsJourneyActive] = useState(false);
    const [displayedText, setDisplayedText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const typingRef = useRef<number | null>(null);
    
    // Canvas refs
    const [canvasKey, setCanvasKey] = useState(0);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number | null>(null);
    const rotationRef = useRef({ y: 0, targetY: 0, velocity: 0 });
    const dragRef = useRef({ isDragging: false, lastX: 0 });
    const starsRef = useRef<{ x: number; y: number; z: number; brightness: number }[]>([]);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Derived state
    const activeConvo = useMemo(() => 
        conversations.find(c => c.id === activeConversationId), 
        [conversations, activeConversationId]
    );

    // Welcome handlers
    const handleStartTour = useCallback(() => {
        setWelcomePhase('tour');
        setTourStep(0);
    }, []);

    const handleSkipWelcome = useCallback(() => {
        localStorage.setItem('guideWelcomeSeen', 'true');
        setWelcomePhase('complete');
    }, []);

    const handleNextTourStep = useCallback(() => {
        if (tourStep < TOUR_STEPS - 1) {
            setTourStep(s => s + 1);
        } else {
            localStorage.setItem('guideWelcomeSeen', 'true');
            setWelcomePhase('complete');
        }
    }, [tourStep]);

    const handlePrevTourStep = useCallback(() => {
        if (tourStep > 0) setTourStep(s => s - 1);
    }, [tourStep]);

    // Load/save conversations
    useEffect(() => {
        const saved = (user as any).guideConversations;
        if (Array.isArray(saved)) setConversations(saved);
    }, []);

    useEffect(() => {
        if (conversations.length > 0 || (user as any).guideConversations?.length > 0) {
            setUser(prev => ({ ...prev, guideConversations: conversations } as any));
        }
    }, [conversations, setUser]);

    // Handle conversation changes
    useEffect(() => {
        if (!activeConversationId) {
            setJourneySteps([]);
            setIsJourneyActive(false);
            setCurrentStepIndex(-1);
            setDisplayedText('');
            return;
        }
        const convo = conversations.find(c => c.id === activeConversationId);
        if (convo?.journeySteps?.length) {
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

    // Scroll to bottom
    useEffect(() => {
        if (viewMode === 'chat' && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [viewMode, conversations, activeConversationId]);

    // Initialize stars
    useEffect(() => {
        if (!starsRef.current.length) {
            starsRef.current = Array.from({ length: 200 }, () => ({
                x: Math.random() * 2 - 1,
                y: Math.random() * 2 - 1,
                z: Math.random(),
                brightness: Math.random()
            }));
        }
    }, []);

    // Update rotation on step change
    useEffect(() => {
        if (currentStepIndex >= 0 && journeySteps[currentStepIndex]) {
            rotationRef.current.targetY = -journeySteps[currentStepIndex].position.lng * Math.PI / 180;
        }
    }, [currentStepIndex, journeySteps]);

    // Canvas re-render trigger
    useEffect(() => {
        if (!showJourneysList && viewMode === 'planet') {
            const t = setTimeout(() => setCanvasKey(k => k + 1), 50);
            return () => clearTimeout(t);
        }
    }, [showJourneysList, viewMode]);

    // Canvas rendering
    useEffect(() => {
        if (viewMode !== 'planet' || showJourneysList) {
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

        let width = 0, height = 0, isRunning = true;

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

        if (!starsRef.current.length) {
            starsRef.current = Array.from({ length: 200 }, () => ({
                x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: Math.random(), brightness: Math.random()
            }));
        }

        const draw = () => {
            if (!isRunning) return;
            
            const dpr = window.devicePixelRatio || 1;
            const w = width / dpr, h = height / dpr;
            
            if (!w || !h) {
                animationRef.current = requestAnimationFrame(draw);
                return;
            }
            
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, w, h);

            // Stars
            const time = Date.now();
            starsRef.current.forEach(star => {
                const twinkle = 0.3 + Math.sin(time * 0.002 + star.brightness * 10) * 0.5;
                ctx.fillStyle = `rgba(255,255,255,${star.z * twinkle * 0.8})`;
                ctx.beginPath();
                ctx.arc((star.x + 1) * w / 2, (star.y + 1) * h / 2, star.brightness * 1.5 + 0.5, 0, Math.PI * 2);
                ctx.fill();
            });

            // Planet position
            const topOffset = 180, bottomOffset = 190;
            const centerX = w * 0.5;
            const centerY = topOffset + (h - topOffset - bottomOffset) / 2;
            const radius = Math.min(w, h) * 0.25;

            // Rotation
            if (!dragRef.current.isDragging) {
                rotationRef.current.y += (rotationRef.current.targetY - rotationRef.current.y) * 0.05;
                rotationRef.current.velocity *= 0.96;
                rotationRef.current.y += rotationRef.current.velocity;
                rotationRef.current.targetY = rotationRef.current.y;
                if (Math.abs(rotationRef.current.velocity) < 0.001 && !journeySteps.length) {
                    rotationRef.current.y += 0.002;
                    rotationRef.current.targetY = rotationRef.current.y;
                }
            }
            const rotation = rotationRef.current.y;

            // Glow
            const glow = ctx.createRadialGradient(centerX, centerY, radius * 0.9, centerX, centerY, radius * 1.5);
            glow.addColorStop(0, 'rgba(100,120,255,0.08)');
            glow.addColorStop(1, 'transparent');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius * 1.5, 0, Math.PI * 2);
            ctx.fill();

            // Planet
            const planetGrad = ctx.createRadialGradient(centerX - radius * 0.3, centerY - radius * 0.3, 0, centerX, centerY, radius);
            planetGrad.addColorStop(0, '#1a1a2e');
            planetGrad.addColorStop(1, '#0a0a12');
            ctx.fillStyle = planetGrad;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.fill();

            // Grid
            ctx.strokeStyle = 'rgba(255,255,255,0.08)';
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
                ctx.strokeStyle = 'rgba(255,255,255,0.15)';
                ctx.lineWidth = 1.5;
                ctx.setLineDash([6, 4]);
                for (let i = 0; i < journeySteps.length - 1; i++) {
                    const s1 = journeySteps[i], s2 = journeySteps[i + 1];
                    const lat1 = s1.position.lat * Math.PI / 180, lng1 = (s1.position.lng * Math.PI / 180) + rotation;
                    const lat2 = s2.position.lat * Math.PI / 180, lng2 = (s2.position.lng * Math.PI / 180) + rotation;
                    if (Math.cos(lng1) > -0.1 && Math.cos(lng2) > -0.1) {
                        ctx.beginPath();
                        ctx.moveTo(centerX + Math.sin(lng1) * Math.cos(lat1) * radius, centerY - Math.sin(lat1) * radius);
                        ctx.lineTo(centerX + Math.sin(lng2) * Math.cos(lat2) * radius, centerY - Math.sin(lat2) * radius);
                        ctx.stroke();
                    }
                }
                ctx.setLineDash([]);
            }

            // Markers
            journeySteps.forEach((step, i) => {
                const lat = step.position.lat * Math.PI / 180;
                const lng = (step.position.lng * Math.PI / 180) + rotation;
                const vis = Math.cos(lng);
                if (vis < -0.1) return;

                const x = centerX + Math.sin(lng) * Math.cos(lat) * radius;
                const y = centerY - Math.sin(lat) * radius;
                const scale = 0.5 + vis * 0.5;
                const size = 12 * scale;
                const isActive = i === currentStepIndex;
                const isCompleted = i < currentStepIndex;

                if (isActive) {
                    const pulse = size * (2.5 + Math.sin(time * 0.004) * 0.8);
                    const g = ctx.createRadialGradient(x, y, 0, x, y, pulse * 2);
                    g.addColorStop(0, 'rgba(255,255,255,0.5)');
                    g.addColorStop(1, 'transparent');
                    ctx.fillStyle = g;
                    ctx.beginPath();
                    ctx.arc(x, y, pulse * 2, 0, Math.PI * 2);
                    ctx.fill();
                }

                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fillStyle = isActive ? '#fff' : isCompleted ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)';
                ctx.fill();

                ctx.fillStyle = isActive ? '#000' : 'rgba(255,255,255,0.9)';
                ctx.font = `bold ${11 * scale}px system-ui`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`${i + 1}`, x, y);
            });

            // Outline
            ctx.strokeStyle = 'rgba(255,255,255,0.12)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.stroke();

            animationRef.current = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            isRunning = false;
            window.removeEventListener('resize', resize);
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [viewMode, showJourneysList, canvasKey, journeySteps, currentStepIndex]);

    // Canvas pointer handlers
    useEffect(() => {
        if (viewMode !== 'planet' || showJourneysList) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const onDown = (e: PointerEvent) => {
            dragRef.current = { isDragging: true, lastX: e.clientX };
            canvas.style.cursor = 'grabbing';
        };
        const onMove = (e: PointerEvent) => {
            if (!dragRef.current.isDragging) return;
            const delta = e.clientX - dragRef.current.lastX;
            rotationRef.current.velocity = delta * 0.008;
            rotationRef.current.y += delta * 0.008;
            rotationRef.current.targetY = rotationRef.current.y;
            dragRef.current.lastX = e.clientX;
        };
        const onUp = () => {
            dragRef.current.isDragging = false;
            canvas.style.cursor = 'grab';
        };

        canvas.addEventListener('pointerdown', onDown);
        canvas.addEventListener('pointermove', onMove);
        canvas.addEventListener('pointerup', onUp);
        canvas.addEventListener('pointerleave', onUp);
        canvas.style.cursor = 'grab';

        return () => {
            canvas.removeEventListener('pointerdown', onDown);
            canvas.removeEventListener('pointermove', onMove);
            canvas.removeEventListener('pointerup', onUp);
            canvas.removeEventListener('pointerleave', onUp);
        };
    }, [viewMode, showJourneysList, canvasKey]);

    // Text typing effect
    const typeText = useCallback((text: string) => {
        if (typingRef.current) clearInterval(typingRef.current);
        if (!text) { setDisplayedText(''); setIsTyping(false); return; }
        setIsTyping(true);
        setDisplayedText('');
        let i = 0;
        typingRef.current = window.setInterval(() => {
            if (i < text.length) { setDisplayedText(text.substring(0, ++i)); }
            else { clearInterval(typingRef.current!); setIsTyping(false); }
        }, 15);
    }, []);

    const navigateToStep = useCallback((idx: number) => {
        if (idx < 0 || idx >= journeySteps.length) return;
        setJourneySteps(prev => prev.map((s, i) => ({ ...s, isActive: i === idx, isCompleted: i < idx })));
        setCurrentStepIndex(idx);
        typeText(journeySteps[idx]?.content || '');
    }, [journeySteps, typeText]);

    // File handling
    const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) { alert('File too large. Max 10MB.'); return; }
        try {
            const base64 = await fileToBase64(file);
            const type = file.type.includes('pdf') ? 'pdf' : file.type.includes('audio') ? 'audio' : 'image';
            setAttachment({ type, mimeType: file.type, data: base64 });
            setAttachmentPreview(URL.createObjectURL(file));
        } catch { alert('Could not read file.'); }
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, []);

    const removeAttachment = useCallback(() => {
        setAttachment(null);
        if (attachmentPreview) { URL.revokeObjectURL(attachmentPreview); setAttachmentPreview(null); }
    }, [attachmentPreview]);

    // Conversation management
    const createConversation = useCallback(() => {
        const newConvo: GuideConversation = {
            id: `j-${Date.now()}`, name: `Journey ${conversations.length + 1}`,
            createdAt: Date.now(), messages: [], journeySteps: []
        };
        setConversations(prev => [...prev, newConvo]);
        setActiveConversationId(newConvo.id);
        setJourneySteps([]); setIsJourneyActive(false); setCurrentStepIndex(-1); setDisplayedText('');
        setShowJourneysList(false);
    }, [conversations.length]);

    const saveRename = useCallback(() => {
        if (editingJourneyId && editingName.trim()) {
            setConversations(prev => prev.map(c => c.id === editingJourneyId ? { ...c, name: editingName.trim() } : c));
        }
        setEditingJourneyId(null); setEditingName('');
    }, [editingJourneyId, editingName]);

    const deleteConversation = useCallback((id: string) => {
        setConversations(prev => prev.filter(c => c.id !== id));
        if (activeConversationId === id) {
            setActiveConversationId(null); setJourneySteps([]); setIsJourneyActive(false);
            setCurrentStepIndex(-1); setDisplayedText('');
        }
    }, [activeConversationId]);

    // Send message
    const handleSendMessage = useCallback(async () => {
        const message = chatInput.trim();
        if (!message && !attachment) return;
        if (!user.goal) { alert('Please set a goal first.'); return; }

        let convoId = activeConversationId;
        if (!convoId) {
            const newConvo: GuideConversation = {
                id: `j-${Date.now()}`, name: message.slice(0, 35) + (message.length > 35 ? '...' : ''),
                createdAt: Date.now(), messages: [], journeySteps: []
            };
            setConversations(prev => [...prev, newConvo]);
            convoId = newConvo.id;
            setActiveConversationId(convoId);
        }

        const userMessage: ChatMessage = {
            id: Date.now().toString(), role: 'user',
            text: message || `[Sent ${attachment?.type}]`, timestamp: Date.now(),
            attachment: attachment || undefined
        };

        const currentConvoId = convoId;
        setConversations(prev => prev.map(c => 
            c.id === currentConvoId ? { ...c, messages: [...c.messages, userMessage] } : c
        ));

        setChatInput(''); removeAttachment(); setIsChatLoading(true);

        try {
            const convo = conversations.find(c => c.id === currentConvoId);
            const response = await getChatResponse(
                user.goal, convo?.messages || [], message,
                user.userProfile || '', user.dailyTasks || [],
                user.connectedApps || [], attachment || undefined, user.extraLogs || []
            );

            let validResponse = response?.replace(/undefined/gi, '').trim() || 
                'I had trouble generating a response. Please rephrase your question.';

            const aiMessage: ChatMessage = { id: `${Date.now() + 1}`, role: 'model', text: validResponse, timestamp: Date.now() };
            const steps = parseAIResponseToSteps(validResponse);

            setConversations(prev => prev.map(c => 
                c.id === currentConvoId ? { ...c, messages: [...c.messages, aiMessage], journeySteps: steps } : c
            ));

            setJourneySteps(steps); setIsJourneyActive(true); setIsChatLoading(false);
            setTimeout(() => { setCurrentStepIndex(0); if (steps[0]?.content) typeText(steps[0].content); }, 300);
        } catch (error) {
            console.error('Chat error:', error);
            setIsChatLoading(false);
            const errorSteps: JourneyStep[] = [{
                id: 's-error', title: 'Connection Issue',
                content: "I'm having trouble connecting. Please check your connection and try again.",
                position: { lat: 20, lng: 0 }, isActive: true, isCompleted: false
            }];
            setJourneySteps(errorSteps); setIsJourneyActive(true); setCurrentStepIndex(0);
            setDisplayedText(errorSteps[0].content);
        }
    }, [chatInput, attachment, user, activeConversationId, conversations, removeAttachment, typeText]);

    const goToNextStep = useCallback(() => {
        if (currentStepIndex < journeySteps.length - 1) navigateToStep(currentStepIndex + 1);
    }, [currentStepIndex, journeySteps.length, navigateToStep]);

    const goToPrevStep = useCallback(() => {
        if (currentStepIndex > 0) navigateToStep(currentStepIndex - 1);
    }, [currentStepIndex, navigateToStep]);

    const handleDone = useCallback(() => {
        setIsJourneyActive(false); setJourneySteps([]); setCurrentStepIndex(-1); setDisplayedText('');
    }, []);

    // Memoized components
    const MasterAgentButton = useMemo(() => (
        <button
            onClick={() => setView(AppView.ECOMMERCE_AGENT)}
            style={{
                position: 'absolute', bottom: 190, left: '50%', transform: 'translateX(-50%)', zIndex: 10,
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 24px', borderRadius: 40,
                background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', transition: 'all 0.3s ease', pointerEvents: 'auto'
            }}
        >
            <Icons.Zap style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.6)' }} />
            <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 500, fontSize: 13 }}>Master Agent</span>
            <Icons.ChevronRight style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.3)' }} />
        </button>
    ), [setView]);

    const MasterAgentCard = useMemo(() => (
        <button
            onClick={() => setView(AppView.ECOMMERCE_AGENT)}
            style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 16, padding: 16, marginBottom: 16,
                borderRadius: 16, background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', transition: 'all 0.2s ease', textAlign: 'left'
            }}
        >
            <div style={{
                width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                <Icons.Zap style={{ width: 22, height: 22, color: 'rgba(255,255,255,0.7)' }} />
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <h3 style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600, fontSize: 15, margin: 0 }}>Master Agent</h3>
                    <span style={{
                        padding: '2px 8px', borderRadius: 12, background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)',
                        fontSize: 10, fontWeight: 600, textTransform: 'uppercase'
                    }}>NEW</span>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: 0 }}>AI-powered automation for your business</p>
            </div>
            <Icons.ChevronRight style={{ width: 20, height: 20, color: 'rgba(255,255,255,0.3)' }} />
        </button>
    ), [setView]);

    // Common input component
    const InputArea = useMemo(() => (
        <div style={{ padding: 16, borderTop: viewMode === 'chat' ? '1px solid rgba(255,255,255,0.1)' : 'none', paddingBottom: viewMode === 'planet' ? 100 : 16 }}>
            {attachment && (
                <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 8 }}>
                    {attachment.type === 'image' && attachmentPreview && (
                        <img src={attachmentPreview} alt="Preview" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }} />
                    )}
                    {attachment.type === 'pdf' && (
                        <div style={{ width: 48, height: 48, borderRadius: 8, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icons.FileText style={{ width: 24, height: 24, color: 'rgba(255,255,255,0.6)' }} />
                        </div>
                    )}
                    <span style={{ flex: 1, color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>{attachment.type} attached</span>
                    <button onClick={removeAttachment} style={{ padding: 4, color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none' }}>
                        <Icons.X style={{ width: 16, height: 16 }} />
                    </button>
                </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 24, padding: '8px 16px', border: '1px solid rgba(255,255,255,0.15)' }}>
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*,.pdf,audio/*" style={{ display: 'none' }} />
                <button onClick={() => fileInputRef.current?.click()} style={{ padding: 8, color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none' }}>
                    <Icons.Paperclip style={{ width: 20, height: 20 }} />
                </button>
                <input
                    type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}}
                    placeholder="Ask anything..."
                    style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 16 }}
                />
                <button
                    onClick={handleSendMessage} disabled={isChatLoading || (!chatInput.trim() && !attachment)}
                    style={{ padding: 8, color: (chatInput.trim() || attachment) ? '#fff' : 'rgba(255,255,255,0.3)', background: 'none', border: 'none' }}
                >
                    <Icons.Send style={{ width: 20, height: 20 }} />
                </button>
            </div>
        </div>
    ), [attachment, attachmentPreview, chatInput, handleFileSelect, handleSendMessage, isChatLoading, removeAttachment, viewMode]);

    // ========== RENDER ==========

    // Welcome intro screen
    if (welcomePhase === 'intro') {
        return <WelcomeIntro onStartTour={handleStartTour} onSkip={handleSkipWelcome} />;
    }

    // Journeys list
    if (showJourneysList) {
        return (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', backgroundColor: '#000' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <button onClick={() => setShowJourneysList(false)} style={{ padding: 8, color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none' }}>
                        <Icons.ArrowLeft style={{ width: 20, height: 20 }} />
                    </button>
                    <div style={{ textAlign: 'center' }}>
                        <h1 style={{ color: '#fff', fontWeight: 'bold', fontSize: 18, margin: 0 }}>Your Journeys</h1>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: 0 }}>{conversations.length} saved</p>
                    </div>
                    <button onClick={createConversation} style={{ padding: 8, color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none' }}>
                        <Icons.Plus style={{ width: 20, height: 20 }} />
                    </button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
                    <button onClick={createConversation} style={{ width: '100%', padding: 20, marginBottom: 20, borderRadius: 16, border: '2px dashed rgba(255,255,255,0.2)', background: 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icons.Plus style={{ width: 28, height: 28, color: 'rgba(255,255,255,0.5)' }} />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 500, margin: 0 }}>Start New Journey</p>
                            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 4 }}>Ask your guide anything</p>
                        </div>
                    </button>
                    {!conversations.length ? (
                        <div style={{ textAlign: 'center', padding: '48px 0' }}>
                            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                <Icons.Globe style={{ width: 40, height: 40, color: 'rgba(255,255,255,0.2)' }} />
                            </div>
                            <p style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 500, margin: '0 0 4px' }}>No journeys yet</p>
                            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, margin: 0 }}>Start exploring above</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {conversations.map((convo, i) => {
                                const isActive = convo.id === activeConversationId;
                                const hue = (i * 47) % 360;
                                const count = convo.journeySteps?.length || convo.messages?.length || 0;
                                return (
                                    <div key={convo.id} style={{ borderRadius: 16, overflow: 'hidden', background: 'rgba(255,255,255,0.05)', border: isActive ? '2px solid rgba(255,255,255,0.3)' : 'none' }}>
                                        {editingJourneyId === convo.id ? (
                                            <div style={{ padding: 16 }}>
                                                <input
                                                    type="text" value={editingName} onChange={e => setEditingName(e.target.value)}
                                                    style={{ width: '100%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 12, padding: '12px 16px', color: '#fff', fontSize: 14, marginBottom: 12, outline: 'none' }}
                                                    autoFocus placeholder="Journey name..."
                                                    onKeyDown={e => { if (e.key === 'Enter') saveRename(); if (e.key === 'Escape') setEditingJourneyId(null); }}
                                                />
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    <button onClick={() => setEditingJourneyId(null)} style={{ flex: 1, padding: 10, borderRadius: 12, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>Cancel</button>
                                                    <button onClick={saveRename} style={{ flex: 1, padding: 10, borderRadius: 12, background: '#fff', color: '#000', fontSize: 14, fontWeight: 'bold', border: 'none' }}>Save</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
                                                <div style={{ width: 48, height: 48, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `radial-gradient(circle at 30% 30%, hsl(${hue}, 40%, 25%), #0a0a12)` }}>
                                                    <span style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>{count}</span>
                                                </div>
                                                <button onClick={() => { setActiveConversationId(convo.id); setShowJourneysList(false); }} style={{ flex: 1, textAlign: 'left', minWidth: 0, background: 'none', border: 'none', padding: 0 }}>
                                                    <h3 style={{ color: '#fff', fontWeight: 600, fontSize: 14, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{convo.name || 'Untitled'}</h3>
                                                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: '4px 0 0' }}>{convo.journeySteps?.length || 0} steps · {new Date(convo.createdAt).toLocaleDateString()}</p>
                                                </button>
                                                <button onClick={() => { setEditingJourneyId(convo.id); setEditingName(convo.name || ''); }} style={{ padding: 8, color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none' }}>
                                                    <Icons.Edit style={{ width: 16, height: 16 }} />
                                                </button>
                                                <button onClick={() => { if (confirm('Delete this journey?')) deleteConversation(convo.id); }} style={{ padding: 8, color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none' }}>
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

    // Chat view
    if (viewMode === 'chat') {
        return (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', backgroundColor: '#000' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <button onClick={() => setView(AppView.DASHBOARD)} style={{ padding: 8, color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none' }}>
                        <Icons.ArrowLeft style={{ width: 20, height: 20 }} />
                    </button>
                    <button onClick={() => setShowJourneysList(true)} style={{ textAlign: 'center', padding: '4px 12px', borderRadius: 12, background: 'none', border: 'none' }}>
                        <h1 style={{ color: '#fff', fontWeight: 'bold', fontSize: 14, margin: 0 }}>{activeConvo?.name || 'THE GUIDE'}</h1>
                        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, margin: 0 }}>Tap to see journeys</p>
                    </button>
                    <button onClick={() => setViewMode('planet')} style={{ padding: 8, color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none' }}>
                        <Icons.Globe style={{ width: 20, height: 20 }} />
                    </button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
                    {(!activeConvo || !activeConvo.messages.length) && (
                        <>
                            {MasterAgentCard}
                            <div style={{ textAlign: 'center', padding: '32px 0' }}>
                                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                    <Icons.Zap style={{ width: 32, height: 32, color: 'rgba(255,255,255,0.3)' }} />
                                </div>
                                <h2 style={{ color: '#fff', fontWeight: 'bold', fontSize: 18, margin: '0 0 8px' }}>Ask Your Guide</h2>
                                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: 0 }}>What do you need help with?</p>
                            </div>
                        </>
                    )}
                    {activeConvo?.messages.map(msg => (
                        <div key={msg.id} style={{ display: 'flex', marginBottom: 16, justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                            <div style={{ maxWidth: '85%' }}>
                                {msg.role !== 'user' && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.05))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Icons.Zap style={{ width: 12, height: 12, color: 'rgba(255,255,255,0.6)' }} />
                                        </div>
                                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Guide</span>
                                    </div>
                                )}
                                {msg.attachment?.type === 'image' && <img src={`data:${msg.attachment.mimeType};base64,${msg.attachment.data}`} alt="" style={{ maxWidth: '100%', borderRadius: 12, marginBottom: 8 }} />}
                                {msg.attachment?.type === 'pdf' && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '8px 12px', marginBottom: 8 }}>
                                        <Icons.FileText style={{ width: 20, height: 20, color: 'rgba(255,255,255,0.6)' }} />
                                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>PDF Document</span>
                                    </div>
                                )}
                                <div style={{
                                    borderRadius: 16, padding: '12px 16px',
                                    background: msg.role === 'user' ? '#fff' : 'rgba(255,255,255,0.1)',
                                    color: msg.role === 'user' ? '#111' : 'rgba(255,255,255,0.9)',
                                    border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.1)',
                                    borderBottomRightRadius: msg.role === 'user' ? 4 : 16,
                                    borderBottomLeftRadius: msg.role === 'user' ? 16 : 4
                                }}>
                                    <p style={{ fontSize: 14, lineHeight: 1.5, margin: 0, whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                                </div>
                                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', margin: '4px 0 0', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                                    {msg.timestamp ? formatTime(msg.timestamp) : ''}
                                </p>
                            </div>
                        </div>
                    ))}
                    {isChatLoading && (
                        <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 16 }}>
                            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 16, borderBottomLeftRadius: 4, padding: '12px 16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    {[0, 1, 2].map(i => <div key={i} className="animate-bounce" style={{ width: 8, height: 8, background: 'rgba(255,255,255,0.6)', borderRadius: '50%', animationDelay: `${i * 150}ms` }} />)}
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                {InputArea}
                {welcomePhase === 'tour' && <TourOverlay step={tourStep} totalSteps={TOUR_STEPS} onNext={handleNextTourStep} onPrev={handlePrevTourStep} onSkip={handleSkipWelcome} />}
            </div>
        );
    }

    // Planet view
    return (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', backgroundColor: '#000' }}>
            <canvas key={canvasKey} ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', touchAction: 'none' }} />
            
            <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', pointerEvents: 'auto' }}>
                <button onClick={() => setView(AppView.DASHBOARD)} style={{ padding: 8, color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none' }}>
                    <Icons.ArrowLeft style={{ width: 20, height: 20 }} />
                </button>
                <button onClick={() => setShowJourneysList(true)} style={{ textAlign: 'center', padding: '4px 12px', borderRadius: 12, background: 'none', border: 'none' }}>
                    <h1 style={{ color: '#fff', fontWeight: 'bold', fontSize: 14, margin: 0 }}>THE GUIDE</h1>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, margin: 0 }}>Tap to see journeys</p>
                </button>
                <button onClick={() => setViewMode('chat')} style={{ padding: 8, color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none' }}>
                    <Icons.MessageCircle style={{ width: 20, height: 20 }} />
                </button>
            </div>

            {!isJourneyActive && !isChatLoading && MasterAgentButton}

            <div style={{ position: 'relative', zIndex: 10, padding: '0 16px', pointerEvents: 'none' }}>
                {!isJourneyActive && !isChatLoading && (
                    <div style={{ pointerEvents: 'auto' }}>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 8px' }}>WELCOME</p>
                        <h2 style={{ color: '#fff', fontSize: 24, fontWeight: 'bold', margin: '0 0 8px' }}>What would you like guidance on?</h2>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: 0 }}>Share your challenges or goals.</p>
                    </div>
                )}
                {isJourneyActive && journeySteps.length > 0 && currentStepIndex >= 0 && (
                    <div style={{ pointerEvents: 'auto' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ color: '#000', fontWeight: 'bold', fontSize: 14 }}>{currentStepIndex + 1}</span>
                            </div>
                            <div>
                                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: 0 }}>Step {currentStepIndex + 1} of {journeySteps.length}</p>
                                <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', margin: 0 }}>{journeySteps[currentStepIndex]?.title || 'Guidance'}</h3>
                            </div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 16, border: '1px solid rgba(255,255,255,0.1)', maxHeight: 120, overflowY: 'auto' }}>
                            <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                                {displayedText}{isTyping && <span style={{ opacity: 0.5 }}>|</span>}
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                            <button onClick={goToPrevStep} disabled={currentStepIndex === 0} style={{ flex: 1, padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: currentStepIndex === 0 ? 'rgba(255,255,255,0.3)' : '#fff', fontSize: 14, fontWeight: 600 }}>Previous</button>
                            <button onClick={currentStepIndex === journeySteps.length - 1 ? handleDone : goToNextStep} style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: '#fff', color: '#000', fontSize: 14, fontWeight: 600 }}>
                                {currentStepIndex === journeySteps.length - 1 ? 'Done' : 'Next'}
                            </button>
                        </div>
                    </div>
                )}
                {isChatLoading && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 16, border: '1px solid rgba(255,255,255,0.1)', pointerEvents: 'auto' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                            {[0, 1, 2].map(i => <div key={i} className="animate-bounce" style={{ width: 8, height: 8, background: '#fff', borderRadius: '50%', animationDelay: `${i * 150}ms` }} />)}
                        </div>
                        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>Preparing your journey...</span>
                    </div>
                )}
            </div>

            <div style={{ flex: 1 }} />
            <div style={{ position: 'relative', zIndex: 10, padding: '16px 20px', paddingBottom: 100, pointerEvents: 'auto' }}>{InputArea}</div>
            
            {welcomePhase === 'tour' && <TourOverlay step={tourStep} totalSteps={TOUR_STEPS} onNext={handleNextTourStep} onPrev={handlePrevTourStep} onSkip={handleSkipWelcome} />}
        </div>
    );
}
