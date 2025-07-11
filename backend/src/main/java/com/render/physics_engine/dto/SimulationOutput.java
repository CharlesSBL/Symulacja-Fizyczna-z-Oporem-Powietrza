package com.render.physics_engine.dto;

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

    public List<PhysicsState> getTrajectory() {
        return trajectory;
    }

    public void setTrajectory(List<PhysicsState> trajectory) {
        this.trajectory = trajectory;
    }

    public double getTotalTime() {
        return totalTime;
    }

    public void setTotalTime(double totalTime) {
        this.totalTime = totalTime;
    }

    public double getMaxDistance() {
        return maxDistance;
    }

    public void setMaxDistance(double maxDistance) {
        this.maxDistance = maxDistance;
    }
}
