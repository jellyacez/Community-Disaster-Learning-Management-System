import { useState } from "react";

export function useLevelManager() {
  const [stagedLevels, setStagedLevels] = useState([
    { levelOrder: 1, levelTitle: "", levelDescription: "", passing_threshold: 80, is_locked_by_default: false }
  ]);
  const [activeLevelOrder, setActiveLevelOrder] = useState(1);

  return {
    stagedLevels, setStagedLevels,
    activeLevelOrder, setActiveLevelOrder
  };
}
