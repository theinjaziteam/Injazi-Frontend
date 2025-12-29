// views/ChatView.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { AppView, ChatMessage, ChatAttachment } from '../types';
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

export default function ChatView() {
    const { user, setUser, setView } = useApp();
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [chatAttachment, setChatAttachment] = useState<ChatAttachment | undefined>(undefined);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [showQuickActions, setShowQuickActions] = useState(true);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const inputContainerRef = useRef<HTMLDivElement>(null);

    // Quick action suggestions
    const quickActions = [
        { icon: '🎯', label: "What should I focus on today?", query: "What's the most important thing I should focus on today to make progress on my goal?" },
        { icon: '💡', label: "I'm feeling stuck", query: "I'm feeling stuck and unmotivated. Can you help me break through this?" },
        { icon: '📊', label: "Review my progress", query: "Can you review my progress so far and give me honest feedback?" },
        { icon: '🚀', label: "Accelerate my results", query: "What can I do to accelerate my progress and get results faster?" },
    ];

    // Scroll to bottom on new messages
    useEffect(() => {
        setTimeout(() => {
            if (chatContainerRef.current) {
                chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            }
        }, 100);
    }, [user.chatHistory, isChatLoading]);

    // Hide quick actions when there are messages
    useEffect(() => {
        if (user.chatHistory.length > 0) {
            setShowQuickActions(false);
        }
    }, [user.chatHistory]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
        }
    }, [chatInput]);

    // Text-to-Speech
    const speakText = (text: string) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1;
            utterance.pitch = 1;
            utterance.volume = 1;
            utterance.onstart = () => setIsSpeaking(true);
            utterance.onend = () => setIsSpeaking(false);
            utterance.onerror = () => setIsSpeaking(false);
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
            alert("Message not sent. Please keep conversation appropriate.");
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
        setShowQuickActions(false);
        setIsChatLoading(true);

        try {
            const aiResponseText = await getChatResponse(
                user.goal, 
                user.chatHistory, 
                newMessage.text, 
                user.userProfile, 
                user.dailyTasks, 
                user.connectedApps, 
                newMessage.attachment, 
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
                text: "I apologize, but I'm having trouble connecting right now. Please try again in a moment.", 
                timestamp: Date.now() 
            };
            setUser(prev => ({ ...prev, chatHistory: [...prev.chatHistory, errorMessage] }));
        }
        
        setIsChatLoading(false);
    };

    const handleQuickAction = (query: string) => {
        handleSendMessage(query);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const maxSize = 10 * 1024 * 1024;
            
            if (file.size > maxSize) {
                alert('File too large. Maximum size is 10MB.');
                return;
            }
            
            const base64 = await blobToBase64(file);
            let type: 'image' | 'pdf' | 'audio' = 'image';
            
            if (file.type.startsWith('image')) type = 'image';
            else if (file.type === 'application/pdf') type = 'pdf';
            
            setChatAttachment({ 
                type, 
                mimeType: file.type, 
                data: base64
            });
        }
    };

    const clearChat = () => {
        if (window.confirm('Clear all chat history? This cannot be undone.')) {
            setUser(prev => ({ ...prev, chatHistory: [] }));
            setShowQuickActions(true);
        }
    };

    // Format message with markdown-like styling
    const formatMessage = (text: string) => {
        // Bold text **text**
        let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>');
        // Bullet points
        formatted = formatted.replace(/^• /gm, '<span class="text-[#3423A6] mr-2">•</span>');
        formatted = formatted.replace(/^- /gm, '<span class="text-[#3423A6] mr-2">•</span>');
        // Numbered lists
        formatted = formatted.replace(/^(\d+)\. /gm, '<span class="text-[#3423A6] font-semibold mr-2">$1.</span>');
        return formatted;
    };

    const getTimeAgo = (timestamp?: number) => {
        if (!timestamp) return '';
        const diff = Date.now() - timestamp;
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    };

    return (
        <div className="flex flex-col h-full bg-[#F7F8FC]">
            {/* Premium Header */}
            <div className="flex-shrink-0 bg-gradient-to-br from-[#171738] via-[#1e1e4a] to-[#2a2a5c] text-white px-5 pt-safe pb-5 relative overflow-hidden">
                {/* Background decorations */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-[#3423A6]/30 rounded-full blur-[60px] -translate-y-1/2 translate-x-1/4" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#DFF3E4]/10 rounded-full blur-[40px] translate-y-1/2 -translate-x-1/4" />
                
                <div className="relative z-10">
                    {/* Top row */}
                    <div className="flex items-center justify-between mb-4 mt-2">
                        <button 
                            onClick={() => setView(AppView.DASHBOARD)}
                            className="p-2 -ml-2 text-white/60 hover:text-white transition-colors"
                        >
                            <Icons.ArrowLeft className="w-5 h-5" />
                        </button>
                        
                        <button 
                            onClick={clearChat}
                            className="p-2 -mr-2 text-white/40 hover:text-white/80 transition-colors"
                            title="Clear chat"
                        >
                            <Icons.Trash className="w-4 h-4" />
                        </button>
                    </div>
                    
                    {/* Guide Identity */}
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="w-16 h-16 bg-gradient-to-br from-[#DFF3E4] to-[#A7F3D0] rounded-2xl flex items-center justify-center shadow-lg shadow-[#DFF3E4]/20">
                                <svg className="w-8 h-8 text-[#171738]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 2a4 4 0 0 1 4 4c0 1.95-1.4 3.57-3.25 3.92a1 1 0 0 0-.75.97V12"/>
                                    <path d="M12 12v6"/>
                                    <circle cx="12" cy="20" r="2"/>
                                    <path d="M8 6a4 4 0 0 0-4 4c0 2.5 2 4.5 4 5"/>
                                    <path d="M16 6a4 4 0 0 1 4 4c0 2.5-2 4.5-4 5"/>
                                </svg>
                            </div>
                            {/* Online indicator */}
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-400 rounded-full border-3 border-[#171738] flex items-center justify-center">
                                <div className="w-2 h-2 bg-white rounded-full" />
                            </div>
                        </div>
                        
                        <div className="flex-1">
                            <h1 className="text-xl font-black tracking-tight">Your Guide</h1>
                            <p className="text-white/50 text-xs font-medium mt-0.5">
                                Focused on: <span className="text-[#DFF3E4]">{user.goal?.title || 'Your Success'}</span>
                            </p>
                            <div className="flex items-center gap-1.5 mt-1.5">
                                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                                <span className="text-[10px] text-emerald-400 font-medium">Ready to help</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Chat Body */}
            <div 
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto"
            >
                {/* Empty State with Quick Actions */}
                {user.chatHistory.length === 0 && (
                    <div className="flex flex-col h-full px-5 py-6">
                        {/* Welcome Section */}
                        <div className="text-center mb-8 pt-4">
                            <div className="w-20 h-20 bg-gradient-to-br from-[#3423A6]/10 to-[#3423A6]/5 rounded-3xl flex items-center justify-center mx-auto mb-4">
                                <svg className="w-10 h-10 text-[#3423A6]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                                    <path d="M8 10h.01"/>
                                    <path d="M12 10h.01"/>
                                    <path d="M16 10h.01"/>
                                </svg>
                            </div>
                            <h2 className="text-xl font-black text-[#171738] mb-2">How can I help you today?</h2>
                            <p className="text-gray-400 text-sm leading-relaxed max-w-[280px] mx-auto">
                                I'm your personal guide for <span className="text-[#3423A6] font-semibold">{user.goal?.title}</span>. 
                                Ask me anything or choose a topic below.
                            </p>
                        </div>
                        
                        {/* Quick Actions */}
                        {showQuickActions && (
                            <div className="space-y-2.5">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Quick Actions</p>
                                {quickActions.map((action, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleQuickAction(action.query)}
                                        className="w-full p-4 bg-white rounded-2xl text-left flex items-center gap-3 active:scale-[0.98] transition-all group hover:shadow-md"
                                        style={{
                                            boxShadow: '0 2px 8px -2px rgba(23, 23, 56, 0.06)'
                                        }}
                                    >
                                        <span className="text-2xl">{action.icon}</span>
                                        <span className="flex-1 text-[#171738] font-medium text-sm group-hover:text-[#3423A6] transition-colors">
                                            {action.label}
                                        </span>
                                        <Icons.ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#3423A6] transition-colors" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Messages */}
                {user.chatHistory.length > 0 && (
                    <div className="px-5 py-4 space-y-4">
                        {user.chatHistory.map((msg, index) => (
                            <div 
                                key={msg.id} 
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`max-w-[85%] ${msg.role === 'user' ? '' : 'flex gap-3'}`}>
                                    {/* AI Avatar */}
                                    {msg.role !== 'user' && (
                                        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-[#DFF3E4] to-[#A7F3D0] rounded-xl flex items-center justify-center mt-1">
                                            <svg className="w-4 h-4 text-[#171738]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M12 2a4 4 0 0 1 4 4c0 1.95-1.4 3.57-3.25 3.92a1 1 0 0 0-.75.97V12"/>
                                                <circle cx="12" cy="20" r="2"/>
                                            </svg>
                                        </div>
                                    )}
                                    
                                    <div className="flex-1">
                                        {/* Message bubble */}
                                        <div className={`p-4 rounded-2xl relative group ${
                                            msg.role === 'user' 
                                                ? 'bg-gradient-to-br from-[#171738] to-[#2a2a5c] text-white rounded-br-md shadow-lg shadow-[#171738]/20' 
                                                : 'bg-white text-[#171738] rounded-bl-md shadow-sm'
                                        }`}
                                        style={msg.role !== 'user' ? {
                                            boxShadow: '0 2px 12px -2px rgba(23, 23, 56, 0.08)'
                                        } : {}}
                                        >
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
                                                className={`text-sm leading-relaxed whitespace-pre-wrap ${
                                                    msg.role === 'user' ? '' : 'text-gray-700'
                                                }`}
                                                dangerouslySetInnerHTML={{ 
                                                    __html: msg.role === 'user' ? msg.text : formatMessage(msg.text) 
                                                }}
                                            />
                                            
                                            {/* TTS button for AI messages */}
                                            {msg.role === 'ai' && (
                                                <button 
                                                    onClick={() => isSpeaking ? stopSpeaking() : speakText(msg.text)}
                                                    className="absolute -bottom-2 right-3 p-1.5 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                                                >
                                                    {isSpeaking ? (
                                                        <Icons.Pause className="w-3.5 h-3.5 text-[#3423A6]" />
                                                    ) : (
                                                        <Icons.PlayCircle className="w-3.5 h-3.5 text-[#3423A6]" />
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                        
                                        {/* Timestamp */}
                                        <p className={`text-[10px] text-gray-400 mt-1.5 ${msg.role === 'user' ? 'text-right' : 'text-left ml-1'}`}>
                                            {getTimeAgo(msg.timestamp)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                        
                        {/* Loading indicator */}
                        {isChatLoading && (
                            <div className="flex justify-start">
                                <div className="flex gap-3">
                                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-[#DFF3E4] to-[#A7F3D0] rounded-xl flex items-center justify-center">
                                        <svg className="w-4 h-4 text-[#171738]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M12 2a4 4 0 0 1 4 4c0 1.95-1.4 3.57-3.25 3.92a1 1 0 0 0-.75.97V12"/>
                                            <circle cx="12" cy="20" r="2"/>
                                        </svg>
                                    </div>
                                    <div 
                                        className="bg-white text-gray-500 rounded-2xl rounded-bl-md p-4 flex items-center gap-2"
                                        style={{
                                            boxShadow: '0 2px 12px -2px rgba(23, 23, 56, 0.08)'
                                        }}
                                    >
                                        <div className="flex gap-1.5">
                                            <span className="w-2 h-2 bg-[#3423A6] rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                                            <span className="w-2 h-2 bg-[#3423A6] rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                                            <span className="w-2 h-2 bg-[#3423A6] rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
                                        </div>
                                        <span className="text-xs text-gray-400 ml-2">Thinking...</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Input Area - Fixed properly at bottom */}
            <div 
                ref={inputContainerRef}
                className="flex-shrink-0 bg-[#F7F8FC] border-t border-gray-200/50"
            >
                <div className="px-4 py-3 pb-safe">
                    {/* Attachment Preview */}
                    {chatAttachment && (
                        <div className="mb-3 p-3 bg-white rounded-xl flex items-center gap-3 shadow-sm">
                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                                {chatAttachment.type === 'image' ? (
                                    <img 
                                        src={`data:${chatAttachment.mimeType};base64,${chatAttachment.data}`} 
                                        className="w-full h-full object-cover" 
                                        alt="Preview"
                                    />
                                ) : (
                                    <Icons.FileText className="w-5 h-5 text-gray-400" />
                                )}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-[#171738]">
                                    {chatAttachment.type === 'image' ? 'Image' : 'PDF'} attached
                                </p>
                                <p className="text-[10px] text-gray-400">Ready to send</p>
                            </div>
                            <button 
                                onClick={() => setChatAttachment(undefined)} 
                                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                            >
                                <Icons.X className="w-4 h-4"/>
                            </button>
                        </div>
                    )}
                    
                    {/* Input Container */}
                    <div 
                        className="bg-white rounded-2xl flex items-end gap-2 p-2"
                        style={{
                            boxShadow: '0 2px 12px -2px rgba(23, 23, 56, 0.08)'
                        }}
                    >
                        {/* Attachment Button */}
                        <button 
                            onClick={() => document.getElementById('chat-upload')?.click()}
                            className="p-2.5 rounded-xl flex-shrink-0 text-gray-400 hover:text-[#3423A6] hover:bg-[#3423A6]/5 transition-all"
                        >
                            <Icons.Paperclip className="w-5 h-5"/>
                            <input 
                                id="chat-upload" 
                                type="file" 
                                className="hidden" 
                                accept="image/*,.pdf"
                                onChange={handleFileUpload} 
                            />
                        </button>

                        {/* Text Input */}
                        <div className="flex-1 py-1">
                            <textarea 
                                ref={textareaRef}
                                value={chatInput} 
                                onChange={e => setChatInput(e.target.value)} 
                                placeholder="Ask your guide anything..." 
                                className="w-full bg-transparent border-none focus:outline-none resize-none text-sm text-[#171738] placeholder:text-gray-400 leading-relaxed" 
                                rows={1}
                                style={{ minHeight: '24px', maxHeight: '120px' }}
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
                            className={`p-3 rounded-xl transition-all flex-shrink-0 ${
                                chatInput.trim() || chatAttachment 
                                    ? 'bg-gradient-to-r from-[#3423A6] to-[#4834c7] text-white shadow-lg shadow-[#3423A6]/20 hover:shadow-[#3423A6]/30 active:scale-95' 
                                    : 'bg-gray-100 text-gray-400'
                            }`}
                        >
                            <Icons.Send className="w-5 h-5"/>
                        </button>
                    </div>
                    
                    {/* Subtle hint */}
                    <p className="text-center text-[10px] text-gray-400 mt-2">
                        Press Enter to send • Shift+Enter for new line
                    </p>
                </div>
            </div>
        </div>
    );
}
