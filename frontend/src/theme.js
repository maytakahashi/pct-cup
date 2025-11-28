export const CATEGORY = {
  CHAPTER:   { label: "CHAPTER",   color: "#DE6561" },
  RUSH:      { label: "RUSH",      color: "#FAB86D" },
  INTERNAL:  { label: "INTERNAL",  color: "#FFDE76" },
  CORPORATE: { label: "CORPORATE", color: "#9ECC80" },
  PLEDGE:    { label: "PLEDGE",    color: "#7DA9B4" },
  SERVICE:   { label: "SERVICE",   color: "#709CF2" },
  CASUAL:    { label: "CASUAL",    color: "#8978C7" },
};

export const RAINBOW = Object.values(CATEGORY).map((x) => x.color);
