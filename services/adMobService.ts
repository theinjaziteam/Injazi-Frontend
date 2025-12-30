// services/adMobService.ts

// ============================================
// TYPES & INTERFACES
// ============================================

declare global {
    interface Window {
        ReactNativeWebView?: {
            postMessage: (message: string) => void;
        };
        // For Capacitor
        Capacitor?: {
            isNativePlatform: () => boolean;
            Plugins?: {
                AdMob?: any;
            };
        };
        // Message handler for native responses
        handleAdMobResponse?: (data: AdMobNativeResponse) => void;
    }
}

export type AdRewardType = 
    | 'credits' 
    | 'premium_time' 
    | 'streak_freeze' 
    | 'goal_slot' 
    | 'real_money' 
    | 'xp_boost' 
    | 'extra_task';

export interface AdRewardConfig {
    rewardType: AdRewardType;
    amount: number;
    adUnitId?: string;
    customData?: Record<string, any>;
}

export interface AdMobNativeResponse {
    type: 'REWARDED_AD_RESULT' | 'REWARDED_AD_LOADED' | 'REWARDED_AD_FAILED' | 'REWARDED_AD_DISMISSED';
    payload: {
        success: boolean;
        transactionId?: string;
        error?: string;
        rewardType?: string;
        rewardAmount?: number;
    };
}

export interface RewardVerificationResult {
    success: boolean;
    rewarded: boolean;
    transaction?: {
        transactionId: string;
        rewardType: string;
        amount: number;
        timestamp: number;
    };
    currentBalance?: {
        credits: number;
        realMoney: number;
        streakFreezes: number;
    };
    error?: string;
}

export interface AdMobCallbackParams {
    ad_network?: string;
    ad_unit?: string;
    custom_data?: string;
    reward_amount?: string;
    reward_item?: string;
    signature?: string;
    key_id?: string;
    transaction_id?: string;
    user_id?: string;
    timestamp?: string;
}

// ============================================
// CONFIGURATION
// ============================================

const API_URL = import.meta.env.VITE_API_URL || 'https://injazi-backend.onrender.com';

// Ad Unit IDs - Replace with your actual AdMob ad unit IDs
const AD_UNIT_IDS = {
    // Test IDs (use these for development)
    test: {
        android: 'ca-app-pub-3940256099942544/5224354917',
        ios: 'ca-app-pub-3940256099942544/1712485313'
    },
    // Production IDs (replace with your real IDs)
    production: {
        android: import.meta.env.VITE_ADMOB_ANDROID_REWARDED || 'ca-app-pub-xxxxx/yyyyy',
        ios: import.meta.env.VITE_ADMOB_IOS_REWARDED || 'ca-app-pub-xxxxx/zzzzz'
    }
};

// Maximum ads per day per user
const MAX_DAILY_ADS = 10;

// Reward configurations
const REWARD_CONFIGS: Record<AdRewardType, { defaultAmount: number; description: string }> = {
    credits: { defaultAmount: 50, description: 'Bonus credits' },
    premium_time: { defaultAmount: 24, description: 'Premium hours' },
    streak_freeze: { defaultAmount: 1, description: 'Streak freeze' },
    goal_slot: { defaultAmount: 1, description: 'Extra goal slot' },
    real_money: { defaultAmount: 10, description: 'Cash reward (cents)' },
    xp_boost: { defaultAmount: 2, description: 'XP multiplier' },
    extra_task: { defaultAmount: 1, description: 'Bonus task' }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate a unique transaction ID
 */
const generateTransactionId = (): string => {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 11);
    return `txn_${timestamp}_${randomPart}`;
};

/**
 * Get the appropriate ad unit ID based on platform
 */
const getAdUnitId = (isProduction: boolean = false): string => {
    const platform = detectPlatform();
    const environment = isProduction ? 'production' : 'test';
    return AD_UNIT_IDS[environment][platform] || AD_UNIT_IDS.test.android;
};

/**
 * Detect the current platform
 */
const detectPlatform = (): 'android' | 'ios' => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
        return 'ios';
    }
    return 'android';
};

/**
 * Check if running in a native app context
 */
const isNativeApp = (): boolean => {
    return !!(
        window.ReactNativeWebView || 
        (window.Capacitor && window.Capacitor.isNativePlatform?.())
    );
};

/**
 * Sleep utility for polling
 */
const sleep = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

// ============================================
// MAIN SERVICE
// ============================================

