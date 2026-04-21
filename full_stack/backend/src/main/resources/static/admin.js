const API_BASE_URL = "/api/tokens";

const serviceRoute = document.getElementById("serviceRoute");
const serveNextBtn = document.getElementById("serveNextBtn");
const togglePauseBtn = document.getElementById("togglePauseBtn");
const resetQueueBtn = document.getElementById("resetQueueBtn");
const adminMessage = document.getElementById("adminMessage");
const adminCurrentServingHero = document.getElementById("adminCurrentServingHero");
const adminCurrentServingMeta = document.getElementById("adminCurrentServingMeta");
const statTotalTokens = document.getElementById("statTotalTokens");
const statServedTokens = document.getElementById("statServedTokens");
const statWaitingTokens = document.getElementById("statWaitingTokens");
const statAverageWait = document.getElementById("statAverageWait");
const queueStateLabel = document.getElementById("queueStateLabel");
const peakTimeLabel = document.getElementById("peakTimeLabel");
const queueTableBody = document.getElementById("queueTableBody");
const queueEmptyState = document.getElementById("queueEmptyState");
const adminServiceLaneGrid = document.getElementById("adminServiceLaneGrid");
const recentActivityList = document.getElementById("recentActivityList");
const notificationToast = document.getElementById("notificationToast");
const themeToggle = document.getElementById("themeToggle");
const logoutBtn = document.getElementById("logoutBtn");

let trendChart;
let serviceChart;
let lastServedTokenNumber = null;
let queuePaused = false;

setupThemeToggle(themeToggle, () => refreshAdminView());
ensureAdminSession();

serveNextBtn.addEventListener("click", async () => {
    const query = serviceRoute.value === "AUTO" ? "" : `?serviceType=${serviceRoute.value}`;

    try {
        const response = await fetch(`${API_BASE_URL}/next${query}`, { method: "PUT" });
        const payload = await response.json();
        if (!response.ok) {
            throw new Error(extractErrorMessage(payload));
        }

        showAlert(adminMessage, `Now serving token T-${payload.tokenNumber} for ${payload.name}.`, "success");
        playNotificationTone();
        await refreshAdminView();
    } catch (error) {
        showAlert(adminMessage, error.message || "Unable to serve next token.", "danger");
    }
});

logoutBtn.addEventListener("click", async () => {
    try {
        const response = await fetch("/api/admin/logout", { method: "POST" });
        const payload = await response.json();
        if (!response.ok) {
            throw new Error(extractErrorMessage(payload));
        }
        window.location.href = "/admin/login";
    } catch (error) {
        showAlert(adminMessage, error.message || "Unable to log out.", "danger");
    }
});

togglePauseBtn.addEventListener("click", async () => {
    const endpoint = queuePaused ? "resume" : "pause";

    try {
        const response = await fetch(`${API_BASE_URL}/${endpoint}`, { method: "PUT" });
        const payload = await response.json();
        if (!response.ok) {
            throw new Error(extractErrorMessage(payload));
        }

        showAlert(adminMessage, payload.message, "success");
        await refreshAdminView();
    } catch (error) {
        showAlert(adminMessage, error.message || "Unable to update queue state.", "danger");
    }
});

