// src/components/RatingDisplay.jsx
import { Star } from 'lucide-react';

const RatingDisplay = ({ rating = 0, size = 'md', showNumber = true }) => {
  const sizes = {
    sm: { star: 16, text: 'text-sm' },
    md: { star: 20, text: 'text-base' },
    lg: { star: 24, text: 'text-lg' }
  };
  
  const { star: starSize, text: textSize } = sizes[size] || sizes.md;
  
  return (
    <div className="flex items-center gap-2">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={starSize}
            className={`${star <= Math.round(rating) 
              ? 'text-yellow-500 fill-current' 
              : 'text-gray-300'
            }`}
          />
        ))}
      </div>
      
      {showNumber && (
        <span className={`${textSize} font-semibold text-gray-800`}>
          {typeof rating === 'number' ? rating.toFixed(1) : '0.0'}
        </span>
      )}
    </div>
  );
};

export default RatingDisplay;