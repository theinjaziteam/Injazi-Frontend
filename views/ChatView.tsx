// views/ChatView.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { ChatMessage, ChatAttachment } from '../types';
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
    const { user, setUser } = useApp();
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [chatAttachment, setChatAttachment] = useState<ChatAttachment | undefined>(undefined);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

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
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 100) + 'px';
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

    const handleSendMessage = async () => {
        if (!chatInput.trim() && !chatAttachment) return;
        if (!user.goal) return;
        
        const safetyCheck = await checkContentSafety(chatInput);
        if (!safetyCheck.isSafe) {
            alert("Message not sent. Please keep conversation safe.");
            return;
        }
        
        const newMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            text: chatInput,
            timestamp: Date.now(),
            attachment: chatAttachment
        };

        setUser(prev => ({ ...prev, chatHistory: [...prev.chatHistory, newMessage] }));
        setChatInput('');
        setChatAttachment(undefined);
        setIsChatLoading(true);

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
        setIsChatLoading(false);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const maxSize = 10 * 1024 * 1024;
            
            if (file.size > maxSize) {
                alert('File too large. Max 10MB.');
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

    return (
        <div className="flex flex-col h-full theme-transition theme-bg-page">
            {/* Header */}
            <div className="flex-shrink-0 px-5 py-4 pt-safe border-b theme-border theme-bg-card">
                <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 theme-brand-primary rounded-2xl flex items-center justify-center">
                            <Icons.Bot className="w-5 h-5 text-white"/>
                        </div>
                        <div>
                            <h1 className="text-base font-bold theme-text-primary leading-tight">The Guide</h1>
                            <p className="text-[10px] text-secondary font-semibold uppercase tracking-wider">Success Architect</p>
                        </div>
                    </div>
                    <button className="p-2 theme-text-muted hover:theme-text-primary transition-colors rounded-full hover:theme-bg-hover">
                        <Icons.Settings className="w-5 h-5" />
                    </button>
                </div>
            </div>
            
            {/* Chat Body */}
            <div 
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto px-5 py-4"
            >
                {/* Empty State - Compact */}
                {user.chatHistory.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center px-6">
                        <div className="w-20 h-20 theme-bg-surface rounded-full flex items-center justify-center mb-5">
                            <Icons.Bot className="w-9 h-9 theme-text-muted" />
                        </div>
                        <p className="text-lg font-bold theme-text-primary mb-2">Ready to assist.</p>
                        <p className="text-sm theme-text-muted leading-relaxed">
                            I'm analyzing your goal: <span className="text-secondary font-semibold">"{user.goal?.title}"</span>.
                            <br />Ask me anything about your strategy or tasks.
                        </p>
                    </div>
                )}

                {/* Messages */}
                {user.chatHistory.length > 0 && (
                    <div className="space-y-4">
                        {user.chatHistory.map(msg => (
                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-3.5 rounded-2xl relative group ${
                                    msg.role === 'user' 
                                    ? 'theme-brand-primary text-white rounded-br-md' 
                                    : 'theme-bg-surface theme-text-secondary rounded-bl-md'
                                }`}>
                                    {msg.attachment && (
                                        <div className="mb-2 rounded-lg overflow-hidden">
                                            {msg.attachment.type === 'image' && (
                                                <img 
                                                    src={`data:${msg.attachment.mimeType};base64,${msg.attachment.data}`} 
                                                    className="w-full max-h-40 object-cover rounded-lg" 
                                                    alt="Attachment"
                                                />
                                            )}
                                            {msg.attachment.type === 'pdf' && (
                                                <div className="p-2 flex items-center gap-2 bg-black/10 rounded-lg">
                                                    <Icons.FileText className="w-4 h-4" />
                                                    <span className="text-xs">PDF Document</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                                    
                                    {/* TTS button for AI */}
                                    {msg.role === 'ai' && (
                                        <button 
                                            onClick={() => isSpeaking ? stopSpeaking() : speakText(msg.text)}
                                            className="absolute -bottom-2 right-2 p-1 theme-bg-card rounded-full theme-shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            {isSpeaking ? (
                                                <Icons.Pause className="w-3 h-3 theme-text-muted" />
                                            ) : (
                                                <Icons.PlayCircle className="w-3 h-3 theme-text-muted" />
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                        
                        {/* Loading indicator */}
                        {isChatLoading && (
                            <div className="flex justify-start">
                                <div className="theme-bg-surface theme-text-muted rounded-2xl rounded-bl-md p-3.5 flex items-center gap-2">
                                    <div className="flex gap-1">
                                        <span className="w-1.5 h-1.5 theme-bg-hover rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                                        <span className="w-1.5 h-1.5 theme-bg-hover rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                                        <span className="w-1.5 h-1.5 theme-bg-hover rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Input Area - Fixed at bottom, no extra space */}
            <div className="flex-shrink-0 px-4 pb-safe border-t theme-border theme-bg-card" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 100px)' }}>
                <div className="py-3">
                    <div className="rounded-2xl p-1.5 flex items-end gap-2 theme-bg-surface border theme-border">
                        {/* Attachment */}
                        <button 
                            onClick={() => document.getElementById('chat-upload')?.click()}
                            className={`p-2.5 rounded-xl flex-shrink-0 transition-colors ${chatAttachment ? 'bg-secondary text-white' : 'theme-text-muted hover:theme-text-primary hover:theme-bg-card'}`}
                        >
                            {chatAttachment ? <Icons.Check className="w-4 h-4"/> : <Icons.Paperclip className="w-4 h-4"/>}
                            <input 
                                id="chat-upload" 
                                type="file" 
                                className="hidden" 
                                accept="image/*,.pdf"
                                onChange={handleFileUpload} 
                            />
                        </button>

                        {/* Input */}
                        <div className="flex-1 py-1.5">
                            {chatAttachment && (
                                <div className="text-[10px] font-semibold text-secondary mb-1 flex items-center gap-1">
                                    <Icons.Paperclip className="w-3 h-3"/> 
                                    {chatAttachment.type === 'image' ? 'Image' : 'PDF'} attached
                                    <button onClick={() => setChatAttachment(undefined)} className="ml-1 theme-text-muted hover:text-red-500">
                                        <Icons.X className="w-3 h-3"/>
                                    </button>
                                </div>
                            )}
                            <textarea 
                                ref={textareaRef}
                                value={chatInput} 
                                onChange={e => setChatInput(e.target.value)} 
                                placeholder="Message The Guide..." 
                                className="w-full bg-transparent border-none focus:outline-none resize-none text-sm placeholder:theme-text-muted leading-relaxed theme-text-primary" 
                                rows={1}
                                style={{ minHeight: '22px', maxHeight: '80px' }}
                                onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                            />
                        </div>

                        {/* Send */}
                        <button 
                            onClick={handleSendMessage} 
                            disabled={!chatInput.trim() && !chatAttachment}
                            className={`p-2.5 rounded-xl transition-all flex-shrink-0 ${
                                chatInput.trim() || chatAttachment 
                                    ? 'theme-brand-primary text-white' 
                                    : 'theme-bg-hover theme-text-muted'
                            }`}
                        >
                            <Icons.Send className="w-4 h-4"/>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
