const API_BASE_URL = "http://localhost:8080/api/tokens";

const serveNextBtn = document.getElementById("serveNextBtn");
const resetQueueBtn = document.getElementById("resetQueueBtn");
const adminMessage = document.getElementById("adminMessage");
const adminCurrentServing = document.getElementById("adminCurrentServing");
const servedName = document.getElementById("servedName");
const adminWaitingCount = document.getElementById("adminWaitingCount");
const adminNextToken = document.getElementById("adminNextToken");
const adminQueueList = document.getElementById("adminQueueList");
const adminQueueEmptyState = document.getElementById("adminQueueEmptyState");

serveNextBtn.addEventListener("click", async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/next`, {
            method: "PUT"
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(extractErrorMessage(data));
        }

        showMessage(adminMessage, `Now serving token ${data.tokenNumber} for ${data.name}.`, "success");
        await loadQueueStatus();
    } catch (error) {
        showMessage(adminMessage, error.message || "Unable to serve next token.", "error");
    }
});

resetQueueBtn.addEventListener("click", async () => {
    const confirmed = window.confirm("Are you sure you want to reset the entire queue?");
    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/reset`, {
            method: "DELETE"
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(extractErrorMessage(data));
        }

        showMessage(adminMessage, "Queue reset successfully.", "success");
        await loadQueueStatus();
    } catch (error) {
        showMessage(adminMessage, error.message || "Unable to reset queue.", "error");
    }
});

async function loadQueueStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/status`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(extractErrorMessage(data));
        }

        if (data.currentlyServing) {
            adminCurrentServing.textContent = `Token ${data.currentlyServing.tokenNumber}`;
            servedName.textContent = `Serving ${data.currentlyServing.name}`;
        } else {
            adminCurrentServing.textContent = "No token served yet";
            servedName.textContent = "Waiting for next action";
        }

        adminWaitingCount.textContent = data.waitingCount;
        adminNextToken.textContent = data.nextTokenNumber ? `Token ${data.nextTokenNumber}` : "-";
        renderQueue(data.waitingTokens);
    } catch (error) {
        showMessage(adminMessage, error.message || "Unable to load queue data.", "error");
    }
}

function renderQueue(tokens) {
    adminQueueList.innerHTML = "";

    if (!tokens.length) {
        adminQueueEmptyState.classList.remove("hidden");
        return;
    }

    adminQueueEmptyState.classList.add("hidden");

    tokens.forEach((token, index) => {
        const item = document.createElement("li");
        item.className = "queue-item";
        item.innerHTML = `
            <div>
                <strong>${token.name}</strong>
                <div class="muted">Position ${index + 1} in queue</div>
            </div>
            <span class="token-badge">Token ${token.tokenNumber}</span>
        `;
        adminQueueList.appendChild(item);
    });
}

function showMessage(element, message, type) {
    element.textContent = message;
    element.className = `message ${type}`;
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

loadQueueStatus();
setInterval(loadQueueStatus, 4000);
