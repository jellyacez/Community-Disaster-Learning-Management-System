export const BARANGAY_LIST = [
  { id: 1, name: "Balas" },
  { id: 2, name: "Cabalantian" },
  { id: 3, name: "Cabambangan" },
  { id: 4, name: "Cabetican" },
  { id: 5, name: "Calibutbut" },
  { id: 6, name: "Concepcion" },
  { id: 7, name: "Dolores" },
  { id: 8, name: "Duat" },
  { id: 9, name: "Macabacle" },
  { id: 10, name: "Magliman" },
  { id: 11, name: "Maliwalu" },
  { id: 12, name: "Mesalipit" },
  { id: 13, name: "Parulog" },
  { id: 14, name: "Potrero" },
  { id: 15, name: "San Antonio" },
  { id: 16, name: "San Isidro" },
  { id: 17, name: "San Vicente" },
  { id: 18, name: "Santa Barbara" },
  { id: 19, name: "Santa Ines" },
  { id: 20, name: "Talba" },
  { id: 21, name: "Tinajero" },
];

// Array of official names for strict string validation in forms
export const VALID_BARANGAY_NAMES = BARANGAY_LIST.map((b) => b.name);
export const VALID_BARANGAY_IDS = BARANGAY_LIST.map((b) => b.id);
