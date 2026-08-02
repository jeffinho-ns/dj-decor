import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { me } from "@/lib/api";
import { TOKEN_COOKIE } from "@/lib/auth";
import { HOME_COOKIE, resolveHomePath } from "@/lib/prefs";

export default async function HomePage() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(TOKEN_COOKIE)?.value;

  if (!raw) {
    redirect("/login");
  }

  const token = decodeURIComponent(raw);
  const homeCookie = cookieStore.get(HOME_COOKIE)?.value ?? null;

  try {
    const { user } = await me(token);
    redirect(resolveHomePath(user.role, homeCookie));
  } catch {
    redirect("/login");
  }
}
