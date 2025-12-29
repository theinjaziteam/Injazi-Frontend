// views/ChatView.tsx
import React, { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useApp } from '../contexts/AppContext';
import { AppView, ChatMessage } from '../types';
import { Icons } from '../components/UIComponents';
import { getChatResponse, checkContentSafety } from '../services/geminiService';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Sphere, Line } from '@react-three/drei';
import * as THREE from 'three';

// Types for journey steps
interface JourneyStep {
    id: string;
    title: string;
    content: string;
    position: { lat: number; lng: number };
    isActive: boolean;
    isCompleted: boolean;
}

// Convert lat/lng to 3D position on sphere
const latLngToVector3 = (lat: number, lng: number, radius: number): THREE.Vector3 => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);
    return new THREE.Vector3(x, y, z);
};

// Wireframe Globe Component
function WireframeGlobe() {
    const meshRef = useRef<THREE.Mesh>(null);
    
    useFrame(() => {
        if (meshRef.current) {
            meshRef.current.rotation.y += 0.001;
        }
    });

    // Generate latitude lines
    const latLines = [];
    for (let lat = -60; lat <= 60; lat += 30) {
        const points: THREE.Vector3[] = [];
        for (let lng = 0; lng <= 360; lng += 5) {
            points.push(latLngToVector3(lat, lng, 2));
        }
        latLines.push(points);
    }

    // Generate longitude lines
    const lngLines = [];
    for (let lng = 0; lng < 360; lng += 30) {
        const points: THREE.Vector3[] = [];
        for (let lat = -90; lat <= 90; lat += 5) {
            points.push(latLngToVector3(lat, lng, 2));
        }
        lngLines.push(points);
    }

    return (
        <group ref={meshRef}>
            {/* Base sphere for subtle fill */}
            <Sphere args={[1.98, 32, 32]}>
                <meshBasicMaterial color="#050508" transparent opacity={0.9} />
            </Sphere>
            
            {/* Outer glow sphere */}
            <Sphere args={[2.15, 32, 32]}>
                <meshBasicMaterial color="#ffffff" transparent opacity={0.02} />
            </Sphere>

            {/* Latitude lines */}
            {latLines.map((points, i) => (
                <Line
                    key={`lat-${i}`}
                    points={points}
                    color="#ffffff"
                    lineWidth={0.5}
                    transparent
                    opacity={0.15}
                />
            ))}

            {/* Longitude lines */}
            {lngLines.map((points, i) => (
                <Line
                    key={`lng-${i}`}
                    points={points}
                    color="#ffffff"
                    lineWidth={0.5}
                    transparent
                    opacity={0.15}
                />
            ))}

            {/* Equator highlight */}
            <Line
                points={Array.from({ length: 73 }, (_, i) => latLngToVector3(0, i * 5, 2))}
                color="#ffffff"
                lineWidth={1}
                transparent
                opacity={0.25}
            />
        </group>
    );
}

// Journey Marker Component
function JourneyMarker({ 
    step, 
    index, 
    isActive, 
    isCompleted,
    onClick 
}: { 
    step: JourneyStep; 
    index: number;
    isActive: boolean;
    isCompleted: boolean;
    onClick: () => void;
}) {
    const meshRef = useRef<THREE.Mesh>(null);
    const glowRef = useRef<THREE.Mesh>(null);
    const position = latLngToVector3(step.position.lat, step.position.lng, 2.05);
    
    useFrame(({ clock }) => {
        if (glowRef.current && isActive) {
            const scale = 1 + Math.sin(clock.elapsedTime * 3) * 0.3;
            glowRef.current.scale.setScalar(scale);
        }
    });

    return (
        <group position={position}>
            {/* Glow effect for active marker */}
            {isActive && (
                <mesh ref={glowRef}>
                    <sphereGeometry args={[0.15, 16, 16]} />
                    <meshBasicMaterial color="#ffffff" transparent opacity={0.3} />
                </mesh>
            )}
            
            {/* Main marker */}
            <mesh ref={meshRef} onClick={onClick}>
                <sphereGeometry args={[0.08, 16, 16]} />
                <meshBasicMaterial 
                    color={isActive ? "#ffffff" : isCompleted ? "#888888" : "#444444"} 
                />
            </mesh>

            {/* Marker ring */}
            <mesh>
                <ringGeometry args={[0.1, 0.12, 32]} />
                <meshBasicMaterial 
                    color="#ffffff" 
                    transparent 
                    opacity={isActive ? 0.8 : 0.3} 
                    side={THREE.DoubleSide}
                />
            </mesh>
        </group>
    );
}

