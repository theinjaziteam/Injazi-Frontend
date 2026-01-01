// views/EcommerceAgentView.tsx
// FIXES: #35 (Tab navigation active state), #36 (Chat input focus), #37 (Product drafts spacing)

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
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

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  suggestions?: string[];
  timestamp: Date;
}

interface ProductDraft {
  id: string;
  title: string;
  description: string;
  price: number;
  images: string[];
  status: 'draft' | 'approved' | 'published';
  sourceUrl?: string;
}

interface Analytics {
  revenue: number;
  revenueChange: number;
  orders: number;
  ordersChange: number;
  visitors: number;
  visitorsChange: number;
  conversionRate: number;
  conversionChange: number;
  insights: Array<{
    id: string;
    type: 'positive' | 'negative' | 'neutral';
    title: string;
    description: string;
  }>;
}

interface EmailDraft {
  id: string;
  subject: string;
  preview: string;
  content: string;
  campaignType: string;
  status: 'draft' | 'scheduled' | 'sent';
}

interface SocialDraft {
  id: string;
  platform: 'instagram' | 'twitter' | 'facebook' | 'tiktok';
  contentType: string;
  content: string;
  media?: string[];
  status: 'draft' | 'scheduled' | 'published';
}

interface PendingAction {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

const EcommerceAgentView: React.FC = () => {
  const { user, setView } = useApp();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [isLoading, setIsLoading] = useState(false);
  
  // Chat state
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Hi! I'm your Growth Assistant. I can help you manage products, analyze performance, create marketing content, and more. What would you like to work on today?",
      suggestions: ['Analyze my sales', 'Create email campaign', 'Add new products', 'Generate social content'],
      timestamp: new Date()
    }
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  
  // Products state
  const [productUrls, setProductUrls] = useState('');
  const [productDrafts, setProductDrafts] = useState<ProductDraft[]>([]);
  
  // Analytics state
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  
  // Email state
  const [emailDrafts, setEmailDrafts] = useState<EmailDraft[]>([]);
  
  // Social state
  const [socialDrafts, setSocialDrafts] = useState<SocialDraft[]>([]);
  
