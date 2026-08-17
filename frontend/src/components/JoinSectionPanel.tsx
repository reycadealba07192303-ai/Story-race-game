import React, { useCallback, useState } from 'react';
import { Keyboard, QrCode } from 'lucide-react';
import QrCodeScanner from './QrCodeScanner';
import { parseJoinCodeFromScan } from '../utils/parseJoinCode';
import { PROFILE_FONT } from '../styles/profileStyles';

type JoinMode = 'code' | 'scan';

interface JoinSectionPanelProps {
  onJoin: (code: string) => void | Promise<void>;
  joining?: boolean;
  message?: string;
  placeholder?: string;
  compact?: boolean;
}

export default function JoinSectionPanel({
  onJoin,
  joining = false,
  message,
  placeholder = 'e.g. BANANA',
  compact = false,
}: JoinSectionPanelProps) {
  const [mode, setMode] = useState<JoinMode>('code');
  const [joinCode, setJoinCode] = useState('');
  const [scanError, setScanError] = useState('');
  const [scanSession, setScanSession] = useState(0);

  const submitCode = useCallback(async (code: string) => {
    const normalized = code.trim().toUpperCase();
    if (!normalized || joining) return;
    await onJoin(normalized);
  }, [joining, onJoin]);

  const handleScan = useCallback(async (raw: string) => {
    const parsed = parseJoinCodeFromScan(raw);
    if (!parsed) {
      setScanError('Could not read a valid join code from that QR. Try again or enter the code manually.');
      return;
    }
    setScanError('');
    setJoinCode(parsed);
    await submitCode(parsed);
  }, [submitCode]);

  const isSuccess = message?.toLowerCase().includes('success');

  return (
    <div className="db-join-section-panel">
      <div className="db-join-section-tabs" role="tablist" aria-label="Join section method">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'code'}
          className={`db-join-section-tab${mode === 'code' ? ' active' : ''}`}
          onClick={() => { setMode('code'); setScanError(''); }}
        >
          <Keyboard size={14} /> Join Code
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'scan'}
          className={`db-join-section-tab${mode === 'scan' ? ' active' : ''}`}
          onClick={() => { setMode('scan'); setScanError(''); setScanSession((s) => s + 1); }}
        >
          <QrCode size={14} /> Scan QR
        </button>
      </div>

      {mode === 'code' ? (
        <form
          className="db-profile-join-row"
          onSubmit={(e) => { e.preventDefault(); void submitCode(joinCode); }}
        >
          <input
            placeholder={placeholder}
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            disabled={joining}
            style={{
              padding: compact ? '10px 12px' : '11px 14px',
              borderRadius: 12,
              border: '1.5px solid var(--db-border)',
              background: 'var(--db-body)',
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--db-text)',
              outline: 'none',
              fontFamily: PROFILE_FONT,
              letterSpacing: 1,
            }}
          />
          <button
            type="submit"
            disabled={!joinCode.trim() || joining}
            className="db-btn primary"
            style={{
              padding: compact ? '10px 16px' : '11px 18px',
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 700,
              fontFamily: PROFILE_FONT,
              whiteSpace: 'nowrap',
              opacity: !joinCode.trim() || joining ? 0.6 : 1,
            }}
          >
            {joining ? 'Joining…' : 'Join'}
          </button>
        </form>
      ) : (
        <div className="db-join-section-scan">
          <p className="db-join-section-scan-hint">
            Point your camera at the QR code from your teacher. It works with scan-to-link or plain join codes.
          </p>
          <QrCodeScanner key={scanSession} active={mode === 'scan' && !joining} onScan={(raw) => { void handleScan(raw); }} />
          {joining && (
            <p className="db-join-section-status">Joining section…</p>
          )}
          {scanError && (
            <p className="db-join-section-error">{scanError}</p>
          )}
        </div>
      )}

      {message && mode === 'code' && (
        <p
          className="db-join-section-feedback"
          style={{ color: isSuccess ? '#10B981' : '#EF4444' }}
        >
          {isSuccess ? '✓' : '⚠'} {message}
        </p>
      )}
      {message && mode === 'scan' && isSuccess && (
        <p className="db-join-section-feedback" style={{ color: '#10B981' }}>
          ✓ {message}
        </p>
      )}
    </div>
  );
}
