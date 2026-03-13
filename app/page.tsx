import ChatApp from "./components/ChatApp";

export const metadata = {
  title: "ChatLocal - Tin nhắn nội bộ",
  description: "Nhắn tin nội bộ",
  themeColor: "#ffffff",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ChatLocal",
  },
  manifest: "/manifest.json",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#ffffff",
};

export default function Page() {
  return <ChatApp />;
}