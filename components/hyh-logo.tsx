"use client"

import Image from 'next/image';

interface HYHLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export function HYHLogo({ className = "", size = 120, showText = true }: HYHLogoProps) {
  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <div style={{ width: size, height: size, position: 'relative' }}>
        <Image
          src="/HYHLogoimage.jpg"
          alt="Handle Your House Logo"
          fill
          sizes="(max-width: 768px) 100px, (max-width: 1200px) 150px, 200px"
          style={{ objectFit: 'contain' }}
          className="rounded-lg drop-shadow-md"
          priority
        />
      </div>

      {showText && (
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#1e3a4c] tracking-tight">
            Handle Your House
          </h1>
          <p className="text-xsm ext-[#8B7355] font-medium tracking-wide">
            by Agape Country Farms
          </p>
        </div>
      )}
    </div>
  );
}

export function HYHIcon({ className = "", size = 40 }: { className?: string; size?: number }) {
  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      <Image
        src="/HYHIcon-new.png"
        alt="Handle Your House"
        fill
        sizes="(max-width: 768px) 40px, 50px"
        style={{ objectFit: 'contain' }}
        className={className}
      />
    </div>
  );
}
