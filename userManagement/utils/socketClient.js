import { io } from 'socket.io-client';

let socketClient = null;

export const initSocketClient = () => {
  if (socketClient) return socketClient;

  const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4000';

  socketClient = io(NOTIFICATION_SERVICE_URL, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10
  });

  socketClient.on('connect', () => {
    console.log('Connected to notification service');
  });

  socketClient.on('disconnect', () => {
    console.log('Disconnected from notification service');
  });

  socketClient.on('error', (error) => {
    console.error('Socket connection error:', error);
  });

  return socketClient;
};

export const getSocketClient = () => {
  if (!socketClient) {
    throw new Error('Socket client not initialized. Call initSocketClient first.');
  }
  return socketClient;
};

export const emitInviteAccepted = (inviterId, inviteeEmail, role) => {
  try {
    const client = getSocketClient();
    client.emit('inviteAccepted', {
      userId: inviterId,
      message: `${inviteeEmail} has accepted their invitation as ${role}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to emit invite accepted event:', error.message);
  }
};
