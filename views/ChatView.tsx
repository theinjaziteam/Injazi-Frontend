
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
    const [isChatRecording, setIsChatRecording] = useState(false);
    const chatRecorderRef = useRef<MediaRecorder | null>(null);
    const chatAudioChunksRef = useRef<Blob[]>([]);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Scroll to bottom on new messages
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [user.chatHistory, isChatLoading, chatAttachment]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [chatInput]);

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

        const aiResponseText = await getChatResponse(user.goal, user.chatHistory, newMessage.text, user.userProfile, user.dailyTasks, user.connectedApps, newMessage.attachment, user.extraLogs);
        const aiMessage: ChatMessage = { id: (Date.now() + 1).toString(), role: 'ai', text: aiResponseText, timestamp: Date.now() };

        setUser(prev => ({ ...prev, chatHistory: [...prev.chatHistory, aiMessage] }));
        setIsChatLoading(false);
    };

    const handleStartChatRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            chatAudioChunksRef.current = [];
            const recorder = new MediaRecorder(stream);
            
            recorder.ondataavailable = (e) => {
                if(e.data.size > 0) chatAudioChunksRef.current.push(e.data);
            };
            
            recorder.onstop = async () => {
                const blob = new Blob(chatAudioChunksRef.current, { type: 'audio/webm' });
                const base64 = await blobToBase64(blob);
                setChatAttachment({ type: 'audio', mimeType: 'audio/webm', data: base64 });
                stream.getTracks().forEach(t => t.stop());
                
                // Auto-send audio
                const newMessage: ChatMessage = {
                    id: Date.now().toString(),
                    role: 'user',
                    text: "Audio Message",
                    timestamp: Date.now(),
                    attachment: { type: 'audio', mimeType: 'audio/webm', data: base64 }
                };
                setUser(prev => ({ ...prev, chatHistory: [...prev.chatHistory, newMessage] }));
                setChatAttachment(undefined);
                setIsChatLoading(true);
                const aiResponseText = await getChatResponse(user.goal!, user.chatHistory, "Audio Message", user.userProfile, user.dailyTasks, user.connectedApps, newMessage.attachment, user.extraLogs);
                setUser(prev => ({ ...prev, chatHistory: [...prev.chatHistory, { id: Date.now().toString(), role: 'ai', text: aiResponseText, timestamp: Date.now() }] }));
                setIsChatLoading(false);
            };
            
            recorder.start();
            chatRecorderRef.current = recorder;
            setIsChatRecording(true);
        } catch (e) {
            alert("Microphone access failed.");
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#FAFAFA] relative">
            {/* Header */}
            <div className="flex-shrink-0 px-6 py-4 pt-safe bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between z-20 sticky top-0">
                 <div className="flex items-center gap-4 mt-2">
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
                 <button className="p-2 text-gray-400 hover:text-primary transition-colors mt-2">
                     <Icons.Settings className="w-5 h-5" />
                 </button>
            </div>
            
            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-28 scroll-smooth">
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
                                    {msg.attachment.type === 'image' && <img src={`data:${msg.attachment.mimeType};base64,${msg.attachment.data}`} className="w-full max-h-48 object-cover" />}
                                    {msg.attachment.type === 'audio' && <audio controls src={`data:${msg.attachment.mimeType};base64,${msg.attachment.data}`} className="w-full h-8" />}
                                </div>
                            )}
                            <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
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

            {/* Floating Input Area - Compact Version */}
            <div className="absolute bottom-[5.5rem] left-0 right-0 px-4 py-2 z-30 mb-safe">
                <div className="bg-white/90 backdrop-blur-xl border border-white/40 shadow-xl shadow-primary/5 rounded-[1.5rem] p-1.5 flex items-end gap-2 transition-all focus-within:bg-white focus-within:shadow-primary/10">
                     {/* Attachment Toggle */}
                     <button 
                         onClick={() => document.getElementById('chat-upload')?.click()}
                         className={`p-2 rounded-full flex-shrink-0 transition-colors ${chatAttachment ? 'bg-secondary text-white' : 'text-gray-400 hover:text-primary hover:bg-gray-50'}`}
                    >
                        {chatAttachment ? <Icons.Check className="w-4 h-4"/> : <Icons.Paperclip className="w-4 h-4"/>}
                        <input id="chat-upload" type="file" className="hidden" onChange={async (e) => {
                             if(e.target.files?.[0]) {
                                 const f = e.target.files[0];
                                 const base64 = await blobToBase64(f);
                                 setChatAttachment({ type: f.type.startsWith('image') ? 'image' : 'pdf', mimeType: f.type, data: base64 });
                             }
                        }} />
                    </button>

                    {/* Text Area */}
                    <div className="flex-1 py-2">
                        {chatAttachment && (
                            <div className="text-[10px] font-bold text-secondary mb-0.5 flex items-center gap-1">
                                <Icons.Paperclip className="w-3 h-3"/> Media Attached
                                <button onClick={() => setChatAttachment(undefined)} className="ml-2 text-gray-400 hover:text-red-500"><Icons.X className="w-3 h-3"/></button>
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

                    {/* Action Button (Send or Record) */}
                    {chatInput.trim() || chatAttachment ? (
                        <button 
                            onClick={handleSendMessage} 
                            className="p-2 bg-primary text-white rounded-full shadow-md hover:scale-105 transition-all flex-shrink-0 mb-0.5"
                        >
                            <Icons.Send className="w-4 h-4 translate-x-0.5 translate-y-0.5"/>
                        </button>
                    ) : (
                        <button 
                            onMouseDown={handleStartChatRecording} 
                            onMouseUp={() => { if(chatRecorderRef.current) { chatRecorderRef.current.stop(); setIsChatRecording(false); } }}
                            onTouchStart={handleStartChatRecording}
                            onTouchEnd={() => { if(chatRecorderRef.current) { chatRecorderRef.current.stop(); setIsChatRecording(false); } }}
                            className={`p-2 rounded-full transition-all flex-shrink-0 mb-0.5 ${isChatRecording ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 scale-110' : 'bg-gray-100 text-gray-400 hover:text-primary hover:bg-gray-200'}`}
                        >
                            <Icons.Mic className="w-4 h-4"/>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
