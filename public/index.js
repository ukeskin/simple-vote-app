document.getElementById("create-room").addEventListener("click", () => {
  fetch("/create-room", { method: "POST" })
    .then((response) => response.json())
    .then((data) => {
      localStorage.setItem("clientId", data.clientId); // Store clientId in localStorage
      window.location.href = `/room/${data.roomId}`;
    });
});

document.getElementById("join-room").addEventListener("click", () => {
  const roomId = document.getElementById("room-id").value;
  if (roomId) {
    window.location.href = `/room/${roomId}`;
  }
});
