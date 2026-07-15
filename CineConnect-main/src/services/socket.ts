import { io, Socket } from 'socket.io-client';

import { authStorage } from '@/store/authStore';
import { baseURL } from './api';

const socketURL = process.env.EXPO_PUBLIC_SOCKET_URL ?? baseURL;

let socket: Socket | null = null;

/**
 * Lazily create (and reuse) a single authenticated socket connection.
 * Connects whenever a backend URL is configured — notifications need this
 * live regardless of the app-wide mock flag (see APPLICATION_WORKFLOW.md).
 */
export function getSocket(): Socket | null {
  if (!socketURL) return null;
  if (!socket) {
    socket = io(socketURL, {
      transports: ['websocket'],
      autoConnect: true,
      auth: async (cb) => {
        const token = await authStorage.getToken();
        cb({ token });
      },
    });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
