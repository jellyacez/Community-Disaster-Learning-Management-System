import { LaptopIcon, SmartPhone01Icon } from "@hugeicons/core-free-icons";

export const getDeviceDetails = (ua) => {
  if (!ua) return { name: "Unknown Device", icon: LaptopIcon };
  if (ua.includes("Mobi") || ua.includes("Android") || ua.includes("iPhone")) {
    return { name: "Mobile Device", icon: SmartPhone01Icon };
  }
  if (ua.includes("Windows")) return { name: "Windows PC", icon: LaptopIcon };
  if (ua.includes("Mac")) return { name: "Mac", icon: LaptopIcon };
  return { name: "Desktop", icon: LaptopIcon };
};
