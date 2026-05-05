import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { Sidebar } from "@/components/admin/Sidebar";

export const metadata = { title: "Admin" };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="min-h-screen flex bg-tpi-cream">
      <Sidebar signOutAction={handleSignOut} />
      <main className="flex-1 min-w-0">
        <div className="px-8 py-6 border-b border-tpi-ink/10 bg-white flex items-center justify-between">
          <div className="text-sm text-tpi-stone">
            Signed in as <span className="text-tpi-ink font-medium">{session.user.email}</span>
          </div>
        </div>
        <div className="px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
