import { useState } from 'react';
import { openUrl } from '@tauri-apps/plugin-opener';
import { Button } from '../ui/Button';
import { useLicenseStatus, useActivateLicense, useDeactivateLicense } from '../../hooks/useLicense';

/**
 * License management section for the Settings view.
 * Shows current status and provides activation/deactivation controls.
 */
export function LicenseSettings() {
  const { data: license, isLoading } = useLicenseStatus();
  const activate = useActivateLicense();
  const deactivate = useDeactivateLicense();
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [key, setKey] = useState('');

  if (isLoading || !license) return null;

  const handleActivate = () => {
    const trimmed = key.trim();
    if (!trimmed) return;
    activate.mutate(trimmed, {
      onSuccess: () => {
        setKey('');
        setShowKeyInput(false);
      },
    });
  };

  const handleDeactivate = () => {
    deactivate.mutate();
  };

  const handleBuy = () => {
    if (license.checkout_url) {
      openUrl(license.checkout_url);
    }
  };

  // Status display text and color
  const statusDisplay: Record<string, { label: string; color: string }> = {
    TrialActive: { label: 'Free Trial', color: 'text-brand-400' },
    TrialExpired: { label: 'Trial Expired', color: 'text-red-400' },
    Activated: { label: 'Licensed', color: 'text-green-400' },
    Expired: { label: 'License Expired', color: 'text-red-400' },
    OfflineGrace: { label: 'Offline (Grace Period)', color: 'text-yellow-400' },
  };

  const { label, color } = statusDisplay[license.status] ?? { label: 'Unknown', color: 'text-text-muted' };

  return (
    <div className="space-y-3">
      {/* Current status */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-text-secondary">Status:</span>
        <span className={`text-sm font-medium ${color}`}>{label}</span>
      </div>

      {/* Trial info */}
      {license.status === 'TrialActive' && license.days_remaining != null && (
        <p className="text-xs text-text-muted">
          {license.days_remaining} day{license.days_remaining !== 1 ? 's' : ''} remaining in your free trial.
        </p>
      )}

      {/* Offline grace info */}
      {license.status === 'OfflineGrace' && license.days_remaining != null && (
        <p className="text-xs text-yellow-400/80">
          Last verified {7 - license.days_remaining} day{7 - license.days_remaining !== 1 ? 's' : ''} ago.
          Connect to the internet to re-validate your license.
        </p>
      )}

      {/* Activated: show masked key + deactivate */}
      {license.status === 'Activated' && (
        <div className="space-y-2">
          {license.license_key_masked && (
            <p className="text-xs text-text-muted font-mono">{license.license_key_masked}</p>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDeactivate}
            disabled={deactivate.isPending}
          >
            {deactivate.isPending ? 'Deactivating...' : 'Deactivate License'}
          </Button>
        </div>
      )}

      {/* Trial or expired: show enter key / buy options */}
      {(license.status === 'TrialActive' || license.status === 'TrialExpired' || license.status === 'Expired') && (
        <div className="space-y-2">
          {!showKeyInput ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowKeyInput(true)}
                className="text-xs text-brand-400 hover:text-brand-300"
              >
                Enter License Key
              </button>
              {license.checkout_url && (
                <>
                  <span className="text-text-muted text-xs">|</span>
                  <button
                    onClick={handleBuy}
                    className="text-xs text-brand-400 hover:text-brand-300"
                  >
                    Buy License
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleActivate()}
                  placeholder="License key..."
                  className="flex-1 rounded-lg border border-border-default bg-bg-elevated px-3 py-1.5 text-xs text-text-primary placeholder-text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  autoFocus
                />
                <Button
                  size="sm"
                  onClick={handleActivate}
                  disabled={!key.trim() || activate.isPending}
                >
                  {activate.isPending ? '...' : 'Activate'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setShowKeyInput(false); setKey(''); }}
                >
                  Cancel
                </Button>
              </div>
              {activate.isError && (
                <p className="text-xs text-red-400">{String(activate.error)}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
