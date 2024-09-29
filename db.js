const { Sequelize, DataTypes } = require("sequelize");

const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "voting.db",
  logging: false,
  define: {
    freezeTableName: true,
    underscored: true,
  },
});

const Room = sequelize.define("Room", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  host_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  voting_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  voting_duration: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  voting_end_time: {
    type: DataTypes.DATE,
  },
  options: {
    type: DataTypes.JSON,
    defaultValue: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  },
});

const Vote = sequelize.define("Vote", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  client_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  vote: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

Room.hasMany(Vote);
Vote.belongsTo(Room);

module.exports = {
  sequelize,
  Room,
  Vote,
};