export const adMobService = {
    /**
     * Your callback URL for AdMob console configuration
     */
    CALLBACK_URL: `${API_URL}/api/admob/reward-callback`,

    /**
     * Check if ads are available on this platform
     */
    isAvailable: (): boolean => {
        return isNativeApp();
    },

    /**
     * Get platform info
     */
    getPlatformInfo: () => ({
        isNative: isNativeApp(),
        platform: detectPlatform(),
        hasReactNativeWebView: !!window.ReactNativeWebView,
        hasCapacitor: !!window.Capacitor
    }),

    /**
     * Check if user can watch more ads today
     */
    canWatchAd: async (userEmail: string): Promise<{ canWatch: boolean; adsRemaining: number; error?: string }> => {
        try {
            const response = await fetch(`${API_URL}/api/admob/can-watch?email=${encodeURIComponent(userEmail)}`);
            const data = await response.json();
            
            return {
                canWatch: data.canWatch ?? true,
                adsRemaining: data.adsRemaining ?? MAX_DAILY_ADS
            };
        } catch (error) {
            console.error('Error checking ad availability:', error);
            return { canWatch: true, adsRemaining: MAX_DAILY_ADS };
        }
    },

    /**
     * Show a rewarded ad
     */
    showRewardedAd: async (
        userEmail: string,
        config: AdRewardConfig
    ): Promise<{ success: boolean; transactionId?: string; error?: string }> => {
        return new Promise((resolve) => {
            // Generate unique transaction ID
            const transactionId = generateTransactionId();
            
            // Prepare custom data for server callback
            const customData = JSON.stringify({
                email: userEmail,
                rewardType: config.rewardType,
                amount: config.amount || REWARD_CONFIGS[config.rewardType].defaultAmount,
                transactionId,
                timestamp: Date.now(),
                ...config.customData
            });

            // Check if in native app
            if (!isNativeApp()) {
                // Development/Web fallback
                if (import.meta.env.DEV) {
                    console.log('🎬 [DEV] Simulating rewarded ad...');
                    console.log('Custom data:', customData);
                    
                    // Simulate ad watching delay
                    setTimeout(async () => {
                        // In dev mode, directly call the callback endpoint to simulate reward
                        try {
                            await fetch(`${API_URL}/api/admob/reward-callback?` + new URLSearchParams({
                                custom_data: encodeURIComponent(customData),
                                reward_amount: String(config.amount || REWARD_CONFIGS[config.rewardType].defaultAmount),
                                reward_item: config.rewardType,
                                transaction_id: transactionId,
                                user_id: userEmail,
                                timestamp: String(Date.now())
                            }));
                            
                            resolve({ success: true, transactionId });
                        } catch (e) {
                            resolve({ success: true, transactionId }); // Still resolve for dev
                        }
                    }, 2000);
                } else {
                    resolve({ 
                        success: false, 
                        error: 'Rewarded ads are only available in the mobile app' 
                    });
                }
                return;
            }

            // Set up response handler
            const messageHandler = (event: MessageEvent) => {
                try {
                    const data: AdMobNativeResponse = typeof event.data === 'string' 
                        ? JSON.parse(event.data) 
                        : event.data;

                    if (data.type === 'REWARDED_AD_RESULT') {
                        cleanup();
                        
                        if (data.payload.success) {
                            resolve({
                                success: true,
                                transactionId: data.payload.transactionId || transactionId
                            });
                        } else {
                            resolve({
                                success: false,
                                error: data.payload.error || 'Ad was not completed'
                            });
                        }
                    } else if (data.type === 'REWARDED_AD_FAILED') {
                        cleanup();
                        resolve({
                            success: false,
                            error: data.payload.error || 'Failed to load ad'
                        });
                    }
                } catch (e) {
                    // Not our message, ignore
                }
            };

            // Timeout handler
            const timeoutId = setTimeout(() => {
                cleanup();
                resolve({ success: false, error: 'Ad request timed out' });
            }, 60000); // 60 second timeout

            // Cleanup function
            const cleanup = () => {
                window.removeEventListener('message', messageHandler);
                clearTimeout(timeoutId);
                delete window.handleAdMobResponse;
            };

            // Listen for messages
            window.addEventListener('message', messageHandler);

            // Also set up direct callback (for some native implementations)
            window.handleAdMobResponse = (data: AdMobNativeResponse) => {
                messageHandler({ data } as MessageEvent);
            };

            // Send message to native app
            const adRequest = {
                type: 'SHOW_REWARDED_AD',
                payload: {
                    adUnitId: config.adUnitId || getAdUnitId(import.meta.env.PROD),
                    customData,
                    userId: userEmail,
                    transactionId,
                    serverSideVerification: {
                        userId: userEmail,
                        customData
                    }
                }
            };

            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify(adRequest));
            } else if (window.Capacitor?.Plugins?.AdMob) {
                // Capacitor AdMob plugin
                window.Capacitor.Plugins.AdMob.showRewardVideoAd(adRequest.payload);
            }
        });
    },

    /**
     * Verify that a reward was applied server-side
     */
    verifyReward: async (
        userEmail: string,
        transactionId: string
    ): Promise<RewardVerificationResult> => {
        try {
            const response = await fetch(`${API_URL}/api/admob/verify-reward`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: userEmail, transactionId })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            
            return {
                success: true,
                rewarded: data.rewarded || false,
                transaction: data.transaction,
                currentBalance: data.currentBalance
            };
        } catch (error) {
            console.error('Error verifying reward:', error);
            return {
                success: false,
                rewarded: false,
                error: error instanceof Error ? error.message : 'Verification failed'
            };
        }
    },

    /**
     * Poll for reward verification with retries
     */
    waitForReward: async (
        userEmail: string,
        transactionId: string,
        options: {
            maxAttempts?: number;
            intervalMs?: number;
            onProgress?: (attempt: number, maxAttempts: number) => void;
        } = {}
    ): Promise<RewardVerificationResult> => {
        const { 
            maxAttempts = 10, 
            intervalMs = 2000,
            onProgress 
        } = options;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            onProgress?.(attempt, maxAttempts);
            
            const result = await adMobService.verifyReward(userEmail, transactionId);
            
            if (result.rewarded) {
                return result;
            }
            
            if (attempt < maxAttempts) {
                await sleep(intervalMs);
            }
        }

        return {
            success: true,
            rewarded: false,
            error: 'Reward verification timed out. Please check your balance.'
        };
    },

    /**
     * Complete flow: Show ad and wait for reward
     */
    showAdAndWaitForReward: async (
        userEmail: string,
        config: AdRewardConfig,
        options: {
            onAdStarted?: () => void;
            onAdCompleted?: () => void;
            onVerifying?: (attempt: number, maxAttempts: number) => void;
            onSuccess?: (result: RewardVerificationResult) => void;
            onError?: (error: string) => void;
        } = {}
    ): Promise<RewardVerificationResult> => {
        const { onAdStarted, onAdCompleted, onVerifying, onSuccess, onError } = options;

        try {
            // Check if user can watch ads
            const canWatch = await adMobService.canWatchAd(userEmail);
            if (!canWatch.canWatch) {
                const error = `Daily ad limit reached. ${canWatch.adsRemaining} ads remaining.`;
                onError?.(error);
                return { success: false, rewarded: false, error };
            }

            onAdStarted?.();

            // Show the ad
            const adResult = await adMobService.showRewardedAd(userEmail, config);
            
            if (!adResult.success || !adResult.transactionId) {
                const error = adResult.error || 'Failed to show ad';
                onError?.(error);
                return { success: false, rewarded: false, error };
            }

            onAdCompleted?.();

            // Wait for reward verification
            const verifyResult = await adMobService.waitForReward(
                userEmail,
                adResult.transactionId,
                {
                    maxAttempts: 10,
                    intervalMs: 2000,
                    onProgress: onVerifying
                }
            );

            if (verifyResult.rewarded) {
                onSuccess?.(verifyResult);
            } else {
                onError?.(verifyResult.error || 'Reward not confirmed');
            }

            return verifyResult;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            onError?.(errorMessage);
            return { success: false, rewarded: false, error: errorMessage };
        }
    },

    /**
     * Get reward configuration
     */
    getRewardConfig: (rewardType: AdRewardType) => {
        return REWARD_CONFIGS[rewardType];
    },

    /**
     * Get all available reward types
     */
    getAvailableRewards: () => {
        return Object.entries(REWARD_CONFIGS).map(([type, config]) => ({
            type: type as AdRewardType,
            ...config
        }));
    }
};

