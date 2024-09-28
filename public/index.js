document.getElementById("create-room").addEventListener("click", () => {
  fetch("/create-room", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      console.log("Room created successfully:", data);
      localStorage.setItem("clientId", data.clientId);
      window.location.href = `/room/${data.roomId}`;
    })
    .catch((error) => {
      console.error("Error creating room:", error);
      alert("Failed to create room. Please try again.");
    });
});

document.getElementById("join-room").addEventListener("click", () => {
  const roomId = document.getElementById("room-id").value;
  if (roomId) {
    window.location.href = `/room/${roomId}`;
  } else {
    alert("Please enter a room ID.");
  }
});
