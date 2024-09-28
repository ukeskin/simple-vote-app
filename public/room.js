let ws;
let isConnected = false;
let selectedVote = null;
let votingStatus = "waiting";
let isHost = false;
let clientId;

function connectWebSocket() {
  const roomId = window.location.pathname.split("/").pop();
  clientId = localStorage.getItem("clientId");
  ws = new WebSocket(`ws://${window.location.host}`);

  ws.onopen = () => {
    console.log("Connected to the voting server.");
    isConnected = true;
    updateConnectionStatus();
    ws.send(JSON.stringify({ type: "join", roomId, clientId }));
  };

  ws.onmessage = (message) => {
    const data = JSON.parse(message.data);
    console.log("Received message:", data);
    switch (data.type) {
      case "joined":
        document.getElementById(
          "room-id"
        ).innerText = `Room ID: ${data.roomId}`;
        isHost = data.isHost;
        updateHostControls();
        updateVotingStatus(data.status);
        break;
      case "results":
        displayResults(data.results);
        break;
      case "status":
        updateVotingStatus(data.status);
        break;
      case "voteConfirmation":
        selectedVote = data.value;
        updateVoteButtons();
        break;
      case "error":
        alert(data.message);
        break;
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
    setTimeout(connectWebSocket, 5000);
  };
}

function submitVote(vote) {
  if (isConnected && votingStatus === "active") {
    ws.send(JSON.stringify({ type: "vote", value: vote }));
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

function updateVoteButtons() {
  const buttons = document.getElementsByClassName("vote-button");
  for (let button of buttons) {
    button.disabled = votingStatus !== "active";
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
      statusText = isHost
        ? "Click 'Start Voting' to begin"
        : "Waiting for host to start voting...";
      break;
    case "active":
      statusText = "Voting is active! Cast your vote now.";
      break;
    case "ended":
      statusText = "Voting has ended. Thanks for participating!";
      break;
    case "error":
      statusText = "An error occurred. Please try refreshing the page.";
      break;
    case "disconnected":
      statusText = "Disconnected from server. Attempting to reconnect...";
      break;
  }
  statusElement.innerText = statusText;
  updateVoteButtons();
}

function updateHostControls() {
  const hostControls = document.getElementById("host-controls");
  if (isHost) {
    hostControls.style.display = "block";
  } else {
    hostControls.style.display = "none";
  }
}

document.getElementById("start-vote").addEventListener("click", () => {
  const duration = parseInt(document.getElementById("duration").value);
  if (duration > 0) {
    ws.send(JSON.stringify({ type: "start-vote", duration: duration * 1000 }));
  } else {
    alert("Please enter a valid duration.");
  }
});

document.getElementById("end-vote").addEventListener("click", () => {
  ws.send(JSON.stringify({ type: "end-vote" }));
});

createVoteButtons();
connectWebSocket();
