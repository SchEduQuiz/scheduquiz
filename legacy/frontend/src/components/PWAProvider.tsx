import React, { ReactNode } from 'react';
import { usePWA } from '../hooks/usePWA';
import { PWAInstallPrompt, NetworkStatus, UpdateAvailable, PushNotificationPrompt } from './PWAComponents';

interface PWAProviderProps {
  children: ReactNode;
}

export const PWAProvider: React.FC<PWAProviderProps> = ({ children }) => {
  const {
    isInstallable,
    isInstalled,
    isOnline,
    showUpdatePrompt,
    isUpdateAvailable,
    installApp,
    updateApp,
    dismissUpdate,
    registerServiceWorker
  } = usePWA();

  React.useEffect(() => {
    // Register service worker on mount
    registerServiceWorker();
  }, [registerServiceWorker]);

  return (
    <>
      {children}
      
      {/* PWA Install Prompt - only show if installable and not installed */}
      {isInstallable && !isInstalled && (
        <PWAInstallPrompt 
          onInstall={installApp}
          onDismiss={() => {}}
        />
      )}
      
      {/* Network Status Indicator */}
      <NetworkStatus 
        onNetworkChange={(isOnline) => {
          console.log('Network status changed:', isOnline);
        }}
      />
      
      {/* Update Available Prompt */}
      {showUpdatePrompt && (
        <UpdateAvailable 
          onUpdate={updateApp}
          onDismiss={dismissUpdate}
        />
      )}
      
      {/* Push Notification Prompt */}
      <PushNotificationPrompt 
        onSubscribe={() => {
          console.log('Push notifications enabled');
        }}
        onDismiss={() => {
          console.log('Push notifications dismissed');
        }}
      />
    </>
  );
};

export default PWAProvider;