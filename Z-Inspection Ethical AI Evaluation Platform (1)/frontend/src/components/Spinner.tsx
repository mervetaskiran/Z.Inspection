import React from 'react';

interface SpinnerProps {
  size?: number;
  strokeWidth?: number;
  className?: string;
}

/**
 * Animated green spinner component
 * Respects prefers-reduced-motion for accessibility
 */
export const Spinner: React.FC<SpinnerProps> = ({ 
  size = 20, 
  strokeWidth = 2.5,
  className = '' 
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * 0.75; // Start at 75% to create a gap

  return (
    <>
      <style>{`
        @keyframes spinner-rotate {
          to {
            transform: rotate(360deg);
          }
        }
        .spinner-arc {
          animation: spinner-rotate 1s linear infinite;
          transform-origin: center;
        }
        @media (prefers-reduced-motion: reduce) {
          .spinner-arc {
            animation: none;
          }
        }
      `}</style>
      <div 
        className={`inline-block ${className}`}
        role="status"
        aria-label="Loading"
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="block"
          aria-hidden="true"
        >
          {/* Background track (light green/gray) */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeOpacity={0.2}
            className="text-green-500"
          />
          {/* Animated arc (green) */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="text-green-500 spinner-arc"
          />
        </svg>
      </div>
    </>
  );
};

/**
 * Alternative CSS-only spinner (simpler, no SVG)
 */
export const SpinnerCSS: React.FC<SpinnerProps> = ({ 
  size = 20, 
  strokeWidth = 2.5,
  className = '' 
}) => {
  return (
    <div
      className={`spinner-css ${className}`}
      role="status"
      aria-label="Loading"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderWidth: `${strokeWidth}px`,
      }}
    />
  );
};

