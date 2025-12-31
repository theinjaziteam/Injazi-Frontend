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
  
  const getSpotlightStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'absolute',
      boxShadow: '0 0 0 9999px rgba(0,0,0,0.8)',
      border: '2px solid rgba(255,255,255,0.2)',
      animation: 'spotlightPulse 2s ease-in-out infinite',
    };
    
    const positions: Record<string, React.CSSProperties> = {
      'planet': { ...base, top: '30%', left: '50%', width: 260, height: 260, transform: 'translate(-50%, -50%)', borderRadius: '50%' },
      'input': { ...base, bottom: 16, left: '50%', width: 'calc(100% - 40px)', maxWidth: 500, height: 56, transform: 'translateX(-50%)', borderRadius: 28 },
      'header': { ...base, top: 12, left: '50%', width: 180, height: 44, transform: 'translateX(-50%)', borderRadius: 22 },
      'chat-toggle': { ...base, top: 12, right: 16, left: 'auto', width: 44, height: 44, transform: 'none', borderRadius: 12 },
      'agent': { ...base, bottom: 90, left: '50%', width: 180, height: 48, transform: 'translateX(-50%)', borderRadius: 24 },
    };
    return positions[currentStep.target] || base;
  };

  const getTooltipStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'absolute',
      background: 'rgba(0,0,0,0.9)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 20,
      padding: 24,
      width: 300,
      maxWidth: 'calc(100vw - 48px)',
      zIndex: 1002,
      boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
    };
    
    switch (currentStep.target) {
      case 'planet':
        return { ...base, top: '58%', left: '50%', transform: 'translateX(-50%)' };
      case 'input':
        return { ...base, bottom: 100, left: '50%', transform: 'translateX(-50%)' };
      case 'header':
        return { ...base, top: 70, left: '50%', transform: 'translateX(-50%)' };
      case 'chat-toggle':
        return { ...base, top: 70, right: 16, left: 'auto', transform: 'none' };
      case 'agent':
        return { ...base, bottom: 160, left: '50%', transform: 'translateX(-50%)' };
      default:
        return { ...base, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
    }}>
      {/* Spotlight */}
      <div style={getSpotlightStyle()} />
      
      {/* Tooltip */}
      <div style={getTooltipStyle()}>
        <div style={{
          fontSize: 12,
          color: 'rgba(255,255,255,0.4)',
          marginBottom: 8,
          fontWeight: 500,
          letterSpacing: '0.05em',
        }}>
          STEP {step + 1} OF {TOUR_STEPS.length}
        </div>
        <h3 style={{
          fontSize: 20,
          fontWeight: 600,
          color: '#fff',
          marginBottom: 8,
        }}>
          {currentStep.title}
        </h3>
        <p style={{
          fontSize: 14,
          color: 'rgba(255,255,255,0.65)',
          lineHeight: 1.6,
          marginBottom: 24,
        }}>
          {currentStep.description}
        </p>
        
        {/* Progress dots */}
        <div style={{
          display: 'flex',
          gap: 8,
          marginBottom: 20,
          justifyContent: 'center',
        }}>
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === step ? 24 : 8,
                height: 8,
                borderRadius: 4,
                background: i === step ? '#fff' : 'rgba(255,255,255,0.2)',
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
              fontSize: 14,
              cursor: 'pointer',
              padding: '8px 0',
            }}
          >
            Skip
          </button>
          <div style={{ display: 'flex', gap: 10 }}>
            {step > 0 && (
              <button
                onClick={onBack}
                style={{
                  padding: '10px 20px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 24,
                  color: '#fff',
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Back
              </button>
            )}
            <button
              onClick={onNext}
              style={{
                padding: '10px 24px',
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 24,
                color: '#fff',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {step === TOUR_STEPS.length - 1 ? 'Get Started' : 'Next'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spotlightPulse {
          0%, 100% { box-shadow: 0 0 0 9999px rgba(0,0,0,0.8), 0 0 30px rgba(255,255,255,0.1); }
          50% { box-shadow: 0 0 0 9999px rgba(0,0,0,0.8), 0 0 50px rgba(255,255,255,0.15); }
        }
      `}</style>
    </div>
  );
});

WelcomeIntro.displayName = 'WelcomeIntro';
TourOverlay.displayName = 'TourOverlay';
