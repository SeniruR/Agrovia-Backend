const socketio = require('socket.io');
let io;

function initSocket(server) {
  io = socketio(server, { cors: { origin: '*' } });

  io.on('connection', (socket) => {
    // Expect client to emit 'register' with user info
    socket.on('register', ({ userId, userType, premium }) => {
      if (userType === 1.1 && premium) {
        socket.join(`premium_farmer_${userId}`);
      }
    });
  });
}

function notifyPremiumFarmers(notification, farmerIds) {
  farmerIds.forEach(id => {
    io.to(`premium_farmer_${id}`).emit('new_pest_alert', notification);
  });
}

module.exports = { initSocket, notifyPremiumFarmers };