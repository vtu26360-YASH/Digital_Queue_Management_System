const API_BASE_URL = "/api/tokens";
const STORAGE_KEY = "smartQueueTrackedToken";

const tokenForm = document.getElementById("tokenForm");
const nameInput = document.getElementById("name");
const serviceTypeInput = document.getElementById("serviceType");
const priorityLevelInput = document.getElementById("priorityLevel");
const formMessage = document.getElementById("formMessage");
const generatedTokenCard = document.getElementById("generatedTokenCard");
const generatedTokenNumber = document.getElementById("generatedTokenNumber");
const generatedTokenName = document.getElementById("generatedTokenName");
const generatedServiceType = document.getElementById("generatedServiceType");
const generatedPosition = document.getElementById("generatedPosition");
const generatedWaitTime = document.getElementById("generatedWaitTime");
const generatedCountdown = document.getElementById("generatedCountdown");
const generatedPriorityBadge = document.getElementById("generatedPriorityBadge");
const tokenQrCode = document.getElementById("tokenQrCode");
const personalTracker = document.getElementById("personalTracker");
const serviceLaneGrid = document.getElementById("serviceLaneGrid");
const waitingBoard = document.getElementById("waitingBoard");
const servedHistory = document.getElementById("servedHistory");
const notificationToast = document.getElementById("notificationToast");
const clearTrackerBtn = document.getElementById("clearTrackerBtn");
const heroNowServing = document.getElementById("heroNowServing");
const heroWaitingCount = document.getElementById("heroWaitingCount");
const heroAverageWait = document.getElementById("heroAverageWait");
const heroQueueState = document.getElementById("heroQueueState");
const themeToggle = document.getElementById("themeToggle");
const searchForm = document.getElementById("searchForm");
const searchQuery = document.getElementById("searchQuery");
const searchMessage = document.getElementById("searchMessage");
const searchResults = document.getElementById("searchResults");

let trackedToken = loadTrackedToken();
let lastNotificationKey = null;
let countdownIntervalId = null;
let countdownRemainingSeconds = null;

setupThemeToggle(themeToggle);

tokenForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
        const response = await fetch(API_BASE_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: nameInput.value.trim(),
                serviceType: serviceTypeInput.value,
                priorityLevel: priorityLevelInput.value
            })
        });

        const payload = await response.json();
        if (!response.ok) {
            throw new Error(extractErrorMessage(payload));
        }

        trackedToken = payload;
        saveTrackedToken(payload);
        renderGeneratedToken(payload);
        showAlert(formMessage, `Token ${payload.tokenNumber} created successfully. You're now in the virtual queue.`, "success");
        tokenForm.reset();
        await refreshUserView();
    } catch (error) {
        showAlert(formMessage, error.message || "Unable to create token.", "danger");
    }
});

clearTrackerBtn.addEventListener("click", () => {
    trackedToken = null;
    lastNotificationKey = null;
    localStorage.removeItem(STORAGE_KEY);
    generatedTokenCard.classList.add("d-none");
    stopCountdown();
    generatedCountdown.textContent = "-";
    tokenQrCode.innerHTML = "";
    renderTracker(null, null);
    showToast("Personal tracker cleared.");
});

searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await searchForToken(searchQuery.value.trim());
});

async function refreshUserView() {
    try {
        const [statusResponse, historyResponse, statsResponse] = await Promise.all([
            fetch(`${API_BASE_URL}/status`),
            fetch(`${API_BASE_URL}/history`),
            fetch(`${API_BASE_URL}/stats`)
        ]);
        const status = await statusResponse.json();
        const history = await historyResponse.json();
        const stats = await statsResponse.json();

        if (!statusResponse.ok) {
            throw new Error(extractErrorMessage(status));
        }

        renderHero(status, stats);
        renderServiceLanes(status.serviceQueues || []);
        renderWaitingBoard(status.waitingTokens || []);
        renderServedHistory(history || []);
        syncTrackedToken(status);
    } catch (error) {
        showAlert(formMessage, error.message || "Unable to load live queue.", "danger");
    }
}

