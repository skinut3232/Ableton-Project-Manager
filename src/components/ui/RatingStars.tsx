interface RatingStarsProps {
  rating: number | null;
  onChange?: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md';
}

export function RatingStars({ rating, onChange, readonly = false, size = 'sm' }: RatingStarsProps) {
  const sizeClass = size === 'sm' ? 'text-sm' : 'text-lg';
  return (
    <div className={`flex gap-0.5 ${sizeClass}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star === rating ? 0 : star)}
          className={`${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform ${
            rating && star <= rating ? 'text-yellow-400' : 'text-neutral-600'
          }`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
