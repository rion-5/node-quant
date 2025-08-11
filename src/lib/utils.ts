export function getDateRange(period: string): { period1: string; period2: string } {
  const endDate = new Date();
  const startDate = new Date();

  switch (period) {
    case '1d':
      startDate.setDate(endDate.getDate() - 1);
      break;
    case '1mo':
      startDate.setMonth(endDate.getMonth() - 1);
      break;
    case '3mo':
      startDate.setMonth(endDate.getMonth() - 3);
      break;
    case '6mo':
      startDate.setMonth(endDate.getMonth() - 6);
      break;
    case '1y':
      startDate.setFullYear(endDate.getFullYear() - 1);
      break;
    default:
      throw new Error(`Invalid period: ${period}`);
  }

  return {
    period1: startDate.toISOString().split('T')[0], // 예: '2025-06-27'
    period2: endDate.toISOString().split('T')[0],
  };
}