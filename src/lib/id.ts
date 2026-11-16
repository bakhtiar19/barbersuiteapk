export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function formatTrxNumber(trxDate: string, seq: number): string {
  const compactDate = trxDate.replace(/-/g, '');
  const paddedSeq = String(seq).padStart(4, '0');
  return `TRX-${compactDate}-${paddedSeq}`;
}

