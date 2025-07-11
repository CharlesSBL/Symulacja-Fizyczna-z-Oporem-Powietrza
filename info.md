Doskonale! To świetny pomysł na projekt, który łączy w sobie fizykę, programowanie backendowe i frontendowe. Wybrany stos technologiczny jest jak najbardziej odpowiedni. Spring Boot uprości stworzenie API, a oddzielenie logiki obliczeniowej od prezentacji to bardzo dobra praktyka inżynierska.

Przeprowadzę Cię krok po kroku przez realizację tego projektu, od struktury, przez kod backendu, aż po kod frontendu.

---

### Krok 1: Struktura Projektu

Zacznijmy od zorganizowania plików. Dobrym pomysłem jest stworzenie jednego nadrzędnego folderu dla całego projektu, a w nim dwóch podfolderów: `backend` i `frontend`.

```
symulacja-fizyczna/
├── backend/         // Projekt Spring Boot (Maven)
│   ├── src/
│   └── pom.xml
└── frontend/        // Pliki HTML, CSS, JS
    ├── index.html
    ├── style.css
    └── script.js
```

---

### Krok 2: Backend - Silnik Fizyczny w Spring Boot

Backend będzie odpowiedzialny za przyjmowanie parametrów początkowych i obliczanie trajektorii lotu.

#### 2.1. Inicjalizacja projektu Spring Boot

