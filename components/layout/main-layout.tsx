"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "./bottom-nav";

/** Routes that should NOT display the bottom navigation */
const NO_NAV_ROUTES = ["/login", "/auth"];

export function MainLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const hideNav = NO_NAV_ROUTES.some((route) => pathname.startsWith(route));

    if (hideNav) {
        return <>{children}</>;
    }

    return (
        <>
            <div className="pb-16">{children}</div>
            <BottomNav />
        </>
    );
}