resetQueueBtn.addEventListener("click", async () => {
    if (!window.confirm("Reset the full queue and analytics history?")) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/reset`, { method: "DELETE" });
        if (!response.ok) {
            throw new Error("Unable to reset queue.");
        }
        showAlert(adminMessage, "Queue reset successfully.", "success");
        lastServedTokenNumber = null;
        await refreshAdminView();
    } catch (error) {
        showAlert(adminMessage, error.message || "Unable to reset queue.", "danger");
    }
});

async function refreshAdminView() {
    try {
        const [dashboardResponse, statusResponse] = await Promise.all([
            fetch(`${API_BASE_URL}/dashboard`),
            fetch(`${API_BASE_URL}/status`)
        ]);

        const dashboard = await dashboardResponse.json();
        const status = await statusResponse.json();

        if (!dashboardResponse.ok) {
            throw new Error(extractErrorMessage(dashboard));
        }
        if (!statusResponse.ok) {
            throw new Error(extractErrorMessage(status));
        }

        renderStats(dashboard);
        renderCurrentServing(dashboard.currentlyServing);
        renderQueueTable(status.waitingTokens || []);
        renderServiceLanes(dashboard.serviceQueues || []);
        renderRecentActivity(dashboard.recentActivity || []);
        renderCharts(dashboard);
        queuePaused = dashboard.queuePaused;
        queueStateLabel.textContent = queuePaused ? "Paused" : "Live";
        peakTimeLabel.textContent = `Peak time: ${dashboard.peakTimeLabel}`;
        togglePauseBtn.textContent = queuePaused ? "Resume Queue" : "Pause Queue";

        if (dashboard.currentlyServing && dashboard.currentlyServing.tokenNumber !== lastServedTokenNumber) {
            lastServedTokenNumber = dashboard.currentlyServing.tokenNumber;
            showToast(`Now serving token T-${dashboard.currentlyServing.tokenNumber} | ${dashboard.currentlyServing.name}`);
            playNotificationTone();
        }
    } catch (error) {
        if ((error.message || "").toLowerCase().includes("admin login required")) {
            window.location.href = "/admin/login";
            return;
        }
        showAlert(adminMessage, error.message || "Unable to load dashboard.", "danger");
    }
}

async function ensureAdminSession() {
    try {
        const response = await fetch("/api/admin/session");
        const payload = await response.json();
        if (!response.ok || !payload.authenticated) {
            window.location.href = "/admin/login";
        }
    } catch (error) {
        window.location.href = "/admin/login";
    }
}

function renderStats(dashboard) {
    statTotalTokens.textContent = dashboard.totalTokensToday ?? 0;
    statServedTokens.textContent = dashboard.tokensServedToday ?? 0;
    statWaitingTokens.textContent = dashboard.tokensWaiting ?? 0;
    statAverageWait.textContent = `${Math.round(dashboard.averageWaitMinutes || 4)} min`;
}

function renderCurrentServing(token) {
    if (!token) {
        adminCurrentServingHero.textContent = "No token served yet";
        adminCurrentServingMeta.textContent = "Waiting for next call";
        return;
    }

    adminCurrentServingHero.textContent = `T-${token.tokenNumber}`;
    adminCurrentServingMeta.textContent = `${token.name} | ${formatService(token.serviceType)} | ${formatPriority(token.priorityLevel)}`;
}

function renderQueueTable(tokens) {
    queueTableBody.innerHTML = "";

    if (!tokens.length) {
        queueEmptyState.classList.remove("d-none");
        return;
    }

    queueEmptyState.classList.add("d-none");

    tokens.forEach((token) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td class="fw-semibold">T-${token.tokenNumber}</td>
            <td>${token.name}</td>
            <td><span class="service-badge ${token.serviceType.toLowerCase()}">${formatService(token.serviceType)}</span></td>
            <td><span class="status-badge ${token.priorityLevel.toLowerCase()}">${formatPriority(token.priorityLevel)}</span></td>
            <td>${token.queuePosition ? `${token.queuePosition}${ordinalSuffix(token.queuePosition)}` : "-"}</td>
            <td>${token.estimatedWaitMinutes != null ? `${token.estimatedWaitMinutes} min` : "-"}</td>
        `;
        queueTableBody.appendChild(row);
    });
}

function renderServiceLanes(serviceQueues) {
    adminServiceLaneGrid.innerHTML = "";

    serviceQueues.forEach((lane) => {
        const col = document.createElement("div");
        col.className = "col-md-6";
        col.innerHTML = `
            <div class="lane-card">
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <span class="service-badge ${lane.serviceType.toLowerCase()}">${formatService(lane.serviceType)}</span>
                    <span class="board-pill">${lane.waitingCount} waiting</span>
                </div>
                <div class="d-flex justify-content-between gap-3">
                    <div>
                        <span class="text-white-50 d-block small">Next</span>
                        <strong class="d-block">${lane.nextTokenNumber ? `T-${lane.nextTokenNumber}` : "Idle"}</strong>
                    </div>
                    <div>
                        <span class="text-white-50 d-block small">Lane ETA</span>
                        <strong class="d-block">${Math.round(lane.estimatedWaitMinutes || 0)} min</strong>
                    </div>
                </div>
            </div>
        `;
        adminServiceLaneGrid.appendChild(col);
    });
}

