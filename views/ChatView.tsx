import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { useApp } from '../contexts/AppContext';
import { AppView, ChatMessage, JourneyStep, GuideConversation } from '../types';
import { getChatResponse } from '../services/geminiService';
import { WelcomeIntro, TourOverlay } from '../components/GuideWelcome';
import { 
  Send, 
  Paperclip, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  MessageCircle, 
  Globe, 
  Check, 
  Edit3,
  Zap,
  ChevronRight as ChevronRightIcon,
  FileText,
  Image as ImageIcon,
  Mic
} from 'lucide-react';

// ============ UTILITIES (outside component for stability) ============

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const parseAIResponseToSteps = (text: string): JourneyStep[] => {
  const steps: JourneyStep[] = [];
  
  // Try numbered steps first (1. 2. 3. or 1) 2) 3))
  const numberedRegex = /(?:^|\n)\s*(?:\d+[\.\)]\s*)(.+?)(?=\n\s*\d+[\.\)]|\n\n|$)/gs;
  let matches = [...text.matchAll(numberedRegex)];
  
  if (matches.length >= 2) {
    matches.slice(0, 6).forEach((match, i) => {
      steps.push({
        id: `step-${i}`,
        title: `Step ${i + 1}`,
        content: match[1].trim(),
        position: { lat: Math.random() * 60 - 30, lng: Math.random() * 120 - 60 },
        isActive: false,
        isCompleted: false,
      });
    });
    return steps;
  }
  
  // Try bullet points
  const bulletRegex = /(?:^|\n)\s*[-•*]\s*(.+?)(?=\n\s*[-•*]|\n\n|$)/gs;
  matches = [...text.matchAll(bulletRegex)];
  
  if (matches.length >= 2) {
    matches.slice(0, 6).forEach((match, i) => {
      steps.push({
        id: `step-${i}`,
        title: `Point ${i + 1}`,
        content: match[1].trim(),
        position: { lat: Math.random() * 60 - 30, lng: Math.random() * 120 - 60 },
        isActive: false,
        isCompleted: false,
      });
    });
    return steps;
  }
  
  // Try paragraphs
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 20);
  if (paragraphs.length >= 2) {
    paragraphs.slice(0, 6).forEach((para, i) => {
      steps.push({
        id: `step-${i}`,
        title: `Part ${i + 1}`,
        content: para.trim(),
        position: { lat: Math.random() * 60 - 30, lng: Math.random() * 120 - 60 },
        isActive: false,
        isCompleted: false,
      });
    });
    return steps;
  }
  
  // Fallback: split by sentences
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  if (sentences.length >= 2) {
    const grouped: string[] = [];
    for (let i = 0; i < sentences.length; i += 2) {
      grouped.push(sentences.slice(i, i + 2).join(' ').trim());
    }
    grouped.slice(0, 6).forEach((group, i) => {
      steps.push({
        id: `step-${i}`,
        title: `Insight ${i + 1}`,
        content: group,
        position: { lat: Math.random() * 60 - 30, lng: Math.random() * 120 - 60 },
        isActive: false,
        isCompleted: false,
      });
    });
    return steps;
  }
  
  // Ultimate fallback
  steps.push({
    id: 'step-0',
    title: 'Guidance',
    content: text.trim() || 'Your guide is ready to help.',
    position: { lat: 0, lng: 0 },
    isActive: false,
    isCompleted: false,
  });
  
  return steps;
};

// ============ MEMOIZED SUB-COMPONENTS ============

const MasterAgentButton = memo(({ onClick }: { onClick: () => void }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-tour="agent"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 24px',
        background: isHovered ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(12px)',
        border: `1px solid rgba(255,255,255,${isHovered ? 0.15 : 0.08})`,
        borderRadius: 40,
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
      }}
    >
      <Zap size={16} style={{ color: 'rgba(255,255,255,0.7)' }} />
      <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: 500 }}>
        Master Agent
      </span>
      <ChevronRightIcon size={14} style={{ color: 'rgba(255,255,255,0.5)' }} />
    </button>
  );
});

