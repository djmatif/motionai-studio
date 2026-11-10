import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MotionAI Studio",
  description: "Create cinematic AI videos from text and images."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