function renderRecentActivity(tokens) {
    recentActivityList.innerHTML = "";

    if (!tokens.length) {
        recentActivityList.innerHTML = `<div class="empty-board">No token activity yet.</div>`;
        return;
    }

    tokens.forEach((token) => {
        const item = document.createElement("div");
        item.className = "activity-item";
        item.innerHTML = `
            <div class="d-flex justify-content-between gap-3">
                <div>
                    <strong class="d-block text-white">T-${token.tokenNumber} | ${token.name}</strong>
                    <small>${formatService(token.serviceType)} | ${formatPriority(token.priorityLevel)}</small>
                </div>
                <div class="text-end">
                    <span class="status-badge ${token.status.toLowerCase() === "served" ? "vip" : "normal"}">${token.status}</span>
                </div>
            </div>
        `;
        recentActivityList.appendChild(item);
    });
}

function renderCharts(dashboard) {
    if (typeof Chart === "undefined") {
        return;
    }

    const textColor = getComputedStyle(document.documentElement).getPropertyValue("--text").trim();
    const gridColor = "rgba(255,255,255,0.08)";

    if (trendChart) {
        trendChart.destroy();
    }
    if (serviceChart) {
        serviceChart.destroy();
    }

    trendChart = new Chart(document.getElementById("trendChart"), {
        type: "line",
        data: {
            labels: dashboard.trendLabels || [],
            datasets: [
                {
                    label: "Arrivals",
                    data: dashboard.arrivalTrend || [],
                    borderColor: "#54d2ff",
                    backgroundColor: "rgba(84, 210, 255, 0.18)",
                    tension: 0.38,
                    fill: true
                },
                {
                    label: "Served",
                    data: dashboard.servedTrend || [],
                    borderColor: "#7b61ff",
                    backgroundColor: "rgba(123, 97, 255, 0.12)",
                    tension: 0.38,
                    fill: true
                }
            ]
        },
        options: buildChartOptions(textColor, gridColor)
    });

    serviceChart = new Chart(document.getElementById("serviceChart"), {
        type: "bar",
        data: {
            labels: (dashboard.serviceQueues || []).map((lane) => formatService(lane.serviceType)),
            datasets: [{
                label: "Waiting Tokens",
                data: (dashboard.serviceQueues || []).map((lane) => lane.waitingCount),
                backgroundColor: ["#54d2ff", "#7b61ff", "#ffd166"],
                borderRadius: 12
            }]
        },
        options: {
            ...buildChartOptions(textColor, gridColor),
            plugins: {
                legend: { display: false }
            }
        }
    });
}

function buildChartOptions(textColor, gridColor) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                ticks: { color: textColor },
                grid: { color: gridColor }
            },
            y: {
                beginAtZero: true,
                ticks: { color: textColor, precision: 0 },
                grid: { color: gridColor }
            }
        },
        plugins: {
            legend: {
                labels: { color: textColor }
            }
        }
    };
}

function showAlert(element, message, type) {
    element.textContent = message;
    element.className = `alert smart-alert mt-4 alert-${type}`;
    element.classList.remove("d-none");
}

function showToast(message) {
    notificationToast.textContent = message;
    notificationToast.classList.add("show");
    setTimeout(() => notificationToast.classList.remove("show"), 3200);
}

function extractErrorMessage(payload) {
    if (!payload) {
        return "An unexpected error occurred.";
    }
    if (payload.message) {
        return payload.message;
    }
    if (payload.errors) {
        return Object.values(payload.errors).join(", ");
    }
    return "An unexpected error occurred.";
}

function formatService(serviceType) {
    return serviceType.charAt(0) + serviceType.slice(1).toLowerCase();
}

function formatPriority(priorityLevel) {
    return priorityLevel.charAt(0) + priorityLevel.slice(1).toLowerCase();
}

function ordinalSuffix(value) {
    if (value % 10 === 1 && value % 100 !== 11) return "st";
    if (value % 10 === 2 && value % 100 !== 12) return "nd";
    if (value % 10 === 3 && value % 100 !== 13) return "rd";
    return "th";
}

function setupThemeToggle(button, onToggle) {
    const savedTheme = localStorage.getItem("smartQueueTheme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
    button.textContent = savedTheme === "dark" ? "Light Mode" : "Dark Mode";

    button.addEventListener("click", () => {
        const current = document.documentElement.getAttribute("data-theme");
        const next = current === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        localStorage.setItem("smartQueueTheme", next);
        button.textContent = next === "dark" ? "Light Mode" : "Dark Mode";
        onToggle();
    });
}

function playNotificationTone() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
        return;
    }
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.value = 740;
    gainNode.gain.value = 0.05;
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.18);
}

refreshAdminView();
setInterval(refreshAdminView, 4000);