// ============================================
// REACT HOOK
// ============================================

import { useState, useCallback } from 'react';

export interface UseRewardedAdOptions {
    userEmail: string;
    rewardType: AdRewardType;
    rewardAmount?: number;
    onSuccess?: (result: RewardVerificationResult) => void;
    onError?: (error: string) => void;
}

export interface UseRewardedAdReturn {
    showAd: () => Promise<void>;
    isLoading: boolean;
    isVerifying: boolean;
    verifyProgress: { current: number; total: number } | null;
    error: string | null;
    lastResult: RewardVerificationResult | null;
    isAvailable: boolean;
}

export const useRewardedAd = (options: UseRewardedAdOptions): UseRewardedAdReturn => {
    const { userEmail, rewardType, rewardAmount, onSuccess, onError } = options;
    
    const [isLoading, setIsLoading] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [verifyProgress, setVerifyProgress] = useState<{ current: number; total: number } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [lastResult, setLastResult] = useState<RewardVerificationResult | null>(null);

    const showAd = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setVerifyProgress(null);

        try {
            const result = await adMobService.showAdAndWaitForReward(
                userEmail,
                {
                    rewardType,
                    amount: rewardAmount || REWARD_CONFIGS[rewardType].defaultAmount
                },
                {
                    onAdStarted: () => {
                        setIsLoading(true);
                    },
                    onAdCompleted: () => {
                        setIsLoading(false);
                        setIsVerifying(true);
                    },
                    onVerifying: (current, total) => {
                        setVerifyProgress({ current, total });
                    },
                    onSuccess: (result) => {
                        setLastResult(result);
                        onSuccess?.(result);
                    },
                    onError: (err) => {
                        setError(err);
                        onError?.(err);
                    }
                }
            );

            setLastResult(result);

        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'Unknown error';
            setError(errorMessage);
            onError?.(errorMessage);
        } finally {
            setIsLoading(false);
            setIsVerifying(false);
            setVerifyProgress(null);
        }
    }, [userEmail, rewardType, rewardAmount, onSuccess, onError]);

    return {
        showAd,
        isLoading,
        isVerifying,
        verifyProgress,
        error,
        lastResult,
        isAvailable: adMobService.isAvailable()
    };
};

export default adMobService;
