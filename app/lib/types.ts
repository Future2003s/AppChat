// Chat system TypeScript types

export interface IUser {
    _id: string;
    id?: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
    role: string;
    isActive?: boolean;
    fullName?: string;
}

export interface IConversation {
    _id: string;
    type: "direct" | "group";
    name?: string;
    avatar?: string;
    color?: string;
    participants: IUser[];
    admins?: string[];
    lastMessage?: {
        senderId: IUser | string;
        text?: string;
        time: string;
    };
    createdBy: string;
    unreadCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface IMessage {
    _id: string;
    conversationId: string;
    senderId: IUser | string;
    text?: string;
    images?: string[];
    file?: {
        name: string;
        size: number;
        url?: string;
    };
    replyTo?: {
        messageId: string;
        senderId: string;
        text?: string;
        image?: string;
        fileName?: string;
    };
    readBy: string[];
    recalled?: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface IAuthResponse {
    success: boolean;
    data: {
        user: IUser;
        token: string;
        refreshToken?: string;
    };
}
