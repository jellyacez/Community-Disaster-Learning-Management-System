
export function SkeletonBlock({ className = "" }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded-md ${className}`}></div>
  );
}

export function SkeletonText({ className = "h-4 w-3/4" }) {
  return <SkeletonBlock className={`${className} rounded-full`} />;
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-4 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gray-200"></div>
        <div className="flex flex-col gap-2 flex-1">
          <div className="h-5 bg-gray-200 rounded-full w-2/3"></div>
          <div className="h-4 bg-gray-200 rounded-full w-1/2"></div>
        </div>
      </div>
      <div className="h-4 bg-gray-200 rounded-full w-full mt-2"></div>
      <div className="h-4 bg-gray-200 rounded-full w-5/6"></div>
      <div className="flex justify-between items-center mt-4">
        <div className="h-8 bg-gray-200 rounded-full w-24"></div>
        <div className="h-4 bg-gray-200 rounded-full w-16"></div>
      </div>
    </div>
  );
}

export function SkeletonTableRow({ columns = 5, hasAvatar = false, padding = "px-6 py-4" }) {
  return (
    <tr className="animate-pulse border-b border-gray-100 last:border-0">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className={`${padding} whitespace-nowrap`}>
          {i === 0 && hasAvatar ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0"></div>
              <div className="flex flex-col gap-1.5 flex-1">
                <div className="h-4 bg-gray-200 rounded-full w-28"></div>
                <div className="h-3 bg-gray-100 rounded-full w-36"></div>
              </div>
            </div>
          ) : (
            <div
              className={`h-4 bg-gray-200 rounded-full ${
                i === 0 ? "w-32" : i === columns - 1 ? "w-20 ml-auto" : "w-24"
              }`}
            ></div>
          )}
        </td>
      ))}
    </tr>
  );
}

export function SkeletonFeedItem() {
  return (
    <div className="flex gap-3 animate-pulse">
      <div className="w-8 h-8 rounded-full bg-gray-100 shrink-0" />
      <div className="flex-1 space-y-2 py-1">
        <div className="h-3.5 bg-gray-100 rounded w-3/4" />
        <div className="h-2.5 bg-gray-50 rounded w-1/4" />
      </div>
    </div>
  );
}

export function FeedbackTicketSkeleton() {
  return (
    <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm animate-pulse flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0" />
          <div className="space-y-1.5">
            <div className="h-4 w-32 bg-gray-200 rounded-full" />
            <div className="h-3 w-20 bg-gray-100 rounded-full" />
          </div>
        </div>
        <div className="h-6 w-20 bg-gray-200 rounded-full" />
      </div>
      <div className="space-y-2 my-1">
        <div className="h-4 w-3/4 bg-gray-200 rounded-full" />
        <div className="h-3.5 w-full bg-gray-100 rounded-full" />
        <div className="h-3.5 w-5/6 bg-gray-100 rounded-full" />
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className="h-3 w-24 bg-gray-100 rounded-full" />
        <div className="h-8 w-24 bg-gray-200 rounded-xl" />
      </div>
    </div>
  );
}

export function SkeletonModuleCard() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm animate-pulse flex flex-col justify-between h-[280px]">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="h-5 w-20 bg-gray-200 rounded-full" />
          <div className="h-4 w-16 bg-gray-100 rounded-full" />
        </div>
        <div className="h-6 w-3/4 bg-gray-200 rounded-lg mb-2" />
        <div className="h-4 w-full bg-gray-100 rounded-full mb-1.5" />
        <div className="h-4 w-5/6 bg-gray-100 rounded-full mb-3" />
      </div>
      <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
        <div className="h-4 w-20 bg-gray-100 rounded-full" />
        <div className="h-9 w-28 bg-gray-200 rounded-xl" />
      </div>
    </div>
  );
}

export function SkeletonLeaderboardRow() {
  return (
    <div className="p-2.5 rounded-xl bg-gray-50/50 border border-gray-100 animate-pulse space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-gray-200" />
          <div className="h-4 w-28 bg-gray-200 rounded-full" />
        </div>
        <div className="h-4 w-16 bg-gray-200 rounded-full" />
      </div>
      <div className="h-2 w-full bg-gray-200 rounded-full" />
    </div>
  );
}

export function SkeletonChart({ type = "donut", height = 220 }) {
  if (type === "donut" || type === "pie") {
    return (
      <div className="flex flex-col items-center justify-center animate-pulse" style={{ height }}>
        <div className="w-36 h-36 rounded-full border-[18px] border-gray-200 border-t-gray-300 flex items-center justify-center">
          <div className="w-12 h-4 bg-gray-200 rounded-full" />
        </div>
        <div className="flex items-center gap-4 mt-4">
          <div className="h-3 w-16 bg-gray-200 rounded-full" />
          <div className="h-3 w-16 bg-gray-200 rounded-full" />
          <div className="h-3 w-16 bg-gray-200 rounded-full" />
        </div>
      </div>
    );
  }

  // Area / Bar chart skeleton wireframe
  return (
    <div className="flex flex-col justify-end p-4 animate-pulse gap-2" style={{ height }}>
      <div className="flex items-end justify-between gap-3 h-full pb-4 border-b border-gray-200">
        {[40, 65, 30, 80, 55, 90, 45].map((h, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
            <div className="w-full bg-gray-200 rounded-t-md" style={{ height: `${h}%` }} />
            <div className="h-2.5 w-6 bg-gray-200 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
