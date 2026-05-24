import "./globals.css";
import { AuthProvider } from "@/lib/auth";

export const viewport = {
  themeColor: "#FF7F00",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata = {
  title: "ble | AI Tactical Emergency Network",
  description: "State-of-the-art AI-powered tactical emergency coordination platform.",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
