// views/EcommerceAgentView.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { AppView } from '../types';
import { 
    Icons, 
    EcommerceIcons, 
    AgentActionCard, 
    KPICard, 
    ProductDraftCard, 
    InsightCard,
    EmailPreviewCard,
    SocialContentCard,
    ConnectedAccountCard
} from '../components/UIComponents';
import { ecommerceAgentService } from '../services/ecommerceAgentService';

type TabType = 'chat' | 'products' | 'analytics' | 'email' | 'social' | 'settings';

export default function EcommerceAgentView() {
    const { user, setUser, setView } = useApp();
    const [activeTab, setActiveTab] = useState<TabType>('chat');
    const [isLoading, setIsLoading] = useState(false);
    
    // Chat state
    const [chatInput, setChatInput] = useState('');
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant'; content: string; suggestions?: any[] }[]>([]);
    const [isInputFocused, setIsInputFocused] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const chatInputRef = useRef<HTMLInputElement>(null);
    
    // Products state
    const [productUrls, setProductUrls] = useState('');
    const [productDrafts, setProductDrafts] = useState<any[]>([]);
    
    // Analytics state
    const [analytics, setAnalytics] = useState<any>(null);
    const [analyticsPeriod, setAnalyticsPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
    
    // Email state
    const [emailDrafts, setEmailDrafts] = useState<any[]>([]);
    
    // Social state
    const [socialDrafts, setSocialDrafts] = useState<any[]>([]);
    
    // Actions state
    const [pendingActions, setPendingActions] = useState<any[]>([]);

    // Stars animation
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number | null>(null);
    const starsRef = useRef<{ x: number; y: number; z: number; brightness: number }[]>([]);
    const isAnimatingRef = useRef(true);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory]);

    useEffect(() => {
        if (activeTab === 'analytics') {
            fetchAnalytics();
        }
    }, [activeTab, analyticsPeriod]);

    useEffect(() => {
        // Load user's ecommerce data
        if (user.productDrafts) setProductDrafts(user.productDrafts);
        if (user.emailCampaignDrafts) setEmailDrafts(user.emailCampaignDrafts);
        if (user.socialContentDrafts) setSocialDrafts(user.socialContentDrafts);
        if (user.aiActionLogs) {
            setPendingActions(user.aiActionLogs.filter((a: any) => a.status === 'pending'));
        }
    }, [user]);

    // Initialize stars (same as ChatView - 200 stars)
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

    // Pause animation when tab is not visible
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
            }
        };
        
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    // Stars canvas animation
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = 0;
        let height = 0;
        let isRunning = true;

        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
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

        let lastFrameTime = 0;
        const targetFPS = 30;
        const frameInterval = 1000 / targetFPS;

        const drawStars = (currentTime: number) => {
            if (!isRunning || !isAnimatingRef.current) return;
            
            const elapsed = currentTime - lastFrameTime;
            if (elapsed < frameInterval) {
                animationRef.current = requestAnimationFrame(drawStars);
                return;
            }
            lastFrameTime = currentTime - (elapsed % frameInterval);
            
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const w = width / dpr;
            const h = height / dpr;
            
            if (w === 0 || h === 0) {
                animationRef.current = requestAnimationFrame(drawStars);
                return;
            }
            
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            
            // Black background (same as ChatView)
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, w, h);

            // Draw stars with twinkling effect (same as ChatView)
            starsRef.current.forEach(star => {
                const twinkle = 0.3 + Math.sin(currentTime * 0.002 + star.brightness * 10) * 0.5;
                ctx.fillStyle = `rgba(255, 255, 255, ${star.z * twinkle * 0.8})`;
                ctx.beginPath();
                ctx.arc((star.x + 1) * w / 2, (star.y + 1) * h / 2, star.brightness * 1.5 + 0.5, 0, Math.PI * 2);
                ctx.fill();
            });

            // Subtle nebula glow (same as ChatView)
            const nebulaGradient = ctx.createRadialGradient(w * 0.3, h * 0.4, 0, w * 0.3, h * 0.4, w * 0.5);
            nebulaGradient.addColorStop(0, 'rgba(100, 120, 255, 0.08)');
            nebulaGradient.addColorStop(1, 'transparent');
            ctx.fillStyle = nebulaGradient;
            ctx.fillRect(0, 0, w, h);

            animationRef.current = requestAnimationFrame(drawStars);
        };

        animationRef.current = requestAnimationFrame(drawStars);

        return () => {
            isRunning = false;
            window.removeEventListener('resize', resize);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
                animationRef.current = null;
            }
        };
    }, []);

    const fetchAnalytics = async () => {
        try {
            setIsLoading(true);
            const result = await ecommerceAgentService.getAnalytics(user.email, analyticsPeriod);
            setAnalytics(result.analytics);
        } catch (error) {
            console.error('Analytics fetch error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendMessage = async () => {
        if (!chatInput.trim()) return;
        
        const userMessage = chatInput.trim();
        setChatInput('');
        setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);
        
        setIsLoading(true);
        try {
            const response = await ecommerceAgentService.orchestrate(user.email, userMessage);
            setChatHistory(prev => [...prev, { 
                role: 'assistant', 
                content: response.response,
                suggestions: response.suggestedActions
            }]);
            
            const actionsResult = await ecommerceAgentService.getActions(user.email, 'pending');
            setPendingActions(actionsResult.actions);
        } catch (error) {
            console.error('Chat error:', error);
            setChatHistory(prev => [...prev, { 
                role: 'assistant', 
                content: 'Sorry, I encountered an error. Please try again.'
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleScrapeProducts = async () => {
        const urls = productUrls.split('\n').filter(url => url.trim());
        if (urls.length === 0) return;
        
        setIsLoading(true);
        try {
            const result = await ecommerceAgentService.scrapeProducts(user.email, urls);
            setProductDrafts(prev => [...prev, ...result.drafts]);
            setProductUrls('');
        } catch (error) {
            console.error('Scrape error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleApproveProduct = async (productId: string, finalData: any) => {
        try {
            await ecommerceAgentService.approveProduct(user.email, productId, finalData);
            setProductDrafts(prev => prev.map(p => 
                p.id === productId ? { ...p, status: 'approved', finalData } : p
            ));
        } catch (error) {
            console.error('Approve error:', error);
        }
    };

    const handlePublishProduct = async (productId: string) => {
        try {
            await ecommerceAgentService.publishProduct(user.email, productId);
            setProductDrafts(prev => prev.map(p => 
                p.id === productId ? { ...p, status: 'published' } : p
            ));
        } catch (error) {
            console.error('Publish error:', error);
        }
    };

    const handleGenerateEmail = async (type: string) => {
        setIsLoading(true);
        try {
            const result = await ecommerceAgentService.generateEmail(user.email, {
                campaignType: type as any
            });
            setEmailDrafts(prev => [...prev, result.draft]);
        } catch (error) {
            console.error('Email generation error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateSocial = async (platform: string, contentType: string) => {
        setIsLoading(true);
        try {
            const result = await ecommerceAgentService.generateSocialContent(user.email, {
                platform: platform as any,
                contentType: contentType as any
            });
            setSocialDrafts(prev => [...prev, result.draft]);
        } catch (error) {
            console.error('Social generation error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleApproveAction = async (actionId: string) => {
        try {
            await ecommerceAgentService.approveAction(user.email, actionId);
            setPendingActions(prev => prev.filter(a => a.id !== actionId));
        } catch (error) {
            console.error('Action approve error:', error);
        }
    };

    const handleRejectAction = async (actionId: string) => {
        try {
            await ecommerceAgentService.rejectAction(user.email, actionId);
            setPendingActions(prev => prev.filter(a => a.id !== actionId));
        } catch (error) {
            console.error('Action reject error:', error);
        }
    };

    // Glassy card component (exact same as ChatView)
    const GlassCard: React.FC<{ children: React.ReactNode; className?: string; style?: React.CSSProperties }> = ({ children, className, style }) => (
        <div 
            className={className}
            style={{
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                ...style
            }}
        >
            {children}
        </div>
    );

    // Tab content components
    const renderChatTab = () => (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Pending Actions Banner */}
            {pendingActions.length > 0 && (
                <div style={{ margin: '16px 16px 0', padding: '12px 16px' }}>
                    <GlassCard style={{ 
                        background: 'rgba(234, 179, 8, 0.1)', 
                        border: '1px solid rgba(234, 179, 8, 0.2)',
                        padding: '12px 16px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Icons.AlertCircle style={{ width: 20, height: 20, color: 'rgba(255, 255, 255, 0.7)' }} aria-hidden="true" />
                                <span style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255, 255, 255, 0.9)' }}>
                                    {pendingActions.length} action{pendingActions.length > 1 ? 's' : ''} pending approval
                                </span>
                            </div>
                            <button 
                                onClick={() => setActiveTab('settings')}
                                style={{
                                    fontSize: '12px',
                                    fontWeight: 500,
                                    color: 'rgba(255, 255, 255, 0.7)',
                                    textDecoration: 'underline',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                Review
                            </button>
                        </div>
                    </GlassCard>
                </div>
            )}
            
            {/* Chat Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', WebkitOverflowScrolling: 'touch' }}>
                {chatHistory.length === 0 && (
                    <div style={{ textAlign: 'center', paddingTop: '48px', paddingBottom: '48px' }}>
                        <div style={{ 
                            width: 80, 
                            height: 80, 
                            margin: '0 auto 16px',
                            background: 'rgba(52, 35, 166, 0.2)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid rgba(52, 35, 166, 0.3)'
                        }}>
                            <EcommerceIcons.Robot style={{ width: 40, height: 40, color: 'rgba(255, 255, 255, 0.7)' }} aria-hidden="true" />
                        </div>
                        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>E-commerce Growth Assistant</h2>
                        <p style={{ color: 'rgba(255, 255, 255, 0.5)', marginBottom: '24px' }}>I can help you set up and grow your Shopify store</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', maxWidth: '320px', margin: '0 auto' }}>
                            {['Set up my store', 'Add products', 'View analytics', 'Create email campaign'].map((prompt, i) => (
                                <button
                                    key={i}
                                    onClick={() => {
                                        setChatInput(prompt);
                                        setTimeout(() => handleSendMessage(), 100);
                                    }}
                                    style={{
                                        padding: '12px',
                                        fontSize: '13px',
                                        textAlign: 'left',
                                        background: 'rgba(255, 255, 255, 0.03)',
                                        backdropFilter: 'blur(12px)',
                                        WebkitBackdropFilter: 'blur(12px)',
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                        borderRadius: '12px',
                                        boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                                        color: 'rgba(255, 255, 255, 0.7)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                                    }}
                                >
                                    {prompt}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                
                {chatHistory.map((msg, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: '12px' }}>
                        <div style={{
                            maxWidth: '85%',
                            padding: '12px 16px',
                            borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                            backgroundColor: msg.role === 'user' 
                                ? 'rgba(52, 35, 166, 0.8)' 
                                : 'rgba(255,255,255,0.1)',
                            color: '#fff'
                        }}>
                            <p style={{ fontSize: '14px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>{msg.content}</p>
                            {msg.suggestions && msg.suggestions.length > 0 && (
                                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                                    <p style={{ fontSize: '11px', fontWeight: 500, color: 'rgba(255, 255, 255, 0.5)', marginBottom: '8px' }}>Suggested Actions:</p>
                                    {msg.suggestions.map((suggestion: any, j: number) => (
                                        <button
                                            key={j}
                                            onClick={() => setChatInput(suggestion.title)}
                                            style={{
                                                display: 'block',
                                                width: '100%',
                                                textAlign: 'left',
                                                padding: '8px',
                                                marginBottom: '4px',
                                                background: 'rgba(255, 255, 255, 0.03)',
                                                backdropFilter: 'blur(12px)',
                                                WebkitBackdropFilter: 'blur(12px)',
                                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                                borderRadius: '8px',
                                                fontSize: '12px',
                                                color: 'rgba(255, 255, 255, 0.7)',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                                            }}
                                        >
                                            <span style={{ fontWeight: 500 }}>{suggestion.title}</span>
                                            <span style={{
                                                marginLeft: '8px',
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                fontSize: '10px',
                                                background: suggestion.priority === 'high' ? 'rgba(239, 68, 68, 0.3)' :
                                                    suggestion.priority === 'medium' ? 'rgba(234, 179, 8, 0.3)' :
                                                    'rgba(255, 255, 255, 0.1)',
                                                color: suggestion.priority === 'high' ? 'rgba(252, 165, 165, 1)' :
                                                    suggestion.priority === 'medium' ? 'rgba(253, 224, 71, 1)' :
                                                    'rgba(255, 255, 255, 0.6)'
                                            }}>
                                                {suggestion.priority}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                
                {isLoading && (
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
                <div ref={chatEndRef} />
            </div>
            
            {/* Chat Input */}
            <div style={{ 
                padding: '12px 16px', 
                borderTop: '1px solid rgba(255,255,255,0.1)',
                paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))'
            }}>
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
                        ref={chatInputRef}
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onFocus={() => setIsInputFocused(true)}
                        onBlur={() => setIsInputFocused(false)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                        placeholder="Ask me anything about your store..."
                        aria-label="Chat message input"
                        style={{
                            flex: 1,
                            backgroundColor: 'transparent',
                            border: 'none',
                            outline: 'none',
                            color: '#FFFFFF',
                            fontSize: '14px'
                        }}
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={isLoading || !chatInput.trim()}
                        style={{
                            padding: '8px',
                            background: chatInput.trim() ? '#3423A6' : 'transparent',
                            borderRadius: '50%',
                            border: 'none',
                            color: chatInput.trim() ? '#fff' : 'rgba(255, 255, 255, 0.3)',
                            cursor: chatInput.trim() ? 'pointer' : 'default',
                            transition: 'all 0.2s'
                        }}
                        aria-label="Send message"
                    >
                        <Icons.Send style={{ width: 20, height: 20 }} aria-hidden="true" />
                    </button>
                </div>
            </div>
        </div>
    );

    const renderProductsTab = () => (
        <div style={{ padding: '16px', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
            {/* Add Products */}
            <GlassCard style={{ padding: '16px', marginBottom: '24px' }}>
                <h3 style={{ fontWeight: 600, color: '#fff', marginBottom: '12px', fontSize: '15px' }}>Add Products</h3>
                <textarea
                    value={productUrls}
                    onChange={(e) => setProductUrls(e.target.value)}
                    placeholder="Paste product URLs (one per line)&#10;Supports: AliExpress, Amazon, Alibaba"
                    rows={4}
                    aria-label="Product URLs to scrape"
                    style={{
                        width: '100%',
                        padding: '12px 16px',
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '14px',
                        resize: 'none',
                        outline: 'none'
                    }}
                    onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                    }}
                    onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                    }}
                />
                <button
                    onClick={handleScrapeProducts}
                    disabled={isLoading || !productUrls.trim()}
                    style={{
                        marginTop: '12px',
                        width: '100%',
                        padding: '12px',
                        background: '#3423A6',
                        border: 'none',
                        borderRadius: '12px',
                        color: '#fff',
                        fontWeight: 500,
                        fontSize: '14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        opacity: isLoading || !productUrls.trim() ? 0.5 : 1
                    }}
                >
                    {isLoading ? (
                        <>
                            <Icons.RefreshCw style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} aria-hidden="true" />
                            Scraping...
                        </>
                    ) : (
                        <>
                            <EcommerceIcons.Link style={{ width: 16, height: 16 }} aria-hidden="true" />
                            Scrape & Optimize Products
                        </>
                    )}
                </button>
            </GlassCard>

            {/* Product Drafts */}
            <div>
                <h3 style={{ fontWeight: 600, color: '#fff', marginBottom: '12px', fontSize: '15px' }}>
                    Product Drafts ({productDrafts.length})
                </h3>
                {productDrafts.length === 0 ? (
                    <GlassCard style={{ padding: '32px', textAlign: 'center' }}>
                        <EcommerceIcons.Package style={{ width: 48, height: 48, color: 'rgba(255, 255, 255, 0.2)', margin: '0 auto 12px' }} aria-hidden="true" />
                        <p style={{ color: 'rgba(255, 255, 255, 0.5)' }}>No products yet. Add some URLs above!</p>
                    </GlassCard>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        {productDrafts.map((draft) => (
                            <GlassCard key={draft.id} style={{ padding: '12px' }}>
                                <ProductDraftCard
                                    draft={draft}
                                    onApprove={() => handleApproveProduct(draft.id, {
                                        ...draft.optimizedData,
                                        price: draft.originalData.originalPrice * 2,
                                        images: draft.originalData.images
                                    })}
                                    onPublish={() => handlePublishProduct(draft.id)}
                                />
                            </GlassCard>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    const renderAnalyticsTab = () => (
        <div style={{ padding: '16px', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
            {/* Period Selector */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }} role="tablist" aria-label="Analytics period">
                {(['daily', 'weekly', 'monthly'] as const).map((period) => (
                    <button
                        key={period}
                        onClick={() => setAnalyticsPeriod(period)}
                        role="tab"
                        aria-selected={analyticsPeriod === period}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '12px',
                            fontSize: '13px',
                            fontWeight: 500,
                            textTransform: 'capitalize',
                            border: analyticsPeriod !== period ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            background: analyticsPeriod === period ? '#3423A6' : 'rgba(255, 255, 255, 0.03)',
                            backdropFilter: analyticsPeriod !== period ? 'blur(12px)' : 'none',
                            WebkitBackdropFilter: analyticsPeriod !== period ? 'blur(12px)' : 'none',
                            boxShadow: analyticsPeriod !== period ? 'inset 0 1px 0 rgba(255, 255, 255, 0.05)' : '0 4px 12px rgba(52, 35, 166, 0.4)',
                            color: analyticsPeriod === period ? '#fff' : 'rgba(255, 255, 255, 0.7)'
                        }}
                        onMouseEnter={(e) => {
                            if (analyticsPeriod !== period) {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (analyticsPeriod !== period) {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                            }
                        }}
                    >
                        {period}
                    </button>
                ))}
            </div>

            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '48px 0' }}>
                    <Icons.RefreshCw style={{ width: 32, height: 32, color: 'rgba(255, 255, 255, 0.7)', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} aria-hidden="true" />
                    <p style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Loading analytics...</p>
                </div>
            ) : analytics ? (
                <>
                    {/* KPIs */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                        {[
                            { title: 'Revenue', value: `$${analytics.revenue?.toFixed(2) || '0'}`, icon: Icons.DollarSign, trend: 'up', change: 12 },
                            { title: 'Orders', value: analytics.orders || 0, icon: EcommerceIcons.ShoppingCart, trend: 'up', change: 8 },
                            { title: 'Conversion', value: `${analytics.conversionRate?.toFixed(1) || '0'}%`, icon: EcommerceIcons.TrendingUp, trend: 'down', change: -2 },
                            { title: 'Avg Order', value: `$${analytics.averageOrderValue?.toFixed(2) || '0'}`, icon: Icons.CreditCard, trend: 'up', change: 5 }
                        ].map((kpi, i) => (
                            <GlassCard key={i} style={{ padding: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>{kpi.title}</span>
                                    <kpi.icon style={{ width: 16, height: 16, color: 'rgba(255, 255, 255, 0.4)' }} />
                                </div>
                                <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'rgba(255, 255, 255, 0.9)', marginBottom: '4px' }}>{kpi.value}</div>
                                <div style={{ 
                                    fontSize: '12px', 
                                    color: kpi.trend === 'up' ? 'rgba(34, 197, 94, 0.9)' : 'rgba(239, 68, 68, 0.9)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}>
                                    {kpi.trend === 'up' ? '↑' : '↓'} {Math.abs(kpi.change)}%
                                </div>
                            </GlassCard>
                        ))}
                    </div>

                    {/* Insights */}
                    {analytics.insights && analytics.insights.length > 0 && (
                        <div style={{ marginBottom: '24px' }}>
                            <h3 style={{ fontWeight: 600, color: '#fff', marginBottom: '12px', fontSize: '15px' }}>AI Insights</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {analytics.insights.map((insight: any) => (
                                    <GlassCard key={insight.id} style={{ padding: '16px' }}>
                                        <InsightCard
                                            insight={insight}
                                            onTakeAction={() => {
                                                if (insight.suggestedAction?.includes('email')) {
                                                    setActiveTab('email');
                                                }
                                            }}
                                        />
                                    </GlassCard>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Top Products */}
                    {analytics.topProducts && analytics.topProducts.length > 0 && (
                        <div>
                            <h3 style={{ fontWeight: 600, color: '#fff', marginBottom: '12px', fontSize: '15px' }}>Top Products</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {analytics.topProducts.map((product: any, i: number) => (
                                    <GlassCard key={i} style={{ padding: '12px 16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <span style={{ 
                                                    width: 24, 
                                                    height: 24, 
                                                    background: 'rgba(52, 35, 166, 0.3)', 
                                                    color: 'rgba(255, 255, 255, 0.9)',
                                                    borderRadius: '50%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '12px',
                                                    fontWeight: 'bold'
                                                }}>
                                                    {i + 1}
                                                </span>
                                                <span style={{ fontSize: '14px', fontWeight: 500, color: '#fff' }}>{product.title}</span>
                                            </div>
                                            <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'rgba(34, 197, 94, 0.9)' }}>${product.revenue}</span>
                                        </div>
                                    </GlassCard>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <GlassCard style={{ padding: '48px', textAlign: 'center' }}>
                    <EcommerceIcons.LineChart style={{ width: 48, height: 48, color: 'rgba(255, 255, 255, 0.2)', margin: '0 auto 12px' }} aria-hidden="true" />
                    <p style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Connect your store to see analytics</p>
                </GlassCard>
            )}
        </div>
    );

    const renderEmailTab = () => (
        <div style={{ padding: '16px', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
            {/* Create Email */}
            <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontWeight: 600, color: '#fff', marginBottom: '12px', fontSize: '15px' }}>Create Email Campaign</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {[
                        { type: 'abandoned_cart', label: 'Abandoned Cart', icon: EcommerceIcons.ShoppingCart },
                        { type: 'promo', label: 'Promotion', icon: Icons.Zap },
                        { type: 'welcome', label: 'Welcome Series', icon: Icons.Users },
                        { type: 'win_back', label: 'Win Back', icon: Icons.RefreshCw }
                    ].map(({ type, label, icon: Icon }) => (
                        <button
                            key={type}
                            onClick={() => handleGenerateEmail(type)}
                            disabled={isLoading}
                            style={{
                                padding: '16px',
                                background: 'rgba(255, 255, 255, 0.03)',
                                backdropFilter: 'blur(12px)',
                                WebkitBackdropFilter: 'blur(12px)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: '12px',
                                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '8px',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            aria-label={`Create ${label} email campaign`}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                            }}
                        >
                            <Icon style={{ width: 24, height: 24, color: 'rgba(255, 255, 255, 0.7)' }} aria-hidden="true" />
                            <span style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255, 255, 255, 0.7)' }}>{label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Email Drafts */}
            <div>
                <h3 style={{ fontWeight: 600, color: '#fff', marginBottom: '12px', fontSize: '15px' }}>
                    Email Drafts ({emailDrafts.length})
                </h3>
                {emailDrafts.length === 0 ? (
                    <GlassCard style={{ padding: '32px', textAlign: 'center' }}>
                        <EcommerceIcons.Mail style={{ width: 48, height: 48, color: 'rgba(255, 255, 255, 0.2)', margin: '0 auto 12px' }} aria-hidden="true" />
                        <p style={{ color: 'rgba(255, 255, 255, 0.5)' }}>No email drafts yet</p>
                    </GlassCard>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {emailDrafts.map((email) => (
                            <GlassCard key={email.id} style={{ padding: '16px' }}>
                                <EmailPreviewCard
                                    email={email}
                                    onApprove={() => {/* handle approve */}}
                                />
                            </GlassCard>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    const renderSocialTab = () => (
        <div style={{ padding: '16px', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
            {/* Create Content */}
            <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontWeight: 600, color: '#fff', marginBottom: '12px', fontSize: '15px' }}>Create Social Content</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {[
                        { platform: 'tiktok', type: 'short', label: 'TikTok' },
                        { platform: 'instagram', type: 'reel', label: 'Instagram Reel' },
                        { platform: 'facebook', type: 'post', label: 'Facebook Post' },
                        { platform: 'youtube', type: 'short', label: 'YouTube Short' }
                    ].map(({ platform, type, label }) => (
                        <button
                            key={platform}
                            onClick={() => handleGenerateSocial(platform, type)}
                            disabled={isLoading}
                            style={{
                                padding: '16px',
                                background: 'rgba(255, 255, 255, 0.03)',
                                backdropFilter: 'blur(12px)',
                                WebkitBackdropFilter: 'blur(12px)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: '12px',
                                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            aria-label={`Create ${label} content`}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                            }}
                        >
                            <span style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255, 255, 255, 0.7)' }}>{label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Social Drafts */}
            <div>
                <h3 style={{ fontWeight: 600, color: '#fff', marginBottom: '12px', fontSize: '15px' }}>
                    Content Drafts ({socialDrafts.length})
                </h3>
                {socialDrafts.length === 0 ? (
                    <GlassCard style={{ padding: '32px', textAlign: 'center' }}>
                        <EcommerceIcons.Share2 style={{ width: 48, height: 48, color: 'rgba(255, 255, 255, 0.2)', margin: '0 auto 12px' }} aria-hidden="true" />
                        <p style={{ color: 'rgba(255, 255, 255, 0.5)' }}>No content drafts yet</p>
                    </GlassCard>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {socialDrafts.map((content) => (
                            <GlassCard key={content.id} style={{ padding: '16px' }}>
                                <SocialContentCard
                                    content={content}
                                    onApprove={() => {/* handle approve */}}
                                />
                            </GlassCard>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    const renderSettingsTab = () => (
        <div style={{ padding: '16px', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
            {/* Pending Actions */}
            {pendingActions.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontWeight: 600, color: '#fff', marginBottom: '12px', fontSize: '15px' }}>Pending Approvals</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {pendingActions.map((action) => (
                            <GlassCard key={action.id} style={{ padding: '16px' }}>
                                <AgentActionCard
                                    action={action}
                                    onApprove={() => handleApproveAction(action.id)}
                                    onReject={() => handleRejectAction(action.id)}
                                />
                            </GlassCard>
                        ))}
                    </div>
                </div>
            )}

            {/* Connected Accounts */}
            <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontWeight: 600, color: '#fff', marginBottom: '12px', fontSize: '15px' }}>Connected Accounts</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {['shopify', 'klaviyo', 'tiktok', 'instagram', 'facebook'].map((platform) => {
                        const account = (user.connectedEcommerceAccounts || []).find(
                            (a: any) => a.platform === platform
                        );
                        return (
                            <GlassCard key={platform} style={{ padding: '16px' }}>
                                <ConnectedAccountCard
                                    account={account || { platform, isConnected: false }}
                                    onConnect={async () => {
                                        const { url } = await ecommerceAgentService.getOAuthUrl(platform);
                                        if (url) window.open(url, '_blank');
                                    }}
                                />
                            </GlassCard>
                        );
                    })}
                </div>
            </div>

            {/* Agent Preferences */}
            <div>
                <h3 style={{ fontWeight: 600, color: '#fff', marginBottom: '12px', fontSize: '15px' }}>Agent Preferences</h3>
                <GlassCard style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <p style={{ fontWeight: 500, color: '#fff', fontSize: '14px' }}>Auto-approve analytics reads</p>
                                <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>Allow agent to pull data without approval</p>
                            </div>
                            <input 
                                type="checkbox" 
                                defaultChecked 
                                aria-label="Auto-approve analytics reads"
                                style={{ width: 20, height: 20, accentColor: '#3423A6', cursor: 'pointer' }}
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <p style={{ fontWeight: 500, color: '#fff', fontSize: '14px' }}>Daily summary notifications</p>
                                <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>Get a daily digest of store performance</p>
                            </div>
                            <input 
                                type="checkbox" 
                                defaultChecked 
                                aria-label="Daily summary notifications"
                                style={{ width: 20, height: 20, accentColor: '#3423A6', cursor: 'pointer' }}
                            />
                        </div>
                    </div>
                </GlassCard>
            </div>
        </div>
    );

    return (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', backgroundColor: '#000000' }}>
            {/* Stars Canvas Background */}
            <canvas 
                ref={canvasRef} 
                style={{ 
                    position: 'absolute', 
                    inset: 0, 
                    width: '100%', 
                    height: '100%',
                    pointerEvents: 'none'
                }}
                aria-hidden="true"
            />
            
            {/* Header */}
            <div style={{ 
                position: 'relative',
                zIndex: 10,
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                padding: '12px 16px',
                paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))',
                background: 'transparent'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <button 
                        onClick={() => setView(AppView.CHAT)}
                        style={{
                            padding: '8px',
                            color: 'rgba(255,255,255,0.5)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer'
                        }}
                        aria-label="Back to chat"
                    >
                        <Icons.ArrowLeft style={{ width: 20, height: 20 }} />
                    </button>
                    <h1 style={{ fontWeight: 'bold', fontSize: '18px', color: '#fff', margin: 0 }}>Growth Assistant</h1>
                    <button 
                        style={{
                            padding: '8px',
                            color: 'rgba(255,255,255,0.5)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer'
                        }}
                        aria-label="Notifications"
                    >
                        <Icons.Bell style={{ width: 20, height: 20 }} />
                    </button>
                </div>
                
                {/* Tab Navigation */}
                <div 
                    style={{ 
                        display: 'flex', 
                        gap: '6px', 
                        overflowX: 'auto', 
                        paddingBottom: '4px',
                        margin: '0 -16px',
                        padding: '0 16px',
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none'
                    }}
                    role="tablist"
                    aria-label="E-commerce sections"
                >
                    {[
                        { id: 'chat', label: 'Chat', icon: Icons.MessageCircle },
                        { id: 'products', label: 'Products', icon: EcommerceIcons.Package },
                        { id: 'analytics', label: 'Analytics', icon: EcommerceIcons.LineChart },
                        { id: 'email', label: 'Email', icon: EcommerceIcons.Mail },
                        { id: 'social', label: 'Social', icon: EcommerceIcons.Share2 },
                        { id: 'settings', label: 'Settings', icon: Icons.Settings }
                    ].map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => setActiveTab(id as TabType)}
                            role="tab"
                            aria-selected={activeTab === id}
                            aria-controls={`${id}-panel`}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 12px',
                            borderRadius: '12px',
                            fontSize: '13px',
                            fontWeight: 500,
                            whiteSpace: 'nowrap',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            background: activeTab === id 
                                ? '#3423A6' 
                                : 'rgba(255, 255, 255, 0.03)',
                            backdropFilter: activeTab !== id ? 'blur(12px)' : 'none',
                            WebkitBackdropFilter: activeTab !== id ? 'blur(12px)' : 'none',
                            border: activeTab !== id ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
                            boxShadow: activeTab !== id ? 'inset 0 1px 0 rgba(255, 255, 255, 0.05)' : '0 4px 12px rgba(52, 35, 166, 0.4)',
                            color: activeTab === id 
                                ? '#fff' 
                                : 'rgba(255, 255, 255, 0.7)'
                        }}
                        onMouseEnter={(e) => {
                            if (activeTab !== id) {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (activeTab !== id) {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                            }
                        }}
                        >
                            <Icon style={{ width: 16, height: 16 }} aria-hidden="true" />
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div 
                style={{ 
                    flex: 1, 
                    overflow: 'hidden',
                    position: 'relative',
                    zIndex: 5
                }}
                role="tabpanel"
                id={`${activeTab}-panel`}
                aria-labelledby={activeTab}
            >
                {activeTab === 'chat' && renderChatTab()}
                {activeTab === 'products' && renderProductsTab()}
                {activeTab === 'analytics' && renderAnalyticsTab()}
                {activeTab === 'email' && renderEmailTab()}
                {activeTab === 'social' && renderSocialTab()}
                {activeTab === 'settings' && renderSettingsTab()}
            </div>

            {/* Animations */}
            <style>{`
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-4px); }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .loading-dots {
                    display: flex;
                    gap: 4px;
                }
                .loading-dots span {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: currentColor;
                    animation: bounce 1s infinite;
                }
                .loading-dots span:nth-child(2) {
                    animation-delay: 0.15s;
                }
                .loading-dots span:nth-child(3) {
                    animation-delay: 0.3s;
                }
            `}</style>
        </div>
    );
}
