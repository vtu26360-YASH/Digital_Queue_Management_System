package com.queue.digitalqueue.dto;

public record QueueControlResponse(
        boolean queuePaused,
        String message
) {
}
