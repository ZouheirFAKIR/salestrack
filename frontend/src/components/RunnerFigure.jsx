function RunnerFigure({ color = '#f86635', size = 40, victory = false, delay = 0 }) {
  return (
    <svg viewBox="0 0 40 62" width={size} height={size * 1.55} style={{ overflow: 'visible' }}>
      <ellipse cx="20" cy="58" rx="10" ry="2.5" fill="rgba(0,0,0,0.25)" />

      {!victory ? (
        <g style={{ animationDelay: `${delay}s` }} className="runner-cycle">
          <rect className="leg leg-back" x="16" y="34" width="5" height="17" rx="2.5" fill="#1a202c" style={{ transformOrigin: '18.5px 34px' }} />
          <rect className="leg leg-front" x="20" y="34" width="5" height="17" rx="2.5" fill="#2d3748" style={{ transformOrigin: '22.5px 34px' }} />
          <rect className="arm arm-back" x="10" y="20" width="4.5" height="14" rx="2.2" fill="#f2c9a1" style={{ transformOrigin: '12.3px 20px' }} />
          <rect x="14" y="17" width="12" height="19" rx="5" fill={color} />
          <rect className="arm arm-front" x="25" y="20" width="4.5" height="14" rx="2.2" fill="#f2c9a1" style={{ transformOrigin: '27.3px 20px' }} />
          <circle cx="20" cy="10" r="7.5" fill="#f2c9a1" />
          <path d="M13 8 Q20 -2 27 8 Q27 3 20 2 Q13 3 13 8Z" fill="#2d1b0e" />
        </g>
      ) : (
        <g>
          <rect x="7" y="14" width="4.5" height="14" rx="2.2" fill="#f2c9a1" transform="rotate(-50 9 28)" />
          <rect x="14" y="17" width="12" height="19" rx="5" fill={color} />
          <rect x="28" y="14" width="4.5" height="14" rx="2.2" fill="#f2c9a1" transform="rotate(50 30 28)" />
          <rect x="16" y="34" width="5" height="17" rx="2.5" fill="#1a202c" />
          <rect x="20" y="34" width="5" height="17" rx="2.5" fill="#2d3748" />
          <circle cx="20" cy="10" r="7.5" fill="#f2c9a1" />
          <path d="M13 8 Q20 -2 27 8 Q27 3 20 2 Q13 3 13 8Z" fill="#2d1b0e" />
        </g>
      )}
    </svg>
  );
}

export default RunnerFigure;