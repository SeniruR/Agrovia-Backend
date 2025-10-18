const { Server } = require('socket.io');

let ioInstance = null;

const initSocket = (httpServer, corsConfig = {}) => {
  ioInstance = new Server(httpServer, { cors: corsConfig });
  return ioInstance;
};

const getIO = () => {
  if (!ioInstance) {
    throw new Error('Socket.io instance has not been initialised.');
  }
  return ioInstance;
};

module.exports = {
  initSocket,
  getIO
};