function renderHero(status, stats) {
    heroNowServing.textContent = status.currentlyServing
        ? `#${status.currentlyServing.tokenNumber} | ${formatService(status.currentlyServing.serviceType)}`
        : "No active token";
    heroWaitingCount.textContent = status.waitingCount ?? 0;
    heroAverageWait.textContent = `${Math.round(status.averageWaitMinutes || 4)} min`;
    heroQueueState.textContent = status.queuePaused ? "Paused" : (stats?.queueFull ? "Queue Full" : "Live");
}

function renderGeneratedToken(token) {
    generatedTokenCard.classList.remove("d-none");
    generatedTokenNumber.textContent = `T-${token.tokenNumber}`;
    generatedTokenName.textContent = token.name;
    generatedServiceType.textContent = formatService(token.serviceType);
    generatedPosition.textContent = token.queuePosition ? `${token.queuePosition}${ordinalSuffix(token.queuePosition)} in line` : "Being served";
    generatedWaitTime.textContent = token.estimatedWaitMinutes != null ? `${token.estimatedWaitMinutes} min` : "At counter";
    generatedPriorityBadge.textContent = formatPriority(token.priorityLevel);
    generatedPriorityBadge.className = `priority-badge status-badge ${token.priorityLevel.toLowerCase()}`;
    syncCountdown(token);
    renderQrCode(token);
}

function renderTracker(status, trackedStatus) {
    if (!trackedStatus && !trackedToken) {
        personalTracker.innerHTML = `
            <div class="tracker-placeholder">
                <h3 class="text-white h4">No tracked token yet</h3>
                <p class="text-white-50 mb-0">Generate a token to unlock live position, ETA, and near-turn alerts.</p>
            </div>
        `;
        return;
    }

    if (trackedStatus === "CURRENT") {
        syncCountdown({
            estimatedWaitMinutes: 0
        });
        personalTracker.innerHTML = `
            <div class="tracker-grid">
                <div class="tracker-stat pulse-ring">
                    <span>Turn Status</span>
                    <strong>It's your turn now</strong>
                </div>
                <div class="tracker-stat">
                    <span>Counter Queue</span>
                    <strong>${formatService(trackedToken.serviceType)}</strong>
                </div>
                <div class="tracker-stat">
                    <span>Token</span>
                    <strong>T-${trackedToken.tokenNumber}</strong>
                </div>
                <div class="tracker-stat">
                    <span>Priority</span>
                    <strong>${formatPriority(trackedToken.priorityLevel)}</strong>
                </div>
            </div>
        `;
        return;
    }

    if (trackedStatus === "SERVED") {
        stopCountdown();
        generatedCountdown.textContent = "Completed";
        personalTracker.innerHTML = `
            <div class="tracker-placeholder">
                <h3 class="text-white h4">Token served</h3>
                <p class="text-white-50 mb-0">Token T-${trackedToken.tokenNumber} has already been completed. Generate another token whenever you need a new visit.</p>
            </div>
        `;
        return;
    }

    personalTracker.innerHTML = `
        <div class="tracker-grid">
            <div class="tracker-stat">
                <span>Tracked Token</span>
                <strong>T-${trackedToken.tokenNumber}</strong>
            </div>
            <div class="tracker-stat">
                <span>Service Lane</span>
                <strong>${formatService(trackedToken.serviceType)}</strong>
            </div>
            <div class="tracker-stat">
                <span>Queue Position</span>
                <strong>${trackedToken.queuePosition ? `${trackedToken.queuePosition}${ordinalSuffix(trackedToken.queuePosition)}` : "Waiting"}</strong>
            </div>
            <div class="tracker-stat">
                <span>Estimated Wait</span>
                <strong>${trackedToken.estimatedWaitMinutes != null ? `${trackedToken.estimatedWaitMinutes} min` : "Updating..."}</strong>
            </div>
            <div class="tracker-stat">
                <span>Priority</span>
                <strong>${formatPriority(trackedToken.priorityLevel)}</strong>
            </div>
            <div class="tracker-stat ${trackedToken.nearTurn ? "pulse-ring" : ""}">
                <span>Near Turn</span>
                <strong>${trackedToken.nearTurn ? "Yes, get ready" : "Not yet"}</strong>
            </div>
        </div>
    `;
}

