import type React from 'react';

export const PROFILE_FONT = "'Outfit', sans-serif";

export const profileSectionTitle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 800,
  color: 'var(--db-text)',
  letterSpacing: 0.5,
  textTransform: 'uppercase',
  fontFamily: PROFILE_FONT,
};

export const profileFieldLabel: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--db-muted)',
  textTransform: 'uppercase',
  letterSpacing: 1,
  marginBottom: 8,
  fontFamily: PROFILE_FONT,
};

export const profileCardSubtitle: React.CSSProperties = {
  ...profileSectionTitle,
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--db-muted)',
  letterSpacing: 1,
  marginTop: 4,
};
