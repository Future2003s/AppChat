// Socket.IO client for real-time chat

import { io, Socket } from "socket.io-client";

const SOCKET_URL = "http://localhost:8081";

let socket: Socket | null = null;

export function connectSocket(token: string): Socket {
    if (socket?.connected) return socket;

    socket = io(SOCKET_URL, {
        transports: ["websocket", "polling"],
        withCredentials: true
    });

    socket.on("connect", () => {
        console.log("[Socket] Connected:", socket?.id);
        // Identify user with token
        socket?.emit("auth:identify", { token });
    });

    socket.on("disconnect", (reason) => {
        console.log("[Socket] Disconnected:", reason);
    });

    socket.on("connect_error", (err) => {
        console.error("[Socket] Connection error:", err.message);
    });

    return socket;
}

export function getSocket(): Socket | null {
    return socket;
}

export function disconnectSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}

// ─── Chat Helpers ───────────────────────────────────────────────────────────

export function joinConversation(conversationId: string) {
    socket?.emit("chat:join", conversationId);
}

export function leaveConversation(conversationId: string) {
    socket?.emit("chat:leave", conversationId);
}

export function sendTyping(conversationId: string, isTyping: boolean) {
    socket?.emit("chat:typing", { conversationId, isTyping });
}

export function socketSendMessage(data: {
    conversationId: string;
    text?: string;
    images?: string[];
    file?: { name: string; size: number; url?: string };
    replyTo?: any;
}) {
    socket?.emit("chat:sendMessage", data);
}

export function socketMarkRead(conversationId: string) {
    socket?.emit("chat:markRead", conversationId);
}
