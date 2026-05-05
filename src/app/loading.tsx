export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto animate-pulse">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-7 w-48 bg-slate-800 rounded-lg mb-2" />
        <div className="h-4 w-72 bg-slate-800/50 rounded" />
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="h-7 w-12 bg-slate-800 rounded mb-2" />
            <div className="h-3 w-20 bg-slate-800/50 rounded" />
          </div>
        ))}
      </div>

      {/* Note skeletons */}
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="h-5 w-3/4 bg-slate-800 rounded mb-2" />
            <div className="h-3 w-full bg-slate-800/50 rounded mb-1" />
            <div className="h-3 w-2/3 bg-slate-800/50 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
