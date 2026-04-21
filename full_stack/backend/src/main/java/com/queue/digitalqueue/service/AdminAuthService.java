package com.queue.digitalqueue.service;

import com.queue.digitalqueue.dto.AdminAuthResponse;
import com.queue.digitalqueue.dto.AdminLoginRequest;
import com.queue.digitalqueue.exception.AdminAuthenticationException;
import com.queue.digitalqueue.security.AdminSession;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class AdminAuthService {

    private final String adminUsername;
    private final String adminPassword;

    public AdminAuthService(
            @Value("${app.admin.username:yash}") String adminUsername,
            @Value("${app.admin.password:yash1234}") String adminPassword
    ) {
        this.adminUsername = adminUsername;
        this.adminPassword = adminPassword;
    }

    public AdminAuthResponse login(AdminLoginRequest request, HttpSession session) {
        if (!adminUsername.equals(request.username()) || !adminPassword.equals(request.password())) {
            throw new AdminAuthenticationException("Invalid admin credentials");
        }

        session.setAttribute(AdminSession.ADMIN_AUTHENTICATED, true);
        return new AdminAuthResponse(true, adminUsername, "Login successful");
    }

    public AdminAuthResponse logout(HttpSession session) {
        session.invalidate();
        return new AdminAuthResponse(false, null, "Logged out successfully");
    }

    public AdminAuthResponse getSessionStatus(HttpSession session) {
        boolean authenticated = isAuthenticated(session);
        return new AdminAuthResponse(
                authenticated,
                authenticated ? adminUsername : null,
                authenticated ? "Authenticated" : "Not authenticated"
        );
    }

    public void requireAdmin(HttpSession session) {
        if (!isAuthenticated(session)) {
            throw new AdminAuthenticationException("Admin login required");
        }
    }

    public boolean isAuthenticated(HttpSession session) {
        Object authenticated = session.getAttribute(AdminSession.ADMIN_AUTHENTICATED);
        return authenticated instanceof Boolean value && value;
    }
}
