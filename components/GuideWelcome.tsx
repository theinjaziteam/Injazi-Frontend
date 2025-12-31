import React, { useState, useEffect, useMemo, useCallback } from 'react';

interface TourStep {
    target: string;
    title: string;
    description: string;
}

interface GuideWelcomeProps {
    onComplete: () => void;
    onStartTour: () => void;
    showTourOverlay: boolean;
    tourStep: number;
    onNextStep: () => void;
    onPrevStep: () => void;
    onSkipTour: () => void;
    totalSteps: number;
}

// Separate intro component for the initial welcome screen
export const WelcomeIntro: React.FC<{ onStartTour: () => void; onSkip: () => void }> = React.memo(({ onStartTour, onSkip }) => {
    const [boxesVisible, setBoxesVisible] = useState([false, false, false]);
    const [contentVisible, setContentVisible] = useState(false);
    const [buttonsVisible, setButtonsVisible] = useState(false);

    // Generate stars once
    const stars = useMemo(() => 
        Array.from({ length: 35 }, (_, i) => ({
            id: i,
            size: 2 + Math.random() * 2,
            top: Math.random() * 100,
            left: Math.random() * 100,
            opacity: 0.15 + Math.random() * 0.35,
            duration: 2 + Math.random() * 2,
            delay: Math.random() * 2
        })), []
    );

    useEffect(() => {
        const t1 = setTimeout(() => setBoxesVisible([true, false, false]), 200);
        const t2 = setTimeout(() => setBoxesVisible([true, true, false]), 500);
        const t3 = setTimeout(() => setBoxesVisible([true, true, true]), 800);
        const t4 = setTimeout(() => setContentVisible(true), 1200);
        const t5 = setTimeout(() => setButtonsVisible(true), 1800);
        return () => [t1, t2, t3, t4, t5].forEach(clearTimeout);
    }, []);

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#000',
            zIndex: 200,
            overflow: 'hidden'
        }}>
            {/* Stars */}
            <div style={{ position: 'absolute', inset: 0 }}>
                {stars.map(star => (
                    <div
                        key={star.id}
                        style={{
                            position: 'absolute',
                            width: star.size,
                            height: star.size,
                            borderRadius: '50%',
                            backgroundColor: '#fff',
                            top: `${star.top}%`,
                            left: `${star.left}%`,
                            opacity: star.opacity,
                            animation: `twinkle ${star.duration}s ease-in-out infinite ${star.delay}s`
                        }}
                    />
                ))}
            </div>

            {/* Orbital glow */}
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 400,
                height: 400,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(100,120,255,0.08) 0%, transparent 70%)',
                animation: 'pulse 4s ease-in-out infinite'
            }} />

            {/* Glass boxes */}
            <div style={{
                position: 'absolute',
                width: 260,
                height: 260,
                borderRadius: 20,
                border: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(255,255,255,0.02)',
                backdropFilter: 'blur(12px)',
                top: '10%',
                left: '5%',
                opacity: boxesVisible[0] ? 1 : 0,
                transform: boxesVisible[0] ? 'rotate(-8deg)' : 'translate(-100%, -100%) rotate(-20deg) scale(0.8)',
                transition: 'all 0.9s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }} />
            <div style={{
                position: 'absolute',
                width: 200,
                height: 200,
                borderRadius: 20,
                border: '1px solid rgba(255,255,255,0.05)',
                background: 'rgba(255,255,255,0.015)',
                backdropFilter: 'blur(12px)',
                top: '15%',
                right: '8%',
                opacity: boxesVisible[1] ? 1 : 0,
                transform: boxesVisible[1] ? 'rotate(6deg)' : 'translate(100%, -100%) rotate(15deg) scale(0.8)',
                transition: 'all 0.9s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }} />
            <div style={{
                position: 'absolute',
                width: 220,
                height: 160,
                borderRadius: 20,
                border: '1px solid rgba(255,255,255,0.04)',
                background: 'rgba(255,255,255,0.01)',
                backdropFilter: 'blur(12px)',
                bottom: '12%',
                left: '12%',
                opacity: boxesVisible[2] ? 1 : 0,
                transform: boxesVisible[2] ? 'rotate(4deg)' : 'translateY(150%) rotate(10deg) scale(0.8)',
                transition: 'all 0.9s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }} />

            {/* Content card */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '48px 40px',
                borderRadius: 24,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.03)',
                backdropFilter: 'blur(30px)',
                boxShadow: '0 0 80px rgba(100,120,255,0.06), inset 0 1px 0 rgba(255,255,255,0.1)',
                maxWidth: 380,
                margin: '0 20px',
                position: 'relative',
                zIndex: 10,
                opacity: contentVisible ? 1 : 0,
                transform: contentVisible ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.95)',
                transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
            }}>
                {/* Accent line */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 100,
                    height: 1,
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                    opacity: contentVisible ? 1 : 0,
                    transition: 'opacity 1s ease 0.3s'
                }} />

                <h1 style={{
                    fontSize: 42,
                    fontWeight: 500,
                    color: '#fff',
                    textAlign: 'center',
                    letterSpacing: '-0.03em',
                    margin: '0 0 12px',
                    opacity: 0.95,
                    textShadow: '0 0 60px rgba(255,255,255,0.15)'
                }}>
                    Welcome to The Guide
                </h1>

                <p style={{
                    fontSize: 18,
                    color: 'rgba(255,255,255,0.5)',
                    textAlign: 'center',
                    margin: '0 0 32px',
                    letterSpacing: '-0.01em'
                }}>
                    Your Journey Begins Here
                </p>

                <div style={{
                    display: 'flex',
                    gap: 12,
                    opacity: buttonsVisible ? 1 : 0,
                    transform: buttonsVisible ? 'translateY(0)' : 'translateY(15px)',
                    transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                }}>
                    <button
                        onClick={onSkip}
                        style={{
                            padding: '12px 24px',
                            borderRadius: 50,
                            border: '1px solid rgba(255,255,255,0.12)',
                            background: 'transparent',
                            color: 'rgba(255,255,255,0.6)',
                            fontSize: 14,
                            fontWeight: 500,
                            cursor: 'pointer'
                        }}
                    >
                        Skip
                    </button>
                    <button
                        onClick={onStartTour}
                        style={{
                            padding: '12px 28px',
                            borderRadius: 50,
                            border: 'none',
                            background: '#fff',
                            color: '#000',
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow: '0 0 30px rgba(255,255,255,0.25)'
                        }}
                    >
                        Take the Tour
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes twinkle {
                    0%, 100% { opacity: 0.15; transform: scale(1); }
                    50% { opacity: 0.6; transform: scale(1.3); }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 0.6; transform: translate(-50%, -50%) scale(1); }
                    50% { opacity: 0.3; transform: translate(-50%, -50%) scale(1.05); }
                }
            `}</style>
        </div>
    );
});

// Tour overlay that highlights actual UI elements
export const TourOverlay: React.FC<{
    step: number;
    totalSteps: number;
    onNext: () => void;
    onPrev: () => void;
    onSkip: () => void;
}> = React.memo(({ step, totalSteps, onNext, onPrev, onSkip }) => {
    
    const tourSteps: TourStep[] = useMemo(() => [
        { target: 'planet', title: 'Your Journey Map', description: 'Watch your guidance unfold as points on this interactive planet. Drag to explore.' },
        { target: 'input', title: 'Ask Anything', description: 'Type your questions, challenges, or goals here. Attach images or documents for context.' },
        { target: 'header', title: 'Your Journeys', description: 'Tap here to view all your saved conversations and continue where you left off.' },
        { target: 'chat-toggle', title: 'Switch Views', description: 'Toggle between the planet view and traditional chat mode anytime.' },
        { target: 'agent', title: 'Master Agent', description: 'Access powerful AI automation tools for your business and goals.' }
    ], []);

    const currentStep = tourSteps[step];

    const spotlightStyle = useMemo((): React.CSSProperties => {
        const base: React.CSSProperties = {
            position: 'absolute',
            border: '2px solid rgba(255,255,255,0.4)',
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.88), 0 0 40px rgba(255,255,255,0.15)',
            background: 'transparent',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            zIndex: 201
        };
        switch (currentStep?.target) {
            case 'planet': return { ...base, top: '35%', left: '50%', transform: 'translate(-50%, -50%)', width: 280, height: 280, borderRadius: '50%' };
            case 'input': return { ...base, bottom: 100, left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 40px)', maxWidth: 400, height: 56, borderRadius: 28 };
            case 'header': return { ...base, top: 8, left: '50%', transform: 'translateX(-50%)', width: 140, height: 48, borderRadius: 12 };
            case 'chat-toggle': return { ...base, top: 12, right: 12, left: 'auto', transform: 'none', width: 40, height: 40, borderRadius: 10 };
            case 'agent': return { ...base, bottom: 185, left: '50%', transform: 'translateX(-50%)', width: 170, height: 42, borderRadius: 21 };
            default: return base;
        }
    }, [currentStep?.target]);

    const tooltipStyle = useMemo((): React.CSSProperties => {
        const base: React.CSSProperties = { position: 'absolute', zIndex: 202, width: 280 };
        switch (currentStep?.target) {
            case 'planet': return { ...base, top: '62%', left: '50%', transform: 'translateX(-50%)' };
            case 'input': return { ...base, bottom: 175, left: '50%', transform: 'translateX(-50%)' };
            case 'header': return { ...base, top: 70, left: '50%', transform: 'translateX(-50%)' };
            case 'chat-toggle': return { ...base, top: 65, right: 8, left: 'auto', transform: 'none' };
            case 'agent': return { ...base, bottom: 245, left: '50%', transform: 'translateX(-50%)' };
            default: return base;
        }
    }, [currentStep?.target]);

    if (!currentStep) return null;

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, pointerEvents: 'auto' }}>
            {/* Backdrop */}
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(2px)', zIndex: 200 }} />
            
            {/* Spotlight */}
            <div style={spotlightStyle}>
                <div style={{
                    position: 'absolute',
                    inset: -4,
                    borderRadius: 'inherit',
                    border: '2px solid rgba(255,255,255,0.2)',
                    animation: 'spotlightPulse 2s ease-in-out infinite'
                }} />
            </div>

            {/* Tooltip */}
            <div style={tooltipStyle}>
                <div style={{
                    background: 'rgba(15,15,25,0.98)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: 16,
                    border: '1px solid rgba(255,255,255,0.1)',
                    padding: 20,
                    boxShadow: '0 12px 40px rgba(0,0,0,0.5)'
                }}>
                    {/* Progress */}
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
                        <div style={{ display: 'flex', gap: 5 }}>
                            {Array.from({ length: totalSteps }, (_, i) => (
                                <div key={i} style={{
                                    width: i === step ? 20 : 8,
                                    height: 4,
                                    borderRadius: 2,
                                    background: i === step ? '#fff' : i < step ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)',
                                    transition: 'all 0.3s ease'
                                }} />
                            ))}
                        </div>
                        <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                            {step + 1}/{totalSteps}
                        </span>
                    </div>

                    <h3 style={{ color: '#fff', fontSize: 17, fontWeight: 600, margin: '0 0 8px' }}>
                        {currentStep.title}
                    </h3>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 1.5, margin: '0 0 18px' }}>
                        {currentStep.description}
                    </p>

                    <div style={{ display: 'flex', gap: 10 }}>
                        {step > 0 && (
                            <button onClick={onPrev} style={{
                                padding: '10px 18px',
                                borderRadius: 50,
                                border: '1px solid rgba(255,255,255,0.15)',
                                background: 'transparent',
                                color: 'rgba(255,255,255,0.7)',
                                fontSize: 13,
                                fontWeight: 500,
                                cursor: 'pointer'
                            }}>
                                Back
                            </button>
                        )}
                        <button onClick={onSkip} style={{
                            padding: '10px 18px',
                            borderRadius: 50,
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: 'transparent',
                            color: 'rgba(255,255,255,0.4)',
                            fontSize: 13,
                            fontWeight: 500,
                            cursor: 'pointer',
                            marginLeft: step === 0 ? 0 : 'auto'
                        }}>
                            Skip
                        </button>
                        <button onClick={onNext} style={{
                            padding: '10px 22px',
                            borderRadius: 50,
                            border: 'none',
                            background: '#fff',
                            color: '#000',
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer',
                            marginLeft: 'auto',
                            boxShadow: '0 0 20px rgba(255,255,255,0.2)'
                        }}>
                            {step === totalSteps - 1 ? 'Get Started' : 'Next'}
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes spotlightPulse {
                    0%, 100% { transform: scale(1); opacity: 0.6; }
                    50% { transform: scale(1.02); opacity: 0.3; }
                }
            `}</style>
        </div>
    );
});

WelcomeIntro.displayName = 'WelcomeIntro';
TourOverlay.displayName = 'TourOverlay';
