import * as React from 'react'

export const LogoIcon = ({ className = 'h-7 w-7' }) => {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Corner Brackets */}
      {/* Top Left */}
      <path
        d="M 20,40 L 20,28 C 20,23.5 23.5,20 28,20 L 40,20"
        stroke="#4ade80"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Top Right */}
      <path
        d="M 60,20 L 72,20 C 76.5,20 80,23.5 80,28 L 80,40"
        stroke="#4ade80"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Bottom Right */}
      <path
        d="M 80,60 L 80,72 C 80,76.5 76.5,80 72,80 L 60,80"
        stroke="#4ade80"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Bottom Left */}
      <path
        d="M 40,80 L 28,80 C 23.5,80 20,76.5 20,72 L 20,60"
        stroke="#4ade80"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Center Cross 'X' */}
      <path
        d="M 36,36 L 64,64"
        stroke="#4ade80"
        strokeWidth="11"
        strokeLinecap="round"
      />
      <path
        d="M 64,36 L 36,64"
        stroke="#4ade80"
        strokeWidth="11"
        strokeLinecap="round"
      />
    </svg>
  )
}

const ZeltxxLogo = ({ showText = true, iconSize = 'h-7 w-7', textSize = 'text-xl' }) => {
  return (
    <div className="flex items-center gap-2.5">
      <LogoIcon className={iconSize} />
      {showText && (
        <span className={`font-bold tracking-tight text-white ${textSize}`}>
          zeltxx
        </span>
      )}
    </div>
  )
}

export default ZeltxxLogo
