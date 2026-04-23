package com.queue.digitalqueue.dto;

import java.util.List;

public record DashboardResponse(
        long totalTokensToday,
        long tokensServedToday,
        long tokensWaiting,
        double averageWaitMinutes,
        boolean queuePaused,
        String peakTimeLabel,
        TokenResponse currentlyServing,
        List<ServiceQueueSnapshotResponse> serviceQueues,
        List<String> trendLabels,
        List<Long> arrivalTrend,
        List<Long> servedTrend,
        List<TokenResponse> recentActivity
) {
}
