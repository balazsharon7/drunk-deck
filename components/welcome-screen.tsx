'use client';

import Image from 'next/image';

interface WelcomeScreenProps {
  onContinue: () => void;
}

export function WelcomeScreen({ onContinue }: WelcomeScreenProps) {
  return (
    <div className="fixed inset-0 bg-background">
      {/* Full-screen background image */}
      <Image
        src="/images/welcome-bg.png"
        alt="Drunk Deck"
        fill
        className="object-cover object-center"
        priority
      />

      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

      {/* Content overlay */}
      <div className="relative z-10 flex flex-col items-center justify-end h-full pb-16 px-6 safe-area-bottom">
        {/* Continue Button - styled like the reference image */}
        <button
          onClick={onContinue}
          className="w-full max-w-xs relative group active:scale-[0.97] transition-transform duration-150"
        >
          {/* Button glow */}
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-amber-700/60 via-gold/40 to-amber-700/60 blur-md opacity-80 group-hover:opacity-100 transition-opacity" />
          
          {/* Button body */}
          <div className="relative h-14 rounded-xl overflow-hidden border-2 border-gold/80 shadow-[0_4px_20px_rgba(180,120,20,0.4)]">
            {/* Red-brown gradient background like the reference */}
            <div className="absolute inset-0 bg-gradient-to-b from-amber-800 via-red-900 to-amber-900" />
            
            {/* Inner highlight */}
            <div className="absolute inset-[2px] rounded-[10px] bg-gradient-to-b from-red-800/90 via-red-900 to-amber-900/90" />
            
            {/* Top shine */}
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent" />
            
            {/* Text */}
            <div className="relative flex items-center justify-center h-full">
              <span className="text-lg font-black tracking-[0.15em] text-gold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                {'FOLYTATAS'}
              </span>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
