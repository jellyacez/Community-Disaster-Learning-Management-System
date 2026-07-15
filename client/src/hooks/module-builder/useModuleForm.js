import { useState } from "react";

export function useModuleForm() {
  const [editingModuleId, setEditingModuleId] = useState(null);
  const [moduleForm, setModuleForm] = useState({ 
    title: "", 
    description: "", 
    level: "Level 1",
    category: "General Safety / Protocols",
    duration: "15 mins",
    image_url: ""
  });

  return {
    editingModuleId, setEditingModuleId,
    moduleForm, setModuleForm
  };
}
