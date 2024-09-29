let ws;
let isConnected = false;
let selectedVote = null;
let votingStatus = "waiting";

function startVote() {
  ws = new WebSocket(`ws://${window.location.host}`);
  ws.onopen = () => {
    console.log("Connected to the voting server.");
    isConnected = true;
    updateConnectionStatus();
  };

  ws.onmessage = (message) => {
    const data = JSON.parse(message.data);
    if (data.type === "results") {
      displayResults(data.results);
    } else if (data.type === "timer") {
      updateTimer(data.timeLeft);
    } else if (data.type === "status") {
      updateVotingStatus(data.status);
    } else {
      console.log(data.message);
    }
  };

  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
    isConnected = false;
    updateConnectionStatus();
    updateVotingStatus("error");
  };

  ws.onclose = () => {
    console.log("Disconnected from the voting server.");
    isConnected = false;
    updateConnectionStatus();
    updateVotingStatus("disconnected");
    setTimeout(startVote, 5000); // Attempt to reconnect every 5 seconds
  };
}

function submitVote(vote) {
  if (isConnected && votingStatus === "active") {
    ws.send(JSON.stringify({ type: "vote", value: vote }));
    selectedVote = vote;
    updateVoteButtons();
  } else if (!isConnected) {
    console.error("WebSocket is not connected. Attempting to reconnect...");
    startVote();
  } else {
    alert("Voting is not currently active.");
  }
}

function displayResults(results) {
  const resultDiv = document.getElementById("vote-result");
  resultDiv.innerHTML = "<h2>Voting Results:</h2>";
  const chart = document.createElement("div");
  chart.className = "result-chart";
  results.forEach((result) => {
    const bar = document.createElement("div");
    bar.className = "result-bar";
    bar.style.width = `${result.percentage}%`;
    bar.innerHTML = `<span>${result.rating}: ${result.count} (${result.percentage}%)</span>`;
    chart.appendChild(bar);
  });
  resultDiv.appendChild(chart);
}

function createVoteButtons() {
  const buttonContainer = document.getElementById("vote-buttons");
  for (let i = 1; i <= 10; i++) {
    const button = document.createElement("button");
    button.innerText = i;
    button.onclick = () => submitVote(i);
    button.disabled = true;
    button.className = "vote-button";
    buttonContainer.appendChild(button);
  }
}

function enableVoteButtons() {
  const buttons = document.getElementsByClassName("vote-button");
  for (let button of buttons) {
    button.disabled = false;
  }
}

function disableVoteButtons() {
  const buttons = document.getElementsByClassName("vote-button");
  for (let button of buttons) {
    button.disabled = true;
  }
}

function updateVoteButtons() {
  const buttons = document.getElementsByClassName("vote-button");
  for (let button of buttons) {
    button.classList.toggle(
      "voted",
      parseInt(button.innerText) === selectedVote
    );
  }
}

function updateConnectionStatus() {
  const statusElement = document.getElementById("connection-status");
  statusElement.innerText = isConnected ? "Connected" : "Disconnected";
  statusElement.className = isConnected
    ? "connection-status connected"
    : "connection-status disconnected";
}

function updateVotingStatus(status) {
  votingStatus = status;
  const statusElement = document.getElementById("voting-status");
  let statusText = "";
  switch (status) {
    case "waiting":
      statusText = "Waiting for admin to start voting...";
      disableVoteButtons();
      break;
    case "active":
      statusText = "Voting is active! Cast your vote now.";
      enableVoteButtons();
      break;
    case "ended":
      statusText = "Voting has ended. Thanks for participating!";
      disableVoteButtons();
      break;
    case "error":
      statusText = "An error occurred. Please try refreshing the page.";
      disableVoteButtons();
      break;
    case "disconnected":
      statusText = "Disconnected from server. Attempting to reconnect...";
      disableVoteButtons();
      break;
  }
  statusElement.innerText = statusText;
}

function updateTimer(timeLeft) {
  const timerElement = document.getElementById("timer");
  if (timeLeft > 0) {
    timerElement.innerText = `Time left: ${Math.ceil(timeLeft / 1000)} seconds`;
  } else {
    timerElement.innerText = "Voting has ended";
    updateVotingStatus("ended");
  }
}

createVoteButtons();
startVote();

// Generate a unique client ID using Web Crypto API
async function generateClientId() {
  const array = new Uint32Array(4);
  crypto.getRandomValues(array);
  return Array.from(array, (dec) => ("0" + dec.toString(16)).substr(-2)).join(
    ""
  );
}

// Function to get or create a client ID
async function getClientId() {
  let clientId = localStorage.getItem("clientId");
  if (!clientId) {
    clientId = await generateClientId();
    localStorage.setItem("clientId", clientId);
  }
  return clientId;
}

// Modify the createRoom function
async function createRoom() {
  const clientId = await getOrCreateClientId();
  console.log("Client ID:", clientId);
  try {
    const response = await fetch("/create-room", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ clientId }),
    });
    const data = await response.json();
    if (data.token) {
      localStorage.setItem("authToken", data.token);
    }
    if (data.roomId) {
      window.location.href = `/room/${data.roomId}`;
    } else {
      throw new Error("Room ID not received");
    }
  } catch (error) {
    console.error("Error creating room:", error);
    alert("Failed to create room. Please try again.");
  }
}

async function getOrCreateClientId() {
  let clientId = localStorage.getItem("clientId");
  if (!clientId) {
    clientId = await generateClientId();
    localStorage.setItem("clientId", clientId);
  }
  return clientId;
}

async function generateClientId() {
  const array = new Uint32Array(4);
  crypto.getRandomValues(array);
  return Array.from(array, (dec) => ("0" + dec.toString(16)).substr(-2)).join(
    ""
  );
}

// Call this function when the "Create Room" button is clicked
document
  .getElementById("create-room-button")
  .addEventListener("click", createRoom);
