import Link from "next/link";

export default function NotFound() {
  return (
    <section className="max-w-3xl mx-auto px-6 py-32 text-center">
      <div className="pill bg-tpi-orange/10 text-tpi-orange-dark mb-6 inline-flex">
        <span className="ticker-dot" /> 404
      </div>
      <h1 className="text-5xl font-bold tracking-tight text-tpi-ink leading-[1.02]">
        Page <span className="font-serif-italic font-normal text-tpi-blue">not found</span>
      </h1>
      <p className="mt-6 text-lg text-tpi-stone">
        That route doesn&apos;t map to anything in our equipment library.
      </p>
      <Link
        href="/"
        className="mt-10 inline-flex items-center gap-2 px-6 py-3 bg-tpi-orange text-white font-medium rounded-lg hover:bg-tpi-orange-dark transition-colors"
      >
        Back to all businesses
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="w-4 h-4"
        >
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </Link>
    </section>
  );
}