// Connection lines between markers
function ConnectionLines({ steps }: { steps: JourneyStep[] }) {
    if (steps.length < 2) return null;

    const points: THREE.Vector3[] = steps.map(step => 
        latLngToVector3(step.position.lat, step.position.lng, 2.05)
    );

    return (
        <Line
            points={points}
            color="#ffffff"
            lineWidth={1}
            transparent
            opacity={0.3}
            dashed
            dashSize={0.1}
            gapSize={0.05}
        />
    );
}

// Camera controller for smooth rotation to markers
function CameraController({ targetPosition }: { targetPosition: THREE.Vector3 | null }) {
    const { camera } = useThree();
    const targetRef = useRef<THREE.Vector3>(new THREE.Vector3(5, 2, 5));
    
    useEffect(() => {
        if (targetPosition) {
            // Calculate camera position to look at the marker
            const direction = targetPosition.clone().normalize();
            targetRef.current = direction.multiplyScalar(6);
        }
    }, [targetPosition]);

    useFrame(() => {
        camera.position.lerp(targetRef.current, 0.02);
        camera.lookAt(0, 0, 0);
    });

    return null;
}

// Stars background
function Stars() {
    const starsRef = useRef<THREE.Points>(null);
    
    const starPositions = React.useMemo(() => {
        const positions = new Float32Array(1000 * 3);
        for (let i = 0; i < 1000; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 50;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 50;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 50;
        }
        return positions;
    }, []);

    useFrame(() => {
        if (starsRef.current) {
            starsRef.current.rotation.y += 0.0001;
        }
    });

    return (
        <points ref={starsRef}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={1000}
                    array={starPositions}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial size={0.05} color="#ffffff" transparent opacity={0.6} />
        </points>
    );
}

// Main 3D Scene
function Scene({ 
    journeySteps, 
    currentStepIndex,
    onMarkerClick 
}: { 
    journeySteps: JourneyStep[];
    currentStepIndex: number;
    onMarkerClick: (index: number) => void;
}) {
    const targetPosition = currentStepIndex >= 0 && journeySteps[currentStepIndex]
        ? latLngToVector3(
            journeySteps[currentStepIndex].position.lat,
            journeySteps[currentStepIndex].position.lng,
            2.05
          )
        : null;

    return (
        <>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={0.5} />
            
            <Stars />
            <WireframeGlobe />
            <ConnectionLines steps={journeySteps} />
            
            {journeySteps.map((step, index) => (
                <JourneyMarker
                    key={step.id}
                    step={step}
                    index={index}
                    isActive={index === currentStepIndex}
                    isCompleted={index < currentStepIndex}
                    onClick={() => onMarkerClick(index)}
                />
            ))}

            <CameraController targetPosition={targetPosition} />
            <OrbitControls 
                enableZoom={false} 
                enablePan={false}
                rotateSpeed={0.5}
                minPolarAngle={Math.PI * 0.3}
                maxPolarAngle={Math.PI * 0.7}
            />
        </>
    );
}

