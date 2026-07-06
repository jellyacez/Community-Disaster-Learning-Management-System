
export default function AnnouncementSkeleton() {
  return (
    <div className="rounded-2xl bg-gray-50 p-4 animate-pulse">
      <div className="h-3 w-20 bg-gray-200 rounded mb-3"></div>
      <div className="h-4 w-3/4 bg-gray-200 rounded mb-2"></div>
      <div className="h-3 w-full bg-gray-200 rounded"></div>
    </div>
  );
}
