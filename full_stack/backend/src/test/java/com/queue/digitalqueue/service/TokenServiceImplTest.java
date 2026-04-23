package com.queue.digitalqueue.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.queue.digitalqueue.dto.CreateTokenRequest;
import com.queue.digitalqueue.dto.DashboardResponse;
import com.queue.digitalqueue.dto.QueueStatusResponse;
import com.queue.digitalqueue.dto.TokenResponse;
import com.queue.digitalqueue.entity.PriorityLevel;
import com.queue.digitalqueue.entity.ServiceType;
import com.queue.digitalqueue.entity.Token;
import com.queue.digitalqueue.entity.TokenStatus;
import com.queue.digitalqueue.exception.NoTokensAvailableException;
import com.queue.digitalqueue.repository.TokenRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class TokenServiceImplTest {

    @Mock
    private TokenRepository tokenRepository;

    @InjectMocks
    private TokenServiceImpl tokenService;

    private Token waitingTokenOne;
    private Token waitingTokenTwo;

    @BeforeEach
    void setUp() {
        waitingTokenOne = Token.builder()
                .id(1L)
                .name("Asha")
                .tokenNumber(1)
                .status(TokenStatus.WAITING)
                .serviceType(ServiceType.PAYMENT)
                .priorityLevel(PriorityLevel.NORMAL)
                .createdTime(LocalDateTime.now().minusMinutes(10))
                .build();

        waitingTokenTwo = Token.builder()
                .id(2L)
                .name("Bala")
                .tokenNumber(2)
                .status(TokenStatus.WAITING)
                .serviceType(ServiceType.PAYMENT)
                .priorityLevel(PriorityLevel.VIP)
                .createdTime(LocalDateTime.now().minusMinutes(5))
                .build();
    }

    @Test
    void createTokenShouldGenerateNextIncrementalToken() {
        when(tokenRepository.findTopByOrderByTokenNumberDesc()).thenReturn(Optional.of(waitingTokenTwo));
        when(tokenRepository.findByStatusAndServiceTypeOrderByCreatedTimeAsc(TokenStatus.WAITING, ServiceType.PAYMENT))
                .thenReturn(List.of(waitingTokenOne, waitingTokenTwo));
        when(tokenRepository.save(any(Token.class))).thenAnswer(invocation -> {
            Token token = invocation.getArgument(0);
            token.setId(3L);
            return token;
        });

        TokenResponse response = tokenService.createToken(new CreateTokenRequest("Charan", "PAYMENT", "NORMAL"));

        assertThat(response.tokenNumber()).isEqualTo(3);
        assertThat(response.name()).isEqualTo("Charan");
        assertThat(response.status()).isEqualTo("WAITING");
        assertThat(response.serviceType()).isEqualTo("PAYMENT");
    }

    @Test
    void serveNextTokenShouldRespectPriorityWithinServiceQueue() {
        when(tokenRepository.findByStatusAndServiceTypeOrderByCreatedTimeAsc(TokenStatus.WAITING, ServiceType.PAYMENT))
                .thenReturn(List.of(waitingTokenOne, waitingTokenTwo));
        when(tokenRepository.save(any(Token.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TokenResponse response = tokenService.serveNextToken("PAYMENT");

        assertThat(response.tokenNumber()).isEqualTo(2);
        assertThat(response.status()).isEqualTo("SERVED");
    }

    @Test
    void serveNextTokenShouldThrowWhenQueueIsEmpty() {
        when(tokenRepository.findByStatusOrderByCreatedTimeAsc(TokenStatus.WAITING))
                .thenReturn(List.of());

        assertThatThrownBy(() -> tokenService.serveNextToken(null))
                .isInstanceOf(NoTokensAvailableException.class)
                .hasMessage("No tokens in queue");

        verify(tokenRepository, never()).save(any(Token.class));
    }

    @Test
    void getQueueStatusShouldReturnCurrentServingAndWaitingQueue() {
        Token servedToken = Token.builder()
                .id(10L)
                .name("Divya")
                .tokenNumber(5)
                .status(TokenStatus.SERVED)
                .serviceType(ServiceType.ENQUIRY)
                .priorityLevel(PriorityLevel.NORMAL)
                .createdTime(LocalDateTime.now().minusMinutes(12))
                .servedTime(LocalDateTime.now().minusMinutes(2))
                .build();

        when(tokenRepository.findByStatusOrderByCreatedTimeAsc(TokenStatus.WAITING))
                .thenReturn(List.of(waitingTokenOne, waitingTokenTwo));
        when(tokenRepository.findTopByStatusOrderByServedTimeDesc(TokenStatus.SERVED))
                .thenReturn(Optional.of(servedToken));
        when(tokenRepository.countByStatus(TokenStatus.SERVED)).thenReturn(1L);
        when(tokenRepository.findAll()).thenReturn(List.of(waitingTokenOne, waitingTokenTwo, servedToken));
        when(tokenRepository.findTopByStatusAndServiceTypeOrderByServedTimeDesc(TokenStatus.SERVED, ServiceType.PAYMENT))
                .thenReturn(Optional.empty());
        when(tokenRepository.findTopByStatusAndServiceTypeOrderByServedTimeDesc(TokenStatus.SERVED, ServiceType.ENQUIRY))
                .thenReturn(Optional.of(servedToken));
        when(tokenRepository.findTopByStatusAndServiceTypeOrderByServedTimeDesc(TokenStatus.SERVED, ServiceType.SUPPORT))
                .thenReturn(Optional.empty());

        QueueStatusResponse response = tokenService.getQueueStatus();

        assertThat(response.waitingCount()).isEqualTo(2);
        assertThat(response.nextTokenNumber()).isEqualTo(2);
        assertThat(response.currentlyServing()).isNotNull();
        assertThat(response.currentlyServing().tokenNumber()).isEqualTo(5);
        assertThat(response.waitingTokens()).hasSize(2);
        assertThat(response.serviceQueues()).hasSize(3);
    }

    @Test
    void getDashboardShouldReturnAnalyticsAndRecentActivity() {
        Token servedToken = Token.builder()
                .id(3L)
                .name("Deepa")
                .tokenNumber(7)
                .status(TokenStatus.SERVED)
                .serviceType(ServiceType.SUPPORT)
                .priorityLevel(PriorityLevel.EMERGENCY)
                .createdTime(LocalDateTime.now().minusMinutes(30))
                .servedTime(LocalDateTime.now().minusMinutes(5))
                .build();

        when(tokenRepository.findAllByOrderByCreatedTimeAsc()).thenReturn(List.of(waitingTokenOne, waitingTokenTwo, servedToken));
        when(tokenRepository.findTopByStatusOrderByServedTimeDesc(TokenStatus.SERVED)).thenReturn(Optional.of(servedToken));
        when(tokenRepository.findTopByStatusAndServiceTypeOrderByServedTimeDesc(TokenStatus.SERVED, ServiceType.PAYMENT))
                .thenReturn(Optional.empty());
        when(tokenRepository.findTopByStatusAndServiceTypeOrderByServedTimeDesc(TokenStatus.SERVED, ServiceType.ENQUIRY))
                .thenReturn(Optional.empty());
        when(tokenRepository.findTopByStatusAndServiceTypeOrderByServedTimeDesc(TokenStatus.SERVED, ServiceType.SUPPORT))
                .thenReturn(Optional.of(servedToken));
        when(tokenRepository.findAll()).thenReturn(List.of(waitingTokenOne, waitingTokenTwo, servedToken));

        DashboardResponse response = tokenService.getDashboard();

        assertThat(response.totalTokensToday()).isGreaterThanOrEqualTo(1);
        assertThat(response.tokensWaiting()).isEqualTo(2);
        assertThat(response.currentlyServing()).isNotNull();
        assertThat(response.recentActivity()).isNotEmpty();
    }
}
