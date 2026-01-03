// components/GuideWelcome.tsx
import React, { useState, useEffect, memo } from 'react';

interface TourStep {
  target: string;
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

// Updated tour steps - now includes mode toggle and correct Master Agent at the end
const TOUR_STEPS: TourStep[] = [
  { 
    target: 'planet', 
    title: 'Your Journey Map', 
    description: 'Watch your guidance unfold as points on this interactive planet. Drag to explore.', 
    position: 'bottom' 
  },
  { 
    target: 'input', 
    title: 'Ask Anything', 
    description: 'Type your questions, challenges, or goals here. The Guide will create a visual journey for you.', 
    position: 'top' 
  },
  { 
    target: 'header', 
    title: 'Your Journeys', 
    description: 'Tap here to view all your saved conversations and continue where you left off.', 
    position: 'bottom' 
  },
  { 
    target: 'mode-toggle', 
    title: 'Switch Views', 
    description: 'Toggle between Planet view for visual journeys and Chat view for traditional conversations.', 
    position: 'top' 
  },
  { 
    target: 'master-agent', 
    title: 'Master Agent', 
    description: 'Access powerful AI automation tools for your e-commerce business - manage products, analytics, email campaigns, and more.', 
    position: 'top' 
  },
];

export const WelcomeIntro = memo(({ onStartTour, onSkip }: { onStartTour: () => void; onSkip: () => void }) => {
  const [boxesVisible, setBoxesVisible] = useState([false, false, false]);
  const [textVisible, setTextVisible] = useState(false);
  const [subtitleVisible, setSubtitleVisible] = useState(false);
  const [buttonsVisible, setButtonsVisible] = useState(false);
  const [animationStarted, setAnimationStarted] = useState(false);

  useEffect(() => {
    const timers = [
      setTimeout(() => setBoxesVisible([true, false, false]), 300),
      setTimeout(() => setBoxesVisible([true, true, false]), 600),
      setTimeout(() => setBoxesVisible([true, true, true]), 900),
      setTimeout(() => setTextVisible(true), 1200),
      setTimeout(() => setSubtitleVisible(true), 1600),
      setTimeout(() => setButtonsVisible(true), 2000),
      setTimeout(() => setAnimationStarted(true), 2500),
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
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20,
        transform: boxesVisible[0] ? 'translateX(0) rotate(12deg)' : 'translateX(-150px) rotate(12deg)',
        opacity: boxesVisible[0] ? 1 : 0,
        transition: boxesVisible[0] ? 'all 1s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
        animation: animationStarted ? 'floatBox1 4s ease-in-out infinite' : 'none',
      }} />
      <div style={{
        position: 'absolute',
        top: '20%',
        right: '12%',
        width: 100,
        height: 100,
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        transform: boxesVisible[1] ? 'translateY(0) rotate(-8deg)' : 'translateY(-120px) rotate(-8deg)',
        opacity: boxesVisible[1] ? 1 : 0,
        transition: boxesVisible[1] ? 'all 1s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
        transitionDelay: boxesVisible[1] ? '0.1s' : '0s',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
        animation: animationStarted ? 'floatBox2 5s ease-in-out infinite' : 'none',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '18%',
        left: '15%',
        width: 120,
        height: 120,
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 24,
        transform: boxesVisible[2] ? 'translateY(0) rotate(5deg)' : 'translateY(120px) rotate(5deg)',
        opacity: boxesVisible[2] ? 1 : 0,
        transition: boxesVisible[2] ? 'all 1s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
        transitionDelay: boxesVisible[2] ? '0.2s' : '0s',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
        animation: animationStarted ? 'floatBox3 6s ease-in-out infinite' : 'none',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '25%',
        right: '10%',
        width: 80,
        height: 80,
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14,
        transform: boxesVisible[2] ? 'translateX(0) rotate(-12deg)' : 'translateX(100px) rotate(-12deg)',
        opacity: boxesVisible[2] ? 1 : 0,
        transition: boxesVisible[2] ? 'all 1s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
        transitionDelay: boxesVisible[2] ? '0.3s' : '0s',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
        animation: animationStarted ? 'floatBox4 4.5s ease-in-out infinite' : 'none',
      }} />

      {/* Main content */}
      <div style={{ textAlign: 'center', zIndex: 10, padding: '0 24px' }}>
        <h1 style={{
          fontSize: 'clamp(32px, 8vw, 56px)',
          fontWeight: 300,
          color: 'rgba(255, 255, 255, 0.9)',
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
          color: 'rgba(255,255,255,0.7)',
          marginBottom: 56,
          fontWeight: 300,
          opacity: subtitleVisible ? 1 : 0,
          transform: subtitleVisible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          Your AI-powered journey companion
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
              background: 'rgba(255,255,255,0.03)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 40,
              color: 'rgba(255,255,255,0.7)',
              fontSize: 15,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
              e.currentTarget.style.color = 'rgba(255,255,255,0.9)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
              e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
            }}
          >
            Skip Tour
          </button>
          <button
            onClick={onStartTour}
            style={{
              padding: '14px 36px',
              background: '#3423A6',
              border: '1px solid rgba(52, 35, 166, 0.5)',
              borderRadius: 40,
              color: '#fff',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 12px rgba(52, 35, 166, 0.4)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#271b7a';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(52, 35, 166, 0.5)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#3423A6';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(52, 35, 166, 0.4)';
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
        @keyframes floatBox1 {
          0%, 100% { transform: translate(0, 0) rotate(12deg) scale(1); }
          25% { transform: translate(10px, -15px) rotate(15deg) scale(1.05); }
          50% { transform: translate(-5px, -25px) rotate(10deg) scale(1.02); }
          75% { transform: translate(-10px, -10px) rotate(14deg) scale(1.03); }
        }
        @keyframes floatBox2 {
          0%, 100% { transform: translate(0, 0) rotate(-8deg) scale(1); }
          33% { transform: translate(-12px, 10px) rotate(-10deg) scale(1.04); }
          66% { transform: translate(8px, -8px) rotate(-6deg) scale(1.02); }
        }
        @keyframes floatBox3 {
          0%, 100% { transform: translate(0, 0) rotate(5deg) scale(1); }
          30% { transform: translate(15px, 12px) rotate(8deg) scale(1.03); }
          60% { transform: translate(-8px, 20px) rotate(3deg) scale(1.05); }
          90% { transform: translate(-12px, 5px) rotate(6deg) scale(1.01); }
        }
        @keyframes floatBox4 {
          0%, 100% { transform: translate(0, 0) rotate(-12deg) scale(1); }
          40% { transform: translate(-8px, -12px) rotate(-14deg) scale(1.06); }
          80% { transform: translate(10px, -5px) rotate(-10deg) scale(1.02); }
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
  // These values are calculated based on actual ChatView element positions
  const getSpotlightConfig = (): React.CSSProperties => {
    switch (currentStep.target) {
      case 'planet':
        // Planet canvas - centered in the middle of the screen
        // topOffset: 180, bottomOffset: 190, planet is ~50% of available space
        return {
          position: 'fixed',
          top: '50%',
          left: '50%',
          width: 280,
          height: 280,
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
        };
      
      case 'input':
        // Input area at bottom
        // padding: 16px, paddingBottom: calc(16px + env(safe-area-inset-bottom))
        // Input container: padding 8px 16px, borderRadius 24px
        return {
          position: 'fixed',
          bottom: 16,
          left: 16,
          right: 16,
          height: 56,
          borderRadius: 28,
        };
      
      case 'header':
        // Header center - "The Guide" title and journeys list button
        // padding: 12px 16px, paddingTop: calc(12px + env(safe-area-inset-top))
        // List button is on the right: padding: 8px
        return {
          position: 'fixed',
          top: 12,
          right: 16,
          width: 40,
          height: 40,
          borderRadius: 10,
        };
      
      case 'mode-toggle':
        // Mode toggle (Planet/Chat) in bottom input area
        // Inside bottom area: marginBottom: 12px from input
        // Toggle container: padding: 4px, borderRadius: 20px
        // Each button: padding: 6px 16px
        // Total width ~130px, height ~36px
        return {
          position: 'fixed',
          bottom: 90, // Above the input (56px + 16px padding + 18px gap)
          left: '50%',
          width: 140,
          height: 36,
          transform: 'translateX(-50%)',
          borderRadius: 20,
        };
      
      case 'master-agent':
        // Master Agent button
        // position: absolute, bottom: calc(env(safe-area-inset-bottom) + 100px)
        // padding: 10px 24px, borderRadius: 40px
        // Contains: icon (16px) + text + icon (14px) + gaps
        // Approximate width: ~180px, height: ~44px
        return {
          position: 'fixed',
          bottom: 168, // 100px + bottom area height (~68px)
          left: '50%',
          width: 190,
          height: 48,
          transform: 'translateX(-50%)',
          borderRadius: 40,
        };
      
      default:
        return {
          position: 'fixed',
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
        return { ...base, bottom: 180, left: '50%', transform: 'translateX(-50%)' };
      case 'input':
        return { ...base, bottom: 100, left: '50%', transform: 'translateX(-50%)' };
      case 'header':
        return { ...base, top: 70, right: 16, left: 'auto', transform: 'none' };
      case 'mode-toggle':
        return { ...base, bottom: 150, left: '50%', transform: 'translateX(-50%)' };
      case 'master-agent':
        return { ...base, bottom: 240, left: '50%', transform: 'translateX(-50%)' };
      default:
        return { ...base, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }
  };

  // Get SVG mask shape based on target
  const getMaskShape = () => {
    switch (currentStep.target) {
      case 'planet':
        return (
          <ellipse
            cx="50%"
            cy="50%"
            rx="140"
            ry="140"
            fill="black"
          />
        );
      
      case 'input':
        return (
          <rect
            x="16"
            y="calc(100% - 72px)"
            width="calc(100% - 32px)"
            height="56"
            rx="28"
            fill="black"
          />
        );
      
      case 'header':
        return (
          <rect
            x="calc(100% - 56px)"
            y="12"
            width="40"
            height="40"
            rx="10"
            fill="black"
          />
        );
      
      case 'mode-toggle':
        return (
          <rect
            x="calc(50% - 70px)"
            y="calc(100% - 126px)"
            width="140"
            height="36"
            rx="18"
            fill="black"
          />
        );
      
      case 'master-agent':
        return (
          <rect
            x="calc(50% - 95px)"
            y="calc(100% - 216px)"
            width="190"
            height="48"
            rx="24"
            fill="black"
          />
        );
      
      default:
        return (
          <rect
            x="calc(50% - 50px)"
            y="calc(50% - 50px)"
            width="100"
            height="100"
            rx="12"
            fill="black"
          />
        );
    }
  };

  const spotlightConfig = getSpotlightConfig();

  return (
    <>
      {/* SVG Mask Overlay */}
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
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {getMaskShape()}
          </mask>
        </defs>
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
          ...spotlightConfig,
          border: '3px solid rgba(255,255,255,0.9)',
          boxShadow: '0 0 40px rgba(255,255,255,0.5), inset 0 0 40px rgba(255,255,255,0.2)',
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
                background: step === TOUR_STEPS.length - 1 ? '#3423A6' : 'rgba(255,255,255,0.15)',
                border: step === TOUR_STEPS.length - 1 ? '1px solid rgba(52, 35, 166, 0.5)' : '1px solid rgba(255,255,255,0.2)',
                borderRadius: 20,
                color: '#fff',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: step === TOUR_STEPS.length - 1 ? '0 4px 12px rgba(52, 35, 166, 0.4)' : 'none',
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
            box-shadow: 0 0 40px rgba(255,255,255,0.5), inset 0 0 40px rgba(255,255,255,0.2);
            border-color: rgba(255,255,255,0.9);
          }
          50% { 
            box-shadow: 0 0 60px rgba(255,255,255,0.7), inset 0 0 50px rgba(255,255,255,0.3);
            border-color: rgba(255,255,255,1);
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