export default function ChatView() {
    const { user, setUser, setView } = useApp();
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [isInputFocused, setIsInputFocused] = useState(false);
    
    // Journey State
    const [journeySteps, setJourneySteps] = useState<JourneyStep[]>([]);
    const [currentStepIndex, setCurrentStepIndex] = useState(-1);
    const [isJourneyActive, setIsJourneyActive] = useState(false);
    const [displayedText, setDisplayedText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 100) + 'px';
        }
    }, [chatInput]);

    // Typewriter effect
    const typeText = useCallback((text: string, onComplete?: () => void) => {
        setIsTyping(true);
        setDisplayedText('');
        let index = 0;
        
        const interval = setInterval(() => {
            if (index < text.length) {
                setDisplayedText(prev => prev + text[index]);
                index++;
            } else {
                clearInterval(interval);
                setIsTyping(false);
                onComplete?.();
            }
        }, 12);

        return () => clearInterval(interval);
    }, []);

    // Navigate to step
    const navigateToStep = useCallback((stepIndex: number) => {
        if (stepIndex < 0 || stepIndex >= journeySteps.length) return;

        const step = journeySteps[stepIndex];
        
        // Update step states
        setJourneySteps(prev => prev.map((s, i) => ({
            ...s,
            isActive: i === stepIndex,
            isCompleted: i < stepIndex
        })));
        
        setCurrentStepIndex(stepIndex);

        // Type the explanation
        typeText(step.content);
    }, [journeySteps, typeText]);

    // Parse AI response into steps
    const parseAIResponseToSteps = (response: string): JourneyStep[] => {
        const stepPatterns = [
            /(?:^|\n)(\d+)[.)]\s*(.+?)(?=\n\d+[.)]|\n\n|$)/gs,
            /(?:^|\n)(?:Step\s*)?(\d+)[.:]\s*(.+?)(?=\n(?:Step\s*)?\d+[.:]|\n\n|$)/gis,
            /(?:^|\n)[•\-]\s*(.+?)(?=\n[•\-]|\n\n|$)/gs
        ];

        let steps: JourneyStep[] = [];
        
        for (const pattern of stepPatterns.slice(0, 2)) {
            const matches = [...response.matchAll(pattern)];
            if (matches.length >= 2) {
                steps = matches.map((match, index) => ({
                    id: `step-${index}`,
                    title: `Step ${index + 1}`,
                    content: match[2]?.trim() || match[1]?.trim() || '',
                    position: {
                        lat: (Math.random() - 0.5) * 100,
                        lng: (index * 72) - 144 + (Math.random() - 0.5) * 20
                    },
                    isActive: false,
                    isCompleted: false
                }));
                break;
            }
        }

        if (steps.length < 2) {
            const bulletMatches = [...response.matchAll(stepPatterns[2])];
            if (bulletMatches.length >= 2) {
                steps = bulletMatches.map((match, index) => ({
                    id: `step-${index}`,
                    title: `Step ${index + 1}`,
                    content: match[1]?.trim() || '',
                    position: {
                        lat: (Math.random() - 0.5) * 100,
                        lng: (index * 72) - 144 + (Math.random() - 0.5) * 20
                    },
                    isActive: false,
                    isCompleted: false
                }));
            }
        }

        if (steps.length < 2) {
            const paragraphs = response.split(/\n\n+/).filter(p => p.trim().length > 20);
            if (paragraphs.length >= 2) {
                steps = paragraphs.slice(0, 5).map((p, index) => ({
                    id: `step-${index}`,
                    title: `Step ${index + 1}`,
                    content: p.trim(),
                    position: {
                        lat: (Math.random() - 0.5) * 100,
                        lng: (index * 72) - 144 + (Math.random() - 0.5) * 20
                    },
                    isActive: false,
                    isCompleted: false
                }));
            } else {
                steps = [{
                    id: 'step-0',
                    title: 'Guidance',
                    content: response.trim(),
                    position: { lat: 20, lng: 0 },
                    isActive: false,
                    isCompleted: false
                }];
            }
        }

        return steps;
    };

    // Send message
    const handleSendMessage = async () => {
        const message = chatInput.trim();
        if (!message || !user.goal) return;

        const safetyCheck = await checkContentSafety(message);
        if (!safetyCheck.isSafe) {
            alert("Please keep the conversation appropriate.");
            return;
        }

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            text: message,
            timestamp: Date.now()
        };
        setUser(prev => ({ ...prev, chatHistory: [...prev.chatHistory, userMessage] }));

        setChatInput('');
        setIsChatLoading(true);
        setJourneySteps([]);
        setCurrentStepIndex(-1);
        setDisplayedText('');

        try {
            const response = await getChatResponse(
                user.goal,
                user.chatHistory,
                message,
                user.userProfile,
                user.dailyTasks,
                user.connectedApps,
                undefined,
                user.extraLogs
            );

            const aiMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                text: response,
                timestamp: Date.now()
            };
            setUser(prev => ({ ...prev, chatHistory: [...prev.chatHistory, aiMessage] }));

            const steps = parseAIResponseToSteps(response);
            setJourneySteps(steps);
            setIsJourneyActive(true);

            setTimeout(() => {
                navigateToStep(0);
            }, 500);

        } catch (error) {
            console.error('Chat error:', error);
            setDisplayedText("I'm having trouble connecting. Please try again.");
        } finally {
            setIsChatLoading(false);
        }
    };

    const goToNextStep = () => {
        if (currentStepIndex < journeySteps.length - 1) {
            navigateToStep(currentStepIndex + 1);
        }
    };

    const goToPrevStep = () => {
        if (currentStepIndex > 0) {
            navigateToStep(currentStepIndex - 1);
        }
    };

    const resetJourney = () => {
        setJourneySteps([]);
        setCurrentStepIndex(-1);
        setIsJourneyActive(false);
        setDisplayedText('');
    };

    return (
        <div className="h-full w-full bg-black flex flex-col overflow-hidden relative">
            {/* 3D Canvas - Full Screen Background */}
            <div className="absolute inset-0">
                <Canvas camera={{ position: [5, 2, 5], fov: 45 }}>
                    <Suspense fallback={null}>
                        <Scene 
                            journeySteps={journeySteps}
                            currentStepIndex={currentStepIndex}
                            onMarkerClick={navigateToStep}
                        />
                    </Suspense>
                </Canvas>
            </div>

            {/* Top Header */}
            <div className="relative z-10 flex items-center justify-between px-6 pt-safe pb-3">
                <button 
                    onClick={() => setView(AppView.DASHBOARD)}
                    className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-all"
                >
                    <Icons.ArrowLeft className="w-5 h-5" />
                </button>
                
                <div className="text-center">
                    <h1 className="text-white font-bold text-sm tracking-wide">THE GUIDE</h1>
                    <p className="text-white/30 text-[10px]">Your AI Journey Coach</p>
                </div>

                {isJourneyActive ? (
                    <button 
                        onClick={resetJourney}
                        className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-all"
                    >
                        <Icons.X className="w-5 h-5" />
                    </button>
                ) : (
                    <div className="w-9" />
                )}
            </div>

            {/* Content Overlay - Left Side Text (FIXED POSITIONING) */}
            <div className="flex-1 relative z-10 pointer-events-none">
                <div className="absolute left-0 top-0 bottom-0 w-[45%] flex flex-col justify-center px-8 py-8 pointer-events-auto">
                    {!isJourneyActive && !isChatLoading && (
                        <div className="animate-fade-in">
                            <p className="text-white/30 text-xs uppercase tracking-widest mb-3">Welcome</p>
                            <h2 className="text-white text-2xl font-bold leading-tight mb-4">
                                What would you like<br />guidance on today?
                            </h2>
                            <p className="text-white/50 text-sm leading-relaxed max-w-[320px]">
                                Share your challenges, questions, or goals. I'll guide you through step by step on your journey.
                            </p>
                        </div>
                    )}

                    {isChatLoading && (
                        <div className="animate-pulse">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                            <p className="text-white/40 text-sm">Charting your journey...</p>
                        </div>
                    )}

                    {isJourneyActive && journeySteps.length > 0 && currentStepIndex >= 0 && (
                        <div className="animate-fade-in">
                            {/* Step indicator */}
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-white/30 text-xs uppercase tracking-widest">
                                    Step {currentStepIndex + 1} of {journeySteps.length}
                                </span>
                            </div>

                            {/* Step title */}
                            <h3 className="text-white text-xl font-bold mb-4">
                                {journeySteps[currentStepIndex]?.title}
                            </h3>

                            {/* AI explanation with typewriter */}
                            <div className="text-white/80 text-sm leading-relaxed mb-6 min-h-[120px] max-w-[380px]">
                                {displayedText}
                                {isTyping && <span className="inline-block w-0.5 h-4 bg-white ml-1 animate-pulse" />}
                            </div>

                            {/* Navigation */}
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={goToPrevStep}
                                    disabled={currentStepIndex === 0}
                                    className="px-4 py-2 rounded-lg border border-white/20 text-white/60 text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-all"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={goToNextStep}
                                    disabled={currentStepIndex === journeySteps.length - 1 || isTyping}
                                    className="px-4 py-2 rounded-lg bg-white text-black text-sm font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/90 transition-all"
                                >
                                    {currentStepIndex === journeySteps.length - 1 ? 'Complete' : 'Next Step'}
                                </button>
                            </div>

                            {/* Step dots */}
                            <div className="flex items-center gap-2 mt-6">
                                {journeySteps.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => navigateToStep(idx)}
                                        className={`h-2 rounded-full transition-all ${
                                            idx === currentStepIndex 
                                                ? 'bg-white w-6' 
                                                : idx < currentStepIndex 
                                                    ? 'bg-white/50 w-2' 
                                                    : 'bg-white/20 w-2'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Input */}
            <div className="relative z-10 px-6 pb-safe">
                <div className={`bg-white/5 backdrop-blur-xl rounded-2xl border transition-all ${
                    isInputFocused ? 'border-white/30' : 'border-white/10'
                }`}>
                    <div className="flex items-end gap-2 p-3">
                        <textarea
                            ref={textareaRef}
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            onFocus={() => setIsInputFocused(true)}
                            onBlur={() => setIsInputFocused(false)}
                            placeholder="Ask for guidance..."
                            className="flex-1 bg-transparent text-white text-sm placeholder:text-white/30 resize-none focus:outline-none leading-relaxed"
                            rows={1}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={!chatInput.trim() || isChatLoading}
                            className={`p-3 rounded-xl transition-all ${
                                chatInput.trim() && !isChatLoading
                                    ? 'bg-white text-black'
                                    : 'bg-white/10 text-white/30'
                            }`}
                        >
                            <Icons.Send className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* CSS Animations */}
            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-in 0.5s ease-out;
                }
            `}</style>
        </div>
    );
}
