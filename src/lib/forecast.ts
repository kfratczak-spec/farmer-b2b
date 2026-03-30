import { Group } from './data';

export interface ForecastDataPoint {
  date: string;
  actual: number;
  expected: number;
  forecast: number;
}

export interface ForecastStats {
  currentUtilization: number;      // % całości (usedMinutes / totalMinutes)
  todayUtilization: number;        // % na dziś (ile zrobiono vs ile powinno być na dziś)
  expectedUtilization: number;     // ile % powinno być wykorzystane na dziś (liniowo do 75%)
  forecastedUtilization: number;   // prognozowane % na koniec okresu
  dailyUsageRate: number;
  daysRemaining: number;
  isOnTrack: boolean;
  dataPoints: ForecastDataPoint[];
  renewalProbability: number;      // 0-100, chance of renewal
  renewalProbabilityClass: string; // "Bardzo wysokie" | "Wysokie" | "Średnie" | "Niskie" | "Bardzo niskie"
}

export function calculateForecastStats(group: Group): ForecastStats {
  const now = new Date();
  const startDate = new Date(group.startDate);
  const endDate = new Date(group.endDate);

  // Current utilization
  const currentUtilization = group.usedMinutes / group.totalMinutes;

  // Expected utilization (linear to 75%)
  const totalMs = endDate.getTime() - startDate.getTime();
  const elapsedMs = now.getTime() - startDate.getTime();
  const elapsedRatio = elapsedMs / totalMs;
  const targetUtilization = 0.75;
  const expectedUtilization = Math.min(elapsedRatio * targetUtilization, targetUtilization);

  // Calculate recent daily usage rate (last 14 days)
  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const recentUsage = group.dailyUsage.filter(du => {
    const duDate = new Date(du.date);
    return duDate >= fourteenDaysAgo && duDate <= now;
  });

  const dailyUsageRate =
    recentUsage.length > 0 ? recentUsage.reduce((sum, du) => sum + du.minutes, 0) / 14 : 0;

  // Forecast: based on recent trend, how much will be used by end date?
  const daysRemaining = Math.max(
    0,
    Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  );
  const forecastedUsage = group.usedMinutes + dailyUsageRate * daysRemaining;
  const forecastedUtilization = Math.min(forecastedUsage / group.totalMinutes, 1);

  // % na dziś: ile zrobiono vs ile powinno być na dziś (liniowo do 100%)
  const expectedMinutesToday = group.totalMinutes * Math.min(Math.max(elapsedRatio, 0), 1);
  const todayUtilization = expectedMinutesToday > 0
    ? group.usedMinutes / expectedMinutesToday
    : 0;

  // Check if on track
  const isOnTrack = currentUtilization >= expectedUtilization * 0.95;

  // Calculate renewal probability
  const { probability, classification } = calculateRenewalProbability(
    group,
    currentUtilization,
    expectedUtilization,
    forecastedUtilization,
    daysRemaining,
    elapsedRatio
  );

  // Generate data points for chart
  const dataPoints = generateChartDataPoints(group, dailyUsageRate);

  return {
    currentUtilization: Math.round(currentUtilization * 100) / 100,
    todayUtilization: Math.round(todayUtilization * 100) / 100,
    expectedUtilization: Math.round(expectedUtilization * 100) / 100,
    forecastedUtilization: Math.round(forecastedUtilization * 100) / 100,
    dailyUsageRate: Math.round(dailyUsageRate * 100) / 100,
    daysRemaining,
    isOnTrack,
    dataPoints,
    renewalProbability: probability,
    renewalProbabilityClass: classification,
  };
}

