import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";
import { AuthError } from "next-auth";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const { callbackUrl, error } = await searchParams;
  const session = await auth();
  if (session) redirect(callbackUrl ?? "/admin");

  async function authenticate(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const cbUrl = String(formData.get("callbackUrl") ?? "/admin");

    try {
      await signIn("credentials", {
        email,
        password,
        redirectTo: cbUrl,
      });
    } catch (e) {
      if (e instanceof AuthError) {
        redirect(`/login?error=CredentialsSignin&callbackUrl=${encodeURIComponent(cbUrl)}`);
      }
      throw e;
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-tpi-ink/10 p-8 shadow-sm">
      <div className="mb-8">
        <img
          src="https://taylorproducts.net/wp-content/uploads/2022/04/Artboard-2@2x-300x83.png"
          alt="Taylor Products"
          className="h-10 w-auto mb-6"
        />
        <h1 className="text-3xl font-bold tracking-tight text-tpi-ink">
          Sign in
        </h1>
        <p className="text-sm text-tpi-stone mt-1">
          Access the equipment finder admin.
        </p>
      </div>

      {error && (
        <div className="mb-5 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Invalid email or password.
        </div>
      )}

      <form action={authenticate} className="space-y-4">
        <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/admin"} />
        <div>
          <label htmlFor="email" className="block text-xs font-medium uppercase tracking-wider text-tpi-stone mb-1.5">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full rounded-lg border border-tpi-ink/15 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:border-tpi-blue focus:ring-2 focus:ring-tpi-blue/20"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-xs font-medium uppercase tracking-wider text-tpi-stone mb-1.5">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="w-full rounded-lg border border-tpi-ink/15 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:border-tpi-blue focus:ring-2 focus:ring-tpi-blue/20"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-tpi-orange text-white font-medium rounded-lg px-4 py-2.5 hover:bg-tpi-orange-dark transition-colors"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
