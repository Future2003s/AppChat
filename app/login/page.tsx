// @ts-nocheck
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { login } from "../lib/api";

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
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400&display=swap');
                *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
                html, body { height: 100%; }
                body { font-family: 'Be Vietnam Pro', sans-serif; }

                .login-root {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                    position: relative;
                    overflow: hidden;
                    background: #0a0e2e;
                }

                /* Animated mesh gradient background */
                .login-root::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background:
                        radial-gradient(ellipse 80% 60% at 20% 20%, rgba(37,99,235,0.55) 0%, transparent 60%),
                        radial-gradient(ellipse 60% 50% at 80% 80%, rgba(99,38,235,0.4) 0%, transparent 60%),
                        radial-gradient(ellipse 50% 70% at 60% 10%, rgba(0,180,255,0.3) 0%, transparent 55%),
                        #0a0e2e;
                    animation: meshMove 10s ease-in-out infinite alternate;
                }
                @keyframes meshMove {
                    0%   { background-position: 0% 0%, 100% 100%, 60% 0%;  }
                    100% { background-position: 10% 10%, 90% 90%, 70% 10%; }
                }

                /* Floating orbs */
                .orb {
                    position: absolute;
                    border-radius: 50%;
                    filter: blur(70px);
                    opacity: 0.35;
                    animation: float 12s ease-in-out infinite;
                    pointer-events: none;
                }
                .orb-1 { width: 400px; height: 400px; background: #2563eb; top: -100px; left: -100px; animation-delay: 0s; }
                .orb-2 { width: 300px; height: 300px; background: #7c3aed; bottom: -80px; right: -60px; animation-delay: -4s; }
                .orb-3 { width: 200px; height: 200px; background: #0ea5e9; top: 50%; right: 15%; animation-delay: -7s; }
                @keyframes float {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    33%       { transform: translate(30px, -20px) scale(1.05); }
                    66%       { transform: translate(-20px, 30px) scale(0.95); }
                }

                .login-card {
                    position: relative;
                    z-index: 10;
                    width: 100%;
                    max-width: 420px;
                    background: rgba(255,255,255,0.06);
                    border: 1px solid rgba(255,255,255,0.15);
                    border-radius: 28px;
                    padding: 44px 36px 36px;
                    backdrop-filter: blur(24px);
                    -webkit-backdrop-filter: blur(24px);
                    box-shadow:
                        0 0 0 1px rgba(255,255,255,0.05),
                        0 32px 80px rgba(0,0,0,0.55),
                        inset 0 1px 0 rgba(255,255,255,0.15);
                }
                @media (max-width: 480px) {
                    .login-card {
                        padding: 32px 24px 28px;
                        border-radius: 24px;
                        background: rgba(255,255,255,0.08);
                    }
                }

                /* Logo pulse ring */
                .logo-wrap {
                    position: relative;
                    width: 72px;
                    height: 72px;
                    margin: 0 auto 24px;
                }
                .logo-wrap::before {
                    content: '';
                    position: absolute;
                    inset: -8px;
                    border-radius: 50%;
                    border: 2px solid rgba(37,99,235,0.5);
                    animation: pulseRing 2.4s ease-out infinite;
                }
                @keyframes pulseRing {
                    0%   { transform: scale(0.85); opacity: 0.8; }
                    70%  { transform: scale(1.25); opacity: 0; }
                    100% { transform: scale(1.25); opacity: 0; }
                }
                .logo-inner {
                    width: 72px;
                    height: 72px;
                    border-radius: 50%;
                    background: linear-gradient(145deg, #2563eb, #1d4ed8, #7c3aed);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 30px;
                    font-weight: 900;
                    color: white;
                    letter-spacing: -1px;
                    box-shadow: 0 8px 32px rgba(37,99,235,0.5), inset 0 1px 0 rgba(255,255,255,0.3);
                    position: relative;
                    z-index: 1;
                }

                .login-title {
                    text-align: center;
                    margin-bottom: 32px;
                }
                .login-title h1 {
                    font-size: 24px;
                    font-weight: 800;
                    color: #ffffff;
                    margin-bottom: 6px;
                    letter-spacing: -0.5px;
                }
                .login-title p {
                    font-size: 14px;
                    color: rgba(255,255,255,0.5);
                    font-weight: 400;
                }

                /* Input groups */
                .input-group {
                    margin-bottom: 16px;
                }
                .input-group label {
                    display: block;
                    font-size: 11px;
                    font-weight: 700;
                    color: rgba(255,255,255,0.5);
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    margin-bottom: 8px;
                }
                .input-wrap {
                    position: relative;
                }
                .input-field {
                    width: 100%;
                    padding: 13px 48px 13px 16px;
                    border-radius: 14px;
                    border: 1.5px solid rgba(255,255,255,0.12);
                    background: rgba(255,255,255,0.07);
                    font-size: 14px;
                    color: #ffffff;
                    outline: none;
                    font-family: 'Be Vietnam Pro', sans-serif;
                    transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
                    -webkit-appearance: none;
                }
                .input-field::placeholder {
                    color: rgba(255,255,255,0.25);
                }
                .input-field:focus {
                    border-color: rgba(37,99,235,0.7);
                    background: rgba(255,255,255,0.1);
                    box-shadow: 0 0 0 3px rgba(37,99,235,0.2);
                }
                .input-icon {
                    position: absolute;
                    right: 14px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: rgba(255,255,255,0.35);
                    cursor: pointer;
                    padding: 4px;
                    background: none;
                    border: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 6px;
                    transition: color 0.15s;
                }
                .input-icon:hover { color: rgba(255,255,255,0.7); }
                .input-icon:focus { outline: none; }

                /* Error */
                .error-box {
                    background: rgba(239,68,68,0.15);
                    border: 1px solid rgba(239,68,68,0.3);
                    border-radius: 12px;
                    padding: 10px 14px;
                    margin-bottom: 18px;
                    font-size: 13px;
                    color: #fca5a5;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    animation: shake 0.4s ease;
                }
                @keyframes shake {
                    0%,100%{transform:translateX(0);}
                    25%{transform:translateX(-6px);}
                    75%{transform:translateX(6px);}
                }

                /* Submit Button */
                .btn-login {
                    width: 100%;
                    padding: 14px;
                    border-radius: 14px;
                    border: none;
                    background: linear-gradient(135deg, #2563eb, #1d4ed8);
                    color: white;
                    font-size: 15px;
                    font-weight: 700;
                    font-family: 'Be Vietnam Pro', sans-serif;
                    cursor: pointer;
                    margin-top: 8px;
                    position: relative;
                    overflow: hidden;
                    box-shadow: 0 4px 20px rgba(37,99,235,0.5);
                    transition: transform 0.15s, box-shadow 0.2s;
                }
                .btn-login:not(:disabled):hover {
                    transform: translateY(-1px);
                    box-shadow: 0 8px 28px rgba(37,99,235,0.6);
                }
                .btn-login:not(:disabled):active {
                    transform: scale(0.98) translateY(0);
                }
                .btn-login:disabled {
                    opacity: 0.75;
                    cursor: default;
                }
                /* Shimmer loading effect */
                .btn-login.loading::after {
                    content: '';
                    position: absolute;
                    top: 0; left: -100%;
                    width: 60%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent);
                    animation: shimmer 1.2s infinite;
                }
                @keyframes shimmer {
                    from { left: -60%; }
                    to   { left: 160%; }
                }

                /* Dots loader inside button */
                .dot-loader {
                    display: inline-flex;
                    gap: 4px;
                    align-items: center;
                    height: 18px;
                }
                .dot-loader span {
                    width: 6px; height: 6px;
                    border-radius: 50%;
                    background: white;
                    animation: dotBounce 1.2s ease-in-out infinite;
                }
                .dot-loader span:nth-child(2) { animation-delay: 0.2s; }
                .dot-loader span:nth-child(3) { animation-delay: 0.4s; }
                @keyframes dotBounce {
                    0%,80%,100% { transform: scale(0.7); opacity: 0.5; }
                    40%         { transform: scale(1);   opacity: 1; }
                }

                /* Footer */
                .login-footer {
                    text-align: center;
                    margin-top: 24px;
                    font-size: 12px;
                    color: rgba(255,255,255,0.3);
                }

                /* Grid dots background decoration */
                .grid-dots {
                    position: absolute;
                    inset: 0;
                    z-index: 1;
                    background-image: radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px);
                    background-size: 32px 32px;
                    pointer-events: none;
                }
            `}</style>

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
        </>
    );
}
