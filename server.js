const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");
const db = require("./db");
const roomService = require("./services/roomService");
const voteService = require("./services/voteService");
const jwt = require("jsonwebtoken");
const SECRET_KEY = process.env.JWT_SECRET || "your-secret-key";

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static("public"));
app.use(express.json());

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers["authorization"];
  if (!token) return res.status(403).json({ error: "No token provided" });

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err)
      return res.status(500).json({ error: "Failed to authenticate token" });
    req.clientId = decoded.clientId;
    next();
  });
};

// Routes
app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "index.html"))
);

app.post("/create-room", async (req, res) => {
  try {
    const { clientId } = req.body;
    if (!clientId) {
      return res.status(400).json({ error: "Client ID is required" });
    }
    const roomId = await roomService.createRoom(clientId);
    const token = jwt.sign({ clientId }, SECRET_KEY, { expiresIn: "1h" });
    res.json({ roomId, token });
  } catch (error) {
    console.error("Error creating room:", error);
    res.status(500).json({ error: "Failed to create room" });
  }
});

app.get("/room/:roomId", async (req, res) => {
  try {
    const room = await roomService.getRoomData(req.params.roomId);
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

// Modify the route to check if a user is the host
app.get("/api/is-host/:roomId/:clientId", async (req, res) => {
  try {
    const isHost = await roomService.isRoomHost(
      req.params.roomId,
      req.params.clientId
    );
    res.json({ isHost });
  } catch (error) {
    console.error("Error checking host status:", error);
    res.status(500).json({ error: "Failed to check host status" });
  }
});

// WebSocket handling
wss.on("connection", (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const token = url.searchParams.get("token");

  if (token) {
    jwt.verify(token, SECRET_KEY, (err, decoded) => {
      if (err) {
        console.error("Invalid token:", err);
        ws.close(1008, "Invalid token");
        return;
      }
      ws.clientId = decoded.clientId;
      setupWebSocketHandlers(ws);
    });
  } else {
    // Allow connection without token, but don't set clientId
    setupWebSocketHandlers(ws);
  }
});

function setupWebSocketHandlers(ws) {
  ws.on("message", async (message) => {
    const data = JSON.parse(message);

    switch (data.type) {
      case "join":
        await handleJoin(ws, data);
        break;
      case "vote":
        await handleVote(ws, data);
        break;
      case "start-vote":
        await handleStartVote(ws, data);
        break;
      case "end-vote":
        await handleEndVote(ws);
        break;
      case "update-options":
        await handleUpdateOptions(ws, data);
        break;
      case "request-new-vote":
        await handleRequestNewVote(ws);
        break;
    }
  });
}

async function handleJoin(ws, data) {
  try {
    const room = await roomService.getRoomData(data.roomId);
    if (room) {
      ws.roomId = data.roomId;
      ws.clientId = data.clientId;
      console.log(`Client joined: ${ws.clientId}`); // Add this line for debugging
      ws.send(
        JSON.stringify({
          type: "joined",
          roomId: data.roomId,
          isHost: room.host_id === data.clientId,
          status: room.voting_active ? "active" : "waiting",
          options: room.options,
        })
      );
      if (room.voting_active) {
        const votes = await voteService.getVotes(data.roomId);
        ws.send(
          JSON.stringify({ type: "results", results: calculateResults(votes) })
        );
      }
    } else {
      ws.send(JSON.stringify({ type: "error", message: "Room not found" }));
    }
  } catch (error) {
    console.error("Error joining room:", error);
    ws.send(JSON.stringify({ type: "error", message: "Error joining room" }));
  }
}

async function handleVote(ws, data) {
  try {
    const room = await roomService.getRoomData(ws.roomId);
    if (room && room.voting_active && new Date() < room.voting_end_time) {
      if (!ws.clientId) {
        throw new Error("Client ID is not set");
      }
      await voteService.addVote(ws.roomId, ws.clientId, data.value.toString());
      ws.send(
        JSON.stringify({
          type: "voteConfirmation",
          value: data.value,
        })
      );

      const votes = await voteService.getVotes(ws.roomId);
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
        message: error.message,
      })
    );
  }
}

async function handleStartVote(ws, data) {
  try {
    const room = await roomService.getRoomData(ws.roomId);
    if (room && room.host_id === ws.clientId && !room.voting_active) {
      const votingDuration = data.duration;
      const votingEndTime = new Date(Date.now() + votingDuration);
      await roomService.updateRoomVotingStatus(
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
    ws.send(JSON.stringify({ type: "error", message: "Error starting vote" }));
  }
}

async function handleEndVote(ws) {
  try {
    const room = await roomService.getRoomData(ws.roomId);
    if (room && room.host_id === ws.clientId && room.voting_active) {
      await endVoting(ws.roomId);
    }
  } catch (error) {
    console.error("Error ending vote:", error);
    ws.send(JSON.stringify({ type: "error", message: "Error ending vote" }));
  }
}

async function endVoting(roomId) {
  await roomService.updateRoomVotingStatus(roomId, false, 0, null);
  broadcastToRoom(roomId, { type: "status", status: "ended" });
  const votes = await voteService.getVotes(roomId);
  broadcastToRoom(roomId, {
    type: "results",
    results: calculateResults(votes),
  });
}

function calculateResults(votes) {
  const voteCounts = {};
  const totalVotes = votes.length;

  for (const vote of votes) {
    voteCounts[vote.vote] = (voteCounts[vote.vote] || 0) + 1;
  }

  return Object.entries(voteCounts)
    .map(([rating, count]) => ({
      rating: rating,
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

async function handleUpdateOptions(ws, data) {
  try {
    const room = await roomService.getRoomData(data.roomId);
    if (room && room.host_id === ws.clientId && !room.voting_active) {
      await roomService.updateRoomOptions(data.roomId, data.options);
      broadcastToRoom(data.roomId, {
        type: "options-updated",
        options: data.options,
      });
    } else {
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Unauthorized or voting is active",
        })
      );
    }
  } catch (error) {
    console.error("Error updating options:", error);
    ws.send(
      JSON.stringify({ type: "error", message: "Error updating options" })
    );
  }
}

async function handleRequestNewVote(ws) {
  try {
    const room = await roomService.getRoomData(ws.roomId);
    if (room && room.host_id === ws.clientId && !room.voting_active) {
      broadcastToRoom(ws.roomId, { type: "new-vote-requested" });
    } else {
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Unauthorized or voting is active",
        })
      );
    }
  } catch (error) {
    console.error("Error requesting new vote:", error);
    ws.send(
      JSON.stringify({ type: "error", message: "Error requesting new vote" })
    );
  }
}

db.sequelize.sync().then(() => {
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
});
