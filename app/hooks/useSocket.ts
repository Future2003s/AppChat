"use client";
import { useEffect, useRef, useCallback } from "react";
import { connectSocket, disconnectSocket } from "../lib/socket";
import type { Socket } from "socket.io-client";

type Handlers = {
  onMessage?: (msg: any) => void;
  onNewMessage?: (payload: { conversationId: string; message: any }) => void;
  onNewConversation?: (conv: any) => void;
  onUserOnline?: (payload: { userId: string; status: string }) => void;
  onConversationUpdated?: (conv: any) => void;
  onRemovedFromConversation?: (payload: { conversationId: string }) => void;
  onMessageRecalled?: (payload: { messageId: string; conversationId: string }) => void;
};

export function useSocket(token: string | null, handlers: Handlers) {
  const socketRef = useRef<Socket | null>(null);
  const handlersRef = useRef(handlers);

  // Keep handlers ref fresh without re-connecting socket
  useEffect(() => { handlersRef.current = handlers; });

  useEffect(() => {
    if (!token) return;

    const sock = connectSocket(token);
    socketRef.current = sock;

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const onMsg = (msg: any) => handlersRef.current.onMessage?.(msg);
    const onNew = (p: any) => handlersRef.current.onNewMessage?.(p);
    const onConv = (c: any) => handlersRef.current.onNewConversation?.(c);
    const onOnline = (p: any) => handlersRef.current.onUserOnline?.(p);
    const onConvUpdate = (c: any) => handlersRef.current.onConversationUpdated?.(c);
    const onRemoved = (p: any) => handlersRef.current.onRemovedFromConversation?.(p);
    const onRecalled = (p: any) => handlersRef.current.onMessageRecalled?.(p);

    sock.on("chat:message", onMsg);
    sock.on("chat:newMessage", onNew);
    sock.on("chat:newConversation", onConv);
    sock.on("chat:conversationUpdated", onConvUpdate);
    sock.on("chat:removedFromConversation", onRemoved);
    sock.on("chat:messageRecalled", onRecalled);
    sock.on("user:online", onOnline);

    return () => {
      sock.off("chat:message", onMsg);
      sock.off("chat:newMessage", onNew);
      sock.off("chat:newConversation", onConv);
      sock.off("chat:conversationUpdated", onConvUpdate);
      sock.off("chat:removedFromConversation", onRemoved);
      sock.off("chat:messageRecalled", onRecalled);
      sock.off("user:online", onOnline);
      disconnectSocket();
    };
  }, [token]);

  return socketRef;
}
