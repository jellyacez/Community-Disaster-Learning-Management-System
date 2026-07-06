
export default function DashboardEmergencyContacts() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold">
          ☎
        </div>
        <h2 className="text-xl font-bold text-gray-900">
          Emergency Contacts
        </h2>
      </div>
      <div className="space-y-3">
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl hover:bg-red-50 transition cursor-pointer group">
          <span className="font-semibold text-sm text-gray-700 group-hover:text-red-700">MDRRMO</span>
          <span className="text-sm font-bold text-red-600">(045) 123-4567</span>
        </div>
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl hover:bg-red-50 transition cursor-pointer group">
          <span className="font-semibold text-sm text-gray-700 group-hover:text-red-700">Police</span>
          <span className="text-sm font-bold text-red-600">117 / 911</span>
        </div>
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl hover:bg-red-50 transition cursor-pointer group">
          <span className="font-semibold text-sm text-gray-700 group-hover:text-red-700">Fire Department</span>
          <span className="text-sm font-bold text-red-600">(045) 890-1234</span>
        </div>
      </div>
    </div>
  );
}
