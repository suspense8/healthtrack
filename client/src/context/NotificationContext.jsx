import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useToast } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';

const NotificationContext = createContext(null);

const SOCKET_URL = 'http://localhost:3000';

// Request browser notification permission
const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('Browser does not support notifications');
    return false;
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  
  return false;
};

export const NotificationProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(false);
  const toast = useToast();
  const navigateRef = useRef(null);
  const setTabRef = useRef(null);
  const socketRef = useRef(null);

  // Request permission on mount
  useEffect(() => {
    requestNotificationPermission().then(setBrowserNotificationsEnabled);
  }, []);

  // Show browser notification
  const showBrowserNotification = useCallback((notification) => {
    if (!browserNotificationsEnabled) return;

    try {
      const browserNotif = new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.id,
        requireInteraction: notification.title?.includes('🚨') || notification.title?.includes('EMERGENCY'),
        data: notification
      });

      // Handle click - navigate to the relevant page
      browserNotif.onclick = () => {
        window.focus();
        if (notification.navigateTo && navigateRef.current) {
          // navigateTo now contains the full path including tab (e.g., /nurse/queue)
          navigateRef.current(notification.navigateTo);
        }
        browserNotif.close();
      };

      // Auto-close after 8 seconds for non-urgent
      if (!notification.title?.includes('🚨')) {
        setTimeout(() => browserNotif.close(), 8000);
      }
    } catch (err) {
      console.error('Browser notification failed:', err);
    }
  }, [browserNotificationsEnabled]);

  // Connect with a specific role token
  const connect = useCallback((role) => {
    const token = localStorage.getItem(`token_${role}`);
    if (!token) {
      console.warn('No token found for role:', role);
      return;
    }

    // Disconnect existing socket if any
    if (socketRef.current) {
      console.log('🔌 Disconnecting previous socket');
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    console.log('🔌 Creating new socket connection');
    const newSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('🔌 Connected to notification server');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 Disconnected from notification server');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      setIsConnected(false);
    });

    newSocket.on('notification', (notification) => {
      console.log('📨 Received notification:', notification);
      
      // Add to notifications list (deduplicate by ID)
      setNotifications(prev => {
        // Check if notification with this ID already exists
        const exists = prev.some(n => n.id === notification.id);
        if (exists) {
          console.log('⚠️ Duplicate notification ignored:', notification.id);
          return prev; // Don't add duplicate
        }
        return [notification, ...prev].slice(0, 50);
      });
      
      // Show browser notification (faster than toast)
      showBrowserNotification(notification);
      
      // Also show toast notification as fallback
      const isUrgent = notification.title?.includes('🚨') || 
                       notification.title?.includes('EMERGENCY') ||
                       notification.title?.includes('URGENT');
      
      toast({
        title: notification.title,
        description: notification.message,
        status: isUrgent ? 'warning' : 'info',
        duration: isUrgent ? 10000 : 5000,
        isClosable: true,
        position: 'top-right',
      });

      // Acknowledge receipt
      newSocket.emit('notification_received', notification.id);
    });

    socketRef.current = newSocket;
    setSocket(newSocket);
  }, [toast, showBrowserNotification]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      console.log('🔌 Disconnecting socket');
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    }
  }, []);

  // Clear notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Mark notification as read
  const markAsRead = useCallback((notificationId) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  }, []);

  // Set navigation function (called from NotificationBell)
  const setNavigateFunction = useCallback((navigateFn) => {
    navigateRef.current = navigateFn;
  }, []);

  // Set tab change function (called from dashboard components)
  const setTabFunction = useCallback((setTabFn) => {
    setTabRef.current = setTabFn;
  }, []);

  // Navigate to notification destination
  const navigateToNotification = useCallback((notification) => {
    if (notification.navigateTo && navigateRef.current) {
      // navigateTo now contains the full path including tab (e.g., /nurse/queue)
      navigateRef.current(notification.navigateTo);
    }
    markAsRead(notification.id);
  }, [markAsRead]);

  // Get unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        console.log('🔌 Cleaning up socket on unmount');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  return (
    <NotificationContext.Provider value={{
      socket,
      isConnected,
      notifications,
      unreadCount,
      browserNotificationsEnabled,
      connect,
      disconnect,
      clearNotifications,
      markAsRead,
      setNavigateFunction,
      setTabFunction,
      navigateToNotification
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export default NotificationContext;
