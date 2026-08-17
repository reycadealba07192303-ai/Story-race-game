import React, { useEffect, useId, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CameraOff } from 'lucide-react';

interface QrCodeScannerProps {
  active: boolean;
  onScan: (raw: string) => void;
}

export default function QrCodeScanner({ active, onScan }: QrCodeScannerProps) {
  const domId = useId().replace(/:/g, '');
  const readerId = `qr-reader-${domId}`;
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const handledRef = useRef(false);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const [status, setStatus] = useState<'idle' | 'starting' | 'scanning' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!active) {
      void stopScanner();
      setStatus('idle');
      return;
    }

    handledRef.current = false;
    let cancelled = false;

    const start = async () => {
      setStatus('starting');
      setErrorMsg('');

      try {
        const scanner = new Html5Qrcode(readerId, { verbose: false });
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 200, height: 200 }, aspectRatio: 1 },
          (decoded) => {
            if (handledRef.current) return;
            handledRef.current = true;
            onScanRef.current(decoded);
          },
          () => {},
        );

        if (!cancelled) setStatus('scanning');
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Could not access camera.';
        setErrorMsg(msg);
        setStatus('error');
      }
    };

    void start();

    return () => {
      cancelled = true;
      void stopScanner();
    };
  }, [active, readerId]);

  async function stopScanner() {
    const scanner = scannerRef.current;
    if (!scanner) return;
    scannerRef.current = null;
    try {
      if (scanner.isScanning) await scanner.stop();
      scanner.clear();
    } catch {
      /* ignore cleanup errors */
    }
  }

  if (!active) return null;

  return (
    <div className="db-qr-scanner">
      {/* Overlay shown while camera is starting */}
      {status === 'starting' && (
        <div className="db-qr-scanner-overlay">
          <div className="db-qr-scanner-placeholder">
            <Camera size={28} />
            <span>Starting camera…</span>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="db-qr-scanner-placeholder db-qr-scanner-placeholder--error">
          <CameraOff size={28} />
          <span>{errorMsg || 'Camera unavailable'}</span>
          <p>Allow camera access in your browser, or use the join code tab instead.</p>
        </div>
      )}

      {/* The library always renders into this div — never hidden while starting/scanning */}
      {status !== 'error' && (
        <div id={readerId} className="db-qr-scanner-view" />
      )}
    </div>
  );
}
