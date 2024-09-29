document.getElementById("create-room").addEventListener("click", async () => {
  try {
    let clientId = localStorage.getItem("clientId");
    if (!clientId) {
      clientId = await generateClientId();
      localStorage.setItem("clientId", clientId);
    }

    const response = await fetch("/create-room", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ clientId }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Room created successfully:", data);

    if (data.token) {
      localStorage.setItem("authToken", data.token);
    }

    window.location.href = `/room/${data.roomId}`;
  } catch (error) {
    console.error("Error creating room:", error);
    alert("Failed to create room. Please try again.");
  }
});

async function generateClientId() {
  const array = new Uint32Array(4);
  crypto.getRandomValues(array);
  return Array.from(array, (dec) => ("0" + dec.toString(16)).substr(-2)).join(
    ""
  );
}

document.getElementById("join-room").addEventListener("click", () => {
  const roomId = document.getElementById("room-id").value;
  if (roomId) {
    window.location.href = `/room/${roomId}`;
  } else {
    alert("Please enter a room ID.");
  }
});
