import React, { useState } from 'react';
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
const MAX_LEN = 3500;

interface Props {
  /** Async fetcher that returns the current page text */
  getPageText: () => Promise<string>;
  currentPage?: number;
}

/**
 * زر ترجمة عائم داخل قارئ PDF.
 * يستخرج نص الصفحة الحالية ويترجمها لأي لغة (لأن قارئ pdf.js يرسم في canvas
 * ولا يمكن تحديد النص مباشرة).
 */
export const PageTranslator: React.FC<Props> = ({ getPageText, currentPage }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sourceText, setSourceText] = useState('');
  const [translation, setTranslation] = useState('');
  const [copied, setCopied] = useState(false);
  const [targetLang, setTargetLang] = useState<string>(() => {
    if (typeof window === 'undefined') return 'en';
    return localStorage.getItem(STORAGE_KEY) || 'en';
  });

  const translate = async (lang: string, text: string) => {
    if (!text || text.trim().length < 2) {
      toast.error('لا يوجد نص قابل للترجمة في هذه الصفحة');
      return;
    }
    setLoading(true);
    setTranslation('');
    try {
      const { data, error } = await supabaseFunctions.functions.invoke('translate-text', {
        body: { text: text.slice(0, MAX_LEN), targetLang: lang },
      });
      if (error) throw error;
      setTranslation(data?.translation || '');
    } catch (err: any) {
      console.error('translate error:', err);
      toast.error(err?.message || 'تعذرت الترجمة');
    } finally {
      setLoading(false);
    }
  };

  const openAndTranslate = async () => {
    setOpen(true);
    setTranslation('');
    setLoading(true);
    try {
      const text = await getPageText();
      const clean = text.replace(/\n---\s*صفحة\s+\d+\s*---\n/g, '').trim();
      setSourceText(clean);
      await translate(targetLang, clean);
    } catch (err: any) {
      console.error(err);
      toast.error('تعذر استخراج نص الصفحة');
      setLoading(false);
    }
  };

  const onLangChange = (lang: string) => {
    setTargetLang(lang);
    localStorage.setItem(STORAGE_KEY, lang);
    if (sourceText) translate(lang, sourceText);
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

  return (
    <>
      {/* الزر العائم */}
      <button
        onClick={openAndTranslate}
        aria-label="ترجمة الصفحة"
        className="fixed bottom-24 left-4 z-40 bg-primary text-primary-foreground rounded-full shadow-xl h-12 w-12 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
        title="ترجمة الصفحة الحالية"
      >
        <Languages className="h-5 w-5" />
      </button>

      {/* لوحة الترجمة */}
      {open && (
        <div
          dir="rtl"
          className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[85vh] flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2 font-bold text-primary font-cairo">
                <Languages className="h-4 w-4" />
                ترجمة الصفحة {currentPage ? `(${currentPage})` : ''}
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-md hover:bg-muted"
                aria-label="إغلاق"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto flex-1">
              <div>
                <label className="text-xs font-cairo text-muted-foreground mb-1 block">
                  ترجم إلى:
                </label>
                <select
                  value={targetLang}
                  onChange={(e) => onLangChange(e.target.value)}
                  className="w-full text-sm font-cairo bg-muted/50 rounded-lg px-3 py-2 border-0 focus:outline-none focus:ring-1 focus:ring-primary"
                  disabled={loading}
                >
                  {LANGS.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="text-xs font-cairo text-muted-foreground mb-1">الترجمة:</div>
                <div className="bg-muted/40 rounded-lg p-3 min-h-[120px] max-h-[40vh] overflow-y-auto text-sm font-cairo leading-relaxed">
                  {loading ? (
                    <div className="flex items-center justify-center py-6 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  ) : translation ? (
                    <p className="whitespace-pre-wrap">{translation}</p>
                  ) : (
                    <p className="text-muted-foreground text-xs">لا توجد ترجمة بعد.</p>
                  )}
                </div>
              </div>

              {sourceText && (
                <details className="text-xs font-cairo text-muted-foreground">
                  <summary className="cursor-pointer">عرض النص الأصلي</summary>
                  <div className="mt-2 bg-muted/30 rounded-lg p-2 max-h-32 overflow-y-auto whitespace-pre-wrap">
                    {sourceText.slice(0, MAX_LEN)}
                    {sourceText.length > MAX_LEN && '…'}
                  </div>
                </details>
              )}
            </div>

            {translation && !loading && (
              <div className="p-3 border-t border-border">
                <Button
                  onClick={copyTranslation}
                  size="sm"
                  variant="outline"
                  className="w-full font-cairo gap-2"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'تم النسخ' : 'نسخ الترجمة'}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default PageTranslator;
