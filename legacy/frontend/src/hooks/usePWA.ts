import { useEffect, useState, useCallback } from 'react';

interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  showUpdatePrompt: boolean;
  isUpdateAvailable: boolean;
}

interface PWAHookReturn extends PWAState {
  installApp: () => Promise<void>;
  updateApp: () => void;
  dismissUpdate: () => void;
  registerServiceWorker: () => Promise<void>;
}

export const usePWA = (): PWAHookReturn => {
  const [state, setState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: false,
    isOnline: navigator.onLine,
    showUpdatePrompt: false,
    isUpdateAvailable: false,
  });

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Check if app is installed
  const checkIfInstalled = useCallback(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isInWebAppiOS = (window.navigator as any).standalone === true;
    const isInstalled = isStandalone || isInWebAppiOS;
    
    setState(prev => ({ ...prev, isInstalled }));
    
    return isInstalled;
  }, []);

  // Check for install prompt
  const checkInstallPrompt = useCallback(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setState(prev => ({ ...prev, isInstallable: true }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Install app
  const installApp = useCallback(async () => {
    if (!deferredPrompt) return;

    try {
      const result = await deferredPrompt.prompt();
      console.log('Install prompt result:', result);
      
      if (result.outcome === 'accepted') {
        setState(prev => ({ ...prev, isInstalled: true, isInstallable: false }));
      }
      
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Error installing app:', error);
    }
  }, [deferredPrompt]);

  // Network status
  const handleOnline = useCallback(() => {
    setState(prev => ({ ...prev, isOnline: true }));
  }, []);

  const handleOffline = useCallback(() => {
    setState(prev => ({ ...prev, isOnline: false }));
  }, []);

  // Service Worker registration
  const registerServiceWorker = useCallback(async () => {
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });
        
        setRegistration(reg);
        console.log('Service Worker registered:', reg);

        // Check for updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setState(prev => ({ 
                  ...prev, 
                  showUpdatePrompt: true, 
                  isUpdateAvailable: true 
                }));
              }
            });
          }
        });

        // Listen for controller change
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload();
        });

      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }, []);

  // Update app
  const updateApp = useCallback(() => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      setState(prev => ({ ...prev, showUpdatePrompt: false, isUpdateAvailable: false }));
    }
  }, [registration]);

  // Dismiss update
  const dismissUpdate = useCallback(() => {
    setState(prev => ({ ...prev, showUpdatePrompt: false }));
  }, []);

  useEffect(() => {
    // Initialize PWA state
    checkIfInstalled();
    
    // Set up listeners
    const cleanupInstallPrompt = checkInstallPrompt();
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Register service worker
    registerServiceWorker();

    return () => {
      cleanupInstallPrompt();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkIfInstalled, checkInstallPrompt, handleOnline, handleOffline, registerServiceWorker]);

  return {
    ...state,
    installApp,
    updateApp,
    dismissUpdate,
    registerServiceWorker,
  };
};

export default usePWA;