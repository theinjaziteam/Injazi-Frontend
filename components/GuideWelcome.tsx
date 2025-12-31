/./components/GuideWelcome.tsx
import React, { useState, useEffect } from 'react';
import { Icons } from './UIComponents';

interface TourStep {
    target: string;
    title: string;
    description: string;
    position: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

interface GuideWelcomeProps {
    onComplete: () => void;
}

const GuideWelcome: React.FC<GuideWelcomeProps> = ({ onComplete }) => {
    const [phase, setPhase] = useState<'boxes' | 'title' | 'subtitle' | 'tour' | 'complete'>('boxes');
    const [boxesVisible, setBoxesVisible] = useState([false, false, false]);
    const [titleVisible, setTitleVisible] = useState(false);
    const [subtitleVisible, setSubtitleVisible] = useState(false);
    const [tourStep, setTourStep] = useState(0);
    const [showTour, setShowTour] = useState(false);

    const tourSteps: TourStep[] = [
        {
            target: 'planet',
            title: 'Your Journey Map',
            description: 'Watch your guidance unfold as points on this interactive planet. Drag to explore.',
            position: 'bottom'
        },
        {
            target: 'input',
            title: 'Ask Anything',
            description: 'Type your questions, challenges, or goals here. Attach images or documents for context.',
            position: 'top'
        },
        {
            target: 'header',
            title: 'Your Journeys',
            description: 'Tap here to view all your saved conversations and continue where you left off.',
            position: 'bottom'
        },
        {
            target: 'chat-toggle',
            title: 'Switch Views',
            description: 'Toggle between the planet view and traditional chat mode anytime.',
            position: 'left'
        },
        {
            target: 'agent',
            title: 'Master Agent',
            description: 'Access powerful AI automation tools for your business and goals.',
            position: 'top'
        }
    ];

    useEffect(() => {
        const box1Timer = setTimeout(() => setBoxesVisible([true, false, false]), 300);
        const box2Timer = setTimeout(() => setBoxesVisible([true, true, false]), 600);
        const box3Timer = setTimeout(() => setBoxesVisible([true, true, true]), 900);
        const titleTimer = setTimeout(() => {
            setPhase('title');
            setTitleVisible(true);
        }, 1400);
        const subtitleTimer = setTimeout(() => {
            setPhase('subtitle');
            setSubtitleVisible(true);
        }, 2000);
        const tourTimer = setTimeout(() => setPhase('tour'), 3000);

        return () => {
            clearTimeout(box1Timer);
            clearTimeout(box2Timer);
            clearTimeout(box3Timer);
            clearTimeout(titleTimer);
            clearTimeout(subtitleTimer);
            clearTimeout(tourTimer);
        };
    }, []);

    const startTour = () => {
        setShowTour(true);
        setTourStep(0);
    };

    const nextTourStep = () => {
        if (tourStep < tourSteps.length - 1) {
            setTourStep(prev => prev + 1);
        } else {
            completeTour();
        }
    };

    const completeTour = () => {
        setShowTour(false);
        setPhase('complete');
        onComplete();
    };

    const skipTour = () => {
        setShowTour(false);
        setPhase('complete');
        onComplete();
    };

    const getSpotlightStyle = (target: string): React.CSSProperties => {
        switch (target) {
            case 'planet':
                return { top: '30%', left: '50%', transform: 'translate(-50%, -50%)', width: '320px', height: '320px', borderRadius: '50%' };
            case 'input':
                return { bottom: '100px', left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: '400px', height: '60px', borderRadius: '24px' };
            case 'header':
                return { top: '12px', left: '50%', transform: 'translateX(-50%)', width: '150px', height: '50px', borderRadius: '12px' };
            case 'chat-toggle':
                return { top: '12px', right: '16px', width: '44px', height: '44px', borderRadius: '12px' };
            case 'agent':
                return { bottom: '190px', left: '50%', transform: 'translateX(-50%)', width: '180px', height: '44px', borderRadius: '40px' };
            default:
                return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '200px', height: '200px', borderRadius: '16px' };
        }
    };

