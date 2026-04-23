const API_BASE_URL = "http://localhost:8080/api/tokens";

const tokenForm = document.getElementById("tokenForm");
const nameInput = document.getElementById("name");
const formMessage = document.getElementById("formMessage");
const generatedTokenCard = document.getElementById("generatedTokenCard");
const generatedTokenNumber = document.getElementById("generatedTokenNumber");
const generatedTokenName = document.getElementById("generatedTokenName");
const currentServing = document.getElementById("currentServing");
const waitingCount = document.getElementById("waitingCount");
const nextToken = document.getElementById("nextToken");
const queueList = document.getElementById("queueList");
const queueEmptyState = document.getElementById("queueEmptyState");

tokenForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = nameInput.value.trim();
    if (!name) {
        showMessage(formMessage, "Please enter your name.", "error");
        return;
    }

    try {
        const response = await fetch(API_BASE_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ name })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(extractErrorMessage(data));
        }

        generatedTokenNumber.textContent = `Token ${data.tokenNumber}`;
        generatedTokenName.textContent = `Issued for ${data.name}`;
        generatedTokenCard.classList.remove("hidden");
        showMessage(formMessage, `Token ${data.tokenNumber} generated successfully.`, "success");
        nameInput.value = "";
        await loadQueueStatus();
    } catch (error) {
        showMessage(formMessage, error.message || "Unable to generate token.", "error");
    }
});

async function loadQueueStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/status`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(extractErrorMessage(data));
        }

        currentServing.textContent = data.currentlyServing
            ? `Now serving token ${data.currentlyServing.tokenNumber}`
            : "No token served yet";

        waitingCount.textContent = data.waitingCount;
        nextToken.textContent = data.nextTokenNumber ? `Token ${data.nextTokenNumber}` : "-";
        renderQueue(data.waitingTokens);
    } catch (error) {
        showMessage(formMessage, error.message || "Unable to load queue status.", "error");
    }
}

function renderQueue(tokens) {
    queueList.innerHTML = "";

    if (!tokens.length) {
        queueEmptyState.classList.remove("hidden");
        return;
    }

    queueEmptyState.classList.add("hidden");

    tokens.forEach((token, index) => {
        const item = document.createElement("li");
        item.className = "queue-item";
        item.innerHTML = `
            <div>
                <strong>${token.name}</strong>
                <div class="muted">Waiting position: ${index + 1}</div>
            </div>
            <span class="token-badge">Token ${token.tokenNumber}</span>
        `;
        queueList.appendChild(item);
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
