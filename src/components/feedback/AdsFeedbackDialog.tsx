import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { MegaphoneIcon, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

const STORAGE_KEY = 'ads_feedback_submitted_v1';

const IMPACT_OPTIONS = [
  { value: 'no_impact', label: 'لا تؤثر إطلاقاً 👍' },
  { value: 'slight', label: 'تأثير بسيط ومقبول' },
  { value: 'moderate', label: 'تأثير متوسط' },
  { value: 'heavy', label: 'تأثير كبير ومزعج' },
  { value: 'unusable', label: 'تعيقني عن استخدام الموقع 😣' },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const AdsFeedbackDialog: React.FC<Props> = ({ open, onOpenChange }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [impactLevel, setImpactLevel] = useState<string>('');
  const [affectsReading, setAffectsReading] = useState(false);
  const [affectsBrowsing, setAffectsBrowsing] = useState(false);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!impactLevel) {
      toast({ title: 'يرجى اختيار مستوى التأثير', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('ads_feedback').insert({
      user_id: user?.id || null,
      user_email: user?.email || null,
      user_name: (user?.user_metadata as any)?.full_name || (user?.user_metadata as any)?.name || null,
      impact_level: impactLevel,
      affects_reading: affectsReading,
      affects_browsing: affectsBrowsing,
      comment: comment.trim() || null,
    });
    setSubmitting(false);

    if (error) {
      toast({ title: 'تعذر إرسال رأيك', description: error.message, variant: 'destructive' });
      return;
    }
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch {}
    toast({ title: 'شكراً لك! 🙏', description: 'تم استلام رأيك وسيساعدنا في تحسين الموقع.' });
    onOpenChange(false);
  };

  const handleDismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, 'dismissed'); } catch {}
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1.5rem)] max-w-md max-h-[58dvh] overflow-y-auto top-auto bottom-[4.5rem] translate-y-0 gap-1 p-3 sm:top-[50%] sm:bottom-auto sm:max-h-[80vh] sm:translate-y-[-50%] sm:rounded-lg" dir="rtl">
        <DialogHeader className="sticky top-0 bg-background pb-2 -mx-3 px-3 pt-1 z-10 border-b">
          <DialogTitle className="flex items-center gap-2 text-right pr-6 text-sm leading-5">
            <MegaphoneIcon className="h-4 w-4 text-primary shrink-0" />
            <span>هل تؤثر الإعلانات الجديدة على تجربتك؟</span>
          </DialogTitle>
          <DialogDescription className="text-right text-xs leading-5">
            رأيك يهمنا لتحسين جودة التصفح وقراءة الكتب.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5 py-1">
          <div>
            <Label className="text-xs font-semibold mb-1 block">ما مدى تأثير الإعلانات عليك؟</Label>
            <RadioGroup value={impactLevel} onValueChange={setImpactLevel}>
              {IMPACT_OPTIONS.map((opt) => (
                <div key={opt.value} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/50 cursor-pointer" onClick={() => setImpactLevel(opt.value)}>
                  <RadioGroupItem value={opt.value} id={opt.value} />
                  <Label htmlFor={opt.value} className="cursor-pointer flex-1 text-right text-xs leading-5">{opt.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold block">أين تلاحظ التأثير؟ (اختياري)</Label>
            <div className="flex items-center gap-2 py-1 px-2">
              <Checkbox id="reading" checked={affectsReading} onCheckedChange={(v) => setAffectsReading(!!v)} />
              <Label htmlFor="reading" className="cursor-pointer text-xs">📖 أثناء قراءة الكتب</Label>
            </div>
            <div className="flex items-center gap-2 py-1 px-2">
              <Checkbox id="browsing" checked={affectsBrowsing} onCheckedChange={(v) => setAffectsBrowsing(!!v)} />
              <Label htmlFor="browsing" className="cursor-pointer text-xs">🌐 أثناء تصفح الموقع</Label>
            </div>
          </div>

          <div>
            <Label htmlFor="comment" className="text-xs font-semibold mb-1 block">ملاحظة إضافية (اختياري)</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="أخبرنا بمزيد من التفاصيل..."
              maxLength={1000}
              rows={2}
              className="min-h-[3rem] text-xs"
            />
          </div>
        </div>

        <DialogFooter className="flex-row gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={handleDismiss} disabled={submitting}>لاحقاً</Button>
          <Button size="sm" onClick={handleSubmit} disabled={submitting || !impactLevel} className="flex-1">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
            إرسال رأيي
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdsFeedbackDialog;
