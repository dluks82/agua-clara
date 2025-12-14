
// Mock Types
type Reading = {
  id: number;
  ts: Date;
  hydrometer_m3: string;
  horimeter_h: string;
  hydrometer_status: string;
  horimeter_status: string;
  hydrometer_final_old?: string | null;
  hydrometer_initial_new?: string | null;
  horimeter_final_old?: string | null;
  horimeter_initial_new?: string | null;
  notes?: string | null;
};

type Interval = {
  start: string;
  end: string;
  delta_v: number;
  delta_h: number;
  q_m3h: number | null;
  l_min: number | null;
  l_s: number | null;
  confidence: "ALTA" | "BAIXA";
};

// Copied Logic from src/lib/calculations.ts
function calculateDelta(
  prevVal: number,
  currVal: number,
  status: string,
  finalOld?: string | null,
  initialNew?: string | null
): number {
  if (status === "exchange") {
    const valFinalOld = finalOld ? parseFloat(finalOld) : prevVal;
    const valInitialNew = initialNew ? parseFloat(initialNew) : currVal;
    
    // Delta = (Final Old - Prev) + (Curr - Initial New)
    const deltaOld = valFinalOld - prevVal;
    const deltaNew = currVal - valInitialNew;
    
    return Math.max(0, deltaOld + deltaNew);
  }

  if (status === "rollover") {
    if (prevVal <= 0) return Math.max(0, currVal - prevVal);
    
    const digits = Math.floor(Math.log10(prevVal)) + 1;
    const magnitude = Math.pow(10, digits);
    
    return Math.max(0, (currVal + magnitude) - prevVal);
  }

  // Regular
  return Math.max(0, currVal - prevVal);
}

function calculateIntervals(readings: Reading[]): Interval[] {
  if (readings.length < 2) return [];

  const sortedReadings = [...readings].sort((a, b) => 
    new Date(a.ts).getTime() - new Date(b.ts).getTime()
  );

  const intervals: Interval[] = [];
  
  for (let i = 1; i < sortedReadings.length; i++) {
    const prev = sortedReadings[i - 1];
    const curr = sortedReadings[i];
    
    const delta_v = calculateDelta(
      parseFloat(prev.hydrometer_m3),
      parseFloat(curr.hydrometer_m3),
      curr.hydrometer_status,
      curr.hydrometer_final_old,
      curr.hydrometer_initial_new
    );

    const delta_h = calculateDelta(
      parseFloat(prev.horimeter_h),
      parseFloat(curr.horimeter_h),
      curr.horimeter_status,
      curr.horimeter_final_old,
      curr.horimeter_initial_new
    );
    
    let q_m3h: number | null = null;
    let l_min: number | null = null;
    let l_s: number | null = null;
    
    if (delta_h > 0 && delta_v >= 0) {
      q_m3h = delta_v / delta_h;
      l_min = q_m3h * 1000 / 60;
      l_s = q_m3h * 1000 / 3600;
    }
    
    const confidence = delta_h < 1 ? "BAIXA" : "ALTA";
    
    intervals.push({
      start: prev.ts.toISOString(),
      end: curr.ts.toISOString(),
      delta_v,
      delta_h,
      q_m3h,
      l_min,
      l_s,
      confidence,
    });
  }
  
  return intervals;
}

// Test Cases
const readings: Reading[] = [
  // 1. Regular Sequence
  {
    id: 1,
    ts: new Date("2024-01-01T10:00:00Z"),
    hydrometer_m3: "100",
    horimeter_h: "50",
    hydrometer_status: "regular",
    horimeter_status: "regular",
    notes: "Start",
  },
  {
    id: 2,
    ts: new Date("2024-01-02T10:00:00Z"),
    hydrometer_m3: "110", // Delta = 10
    horimeter_h: "60",   // Delta = 10
    hydrometer_status: "regular",
    horimeter_status: "regular",
    notes: "Regular",
  },
  
  // 2. Rollover Sequence (Prev=110, Curr=10, Max~1000)
  {
    id: 3,
    ts: new Date("2024-01-03T10:00:00Z"),
    hydrometer_m3: "10", // Delta = (10 + 1000) - 110 = 900
    horimeter_h: "70",   // Delta = 10
    hydrometer_status: "rollover",
    horimeter_status: "regular",
    notes: "Rollover",
  },

  // 3. Exchange Sequence (Prev=10, Curr=5, FinalOld=20, InitialNew=0)
  {
    id: 4,
    ts: new Date("2024-01-04T10:00:00Z"),
    hydrometer_m3: "5",
    horimeter_h: "80",
    hydrometer_status: "exchange",
    horimeter_status: "regular",
    hydrometer_final_old: "20",
    hydrometer_initial_new: "0",
    // Delta = (20 - 10) + (5 - 0) = 10 + 5 = 15
    notes: "Exchange",
  }
];

const intervals = calculateIntervals(readings);

console.log("Interval 1 (Regular):", intervals[0].delta_v === 10 ? "PASS" : `FAIL (${intervals[0].delta_v})`);
console.log("Interval 2 (Rollover):", intervals[1].delta_v === 900 ? "PASS" : `FAIL (${intervals[1].delta_v})`);
console.log("Interval 3 (Exchange):", intervals[2].delta_v === 15 ? "PASS" : `FAIL (${intervals[2].delta_v})`);

if (intervals[0].delta_v === 10 && intervals[1].delta_v === 900 && intervals[2].delta_v === 15) {
  console.log("ALL TESTS PASSED");
} else {
  console.log("SOME TESTS FAILED");
  process.exit(1);
}