Użyj [Spring Initializr](https://start.spring.io/), aby wygenerować szkielet projektu.
*   **Project:** Maven Project
*   **Language:** Java
*   **Spring Boot:** Najnowsza stabilna wersja
*   **Group:** `com.example` (lub własna nazwa)
*   **Artifact:** `physics-engine`
*   **Dependencies:** `Spring Web`

Pobierz wygenerowany plik `.zip`, rozpakuj go i umieść w folderze `backend`.

#### 2.2. Model fizyczny (zasady rzutu poziomego)

W rzucie poziomym ruch rozkładamy na dwie składowe:
1.  **Ruch w osi X (poziomy):** Jest to ruch jednostajny prostoliniowy.
    *   `x(t) = v₀ * t`
2.  **Ruch w osi Y (pionowy):** Jest to spadek swobodny (ruch jednostajnie przyspieszony).
    *   `y(t) = h₀ - (1/2) * g * t²`

Gdzie:
*   `v₀` - prędkość początkowa (w kierunku osi X)
*   `h₀` - wysokość początkowa
*   `g` - przyspieszenie ziemskie (ok. 9.81 m/s²)
*   `t` - czas

#### 2.3. Tworzenie klas DTO (Data Transfer Object)

Stworzymy klasy, które będą reprezentować dane przesyłane między frontendem a backendem.

**`SimulationParameters.java`** (parametry wejściowe od użytkownika)
```java
// src/main/java/com/example/physicsengine/dto/SimulationParameters.java
package com.example.physicsengine.dto;

public class SimulationParameters {
    private double initialVelocity; // v₀
    private double initialHeight;   // h₀
    private double timeStep;        // Krok czasowy (np. 0.05s)
    private double totalTime;       // Całkowity czas symulacji

    // Gettery i Settery
    // ...
}
```

**`PhysicsState.java`** (stan obiektu w danym punkcie czasu)
```java
// src/main/java/com/example/physicsengine/dto/PhysicsState.java
package com.example.physicsengine.dto;

public class PhysicsState {
    private double time;
    private double positionX;
    private double positionY;

    public PhysicsState(double time, double positionX, double positionY) {
        this.time = time;
        this.positionX = positionX;
        this.positionY = positionY;
    }

    // Gettery i Settery
    // ...
}
```

#### 2.4. Serwis Obliczeniowy (PhysicsService)

To serce naszego silnika. Tutaj umieścimy logikę obliczeniową.

```java
// src/main/java/com/example/physicsengine/service/PhysicsService.java
package com.example.physicsengine.service;

import com.example.physicsengine.dto.PhysicsState;
import com.example.physicsengine.dto.SimulationParameters;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class PhysicsService {

    private static final double GRAVITY = 9.81; // Przyspieszenie ziemskie g

    public List<PhysicsState> calculateTrajectory(SimulationParameters params) {
        List<PhysicsState> trajectory = new ArrayList<>();
        double v0 = params.getInitialVelocity();
        double h0 = params.getInitialHeight();

        // Obliczamy całkowity czas spadania, jeśli nie został podany
        // y(t) = 0 => h0 = 0.5 * g * t^2 => t = sqrt(2*h0/g)
        double timeOfFlight = Math.sqrt(2 * h0 / GRAVITY);

        // Używamy krótszego z czasów: podanego przez usera lub obliczonego
        double simulationDuration = Math.min(params.getTotalTime(), timeOfFlight);

        for (double t = 0; t <= simulationDuration; t += params.getTimeStep()) {
            double x = v0 * t;
            double y = h0 - 0.5 * GRAVITY * t * t;

            // Dodajemy stan do trajektorii, upewniając się, że nie spadnie poniżej zera
            trajectory.add(new PhysicsState(t, x, Math.max(0, y)));
        }
        
        // Upewnij się, że ostatni punkt jest na ziemi (y=0)
        if (simulationDuration == timeOfFlight) {
             double x_final = v0 * timeOfFlight;
             trajectory.add(new PhysicsState(timeOfFlight, x_final, 0));
        }

        return trajectory;
    }
}
```

#### 2.5. Kontroler REST (SimulationController)

To jest "brama" do naszego backendu. Frontend będzie wysyłał żądania HTTP do tego kontrolera.

```java
// src/main/java/com/example/physicsengine/controller/SimulationController.java
package com.example.physicsengine.controller;

import com.example.physicsengine.dto.PhysicsState;
import com.example.physicsengine.dto.SimulationParameters;
import com.example.physicsengine.service.PhysicsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/simulation")
// Ważne! Umożliwia komunikację z frontendem działającym na innym porcie (np. z Live Server)
@CrossOrigin(origins = "*") 
public class SimulationController {

    private final PhysicsService physicsService;

    @Autowired
    public SimulationController(PhysicsService physicsService) {
        this.physicsService = physicsService;
    }

    @PostMapping("/calculate")
    public List<PhysicsState> getTrajectory(@RequestBody SimulationParameters params) {
        return physicsService.calculateTrajectory(params);
    }
}
```

Teraz backend jest gotowy. Po uruchomieniu aplikacji Spring Boot (np. przez `mvn spring-boot:run` w terminalu w folderze `backend`), będzie on nasłuchiwał na porcie 8080 na żądania POST pod adresem `/api/simulation/calculate`.

---

### Krok 3: Frontend - Wizualizacja w HTML/CSS/JS

Frontend będzie miał formularz do wprowadzania danych, płótno (`<canvas>`) do rysowania i kod JavaScript, który połączy wszystko w całość.

#### 3.1. `index.html`

```html
<!-- frontend/index.html -->
<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Symulacja Rzutu Poziomego</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <h1>Symulacja Rzutu Poziomego</h1>

    <div class="container">
        <div class="controls">
            <h2>Parametry</h2>
            <label for="initialVelocity">Prędkość początkowa (m/s):</label>
            <input type="number" id="initialVelocity" value="20">

            <label for="initialHeight">Wysokość początkowa (m):</label>
            <input type="number" id="initialHeight" value="100">
            
            <button id="startButton">Start Symulacji</button>
        </div>

        <div class="simulation-area">
            <canvas id="simulationCanvas" width="800" height="600"></canvas>
        </div>
    </div>

    <script src="script.js"></script>
</body>
</html>
```

#### 3.2. `style.css` (proste stylowanie)

```css
/* frontend/style.css */
body {
    font-family: sans-serif;
    background-color: #f0f0f0;
    color: #333;
}
.container {
    display: flex;
    gap: 20px;
    padding: 20px;
}
.controls {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 20px;
    background-color: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.controls label {
    font-weight: bold;
}
.controls input {
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
}
.controls button {
    padding: 10px;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
}
.controls button:hover {
    background-color: #0056b3;
}
#simulationCanvas {
    border: 1px solid #ccc;
    background-color: #e9f5ff; /* Jasnoniebieskie tło nieba */
}
```

#### 3.3. `script.js` (logika frontendu)

To jest najważniejsza część frontendu. Użyjemy `fetch` do komunikacji z API i `Canvas API` do rysowania.

```javascript
// frontend/script.js
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('simulationCanvas');
    const ctx = canvas.getContext('2d');

    const startButton = document.getElementById('startButton');
    const velocityInput = document.getElementById('initialVelocity');
    const heightInput = document.getElementById('initialHeight');

    let trajectory = [];
    let animationFrameId;
    let currentFrame = 0;

    // Funkcja do rysowania tła i osi
    function drawBackground(scale, h0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Rysowanie "ziemi"
        ctx.fillStyle = '#4CAF50'; // Zielony
        ctx.fillRect(0, canvas.height - 20, canvas.width, 20);

        // Rysowanie wieży/platformy startowej
        ctx.fillStyle = '#8D6E63'; // Brązowy
        const platformY = canvas.height - (h0 * scale) - 20;
        ctx.fillRect(0, platformY, 50, h0 * scale);
    }

    // Główna funkcja rysująca
    function draw(scale) {
        if (currentFrame >= trajectory.length) {
            cancelAnimationFrame(animationFrameId);
            return;
        }

        const state = trajectory[currentFrame];
        const h0 = trajectory[0].positionY; // Wysokość początkowa

        drawBackground(scale, h0);

        // Przeliczanie współrzędnych fizycznych na współrzędne canvas
        // Oś Y w canvas jest odwrócona (0 jest na górze)
        const canvasX = state.positionX * scale;
        const canvasY = canvas.height - (state.positionY * scale) - 20; // -20 to grubość ziemi

        // Rysowanie obiektu (kwadrat)
        ctx.fillStyle = 'red';
        ctx.fillRect(canvasX, canvasY - 10, 10, 10); // Rysujemy kwadrat 10x10

        // Rysowanie śladu trajektorii
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        for (let i = 0; i < currentFrame; i++) {
            const pastState = trajectory[i];
            const pastX = pastState.positionX * scale;
            const pastY = canvas.height - (pastState.positionY * scale) - 20;
            ctx.fillRect(pastX, pastY, 2, 2);
        }

        currentFrame++;
        animationFrameId = requestAnimationFrame(() => draw(scale));
    }

    async function startSimulation() {
        // Anuluj poprzednią animację, jeśli istnieje
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }

        const params = {
            initialVelocity: parseFloat(velocityInput.value),
            initialHeight: parseFloat(heightInput.value),
            timeStep: 0.02, // Mniejszy krok dla płynniejszej animacji
            totalTime: 20,  // Maksymalny czas symulacji
        };

        try {
            const response = await fetch('http://localhost:8080/api/simulation/calculate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(params),
            });

            if (!response.ok) {
                throw new Error(`Błąd serwera: ${response.statusText}`);
            }

            trajectory = await response.json();
            
            if (trajectory.length === 0) {
                alert("Brak danych do symulacji. Sprawdź parametry.");
                return;
            }

            // Skalowanie, aby trajektoria zmieściła się na canvasie
            const maxX = trajectory[trajectory.length - 1].positionX;
            const maxY = trajectory[0].positionY;
            const scaleX = canvas.width / (maxX * 1.1); // 10% marginesu
            const scaleY = (canvas.height - 20) / (maxY * 1.1);
            const scale = Math.min(scaleX, scaleY);

            currentFrame = 0;
            draw(scale);

        } catch (error) {
            console.error('Nie udało się pobrać danych symulacji:', error);
            alert('Nie udało się uruchomić symulacji. Sprawdź, czy serwer backendowy jest włączony.');
        }
    }

    startButton.addEventListener('click', startSimulation);
});
```

---

### Jak to wszystko uruchomić?

1.  **Backend:** Otwórz terminal w folderze `backend` i uruchom polecenie `mvn spring-boot:run`. Serwer powinien wystartować na `http://localhost:8080`.
2.  **Frontend:** Otwórz folder `frontend` w edytorze kodu (np. VS Code). Zainstaluj rozszerzenie "Live Server" i kliknij "Go Live" (lub po prostu otwórz plik `index.html` bezpośrednio w przeglądarce).
3.  **Testowanie:** Otwórz stronę w przeglądarce, ustaw parametry i kliknij "Start Symulacji". Powinieneś zobaczyć animację spadającego kwadratu.

### Dalsze kroki i pomysły na rozwój:

*   **Wybór obiektu:** Dodaj w HTML `select` z opcjami "Kwadrat" i "Kula" i przekazuj ten wybór do backendu. W JS rysuj odpowiedni kształt (`ctx.arc` dla koła).
*   **Opór powietrza:** Dodaj do modelu fizycznego siłę oporu powietrza, która zależy od prędkości. To uczyni symulację bardziej realistyczną.
*   **Rzut ukośny:** Rozbuduj model o rzut ukośny, dodając parametr kąta początkowego.
*   **Wykresy:** Użyj biblioteki takiej jak `Chart.js`, aby rysować wykresy prędkości lub energii w czasie.
*   **Interaktywność:** Pozwól użytkownikowi "przeciągnąć" punkt startowy myszką na canvasie.
*   **Testy jednostkowe:** Napisz testy dla `PhysicsService`, aby upewnić się, że obliczenia są poprawne.

Ten projekt to fantastyczna baza do nauki i dalszej rozbudowy. Powodzenia