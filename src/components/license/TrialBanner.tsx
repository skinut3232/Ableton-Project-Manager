import { openUrl } from '@tauri-apps/plugin-opener';
import { useLicenseStatus } from '../../hooks/useLicense';

/**
 * Thin banner shown above the main content area during an active trial.
 * Displays days remaining and a "Buy Now" link.
 */
export function TrialBanner() {
  const { data: license } = useLicenseStatus();

  // Only show during active trial
  if (!license || license.status !== 'TrialActive') {
    return null;
  }

  const days = license.days_remaining ?? 0;

  const handleBuy = () => {
    if (license.checkout_url) {
      openUrl(license.checkout_url);
    }
  };

  return (
    <div className="flex items-center justify-center gap-3 bg-brand-900/60 border-b border-brand-700/40 px-4 py-1.5 text-xs">
      <span className="text-brand-200">
        {days} day{days !== 1 ? 's' : ''} left in your free trial
      </span>
      {license.checkout_url && (
        <button
          onClick={handleBuy}
          className="rounded px-2 py-0.5 text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 transition-colors"
        >
          Buy Now
        </button>
      )}
    </div>
  );
}
