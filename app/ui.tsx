// @ts-nocheck
"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import * as api from "./lib/api";


export const Z = {
  blue: "#2563eb", blueDark: "#1d4ed8", blueLight: "#eff6ff", blueMid: "#dbeafe",
  sidebar: "#ffffff", leftPanel: "#f8fafc", bg: "#f1f5f9", surface: "#ffffff",
  text: "#0f172a", textMd: "#334155", sub: "#64748b", border: "#e2e8f0",
  msgOther: "#ffffff", msgMine: "#2563eb",
  online: "#22c55e", away: "#f59e0b", busy: "#ef4444", offline: "#cbd5e1",
  navBg: "#1e293b", navActive: "rgba(255,255,255,0.12)",
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

// Hook for dynamic viewport height (fixes iOS keyboard layout)
export function useViewportHeight() {
  const [vh, setVh] = useState(typeof window !== "undefined" ? window.innerHeight : 0);
  const [vvh, setVvh] = useState(typeof window !== "undefined" && window.visualViewport ? window.visualViewport.height : 0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const update = () => {
      setVh(window.innerHeight);
      if (window.visualViewport) setVvh(window.visualViewport.height);
    };
    
    update();
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", update);
      window.visualViewport.addEventListener("scroll", update);
    } else {
      window.addEventListener("resize", update);
    }
    
    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", update);
        window.visualViewport.removeEventListener("scroll", update);
      } else {
        window.removeEventListener("resize", update);
      }
    };
  }, []);

  return { vh, vvh, isKeyboardOpen: vvh > 0 && vvh < vh };
}

