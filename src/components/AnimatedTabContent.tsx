import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode } from 'react';

interface AnimatedTabContentProps {
  activeTab: string;
  direction: number;
  children: ReactNode;
  className?: string;
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 20 : -20, // Reduced distance for subtle feel
    opacity: 0
  }),
  center: {
    x: 0,
    opacity: 1
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -20 : 20, // Reduced distance
    opacity: 0
  })
};

export const AnimatedTabContent = ({
  activeTab,
  direction,
  children,
  className
}: AnimatedTabContentProps) => {
  return (
    <div className={`relative overflow-hidden w-full ${className || ''}`}>
      <AnimatePresence mode="wait" custom={direction} initial={false}>
        <motion.div
          key={activeTab}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: 'spring', stiffness: 300, damping: 30, mass: 0.8 },
            opacity: { duration: 0.2 }
          }}
          className="w-full"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
