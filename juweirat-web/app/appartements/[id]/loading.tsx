export default function RoomLoading() {
  return (
    <div className="pt-20 bg-[#FAFAFA] min-h-screen">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">

        {/* Back link */}
        <div className="pt-8 pb-5">
          <div className="h-3 w-28 bg-charcoal/8 rounded animate-pulse" />
        </div>

        {/* Header — full width */}
        <div className="mb-6 space-y-3">
          <div className="h-9 w-2/3 bg-charcoal/10 rounded animate-pulse" />
          <div className="h-2.5 w-16 bg-charcoal/6 rounded animate-pulse" />
          <div className="flex gap-5 mt-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-4 w-20 bg-charcoal/6 rounded animate-pulse" />
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10 pb-24">

          {/* Left */}
          <div>
            <div className="mb-8 space-y-2">
              <div className="aspect-[4/3] bg-charcoal/8 animate-pulse" />
              <div className="flex gap-1.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="w-[88px] h-[58px] shrink-0 bg-charcoal/6 animate-pulse" />
                ))}
              </div>
            </div>
            <div className="mb-8 space-y-2">
              <div className="h-2.5 w-24 bg-charcoal/8 rounded animate-pulse" />
              <div className="h-4 w-full bg-charcoal/6 rounded animate-pulse" />
              <div className="h-4 w-5/6 bg-charcoal/6 rounded animate-pulse" />
              <div className="h-4 w-4/5 bg-charcoal/6 rounded animate-pulse" />
            </div>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-8 w-24 bg-charcoal/6 rounded animate-pulse" />
              ))}
            </div>
          </div>

          {/* Right */}
          <div className="mt-8 lg:mt-0 space-y-3">
            <div className="h-16 bg-surface border border-charcoal/5 animate-pulse" />
            <div className="h-64 bg-surface border border-charcoal/5 animate-pulse" />
            <div className="h-10 bg-surface border border-charcoal/5 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  )
}
