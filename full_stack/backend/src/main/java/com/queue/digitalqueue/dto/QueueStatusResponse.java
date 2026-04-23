package com.queue.digitalqueue.dto;

import java.util.List;

public record QueueStatusResponse(
        TokenResponse currentlyServing,
        List<TokenResponse> waitingTokens,
        long waitingCount,
        Integer nextTokenNumber,
        double averageWaitMinutes,
        boolean queuePaused,
        long servedCount,
        List<ServiceQueueSnapshotResponse> serviceQueues
) {
}
