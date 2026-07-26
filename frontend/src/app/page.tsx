import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { me } from "@/lib/api";
import { TOKEN_COOKIE } from "@/lib/auth";

export default async function HomePage() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(TOKEN_COOKIE)?.value;

  if (!raw) {
    redirect("/login");
  }

  const token = decodeURIComponent(raw);
  let destination = "/dashboard";

  try {
    const { user } = await me(token);
    destination = user.role === "MONTADOR" ? "/montagem" : "/dashboard";
  } catch {
    redirect("/login");
  }

  redirect(destination);
}
