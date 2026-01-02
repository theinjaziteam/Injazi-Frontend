// components/BridgeHub.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { Icons } from '../components/UIComponents';
import { oauthService, PlatformInfo, ConnectedAccount, CATEGORIES } from '../services/oauthService';

interface BridgeHubProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function BridgeHub({ isOpen, onClose }: BridgeHubProps) {
    const { user } = useApp();
    const [platforms, setPlatforms] = useState<PlatformInfo[]>([]);
    const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const [isLoading, setIsLoading] = useState(true);
    const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
    
    // Modal states
    const [showKlaviyoModal, setShowKlaviyoModal] = useState(false);
    const [showShopifyModal, setShowShopifyModal] = useState(false);
    const [klaviyoKeys, setKlaviyoKeys] = useState({ apiKey: '', publicKey: '' });
    const [shopifyDomain, setShopifyDomain] = useState('');
    const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    useEffect(() => {
        if (isOpen && user?.email) {
            loadData();
        }
    }, [isOpen, user?.email]);

    useEffect(() => {
        const result = oauthService.handleCallback();
        if (result) {
            if (result.success) {
                showNotificationMessage('success', `${result.platform} connected successfully!`);
                loadData();
            } else {
                showNotificationMessage('error', result.error || 'Connection failed');
            }
        }
    }, []);

    const loadData = async () => {
        if (!user?.email) return;
        setIsLoading(true);
        try {
            const [platformsData, accountsData] = await Promise.all([
                oauthService.getAllPlatforms(),
                oauthService.getConnectedAccounts(user.email)
            ]);
            setPlatforms(platformsData);
            setConnectedAccounts(accountsData);
        } catch (error) {
            console.error('Error loading bridge data:', error);
        }
        setIsLoading(false);
    };

