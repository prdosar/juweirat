export default function RoomLoading() {
  return (
    <div className="pt-20 bg-[#FAFAFA] min-h-screen">

      {/* Back link */}
      <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-8 pb-4">
        <div className="h-3 w-28 bg-charcoal/8 rounded animate-pulse" />
      </div>

      {/* Gallery skeleton — main photo + thumbnail strip */}
      <div className="max-w-7xl mx-auto px-6 lg:px-10 pb-10 space-y-2">
        <div className="aspect-[16/9] bg-charcoal/8 animate-pulse" />
        <div className="flex gap-1.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="w-[88px] h-[58px] shrink-0 bg-charcoal/6 animate-pulse" />
          ))}
        </div>
      </div>

      {/* Content skeleton */}
      <div className="max-w-7xl mx-auto px-6 lg:px-10 pb-24">
        <div className="grid lg:grid-cols-3 gap-12">

          {/* Main */}
          <div className="lg:col-span-2 space-y-10">
            <div className="space-y-3">
              <div className="h-10 w-2/3 bg-charcoal/10 rounded animate-pulse" />
              <div className="h-3 w-24 bg-charcoal/6 rounded animate-pulse" />
              <div className="h-3 w-20 bg-charcoal/6 rounded animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-2.5 w-24 bg-charcoal/8 rounded animate-pulse" />
              <div className="h-4 w-full bg-charcoal/6 rounded animate-pulse" />
              <div className="h-4 w-5/6 bg-charcoal/6 rounded animate-pulse" />
              <div className="h-4 w-4/5 bg-charcoal/6 rounded animate-pulse" />
            </div>
            <div className="flex gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-charcoal/8 animate-pulse" />
                  <div className="space-y-1">
                    <div className="h-4 w-8 bg-charcoal/8 rounded animate-pulse" />
                    <div className="h-2.5 w-14 bg-charcoal/5 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-8 w-24 bg-charcoal/6 rounded animate-pulse" />
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="h-16 bg-surface border border-charcoal/5 animate-pulse" />
            <div className="h-64 bg-surface border border-charcoal/5 animate-pulse" />
            <div className="h-10 bg-surface border border-charcoal/5 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  )
}
