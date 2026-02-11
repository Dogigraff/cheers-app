"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, MessageSquare, User } from "lucide-react";

const NAV_ITEMS = [
    { href: "/", icon: MapPin, label: "Map" },
    { href: "/chats", icon: MessageSquare, label: "Chats" },
    { href: "/profile", icon: User, label: "Profile" },
] as const;

export function BottomNav() {
    const pathname = usePathname();

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-[1000] h-16 bg-zinc-900/80 backdrop-blur-xl border-t border-cyan-500/20">
            <div className="flex items-center justify-around h-full max-w-md mx-auto px-4">
                {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
                    const isActive =
                        href === "/" ? pathname === "/" : pathname.startsWith(href);

                    return (
                        <Link
                            key={href}
                            href={href}
                            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-all duration-200 ${isActive
                                    ? "text-cyan-400 drop-shadow-[0_0_8px_rgba(0,243,255,0.6)]"
                                    : "text-zinc-500 hover:text-zinc-300"
                                }`}
                        >
                            <Icon className="w-5 h-5" />
                            <span className="text-[10px] font-medium">{label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
