let countdownInterval;
let ws;

function startVoting() {
  const maxUsers = document.getElementById("max-users").value;
  const duration = document.getElementById("duration").value;

  fetch("/start-vote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ maxUsers, duration: duration * 1000 }), // Convert to milliseconds
  })
    .then((response) => response.json())
    .then((data) => {
      const statusElement = document.getElementById("status");
      statusElement.innerText = data.message || data.error;
      statusElement.className = data.error ? "status error" : "status success";

      if (!data.error) {
        startCountdown(duration);
        connectWebSocket();
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      const statusElement = document.getElementById("status");
      statusElement.innerText = "An error occurred while starting the vote.";
      statusElement.className = "status error";
    });
}

function startCountdown(duration) {
  const timerElement = document.getElementById("timer");
  let timeLeft = duration;

  clearInterval(countdownInterval);
  countdownInterval = setInterval(() => {
    timerElement.innerText = `Time left: ${timeLeft} seconds`;
    timeLeft--;

    if (timeLeft < 0) {
      clearInterval(countdownInterval);
      timerElement.innerText = "Voting ended";
    }
  }, 1000);
}

function connectWebSocket() {
  ws = new WebSocket(`ws://${window.location.host}`);

  ws.onopen = () => {
    console.log("Admin connected to WebSocket");
  };

  ws.onmessage = (message) => {
    const data = JSON.parse(message.data);
    if (data.type === "results") {
      displayResults(data.results);
    }
  };

  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
  };

  ws.onclose = () => {
    console.log("Admin disconnected from WebSocket");
  };
}

function displayResults(results) {
  const resultDiv = document.getElementById("live-results");
  resultDiv.innerHTML = "<h2>Live Results:</h2>";
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

function endVoting() {
  fetch("/end-vote", {
    method: "POST",
  })
    .then((response) => response.json())
    .then((data) => {
      const statusElement = document.getElementById("status");
      statusElement.innerText = data.message || data.error;
      statusElement.className = data.error ? "status error" : "status success";
      clearInterval(countdownInterval);
      document.getElementById("timer").innerText = "Voting ended";
    })
    .catch((error) => {
      console.error("Error:", error);
      const statusElement = document.getElementById("status");
      statusElement.innerText = "An error occurred while ending the vote.";
      statusElement.className = "status error";
    });
}
