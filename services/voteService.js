const { Vote } = require("../db");

const addVote = async (roomId, clientId, vote) => {
  if (!clientId) {
    throw new Error("Client ID is required");
  }
  const existingVote = await Vote.findOne({
    where: { RoomId: roomId, client_id: clientId },
  });
  if (existingVote) {
    throw new Error("You have already voted in this session");
  }
  await Vote.create({ RoomId: roomId, client_id: clientId, vote });
};

const getVotes = async (roomId) => {
  return await Vote.findAll({
    where: { RoomId: roomId },
    attributes: ["vote", "client_id"],
  });
};

module.exports = {
  addVote,
  getVotes,
};
