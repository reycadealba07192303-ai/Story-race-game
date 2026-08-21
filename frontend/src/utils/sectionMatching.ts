export function campaignMatchesSection(targetSection?: string | null, sectionName?: string | null) {
  const targets = String(targetSection || '')
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);

  if (targets.length === 0 || targets.includes('all') || targets.includes('na')) {
    return true;
  }

  const section = String(sectionName || '').trim().toLowerCase();
  if (!section || section === 'na') return false;

  return targets.includes(section);
}
