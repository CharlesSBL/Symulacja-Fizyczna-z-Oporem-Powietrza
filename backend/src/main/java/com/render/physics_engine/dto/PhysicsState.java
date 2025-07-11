package com.render.physics_engine.dto;

public class PhysicsState {
    private double time;
    private double positionX;
    private double positionY;

    public PhysicsState(double time, double positionX, double positionY) {
        this.time = time;
        this.positionX = positionX;
        this.positionY = positionY;
    }

    public double getTime() {
        return time;
    }

    public double getPositionX() {
        return positionX;
    }

    public double getPositionY() {
        return positionY;
    }

    public void setTime(double time) {
        this.time = time;
    }

    public void setPositionX(double positionX) {
        this.positionX = positionX;
    }

    public void setPositionY(double positionY) {
        this.positionY = positionY;
    }
}
