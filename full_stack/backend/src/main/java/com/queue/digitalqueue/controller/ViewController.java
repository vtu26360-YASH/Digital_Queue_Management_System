package com.queue.digitalqueue.controller;

import com.queue.digitalqueue.service.AdminAuthService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
@RequiredArgsConstructor
public class ViewController {

    private final AdminAuthService adminAuthService;

    @GetMapping("/admin")
    public String adminPage(HttpSession session) {
        return adminAuthService.isAuthenticated(session)
                ? "redirect:/admin.html"
                : "redirect:/admin-login.html";
    }

    @GetMapping("/admin/login")
    public String adminLoginPage(HttpSession session) {
        return adminAuthService.isAuthenticated(session)
                ? "redirect:/admin.html"
                : "redirect:/admin-login.html";
    }
}
