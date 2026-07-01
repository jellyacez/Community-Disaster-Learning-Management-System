export default function UserTableSkeleton() {
  return (
    <tr className="border-b border-gray-50">
      {/* Mimic the 6 columns in the actual table precisely to prevent layout shift */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-100 rounded-full animate-pulse flex-shrink-0" />
          <div className="space-y-2">
            <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
            <div className="h-3 w-48 bg-gray-50 rounded animate-pulse" />
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
      </td>
      <td className="px-4 py-3">
        <div className="h-5 w-24 bg-gray-100 rounded-full animate-pulse" />
      </td>
      <td className="px-4 py-3">
        <div className="h-5 w-16 bg-gray-100 rounded-full animate-pulse" />
      </td>
      <td className="px-4 py-3">
        <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
      </td>
      <td className="px-4 py-3 text-right">
        <div className="h-8 w-20 bg-gray-100 rounded-lg animate-pulse ml-auto" />
      </td>
    </tr>
  );
}
