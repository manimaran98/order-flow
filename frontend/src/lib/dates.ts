const TZ = 'Asia/Kuala_Lumpur';

const dateFmt = new Intl.DateTimeFormat('en-MY', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('en-MY', {
  timeZone: TZ,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const isoDay = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });

export const formatDate = (iso: string) => dateFmt.format(new Date(iso));
export const formatDateTime = (iso: string) => dateTimeFmt.format(new Date(iso));

/** Today's calendar date in Malaysia as YYYY-MM-DD (for <input type="date">). */
export const todayMyt = (now = new Date()) => isoDay.format(now);

/**
 * The API rejects paidAt in the future. "Today" is sent as nothing (the server stamps now);
 * an earlier day is sent as midday MYT so it can never drift into the next day.
 */
export function paidAtForApi(date: string | undefined, now = new Date()): string | undefined {
  if (!date || date >= todayMyt(now)) return undefined;
  return `${date}T12:00:00+08:00`;
}
