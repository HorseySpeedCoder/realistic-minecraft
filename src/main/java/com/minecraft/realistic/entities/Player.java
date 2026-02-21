package com.minecraft.realistic.entities;

public class Player extends Entity {
    private int health;
    private int hunger;
    private float gravity;

    public Player() {
        this.health = 100; // Default health
        this.hunger = 100; // Default hunger
        this.gravity = 9.8f; // Default gravity
    }

    // Player-specific update logic
    public void update() {
        // Update logic goes here, for example:
        if (hunger > 0) {
            // Logic related to player actions that would consume hunger
            hunger--;
        }
        // Other update logic
    }

    // Getters and setters for health, hunger, and gravity
    public int getHealth() {
        return health;
    }

    public void setHealth(int health) {
        this.health = health;
    }

    public int getHunger() {
        return hunger;
    }

    public void setHunger(int hunger) {
        this.hunger = hunger;
    }

    public float getGravity() {
        return gravity;
    }

    public void setGravity(float gravity) {
        this.gravity = gravity;
    }
}