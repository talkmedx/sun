/** Indian financial year helper (Apr–Mar) */
export function getFinancialYear(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12
  if (month >= 4) {
    return `${year}-${year + 1}`;
  }
  return `${year - 1}-${year}`;
}

export function getCurrentFyBounds(fy?: string): { start: string; end: string; fy: string } {
  const current = fy || getFinancialYear();
  const [startYear] = current.split('-').map(Number);
  return {
    fy: current,
    start: `${startYear}-04-01`,
    end: `${startYear + 1}-03-31`,
  };
}

export function paginate(page = 1, limit = 20) {
  const p = Math.max(1, Number(page) || 1);
  const l = Math.min(100, Math.max(1, Number(limit) || 20));
  return { page: p, limit: l, offset: (p - 1) * l };
}

export function buildSort(
  sortBy: string | undefined,
  sortOrder: string | undefined,
  allowed: string[],
  defaultCol = 'created_at'
): string {
  const col = allowed.includes(sortBy || '') ? sortBy! : defaultCol;
  const order = (sortOrder || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  return `${col} ${order}`;
}

/** Escape LIKE wildcards */
export function likePattern(term: string): string {
  return `%${term.replace(/[%_]/g, '\\$&')}%`;
}
