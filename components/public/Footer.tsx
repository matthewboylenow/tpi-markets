export function Footer({ tagline }: { tagline: string }) {
  return (
    <footer className="border-t border-tpi-ink/10 mt-24 bg-tpi-ink text-tpi-cream/70">
      <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="flex items-center gap-3">
          <img
            src="https://taylorproducts.net/wp-content/uploads/2022/04/Artboard-2@2x-300x83.png"
            alt="Taylor Products"
            className="h-6 w-auto brightness-200"
          />
          <div className="text-sm">
            <div className="text-xs">{tagline}</div>
          </div>
        </div>
        <div className="text-xs flex flex-wrap gap-x-6 gap-y-2">
          <a
            href="https://taylorproducts.net"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-tpi-orange"
          >
            taylorproducts.net
          </a>
          <a
            href="https://parts.taylorproducts.net"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-tpi-orange"
          >
            Parts Store
          </a>
          <a
            href="https://finder.taylorproducts.net"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-tpi-orange"
          >
            Model Finder
          </a>
          <a
            href={`${process.env.NEXT_PUBLIC_SALESPERSON_URL ?? "https://taylorproducts.net/meet-your-salesperson/"}?utm_source=equipment-finder&utm_medium=web&utm_campaign=equipment-finder&utm_content=footer-cta`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-tpi-orange"
          >
            Meet Your Salesperson
          </a>
        </div>
      </div>
    </footer>
  );
}