  // Actions state
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Fetch analytics when tab changes or period changes
  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchAnalytics();
    }
  }, [activeTab, analyticsPeriod]);

  const fetchAnalytics = async () => {
    if (!user?.email) return;
    setIsLoading(true);
    try {
      const data = await ecommerceAgentService.getAnalytics(user.email, analyticsPeriod);
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !user?.email) return;
    
    const userMessage = chatInput.trim();
    setChatInput('');
    
    // Add user message
    setChatHistory(prev => [...prev, {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    }]);
    
    setIsLoading(true);
    try {
      const response = await ecommerceAgentService.orchestrate(user.email, userMessage);
      
      // Add assistant response
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: response.message || "I've processed your request. Is there anything else you'd like me to help with?",
        suggestions: response.suggestions || [],
        timestamp: new Date()
      }]);
      
      // Refresh pending actions
      const actions = await ecommerceAgentService.getActions(user.email, 'pending');
      setPendingActions(actions || []);
    } catch (error) {
      console.error('Chat error:', error);
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: "I apologize, but I encountered an error. Please try again.",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScrapeProducts = async () => {
    if (!productUrls.trim() || !user?.email) return;
    
    const urls = productUrls.split('\n').filter(url => url.trim());
    if (urls.length === 0) return;
    
    setIsLoading(true);
    try {
      const drafts = await ecommerceAgentService.scrapeProducts(user.email, urls);
      setProductDrafts(prev => [...prev, ...drafts]);
      setProductUrls('');
    } catch (error) {
      console.error('Scrape error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveProduct = async (productId: string) => {
    if (!user?.email) return;
    try {
      await ecommerceAgentService.approveProduct(user.email, productId);
      setProductDrafts(prev => 
        prev.map(p => p.id === productId ? { ...p, status: 'approved' } : p)
      );
    } catch (error) {
      console.error('Approve error:', error);
    }
  };

  const handlePublishProduct = async (productId: string) => {
    if (!user?.email) return;
    try {
      await ecommerceAgentService.publishProduct(user.email, productId);
      setProductDrafts(prev => 
        prev.map(p => p.id === productId ? { ...p, status: 'published' } : p)
      );
    } catch (error) {
      console.error('Publish error:', error);
    }
  };

  const handleGenerateEmail = async (campaignType: string) => {
    if (!user?.email) return;
    setIsLoading(true);
    try {
      const draft = await ecommerceAgentService.generateEmail(user.email, { campaignType });
      setEmailDrafts(prev => [...prev, draft]);
    } catch (error) {
      console.error('Email generation error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateSocial = async (platform: string, contentType: string) => {
    if (!user?.email) return;
    setIsLoading(true);
    try {
      const draft = await ecommerceAgentService.generateSocialContent(user.email, { platform, contentType });
      setSocialDrafts(prev => [...prev, draft]);
    } catch (error) {
      console.error('Social generation error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveAction = async (actionId: string) => {
    if (!user?.email) return;
    try {
      await ecommerceAgentService.approveAction(user.email, actionId);
      setPendingActions(prev => prev.filter(a => a.id !== actionId));
    } catch (error) {
      console.error('Action approve error:', error);
    }
  };

  const handleRejectAction = async (actionId: string) => {
    if (!user?.email) return;
    try {
      await ecommerceAgentService.rejectAction(user.email, actionId);
      setPendingActions(prev => prev.filter(a => a.id !== actionId));
    } catch (error) {
      console.error('Action reject error:', error);
    }
  };

  const handleConnectService = async (service: string) => {
    if (!user?.email) return;
    try {
      const url = await ecommerceAgentService.getOAuthUrl(user.email, service);
      window.open(url, '_blank');
    } catch (error) {
      console.error('OAuth error:', error);
    }
  };

  // Tab configuration
  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'chat', label: 'Chat', icon: <Icons.MessageCircle className="w-5 h-5" /> },
    { id: 'products', label: 'Products', icon: <Icons.Shop className="w-5 h-5" /> },
    { id: 'analytics', label: 'Analytics', icon: <Icons.BarChart2 className="w-5 h-5" /> },
    { id: 'email', label: 'Email', icon: <Icons.Mail className="w-5 h-5" /> },
    { id: 'social', label: 'Social', icon: <Icons.Globe className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings', icon: <Icons.Settings className="w-5 h-5" /> }
  ];

  // ============================================
  // TAB RENDERERS
  // ============================================

  const renderChatTab = () => (
    <div className="flex flex-col h-full">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatHistory.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-[#3423A6] text-white'
                  : 'bg-white/10 text-white'
              }`}
            >
              <p className="text-sm leading-relaxed">{message.content}</p>
              {message.suggestions && message.suggestions.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {message.suggestions.map((suggestion, sIndex) => (
                    <button
                      key={sIndex}
                      onClick={() => {
                        setChatInput(suggestion);
                        chatInputRef.current?.focus();
                      }}
                      className="text-xs px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-[#3423A6] focus:ring-offset-2 focus:ring-offset-[#171738]"
                      aria-label={`Use suggestion: ${suggestion}`}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white/10 rounded-2xl px-4 py-3">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Pending Actions */}
      {pendingActions.length > 0 && (
        <div className="px-4 py-2 border-t border-white/10">
          <p className="text-xs text-white/60 mb-2">Pending Actions ({pendingActions.length})</p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {pendingActions.slice(0, 3).map(action => (
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

      {/* FIX #36: Chat Input with proper focus ring and accessibility */}
      <div className="p-4 border-t border-white/10">
        <div className="flex gap-2">
          <input
            ref={chatInputRef}
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            placeholder="Ask me anything..."
            className="flex-1 bg-white/10 text-white placeholder-white/40 rounded-xl px-4 py-3 text-sm
                       focus:outline-none focus:ring-2 focus:ring-[#3423A6] focus:ring-offset-2 focus:ring-offset-[#171738]
                       focus:bg-white/15 transition-all duration-200"
            aria-label="Chat message input"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!chatInput.trim() || isLoading}
            className="p-3 bg-[#3423A6] text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed
                       hover:bg-[#3423A6]/80 transition-colors focus:outline-none focus:ring-2 focus:ring-[#3423A6] 
                       focus:ring-offset-2 focus:ring-offset-[#171738]"
            aria-label="Send message"
          >
            <Icons.Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );

  const renderProductsTab = () => (
    <div className="p-4 space-y-6">
      {/* Add Products */}
      <div className="bg-white/5 rounded-2xl p-4">
        <h3 className="text-white font-semibold mb-3">Add Products</h3>
        <p className="text-white/60 text-sm mb-3">
          Paste product URLs (one per line) to import and optimize
        </p>
        <textarea
          value={productUrls}
          onChange={(e) => setProductUrls(e.target.value)}
          placeholder="https://example.com/product-1&#10;https://example.com/product-2"
          className="w-full bg-white/10 text-white placeholder-white/40 rounded-xl px-4 py-3 text-sm min-h-[100px] resize-none
                     focus:outline-none focus:ring-2 focus:ring-[#3423A6] focus:ring-offset-2 focus:ring-offset-[#171738]"
          aria-label="Product URLs input"
        />
        <button
          onClick={handleScrapeProducts}
          disabled={!productUrls.trim() || isLoading}
          className="mt-3 w-full py-3 bg-[#3423A6] text-white rounded-xl font-medium disabled:opacity-50
                     hover:bg-[#3423A6]/80 transition-colors focus:outline-none focus:ring-2 focus:ring-[#3423A6]
                     focus:ring-offset-2 focus:ring-offset-[#171738]"
        >
          {isLoading ? 'Importing...' : 'Import Products'}
        </button>
      </div>

      {/* FIX #37: Product Drafts with unified spacing and consistent layout */}
      <div>
        <h3 className="text-white font-semibold mb-4">
          Product Drafts {productDrafts.length > 0 && `(${productDrafts.length})`}
        </h3>
        {productDrafts.length === 0 ? (
          <div className="empty-state bg-white/5 rounded-2xl p-8">
            <div className="empty-state-icon">
              <Icons.Shop className="w-8 h-8 text-white/30" />
            </div>
            <p className="empty-state-title">No product drafts</p>
            <p className="empty-state-description">
              Import products from URLs to get started
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {productDrafts.map(product => (
              <ProductDraftCard
                key={product.id}
                product={product}
                onApprove={() => handleApproveProduct(product.id)}
                onPublish={() => handlePublishProduct(product.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderAnalyticsTab = () => (
    <div className="p-4 space-y-6">
      {/* Period Selector */}
      <div className="flex gap-2">
        {(['daily', 'weekly', 'monthly'] as const).map(period => (
          <button
            key={period}
            onClick={() => setAnalyticsPeriod(period)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all focus:outline-none 
                       focus:ring-2 focus:ring-[#3423A6] focus:ring-offset-2 focus:ring-offset-[#171738] ${
              analyticsPeriod === period
                ? 'bg-[#3423A6] text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            {period.charAt(0).toUpperCase() + period.slice(1)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton h-24 rounded-2xl" />
          ))}
        </div>
      ) : analytics ? (
        <>
          {/* KPIs */}
          <div className="grid gap-4 sm:grid-cols-2">
            <KPICard
              title="Revenue"
              value={`$${analytics.revenue.toLocaleString()}`}
              change={analytics.revenueChange}
              icon={<Icons.DollarSign className="w-5 h-5" />}
            />
            <KPICard
              title="Orders"
              value={analytics.orders.toString()}
              change={analytics.ordersChange}
              icon={<Icons.Shop className="w-5 h-5" />}
            />
            <KPICard
              title="Visitors"
              value={analytics.visitors.toLocaleString()}
              change={analytics.visitorsChange}
              icon={<Icons.Users className="w-5 h-5" />}
            />
            <KPICard
              title="Conversion"
              value={`${analytics.conversionRate}%`}
              change={analytics.conversionChange}
              icon={<Icons.TrendingUp className="w-5 h-5" />}
            />
          </div>

          {/* Insights */}
          {analytics.insights && analytics.insights.length > 0 && (
            <div>
              <h3 className="text-white font-semibold mb-3">AI Insights</h3>
              <div className="space-y-3">
                {analytics.insights.map(insight => (
                  <InsightCard key={insight.id} insight={insight} />
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="empty-state bg-white/5 rounded-2xl p-8">
          <div className="empty-state-icon">
            <Icons.BarChart2 className="w-8 h-8 text-white/30" />
          </div>
          <p className="empty-state-title">No analytics data</p>
          <p className="empty-state-description">
            Connect your store to see performance metrics
          </p>
        </div>
      )}
    </div>
  );

  const renderEmailTab = () => (
    <div className="p-4 space-y-6">
      {/* Campaign Types */}
      <div>
        <h3 className="text-white font-semibold mb-3">Generate Campaign</h3>
        <div className="grid grid-cols-2 gap-3">
          {['Welcome Series', 'Abandoned Cart', 'Product Launch', 'Re-engagement'].map(type => (
            <button
              key={type}
              onClick={() => handleGenerateEmail(type.toLowerCase().replace(' ', '_'))}
              disabled={isLoading}
              className="p-4 bg-white/5 rounded-xl text-left hover:bg-white/10 transition-colors
                         focus:outline-none focus:ring-2 focus:ring-[#3423A6] focus:ring-offset-2 focus:ring-offset-[#171738]"
            >
              <p className="text-white font-medium text-sm">{type}</p>
              <p className="text-white/50 text-xs mt-1">AI-generated</p>
            </button>
          ))}
        </div>
      </div>

      {/* Email Drafts */}
      <div>
        <h3 className="text-white font-semibold mb-3">
          Email Drafts {emailDrafts.length > 0 && `(${emailDrafts.length})`}
        </h3>
        {emailDrafts.length === 0 ? (
          <div className="empty-state bg-white/5 rounded-2xl p-8">
            <div className="empty-state-icon">
              <Icons.Mail className="w-8 h-8 text-white/30" />
            </div>
            <p className="empty-state-title">No email drafts</p>
            <p className="empty-state-description">
              Generate a campaign to get started
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {emailDrafts.map(draft => (
              <EmailPreviewCard key={draft.id} draft={draft} />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderSocialTab = () => (
    <div className="p-4 space-y-6">
      {/* Platform Selection */}
      <div>
        <h3 className="text-white font-semibold mb-3">Generate Content</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { platform: 'instagram', icon: <EcommerceIcons.Instagram className="w-5 h-5" />, label: 'Instagram' },
            { platform: 'twitter', icon: <EcommerceIcons.Twitter className="w-5 h-5" />, label: 'Twitter/X' },
            { platform: 'facebook', icon: <EcommerceIcons.Facebook className="w-5 h-5" />, label: 'Facebook' },
            { platform: 'tiktok', icon: <EcommerceIcons.TikTok className="w-5 h-5" />, label: 'TikTok' }
          ].map(({ platform, icon, label }) => (
            <button
              key={platform}
              onClick={() => handleGenerateSocial(platform, 'post')}
              disabled={isLoading}
              className="p-4 bg-white/5 rounded-xl flex items-center gap-3 hover:bg-white/10 transition-colors
                         focus:outline-none focus:ring-2 focus:ring-[#3423A6] focus:ring-offset-2 focus:ring-offset-[#171738]"
            >
              {icon}
              <span className="text-white text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Social Drafts */}
      <div>
        <h3 className="text-white font-semibold mb-3">
          Content Drafts {socialDrafts.length > 0 && `(${socialDrafts.length})`}
        </h3>
        {socialDrafts.length === 0 ? (
          <div className="empty-state bg-white/5 rounded-2xl p-8">
            <div className="empty-state-icon">
              <Icons.Globe className="w-8 h-8 text-white/30" />
            </div>
            <p className="empty-state-title">No content drafts</p>
            <p className="empty-state-description">
              Select a platform to generate content
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {socialDrafts.map(draft => (
              <SocialContentCard key={draft.id} draft={draft} />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderSettingsTab = () => (
    <div className="p-4 space-y-6">
      {/* Connected Accounts */}
      <div>
        <h3 className="text-white font-semibold mb-3">Connected Accounts</h3>
        <div className="space-y-3">
          {[
            { id: 'shopify', name: 'Shopify', icon: <EcommerceIcons.Shopify className="w-6 h-6" />, connected: false },
            { id: 'stripe', name: 'Stripe', icon: <EcommerceIcons.Stripe className="w-6 h-6" />, connected: false },
            { id: 'mailchimp', name: 'Mailchimp', icon: <EcommerceIcons.Mailchimp className="w-6 h-6" />, connected: false },
            { id: 'google_analytics', name: 'Google Analytics', icon: <Icons.BarChart2 className="w-6 h-6" />, connected: false }
          ].map(service => (
            <ConnectedAccountCard
              key={service.id}
              service={service}
              onConnect={() => handleConnectService(service.id)}
            />
          ))}
        </div>
      </div>

      {/* Preferences */}
      <div>
        <h3 className="text-white font-semibold mb-3">Preferences</h3>
        <div className="bg-white/5 rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm font-medium">Auto-approve suggestions</p>
              <p className="text-white/50 text-xs">Automatically approve low-risk actions</p>
            </div>
            <button
              className="w-12 h-7 rounded-full bg-white/20 relative transition-colors focus:outline-none 
                         focus:ring-2 focus:ring-[#3423A6] focus:ring-offset-2 focus:ring-offset-[#171738]"
              role="switch"
              aria-checked="false"
              aria-label="Auto-approve suggestions toggle"
            >
              <span className="absolute left-1 top-1 w-5 h-5 bg-white rounded-full transition-transform" />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm font-medium">Email notifications</p>
              <p className="text-white/50 text-xs">Receive updates about your store</p>
            </div>
            <button
              className="w-12 h-7 rounded-full bg-[#3423A6] relative transition-colors focus:outline-none 
                         focus:ring-2 focus:ring-[#3423A6] focus:ring-offset-2 focus:ring-offset-[#171738]"
              role="switch"
              aria-checked="true"
              aria-label="Email notifications toggle"
            >
              <span className="absolute right-1 top-1 w-5 h-5 bg-white rounded-full transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#171738] flex flex-col pb-safe">
      {/* Header */}
      <header className="pt-safe px-4 py-4 flex items-center justify-between border-b border-white/10">
        <button
          onClick={() => setView(AppView.CHAT)}
          className="p-2 -ml-2 hover:bg-white/10 rounded-xl transition-colors focus:outline-none 
                     focus:ring-2 focus:ring-[#3423A6] focus:ring-offset-2 focus:ring-offset-[#171738]"
          aria-label="Go back to chat"
        >
          <Icons.ArrowLeft className="w-6 h-6 text-white" />
        </button>
        <h1 className="text-white text-lg font-semibold">Growth Assistant</h1>
        <button
          className="p-2 -mr-2 hover:bg-white/10 rounded-xl transition-colors relative focus:outline-none 
                     focus:ring-2 focus:ring-[#3423A6] focus:ring-offset-2 focus:ring-offset-[#171738]"
          aria-label={`Notifications${pendingActions.length > 0 ? `, ${pendingActions.length} pending` : ''}`}
        >
          <Icons.Bell className="w-6 h-6 text-white" />
          {pendingActions.length > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
          )}
        </button>
      </header>

      {/* FIX #35: Tab Navigation with stronger active state */}
      <nav className="px-2 py-2 border-b border-white/10 overflow-x-auto scrollbar-hide">
        <div className="flex gap-1 min-w-max">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200
                         focus:outline-none focus:ring-2 focus:ring-[#3423A6] focus:ring-offset-2 focus:ring-offset-[#171738]
                         ${activeTab === tab.id
                           ? 'bg-[#3423A6] text-white shadow-lg shadow-[#3423A6]/30 ring-2 ring-[#3423A6]/50'
                           : 'text-white/60 hover:text-white hover:bg-white/10'
                         }`}
              aria-selected={activeTab === tab.id}
              role="tab"
            >
              {tab.icon}
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Tab Content */}
      <main className="flex-1 overflow-y-auto">
        {activeTab === 'chat' && renderChatTab()}
        {activeTab === 'products' && renderProductsTab()}
        {activeTab === 'analytics' && renderAnalyticsTab()}
        {activeTab === 'email' && renderEmailTab()}
        {activeTab === 'social' && renderSocialTab()}
        {activeTab === 'settings' && renderSettingsTab()}
      </main>
    </div>
  );
};

export default EcommerceAgentView;
