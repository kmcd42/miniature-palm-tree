// =========================================================================
// NZ BENCHMARKS
// =========================================================================
//
// Approximate, publicly-published figures used for "reality check" comparisons.
// They are inherently dated — verify against the current source and override
// in Settings if you want today's numbers.

// Median individual net worth by age band — Stats NZ Household Net Worth
// Survey 2021 (latest published wave). These are individual medians, not
// household. They are conservative because they exclude high-asset outliers.
// Source: stats.govt.nz/information-releases/household-net-worth-statistics
export const NZ_INDIVIDUAL_NET_WORTH_2021 = {
  year: 2021,
  source: 'Stats NZ · Household Net Worth Survey 2021 (individual medians)',
  byAgeBand: [
    { from: 15, to: 24, median:  16_000 },
    { from: 25, to: 34, median:  84_000 },
    { from: 35, to: 44, median: 190_000 },
    { from: 45, to: 54, median: 327_000 },
    { from: 55, to: 64, median: 397_000 },
    { from: 65, to: 74, median: 433_000 },
    { from: 75, to: 200, median: 396_000 },
  ],
};

export function nzMedianNetWorthForAge(age: number): number {
  const band = NZ_INDIVIDUAL_NET_WORTH_2021.byAgeBand.find(
    (b) => age >= b.from && age <= b.to,
  );
  return band?.median ?? 0;
}

// NZ household savings rate — Stats NZ household income & savings.
// Hovering around 5–7% over the last decade. We use a middle figure.
export const NZ_AVG_SAVINGS_RATE = {
  year: 2023,
  source: 'Stats NZ · Household disposable income / saving',
  rate: 0.06, // 6%
};

// Bracket label for the Massey Retirement Expenditure Guidelines comparison.
export type MasseyBracket = 'below' | 'no_frills' | 'between' | 'choices' | 'above';

export function masseyBracket(
  weeklyDrawdown: number,
  noFrills: number,
  choices: number,
): { bracket: MasseyBracket; label: string; nearest: number } {
  if (weeklyDrawdown < noFrills * 0.85) {
    return { bracket: 'below', label: 'Below No Frills', nearest: noFrills };
  }
  if (weeklyDrawdown < noFrills * 1.10) {
    return { bracket: 'no_frills', label: 'No Frills', nearest: noFrills };
  }
  if (weeklyDrawdown < choices * 0.90) {
    return { bracket: 'between', label: 'Between No Frills & Choices', nearest: (noFrills + choices) / 2 };
  }
  if (weeklyDrawdown < choices * 1.10) {
    return { bracket: 'choices', label: 'Choices', nearest: choices };
  }
  return { bracket: 'above', label: 'Above Choices', nearest: choices };
}
