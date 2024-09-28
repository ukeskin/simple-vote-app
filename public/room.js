let ws;
let isConnected = false;
let selectedVote = null;
let votingStatus = "waiting";
let isHost = false;
let clientId;
let voteResult = null;

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

  ws.onmessage = (message) => handleWebSocketMessage(JSON.parse(message.data));

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

function handleWebSocketMessage(data) {
  console.log("Received message:", data);
  switch (data.type) {
    case "joined":
      handleJoined(data);
      break;
    case "results":
      displayResults(data.results);
      break;
    case "status":
      updateVotingStatus(data.status);
      break;
    case "voteConfirmation":
      handleVoteConfirmation(data);
      break;
    case "error":
      alert(data.message);
      break;
    case "voteResult":
      handleVoteResult(data.result);
      break;
  }
}

function handleJoined(data) {
  document.getElementById("room-id").innerText = `Room ID: ${data.roomId}`;
  isHost = data.isHost;
  updateHostControls();
  updateVotingStatus(data.status);
}

function handleVoteConfirmation(data) {
  selectedVote = data.value;
  updateVoteButtons();
}

function handleVoteResult(result) {
  voteResult = result;
  displayVoteResult();
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
  resultDiv.innerHTML =
    "<h2 class='text-xl font-bold mb-4 text-gray-900 dark:text-white'>Voting Results:</h2>";
  const chart = document.createElement("div");
  chart.className = "space-y-2";
  results.forEach((result) => {
    const bar = document.createElement("div");
    bar.className = "flex items-center";
    bar.innerHTML = `
      <span class="text-sm font-medium text-blue-700 dark:text-white w-9">${result.rating}</span>
      <div class="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 ml-2">
        <div class="bg-blue-600 h-2.5 rounded-full" style="width: ${result.percentage}%"></div>
      </div>
      <span class="text-sm font-medium text-blue-700 dark:text-white w-32 text-right">${result.count} (${result.percentage}%)</span>
    `;
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
    button.className =
      "w-full text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800 disabled:opacity-50 disabled:cursor-not-allowed";
    buttonContainer.appendChild(button);
  }
}

function updateVoteButtons() {
  const buttons = document.getElementById("vote-buttons").children;
  for (let button of buttons) {
    button.disabled = votingStatus !== "active";
    button.classList.toggle(
      "bg-green-700",
      parseInt(button.innerText) === selectedVote
    );
    button.classList.toggle(
      "hover:bg-green-800",
      parseInt(button.innerText) === selectedVote
    );
  }
}

function updateConnectionStatus() {
  const statusElement = document.getElementById("connection-status");
  statusElement.innerText = isConnected ? "Connected" : "Disconnected";
  statusElement.className = isConnected
    ? "text-green-700 dark:text-green-400"
    : "text-red-700 dark:text-red-400";
}

function updateVotingStatus(status) {
  votingStatus = status;
  const statusElement = document.getElementById("voting-status");
  let statusText = "";
  let statusClass = "";
  switch (status) {
    case "waiting":
      statusText = isHost
        ? "Click 'Start Voting' to begin"
        : "Waiting for host to start voting...";
      statusClass =
        "text-blue-800 bg-blue-50 dark:bg-gray-800 dark:text-blue-400";
      break;
    case "active":
      statusText = "Voting is active! Cast your vote now.";
      statusClass =
        "text-green-800 bg-green-50 dark:bg-gray-800 dark:text-green-400";
      break;
    case "ended":
      statusText = "Voting has ended. Thanks for participating!";
      statusClass =
        "text-gray-800 bg-gray-50 dark:bg-gray-800 dark:text-gray-400";
      break;
    case "error":
      statusText = "An error occurred. Please try refreshing the page.";
      statusClass = "text-red-800 bg-red-50 dark:bg-gray-800 dark:text-red-400";
      break;
    case "disconnected":
      statusText = "Disconnected from server. Attempting to reconnect...";
      statusClass =
        "text-yellow-800 bg-yellow-50 dark:bg-gray-800 dark:text-yellow-400";
      break;
  }
  statusElement.innerText = statusText;
  statusElement.className = `p-4 mb-4 text-sm rounded-lg ${statusClass}`;
  updateVoteButtons();
}

function updateHostControls() {
  const hostControls = document.getElementById("host-controls");
  hostControls.style.display = isHost ? "block" : "none";
}

function displayVoteResult() {
  if (!voteResult) return;

  const resultArea = document.getElementById("vote-result");
  resultArea.innerHTML = `
    <div class="p-4 mb-4 text-sm text-blue-800 rounded-lg bg-blue-50 dark:bg-gray-800 dark:text-blue-400" role="alert">
      <span class="font-medium">Final Vote Result:</span> ${voteResult}
    </div>
    <div class="flex flex-wrap gap-2 justify-center">
      <button type="button" class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800" onclick="requestNewVote()">Request New Vote</button>
      <button type="button" class="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700" onclick="copyResult()">Copy Result</button>
    </div>
  `;
}

function requestNewVote() {
  if (isHost) {
    ws.send(JSON.stringify({ type: "request-new-vote" }));
  } else {
    alert("Only the host can start a new vote.");
  }
}

function copyResult() {
  if (!voteResult) return;
  navigator.clipboard.writeText(`Final Vote Result: ${voteResult}`).then(() => {
    alert("Result copied to clipboard!");
  });
}

function endVote() {
  ws.send(JSON.stringify({ type: "end-vote", roomId }));
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

document.getElementById("share-link").addEventListener("click", () => {
  const roomId = window.location.pathname.split("/").pop();
  const roomLink = `${window.location.origin}/room/${roomId}`;

  if (navigator.share) {
    navigator
      .share({
        title: "Join my voting room",
        text: "Click this link to join my voting room:",
        url: roomLink,
      })
      .then(() => {
        const shareMessage = document.getElementById("share-message");
        shareMessage.textContent = "Room link shared successfully!";
        setTimeout(() => {
          shareMessage.textContent = "";
        }, 3000);
      })
      .catch((error) => console.log("Error sharing:", error));
  } else {
    navigator.clipboard.writeText(roomLink).then(() => {
      const shareMessage = document.getElementById("share-message");
      shareMessage.textContent = "Room link copied to clipboard!";
      setTimeout(() => {
        shareMessage.textContent = "";
      }, 3000);
    });
  }
});

createVoteButtons();
connectWebSocket();
