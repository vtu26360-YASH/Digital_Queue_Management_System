package com.queue.digitalqueue.dto;

import jakarta.validation.constraints.NotBlank;

public record AdminLoginRequest(
        @NotBlank(message = "Username hjghjfhjfhjfj is required")
        String username,
        @NotBlank(message = "Password is required")
        String password
) {
}
