import { useState, useEffect, useRef } from 'react';
import {
  Box, Heading, Table, Thead, Tbody, Tr, Th, Td, Button, Select, useToast,
  HStack, IconButton, AlertDialog, AlertDialogBody, AlertDialogFooter,
  AlertDialogHeader, AlertDialogContent, AlertDialogOverlay, useDisclosure,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton,
  FormControl, FormLabel, Input, VStack, ModalFooter
} from '@chakra-ui/react';
import { DeleteIcon, SettingsIcon, AddIcon } from '@chakra-ui/icons';
import { FaChartLine, FaUsers, FaRoute, FaHistory, FaUsersCog, FaCog, FaUserShield, FaDatabase } from 'react-icons/fa';
import ModuleLayout from '../../../components/shared/ModuleLayout';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import PatientFlowTracker from '../components/PatientFlowTracker';
import ActivityLogs from '../components/ActivityLogs';
import StaffPerformance from '../components/StaffPerformance';
import DataExport from '../components/DataExport';
import api from '../../../services/api';

const navItems = [
  { id: 'analytics', label: 'Analytics Dashboard', icon: FaChartLine },
  { id: 'patient-flow', label: 'Patient Flow', icon: FaRoute },
  { id: 'staff', label: 'Staff Performance', icon: FaUsersCog },
  { id: 'logs', label: 'Activity Logs', icon: FaHistory },
  { id: 'export', label: 'Data Export', icon: FaDatabase },
  { id: 'users', label: 'User Management', icon: FaUsers },
  { id: 'settings', label: 'Settings', icon: FaCog },
];

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('analytics');
  const [selectedUser, setSelectedUser] = useState(null);
  
  // Delete Dialog State
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const cancelRef = useRef();
  
  // Create User Modal State
  const { isOpen: isCreateOpen, onOpen: onCreateOpen, onClose: onCreateClose } = useDisclosure();
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'doctor' });
  const [creating, setCreating] = useState(false);

  const toast = useToast();

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data);
    } catch (error) {
      console.error('Failed to fetch users', error);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.patch(`/admin/users/${userId}/role`, { role: newRole });
      toast({ title: 'Role updated', status: 'success' });
      fetchUsers();
    } catch (error) {
      toast({ title: 'Failed to update role', status: 'error' });
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    try {
      await api.delete(`/admin/users/${selectedUser.user_id}`);
      toast({ title: 'User deleted', status: 'success' });
      onDeleteClose();
      fetchUsers();
    } catch (error) {
      toast({ title: 'Failed to delete user', status: 'error' });
    }
  };

  const confirmDelete = (user) => {
    setSelectedUser(user);
    onDeleteOpen();
  };

  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.password) {
      toast({ title: 'Please fill all fields', status: 'warning' });
      return;
    }

    setCreating(true);
    try {
      await api.post('/admin/users', newUser);
      toast({ title: 'User created successfully', status: 'success' });
      onCreateClose();
      setNewUser({ username: '', password: '', role: 'doctor' });
      fetchUsers();
    } catch (error) {
      toast({ 
        title: 'Failed to create user', 
        description: error.response?.data?.error || 'Unknown error',
        status: 'error' 
      });
    } finally {
      setCreating(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'analytics':
        return <AnalyticsDashboard />;
      case 'patient-flow':
        return <PatientFlowTracker />;
      case 'staff':
        return <StaffPerformance />;
      case 'logs':
        return <ActivityLogs />;
      case 'export':
        return <DataExport />;
      case 'users':
        return (
          <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
            <HStack justify="space-between" mb={6}>
              <Heading size="md">User Management</Heading>
              <Button leftIcon={<AddIcon />} colorScheme="blue" onClick={onCreateOpen}>
                Create New User
              </Button>
            </HStack>
            
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>ID</Th>
                  <Th>Username</Th>
                  <Th>Role</Th>
                  <Th>Created</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {users.map((user) => (
                  <Tr key={user.user_id}>
                    <Td>{user.user_id}</Td>
                    <Td fontWeight="bold">{user.username}</Td>
                    <Td>
                      <Select
                        size="sm"
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.user_id, e.target.value)}
                        w="150px"
                      >
                        <option value="admin">Admin</option>
                        <option value="doctor">Doctor</option>
                        <option value="nurse">Nurse</option>
                        <option value="receptionist">Receptionist</option>
                        <option value="lab_tech">Lab Technician</option>
                        <option value="pharmacist">Pharmacist</option>
                      </Select>
                    </Td>
                    <Td>{new Date(user.created_at).toLocaleDateString()}</Td>
                    <Td>
                      <IconButton
                        icon={<DeleteIcon />}
                        colorScheme="red"
                        variant="ghost"
                        size="sm"
                        onClick={() => confirmDelete(user)}
                        aria-label="Delete user"
                      />
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        );
      case 'settings':
        return (
          <Box p={6} bg="white" borderRadius="lg" boxShadow="sm">
            <Heading size="md" mb={4}>System Settings</Heading>
            <Box color="gray.500">Settings configuration will be available here.</Box>
          </Box>
        );
      default:
        return <AnalyticsDashboard />;
    }
  };

  return (
    <ModuleLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      navItems={navItems}
      title="Admin Panel"
      color="red"
      moduleIcon={FaUserShield}
    >
      <Heading mb={6}>
        {navItems.find(n => n.id === activeTab)?.label || 'Dashboard'}
      </Heading>

      {renderContent()}

      {/* Delete Confirmation Dialog */}
      <AlertDialog isOpen={isDeleteOpen} leastDestructiveRef={cancelRef} onClose={onDeleteClose}>
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader>Delete User</AlertDialogHeader>
            <AlertDialogBody>
              Are you sure you want to delete <strong>{selectedUser?.username}</strong>? This action cannot be undone.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteClose}>Cancel</Button>
              <Button colorScheme="red" onClick={handleDeleteUser} ml={3}>Delete</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {/* Create User Modal */}
      <Modal isOpen={isCreateOpen} onClose={onCreateClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create New Staff User</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Username</FormLabel>
                <Input 
                  value={newUser.username}
                  onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                  placeholder="e.g. dr_smith"
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Password</FormLabel>
                <Input 
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  placeholder="Initial password"
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Role</FormLabel>
                <Select 
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                >
                  <option value="doctor">Doctor</option>
                  <option value="nurse">Nurse</option>
                  <option value="receptionist">Receptionist</option>
                  <option value="pharmacist">Pharmacist</option>
                  <option value="lab_tech">Lab Technician</option>
                  <option value="admin">Admin</option>
                </Select>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onCreateClose}>Cancel</Button>
            <Button colorScheme="blue" onClick={handleCreateUser} isLoading={creating}>
              Create User
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </ModuleLayout>
  );
}
