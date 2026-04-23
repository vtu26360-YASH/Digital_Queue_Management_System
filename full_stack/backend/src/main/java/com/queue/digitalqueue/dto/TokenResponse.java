package com.queue.digitalqueue.dto;

import java.time.LocalDateTime;

public record TokenResponse(
        Long id,
        String name,
        int tokenNumber,
        String status,
        String serviceType,
        String priorityLevel,
        LocalDateTime createdTime,
        LocalDateTime servedTime,
        Integer queuePosition,
        Long estimatedWaitMinutes,
        boolean nearTurn
) {
}
