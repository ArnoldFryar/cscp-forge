import type { StudyPlanItem } from "./types";

export const weeklyStudyPlan: StudyPlanItem[] = [
  { id: "plan-mon", day: "Mon", moduleId: "m2", focus: "Demand planning", tasks: ["25-question applied set", "Review forecast bias notes"], minutes: 55, status: "in-progress" },
  { id: "plan-tue", day: "Tue", moduleId: "m3", focus: "Network design", tasks: ["Compare facility tradeoffs", "Redo missed advanced questions"], minutes: 45, status: "planned" },
  { id: "plan-wed", day: "Wed", moduleId: "m5", focus: "Inventory and operations", tasks: ["Safety stock formulas", "Constraint management drill"], minutes: 60, status: "planned" },
  { id: "plan-thu", day: "Thu", moduleId: "m4", focus: "Supplier risk", tasks: ["Supplier segmentation review", "Contract risk controls"], minutes: 40, status: "planned" },
  { id: "plan-fri", day: "Fri", moduleId: "m6", focus: "Logistics", tasks: ["Mode selection scenarios", "Warehouse metric flash review"], minutes: 35, status: "planned" },
  { id: "plan-sat", day: "Sat", moduleId: "m7", focus: "Risk and compliance", tasks: ["Continuity planning cases", "Missed-question cleanup"], minutes: 75, status: "planned" },
  { id: "plan-sun", day: "Sun", moduleId: "m8", focus: "Readiness check", tasks: ["Mixed quiz", "Update weak-module plan"], minutes: 50, status: "planned" },
];