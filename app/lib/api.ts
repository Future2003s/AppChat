// API client for chat backend

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8081/api/v1";

function getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("chat_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = getToken();
    const headers: Record<string, string> = {
        ...(options.headers as Record<string, string>)
    };
    // Only set JSON content type if it's not a FormData payload (e.g. for uploads)
    if (!(options.body instanceof FormData)) {
        headers["Content-Type"] = headers["Content-Type"] || "application/json";
    }
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
        credentials: "include"
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        if (res.status === 401) {
            logout();
            if (typeof window !== "undefined") {
                window.location.href = "/login";
            }
        }
        const errorMessage = data.error || data.message || `API Error: ${res.status}`;
        throw new Error(errorMessage);
    }
    return data;
}

// ─── Auth ───────────────────────────────────────────────────────────────────

async function uploadRequest<T>(path: string, formData: FormData, onProgress?: (percent: number) => void): Promise<T> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const token = getToken();

        xhr.open("POST", `${API_BASE}${path}`);

        if (token) {
            xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        }

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable && onProgress) {
                const percent = Math.round((event.loaded / event.total) * 100);
                onProgress(percent);
            }
        };

        xhr.onload = () => {
            let data;
            try {
                data = JSON.parse(xhr.responseText);
            } catch (e) {
                data = {};
            }

            if (xhr.status >= 200 && xhr.status < 300) {
                resolve(data);
            } else {
                if (xhr.status === 401) {
                    logout();
                    if (typeof window !== "undefined") {
                        window.location.href = "/login";
                    }
                }
                const errorMessage = data.error || data.message || `API Error: ${xhr.status}`;
                reject(new Error(errorMessage));
            }
        };

        xhr.onerror = () => {
            reject(new Error("Network Error"));
        };

        xhr.send(formData);
    });
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

export async function updateProfile(data: { firstName: string, lastName: string, phone?: string }) {
    return request<any>("/users/profile", {
        method: "PUT",
        body: JSON.stringify(data)
    });
}

export async function uploadUserAvatar(file: File, onProgress?: (percent: number) => void) {
    const formData = new FormData();
    formData.append("avatar", file);
    return uploadRequest<any>("/users/avatar", formData, onProgress);
}

// ─── Chat ───────────────────────────────────────────────────────────────────

export async function getConversations() {
    return request<any>("/chat/conversations");
}

export async function getJoinedGroups() {
    return request<any>("/chat/groups");
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

export async function recallMessage(messageId: string) {
    return request<any>(`/chat/messages/${messageId}/recall`, {
        method: "DELETE"
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

export async function addGroupMember(conversationId: string, memberIds: string[]) {
    return request<any>(`/chat/conversations/${conversationId}/members`, {
        method: "POST",
        body: JSON.stringify({ memberIds })
    });
}

export async function updateGroup(conversationId: string, data: { name?: string; avatar?: string; color?: string }) {
    return request<any>(`/chat/conversations/${conversationId}/group`, {
        method: "PUT",
        body: JSON.stringify(data)
    });
}

export async function updateMemberRole(conversationId: string, memberId: string, action: "promote" | "demote") {
    return request<any>(`/chat/conversations/${conversationId}/members/${memberId}/role`, {
        method: "PUT",
        body: JSON.stringify({ action })
    });
}

export async function removeGroupMember(conversationId: string, memberId: string) {
    return request<any>(`/chat/conversations/${conversationId}/members/${memberId}`, {
        method: "DELETE"
    });
}

export async function uploadChatFile(file: File, onProgress?: (percent: number) => void) {
    const formData = new FormData();
    formData.append("file", file);
    return uploadRequest<any>("/chat/upload", formData, onProgress);
}
