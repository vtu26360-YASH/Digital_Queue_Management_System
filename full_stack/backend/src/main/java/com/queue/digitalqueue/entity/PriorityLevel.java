package com.queue.digitalqueue.entity;

public enum PriorityLevel {
    NORMAL(1),
    VIP(2),
    EMERGENCY(3);

    private final int weight;

    PriorityLevel(int weight) {
        this.weight = weight;
    }

    public int getWeight() {
        return weight;
    }
}
