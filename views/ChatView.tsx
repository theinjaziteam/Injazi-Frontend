// views/ChatView.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../contexts/AppContext';
import { AppView, ChatMessage, ChatAttachment, TaskStatus } from '../types';
import { Icons } from '../components/UIComponents';
import { checkContentSafety, getChatResponse } from '../services/geminiService';

// Helper for Base64
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(blob);
  });
}

// Journey Steps - each is a "zone" on the planet
interface JourneyStep {
    id: string;
    title: string;
    icon: string;
    position: { lat: number; lng: number }; // Position on globe
    color: string;
    content: string;
    isActive: boolean;
    isCompleted: boolean;
}

export default function ChatView() {
    const { user, setUser, setView } = useApp();
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [chatAttachment, setChatAttachment] = useState<ChatAttachment | undefined>(undefined);
    const [isInputFocused, setIsInputFocused] = useState(false);
    
    // Journey State
    const [journeySteps, setJourneySteps] = useState<JourneyStep[]>([]);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [isJourneyMode, setIsJourneyMode] = useState(false);
    const [aiExplanation, setAiExplanation] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    
    // Globe animation state
    const [globeRotation, setGlobeRotation] = useState({ x: 0, y: 0 });
    const [globeZoom, setGlobeZoom] = useState(1);
    const [isTransitioning, setIsTransitioning] = useState(false);
    
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const animationRef = useRef<number>();
    const starsRef = useRef<{ x: number; y: number; z: number; size: number }[]>([]);

    // Initialize stars
    useEffect(() => {
        starsRef.current = Array.from({ length: 200 }, () => ({
            x: Math.random() * 2 - 1,
            y: Math.random() * 2 - 1,
            z: Math.random(),
            size: Math.random() * 2 + 0.5
        }));
    }, []);

    // Canvas-based 3D Globe Rendering
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size
        const resize = () => {
            const rect = canvas.parentElement?.getBoundingClientRect();
            if (rect) {
                canvas.width = rect.width * window.devicePixelRatio;
                canvas.height = rect.height * window.devicePixelRatio;
                ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
            }
        };
        resize();
        window.addEventListener('resize', resize);

        let rotation = globeRotation.y;
        let targetRotation = globeRotation.y;
        let zoom = globeZoom;
        let targetZoom = globeZoom;

        const drawGlobe = () => {
            const width = canvas.width / window.devicePixelRatio;
            const height = canvas.height / window.devicePixelRatio;
            
            // Clear canvas
            ctx.fillStyle = '#0a0a1a';
            ctx.fillRect(0, 0, width, height);

            // Draw stars
            starsRef.current.forEach(star => {
                const twinkle = 0.5 + Math.sin(Date.now() * 0.001 + star.x * 10) * 0.5;
                ctx.fillStyle = `rgba(255, 255, 255, ${star.z * twinkle * 0.8})`;
                ctx.beginPath();
                ctx.arc(
                    (star.x + 1) * width / 2,
                    (star.y + 1) * height / 2,
                    star.size,
                    0,
                    Math.PI * 2
                );
                ctx.fill();
            });

            // Globe center and radius
            const centerX = width / 2;
            const centerY = height / 2;
            const baseRadius = Math.min(width, height) * 0.35;
            const radius = baseRadius * zoom;

            // Smooth rotation and zoom
            rotation += (targetRotation - rotation) * 0.05;
            zoom += (targetZoom - zoom) * 0.08;

            // Globe glow
            const glowGradient = ctx.createRadialGradient(centerX, centerY, radius * 0.8, centerX, centerY, radius * 1.8);
            glowGradient.addColorStop(0, 'rgba(52, 35, 166, 0.3)');
            glowGradient.addColorStop(0.5, 'rgba(52, 35, 166, 0.1)');
            glowGradient.addColorStop(1, 'transparent');
            ctx.fillStyle = glowGradient;
            ctx.fillRect(0, 0, width, height);

            // Globe base gradient
            const globeGradient = ctx.createRadialGradient(
                centerX - radius * 0.3, 
                centerY - radius * 0.3, 
                0, 
                centerX, 
                centerY, 
                radius
            );
            globeGradient.addColorStop(0, '#2a4a7a');
            globeGradient.addColorStop(0.5, '#1a2a4a');
            globeGradient.addColorStop(1, '#0a1525');

            // Draw main globe
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.fillStyle = globeGradient;
            ctx.fill();

            // Draw grid lines (latitude/longitude)
            ctx.strokeStyle = 'rgba(52, 35, 166, 0.2)';
            ctx.lineWidth = 1;

            // Longitude lines
            for (let i = 0; i < 12; i++) {
                const angle = (i / 12) * Math.PI + rotation;
                const x1 = centerX + Math.sin(angle) * radius;
                ctx.beginPath();
                ctx.ellipse(centerX, centerY, Math.abs(Math.cos(angle)) * radius, radius, 0, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Latitude lines
            for (let i = 1; i < 6; i++) {
                const latRadius = radius * Math.cos((i / 6) * Math.PI / 2);
                const y = centerY + radius * Math.sin((i / 6) * Math.PI / 2) * (i > 3 ? -1 : 1);
                ctx.beginPath();
                ctx.ellipse(centerX, centerY + (i - 3) * radius * 0.15, latRadius, latRadius * 0.3, 0, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Draw journey markers
            journeySteps.forEach((step, index) => {
                // Convert lat/lng to 3D position
                const lat = step.position.lat * Math.PI / 180;
                const lng = (step.position.lng * Math.PI / 180) + rotation;
                
                // Check if marker is on visible side
                const visibility = Math.cos(lng);
                if (visibility < -0.1) return; // Behind globe

                const x = centerX + Math.sin(lng) * Math.cos(lat) * radius;
                const y = centerY - Math.sin(lat) * radius;
                const scale = 0.5 + visibility * 0.5;
                const markerSize = 12 * scale * zoom;

                // Marker glow
                if (step.isActive || step.isCompleted) {
                    const glowSize = markerSize * 3;
                    const markerGlow = ctx.createRadialGradient(x, y, 0, x, y, glowSize);
                    markerGlow.addColorStop(0, step.isActive ? 'rgba(223, 243, 228, 0.6)' : 'rgba(52, 35, 166, 0.4)');
                    markerGlow.addColorStop(1, 'transparent');
                    ctx.fillStyle = markerGlow;
                    ctx.beginPath();
                    ctx.arc(x, y, glowSize, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Marker circle
                ctx.beginPath();
                ctx.arc(x, y, markerSize, 0, Math.PI * 2);
                ctx.fillStyle = step.isActive ? '#DFF3E4' : step.isCompleted ? '#3423A6' : 'rgba(255,255,255,0.3)';
                ctx.fill();

                // Marker border
                ctx.strokeStyle = step.isActive ? '#fff' : 'rgba(255,255,255,0.5)';
                ctx.lineWidth = 2 * scale;
                ctx.stroke();

                // Marker icon/number
                ctx.fillStyle = step.isActive ? '#171738' : '#fff';
                ctx.font = `bold ${10 * scale * zoom}px Inter, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(step.isCompleted ? '✓' : `${index + 1}`, x, y);

                // Connection line to next marker
                if (index < journeySteps.length - 1 && (step.isCompleted || step.isActive)) {
                    const nextStep = journeySteps[index + 1];
                    const nextLat = nextStep.position.lat * Math.PI / 180;
                    const nextLng = (nextStep.position.lng * Math.PI / 180) + rotation;
                    const nextVisibility = Math.cos(nextLng);
                    
                    if (nextVisibility > -0.1) {
                        const nextX = centerX + Math.sin(nextLng) * Math.cos(nextLat) * radius;
                        const nextY = centerY - Math.sin(nextLat) * radius;
                        
                        ctx.beginPath();
                        ctx.moveTo(x, y);
                        
                        // Curved path along globe surface
                        const midX = (x + nextX) / 2;
                        const midY = (y + nextY) / 2 - 20;
                        ctx.quadraticCurveTo(midX, midY, nextX, nextY);
                        
                        ctx.strokeStyle = step.isCompleted ? 'rgba(52, 35, 166, 0.6)' : 'rgba(223, 243, 228, 0.3)';
                        ctx.lineWidth = 2;
                        ctx.setLineDash([5, 5]);
                        ctx.stroke();
                        ctx.setLineDash([]);
                    }
                }
            });

            // Atmosphere effect
            const atmosphereGradient = ctx.createRadialGradient(centerX, centerY, radius * 0.95, centerX, centerY, radius * 1.15);
            atmosphereGradient.addColorStop(0, 'transparent');
            atmosphereGradient.addColorStop(0.5, 'rgba(52, 35, 166, 0.1)');
            atmosphereGradient.addColorStop(1, 'transparent');
            ctx.fillStyle = atmosphereGradient;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius * 1.15, 0, Math.PI * 2);
            ctx.fill();

            // Highlight/shine
            const shineGradient = ctx.createRadialGradient(
                centerX - radius * 0.4, 
                centerY - radius * 0.4, 
                0, 
                centerX - radius * 0.2, 
                centerY - radius * 0.2, 
                radius * 0.8
            );
            shineGradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
            shineGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
            shineGradient.addColorStop(1, 'transparent');
            ctx.fillStyle = shineGradient;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.fill();

            animationRef.current = requestAnimationFrame(drawGlobe);
        };

        // Update targets when props change
        targetRotation = globeRotation.y;
        targetZoom = globeZoom;

        drawGlobe();

        return () => {
            window.removeEventListener('resize', resize);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [globeRotation, globeZoom, journeySteps]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            const newHeight = Math.min(textareaRef.current.scrollHeight, 100);
            textareaRef.current.style.height = newHeight + 'px';
        }
    }, [chatInput]);

    // Typewriter effect for AI explanation
    const typeText = useCallback((text: string, onComplete?: () => void) => {
        setIsTyping(true);
        setAiExplanation('');
        let index = 0;
        
        const interval = setInterval(() => {
            if (index < text.length) {
                setAiExplanation(prev => prev + text[index]);
                index++;
            } else {
                clearInterval(interval);
                setIsTyping(false);
                onComplete?.();
            }
        }, 20);

        return () => clearInterval(interval);
    }, []);

    // Navigate to a journey step
    const navigateToStep = useCallback((stepIndex: number) => {
        if (stepIndex < 0 || stepIndex >= journeySteps.length) return;
        if (isTransitioning) return;

        setIsTransitioning(true);
        const step = journeySteps[stepIndex];

        // Calculate rotation to focus on this marker
        const targetRotationY = -step.position.lng * Math.PI / 180;
        
        // Animate globe rotation
        setGlobeRotation({ x: 0, y: targetRotationY });
        setGlobeZoom(1.2);

        // Update step states
        setJourneySteps(prev => prev.map((s, i) => ({
            ...s,
            isActive: i === stepIndex,
            isCompleted: i < stepIndex
        })));
        setCurrentStepIndex(stepIndex);

        // Type out the explanation
        setTimeout(() => {
            typeText(step.content, () => {
                setIsTransitioning(false);
                setGlobeZoom(1);
            });
        }, 500);
    }, [journeySteps, isTransitioning, typeText]);

    // Handle sending a message - generates a journey
    const handleSendMessage = async (overrideMessage?: string) => {
        const message
