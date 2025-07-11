// frontend/script.js
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('simulationCanvas');
    const ctx = canvas.getContext('2d');
    const startButton = document.getElementById('startButton');
    const resultsDiv = document.getElementById('results');

    // Mapowanie kształtów na współczynniki oporu
    const dragCoefficients = {
        sphere: 0.47,
        cube: 1.05
    };

    let animationFrameId;

    // Funkcja rysująca jest teraz BARDZO prosta.
    // Otrzymuje gotową trajektorię i tylko ją odtwarza.
    function animateTrajectory(trajectory) {
        let currentFrame = 0;

        // Skalowanie, aby trajektoria zmieściła się na canvasie
        const maxX = trajectory[trajectory.length - 1].positionX;
        const maxY = trajectory[0].positionY;
        const scaleX = canvas.width / (maxX * 1.1);
        const scaleY = (canvas.height - 20) / (maxY * 1.1);
        const scale = Math.min(scaleX, scaleY);

        function renderFrame() {
            if (currentFrame >= trajectory.length) {
                cancelAnimationFrame(animationFrameId);
                return;
            }

            const state = trajectory[currentFrame];
            const h0 = trajectory[0].positionY;

            // Rysowanie tła (ziemia i platforma)
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#e9f5ff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#4CAF50';
            ctx.fillRect(0, canvas.height - 20, canvas.width, 20);
            ctx.fillStyle = '#8D6E63';
            const platformY = canvas.height - (h0 * scale) - 20;
            ctx.fillRect(0, platformY, 50, h0 * scale);

            // Przeliczanie współrzędnych fizycznych na współrzędne canvas
            const canvasX = state.positionX * scale;
            const canvasY = canvas.height - (state.positionY * scale) - 20;

            // Rysowanie obiektu
            ctx.fillStyle = 'red';
            ctx.beginPath();
            ctx.arc(canvasX, canvasY, 5, 0, 2 * Math.PI); // Rysujemy kółko
            ctx.fill();

            currentFrame++;
            animationFrameId = requestAnimationFrame(renderFrame);
        }

        renderFrame();
    }

    async function startSimulation() {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        resultsDiv.innerHTML = "Obliczanie...";

        const shape = document.getElementById('shape').value;
        const params = {
            initialVelocity: parseFloat(document.getElementById('initialVelocity').value),
            initialHeight: parseFloat(document.getElementById('initialHeight').value),
            mass: parseFloat(document.getElementById('mass').value),
            dragCoefficient: dragCoefficients[shape],
            area: parseFloat(document.getElementById('area').value),
        };

        try {
            // JEDNO zapytanie do backendu
            const response = await fetch('http://localhost:8080/api/simulation/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params),
            });

            if (!response.ok) throw new Error(`Błąd serwera: ${response.statusText}`);

            // Odbieramy gotowy wynik
            const result = await response.json();

            // Wyświetlamy podsumowanie
            resultsDiv.innerHTML = `
                <p>Całkowity czas lotu: ${result.totalTime.toFixed(2)} s</p>
                <p>Maksymalny zasięg: ${result.maxDistance.toFixed(2)} m</p>
            `;

            // Uruchamiamy animację na podstawie gotowych danych
            animateTrajectory(result.trajectory);

        } catch (error) {
            console.error('Błąd symulacji:', error);
            resultsDiv.innerHTML = `<p style="color: red;">Błąd: ${error.message}</p>`;
        }
    }

    startButton.addEventListener('click', startSimulation);
});