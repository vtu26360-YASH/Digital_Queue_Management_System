package com.queue.digitalqueue.controller;

import com.queue.digitalqueue.dto.AdminAuthResponse;
import com.queue.digitalqueue.dto.AdminLoginRequest;
import com.queue.digitalqueue.service.AdminAuthService;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminAuthController {

    private final AdminAuthService adminAuthService;

    @PostMapping("/login")
    public AdminAuthResponse login(@Valid @RequestBody AdminLoginRequest request, HttpSession session) {
        return adminAuthService.login(request, session);
    }

    @PostMapping("/logout")
    public AdminAuthResponse logout(HttpSession session) {
        return adminAuthService.logout(session);
    }

    @GetMapping("/session")
    public AdminAuthResponse sessionStatus(HttpSession session) {
        return adminAuthService.getSessionStatus(session);
    }
}