function renderServiceLanes(serviceQueues) {
    serviceLaneGrid.innerHTML = "";
    serviceQueues.forEach((lane) => {
        const col = document.createElement("div");
        col.className = "col-md-6 col-xl-4";
        col.innerHTML = `
            <div class="lane-card">
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <span class="service-badge ${lane.serviceType.toLowerCase()}">${formatService(lane.serviceType)}</span>
                    <span class="board-pill">${lane.waitingCount} waiting</span>
                </div>
                <div class="mb-3">
                    <span class="text-white-50 d-block small">Next token</span>
                    <strong class="h4 d-block mb-0 text-white">${lane.nextTokenNumber ? `T-${lane.nextTokenNumber}` : "No queue"}</strong>
                </div>
                <div class="d-flex justify-content-between gap-3">
                    <div>
                        <span class="text-white-50 d-block small">Lane ETA</span>
                        <strong class="text-white">${Math.round(lane.estimatedWaitMinutes || 0)} min</strong>
                    </div>
                    <div>
                        <span class="text-white-50 d-block small">Serving</span>
                        <strong class="text-white">${lane.currentServing ? `T-${lane.currentServing.tokenNumber}` : "Idle"}</strong>
                    </div>
                </div>
            </div>
        `;
        serviceLaneGrid.appendChild(col);
    });
}

function renderWaitingBoard(tokens) {
    waitingBoard.innerHTML = "";
    if (!tokens.length) {
        waitingBoard.innerHTML = `<div class="empty-board">No tokens in queue right now.</div>`;
        return;
    }

    tokens.slice(0, 8).forEach((token) => {
        const item = document.createElement("div");
        item.className = `board-item ${token.nearTurn ? "pulse-ring" : ""}`;
        item.innerHTML = `
            <div class="board-item__meta">
                <strong class="text-white d-block">T-${token.tokenNumber} | ${token.name}</strong>
                <small>${formatService(token.serviceType)} | ${formatPriority(token.priorityLevel)}</small>
            </div>
            <div class="text-end">
                <div class="text-white fw-semibold">${token.queuePosition ? `${token.queuePosition}${ordinalSuffix(token.queuePosition)}` : "-"}</div>
                <small>${token.estimatedWaitMinutes != null ? `${token.estimatedWaitMinutes} min` : "Updating..."}</small>
            </div>
        `;
        waitingBoard.appendChild(item);
    });
}

function renderServedHistory(tokens) {
    servedHistory.innerHTML = "";
    if (!tokens.length) {
        servedHistory.innerHTML = `<div class="empty-board">No served token history yet.</div>`;
        return;
    }

    tokens.forEach((token) => {
        const item = document.createElement("div");
        item.className = "board-item";
        item.innerHTML = `
            <div class="board-item__meta">
                <strong class="text-white d-block">T-${token.tokenNumber} | ${token.name}</strong>
                <small>${formatService(token.serviceType)} | ${formatPriority(token.priorityLevel)}</small>
            </div>
            <div class="text-end">
                <div class="text-white fw-semibold">Served</div>
                <small>${formatDateTime(token.servedTime)}</small>
            </div>
        `;
        servedHistory.appendChild(item);
    });
}

async function searchForToken(query) {
    if (!query) {
        showAlert(searchMessage, "Enter a name or token number to search.", "danger");
        searchResults.innerHTML = "";
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/search?query=${encodeURIComponent(query)}`);
        const payload = await response.json();
        if (!response.ok) {
            throw new Error(extractErrorMessage(payload));
        }

        renderSearchResults(payload.matches || []);
    } catch (error) {
        showAlert(searchMessage, error.message || "Unable to search token.", "danger");
    }
}

function renderSearchResults(matches) {
    searchResults.innerHTML = "";

    if (!matches.length) {
        showAlert(searchMessage, "No token found for that name or token number.", "danger");
        return;
    }

    searchMessage.classList.add("d-none");

    matches.forEach((token) => {
        const item = document.createElement("div");
        item.className = "board-item";
        item.innerHTML = `
            <div class="board-item__meta">
                <strong class="text-white d-block">T-${token.tokenNumber} | ${token.name}</strong>
                <small>${formatService(token.serviceType)} | ${formatPriority(token.priorityLevel)}</small>
            </div>
            <div class="text-end">
                <div class="text-white fw-semibold">${token.status}</div>
                <small>${token.status === "WAITING" && token.queuePosition ? `${token.queuePosition}${ordinalSuffix(token.queuePosition)} in line | ${token.estimatedWaitMinutes ?? 0} min` : "Queue history"}</small>
            </div>
        `;
        searchResults.appendChild(item);
    });
}

function syncTrackedToken(status) {
    if (!trackedToken) {
        renderTracker(status, null);
        return;
    }

    const matchingWaitingToken = (status.waitingTokens || []).find((token) => token.tokenNumber === trackedToken.tokenNumber);
    const currentServing = status.currentlyServing;

    if (matchingWaitingToken) {
        trackedToken = matchingWaitingToken;
        saveTrackedToken(trackedToken);
        renderGeneratedToken(trackedToken);
        renderTracker(status, "WAITING");
        if (trackedToken.nearTurn) {
            notifyOnce(`near-${trackedToken.tokenNumber}`, `Token T-${trackedToken.tokenNumber} is almost up. You're ${trackedToken.queuePosition}${ordinalSuffix(trackedToken.queuePosition)} in line.`);
        }
        return;
    }

    if (currentServing && currentServing.tokenNumber === trackedToken.tokenNumber) {
        renderTracker(status, "CURRENT");
        if (notifyOnce(`current-${trackedToken.tokenNumber}`, `Token T-${trackedToken.tokenNumber}, please proceed to the counter now.`)) {
            playNotificationTone();
        }
        return;
    }

    renderTracker(status, "SERVED");
}

