import useDocumentTitle from "../../../../hooks/useDocumentTitle";
import IPBlocklistPanel from "../settings/components/IPBlocklistPanel";

export default function SystemSecurity() {
  useDocumentTitle("Security | Admin Console");

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Security</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage platform perimeters and firewall configurations.
        </p>
      </div>

      <IPBlocklistPanel />
    </div>
  );
}
