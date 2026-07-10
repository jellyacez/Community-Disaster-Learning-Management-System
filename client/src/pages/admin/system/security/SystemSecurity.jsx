import useDocumentTitle from "../../../../hooks/useDocumentTitle";
import IPBlocklistPanel from "../settings/components/IPBlocklistPanel";
import GlobalSessionControlPanel from "./components/GlobalSessionControlPanel";

export default function SystemSecurity() {
  useDocumentTitle("Security | Admin Console");

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Security</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage platform perimeters and firewall configurations.
        </p>
      </div>

      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-3 mt-8">
          Access Control
        </h2>
        <IPBlocklistPanel />
      </div>

      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-3 mt-8">
          Emergency Response
        </h2>
        <GlobalSessionControlPanel />
      </div>
    </div>
  );
}
