Doskonały pomysł! Przeniesienie ciężkich obliczeń na serwer to klasyczna i bardzo dobra praktyka w architekturze klient-serwer. Backend w Javie jest idealny do skomplikowanych obliczeń, podczas gdy JavaScript powinien skupić się na tym, co robi najlepiej: manipulacji DOM i renderowaniu grafiki.

Twoje pytanie o "optymalizację i szybkość" jest bardzo trafne, ale musimy je dobrze zinterpretować.

*   **Szybkość obliczeń:** Java (kod skompilowany, działający na serwerze) jest generalnie szybsza w "chrupaniu liczb" niż JavaScript (kod interpretowany/JIT-owany w przeglądarce).
*   **Szybkość (płynność) dla użytkownika:** Tutaj kluczowa jest **minimalizacja komunikacji sieciowej**. Najgorszym pomysłem byłoby proszenie serwera o pozycję obiektu dla *każdej klatki animacji*. Opóźnienie sieciowe (latency) zabiłoby płynność.

**Optymalna strategia jest następująca:**

1.  **Frontend** zbiera wszystkie parametry początkowe od użytkownika.
2.  **Frontend** wysyła jedno żądanie do **backendu** z tymi parametrami.
3.  **Backend** wykonuje *całą symulację od początku do końca*, generując kompletną listę stanów (pozycji w czasie) dla całej trajektorii.
4.  **Backend** odsyła tę kompletną listę (np. jako tablicę JSON) w jednej odpowiedzi.
5.  **Frontend** otrzymuje gotową "taśmę filmową" i jego jedynym zadaniem jest odtwarzanie jej klatka po klatce za pomocą `requestAnimationFrame`.

W ten sposób łączymy zalety obu światów: szybkie, skomplikowane obliczenia w Javie i płynną, niezależną od sieci animację w JavaScripcie.

---

### Krok 1: Rozbudowa Backendu (Java)

Wprowadzimy bardziej zaawansowany model fizyczny, który będzie trudniejszy do zaimplementowania w JS i pokaże siłę backendu. Dodajmy **opór powietrza**.

Równania ruchu stają się teraz równaniami różniczkowymi, ponieważ siła oporu zależy od prędkości. Będziemy je rozwiązywać numerycznie, np. metodą Eulera, która idealnie nadaje się do implementacji w pętli.

**Siła oporu powietrza:** `F_d = -0.5 * ρ * v² * C_d * A`
*   `ρ` (rho) - gęstość powietrza (ok. 1.225 kg/m³)
*   `v` - prędkość obiektu
*   `C_d` - współczynnik oporu (zależy od kształtu, np. 0.47 dla kuli, 1.05 dla sześcianu)
*   `A` - pole powierzchni czołowej

#### 1.1. Nowe DTO (Data Transfer Objects)

Potrzebujemy bardziej rozbudowanych DTO do przekazywania parametrów.

**`SimulationInput.java`** (nowe parametry wejściowe)
```java
// src/main/java/com/example/physicsengine/dto/SimulationInput.java
package com.example.physicsengine.dto;

public class SimulationInput {
    private double initialVelocity; // m/s
    private double initialHeight;   // m
    private double mass;            // kg
    private double dragCoefficient; // C_d (współczynnik oporu)
    private double area;            // m^2 (pole powierzchni czołowej)
    
    // Gettery i Settery
}
```

**`SimulationOutput.java`** (opakowanie na wynik)
```java
// src/main/java/com/example/physicsengine/dto/SimulationOutput.java
package com.example.physicsengine.dto;

import java.util.List;

public class SimulationOutput {
    private List<PhysicsState> trajectory;
    private double totalTime;
    private double maxDistance;

    public SimulationOutput(List<PhysicsState> trajectory, double totalTime, double maxDistance) {
        this.trajectory = trajectory;
        this.totalTime = totalTime;
        this.maxDistance = maxDistance;
    }
    
    // Gettery i Settery
}
```
Klasa `PhysicsState` pozostaje bez zmian.

#### 1.2. Zaktualizowany `PhysicsService`

To jest serce zmian. Implementujemy metodę Eulera do symulacji krok po kroku.

