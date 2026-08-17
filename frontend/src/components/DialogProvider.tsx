import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

type DialogVariant = 'info' | 'success' | 'danger' | 'warning';

interface AlertOptions {
  title?: string;
  message: string;
  variant?: DialogVariant;
  confirmLabel?: string;
}

interface ConfirmOptions {
  title?: string;
  message: string;
  variant?: DialogVariant;
  confirmLabel?: string;
  cancelLabel?: string;
}

interface PromptOptions {
  title?: string;
  message: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: DialogVariant;
}

interface DialogContextValue {
  alert: (options: AlertOptions | string) => Promise<void>;
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
  prompt: (options: PromptOptions | string) => Promise<string | null>;
}

const DialogContext = createContext<DialogContextValue | null>(null);

type Mode = 'alert' | 'confirm' | 'prompt' | null;

interface DialogState {
  mode: Mode;
  title: string;
  message: string;
  variant: DialogVariant;
  confirmLabel: string;
  cancelLabel: string;
  placeholder: string;
}

const DEFAULT: DialogState = {
  mode: null,
  title: '',
  message: '',
  variant: 'info',
  confirmLabel: 'OK',
  cancelLabel: 'Cancel',
  placeholder: '',
};

function variantMeta(variant: DialogVariant) {
  if (variant === 'danger') {
    return {
      icon: <AlertTriangle size={22} />,
      color: '#F87171',
      bg: 'rgba(239,68,68,0.14)',
      btn: 'linear-gradient(135deg, #EF4444, #DC2626)',
    };
  }
  if (variant === 'warning') {
    return {
      icon: <AlertTriangle size={22} />,
      color: '#FBBF24',
      bg: 'rgba(245,158,11,0.14)',
      btn: 'linear-gradient(135deg, #F59E0B, #D97706)',
    };
  }
  if (variant === 'success') {
    return {
      icon: <CheckCircle2 size={22} />,
      color: '#34D399',
      bg: 'rgba(16,185,129,0.14)',
      btn: 'linear-gradient(135deg, #10B981, #059669)',
    };
  }
  return {
    icon: <Info size={22} />,
    color: '#818CF8',
    bg: 'rgba(99,102,241,0.14)',
    btn: 'linear-gradient(135deg, #6366F1, #7C3AED)',
  };
}

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DialogState>(DEFAULT);
  const [promptValue, setPromptValue] = useState('');
  const resolverRef = useRef<((value: boolean | string | null) => void) | null>(null);

  const close = useCallback((result: boolean | string | null) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setPromptValue('');
    setState(DEFAULT);
  }, []);

  const alert = useCallback((options: AlertOptions | string) => {
    const opts = typeof options === 'string' ? { message: options } : options;
    return new Promise<void>((resolve) => {
      resolverRef.current = () => resolve();
      setState({
        mode: 'alert',
        title: opts.title || 'Notice',
        message: opts.message,
        variant: opts.variant || 'info',
        confirmLabel: opts.confirmLabel || 'OK',
        cancelLabel: 'Cancel',
        placeholder: '',
      });
    });
  }, []);

  const confirm = useCallback((options: ConfirmOptions | string) => {
    const opts = typeof options === 'string' ? { message: options } : options;
    return new Promise<boolean>((resolve) => {
      resolverRef.current = (value) => resolve(Boolean(value));
      setState({
        mode: 'confirm',
        title: opts.title || 'Please confirm',
        message: opts.message,
        variant: opts.variant || 'warning',
        confirmLabel: opts.confirmLabel || 'Confirm',
        cancelLabel: opts.cancelLabel || 'Cancel',
        placeholder: '',
      });
    });
  }, []);

  const prompt = useCallback((options: PromptOptions | string) => {
    const opts = typeof options === 'string' ? { message: options } : options;
    return new Promise<string | null>((resolve) => {
      setPromptValue('');
      resolverRef.current = (value) => resolve(typeof value === 'string' ? value : null);
      setState({
        mode: 'prompt',
        title: opts.title || 'Input required',
        message: opts.message,
        variant: opts.variant || 'danger',
        confirmLabel: opts.confirmLabel || 'Confirm',
        cancelLabel: opts.cancelLabel || 'Cancel',
        placeholder: opts.placeholder || '',
      });
    });
  }, []);

  const value = useMemo(() => ({ alert, confirm, prompt }), [alert, confirm, prompt]);
  const meta = variantMeta(state.variant);

  return (
    <DialogContext.Provider value={value}>
      {children}
      {state.mode && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 4000,
            background: 'rgba(8, 10, 20, 0.72)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => close(state.mode === 'prompt' ? null : false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 420,
              background: 'var(--db-card, #121528)',
              border: '1px solid var(--db-border, rgba(255,255,255,0.1))',
              borderRadius: 22,
              boxShadow: '0 28px 80px rgba(0,0,0,0.45)',
              overflow: 'hidden',
              animation: 'dialogPop 0.18s ease-out',
            }}
          >
            <div style={{ padding: '22px 22px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{
                  width: 46, height: 46, borderRadius: 14, flexShrink: 0,
                  background: meta.bg, color: meta.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {meta.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 900, fontSize: 18, color: 'var(--db-text, #fff)', letterSpacing: '-0.3px' }}>
                    {state.title}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 14, lineHeight: 1.55, color: 'var(--db-muted, #94a3b8)', fontWeight: 500, whiteSpace: 'pre-wrap' }}>
                    {state.message}
                  </div>
                  {state.mode === 'prompt' && (
                    <input
                      autoFocus
                      value={promptValue}
                      onChange={(e) => setPromptValue(e.target.value)}
                      placeholder={state.placeholder}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') close(promptValue);
                      }}
                      style={{
                        marginTop: 14, width: '100%', boxSizing: 'border-box',
                        padding: '11px 12px', borderRadius: 12,
                        border: '1px solid var(--db-border, rgba(255,255,255,0.12))',
                        background: 'var(--db-hover, rgba(255,255,255,0.04))',
                        color: 'var(--db-text, #fff)', fontSize: 14, fontWeight: 700,
                        outline: 'none', fontFamily: 'Outfit, sans-serif',
                      }}
                    />
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => close(state.mode === 'prompt' ? null : false)}
                style={{
                  width: 32, height: 32, borderRadius: 10, border: '1px solid var(--db-border, rgba(255,255,255,0.1))',
                  background: 'var(--db-hover, rgba(255,255,255,0.04))', color: 'var(--db-muted, #94a3b8)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>

            <div style={{ padding: '18px 22px 22px', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              {(state.mode === 'confirm' || state.mode === 'prompt') && (
                <button
                  type="button"
                  onClick={() => close(state.mode === 'prompt' ? null : false)}
                  style={{
                    padding: '11px 16px', borderRadius: 12, border: '1px solid var(--db-border, rgba(255,255,255,0.12))',
                    background: 'transparent', color: 'var(--db-text, #e2e8f0)', fontWeight: 750, fontSize: 13,
                    cursor: 'pointer', fontFamily: 'Outfit, sans-serif',
                  }}
                >
                  {state.cancelLabel}
                </button>
              )}
              <button
                type="button"
                onClick={() => close(state.mode === 'prompt' ? promptValue : true)}
                style={{
                  padding: '11px 18px', borderRadius: 12, border: 'none',
                  background: meta.btn, color: '#fff', fontWeight: 800, fontSize: 13,
                  cursor: 'pointer', fontFamily: 'Outfit, sans-serif',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.25)',
                }}
              >
                {state.confirmLabel}
              </button>
            </div>
          </div>

          <style>{`
            @keyframes dialogPop {
              from { opacity: 0; transform: translateY(8px) scale(0.98); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>
        </div>
      )}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used within DialogProvider');
  return ctx;
}
