// App.tsx
import React, { useEffect, useState } from 'react';
import { AppProvider, useApp } from './contexts/AppContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { AppView } from './types';
import { BottomNav } from './components/UIComponents';

import LoginView from './views/LoginView';
import OnboardingView from './views/OnboardingView';
import DashboardView from './views/DashboardView';
import ChatView from './views/ChatView';
import TaskExecutionView from './views/TaskExecutionView';
import SocialView from './views/SocialView';
import StatsView from './views/StatsView';
import ShopView from './views/ShopView';
import SettingsView from './views/SettingsView';
import TaskHistoryView from './views/TaskHistoryView';
import TaskSelectionView from './views/TaskSelectionView';

function AppContent() {
    const { view, setView, isAuthenticated, showAdOverlay, adCountdown } = useApp();
    const { theme } = useTheme();
    const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

    // Detect keyboard open/close
    useEffect(() => {
        const handleResize = () => {
            // On iOS/Android, when keyboard opens, visualViewport height decreases
            if (window.visualViewport) {
                const isOpen = window.visualViewport.height < window.innerHeight * 0.75;
                setIsKeyboardOpen(isOpen);
            }
        };

        // Listen to visualViewport changes (better for keyboard detection)
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleResize);
            window.visualViewport.addEventListener('scroll', handleResize);
        }

        // Fallback for older browsers
        window.addEventListener('resize', handleResize);

        return () => {
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', handleResize);
                window.visualViewport.removeEventListener('scroll', handleResize);
            }
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    if (!isAuthenticated) return <LoginView />;

    const showNav = view !== AppView.ONBOARDING && 
                    view !== AppView.LIVE_CALL && 
                    view !== AppView.TASK_EXECUTION && 
                    view !== AppView.SETTINGS && 
                    view !== AppView.TASK_HISTORY && 
                    view !== AppView.TASK_SELECTION &&
                    view !== AppView.CHAT; // Hide nav in chat view

    return (
        <div 
            className={`h-[100dvh] w-screen bg-white overflow-hidden flex flex-col font-sans ${theme === 'light' ? 'light-mode' : ''}`}
            style={{ 
                height: '100dvh',
                // Prevent iOS bounce/scroll
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                overflow: 'hidden'
            }}
        >
            <div 
                className="flex-1 overflow-hidden relative" 
                id="main-container"
                style={{
                    paddingBottom: showNav ? '60px' : '0px' // Account for nav height
                }}
            >
                {view === AppView.ONBOARDING && <OnboardingView />}
                {view === AppView.DASHBOARD && <DashboardView />}
                {view === AppView.CHAT && <ChatView />}
                {view === AppView.TASK_EXECUTION && <TaskExecutionView />}
                {view === AppView.SOCIAL && <SocialView />}
                {view === AppView.STATS && <StatsView />}
                {view === AppView.SHOP && <ShopView />}
                {view === AppView.SETTINGS && <SettingsView />}
                {view === AppView.TASK_HISTORY && <TaskHistoryView />}
                {view === AppView.TASK_SELECTION && <TaskSelectionView />}
                
                {(view === AppView.PLANS || view === AppView.USER_PROFILE) && (
                    <div className="p-10 text-center flex flex-col items-center justify-center h-full">
                        <h1 className="text-2xl font-bold mb-2 text-primary">View: {view}</h1>
                        <p className="text-gray-500 mb-6">This section is under construction.</p>
                        <button onClick={() => setView(AppView.DASHBOARD)} className="px-6 py-3 bg-primary text-white rounded-full font-bold">Back to Dashboard</button>
                    </div>
                )}
            </div>

            {showAdOverlay && (
                <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-6 animate-fade-in">
                   <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden relative">
                       <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md">Ad ends in {adCountdown}s</div>
                       <img src="https://picsum.photos/400/600" className="w-full h-96 object-cover" alt="Ad" />
                       <div className="p-6 text-center">
                           <h2 className="text-2xl font-black text-primary mb-4">Upgrade Your Life</h2>
                       </div>
                   </div>
                </div>
            )}

            {/* Bottom Nav - Fixed position, won't move with keyboard */}
            {showNav && !isKeyboardOpen && (
                <div 
                    className="fixed bottom-0 left-0 right-0 z-50"
                    style={{
                        paddingBottom: 'env(safe-area-inset-bottom)'
                    }}
                >
                    <BottomNav 
                        activeTab={
                            view === AppView.DASHBOARD ? 'dashboard' :
                            view === AppView.SOCIAL ? 'social' :
                            view === AppView.CHAT ? 'chat' :
                            view === AppView.STATS ? 'stats' :
                            view === AppView.SHOP ? 'shop' : ''
                        } 
                        onTabChange={(tab) => {
                            if (tab === 'dashboard') setView(AppView.DASHBOARD);
                            if (tab === 'social') setView(AppView.SOCIAL);
                            if (tab === 'chat') setView(AppView.CHAT);
                            if (tab === 'stats') setView(AppView.STATS);
                            if (tab === 'shop') setView(AppView.SHOP);
                        }} 
                    />
                </div>
            )}
        </div>
    );
}

export default function App() {
    return (
        <ThemeProvider>
            <AppProvider>
                <AppContent />
            </AppProvider>
        </ThemeProvider>
    );
}
