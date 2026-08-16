export interface RelativeTimeCopy {
  justNow: string;
  minutesAgo: string;
  hoursAgo: string;
  daysAgo: string;
}

export function formatRelativeTime(iso: string, dict: RelativeTimeCopy): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) {
    return dict.justNow;
  }
  if (minutes < 60) {
    return dict.minutesAgo.replace('{n}', String(minutes));
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return dict.hoursAgo.replace('{n}', String(hours));
  }
  const days = Math.floor(hours / 24);
  return dict.daysAgo.replace('{n}', String(days));
}
