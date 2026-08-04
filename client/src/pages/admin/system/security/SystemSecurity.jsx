import useDocumentTitle from "../../../../hooks/useDocumentTitle";
import IPBlocklistPanel from "../settings/components/IPBlocklistPanel";
import GlobalSessionControlPanel from "./components/GlobalSessionControlPanel";

export default function SystemSecurity() {
  useDocumentTitle("Security | Admin Console");

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-150 px-6 md:px-12 pt-2 md:pt-2 pb-12 space-y-6">
      <div className="mb-8">
        <nav className="flex text-sm text-gray-500 mb-2" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-2">
            <li className="inline-flex items-center">Admin Portal</li>
            <li>
              <div className="flex items-center">
                <span className="mx-2 text-gray-400">&gt;</span>
                <span className="text-gray-900 font-semibold">Security</span>
              </div>
            </li>
          </ol>
        </nav>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Security</h1>
        <p className="text-sm font-medium text-gray-500 mt-1">
          Manage platform perimeters and firewall configurations
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
