export const BUSINESS_TZ = 'Asia/Kuala_Lumpur';

const ymd = new Intl.DateTimeFormat('en-CA', {
  timeZone: BUSINESS_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Calendar date in the business timezone, e.g. "2026-09-29". */
export const businessDate = (d: Date) => ymd.format(d);

/** Midnight of the business day containing `d`. Malaysia has no DST, so +08:00 is exact. */
export const startOfBusinessDay = (d: Date) => new Date(`${businessDate(d)}T00:00:00+08:00`);
