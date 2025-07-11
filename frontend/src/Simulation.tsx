// Simulation.tsx
import React, { useRef, useState } from 'react';
import './Simulation.css'; // Assuming you have a corresponding CSS file

interface SimulationState {
    positionX: number;
    positionY: number;
}

interface SimulationResult {
    totalTime: number;
    maxDistance: number;
    trajectory: SimulationState[];
}

const Simulation: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [results, setResults] = useState<string>("");
    const animationFrameIdRef = useRef<number>(0);
    const dragCoefficients = {
        sphere: 0.47,
        cube: 1.05,
    };

    const animateTrajectory = (trajectory: SimulationState[]) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let currentFrame = 0;
        const maxX = trajectory[trajectory.length - 1].positionX;
        const maxY = trajectory[0].positionY;
        const scaleX = canvas.width / (maxX * 1.1);
        const scaleY = (canvas.height - 20) / (maxY * 1.1);
        const scale = Math.min(scaleX, scaleY);

        const renderFrame = () => {
            if (currentFrame >= trajectory.length) {
                if (animationFrameIdRef.current) {
                    cancelAnimationFrame(animationFrameIdRef.current);
                }
                return;
            }

            const state = trajectory[currentFrame];
            const h0 = trajectory[0].positionY;

            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#e9f5ff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#4CAF50';
                ctx.fillRect(0, canvas.height - 20, canvas.width, 20);
                ctx.fillStyle = '#8D6E63';
                const platformY = canvas.height - (h0 * scale) - 20;
                ctx.fillRect(0, platformY, 50, h0 * scale);

                const canvasX = state.positionX * scale;
                const canvasY = canvas.height - (state.positionY * scale) - 20;

                ctx.fillStyle = 'red';
                ctx.beginPath();
                ctx.arc(canvasX, canvasY, 5, 0, 2 * Math.PI);
                ctx.fill();
            }

            currentFrame++;
            animationFrameIdRef.current = requestAnimationFrame(renderFrame);
        };

        renderFrame();
    };

    const startSimulation = async () => {
        if (animationFrameIdRef.current) {
            cancelAnimationFrame(animationFrameIdRef.current);
        }

        setResults("Obliczanie...");

        const shape = (document.getElementById('shape') as HTMLSelectElement).value;
        const params = {
            initialVelocity: parseFloat((document.getElementById('initialVelocity') as HTMLInputElement).value),
            initialHeight: parseFloat((document.getElementById('initialHeight') as HTMLInputElement).value),
            mass: parseFloat((document.getElementById('mass') as HTMLInputElement).value),
            dragCoefficient: dragCoefficients[shape as keyof typeof dragCoefficients],
            area: parseFloat((document.getElementById('area') as HTMLInputElement).value),
        };

        try {
            const response = await fetch('http://localhost:8080/api/simulation/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params),
            });

            if (!response.ok) throw new Error(`Błąd serwera: ${response.statusText}`);

            const result: SimulationResult = await response.json();

            setResults(`
                <p>Całkowity czas lotu: ${result.totalTime.toFixed(2)} s</p>
                <p>Maksymalny zasięg: ${result.maxDistance.toFixed(2)} m</p>
            `);

            animateTrajectory(result.trajectory);
        } catch (error) {
            console.error('Błąd symulacji:', error);
            setResults(`<p style="color: red;">Błąd: ${(error as Error).message}</p>`);
        }
    };

    return (
        <div>
            <h1>Symulacja Fizyczna z Oporem Powietrza</h1>
            <div className="container">
                <div className="controls">
                    <h2>Parametry</h2>
                    <label htmlFor="initialVelocity">Prędkość początkowa (m/s):</label>
                    <input type="number" id="initialVelocity" defaultValue="50" />
                    <label htmlFor="initialHeight">Wysokość początkowa (m):</label>
                    <input type="number" id="initialHeight" defaultValue="150" />
                    <label htmlFor="mass">Masa (kg):</label>
                    <input type="number" id="mass" defaultValue="10" />
                    <label htmlFor="shape">Kształt obiektu:</label>
                    <select id="shape" defaultValue="sphere">
                        <option value="sphere">Kula (C_d=0.47)</option>
                        <option value="cube">Sześcian (C_d=1.05)</option>
                    </select>
                    <label htmlFor="area">Pole powierzchni (m²):</label>
                    <input type="number" id="area" defaultValue="0.1" />
                    <button id="startButton" onClick={startSimulation}>Start Symulacji</button>
                    <div id="results" dangerouslySetInnerHTML={{ __html: results }} />
                </div>
                <div className="simulation-area">
                    <canvas ref={canvasRef} id="simulationCanvas" width="800" height="600"></canvas>
                </div>
            </div>
        </div>
    );
};

export default Simulation;
