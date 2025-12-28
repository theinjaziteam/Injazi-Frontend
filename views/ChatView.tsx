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
    const chatEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom on new messages
    useEffect(() => {
        // Use a small timeout to ensure DOM is updated
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

    // Text-to-Speech function
    const speakText = (text: string) => {
        if ('speechSynthesis' in window) {
            // Cancel any ongoing speech
            window.speechSynthesis.cancel();
            
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1;
            utterance.pitch = 1;
            utterance.volume = 1;
            
            utterance.onstart = () => setIsSpeaking(true);
            utterance.onend = () => setIsSpeaking(false);
            utterance.onerror = () => setIsSpeaking(false);
            
            window.speechSynthesis.speak(utterance);
        } else {
            alert('Text-to-speech is not supported in this browser.');
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
            const maxSize = 10 * 1024 * 1024; // 10MB
            
            if (file.size > maxSize) {
                alert('File too large. Max 10MB.');
                return;
            }
            
            const base64 = await blobToBase64(file);
            let type: 'image' | 'pdf' | 'file' = 'file';
            
            if (file.type.startsWith('image')) type = 'image';
            else if (file.type === 'application/pdf') type = 'pdf';
            
            setChatAttachment({ 
                type, 
                mimeType: file.type, 
                data: base64,
                fileName: file.name
            });
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#FAFAFA] relative">
            {/* Header - Fixed */}
            <div className="flex-shrink-0 px-6 py-4 pt-safe bg-white/80 backdrop-blur-md border-b border-gray-100 z-20">
                 <div className="flex items-center justify-between mt-2">
                     <div className="flex items-center gap-4">
                         <div className="relative">
                             <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                                 <Icons.Bot className="w-5 h-5 text-white"/>
                             </div>
                             <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-[#DFF3E4] border-2 border-white rounded-full"></div>
                         </div>
                         <div>
                             <h1 className="text-lg font-bold text-primary tracking-tight leading-none">The Guide</h1>
                             <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mt-0.5">Success Architect</p>
                         </div>
                     </div>
                     <button className="p-2 text-gray-400 hover:text-primary transition-colors">
                         <Icons.Settings className="w-5 h-5" />
                     </button>
                 </div>
            </div>
            
            {/* Chat Body - Scrollable with proper padding for input */}
            <div 
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth"
                style={{ paddingBottom: '140px' }} // Space for input area
            >
                {user.chatHistory.length === 0 && (
                    <div className="flex flex-col items-center justify-center text-center mt-20 opacity-0 animate-fade-in" style={{animationDelay: '0.2s'}}>
                        <div className="w-24 h-24 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-full flex items-center justify-center mb-6 border border-white shadow-xl">
                            <Icons.Bot className="w-10 h-10 text-primary/40" />
                        </div>
                        <p className="text-lg font-bold text-primary mb-2">Ready to assist.</p>
                        <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
                            I'm analyzing your goal: <span className="text-secondary font-bold">"{user.goal?.title}"</span>. Ask me anything about your strategy or tasks.
                        </p>
                    </div>
                )}

                {user.chatHistory.map(msg => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-scale-in`}>
                        <div className={`max-w-[85%] p-4 rounded-2xl shadow-sm relative group ${
                            msg.role === 'user' 
                            ? 'bg-primary text-white rounded-tr-sm shadow-primary/20' 
                            : 'bg-white text-gray-700 border border-gray-100 rounded-tl-sm shadow-gray-200/50'
                        }`}>
                            {msg.attachment && (
                                <div className="mb-3 rounded-lg overflow-hidden border border-white/10 bg-black/50">
                                    {msg.attachment.type === 'image' && (
                                        <img 
                                            src={`data:${msg.attachment.mimeType};base64,${msg.attachment.data}`} 
                                            className="w-full max-h-48 object-cover" 
                                            alt="Attachment"
                                        />
                                    )}
                                    {msg.attachment.type === 'pdf' && (
                                        <div className="p-3 flex items-center gap-2 text-white">
                                            <Icons.FileText className="w-5 h-5" />
                                            <span className="text-sm">{msg.attachment.fileName || 'PDF Document'}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                            <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                            
                            {/* Text-to-Speech button for AI messages */}
                            {msg.role === 'ai' && (
                                <button 
                                    onClick={() => isSpeaking ? stopSpeaking() : speakText(msg.text)}
                                    className="absolute -bottom-3 right-2 p-1.5 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    {isSpeaking ? (
                                        <Icons.Pause className="w-3 h-3 text-gray-600" />
                                    ) : (
                                        <Icons.PlayCircle className="w-3 h-3 text-gray-600" />
                                    )}
                                </button>
                            )}
                            
                            <span className={`text-[9px] font-bold absolute -bottom-5 ${msg.role === 'user' ? 'right-0 text-gray-300' : 'left-0 text-gray-400'} opacity-0 group-hover:opacity-100 transition-opacity`}>
                                {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                        </div>
                    </div>
                ))}
                
                {isChatLoading && (
                    <div className="flex justify-start animate-fade-in">
                        <div className="bg-white border border-gray-100 text-gray-500 rounded-2xl rounded-tl-sm p-4 flex items-center gap-2 shadow-sm">
                            <Icons.Bot className="w-4 h-4 text-primary animate-pulse" />
                            <div className="flex gap-1">
                                <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                                <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                                <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={chatEndRef}></div>
            </div>

            {/* Fixed Input Area at Bottom */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent pt-4 pb-safe z-30" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 90px)' }}>
                <div className="px-4">
                    <div className="bg-white border border-gray-200 shadow-xl shadow-primary/5 rounded-[1.5rem] p-1.5 flex items-end gap-2">
                         {/* Attachment Toggle */}
                         <button 
                             onClick={() => document.getElementById('chat-upload')?.click()}
                             className={`p-2 rounded-full flex-shrink-0 transition-colors ${chatAttachment ? 'bg-secondary text-white' : 'text-gray-400 hover:text-primary hover:bg-gray-50'}`}
                        >
                            {chatAttachment ? <Icons.Check className="w-4 h-4"/> : <Icons.Paperclip className="w-4 h-4"/>}
                            <input 
                                id="chat-upload" 
                                type="file" 
                                className="hidden" 
                                accept="image/*,.pdf,.doc,.docx,.txt"
                                onChange={handleFileUpload} 
                            />
                        </button>

                        {/* Text Area */}
                        <div className="flex-1 py-2">
                            {chatAttachment && (
                                <div className="text-[10px] font-bold text-secondary mb-0.5 flex items-center gap-1">
                                    <Icons.Paperclip className="w-3 h-3"/> 
                                    {chatAttachment.type === 'image' ? 'Image' : chatAttachment.type === 'pdf' ? 'PDF' : 'File'} Attached
                                    <button onClick={() => setChatAttachment(undefined)} className="ml-2 text-gray-400 hover:text-red-500">
                                        <Icons.X className="w-3 h-3"/>
                                    </button>
                                </div>
                            )}
                            <textarea 
                                ref={textareaRef}
                                value={chatInput} 
                                onChange={e => setChatInput(e.target.value)} 
                                placeholder="Message The Guide..." 
                                className="w-full bg-transparent border-none focus:outline-none max-h-24 resize-none text-sm placeholder:text-gray-400 leading-relaxed" 
                                rows={1}
                                style={{ minHeight: '20px' }}
                                onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                            />
                        </div>

                        {/* Send Button */}
                        <button 
                            onClick={handleSendMessage} 
                            disabled={!chatInput.trim() && !chatAttachment}
                            className={`p-2 rounded-full shadow-md transition-all flex-shrink-0 mb-0.5 ${
                                chatInput.trim() || chatAttachment 
                                    ? 'bg-primary text-white hover:scale-105' 
                                    : 'bg-gray-100 text-gray-300 cursor-not-allowed'
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
