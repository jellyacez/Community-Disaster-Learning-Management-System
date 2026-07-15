import { useState, useEffect } from 'react';

export function useScrollSpy(sectionIds, triggerOffset = 250) {
  const [activeId, setActiveId] = useState(sectionIds[0]);

  useEffect(() => {
    const handleScroll = () => {
      let newActiveId = sectionIds[0];
      
      // Loop backwards to find the lowest section that has crossed the trigger line
      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const section = document.getElementById(sectionIds[i]);
        if (section) {
          const rect = section.getBoundingClientRect();
          if (rect.top <= triggerOffset) {
            newActiveId = sectionIds[i];
            break;
          }
        }
      }

      setActiveId((prev) => (prev !== newActiveId ? newActiveId : prev));
    };

    // Use capture: true to catch scroll events from ANY scrollable container
    window.addEventListener("scroll", handleScroll, { capture: true, passive: true });
    handleScroll(); // Initial check

    return () => window.removeEventListener("scroll", handleScroll, { capture: true });
  }, [sectionIds, triggerOffset]); // Added dependencies for safety

  return activeId;
}
