import { useState } from "react";

export default function CategoryConfig() {
  const [categories, setCategories] = useState([
    { id: crypto.randomUUID(), name: "Earthquake Protocols & Drills" }, 
    { id: crypto.randomUUID(), name: "Flash Flood Evacuation Procedures" }, 
    { id: crypto.randomUUID(), name: "Structural Fire Prevention & Safety" }
  ]);
  const [newCategory, setNewCategory] = useState("");

  const handleAddCategory = (e) => {
    e.preventDefault();
    if (!newCategory.trim()) return alert("Please enter a category name.");
    
    // In a real application, you'd trigger a mutation here via react-query to save the new category
    setCategories([...categories, { id: crypto.randomUUID(), name: newCategory.trim() }]);
    setNewCategory("");
    alert("Local category context appended successfully.");
  };

  return (
    <div className="max-w-xl mx-auto bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6 animate-in fade-in duration-150">
      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-800 border-b border-gray-100 pb-2 font-mono">
        Configure Category Content Records
      </h3>
      
      <form onSubmit={handleAddCategory} className="space-y-5">
        <div>
          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">New Category Target Label</label>
          <input 
            type="text" 
            placeholder="e.g., Flash Flood Evacuation Drills" 
            value={newCategory} 
            onChange={(e) => setNewCategory(e.target.value)} 
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-all shadow-sm" 
          />
        </div>
        <button 
          type="submit" 
          className="w-full py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors uppercase tracking-wider font-mono shadow-sm"
        >
          Append Localized Category
        </button>
      </form>

      <div className="border-t border-gray-100 pt-6">
        <p className="text-[11px] text-gray-400 uppercase font-bold tracking-wider mb-4 font-mono">
          Active Target Scopes Pool
        </p>
        <div className="space-y-3">
          {categories.length === 0 ? (
            <p className="text-xs text-gray-400 italic text-center py-4">No categories configured.</p>
          ) : (
            categories.map((cat) => (
              <div key={cat.id} className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 shadow-sm flex items-center justify-between transition-colors hover:border-gray-300">
                <span>{cat.name}</span>
                <span className="text-gray-400">☰</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
