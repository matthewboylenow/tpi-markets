export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-tpi-cream flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}
