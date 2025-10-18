const { formatTime, getRelativeTime } = require('../src/utils/dateUtils');

// Create a date 5 minutes ago
const now = new Date();
const fiveMinutes = new Date(now.getTime() - 5 * 60 * 1000);
const twoHours = new Date(now.getTime() - 2 * 60 * 60 * 1000);

console.log('Browser locale (simulated via navigator.language):', typeof navigator !== 'undefined' ? navigator.language : 'none');
console.log('5m ago relative:', getRelativeTime(fiveMinutes));
console.log('2h ago relative:', getRelativeTime(twoHours));
console.log('5m time:', formatTime(fiveMinutes));
console.log('2h time:', formatTime(twoHours));
