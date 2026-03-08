import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { SearchBar } from '../../components/library/SearchBar';

// Use fake timers for debounce testing
jest.useFakeTimers();

describe('SearchBar', () => {
  it('renders with placeholder text', () => {
    const { getByPlaceholderText } = render(
      <SearchBar value="" onChangeText={jest.fn()} />
    );
    expect(getByPlaceholderText('Search projects...')).toBeTruthy();
  });

  it('displays the current value', () => {
    const { getByDisplayValue } = render(
      <SearchBar value="test query" onChangeText={jest.fn()} />
    );
    expect(getByDisplayValue('test query')).toBeTruthy();
  });

  it('debounces onChangeText calls', () => {
    const onChangeText = jest.fn();
    const { getByPlaceholderText } = render(
      <SearchBar value="" onChangeText={onChangeText} debounceMs={300} />
    );

    const input = getByPlaceholderText('Search projects...');
    fireEvent.changeText(input, 'hello');

    // Should not have been called yet
    expect(onChangeText).not.toHaveBeenCalled();

    // Advance timers past debounce
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(onChangeText).toHaveBeenCalledWith('hello');
    expect(onChangeText).toHaveBeenCalledTimes(1);
  });

  it('shows clear button when value is non-empty', () => {
    const { getByLabelText } = render(
      <SearchBar value="test" onChangeText={jest.fn()} />
    );
    expect(getByLabelText('Clear search')).toBeTruthy();
  });

  it('does not show clear button when value is empty', () => {
    const { queryByLabelText } = render(
      <SearchBar value="" onChangeText={jest.fn()} />
    );
    expect(queryByLabelText('Clear search')).toBeNull();
  });

  it('clears the input immediately when clear is pressed', () => {
    const onChangeText = jest.fn();
    const { getByLabelText } = render(
      <SearchBar value="test" onChangeText={onChangeText} />
    );

    fireEvent.press(getByLabelText('Clear search'));

    // Clear should call onChangeText immediately (no debounce)
    expect(onChangeText).toHaveBeenCalledWith('');
  });

  it('has search accessibility role on input', () => {
    const { getByRole } = render(
      <SearchBar value="" onChangeText={jest.fn()} />
    );
    expect(getByRole('search')).toBeTruthy();
  });
});
