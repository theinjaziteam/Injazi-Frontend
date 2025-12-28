import React from 'react';
import { AppProvider, useApp } from './contexts/AppContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AppView } from './types';
import { BottomNav } from './components/UIComponents';

// Import Views
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

    if (!isAuthenticated) return <LoginView />;

    const showNav = view !== AppView.ONBOARDING && 
                    view !== AppView.LIVE_CALL && 
                    view !== AppView.TASK_EXECUTION && 
                    view !== AppView.SETTINGS && 
                    view !== AppView.TASK_HISTORY && 
                    view !== AppView.TASK_SELECTION;

    return (
        <div className="h-[100dvh] w-screen bg-bg-primary overflow-hidden flex flex-col font-sans transition-colors duration-300">
            <div className="flex-1 overflow-hidden relative" id="main-container">
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
                        <h1 className="text-2xl font-bold mb-2 text-text-primary">View: {view}</h1>
                        <p className="text-text-secondary mb-6">This section is under construction.</p>
                        <button onClick={() => setView(AppView.DASHBOARD)} className="px-6 py-3 bg-primary text-text-inverse rounded-full font-bold">Back to Dashboard</button>
                    </div>
                )}
            </div>

            {showAdOverlay && (
                <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-6 animate-fade-in">
                   <div className="w-full max-w-sm bg-bg-card rounded-3xl overflow-hidden relative">
                       <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md">Ad ends in {adCountdown}s</div>
                       <img src="https://picsum.photos/400/600" className="w-full h-96 object-cover" />
                       <div className="p-6 text-center">
                           <h2 className="text-2xl font-black text-text-primary mb-4">Upgrade Your Life</h2>
                       </div>
                   </div>
                </div>
            )}

            {showNav && (
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
