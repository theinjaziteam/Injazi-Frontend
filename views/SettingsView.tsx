import React, { useState, useEffect } from 'react';
import { useApp } from '../App';
import { Icons, Button, Toggle, Card } from '../components/UIComponents';
import { AppView, User, PlanTier, ConnectedApp } from '../types';
import * as api from '../services/api';

const COUNTRIES = [
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'RU', name: 'Russia', flag: '🇷🇺' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { code: 'GR', name: 'Greece', flag: '🇬🇷' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷' },
  { code: 'IL', name: 'Israel', flag: '🇮🇱' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
  { code: 'PE', name: 'Peru', flag: '🇵🇪' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰' },
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩' },
  { code: 'UA', name: 'Ukraine', flag: '🇺🇦' },
  { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿' },
  { code: 'RO', name: 'Romania', flag: '🇷🇴' },
  { code: 'HU', name: 'Hungary', flag: '🇭🇺' },
];

const SettingsView: React.FC = () => {
  const { user, setUser, setView, setIsAuthenticated } = useApp();
  
  // Local state for editing
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [country, setCountry] = useState(user?.country || 'US');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // FIX #12: Local state for toggle preferences
  const [pushNotifications, setPushNotifications] = useState(user?.preferences?.pushNotifications ?? true);
  const [emailDigest, setEmailDigest] = useState(user?.preferences?.emailDigest ?? true);
  const [darkMode, setDarkMode] = useState(user?.preferences?.darkMode ?? true);

  // Sync local state when user changes
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPassword('');
      setCountry(user.country || 'US');
      // Sync preferences
      setPushNotifications(user.preferences?.pushNotifications ?? true);
      setEmailDigest(user.preferences?.emailDigest ?? true);
      setDarkMode(user.preferences?.darkMode ?? true);
    }
  }, [user]);

  const updateAndSave = async (updates: Partial<User>) => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      await api.sync(updatedUser);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    await updateAndSave({ 
      name, 
      email,
      password: password || user?.password, 
      country 
    });
    setEditMode(false);
  };

  const handleCancelEdit = () => {
    setName(user?.name || '');
    setEmail(user?.email || '');
    setPassword('');
    setCountry(user?.country || 'US');
    setEditMode(false);
  };

  const handlePlanSelect = (planId: PlanTier, isPremium: boolean) => {
    updateAndSave({ 
      activePlanId: planId,
      isPremium,
      maxGoalSlots: isPremium ? (planId === 'creator' ? 10 : 5) : 3
    });
    setShowPlans(false);
  };

  const toggleAppConnection = (appId: string) => {
    if (!user) return;
    const updatedApps = user.connectedApps?.map(app => 
      app.id === appId ? { ...app, isConnected: !app.isConnected } : app
    ) || [];
    updateAndSave({ connectedApps: updatedApps });
  };

  // FIX #12: Toggle handlers that actually update user preferences
  const handleTogglePushNotifications = (value: boolean) => {
    setPushNotifications(value);
    updateAndSave({ 
      preferences: { 
        ...user?.preferences, 
        pushNotifications: value 
      } 
    });
  };

  const handleToggleEmailDigest = (value: boolean) => {
    setEmailDigest(value);
    updateAndSave({ 
      preferences: { 
        ...user?.preferences, 
        emailDigest: value 
      } 
    });
  };

  const handleToggleDarkMode = (value: boolean) => {
    setDarkMode(value);
    updateAndSave({ 
      preferences: { 
        ...user?.preferences, 
        darkMode: value 
      } 
    });
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to log out?')) {
      localStorage.removeItem('injazi_token');
      localStorage.removeItem('injazi_user');
      setIsAuthenticated(false);
      setView(AppView.LOGIN);
    }
  };

  const handleDeleteAccount = () => {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      if (confirm('This will permanently delete all your data. Continue?')) {
        localStorage.clear();
        setIsAuthenticated(false);
        setView(AppView.LOGIN);
      }
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#171738] flex items-center justify-center">
        <div className="animate-pulse text-white/60">Loading...</div>
      </div>
    );
  }

  const currentCountry = COUNTRIES.find(c => c.code === country) || COUNTRIES[0];

  const plans = [
    {
      id: 'free' as PlanTier,
      name: 'Free',
      price: '$0',
      period: '/month',
      features: ['3 Goal Slots', 'Basic AI Chat', 'Daily Tasks', 'Progress Tracking'],
      isPremium: false
    },
    {
      id: 'premium' as PlanTier,
      name: 'Premium',
      price: '$9.99',
      period: '/month',
      features: ['5 Goal Slots', 'Advanced AI Agents', 'Priority Support', 'Custom Themes', 'Analytics Dashboard'],
      isPremium: true,
      popular: true
    },
    {
      id: 'creator' as PlanTier,
      name: 'Creator',
      price: '$19.99',
      period: '/month',
      features: ['10 Goal Slots', 'All Premium Features', 'E-commerce Integration', 'Social Publishing', 'Team Collaboration'],
      isPremium: true
    }
  ];

  return (
    <div className="min-h-screen bg-[#171738]">
      {/* Header - Non-sticky */}
      <div className="px-5 pt-4 pb-4">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setView(AppView.DASHBOARD)}
            className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center"
            aria-label="Go back to dashboard"
          >
            <Icons.ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-lg font-semibold text-white">Settings</h1>
          <div className="w-10" />
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="px-5 pb-32 space-y-6 overflow-y-auto">
        {/* Save Success Toast */}
        {saveSuccess && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-green-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg animate-fade-in">
            ✓ Saved successfully
          </div>
        )}

        {/* Wallet Section */}
        <Card className="bg-gradient-to-br from-[#3423A6] to-[#5B4BC4] p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-white/80 text-sm font-medium">Your Wallet</span>
            <Icons.Wallet className="w-5 h-5 text-white/60" />
          </div>
          <div className="flex items-end gap-6">
            <div>
              <p className="text-white/60 text-xs mb-1">Credits</p>
              <p className="text-3xl font-bold text-white">{user.credits?.toLocaleString() || 0}</p>
            </div>
            <div>
              <p className="text-white/60 text-xs mb-1">Cash Balance</p>
              <p className="text-2xl font-bold text-green-400">${(user.realMoneyBalance || 0).toFixed(2)}</p>
            </div>
          </div>
        </Card>

        {/* Active Membership */}
        <Card className="bg-white/5 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/80 text-sm font-medium">Active Membership</span>
            <button 
              onClick={() => setShowPlans(true)}
              className="text-[#3423A6] text-sm font-medium"
            >
              Change Plan
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              user.isPremium ? 'bg-gradient-to-br from-yellow-400 to-orange-500' : 'bg-white/10'
            }`}>
              <Icons.Crown className={`w-6 h-6 ${user.isPremium ? 'text-white' : 'text-white/40'}`} />
            </div>
            <div>
              <p className="text-white font-semibold capitalize">{user.activePlanId || 'Free'} Plan</p>
              <p className="text-white/40 text-sm">{user.maxGoalSlots || 3} goal slots</p>
            </div>
          </div>
        </Card>

        {/* Profile Section */}
        <Card className="bg-white/5 p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-white/80 text-sm font-medium">Profile</span>
            {!editMode ? (
              <button 
                onClick={() => setEditMode(true)}
                className="text-[#3423A6] text-sm font-medium"
              >
                Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button 
                  onClick={handleCancelEdit}
                  className="text-white/40 text-sm font-medium"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="text-[#3423A6] text-sm font-medium"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="text-white/40 text-xs mb-1 block">Name</label>
              {editMode ? (
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#3423A6]"
                />
              ) : (
                <p className="text-white">{user.name}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="text-white/40 text-xs mb-1 block">Email</label>
              {editMode ? (
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#3423A6]"
                />
              ) : (
                <p className="text-white">{user.email}</p>
              )}
            </div>

            {/* Password */}
            {editMode && (
              <div>
                <label className="text-white/40 text-xs mb-1 block">New Password (optional)</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Leave blank to keep current"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#3423A6] pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40"
                  >
                    {showPassword ? <Icons.EyeOff className="w-5 h-5" /> : <Icons.Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            )}

            {/* Country */}
            <div>
              <label className="text-white/40 text-xs mb-1 block">Country</label>
              {editMode ? (
                <button
                  onClick={() => setShowCountryPicker(true)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-left flex items-center justify-between"
                >
                  <span>{currentCountry.flag} {currentCountry.name}</span>
                  <Icons.ChevronRight className="w-5 h-5 text-white/40" />
                </button>
              ) : (
                <p className="text-white">{currentCountry.flag} {currentCountry.name}</p>
              )}
            </div>
          </div>
        </Card>

        {/* Connected Apps */}
        <Card className="bg-white/5 p-5">
          <span className="text-white/80 text-sm font-medium block mb-4">Connected Apps</span>
          <div className="space-y-3">
            {(user.connectedApps || []).map((app: ConnectedApp) => (
              <div key={app.id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    app.isConnected ? 'bg-[#3423A6]/20' : 'bg-white/5'
                  }`}>
                    {app.id === 'shopify' && <Icons.ShoppingBag className="w-5 h-5 text-[#96BF48]" />}
                    {app.id === 'tiktok' && <Icons.Video className="w-5 h-5 text-white" />}
                    {app.id === 'instagram' && <Icons.Instagram className="w-5 h-5 text-[#E4405F]" />}
                    {app.id === 'google' && <Icons.BarChart2 className="w-5 h-5 text-[#4285F4]" />}
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium capitalize">{app.name}</p>
                    <p className="text-white/40 text-xs">
                      {app.isConnected ? 'Connected' : 'Not connected'}
                    </p>
                  </div>
                </div>
                <Toggle 
                  enabled={app.isConnected} 
                  onChange={() => toggleAppConnection(app.id)} 
                  aria-label={`Toggle ${app.name} connection`}
                />
              </div>
            ))}
          </div>
        </Card>

        {/* Preferences - FIX #12: Working toggles */}
        <Card className="bg-white/5 p-5">
          <span className="text-white/80 text-sm font-medium block mb-4">Preferences</span>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm">Push Notifications</p>
                <p className="text-white/40 text-xs">Get notified about tasks & goals</p>
              </div>
              <Toggle 
                enabled={pushNotifications} 
                onChange={handleTogglePushNotifications}
                aria-label="Toggle push notifications"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm">Email Digest</p>
                <p className="text-white/40 text-xs">Weekly progress summary</p>
              </div>
              <Toggle 
                enabled={emailDigest} 
                onChange={handleToggleEmailDigest}
                aria-label="Toggle email digest"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm">Dark Mode</p>
                <p className="text-white/40 text-xs">Use dark theme</p>
              </div>
              <Toggle 
                enabled={darkMode} 
                onChange={handleToggleDarkMode}
                aria-label="Toggle dark mode"
              />
            </div>
          </div>
        </Card>

        {/* Legal & Support */}
        <Card className="bg-white/5 p-5">
          <span className="text-white/80 text-sm font-medium block mb-4">Legal & Support</span>
          <div className="space-y-1">
            <button 
              onClick={() => setView(AppView.LEGAL)}
              className="w-full flex items-center justify-between py-3 text-white/80 hover:text-white transition-colors"
            >
              <span className="text-sm">Terms & Privacy Policy</span>
              <Icons.ChevronRight className="w-5 h-5 text-white/40" />
            </button>
            <button className="w-full flex items-center justify-between py-3 text-white/80 hover:text-white transition-colors">
              <span className="text-sm">Help Center</span>
              <Icons.ChevronRight className="w-5 h-5 text-white/40" />
            </button>
            <button className="w-full flex items-center justify-between py-3 text-white/80 hover:text-white transition-colors">
              <span className="text-sm">Contact Support</span>
              <Icons.ChevronRight className="w-5 h-5 text-white/40" />
            </button>
          </div>
        </Card>

        {/* Danger Zone */}
        <Card className="bg-red-500/10 border border-red-500/20 p-5">
          <span className="text-red-400 text-sm font-medium block mb-4">Danger Zone</span>
          <div className="space-y-3">
            <Button
              onClick={handleLogout}
              className="w-full bg-white/5 text-white hover:bg-white/10"
            >
              <Icons.LogOut className="w-4 h-4 mr-2" />
              Log Out
            </Button>
            <Button
              onClick={handleDeleteAccount}
              className="w-full bg-red-500/20 text-red-400 hover:bg-red-500/30"
            >
              <Icons.Trash2 className="w-4 h-4 mr-2" />
              Delete Account
            </Button>
          </div>
        </Card>

        {/* App Version */}
        <div className="text-center py-4">
          <p className="text-white/20 text-xs">INJAZI v1.0.0</p>
          <p className="text-white/20 text-xs">Made with ♥ by The Injazi Team</p>
        </div>
      </div>

      {/* Plans Modal */}
      {showPlans && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end">
          <div className="w-full bg-[#171738] rounded-t-3xl max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#171738] px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Choose Your Plan</h2>
              <button 
                onClick={() => setShowPlans(false)}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"
                aria-label="Close plans modal"
              >
                <Icons.X className="w-4 h-4 text-white" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative p-5 rounded-2xl border-2 transition-all ${
                    user.activePlanId === plan.id 
                      ? 'border-[#3423A6] bg-[#3423A6]/10' 
                      : 'border-white/10 bg-white/5'
                  }`}
                >
                  {plan.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#3423A6] text-white text-xs font-medium rounded-full">
                      Most Popular
                    </span>
                  )}
                  {user.activePlanId === plan.id && (
                    <span className="absolute -top-3 right-4 px-3 py-1 bg-green-500 text-white text-xs font-medium rounded-full">
                      Current
                    </span>
                  )}
                  <div className="flex items-end gap-1 mb-3">
                    <span className="text-3xl font-bold text-white">{plan.price}</span>
                    <span className="text-white/40 text-sm mb-1">{plan.period}</span>
                  </div>
                  <h3 className="text-white font-semibold mb-3">{plan.name}</h3>
                  <ul className="space-y-2 mb-4">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-white/60 text-sm">
                        <Icons.Check className="w-4 h-4 text-[#3423A6]" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  {user.activePlanId !== plan.id && (
                    <Button
                      onClick={() => handlePlanSelect(plan.id, plan.isPremium)}
                      className="w-full bg-[#3423A6] text-white"
                    >
                      {plan.isPremium ? 'Upgrade' : 'Downgrade'} to {plan.name}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Country Picker Modal - FIX #2: Improved z-index and safe area */}
      {showCountryPicker && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end safe-area-inset-bottom">
          <div className="w-full bg-[#171738] rounded-t-3xl max-h-[70vh] overflow-hidden flex flex-col">
            <div className="sticky top-0 bg-[#171738] px-5 py-4 border-b border-white/10 flex items-center justify-between flex-shrink-0">
              <h2 className="text-lg font-semibold text-white">Select Country</h2>
              <button 
                onClick={() => setShowCountryPicker(false)}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"
                aria-label="Close country picker"
              >
                <Icons.X className="w-4 h-4 text-white" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 pb-safe">
              {COUNTRIES.map((c) => (
                <button
                  key={c.code}
                  onClick={() => {
                    setCountry(c.code);
                    setShowCountryPicker(false);
                  }}
                  className={`w-full px-5 py-4 flex items-center gap-3 hover:bg-white/5 transition-colors ${
                    country === c.code ? 'bg-[#3423A6]/20' : ''
                  }`}
                >
                  <span className="text-2xl">{c.flag}</span>
                  <span className="text-white">{c.name}</span>
                  {country === c.code && (
                    <Icons.Check className="w-5 h-5 text-[#3423A6] ml-auto" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;
