import { useState, useEffect } from 'react';
import {
  Box, Heading, Table, Thead, Tbody, Tr, Th, Td, Badge, 
  HStack, Text, Spinner, Center, Select, Input, VStack,
  InputGroup, InputLeftElement, Button, useDisclosure,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, 
  ModalCloseButton, ModalFooter, SimpleGrid, FormControl, FormLabel,
  Alert, AlertIcon, Divider, Collapse, IconButton
} from '@chakra-ui/react';
import { SearchIcon, ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons';
import api from '../../../services/api';

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters
  const [filterAction, setFilterAction] = useState('all');
  const [filterUser, setFilterUser] = useState('all');
  const [filterEntity, setFilterEntity] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Advanced filters visibility
  const { isOpen: isAdvancedOpen, onToggle: onAdvancedToggle } = useDisclosure();
  
  // Selected log for detail view
  const [selectedLog, setSelectedLog] = useState(null);
  const { isOpen: isDetailOpen, onOpen: onDetailOpen, onClose: onDetailClose } = useDisclosure();

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('limit', '500');
      if (filterAction !== 'all') params.append('action', filterAction);
      if (filterUser !== 'all') params.append('userId', filterUser);
      if (filterEntity !== 'all') params.append('entity', filterEntity);
      if (filterRole !== 'all') params.append('role', filterRole);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const [logsRes, usersRes] = await Promise.all([
        api.get(`/admin/logs?${params.toString()}`),
        api.get('/admin/users')
      ]);
      
      setLogs(logsRes.data || []);
      setUsers(usersRes.data || []);
    } catch (error) {
      console.error('Failed to fetch logs', error);
      setError(error.response?.data?.error || 'Failed to load activity logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filterAction, filterUser, filterEntity, filterRole, startDate, endDate]);

  const getActionBadgeColor = (action) => {
    if (action.includes('CREATE') || action.includes('REGISTER')) return 'green';
    if (action.includes('UPDATE') || action.includes('EDIT') || action.includes('VERIFY')) return 'blue';
    if (action.includes('DELETE')) return 'red';
    if (action.includes('LOGIN')) return 'purple';
    if (action.includes('CHECK_IN') || action.includes('CHECKIN')) return 'teal';
    if (action.includes('DISPENSE') || action.includes('STOCKOUT') || action.includes('CANCEL')) return 'orange';
    if (action.includes('CONSULTATION') || action.includes('VITALS')) return 'cyan';
    return 'gray';
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return then.toLocaleDateString();
  };

  const handleClearFilters = () => {
    setFilterAction('all');
    setFilterUser('all');
    setFilterEntity('all');
    setFilterRole('all');
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
  };

  const handleViewDetails = (log) => {
    setSelectedLog(log);
    onDetailOpen();
  };

  // Get unique values for filters
  const uniqueActions = [...new Set(logs.map(l => l.action))].sort();
  const uniqueEntities = [...new Set(logs.map(l => l.entity))].sort();
  const uniqueRoles = [...new Set(users.map(u => u.role))].sort();

  // Filter logs by search query
  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const action = (log.action || '').toLowerCase();
    const entity = (log.entity || '').toLowerCase();
    const username = (log.user?.username || '').toLowerCase();
    const role = (log.user?.role || '').toLowerCase();
    const snapshot = (log.after_snapshot || '').toLowerCase();
    
    return action.includes(query) || 
           entity.includes(query) || 
           username.includes(query) || 
           role.includes(query) ||
           snapshot.includes(query);
  });

  if (loading && logs.length === 0) {
    return <Center h="400px"><Spinner size="xl" color="red.500" /></Center>;
  }

  return (
    <Box>
      <HStack justify="space-between" mb={6}>
        <Heading size="md">Activity Logs</Heading>
        <HStack spacing={4}>
          <Button size="sm" onClick={fetchLogs} isLoading={loading}>
            Refresh
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={onAdvancedToggle}
            rightIcon={isAdvancedOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
          >
            {isAdvancedOpen ? 'Hide' : 'Show'} Filters
          </Button>
        </HStack>
      </HStack>

      {error && (
        <Alert status="error" borderRadius="md" mb={4}>
          <AlertIcon />
          <Text>{error}</Text>
        </Alert>
      )}

      {/* Advanced Filters */}
      <Collapse in={isAdvancedOpen} animateOpacity>
        <Box bg="white" p={6} borderRadius="lg" boxShadow="sm" mb={6}>
          <Heading size="sm" mb={4}>Advanced Filters</Heading>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4} mb={4}>
            <FormControl>
              <FormLabel fontSize="sm">Action Type</FormLabel>
              <Select 
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                bg="white"
              >
                <option value="all">All Actions</option>
                {uniqueActions.map(action => (
                  <option key={action} value={action}>{action}</option>
                ))}
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm">Entity Type</FormLabel>
              <Select 
                value={filterEntity}
                onChange={(e) => setFilterEntity(e.target.value)}
                bg="white"
              >
                <option value="all">All Entities</option>
                {uniqueEntities.map(entity => (
                  <option key={entity} value={entity}>{entity}</option>
                ))}
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm">User Role</FormLabel>
              <Select 
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                bg="white"
              >
                <option value="all">All Roles</option>
                {uniqueRoles.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm">User</FormLabel>
              <Select 
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
                bg="white"
              >
                <option value="all">All Users</option>
                {users.map(user => (
                  <option key={user.user_id} value={user.user_id}>{user.username} ({user.role})</option>
                ))}
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm">Start Date</FormLabel>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                bg="white"
              />
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm">End Date</FormLabel>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                bg="white"
              />
            </FormControl>
          </SimpleGrid>

          <HStack justify="space-between">
            <InputGroup maxW="400px">
              <InputLeftElement><SearchIcon color="gray.400" /></InputLeftElement>
              <Input 
                placeholder="Search in actions, entities, users, details..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                bg="white"
              />
            </InputGroup>
            <Button size="sm" variant="outline" onClick={handleClearFilters}>
              Clear All
            </Button>
          </HStack>
        </Box>
      </Collapse>

      {/* Quick Filters */}
      <HStack spacing={4} mb={4} flexWrap="wrap">
        <Select 
          w="180px" 
          placeholder="Filter by action" 
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          bg="white"
        >
          <option value="all">All Actions</option>
          {uniqueActions.map(action => (
            <option key={action} value={action}>{action}</option>
          ))}
        </Select>
        <Select 
          w="180px" 
          placeholder="Filter by user" 
          value={filterUser}
          onChange={(e) => setFilterUser(e.target.value)}
          bg="white"
        >
          <option value="all">All Users</option>
          {users.map(user => (
            <option key={user.user_id} value={user.user_id}>{user.username}</option>
          ))}
        </Select>
        <Text fontSize="sm" color="gray.500">
          Showing {filteredLogs.length} of {logs.length} logs
        </Text>
      </HStack>

      <Box bg="white" borderRadius="lg" boxShadow="sm" overflowX="auto">
        <Table variant="simple" size="sm">
          <Thead bg="gray.50">
            <Tr>
              <Th>Time</Th>
              <Th>User</Th>
              <Th>Action</Th>
              <Th>Entity</Th>
              <Th>Details</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filteredLogs.length === 0 ? (
              <Tr>
                <Td colSpan={6} textAlign="center" py={8}>
                  <Text color="gray.500">
                    {error ? 'Error loading logs' : 'No activity logs found'}
                  </Text>
                </Td>
              </Tr>
            ) : (
              filteredLogs.map((log) => {
                try {
                  return (
                    <Tr key={log.audit_id} _hover={{ bg: 'gray.50' }} cursor="pointer" onClick={() => handleViewDetails(log)}>
                      <Td>
                        <VStack align="start" spacing={0}>
                          <Text fontSize="sm" fontWeight="medium">
                            {formatTimeAgo(log.created_at)}
                          </Text>
                          <Text fontSize="xs" color="gray.500">
                            {new Date(log.created_at).toLocaleString()}
                          </Text>
                        </VStack>
                      </Td>
                      <Td>
                        <VStack align="start" spacing={0}>
                          <Text fontWeight="medium">{log.user?.username || 'System'}</Text>
                          <Badge size="sm" colorScheme={
                            log.user?.role === 'admin' ? 'red' :
                            log.user?.role === 'doctor' ? 'green' :
                            log.user?.role === 'nurse' ? 'purple' :
                            log.user?.role === 'pharmacist' ? 'orange' :
                            log.user?.role === 'receptionist' ? 'blue' : 'gray'
                          }>
                            {log.user?.role || 'unknown'}
                          </Badge>
                        </VStack>
                      </Td>
                      <Td>
                        <Badge colorScheme={getActionBadgeColor(log.action)}>
                          {log.action}
                        </Badge>
                      </Td>
                      <Td>
                        <Text>{log.entity}</Text>
                        {log.entity_id && (
                          <Text fontSize="xs" color="gray.500">ID: {log.entity_id}</Text>
                        )}
                      </Td>
                      <Td maxW="300px">
                        {log.after_snapshot ? (
                          <Text fontSize="xs" color="gray.600" noOfLines={2}>
                            {typeof log.after_snapshot === 'string' 
                              ? (log.after_snapshot.length > 100 
                                  ? log.after_snapshot.substring(0, 100) + '...'
                                  : log.after_snapshot)
                              : JSON.stringify(log.after_snapshot).substring(0, 100) + '...'
                            }
                          </Text>
                        ) : (
                          <Text fontSize="xs" color="gray.400">No details</Text>
                        )}
                      </Td>
                      <Td>
                        <Button size="xs" onClick={(e) => { e.stopPropagation(); handleViewDetails(log); }}>
                          View
                        </Button>
                      </Td>
                    </Tr>
                  );
                } catch (err) {
                  console.error('Error rendering log row:', err, log);
                  return null;
                }
              })
            )}
          </Tbody>
        </Table>
      </Box>

      {/* Detail Modal */}
      <Modal isOpen={isDetailOpen} onClose={onDetailClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Activity Log Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedLog && (
              <VStack align="stretch" spacing={4}>
                <SimpleGrid columns={2} spacing={4}>
                  <Box>
                    <Text fontSize="xs" color="gray.500">Time</Text>
                    <Text fontWeight="bold">{new Date(selectedLog.created_at).toLocaleString()}</Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color="gray.500">User</Text>
                    <Text fontWeight="bold">{selectedLog.user?.username || 'System'}</Text>
                    <Badge>{selectedLog.user?.role || 'unknown'}</Badge>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color="gray.500">Action</Text>
                    <Badge colorScheme={getActionBadgeColor(selectedLog.action)}>
                      {selectedLog.action}
                    </Badge>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color="gray.500">Entity</Text>
                    <Text fontWeight="bold">{selectedLog.entity}</Text>
                    {selectedLog.entity_id && (
                      <Text fontSize="xs">ID: {selectedLog.entity_id}</Text>
                    )}
                  </Box>
                </SimpleGrid>
                
                <Divider />
                
                {selectedLog.before_snapshot && (
                  <Box>
                    <Text fontSize="sm" fontWeight="bold" mb={2}>Before</Text>
                    <Box p={3} bg="red.50" borderRadius="md">
                      <Text fontSize="xs" fontFamily="mono" whiteSpace="pre-wrap">
                        {typeof selectedLog.before_snapshot === 'string' 
                          ? selectedLog.before_snapshot 
                          : JSON.stringify(selectedLog.before_snapshot, null, 2)}
                      </Text>
                    </Box>
                  </Box>
                )}
                
                {selectedLog.after_snapshot && (
                  <Box>
                    <Text fontSize="sm" fontWeight="bold" mb={2}>After</Text>
                    <Box p={3} bg="green.50" borderRadius="md">
                      <Text fontSize="xs" fontFamily="mono" whiteSpace="pre-wrap">
                        {typeof selectedLog.after_snapshot === 'string' 
                          ? selectedLog.after_snapshot 
                          : JSON.stringify(selectedLog.after_snapshot, null, 2)}
                      </Text>
                    </Box>
                  </Box>
                )}
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button onClick={onDetailClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
