const loginForm = document.getElementById("adminLoginForm");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const loginMessage = document.getElementById("loginMessage");
const themeToggle = document.getElementById("themeToggle");

setupThemeToggle(themeToggle);
checkExistingSession();

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
        const response = await fetch("/api/admin/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username: usernameInput.value.trim(),
                password: passwordInput.value
            })
        });

        const payload = await response.json();
        if (!response.ok) {
            throw new Error(payload.message || "Login failed");
        }

        showAlert("Login successful. Redirecting to admin dashboard...", "success");
        window.location.href = "/admin";
    } catch (error) {
        showAlert(error.message || "Login failed", "danger");
    }
});

async function checkExistingSession() {
    try {
        const response = await fetch("/api/admin/session");
        const payload = await response.json();

        if (response.ok && payload.authenticated) {
            window.location.href = "/admin";
        }
    } catch (error) {
        showAlert("Unable to verify admin session right now.", "danger");
    }
}

function showAlert(message, type) {
    loginMessage.textContent = message;
    loginMessage.className = `alert smart-alert mt-4 alert-${type}`;
    loginMessage.classList.remove("d-none");
}

function setupThemeToggle(button) {
    const savedTheme = localStorage.getItem("smartQueueTheme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
    button.textContent = savedTheme === "dark" ? "Light Mode" : "Dark Mode";

    button.addEventListener("click", () => {
        const current = document.documentElement.getAttribute("data-theme");
        const next = current === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        localStorage.setItem("smartQueueTheme", next);
        button.textContent = next === "dark" ? "Light Mode" : "Dark Mode";
    });
}
