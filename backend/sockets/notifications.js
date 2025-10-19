module.exports = (io) => {
  io.on('connection', (socket) => {
    const user = socket.data?.user;

    if (!user || !user.id) {
      return;
    }

    const roomName = `user:${user.id}`;
    socket.join(roomName);

    socket.emit('notificationConnection', { success: true, room: roomName });

    socket.on('register', (payload = {}) => {
      // Backwards compatibility for older clients explicitly registering
      const requestedId = payload.userId ? Number(payload.userId) : null;
      if (requestedId && requestedId !== Number(user.id)) {
        return socket.emit('notificationError', 'User mismatch during registration');
      }

      socket.emit('notificationRegistered', { success: true, room: roomName });
    });
  });
};
