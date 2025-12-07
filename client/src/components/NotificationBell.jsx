import { useEffect } from 'react';
import {
  Box,
  IconButton,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverBody,
  PopoverArrow,
  PopoverCloseButton,
  VStack,
  HStack,
  Text,
  Badge,
  Divider,
  Button,
  useDisclosure,
  Tooltip
} from '@chakra-ui/react';
import { BellIcon } from '@chakra-ui/icons';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';

const NotificationBell = ({ role }) => {
  const { 
    notifications, 
    unreadCount, 
    connect, 
    disconnect, 
    isConnected,
    clearNotifications,
    markAsRead,
    setNavigateFunction,
    navigateToNotification,
    browserNotificationsEnabled
  } = useNotifications();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const navigate = useNavigate();

  // Register navigate function for click-to-navigate
  useEffect(() => {
    setNavigateFunction(navigate);
  }, [navigate, setNavigateFunction]);

  // Connect to socket when component mounts
  useEffect(() => {
    if (role) {
      connect(role);
    }
    return () => disconnect();
  }, [role]);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const getNotificationColor = (type) => {
    if (type?.includes('emergency') || type?.includes('urgent')) return 'red';
    if (type?.includes('lab')) return 'purple';
    if (type?.includes('prescription')) return 'green';
    if (type?.includes('admission') || type?.includes('admitted')) return 'orange';
    if (type?.includes('ready') || type?.includes('complete')) return 'blue';
    return 'gray';
  };

  const handleNotificationClick = (notification) => {
    navigateToNotification(notification);
    onClose();
  };

  return (
    <Popover isOpen={isOpen} onOpen={onOpen} onClose={onClose} placement="bottom-end">
      <PopoverTrigger>
        <Box position="relative" display="inline-block">
          <Tooltip label={
            browserNotificationsEnabled 
              ? 'Notifications enabled' 
              : 'Click to enable browser notifications'
          }>
            <IconButton
              icon={<BellIcon />}
              variant="ghost"
              aria-label="Notifications"
              size="lg"
              color={isConnected ? 'gray.600' : 'gray.400'}
            />
          </Tooltip>
          {unreadCount > 0 && (
            <Badge
              position="absolute"
              top="-1"
              right="-1"
              colorScheme="red"
              borderRadius="full"
              px={2}
              fontSize="xs"
              animation="pulse 2s infinite"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
          {/* Connection indicator */}
          <Box
            position="absolute"
            bottom="0"
            right="0"
            w="8px"
            h="8px"
            borderRadius="full"
            bg={isConnected ? 'green.400' : 'gray.300'}
            border="2px solid white"
          />
        </Box>
      </PopoverTrigger>
      
      <PopoverContent w="380px" maxH="450px" overflowY="auto">
        <PopoverArrow />
        <PopoverCloseButton />
        <PopoverHeader>
          <HStack justify="space-between">
            <HStack>
              <Text fontWeight="bold">Notifications</Text>
              {!browserNotificationsEnabled && (
                <Badge colorScheme="yellow" fontSize="xs">Desktop off</Badge>
              )}
            </HStack>
            {notifications.length > 0 && (
              <Button size="xs" variant="ghost" onClick={clearNotifications}>
                Clear all
              </Button>
            )}
          </HStack>
        </PopoverHeader>
        <PopoverBody p={0}>
          {notifications.length === 0 ? (
            <Box p={4} textAlign="center" color="gray.500">
              <Text>No notifications</Text>
              <Text fontSize="xs" mt={1}>
                You'll see workflow updates here
              </Text>
            </Box>
          ) : (
            <VStack spacing={0} align="stretch">
              {notifications.map((notif, index) => (
                <Box key={notif.id || index}>
                  <Box
                    p={3}
                    bg={notif.read ? 'white' : 'blue.50'}
                    _hover={{ bg: 'gray.100', cursor: 'pointer' }}
                    onClick={() => handleNotificationClick(notif)}
                    transition="background 0.2s"
                  >
                    <HStack justify="space-between" mb={1}>
                      <Badge colorScheme={getNotificationColor(notif.type)} size="sm">
                        {notif.type?.replace(/_/g, ' ').toUpperCase() || 'UPDATE'}
                      </Badge>
                      <Text fontSize="xs" color="gray.500">
                        {formatTime(notif.timestamp)}
                      </Text>
                    </HStack>
                    <Text fontWeight="semibold" fontSize="sm">
                      {notif.title}
                    </Text>
                    <Text fontSize="sm" color="gray.600">
                      {notif.message}
                    </Text>
                    {notif.navigateTo && (
                      <Text fontSize="xs" color="blue.500" mt={1}>
                        Click to view →
                      </Text>
                    )}
                  </Box>
                  {index < notifications.length - 1 && <Divider />}
                </Box>
              ))}
            </VStack>
          )}
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