const MasterAgentQuickActionCard = memo(({ onClick }: { onClick: () => void }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '16px 20px',
        background: isHovered ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(12px)',
        border: `1px solid rgba(255,255,255,${isHovered ? 0.12 : 0.08})`,
        borderRadius: 16,
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        width: '100%',
        textAlign: 'left',
      }}
    >
      <div style={{
        width: 40,
        height: 40,
        borderRadius: 12,
        background: 'rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Zap size={20} style={{ color: 'rgba(255,255,255,0.8)' }} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ color: '#fff', fontSize: 15, fontWeight: 500, marginBottom: 2 }}>
          Master Agent
        </div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
          AI automation tools
        </div>
      </div>
      <div style={{
        padding: '4px 8px',
        background: 'rgba(100,200,150,0.15)',
        borderRadius: 6,
        fontSize: 10,
        color: 'rgba(100,200,150,0.9)',
        fontWeight: 600,
      }}>
        NEW
      </div>
      <ChevronRightIcon size={16} style={{ color: 'rgba(255,255,255,0.4)' }} />
    </button>
  );
});

MasterAgentButton.displayName = 'MasterAgentButton';
MasterAgentQuickActionCard.displayName = 'MasterAgentQuickActionCard';

// ============ MAIN COMPONENT ============

