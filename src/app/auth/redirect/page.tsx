import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

// Server-side role-based redirect after sign-in.
// Both credentials and Google OAuth point their callbackUrl here.
export default async function AuthRedirectPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role;

  if (role === "kitchen") redirect("/kitchen");
  if (role === "waiter") redirect("/waiter");
  if (role === "cashier") redirect("/caja");
  redirect("/admin");
}
