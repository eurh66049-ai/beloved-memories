import React, { useEffect, useState } from 'react';
import AdsFeedbackDialog from './AdsFeedbackDialog';

const STORAGE_KEY = 'ads_feedback_submitted_v1';
const DELAY_MS = 1500; // 1.5s after page load (almost immediate)

const AdsFeedbackPrompt: React.FC = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let prior: string | null = null;
    try { prior = localStorage.getItem(STORAGE_KEY); } catch {}
    if (prior) return;

    const t = setTimeout(() => setOpen(true), DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  return <AdsFeedbackDialog open={open} onOpenChange={setOpen} />;
};

export default AdsFeedbackPrompt;
