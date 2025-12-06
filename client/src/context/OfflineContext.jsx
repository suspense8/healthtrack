import React, { createContext, useState, useEffect, useContext } from 'react';
import { useToast } from '@chakra-ui/react';
import { OfflineQueue } from '../services/offlineQueue';

const OfflineContext = createContext(null);

export const OfflineProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const toast = useToast();

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    const updatePendingCount = () => setPendingCount(OfflineQueue.getQueue().length);

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    // Initial check
    updatePendingCount();

    // Listen for storage events (if multiple tabs) or just poll/update manually
    const interval = setInterval(updatePendingCount, 2000);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      clearInterval(interval);
    };
  }, []);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      triggerSync();
    }
  }, [isOnline]);

  const triggerSync = async () => {
    const toastId = 'sync-toast';
    if (!toast.isActive(toastId)) {
        toast({ id: toastId, title: 'Syncing offline data...', status: 'info', duration: null });
    }

    const result = await OfflineQueue.sync();
    
    toast.close(toastId);
    if (result.success) {
      if (result.count > 0) {
        toast({ title: `Synced ${result.count} items`, status: 'success' });
      }
      setPendingCount(OfflineQueue.getQueue().length);
    } else {
      toast({ title: 'Sync failed', description: 'Will retry later', status: 'warning' });
    }
  };

  const addOfflineAction = (type, payload) => {
    OfflineQueue.addToQueue({ type, payload });
    setPendingCount(prev => prev + 1);
    toast({ title: 'Saved offline', description: 'Will sync when online', status: 'info' });
  };

  return (
    <OfflineContext.Provider value={{ isOnline, pendingCount, addOfflineAction, triggerSync }}>
      {children}
    </OfflineContext.Provider>
  );
};

export const useOffline = () => useContext(OfflineContext);
