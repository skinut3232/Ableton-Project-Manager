import React from 'react';
import { render } from '@testing-library/react-native';
import { StatusBadge } from '../../components/ui/StatusBadge';

// Mock constants
jest.mock('../../lib/constants', () => ({
  STATUS_COLORS: {
    Idea: '#3b82f6',
    Writing: '#8b5cf6',
    Recording: '#22c55e',
    Mix: '#eab308',
    Master: '#ef4444',
    Done: '#10b981',
  },
  STATUS_BG_COLORS: {
    Idea: '#3b82f620',
    Writing: '#8b5cf620',
    Recording: '#22c55e20',
    Mix: '#eab30820',
    Master: '#ef444420',
    Done: '#10b98120',
  },
}));

describe('StatusBadge', () => {
  it('renders the status text', () => {
    const { getByText } = render(<StatusBadge status="Mix" />);
    expect(getByText('Mix')).toBeTruthy();
  });

  it('has accessibility label with status', () => {
    const { getByLabelText } = render(<StatusBadge status="Recording" />);
    expect(getByLabelText('Status: Recording')).toBeTruthy();
  });

  it('has accessibility role of text', () => {
    const { getByRole } = render(<StatusBadge status="Idea" />);
    expect(getByRole('text')).toBeTruthy();
  });

  it('renders in small variant', () => {
    const { getByText } = render(<StatusBadge status="Done" small />);
    expect(getByText('Done')).toBeTruthy();
  });
});
