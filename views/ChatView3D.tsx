// views/ChatView3D.tsx
import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Sphere, Line } from '@react-three/drei';
import * as THREE from 'three';

interface JourneyStep {
    id: string;
    title: string;
    content: string;
    position: { lat: number; lng: number };
    isActive: boolean;
    isCompleted: boolean;
}

const latLngToVector3 = (lat: number, lng: number, radius: number): THREE.Vector3 => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);
    return new THREE.Vector3(x, y, z);
};

function WireframeGlobe() {
    const meshRef = useRef<THREE.Group>(null);
    
    useFrame(() => {
        if (meshRef.current) {
            meshRef.current.rotation.y += 0.001;
        }
    });

    const latLines = useMemo(() => {
        const lines = [];
        for (let lat = -60; lat <= 60; lat += 30) {
            const points: THREE.Vector3[] = [];
            for (let lng = 0; lng <= 360; lng += 5) {
                points.push(latLngToVector3(lat, lng, 2));
            }
            lines.push(points);
        }
        return lines;
    }, []);

    const lngLines = useMemo(() => {
        const lines = [];
        for (let lng = 0; lng < 360; lng += 30) {
            const points: THREE.Vector3[] = [];
            for (let lat = -90; lat <= 90; lat += 5) {
                points.push(latLngToVector3(lat, lng, 2));
            }
            lines.push(points);
        }
        return lines;
    }, []);

    const equator = useMemo(() => 
        Array.from({ length: 73 }, (_, i) => latLngToVector3(0, i * 5, 2))
    , []);

    return (
        <group ref={meshRef}>
            <Sphere args={[1.98, 32, 32]}>
                <meshBasicMaterial color="#050508" transparent opacity={0.9} />
            </Sphere>
            
            <Sphere args={[2.15, 32, 32]}>
                <meshBasicMaterial color="#ffffff" transparent opacity={0.02} />
            </Sphere>

            {latLines.map((points, i) => (
                <Line key={`lat-${i}`} points={points} color="#ffffff" lineWidth={0.5} transparent opacity={0.15} />
            ))}

            {lngLines.map((points, i) => (
                <Line key={`lng-${i}`} points={points} color="#ffffff" lineWidth={0.5} transparent opacity={0.15} />
            ))}

            <Line points={equator} color="#ffffff" lineWidth={1} transparent opacity={0.25} />
        </group>
    );
}

function JourneyMarker({ step, index, isActive, isCompleted, onClick }: { 
    step: JourneyStep; index: number; isActive: boolean; isCompleted: boolean; onClick: () => void;
}) {
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
            {isActive && (
                <mesh ref={glowRef}>
                    <sphereGeometry args={[0.15, 16, 16]} />
                    <meshBasicMaterial color="#ffffff" transparent opacity={0.3} />
                </mesh>
            )}
            
            <mesh onClick={onClick}>
                <sphereGeometry args={[0.08, 16, 16]} />
                <meshBasicMaterial color={isActive ? "#ffffff" : isCompleted ? "#888888" : "#444444"} />
            </mesh>

            <mesh>
                <ringGeometry args={[0.1, 0.12, 32]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={isActive ? 0.8 : 0.3} side={THREE.DoubleSide} />
            </mesh>
        </group>
    );
}

function ConnectionLines({ steps }: { steps: JourneyStep[] }) {
    if (steps.length < 2) return null;
    const points = steps.map(step => latLngToVector3(step.position.lat, step.position.lng, 2.05));
    return <Line points={points} color="#ffffff" lineWidth={1} transparent opacity={0.3} dashed dashSize={0.1} gapSize={0.05} />;
}

function Stars() {
    const starsRef = useRef<THREE.Points>(null);
    
    const starPositions = useMemo(() => {
        const positions = new Float32Array(500 * 3);
        for (let i = 0; i < 500; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 50;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 50;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 50;
        }
        return positions;
    }, []);

    useFrame(() => {
        if (starsRef.current) starsRef.current.rotation.y += 0.0001;
    });

    return (
        <points ref={starsRef}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={500} array={starPositions} itemSize={3} />
            </bufferGeometry>
            <pointsMaterial size={0.05} color="#ffffff" transparent opacity={0.6} />
        </points>
    );
}

function Scene({ journeySteps, currentStepIndex, onMarkerClick }: { 
    journeySteps: JourneyStep[]; currentStepIndex: number; onMarkerClick: (index: number) => void;
}) {
    return (
        <>
            <ambientLight intensity={0.5} />
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

            <OrbitControls enableZoom={false} enablePan={false} rotateSpeed={0.5} />
        </>
    );
}

export default function ThreeCanvas({ journeySteps, currentStepIndex, onMarkerClick }: {
    journeySteps: JourneyStep[]; currentStepIndex: number; onMarkerClick: (index: number) => void;
}) {
    return (
        <Canvas camera={{ position: [5, 2, 5], fov: 45 }}>
            <Scene journeySteps={journeySteps} currentStepIndex={currentStepIndex} onMarkerClick={onMarkerClick} />
        </Canvas>
    );
}
