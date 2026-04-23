package com.queue.digitalqueue.dto;

public record StatsResponse(
        long totalTokensToday,
        long servedCount,
        long waitingCount,
        int maxQueueSize,
        boolean queueFull
) {
}
