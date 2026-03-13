"use client";
import {
  useState, useCallback, useTransition, useOptimistic,
  useEffect, useRef,
} from "react";
import * as api from "../lib/api";
import { joinConversation, leaveConversation } from "../lib/socket";
import { useSocket } from "./useSocket";
import type { IConversation, IMessage, IUser } from "../lib/types";

function notify(title: string, body: string) {
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
    const n = new Notification(title, { body, icon: "/icon-192x192.svg" });
    n.onclick = () => { window.focus(); n.close(); };
  }
}

function displayName(u: IUser) {
  return u?.fullName || [u?.firstName, u?.lastName].filter(Boolean).join(" ") || u?.email || "?";
}

export function useChat(me: IUser | null, onNewMsg?: (info: { name: string; text: string; avatar: string; color: string; convId: string }) => void) {
  const myId = me ? (me._id || (me as any).id) : null;
  const cacheKey = myId ? `chat_convs_${myId}` : null;

  // Init convs from cache so conversation list renders instantly on refresh
  const [convs, setConvs] = useState<IConversation[]>(() => {
    if (typeof window === "undefined" || !myId) return [];
    const key = `chat_convs_${myId}`;
    try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
  });
  const [msgs, setMsgs] = useState<Record<string, IMessage[]>>({});
  
  // Initialize from hash if available
  const [activeId, setActiveIdRaw] = useState<string | null>(() => {
    if (typeof window !== "undefined" && window.location.hash) {
      const hashId = window.location.hash.replace("#", "");
      if (hashId) return hashId;
    }
    return null;
  });

  const [chatUsers, setChatUsers] = useState<IUser[]>(() => {
    if (typeof window === "undefined" || !myId) return [];
    try { return JSON.parse(localStorage.getItem(`chat_users_${myId}`) || "[]"); } catch { return []; }
  });
  const [isLoadingMsgs, setIsLoadingMsgs] = useState(false);
  const activeIdRef = useRef<string | null>(null);
  const [, startTransition] = useTransition();

  // Persist convs to localStorage whenever they change
  useEffect(() => {
    if (cacheKey && convs.length > 0) {
      try { localStorage.setItem(cacheKey, JSON.stringify(convs)); } catch {}
    }
  }, [convs, cacheKey]);

  // Persist chatUsers
  useEffect(() => {
    if (myId && chatUsers.length > 0) {
      try { localStorage.setItem(`chat_users_${myId}`, JSON.stringify(chatUsers)); } catch {}
    }
  }, [chatUsers, myId]);

  const token = typeof window !== "undefined" ? localStorage.getItem("chat_token") : null;


  // ─── Socket handlers (stable via ref in useSocket) ──────────────────────
  useSocket(token, {
    onMessage: useCallback((message: IMessage) => {
      const convId = message.conversationId;
      setMsgs(prev => {
        const existing = prev[convId] || [];
        // Deduplicate (HTTP response may have already added it)
        if (existing.some(m => m._id === message._id)) return prev;
        return { ...prev, [convId]: [...existing, message] };
      });
      if (document.hidden && (typeof message.senderId === "string" ? message.senderId : (message.senderId as IUser)?._id) !== myId) {
        notify("Tin nhắn mới", message.text || "Đã gửi tệp đính kèm");
      }
    }, [myId]),

    onNewMessage: useCallback(({ conversationId, message }: { conversationId: string; message: IMessage }) => {
      const senderId = typeof message.senderId === "string" ? message.senderId : (message.senderId as IUser)?._id;
      if (senderId === myId) return;

      startTransition(() => {
        setConvs(prev => {
          // Move updated conversation to top
          const targetIndex = prev.findIndex(c => c._id === conversationId);
          if (targetIndex > -1) {
            const targetConv = prev[targetIndex];
            let title = targetConv.type === "group" ? (targetConv.name || "Nhóm") : "Tin nhắn mới";
            let avatarLetters = "?";
            let color = "#2563eb";
            if (targetConv.type !== "group" && targetConv.participants) {
              const sender = targetConv.participants.find(p => (p._id || (p as any).id) === senderId);
              if (sender) {
                title = displayName(sender);
                const f = (sender.firstName || "").charAt(0).toUpperCase();
                const l = (sender.lastName || "").charAt(0).toUpperCase();
                avatarLetters = (f + l) || "?";
              }
            } else if (targetConv.type === "group") {
              avatarLetters = (targetConv.name || "GR").substring(0, 2).toUpperCase();
              color = targetConv.color || "#2563eb";
            }
            notify(title, message.text || "Đã gửi tệp đính kèm");
            
            // Fire in-app toast only if this isn't the active conversation
            if (activeIdRef.current !== conversationId && onNewMsg) {
              onNewMsg({ name: title, text: message.text || "📎 Tệp đính kèm", avatar: avatarLetters, color, convId: conversationId });
            }
            
            const isCurrentlyActive = activeIdRef.current === conversationId;
            const updatedConv = {
               ...targetConv,
               unreadCount: isCurrentlyActive ? 0 : ((targetConv.unreadCount || 0) + 1),
               lastMessage: { senderId: message.senderId as string, text: message.text || "📎", time: message.createdAt },
               updatedAt: message.createdAt
            };
            
            // If it's active, mark as read on backend (optional) since we are already reading it.
            if (isCurrentlyActive) {
                api.markAsRead(conversationId).catch(() => {});
            }
            const newConvs = [...prev];
            newConvs.splice(targetIndex, 1);
            newConvs.unshift(updatedConv);
            return newConvs;
          }
          return prev;
        });
      });
      setMsgs(prev => {
        const existing = prev[conversationId] || [];
        if (existing.some(m => m._id === message._id)) return prev;
        return { ...prev, [conversationId]: [...existing, message] };
      });
    }, [myId, onNewMsg]),

    onNewConversation: useCallback((conv: IConversation) => {
      startTransition(() => {
        setConvs(prev => prev.find(c => c._id === conv._id) ? prev : [conv, ...prev]);
      });
    }, []),

    onUserOnline: useCallback(({ userId, status }: { userId: string; status: string }) => {
      startTransition(() => {
        setConvs(prev => prev.map(c => ({
          ...c,
          participants: c.participants?.map(p =>
            (p._id || (p as any).id) === userId ? { ...p, status } : p
          ),
        })));
      });
    }, []),

    onConversationUpdated: useCallback((conv: IConversation) => {
      startTransition(() => {
        setConvs(prev => prev.map(c => c._id === conv._id ? conv : c));
      });
    }, []),

    onRemovedFromConversation: useCallback(({ conversationId }: { conversationId: string }) => {
      startTransition(() => {
        setConvs(prev => prev.filter(c => c._id !== conversationId));
        setActiveIdRaw(prev => {
          if (prev === conversationId) {
             activeIdRef.current = null;
             return null;
          }
          return prev;
        });
      });
      setMsgs(prev => { const n = { ...prev }; delete n[conversationId]; return n; });
    }, []),

    onMessageRecalled: useCallback(({ messageId, conversationId }: { messageId: string; conversationId: string }) => {
      setMsgs(prev => {
        const existing = prev[conversationId];
        if (!existing) return prev;
        return {
          ...prev,
          [conversationId]: existing.map(m =>
            m._id === messageId ? { ...m, recalled: true, text: "", images: [], file: undefined } : m
          )
        };
      });
    }, []),
  });

  // ─── Initial data load ───────────────────────────────────────────────────
  useEffect(() => {
    if (!me) return;
    Promise.all([
      api.getConversations(),
      api.getChatUsers(),
    ]).then(([convRes, usersRes]) => {
      if (convRes.data) {
        setConvs(convRes.data);
      }
      if (usersRes.data) setChatUsers(usersRes.data);
    }).catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  // ─── URL Hash Sync ───────────────────────────────────────────────────────
  // 1. Sync State to URL whenever activeId changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (activeId) {
      // Use replaceState to avoid cluttering history
      if (window.location.hash !== `#${activeId}`) {
        window.history.replaceState(null, "", `#${activeId}`);
      }
    } else {
      // Clear hash if activeId is null
      if (window.location.hash) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    }
  }, [activeId]);

  // 2. Listen to Hash changes (e.g., user pastes a link or hits back/forward)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleHashChange = () => {
      const hashId = window.location.hash.replace("#", "");
      if (hashId && hashId !== activeIdRef.current) {
        setActiveId(hashId);
      } else if (!hashId && activeIdRef.current) {
        setActiveId(null);
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Conversation change: join room, mark read, load messages ────────────
  const setActiveId = useCallback((id: string | null) => {
    activeIdRef.current = id;
    startTransition(() => setActiveIdRaw(id));
  }, []);

  useEffect(() => {
    if (!activeId || !me) return;

    joinConversation(activeId);

    // Optimistic: mark as read in UI immediately
    startTransition(() => {
      setConvs(prev => prev.map(c => c._id === activeId ? { ...c, unreadCount: 0 } : c));
    });
    api.markAsRead(activeId).catch(() => {});

    // Load messages if not cached
    if (!msgs[activeId]) {
      setIsLoadingMsgs(true);
      api.getMessages(activeId)
        .then(res => {
          if (res.messages) {
            setMsgs(prev => ({ ...prev, [activeId]: res.messages }));
          }
        })
        .catch(console.error)
        .finally(() => setIsLoadingMsgs(false));
    }

    return () => {
      leaveConversation(activeId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, me]);

  // ─── Send message (optimistic) ───────────────────────────────────────────
  const handleSend = useCallback(async (data: {
    text?: string; images?: string[];
    file?: { name: string; size: number; url?: string }; replyTo?: any;
  }) => {
    if (!activeId || !me) return;

    // Optimistic message
    const optimisticMsg: IMessage = {
      _id: `opt-${Date.now()}`,
      conversationId: activeId,
      senderId: me,
      text: data.text,
      images: data.images,
      file: data.file,
      replyTo: data.replyTo,
      readBy: [myId!],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Add optimistic immediately
    setMsgs(prev => ({ ...prev, [activeId]: [...(prev[activeId] || []), optimisticMsg] }));
    startTransition(() => {
      setConvs(prev => prev.map(c =>
        c._id === activeId
          ? { ...c, lastMessage: { senderId: myId!, text: data.text || "📎", time: new Date().toISOString() }, updatedAt: new Date().toISOString() }
          : c
      ));
    });

    try {
      const res = await api.sendMessage(activeId, data);
      if (res.data) {
        // Replace optimistic with real message
        setMsgs(prev => {
          const existing = prev[activeId] || [];
          const filtered = existing.filter(m => m._id !== optimisticMsg._id);
          if (filtered.some(m => m._id === res.data._id)) return { ...prev, [activeId]: filtered };
          return { ...prev, [activeId]: [...filtered, res.data] };
        });
      }
    } catch (err) {
      // Rollback optimistic on error
      setMsgs(prev => ({
        ...prev,
        [activeId]: (prev[activeId] || []).filter(m => m._id !== optimisticMsg._id),
      }));
      console.error("Send error:", err);
    }
  }, [activeId, me, myId]);

  // ─── Delete conversation ─────────────────────────────────────────────────
  const handleDelete = useCallback((convId: string) => {
    startTransition(() => {
      setConvs(prev => prev.filter(c => c._id !== convId));
      setActiveIdRaw(prev => {
        if (prev !== convId) return prev;
        activeIdRef.current = null;
        return null; // Reset to empty state, don't auto-navigate to another conversation
      });
    });
    setMsgs(prev => { const n = { ...prev }; delete n[convId]; return n; });
  }, []);

  // ─── Start chat from contacts ────────────────────────────────────────────
  const handleStartChat = useCallback((conv: IConversation) => {
    startTransition(() => {
      setConvs(prev => prev.find(c => c._id === conv._id) ? prev : [conv, ...prev]);
      setActiveIdRaw(conv._id);
    });
  }, []);

  // ─── Add Member to Group ─────────────────────────────────────────────────
  const handleAddMemberGroup = useCallback(async (convId: string, memberIds: string[]) => {
    try {
      const res = await api.addGroupMember(convId, memberIds);
      if (res.data) {
        startTransition(() => {
          setConvs(prev => prev.map(c => c._id === convId ? res.data : c));
        });
      }
      return res.data;
    } catch (err) {
      console.error("Add member error:", err);
      throw err;
    }
  }, []);

  const handleUpdateGroup = useCallback(async (convId: string, data: { name?: string; avatar?: string; color?: string }) => {
    try {
      const res = await api.updateGroup(convId, data);
      if (res.data) {
        startTransition(() => {
          setConvs(prev => prev.map(c => c._id === convId ? { ...c, ...data } : c));
        });
      }
      return res.data;
    } catch (err) {
      console.error("Update group error:", err);
      throw err;
    }
  }, []);

  const handleUpdateMemberRole = useCallback(async (convId: string, memberId: string, action: "promote" | "demote") => {
    try {
      const res = await api.updateMemberRole(convId, memberId, action);
      if (res.data) {
        startTransition(() => {
          setConvs(prev => prev.map(c => c._id === convId ? res.data : c));
        });
      }
      return res.data;
    } catch (err) {
      console.error("Update member role error:", err);
      throw err;
    }
  }, []);

  const handleRemoveMember = useCallback(async (convId: string, memberId: string) => {
    try {
      const res = await api.removeGroupMember(convId, memberId);
      if (res.data) {
        startTransition(() => {
          setConvs(prev => prev.map(c => c._id === convId ? res.data : c));
        });
      }
      return res.data;
    } catch (err) {
      console.error("Remove member error:", err);
      throw err;
    }
  }, []);

  // ─── Recall message ──────────────────────────────────────────────────────
  const handleRecall = useCallback(async (messageId: string, convId: string) => {
    // Optimistically update UI
    setMsgs(prev => {
      const existing = prev[convId];
      if (!existing) return prev;
      return {
        ...prev,
        [convId]: existing.map(m =>
          m._id === messageId 
            ? { ...m, recalled: true, text: "", images: [], file: undefined } 
            : m
        )
      };
    });
    
    try {
      await api.recallMessage(messageId);
    } catch (err: any) {
      // Roll back on failure
      console.error("Recall error:", err);
      alert(err.message || "Lỗi thu hồi tin nhắn");
      
      // Reload messages to restore correct state
      try {
        const res = await api.getMessages(convId);
        if (res.data?.messages) {
          setMsgs(prev => ({ ...prev, [convId]: res.data.messages }));
        }
      } catch (loadErr) {
        console.error("Failed to reload messages after recall failure:", loadErr);
      }
    }
  }, []);

  return {
    convs, msgs, activeId, setActiveId, chatUsers,
    isLoadingMsgs, handleSend, handleDelete, handleStartChat, 
    handleAddMemberGroup, handleUpdateGroup, handleUpdateMemberRole, handleRemoveMember,
    handleRecall
  };
}
