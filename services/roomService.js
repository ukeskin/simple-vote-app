const { Room } = require("../db");

const createRoom = async (hostId) => {
  if (!hostId) {
    throw new Error("Host ID is required to create a room");
  }
  const room = await Room.create({ host_id: hostId });
  return room.id;
};

const getRoomData = async (roomId) => {
  return await Room.findByPk(roomId);
};

const updateRoomVotingStatus = async (roomId, active, duration, endTime) => {
  await Room.update(
    {
      voting_active: active,
      voting_duration: duration,
      voting_end_time: endTime,
    },
    { where: { id: roomId } }
  );
};

const updateRoomOptions = async (roomId, options) => {
  await Room.update({ options }, { where: { id: roomId } });
};

const isRoomHost = async (roomId, clientId) => {
  const room = await Room.findByPk(roomId);
  return room && room.host_id === clientId;
};

module.exports = {
  createRoom,
  getRoomData,
  updateRoomVotingStatus,
  updateRoomOptions,
  isRoomHost,
};
