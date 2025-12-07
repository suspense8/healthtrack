import { 
  Box, VStack, Heading, Text, Button, Divider, HStack, Icon,
  Card, CardHeader, CardBody, useToast 
} from '@chakra-ui/react';
import { FiLogOut, FiUser, FiLock, FiBell } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function SettingsPage() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const handleLogout = () => {
    logout();
    toast({
      title: 'Logged out successfully',
      status: 'success',
      duration: 2000
    });
    navigate('/login');
  };

  return (
    <Box>
      <Heading size="lg" mb={6}>Settings</Heading>
      
      <VStack spacing={6} align="stretch">
        {/* Account Settings Card */}
        <Card>
          <CardHeader>
            <HStack>
              <Icon as={FiUser} boxSize={5} color="blue.500" />
              <Heading size="md">Account Settings</Heading>
            </HStack>
          </CardHeader>
          <CardBody>
            <VStack align="stretch" spacing={4}>
              <Box>
                <Text fontWeight="bold" color="gray.600" mb={1}>Name</Text>
                <Text fontSize="lg">{user?.name || 'N/A'}</Text>
              </Box>
              
              <Divider />
              
              <Box>
                <Text fontWeight="bold" color="gray.600" mb={1}>Staff ID</Text>
                <Text fontSize="lg">{user?.staff_id || 'N/A'}</Text>
              </Box>
              
              <Divider />
              
              <Box>
                <Text fontWeight="bold" color="gray.600" mb={1}>Role</Text>
                <Text fontSize="lg" textTransform="capitalize">{user?.role || 'N/A'}</Text>
              </Box>
              
              <Divider />
              
              <Button 
                leftIcon={<Icon as={FiLock} />} 
                colorScheme="blue" 
                variant="outline"
                size="sm"
                alignSelf="flex-start"
                onClick={() => {
                  // Navigate to profile page
                  const module = user?.role === 'receptionist' ? 'reception' : 
                                user?.role === 'lab_tech' ? 'lab' : 
                                user?.role === 'pharmacist' ? 'pharmacy' : 
                                user?.role;
                  navigate(`/${module}/profile`);
                }}
              >
                Change Password
              </Button>
            </VStack>
          </CardBody>
        </Card>

        {/* Notifications Card */}
        <Card>
          <CardHeader>
            <HStack>
              <Icon as={FiBell} boxSize={5} color="purple.500" />
              <Heading size="md">Notifications</Heading>
            </HStack>
          </CardHeader>
          <CardBody>
            <Text color="gray.500">Notification preferences will be available here.</Text>
          </CardBody>
        </Card>

        {/* Logout Section */}
        <Card>
          <CardHeader>
            <HStack>
              <Icon as={FiLogOut} boxSize={5} color="red.500" />
              <Heading size="md">Session</Heading>
            </HStack>
          </CardHeader>
          <CardBody>
            <VStack align="stretch" spacing={3}>
              <Text color="gray.600">
                Logging out will end your current session.
              </Text>
              <Button 
                colorScheme="red" 
                leftIcon={<Icon as={FiLogOut} />}
                onClick={handleLogout}
                size="md"
                w="fit-content"
              >
                Logout
              </Button>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
}
