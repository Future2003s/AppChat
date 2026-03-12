// @ts-nocheck
"use client";
import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import * as api from "../lib/api";
import { useIsMobile, useIsTablet } from "../hooks/useResponsive";
import { useChat } from "../hooks/useChat";

// ── All UI components are imported from the UI barrel ──────────────────────
// We re-import the visual components defined in the legacy page module
// by importing the named exports (components are co-located there for now).
import {
  CSS, Z,
  IconNav, ConvList, ChatWindow, RightPanel, ContactsView, ProfileView
} from "../ui";

// ── Skeleton loading screen ────────────────────────────────────────────────
function LoadingSkeleton() {
  const rows = [1, 2, 3, 4];
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", fontFamily: "'Be Vietnam Pro',sans-serif" }}>
      <style>{CSS}</style>
      {/* Nav skeleton */}
      <div style={{ width: 72, background: Z.navBg, display: "flex", flexDirection: "column", alignItems: "center", padding: "14px 0", gap: 16 }}>
        <div className="sk" style={{ width: 42, height: 42, borderRadius: 14 }} />
        {[1,2].map(i => <div key={i} className="sk" style={{ width: 44, height: 44, borderRadius: 14 }} />)}
      </div>
      {/* Conv list skeleton */}
      <div style={{ width: 300, background: Z.sidebar, borderRight: `1px solid ${Z.border}`, padding: "16px 14px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="sk" style={{ height: 28, borderRadius: 8, width: "60%" }} />
        <div className="sk" style={{ height: 36, borderRadius: 20 }} />
        {rows.map(i => (
          <div key={i} style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div className="sk" style={{ width: 46, height: 46, borderRadius: "50%", flexShrink: 0 }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              <div className="sk" style={{ height: 13, borderRadius: 6, width: "70%" }} />
              <div className="sk" style={{ height: 11, borderRadius: 6, width: "50%" }} />
            </div>
          </div>
        ))}
      </div>
      {/* Chat area skeleton */}
      <div style={{ flex: 1, background: Z.bg, display: "flex", flexDirection: "column", padding: 24, gap: 14 }}>
        {[1,2,3].map(i => (
          <div key={i} style={{ display: "flex", justifyContent: i % 2 === 0 ? "flex-end" : "flex-start" }}>
            <div className="sk" style={{ height: 40, borderRadius: 18, width: `${20 + i * 15}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main app shell ─────────────────────────────────────────────────────────
export default function ChatApp() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tab, setTab] = useState("chat");
  const [mobilePanel, setMobilePanel] = useState("list");
  const [, startTransition] = useTransition();

  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  // ── Auth check ────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("chat_token");
    if (!token) { router.replace("/login"); return; }

    // Optimistically use cached user first
    const stored = localStorage.getItem("chat_user");
    if (stored) { try { setMe(JSON.parse(stored)); } catch {} }

    api.getMe()
      .then(res => {
        if (res.data) {
          setMe(res.data);
          localStorage.setItem("chat_user", JSON.stringify(res.data));
        }
      })
      .catch(() => router.replace("/login"))
      .finally(() => setAuthLoading(false));
  }, [router]);

  // ── Service Worker ────────────────────────────────────────────────────────
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(console.error);
    }
  }, []);

  // ── Responsive panel resets ───────────────────────────────────────────────
  useEffect(() => { if (isMobile) setMobilePanel("list"); }, [tab, isMobile]);

  // ── Chat data + socket (all in one hook) ──────────────────────────────────
  const {
    convs, msgs, activeId, setActiveId, isLoadingMsgs,
    chatUsers, handleSend, handleDelete, handleStartChat, 
    handleAddMemberGroup, handleUpdateGroup, handleUpdateMemberRole, handleRemoveMember,
    handleRecall
  } = useChat(me);

  // Switch to chat panel on mobile when conversation selected
  useEffect(() => { if (isMobile && activeId) setMobilePanel("chat"); }, [activeId, isMobile]);

  if (authLoading && !me) return <LoadingSkeleton />;
  if (!me) return null;

  const activeConv = convs.find(c => c._id === activeId) ?? null;

  return (
    <>
      <style>{CSS}</style>

      <div style={{ display: "flex", height: "100dvh", minHeight: "-webkit-fill-available", overflow: "hidden", fontFamily: "'Be Vietnam Pro',sans-serif" }}>
        {/* Desktop sidebar */}
        <div className="hide-on-mobile" style={{ height: "100%" }}>
          <IconNav tab={tab} setTab={t => startTransition(() => setTab(t))} me={me} isMobile={false} />
        </div>

        {/* Mobile bottom nav */}
        {isMobile && (
          <IconNav
            tab={tab}
            setTab={t => startTransition(() => setTab(t))}
            me={me} isMobile={true}
            hideOnMobile={mobilePanel === "chat" || mobilePanel === "info"}
          />
        )}

        {tab === "chat" && <>
          {/* Conversation list */}
          <div
            className={(isMobile && (mobilePanel === "chat" || mobilePanel === "info")) ? "hide-on-mobile" : ""}
            style={{ display: "flex", width: isMobile ? "100%" : "auto", height: "100%", flexShrink: 0 }}
          >
            <ConvList
              convs={convs} activeId={activeId}
              setActiveId={id => { setActiveId(id); if (isMobile) setMobilePanel("chat"); }}
              me={me} onDelete={handleDelete} isMobile={isMobile}
            />
          </div>

          {/* Chat window */}
          <div
            className={isMobile && mobilePanel === "list" ? "hide-on-mobile" : (isMobile && mobilePanel === "chat" ? "slide-left" : "")}
            style={{ display: "flex", flex: 1, minWidth: 0, height: "100%" }}
          >
            <ChatWindow
              conv={activeConv} msgs={msgs[activeId] || []} me={me} isLoadingMsgs={isLoadingMsgs}
              onSend={handleSend} onRecall={handleRecall} isMobile={isMobile} isTablet={isTablet}
              mobilePanel={mobilePanel} setMobilePanel={setMobilePanel}
            />
          </div>

          {/* Right panel */}
          {!isMobile && !isTablet && <RightPanel conv={activeConv} me={me} chatUsers={chatUsers} isMobile={false} isTablet={false} onAddMember={handleAddMemberGroup} onUpdateGroup={handleUpdateGroup} onUpdateMemberRole={handleUpdateMemberRole} onRemoveMember={handleRemoveMember} />}
          {(isMobile || isTablet) && mobilePanel === "info" && (
            <RightPanel conv={activeConv} me={me} chatUsers={chatUsers} isMobile={isMobile} isTablet={isTablet} onClose={() => setMobilePanel("chat")} onAddMember={handleAddMemberGroup} onUpdateGroup={handleUpdateGroup} onUpdateMemberRole={handleUpdateMemberRole} onRemoveMember={handleRemoveMember} />
          )}
        </>}

        {tab === "contacts" && (
          <ContactsView
            chatUsers={chatUsers} me={me} isMobile={isMobile}
            onNavigate={() => setTab("chat")}
            onStartChat={handleStartChat}
          />
        )}
        
        {tab === "account" && (
          <ProfileView me={me} isMobile={isMobile} onUpdate={(newMe) => {
            setMe(newMe);
            localStorage.setItem("chat_user", JSON.stringify(newMe));
          }} />
        )}
      </div>
    </>
  );
}
