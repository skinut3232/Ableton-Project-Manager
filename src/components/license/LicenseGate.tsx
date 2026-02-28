import { ReactNode } from 'react';
import { useLicenseStatus } from '../../hooks/useLicense';
import { ActivationScreen } from './ActivationScreen';

interface LicenseGateProps {
  children: ReactNode;
}

/**
 * Top-level wrapper that checks license status on mount.
 * If the trial has expired or the license is invalid, shows the activation screen
 * instead of the app. Otherwise, renders children normally.
 */
export function LicenseGate({ children }: LicenseGateProps) {
  const { data: license, isLoading } = useLicenseStatus();

  // Show a minimal loading state while checking license
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-primary">
        <div className="text-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent mx-auto mb-3" />
          <p className="text-sm text-text-muted">Checking license...</p>
        </div>
      </div>
    );
  }

  // If license check failed entirely, let the user through (fail-open for usability)
  if (!license) {
    return <>{children}</>;
  }

  // Block access if trial expired or license expired
  if (license.status === 'TrialExpired' || license.status === 'Expired') {
    return <ActivationScreen license={license} />;
  }

  // Trial active, activated, or offline grace — let them through
  return <>{children}</>;
}
