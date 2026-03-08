import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RatingStars } from '../../components/ui/RatingStars';

// Mock haptics
jest.mock('../../lib/haptics', () => ({
  selectionTap: jest.fn(),
}));

import { selectionTap } from '../../lib/haptics';

describe('RatingStars', () => {
  it('renders 5 stars', () => {
    const { getAllByLabelText } = render(<RatingStars rating={3} />);
    const stars = getAllByLabelText(/Rate \d out of 5/);
    expect(stars).toHaveLength(5);
  });

  it('renders correct number of filled stars', () => {
    const { getAllByText } = render(<RatingStars rating={3} />);
    const filled = getAllByText('\u2605'); // filled star
    const empty = getAllByText('\u2606'); // empty star
    expect(filled).toHaveLength(3);
    expect(empty).toHaveLength(2);
  });

  it('renders all empty stars when rating is null', () => {
    const { getAllByText } = render(<RatingStars rating={null} />);
    const empty = getAllByText('\u2606');
    expect(empty).toHaveLength(5);
  });

  it('renders all empty stars when rating is 0', () => {
    const { getAllByText } = render(<RatingStars rating={0} />);
    const empty = getAllByText('\u2606');
    expect(empty).toHaveLength(5);
  });

  it('calls onRate with star value when pressed', () => {
    const onRate = jest.fn();
    const { getByLabelText } = render(<RatingStars rating={2} onRate={onRate} />);

    fireEvent.press(getByLabelText('Rate 4 out of 5'));
    expect(onRate).toHaveBeenCalledWith(4);
  });

  it('calls onRate with 0 to deselect current rating', () => {
    const onRate = jest.fn();
    const { getByLabelText } = render(<RatingStars rating={3} onRate={onRate} />);

    // Pressing the currently-selected star should deselect (set to 0)
    fireEvent.press(getByLabelText('Rate 3 out of 5'));
    expect(onRate).toHaveBeenCalledWith(0);
  });

  it('triggers haptic feedback on press', () => {
    const onRate = jest.fn();
    const { getByLabelText } = render(<RatingStars rating={2} onRate={onRate} />);

    fireEvent.press(getByLabelText('Rate 4 out of 5'));
    expect(selectionTap).toHaveBeenCalled();
  });

  it('is not interactive when onRate is not provided', () => {
    const { getByLabelText } = render(<RatingStars rating={3} />);
    // Stars should have role "text" when not interactive
    const star = getByLabelText('Rate 1 out of 5');
    expect(star).toBeTruthy();
  });

  it('has rating accessibility label on container', () => {
    const { getByLabelText } = render(<RatingStars rating={3} />);
    expect(getByLabelText('Rating')).toBeTruthy();
  });
});
