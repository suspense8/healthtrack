import { useState, useEffect } from 'react';
import { 
  Box, Heading, Text, VStack, Card, CardBody, CardHeader, Divider, Button,
  Input, FormControl, FormLabel, useToast, HStack, Icon, Badge,
  InputGroup, InputRightElement, IconButton
} from '@chakra-ui/react';
import { EditIcon, CheckIcon, CloseIcon, ViewIcon, ViewOffIcon } from '@chakra-ui/icons';
import { FiUser, FiLock } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import ModuleLayout from '../components/shared/ModuleLayout';

export default function Profile() {
  const { user, updateUser } = useAuth();
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
    return { title: 'Profile', color: 'blue' };
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

  // Profile state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [username, setUsername] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password state
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Initialize username from user data
  useEffect(() => {
    if (user) {
      setUsername(user.username);
    }
  }, [user]);

  const handleSaveProfile = async () => {
    if (!username.trim()) {
      toast({ title: 'Username cannot be empty', status: 'warning', duration: 3000 });
      return;
    }

    setSavingProfile(true);
    try {
      const res = await api.patch('/auth/profile', { username: username.trim() });
      
      // Update user in context
      updateUser({ ...user, username: res.data.username });
      
      toast({ 
        title: 'Profile updated successfully', 
        description: 'Your username has been changed.',
        status: 'success', 
        duration: 3000 
      });
      setIsEditingProfile(false);
    } catch (error) {
      console.error('Profile update error:', error);
      toast({ 
        title: 'Failed to update profile', 
        description: error.response?.data?.error || 'Unknown error',
        status: 'error', 
        duration: 4000 
      });
      // Reset to original username on error
      setUsername(user.username);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCancelEdit = () => {
    setUsername(user.username);
    setIsEditingProfile(false);
  };

  const handleChangePassword = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordData;

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({ title: 'All password fields are required', status: 'warning', duration: 3000 });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({ title: 'New passwords do not match', status: 'error', duration: 3000 });
      return;
    }

    if (newPassword.length < 6) {
      toast({ title: 'Password must be at least 6 characters', status: 'warning', duration: 3000 });
      return;
    }

    setSavingPassword(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword
      });

      toast({ 
        title: 'Password changed successfully', 
        description: 'Please use your new password on next login.',
        status: 'success', 
        duration: 4000 
      });

      // Reset password form
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setIsChangingPassword(false);
    } catch (error) {
      console.error('Password change error:', error);
      toast({ 
        title: 'Failed to change password', 
        description: error.response?.data?.error || 'Unknown error',
        status: 'error', 
        duration: 4000 
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleCancelPasswordChange = () => {
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setIsChangingPassword(false);
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  return (
    <ModuleLayout title={moduleInfo.title} color={moduleInfo.color} navItems={getNavItems()}>
      <Box maxW="container.md" mx="auto" pb={8}>
        <VStack spacing={6} align="stretch">
          {/* Profile Information Card */}
          <Card>
            <CardHeader>
              <HStack justify="space-between">
                <HStack>
                  <Icon as={FiUser} boxSize={5} color="blue.500" />
                  <Heading size="md">Profile Information</Heading>
                </HStack>
                {!isEditingProfile && (
                  <Button
                    leftIcon={<EditIcon />}
                    size="sm"
                    colorScheme="blue"
                    variant="ghost"
                    onClick={() => setIsEditingProfile(true)}
                  >
                    Edit Profile
                  </Button>
                )}
              </HStack>
            </CardHeader>
            <CardBody>
              <VStack align="stretch" spacing={4}>
                <FormControl>
                  <FormLabel>Name</FormLabel>
                  {isEditingProfile ? (
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your name"
                      autoFocus
                    />
                  ) : (
                    <Text fontSize="lg" fontWeight="medium">{user?.name}</Text>
                  )}
                </FormControl>

                <Divider />

                <Box>
                  <Text fontWeight="bold" color="gray.600" mb={1}>Staff ID</Text>
                  <Text fontSize="lg" color="gray.700">{user?.staff_id || 'N/A'}</Text>
                  <Text fontSize="xs" color="gray.500" mt={1}>Staff ID cannot be changed</Text>
                </Box>

                <Divider />

                <Box>
                  <Text fontWeight="bold" color="gray.600" mb={1}>Role</Text>
                  <Badge colorScheme="blue" fontSize="md" px={3} py={1} textTransform="capitalize">
                    {user?.role || 'Staff'}
                  </Badge>
                </Box>

                <Divider />

                <Box>
                  <Text fontWeight="bold" color="gray.600" mb={1}>Account Status</Text>
                  <Badge colorScheme="green" fontSize="md" px={3} py={1}>Active</Badge>
                </Box>

                <Divider />

                <Box>
                  <Text fontWeight="bold" color="gray.600" mb={1}>User ID</Text>
                  <Text color="gray.500">#{user?.userId}</Text>
                </Box>

                {isEditingProfile && (
                  <>
                    <Divider />
                    <HStack spacing={3}>
                      <Button
                        leftIcon={<CheckIcon />}
                        colorScheme="green"
                        onClick={handleSaveProfile}
                        isLoading={savingProfile}
                      >
                        Save Changes
                      </Button>
                      <Button
                        leftIcon={<CloseIcon />}
                        variant="ghost"
                        onClick={handleCancelEdit}
                        isDisabled={savingProfile}
                      >
                        Cancel
                      </Button>
                    </HStack>
                  </>
                )}
              </VStack>
            </CardBody>
          </Card>

          {/* Change Password Card */}
          <Card>
            <CardHeader>
              <HStack justify="space-between">
                <HStack>
                  <Icon as={FiLock} boxSize={5} color="purple.500" />
                  <Heading size="md">Security</Heading>
                </HStack>
                {!isChangingPassword && (
                  <Button
                    leftIcon={<EditIcon />}
                    size="sm"
                    colorScheme="purple"
                    variant="ghost"
                    onClick={() => setIsChangingPassword(true)}
                  >
                    Change Password
                  </Button>
                )}
              </HStack>
            </CardHeader>
            <CardBody>
              {!isChangingPassword ? (
                <Text color="gray.600">
                  Keep your account secure by regularly updating your password.
                </Text>
              ) : (
                <VStack align="stretch" spacing={4}>
                  <FormControl isRequired>
                    <FormLabel>Current Password</FormLabel>
                    <InputGroup>
                      <Input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                        placeholder="Enter current password"
                      />
                      <InputRightElement>
                        <IconButton
                          icon={showCurrentPassword ? <ViewOffIcon /> : <ViewIcon />}
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          aria-label="Toggle password visibility"
                        />
                      </InputRightElement>
                    </InputGroup>
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel>New Password</FormLabel>
                    <InputGroup>
                      <Input
                        type={showNewPassword ? 'text' : 'password'}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                        placeholder="Enter new password (min 6 characters)"
                      />
                      <InputRightElement>
                        <IconButton
                          icon={showNewPassword ? <ViewOffIcon /> : <ViewIcon />}
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          aria-label="Toggle password visibility"
                        />
                      </InputRightElement>
                    </InputGroup>
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel>Confirm New Password</FormLabel>
                    <InputGroup>
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                        placeholder="Re-enter new password"
                      />
                      <InputRightElement>
                        <IconButton
                          icon={showConfirmPassword ? <ViewOffIcon /> : <ViewIcon />}
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          aria-label="Toggle password visibility"
                        />
                      </InputRightElement>
                    </InputGroup>
                  </FormControl>

                  <Divider />

                  <HStack spacing={3}>
                    <Button
                      leftIcon={<CheckIcon />}
                      colorScheme="purple"
                      onClick={handleChangePassword}
                      isLoading={savingPassword}
                    >
                      Change Password
                    </Button>
                    <Button
                      leftIcon={<CloseIcon />}
                      variant="ghost"
                      onClick={handleCancelPasswordChange}
                      isDisabled={savingPassword}
                    >
                      Cancel
                    </Button>
                  </HStack>
                </VStack>
              )}
            </CardBody>
          </Card>

          {/* Back Button */}
          <Button
            onClick={() => navigate(-1)}
            variant="outline"
            colorScheme="gray"
          >
            Back to Dashboard
          </Button>
        </VStack>
      </Box>
    </ModuleLayout>
  );
}