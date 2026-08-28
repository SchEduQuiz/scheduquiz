import React, { useEffect, useState } from 'react';
import { Download, RefreshCw, Bell, X, Wifi, WifiOff } from 'lucide-react';

interface PWAInstallPromptProps {
  onInstall?: () => void;
  onDismiss?: () => void;
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ onInstall, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if app is installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isInWebAppiOS = (window.navigator as any).standalone === true;
    const hasBeenDismissed = localStorage.getItem('pwa-install-dismissed') === 'true';

    if (!isStandalone && !isInWebAppiOS && !hasBeenDismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleInstall = () => {
    // The actual install prompt will be handled by the browser
    if (onInstall) onInstall();
    setIsVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa-install-dismissed', 'true');
    if (onDismiss) onDismiss();
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm z-50">
      <div className="flex items-start space-x-3">
        <Download className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">Install App</h3>
          <p className="text-sm text-gray-600 mb-3">
            Install EduQuiz Platform for quick access and offline use.
          </p>
          <div className="flex space-x-2">
            <button
              onClick={handleInstall}
              className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-blue-700 transition"
            >
              Install
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition"
            >
              Later
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-gray-400 hover:text-gray-600 transition"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

interface NetworkStatusProps {
  onNetworkChange?: (isOnline: boolean) => void;
}

export const NetworkStatus: React.FC<NetworkStatusProps> = ({ onNetworkChange }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowStatus(true);
      onNetworkChange?.(true);
      setTimeout(() => setShowStatus(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowStatus(true);
      onNetworkChange?.(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onNetworkChange]);

  if (!showStatus) return null;

  return (
    <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-lg shadow-lg z-50 ${
      isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
    }`}>
      <div className="flex items-center space-x-2">
        {isOnline ? (
          <Wifi className="h-4 w-4" />
        ) : (
          <WifiOff className="h-4 w-4" />
        )}
        <span className="text-sm font-medium">
          {isOnline ? 'Back online' : 'You\'re offline'}
        </span>
      </div>
    </div>
  );
};

interface UpdateAvailableProps {
  onUpdate?: () => void;
  onDismiss?: () => void;
}

export const UpdateAvailable: React.FC<UpdateAvailableProps> = ({ onUpdate, onDismiss }) => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg) {
          setRegistration(reg);
          
          // Listen for updates
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setShowPrompt(true);
                }
              });
            }
          });
        }
      });
    }
  }, []);

  const handleUpdate = async () => {
    if (registration?.waiting) {
      // Send message to skip waiting
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      if (onUpdate) onUpdate();
    }
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    if (onDismiss) onDismiss();
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm z-50">
      <div className="flex items-start space-x-3">
        <RefreshCw className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">Update Available</h3>
          <p className="text-sm text-gray-600 mb-3">
            A new version of the app is ready to install.
          </p>
          <div className="flex space-x-2">
            <button
              onClick={handleUpdate}
              className="flex-1 bg-green-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-green-700 transition"
            >
              Update
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface PushNotificationPromptProps {
  onSubscribe?: () => void;
  onDismiss?: () => void;
}

export const PushNotificationPrompt: React.FC<PushNotificationPromptProps> = ({ 
  onSubscribe, 
  onDismiss 
}) => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [permission, setPermission] = useState(Notification.permission);

  useEffect(() => {
    const hasBeenDismissed = localStorage.getItem('push-notification-dismissed') === 'true';
    
    if (permission === 'default' && !hasBeenDismissed) {
      // Show prompt after a delay
      setTimeout(() => setShowPrompt(true), 10000);
    }
  }, [permission]);

  const handleSubscribe = async () => {
    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);
      
      if (permission === 'granted') {
        if (onSubscribe) onSubscribe();
        localStorage.setItem('push-notification-dismissed', 'true');
      }
      setShowPrompt(false);
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('push-notification-dismissed', 'true');
    if (onDismiss) onDismiss();
    setShowPrompt(false);
  };

  if (!showPrompt || permission !== 'default') return null;

  return (
    <div className="fixed top-20 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm z-50">
      <div className="flex items-start space-x-3">
        <Bell className="h-6 w-6 text-purple-600 flex-shrink-0 mt-1" />
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">Enable Notifications</h3>
          <p className="text-sm text-gray-600 mb-3">
            Get notified about new assignments, grades, and announcements.
          </p>
          <div className="flex space-x-2">
            <button
              onClick={handleSubscribe}
              className="flex-1 bg-purple-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-purple-700 transition"
            >
              Enable
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition"
            >
              No Thanks
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// PWA Utilities
export const PWAUtils = {
  isInstalled(): boolean {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    );
  },

  isIOS(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  },

  canInstall(): boolean {
    return 'beforeinstallprompt' in window;
  },

  getInstallPrompt(): Promise<any> {
    return new Promise((resolve) => {
      if ('beforeinstallprompt' in window) {
        (window as any).addEventListener('beforeinstallprompt', (e: any) => {
          e.preventDefault();
          resolve(e);
        });
      } else {
        resolve(null);
      }
    });
  },

  registerServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      return navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('ServiceWorker registered:', registration);
        })
        .catch((error) => {
          console.error('ServiceWorker registration failed:', error);
          throw error;
        });
    }
    return Promise.resolve();
  }
};

export default {
  PWAInstallPrompt,
  NetworkStatus,
  UpdateAvailable,
  PushNotificationPrompt,
  PWAUtils
};