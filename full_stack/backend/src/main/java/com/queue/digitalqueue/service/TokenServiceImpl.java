package com.queue.digitalqueue.service;

import com.queue.digitalqueue.dto.CreateTokenRequest;
import com.queue.digitalqueue.dto.DashboardResponse;
import com.queue.digitalqueue.dto.QueueControlResponse;
import com.queue.digitalqueue.dto.QueueStatusResponse;
import com.queue.digitalqueue.dto.ServiceQueueSnapshotResponse;
import com.queue.digitalqueue.dto.TokenResponse;
import com.queue.digitalqueue.entity.PriorityLevel;
import com.queue.digitalqueue.entity.ServiceType;
import com.queue.digitalqueue.entity.Token;
import com.queue.digitalqueue.entity.TokenStatus;
import com.queue.digitalqueue.exception.NoTokensAvailableException;
import com.queue.digitalqueue.exception.QueuePausedException;
import com.queue.digitalqueue.repository.TokenRepository;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicBoolean;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TokenServiceImpl implements TokenService {

    private static final long DEFAULT_SERVICE_MINUTES = 4L;
    private static final int TREND_WINDOW_HOURS = 8;

    private final TokenRepository tokenRepository;
    private final AtomicBoolean queuePaused = new AtomicBoolean(false);

    @Override
    @Transactional
    public TokenResponse createToken(CreateTokenRequest request) {
        ServiceType serviceType = parseServiceType(request.serviceType());
        PriorityLevel priorityLevel = parsePriorityLevel(request.priorityLevel());
        int nextTokenNumber = tokenRepository.findTopByOrderByTokenNumberDesc()
                .map(token -> token.getTokenNumber() + 1)
                .orElse(1);

        Token token = Token.builder()
                .name(request.name().trim())
                .tokenNumber(nextTokenNumber)
                .status(TokenStatus.WAITING)
                .serviceType(serviceType)
                .priorityLevel(priorityLevel)
                .createdTime(LocalDateTime.now())
                .build();

        Token savedToken = tokenRepository.save(token);
        return toTokenResponse(savedToken, sortedWaitingTokensByService(serviceType));
    }

    @Override
    @Transactional(readOnly = true)
    public List<TokenResponse> getAllTokens() {
        List<Token> waitingTokens = sortWaitingTokens(tokenRepository.findByStatusOrderByCreatedTimeAsc(TokenStatus.WAITING));

        return tokenRepository.findAllByOrderByCreatedTimeAsc()
                .stream()
                .map(token -> toTokenResponse(token, waitingTokensForService(waitingTokens, token.getServiceType())))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public TokenResponse getCurrentServing() {
        return tokenRepository.findTopByStatusOrderByServedTimeDesc(TokenStatus.SERVED)
                .map(token -> toTokenResponse(token, List.of()))
                .orElse(null);
    }

    @Override
    @Transactional
    public TokenResponse serveNextToken(String serviceType) {
        if (queuePaused.get()) {
            throw new QueuePausedException("Queue is paused. Resume it to serve the next token.");
        }

        ServiceType selectedService = parseOptionalServiceType(serviceType);
        List<Token> waitingTokens = selectedService == null
                ? sortWaitingTokens(tokenRepository.findByStatusOrderByCreatedTimeAsc(TokenStatus.WAITING))
                : sortedWaitingTokensByService(selectedService);

        Token nextWaitingToken = waitingTokens.stream()
                .findFirst()
                .orElseThrow(() -> new NoTokensAvailableException("No tokens in queue"));

        nextWaitingToken.setStatus(TokenStatus.SERVED);
        nextWaitingToken.setServedTime(LocalDateTime.now());
        return toTokenResponse(tokenRepository.save(nextWaitingToken), List.of());
    }

    @Override
    @Transactional
    public void resetQueue() {
        tokenRepository.deleteAllInBatch();
    }

    @Override
    @Transactional(readOnly = true)
    public QueueStatusResponse getQueueStatus() {
        List<Token> waitingTokens = sortWaitingTokens(tokenRepository.findByStatusOrderByCreatedTimeAsc(TokenStatus.WAITING));
        List<TokenResponse> waitingResponses = waitingTokens.stream()
                .map(token -> toTokenResponse(token, waitingTokensForService(waitingTokens, token.getServiceType())))
                .toList();

        return new QueueStatusResponse(
                getCurrentServing(),
                waitingResponses,
                waitingResponses.size(),
                waitingResponses.isEmpty() ? null : waitingResponses.get(0).tokenNumber(),
                calculateAverageWaitMinutes(tokenRepository.findAll()),
                queuePaused.get(),
                tokenRepository.countByStatus(TokenStatus.SERVED),
                buildServiceSnapshots(waitingTokens)
        );
    }

    @Override
    @Transactional(readOnly = true)
    public DashboardResponse getDashboard() {
        List<Token> allTokens = tokenRepository.findAllByOrderByCreatedTimeAsc();
        List<Token> waitingTokens = sortWaitingTokens(allTokens.stream()
                .filter(token -> token.getStatus() == TokenStatus.WAITING)
                .toList());
        List<Token> todayTokens = allTokens.stream()
                .filter(token -> token.getCreatedTime() != null && token.getCreatedTime().toLocalDate().equals(LocalDate.now()))
                .toList();
        List<Token> recentActivity = allTokens.stream()
                .sorted(Comparator.comparing(Token::getCreatedTime).reversed())
                .limit(8)
                .toList();

        TrendBundle trendBundle = buildTrendBundle(allTokens);

        return new DashboardResponse(
                todayTokens.size(),
                todayTokens.stream().filter(token -> token.getStatus() == TokenStatus.SERVED).count(),
                waitingTokens.size(),
                calculateAverageWaitMinutes(allTokens),
                queuePaused.get(),
                trendBundle.peakTimeLabel(),
                getCurrentServing(),
                buildServiceSnapshots(waitingTokens),
                trendBundle.labels(),
                trendBundle.arrivals(),
                trendBundle.served(),
                recentActivity.stream()
                        .map(token -> toTokenResponse(token, waitingTokensForService(waitingTokens, token.getServiceType())))
                        .toList()
        );
    }

    @Override
    public QueueControlResponse pauseQueue() {
        queuePaused.set(true);
        return new QueueControlResponse(true, "Queue paused successfully");
    }

    @Override
    public QueueControlResponse resumeQueue() {
        queuePaused.set(false);
        return new QueueControlResponse(false, "Queue resumed successfully");
    }

    private TokenResponse toTokenResponse(Token token, List<Token> serviceWaitingTokens) {
        Integer queuePosition = null;
        Long estimatedWaitMinutes = null;

        if (token.getStatus() == TokenStatus.WAITING) {
            int index = serviceWaitingTokens.indexOf(token);
            if (index >= 0) {
                queuePosition = index + 1;
                estimatedWaitMinutes = Math.round(index * calculateEstimatedServiceMinutes(token.getServiceType()));
            }
        }

        return new TokenResponse(
                token.getId(),
                token.getName(),
                token.getTokenNumber(),
                token.getStatus().name(),
                token.getServiceType().name(),
                token.getPriorityLevel().name(),
                token.getCreatedTime(),
                token.getServedTime(),
                queuePosition,
                estimatedWaitMinutes,
                queuePosition != null && queuePosition <= 2
        );
    }

    private List<Token> sortWaitingTokens(List<Token> tokens) {
        return tokens.stream()
                .sorted(Comparator
                        .comparingInt((Token token) -> token.getPriorityLevel().getWeight()).reversed()
                        .thenComparing(Token::getCreatedTime)
                        .thenComparingInt(Token::getTokenNumber))
                .toList();
    }

    private List<Token> sortedWaitingTokensByService(ServiceType serviceType) {
        return sortWaitingTokens(tokenRepository.findByStatusAndServiceTypeOrderByCreatedTimeAsc(TokenStatus.WAITING, serviceType));
    }

    private List<Token> waitingTokensForService(List<Token> waitingTokens, ServiceType serviceType) {
        return waitingTokens.stream()
                .filter(token -> token.getServiceType() == serviceType)
                .toList();
    }

    private List<ServiceQueueSnapshotResponse> buildServiceSnapshots(List<Token> waitingTokens) {
        List<ServiceQueueSnapshotResponse> snapshots = new ArrayList<>();

        for (ServiceType serviceType : ServiceType.values()) {
            List<Token> serviceWaitingTokens = waitingTokensForService(waitingTokens, serviceType);
            TokenResponse currentServing = tokenRepository
                    .findTopByStatusAndServiceTypeOrderByServedTimeDesc(TokenStatus.SERVED, serviceType)
                    .map(token -> toTokenResponse(token, List.of()))
                    .orElse(null);

            snapshots.add(new ServiceQueueSnapshotResponse(
                    serviceType.name(),
                    serviceWaitingTokens.size(),
                    serviceWaitingTokens.isEmpty() ? null : serviceWaitingTokens.get(0).getTokenNumber(),
                    serviceWaitingTokens.size() * calculateEstimatedServiceMinutes(serviceType),
                    currentServing
            ));
        }

        return snapshots;
    }

    private double calculateAverageWaitMinutes(List<Token> tokens) {
        return tokens.stream()
                .filter(token -> token.getServedTime() != null && token.getCreatedTime() != null)
                .mapToLong(token -> Duration.between(token.getCreatedTime(), token.getServedTime()).toMinutes())
                .average()
                .orElse(DEFAULT_SERVICE_MINUTES);
    }

    private double calculateEstimatedServiceMinutes(ServiceType serviceType) {
        double averageWaitMinutes = calculateAverageWaitMinutes(tokenRepository.findAll());
        double base = averageWaitMinutes > 0 ? averageWaitMinutes : DEFAULT_SERVICE_MINUTES;

        return switch (serviceType) {
            case PAYMENT -> Math.max(3, base + 1);
            case ENQUIRY -> Math.max(2, base);
            case SUPPORT -> Math.max(4, base + 2);
        };
    }

    private ServiceType parseServiceType(String value) {
        try {
            return ServiceType.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (Exception ex) {
            throw new IllegalArgumentException("Unsupported service type: " + value);
        }
    }

    private ServiceType parseOptionalServiceType(String value) {
        if (value == null || value.isBlank() || value.equalsIgnoreCase("AUTO")) {
            return null;
        }
        return parseServiceType(value);
    }

    private PriorityLevel parsePriorityLevel(String value) {
        try {
            return PriorityLevel.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (Exception ex) {
            throw new IllegalArgumentException("Unsupported priority level: " + value);
        }
    }

    private TrendBundle buildTrendBundle(List<Token> tokens) {
        LocalDateTime currentHour = LocalDateTime.now().withMinute(0).withSecond(0).withNano(0);
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("ha");
        List<String> labels = new ArrayList<>();
        List<Long> arrivals = new ArrayList<>();
        List<Long> served = new ArrayList<>();

        long peakCount = -1;
        String peakLabel = "No peak yet";

        for (int offset = TREND_WINDOW_HOURS - 1; offset >= 0; offset--) {
            LocalDateTime bucket = currentHour.minusHours(offset);
            LocalDateTime bucketEnd = bucket.plusHours(1);

            long arrivalsCount = tokens.stream()
                    .filter(token -> token.getCreatedTime() != null)
                    .filter(token -> !token.getCreatedTime().isBefore(bucket) && token.getCreatedTime().isBefore(bucketEnd))
                    .count();

            long servedCount = tokens.stream()
                    .filter(token -> token.getServedTime() != null)
                    .filter(token -> !token.getServedTime().isBefore(bucket) && token.getServedTime().isBefore(bucketEnd))
                    .count();

            String label = bucket.format(formatter).toUpperCase(Locale.ROOT);
            labels.add(label);
            arrivals.add(arrivalsCount);
            served.add(servedCount);

            if (arrivalsCount > peakCount) {
                peakCount = arrivalsCount;
                peakLabel = arrivalsCount == 0 ? "No peak yet" : label;
            }
        }

        return new TrendBundle(labels, arrivals, served, peakLabel);
    }

    private record TrendBundle(
            List<String> labels,
            List<Long> arrivals,
            List<Long> served,
            String peakTimeLabel
    ) {
    }
}
