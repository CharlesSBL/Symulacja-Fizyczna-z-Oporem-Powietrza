package com.render.physics_engine.service;

import com.render.physics_engine.dto.PhysicsState;
import com.render.physics_engine.dto.SimulationInput;
import com.render.physics_engine.dto.SimulationOutput;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class PhysicsService {

    private static final double GRAVITY = 9.81; // m/s^2
    private static final double AIR_DENSITY = 1.225; // kg/m^3
    private static final double TIME_STEP = 0.01; // Krok czasowy dla symulacji (dt)
    private static final int MAX_STEPS = 10000; // Zabezpieczenie przed nieskończoną pętlą

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
