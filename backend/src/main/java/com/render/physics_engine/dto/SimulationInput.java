package com.render.physics_engine.dto;

public class SimulationInput {
    private double initialVelocity; // m/s
    private double initialHeight;   // m
    private double mass;            // kg
    private double dragCoefficient; // C_d (współczynnik oporu)
    private double area;            // m^2 (pole powierzchni czołowej)

    public double getInitialVelocity() {
        return initialVelocity;
    }

    public void setInitialVelocity(double initialVelocity) {
        this.initialVelocity = initialVelocity;
    }

    public double getInitialHeight() {
        return initialHeight;
    }

    public void setInitialHeight(double initialHeight) {
        this.initialHeight = initialHeight;
    }

    public double getMass() {
        return mass;
    }

    public void setMass(double mass) {
        this.mass = mass;
    }

    public double getDragCoefficient() {
        return dragCoefficient;
    }

    public void setDragCoefficient(double dragCoefficient) {
        this.dragCoefficient = dragCoefficient;
    }

    public double getArea() {
        return area;
    }

    public void setArea(double area) {
        this.area = area;
    }
}
