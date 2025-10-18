// Utility functions for formatting dates and times
import i18n from 'i18next';

export const formatTime = (date: Date): string => {
  const locale = (typeof navigator !== 'undefined' && navigator.language) ? navigator.language : undefined;
  return date.toLocaleTimeString(locale, { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: undefined // let the locale decide
  });
};


export const formatDateTime = (date: Date): string => {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  if (isToday) {
    // Use i18n for 'Today at' localization
    return i18n.t('date.todayAt', { time: formatTime(date) });
  }
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  
  if (isYesterday) {
    return i18n.t('date.yesterdayAt', { time: formatTime(date) });
  }
  
  // For older dates, show the full date using the browser locale and include time
  const locale = (typeof navigator !== 'undefined' && navigator.language) ? navigator.language : undefined;
  return date.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: undefined
  });
};

export const getRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  const locale = (typeof navigator !== 'undefined' && navigator.language) ? navigator.language : 'en';
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (diffSeconds < 60) {
    // RTF with 0 seconds and numeric:'auto' should return localized "now" / "ahora"
    // Some browsers may not return a helpful string for seconds; fallback to 0 minutes
    try { return rtf.format(0, 'second' as Intl.RelativeTimeFormatUnit); } catch (e) { return rtf.format(0, 'minute' as Intl.RelativeTimeFormatUnit); }
  }
  if (diffMinutes < 60) {
    return rtf.format(-diffMinutes, 'minute');
  }
  if (diffHours < 24) {
    return rtf.format(-diffHours, 'hour');
  }
  // Use days for older items
  return rtf.format(-diffDays, 'day');
};