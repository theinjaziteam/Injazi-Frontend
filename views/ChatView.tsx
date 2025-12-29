// views/ChatView.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { AppView, ChatMessage, ChatAttachment, TaskStatus } from '../types';
import { Icons } from '../components/UIComponents';
import { checkContentSafety, getChatResponse } from '../services/geminiService';

// Helper for Base64
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(blob);
  });
}

// Journey zones based on progress
const journeyZones = [
    { id: 'launch', name: 'Launch Pad', icon: '🚀', color: 'from-violet-500 to-purple-600', description: 'Beginning your journey' },
    { id: 'foundation', name: 'Foundation Valley', icon: '🏔️', color: 'from-emerald-500 to-teal-600', description: 'Building your base' },
    { id: 'growth', name: 'Growth Forest', icon: '🌲', color: 'from-green-500 to-emerald-600', description: 'Expanding your skills' },
    { id: 'challenge', name: 'Challenge Peaks', icon: '⛰️', color: 'from-amber-500 to-orange-600', description: 'Overcoming obstacles' },
    { id: 'mastery', name: 'Mastery Summit', icon: '👑', color: 'from-yellow-400 to-amber-500', description: 'Achieving excellence' },
];

export default function ChatView() {
    const { user, setUser, setView } = useApp();
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [chatAttachment, setChatAttachment] = useState<ChatAttachment | undefined>(undefined);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [activeZone, setActiveZone] = useState(0);
    const [showZoneSelector, setShowZoneSelector] = useState(false);
    const [isInputFocused, setIsInputFocused] = useState(false);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Calculate current zone based on progress
    useEffect(() => {
        const progress = user.currentDay / (user.goal?.durationDays || 30);
        if (progress < 0.2) setActiveZone(0);
        else if (progress < 0.4) setActiveZone(1);
        else if (progress < 0.6) setActiveZone(2);
        else if (progress < 0.8) setActiveZone(3);
        else setActiveZone(4);
    }, [user.currentDay, user.goal?.durationDays]);

    const currentZone = journeyZones[activeZone];

    // Quick prompts based on zone
    const zonePrompts = [
        ["How do I start?", "What's my first step?", "I'm nervous"],
        ["Review my foundation", "Am I on track?", "What should I focus on?"],
        ["Help me grow faster", "I want to level up", "What's next?"],
        ["I'm facing a challenge", "This is hard", "Help me push through"],
        ["How do I maintain this?", "What's my next goal?", "Celebrate with me!"],
    ];

    // Scroll to bottom on new messages
    useEffect(() => {
        setTimeout(() => {
            if (chatContainerRef.current) {
                chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            }
        }, 100);
    }, [user.chatHistory, isChatLoading]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            const newHeight = Math.min(textareaRef.current.scrollHeight, 100);
            textareaRef.current.style.height = newHeight + 'px';
        }
    }, [chatInput]);

    // Text-to-Speech
    const speakText = (text: string) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1;
            utterance.pitch = 1;
            utterance.onstart = () => setIsSpeaking(true);
            utterance.onend = () => setIsSpeaking(false);
            window.speechSynthesis.speak(utterance);
        }
    };

    const stopSpeaking = () => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
        }
    };

    const handleSendMessage = async (overrideMessage?: string) => {
        const messageToSend = overrideMessage || chatInput;
        if (!messageToSend.trim() && !chatAttachment) return;
        if (!user.goal) return;
        
        const safetyCheck = await checkContentSafety(messageToSend);
        if (!safetyCheck.isSafe) {
            alert("Please keep the conversation appropriate.");
            return;
        }
        
        const newMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            text: messageToSend,
            timestamp: Date.now(),
            attachment: chatAttachment
        };

        setUser(prev => ({ ...prev, chatHistory: [...prev.chatHistory, newMessage] }));
        setChatInput('');
        setChatAttachment(undefined);
        setIsChatLoading(true);

        try {
            const aiResponseText = await getChatResponse(
                user.goal, 
                user.chatHistory, 
                newMessage.text, 
                user.userProfile, 
                user.dailyTasks, 
                user.connectedApps, 
                chatAttachment, // Pass attachment for AI to analyze
                user.extraLogs
            );
            
            const aiMessage: ChatMessage = { 
                id: (Date.now() + 1).toString(), 
                role: 'ai', 
                text: aiResponseText, 
                timestamp: Date.now() 
            };

            setUser(prev => ({ ...prev, chatHistory: [...prev.chatHistory, aiMessage] }));
        } catch (error) {
            console.error('Chat error:', error);
            const errorMessage: ChatMessage = { 
                id: (Date.now() + 1).toString(), 
                role: 'ai', 
                text: "I'm having trouble connecting. Let me try again in a moment.", 
                timestamp: Date.now() 
            };
            setUser(prev => ({ ...prev, chatHistory: [...prev.chatHistory, errorMessage] }));
        }
        
        setIsChatLoading(false);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const maxSize = 20 * 1024 * 1024; // 20MB
            
            if (file.size > maxSize) {
                alert('File too large. Maximum 20MB.');
                return;
            }
            
            const base64 = await blobToBase64(file);
            let type: 'image' | 'pdf' | 'audio' = 'image';
            
            if (file.type.startsWith('image')) type = 'image';
            else if (file.type === 'application/pdf') type = 'pdf';
            else if (file.type.startsWith('audio')) type = 'audio';
            
            setChatAttachment({ 
                type, 
                mimeType: file.type, 
                data: base64
            });
        }
    };

    const clearChat = () => {
        if (window.confirm('Clear chat history?')) {
            setUser(prev => ({ ...prev, chatHistory: [] }));
        }
    };

    const formatMessage = (text: string) => {
        let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-[#171738]">$1</strong>');
        formatted = formatted.replace(/^[•\-] /gm, '<span class="text-[#3423A6] mr-2">•</span>');
        formatted = formatted.replace(/^(\d+)\. /gm, '<span class="text-[#3423A6] font-bold mr-2">$1.</span>');
        return formatted;
    };

    // Progress percentage
    const progressPercent = Math.round((user.currentDay / (user.goal?.durationDays || 30)) * 100);
    
    // Completed tasks count
    const completedToday = user.dailyTasks.filter(t => 
        t.status === TaskStatus.APPROVED || t.status === TaskStatus.COMPLETED
    ).length;

    return (
        <div className="flex flex-col h-full bg-[#0a0a1a] relative overflow-hidden">
            {/* Animated Background - Stars */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(50)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            opacity: Math.random() * 0.5 + 0.2,
                            animationDelay: `${Math.random() * 3}s`,
                            animationDuration: `${2 + Math.random() * 2}s`,
                        }}
                    />
                ))}
                
                {/* Floating orbs */}
                <div className={`absolute w-64 h-64 rounded-full blur-[100px] bg-gradient-to-r ${currentZone.color} opacity-20 -top-20 -right-20 animate-float`} />
                <div className={`absolute w-48 h-48 rounded-full blur-[80px] bg-gradient-to-r ${currentZone.color} opacity-15 bottom-40 -left-20 animate-float-delayed`} />
                <div className="absolute w-32 h-32 rounded-full blur-[60px] bg-[#3423A6]/30 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>

            {/* Glass Header - Compact */}
            <div className="relative z-20 flex-shrink-0">
                <div className="bg-white/5 backdrop-blur-xl border-b border-white/10">
                    <div className="px-4 pt-safe">
                        <div className="flex items-center justify-between py-3">
                            {/* Back Button */}
                            <button 
                                onClick={() => setView(AppView.DASHBOARD)}
                                className="p-2 -ml-2 text-white/60 hover:text-white transition-colors rounded-xl hover:bg-white/10"
                            >
                                <Icons.ArrowLeft className="w-5 h-5" />
                            </button>

                            {/* Zone Indicator - Tappable */}
                            <button 
                                onClick={() => setShowZoneSelector(!showZoneSelector)}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 hover:bg-white/15 transition-all"
                            >
                                <span className="text-lg">{currentZone.icon}</span>
                                <span className="text-white/80 text-xs font-medium">{currentZone.name}</span>
                                <Icons.ChevronDown className={`w-3 h-3 text-white/50 transition-transform ${showZoneSelector ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Clear Chat */}
                            <button 
                                onClick={clearChat}
                                className="p-2 -mr-2 text-white/40 hover:text-white/80 transition-colors rounded-xl hover:bg-white/10"
                            >
                                <Icons.Trash className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Zone Selector Dropdown */}
                {showZoneSelector && (
                    <div className="absolute top-full left-0 right-0 z-30 px-4 pt-2 pb-4">
                        <div className="bg-[#1a1a2e]/95 backdrop-blur-xl rounded-2xl border border-white/10 p-3 shadow-2xl">
                            <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2 px-2">Your Journey</p>
                            <div className="space-y-1">
                                {journeyZones.map((zone, idx) => (
                                    <button
                                        key={zone.id}
                                        onClick={() => { setActiveZone(idx); setShowZoneSelector(false); }}
                                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                                            idx === activeZone 
                                                ? `bg-gradient-to-r ${zone.color} text-white` 
                                                : idx <= activeZone 
                                                    ? 'bg-white/5 text-white/80 hover:bg-white/10' 
                                                    : 'bg-white/5 text-white/30'
                                        }`}
                                    >
                                        <span className="text-xl">{zone.icon}</span>
                                        <div className="flex-1 text-left">
                                            <p className="text-sm font-semibold">{zone.name}</p>
                                            <p className="text-[10px] opacity-70">{zone.description}</p>
                                        </div>
                                        {idx < activeZone && (
                                            <Icons.Check className="w-4 h-4 text-emerald-400" />
                                        )}
                                        {idx === activeZone && (
                                            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Chat Body */}
            <div 
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto relative z-10"
                onClick={() => setShowZoneSelector(false)}
            >
                {/* Empty State - Planet View */}
                {user.chatHistory.length === 0 && (
                    <div className="flex flex-col items-center justify-center min-h-full px-5 py-8">
                        {/* 3D Planet */}
                        <div className="relative mb-8">
                            {/* Planet glow */}
                            <div className={`absolute inset-0 bg-gradient-to-r ${currentZone.color} rounded-full blur-3xl opacity-40 scale-150`} />
                            
                            {/* Planet */}
                            <div className={`relative w-32 h-32 rounded-full bg-gradient-to-br ${currentZone.color} shadow-2xl flex items-center justify-center`}>
                                {/* Planet texture overlay */}
                                <div className="absolute inset-0 rounded-full bg-gradient-to-t from-black/30 to-transparent" />
                                <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.3),transparent_50%)]" />
                                
                                {/* Zone icon */}
                                <span className="text-5xl relative z-10 drop-shadow-lg">{currentZone.icon}</span>
                                
                                {/* Orbiting ring */}
                                <div className="absolute inset-[-20px] border border-white/20 rounded-full animate-spin-slow" style={{ animationDuration: '20s' }} />
                                <div className="absolute inset-[-35px] border border-white/10 rounded-full animate-spin-slow" style={{ animationDuration: '30s', animationDirection: 'reverse' }} />
                            </div>

                            {/* Progress orbit */}
                            <svg className="absolute inset-[-25px] w-[calc(100%+50px)] h-[calc(100%+50px)]" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
                                <circle 
                                    cx="50" cy="50" r="45" 
                                    fill="none" 
                                    stroke="url(#progressGrad)" 
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeDasharray={`${2 * Math.PI * 45}`}
                                    strokeDashoffset={2 * Math.PI * 45 * (1 - progressPercent / 100)}
                                    transform="rotate(-90 50 50)"
                                />
                                <defs>
                                    <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#DFF3E4" />
                                        <stop offset="100%" stopColor="#3423A6" />
                                    </linearGradient>
                                </defs>
                            </svg>
                        </div>

                        {/* Zone Info */}
                        <div className="text-center mb-8">
                            <p className="text-white/40 text-xs uppercase tracking-widest mb-2">Currently at</p>
                            <h2 className="text-2xl font-black text-white mb-1">{currentZone.name}</h2>
                            <p className="text-white/50 text-sm">{currentZone.description}</p>
                        </div>

                        {/* Stats Row */}
                        <div className="flex items-center gap-6 mb-8">
                            <div className="text-center">
                                <p className="text-2xl font-black text-white">{progressPercent}%</p>
                                <p className="text-[10px] text-white/40 uppercase">Journey</p>
                            </div>
                            <div className="w-px h-8 bg-white/20" />
                            <div className="text-center">
                                <p className="text-2xl font-black text-white">Day {user.currentDay}</p>
                                <p className="text-[10px] text-white/40 uppercase">Current</p>
                            </div>
                            <div className="w-px h-8 bg-white/20" />
                            <div className="text-center">
                                <p className="text-2xl font-black text-white">{completedToday}</p>
                                <p className="text-[10px] text-white/40 uppercase">Tasks Done</p>
                            </div>
                        </div>

                        {/* Quick Prompts */}
                        <div className="w-full max-w-sm">
                            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-3 text-center">Quick Actions</p>
                            <div className="flex flex-wrap gap-2 justify-center">
                                {zonePrompts[activeZone].map((prompt, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleSendMessage(prompt)}
                                        className="px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/10 rounded-full text-white/80 text-sm font-medium transition-all hover:scale-105 active:scale-95"
                                    >
                                        {prompt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Messages */}
                {user.chatHistory.length > 0 && (
                    <div className="px-4 py-4 space-y-4">
                        {user.chatHistory.map((msg) => (
                            <div 
                                key={msg.id} 
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`max-w-[85%] ${msg.role === 'user' ? '' : 'flex gap-2.5'}`}>
                                    {/* AI Avatar */}
                                    {msg.role !== 'user' && (
                                        <div className={`flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br ${currentZone.color} flex items-center justify-center shadow-lg`}>
                                            <span className="text-sm">{currentZone.icon}</span>
                                        </div>
                                    )}
                                    
                                    <div className="flex-1">
                                        {/* Message bubble */}
                                        <div className={`p-4 rounded-2xl relative group ${
                                            msg.role === 'user' 
                                                ? 'bg-gradient-to-br from-[#3423A6] to-[#4834c7] text-white rounded-br-md shadow-lg shadow-[#3423A6]/30' 
                                                : 'bg-white/10 backdrop-blur-sm text-white/90 rounded-bl-md border border-white/10'
                                        }`}>
                                            {/* Attachment preview */}
                                            {msg.attachment && (
                                                <div className="mb-3 rounded-xl overflow-hidden">
                                                    {msg.attachment.type === 'image' && (
                                                        <img 
                                                            src={`data:${msg.attachment.mimeType};base64,${msg.attachment.data}`} 
                                                            className="w-full max-h-48 object-cover rounded-xl" 
                                                            alt="Attachment"
                                                        />
                                                    )}
                                                    {msg.attachment.type === 'pdf' && (
                                                        <div className="p-3 flex items-center gap-2 bg-white/10 rounded-xl">
                                                            <Icons.FileText className="w-5 h-5" />
                                                            <span className="text-sm font-medium">PDF Document</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            
                                            {/* Message text */}
                                            <div 
                                                className="text-sm leading-relaxed whitespace-pre-wrap"
                                                dangerouslySetInnerHTML={{ 
                                                    __html: msg.role === 'user' ? msg.text : formatMessage(msg.text) 
                                                }}
                                            />
                                            
                                            {/* TTS button */}
                                            {msg.role === 'ai' && (
                                                <button 
                                                    onClick={() => isSpeaking ? stopSpeaking() : speakText(msg.text)}
                                                    className="absolute -bottom-2 right-3 p-1.5 bg-white/20 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-white/30"
                                                >
                                                    {isSpeaking ? (
                                                        <Icons.Pause className="w-3 h-3 text-white" />
                                                    ) : (
                                                        <Icons.PlayCircle className="w-3 h-3 text-white" />
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        
                        {/* Loading */}
                        {isChatLoading && (
                            <div className="flex justify-start">
                                <div className="flex gap-2.5">
                                    <div className={`flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br ${currentZone.color} flex items-center justify-center`}>
                                        <span className="text-sm">{currentZone.icon}</span>
                                    </div>
                                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl rounded-bl-md p-4 border border-white/10">
                                        <div className="flex gap-1.5">
                                            <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                                            <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                                            <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Floating Input Area */}
            <div className="relative z-20 px-4 pb-safe">
                <div className="pb-3">
                    {/* Attachment Preview */}
                    {chatAttachment && (
                        <div className="mb-3 p-3 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center gap-3 border border-white/10">
                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/10 flex items-center justify-center">
                                {chatAttachment.type === 'image' ? (
                                    <img 
                                        src={`data:${chatAttachment.mimeType};base64,${chatAttachment.data}`} 
                                        className="w-full h-full object-cover" 
                                        alt="Preview"
                                    />
                                ) : chatAttachment.type === 'pdf' ? (
                                    <Icons.FileText className="w-5 h-5 text-white/60" />
                                ) : (
                                    <Icons.Music className="w-5 h-5 text-white/60" />
                                )}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-white">
                                    {chatAttachment.type === 'image' ? 'Image' : chatAttachment.type === 'pdf' ? 'PDF' : 'Audio'} ready
                                </p>
                                <p className="text-[10px] text-white/50">Will be analyzed by Guide</p>
                            </div>
                            <button 
                                onClick={() => setChatAttachment(undefined)} 
                                className="p-2 text-white/40 hover:text-red-400 transition-colors"
                            >
                                <Icons.X className="w-4 h-4"/>
                            </button>
                        </div>
                    )}
                    
                    {/* Glass Input Container */}
                    <div 
                        className={`bg-white/10 backdrop-blur-xl rounded-2xl border transition-all duration-300 ${
                            isInputFocused 
                                ? 'border-white/30 shadow-lg shadow-white/5' 
                                : 'border-white/10'
                        }`}
                    >
                        <div className="flex items-end gap-2 p-2">
                            {/* Attachment Button */}
                            <button 
                                onClick={() => document.getElementById('chat-upload')?.click()}
                                className="p-2.5 rounded-xl flex-shrink-0 text-white/50 hover:text-white hover:bg-white/10 transition-all"
                            >
                                <Icons.Paperclip className="w-5 h-5"/>
                                <input 
                                    id="chat-upload" 
                                    type="file" 
                                    className="hidden" 
                                    accept="image/*,.pdf,audio/*"
                                    onChange={handleFileUpload} 
                                />
                            </button>

                            {/* Text Input */}
                            <div className="flex-1 py-1">
                                <textarea 
                                    ref={textareaRef}
                                    value={chatInput} 
                                    onChange={e => setChatInput(e.target.value)} 
                                    onFocus={() => setIsInputFocused(true)}
                                    onBlur={() => setIsInputFocused(false)}
                                    placeholder={`Ask your Guide anything...`}
                                    className="w-full bg-transparent border-none focus:outline-none resize-none text-sm text-white placeholder:text-white/40 leading-relaxed" 
                                    rows={1}
                                    style={{ minHeight: '24px', maxHeight: '100px' }}
                                    onKeyDown={(e) => { 
                                        if(e.key === 'Enter' && !e.shiftKey) { 
                                            e.preventDefault(); 
                                            handleSendMessage(); 
                                        } 
                                    }}
                                />
                            </div>

                            {/* Send Button */}
                            <button 
                                onClick={() => handleSendMessage()} 
                                disabled={!chatInput.trim() && !chatAttachment}
                                className={`p-2.5 rounded-xl transition-all flex-shrink-0 ${
                                    chatInput.trim() || chatAttachment 
                                        ? `bg-gradient-to-r ${currentZone.color} text-white shadow-lg active:scale-95` 
                                        : 'bg-white/10 text-white/30'
                                }`}
                            >
                                <Icons.Send className="w-5 h-5"/>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Animations */}
            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0) rotate(0deg); }
                    50% { transform: translateY(-20px) rotate(5deg); }
                }
                @keyframes float-delayed {
                    0%, 100% { transform: translateY(0) rotate(0deg); }
                    50% { transform: translateY(-15px) rotate(-5deg); }
                }
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-float {
                    animation: float 8s ease-in-out infinite;
                }
                .animate-float-delayed {
                    animation: float-delayed 10s ease-in-out infinite;
                    animation-delay: -3s;
                }
                .animate-spin-slow {
                    animation: spin-slow 20s linear infinite;
                }
            `}</style>
        </div>
    );
}
