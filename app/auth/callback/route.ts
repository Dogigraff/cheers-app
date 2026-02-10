import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const safeNext = next.startsWith("/") ? next : "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";
      let redirectUrl: string;
      if (isLocalEnv) {
        redirectUrl = `${origin}${safeNext}`;
      } else if (forwardedHost) {
        redirectUrl = `https://${forwardedHost}${safeNext}`;
      } else {
        redirectUrl = `${origin}${safeNext}`;
      }
      const res = NextResponse.redirect(redirectUrl, 307);
      const cookieStore = await cookies();
      cookieStore.getAll().forEach((c) => res.cookies.set(c.name, c.value, { path: "/" }));
      return res;
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_code`, 307);
}
