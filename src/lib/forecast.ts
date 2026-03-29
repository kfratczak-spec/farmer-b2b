import { Group } from './data';

export interface ForecastDataPoint {
  date: string;
  actual: number;
  expected: number;
  forecast: number;
}

export interface ForecastStats {
  currentUtilization: number;
  expectedUtilization: number;
  forecastedUtilization: number;
  dailyUsageRate: number;
  daysRemaining: number;
  isOnTrack: boolean;
  dataPoints: ForecastDataPoint[];
}

export function calculateForecastStats(group: Group): ForecastStats {
  const now = new Date('2026-03-29');
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

  // Check if on track
  const isOnTrack = currentUtilization >= expectedUtilization * 0.95;

  // Generate data points for chart
  const dataPoints = generateChartDataPoints(group, expectedUtilization, forecastedUtilization);

  return {
    currentUtilization: Math.round(currentUtilization * 100) / 100,
    expectedUtilization: Math.round(expectedUtilization * 100) / 100,
    forecastedUtilization: Math.round(forecastedUtilization * 100) / 100,
    dailyUsageRate: Math.round(dailyUsageRate * 100) / 100,
    daysRemaining,
    isOnTrack,
    dataPoints,
  };
}

function generateChartDataPoints(
  group: Group,
  expectedUtilization: number,
  forecastedUtilization: number
): ForecastDataPoint[] {
  const points: ForecastDataPoint[] = [];
  const now = new Date('2026-03-29');
  const startDate = new Date(group.startDate);
  const endDate = new Date(group.endDate);
  const totalMs = endDate.getTime() - startDate.getTime();

  // Show every 3rd day for the past and a few days into future
  const displayStartDate = new Date(startDate);
  if (displayStartDate < new Date('2025-01-01')) {
    displayStartDate.setTime(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  let currentDate = new Date(displayStartDate);
  let accumulatedMinutes = 0;

  // Get total minutes used up to start of display period
  for (const usage of group.dailyUsage) {
    const usageDate = new Date(usage.date);
    if (usageDate < displayStartDate) {
      accumulatedMinutes += usage.minutes;
    } else {
      break;
    }
  }

  while (currentDate <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)) {
    const dateStr = currentDate.toISOString().split('T')[0];

    // Actual usage
    const dailyUsage = group.dailyUsage.find(du => du.date === dateStr);
    if (dailyUsage && currentDate <= now) {
      accumulatedMinutes += dailyUsage.minutes;
    }

    const actualPercent = (accumulatedMinutes / group.totalMinutes) * 100;

    // Expected at this date
    const elapsedMs = currentDate.getTime() - startDate.getTime();
    const elapsedRatio = elapsedMs / totalMs;
    const expectedPercent = Math.min(elapsedRatio * 75, 75);

    // Forecast at this date (only for future dates)
    let forecastPercent = actualPercent;
    if (currentDate > now) {
      const dailyRate = 0; // This will be calculated per day during iteration
      const futureUsage = accumulatedMinutes + (currentDate.getTime() - now.getTime()) / 1000 / 60 / 24 * 100;
      forecastPercent = Math.min((futureUsage / group.totalMinutes) * 100, 100);
    }

    points.push({
      date: dateStr,
      actual: Math.round(actualPercent),
      expected: Math.round(expectedPercent),
      forecast: Math.round(forecastPercent),
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return points;
}
