package com.queue.digitalqueue.dto;

public record ServiceQueueSnapshotResponse(
        String serviceType,
        long waitingCount,
        Integer nextTokenNumber,
        double estimatedWaitMinutes,
        TokenResponse currentServing
) {
}