function calculateRenewalProbability(
  group: Group,
  currentUtilization: number,
  expectedUtilization: number,
  forecastedUtilization: number,
  daysRemaining: number,
  elapsedRatio: number
): { probability: number; classification: string } {
  // Calculate components with weights
  // 1. Current utilization vs expected (weight: 40%)
  const utilizationScore = Math.min(currentUtilization / Math.max(expectedUtilization, 0.1), 1);
  const utilizationComponent = utilizationScore * 40;

  // 2. Recent trend direction (weight: 30%)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentDays = group.dailyUsage.filter(du => {
    const duDate = new Date(du.date);
    return duDate >= thirtyDaysAgo;
  });
  let trendComponent = 15; // neutral
  if (recentDays.length >= 2) {
    const firstHalf = recentDays.slice(0, Math.floor(recentDays.length / 2));
    const secondHalf = recentDays.slice(Math.floor(recentDays.length / 2));
    const avgFirst = firstHalf.reduce((sum, du) => sum + du.minutes, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((sum, du) => sum + du.minutes, 0) / secondHalf.length;
    if (avgSecond > avgFirst) {
      trendComponent = 30; // improving
    } else if (avgSecond < avgFirst * 0.8) {
      trendComponent = 5; // declining significantly
    } else if (avgSecond < avgFirst) {
      trendComponent = 10; // slightly declining
    }
  }

  // 3. Days remaining vs total duration (weight: 15%)
  const totalDays = Math.ceil(
    (new Date(group.endDate).getTime() - new Date(group.startDate).getTime()) /
      (1000 * 60 * 60 * 24)
  );
  const remainingRatio = daysRemaining / totalDays;
  const timeComponent = remainingRatio < 0.25 ? 15 : remainingRatio < 0.5 ? 10 : 5;

  // 4. Forecasted end utilization (weight: 15%)
  const forecastComponent = Math.min(forecastedUtilization / 0.75, 1) * 15;

  const totalProbability = utilizationComponent + trendComponent + timeComponent + forecastComponent;
  const roundedProbability = Math.round(totalProbability);

  let classification = 'Bardzo niskie';
  if (roundedProbability >= 80) {
    classification = 'Bardzo wysokie';
  } else if (roundedProbability >= 60) {
    classification = 'Wysokie';
  } else if (roundedProbability >= 40) {
    classification = 'Średnie';
  } else if (roundedProbability >= 20) {
    classification = 'Niskie';
  }

  return { probability: roundedProbability, classification };
}

function generateChartDataPoints(
  group: Group,
  dailyUsageRate: number
): ForecastDataPoint[] {
  const points: ForecastDataPoint[] = [];
  const now = new Date();
  const startDate = new Date(group.startDate);
  const endDate = new Date(group.endDate);
  const totalMs = endDate.getTime() - startDate.getTime();
  const totalDays = Math.ceil(totalMs / (1000 * 60 * 60 * 24));

  // Determine sampling interval
  let sampleInterval = 1;
  if (totalDays > 180) {
    sampleInterval = 7; // every 7 days for groups longer than 6 months
  } else if (totalDays > 90) {
    sampleInterval = 3; // every 3 days for groups longer than 3 months
  }

  // Build cumulative usage map for efficiency
  const cumulativeUsageMap: { [key: string]: number } = {};
  let accumulated = 0;
  for (const usage of group.dailyUsage) {
    accumulated += usage.minutes;
    cumulativeUsageMap[usage.date] = accumulated;
  }

  let currentDate = new Date(startDate);
  currentDate.setHours(0, 0, 0, 0);

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];

    // Calculate actual cumulative usage up to this date
    let actualMinutes = 0;
    for (const usage of group.dailyUsage) {
      const usageDate = new Date(usage.date);
      if (usageDate <= currentDate) {
        actualMinutes += usage.minutes;
      }
    }
    const actualPercent = (actualMinutes / group.totalMinutes) * 100;

    // Expected utilization at this date (linear to 75%)
    const elapsedMs = currentDate.getTime() - startDate.getTime();
    const elapsedRatio = elapsedMs / totalMs;
    const expectedPercent = Math.min(elapsedRatio * 75, 75);

    // Forecast: based on recent daily rate
    let forecastPercent = actualPercent;
    if (currentDate > now) {
      const daysFromNow = Math.ceil((currentDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const forecastedMinutes = actualMinutes + dailyUsageRate * daysFromNow;
      forecastPercent = Math.min((forecastedMinutes / group.totalMinutes) * 100, 100);
    }

    points.push({
      date: dateStr,
      actual: Math.round(actualPercent),
      expected: Math.round(expectedPercent),
      forecast: Math.round(forecastPercent),
    });

    currentDate.setDate(currentDate.getDate() + sampleInterval);
  }

  return points;
}
