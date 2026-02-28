import { useState } from 'react';
import { openUrl } from '@tauri-apps/plugin-opener';
import { Button } from '../ui/Button';
import { useActivateLicense } from '../../hooks/useLicense';
import type { LicenseInfo } from '../../types';

interface ActivationScreenProps {
  license: LicenseInfo;
}

/**
 * Full-screen activation UI shown when trial has expired or license is invalid.
 * Provides a license key input, activation button, and link to purchase.
 */
export function ActivationScreen({ license }: ActivationScreenProps) {
  const [key, setKey] = useState('');
  const activate = useActivateLicense();

  const handleActivate = () => {
    const trimmed = key.trim();
    if (!trimmed) return;
    activate.mutate(trimmed);
  };

  const handleBuyNow = () => {
    if (license.checkout_url) {
      openUrl(license.checkout_url);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleActivate();
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-bg-primary">
      <div className="w-full max-w-md rounded-xl border border-border-default bg-bg-secondary p-8 shadow-2xl">
        {/* Logo */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-text-primary font-brand">SetCrate</h1>
          <p className="text-sm text-text-muted mt-1">
            {license.status === 'TrialExpired'
              ? 'Your free trial has ended'
              : 'Your license is no longer valid'}
          </p>
        </div>

        {/* License key input */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              License Key
            </label>
            <input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter your license key..."
              className="w-full rounded-lg border border-border-default bg-bg-elevated px-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              autoFocus
            />
          </div>

          {/* Error message */}
          {activate.isError && (
            <p className="text-sm text-red-400">
              {String(activate.error)}
            </p>
          )}

          {/* Activate button */}
          <Button
            onClick={handleActivate}
            disabled={!key.trim() || activate.isPending}
            className="w-full"
          >
            {activate.isPending ? 'Activating...' : 'Activate License'}
          </Button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border-default" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-bg-secondary px-2 text-text-muted">or</span>
            </div>
          </div>

          {/* Buy Now button */}
          {license.checkout_url && (
            <Button
              variant="secondary"
              onClick={handleBuyNow}
              className="w-full"
            >
              Buy License
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
