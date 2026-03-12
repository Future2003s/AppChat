// API client for chat backend

const API_BASE = "http://localhost:8081/api/v1";

function getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("chat_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = getToken();
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>)
    };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
        credentials: "include"
    });

    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.message || `API Error: ${res.status}`);
    }
    return data;
}

// ─── Auth ───────────────────────────────────────────────────────────────────

export async function login(email: string, password: string) {
    const data = await request<any>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
    });
    // Store token
    if (data.data?.token) {
        localStorage.setItem("chat_token", data.data.token);
    }
    if (data.data?.refreshToken) {
        localStorage.setItem("chat_refresh_token", data.data.refreshToken);
    }
    return data;
}

export async function getMe() {
    return request<any>("/auth/me");
}

export function logout() {
    localStorage.removeItem("chat_token");
    localStorage.removeItem("chat_refresh_token");
    localStorage.removeItem("chat_user");
}

// ─── Chat ───────────────────────────────────────────────────────────────────

export async function getConversations() {
    return request<any>("/chat/conversations");
}

export async function getMessages(conversationId: string, page = 1, limit = 50) {
    return request<any>(`/chat/conversations/${conversationId}/messages?page=${page}&limit=${limit}`);
}

export async function sendMessage(conversationId: string, body: {
    text?: string;
    images?: string[];
    file?: { name: string; size: number; url?: string };
    replyTo?: any;
}) {
    return request<any>(`/chat/conversations/${conversationId}/messages`, {
        method: "POST",
        body: JSON.stringify(body)
    });
}

export async function createGroup(name: string, memberIds: string[], avatar?: string, color?: string) {
    return request<any>("/chat/conversations/group", {
        method: "POST",
        body: JSON.stringify({ name, memberIds, avatar, color })
    });
}

export async function createDirect(targetUserId: string) {
    return request<any>("/chat/conversations/direct", {
        method: "POST",
        body: JSON.stringify({ targetUserId })
    });
}

export async function deleteConversation(conversationId: string) {
    return request<any>(`/chat/conversations/${conversationId}`, {
        method: "DELETE"
    });
}

export async function markAsRead(conversationId: string) {
    return request<any>(`/chat/conversations/${conversationId}/read`, {
        method: "PUT"
    });
}

export async function getChatUsers() {
    return request<any>("/chat/users");
}
