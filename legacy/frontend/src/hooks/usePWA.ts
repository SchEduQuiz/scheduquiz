```tsx
import { useEffect, useState, useCallback, useRef } from 'react';

interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  showUpdatePrompt: boolean;
  isUpdateAvailable: boolean;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
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

  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  const [registration, setRegistration] =
    useState<ServiceWorkerRegistration | null>(null);

  // Prevent duplicate controllerchange handling
  const controllerChangeHandled = useRef(false);

  // Prevent duplicate SW registration/listeners
  const registrationStarted = useRef(false);

  // Check if app is installed
  const checkIfInstalled = useCallback(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches;

    const isInWebAppiOS =
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    const isInstalled = isStandalone || isInWebAppiOS;

    setState((prev) => ({
      ...prev,
      isInstalled,
    }));

    return isInstalled;
  }, []);

  // Listen for install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      const e = event as BeforeInstallPromptEvent;

      e.preventDefault();

      setDeferredPrompt(e);

      setState((prev) => ({
        ...prev,
        isInstallable: true,
      }));
    };

    const handleAppInstalled = () => {
      console.log('EduQuiz app installed');

      setDeferredPrompt(null);

      setState((prev) => ({
        ...prev,
        isInstalled: true,
        isInstallable: false,
      }));
    };

    window.addEventListener(
      'beforeinstallprompt',
      handleBeforeInstallPrompt
    );

    window.addEventListener(
      'appinstalled',
      handleAppInstalled
    );

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );

      window.removeEventListener(
        'appinstalled',
        handleAppInstalled
      );
    };
  }, []);

  // Install app
  const installApp = useCallback(async () => {
    if (!deferredPrompt) {
      console.warn('Install prompt is not available');
      return;
    }

    try {
      await deferredPrompt.prompt();

      const { outcome } = await deferredPrompt.userChoice;

      console.log('Install prompt result:', outcome);

      if (outcome === 'accepted') {
        setState((prev) => ({
          ...prev,
          isInstallable: false,
        }));
      }

      setDeferredPrompt(null);
    } catch (error) {
      console.error('Error installing app:', error);
    }
  }, [deferredPrompt]);

  // Network status
  const handleOnline = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isOnline: true,
    }));
  }, []);

  const handleOffline = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isOnline: false,
    }));
  }, []);

  // Service Worker registration
  const registerServiceWorker = useCallback(async () => {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service workers are not supported');
      return;
    }

    // Prevent duplicate registration in React StrictMode
    if (registrationStarted.current) {
      return;
    }

    registrationStarted.current = true;

    try {
      const reg = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      setRegistration(reg);

      console.log('Service Worker registered:', reg);

      // Check if an update is already waiting
      if (reg.waiting) {
        setState((prev) => ({
          ...prev,
          showUpdatePrompt: true,
          isUpdateAvailable: true,
        }));
      }

      // Listen for new service worker
      const handleUpdateFound = () => {
        const newWorker = reg.installing;

        if (!newWorker) {
          return;
        }

        newWorker.addEventListener('statechange', () => {
          if (
            newWorker.state === 'installed' &&
            navigator.serviceWorker.controller
          ) {
            setState((prev) => ({
              ...prev,
              showUpdatePrompt: true,
              isUpdateAvailable: true,
            }));
          }
        });
      };

      reg.addEventListener('updatefound', handleUpdateFound);

      // Reload once when new worker takes control
      if (!controllerChangeHandled.current) {
        controllerChangeHandled.current = true;

        const handleControllerChange = () => {
          window.location.reload();
        };

        navigator.serviceWorker.addEventListener(
          'controllerchange',
          handleControllerChange
        );
      }
    } catch (error) {
      registrationStarted.current = false;

      console.error(
        'Service Worker registration failed:',
        error
      );
    }
  }, []);

  // Update app
  const updateApp = useCallback(() => {
    if (!registration?.waiting) {
      console.warn('No waiting service worker found');
      return;
    }

    registration.waiting.postMessage({
      type: 'SKIP_WAITING',
    });

    setState((prev) => ({
      ...prev,
      showUpdatePrompt: false,
      isUpdateAvailable: false,
    }));
  }, [registration]);

  // Dismiss update
  const dismissUpdate = useCallback(() => {
    setState((prev) => ({
      ...prev,
      showUpdatePrompt: false,
    }));
  }, []);

  // Initialize PWA
  useEffect(() => {
    checkIfInstalled();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    registerServiceWorker();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [
    checkIfInstalled,
    handleOnline,
    handleOffline,
    registerServiceWorker,
  ]);

  return {
    ...state,
    installApp,
    updateApp,
    dismissUpdate,
    registerServiceWorker,
  };
};

export default usePWA;
```
