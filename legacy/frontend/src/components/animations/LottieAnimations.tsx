import Lottie from 'lottie-react';
import { motion } from 'framer-motion';
import { ReactNode, useEffect, useState } from 'react';

// Badge achievement animation
export const BadgeAnimation = ({ 
  isVisible, 
  size = 200,
  className = '',
  onComplete 
}: {
  isVisible: boolean;
  size?: number;
  className?: string;
  onComplete?: () => void;
}) => {
  const [animationData, setAnimationData] = useState<any>(null);

  useEffect(() => {
    // Badge achievement animation data
    const badgeData = {
      v: "5.7.4",
      fr: 30,
      ip: 0,
      op: 90,
      w: 200,
      h: 200,
      nm: "Badge Achievement",
      ddd: 0,
      assets: [],
      layers: [
        {
          ddd: 0,
          ind: 1,
          ty: 4,
          nm: "Badge Base",
          sr: 1,
          ks: {
            o: { a: 0, k: 100 },
            r: { a: 0, k: 0 },
            p: { a: 0, k: [100, 100, 0] },
            a: { a: 0, k: [0, 0, 0] },
            s: {
              a: 1,
              k: [
                {
                  t: 0,
                  s: [0, 0, 100],
                  h: 1
                },
                {
                  t: 30,
                  s: [120, 120, 100],
                  h: 0
                },
                {
                  t: 45,
                  s: [100, 100, 100],
                  h: 0
                }
              ]
            }
          },
          ao: 0,
          shapes: [
            {
              ty: "gr",
              it: [
                {
                  ty: "el",
                  p: { a: 0, k: [0, 0] },
                  s: { a: 0, k: [120, 120] },
                  d: 1,
                  nm: "Ellipse Path 1"
                },
                {
                  ty: "st",
                  o: { a: 0, k: 100 },
                  w: { a: 0, k: 4 },
                  c: { a: 0, k: [1, 0.8, 0.2, 1] },
                  lc: 1,
                  lj: 1,
                  ml: 4,
                  nm: "Stroke 1"
                },
                {
                  ty: "fl",
                  o: { a: 0, k: 100 },
                  r: 1,
                  c: {
                    a: 1,
                    k: [
                      {
                        t: 0,
                        s: [0.2, 0.4, 1, 1],
                        h: 1
                      },
                      {
                        t: 60,
                        s: [1, 0.8, 0.2, 1],
                        h: 0
                      }
                    ]
                  },
                  nm: "Fill 1"
                }
              ],
              nm: "Badge Circle",
              np: 3
            }
          ],
          ip: 0,
          op: 90,
          st: 0,
          bm: 0
        },
        {
          ddd: 0,
          ind: 2,
          ty: 4,
          nm: "Star",
          sr: 1,
          ks: {
            o: { a: 0, k: 100 },
            r: { a: 0, k: 0 },
            p: { a: 0, k: [100, 100, 0] },
            a: { a: 0, k: [0, 0, 0] },
            s: {
              a: 1,
              k: [
                {
                  t: 15,
                  s: [0, 0, 100],
                  h: 1
                },
                {
                  t: 45,
                  s: [100, 100, 100],
                  h: 0
                }
              ]
            }
          },
          ao: 0,
          shapes: [
            {
              ty: "sr",
              pt: { a: 0, k: 5 },
              p: { a: 0, k: [0, 0] },
              r: { a: 0, k: 0 },
              ir: { a: 0, k: 20 },
              or: { a: 0, k: 40 },
              nm: "Star Path"
            },
            {
              ty: "fl",
              o: { a: 0, k: 100 },
              r: 1,
              c: { a: 0, k: [1, 1, 1, 1] },
              nm: "Fill 1"
            }
          ],
          ip: 0,
          op: 90,
          st: 0,
          bm: 0
        }
      ]
    };
    setAnimationData(badgeData);
  }, []);

  if (!isVisible || !animationData) return null;

  return (
    <motion.div
      className={`flex items-center justify-center ${className}`}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ duration: 0.5, type: 'spring', stiffness: 200 }}
      onAnimationComplete={onComplete}
    >
      <Lottie
        animationData={animationData}
        loop={false}
        style={{ width: size, height: size }}
      />
    </motion.div>
  );
};

