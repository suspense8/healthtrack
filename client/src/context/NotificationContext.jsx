import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useToast } from '@chakra-ui/react';

const NotificationContext = createContext(null);

const SOCKET_URL = 'http://localhost:3000';

export const NotificationProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const toast = useToast();

  // Connect with a specific role token
  const connect = useCallback((role) => {
    const token = localStorage.getItem(`token_${role}`);
    if (!token) {
      console.warn('No token found for role:', role);
      return;
    }

    // Disconnect existing socket if any
    if (socket) {
      socket.disconnect();
    }

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
      
      // Add to notifications list
      setNotifications(prev => [notification, ...prev].slice(0, 50)); // Keep last 50
      
      // Show toast notification
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

    setSocket(newSocket);
  }, [socket, toast]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
    }
  }, [socket]);

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

  // Get unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [socket]);

  return (
    <NotificationContext.Provider value={{
      socket,
      isConnected,
      notifications,
      unreadCount,
      connect,
      disconnect,
      clearNotifications,
      markAsRead
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