```java
// src/main/java/com/example/physicsengine/service/PhysicsService.java
package com.example.physicsengine.service;

import com.example.physicsengine.dto.PhysicsState;
import com.example.physicsengine.dto.SimulationInput;
import com.example.physicsengine.dto.SimulationOutput;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class PhysicsService {

    private static final double GRAVITY = 9.81;        // m/s^2
    private static final double AIR_DENSITY = 1.225;   // kg/m^3
    private static final double TIME_STEP = 0.01;      // Krok czasowy dla symulacji (dt)
    private static final int MAX_STEPS = 10000;        // Zabezpieczenie przed nieskończoną pętlą

    public SimulationOutput runFullSimulation(SimulationInput params) {
        List<PhysicsState> trajectory = new ArrayList<>();

        // Warunki początkowe
        double x = 0.0;
        double y = params.getInitialHeight();
        double vx = params.getInitialVelocity();
        double vy = 0.0;
        double t = 0.0;

        trajectory.add(new PhysicsState(t, x, y));

        for (int i = 0; i < MAX_STEPS && y > 0; i++) {
            // Obliczanie prędkości i siły oporu
            double v = Math.sqrt(vx * vx + vy * vy);
            double forceDragX = -0.5 * AIR_DENSITY * vx * v * params.getDragCoefficient() * params.getArea();
            double forceDragY = -0.5 * AIR_DENSITY * vy * v * params.getDragCoefficient() * params.getArea();

            // Siły wypadkowe
            double forceNetX = forceDragX;
            double forceNetY = -params.getMass() * GRAVITY + forceDragY;

            // Przyspieszenie (a = F/m)
            double ax = forceNetX / params.getMass();
            double ay = forceNetY / params.getMass();

            // Aktualizacja prędkości (metoda Eulera)
            vx += ax * TIME_STEP;
            vy += ay * TIME_STEP;

            // Aktualizacja pozycji (metoda Eulera)
            x += vx * TIME_STEP;
            y += vy * TIME_STEP;
            
            t += TIME_STEP;

            trajectory.add(new PhysicsState(t, x, Math.max(0, y)));
        }

        double totalTime = t;
        double maxDistance = x;

        return new SimulationOutput(trajectory, totalTime, maxDistance);
    }
}
```

#### 1.3. Zaktualizowany `SimulationController`

Aktualizujemy kontroler, aby używał nowych DTO.

```java
// src/main/java/com/example/physicsengine/controller/SimulationController.java
package com.example.physicsengine.controller;

import com.example.physicsengine.dto.SimulationInput;
import com.example.physicsengine.dto.SimulationOutput;
import com.example.physicsengine.service.PhysicsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/simulation")
@CrossOrigin(origins = "*")
public class SimulationController {

    private final PhysicsService physicsService;

    @Autowired
    public SimulationController(PhysicsService physicsService) {
        this.physicsService = physicsService;
    }

    @PostMapping("/run") // Zmieniamy endpoint na bardziej adekwatny
    public SimulationOutput runSimulation(@RequestBody SimulationInput params) {
        return physicsService.runFullSimulation(params);
    }
}
```

Backend jest teraz znacznie potężniejszy. Cała skomplikowana fizyka jest zamknięta w Javie.

---

### Krok 2: Uproszczenie Frontendu (JavaScript)

Frontend staje się teraz "głupim" rendererem. Jego jedynym zadaniem jest zebranie danych, wysłanie ich, odebranie gotowej trajektorii i jej narysowanie.

#### 2.1. Zaktualizowany `index.html`

Dodajemy nowe pola do formularza.

```html
<!-- frontend/index.html -->
<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <title>Symulacja Fizyczna</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <h1>Symulacja Fizyczna z Oporem Powietrza</h1>
    <div class="container">
        <div class="controls">
            <h2>Parametry</h2>
            <label for="initialVelocity">Prędkość początkowa (m/s):</label>
            <input type="number" id="initialVelocity" value="50">

            <label for="initialHeight">Wysokość początkowa (m):</label>
            <input type="number" id="initialHeight" value="150">

            <label for="mass">Masa (kg):</label>
            <input type="number" id="mass" value="10">

            <label for="shape">Kształt obiektu:</label>
            <select id="shape">
                <option value="sphere">Kula (C_d=0.47)</option>
                <option value="cube">Sześcian (C_d=1.05)</option>
            </select>

            <label for="area">Pole powierzchni (m²):</label>
            <input type="number" id="area" value="0.1">
            
            <button id="startButton">Start Symulacji</button>
            <div id="results"></div>
        </div>
        <div class="simulation-area">
            <canvas id="simulationCanvas" width="800" height="600"></canvas>
        </div>
    </div>
    <script src="script.js"></script>
</body>
</html>
```

#### 2.2. Zaktualizowany `script.js`

Kod JavaScript jest teraz znacznie prostszy i nie zawiera żadnej logiki fizycznej.

```javascript
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
```

### Podsumowanie korzyści z tej architektury:

1.  **Centralizacja logiki:** Cała fizyka, nawet ta skomplikowana, jest w jednym miejscu (`PhysicsService.java`). Łatwo ją modyfikować, testować i rozszerzać bez dotykania frontendu.
2.  **Wydajność:** Ciężkie obliczenia numeryczne (pętla w `runFullSimulation`) są wykonywane przez zoptymalizowaną maszynę wirtualną Javy na serwerze, a nie w przeglądarce użytkownika.
3.  **Płynność animacji:** Animacja na froncie jest niezależna od złożoności obliczeń. Nawet jeśli symulacja na serwerze trwa 2 sekundy, po jej zakończeniu animacja będzie idealnie płynna (60 FPS), ponieważ przeglądarka tylko odtwarza gotowe klatki.
4.  **Czysty podział obowiązków:**
    *   **Java (Backend):** Myśli i liczy.
    *   **JavaScript (Frontend):** Prezentuje i animuje.
5.  **Skalowalność:** Możesz teraz dodać do backendu jeszcze bardziej złożone zjawiska (np. efekt Magnusa dla obracającej się kuli, zmienną gęstość powietrza z wysokością), a frontend wciąż będzie potrzebował tylko tablicy punktów `(t, x, y)` do narysowania.