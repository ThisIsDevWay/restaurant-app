export function parseReceiveTime(receiveTime: string): Date | null {
  if (/^\d+$/.test(receiveTime)) {
    return new Date(Number(receiveTime));
  }
  const hasTimezone = /[Zz]|\+|-/g.test(receiveTime.substring(10));
  if (hasTimezone) {
    const d = new Date(receiveTime);
    return isNaN(d.getTime()) ? null : d;
  }
  const cleaned = receiveTime.trim().replace(" ", "T");
  const d = new Date(`${cleaned}-04:00`);
  if (!isNaN(d.getTime())) {
    return d;
  }
  const dFallback = new Date(receiveTime);
  return isNaN(dFallback.getTime()) ? null : dFallback;
}
