// components/GuideWelcome.tsx

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

// Intro screen with animated boxes
export const WelcomeIntro = memo(({ onStartTour, onSkip }: { onStartTour: () => void; onSkip: () => void }) => {
  const [boxesVisible, setBoxesVisible] = useState([false, false, false]);
  const [textVisible, setTextVisible] = useState(false);
  const [subtitleVisible, setSubtitleVisible] = useState(false);
  const [buttonsVisible, setButtonsVisible] = useState(false);

  useEffect(() => {
    // Staggered box animations
    const timers = [
      setTimeout(() => setBoxesVisible(prev => [true, prev[1], prev[2]]), 300),
      setTimeout(() => setBoxesVisible(prev => [prev[0], true, prev[2]]), 600),
      setTimeout(() => setBoxesVisible(prev => [prev[0], prev[1], true]), 900),
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
      {/* Animated decorative boxes */}
      <div style={{
        position: 'absolute',
        top: '15%',
        left: '10%',
        width: 120,
        height: 120,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        transform: boxesVisible[0] ? 'translateX(0) rotate(12deg)' : 'translateX(-100px) rotate(12deg)',
        opacity: boxesVisible[0] ? 1 : 0,
        transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }} />
      <div style={{
        position: 'absolute',
        top: '25%',
        right: '15%',
        width: 80,
        height: 80,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12,
        transform: boxesVisible[1] ? 'translateY(0) rotate(-8deg)' : 'translateY(-80px) rotate(-8deg)',
        opacity: boxesVisible[1] ? 1 : 0,
        transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '20%',
        left: '20%',
        width: 100,
        height: 100,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 20,
        transform: boxesVisible[2] ? 'translateY(0) rotate(5deg)' : 'translateY(80px) rotate(5deg)',
        opacity: boxesVisible[2] ? 1 : 0,
        transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }} />

      {/* Main content */}
      <div style={{ textAlign: 'center', zIndex: 10 }}>
        <h1 style={{
          fontSize: 48,
          fontWeight: 300,
          color: '#fff',
          marginBottom: 16,
          opacity: textVisible ? 1 : 0,
          transform: textVisible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.6s ease-out',
        }}>
          Welcome to The Guide
        </h1>
        <p style={{
          fontSize: 18,
          color: 'rgba(255,255,255,0.6)',
          marginBottom: 48,
          opacity: subtitleVisible ? 1 : 0,
          transform: subtitleVisible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.6s ease-out',
        }}>
          Your Journey Begins Here
        </p>
        <div style={{
          display: 'flex',
          gap: 16,
          justifyContent: 'center',
          opacity: buttonsVisible ? 1 : 0,
          transform: buttonsVisible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.6s ease-out',
        }}>
          <button
            onClick={onSkip}
            style={{
              padding: '12px 24px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 40,
              color: 'rgba(255,255,255,0.6)',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Skip Tour
          </button>
          <button
            onClick={onStartTour}
            style={{
              padding: '12px 32px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 40,
              color: '#fff',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Take the Tour
          </button>
        </div>
      </div>
    </div>
  );
});

// Tour overlay that highlights actual UI elements
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
  
  // Get spotlight position based on target
  const getSpotlightStyle = () => {
    const positions: Record<string, React.CSSProperties> = {
      'planet': { top: '35%', left: '50%', width: 280, height: 280, transform: 'translate(-50%, -50%)', borderRadius: '50%' },
      'input': { bottom: 20, left: '50%', width: '90%', height: 60, transform: 'translateX(-50%)', borderRadius: 30 },
      'header': { top: 10, left: '50%', width: '60%', height: 50, transform: 'translateX(-50%)', borderRadius: 12 },
      'chat-toggle': { top: 10, right: 60, width: 44, height: 44, borderRadius: 12 },
      'agent': { bottom: 100, left: '50%', width: 200, height: 50, transform: 'translateX(-50%)', borderRadius: 30 },
    };
    return positions[currentStep.target] || {};
  };

  const getTooltipStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'absolute',
      background: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: 16,
      padding: 20,
      maxWidth: 280,
      zIndex: 1002,
    };
    
    switch (currentStep.position) {
      case 'top':
        return { ...base, bottom: '60%', left: '50%', transform: 'translateX(-50%)' };
      case 'bottom':
        return { ...base, top: '65%', left: '50%', transform: 'translateX(-50%)' };
      case 'left':
        return { ...base, top: '50%', right: '60%', transform: 'translateY(-50%)' };
      case 'right':
        return { ...base, top: '50%', left: '60%', transform: 'translateY(-50%)' };
      default:
        return base;
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      pointerEvents: 'auto',
    }}>
      {/* Semi-transparent overlay with spotlight cutout */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
      }} />
      
      {/* Spotlight highlight */}
      <div style={{
        position: 'absolute',
        ...getSpotlightStyle(),
        boxShadow: '0 0 0 9999px rgba(0,0,0,0.75), 0 0 40px rgba(255,255,255,0.1)',
        pointerEvents: 'none',
      }} />
      
      {/* Tooltip */}
      <div style={getTooltipStyle()}>
        <div style={{
          fontSize: 12,
          color: 'rgba(255,255,255,0.4)',
          marginBottom: 4,
        }}>
          Step {step + 1} of {TOUR_STEPS.length}
        </div>
        <h3 style={{
          fontSize: 18,
          fontWeight: 600,
          color: '#fff',
          marginBottom: 8,
        }}>
          {currentStep.title}
        </h3>
        <p style={{
          fontSize: 14,
          color: 'rgba(255,255,255,0.7)',
          lineHeight: 1.5,
          marginBottom: 20,
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
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: i === step ? '#fff' : 'rgba(255,255,255,0.2)',
                transition: 'background 0.3s',
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
              color: 'rgba(255,255,255,0.5)',
              fontSize: 14,
              cursor: 'pointer',
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
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 20,
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
                padding: '8px 20px',
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 20,
                color: '#fff',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              {step === TOUR_STEPS.length - 1 ? 'Get Started' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

WelcomeIntro.displayName = 'WelcomeIntro';
TourOverlay.displayName = 'TourOverlay';
