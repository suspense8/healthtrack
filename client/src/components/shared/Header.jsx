import { 
  Box, Flex, Heading, Text, Button, Menu, MenuButton, MenuList, MenuItem, MenuDivider,
  Avatar, HStack, Badge, Spacer, VStack, Icon
} from '@chakra-ui/react';
import { ChevronDownIcon } from '@chakra-ui/icons';
import { FiUser, FiLogOut, FiSettings } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useOffline } from '../../context/OfflineContext';

export default function Header({ moduleTitle, moduleColor = 'blue' }) {
  const { user, logout } = useAuth();
  const { isOnline, pendingCount, triggerSync } = useOffline();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return 'red';
      case 'doctor': return 'green';
      case 'nurse': return 'purple';
      case 'receptionist': return 'blue';
      case 'pharmacist': return 'teal';
      case 'lab_tech': return 'orange';
      default: return 'gray';
    }
  };

  return (
    <Box 
      bg="white" 
      px={6} 
      py={3} 
      borderBottom="1px" 
      borderColor="gray.200" 
      boxShadow="sm"
      pos="fixed"
      top={0}
      left="64"
      right={0}
      zIndex={10}
    >
      <Flex alignItems="center">
        {/* Left: System Name */}
        <HStack spacing={3}>
          <Heading size="md" color="gray.700" fontWeight="semibold">
            Njala University Clinic
          </Heading>
          {moduleTitle && (
            <>
              <Text color="gray.400">|</Text>
              <Text color={`${moduleColor}.500`} fontWeight="bold">{moduleTitle}</Text>
            </>
          )}
        </HStack>

        <Spacer />

        {/* Center/Right: Status Indicators */}
        <HStack spacing={4} mr={6}>
          {!isOnline && <Badge colorScheme="red" fontSize="0.9em" px={2} py={1}>OFFLINE</Badge>}
          {pendingCount > 0 && (
            <Badge 
              colorScheme="orange" 
              cursor="pointer" 
              onClick={triggerSync}
              fontSize="0.9em" 
              px={2} 
              py={1}
            >
              {pendingCount} Pending Sync
            </Badge>
          )}
        </HStack>

        {/* Right: Profile Menu */}
        <Menu>
          <MenuButton 
            as={Button} 
            rightIcon={<ChevronDownIcon />} 
            variant="ghost"
            _hover={{ bg: 'gray.100' }}
          >
            <HStack>
              <Avatar size="sm" name={user?.username} bg={`${moduleColor}.500`} color="white" />
              <Text display={{ base: 'none', md: 'block' }} fontWeight="medium">{user?.username}</Text>
            </HStack>
          </MenuButton>
          <MenuList minW="280px" p={0}>
            {/* User Info Section */}
            <Box p={4} bg="gray.50" borderBottom="1px" borderColor="gray.100">
              <HStack spacing={3}>
                <Avatar size="lg" name={user?.username} bg={`${moduleColor}.500`} color="white" />
                <VStack align="start" spacing={0}>
                  <Text fontWeight="bold" fontSize="lg">{user?.username}</Text>
                  <Badge colorScheme={getRoleBadgeColor(user?.role)} textTransform="capitalize">
                    {user?.role || 'Staff'}
                  </Badge>
                  <Text fontSize="xs" color="gray.500" mt={1}>ID: {user?.userId}</Text>
                </VStack>
              </HStack>
            </Box>
            
            {/* Menu Items */}
            <Box py={2}>
              <MenuItem icon={<Icon as={FiUser} />} onClick={() => navigate('/profile')}>
                My Profile
              </MenuItem>
              <MenuItem icon={<Icon as={FiSettings} />}>
                Account Settings
              </MenuItem>
              <MenuDivider />
              <MenuItem 
                icon={<Icon as={FiLogOut} />} 
                onClick={handleLogout} 
                color="red.500"
                _hover={{ bg: 'red.50' }}
              >
                Sign Out
              </MenuItem>
            </Box>
          </MenuList>
        </Menu>
      </Flex>
    </Box>
  );
}

