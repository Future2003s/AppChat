// @ts-nocheck
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "../lib/api";

const Z = {
    blue: "#0068ff", blueLight: "#e8f0fe",
    text: "#081c36", sub: "#7a8694", border: "#e8eaed",
};

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: any) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await login(email, password);
            if (res.data?.user) {
                localStorage.setItem("chat_user", JSON.stringify(res.data.user));
            }
            // Redirect to chat
            router.push("/");
        } catch (err: any) {
            setError(err.message || "Đăng nhập thất bại");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap');
                *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
                body { font-family: 'Be Vietnam Pro', sans-serif; background: linear-gradient(135deg, #0068ff 0%, #0048b3 50%, #003380 100%); min-height: 100vh; }
                .login-card { padding: 40px 28px; }
                @media (max-width: 480px) {
                    .login-card { padding: 28px 20px !important; }
                }
            `}</style>
            <div style={{
                minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "'Be Vietnam Pro',sans-serif", padding: 20,
            }}>
                <div className="login-card" style={{
                    background: "white", borderRadius: 24,
                    width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
                }}>
                    {/* Logo */}
                    <div style={{ textAlign: "center", marginBottom: 32 }}>
                        <div style={{
                            width: 64, height: 64, borderRadius: 18,
                            background: `linear-gradient(135deg, ${Z.blue}, #0048b3)`,
                            display: "inline-flex", alignItems: "center", justifyContent: "center",
                            fontSize: 28, fontWeight: 900, color: "white", marginBottom: 16,
                            boxShadow: "0 8px 24px rgba(0,104,255,0.35)",
                        }}>Z</div>
                        <h1 style={{ fontSize: 22, fontWeight: 800, color: Z.text, marginBottom: 6 }}>
                            Chat Nội Bộ
                        </h1>
                        <p style={{ fontSize: 13.5, color: Z.sub }}>
                            Đăng nhập để bắt đầu trò chuyện
                        </p>
                    </div>

                    <form onSubmit={handleLogin}>
                        {error && (
                            <div style={{
                                background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12,
                                padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#dc2626",
                                display: "flex", alignItems: "center", gap: 8,
                            }}>
                                <span style={{ fontSize: 16 }}>⚠️</span> {error}
                            </div>
                        )}

                        <div style={{ marginBottom: 16 }}>
                            <label style={{ fontSize: 12, fontWeight: 600, color: Z.sub, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                Email
                            </label>
                            <input
                                type="email" value={email} onChange={e => setEmail(e.target.value)}
                                placeholder="name@company.com" required autoFocus
                                style={{
                                    width: "100%", padding: "12px 16px", borderRadius: 12,
                                    border: `1.5px solid ${Z.border}`, fontSize: 14, color: Z.text,
                                    outline: "none", fontFamily: "'Be Vietnam Pro',sans-serif",
                                    background: "#f8f9fa", transition: "border-color 0.2s, background 0.2s",
                                }}
                                onFocus={e => { e.target.style.borderColor = Z.blue; e.target.style.background = "white"; }}
                                onBlur={e => { e.target.style.borderColor = Z.border; e.target.style.background = "#f8f9fa"; }}
                            />
                        </div>

                        <div style={{ marginBottom: 24 }}>
                            <label style={{ fontSize: 12, fontWeight: 600, color: Z.sub, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                Mật khẩu
                            </label>
                            <input
                                type="password" value={password} onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••" required
                                style={{
                                    width: "100%", padding: "12px 16px", borderRadius: 12,
                                    border: `1.5px solid ${Z.border}`, fontSize: 14, color: Z.text,
                                    outline: "none", fontFamily: "'Be Vietnam Pro',sans-serif",
                                    background: "#f8f9fa", transition: "border-color 0.2s, background 0.2s",
                                }}
                                onFocus={e => { e.target.style.borderColor = Z.blue; e.target.style.background = "white"; }}
                                onBlur={e => { e.target.style.borderColor = Z.border; e.target.style.background = "#f8f9fa"; }}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: "100%", padding: "13px 0", borderRadius: 14, border: "none",
                                background: loading ? "#93c5fd" : `linear-gradient(135deg, ${Z.blue}, #0048b3)`,
                                color: "white", fontSize: 15, fontWeight: 700, cursor: loading ? "default" : "pointer",
                                fontFamily: "'Be Vietnam Pro',sans-serif",
                                boxShadow: "0 4px 16px rgba(0,104,255,0.35)",
                                transition: "transform 0.1s, box-shadow 0.2s",
                            }}
                            onMouseDown={e => { if (!loading) e.currentTarget.style.transform = "scale(0.98)"; }}
                            onMouseUp={e => { e.currentTarget.style.transform = "scale(1)"; }}
                        >
                            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
                        </button>
                    </form>

                    <div style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: Z.sub }}>
                        Hệ thống Chat Nội Bộ Công Ty
                    </div>
                </div>
            </div>
        </>
    );
}
