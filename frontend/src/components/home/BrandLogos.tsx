export function BrandLogos() {
  const brands = [
    { name: "SONY", style: "tracking-widest font-black text-sm" },
    { name: "Canon", style: "font-serif tracking-wider font-bold text-sm" },
    { name: "DJI", style: "font-sans font-black tracking-widest text-sm" },
    { name: "Apple", style: "font-sans font-semibold tracking-wide text-xs" },
    { name: "RØDE", style: "font-mono font-extrabold tracking-widest text-xs" },
    { name: "Nikon", style: "font-sans font-black italic tracking-wider text-sm" },
    { name: "FUJIFILM", style: "font-sans font-extrabold tracking-wider text-xs" },
    { name: "TILTA", style: "font-mono font-bold tracking-widest text-xs" },
  ];

  return (
    <section className="bg-white dark:bg-[#1E1E1E] py-6 sm:py-8 text-neutral-900 dark:text-white transition-colors duration-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          {/* Left Title */}
          <div className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white shrink-0 tracking-wide">
            Trusted By Creators Across India
          </div>

          {/* Subdued Brand Wordmarks / Logos */}
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 lg:gap-10 opacity-75 hover:opacity-100 transition-opacity">
            {brands.map((b) => (
              <span
                key={b.name}
                className={`text-neutral-500 hover:text-black dark:text-[#A8B1BA] dark:hover:text-white transition-colors select-none ${b.style}`}
              >
                {b.name}
              </span>
            ))}
          </div>

          {/* Right Slogan */}
          <div className="text-[10px] sm:text-xs font-mono font-semibold tracking-widest text-neutral-400 dark:text-[#697681] uppercase text-center lg:text-right shrink-0">
            REAL GEAR. REAL CREATORS. REAL STORIES.
          </div>
        </div>
      </div>
    </section>
  );
}
