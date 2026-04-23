package com.queue.digitalqueue.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateTokenRequest(
        @NotBlank(message = "Name is required")
        @Size(max = 100, message = "Name must be at most 100 characters")
        String name,
        @NotBlank(message = "Service type is required")
        String serviceType,
        @NotNull(message = "Priority level is required")
        String priorityLevel
) {
}
