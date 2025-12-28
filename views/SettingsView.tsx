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
            email: '', password: '', createdAt: 0, name: '', country: '', privacyAccepted: false,
            goal: null, allGoals: [], currentDay: 1, credits: 0, streak: 0, isPremium: false,
            activePlanId: 'free', realMoneyBalance: 0, earnings: [], dailyTasks: [], todoList: [],
            extraLogs: [], earnTasks: [], selectedTaskId: null, chatHistory: [], connectedApps: [],
            agentAlerts: [], userProfile: '', lastCheckInDate: 0, completedLessonIds: [],
            completedPhaseIds: [], maxGoalSlots: 3, history: [], reminders: [], myCourses: [],
            myProducts: [], myVideos: [], friends: []
        } as any);
        setIsAuthenticated(false);
        setView(AppView.LOGIN);
    };

    return (
        <div className="h-full overflow-y-auto transition-colors duration-300" style={{ backgroundColor: 'var(--bg-primary)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <div className="min-h-full pb-20">
                {/* Header */}
                <div className="px-6 pt-12 pb-6 transition-colors duration-300" style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', paddingTop: 'max(env(safe-area-inset-top), 3rem)' }}>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setView(AppView.DASHBOARD)} className="p-2 rounded-full transition-colors" style={{ backgroundColor: 'var(--bg-surface)' }}>
                            <Icons.ChevronLeft className="w-6 h-6" style={{ color: 'var(--text-primary)' }} />
                        </button>
                        <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Settings</h1>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Profile Section */}
                    <Card className="p-6">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--accent)' }}>
                                <span className="text-2xl font-black" style={{ color: 'var(--accent-dark)' }}>
                                    {user.name?.charAt(0)?.toUpperCase() || 'U'}
                                </span>
                            </div>
                            <div>
                                <h2 className="text-lg font-bold" style={{ color: 'var(--text-on-card)' }}>{user.name || 'User'}</h2>
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{user.email}</p>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div className="p-3 rounded-2xl" style={{ backgroundColor: 'var(--bg-surface)' }}>
                                <p className="text-2xl font-black" style={{ color: 'var(--text-on-card)' }}>{user.streak}</p>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Streak</p>
                            </div>
                            <div className="p-3 rounded-2xl" style={{ backgroundColor: 'var(--bg-surface)' }}>
                                <p className="text-2xl font-black" style={{ color: 'var(--text-on-card)' }}>{user.credits}</p>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Credits</p>
                            </div>
                            <div className="p-3 rounded-2xl" style={{ backgroundColor: 'var(--bg-surface)' }}>
                                <p className="text-2xl font-black" style={{ color: 'var(--text-on-card)' }}>{user.currentDay}</p>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Day</p>
                            </div>
                        </div>
                    </Card>

                    {/* Appearance Section */}
                    <Card className="overflow-hidden">
                        <div className="p-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <h3 className="font-bold" style={{ color: 'var(--text-on-card)' }}>Appearance</h3>
                        </div>
                        
                        <div onClick={toggleTheme} className="p-4 flex items-center justify-between cursor-pointer hover:opacity-80 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: theme === 'dark' ? 'var(--bg-surface)' : '#FEF3C7' }}>
                                    {theme === 'dark' ? (
                                        <Icons.Moon className="w-5 h-5" style={{ color: 'var(--text-on-card)' }} />
                                    ) : (
                                        <Icons.Sun className="w-5 h-5 text-yellow-600" />
                                    )}
                                </div>
                                <div>
                                    <p className="font-semibold" style={{ color: 'var(--text-on-card)' }}>Theme</p>
                                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                        {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                                    </p>
                                </div>
                            </div>
                            
                            <div className={`w-14 h-8 rounded-full p-1 transition-colors ${theme === 'light' ? 'bg-[var(--accent)]' : ''}`} style={{ backgroundColor: theme === 'dark' ? 'var(--bg-surface)' : 'var(--accent)' }}>
                                <div className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform ${theme === 'light' ? 'translate-x-6' : 'translate-x-0'}`} />
                            </div>
                        </div>
                    </Card>

                    {/* Account Section */}
                    <Card className="overflow-hidden">
                        <div className="p-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <h3 className="font-bold" style={{ color: 'var(--text-on-card)' }}>Account</h3>
                        </div>
                        
                        <button onClick={() => setView(AppView.TASK_HISTORY)} className="w-full p-4 flex items-center justify-between hover:opacity-80 transition-colors" style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--bg-surface)' }}>
                                    <Icons.Clock className="w-5 h-5" style={{ color: 'var(--text-on-card)' }} />
                                </div>
                                <p className="font-semibold" style={{ color: 'var(--text-on-card)' }}>Task History</p>
                            </div>
                            <Icons.ChevronRight className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                        </button>
                        
                        <button className="w-full p-4 flex items-center justify-between hover:opacity-80 transition-colors" style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--bg-surface)' }}>
                                    <Icons.Bell className="w-5 h-5" style={{ color: 'var(--text-on-card)' }} />
                                </div>
                                <p className="font-semibold" style={{ color: 'var(--text-on-card)' }}>Notifications</p>
                            </div>
                            <Icons.ChevronRight className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                        </button>
                        
                        <button className="w-full p-4 flex items-center justify-between hover:opacity-80 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--bg-surface)' }}>
                                    <Icons.Shield className="w-5 h-5" style={{ color: 'var(--text-on-card)' }} />
                                </div>
                                <p className="font-semibold" style={{ color: 'var(--text-on-card)' }}>Privacy</p>
                            </div>
                            <Icons.ChevronRight className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                        </button>
                    </Card>

                    {/* Logout */}
                    <Button variant="danger" onClick={handleLogout}>
                        <Icons.LogOut className="w-5 h-5 mr-2" />
                        Log Out
                    </Button>

                    <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                        InJazi v1.0.0 • Made with purpose
                    </p>
                </div>
            </div>
        </div>
    );
}
