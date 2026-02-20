"use client";

import Image from "next/image";
import { motion } from "framer-motion";

interface WelcomeScreenProps {
  onContinue: () => void;
}

export function WelcomeScreen({ onContinue }: WelcomeScreenProps) {
  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col items-center justify-between">
      {/* Háttérkép finom zoom animációval */}
      <motion.div
        className="absolute inset-0 z-0"
        initial={{ scale: 1.08 }}
        animate={{ scale: 1 }}
        transition={{ duration: 2.5, ease: "easeOut" }}
      >
        <Image
          src="/images/hatter.png"
          alt="background"
          fill
          className="object-cover"
          priority
        />
      </motion.div>

      {/* Rétegzett overlay a mélységért */}
      <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/60 via-black/20 to-black/80" />
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#1a0800]/90 via-transparent to-transparent" />

      {/* Tűzijáték / fény effekt a tetején */}
      <div className="absolute top-0 left-0 right-0 h-1/3 z-10 pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${80 + i * 30}px`,
              height: `${80 + i * 30}px`,
              left: `${10 + i * 15}%`,
              top: `${5 + (i % 3) * 15}%`,
              background: `radial-gradient(circle, ${
                i % 2 === 0 ? "rgba(255,180,0,0.35)" : "rgba(220,60,30,0.25)"
              } 0%, transparent 70%)`,
            }}
            animate={{ opacity: [0.4, 1, 0.4], scale: [0.9, 1.1, 0.9] }}
            transition={{
              duration: 2 + i * 0.4,
              repeat: Infinity,
              delay: i * 0.3,
            }}
          />
        ))}
      </div>

      {/* Tartalom */}
      <div className="relative z-20 flex flex-col items-center justify-between h-full w-full max-w-md mx-auto px-4 py-8">
        {/* Logo szekció */}
        <motion.div
          className="flex flex-col items-center mt-4"
          // KIVETTEM az initial, animate és transition propokat, hogy ne ússzon be fentről
        >
          {/* Logo mögötti arany derengés */}
          <div className="absolute top-16 w-72 h-72 rounded-full bg-[#FFB300]/20 blur-3xl pointer-events-none" />

          {/* A belső motion.div-ből is kivettem minden animációt */}
          <motion.div className="relative">
            <Image
              src="/images/logo.png"
              alt="Drunk Deck Logo"
              width={320}
              height={260}
              className="drop-shadow-[0_0_30px_rgba(255,160,0,0.6)]"
              priority
            />
          </motion.div>
        </motion.div>
        {/* Alsó szekció */}
        <motion.div
          className="flex flex-col items-center w-full gap-5"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.4, ease: "easeOut" }}
        >
          {/* Glassmorphic szöveg kártya */}
          <div className="w-full text-center px-4 py-6">
            {/* Felső dekoratív vonal */}
            <div className="flex items-center gap-4 mb-5">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#FFB300]/50 to-[#FFB300]/80" />
              <div className="flex gap-1.5">
                <span className="text-[#FFB300]/70 text-xs">♥</span>
                <span className="text-[#FFB300]/70 text-xs">♦</span>
                <span className="text-[#FFB300] text-xs">♠</span>
                <span className="text-[#FFB300]/70 text-xs">♦</span>
              </div>
              <div className="flex-1 h-px bg-gradient-to-l from-transparent via-[#FFB300]/50 to-[#FFB300]/80" />
            </div>

            {/* Főcím */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.6 }}
            >
              <p
                className="text-xs font-semibold tracking-[0.45em] text-[#FFB300]/60 mb-2 uppercase"
                style={{ fontFamily: "'Cinzel', serif" }}
              >
                üdvözlünk a
              </p>
              <h1
                className="text-4xl font-black leading-tight"
                style={{
                  fontFamily: "'Cinzel Decorative', serif",
                  background:
                    "linear-gradient(180deg, #FFE566 0%, #FFB300 45%, #E07800 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 2px 12px rgba(255,160,0,0.35))",
                  letterSpacing: "0.05em",
                }}
              >
                DRUNK DECK
              </h1>
              <p
                className="text-sm font-medium tracking-[0.35em] text-[#FFD580]/70 mt-2 uppercase"
                style={{ fontFamily: "'Cinzel', serif" }}
              >
                világában!
              </p>
            </motion.div>

            {/* Alsó dekoratív vonal */}
            <div className="flex items-center gap-3 mt-5">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[#FFB300]/40" />
              <span className="text-[#FFB300]/40 text-[10px] tracking-[0.4em] font-light">
                JÁTSSZ OKOSAN · VIGYÁZZ A KORTYOKRA
              </span>
              <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[#FFB300]/40" />
            </div>
          </div>

          {/* Letisztult gomb */}
          <motion.button
            onClick={onContinue}
            className="relative w-full py-[15px] flex items-center justify-center"
            style={{
              borderRadius: "12px",
              background: "linear-gradient(180deg, #1a0a00 0%, #0d0500 100%)",
              border: "1px solid rgba(255,185,0,0.55)",
              boxShadow:
                "0 0 18px rgba(255,160,0,0.2), inset 0 1px 0 rgba(255,200,80,0.12)",
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.85 }}
          >
            <span
              className="font-black tracking-[0.4em] text-base"
              style={{
                fontFamily: "'Cinzel', serif",
                background:
                  "linear-gradient(180deg, #FFE566 0%, #FFB300 60%, #CC8800 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              FOLYTATÁS
            </span>
          </motion.button>
        </motion.div>
      </div>

      {/* Grain overlay – filmes hatás */}
      <div
        className="absolute inset-0 z-30 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px",
        }}
      />
    </div>
  );
}
