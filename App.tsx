// App.tsx
import React from 'react';
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

    if (!isAuthenticated) return <LoginView />;

    const hideNavViews = [
        AppView.ONBOARDING,
        AppView.LIVE_CALL,
        AppView.TASK_EXECUTION,
        AppView.SETTINGS,
        AppView.TASK_HISTORY,
        AppView.TASK_SELECTION,
        AppView.CHAT
    ];

    const showNav = !hideNavViews.includes(view);

    return (
        <div 
            className={`font-sans ${theme === 'light' ? 'light-mode' : ''}`}
            style={{ 
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: '#171738',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            {/* Main content area */}
            <div style={{ 
                flex: 1, 
                overflow: 'hidden', 
                position: 'relative',
                marginBottom: showNav ? '56px' : '0'
            }}>
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
                    <div className="p-10 text-center flex flex-col items-center justify-center h-full" style={{ backgroundColor: '#171738' }}>
                        <h1 className="text-2xl font-bold mb-2 text-white">View: {view}</h1>
                        <p className="text-gray-400 mb-6">This section is under construction.</p>
                        <button onClick={() => setView(AppView.DASHBOARD)} className="px-6 py-3 bg-white text-black rounded-full font-bold">
                            Back to Dashboard
                        </button>
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

            {/* Bottom Navigation - Fixed at bottom */}
            {showNav && (
                <div style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '56px',
                    zIndex: 9999,
                    backgroundColor: '#171738',
                    borderTop: '1px solid rgba(255,255,255,0.1)'
                }}>
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