// Avatar
export function Av({ user, size = 40, isGroup = false, dot = false, gAvatar, groupColor, onlineStatus }) {
  // Check if avatar is a URL (image uploaded)
  const userAvatarUrl = !isGroup && typeof user === "object" && user?.avatar;
  const groupAvatarUrl = isGroup && gAvatar && (gAvatar.startsWith("http") || gAvatar.startsWith("data:"));

  const bg = isGroup ? (groupColor || Z.blue) : userColor(user);
  const text = isGroup ? (gAvatar || "GR") : avatarLetters(user);
  const status = onlineStatus || (typeof user === "object" ? user?.status : null);
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      {(userAvatarUrl || groupAvatarUrl) ? (
        <img src={userAvatarUrl || gAvatar} alt="" style={{
          width: size, height: size, borderRadius: isGroup ? size * 0.28 : "50%",
          objectFit: "cover"
        }} />
      ) : (
        <div style={{ width: size, height: size, borderRadius: isGroup ? size * 0.28 : "50%", background: `linear-gradient(135deg,${bg}ee,${bg}99)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.36, fontWeight: 700, color: "white", userSelect: "none" }}>{text}</div>
      )}
      {dot && !isGroup && status && <span style={{ position: "absolute", bottom: 1, right: 1, width: size * 0.28, height: size * 0.28, borderRadius: "50%", background: SDOT[status] || Z.offline, border: "2px solid white" }} />}
    </div>
  );
}

// Icon Nav — Desktop sidebar + Mobile bottom tab (never both at once)
export function IconNav({ tab, setTab, me, isMobile, hideOnMobile, unreadCount = 0 }) {
  const [showLogout, setShowLogout] = useState(false);
  const doLogout = () => { api.logout(); window.location.replace("/login"); };
  const nav = [
    {
      id: "chat", lbl: "Tin nhắn",
      d: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    },
    {
      id: "contacts", lbl: "Danh bạ",
      d: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>
    },
    {
      id: "account", lbl: "Tài khoản",
      d: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>
    },
  ];

  // Badge helper
  const Badge = ({ borderColor }: { borderColor: string }) =>
    unreadCount > 0 ? (
      <span style={{
        position: "absolute", top: -3, right: -3,
        minWidth: 16, height: 16, borderRadius: 8,
        background: "#ef4444", color: "white",
        fontSize: 9, fontWeight: 700,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "0 4px", border: `1.5px solid ${borderColor}`,
        lineHeight: 1, pointerEvents: "none",
      }}>{unreadCount > 99 ? "99+" : unreadCount}</span>
    ) : null;

  // ── Mobile bottom tab bar ──────────────────────────────────────
  if (isMobile) {
    return (
      <>
        <div className={hideOnMobile ? "hide-on-mobile" : ""} style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 900,
          background: "rgba(30,41,59,0.95)", backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          display: "flex", alignItems: "center", justifyContent: "space-around",
          padding: "8px 0", paddingBottom: "max(12px, env(safe-area-inset-bottom, 22px))",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 -8px 32px rgba(0,0,0,0.25)",
        }}>
          {nav.map(n => (
            <button key={n.id} onClick={() => setTab(n.id)} style={{
              flex: 1, height: 50, border: "none", cursor: "pointer",
              background: "transparent",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3,
            }}>
              <div style={{
                position: "relative",
                width: 40, height: 28, borderRadius: 14,
                background: tab === n.id ? "rgba(37,99,235,0.35)" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background 0.2s",
              }}>
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none"
                  stroke={tab === n.id ? "#93c5fd" : "rgba(255,255,255,0.45)"}
                  strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                  style={{ transition: "stroke 0.2s" }}>{n.d}
                </svg>
                {n.id === "chat" && <Badge borderColor="rgba(30,41,59,0.95)" />}
              </div>
              <span style={{
                fontSize: 10, fontWeight: tab === n.id ? 700 : 500,
                color: tab === n.id ? "#93c5fd" : "rgba(255,255,255,0.4)",
                transition: "color 0.2s"
              }}>{n.lbl}</span>
            </button>
          ))}
          <button onClick={() => setShowLogout(true)} style={{
            flex: 1, height: 50, border: "none", cursor: "pointer", background: "transparent",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3,
          }}>
            <div style={{ width: 40, height: 28, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth={2} strokeLinecap="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </div>
            <span style={{ fontSize: 10, fontWeight: 500, color: "rgba(255,255,255,0.4)" }}>Thoát</span>
          </button>
        </div>
        {showLogout && (
          <div style={{ position: "fixed", inset: 0, zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowLogout(false)}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(8,28,54,0.45)", backdropFilter: "blur(3px)" }} />
            <div onClick={e => e.stopPropagation()} className="fade-in" style={{ position: "relative", background: "white", borderRadius: 18, padding: "28px 28px 22px", width: 320, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", textAlign: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#fff7ed", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth={2} strokeLinecap="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, color: "#081c36", marginBottom: 8 }}>Đăng xuất?</div>
              <div style={{ fontSize: 13.5, color: "#7a8694", lineHeight: 1.6, marginBottom: 22 }}>Bạn có chắc muốn đăng xuất khỏi tài khoản không?</div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setShowLogout(false)} style={{ flex: 1, padding: "10px 0", borderRadius: 12, border: `1.5px solid #e2e8f0`, background: "transparent", fontSize: 14, fontWeight: 600, color: "#64748b", cursor: "pointer" }}>Huỷ</button>
                <button onClick={doLogout} style={{ flex: 1, padding: "10px 0", borderRadius: 12, border: "none", background: "#f59e0b", fontSize: 14, fontWeight: 700, color: "white", cursor: "pointer", boxShadow: "0 4px 14px rgba(245,158,11,0.35)" }}>Đăng xuất</button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // ── Desktop sidebar ───────────────────────────────────────────
  return (
    <div style={{
      width: 72, background: Z.navBg, display: "flex", flexDirection: "column",
      alignItems: "center", padding: "14px 0 10px", gap: 2, flexShrink: 0,
      boxShadow: "2px 0 8px rgba(0,0,0,0.15)",
    }}>
      {/* User avatar */}
      <div style={{ marginBottom: 18 }}>
        <Av user={me} size={42} dot onlineStatus="online" />
      </div>

      {/* Nav items */}
      {nav.map(n => (
        <button key={n.id} onClick={() => setTab(n.id)}
          className="nav-btn"
          style={{
            width: 48, height: 48, borderRadius: 14, border: "none", cursor: "pointer",
            background: tab === n.id ? Z.navActive : "transparent",
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: 3, transition: "background 0.15s",
            position: "relative",
          }}
          onMouseEnter={e => { if (tab !== n.id) e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}
          onMouseLeave={e => { if (tab !== n.id) e.currentTarget.style.background = "transparent"; }}
        >
          {tab === n.id && (
            <div style={{
              position: "absolute", left: 0, top: "20%", bottom: "20%",
              width: 3, borderRadius: "0 3px 3px 0", background: "#60a5fa",
            }} />
          )}
          <div style={{ position: "relative" }}>
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none"
              stroke={tab === n.id ? "#93c5fd" : "rgba(255,255,255,0.5)"}
              strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
              style={{ transition: "stroke 0.15s", display: "block" }}>{n.d}
            </svg>
            {n.id === "chat" && <Badge borderColor={Z.navBg} />}
          </div>
          <span style={{ fontSize: 9, color: tab === n.id ? "#93c5fd" : "rgba(255,255,255,0.4)", fontWeight: 600, transition: "color 0.15s" }}>{n.lbl}</span>
        </button>
      ))}

      <div style={{ flex: 1 }} />

      {/* Logout */}
      <button onClick={() => setShowLogout(true)}
        className="nav-btn"
        style={{
          width: 40, height: 40, borderRadius: "50%", border: "none",
          background: "rgba(255,255,255,0.07)", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8,
        }}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.2)"}
        onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"}
      >
        <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={2} strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
      </button>

      {showLogout && (
        <div style={{ position: "fixed", inset: 0, zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowLogout(false)}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(8,28,54,0.45)", backdropFilter: "blur(3px)" }} />
          <div onClick={e => e.stopPropagation()} className="fade-in" style={{ position: "relative", background: "white", borderRadius: 18, padding: "28px 28px 22px", width: 320, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#fff7ed", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth={2} strokeLinecap="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#081c36", marginBottom: 8 }}>Đăng xuất?</div>
            <div style={{ fontSize: 13.5, color: "#7a8694", lineHeight: 1.6, marginBottom: 22 }}>Bạn có chắc muốn đăng xuất khỏi tài khoản không?</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowLogout(false)} style={{ flex: 1, padding: "10px 0", borderRadius: 12, border: `1.5px solid #e2e8f0`, background: "transparent", fontSize: 14, fontWeight: 600, color: "#64748b", cursor: "pointer" }}>Huỷ</button>
              <button onClick={doLogout} style={{ flex: 1, padding: "10px 0", borderRadius: 12, border: "none", background: "#f59e0b", fontSize: 14, fontWeight: 700, color: "white", cursor: "pointer", boxShadow: "0 4px 14px rgba(245,158,11,0.35)" }}>Đăng xuất</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Delete Confirmation Dialog
export function DeleteDialog({ name, onConfirm, onCancel }) {
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

// In-app Toast Notification
export function ChatToast({ toast, onClick }: { toast: { name: string; text: string; avatar?: string; color?: string } | null; onClick: () => void }) {
  if (!toast) return null;
  return (
    <div
      className="slide-up"
      onClick={onClick}
      style={{
        position: "fixed", top: 16, right: 16, zIndex: 3000,
        background: "white", borderRadius: 14, padding: "12px 16px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.1)",
        border: `1px solid ${Z.border}`,
        display: "flex", alignItems: "center", gap: 12,
        cursor: "pointer", maxWidth: 320, minWidth: 240,
        transition: "box-shadow 0.15s",
      }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.boxShadow = "0 12px 40px rgba(0,0,0,0.22)"}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.1)"}
    >
      {/* Avatar circle */}
      <div style={{
        width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
        background: `linear-gradient(135deg,${toast.color || Z.blue}ee,${toast.color || Z.blue}88)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 15, fontWeight: 700, color: "white",
      }}>{toast.avatar || "?"}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: Z.text, marginBottom: 2 }}>{toast.name}</div>
        <div style={{ fontSize: 12, color: Z.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{toast.text}</div>
      </div>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#2563eb", flexShrink: 0 }} />
    </div>
  );
}

// Conversation List
export function ConvList({ convs, activeId, setActiveId, me, onDelete, isMobile }) {
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
      <div style={{ width: isMobile ? "100%" : 300, background: Z.sidebar, borderRight: `1px solid ${Z.border}`, display: "flex", flexDirection: "column", flexShrink: 0, paddingBottom: isMobile ? 66 : 0, paddingTop: isMobile ? "env(safe-area-inset-top, 0px)" : 0 }}>
        {/* Header */}
        <div style={{ padding: "16px 16px 12px", borderBottom: `1px solid ${Z.border}`, minHeight: 60 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: Z.text, letterSpacing: "-0.3px" }}>Tin nhắn</span>
              {convs.reduce((s, c) => s + (c.unreadCount || 0), 0) > 0 && (
                <span style={{
                  minWidth: 20, height: 20, borderRadius: 10,
                  background: "#ef4444", color: "white",
                  fontSize: 11, fontWeight: 700, display: "inline-flex",
                  alignItems: "center", justifyContent: "center", padding: "0 5px",
                }}>{convs.reduce((s, c) => s + (c.unreadCount || 0), 0)}</span>
              )}
            </div>
          </div>
          {/* Search */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: Z.leftPanel, borderRadius: 12, padding: "8px 12px",
            border: `1.5px solid ${Z.border}`, transition: "border-color 0.2s",
          }}
            onFocusCapture={e => e.currentTarget.style.borderColor = Z.blue}
            onBlurCapture={e => e.currentTarget.style.borderColor = Z.border}
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={Z.sub} strokeWidth={2.5} strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm kiếm..."
              style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 13, color: Z.text }} />
            {search && (
              <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: Z.sub, display: "flex" }}>
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflow: "auto" }}>
          {list.length === 0 && (
            <div style={{ textAlign: "center", padding: "48px 24px", color: Z.sub }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>💬</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: Z.textMd, marginBottom: 4 }}>Chưa có tin nhắn nào</div>
              <div style={{ fontSize: 12, color: Z.sub }}>Chuyển sang mục Danh bạ để bắt đầu chat</div>
            </div>
          )}
          {list.map(conv => {
            const name = getConvName(conv);
            const act = conv._id === activeId;
            const hov = conv._id === hoverId;
            const hasUnread = (conv.unreadCount || 0) > 0;
            const lastText = conv.lastMessage?.text || "";
            const lastTime = conv.lastMessage?.time
              ? new Date(conv.lastMessage.time).toLocaleTimeString("vi", { hour: "2-digit", minute: "2-digit" }) : "";
            const otherUser = getOtherUser(conv);
            return (
              <SwipeRow key={conv._id} isMobile={isMobile} onDelete={() => setDeleteConv(conv)}>
                <div
                  className="conv-item"
                  onClick={(e) => { 
                    /* Prevent firing if it was a swipe */
                    if (isMobile) {
                      const tgt = e.currentTarget.closest('.swiper-container');
                      if (tgt && tgt.getAttribute('data-swiping') === 'true') return;
                    }
                    setActiveId(conv._id); 
                  }}
                  onMouseEnter={() => setHoverId(conv._id)}
                  onMouseLeave={() => setHoverId(null)}
                  style={{
                    display: "flex", alignItems: "center", gap: 11, padding: "9px 14px",
                    cursor: "pointer", position: "relative",
                    background: act ? Z.blueLight : undefined,
                    borderLeft: `3px solid ${act ? Z.blue : "transparent"}`,
                  }}
                >
                  {conv.type === "direct"
                    ? <Av user={otherUser} size={46} dot onlineStatus={otherUser?.status} />
                    : <Av isGroup gAvatar={getConvAvatar(conv)} groupColor={getConvColor(conv)} size={46} />
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                      <span style={{
                        fontSize: 13.5, fontWeight: hasUnread ? 700 : 600,
                        color: Z.text, overflow: "hidden", textOverflow: "ellipsis",
                        whiteSpace: "nowrap", maxWidth: isMobile ? 180 : 150, flex: 1,
                      }}>{name}</span>
                      <span style={{
                        fontSize: 11, flexShrink: 0, marginLeft: 6,
                        color: hasUnread ? Z.blue : Z.sub,
                        fontWeight: hasUnread ? 700 : 400,
                      }}>{lastTime}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{
                        fontSize: 12, color: hasUnread ? Z.textMd : Z.sub,
                        fontWeight: hasUnread ? 500 : 400,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 175,
                      }}>{lastText || "Bắt đầu cuộc trò chuyện"}</span>
                      {hasUnread && (
                        <span style={{
                          minWidth: 18, height: 18, borderRadius: 9,
                          background: Z.blue, color: "white",
                          fontSize: 10, fontWeight: 700, display: "flex",
                          alignItems: "center", justifyContent: "center",
                          padding: "0 5px", flexShrink: 0, marginLeft: 6,
                        }}>{conv.unreadCount}</span>
                      )}
                    </div>
                  </div>
                  {/* Delete on hover — desktop only, hidden on mobile */}
                  {!isMobile && (
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteConv(conv); }}
                      title="Xoá cuộc trò chuyện"
                      style={{
                        position: "absolute", right: 10,
                        width: 28, height: 28, borderRadius: "50%", border: "none",
                        background: "#fee2e2", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        opacity: hov ? 1 : 0,
                        transition: "opacity 0.15s",
                        pointerEvents: hov ? "auto" : "none",
                      }}
                    >
                      <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" />
                      </svg>
                    </button>
                  )}
                </div>
              </SwipeRow>
            );
          })}
        </div>
      </div>
    </>
  );
}


// Swipe-to-delete row (mobile only)
export function SwipeRow({ onDelete, isMobile, children }: { onDelete: () => void; isMobile: boolean; children: React.ReactNode }) {
  const [offset, setOffset] = useState(0);
  const startX = useRef(0);
  const startY = useRef(0);
  const isDragging = useRef(false);
  const containerRef = useRef(null);
  const THRESHOLD = 70;

  if (!isMobile) return <>{children}</>;

  const onTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    isDragging.current = true;
    if (containerRef.current) containerRef.current.setAttribute('data-swiping', 'false');
  };
  const onTouchMove = (e) => {
    if (!isDragging.current) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = Math.abs(e.touches[0].clientY - startY.current);
    
    // If vertical scrolling dominates, cancel swipe
    if (dy > Math.abs(dx) && Math.abs(dx) < 10) {
      isDragging.current = false;
      return;
    }

    if (Math.abs(dx) > 5 && containerRef.current) {
      containerRef.current.setAttribute('data-swiping', 'true'); // Flag to prevent click
    }

    if (dx < 0) {
      // Swipe left to show delete
      setOffset(Math.max(dx, -THRESHOLD - 20));
    } else if (dx > 0 && offset < 0) {
      // Swipe right to close
      setOffset(Math.min(0, offset + dx));
    }
  };
  const onTouchEnd = () => {
    isDragging.current = false;
    if (offset < -THRESHOLD / 2) setOffset(-THRESHOLD);
    else {
      setOffset(0);
      // Reset the swiping flag after a short delay so click event can be bypassed
      setTimeout(() => {
        if (containerRef.current) containerRef.current.setAttribute('data-swiping', 'false');
      }, 50);
    }
  };

  return (
    <div className="swiper-container" ref={containerRef} style={{ position: "relative", overflow: "hidden" }}>
      {/* Red delete layer behind */}
      <div style={{
        position: "absolute", right: 0, top: 0, bottom: 0,
        width: THRESHOLD, background: "#ef4444",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer",
      }} onClick={(e) => { e.stopPropagation(); setOffset(0); onDelete(); }}>
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" />
        </svg>
      </div>
      {/* Swipeable content */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        style={{
          transform: `translateX(${offset}px)`,
          transition: isDragging.current ? "none" : "transform 0.25s cubic-bezier(0.25,0.46,0.45,0.94)",
          willChange: "transform",
          background: "white",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function ChatWindow({ conv, msgs, me, onSend, onRecall, isMobile, isTablet, mobilePanel, setMobilePanel, isLoadingMsgs }) {
  const { isKeyboardOpen } = useViewportHeight();
  const [showEmoji, setShowEmoji] = useState(false);
  const [hasText, setHasText] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [hoverMsgId, setHoverMsgId] = useState(null);
  const [contextMenu, setContextMenu] = useState(null); // { msgId, x, y, msg }
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef();
  const scrollRef = useRef();   // ref on the messages scroll container
  const prevConvId = useRef(null);
  const edRef = useRef();

  const pendingScrollBottom = useRef(false); // true while waiting for msgs to load after conv switch

  // Scroll logic: instant on conv change (even after async load), smooth only when already near bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const convId = conv?._id;
    const convChanged = prevConvId.current !== convId;
    prevConvId.current = convId;

    if (convChanged) {
      // Mark that we want to scroll to bottom when msgs arrive
      pendingScrollBottom.current = true;
      // If msgs already cached, scroll now
      if (msgs.length > 0) {
        pendingScrollBottom.current = false;
        el.scrollTop = el.scrollHeight;
      }
    } else if (pendingScrollBottom.current && msgs.length > 0) {
      // Msgs just finished loading after conv switch → instant scroll
      pendingScrollBottom.current = false;
      el.scrollTop = el.scrollHeight;
    } else {
      // New message in same conversation → only smooth-scroll if user is near bottom
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (distFromBottom < 120) {
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      }
    }
  }, [msgs, conv?._id]);

  useEffect(() => { if (replyTo) setTimeout(() => edRef.current?.focus(), 50); }, [replyTo]);

  // Close context menu on outside click (use 'click' not 'mousedown' so menu item onClick fires first)
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [contextMenu]);

  if (!conv) return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: Z.bg, gap: 16 }}>
      <div style={{
        width: 90, height: 90, borderRadius: 28,
        background: "linear-gradient(145deg, #dbeafe, #eff6ff)",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44,
        boxShadow: "0 8px 32px rgba(37,99,235,0.12)",
      }}>💬</div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: Z.text, marginBottom: 6 }}>Chọn cuộc trò chuyện</div>
        <div style={{ fontSize: 13, color: Z.sub }}>Hoặc tạo mới từ Danh Bạ</div>
      </div>
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

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Clear input
    e.target.value = '';

    if (file.size > 20 * 1024 * 1024) {
      alert("Kích thước tệp tin không được vượt quá 20MB.");
      return;
    }

    setIsUploading(true);
    try {
      const res = await api.uploadChatFile(file);
      if (res.data) {
        if (res.data.isImage) {
          onSend({ images: [res.data.url], replyTo: replyTo || undefined });
        } else {
          onSend({ file: { name: res.data.name, size: res.data.size, url: res.data.url }, replyTo: replyTo || undefined });
        }
        setReplyTo(null);
      }
    } catch (err) {
      console.error("Upload failed", err);
      alert("Lỗi tải lên: " + (err.message || "Hãy thử lại"));
    } finally {
      setIsUploading(false);
    }
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
    // Date grouping
    const msgDate = msg.createdAt ? new Date(msg.createdAt).toDateString() : "";
    const prevDate = (i > 0 && msgs[i - 1].createdAt) ? new Date(msgs[i - 1].createdAt).toDateString() : "";
    const showDateSep = i === 0 || msgDate !== prevDate;
    return { ...msg, first: i === 0 || prevSid !== sid, last: i === msgs.length - 1 || nextSid !== sid, showDateSep };
  });

  const formatDateSep = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const today = now.toDateString();
    const yesterday = new Date(now - 86400000).toDateString();
    if (d.toDateString() === today) return "Hôm nay";
    if (d.toDateString() === yesterday) return "Hôm qua";
    return d.toLocaleDateString("vi", { weekday: "long", day: "numeric", month: "long" });
  };

  const QuoteBar = ({ reply, mine }) => {
    const accent = mine ? "rgba(255,255,255,0.6)" : Z.blue;
    const textColor = mine ? "rgba(255,255,255,0.9)" : Z.blue;
    const subColor = mine ? "rgba(255,255,255,0.7)" : Z.sub;
    return (
      <div style={{ borderLeft: `3px solid ${accent}`, paddingLeft: 8, marginBottom: 6, opacity: 0.88, display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: textColor, marginBottom: 2 }}>Trả lời</div>
          {reply.image && (
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <img src={reply.image} alt="" style={{ width: 28, height: 28, borderRadius: 5, objectFit: "cover", flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: subColor }}>Hình ảnh</span>
            </div>
          )}
          {reply.fileName && !reply.image && (
            <div style={{ fontSize: 11, color: subColor, display: "flex", alignItems: "center", gap: 4 }}>
              <span>{fIcon(reply.fileName).i}</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 170 }}>{reply.fileName}</span>
            </div>
          )}
          {reply.text && !reply.image && !reply.fileName && (
            <div style={{ fontSize: 11.5, color: subColor, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>{reply.text}</div>
          )}
          {reply.text && (reply.image || reply.fileName) && (
            <div style={{ fontSize: 11, color: subColor, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200, marginTop: 2 }}>{reply.text}</div>
          )}
        </div>
      </div>
    );
  };

  const otherUser = getOtherUser();

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: Z.bg }}>
      {/* Header */}
      <div style={{
        padding: "0 16px", minHeight: 60,
        background: Z.surface, borderBottom: `1px solid ${Z.border}`,
        display: "flex", alignItems: "center", gap: 12,
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        paddingTop: isMobile ? "env(safe-area-inset-top, 0px)" : 0,
        flexShrink: 0,
      }}>
        {isMobile && (
          <button onClick={() => setMobilePanel("list")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", padding: "4px 8px 4px 0", marginLeft: -8, color: Z.blue }}>
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
        )}
        {conv.type === "direct"
          ? <Av user={otherUser} size={40} dot />
          : <Av isGroup gAvatar={conv.avatar || conv.name?.substring(0, 2)} groupColor={conv.color} size={40} />
        }
        <div style={{ flex: 1, cursor: (isMobile || isTablet) ? "pointer" : "default", minWidth: 0 }}
          onClick={() => { if (isMobile || isTablet) setMobilePanel("info"); }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: Z.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{getConvTitle()}</div>
          <div style={{ fontSize: 12, color: Z.sub }}>{getConvSub()}</div>
        </div>
        {(isMobile || isTablet) && (
          <button onClick={() => setMobilePanel("info")} style={{
            background: Z.leftPanel, border: `1px solid ${Z.border}`,
            borderRadius: 10, cursor: "pointer", color: Z.sub, padding: "6px 8px",
            display: "flex", alignItems: "center"
          }}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflow: "auto", padding: "12px 16px 16px", display: "flex", flexDirection: "column", gap: 0 }}>
        {isLoadingMsgs ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 14, paddingBottom: 20 }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ display: "flex", justifyContent: i % 2 === 0 ? "flex-end" : "flex-start" }}>
                <div className="sk" style={{ height: i % 2 === 0 ? 44 : 52, borderRadius: 18, width: `${30 + (i * 10)}%`, maxWidth: "70%" }} />
              </div>
            ))}
          </div>
        ) : msgs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 24px", color: Z.sub }}>
            <div style={{
              width: 80, height: 80, borderRadius: 24,
              background: "linear-gradient(145deg, #dbeafe, #eff6ff)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 40, margin: "0 auto 16px",
            }}>👋</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: Z.textMd, marginBottom: 4 }}>Bắt đầu cuộc trò chuyện!</div>
            <div style={{ fontSize: 13, color: Z.sub }}>Hãy gửi lời chào đầu tiên</div>
          </div>
        ) : (
          grouped.map(msg => {
            const sender = getSender(msg);
            const senderId = typeof msg.senderId === "object" ? (msg.senderId._id || msg.senderId.id) : msg.senderId;
            const mine = senderId === myId;
            const fi = msg.file ? fIcon(msg.file.name) : null;
            const hov = hoverMsgId === msg._id;
            const time = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString("vi", { hour: "2-digit", minute: "2-digit" }) : "";
            return (
              <div key={msg._id}>
                {/* Date separator */}
                {msg.showDateSep && (
                  <div className="date-sep"><span>{formatDateSep(msg.createdAt)}</span></div>
                )}
                <div className="msg-in"
                  onMouseEnter={() => setHoverMsgId(msg._id)}
                  onMouseLeave={() => setHoverMsgId(null)}
                  style={{ display: "flex", flexDirection: "row", alignItems: "flex-end", gap: 6, marginBottom: msg.last ? 10 : 2 }}
                >
                  {/* Avatar for other's messages */}
                  {!mine && <div style={{ width: 32, flexShrink: 0 }}>{msg.last && <Av user={sender} size={32} />}</div>}

                  {/* Bubble + actions wrapper — mine pushes to right via marginLeft auto */}
                  <div style={{ display: "flex", flexDirection: "row", alignItems: "flex-end", gap: 4, marginLeft: mine ? "auto" : 0, maxWidth: "70%" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start" }}>
                      {!mine && msg.first && conv.type === "group" && (
                        <div style={{ fontSize: 11.5, fontWeight: 600, color: userColor(sender), marginBottom: 3, marginLeft: 2 }}>{shortName(sender)}</div>
                      )}

                      {msg.recalled ? (
                        <div style={{
                          padding: "8px 13px",
                          borderRadius: 14,
                          background: "#f1f5f9",
                          color: Z.sub,
                          fontSize: 12.5,
                          fontStyle: "italic",
                          border: `1px dashed ${Z.border}`,
                          display: "flex", alignItems: "center", gap: 6
                        }}>
                          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={Z.sub} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-3.51" /></svg>
                          Tin nhắn đã được thu hồi
                        </div>
                      ) : (
                        <>
                          {msg.images && msg.images.length > 0 && (
                            <div>
                              {msg.replyTo && <QuoteBar reply={msg.replyTo} mine={false} />}
                              {msg.images.map((img, idx) => <img key={idx} src={img} alt="" style={{ maxWidth: 220, maxHeight: 180, borderRadius: 14, display: "block", boxShadow: "0 2px 12px rgba(0,0,0,0.15)", marginBottom: 4 }} />)}
                            </div>
                          )}

                          {msg.file && (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch", padding: "11px 14px", borderRadius: 14, background: mine ? Z.blue : Z.surface, border: mine ? "none" : `1px solid ${Z.border}`, boxShadow: mine ? `0 2px 8px rgba(37,99,235,0.25)` : "0 1px 4px rgba(0,0,0,0.07)", minWidth: 220, maxWidth: 280 }}>
                              {msg.replyTo && <QuoteBar reply={msg.replyTo} mine={mine} />}
                              <div
                                onClick={() => { if (msg.file.url) window.open(msg.file.url, "_blank"); }}
                                style={{ display: "flex", alignItems: "center", gap: 12, cursor: msg.file.url ? "pointer" : "default" }}>
                                <div style={{ width: 40, height: 40, borderRadius: 10, background: mine ? "rgba(255,255,255,0.2)" : fi.c + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{fi.i}</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: mine ? "white" : Z.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: msg.file.url ? 'underline' : 'none' }}>{msg.file.name}</div>
                                  <div style={{ fontSize: 11, color: mine ? "rgba(255,255,255,0.7)" : Z.sub, marginTop: 2 }}>{fSize(msg.file.size)}</div>
                                </div>
                              </div>
                            </div>
                          )}

                          {msg.text && (
                            <div style={{
                              padding: "9px 13px",
                              borderRadius: mine
                                ? (msg.first && msg.last ? "18px 18px 4px 18px" : msg.first ? "18px 18px 4px 18px" : msg.last ? "18px 4px 4px 18px" : "18px 4px 4px 18px")
                                : (msg.first && msg.last ? "18px 18px 18px 4px" : msg.first ? "18px 18px 18px 4px" : msg.last ? "4px 18px 18px 4px" : "4px 18px 18px 4px"),
                              background: mine ? Z.blue : Z.msgOther,
                              color: mine ? "white" : Z.text,
                              fontSize: 13.5, lineHeight: 1.58, wordBreak: "break-word",
                              boxShadow: mine ? `0 2px 8px rgba(37,99,235,0.3)` : "0 1px 4px rgba(0,0,0,0.07)",
                            }}>
                              {msg.replyTo && <QuoteBar reply={msg.replyTo} mine={mine} />}
                              {msg.text}
                            </div>
                          )}
                        </>
                      )}

                      {msg.last && (
                        <div style={{ fontSize: 10.5, color: Z.sub, marginTop: 3, display: "flex", alignItems: "center", gap: 3 }}>
                          {time}{mine && <span style={{ color: "#60a5fa", fontSize: 12 }}>✓✓</span>}
                        </div>
                      )}
                    </div>

                    {/* Hover actions — always to the right of bubble */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, opacity: hov ? 1 : 0, transition: "opacity 0.15s", flexShrink: 0, alignSelf: "flex-end", paddingBottom: msg.last ? 20 : 2 }}>
                      {/* Reply button */}
                      <button onClick={() => { setReplyTo({ senderId: senderId, text: msg.text || null, image: msg.images?.[0] || null, fileName: msg.file?.name || null }); setContextMenu(null); }} title="Trả lời"
                        style={{ width: 26, height: 26, borderRadius: "50%", border: "none", background: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.12)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={Z.blue} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" /></svg>
                      </button>
                      {/* More (⋯) button */}
                      <button
                        title="Thêm"
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          setContextMenu({ msgId: msg._id, x: rect.left, y: rect.bottom + 6, msg });
                        }}
                        style={{ width: 26, height: 26, borderRadius: "50%", border: "none", background: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.12)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={Z.sub} strokeWidth={2.5} strokeLinecap="round"><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (() => {
        const cmMsg = contextMenu.msg;
        const cmSenderId = typeof cmMsg.senderId === "object" ? (cmMsg.senderId._id || cmMsg.senderId.id) : cmMsg.senderId;
        const cmMine = cmSenderId === myId;
        // Adjust position to stay in viewport
        const menuW = 180;
        const menuH = cmMine && onRecall && !cmMsg.recalled ? 120 : 88;
        const vw = typeof window !== "undefined" ? window.innerWidth : 800;
        const vh = typeof window !== "undefined" ? window.innerHeight : 600;
        let left = contextMenu.x;
        let top = contextMenu.y;
        if (left + menuW > vw - 8) left = vw - menuW - 8;
        if (top + menuH > vh - 8) top = contextMenu.y - menuH - 36;
        return (
          <div
            className="fade-in"
            onClick={e => e.stopPropagation()}
            style={{
              position: "fixed", left, top, zIndex: 2000,
              background: "white", borderRadius: 12,
              boxShadow: "0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.1)",
              overflow: "hidden", minWidth: menuW,
              border: `1px solid ${Z.border}`,
            }}
          >
            {/* Reply */}
            <button
              onClick={() => {
                setReplyTo({ senderId: cmSenderId, text: cmMsg.text || null, image: cmMsg.images?.[0] || null, fileName: cmMsg.file?.name || null });
                setContextMenu(null);
              }}
              style={{ width: "100%", padding: "10px 16px", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 500, color: Z.text, fontFamily: "'Be Vietnam Pro',sans-serif", textAlign: "left" }}
              onMouseEnter={e => e.currentTarget.style.background = Z.blueLight}
              onMouseLeave={e => e.currentTarget.style.background = "none"}
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={Z.blue} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" /></svg>
              Trả lời
            </button>
            {/* Copy text */}
            {cmMsg.text && !cmMsg.recalled && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(cmMsg.text).catch(() => { });
                  setContextMenu(null);
                }}
                style={{ width: "100%", padding: "10px 16px", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 500, color: Z.text, fontFamily: "'Be Vietnam Pro',sans-serif", textAlign: "left" }}
                onMouseEnter={e => e.currentTarget.style.background = Z.blueLight}
                onMouseLeave={e => e.currentTarget.style.background = "none"}
              >
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={Z.sub} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                Sao chép văn bản
              </button>
            )}
            {/* Recall (mine only) */}
            {cmMine && !cmMsg.recalled && onRecall && (
              <>
                <div style={{ height: 1, background: Z.border, margin: "0 12px" }} />
                <button
                  onClick={() => {
                    setContextMenu(null);
                    if (confirm("Thu hồi tin nhắn này?")) onRecall(cmMsg._id, conv._id);
                  }}
                  style={{ width: "100%", padding: "10px 16px", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 500, color: "#ef4444", fontFamily: "'Be Vietnam Pro',sans-serif", textAlign: "left" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#fee2e2"}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}
                >
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-3.51" /></svg>
                  Thu hồi tin nhắn
                </button>
              </>
            )}
          </div>
        );
      })()}

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
      <div style={{
        padding: "10px 14px",
        background: Z.surface,
        borderTop: `1px solid ${Z.border}`,
        paddingBottom: isMobile 
          ? (isKeyboardOpen ? 10 : `calc(10px + env(safe-area-inset-bottom) + 58px)`) 
          : 10,
      }}>
        {replyTo && (
          <div className="fade-in" style={{
            display: "flex", alignItems: "center", gap: 10,
            background: Z.blueLight, borderRadius: 10,
            padding: "8px 12px", marginBottom: 8, borderLeft: `3px solid ${Z.blue}`,
          }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={Z.blue} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="9 17 4 12 9 7" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" /></svg>
            {/* Image preview in reply bar */}
            {replyTo.image && (
              <img src={replyTo.image} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
            )}
            {/* File icon in reply bar */}
            {replyTo.fileName && !replyTo.image && (
              <div style={{ width: 36, height: 36, borderRadius: 8, background: fIcon(replyTo.fileName).c + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{fIcon(replyTo.fileName).i}</div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: Z.blue, marginBottom: 2 }}>Đang trả lời</div>
              {replyTo.image && !replyTo.text && <div style={{ fontSize: 12, color: Z.sub }}>Hình ảnh</div>}
              {replyTo.fileName && !replyTo.text && <div style={{ fontSize: 12, color: Z.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{replyTo.fileName}</div>}
              {replyTo.text && <div style={{ fontSize: 12, color: Z.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{replyTo.text}</div>}
            </div>
            <button onClick={() => setReplyTo(null)} style={{
              width: 22, height: 22, borderRadius: "50%", border: "none",
              background: "rgba(37,99,235,0.12)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, color: Z.blue, fontSize: 14, fontWeight: 700,
            }}>×</button>
          </div>
        )}

        <div style={{
          display: "flex", alignItems: "flex-end", gap: 8,
          background: Z.leftPanel, borderRadius: 20,
          padding: "8px 10px 8px 14px", minHeight: 46,
          border: `1.5px solid ${Z.border}`, transition: "border-color 0.2s",
        }}
          onFocusCapture={e => e.currentTarget.style.borderColor = Z.blue}
          onBlurCapture={e => e.currentTarget.style.borderColor = Z.border}
        >
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{ display: "none" }} />
          <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} style={{
            background: "none", border: "none", cursor: isUploading ? "wait" : "pointer", padding: 2,
            display: "flex", alignItems: "center", flexShrink: 0, marginBottom: 2,
            color: Z.sub, transition: "color 0.15s", opacity: isUploading ? 0.5 : 1
          }}>
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
          </button>
          <button onClick={() => setShowEmoji(s => !s)} style={{
            background: "none", border: "none", cursor: "pointer", padding: 2,
            display: "flex", alignItems: "center", flexShrink: 0, marginBottom: 2,
            color: showEmoji ? Z.blue : Z.sub, transition: "color 0.15s",
          }}>
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M8 13s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" /></svg>
          </button>
          <div ref={edRef} contentEditable suppressContentEditableWarning
            className="msg-input"
            onInput={() => { const el = edRef.current; setHasText(!!(el?.textContent?.trim() || el?.querySelector("img"))); }}
            onPaste={handlePaste}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } if (e.key === "Escape") setReplyTo(null); }}
            data-placeholder="Nhập tin nhắn..."
            style={{
              flex: 1, outline: "none", fontSize: 13.5, color: Z.text,
              fontFamily: "'Be Vietnam Pro',sans-serif", lineHeight: 1.55,
              minHeight: 24, maxHeight: 120, overflowY: "auto",
              wordBreak: "break-word", whiteSpace: "pre-wrap",
            }}
          />
          <button onClick={() => send()} style={{
            width: 36, height: 36, borderRadius: "50%", border: "none", cursor: "pointer",
            background: (hasText || replyTo) ? Z.blue : "#e2e8f0",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background 0.18s, transform 0.12s", flexShrink: 0,
            boxShadow: (hasText || replyTo) ? "0 2px 8px rgba(37,99,235,0.35)" : "none",
          }}
            onMouseDown={e => { if (hasText || replyTo) e.currentTarget.style.transform = "scale(0.92)"; }}
            onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none"
              stroke={(hasText || replyTo) ? "white" : Z.sub}
              strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: "rotate(45deg)", transition: "stroke 0.15s" }}
            ><path d="M22 2 11 13" /><path d="M22 2 15 22 11 13 2 9z" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// Right Panel
export function RightPanel({ conv, me, chatUsers = [], isMobile, isTablet, onClose, onAddMember, onUpdateGroup, onUpdateMemberRole, onRemoveMember }) {
  const [showAddMember, setShowAddMember] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState("");

  // Group Edit State
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const groupAvatarInputRef = useRef();

  if (!conv) return null;
  const myId = me._id || me.id;
  const isGroup = conv.type === "group";
  const otherUser = !isGroup ? conv.participants?.find(p => (p._id || p.id) !== myId) : null;
  const isAdmin = isGroup && ((conv.admins || []).includes(myId) || (typeof conv.createdBy === "string" ? conv.createdBy : conv.createdBy?._id) === myId);

  const containerStyle = (isMobile || isTablet) ? {
    position: "fixed", top: 0, right: 0, bottom: 0, width: isMobile ? "100%" : 320,
    background: Z.surface, zIndex: 1000, display: "flex", flexDirection: "column",
    boxShadow: "-8px 0 24px rgba(0,0,0,0.1)", animation: "slideRight 0.25s ease"
  } : {
    width: 270, background: Z.surface, borderLeft: `1px solid ${Z.border}`, display: "flex", flexDirection: "column", flexShrink: 0
  };

  const handleAddMember = async () => {
    if (!selectedIds.length || !onAddMember) return;
    setIsAdding(true);
    setAddError("");
    try {
      await onAddMember(conv._id, selectedIds);
      setShowAddMember(false);
      setSelectedIds([]);
    } catch (err) {
      console.error("Add member error:", err);
      setAddError(err.message || "Lỗi khi thêm thành viên. Vui lòng thử lại.");
    } finally {
      setIsAdding(false);
    }
  };

  const toggleMember = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleRenameGroup = async () => {
    if (!editNameValue.trim() || editNameValue === conv.name) {
      setIsEditingName(false);
      return;
    }
    setIsUpdating(true);
    try {
      await onUpdateGroup?.(conv._id, { name: editNameValue.trim() });
    } catch (e) {
      console.error(e);
      alert("Lỗi đổi tên nhóm");
    } finally {
      setIsUpdating(false);
      setIsEditingName(false);
    }
  };

  const handleGroupAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setIsUpdating(true);
    try {
      const res = await api.uploadChatFile(file);
      if (res.data?.url) {
        await onUpdateGroup?.(conv._id, { avatar: res.data.url });
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi đổi ảnh nhóm");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRoleChange = async (targetId, currentIsAdmin, isCreator) => {
    if (isCreator) return alert("Không thể thay đổi quyền của người tạo nhóm");
    if (!confirm(`Bạn muốn ${currentIsAdmin ? 'giáng cấp' : 'thăng cấp'} thành viên này?`)) return;
    try {
      await onUpdateMemberRole?.(conv._id, targetId, currentIsAdmin ? "demote" : "promote");
    } catch (e) {
      console.error(e);
      alert("Lỗi phân quyền");
    }
  };

  const handleKick = async (targetId, isCreator) => {
    if (isCreator && targetId !== myId) return alert("Không thể xoá người tạo nhóm");
    if (!confirm(targetId === myId ? "Bạn có chắc muốn rời nhóm?" : "Bạn có chắc muốn xoá người này?")) return;
    try {
      await onRemoveMember?.(conv._id, targetId);
    } catch (e) {
      console.error(e);
      alert("Lỗi xoá thành viên");
    }
  };

  const groupParticipantIds = conv.participants?.map(p => p._id || p.id) || [];
  const availableUsers = chatUsers.filter(u => !groupParticipantIds.includes(u._id || u.id));
  const filteredUsers = availableUsers.filter(u => displayName(u).toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      {(isMobile || isTablet) && <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 999 }} />}
      {showAddMember && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1001, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={() => { if (!isAdding) { setShowAddMember(false); setSelectedIds([]); setAddError(""); } }} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)", backdropFilter: "blur(2px)" }} />
          <div className="fade-in" style={{ position: "relative", background: Z.surface, borderRadius: 16, width: "90%", maxWidth: 400, display: "flex", flexDirection: "column", maxHeight: "80vh", boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${Z.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: Z.text }}>Thêm thành viên</span>
              <button disabled={isAdding} onClick={() => { setShowAddMember(false); setSelectedIds([]); setAddError(""); }} style={{ background: "none", border: "none", cursor: isAdding ? "not-allowed" : "pointer", color: Z.sub, fontSize: 24, lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: "12px 16px" }}>
              <input disabled={isAdding} value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm kiếm..." style={{ width: "100%", background: Z.leftPanel, border: `1.5px solid ${Z.border}`, borderRadius: 10, padding: "8px 12px", fontSize: 13, outline: "none", color: Z.text, fontFamily: "'Be Vietnam Pro',sans-serif" }} />
              {addError && <div style={{ color: "#ef4444", fontSize: 12, marginTop: 8, fontWeight: 500 }}>{addError}</div>}
            </div>
            <div style={{ flex: 1, overflow: "auto", padding: "0 16px 16px" }}>
              {filteredUsers.length === 0 ? (
                <div style={{ textAlign: "center", padding: "20px 0", color: Z.sub, fontSize: 13 }}>Không tìm thấy liên hệ nào.</div>
              ) : (
                filteredUsers.map(u => (
                  <div key={u._id || u.id} onClick={() => toggleMember(u._id || u.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", cursor: "pointer" }}>
                    <Av user={u} size={36} dot />
                    <div style={{ flex: 1 }}><div style={{ fontSize: 13.5, fontWeight: 600 }}>{displayName(u)}</div></div>
                    <input type="checkbox" checked={selectedIds.includes(u._id || u.id)} readOnly style={{ width: 18, height: 18, accentColor: Z.blue, cursor: "pointer" }} />
                  </div>
                ))
              )}
            </div>
            <div style={{ padding: "12px 16px", borderTop: `1px solid ${Z.border}`, display: "flex", gap: 8, justifyContent: "flex-end", background: Z.leftPanel, borderRadius: "0 0 16px 16px" }}>
              <button disabled={isAdding} onClick={() => { setShowAddMember(false); setSelectedIds([]); setAddError(""); }} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${Z.border}`, background: "white", color: Z.text, fontSize: 13, fontWeight: 600, cursor: isAdding ? "not-allowed" : "pointer", opacity: isAdding ? 0.6 : 1 }}>Huỷ</button>
              <button onClick={handleAddMember} disabled={!selectedIds.length || isAdding} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: Z.blue, color: "white", fontSize: 13, fontWeight: 600, cursor: (!selectedIds.length || isAdding) ? "not-allowed" : "pointer", opacity: (!selectedIds.length || isAdding) ? 0.6 : 1, display: "flex", alignItems: "center", gap: 8 }}>
                {isAdding && <svg className="sk-shimmer" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" style={{ animation: "spin 1s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>}
                {isAdding ? "Đang thêm..." : `Thêm ${selectedIds.length ? `(${selectedIds.length})` : ""}`}
              </button>
            </div>
          </div>
        </div>
      )}
      <div style={containerStyle}>
        {(isMobile || isTablet) && (
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${Z.border}`, display: "flex", alignItems: "center" }}>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: Z.sub, display: "flex", padding: "4px" }}>
              <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <div style={{ flex: 1, textAlign: "center", fontSize: 16, fontWeight: 700, color: Z.text, marginRight: 32 }}>Thông tin</div>
          </div>
        )}
        <div style={{ padding: "20px 16px", borderBottom: `1px solid ${Z.border}`, textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            {isGroup
              ? (
                <div style={{ position: "relative", cursor: isAdmin ? (isUpdating ? "wait" : "pointer") : "default" }} onClick={() => { if (isAdmin) groupAvatarInputRef.current?.click() }}>
                  <Av isGroup gAvatar={conv.avatar} groupColor={conv.color} size={64} />
                  {isAdmin && (
                    <div style={{ position: "absolute", bottom: -4, right: -4, width: 22, height: 22, borderRadius: "50%", background: Z.surface, display: "flex", alignItems: "center", justifyContent: "center", padding: 2 }}>
                      <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: Z.blue, color: "white", display: "flex", alignItems: "center", justifyItems: "center", fontSize: 10 }}>📷</div>
                    </div>
                  )}
                  <input type="file" ref={groupAvatarInputRef} onChange={handleGroupAvatarChange} accept="image/*" style={{ display: "none" }} />
                </div>
              )
              : <Av user={otherUser} size={64} dot />
            }
          </div>

          {isEditingName ? (
            <div style={{ marginTop: 10, display: "flex", gap: 8, justifyContent: "center" }}>
              <input
                autoFocus
                value={editNameValue}
                onChange={e => setEditNameValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleRenameGroup()}
                style={{ background: Z.leftPanel, border: `1px solid ${Z.border}`, padding: "4px 8px", borderRadius: 4, color: Z.text, fontSize: 13, width: 150 }}
              />
              <button disabled={isUpdating} onClick={handleRenameGroup} style={{ background: Z.blue, color: "white", border: "none", borderRadius: 4, padding: "0 8px", cursor: isUpdating ? "wait" : "pointer" }}>Lưu</button>
              <button onClick={() => setIsEditingName(false)} style={{ background: "transparent", color: Z.sub, border: "none", cursor: "pointer" }}>Huỷ</button>
            </div>
          ) : (
            <div style={{ fontSize: 15, fontWeight: 700, color: Z.text, marginTop: 10, display: "flex", justifyContent: "center", alignItems: "center", gap: 6 }}>
              {isGroup ? conv.name : displayName(otherUser)}
              {isAdmin && (
                <button onClick={() => { setEditNameValue(conv.name); setIsEditingName(true); }} style={{ background: "none", border: "none", color: Z.sub, cursor: "pointer", padding: 2 }}>
                  ✎
                </button>
              )}
            </div>
          )}

          <div style={{ fontSize: 12, color: Z.sub, marginTop: 3 }}>{isGroup ? `${conv.participants?.length} thành viên` : otherUser?.role || ""}</div>
        </div>
        {isGroup && (
          <div style={{ padding: "14px 16px", flex: 1, overflow: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: Z.sub, textTransform: "uppercase", letterSpacing: "0.08em" }}>Thành viên</div>
              {isAdmin && (
                <button onClick={() => setShowAddMember(true)} style={{ background: "none", border: "none", color: Z.blue, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
                  + Thêm
                </button>
              )}
            </div>
            {conv.participants?.map(m => {
              const mId = m._id || m.id;
              const isMemAdmin = (conv.admins || []).includes(mId);
              const isMemCreator = (typeof conv.createdBy === "string" ? conv.createdBy : conv.createdBy?._id) === mId;
              const isMe = mId === myId;

              return (
                <div key={mId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: `1px solid ${Z.border}` }}>
                  <Av user={m} size={32} dot />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: Z.text, display: "flex", alignItems: "center", gap: 4 }}>
                      {isMe ? "Bạn" : displayName(m)}
                      {isMemCreator && <span style={{ fontSize: 9, background: "#f59e0b", color: "white", padding: "1px 4px", borderRadius: 4 }}>Người Tạo</span>}
                      {isMemAdmin && !isMemCreator && <span style={{ fontSize: 9, background: Z.blue, color: "white", padding: "1px 4px", borderRadius: 4 }}>Quản Trị</span>}
                    </div>
                    <div style={{ fontSize: 11, color: Z.sub }}>{m.role}</div>
                  </div>

                  {/* Admin Controls */}
                  {(isAdmin || isMe) && (
                    <div style={{ display: "flex", gap: 4 }}>
                      {isAdmin && !isMemCreator && !isMe && (
                        <button onClick={() => handleRoleChange(mId, isMemAdmin, isMemCreator)}
                          title={isMemAdmin ? "Giáng quyền" : "Thăng quyền"}
                          style={{ background: Z.leftPanel, border: `1px solid ${Z.border}`, borderRadius: 4, width: 24, height: 24, cursor: "pointer", fontSize: 12 }}>
                          {isMemAdmin ? "↓" : "↑"}
                        </button>
                      )}
                      {(!isMemCreator || isMe) && (
                        <button onClick={() => handleKick(mId, isMemCreator)}
                          title={isMe ? "Rời nhóm" : "Xoá khỏi nhóm"}
                          style={{ background: "#fee2e2", border: `1px solid #fca5a5`, color: "#ef4444", borderRadius: 4, width: 24, height: 24, cursor: "pointer", fontSize: 12 }}>
                          {isMe ? "🚪" : "×"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  );
}

// Contacts View — create new conversations
export function ContactsView({ chatUsers, me, onStartChat, onNavigate, isMobile }) {
  const [activeTab, setActiveTab] = useState<"users" | "groups">("users");
  const [joinedGroups, setJoinedGroups] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [showGroup, setShowGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    if (activeTab === "groups") {
      api.getJoinedGroups().then(res => res.data && setJoinedGroups(res.data)).catch(console.error);
    }
  }, [activeTab]);

  const filteredUsers = chatUsers.filter(u => {
    const name = displayName(u);
    return name.toLowerCase().includes(search.toLowerCase());
  });
  
  const filteredGroups = joinedGroups.filter(g => {
    const name = g.name || "Nhóm";
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
        onStartChat(res.data);   // sets activeId first
        onNavigate?.();          // then switch to chat tab
      }
    } catch (err) {
      console.error("Create direct error:", err);
    }
  };

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      <div style={{ width: isMobile ? "100%" : 320, background: Z.sidebar, borderRight: `1px solid ${Z.border}`, display: "flex", flexDirection: "column", paddingBottom: isMobile ? 60 : 0 }}>
        <div style={{ padding: "14px 16px 0", borderBottom: `1px solid ${Z.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 17, fontWeight: 700, color: Z.text }}>Danh Bạ</span>
            <button onClick={() => setShowGroup(s => !s)} style={{ padding: "6px 14px", borderRadius: 20, border: "none", background: Z.blue, color: "white", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>+ Tạo Nhóm</button>
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
             <button onClick={() => setActiveTab("users")} style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer", background: activeTab === "users" ? Z.blueLight : "transparent", color: activeTab === "users" ? Z.blue : Z.sub }}>Bạn bè</button>
             <button onClick={() => setActiveTab("groups")} style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer", background: activeTab === "groups" ? Z.blueLight : "transparent", color: activeTab === "groups" ? Z.blue : Z.sub }}>Tất cả Nhóm</button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: Z.leftPanel, borderRadius: 20, padding: "7px 14px", marginBottom: 14 }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth={2.5} strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm kiếm..." style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 13, color: Z.text }} />
          </div>
        </div>
        <div style={{ flex: 1, overflow: "auto" }}>
          {activeTab === "users" && filteredUsers.map(user => (
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

          {activeTab === "groups" && filteredGroups.map(group => {
             const gAvatar = group.avatar || group.name?.substring(0, 2).toUpperCase() || "GR";
             const gColor = group.color || Z.blue;
             return (
               <div key={group._id} 
                 onClick={() => {
                   onStartChat(group); 
                   onNavigate?.(); 
                 }}
                 style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", cursor: "pointer", transition: "background 0.12s" }}
                 onMouseEnter={e => e.currentTarget.style.background = Z.leftPanel}
                 onMouseLeave={e => e.currentTarget.style.background = "transparent"}
               >
                 <Av isGroup gAvatar={gAvatar} groupColor={gColor} size={42} />
                 <div style={{ flex: 1 }}>
                   <div style={{ fontSize: 13.5, fontWeight: 700, color: Z.text }}>{group.name || "Nhóm"}</div>
                   <div style={{ fontSize: 12, color: Z.sub }}>{group.participants?.length || 0} thành viên</div>
                 </div>
               </div>
             )
          })}

          {activeTab === "groups" && filteredGroups.length === 0 && (
            <div style={{ padding: "30px 20px", textAlign: "center", color: Z.sub, fontSize: 13 }}>
              Chưa tham gia nhóm nào.
            </div>
          )}
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

// Profile View
export function ProfileView({ me, isMobile, onUpdate }) {
  const [firstName, setFirstName] = useState(me?.firstName || "");
  const [lastName, setLastName] = useState(me?.lastName || "");
  const [isUpdating, setIsUpdating] = useState(false);
  const fileInputRef = useRef();

  const handleSave = async () => {
    setIsUpdating(true);
    try {
      const res = await api.updateProfile({ firstName, lastName });
      if (res.data) onUpdate(res.data);
      alert("Cập nhật thành công!");
    } catch (e) {
      console.error(e);
      alert("Lỗi cập nhật: " + e.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setIsUpdating(true);
    try {
      const res = await api.uploadUserAvatar(file);
      if (res.data) onUpdate(res.data);
    } catch (err) {
      console.error(err);
      alert("Lỗi tải ảnh: " + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: Z.bg, overflowY: "auto", padding: isMobile ? 20 : 40, alignItems: "center" }}>
      <div style={{ width: "100%", maxWidth: 500, background: Z.surface, borderRadius: 16, padding: isMobile ? 20 : 32, boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: Z.text, marginBottom: 24, textAlign: "center" }}>Tài Khoản Của Tôi</h2>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 32 }}>
          <div style={{ position: "relative" }}>
            <Av user={me} size={100} />
            <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" style={{ display: "none" }} />
            <button
              disabled={isUpdating}
              onClick={() => fileInputRef.current?.click()}
              style={{ position: "absolute", bottom: 0, right: 0, width: 32, height: 32, borderRadius: "50%", border: `2px solid ${Z.surface}`, background: Z.blue, color: "white", cursor: isUpdating ? "wait" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 4 }}
            >
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
            </button>
          </div>
          <div style={{ fontSize: 13, color: Z.sub, marginTop: 12 }}>{me?.email}</div>
          <div style={{ fontSize: 13, color: Z.sub, marginTop: 4 }}>Vai trò: {me?.role}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: Z.textMd, marginBottom: 8 }}>Họ</label>
            <input value={firstName} onChange={e => setFirstName(e.target.value)} style={{ width: "100%", background: Z.leftPanel, border: `1.5px solid ${Z.border}`, padding: "10px 14px", borderRadius: 10, fontSize: 14, outline: "none", color: Z.text }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: Z.textMd, marginBottom: 8 }}>Tên</label>
            <input value={lastName} onChange={e => setLastName(e.target.value)} style={{ width: "100%", background: Z.leftPanel, border: `1.5px solid ${Z.border}`, padding: "10px 14px", borderRadius: 10, fontSize: 14, outline: "none", color: Z.text }} />
          </div>

          <button
            onClick={handleSave}
            disabled={isUpdating}
            style={{ marginTop: 12, width: "100%", padding: "12px", background: Z.blue, color: "white", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: isUpdating ? "wait" : "pointer", transition: "opacity 0.2s", opacity: isUpdating ? 0.7 : 1 }}>
            {isUpdating ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </div>
    </div>
  );
}
