import { format, subDays, subMonths, subYears } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

export function getDateRange(period: string): { period1: string; period2: string } {
  const timezone = 'Asia/Seoul';
  const now = new Date();
  
  // 현재 시간을 KST로 변환
  const kstNow = toZonedTime(now, timezone);
  let startDate: Date;

  switch (period) {
    case '1d':
      startDate = subDays(kstNow, 1);
      break;
    case '1mo':
      startDate = subMonths(kstNow, 1);
      break;
    case '3mo':
      startDate = subMonths(kstNow, 3);
      break;
    case '6mo':
      startDate = subMonths(kstNow, 6);
      break;
    case '1y':
      startDate = subYears(kstNow, 1);
      break;
    default:
      throw new Error(`Invalid period: ${period}`);
  }

  return {
    period1: format(startDate, 'yyyy-MM-dd'), // 예: '2025-06-27'
    period2: format(kstNow, 'yyyy-MM-dd'),
  };
}