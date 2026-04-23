package com.queue.digitalqueue.controller;

import com.queue.digitalqueue.dto.CreateTokenRequest;
import com.queue.digitalqueue.dto.DashboardResponse;
import com.queue.digitalqueue.dto.QueueControlResponse;
import com.queue.digitalqueue.dto.QueueStatusResponse;
import com.queue.digitalqueue.dto.SearchTokenResponse;
import com.queue.digitalqueue.dto.StatsResponse;
import com.queue.digitalqueue.dto.TokenResponse;
import com.queue.digitalqueue.service.AdminAuthService;
import com.queue.digitalqueue.service.TokenService;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/tokens")
@RequiredArgsConstructor
public class TokenController {

    private final TokenService tokenService;
    private final AdminAuthService adminAuthService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TokenResponse createToken(@Valid @RequestBody CreateTokenRequest request) {
        return tokenService.createToken(request);
    }

    @GetMapping
    public List<TokenResponse> getAllTokens() {
        return tokenService.getAllTokens();
    }

    @GetMapping("/current")
    public TokenResponse getCurrentServing() {
        return tokenService.getCurrentServing();
    }

    @GetMapping("/status")
    public QueueStatusResponse getQueueStatus() {
        return tokenService.getQueueStatus();
    }

    @GetMapping("/search")
    public SearchTokenResponse searchTokens(@RequestParam String query) {
        return tokenService.searchTokens(query);
    }

    @GetMapping("/history")
    public List<TokenResponse> getHistory() {
        return tokenService.getTokenHistory();
    }

    @GetMapping("/stats")
    public StatsResponse getStats() {
        return tokenService.getStats();
    }

    @GetMapping("/dashboard")
    public DashboardResponse getDashboard(HttpSession session) {
        adminAuthService.requireAdmin(session);
        return tokenService.getDashboard();
    }

    @PutMapping("/next")
    public TokenResponse serveNextToken(@RequestParam(required = false) String serviceType, HttpSession session) {
        adminAuthService.requireAdmin(session);
        return tokenService.serveNextToken(serviceType);
    }

    @PutMapping("/pause")
    public QueueControlResponse pauseQueue(HttpSession session) {
        adminAuthService.requireAdmin(session);
        return tokenService.pauseQueue();
    }

    @PutMapping("/resume")
    public QueueControlResponse resumeQueue(HttpSession session) {
        adminAuthService.requireAdmin(session);
        return tokenService.resumeQueue();
    }

    @DeleteMapping("/reset")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resetQueue(HttpSession session) {
        adminAuthService.requireAdmin(session);
        tokenService.resetQueue();
    }
}
