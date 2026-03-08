import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { EmptyState } from '../../components/ui/EmptyState';

describe('EmptyState', () => {
  it('renders title', () => {
    const { getByText } = render(<EmptyState title="No items" />);
    expect(getByText('No items')).toBeTruthy();
  });

  it('renders optional message', () => {
    const { getByText } = render(
      <EmptyState title="No items" message="Try adding some" />
    );
    expect(getByText('Try adding some')).toBeTruthy();
  });

  it('does not render message when not provided', () => {
    const { queryByText } = render(<EmptyState title="No items" />);
    expect(queryByText('Try adding some')).toBeNull();
  });

  it('renders action button when actionLabel and onAction provided', () => {
    const onAction = jest.fn();
    const { getByText } = render(
      <EmptyState title="Error" actionLabel="Retry" onAction={onAction} />
    );

    const button = getByText('Retry');
    expect(button).toBeTruthy();

    fireEvent.press(button);
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('does not render action button without onAction', () => {
    const { queryByText } = render(
      <EmptyState title="Error" actionLabel="Retry" />
    );
    expect(queryByText('Retry')).toBeNull();
  });

  it('does not render action button without actionLabel', () => {
    const onAction = jest.fn();
    const { queryByText } = render(
      <EmptyState title="Error" onAction={onAction} />
    );
    // No button should be rendered
    expect(queryByText('Retry')).toBeNull();
  });

  it('defaults to empty variant', () => {
    const { getByText } = render(<EmptyState title="No items" />);
    // The title should render without error styling
    const title = getByText('No items');
    expect(title).toBeTruthy();
  });

  it('accepts error variant', () => {
    const { getByText } = render(
      <EmptyState title="Failed" variant="error" />
    );
    expect(getByText('Failed')).toBeTruthy();
  });
});
