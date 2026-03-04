import { ArrowRight } from 'lucide-react';
import ScrambledText from './ScrambledText';

type Page = 'history' | 'dashboard' | 'weekly';

const PAGE_DESC: Record<Page, string> = {
  history: 'Your past check-ins and daily reflections',
  dashboard: 'Your streaks, energy levels and follow-through rates',
  weekly: 'Your AI-generated weekly summaries and insights',
};

export default function LockedOverlay({
  page,
  onSignIn,
}: {
  page: Page;
  onSignIn: () => void;
}) {
  return (
    <div className="locked-fullscreen">
      <div className="locked-content">
        <ScrambledText
          radius={120}
          duration={1.2}
          speed={0.5}
          scrambleChars=".:"
          className="locked-line-primary"
        >
          Private information...
        </ScrambledText>
        <ScrambledText
          radius={120}
          duration={1.0}
          speed={0.4}
          scrambleChars=".:"
          className="locked-line-secondary"
        >
          {PAGE_DESC[page]}
        </ScrambledText>
        <button className="btn-get-started locked-signin-btn" onClick={onSignIn}>
          Sign in
          <ArrowRight size={15} className="btn-get-started-arrow" />
        </button>
      </div>
    </div>
  );
}