// Confetti animation
export const ConfettiAnimation = ({ 
  isVisible, 
  duration = 3,
  className = '',
  onComplete 
}: {
  isVisible: boolean;
  duration?: number;
  className?: string;
  onComplete?: () => void;
}) => {
  const [animationData, setAnimationData] = useState<any>(null);

  useEffect(() => {
    // Confetti animation data
    const confettiData = {
      v: "5.7.4",
      fr: 30,
      ip: 0,
      op: 90,
      w: 400,
      h: 400,
      nm: "Confetti Celebration",
      ddd: 0,
      assets: [],
      layers: Array.from({ length: 20 }, (_, i) => ({
        ddd: 0,
        ind: i + 1,
        ty: 4,
        nm: `Confetti Piece ${i + 1}`,
        sr: 1,
        ks: {
          o: { a: 0, k: 100 },
          r: { 
            a: 1, 
            k: [
              {
                t: 0,
                s: [Math.random() * 360, 0, 1],
                h: 0
              },
              {
                t: 90,
                s: [Math.random() * 360 + 360, 0, 1],
                h: 0
              }
            ]
          },
          p: { 
            a: 1, 
            k: [
              {
                t: 0,
                s: [Math.random() * 400, -50, 0],
                h: 0
              },
              {
                t: 90,
                s: [Math.random() * 400, 450, 0],
                h: 0
              }
            ]
          },
          a: { a: 0, k: [0, 0, 0] },
          s: { a: 0, k: [100, 100, 100] }
        },
        ao: 0,
        shapes: [
          {
            ty: "gr",
            it: [
              {
                ty: "rc",
                p: { a: 0, k: [0, 0] },
                s: { a: 0, k: [10, 10] },
                r: { a: 0, k: 2 },
                nm: "Rectangle Path 1"
              },
              {
                ty: "fl",
                o: { a: 0, k: 100 },
                r: 1,
                c: { a: 0, k: [
                  Math.random() * 0.5 + 0.5,
                  Math.random() * 0.5 + 0.5,
                  Math.random() * 0.5 + 0.5,
                  1
                ]},
                nm: "Fill 1"
              }
            ],
            nm: "Rectangle",
            np: 2
          }
        ],
        ip: 0,
        op: 90,
        st: 0,
        bm: 0
      }))
    };
    setAnimationData(confettiData);
  }, []);

  if (!isVisible || !animationData) return null;

  return (
    <motion.div
      className={`absolute inset-0 pointer-events-none ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Lottie
        animationData={animationData}
        loop={false}
        style={{ width: '100%', height: '100%' }}
        onComplete={onComplete}
      />
    </motion.div>
  );
};

// Stars animation
export const StarsAnimation = ({ 
  isVisible, 
  count = 5,
  size = 24,
  color = 'text-yellow-400',
  className = '',
  ...props 
}: {
  isVisible: boolean;
  count?: number;
  size?: number;
  color?: string;
  className?: string;
  [key: string]: any;
}) => {
  const stars = Array.from({ length: count }, (_, i) => i);

  if (!isVisible) return null;

  return (
    <div className={`flex space-x-2 ${className}`} {...props}>
      {stars.map((_, index) => (
        <motion.div
          key={index}
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            duration: 0.6,
            delay: index * 0.1,
            type: 'spring',
            stiffness: 200,
          }}
          className={`${color}`}
        >
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
          </svg>
        </motion.div>
      ))}
    </div>
  );
};

// Success checkmark animation
export const SuccessCheckmark = ({ 
  isVisible, 
  size = 80,
  color = 'text-green-500',
  className = '',
  onComplete 
}: {
  isVisible: boolean;
  size?: number;
  color?: string;
  className?: string;
  onComplete?: () => void;
}) => {
  if (!isVisible) return null;

  return (
    <motion.div
      className={`flex items-center justify-center ${className}`}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ duration: 0.5, type: 'spring', stiffness: 200 }}
      onAnimationComplete={onComplete}
    >
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={color}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        <motion.path
          d="M20 6L9 17l-5-5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </motion.svg>
    </motion.div>
  );
};

// Pulse animation
export const PulseAnimation = ({ 
  children, 
  color = 'bg-blue-500',
  className = '',
  ...props 
}: {
  children: ReactNode;
  color?: string;
  className?: string;
  [key: string]: any;
}) => (
  <motion.div
    className={`${color} ${className}`}
    animate={{
      scale: [1, 1.05, 1],
      opacity: [0.7, 1, 0.7],
    }}
    transition={{
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }}
    {...props}
  >
    {children}
  </motion.div>
);

// Floating animation
export const FloatingAnimation = ({ 
  children, 
  amplitude = 10,
  duration = 3,
  className = '',
  ...props 
}: {
  children: ReactNode;
  amplitude?: number;
  duration?: number;
  className?: string;
  [key: string]: any;
}) => (
  <motion.div
    className={className}
    animate={{
      y: [0, -amplitude, 0],
    }}
    transition={{
      duration,
      repeat: Infinity,
      ease: "easeInOut"
    }}
    {...props}
  >
    {children}
  </motion.div>
);

// Progress completion animation
export const ProgressCelebration = ({ 
  isComplete, 
  progress,
  className = '',
  ...props 
}: {
  isComplete: boolean;
  progress: number;
  className?: string;
  [key: string]: any;
}) => (
  <div className={`relative ${className}`} {...props}>
    <motion.div
      className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 opacity-20 rounded-lg"
      animate={isComplete ? {
        scale: [1, 1.1, 1],
        opacity: [0.2, 0.4, 0.2],
      } : {}}
      transition={{
        duration: 0.6,
        repeat: isComplete ? Infinity : 0,
        repeatType: "reverse"
      }}
    />
    {isComplete && (
      <motion.div
        className="absolute -top-2 -right-2"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ duration: 0.5, type: 'spring' }}
      >
        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="white"
          >
            <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </motion.div>
    )}
  </div>
);

// Achievement unlock animation
export const AchievementUnlock = ({ 
  isVisible, 
  title,
  description,
  icon,
  className = '',
  onComplete 
}: {
  isVisible: boolean;
  title: string;
  description?: string;
  icon?: ReactNode;
  className?: string;
  onComplete?: () => void;
}) => {
  if (!isVisible) return null;

  return (
    <motion.div
      className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 ${className}`}
      initial={{ scale: 0, opacity: 0, y: 50 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0, opacity: 0, y: -50 }}
      transition={{ duration: 0.6, type: 'spring', stiffness: 200 }}
      onAnimationComplete={onComplete}
    >
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-sm mx-auto">
        <div className="text-center">
          {icon && (
            <div className="mb-4 flex justify-center">
              {icon}
            </div>
          )}
          <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
          {description && (
            <p className="text-gray-600">{description}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
};