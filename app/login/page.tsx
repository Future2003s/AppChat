// @ts-nocheck
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { login } from "../lib/api";
import "./login.css";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPw, setShowPw] = useState(false);
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
            router.push("/");
        } catch (err: any) {
            setError(err.message || "Đăng nhập thất bại. Vui lòng kiểm tra lại.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-root">
            {/* Decorative orbs */}
            <div className="orb orb-1" />
            <div className="orb orb-2" />
            <div className="orb orb-3" />
            {/* Grid dots */}
            <div className="grid-dots" />

            <div className="login-card">
                {/* Logo */}
                <div className="logo-wrap">
                    <div className="logo-inner">Z</div>
                </div>

                {/* Title */}
                <div className="login-title">
                    <h1>Chat Nội Bộ</h1>
                    <p>Đăng nhập để bắt đầu trò chuyện</p>
                </div>

                <form onSubmit={handleLogin}>
                    {error && (
                        <div className="error-box">
                            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                            {error}
                        </div>
                    )}

                    {/* Email */}
                    <div className="input-group">
                        <label>Email</label>
                        <div className="input-wrap">
                            <input
                                className="input-field"
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="name@company.com"
                                required
                                autoFocus
                                autoComplete="username"
                            />
                            <span className="input-icon">
                                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                            </span>
                        </div>
                    </div>

                    {/* Password */}
                    <div className="input-group" style={{ marginBottom: 24 }}>
                        <label>Mật khẩu</label>
                        <div className="input-wrap">
                            <input
                                className="input-field"
                                type={showPw ? "text" : "password"}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                className="input-icon"
                                onClick={() => setShowPw(v => !v)}
                                tabIndex={-1}
                                aria-label={showPw ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                            >
                                {showPw ? (
                                    <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                                ) : (
                                    <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                )}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`btn-login${loading ? " loading" : ""}`}
                    >
                        {loading ? (
                            <div className="dot-loader">
                                <span /><span /><span />
                            </div>
                        ) : "Đăng nhập"}
                    </button>
                </form>

                <div className="login-footer">
                    Hệ thống Chat Nội Bộ Công Ty
                </div>
            </div>
        </div>
    );
}
