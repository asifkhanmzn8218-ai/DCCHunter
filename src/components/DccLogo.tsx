interface Props {
  size?: number;
  showText?: boolean;
  className?: string;
}

export function DccLogo({ size = 44, showText = true, className = "" }: Props) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        className="shrink-0 drop-shadow-[0_0_10px_rgba(79,216,255,0.55)]"
        aria-label="DCC logo"
      >
        <defs>
          <linearGradient id="dccg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7ee9ff" />
            <stop offset="100%" stopColor="#2b9fd8" />
          </linearGradient>
        </defs>
        <polygon
          points="50,4 91,27 91,73 50,96 9,73 9,27"
          fill="#0b1524"
          stroke="url(#dccg)"
          strokeWidth="4"
        />
        <polygon
          points="50,15 81,33 81,67 50,85 19,67 19,33"
          fill="none"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="1.6"
        />
        <text
          x="50"
          y="56"
          textAnchor="middle"
          fontFamily='"Special Elite", monospace'
          fontSize="27"
          fill="#eaf6ff"
          letterSpacing="1"
        >
          DCC
        </text>
        <text
          x="50"
          y="72"
          textAnchor="middle"
          fontFamily='"Special Elite", monospace'
          fontSize="9"
          fill="#7ee9ff"
        >
          UNIT 7
        </text>
      </svg>
      {showText && (
        <div className="text-left leading-tight">
          <div className="font-type text-[11px] sm:text-xs tracking-[0.3em] text-[#cfe9f8]">
            DIGITAL CAREER
          </div>
          <div className="font-type text-[11px] sm:text-xs tracking-[0.3em] text-[#4fd8ff] glow-ecto">
            CENTER
          </div>
        </div>
      )}
    </div>
  );
}