function loadTrackedToken() {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
}

function saveTrackedToken(token) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(token));
}

function notifyOnce(key, message) {
    if (lastNotificationKey === key) {
        return false;
    }
    lastNotificationKey = key;
    showToast(message);
    return true;
}

function showAlert(element, message, type) {
    element.textContent = message;
    element.className = `alert smart-alert mt-3 alert-${type}`;
    element.classList.remove("d-none");
}

function showToast(message) {
    notificationToast.textContent = message;
    notificationToast.classList.add("show");
    setTimeout(() => notificationToast.classList.remove("show"), 3200);
}

function renderQrCode(token) {
    if (typeof QRCode === "undefined" || !tokenQrCode) {
        return;
    }

    const qrPayload = JSON.stringify({
        tokenNumber: token.tokenNumber,
        name: token.name,
        serviceType: token.serviceType,
        priorityLevel: token.priorityLevel,
        queuePosition: token.queuePosition,
        estimatedWaitMinutes: token.estimatedWaitMinutes
    });

    tokenQrCode.innerHTML = "";
    QRCode.toCanvas(qrPayload, {
        width: 96,
        margin: 1,
        color: {
            dark: "#13213a",
            light: "#ffffff"
        }
    }, (error, canvas) => {
        if (error) {
            tokenQrCode.textContent = "QR unavailable";
            return;
        }
        tokenQrCode.appendChild(canvas);
    });
}

function syncCountdown(token) {
    const minutes = token?.estimatedWaitMinutes;
    countdownRemainingSeconds = minutes != null ? Math.max(0, Math.round(minutes * 60)) : null;
    updateCountdownLabel();
    startCountdown();
}

function startCountdown() {
    stopCountdown();
    if (countdownRemainingSeconds == null) {
        return;
    }

    countdownIntervalId = window.setInterval(() => {
        if (countdownRemainingSeconds == null) {
            stopCountdown();
            return;
        }

        if (countdownRemainingSeconds > 0) {
            countdownRemainingSeconds -= 1;
        }

        updateCountdownLabel();
    }, 1000);
}

function stopCountdown() {
    if (countdownIntervalId) {
        window.clearInterval(countdownIntervalId);
        countdownIntervalId = null;
    }
}

function updateCountdownLabel() {
    if (!generatedCountdown) {
        return;
    }

    if (countdownRemainingSeconds == null) {
        generatedCountdown.textContent = "-";
        return;
    }

    if (countdownRemainingSeconds <= 0) {
        generatedCountdown.textContent = "Now";
        return;
    }

    const minutes = Math.floor(countdownRemainingSeconds / 60);
    const seconds = countdownRemainingSeconds % 60;
    generatedCountdown.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
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

function formatDateTime(value) {
    if (!value) {
        return "Just now";
    }
    return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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

function playNotificationTone() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
        return;
    }
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gainNode.gain.value = 0.04;
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.18);
}

refreshUserView();
setInterval(refreshUserView, 4000);
