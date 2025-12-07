import { 
  Box, VStack, Heading, Text, Button, Divider, HStack, Icon,
  Card, CardHeader, CardBody, useToast 
} from '@chakra-ui/react';
import { FiLogOut, FiUser, FiLock, FiBell } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import ModuleLayout from '../components/shared/ModuleLayout';

export default function SettingsPage() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  // Determine module details
  const getModuleInfo = () => {
    const path = location.pathname;
    if (path.startsWith('/reception')) return { title: 'Reception', color: 'blue' };
    if (path.startsWith('/nurse')) return { title: 'Nurse Station', color: 'purple' };
    if (path.startsWith('/doctor')) return { title: 'Doctor Portal', color: 'green' };
    if (path.startsWith('/admin')) return { title: 'Admin Panel', color: 'red' };
    if (path.startsWith('/pharmacy')) return { title: 'Pharmacy', color: 'teal' };
    if (path.startsWith('/lab')) return { title: 'Laboratory', color: 'cyan' };
    return { title: 'Settings', color: 'blue' };
  };

  const moduleInfo = getModuleInfo();

  // Define navigation items based on module
  const getNavItems = () => {
    const path = location.pathname;
    if (path.startsWith('/reception')) {
      return [
        { id: 'search', label: 'Search Patients' },
        { id: 'register', label: 'Register Patient' },
        { id: 'records', label: 'Attendance Records' }
      ];
    }
    if (path.startsWith('/nurse')) {
      return [
        { id: 'queue', label: 'Patient Queue' },
        { id: 'wards', label: 'Ward Management' }
      ];
    }
    if (path.startsWith('/doctor')) {
      return [
        { id: 'consultation', label: 'Consultations' },
        { id: 'admissions', label: 'Admissions' }
      ];
    }
    if (path.startsWith('/admin')) {
      return [
        { id: 'analytics', label: 'Analytics Dashboard' },
        { id: 'users', label: 'User Management' }
      ];
    }
    if (path.startsWith('/pharmacy')) {
      return [
        { id: 'prescriptions', label: 'Prescriptions' },
        { id: 'inventory', label: 'Inventory' }
      ];
    }
    if (path.startsWith('/lab')) {
      return [
        { id: 'tests', label: 'Lab Tests' },
        { id: 'results', label: 'Results' }
      ];
    }
    return [];
  };

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
    <ModuleLayout title={moduleInfo.title} color={moduleInfo.color} navItems={getNavItems()}>
      <Box maxW="container.lg" mx="auto">
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
                  Edit Profile & Change Password
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
    </ModuleLayout>
  );
}
