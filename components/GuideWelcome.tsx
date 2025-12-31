// components/GuideWelcome.tsx
import React, { useState, useEffect } from 'react';

interface TourStep {
    target: string;
    title: string;
    description: string;
}

interface GuideWelcomeProps {
    onComplete: () => void;
}

const GuideWelcome: React.FC<GuideWelcomeProps> = ({ onComplete }) => {
    const [phase, setPhase] = useState<'intro' | 'tour' | 'complete'>('intro');
    const [tourStep, setTourStep] = useState(0);
    const [boxesVisible, setBoxesVisible] = useState([false, false, false]);
    const [contentVisible, setContentVisible] = useState(false);
    const [buttonsVisible, setButtonsVisible] = useState(false);

    const tourSteps: TourStep[] = [
        {
            target: 'planet',
            title: 'Your Journey Map',
            description: 'Watch your guidance unfold as points on this interactive planet. Drag to explore.'
        },
        {
            target: 'input',
            title: 'Ask Anything',
            description: 'Type your questions, challenges, or goals here. Attach images or documents for context.'
        },
        {
            target: 'header',
            title: 'Your Journeys',
            description: 'Tap here to view all your saved conversations and continue where you left off.'
        },
        {
            target: 'chat-toggle',
            title: 'Switch Views',
            description: 'Toggle between the planet view and traditional chat mode anytime.'
        },
        {
            target: 'agent',
            title: 'Master Agent',
            description: 'Access powerful AI automation tools for your business and goals.'
        }
    ];

    // Staggered animation sequence
    useEffect(() => {
        const timers: NodeJS.Timeout[] = [];
        
        // Box 1 slides in from top-left
        timers.push(setTimeout(() => setBoxesVisible([true, false, false]), 200));
        // Box 2 slides in from top-right
        timers.push(setTimeout(() => setBoxesVisible([true, true, false]), 500));
        // Box 3 slides in from bottom
        timers.push(setTimeout(() => setBoxesVisible([true, true, true]), 800));
        // Content fades in
        timers.push(setTimeout(() => setContentVisible(true), 1200));
        // Buttons fade in
        timers.push(setTimeout(() => setButtonsVisible(true), 1800));

        return () => timers.forEach(t => clearTimeout(t));
    }, []);

    const startTour = () => {
        setPhase('tour');
        setTourStep(0);
    };

    const nextTourStep = () => {
        if (tourStep < tourSteps.length - 1) {
            setTourStep(prev => prev + 1);
        } else {
            completeTour();
        }
    };

    const prevTourStep = () => {
        if (tourStep > 0) {
            setTourStep(prev => prev - 1);
        }
    };

    const completeTour = () => {
        setPhase('complete');
        onComplete();
    };

    const skipAll = () => {
        setPhase('complete');
        onComplete();
    };

    const getSpotlightStyle = (target: string): React.CSSProperties => {
        const base: React.CSSProperties = {
            position: 'absolute',
            border: '2px solid rgba(255,255,255,0.4)',
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.88), 0 0 40px rgba(255,255,255,0.15), inset 0 0 30px rgba(255,255,255,0.05)',
            background: 'transparent',
            transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            zIndex: 51
        };

        switch (target) {
            case 'planet':
                return { ...base, top: '35%', left: '50%', transform: 'translate(-50%, -50%)', width: '280px', height: '280px', borderRadius: '50%' };
            case 'input':
                return { ...base, bottom: '100px', left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 40px)', maxWidth: '400px', height: '56px', borderRadius: '28px' };
            case 'header':
                return { ...base, top: '8px', left: '50%', transform: 'translateX(-50%)', width: '140px', height: '48px', borderRadius: '12px' };
            case 'chat-toggle':
                return { ...base, top: '12px', right: '12px', left: 'auto', transform: 'none', width: '40px', height: '40px', borderRadius: '10px' };
            case 'agent':
                return { ...base, bottom: '185px', left: '50%', transform: 'translateX(-50%)', width: '170px', height: '42px', borderRadius: '21px' };
            default:
                return base;
        }
    };

    const getTooltipPosition = (target: string): React.CSSProperties => {
        const base: React.CSSProperties = {
            position: 'absolute',
            zIndex: 52,
            width: '280px'
        };

        switch (target) {
            case 'planet':
                return { ...base, top: '62%', left: '50%', transform: 'translateX(-50%)' };
            case 'input':
                return { ...base, bottom: '175px', left: '50%', transform: 'translateX(-50%)' };
            case 'header':
                return { ...base, top: '70px', left: '50%', transform: 'translateX(-50%)' };
            case 'chat-toggle':
                return { ...base, top: '65px', right: '8px', left: 'auto', transform: 'none' };
            case 'agent':
                return { ...base, bottom: '245px', left: '50%', transform: 'translateX(-50%)' };
            default:
                return base;
        }
    };

    // INTRO PHASE - Animated boxes with welcome text
    if (phase === 'intro') {
        return (
            <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                backgroundColor: '#000000',
                zIndex: 100
            }}>
                {/* Starfield Background */}
                <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
                    {Array.from({ length: 40 }, (_, i) => {
                        const size = 2 + Math.random() * 2;
                        const top = Math.random() * 100;
                        const left = Math.random() * 100;
                        const delay = Math.random() * 3;
                        const duration = 2 + Math.random() * 2;
                        return (
                            <div
                                key={i}
                                style={{
                                    position: 'absolute',
                                    width: `${size}px`,
                                    height: `${size}px`,
                                    borderRadius: '50%',
                                    backgroundColor: '#fff',
                                    top: `${top}%`,
                                    left: `${left}%`,
                                    opacity: 0.15 + Math.random() * 0.35,
                                    animation: `twinkle ${duration}s ease-in-out infinite`,
                                    animationDelay: `${delay}s`
                                }}
                            />
                        );
                    })}
                </div>

                {/* Orbital Glow */}
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '400px',
                    height: '400px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(100,120,255,0.08) 0%, transparent 70%)',
                    animation: 'pulse 4s ease-in-out infinite',
                    zIndex: 0
                }} />

                {/* Animated Glass Boxes */}
                {/* Box 1 - Top Left - slides from top-left corner */}
                <div style={{
                    position: 'absolute',
                    width: '260px',
                    height: '260px',
                    borderRadius: '20px',
                    border: '1px solid rgba(255,255,255,0.06)',
                    background: 'rgba(255,255,255,0.02)',
                    backdropFilter: 'blur(12px)',
                    top: '10%',
                    left: '5%',
                    opacity: boxesVisible[0] ? 1 : 0,
                    transform: boxesVisible[0] 
                        ? 'translate(0, 0) rotate(-8deg) scale(1)' 
                        : 'translate(-100%, -100%) rotate(-20deg) scale(0.8)',
                    transition: 'all 0.9s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    zIndex: 1
                }} />

                {/* Box 2 - Top Right - slides from top-right corner */}
                <div style={{
                    position: 'absolute',
                    width: '200px',
                    height: '200px',
                    borderRadius: '20px',
                    border: '1px solid rgba(255,255,255,0.05)',
                    background: 'rgba(255,255,255,0.015)',
                    backdropFilter: 'blur(12px)',
                    top: '15%',
                    right: '8%',
                    opacity: boxesVisible[1] ? 1 : 0,
                    transform: boxesVisible[1] 
                        ? 'translate(0, 0) rotate(6deg) scale(1)' 
                        : 'translate(100%, -100%) rotate(15deg) scale(0.8)',
                    transition: 'all 0.9s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    zIndex: 1
                }} />

                {/* Box 3 - Bottom - slides from bottom */}
                <div style={{
                    position: 'absolute',
                    width: '220px',
                    height: '160px',
                    borderRadius: '20px',
                    border: '1px solid rgba(255,255,255,0.04)',
                    background: 'rgba(255,255,255,0.01)',
                    backdropFilter: 'blur(12px)',
                    bottom: '12%',
                    left: '12%',
                    opacity: boxesVisible[2] ? 1 : 0,
                    transform: boxesVisible[2] 
                        ? 'translate(0, 0) rotate(4deg) scale(1)' 
                        : 'translate(0, 150%) rotate(10deg) scale(0.8)',
                    transition: 'all 0.9s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    zIndex: 1
                }} />

                {/* Center Content Card */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '48px 40px',
                    borderRadius: '24px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.03)',
                    backdropFilter: 'blur(30px)',
                    boxShadow: '0 0 80px rgba(100, 120, 255, 0.06), inset 0 1px 0 rgba(255,255,255,0.1)',
                    maxWidth: '380px',
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
                        width: '100px',
                        height: '1px',
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                        opacity: contentVisible ? 1 : 0,
                        transition: 'opacity 1s ease 0.3s'
                    }} />

                    {/* Title */}
                    <h1 style={{
                        fontSize: '42px',
                        fontWeight: 500,
                        color: '#ffffff',
                        textAlign: 'center',
                        letterSpacing: '-0.03em',
                        margin: '0 0 12px 0',
                        opacity: 0.95,
                        textShadow: '0 0 60px rgba(255,255,255,0.15)'
                    }}>
                        Welcome to The Guide
                    </h1>

                    {/* Subtitle */}
                    <p style={{
                        fontSize: '18px',
                        fontWeight: 400,
                        color: 'rgba(255,255,255,0.5)',
                        textAlign: 'center',
                        margin: '0 0 32px 0',
                        letterSpacing: '-0.01em'
                    }}>
                        Your Journey Begins Here
                    </p>

                    {/* Buttons */}
                    <div style={{
                        display: 'flex',
                        gap: '12px',
                        opacity: buttonsVisible ? 1 : 0,
                        transform: buttonsVisible ? 'translateY(0)' : 'translateY(15px)',
                        transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}>
                        <button
                            onClick={skipAll}
                            style={{
                                padding: '12px 24px',
                                borderRadius: '50px',
                                border: '1px solid rgba(255,255,255,0.12)',
                                background: 'transparent',
                                color: 'rgba(255,255,255,0.6)',
                                fontSize: '14px',
                                fontWeight: 500,
                                cursor: 'pointer',
                                transition: 'all 0.25s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                            }}
                        >
                            Skip
                        </button>
                        <button
                            onClick={startTour}
                            style={{
                                padding: '12px 28px',
                                borderRadius: '50px',
                                border: 'none',
                                background: '#ffffff',
                                color: '#000000',
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                boxShadow: '0 0 30px rgba(255,255,255,0.25)',
                                transition: 'all 0.25s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'scale(1.03)';
                                e.currentTarget.style.boxShadow = '0 0 40px rgba(255,255,255,0.35)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1)';
                                e.currentTarget.style.boxShadow = '0 0 30px rgba(255,255,255,0.25)';
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
    }

    // TOUR PHASE - Overlay on actual ChatView
    if (phase === 'tour') {
        return (
            <div style={{ position: 'fixed', inset: 0, zIndex: 100, pointerEvents: 'auto' }}>
                {/* Dark backdrop */}
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.88)',
                    backdropFilter: 'blur(2px)',
                    zIndex: 50
                }} />

                {/* Spotlight cutout */}
                <div style={getSpotlightStyle(tourSteps[tourStep].target)}>
                    {/* Pulsing border */}
                    <div style={{
                        position: 'absolute',
                        inset: '-4px',
                        borderRadius: 'inherit',
                        border: '2px solid rgba(255,255,255,0.2)',
                        animation: 'spotlightPulse 2s ease-in-out infinite'
                    }} />
                </div>

                {/* Tooltip */}
                <div style={getTooltipPosition(tourSteps[tourStep].target)}>
                    <div style={{
                        background: 'rgba(15, 15, 25, 0.98)',
                        backdropFilter: 'blur(20px)',
                        borderRadius: '16px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        padding: '20px',
                        boxShadow: '0 12px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)'
                    }}>
                        {/* Progress */}
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '14px' }}>
                            <div style={{ display: 'flex', gap: '5px' }}>
                                {tourSteps.map((_, i) => (
                                    <div
                                        key={i}
                                        style={{
                                            width: i === tourStep ? '20px' : '8px',
                                            height: '4px',
                                            borderRadius: '2px',
                                            background: i === tourStep 
                                                ? '#ffffff' 
                                                : i < tourStep 
                                                    ? 'rgba(255,255,255,0.5)' 
                                                    : 'rgba(255,255,255,0.15)',
                                            transition: 'all 0.3s ease'
                                        }}
                                    />
                                ))}
                            </div>
                            <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
                                {tourStep + 1}/{tourSteps.length}
                            </span>
                        </div>

                        {/* Content */}
                        <h3 style={{
                            color: '#ffffff',
                            fontSize: '17px',
                            fontWeight: 600,
                            margin: '0 0 8px 0'
                        }}>
                            {tourSteps[tourStep].title}
                        </h3>
                        <p style={{
                            color: 'rgba(255,255,255,0.6)',
                            fontSize: '14px',
                            lineHeight: 1.5,
                            margin: '0 0 18px 0'
                        }}>
                            {tourSteps[tourStep].description}
                        </p>

                        {/* Navigation */}
                        <div style={{ display: 'flex', gap: '10px' }}>
                            {tourStep > 0 && (
                                <button
                                    onClick={prevTourStep}
                                    style={{
                                        padding: '10px 18px',
                                        borderRadius: '50px',
                                        border: '1px solid rgba(255,255,255,0.15)',
                                        background: 'transparent',
                                        color: 'rgba(255,255,255,0.7)',
                                        fontSize: '13px',
                                        fontWeight: 500,
                                        cursor: 'pointer'
                                    }}
                                >
                                    Back
                                </button>
                            )}
                            <button
                                onClick={skipAll}
                                style={{
                                    padding: '10px 18px',
                                    borderRadius: '50px',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    background: 'transparent',
                                    color: 'rgba(255,255,255,0.4)',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    marginLeft: tourStep === 0 ? '0' : 'auto'
                                }}
                            >
                                Skip
                            </button>
                            <button
                                onClick={nextTourStep}
                                style={{
                                    padding: '10px 22px',
                                    borderRadius: '50px',
                                    border: 'none',
                                    background: '#ffffff',
                                    color: '#000000',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    marginLeft: 'auto',
                                    boxShadow: '0 0 20px rgba(255,255,255,0.2)'
                                }}
                            >
                                {tourStep === tourSteps.length - 1 ? 'Get Started' : 'Next'}
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
    }

    // COMPLETE - Return null, let ChatView render
    return null;
};

export default GuideWelcome;
