import React from 'react';
import { useApp } from '../contexts/AppContext';
import { useTheme } from '../contexts/ThemeContext';
import { AppView } from '../types';
import { Icons, Button, Card } from '../components/UIComponents';

export default function SettingsView() {
    const { user, setUser, setView, setIsAuthenticated } = useApp();
    const { theme, toggleTheme } = useTheme();

    const handleLogout = () => {
        localStorage.removeItem('injazi_user');
        localStorage.removeItem('injazi_token');
        setUser({ 
            email: '', 
            password: '', 
            createdAt: 0, 
            name: '', 
            country: '',
            privacyAccepted: false,
            goal: null,
            allGoals: [],
            currentDay: 1,
            credits: 0,
            streak: 0,
            isPremium: false,
            activePlanId: 'free',
            realMoneyBalance: 0,
            earnings: [],
            dailyTasks: [],
            todoList: [],
            extraLogs: [],
            earnTasks: [],
            selectedTaskId: null,
            chatHistory: [],
            connectedApps: [],
            agentAlerts: [],
            userProfile: '',
            lastCheckInDate: 0,
            completedLessonIds: [],
            completedPhaseIds: [],
            maxGoalSlots: 3,
            history: [],
            reminders: [],
            myCourses: [],
            myProducts: [],
            myVideos: [],
            friends: []
        } as any);
        setIsAuthenticated(false);
        setView(AppView.LOGIN);
    };

    return (
        <div className="h-full bg-bg-primary overflow-y-auto pb-safe transition-colors duration-300">
            <div className="min-h-full pb-20">
                {/* Header */}
                <div className="bg-bg-secondary px-6 pt-safe pt-12 pb-6 border-b border-border">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setView(AppView.DASHBOARD)} 
                            className="p-2 rounded-full bg-bg-surface hover:bg-bg-input transition-colors"
                        >
                            <Icons.ChevronLeft className="w-6 h-6 text-text-primary" />
                        </button>
                        <h1 className="text-2xl font-black text-text-primary">Settings</h1>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Profile Section */}
                    <Card className="p-6">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center">
                                <span className="text-2xl font-black text-accent-text">
                                    {user.name?.charAt(0)?.toUpperCase() || 'U'}
                                </span>
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-text-primary">{user.name || 'User'}</h2>
                                <p className="text-sm text-text-secondary">{user.email}</p>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div className="p-3 rounded-2xl bg-bg-surface">
                                <p className="text-2xl font-black text-text-primary">{user.streak}</p>
                                <p className="text-xs text-text-muted">Streak</p>
                            </div>
                            <div className="p-3 rounded-2xl bg-bg-surface">
                                <p className="text-2xl font-black text-text-primary">{user.credits}</p>
                                <p className="text-xs text-text-muted">Credits</p>
                            </div>
                            <div className="p-3 rounded-2xl bg-bg-surface">
                                <p className="text-2xl font-black text-text-primary">{user.currentDay}</p>
                                <p className="text-xs text-text-muted">Day</p>
                            </div>
                        </div>
                    </Card>

                    {/* Appearance Section */}
                    <Card className="overflow-hidden">
                        <div className="p-4 border-b border-border">
                            <h3 className="font-bold text-text-primary">Appearance</h3>
                        </div>
                        
                        <div 
                            onClick={toggleTheme}
                            className="p-4 flex items-center justify-between cursor-pointer hover:bg-bg-surface transition-colors"
                        >
                            <div className="flex items-center gap-4">
                                {theme === 'dark' ? (
                                    <div className="w-10 h-10 rounded-xl bg-bg-surface flex items-center justify-center">
                                        <Icons.Moon className="w-5 h-5 text-text-primary" />
                                    </div>
                                ) : (
                                    <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center">
                                        <Icons.Sun className="w-5 h-5 text-yellow-600" />
                                    </div>
                                )}
                                <div>
                                    <p className="font-semibold text-text-primary">Theme</p>
                                    <p className="text-sm text-text-secondary">
                                        {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                                    </p>
                                </div>
                            </div>
                            
                            {/* Toggle Switch */}
                            <div className={`w-14 h-8 rounded-full p-1 transition-colors ${
                                theme === 'light' ? 'bg-accent' : 'bg-bg-surface'
                            }`}>
                                <div className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform ${
                                    theme === 'light' ? 'translate-x-6' : 'translate-x-0'
                                }`} />
                            </div>
                        </div>
                    </Card>

                    {/* Other Settings */}
                    <Card className="overflow-hidden">
                        <div className="p-4 border-b border-border">
                            <h3 className="font-bold text-text-primary">Account</h3>
                        </div>
                        
                        <button 
                            onClick={() => setView(AppView.TASK_HISTORY)}
                            className="w-full p-4 flex items-center justify-between hover:bg-bg-surface transition-colors border-b border-border"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-bg-surface flex items-center justify-center">
                                    <Icons.Clock className="w-5 h-5 text-text-primary" />
                                </div>
                                <p className="font-semibold text-text-primary">Task History</p>
                            </div>
                            <Icons.ChevronRight className="w-5 h-5 text-text-muted" />
                        </button>
                        
                        <button className="w-full p-4 flex items-center justify-between hover:bg-bg-surface transition-colors border-b border-border">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-bg-surface flex items-center justify-center">
                                    <Icons.Bell className="w-5 h-5 text-text-primary" />
                                </div>
                                <p className="font-semibold text-text-primary">Notifications</p>
                            </div>
                            <Icons.ChevronRight className="w-5 h-5 text-text-muted" />
                        </button>
                        
                        <button className="w-full p-4 flex items-center justify-between hover:bg-bg-surface transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-bg-surface flex items-center justify-center">
                                    <Icons.Shield className="w-5 h-5 text-text-primary" />
                                </div>
                                <p className="font-semibold text-text-primary">Privacy</p>
                            </div>
                            <Icons.ChevronRight className="w-5 h-5 text-text-muted" />
                        </button>
                    </Card>

                    {/* Logout Button */}
                    <Button variant="danger" onClick={handleLogout}>
                        <Icons.LogOut className="w-5 h-5 mr-2" />
                        Log Out
                    </Button>

                    {/* App Info */}
                    <p className="text-center text-xs text-text-muted">
                        InJazi v1.0.0 • Made with purpose
                    </p>
                </div>
            </div>
        </div>
    );
}
