// One source for every hotline shown or dialled in the client. `tel` is derived
// from `number`, so a label can never dial something different from what it shows.
// These are sample numbers until real contacts are set.
const SAMPLE_NUMBER = "0987 654 3210";

const phone = (number) => ({ number, tel: number.replace(/\s+/g, "") });

export const HOTLINES = {
  mdrrmoGlobe: { id: "mdrrmo-globe", network: "Globe", ...phone(SAMPLE_NUMBER) },
  mdrrmoSmart: { id: "mdrrmo-smart", network: "Smart", ...phone(SAMPLE_NUMBER) },
  bfp: { id: "bfp", network: null, ...phone(SAMPLE_NUMBER) },
  nationalEmergency: { id: "national-emergency", network: null, ...phone("911") },
};
