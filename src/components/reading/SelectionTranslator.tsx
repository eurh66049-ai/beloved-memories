import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Languages, Loader2, X, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabaseFunctions } from '@/lib/supabaseClient';
import { toast } from 'sonner';

const LANGS: { code: string; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'de', label: 'Deutsch' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'it', label: 'Italiano' },
  { code: 'pt', label: 'Português' },
  { code: 'ru', label: 'Русский' },
  { code: 'zh', label: '中文' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'ur', label: 'اردو' },
  { code: 'fa', label: 'فارسی' },
];

const STORAGE_KEY = 'kotobi:translation-target-lang';

/**
 * مستمع لتحديد النص في القارئ → يعرض زر ترجمة فورية لأي لغة.
 * يلتقط `mouseup` و `touchend` عالمياً ويعرض نافذة منبثقة قرب النص.
 */
export const SelectionTranslator: React.FC = () => {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [open, setOpen] = useState(false);
  const [translation, setTranslation] = useState('');
  const [loading, setLoading] = useState(false);
  const [targetLang, setTargetLang] = useState<string>(() => {
    if (typeof window === 'undefined') return 'en';
    return localStorage.getItem(STORAGE_KEY) || 'en';
  });
  const [copied, setCopied] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, targetLang);
  }, [targetLang]);

  const captureSelection = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      setPosition(null);
      return;
    }
    const text = sel.toString().trim();
    if (text.length < 2 || text.length > 4000) {
      setPosition(null);
      return;
    }
    // لا تظهر داخل المدخلات
    const node = sel.anchorNode as HTMLElement | null;
    const el = node?.nodeType === 1 ? node : node?.parentElement;
    if (el?.closest('input, textarea, [contenteditable="true"], [data-no-translate]')) {
      return;
    }
    try {
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;
      setSelectedText(text);
      setPosition({
        x: Math.min(window.innerWidth - 60, Math.max(40, rect.left + rect.width / 2)),
        y: Math.max(60, rect.top - 8),
      });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const onUp = () => setTimeout(captureSelection, 10);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchend', onUp);
    return () => {
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchend', onUp);
    };
  }, [captureSelection]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
        setTranslation('');
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const translate = async (lang?: string) => {
    const useLang = lang || targetLang;
    if (!selectedText) return;
    setLoading(true);
    setOpen(true);
    setTranslation('');
    try {
      const { data, error } = await supabaseFunctions.functions.invoke('translate-text', {
        body: { text: selectedText, targetLang: useLang },
      });
      if (error) throw error;
      setTranslation(data?.translation || '');
    } catch (err: any) {
      console.error('translate error:', err);
      toast.error(err?.message || 'تعذرت الترجمة');
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const copyTranslation = async () => {
    if (!translation) return;
    try {
      await navigator.clipboard.writeText(translation);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('تعذر النسخ');
    }
  };

  if (!position) return null;

  return (
    <>
      {/* الزر العائم */}
      {!open && (
        <button
          onClick={() => translate()}
          data-no-translate
          className="fixed z-[60] -translate-x-1/2 -translate-y-full bg-primary text-primary-foreground rounded-full shadow-lg px-3 py-1.5 text-xs font-cairo font-bold flex items-center gap-1 hover:scale-105 transition-transform"
          style={{ left: position.x, top: position.y }}
        >
          <Languages className="h-3.5 w-3.5" />
          ترجم
        </button>
      )}

      {/* نافذة الترجمة */}
      {open && (
        <div
          ref={popoverRef}
          data-no-translate
          dir="rtl"
          className="fixed z-[70] -translate-x-1/2 bg-card border border-border rounded-2xl shadow-2xl p-3 w-[320px] max-w-[92vw]"
          style={{
            left: Math.min(window.innerWidth - 170, Math.max(170, position.x)),
            top: Math.min(window.innerHeight - 280, position.y + 10),
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-primary font-cairo">
              <Languages className="h-3.5 w-3.5" />
              ترجمة فورية
            </div>
            <button
              onClick={() => { setOpen(false); setTranslation(''); }}
              className="p-1 rounded-md hover:bg-muted"
              aria-label="إغلاق"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <select
            value={targetLang}
            onChange={(e) => { setTargetLang(e.target.value); translate(e.target.value); }}
            className="w-full mb-2 text-xs font-cairo bg-muted/50 rounded-lg px-2 py-1.5 border-0 focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={loading}
          >
            {LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>

          <div className="text-[10px] text-muted-foreground font-cairo mb-1 line-clamp-2 opacity-70">
            "{selectedText.slice(0, 100)}{selectedText.length > 100 ? '...' : ''}"
          </div>

          <div className="bg-muted/40 rounded-lg p-2 min-h-[60px] max-h-[180px] overflow-y-auto text-sm font-cairo leading-relaxed">
            {loading ? (
              <div className="flex items-center justify-center py-4 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : translation ? (
              <p>{translation}</p>
            ) : (
              <p className="text-muted-foreground text-xs">جاري التحضير...</p>
            )}
          </div>

          {translation && !loading && (
            <Button
              onClick={copyTranslation}
              size="sm"
              variant="ghost"
              className="w-full mt-2 h-7 text-xs font-cairo gap-1"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? 'تم النسخ' : 'نسخ الترجمة'}
            </Button>
          )}
        </div>
      )}
    </>
  );
};

export default SelectionTranslator;
