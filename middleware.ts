import { type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Только маршруты приложения — не трогаем _next, api, статику (иначе 404 на chunks)
  matcher: ["/", "/login", "/login/:path*", "/chat", "/chat/:path*", "/chats", "/chats/:path*", "/profile", "/profile/:path*", "/auth/:path*"],
};