const ChatView: React.FC = () => {
  const { user, setUser, setCurrentView } = useApp();
  
  // Welcome/Tour state
  const [welcomePhase, setWelcomePhase] = useState<'intro' | 'tour' | 'complete'>(() => {
    return localStorage.getItem('guideWelcomeSeen') ? 'complete' : 'intro';
  });
  const [tourStep, setTourStep] = useState(0);
  
  // Chat state
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  
  // Attachment state
  const [attachment, setAttachment] = useState<{ type: string; data: string; mimeType: string } | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  
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
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isJourneyActive, setIsJourneyActive] = useState(false);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const starsRef = useRef<Array<{ x: number; y: number; size: number; opacity: number }>>([]);
  const rotationRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  
  // Other refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  
  // ============ MEMOIZED VALUES ============
  
  const activeConversation = useMemo(() => {
    return conversations.find(c => c.id === activeConversationId) || null;
  }, [conversations, activeConversationId]);
  
  const currentGoal = useMemo(() => {
    return user?.goals?.[0] || null;
  }, [user?.goals]);
  
  // ============ LOAD/SAVE CONVERSATIONS ============
  
  useEffect(() => {
    if (user?.guideConversations) {
      setConversations(user.guideConversations);
      if (user.guideConversations.length > 0 && !activeConversationId) {
        setActiveConversationId(user.guideConversations[0].id);
      }
    }
  }, []);
  
  useEffect(() => {
    if (user && conversations.length > 0) {
      setUser({ ...user, guideConversations: conversations });
    }
  }, [conversations]);
  
  // ============ CANVAS SETUP & ANIMATION ============
  
  useEffect(() => {
    if (viewMode !== 'planet' || showJourneysList || welcomePhase !== 'complete') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Initialize stars once
    if (starsRef.current.length === 0) {
      starsRef.current = Array.from({ length: 200 }, () => ({
        x: Math.random(),
        y: Math.random(),
        size: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.5 + 0.3,
      }));
    }
    
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    
    resize();
    window.addEventListener('resize', resize);
    
    const draw = () => {
      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);
      
      if (w <= 0 || h <= 0) {
        animationFrameRef.current = requestAnimationFrame(draw);
        return;
      }
      
      // Clear
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);
      
      // Stars
      starsRef.current.forEach(star => {
        ctx.beginPath();
        ctx.arc(star.x * w, star.y * h, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${star.opacity * (0.8 + Math.sin(Date.now() / 2000 + star.x * 10) * 0.2)})`;
        ctx.fill();
      });
      
      // Planet positioning - centered between header and input
      const topOffset = 120;
      const bottomOffset = 180;
      const availableHeight = h - topOffset - bottomOffset;
      const centerX = w / 2;
      const centerY = topOffset + availableHeight / 2;
      const radius = Math.min(w, h) * 0.28;
      
      // Auto rotation
      if (!isDraggingRef.current) {
        rotationRef.current.y += 0.001;
      }
      
      // Planet glow
      const gradient = ctx.createRadialGradient(centerX, centerY, radius * 0.8, centerX, centerY, radius * 1.4);
      gradient.addColorStop(0, 'rgba(30,30,60,0.3)');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
      
      // Planet body
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#0a0a12';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Grid lines
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 0.5;
      
      // Latitude lines
      for (let lat = -60; lat <= 60; lat += 30) {
        const latRad = (lat * Math.PI) / 180;
        const y = centerY - Math.sin(latRad) * radius;
        const xRadius = Math.cos(latRad) * radius;
        
        ctx.beginPath();
        ctx.ellipse(centerX, y, xRadius, xRadius * 0.3, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      
      // Longitude lines
      for (let lng = 0; lng < 180; lng += 30) {
        const lngRad = ((lng + rotationRef.current.y * 180 / Math.PI) * Math.PI) / 180;
        
        ctx.beginPath();
        ctx.ellipse(
          centerX + Math.sin(lngRad) * radius * 0.1,
          centerY,
          Math.abs(Math.cos(lngRad)) * radius,
          radius,
          0, 0, Math.PI * 2
        );
        ctx.stroke();
      }
      
      // Journey step markers
      if (journeySteps.length > 0) {
        journeySteps.forEach((step, i) => {
          const latRad = (step.position.lat * Math.PI) / 180;
          const lngRad = ((step.position.lng + rotationRef.current.y * 180 / Math.PI) * Math.PI) / 180;
          
          const x3d = Math.cos(latRad) * Math.sin(lngRad);
          const z3d = Math.cos(latRad) * Math.cos(lngRad);
          
          if (z3d > -0.2) {
            const x = centerX + x3d * radius;
            const y = centerY - Math.sin(latRad) * radius;
            const scale = (z3d + 1) / 2;
            
            // Connection line to previous
            if (i > 0) {
              const prev = journeySteps[i - 1];
              const prevLatRad = (prev.position.lat * Math.PI) / 180;
              const prevLngRad = ((prev.position.lng + rotationRef.current.y * 180 / Math.PI) * Math.PI) / 180;
              const prevX3d = Math.cos(prevLatRad) * Math.sin(prevLngRad);
              const prevZ3d = Math.cos(prevLatRad) * Math.cos(prevLngRad);
              
              if (prevZ3d > -0.2) {
                const prevX = centerX + prevX3d * radius;
                const prevY = centerY - Math.sin(prevLatRad) * radius;
                
                ctx.beginPath();
                ctx.moveTo(prevX, prevY);
                ctx.lineTo(x, y);
                ctx.strokeStyle = step.isCompleted ? 'rgba(100,200,150,0.4)' : 'rgba(255,255,255,0.15)';
                ctx.lineWidth = 1;
                ctx.stroke();
              }
            }
            
            // Marker dot
            const markerSize = (step.isActive ? 8 : 5) * scale;
            ctx.beginPath();
            ctx.arc(x, y, markerSize, 0, Math.PI * 2);
            
            if (step.isActive) {
              ctx.fillStyle = '#fff';
              ctx.shadowColor = '#fff';
              ctx.shadowBlur = 15;
            } else if (step.isCompleted) {
              ctx.fillStyle = 'rgba(100,200,150,0.8)';
              ctx.shadowBlur = 0;
            } else {
              ctx.fillStyle = 'rgba(255,255,255,0.4)';
              ctx.shadowBlur = 0;
            }
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        });
      }
      
      animationFrameRef.current = requestAnimationFrame(draw);
    };
    
    draw();
    
    // Pointer events for drag
    const handlePointerDown = (e: PointerEvent) => {
      isDraggingRef.current = true;
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      canvas.setPointerCapture(e.pointerId);
    };
    
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - lastPointerRef.current.x;
      rotationRef.current.y += dx * 0.005;
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
    };
    
    const handlePointerUp = (e: PointerEvent) => {
      isDraggingRef.current = false;
      canvas.releasePointerCapture(e.pointerId);
    };
    
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointercancel', handlePointerUp);
    
    return () => {
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointercancel', handlePointerUp);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [viewMode, showJourneysList, journeySteps, welcomePhase]);
  
  // ============ SCROLL TO BOTTOM ============
  
  useEffect(() => {
    if (viewMode === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeConversation?.messages, viewMode]);
  
  // ============ TYPING EFFECT ============
  
  const typeText = useCallback((text: string) => {
    setIsTyping(true);
    setDisplayedText('');
    let index = 0;
    
    const type = () => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
        typingTimeoutRef.current = setTimeout(type, 15);
      } else {
        setIsTyping(false);
      }
    };
    
    type();
    
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);
  
  // ============ CONVERSATION HANDLERS ============
  
  const createConversation = useCallback(() => {
    const newConvo: GuideConversation = {
      id: `convo-${Date.now()}`,
      name: `Journey ${conversations.length + 1}`,
      createdAt: Date.now(),
      messages: [],
      journeySteps: [],
    };
    setConversations(prev => [newConvo, ...prev]);
    setActiveConversationId(newConvo.id);
    setJourneySteps([]);
    setIsJourneyActive(false);
    setDisplayedText('');
    setShowJourneysList(false);
  }, [conversations.length]);
  
  const deleteConversation = useCallback((id: string) => {
    setConversations(prev => {
      const updated = prev.filter(c => c.id !== id);
      if (activeConversationId === id && updated.length > 0) {
        setActiveConversationId(updated[0].id);
      } else if (updated.length === 0) {
        setActiveConversationId(null);
      }
      return updated;
    });
  }, [activeConversationId]);
  
  const saveRename = useCallback((id: string) => {
    if (editingName.trim()) {
      setConversations(prev => prev.map(c => 
        c.id === id ? { ...c, name: editingName.trim() } : c
      ));
    }
    setEditingJourneyId(null);
    setEditingName('');
  }, [editingName]);
  
  // ============ ATTACHMENT HANDLERS ============
  
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }
    
    try {
      const base64 = await fileToBase64(file);
      let type = 'document';
      if (file.type.startsWith('image/')) type = 'image';
      else if (file.type.startsWith('audio/')) type = 'audio';
      else if (file.type === 'application/pdf') type = 'pdf';
      
      setAttachment({ type, data: base64, mimeType: file.type });
      setAttachmentPreview(URL.createObjectURL(file));
    } catch (err) {
      console.error('Error processing file:', err);
    }
    
    e.target.value = '';
  }, []);
  
  const removeAttachment = useCallback(() => {
    if (attachmentPreview) {
      URL.revokeObjectURL(attachmentPreview);
    }
    setAttachment(null);
    setAttachmentPreview(null);
  }, [attachmentPreview]);
  
  // Cleanup attachment preview on unmount
  useEffect(() => {
    return () => {
      if (attachmentPreview) {
        URL.revokeObjectURL(attachmentPreview);
      }
    };
  }, []);
  
  // ============ MESSAGE HANDLER ============
  
  const handleSendMessage = useCallback(async () => {
    if ((!chatInput.trim() && !attachment) || isChatLoading) return;
    
    const messageText = chatInput.trim();
    setChatInput('');
    setIsChatLoading(true);
    
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      text: messageText,
      timestamp: Date.now(),
      attachment: attachment || undefined,
    };
    
    // Create conversation if needed
    let targetConvoId = activeConversationId;
    if (!targetConvoId) {
      const newConvo: GuideConversation = {
        id: `convo-${Date.now()}`,
        name: messageText.slice(0, 30) || 'New Journey',
        createdAt: Date.now(),
        messages: [],
        journeySteps: [],
      };
      setConversations(prev => [newConvo, ...prev]);
      targetConvoId = newConvo.id;
      setActiveConversationId(newConvo.id);
    }
    
    // Add user message
    setConversations(prev => prev.map(c => 
      c.id === targetConvoId 
        ? { ...c, messages: [...c.messages, userMessage] }
        : c
    ));
    
    removeAttachment();
    
    try {
      // Build history
      const convo = conversations.find(c => c.id === targetConvoId);
      const history = convo?.messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.text,
      })) || [];
      
      const response = await getChatResponse(
        currentGoal,
        history,
        messageText,
        user?.profile,
        user?.tasks?.filter(t => t.status !== 'completed'),
        user?.connectedApps,
        attachment || undefined,
        []
      );
      
      const validResponse = response || "I couldn't generate a proper response. Please try again.";
      
      const aiMessage: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        role: 'assistant',
        text: validResponse,
        timestamp: Date.now(),
      };
      
      const newSteps = parseAIResponseToSteps(validResponse);
      
      setConversations(prev => prev.map(c => 
        c.id === targetConvoId 
          ? { ...c, messages: [...c.messages, aiMessage], journeySteps: newSteps }
          : c
      ));
      
      setJourneySteps(newSteps);
      
      if (newSteps.length > 0 && viewMode === 'planet') {
        setTimeout(() => {
          setCurrentStepIndex(0);
          setIsJourneyActive(true);
          const updatedSteps = newSteps.map((s, i) => ({ ...s, isActive: i === 0 }));
          setJourneySteps(updatedSteps);
          typeText(updatedSteps[0].content);
        }, 300);
      }
    } catch (err) {
      console.error('Chat error:', err);
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now()}-error`,
        role: 'assistant',
        text: 'Sorry, I encountered an error. Please try again.',
        timestamp: Date.now(),
      };
      setConversations(prev => prev.map(c => 
        c.id === targetConvoId 
          ? { ...c, messages: [...c.messages, errorMessage] }
          : c
      ));
    } finally {
      setIsChatLoading(false);
    }
  }, [chatInput, attachment, isChatLoading, activeConversationId, conversations, currentGoal, user, viewMode, typeText, removeAttachment]);
  
  // ============ JOURNEY NAVIGATION ============
  
  const navigateToStep = useCallback((index: number) => {
    if (index < 0 || index >= journeySteps.length) return;
    
    const updated = journeySteps.map((s, i) => ({
      ...s,
      isActive: i === index,
      isCompleted: i < index ? true : s.isCompleted,
    }));
    
    setJourneySteps(updated);
    setCurrentStepIndex(index);
    typeText(updated[index].content);
  }, [journeySteps, typeText]);
  
  const goToNextStep = useCallback(() => {
    if (currentStepIndex < journeySteps.length - 1) {
      navigateToStep(currentStepIndex + 1);
    }
  }, [currentStepIndex, journeySteps.length, navigateToStep]);
  
  const goToPrevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      navigateToStep(currentStepIndex - 1);
    }
  }, [currentStepIndex, navigateToStep]);
  
  // ============ WELCOME HANDLERS ============
  
  const handleStartTour = useCallback(() => {
    setWelcomePhase('tour');
  }, []);
  
  const handleSkipWelcome = useCallback(() => {
    setWelcomePhase('complete');
    localStorage.setItem('guideWelcomeSeen', 'true');
  }, []);
  
  const handleTourNext = useCallback(() => {
    if (tourStep < 4) {
      setTourStep(prev => prev + 1);
    } else {
      setWelcomePhase('complete');
      localStorage.setItem('guideWelcomeSeen', 'true');
    }
  }, [tourStep]);
  
  const handleTourBack = useCallback(() => {
    setTourStep(prev => Math.max(0, prev - 1));
  }, []);
  
  // ============ RENDER ============
  
  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      background: '#000',
      overflow: 'hidden',
    }}>
      {/* Canvas - always renders */}
      {viewMode === 'planet' && !showJourneysList && welcomePhase === 'complete' && (
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            touchAction: 'none',
          }}
        />
      )}
      
      {/* Header */}
      {welcomePhase === 'complete' && (
        <div 
          data-tour="header"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 100,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)',
          }}
        >
          <button
            onClick={() => setShowJourneysList(!showJourneysList)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 16px',
              background: 'rgba(255,255,255,0.06)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 20,
              color: '#fff',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            <Globe size={16} />
            <span>Journeys</span>
          </button>
          
          <button
            onClick={() => setViewMode(viewMode === 'planet' ? 'chat' : 'planet')}
            data-tour="chat-toggle"
            style={{
              padding: '10px',
              background: 'rgba(255,255,255,0.06)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12,
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            {viewMode === 'planet' ? <MessageCircle size={18} /> : <Globe size={18} />}
          </button>
        </div>
      )}
      
      {/* Journeys List */}
      {showJourneysList && welcomePhase === 'complete' && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: '#000',
          zIndex: 200,
          padding: '70px 16px 16px',
          overflowY: 'auto',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
          }}>
            <h2 style={{ color: '#fff', fontSize: 24, fontWeight: 300 }}>Your Journeys</h2>
            <button
              onClick={createConversation}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 16px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 20,
                color: '#fff',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              <Plus size={16} />
              New
            </button>
          </div>
          
          {conversations.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: 'rgba(255,255,255,0.5)',
            }}>
              <Globe size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
              <p>No journeys yet. Start a conversation to begin.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {conversations.map(convo => (
                <div
                  key={convo.id}
                  onClick={() => {
                    setActiveConversationId(convo.id);
                    setJourneySteps(convo.journeySteps || []);
                    setShowJourneysList(false);
                  }}
                  style={{
                    padding: 16,
                    background: convo.id === activeConversationId 
                      ? 'rgba(255,255,255,0.08)' 
                      : 'rgba(255,255,255,0.03)',
                    border: `1px solid rgba(255,255,255,${convo.id === activeConversationId ? 0.15 : 0.08})`,
                    borderRadius: 16,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    {editingJourneyId === convo.id ? (
                      <input
                        value={editingName}
                        onChange={e => setEditingName(e.target.value)}
                        onBlur={() => saveRename(convo.id)}
                        onKeyDown={e => e.key === 'Enter' && saveRename(convo.id)}
                        onClick={e => e.stopPropagation()}
                        autoFocus
                        style={{
                          background: 'rgba(255,255,255,0.1)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: 8,
                          padding: '6px 10px',
                          color: '#fff',
                          fontSize: 16,
                          outline: 'none',
                        }}
                      />
                    ) : (
                      <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 500, marginBottom: 4 }}>
                        {convo.name}
                      </h3>
                    )}
                    
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setEditingJourneyId(convo.id);
                          setEditingName(convo.name);
                        }}
                        style={{
                          padding: 6,
                          background: 'rgba(255,255,255,0.1)',
                          border: 'none',
                          borderRadius: 6,
                          color: 'rgba(255,255,255,0.6)',
                          cursor: 'pointer',
                        }}
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          deleteConversation(convo.id);
                        }}
                        style={{
                          padding: 6,
                          background: 'rgba(255,100,100,0.1)',
                          border: 'none',
                          borderRadius: 6,
                          color: 'rgba(255,100,100,0.8)',
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  
                  <p style={{
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: 13,
                    marginTop: 8,
                  }}>
                    {convo.messages.length} messages • {new Date(convo.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Planet View Content */}
      {viewMode === 'planet' && !showJourneysList && welcomePhase === 'complete' && (
        <>
          {/* Welcome text */}
          {!isJourneyActive && (
            <div style={{
              position: 'absolute',
              top: 70,
              left: 0,
              right: 0,
              textAlign: 'center',
              padding: '0 20px',
              zIndex: 10,
            }}>
              <h1 style={{
                color: '#fff',
                fontSize: 'clamp(20px, 5vw, 28px)',
                fontWeight: 300,
                marginBottom: 8,
              }}>
                What would you like guidance on?
              </h1>
              <p style={{
                color: 'rgba(255,255,255,0.5)',
                fontSize: 14,
              }}>
                Ask anything and watch your journey unfold
              </p>
            </div>
          )}
          
          {/* Journey Step Content Box */}
          {isJourneyActive && journeySteps.length > 0 && (
            <div style={{
              position: 'absolute',
              bottom: 200,
              left: 16,
              right: 16,
              background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 20,
              padding: 20,
              zIndex: 50,
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}>
                <span style={{
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: 12,
                  fontWeight: 500,
                }}>
                  STEP {currentStepIndex + 1} OF {journeySteps.length}
                </span>
                <button
                  onClick={() => {
                    setIsJourneyActive(false);
                    setDisplayedText('');
                  }}
                  style={{
                    padding: 4,
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                  }}
                >
                  <X size={16} />
                </button>
              </div>
              
              <h3 style={{
                color: '#fff',
                fontSize: 18,
                fontWeight: 500,
                marginBottom: 12,
              }}>
                {journeySteps[currentStepIndex]?.title}
              </h3>
              
              <p style={{
                color: 'rgba(255,255,255,0.8)',
                fontSize: 15,
                lineHeight: 1.6,
                marginBottom: 16,
                minHeight: 60,
              }}>
                {displayedText}
                {isTyping && <span style={{ opacity: 0.5 }}>|</span>}
              </p>
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <button
                  onClick={goToPrevStep}
                  disabled={currentStepIndex === 0}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 16px',
                    background: 'rgba(255,255,255,0.08)',
                    border: 'none',
                    borderRadius: 20,
                    color: currentStepIndex === 0 ? 'rgba(255,255,255,0.3)' : '#fff',
                    fontSize: 14,
                    cursor: currentStepIndex === 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  <ChevronLeft size={16} />
                  Back
                </button>
                
                {/* Progress dots */}
                <div style={{ display: 'flex', gap: 6 }}>
                  {journeySteps.map((_, i) => (
                    <div
                      key={i}
                      onClick={() => navigateToStep(i)}
                      style={{
                        width: i === currentStepIndex ? 20 : 8,
                        height: 8,
                        borderRadius: 4,
                        background: i === currentStepIndex 
                          ? '#fff' 
                          : i < currentStepIndex 
                            ? 'rgba(100,200,150,0.6)' 
                            : 'rgba(255,255,255,0.2)',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                      }}
                    />
                  ))}
                </div>
                
                <button
                  onClick={goToNextStep}
                  disabled={currentStepIndex === journeySteps.length - 1}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 16px',
                    background: currentStepIndex === journeySteps.length - 1 
                      ? 'rgba(100,200,150,0.2)' 
                      : 'rgba(255,255,255,0.1)',
                    border: 'none',
                    borderRadius: 20,
                    color: '#fff',
                    fontSize: 14,
                    cursor: currentStepIndex === journeySteps.length - 1 ? 'not-allowed' : 'pointer',
                  }}
                >
                  {currentStepIndex === journeySteps.length - 1 ? (
                    <>
                      <Check size={16} />
                      Done
                    </>
                  ) : (
                    <>
                      Next
                      <ChevronRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
          
          {/* Master Agent Button */}
          <div
            data-tour="agent"
            style={{
              position: 'absolute',
              bottom: 110,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 50,
            }}
          >
            <MasterAgentButton onClick={() => setCurrentView(AppView.ECOMMERCE_AGENT)} />
          </div>
        </>
      )}
      
      {/* Chat View */}
      {viewMode === 'chat' && !showJourneysList && welcomePhase === 'complete' && (
        <div style={{
          position: 'absolute',
          top: 60,
          bottom: 100,
          left: 0,
          right: 0,
          overflowY: 'auto',
          padding: '16px',
        }}>
          {!activeConversation || activeConversation.messages.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              textAlign: 'center',
              padding: '0 20px',
            }}>
              <Globe size={64} style={{ color: 'rgba(255,255,255,0.2)', marginBottom: 24 }} />
              <h2 style={{ color: '#fff', fontSize: 24, fontWeight: 300, marginBottom: 12 }}>
                Start a conversation
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, marginBottom: 32 }}>
                Ask for guidance on any topic
              </p>
              <MasterAgentQuickActionCard onClick={() => setCurrentView(AppView.ECOMMERCE_AGENT)} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {activeConversation.messages.map(msg => (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div style={{
                    maxWidth: '85%',
                    padding: '12px 16px',
                    background: msg.role === 'user' 
                      ? 'rgba(255,255,255,0.1)' 
                      : 'rgba(255,255,255,0.05)',
                    border: `1px solid rgba(255,255,255,${msg.role === 'user' ? 0.15 : 0.08})`,
                    borderRadius: msg.role === 'user' 
                      ? '16px 16px 4px 16px' 
                      : '16px 16px 16px 4px',
                  }}>
                    {msg.attachment && (
                      <div style={{
                        marginBottom: 8,
                        padding: 8,
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}>
                        {msg.attachment.type === 'image' ? (
                          <ImageIcon size={16} style={{ color: 'rgba(255,255,255,0.6)' }} />
                        ) : msg.attachment.type === 'pdf' ? (
                          <FileText size={16} style={{ color: 'rgba(255,255,255,0.6)' }} />
                        ) : (
                          <Mic size={16} style={{ color: 'rgba(255,255,255,0.6)' }} />
                        )}
                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
                          Attachment
                        </span>
                      </div>
                    )}
                    <p style={{
                      color: 'rgba(255,255,255,0.9)',
                      fontSize: 15,
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                    }}>
                      {msg.text}
                    </p>
                    <span style={{
                      display: 'block',
                      color: 'rgba(255,255,255,0.3)',
                      fontSize: 11,
                      marginTop: 6,
                      textAlign: msg.role === 'user' ? 'right' : 'left',
                    }}>
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                </div>
              ))}
              
              {isChatLoading && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-start',
                }}>
                  <div style={{
                    padding: '12px 16px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '16px 16px 16px 4px',
                  }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {[0, 1, 2].map(i => (
                        <div
                          key={i}
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.4)',
                            animation: `bounce 1.4s ease-in-out ${i * 0.16}s infinite`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      )}
      
      {/* Input Area */}
      {welcomePhase === 'complete' && !showJourneysList && (
        <div
          data-tour="input"
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '16px',
            paddingBottom: '24px',
            background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.8) 70%, transparent 100%)',
            zIndex: 100,
          }}
        >
          {/* Attachment Preview */}
          {attachmentPreview && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: 12,
              marginBottom: 12,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12,
            }}>
              {attachment?.type === 'image' ? (
                <img
                  src={attachmentPreview}
                  alt="Preview"
                  style={{
                    width: 48,
                    height: 48,
                    objectFit: 'cover',
                    borderRadius: 8,
                  }}
                />
              ) : (
                <div style={{
                  width: 48,
                  height: 48,
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {attachment?.type === 'pdf' ? (
                    <FileText size={24} style={{ color: 'rgba(255,255,255,0.6)' }} />
                  ) : (
                    <Mic size={24} style={{ color: 'rgba(255,255,255,0.6)' }} />
                  )}
                </div>
              )}
              <span style={{ flex: 1, color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
                {attachment?.type === 'image' ? 'Image' : attachment?.type === 'pdf' ? 'PDF Document' : 'Audio'} attached
              </span>
              <button
                onClick={removeAttachment}
                style={{
                  padding: 8,
                  background: 'rgba(255,100,100,0.1)',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
              >
                <X size={16} style={{ color: 'rgba(255,100,100,0.8)' }} />
              </button>
            </div>
          )}
          
          {/* Input Row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '4px 4px 4px 16px',
            background: isInputFocused ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)',
            border: `1px solid rgba(255,255,255,${isInputFocused ? 0.15 : 0.1})`,
            borderRadius: 28,
            transition: 'all 0.2s ease',
          }}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*,application/pdf,audio/*"
              style={{ display: 'none' }}
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: 8,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <Paperclip size={20} style={{ color: 'rgba(255,255,255,0.5)' }} />
            </button>
            
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              placeholder="Ask for guidance..."
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#fff',
                fontSize: 15,
              }}
            />
            
            <button
              onClick={handleSendMessage}
              disabled={(!chatInput.trim() && !attachment) || isChatLoading}
              style={{
                padding: 12,
                background: (chatInput.trim() || attachment) && !isChatLoading
                  ? 'rgba(255,255,255,0.15)'
                  : 'rgba(255,255,255,0.05)',
                border: 'none',
                borderRadius: '50%',
                cursor: (chatInput.trim() || attachment) && !isChatLoading ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease',
              }}
            >
              <Send size={18} style={{
                color: (chatInput.trim() || attachment) && !isChatLoading
                  ? '#fff'
                  : 'rgba(255,255,255,0.3)',
              }} />
            </button>
          </div>
        </div>
      )}
      
      {/* Welcome Intro Overlay */}
      {welcomePhase === 'intro' && (
        <WelcomeIntro
          onStartTour={handleStartTour}
          onSkip={handleSkipWelcome}
        />
      )}
      
      {/* Tour Overlay */}
      {welcomePhase === 'tour' && (
        <TourOverlay
          step={tourStep}
          onNext={handleTourNext}
          onBack={handleTourBack}
          onSkip={handleSkipWelcome}
        />
      )}
      
      {/* Global styles for animations */}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
};

export default ChatView;
