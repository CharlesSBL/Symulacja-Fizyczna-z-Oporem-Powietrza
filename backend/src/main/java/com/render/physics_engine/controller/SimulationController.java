package com.render.physics_engine.controller;

import com.render.physics_engine.dto.SimulationInput;
import com.render.physics_engine.dto.SimulationOutput;
import com.render.physics_engine.service.PhysicsService;
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