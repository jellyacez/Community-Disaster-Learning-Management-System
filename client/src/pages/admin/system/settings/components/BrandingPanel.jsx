import { useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../../../../../lib/apiClient";
import toast from "react-hot-toast";
import { HugeiconsIcon } from "@hugeicons/react";
import { Settings01Icon } from "@hugeicons/core-free-icons";

export default function BrandingPanel({ settingsData }) {
  const queryClient = useQueryClient();

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <HugeiconsIcon icon={Settings01Icon} className="w-5 h-5 text-gray-500" />
        <h2 className="text-base font-bold text-gray-900">System Branding</h2>
      </div>
      <p className="text-xs text-gray-500 mb-6 max-w-lg">Customize the platform's white-label identity. Upload a logo and set the display name.</p>
      
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          const system_name = formData.get("system_name");
          const file = formData.get("system_logo");
          
          let system_logo = undefined;
          
          if (file && file.size > 0) {
            // Convert to Base64 using FileReader
            system_logo = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
          }

          try {
            toast.loading("Updating branding...", { id: "branding" });
            await apiClient.patch("/admin/settings/branding", { system_name, system_logo });
            toast.success("Branding updated successfully", { id: "branding" });
            queryClient.invalidateQueries({ queryKey: ["systemSettings"] });
          } catch {
            toast.error("Failed to update branding", { id: "branding" });
          }
        }}
        className="space-y-4"
      >
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="system_name" className="block text-xs font-semibold text-gray-700 mb-1">System Name</label>
            <input 
              id="system_name"
              type="text" 
              name="system_name" 
              defaultValue={settingsData?.system_name || "Community Disaster Learning Management System"} 
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
            />
          </div>
          <div>
            <label htmlFor="system_logo" className="block text-xs font-semibold text-gray-700 mb-1">Platform Logo</label>
            <input 
              id="system_logo"
              type="file" 
              name="system_logo" 
              accept="image/*"
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
            />
          </div>
        </div>
        {settingsData?.system_logo && (
           <div className="mt-2">
              <p className="text-xs text-gray-500 mb-2">Current Logo:</p>
              <img src={settingsData.system_logo} alt="System Logo" className="h-12 object-contain rounded border border-gray-100 p-1 bg-gray-50" />
           </div>
        )}
        <div className="pt-2">
           <button type="submit" className="px-4 py-2 bg-gray-900 text-white text-sm font-bold rounded-lg hover:bg-black transition-colors">
             Save Branding
           </button>
        </div>
      </form>
    </div>
  );
}
