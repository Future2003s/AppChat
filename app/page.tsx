// @ts-nocheck
"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import * as api from "./lib/api";
import { connectSocket, getSocket, disconnectSocket, joinConversation, leaveConversation, sendTyping } from "./lib/socket";

// ─── Responsive hooks ───────────────────────────────────────────────────────
function useIsMobile() {
  const [m, setM] = useState(false);
  useEffect(() => {
    const check = () => setM(window.innerWidth < 768);
    check(); window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return m;
}
function useIsTablet() {
  const [t, setT] = useState(false);
  useEffect(() => {
    const check = () => { const w = window.innerWidth; setT(w >= 768 && w < 1024); };
    check(); window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return t;
}

function useA2HS() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [showManual, setShowManual] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsReady(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const triggerInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
        setIsReady(false);
      }
    } else {
      // Browser doesn't support automatic prompt (e.g. iOS or not HTTPS)
      setShowManual(true);
      setIsReady(false); // Hide the native banner if it was somehow overriding
    }
  };

  const dismissPrompt = () => {
    setIsReady(false);
  };

  const closeManual = () => {
    setShowManual(false);
  };

  return { isReady, triggerInstall, dismissPrompt, showManual, closeManual };
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Be Vietnam Pro', sans-serif; background: #ebecf0; }
  input::placeholder, textarea::placeholder { color: #aaa; }
  [contenteditable][data-placeholder]:empty::before { content: attr(data-placeholder); color: #aaa; pointer-events: none; }
  @keyframes msgIn { from { opacity:0; transform:translateY(6px) scale(0.97); } to { opacity:1; transform:none; } }
  .msg-in { animation: msgIn 0.18s ease; }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  .fade-in { animation: fadeIn 0.2s ease; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes slideUp { from { transform:translateY(100%); } to { transform:translateY(0); } }
  @keyframes slideRight { from { transform:translateX(-100%); } to { transform:translateX(0); } }
  @keyframes slideLeft { from { transform:translateX(100%); } to { transform:translateX(0); } }
  .slide-up { animation: slideUp 0.25s ease; }
  .slide-right { animation: slideRight 0.2s ease; }
  .slide-left { animation: slideLeft 0.25s ease-out; }

  /* Utility classes for responsive design */
  .hide-on-mobile { display: none !important; }
  .show-on-mobile { display: flex !important; }
  @media (min-width: 768px) {
    .hide-on-desktop { display: none !important; }
    .show-on-desktop { display: flex !important; }
    .hide-on-mobile { display: flex !important; }
    .show-on-mobile { display: none !important; }
  }
`;

const Z = {
  blue: "#0068ff", blueLight: "#e8f0fe",
  sidebar: "#ffffff", leftPanel: "#f0f2f5", bg: "#ebecf0", surface: "#ffffff",
  text: "#081c36", sub: "#7a8694", border: "#e8eaed", msgOther: "#ffffff",
  online: "#06d6a0", away: "#ffd166", busy: "#ef476f", offline: "#c0c8d2",
};

const SDOT = { online: Z.online, away: Z.away, busy: Z.busy, offline: Z.offline };
const NOW = () => new Date().toLocaleTimeString("vi", { hour: "2-digit", minute: "2-digit" });

// Helper: get display name from user object
const displayName = (u) => {
  if (!u) return "?";
  if (typeof u === "string") return u;
  return u.firstName ? `${u.firstName} ${u.lastName || ""}`.trim() : u.email || "?";
};
const shortName = (u) => {
  if (!u) return "?";
  if (typeof u === "string") return "?";
  return u.firstName || u.email?.substring(0, 2) || "?";
};
const avatarLetters = (u) => {
  if (!u) return "??";
  if (typeof u === "string") return "??";
  const f = (u.firstName || "").charAt(0).toUpperCase();
  const l = (u.lastName || "").charAt(0).toUpperCase();
  return (f + l) || "??";
};
const userColor = (u) => {
  if (!u || typeof u === "string") return Z.blue;
  // Generate color from id
  const id = u._id || u.id || "";
  const hash = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const colors = ["#0068ff", "#ef476f", "#06d6a0", "#ffd166", "#8338ec", "#ff6b6b", "#4ecdc4", "#ff8a5c"];
  return colors[hash % colors.length];
};

const fIcon = (name = "") => {
  const e = name.split(".").pop().toLowerCase();
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(e)) return { i: "🖼️", c: "#06b6d4" };
  if (["mp4", "mov", "avi"].includes(e)) return { i: "🎬", c: "#8b5cf6" };
  if (["mp3", "wav", "ogg"].includes(e)) return { i: "🎵", c: "#ec4899" };
  if (e === "pdf") return { i: "📄", c: "#ef4444" };
  if (["doc", "docx"].includes(e)) return { i: "📝", c: "#2563eb" };
  if (["xls", "xlsx", "csv"].includes(e)) return { i: "📊", c: "#16a34a" };
  if (["zip", "rar", "7z"].includes(e)) return { i: "🗜️", c: "#78716c" };
  return { i: "📁", c: "#6366f1" };
};
const fSize = (b) => b < 1024 ? b + "B" : b < 1048576 ? (b / 1024).toFixed(1) + "KB" : (b / 1048576).toFixed(1) + "MB";

// Avatar
function Av({ user, size = 40, isGroup = false, dot = false, gAvatar, groupColor, onlineStatus }) {
  const bg = isGroup ? (groupColor || Z.blue) : userColor(user);
  const text = isGroup ? (gAvatar || "GR") : avatarLetters(user);
  const status = onlineStatus || (typeof user === "object" ? user?.status : null);
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <div style={{ width: size, height: size, borderRadius: isGroup ? size * 0.28 : "50%", background: `linear-gradient(135deg,${bg}ee,${bg}99)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.36, fontWeight: 700, color: "white", userSelect: "none" }}>{text}</div>
      {dot && !isGroup && status && <span style={{ position: "absolute", bottom: 1, right: 1, width: size * 0.28, height: size * 0.28, borderRadius: "50%", background: SDOT[status] || Z.offline, border: "2px solid white" }} />}
    </div>
  );
}

// Icon Nav — responsive: sidebar on desktop, bottom tab bar on mobile
function IconNav({ tab, setTab, me, isMobile, onInstall, hideOnMobile }) {
  const nav = [
    { id: "chat", lbl: "Tin nhắn", d: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /> },
    { id: "contacts", lbl: "Danh bạ", d: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></> },
  ];

  // Helper inside IconNav to check if app is already installed
  const [isInstalled, setIsInstalled] = useState(false);
  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      setIsInstalled(true);
    }
  }, []);

  if (isMobile) {
    return (
      <div className={hideOnMobile ? "hide-on-mobile" : ""} style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 900, background: "#0068ff", display: "flex", alignItems: "center", justifyContent: "space-around", padding: "6px 0", paddingBottom: "max(6px, env(safe-area-inset-bottom))" }}>
        {nav.map(n => (
          <button key={n.id} onClick={() => setTab(n.id)}
            style={{ width: 56, height: 44, borderRadius: 12, border: "none", cursor: "pointer", background: tab === n.id ? "rgba(255,255,255,0.25)" : "transparent", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">{n.d}</svg>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>{n.lbl}</span>
          </button>
        ))}
        {!isInstalled && (
          <button onClick={onInstall} style={{ width: 56, height: 44, borderRadius: 12, border: "none", cursor: "pointer", background: "transparent", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>Cài App</span>
          </button>
        )}
        <button onClick={() => { api.logout(); window.location.replace("/login"); }}
          style={{ width: 56, height: 44, borderRadius: 12, border: "none", cursor: "pointer", background: "transparent", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>Thoát</span>
        </button>
      </div>
    );
  }

  return (
    <div style={{ width: 64, background: "#0068ff", display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 0", gap: 4, flexShrink: 0 }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: "white", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, fontSize: 22, fontWeight: 900, color: Z.blue }}>Z</div>
      {nav.map(n => (
        <button key={n.id} onClick={() => setTab(n.id)} style={{ width: 48, height: 48, borderRadius: 12, border: "none", cursor: "pointer", background: tab === n.id ? "rgba(255,255,255,0.25)" : "transparent", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, transition: "background 0.15s" }}
          onMouseEnter={e => { if (tab !== n.id) e.currentTarget.style.background = "rgba(255,255,255,0.15)"; }}
          onMouseLeave={e => { if (tab !== n.id) e.currentTarget.style.background = "transparent"; }}
        >
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">{n.d}</svg>
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>{n.lbl}</span>
        </button>
      ))}
      <div style={{ flex: 1 }} />
      {!isInstalled && (
        <button onClick={onInstall} title="Cài đặt App" style={{ width: 40, height: 40, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.15)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
        </button>
      )}
      <button onClick={() => { api.logout(); window.location.replace("/login"); }} title="Đăng xuất" style={{ width: 40, height: 40, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.15)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 4 }}>
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
      </button>
      <div style={{ marginBottom: 8 }}><Av user={me} size={38} dot onlineStatus="online" /></div>
    </div>
  );
}

// Delete Confirmation Dialog
function DeleteDialog({ name, onConfirm, onCancel }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onCancel}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(8,28,54,0.45)", backdropFilter: "blur(3px)" }} />
      <div onClick={e => e.stopPropagation()} className="fade-in" style={{ position: "relative", background: "white", borderRadius: 18, padding: "28px 28px 22px", width: 340, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", textAlign: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, color: "#081c36", marginBottom: 8 }}>Xoá cuộc trò chuyện?</div>
        <div style={{ fontSize: 13.5, color: "#7a8694", lineHeight: 1.6, marginBottom: 22 }}>
          Cuộc trò chuyện với <strong style={{ color: "#081c36" }}>{name}</strong> và toàn bộ tin nhắn sẽ bị xoá vĩnh viễn.
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "10px 0", borderRadius: 12, border: `1.5px solid ${Z.border}`, background: "transparent", fontSize: 14, fontWeight: 600, color: Z.sub, cursor: "pointer" }}>Huỷ</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: "10px 0", borderRadius: 12, border: "none", background: "#ef4444", fontSize: 14, fontWeight: 700, color: "white", cursor: "pointer", boxShadow: "0 4px 14px rgba(239,68,68,0.35)" }}>Xoá</button>
        </div>
      </div>
    </div>
  );
}

// Conversation List
function ConvList({ convs, activeId, setActiveId, me, onDelete, isMobile }) {
  const [search, setSearch] = useState("");
  const [hoverId, setHoverId] = useState(null);
  const [deleteConv, setDeleteConv] = useState(null);

  const getConvName = (conv) => {
    if (conv.type === "group") return conv.name || "Nhóm";
    const other = conv.participants?.find(p => (p._id || p.id) !== (me._id || me.id));
    return other ? displayName(other) : "Chat";
  };
  const getConvAvatar = (conv) => {
    if (conv.type === "group") return conv.avatar || conv.name?.substring(0, 2).toUpperCase() || "GR";
    const other = conv.participants?.find(p => (p._id || p.id) !== (me._id || me.id));
    return avatarLetters(other);
  };
  const getConvColor = (conv) => {
    if (conv.type === "group") return conv.color || Z.blue;
    const other = conv.participants?.find(p => (p._id || p.id) !== (me._id || me.id));
    return userColor(other);
  };
  const getOtherUser = (conv) => {
    if (conv.type !== "direct") return null;
    return conv.participants?.find(p => (p._id || p.id) !== (me._id || me.id));
  };

  const list = convs.filter(c => {
    const nm = getConvName(c);
    return nm.toLowerCase().includes(search.toLowerCase());
  });

  const doDelete = async () => {
    if (!deleteConv) return;
    try {
      await api.deleteConversation(deleteConv._id);
      onDelete(deleteConv._id);
    } catch (err) {
      console.error("Delete error:", err);
    }
    setDeleteConv(null);
  };

  return (
    <>
      {deleteConv && <DeleteDialog name={getConvName(deleteConv)} onConfirm={doDelete} onCancel={() => setDeleteConv(null)} />}
      <div style={{ width: isMobile ? "100%" : 300, background: Z.sidebar, borderRight: `1px solid ${Z.border}`, display: "flex", flexDirection: "column", flexShrink: 0, paddingBottom: isMobile ? 60 : 0 }}>
        <div style={{ padding: "14px 16px 10px" }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: Z.text, marginBottom: 12 }}>Tin nhắn</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: Z.leftPanel, borderRadius: 20, padding: "7px 14px" }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth={2.5} strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm kiếm..." style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 13, color: Z.text }} />
          </div>
        </div>
        <div style={{ flex: 1, overflow: "auto" }}>
          {list.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: Z.sub }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>💬</div>
              <div style={{ fontSize: 13 }}>Chưa có tin nhắn nào</div>
            </div>
          )}
          {list.map(conv => {
            const name = getConvName(conv);
            const act = conv._id === activeId;
            const hov = conv._id === hoverId;
            const lastText = conv.lastMessage?.text || "";
            const lastTime = conv.lastMessage?.time ? new Date(conv.lastMessage.time).toLocaleTimeString("vi", { hour: "2-digit", minute: "2-digit" }) : "";
            const otherUser = getOtherUser(conv);
            return (
              <div key={conv._id}
                onClick={() => setActiveId(conv._id)}
                onMouseEnter={() => setHoverId(conv._id)}
                onMouseLeave={() => setHoverId(null)}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", cursor: "pointer", background: act ? Z.blueLight : hov ? Z.leftPanel : "transparent", borderLeft: act ? `3px solid ${Z.blue}` : "3px solid transparent", transition: "background 0.12s", position: "relative" }}
              >
                {conv.type === "direct"
                  ? <Av user={otherUser} size={46} dot onlineStatus={otherUser?.status} />
                  : <Av isGroup gAvatar={getConvAvatar(conv)} groupColor={getConvColor(conv)} size={46} />
                }
                <div style={{ flex: 1, minWidth: 0, paddingRight: isMobile ? 40 : 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
                    <span style={{ fontSize: 13.5, fontWeight: conv.unreadCount > 0 ? 700 : 600, color: Z.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: isMobile ? 200 : 130 }}>{name}</span>
                    <span style={{ fontSize: 11, color: conv.unreadCount > 0 ? Z.blue : Z.sub, fontWeight: conv.unreadCount > 0 ? 600 : 400, flexShrink: 0 }}>{lastTime}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: Z.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 170 }}>{lastText}</span>
                    {conv.unreadCount > 0 && <span style={{ minWidth: 18, height: 18, borderRadius: 9, background: Z.blue, color: "white", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px", flexShrink: 0, marginLeft: 4 }}>{conv.unreadCount}</span>}
                  </div>
                </div>
                {(hov || isMobile) && (
                  <button onClick={e => { e.stopPropagation(); setDeleteConv(conv); }} style={{ position: "absolute", right: 12, width: isMobile ? 36 : 28, height: isMobile ? 36 : 28, borderRadius: "50%", border: "none", background: "#fee2e2", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }} title="Xoá cuộc trò chuyện">
                    <svg width={isMobile ? 16 : 13} height={isMobile ? 16 : 13} viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// Chat Window
function ChatWindow({ conv, msgs, me, onSend, isMobile, isTablet, mobilePanel, setMobilePanel }) {
  const [showEmoji, setShowEmoji] = useState(false);
  const [hasText, setHasText] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [hoverMsgId, setHoverMsgId] = useState(null);
  const btm = useRef();
  const edRef = useRef();

  useEffect(() => { btm.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, conv?._id]);
  useEffect(() => { if (replyTo) setTimeout(() => edRef.current?.focus(), 50); }, [replyTo]);

  if (!conv) return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: Z.bg, gap: 12 }}>
      <div style={{ fontSize: 52 }}>💬</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: Z.sub }}>Chọn một cuộc trò chuyện</div>
    </div>
  );

  const myId = me._id || me.id;
  const getConvTitle = () => {
    if (conv.type === "group") return conv.name || "Nhóm";
    const other = conv.participants?.find(p => (p._id || p.id) !== myId);
    return other ? displayName(other) : "Chat";
  };
  const getConvSub = () => {
    if (conv.type === "group") return `${conv.participants?.length || 0} thành viên`;
    const other = conv.participants?.find(p => (p._id || p.id) !== myId);
    return other?.role || "";
  };
  const getOtherUser = () => {
    if (conv.type !== "direct") return null;
    return conv.participants?.find(p => (p._id || p.id) !== myId);
  };

  const EMOJ = ["😊", "😂", "❤️", "👍", "🎉", "🔥", "😮", "😢", "😡", "🙏", "👏", "✅"];

  const clearEd = () => { if (edRef.current) { edRef.current.innerHTML = ""; setHasText(false); } };
  const getEd = () => {
    const el = edRef.current; if (!el) return { text: "", images: [] };
    const images = []; let text = "";
    el.childNodes.forEach(n => { if (n.nodeName === "IMG") images.push(n.src); else text += n.textContent || ""; });
    return { text: text.trim(), images };
  };

  const send = (emoji) => {
    if (emoji) { onSend({ text: emoji }); setShowEmoji(false); return; }
    const { text, images } = getEd();
    if (!text && !images.length) return;
    onSend({ text: text || undefined, images: images.length ? images : undefined, replyTo: replyTo || undefined });
    clearEd(); setShowEmoji(false); setReplyTo(null);
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const items = e.clipboardData?.items || []; let handled = false;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        handled = true;
        const r = new FileReader();
        r.onload = (ev) => {
          const img = document.createElement("img"); img.src = ev.target.result;
          img.style.cssText = "max-width:220px;max-height:160px;border-radius:10px;display:block;margin:4px 0;";
          const sel = window.getSelection();
          if (sel && sel.rangeCount) { sel.getRangeAt(0).insertNode(img); sel.collapseToEnd(); } else edRef.current?.appendChild(img);
          setHasText(true);
        };
        r.readAsDataURL(item.getAsFile());
      }
    }
    if (!handled) { const t = e.clipboardData.getData("text/plain"); if (t) { document.execCommand("insertText", false, t); setHasText(true); } }
  };

  // Get sender info from message
  const getSender = (msg) => {
    if (typeof msg.senderId === "object") return msg.senderId;
    return conv.participants?.find(p => (p._id || p.id) === msg.senderId) || null;
  };

  const grouped = msgs.map((msg, i) => {
    const sid = typeof msg.senderId === "object" ? (msg.senderId._id || msg.senderId.id) : msg.senderId;
    const prevSid = i > 0 ? (typeof msgs[i - 1].senderId === "object" ? (msgs[i - 1].senderId._id || msgs[i - 1].senderId.id) : msgs[i - 1].senderId) : null;
    const nextSid = i < msgs.length - 1 ? (typeof msgs[i + 1].senderId === "object" ? (msgs[i + 1].senderId._id || msgs[i + 1].senderId.id) : msgs[i + 1].senderId) : null;
    return { ...msg, first: i === 0 || prevSid !== sid, last: i === msgs.length - 1 || nextSid !== sid };
  });

  const QuoteBar = ({ reply, mine }) => {
    return (
      <div style={{ borderLeft: `3px solid ${mine ? "rgba(255,255,255,0.6)" : Z.blue}`, paddingLeft: 8, marginBottom: 6, opacity: 0.85 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: mine ? "rgba(255,255,255,0.9)" : Z.blue, marginBottom: 2 }}>Trả lời</div>
        {reply.text && <div style={{ fontSize: 11.5, color: mine ? "rgba(255,255,255,0.75)" : Z.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>{reply.text}</div>}
      </div>
    );
  };

  const otherUser = getOtherUser();

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: Z.bg }}>
      {/* Header */}
      <div style={{ padding: "12px 20px", background: Z.surface, borderBottom: `1px solid ${Z.border}`, display: "flex", alignItems: "center", gap: 12, paddingTop: isMobile ? "max(12px, env(safe-area-inset-top))" : 12 }}>
        {isMobile && (
          <button onClick={() => setMobilePanel("list")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", padding: "4px 8px 4px 0", marginLeft: -8, color: Z.blue }}>
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
        )}
        {conv.type === "direct"
          ? <Av user={otherUser} size={40} dot />
          : <Av isGroup gAvatar={conv.avatar || conv.name?.substring(0, 2)} groupColor={conv.color} size={40} />
        }
        <div style={{ flex: 1, cursor: (isMobile || isTablet) ? "pointer" : "default" }} onClick={() => { if (isMobile || isTablet) setMobilePanel("info"); }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: Z.text }}>{getConvTitle()}</div>
          <div style={{ fontSize: 12, color: Z.sub }}>{getConvSub()}</div>
        </div>
        {(isMobile || isTablet) && (
          <button onClick={() => setMobilePanel("info")} style={{ background: "none", border: "none", cursor: "pointer", color: Z.blue, padding: 4 }}>
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
          </button>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflow: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 2 }}>
        {msgs.length === 0 && (
          <div style={{ textAlign: "center", padding: 60, color: Z.sub }}>
            <div style={{ fontSize: 48, marginBottom: 10 }}>👋</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Bắt đầu cuộc trò chuyện!</div>
          </div>
        )}
        {grouped.map(msg => {
          const sender = getSender(msg);
          const senderId = typeof msg.senderId === "object" ? (msg.senderId._id || msg.senderId.id) : msg.senderId;
          const mine = senderId === myId;
          const fi = msg.file ? fIcon(msg.file.name) : null;
          const hov = hoverMsgId === msg._id;
          const time = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString("vi", { hour: "2-digit", minute: "2-digit" }) : "";
          return (
            <div key={msg._id} className="msg-in"
              onMouseEnter={() => setHoverMsgId(msg._id)}
              onMouseLeave={() => setHoverMsgId(null)}
              style={{ display: "flex", flexDirection: mine ? "row-reverse" : "row", alignItems: "flex-end", gap: 8, marginBottom: msg.last ? 10 : 2 }}
            >
              {!mine && <div style={{ width: 32, flexShrink: 0 }}>{msg.last && <Av user={sender} size={32} />}</div>}

              {/* Hover action buttons */}
              <div style={{ display: "flex", flexDirection: mine ? "row" : "row-reverse", alignItems: "center", gap: 4, opacity: hov ? 1 : 0, transition: "opacity 0.15s", flexShrink: 0 }}>
                <button onClick={() => { setReplyTo({ senderId: senderId, text: msg.text || null, image: msg.images?.[0] || null, fileName: msg.file?.name || null }); }} title="Trả lời" style={{ width: 28, height: 28, borderRadius: "50%", border: "none", background: "white", boxShadow: "0 1px 6px rgba(0,0,0,0.15)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={Z.blue} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 17 4 12 9 7" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" />
                  </svg>
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start", maxWidth: "62%" }}>
                {!mine && msg.first && conv.type === "group" && <div style={{ fontSize: 11.5, fontWeight: 600, color: userColor(sender), marginBottom: 3, marginLeft: 2 }}>{shortName(sender)}</div>}

                {msg.images && msg.images.length > 0 && (
                  <div>
                    {msg.replyTo && <QuoteBar reply={msg.replyTo} mine={false} />}
                    {msg.images.map((img, idx) => <img key={idx} src={img} alt="" style={{ maxWidth: 220, maxHeight: 180, borderRadius: 12, display: "block", boxShadow: "0 2px 12px rgba(0,0,0,0.15)", marginBottom: 4 }} />)}
                  </div>
                )}

                {msg.file && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch", padding: "11px 14px", borderRadius: 14, background: mine ? Z.blue : Z.surface, border: mine ? "none" : `1px solid ${Z.border}`, boxShadow: mine ? "0 2px 8px rgba(0,104,255,0.2)" : "0 1px 4px rgba(0,0,0,0.07)", minWidth: 220, maxWidth: 280 }}>
                    {msg.replyTo && <QuoteBar reply={msg.replyTo} mine={mine} />}
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: mine ? "rgba(255,255,255,0.2)" : fi.c + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{fi.i}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: mine ? "white" : Z.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{msg.file.name}</div>
                        <div style={{ fontSize: 11, color: mine ? "rgba(255,255,255,0.7)" : Z.sub, marginTop: 2 }}>{fSize(msg.file.size)}</div>
                      </div>
                    </div>
                  </div>
                )}

                {msg.text && (
                  <div style={{ padding: "9px 13px", borderRadius: mine ? (msg.first ? "18px 18px 4px 18px" : "18px 4px 4px 18px") : (msg.first ? "18px 18px 18px 4px" : "4px 18px 18px 4px"), background: mine ? Z.blue : Z.msgOther, color: mine ? "white" : Z.text, fontSize: 13.5, lineHeight: 1.55, wordBreak: "break-word", boxShadow: mine ? "0 1px 4px rgba(0,104,255,0.25)" : "0 1px 3px rgba(0,0,0,0.08)" }}>
                    {msg.replyTo && <QuoteBar reply={msg.replyTo} mine={mine} />}
                    {msg.text}
                  </div>
                )}

                {msg.last && <div style={{ fontSize: 10.5, color: Z.sub, marginTop: 3, display: "flex", alignItems: "center", gap: 3 }}>{time}{mine && <span style={{ color: Z.blue, fontSize: 12 }}>✓✓</span>}</div>}
              </div>
            </div>
          );
        })}
        <div ref={btm} />
      </div>

      {/* Emoji */}
      {showEmoji && (
        <div className="fade-in" style={{ background: Z.surface, borderTop: `1px solid ${Z.border}`, padding: "10px 20px", display: "flex", flexWrap: "wrap", gap: 6 }}>
          {EMOJ.map(e => (
            <button key={e} onClick={() => send(e)} style={{ fontSize: 22, background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 8, transition: "transform 0.1s" }}
              onMouseEnter={x => x.currentTarget.style.transform = "scale(1.3)"}
              onMouseLeave={x => x.currentTarget.style.transform = "scale(1)"}
            >{e}</button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ padding: "10px 16px", background: Z.surface, borderTop: `1px solid ${Z.border}`, paddingBottom: isMobile ? "calc(10px + max(10px, env(safe-area-inset-bottom)))" : 10 }}>
        {replyTo && (
          <div className="fade-in" style={{ display: "flex", alignItems: "center", gap: 10, background: Z.blueLight, borderRadius: 10, padding: "8px 12px", marginBottom: 8, borderLeft: `3px solid ${Z.blue}` }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={Z.blue} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="9 17 4 12 9 7" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" /></svg>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: Z.blue, marginBottom: 2 }}>Đang trả lời</div>
              {replyTo.text && <div style={{ fontSize: 12, color: Z.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{replyTo.text}</div>}
            </div>
            <button onClick={() => setReplyTo(null)} style={{ width: 22, height: 22, borderRadius: "50%", border: "none", background: "rgba(0,104,255,0.12)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: Z.blue, fontSize: 14, fontWeight: 700 }}>×</button>
          </div>
        )}

        <div style={{ fontSize: 10.5, color: "#bbb", marginBottom: 5, paddingLeft: 4 }}>Ctrl+V dán ảnh · Shift+Enter xuống dòng · Enter gửi</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, background: Z.leftPanel, borderRadius: 16, padding: "8px 8px 8px 10px", minHeight: 44 }}>
          <button onClick={() => setShowEmoji(s => !s)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", alignItems: "center", flexShrink: 0, marginBottom: 2 }}>
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={showEmoji ? Z.blue : Z.sub} strokeWidth={2} strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M8 13s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" /></svg>
          </button>
          <div ref={edRef} contentEditable suppressContentEditableWarning
            onInput={() => { const el = edRef.current; setHasText(!!(el?.textContent?.trim() || el?.querySelector("img"))); }}
            onPaste={handlePaste}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } if (e.key === "Escape") setReplyTo(null); }}
            data-placeholder="Nhập tin nhắn..."
            style={{ flex: 1, outline: "none", fontSize: 13.5, color: Z.text, fontFamily: "'Be Vietnam Pro',sans-serif", lineHeight: 1.5, minHeight: 24, maxHeight: 120, overflowY: "auto", wordBreak: "break-word", whiteSpace: "pre-wrap" }}
          />
          <button onClick={() => send()} style={{ width: 36, height: 36, borderRadius: "50%", border: "none", cursor: "pointer", background: hasText || replyTo ? Z.blue : "#d0d0d0", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s", flexShrink: 0 }}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ transform: "rotate(45deg)" }}><path d="M22 2 11 13" /><path d="M22 2 15 22 11 13 2 9z" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// Right Panel
function RightPanel({ conv, me, isMobile, isTablet, onClose }) {
  if (!conv) return null;
  const myId = me._id || me.id;
  const isGroup = conv.type === "group";
  const otherUser = !isGroup ? conv.participants?.find(p => (p._id || p.id) !== myId) : null;

  const containerStyle = (isMobile || isTablet) ? {
    position: "fixed", top: 0, right: 0, bottom: 0, width: isMobile ? "100%" : 320,
    background: Z.surface, zIndex: 1000, display: "flex", flexDirection: "column",
    boxShadow: "-8px 0 24px rgba(0,0,0,0.1)", animation: "slideRight 0.25s ease"
  } : {
    width: 270, background: Z.surface, borderLeft: `1px solid ${Z.border}`, display: "flex", flexDirection: "column", flexShrink: 0
  };

  return (
    <>
      {(isMobile || isTablet) && <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 999 }} />}
      <div style={containerStyle}>
        <div style={{ padding: "20px 16px", borderBottom: `1px solid ${Z.border}`, textAlign: "center", position: "relative" }}>
          {(isMobile || isTablet) && (
            <button onClick={onClose} style={{ position: "absolute", top: 16, left: 16, background: "none", border: "none", cursor: "pointer", color: Z.sub }}>
              <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
          )}
        {isGroup
          ? <Av isGroup gAvatar={conv.avatar || conv.name?.substring(0, 2)} groupColor={conv.color} size={64} />
          : <Av user={otherUser} size={64} dot />
        }
        <div style={{ fontSize: 15, fontWeight: 700, color: Z.text, marginTop: 10 }}>{isGroup ? conv.name : displayName(otherUser)}</div>
        <div style={{ fontSize: 12, color: Z.sub, marginTop: 3 }}>{isGroup ? `${conv.participants?.length} thành viên` : otherUser?.role || ""}</div>
      </div>
      {isGroup && (
        <div style={{ padding: "14px 16px", flex: 1, overflow: "auto" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: Z.sub, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Thành viên</div>
          {conv.participants?.map(m => (
            <div key={m._id || m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: `1px solid ${Z.border}` }}>
              <Av user={m} size={32} dot />
              <div><div style={{ fontSize: 13, fontWeight: 600, color: Z.text }}>{displayName(m)}</div><div style={{ fontSize: 11, color: Z.sub }}>{m.role}</div></div>
            </div>
          ))}
        </div>
      )}
      </div>
    </>
  );
}

// Contacts View — create new conversations
function ContactsView({ chatUsers, me, onStartChat, isMobile }) {
  const [search, setSearch] = useState("");
  const [showGroup, setShowGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  const filtered = chatUsers.filter(u => {
    const name = displayName(u);
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const toggleMember = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const createGroupChat = async () => {
    if (!groupName.trim() || selectedIds.length === 0) return;
    try {
      const res = await api.createGroup(groupName, selectedIds);
      if (res.data) {
        onStartChat(res.data);
        setShowGroup(false);
        setGroupName("");
        setSelectedIds([]);
      }
    } catch (err) {
      console.error("Create group error:", err);
    }
  };

  const startDirect = async (userId) => {
    try {
      const res = await api.createDirect(userId);
      if (res.data) {
        onStartChat(res.data);
      }
    } catch (err) {
      console.error("Create direct error:", err);
    }
  };

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      <div style={{ width: isMobile ? "100%" : 320, background: Z.sidebar, borderRight: `1px solid ${Z.border}`, display: "flex", flexDirection: "column", paddingBottom: isMobile ? 60 : 0 }}>
        <div style={{ padding: "14px 16px", borderBottom: `1px solid ${Z.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 17, fontWeight: 700, color: Z.text }}>Danh Bạ</span>
            <button onClick={() => setShowGroup(s => !s)} style={{ padding: "6px 14px", borderRadius: 20, border: "none", background: Z.blue, color: "white", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>+ Nhóm</button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: Z.leftPanel, borderRadius: 20, padding: "7px 14px" }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth={2.5} strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm người dùng..." style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 13, color: Z.text }} />
          </div>
        </div>
        <div style={{ flex: 1, overflow: "auto" }}>
          {filtered.map(user => (
            <div key={user._id || user.id}
              onClick={() => startDirect(user._id || user.id)}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", cursor: "pointer", transition: "background 0.12s" }}
              onMouseEnter={e => e.currentTarget.style.background = Z.leftPanel}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <Av user={user} size={42} dot />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: Z.text }}>{displayName(user)}</div>
                <div style={{ fontSize: 12, color: Z.sub }}>{user.role || user.email}</div>
              </div>
              {showGroup && (
                <input type="checkbox" checked={selectedIds.includes(user._id || user.id)}
                  onChange={(e) => { e.stopPropagation(); toggleMember(user._id || user.id); }}
                  onClick={e => e.stopPropagation()}
                  style={{ width: 18, height: 18, cursor: "pointer", accentColor: Z.blue }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
      {(!isMobile || showGroup) && (
        <div style={{ 
          flex: 1, background: Z.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: isMobile ? 20 : 40,
          position: (isMobile && showGroup) ? "fixed" : "static", inset: 0, zIndex: 1000
        }}>
          {showGroup ? (
            <div style={{ background: Z.surface, borderRadius: 16, padding: isMobile ? 20 : 28, width: "100%", maxWidth: 400, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: Z.text, marginBottom: 20 }}>Tạo nhóm chat</div>
              <input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Tên nhóm..."
                style={{ width: "100%", background: Z.leftPanel, border: `1.5px solid ${Z.border}`, borderRadius: 10, padding: "10px 14px", fontSize: 13.5, color: Z.text, outline: "none", fontFamily: "'Be Vietnam Pro',sans-serif", marginBottom: 12 }}
              />
              <div style={{ fontSize: 12, color: Z.sub, marginBottom: 8 }}>Đã chọn {selectedIds.length} thành viên</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                {selectedIds.map(id => {
                  const u = chatUsers.find(x => (x._id || x.id) === id);
                  return u ? <span key={id} style={{ padding: "4px 10px", borderRadius: 20, background: Z.blueLight, color: Z.blue, fontSize: 12, fontWeight: 600 }}>{shortName(u)}</span> : null;
                })}
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button onClick={() => { setShowGroup(false); setSelectedIds([]); }} style={{ padding: "9px 22px", borderRadius: 20, border: `1.5px solid ${Z.border}`, cursor: "pointer", fontSize: 13, fontWeight: 600, background: "transparent", color: Z.sub }}>Huỷ</button>
                <button onClick={createGroupChat} style={{ padding: "9px 22px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, background: Z.blue, color: "white" }}>Tạo nhóm</button>
              </div>
            </div>
          ) : (
            !isMobile && (
              <div style={{ textAlign: "center", color: Z.sub }}>
                <div style={{ fontSize: 52, marginBottom: 12 }}>👥</div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>Chọn liên hệ để bắt đầu chat</div>
                <div style={{ fontSize: 13, marginTop: 6 }}>hoặc nhấn <strong>+ Nhóm</strong> để tạo nhóm mới</div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

// Loading spinner
function Loading() {
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: Z.bg }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 48, height: 48, border: `4px solid ${Z.border}`, borderTopColor: Z.blue, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <div style={{ fontSize: 14, color: Z.sub, fontWeight: 500 }}>Đang tải...</div>
      </div>
    </div>
  );
}

export default function App() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState("chat");
  const [convs, setConvs] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [msgs, setMsgs] = useState({});
  const [chatUsers, setChatUsers] = useState([]);
  const prevActiveId = useRef(null);

  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const [mobilePanel, setMobilePanel] = useState("list");
  const { isReady: showInstallPrompt, triggerInstall, dismissPrompt, showManual, closeManual } = useA2HS();

  // Register Service Worker
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(err => console.error("SW init error", err));
    }
  }, []);

  // Hook to reset to 'list' if tab changes on mobile
  useEffect(() => {
    if (isMobile) setMobilePanel("list");
  }, [tab, isMobile]);

  // Hook to switch to 'chat' when a conversation is selected
  useEffect(() => {
    if (isMobile && activeId) setMobilePanel("chat");
  }, [activeId, isMobile]);

  // Guard: only run browser code after mount
  useEffect(() => { setMounted(true); }, []);

  // Check auth on mount
  useEffect(() => {
    if (!mounted) return;
    const token = localStorage.getItem("chat_token");
    if (!token) {
      router.push("/login");
      return;
    }

    // Try stored user first, then verify with API
    const stored = localStorage.getItem("chat_user");
    if (stored) {
      try { setMe(JSON.parse(stored)); } catch {}
    }

    api.getMe()
      .then(res => {
        if (res.data) {
          setMe(res.data);
          localStorage.setItem("chat_user", JSON.stringify(res.data));
        }
      })
      .catch(() => {
        router.push("/login");
      })
      .finally(() => setLoading(false));
  }, [mounted, router]);

  // Load conversations
  useEffect(() => {
    if (!me) return;

    api.getConversations()
      .then(res => {
        if (res.data) {
          setConvs(res.data);
          if (res.data.length > 0 && !activeId) {
            setActiveId(res.data[0]._id);
          }
        }
      })
      .catch(err => console.error("Load conversations error:", err));

    // Load chat users for contacts
    api.getChatUsers()
      .then(res => { if (res.data) setChatUsers(res.data); })
      .catch(err => console.error("Load users error:", err));
  }, [me]);

  // Connect Socket.IO
  useEffect(() => {
    if (!me) return;
    const token = localStorage.getItem("chat_token");
    if (!token) return;

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const sock = connectSocket(token);

    const notify = (title, body) => {
      if ("Notification" in window && Notification.permission === "granted") {
        const n = new Notification(title, { body, icon: "/icon-192x192.svg" });
        n.onclick = () => { window.focus(); n.close(); };
      }
    };

    // Listen for new messages
    sock.on("chat:message", (message) => {
      const convId = message.conversationId;
      setMsgs(prev => ({
        ...prev,
        [convId]: [...(prev[convId] || []), message]
      }));

      if (document.hidden && message.senderId !== (me._id || me.id)) {
        notify("Tin nhắn mới", message.text || "Đã gửi tệp đính kèm");
      }
    });

    // Listen for new message notifications (for conversations not currently viewing)
    sock.on("chat:newMessage", ({ conversationId, message }) => {
      if (message.senderId === (me._id || me.id)) return;

      // Update unread count
      setConvs(prev => {
        const targetConv = prev.find(c => c._id === conversationId);
        if (targetConv) {
          let title = targetConv.type === "group" ? (targetConv.name || "Nhóm") : "Tin nhắn mới";
          if (targetConv.type !== "group" && targetConv.participants) {
            const sender = targetConv.participants.find(p => (p._id || p.id) === message.senderId);
            if (sender) title = displayName(sender);
          }
          notify(title, message.text || "Đã gửi tệp đính kèm");
        }

        return prev.map(c =>
          c._id === conversationId
            ? { ...c, unreadCount: (c.unreadCount || 0) + 1, lastMessage: { senderId: message.senderId, text: message.text || "📎", time: message.createdAt } }
            : c
        );
      });
      // Also add to msgs cache
      setMsgs(prev => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] || []), message]
      }));
    });

    // Listen for new conversations
    sock.on("chat:newConversation", (conv) => {
      setConvs(prev => {
        if (prev.find(c => c._id === conv._id)) return prev;
        return [conv, ...prev];
      });
    });

    // Online status
    sock.on("user:online", ({ userId, status }) => {
      // Update user status in conversations
      setConvs(prev => prev.map(c => ({
        ...c,
        participants: c.participants?.map(p =>
          (p._id || p.id) === userId ? { ...p, status } : p
        )
      })));
    });

    return () => {
      disconnectSocket();
    };
  }, [me]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeId || !me) return;

    // Leave previous room
    if (prevActiveId.current && prevActiveId.current !== activeId) {
      leaveConversation(prevActiveId.current);
    }

    // Join new room
    joinConversation(activeId);
    prevActiveId.current = activeId;

    // Mark as read
    api.markAsRead(activeId).catch(() => {});
    setConvs(prev => prev.map(c => c._id === activeId ? { ...c, unreadCount: 0 } : c));

    // Load messages if not cached
    if (!msgs[activeId]) {
      api.getMessages(activeId)
        .then(res => {
          if (res.messages) {
            setMsgs(prev => ({ ...prev, [activeId]: res.messages }));
          }
        })
        .catch(err => console.error("Load messages error:", err));
    }
  }, [activeId, me]);

  // Send message handler
  const handleSend = useCallback(async (data) => {
    if (!activeId) return;
    try {
      const res = await api.sendMessage(activeId, data);
      if (res.data) {
        // Message will come back via socket, but add it immediately for instant feedback
        setMsgs(prev => {
          const existing = prev[activeId] || [];
          // Avoid duplicate (socket may arrive before HTTP response)
          if (existing.find(m => m._id === res.data._id)) return prev;
          return { ...prev, [activeId]: [...existing, res.data] };
        });
        // Update conversation lastMessage
        setConvs(prev => prev.map(c =>
          c._id === activeId
            ? { ...c, lastMessage: { senderId: res.data.senderId, text: data.text || "📎", time: new Date().toISOString() }, updatedAt: new Date().toISOString() }
            : c
        ));
      }
    } catch (err) {
      console.error("Send message error:", err);
    }
  }, [activeId]);

  // Delete conversation handler
  const handleDelete = useCallback((convId) => {
    setConvs(prev => prev.filter(c => c._id !== convId));
    setMsgs(prev => { const next = { ...prev }; delete next[convId]; return next; });
    if (activeId === convId) {
      setActiveId(convs.filter(c => c._id !== convId)[0]?._id || null);
    }
  }, [activeId, convs]);

  // Start chat from contacts
  const handleStartChat = useCallback((conv) => {
    setConvs(prev => {
      if (prev.find(c => c._id === conv._id)) return prev;
      return [conv, ...prev];
    });
    setActiveId(conv._id);
    setTab("chat");
  }, []);

  if (loading) return (<><style>{CSS}</style><div style={{ display: "flex", height: "100vh", overflow: "hidden", fontFamily: "'Be Vietnam Pro',sans-serif" }}><Loading /></div></>);
  if (!me) return null;

  const activeConv = convs.find(c => c._id === activeId) || null;

  return (
    <>
      <style>{CSS}</style>
      
      {/* Native Browser Install Prompt Banner */}
      {showInstallPrompt && (
        <div className="fade-in" style={{ position: "fixed", top: "max(12px, env(safe-area-inset-top))", left: 12, right: 12, zIndex: 9999, background: "white", borderRadius: 16, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg, ${Z.blue}, #0048b3)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 900, color: "white", flexShrink: 0 }}>Z</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: Z.text }}>Cài đặt ChatLocal</div>
            <div style={{ fontSize: 12, color: Z.sub }}>Thêm vào màn hình chính để truy cập nhanh</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <button onClick={triggerInstall} style={{ padding: "6px 16px", borderRadius: 20, background: Z.blue, color: "white", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Cài đặt</button>
            <button onClick={dismissPrompt} style={{ padding: "4px 16px", borderRadius: 20, background: "transparent", color: Z.sub, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Để sau</button>
          </div>
        </div>
      )}

      {/* Manual Install Instruction Fallback (For iOS & HTTPS issues) */}
      {showManual && (
        <div style={{ position: "fixed", inset: 0, zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={closeManual}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(8,28,54,0.45)", backdropFilter: "blur(3px)" }} />
          <div onClick={e => e.stopPropagation()} className="fade-in" style={{ position: "relative", background: "white", borderRadius: 18, padding: "28px 28px 22px", width: 340, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: Z.blueLight, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={Z.blue} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#081c36", marginBottom: 8 }}>Cài đặt ứng dụng</div>
            <div style={{ fontSize: 13.5, color: "#7a8694", lineHeight: 1.6, marginBottom: 22, textAlign: "left" }}>
              Trình duyệt của bạn không hỗ trợ cài đặt tự động. Vui lòng thêm thủ công theo các bước sau:<br/><br/>
              <b>📱 Trên iOS (Safari):</b><br/>1. Nhấn vào biểu tượng <b>Chia sẻ</b> (Share) ở dưới cùng.<br/>2. Chọn <b>"Thêm vào MH chính"</b> (Add to Home Screen).<br/><br/>
              <b>📱 Trên Android / Máy tính:</b><br/>Nhấn vào menu trình duyệt (⋮) và chọn <b>"Cài đặt ứng dụng"</b>.
            </div>
            <button onClick={closeManual} style={{ width: "100%", padding: "10px 0", borderRadius: 12, border: "none", background: Z.blue, fontSize: 14, fontWeight: 700, color: "white", cursor: "pointer", boxShadow: "0 4px 14px rgba(0,104,255,0.35)" }}>Đã hiểu</button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", height: "100dvh", minHeight: "-webkit-fill-available", overflow: "hidden", fontFamily: "'Be Vietnam Pro',sans-serif" }}>
        {/* Desktop Sidebar Nav */}
        <div className="hide-on-mobile" style={{ height: "100%" }}>
          <IconNav tab={tab} setTab={setTab} me={me} isMobile={false} onInstall={triggerInstall} />
        </div>
        
        {/* Mobile Bottom Nav */}
        <IconNav tab={tab} setTab={setTab} me={me} isMobile={true} onInstall={triggerInstall} hideOnMobile={mobilePanel === "chat" || mobilePanel === "info"} />

        {tab === "chat" && <>
          {/* Conversation List (Slides out left on mobile when reading chat) */}
          <div className={(isMobile && (mobilePanel === "chat" || mobilePanel === "info")) ? "hide-on-mobile" : ""} style={{ display: "flex", width: isMobile ? "100%" : "auto", height: "100%", flexShrink: 0 }}>
            <ConvList convs={convs} activeId={activeId} setActiveId={(id) => { setActiveId(id); if (isMobile) setMobilePanel("chat"); }} me={me} onDelete={handleDelete} isMobile={isMobile} />
          </div>

          {/* Chat Window Container */}
          <div className={isMobile && mobilePanel === "list" ? "hide-on-mobile" : "slide-left"} style={{ display: "flex", flex: 1, minWidth: 0, height: "100%" }}>
            <ChatWindow conv={activeConv} msgs={msgs[activeId] || []} me={me} onSend={handleSend} isMobile={isMobile} isTablet={isTablet} mobilePanel={mobilePanel} setMobilePanel={setMobilePanel} />
          </div>

          {/* Right Panel (Desktop info pane, or mobile overlay) */}
          {(!isMobile && !isTablet) && <RightPanel conv={activeConv} me={me} isMobile={false} isTablet={false} />}
          {(isMobile || isTablet) && mobilePanel === "info" && (
            <RightPanel conv={activeConv} me={me} isMobile={isMobile} isTablet={isTablet} onClose={() => setMobilePanel("chat")} />
          )}
        </>}
        {tab === "contacts" && <ContactsView chatUsers={chatUsers} me={me} onStartChat={handleStartChat} isMobile={isMobile} />}
      </div>
    </>
  );
}