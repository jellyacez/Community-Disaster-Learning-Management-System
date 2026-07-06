
export default function AccountDetails({ currentUser }) {
  return (
    <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-gray-900">Account Details</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Full Name
          </p>
          <p className="mt-1 text-base font-semibold text-gray-900">
            {currentUser.name}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Email
          </p>
          <p className="mt-1 text-base font-semibold text-gray-900">
            {currentUser.email}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Barangay
          </p>
          <p className="mt-1 text-base font-semibold text-gray-900">
            {currentUser.barangay}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Role
          </p>
          <p className="mt-1 text-base font-semibold text-gray-900 capitalize">
            {currentUser.role}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Emergency Contact
          </p>
          <p className="mt-1 text-sm font-semibold text-red-600">
            Not Configured
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Member Since
          </p>
          <p className="mt-1 text-base font-semibold text-gray-900">
            {new Date(currentUser.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>
    </div>
  );
}
