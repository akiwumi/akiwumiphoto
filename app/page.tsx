'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useAudio } from '@/contexts/AudioContext';

export default function SplashPage() {
  const router = useRouter();
  const { start } = useAudio();
  const [showButton, setShowButton] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowButton(true), 3200);
    return () => clearTimeout(timer);
  }, []);

  const handleEnter = () => {
    start();
    setExiting(true);
    setTimeout(() => router.push('/home'), 800);
  };

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.main
          key="splash"
          className="full-screen bg-black flex flex-col items-center justify-center relative overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Full-screen background image — fades in with the title */}
          <motion.div
            className="absolute inset-0"
            style={{ zIndex: 0 }}
            initial={{ opacity: 0, scale: 1.06 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          >
            <Image
              src="/images/intro-background.jpg"
              alt=""
              fill
              className="object-cover"
              sizes="100vw"
              priority
            />
            <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.42)' }} />
          </motion.div>

          {/* Title — zooms in from blur, eases out on exit */}
          <motion.h1
            className="text-white text-center uppercase px-5 leading-none select-none"
            style={{
              fontFamily: 'var(--font-bebas), var(--font-space-grotesk), sans-serif',
              fontSize: 'clamp(3.5rem, 13vw, 14rem)',
              letterSpacing: 'clamp(0.1em, 1.5vw, 0.3em)',
              fontWeight: 400,
              position: 'relative',
              zIndex: 1,
            }}
            initial={{ opacity: 0, scale: 2.4, filter: 'blur(32px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.96, filter: 'blur(12px)' }}
            transition={{ duration: 2.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          >
            WELCOME TO
            <br />
            AKIWUMI PHOTO
          </motion.h1>

          {/* ENTER button — fades in after text settles, pinned to bottom */}
          <AnimatePresence>
            {showButton && (
              <motion.button
                onClick={handleEnter}
                className="absolute bottom-12 left-5 right-5 md:left-auto md:right-auto md:w-[200px] h-[52px] text-white font-medium uppercase cursor-pointer btn-lift"
                style={{
                  background: 'rgba(255, 255, 255, 0.14)',
                  letterSpacing: '0.12em',
                  fontSize: '0.875rem',
                  border: '1px solid rgba(255, 255, 255, 0.62)',
                  backdropFilter: 'blur(12px)',
                  paddingBottom: 'env(safe-area-inset-bottom)',
                  zIndex: 1,
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.95, y: 0, transition: { duration: 0.06 } }}
              >
                ENTER
              </motion.button>
            )}
          </AnimatePresence>
        </motion.main>
      )}
    </AnimatePresence>
  );
}
