import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./theme.css";
import "./access.css";
import { themeBootstrap } from "@/lib/theme";
import { ThemeObserver } from "@/components/layout/theme-switcher";
import { WorkspaceDropEntry } from "@/components/manage/workspace-drop-entry";
import { AccessBoundary } from "@/components/access/access-boundary";
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin", "vietnamese"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin", "vietnamese"] });
export const metadata: Metadata = { title: "Long Châu Design Library", description: "Internal design reference platform for the Long Châu ecosystem." };
export default function RootLayout({ children }: LayoutProps<"/">) { return <html lang="vi" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}><head><script id="library-theme" dangerouslySetInnerHTML={{ __html: themeBootstrap }}/></head><body className="min-h-full"><ThemeObserver/><AccessBoundary><WorkspaceDropEntry>{children}</WorkspaceDropEntry></AccessBoundary></body></html>; }
