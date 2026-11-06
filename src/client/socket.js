import { io } from 'socket.io-client';

let socket = null;

export function connectSocket(token) {
  disconnectSocket();
  socket = io('/', {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnectionDelayMax: 10_000
  });
  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.close();
    socket = null;
  }
}
