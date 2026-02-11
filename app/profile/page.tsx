"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";
import type { User } from "@supabase/supabase-js";

export default function ProfilePage() {
    const router = useRouter();
    const supabaseRef = useRef(createClient());
    const supabase = supabaseRef.current;
    const [user, setUser] = useState<User | null>(null);
    const [signingOut, setSigningOut] = useState(false);

    useEffect(() => {
        void supabase.auth.getUser().then(({ data: { user: u } }) => setUser(u));
    }, [supabase]);

    const handleSignOut = async () => {
        setSigningOut(true);
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
    };

    const displayName =
        (user?.user_metadata?.full_name as string) ??
        user?.email?.split("@")[0] ??
        "User";
    const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;

    return (
        <div className="min-h-screen bg-zinc-950 text-white">
            <div className="max-w-md mx-auto px-4 pt-12 pb-8">
                <h1 className="text-2xl font-bold mb-8">Profile</h1>

                <div className="flex flex-col items-center text-center mb-10">
                    <Avatar className="w-20 h-20 mb-4 ring-2 ring-cyan-500/40">
                        <AvatarImage src={avatarUrl} />
                        <AvatarFallback className="bg-zinc-800 text-zinc-300 text-2xl">
                            {displayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <p className="text-lg font-semibold">{displayName}</p>
                    {user?.email && (
                        <p className="text-sm text-zinc-500 mt-0.5">{user.email}</p>
                    )}
                </div>

                <div className="space-y-3">
                    <Button
                        variant="destructive"
                        className="w-full h-12 text-base font-medium"
                        onClick={handleSignOut}
                        disabled={signingOut}
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        {signingOut ? "Signing out…" : "Sign Out"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
