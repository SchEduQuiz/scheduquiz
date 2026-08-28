import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode } from 'react';

// Fade animations
export const FadeIn = ({ 
  children, 
  duration = 0.5, 
  delay = 0,
  className = '',
  ...props 
}: {
  children: ReactNode;
  duration?: number;
  delay?: number;
  className?: string;
  [key: string]: any;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration, delay }}
    className={className}
    {...props}
  >
    {children}
  </motion.div>
);

export const FadeOut = ({ 
  children, 
  duration = 0.5, 
  className = '',
  ...props 
}: {
  children: ReactNode;
  duration?: number;
  className?: string;
  [key: string]: any;
}) => (
  <motion.div
    initial={{ opacity: 1, y: 0 }}
    animate={{ opacity: 0, y: -20 }}
    transition={{ duration }}
    exit={{ opacity: 0, y: -20 }}
    className={className}
    {...props}
  >
    {children}
  </motion.div>
);

// Slide animations
export const SlideIn = ({ 
  children, 
  direction = 'left',
  distance = 50,
  duration = 0.6,
  className = '',
  ...props 
}: {
  children: ReactNode;
  direction?: 'left' | 'right' | 'up' | 'down';
  distance?: number;
  duration?: number;
  className?: string;
  [key: string]: any;
}) => {
  const directionMap = {
    left: { x: -distance, y: 0 },
    right: { x: distance, y: 0 },
    up: { x: 0, y: -distance },
    down: { x: 0, y: distance },
  };

  return (
    <motion.div
      initial={{ opacity: 0, ...directionMap[direction] }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration, ease: 'easeOut' }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export const SlideOut = ({ 
  children, 
  direction = 'left',
  distance = 50,
  duration = 0.4,
  className = '',
  ...props 
}: {
  children: ReactNode;
  direction?: 'left' | 'right' | 'up' | 'down';
  distance?: number;
  duration?: number;
  className?: string;
  [key: string]: any;
}) => {
  const directionMap = {
    left: { x: distance, y: 0 },
    right: { x: -distance, y: 0 },
    up: { x: 0, y: distance },
    down: { x: 0, y: -distance },
  };

  return (
    <motion.div
      initial={{ opacity: 1, x: 0, y: 0 }}
      animate={{ opacity: 0, ...directionMap[direction] }}
      transition={{ duration, ease: 'easeIn' }}
      exit={{ opacity: 0, ...directionMap[direction] }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
};

// Scale animations
export const ScaleIn = ({ 
  children, 
  scale = 0.8,
  duration = 0.5,
  delay = 0,
  className = '',
  ...props 
}: {
  children: ReactNode;
  scale?: number;
  duration?: number;
  delay?: number;
  className?: string;
  [key: string]: any;
}) => (
  <motion.div
    initial={{ opacity: 0, scale }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration, delay, type: 'spring', stiffness: 300, damping: 30 }}
    className={className}
    {...props}
  >
    {children}
  </motion.div>
);

export const ScaleOut = ({ 
  children, 
  duration = 0.3,
  className = '',
  ...props 
}: {
  children: ReactNode;
  duration?: number;
  className?: string;
  [key: string]: any;
}) => (
  <motion.div
    initial={{ opacity: 1, scale: 1 }}
    animate={{ opacity: 0, scale: 0.8 }}
    transition={{ duration, ease: 'easeIn' }}
    exit={{ opacity: 0, scale: 0.8 }}
    className={className}
    {...props}
  >
    {children}
  </motion.div>
);

// Bounce animations
export const BounceIn = ({ 
  children, 
  scale = 0.3,
  duration = 0.6,
  delay = 0,
  className = '',
  ...props 
}: {
  children: ReactNode;
  scale?: number;
  duration?: number;
  delay?: number;
  className?: string;
  [key: string]: any;
}) => (
  <motion.div
    initial={{ opacity: 0, scale }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ 
      duration, 
      delay,
      type: 'spring',
      stiffness: 400,
      damping: 25 
    }}
    className={className}
    {...props}
  >
    {children}
  </motion.div>
);

// Rotation animations
export const RotateIn = ({ 
  children, 
  angle = -180,
  duration = 0.8,
  className = '',
  ...props 
}: {
  children: ReactNode;
  angle?: number;
  duration?: number;
  className?: string;
  [key: string]: any;
}) => (
  <motion.div
    initial={{ opacity: 0, rotate: angle }}
    animate={{ opacity: 1, rotate: 0 }}
    transition={{ duration, ease: 'easeOut' }}
    className={className}
    {...props}
  >
    {children}
  </motion.div>
);

// Stagger animations for lists
export const StaggerContainer = ({ 
  children, 
  staggerDelay = 0.1,
  className = '',
  ...props 
}: {
  children: ReactNode;
  staggerDelay?: number;
  className?: string;
  [key: string]: any;
}) => (
  <motion.div
    initial="hidden"
    animate="visible"
    variants={{
      visible: {
        transition: {
          staggerChildren: staggerDelay,
        },
      },
    }}
    className={className}
    {...props}
  >
    {children}
  </motion.div>
);

export const StaggerItem = ({ 
  children, 
  className = '',
  ...props 
}: {
  children: ReactNode;
  className?: string;
  [key: string]: any;
}) => (
  <motion.div
    variants={{
      hidden: { opacity: 0, y: 20 },
      visible: { 
        opacity: 1, 
        y: 0,
        transition: { duration: 0.5, ease: 'easeOut' }
      },
    }}
    className={className}
    {...props}
  >
    {children}
  </motion.div>
);

// Page transitions
export const PageTransition = ({ 
  children, 
  className = '',
  ...props 
}: {
  children: ReactNode;
  className?: string;
  [key: string]: any;
}) => (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    transition={{ duration: 0.3, ease: 'easeInOut' }}
    className={className}
    {...props}
  >
    {children}
  </motion.div>
);

// Progress bar animation
export const ProgressBar = ({ 
  progress, 
  className = '',
  height = 8,
  color = 'bg-blue-500',
  background = 'bg-gray-200',
  ...props 
}: {
  progress: number; // 0-100
  className?: string;
  height?: number;
  color?: string;
  background?: string;
  [key: string]: any;
}) => (
  <div className={`w-full ${background} rounded-full overflow-hidden ${className}`} {...props}>
    <motion.div
      className={`h-full ${color} rounded-full`}
      initial={{ width: 0 }}
      animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    />
  </div>
);

// Loading spinner
export const LoadingSpinner = ({ 
  size = 40,
  color = 'text-blue-500',
  className = '',
  ...props 
}: {
  size?: number;
  color?: string;
  className?: string;
  [key: string]: any;
}) => (
  <motion.div
    className={`inline-block ${color} ${className}`}
    animate={{ rotate: 360 }}
    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    style={{ width: size, height: size }}
    {...props}
  >
    <svg
      className="w-full h-full"
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  </motion.div>
);

// Modal/Dialog animations
export const ModalBackdrop = ({ 
  isOpen, 
  onClick,
  className = '',
  ...props 
}: {
  isOpen: boolean;
  onClick?: () => void;
  className?: string;
  [key: string]: any;
}) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 ${className}`}
        onClick={onClick}
        {...props}
      />
    )}
  </AnimatePresence>
);

export const ModalContent = ({ 
  children, 
  isOpen, 
  className = '',
  size = 'md',
  ...props 
}: {
  children: ReactNode;
  isOpen: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  [key: string]: any;
}) => {
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <ModalBackdrop isOpen={isOpen} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className={`
              relative w-full ${sizeClasses[size]} bg-white rounded-lg shadow-xl
              ${className}
            `}
            {...props}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// Success Animation Component
export const SuccessAnimation = ({ 
  children, 
  show = true,
  size = 'md',
  className = '',
  ...props 
}: {
  children?: ReactNode;
  show?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  [key: string]: any;
}) => (
  <AnimatePresence>
    {show && (
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.5 }}
        transition={{ duration: 0.3, type: "spring", stiffness: 200, damping: 15 }}
        className={`
          inline-flex items-center justify-center
          ${size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-16 h-16' : 'w-12 h-12'}
          bg-green-100 rounded-full ${className}
        `}
        {...props}
      >
        {children || (
          <motion.div
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="w-6 h-6 text-green-600"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <motion.path
              d="M9 12l2 2 4-4"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            />
            <motion.path
              d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            />
          </motion.div>
        )}
      </motion.div>
    )}
  </AnimatePresence>
);

// Toast Notification Component
export const Toast = ({ 
  children, 
  show = true,
  type = 'info',
  className = '',
  ...props 
}: {
  children?: ReactNode;
  show?: boolean;
  type?: 'info' | 'success' | 'warning' | 'error';
  className?: string;
  [key: string]: any;
}) => {
  const typeClasses = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    error: 'bg-red-50 border-red-200 text-red-800'
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 25 }}
          className={`
            fixed top-4 right-4 z-50 max-w-sm w-full
            p-4 rounded-lg border shadow-lg backdrop-blur-sm
            ${typeClasses[type]} ${className}
          `}
          {...props}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};