    const showNotificationMessage = (type: 'success' | 'error', message: string) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 3000);
    };

    const filteredPlatforms = useMemo(() => {
        return platforms.filter(platform => {
            const matchesSearch = platform.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  platform.description.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = activeCategory === 'all' || platform.category === activeCategory;
            return matchesSearch && matchesCategory;
        });
    }, [platforms, searchQuery, activeCategory]);

    const getConnectionStatus = (platformId: string): { status: 'connected' | 'expired' | 'disconnected'; account: ConnectedAccount | null } => {
        const account = connectedAccounts.find(a => a.platform === platformId);
        if (!account) return { status: 'disconnected', account: null };
        if (account.isExpired) return { status: 'expired', account };
        if (account.isConnected) return { status: 'connected', account };
        return { status: 'disconnected', account: null };
    };

    const handleConnect = async (platform: PlatformInfo) => {
        if (!user?.email) {
            showNotificationMessage('error', 'Please sign in first');
            return;
        }

        // Handle API key platforms
        if (platform.type === 'api_key') {
            if (platform.id === 'klaviyo') {
                setShowKlaviyoModal(true);
            }
            return;
        }

        // Handle Shopify (requires shop domain)
        if (platform.type === 'shopify' || platform.id === 'shopify') {
            setShowShopifyModal(true);
            return;
        }

        setConnectingPlatform(platform.id);
        
        try {
            const success = await oauthService.connect(platform.id, user.email);
            if (!success) {
                showNotificationMessage('error', 'Failed to initiate connection');
            }
        } catch (error) {
            showNotificationMessage('error', 'Connection error');
        }
        
        setConnectingPlatform(null);
    };

    const handleDisconnect = async (platformId: string) => {
        if (!user?.email) return;
        
        const success = await oauthService.disconnect(user.email, platformId);
        if (success) {
            showNotificationMessage('success', 'Disconnected successfully');
            loadData();
        } else {
            showNotificationMessage('error', 'Failed to disconnect');
        }
    };

    const handleRefresh = async (platformId: string) => {
        if (!user?.email) return;
        
        setConnectingPlatform(platformId);
        const success = await oauthService.refreshToken(user.email, platformId);
        if (success) {
            showNotificationMessage('success', 'Token refreshed');
            loadData();
        } else {
            showNotificationMessage('error', 'Failed to refresh token');
        }
        setConnectingPlatform(null);
    };

    const handleKlaviyoConnect = async () => {
        if (!user?.email) return;
        
        setConnectingPlatform('klaviyo');
        const result = await oauthService.connectKlaviyo(
            user.email, 
            klaviyoKeys.apiKey || undefined, 
            klaviyoKeys.publicKey || undefined
        );
        
        if (result.success) {
            showNotificationMessage('success', 'Klaviyo connected successfully!');
            setShowKlaviyoModal(false);
            setKlaviyoKeys({ apiKey: '', publicKey: '' });
            loadData();
        } else {
            showNotificationMessage('error', result.error || 'Failed to connect Klaviyo');
        }
        setConnectingPlatform(null);
    };

    const handleShopifyConnect = async () => {
        if (!user?.email || !shopifyDomain.trim()) return;
        
        setConnectingPlatform('shopify');
        const result = await oauthService.connectShopify(user.email, shopifyDomain.trim());
        
        if (result.success) {
            setShowShopifyModal(false);
            setShopifyDomain('');
        } else {
            showNotificationMessage('error', result.error || 'Failed to connect Shopify');
        }
        setConnectingPlatform(null);
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const connectedCount = connectedAccounts.filter(a => a.isConnected && !a.isExpired).length;
    const expiredCount = connectedAccounts.filter(a => a.isExpired).length;

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
        >
            <div 
                className="bg-gray-50 w-full h-[95vh] sm:h-[90vh] sm:max-w-2xl sm:rounded-2xl rounded-t-[2rem] shadow-2xl flex flex-col overflow-hidden animate-slide-up"
                onClick={(e) => e.stopPropagation()}
            >
                {/* HEADER */}
                <div className="flex-shrink-0 bg-[#171738] rounded-b-[2rem] shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#3423A6] rounded-full blur-[80px] opacity-20 translate-x-1/2 -translate-y-1/2" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#DFF3E4] rounded-full blur-[60px] opacity-10 -translate-x-1/2 translate-y-1/2" />
                    
                    <div className="relative z-10 p-5 pt-safe">
                        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4 sm:hidden"/>
                        
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h1 className="text-xl font-black text-white tracking-tight">Bridge Hub</h1>
                                <p className="text-xs text-white/50 mt-0.5">Connect your favorite platforms</p>
                            </div>
                            <button 
                                onClick={onClose}
                                className="p-2.5 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                            >
                                <Icons.X className="w-5 h-5 text-white"/>
                            </button>
                        </div>

                        <div className="bg-white/10 backdrop-blur-xl border border-white/10 p-4 rounded-2xl">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-[9px] font-bold text-white/60 uppercase tracking-[0.15em]">Connected Apps</span>
                                    <div className="flex items-baseline gap-2 mt-1">
                                        <span className="text-3xl font-black text-white">{connectedCount}</span>
                                        <span className="text-sm font-bold text-white/40">/ {platforms.length}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center gap-2 bg-[#DFF3E4]/20 px-3 py-1 rounded-full">
                                        <div className="w-2 h-2 bg-[#DFF3E4] rounded-full animate-pulse"/>
                                        <span className="text-[10px] font-bold text-[#DFF3E4]">{connectedCount} Active</span>
                                    </div>
                                    {expiredCount > 0 && (
                                        <div className="flex items-center gap-2 bg-amber-400/20 px-3 py-1 rounded-full">
                                            <div className="w-2 h-2 bg-amber-400 rounded-full"/>
                                            <span className="text-[10px] font-bold text-amber-400">{expiredCount} Expired</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Search Bar - WHITE TEXT */}
                        <div className="mt-4 relative">
                            <Icons.Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40"/>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search platforms..."
                                className="w-full bg-white/10 border border-white/10 rounded-xl py-3 pl-11 pr-10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#3423A6]/50 focus:bg-white/15 transition-all"
                                style={{ color: 'white' }}
                            />
                            {searchQuery && (
                                <button 
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/10 rounded-full"
                                >
                                    <Icons.X className="w-3.5 h-3.5 text-white/40"/>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* CATEGORY TABS */}
                <div className="flex-shrink-0 bg-gray-50 border-b border-gray-100">
                    <div className="flex gap-2 px-5 py-3 overflow-x-auto scrollbar-hide">
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                                    activeCategory === cat.id
                                        ? 'bg-[#171738] text-white shadow-lg'
                                        : 'bg-white text-gray-400 hover:bg-gray-100 border border-gray-100'
                                }`}
                            >
                                <span>{cat.icon}</span>
                                <span>{cat.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* PLATFORMS GRID */}
                <div className="flex-1 overflow-y-auto px-5 py-4">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full">
                            <div className="w-12 h-12 border-4 border-gray-200 border-t-[#3423A6] rounded-full animate-spin mb-4"/>
                            <p className="text-sm text-gray-400">Loading platforms...</p>
                        </div>
                    ) : filteredPlatforms.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <Icons.Search className="w-12 h-12 text-gray-200 mb-4"/>
                            <h3 className="font-bold text-gray-600">No platforms found</h3>
                            <p className="text-sm text-gray-400">Try adjusting your search</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {filteredPlatforms.map((platform) => {
                                const { status, account } = getConnectionStatus(platform.id);
                                const isConnecting = connectingPlatform === platform.id;
                                
                                return (
                                    <div
                                        key={platform.id}
                                        className={`relative bg-white rounded-2xl p-4 border-2 transition-all hover:shadow-lg ${
                                            status === 'connected' ? 'border-[#DFF3E4]' 
                                            : status === 'expired' ? 'border-amber-300'
                                            : 'border-transparent hover:border-gray-200'
                                        }`}
                                    >
                                        {status === 'connected' && (
                                            <div className="absolute -top-2 -right-2 w-5 h-5 bg-[#DFF3E4] rounded-full flex items-center justify-center shadow">
                                                <Icons.Check className="w-3 h-3 text-[#171738]"/>
                                            </div>
                                        )}
                                        {status === 'expired' && (
                                            <div className="absolute -top-2 -right-2 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center shadow">
                                                <Icons.AlertCircle className="w-3 h-3 text-white"/>
                                            </div>
                                        )}

                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-3 ${
                                            !platform.configured ? 'bg-gray-100 opacity-50' : 'bg-gray-50'
                                        }`}>
                                            {platform.icon}
                                        </div>

                                        <h3 className={`font-bold text-sm mb-0.5 ${!platform.configured ? 'text-gray-400' : 'text-[#171738]'}`}>
                                            {platform.name}
                                        </h3>
                                        <p className="text-[10px] text-gray-400 line-clamp-1 mb-3">{platform.description}</p>

                                        {status === 'connected' && account?.platformUsername && (
                                            <div className="flex items-center gap-2 mb-3 p-2 bg-gray-50 rounded-lg">
                                                <div className="w-5 h-5 bg-[#3423A6] rounded-full flex items-center justify-center">
                                                    <span className="text-[8px] text-white font-bold">
                                                        {account.platformUsername.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] font-medium text-gray-600 truncate">
                                                    {account.platformUsername}
                                                </span>
                                            </div>
                                        )}

                                        {!platform.configured ? (
                                            <button disabled className="w-full py-2 bg-gray-100 text-gray-400 rounded-xl text-xs font-bold cursor-not-allowed">
                                                Coming Soon
                                            </button>
                                        ) : status === 'connected' ? (
                                            <button 
                                                onClick={() => handleDisconnect(platform.id)}
                                                className="w-full py-2 bg-gray-100 text-gray-500 rounded-xl text-xs font-bold hover:bg-red-50 hover:text-red-500 transition-colors"
                                            >
                                                Disconnect
                                            </button>
                                        ) : status === 'expired' ? (
                                            <button 
                                                onClick={() => handleRefresh(platform.id)}
                                                disabled={isConnecting}
                                                className="w-full py-2 bg-amber-100 text-amber-700 rounded-xl text-xs font-bold hover:bg-amber-200 flex items-center justify-center gap-1.5 disabled:opacity-50"
                                            >
                                                {isConnecting ? (
                                                    <><div className="w-3 h-3 border-2 border-amber-700/30 border-t-amber-700 rounded-full animate-spin"/>Reconnecting...</>
                                                ) : (
                                                    <><Icons.RefreshCw className="w-3 h-3"/>Reconnect</>
                                                )}
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={() => handleConnect(platform)}
                                                disabled={isConnecting}
                                                className="w-full py-2 bg-[#3423A6] text-white rounded-xl text-xs font-bold hover:bg-[#171738] flex items-center justify-center gap-1.5 disabled:opacity-50"
                                            >
                                                {isConnecting ? (
                                                    <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Connecting...</>
                                                ) : (
                                                    <><Icons.Link className="w-3 h-3"/>Connect</>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* FOOTER */}
                <div className="flex-shrink-0 px-5 py-4 bg-white border-t border-gray-100" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-[#DFF3E4] rounded-full flex items-center justify-center">
                                <Icons.Shield className="w-4 h-4 text-[#171738]"/>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-gray-600">Secure OAuth 2.0</p>
                                <p className="text-[9px] text-gray-400">Your data is encrypted</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-200">
                            Done
                        </button>
                    </div>
                </div>
            </div>

            {/* KLAVIYO MODAL */}
            {showKlaviyoModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={(e) => { if (e.target === e.currentTarget) setShowKlaviyoModal(false); }}>
                    <div className="bg-white w-full max-w-md mx-4 rounded-2xl p-6 shadow-2xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-5">
                            <div className="flex items-center gap-3">
                                <span className="text-3xl">📧</span>
                                <div>
                                    <h2 className="text-lg font-black text-[#171738]">Connect Klaviyo</h2>
                                    <p className="text-xs text-gray-400">Enter your API keys</p>
                                </div>
                            </div>
                            <button onClick={() => setShowKlaviyoModal(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
                                <Icons.X className="w-4 h-4"/>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1.5">Private API Key</label>
                                <input
                                    type="password"
                                    value={klaviyoKeys.apiKey}
                                    onChange={(e) => setKlaviyoKeys(k => ({ ...k, apiKey: e.target.value }))}
                                    placeholder="pk_xxxxxxxxxxxx"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm text-gray-900 focus:ring-2 focus:ring-[#3423A6]/50"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1.5">Public API Key <span className="text-gray-400 font-normal">(optional)</span></label>
                                <input
                                    type="text"
                                    value={klaviyoKeys.publicKey}
                                    onChange={(e) => setKlaviyoKeys(k => ({ ...k, publicKey: e.target.value }))}
                                    placeholder="xxxxxx"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm text-gray-900 focus:ring-2 focus:ring-[#3423A6]/50"
                                />
                            </div>
                        </div>

                        <div className="mt-5 p-3 bg-blue-50 rounded-xl flex gap-2">
                            <Icons.Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5"/>
                            <p className="text-xs text-blue-600">Find your API keys in Klaviyo under <strong>Account → Settings → API Keys</strong></p>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowKlaviyoModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-200">Cancel</button>
                            <button
                                onClick={handleKlaviyoConnect}
                                disabled={connectingPlatform === 'klaviyo' || !klaviyoKeys.apiKey.trim()}
                                className="flex-1 py-3 bg-[#3423A6] text-white rounded-xl font-bold text-sm hover:bg-[#171738] disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {connectingPlatform === 'klaviyo' ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Connecting...</> : 'Connect'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* SHOPIFY MODAL */}
            {showShopifyModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={(e) => { if (e.target === e.currentTarget) setShowShopifyModal(false); }}>
                    <div className="bg-white w-full max-w-md mx-4 rounded-2xl p-6 shadow-2xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-5">
                            <div className="flex items-center gap-3">
                                <span className="text-3xl">🛒</span>
                                <div>
                                    <h2 className="text-lg font-black text-[#171738]">Connect Shopify</h2>
                                    <p className="text-xs text-gray-400">Enter your store domain</p>
                                </div>
                            </div>
                            <button onClick={() => setShowShopifyModal(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
                                <Icons.X className="w-4 h-4"/>
                            </button>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1.5">Store Domain</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={shopifyDomain}
                                    onChange={(e) => setShopifyDomain(e.target.value)}
                                    placeholder="mystore"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 pr-32 text-sm text-gray-900 focus:ring-2 focus:ring-[#96BF48]/50"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">.myshopify.com</span>
                            </div>
                            <p className="mt-2 text-[10px] text-gray-400">Enter just your store name, or the full domain</p>
                        </div>

                        <div className="mt-5 p-3 bg-green-50 rounded-xl flex gap-2">
                            <Icons.Info className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5"/>
                            <p className="text-xs text-green-600">Find your store domain in Shopify admin under <strong>Settings → Domains</strong></p>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowShopifyModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-200">Cancel</button>
                            <button
                                onClick={handleShopifyConnect}
                                disabled={connectingPlatform === 'shopify' || !shopifyDomain.trim()}
                                className="flex-1 py-3 bg-[#96BF48] text-white rounded-xl font-bold text-sm hover:bg-[#7ea83d] disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {connectingPlatform === 'shopify' ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Connecting...</> : 'Connect Store'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* NOTIFICATION */}
            {notification && (
                <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[120] px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-slide-down ${
                    notification.type === 'success' ? 'bg-[#DFF3E4] text-[#171738]' : 'bg-red-100 text-red-700'
                }`}>
                    {notification.type === 'success' ? <Icons.Check className="w-5 h-5"/> : <Icons.AlertCircle className="w-5 h-5"/>}
                    <span className="font-bold text-sm">{notification.message}</span>
                </div>
            )}
        </div>
    );
}

export { BridgeHub };
