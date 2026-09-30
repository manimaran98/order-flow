import { formatDate, paidAtForApi, todayMyt } from './dates';

const justAfterMidnightMyt = new Date('2026-09-29T16:30:00Z'); // 00:30 on 30 Sep in MYT

describe('dates (Asia/Kuala_Lumpur)', () => {
  it('uses the Malaysian calendar day', () => {
    expect(todayMyt(justAfterMidnightMyt)).toBe('2026-09-30');
    expect(formatDate('2026-09-29T16:30:00Z')).toMatch(/30/);
  });

  it('never sends "today" as a future timestamp', () => {
    expect(paidAtForApi('2026-09-30', justAfterMidnightMyt)).toBeUndefined();
    expect(paidAtForApi(undefined, justAfterMidnightMyt)).toBeUndefined();
  });

  it('sends past dates as midday MYT', () => {
    expect(paidAtForApi('2026-09-20', justAfterMidnightMyt)).toBe('2026-09-20T12:00:00+08:00');
  });
});
