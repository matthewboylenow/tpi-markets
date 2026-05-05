import Link from "next/link";
import { spURL } from "@/lib/utils";

export function Nav() {
  return (
    <nav className="border-b border-tpi-ink/10 bg-tpi-cream/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <img
            src="https://taylorproducts.net/wp-content/uploads/2022/04/Artboard-2@2x-300x83.png"
            alt="Taylor Products"
            className="h-12 w-auto"
          />
        </Link>
        <div className="flex items-center gap-6 text-sm">
          <a
            href="https://taylorproducts.net"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:inline text-tpi-stone hover:text-tpi-ink underline-grow"
          >
            Main Site
          </a>
          <a
            href="https://finder.taylorproducts.net"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:inline text-tpi-stone hover:text-tpi-ink underline-grow"
          >
            Model Finder
          </a>
          <a
            href={spURL("nav-cta")}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-tpi-ink text-white text-sm font-medium rounded-md hover:bg-tpi-blue transition-colors"
          >
            Talk to a Salesperson
          </a>
        </div>
      </div>
    </nav>
  );
}
