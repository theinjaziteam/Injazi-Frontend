import React, { useState, useEffect, memo } from 'react';

interface TourStep {
  target: string;
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

const TOUR_STEPS: TourStep[] = [
  { target: 'planet', title: 'Your Journey Map', description: 'Watch your guidance unfold as points on this interactive planet. Drag to explore.', position: 'bottom' },
  { target: 'input', title: 'Ask Anything', description: 'Type your questions, challenges, or goals here. Attach images or documents for context.', position: 'top' },
  { target: 'header', title: 'Your Journeys', description: 'Tap here to view all your saved conversations and continue where you left off.', position: 'bottom' },
  { target: 'chat-toggle', title: 'Switch Views', description: 'Toggle between the planet view and traditional chat mode anytime.', position: 'left' },
  { target: 'agent', title: 'Master Agent', description: 'Access powerful AI automation tools for your business and goals.', position: 'top' },
];

export const WelcomeIntro = memo(({ onStartTour, onSkip }: { onStartTour: () => void; onSkip: () => void }) => {
  const [boxesVisible, setBoxesVisible] = useState([false, false, false]);
  const [textVisible, setTextVisible] = useState(false);
  const [subtitleVisible, setSubtitleVisible] = useState(false);
  const [buttonsVisible, setButtonsVisible] = useState(false);

  useEffect(() => {
    const timers = [
      setTimeout(() => setBoxesVisible([true, false, false]), 300),
      setTimeout(() => setBoxesVisible([true, true, false]), 600),
      setTimeout(() => setBoxesVisible([true, true, true]), 900),
      setTimeout(() => setTextVisible(true), 1200),
      setTimeout(() => setSubtitleVisible(true), 1600),
      setTimeout(() => setButtonsVisible(true), 2000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
    }}>
      {/* Starfield background */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: Math.random() * 2 + 1,
              height: Math.random() * 2 + 1,
              background: '#fff',
              borderRadius: '50%',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.5 + 0.2,
              animation: `twinkle ${2 + Math.random() * 3}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Animated glass boxes */}
      <div style={{
        position: 'absolute',
        top: '12%',
        left: '8%',
        width: 140,
        height: 140,
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20,
        transform: boxesVisible[0] ? 'translateX(0) rotate(12deg)' : 'translateX(-150px) rotate(12deg)',
        opacity: boxesVisible[0] ? 1 : 0,
        transition: 'all 1s cubic-bezier(0.34, 1.56, 0.64, 1)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
      }} />
      <div style={{
        position: 'absolute',
        top: '20%',
        right: '12%',
        width: 100,
        height: 100,
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 16,
        transform: boxesVisible[1] ? 'translateY(0) rotate(-8deg)' : 'translateY(-120px) rotate(-8deg)',
        opacity: boxesVisible[1] ? 1 : 0,
        transition: 'all 1s cubic-bezier(0.34, 1.56, 0.64, 1)',
        transitionDelay: '0.1s',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '18%',
        left: '15%',
        width: 120,
        height: 120,
        background: 'rgba(255,255,255,0.02)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 24,
        transform: boxesVisible[2] ? 'translateY(0) rotate(5deg)' : 'translateY(120px) rotate(5deg)',
        opacity: boxesVisible[2] ? 1 : 0,
        transition: 'all 1s cubic-bezier(0.34, 1.56, 0.64, 1)',
        transitionDelay: '0.2s',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '25%',
        right: '10%',
        width: 80,
        height: 80,
        background: 'rgba(255,255,255,0.025)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 14,
        transform: boxesVisible[2] ? 'translateX(0) rotate(-12deg)' : 'translateX(100px) rotate(-12deg)',
        opacity: boxesVisible[2] ? 1 : 0,
        transition: 'all 1s cubic-bezier(0.34, 1.56, 0.64, 1)',
        transitionDelay: '0.3s',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
      }} />

      {/* Main content */}
      <div style={{ textAlign: 'center', zIndex: 10, padding: '0 24px' }}>
        <h1 style={{
          fontSize: 'clamp(32px, 8vw, 56px)',
          fontWeight: 300,
          color: '#fff',
          marginBottom: 16,
          letterSpacing: '-0.02em',
          opacity: textVisible ? 1 : 0,
          transform: textVisible ? 'translateY(0)' : 'translateY(30px)',
          transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          Welcome to The Guide
        </h1>
        <p style={{
          fontSize: 'clamp(16px, 4vw, 20px)',
          color: 'rgba(255,255,255,0.5)',
          marginBottom: 56,
          fontWeight: 300,
          opacity: subtitleVisible ? 1 : 0,
          transform: subtitleVisible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          Your Journey Begins Here
        </p>
        <div style={{
          display: 'flex',
          gap: 16,
          justifyContent: 'center',
          flexWrap: 'wrap',
          opacity: buttonsVisible ? 1 : 0,
          transform: buttonsVisible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          <button
            onClick={onSkip}
            style={{
              padding: '14px 28px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 40,
              color: 'rgba(255,255,255,0.6)',
              fontSize: 15,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
              e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
              e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
            }}
          >
            Skip Tour
          </button>
          <button
            onClick={onStartTour}
            style={{
              padding: '14px 36px',
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 40,
              color: '#fff',
              fontSize: 15,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Take the Tour
          </button>
        </div>
      </div>

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
});

export const TourOverlay = memo(({ 
  step, 
  onNext, 
  onBack, 
  onSkip 
}: { 
  step: number; 
  onNext: () => void; 
  onBack: () => void; 
  onSkip: () => void;
}) => {
  const currentStep = TOUR_STEPS[step];
  
  // Get spotlight position and size based on target
  // These values match the actual ChatView element positions
  const getSpotlightConfig = () => {
    switch (currentStep.target) {
      case 'planet':
        // Planet is centered in the middle area
        return {
          top: '50%',
          left: '50%',
          width: 280,
          height: 280,
          transform: 'translate(-50%, -60%)',
          borderRadius: '50%',
        };
      case 'input':
        // Input box at bottom: paddingBottom 32px, padding 16px 20px
        return {
          bottom: 32,
          left: 20,
          right: 20,
          height: 52,
          borderRadius: 26,
        };
      case 'header':
        // Center header button "THE GUIDE"
        return {
          top: 8,
          left: '50%',
          width: 130,
          height: 48,
          transform: 'translateX(-50%)',
          borderRadius: 12,
        };
      case 'chat-toggle':
        // Right side button - padding 12px 16px, button has padding 8px
        return {
          top: 8,
          right: 12,
          width: 40,
          height: 40,
          borderRadius: 8,
        };
      case 'agent':
        // Master Agent button: bottom: 190px, centered, padding 10px 24px
        return {
          bottom: 185,
          left: '50%',
          width: 180,
          height: 44,
          transform: 'translateX(-50%)',
          borderRadius: 40,
        };
      default:
        return {
          top: '50%',
          left: '50%',
          width: 100,
          height: 100,
          transform: 'translate(-50%, -50%)',
          borderRadius: 12,
        };
    }
  };

  const getTooltipStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'fixed',
      background: 'rgba(0,0,0,0.95)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: 16,
      padding: 20,
      width: 280,
      maxWidth: 'calc(100vw - 32px)',
      zIndex: 10002,
      boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
    };
    
    switch (currentStep.target) {
      case 'planet':
        return { ...base, bottom: 100, left: '50%', transform: 'translateX(-50%)' };
      case 'input':
        return { ...base, bottom: 110, left: '50%', transform: 'translateX(-50%)' };
      case 'header':
        return { ...base, top: 70, left: '50%', transform: 'translateX(-50%)' };
      case 'chat-toggle':
        return { ...base, top: 60, right: 60, left: 'auto', transform: 'none' };
      case 'agent':
        return { ...base, bottom: 250, left: '50%', transform: 'translateX(-50%)' };
      default:
        return { ...base, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }
  };

  const spotlightConfig = getSpotlightConfig();

  return (
    <>
      {/* SVG Mask Overlay - creates the "cutout" effect */}
      <svg
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 10000,
          pointerEvents: 'none',
        }}
      >
        <defs>
          <mask id="spotlight-mask">
            {/* White = visible (darkened area), Black = hidden (spotlight area) */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {currentStep.target === 'planet' && (
              <ellipse
                cx="50%"
                cy="40%"
                rx="140"
                ry="140"
                fill="black"
              />
            )}
            {currentStep.target === 'input' && (
              <rect
                x="20"
                y="calc(100% - 84px)"
                width="calc(100% - 40px)"
                height="52"
                rx="26"
                fill="black"
              />
            )}
            {currentStep.target === 'header' && (
              <rect
                x="calc(50% - 65px)"
                y="8"
                width="130"
                height="48"
                rx="12"
                fill="black"
              />
            )}
            {currentStep.target === 'chat-toggle' && (
              <rect
                x="calc(100% - 52px)"
                y="8"
                width="40"
                height="40"
                rx="8"
                fill="black"
              />
            )}
            {currentStep.target === 'agent' && (
              <rect
                x="calc(50% - 90px)"
                y="calc(100% - 229px)"
                width="180"
                height="44"
                rx="22"
                fill="black"
              />
            )}
          </mask>
        </defs>
        {/* Dark overlay with mask applied */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.85)"
          mask="url(#spotlight-mask)"
        />
      </svg>

      {/* Spotlight border/glow effect */}
      <div
        style={{
          position: 'fixed',
          ...spotlightConfig,
          border: '2px solid rgba(255,255,255,0.4)',
          boxShadow: '0 0 30px rgba(255,255,255,0.2), inset 0 0 30px rgba(255,255,255,0.1)',
          zIndex: 10001,
          pointerEvents: 'none',
          animation: 'spotlightPulse 2s ease-in-out infinite',
        } as React.CSSProperties}
      />
      
      {/* Tooltip */}
      <div style={getTooltipStyle()}>
        <div style={{
          fontSize: 11,
          color: 'rgba(255,255,255,0.4)',
          marginBottom: 8,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}>
          Step {step + 1} of {TOUR_STEPS.length}
        </div>
        <h3 style={{
          fontSize: 18,
          fontWeight: 600,
          color: '#fff',
          margin: '0 0 8px 0',
        }}>
          {currentStep.title}
        </h3>
        <p style={{
          fontSize: 14,
          color: 'rgba(255,255,255,0.65)',
          lineHeight: 1.5,
          margin: '0 0 20px 0',
        }}>
          {currentStep.description}
        </p>
        
        {/* Progress dots */}
        <div style={{
          display: 'flex',
          gap: 6,
          marginBottom: 16,
          justifyContent: 'center',
        }}>
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === step ? 20 : 6,
                height: 6,
                borderRadius: 3,
                background: i === step ? '#fff' : i < step ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>
        
        {/* Navigation */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <button
            onClick={onSkip}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.4)',
              fontSize: 13,
              cursor: 'pointer',
              padding: '8px 0',
            }}
          >
            Skip
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            {step > 0 && (
              <button
                onClick={onBack}
                style={{
                  padding: '8px 16px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 20,
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                Back
              </button>
            )}
            <button
              onClick={onNext}
              style={{
                padding: '8px 20px',
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 20,
                color: '#fff',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {step === TOUR_STEPS.length - 1 ? 'Get Started' : 'Next'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spotlightPulse {
          0%, 100% { 
            box-shadow: 0 0 30px rgba(255,255,255,0.2), inset 0 0 30px rgba(255,255,255,0.1);
            border-color: rgba(255,255,255,0.4);
          }
          50% { 
            box-shadow: 0 0 50px rgba(255,255,255,0.3), inset 0 0 40px rgba(255,255,255,0.15);
            border-color: rgba(255,255,255,0.6);
          }
        }
      `}</style>
    </>
  );
});

WelcomeIntro.displayName = 'WelcomeIntro';
TourOverlay.displayName = 'TourOverlay';

export default function GuideWelcome({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<'intro' | 'tour'>('intro');
  const [tourStep, setTourStep] = useState(0);

  const handleStartTour = () => {
    setPhase('tour');
  };

  const handleSkip = () => {
    onComplete();
  };

  const handleNext = () => {
    if (tourStep < TOUR_STEPS.length - 1) {
      setTourStep(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (tourStep > 0) {
      setTourStep(prev => prev - 1);
    }
  };

  if (phase === 'intro') {
    return <WelcomeIntro onStartTour={handleStartTour} onSkip={handleSkip} />;
  }

  return (
    <TourOverlay
      step={tourStep}
      onNext={handleNext}
      onBack={handleBack}
      onSkip={handleSkip}
    />
  );
}