    const getTooltipStyle = (target: string): React.CSSProperties => {
        const base: React.CSSProperties = { position: 'absolute', zIndex: 60, maxWidth: '280px' };
        switch (target) {
            case 'planet':
                return { ...base, top: '60%', left: '50%', transform: 'translateX(-50%)' };
            case 'input':
                return { ...base, bottom: '180px', left: '50%', transform: 'translateX(-50%)' };
            case 'header':
                return { ...base, top: '80px', left: '50%', transform: 'translateX(-50%)' };
            case 'chat-toggle':
                return { ...base, top: '70px', right: '16px' };
            case 'agent':
                return { ...base, bottom: '250px', left: '50%', transform: 'translateX(-50%)' };
            default:
                return base;
        }
    };

    const getArrowStyle = (target: string): React.CSSProperties => {
        if (target === 'input' || target === 'agent') {
            return { bottom: '-6px', left: '50%', transform: 'translateX(-50%) rotate(225deg)' };
        } else if (target === 'chat-toggle') {
            return { top: '20px', right: '-6px', transform: 'rotate(135deg)' };
        }
        return { top: '-6px', left: '50%', transform: 'translateX(-50%) rotate(45deg)' };
    };

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
            
            {/* Animated Starfield */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
                {[...Array(30)].map((_, i) => (
                    <div
                        key={i}
                        style={{
                            position: 'absolute',
                            borderRadius: '50%',
                            backgroundColor: '#ffffff',
                            width: Math.random() > 0.5 ? '4px' : '2px',
                            height: Math.random() > 0.5 ? '4px' : '2px',
                            top: `${5 + Math.random() * 90}%`,
                            left: `${5 + Math.random() * 90}%`,
                            opacity: 0.1 + Math.random() * 0.3,
                            animation: `twinkle ${2 + Math.random() * 3}s ease-in-out infinite`,
                            animationDelay: `${Math.random() * 2}s`
                        }}
                    />
                ))}
            </div>

            {/* Orbital Rings */}
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 0,
                animation: 'slowRotate 90s linear infinite'
            }}>
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '384px',
                    height: '384px',
                    borderRadius: '50%',
                    border: '1px solid rgba(100, 120, 255, 0.08)',
                    backgroundColor: '#1a1a2e',
                    opacity: 0.2,
                    boxShadow: '0 0 80px rgba(100, 120, 255, 0.08)'
                }} />
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '320px',
                    height: '320px',
                    borderRadius: '50%',
                    border: '1px solid rgba(255, 255, 255, 0.04)',
                    animation: 'pulse 5s ease-in-out infinite'
                }} />
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '256px',
                    height: '256px',
                    borderRadius: '50%',
                    border: '1px solid rgba(255, 255, 255, 0.024)',
                    animation: 'pulse 5s ease-in-out infinite',
                    animationDelay: '1.5s'
                }} />
                
                {/* Orbiting dot */}
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    animation: 'orbit 12s linear infinite'
                }}>
                    <div style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: '#ffffff',
                        transform: 'translate(-50%, -50%) translateX(160px)',
                        boxShadow: '0 0 12px rgba(255,255,255,0.6)',
                        opacity: 0.7
                    }} />
                </div>
            </div>

            {/* Sliding Glass Boxes */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none', overflow: 'hidden' }}>
                {/* Box 1 - Top Left */}
                <div style={{
                    position: 'absolute',
                    width: '288px',
                    height: '288px',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.03)',
                    background: 'rgba(255,255,255,0.03)',
                    backdropFilter: 'blur(8px)',
                    top: '12%',
                    left: '8%',
                    transform: boxesVisible[0] ? 'translate(0, 0) rotate(-12deg)' : 'translate(-120%, -120%) rotate(-30deg)',
                    opacity: boxesVisible[0] ? 1 : 0,
                    transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }} />
                
                {/* Box 2 - Top Right */}
                <div style={{
                    position: 'absolute',
                    width: '224px',
                    height: '224px',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.024)',
                    background: 'rgba(255,255,255,0.025)',
                    backdropFilter: 'blur(8px)',
                    top: '18%',
                    right: '12%',
                    transform: boxesVisible[1] ? 'translate(0, 0) rotate(8deg)' : 'translate(120%, -120%) rotate(25deg)',
                    opacity: boxesVisible[1] ? 1 : 0,
                    transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }} />
                
                {/* Box 3 - Bottom Left */}
                <div style={{
                    position: 'absolute',
                    width: '256px',
                    height: '192px',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.02)',
                    background: 'rgba(255,255,255,0.02)',
                    backdropFilter: 'blur(8px)',
                    bottom: '15%',
                    left: '15%',
                    transform: boxesVisible[2] ? 'translate(0, 0) rotate(5deg)' : 'translate(-50%, 150%) rotate(15deg)',
                    opacity: boxesVisible[2] ? 1 : 0,
                    transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }} />
            </div>

            {/* Main Content Card */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.07)',
                padding: '40px 48px',
                position: 'relative',
                zIndex: 20,
                maxWidth: '420px',
                margin: '0 16px',
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(24px)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 0 60px rgba(100, 120, 255, 0.04)',
                opacity: boxesVisible[2] ? 1 : 0,
                transform: boxesVisible[2] ? 'scale(1)' : 'scale(0.95)',
                transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                transitionDelay: '0.3s'
            }}>
                {/* Glowing accent line */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    height: '1px',
                    width: '128px',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                    opacity: titleVisible ? 1 : 0,
                    transition: 'opacity 0.8s ease'
                }} />

                {/* Icon */}
                <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '8px',
                    opacity: titleVisible ? 1 : 0,
                    transform: titleVisible ? 'scale(1)' : 'scale(0.8)',
                    transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                }}>
                    <Icons.Zap style={{ width: 28, height: 28, color: 'rgba(255,255,255,0.7)' }} />
                </div>

                {/* Title */}
                <h1 style={{
                    fontSize: '36px',
                    fontWeight: 500,
                    color: '#ffffff',
                    textAlign: 'center',
                    letterSpacing: '-0.02em',
                    margin: 0,
                    opacity: titleVisible ? 0.95 : 0,
                    transform: titleVisible ? 'translateY(0)' : 'translateY(20px)',
                    transition: 'all 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
                    textShadow: '0 0 40px rgba(255,255,255,0.1)'
                }}>
                    Welcome to The Guide
                </h1>

                {/* Subtitle */}
                <p style={{
                    fontSize: '18px',
                    fontWeight: 400,
                    color: '#ffffff',
                    textAlign: 'center',
                    letterSpacing: '-0.01em',
                    margin: 0,
                    maxWidth: '280px',
                    opacity: subtitleVisible ? 0.5 : 0,
                    transform: subtitleVisible ? 'translateY(0)' : 'translateY(15px)',
                    transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                }}>
                    Your Journey Begins Here
                </p>

                {/* Action Buttons */}
                <div style={{
                    display: 'flex',
                    gap: '12px',
                    marginTop: '24px',
                    opacity: phase === 'tour' || phase === 'complete' ? 1 : 0,
                    transform: phase === 'tour' || phase === 'complete' ? 'translateY(0)' : 'translateY(10px)',
                    transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                    transitionDelay: '0.2s'
                }}>
                    <button
                        onClick={skipTour}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '40px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: 'transparent',
                            color: '#ffffff',
                            fontSize: '14px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            opacity: 0.6,
                            transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                        }}
                    >
                        Skip Tour
                    </button>
                    <button
                        onClick={startTour}
                        style={{
                            padding: '10px 24px',
                            borderRadius: '40px',
                            border: 'none',
                            background: 'rgba(255,255,255,0.9)',
                            color: '#000000',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow: '0 0 24px rgba(255,255,255,0.2)',
                            transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                    >
                        Take the Tour
                    </button>
                </div>
            </div>

            {/* Guided Tour Overlay */}
            {showTour && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
                    {/* Dark overlay */}
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.85)',
                        backdropFilter: 'blur(4px)',
                        transition: 'all 0.5s ease'
                    }} />
                    
                    {/* Spotlight */}
                    <div style={{
                        position: 'absolute',
                        border: '2px solid rgba(255,255,255,0.3)',
                        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.85), 0 0 30px rgba(255,255,255,0.1), inset 0 0 30px rgba(255,255,255,0.05)',
                        background: 'transparent',
                        transition: 'all 0.5s ease-out',
                        ...getSpotlightStyle(tourSteps[tourStep].target)
                    }}>
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: 'inherit',
                            animation: 'spotlightPulse 2s ease-in-out infinite'
                        }} />
                    </div>

                    {/* Tooltip */}
                    <div style={{
                        transition: 'all 0.5s ease-out',
                        ...getTooltipStyle(tourSteps[tourStep].target)
                    }}>
                        <div style={{
                            borderRadius: '16px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            padding: '20px',
                            background: 'rgba(20, 20, 30, 0.95)',
                            backdropFilter: 'blur(20px)',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)'
                        }}>
                            {/* Progress dots */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    {tourSteps.map((_, index) => (
                                        <div
                                            key={index}
                                            style={{
                                                height: '4px',
                                                borderRadius: '2px',
                                                width: index === tourStep ? '16px' : '6px',
                                                backgroundColor: index === tourStep 
                                                    ? 'rgba(255,255,255,0.9)' 
                                                    : index < tourStep 
                                                        ? 'rgba(255,255,255,0.4)'
                                                        : 'rgba(255,255,255,0.15)',
                                                transition: 'all 0.3s ease'
                                            }}
                                        />
                                    ))}
                                </div>
                                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginLeft: 'auto' }}>
                                    {tourStep + 1} / {tourSteps.length}
                                </span>
                            </div>

                            {/* Content */}
                            <h3 style={{
                                color: '#ffffff',
                                fontWeight: 600,
                                fontSize: '16px',
                                margin: '0 0 8px 0',
                                opacity: 0.95
                            }}>
                                {tourSteps[tourStep].title}
                            </h3>
                            <p style={{
                                color: '#ffffff',
                                fontSize: '14px',
                                lineHeight: 1.5,
                                margin: '0 0 16px 0',
                                opacity: 0.6
                            }}>
                                {tourSteps[tourStep].description}
                            </p>

                            {/* Buttons */}
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={skipTour}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: '40px',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        background: 'transparent',
                                        color: '#ffffff',
                                        fontSize: '12px',
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                        opacity: 0.5
                                    }}
                                >
                                    Skip
                                </button>
                                <button
                                    onClick={nextTourStep}
                                    style={{
                                        padding: '8px 20px',
                                        borderRadius: '40px',
                                        border: 'none',
                                        background: 'rgba(255,255,255,0.9)',
                                        color: '#000000',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        marginLeft: 'auto',
                                        boxShadow: '0 0 16px rgba(255,255,255,0.15)'
                                    }}
                                >
                                    {tourStep === tourSteps.length - 1 ? "Get Started" : "Next"}
                                </button>
                            </div>
                        </div>

                        {/* Arrow */}
                        <div style={{
                            position: 'absolute',
                            width: '12px',
                            height: '12px',
                            background: 'rgba(20, 20, 30, 0.95)',
                            borderLeft: '1px solid rgba(255,255,255,0.1)',
                            borderTop: '1px solid rgba(255,255,255,0.1)',
                            ...getArrowStyle(tourSteps[tourStep].target)
                        }} />
                    </div>
                </div>
            )}

            {/* CSS Keyframes */}
            <style>{`
                @keyframes twinkle {
                    0%, 100% { opacity: 0.15; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.2); }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                    50% { opacity: 0.6; transform: translate(-50%, -50%) scale(1.03); }
                }
                @keyframes slowRotate {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes orbit {
                    from { transform: translate(-50%, -50%) rotate(0deg); }
                    to { transform: translate(-50%, -50%) rotate(360deg); }
                }
                @keyframes spotlightPulse {
                    0%, 100% { transform: scale(1); opacity: 0.5; }
                    50% { transform: scale(1.05); opacity: 0.2; }
                }
            `}</style>
        </div>
    );
};

export default GuideWelcome;
