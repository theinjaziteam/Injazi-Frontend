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
            
            // Refresh pending actions
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

    // Tab content components
    const renderChatTab = () => (
        <div className="flex flex-col h-full">
            {/* Pending Actions Banner */}
            {pendingActions.length > 0 && (
                <div className="mx-4 mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Icons.AlertCircle className="w-5 h-5 text-yellow-500" aria-hidden="true" />
                            <span className="text-sm font-medium text-yellow-800">
                                {pendingActions.length} action{pendingActions.length > 1 ? 's' : ''} pending approval
                            </span>
                        </div>
                        <button 
                            onClick={() => setActiveTab('settings')}
                            className="text-xs font-medium text-yellow-700 underline hover:text-yellow-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:ring-offset-2 rounded"
                        >
                            Review
                        </button>
                    </div>
                </div>
            )}
            
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatHistory.length === 0 && (
                    <div className="text-center py-12">
                        <div className="w-20 h-20 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                            <EcommerceIcons.Robot className="w-10 h-10 text-primary" aria-hidden="true" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">E-commerce Growth Assistant</h2>
                        <p className="text-gray-500 mb-6">I can help you set up and grow your Shopify store</p>
                        <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
                            {['Set up my store', 'Add products', 'View analytics', 'Create email campaign'].map((prompt, i) => (
                                <button
                                    key={i}
                                    onClick={() => {
                                        setChatInput(prompt);
                                        setTimeout(() => handleSendMessage(), 100);
                                    }}
                                    className="p-3 text-sm text-left bg-gray-50 rounded-xl hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-colors"
                                >
                                    {prompt}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                
                {chatHistory.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] ${
                            msg.role === 'user' 
                                ? 'bg-primary text-white rounded-2xl rounded-br-sm' 
                                : 'bg-gray-100 text-gray-900 rounded-2xl rounded-bl-sm'
                        } p-4`}>
                            <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                            {msg.suggestions && msg.suggestions.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                                    <p className="text-xs font-medium text-gray-500">Suggested Actions:</p>
                                    {msg.suggestions.map((suggestion: any, j: number) => (
                                        <button
                                            key={j}
                                            onClick={() => setChatInput(suggestion.title)}
                                            className="block w-full text-left p-2 bg-white rounded-lg text-xs hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors"
                                        >
                                            <span className="font-medium">{suggestion.title}</span>
                                            <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] ${
                                                suggestion.priority === 'high' ? 'bg-red-100 text-red-600' :
                                                suggestion.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                                                'bg-gray-100 text-gray-600'
                                            }`}>
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
                    <div className="flex justify-start">
                        <div className="bg-gray-100 rounded-2xl rounded-bl-sm p-4">
                            <div className="flex gap-1" aria-label="Loading response">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>
            
            {/* FIX #36: Chat Input with proper focus ring */}
            <div className="p-4 border-t border-gray-100">
                <div className="flex gap-2">
                    <input
                        ref={chatInputRef}
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                        placeholder="Ask me anything about your store..."
                        aria-label="Chat message input"
                        className="flex-1 px-4 py-3 bg-gray-100 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:bg-white"
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={isLoading || !chatInput.trim()}
                        className="px-4 py-3 bg-primary text-white rounded-xl disabled:opacity-50 hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        aria-label="Send message"
                    >
                        <Icons.Send className="w-5 h-5" aria-hidden="true" />
                    </button>
                </div>
            </div>
        </div>
    );

    const renderProductsTab = () => (
        <div className="p-4 space-y-6 overflow-y-auto">
            {/* Add Products */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-3">Add Products</h3>
                <textarea
                    value={productUrls}
                    onChange={(e) => setProductUrls(e.target.value)}
                    placeholder="Paste product URLs (one per line)&#10;Supports: AliExpress, Amazon, Alibaba"
                    rows={4}
                    aria-label="Product URLs to scrape"
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:bg-white text-sm"
                />
                <button
                    onClick={handleScrapeProducts}
                    disabled={isLoading || !productUrls.trim()}
                    className="mt-3 w-full py-3 bg-primary text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                    {isLoading ? (
                        <>
                            <Icons.RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
                            Scraping...
                        </>
                    ) : (
                        <>
                            <EcommerceIcons.Link className="w-4 h-4" aria-hidden="true" />
                            Scrape & Optimize Products
                        </>
                    )}
                </button>
            </div>

            {/* FIX #37: Product Drafts with consistent spacing */}
            <div>
                <h3 className="font-semibold text-gray-900 mb-3">Product Drafts ({productDrafts.length})</h3>
                {productDrafts.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-2xl">
                        <EcommerceIcons.Package className="w-12 h-12 text-gray-300 mx-auto mb-3" aria-hidden="true" />
                        <p className="text-gray-500">No products yet. Add some URLs above!</p>
                    </div>
                ) : (
                    /* FIX #37: Unified gap spacing for product grid */
                    <div className="grid grid-cols-2 gap-4">
                        {productDrafts.map((draft) => (
                            <ProductDraftCard
                                key={draft.id}
                                draft={draft}
                                onApprove={() => handleApproveProduct(draft.id, {
                                    ...draft.optimizedData,
                                    price: draft.originalData.originalPrice * 2,
                                    images: draft.originalData.images
                                })}
                                onPublish={() => handlePublishProduct(draft.id)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    const renderAnalyticsTab = () => (
        <div className="p-4 space-y-6 overflow-y-auto">
            {/* Period Selector */}
            <div className="flex gap-2" role="tablist" aria-label="Analytics period">
                {(['daily', 'weekly', 'monthly'] as const).map((period) => (
                    <button
                        key={period}
                        onClick={() => setAnalyticsPeriod(period)}
                        role="tab"
                        aria-selected={analyticsPeriod === period}
                        className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                            analyticsPeriod === period 
                                ? 'bg-primary text-white shadow-md' 
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        {period}
                    </button>
                ))}
            </div>

            {isLoading ? (
                <div className="text-center py-12">
                    <Icons.RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-3" aria-hidden="true" />
                    <p className="text-gray-500">Loading analytics...</p>
                </div>
            ) : analytics ? (
                <>
                    {/* KPIs */}
                    <div className="grid grid-cols-2 gap-4">
                        <KPICard
                            title="Revenue"
                            value={`$${analytics.revenue?.toFixed(2) || '0'}`}
                            icon={<Icons.DollarSign className="w-4 h-4" />}
                            trend="up"
                            change={12}
                        />
                        <KPICard
                            title="Orders"
                            value={analytics.orders || 0}
                            icon={<EcommerceIcons.ShoppingCart className="w-4 h-4" />}
                            trend="up"
                            change={8}
                        />
                        <KPICard
                            title="Conversion"
                            value={`${analytics.conversionRate?.toFixed(1) || '0'}%`}
                            icon={<EcommerceIcons.TrendingUp className="w-4 h-4" />}
                            trend="down"
                            change={-2}
                        />
                        <KPICard
                            title="Avg Order"
                            value={`$${analytics.averageOrderValue?.toFixed(2) || '0'}`}
                            icon={<Icons.CreditCard className="w-4 h-4" />}
                            trend="up"
                            change={5}
                        />
                    </div>

                    {/* Insights */}
                    {analytics.insights && analytics.insights.length > 0 && (
                        <div>
                            <h3 className="font-semibold text-gray-900 mb-3">AI Insights</h3>
                            <div className="space-y-3">
                                {analytics.insights.map((insight: any) => (
                                    <InsightCard
                                        key={insight.id}
                                        insight={insight}
                                        onTakeAction={() => {
                                            if (insight.suggestedAction?.includes('email')) {
                                                setActiveTab('email');
                                            }
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Top Products */}
                    {analytics.topProducts && analytics.topProducts.length > 0 && (
                        <div>
                            <h3 className="font-semibold text-gray-900 mb-3">Top Products</h3>
                            <div className="space-y-2">
                                {analytics.topProducts.map((product: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100">
                                        <div className="flex items-center gap-3">
                                            <span className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-bold">
                                                {i + 1}
                                            </span>
                                            <span className="text-sm font-medium text-gray-900">{product.title}</span>
                                        </div>
                                        <span className="text-sm font-bold text-green-600">${product.revenue}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="text-center py-12">
                    <EcommerceIcons.LineChart className="w-12 h-12 text-gray-300 mx-auto mb-3" aria-hidden="true" />
                    <p className="text-gray-500">Connect your store to see analytics</p>
                </div>
            )}
        </div>
    );

    const renderEmailTab = () => (
        <div className="p-4 space-y-6 overflow-y-auto">
            {/* Create Email */}
            <div>
                <h3 className="font-semibold text-gray-900 mb-3">Create Email Campaign</h3>
                <div className="grid grid-cols-2 gap-3">
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
                            className="p-4 bg-white rounded-xl border border-gray-100 hover:border-primary/50 flex flex-col items-center gap-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                            aria-label={`Create ${label} email campaign`}
                        >
                            <Icon className="w-6 h-6 text-primary" aria-hidden="true" />
                            <span className="text-sm font-medium text-gray-700">{label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Email Drafts */}
            <div>
                <h3 className="font-semibold text-gray-900 mb-3">Email Drafts ({emailDrafts.length})</h3>
                {emailDrafts.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-2xl">
                        <EcommerceIcons.Mail className="w-12 h-12 text-gray-300 mx-auto mb-3" aria-hidden="true" />
                        <p className="text-gray-500">No email drafts yet</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {emailDrafts.map((email) => (
                            <EmailPreviewCard
                                key={email.id}
                                email={email}
                                onApprove={() => {/* handle approve */}}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    const renderSocialTab = () => (
        <div className="p-4 space-y-6 overflow-y-auto">
            {/* Create Content */}
            <div>
                <h3 className="font-semibold text-gray-900 mb-3">Create Social Content</h3>
                <div className="grid grid-cols-2 gap-3">
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
                            className="p-4 bg-white rounded-xl border border-gray-100 hover:border-primary/50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                            aria-label={`Create ${label} content`}
                        >
                            <span className="text-sm font-medium text-gray-700">{label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Social Drafts */}
            <div>
                <h3 className="font-semibold text-gray-900 mb-3">Content Drafts ({socialDrafts.length})</h3>
                {socialDrafts.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-2xl">
                        <EcommerceIcons.Share2 className="w-12 h-12 text-gray-300 mx-auto mb-3" aria-hidden="true" />
                        <p className="text-gray-500">No content drafts yet</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {socialDrafts.map((content) => (
                            <SocialContentCard
                                key={content.id}
                                content={content}
                                onApprove={() => {/* handle approve */}}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    const renderSettingsTab = () => (
        <div className="p-4 space-y-6 overflow-y-auto">
            {/* Pending Actions */}
            {pendingActions.length > 0 && (
                <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Pending Approvals</h3>
                    <div className="space-y-3">
                        {pendingActions.map((action) => (
                            <AgentActionCard
                                key={action.id}
                                action={action}
                                onApprove={() => handleApproveAction(action.id)}
                                onReject={() => handleRejectAction(action.id)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Connected Accounts */}
            <div>
                <h3 className="font-semibold text-gray-900 mb-3">Connected Accounts</h3>
                <div className="space-y-3">
                    {['shopify', 'klaviyo', 'tiktok', 'instagram', 'facebook'].map((platform) => {
                        const account = (user.connectedEcommerceAccounts || []).find(
                            (a: any) => a.platform === platform
                        );
                        return (
                            <ConnectedAccountCard
                                key={platform}
                                account={account || { platform, isConnected: false }}
                                onConnect={async () => {
                                    const { url } = await ecommerceAgentService.getOAuthUrl(platform);
                                    if (url) window.open(url, '_blank');
                                }}
                            />
                        );
                    })}
                </div>
            </div>

            {/* Agent Preferences */}
            <div>
                <h3 className="font-semibold text-gray-900 mb-3">Agent Preferences</h3>
                <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-gray-900">Auto-approve analytics reads</p>
                            <p className="text-xs text-gray-500">Allow agent to pull data without approval</p>
                        </div>
                        <input 
                            type="checkbox" 
                            className="w-5 h-5 accent-primary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded" 
                            defaultChecked 
                            aria-label="Auto-approve analytics reads"
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-gray-900">Daily summary notifications</p>
                            <p className="text-xs text-gray-500">Get a daily digest of store performance</p>
                        </div>
                        <input 
                            type="checkbox" 
                            className="w-5 h-5 accent-primary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded" 
                            defaultChecked 
                            aria-label="Daily summary notifications"
                        />
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="h-full flex flex-col bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 px-4 py-3">
                <div className="flex items-center justify-between mb-4">
                    <button 
                        onClick={() => setView(AppView.CHAT)}
                        className="p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg hover:bg-gray-100 transition-colors"
                        aria-label="Back to chat"
                    >
                        <Icons.ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <h1 className="font-bold text-lg text-gray-900">Growth Assistant</h1>
                    <button 
                        className="p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg hover:bg-gray-100 transition-colors"
                        aria-label="Notifications"
                    >
                        <Icons.Bell className="w-5 h-5 text-gray-600" />
                    </button>
                </div>
                
                {/* FIX #35: Enhanced tab navigation with stronger active state */}
                <div 
                    className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide"
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
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
                                activeTab === id 
                                    /* FIX #35: Stronger active state with shadow and ring */
                                    ? 'bg-primary text-white shadow-md ring-2 ring-primary/30' 
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            <Icon className="w-4 h-4" aria-hidden="true" />
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div 
                className="flex-1 overflow-hidden"
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
        </div>
    );
}
