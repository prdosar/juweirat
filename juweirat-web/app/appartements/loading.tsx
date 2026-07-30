export default function AppartementsLoading() {
  return (
    <div className="pt-20">

      {/* Hero skeleton */}
      <section className="relative h-64 md:h-80 bg-charcoal-800 flex items-center px-6">
        <div className="max-w-7xl mx-auto w-full space-y-3">
          <div className="h-3 w-32 bg-white/10 rounded animate-pulse" />
          <div className="h-10 w-72 bg-white/15 rounded animate-pulse" />
          <div className="h-4 w-56 bg-white/8 rounded animate-pulse" />
        </div>
      </section>

      {/* Amenities bar skeleton */}
      <section className="bg-surface py-10 px-6 border-b border-charcoal/5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-8">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className={`h-3 bg-charcoal/8 rounded animate-pulse ${i === 0 ? 'w-24' : 'w-20'}`} />
          ))}
        </div>
      </section>

      {/* Grid + sidebar skeleton */}
      <section className="bg-[#FAFAFA] py-16 px-6">
        <div className="max-w-7xl mx-auto flex gap-8 items-start">

          {/* Cards */}
          <div className="flex-1 min-w-0">
            <div className="h-3 w-32 bg-charcoal/8 rounded animate-pulse mb-6 hidden lg:block" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-charcoal/5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white">
                  <div className="h-52 bg-charcoal/8 animate-pulse" />
                  <div className="p-5 space-y-3 border-t border-charcoal/5">
                    <div className="h-5 w-3/4 bg-charcoal/8 rounded animate-pulse" />
                    <div className="h-3 w-1/3 bg-charcoal/5 rounded animate-pulse" />
                    <div className="h-4 w-1/2 bg-charcoal/8 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Filter sidebar skeleton */}
          <div className="hidden lg:block w-72 shrink-0">
            <div className="bg-surface border border-charcoal/5 p-6 space-y-6">
              <div className="h-3 w-20 bg-charcoal/10 rounded animate-pulse" />
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-2.5 w-24 bg-charcoal/8 rounded animate-pulse" />
                  <div className="h-9 bg-white border border-charcoal/10 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
