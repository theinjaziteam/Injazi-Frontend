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
    const [keyboardVisible, setKeyboardVisible] = useState(false);

    // Detect keyboard visibility
    useEffect(() => {
        const detectKeyboard = () => {
            if (window.visualViewport) {
                const heightDiff = window.innerHeight - window.visualViewport.height;
                setKeyboardVisible(heightDiff > 150);
            }
        };

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', detectKeyboard);
        }
        window.addEventListener('resize', detectKeyboard);

        return () => {
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', detectKeyboard);
            }
            window.removeEventListener('resize', detectKeyboard);
        };
    }, []);

    if (!isAuthenticated) return <LoginView />;

    const hideNavViews = [
        AppView.ONBOARDING,
        AppView.LIVE_CALL,
        AppView.TASK_EXECUTION,
        AppView.SETTINGS,
        AppView.TASK_HISTORY,
        AppView.TASK_SELECTION,
        AppView.CHAT // Chat has its own UI
    ];

    const showNav = !hideNavViews.includes(view) && !keyboardVisible;

    return (
        <div 
            className={`keyboard-fix bg-background flex flex-col font-sans ${theme === 'light' ? 'light-mode' : ''}`}
        >
            {/* Main Content */}
            <div 
                className="flex-1 overflow-hidden relative"
                style={{
                    height: showNav ? 'calc(100% - 60px)' : '100%'
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

            {/* Ad Overlay */}
            {showAdOverlay && (
                <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-6 animate-fade-in">
                   <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden relative">
                       <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md">
                           Ad ends in {adCountdown}s
                       </div>
                       <img src="https://picsum.photos/400/600" className="w-full h-96 object-cover" alt="Ad" />
                       <div className="p-6 text-center">
                           <h2 className="text-2xl font-black text-primary mb-4">Upgrade Your Life</h2>
                       </div>
                   </div>
                </div>
            )}

            {/* Bottom Navigation - Fixed, doesn't move with keyboard */}
            {showNav && (
                <div className="fixed-bottom-nav bg-background border-t border-border">
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
