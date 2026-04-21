package com.queue.digitalqueue.dto;

public record AdminAuthResponse(
        boolean authenticated,
        String username,
        String message
) {
}
