package com.queue.digitalqueue.service;

import com.queue.digitalqueue.dto.CreateTokenRequest;
import com.queue.digitalqueue.dto.DashboardResponse;
import com.queue.digitalqueue.dto.QueueControlResponse;
import com.queue.digitalqueue.dto.QueueStatusResponse;
import com.queue.digitalqueue.dto.TokenResponse;
import java.util.List;

public interface TokenService {

    TokenResponse createToken(CreateTokenRequest request);

    List<TokenResponse> getAllTokens();

    TokenResponse getCurrentServing();

    TokenResponse serveNextToken(String serviceType);

    void resetQueue();

    QueueStatusResponse getQueueStatus();

    DashboardResponse getDashboard();

    QueueControlResponse pauseQueue();

    QueueControlResponse resumeQueue();
}
