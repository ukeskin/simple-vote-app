const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const { v4: uuidv4 } = require("uuid");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static("public"));
app.use(express.json());

// SQLite database setup
const db = new sqlite3.Database("voting.db");

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    host_id TEXT,
    voting_active INTEGER DEFAULT 0,
    voting_duration INTEGER DEFAULT 0,
    voting_end_time INTEGER DEFAULT 0
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id TEXT,
    client_id TEXT,
    vote INTEGER,
    FOREIGN KEY (room_id) REFERENCES rooms (id)
  )`);
});

// Helper functions
const runQuery = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

const getQuery = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const getAllQuery = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Room functions
const createRoom = async (hostId) => {
  const roomId = uuidv4();
  await runQuery("INSERT INTO rooms (id, host_id) VALUES (?, ?)", [
    roomId,
    hostId,
  ]);
  return roomId;
};

const getRoomData = (roomId) => {
  return getQuery("SELECT * FROM rooms WHERE id = ?", [roomId]);
};

const updateRoomVotingStatus = (roomId, active, duration, endTime) => {
  return runQuery(
    "UPDATE rooms SET voting_active = ?, voting_duration = ?, voting_end_time = ? WHERE id = ?",
    [active ? 1 : 0, duration, endTime, roomId]
  );
};

// Vote functions
const addVote = (roomId, clientId, vote) => {
  return runQuery(
    "INSERT INTO votes (room_id, client_id, vote) VALUES (?, ?, ?)",
    [roomId, clientId, vote]
  );
};

const getVotes = (roomId) => {
  return getAllQuery("SELECT vote FROM votes WHERE room_id = ?", [roomId]);
};

// Routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/create-room", async (req, res) => {
  try {
    const clientId = uuidv4();
    const roomId = await createRoom(clientId);
    res.json({ roomId, clientId });
  } catch (error) {
    console.error("Error creating room:", error);
    res.status(500).json({ error: "Failed to create room" });
  }
});

app.get("/room/:roomId", async (req, res) => {
  const roomId = req.params.roomId;
  try {
    const room = await getRoomData(roomId);
    if (room) {
      res.sendFile(path.join(__dirname, "public", "room.html"));
    } else {
      res.redirect("/");
    }
  } catch (error) {
    console.error("Error checking room existence:", error);
    res.status(500).send("Internal Server Error");
  }
});

// WebSocket handling
wss.on("connection", (ws) => {
  ws.on("message", async (message) => {
    const data = JSON.parse(message);

    switch (data.type) {
      case "join":
        try {
          const room = await getRoomData(data.roomId);
          if (room) {
            const isHost = room.host_id === data.clientId;
            ws.roomId = data.roomId;
            ws.clientId = data.clientId;
            ws.send(
              JSON.stringify({
                type: "joined",
                roomId: data.roomId,
                isHost: isHost,
                status: room.voting_active ? "active" : "waiting",
              })
            );
            if (room.voting_active) {
              const votes = await getVotes(data.roomId);
              ws.send(
                JSON.stringify({
                  type: "results",
                  results: calculateResults(votes),
                })
              );
            }
          } else {
            ws.send(
              JSON.stringify({ type: "error", message: "Room not found" })
            );
          }
        } catch (error) {
          console.error("Error joining room:", error);
          ws.send(
            JSON.stringify({ type: "error", message: "Error joining room" })
          );
        }
        break;

      case "vote":
        try {
          const room = await getRoomData(ws.roomId);
          if (room && room.voting_active && Date.now() < room.voting_end_time) {
            await addVote(ws.roomId, ws.clientId, Math.round(data.value));
            ws.send(
              JSON.stringify({
                type: "voteConfirmation",
                value: Math.round(data.value),
              })
            );
            const votes = await getVotes(ws.roomId);
            broadcastToRoom(ws.roomId, {
              type: "results",
              results: calculateResults(votes),
            });
          } else {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "Voting is not active or has ended",
              })
            );
          }
        } catch (error) {
          console.error("Error processing vote:", error);
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Error processing your vote",
            })
          );
        }
        break;

      case "start-vote":
        try {
          const room = await getRoomData(ws.roomId);
          if (room && room.host_id === ws.clientId && !room.voting_active) {
            const votingDuration = data.duration;
            const votingEndTime = Date.now() + votingDuration;
            await updateRoomVotingStatus(
              ws.roomId,
              true,
              votingDuration,
              votingEndTime
            );
            broadcastToRoom(ws.roomId, { type: "status", status: "active" });

            setTimeout(() => {
              endVoting(ws.roomId);
            }, votingDuration);
          }
        } catch (error) {
          console.error("Error starting vote:", error);
          ws.send(
            JSON.stringify({ type: "error", message: "Error starting vote" })
          );
        }
        break;

      case "end-vote":
        try {
          const room = await getRoomData(ws.roomId);
          if (room && room.host_id === ws.clientId && room.voting_active) {
            await endVoting(ws.roomId);
          }
        } catch (error) {
          console.error("Error ending vote:", error);
          ws.send(
            JSON.stringify({ type: "error", message: "Error ending vote" })
          );
        }
        break;
    }
  });
});

async function endVoting(roomId) {
  await updateRoomVotingStatus(roomId, false, 0, 0);
  broadcastToRoom(roomId, { type: "status", status: "ended" });
  const votes = await getVotes(roomId);
  broadcastToRoom(roomId, {
    type: "results",
    results: calculateResults(votes),
  });
}

function calculateResults(votes) {
  const voteCounts = {};
  for (const vote of votes) {
    voteCounts[vote.vote] = (voteCounts[vote.vote] || 0) + 1;
  }
  const totalVotes = votes.length;
  return Object.entries(voteCounts)
    .map(([rating, count]) => ({
      rating: parseInt(rating),
      count,
      percentage: totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0,
    }))
    .sort((a, b) => b.rating - a.rating);
}

function broadcastToRoom(roomId, message) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client.roomId === roomId) {
      client.send(JSON.stringify(message));
    }
  });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
