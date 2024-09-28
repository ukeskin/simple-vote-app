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
