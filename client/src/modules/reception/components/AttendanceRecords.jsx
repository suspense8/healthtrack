import { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Input,
  Select,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Text,
  Spinner,
  useToast,
  Heading,
  Flex,
  InputGroup,
  InputLeftElement,
  Icon,
  Divider,
} from '@chakra-ui/react';
import { SearchIcon, CalendarIcon } from '@chakra-ui/icons';
import api from '../../../services/api';

export default function AttendanceRecords() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    patientName: '',
    visitType: 'All',
    isEmergency: 'All',
    queueStatus: 'All',
  });
  const toast = useToast();

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.patientName) params.patientName = filters.patientName;
      if (filters.visitType !== 'All') params.visitType = filters.visitType;
      if (filters.isEmergency !== 'All') params.isEmergency = filters.isEmergency;
      if (filters.queueStatus !== 'All') params.queueStatus = filters.queueStatus;

      const response = await api.get('/reception/attendance-records', { params });
      
      // Validate response data
      if (!Array.isArray(response.data)) {
        throw new Error('Invalid response format: expected array of records');
      }
      
      // Validate each record has required fields
      const validRecords = response.data.filter(record => 
        record.visit_id && record.patient && record.queue_number !== undefined
      );
      
      if (validRecords.length !== response.data.length) {
        console.warn('Some records were filtered out due to missing required fields');
      }
      
      setRecords(validRecords);
    } catch (error) {
      console.error('Fetch records error:', error);
      
      let errorDescription = 'Failed to load attendance records';
      
      if (error.response?.status === 401) {
        errorDescription = 'Your session has expired. Please login again.';
      } else if (error.response?.status === 403) {
        errorDescription = 'You do not have permission to view attendance records.';
      } else if (error.response?.data?.error) {
        errorDescription = error.response.data.error;
      } else if (error.message) {
        errorDescription = error.message;
      }
      
      toast({
        title: 'Error fetching records',
        description: errorDescription,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      patientName: '',
      visitType: 'All',
      isEmergency: 'All',
      queueStatus: 'All',
    });
  };

  const handleApplyFilters = () => {
    fetchRecords();
  };

  // Group records by date
  const groupedRecords = records.reduce((acc, record) => {
    const date = new Date(record.visit_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(record);
    return acc;
  }, {});

  const getStatusColor = (status) => {
    const colors = {
      'Waiting': 'yellow',
      'In Progress': 'blue',
      'Completed': 'green',
      'Emergency': 'red',
      'Cancelled': 'gray',
    };
    return colors[status] || 'gray';
  };

  return (
    <Box>
      {/* Filter Section */}
      <Box bg="white" p={6} borderRadius="lg" boxShadow="sm" mb={6}>
        <Heading size="md" mb={4}>Filter Attendance Records</Heading>
        <VStack spacing={4} align="stretch">
          {/* Date Range */}
          <HStack spacing={4} flexWrap="wrap">
            <Box flex="1" minW="200px">
              <Text fontSize="sm" fontWeight="medium" mb={2}>Start Date</Text>
              <InputGroup>
                <InputLeftElement pointerEvents="none">
                  <CalendarIcon color="gray.400" />
                </InputLeftElement>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  placeholder="Start Date"
                />
              </InputGroup>
            </Box>
            <Box flex="1" minW="200px">
              <Text fontSize="sm" fontWeight="medium" mb={2}>End Date</Text>
              <InputGroup>
                <InputLeftElement pointerEvents="none">
                  <CalendarIcon color="gray.400" />
                </InputLeftElement>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  placeholder="End Date"
                />
              </InputGroup>
            </Box>
          </HStack>

          {/* Patient Name & Visit Type */}
          <HStack spacing={4} flexWrap="wrap">
            <Box flex="1" minW="200px">
              <Text fontSize="sm" fontWeight="medium" mb={2}>Patient Name</Text>
              <InputGroup>
                <InputLeftElement pointerEvents="none">
                  <SearchIcon color="gray.400" />
                </InputLeftElement>
                <Input
                  placeholder="Search by patient name..."
                  value={filters.patientName}
                  onChange={(e) => handleFilterChange('patientName', e.target.value)}
                />
              </InputGroup>
            </Box>
            <Box flex="1" minW="200px">
              <Text fontSize="sm" fontWeight="medium" mb={2}>Visit Type</Text>
              <Select
                value={filters.visitType}
                onChange={(e) => handleFilterChange('visitType', e.target.value)}
              >
                <option value="All">All Types</option>
                <option value="Walk-in">Walk-in</option>
                <option value="Appointment">Appointment</option>
              </Select>
            </Box>
          </HStack>

          {/* Emergency & Queue Status */}
          <HStack spacing={4} flexWrap="wrap">
            <Box flex="1" minW="200px">
              <Text fontSize="sm" fontWeight="medium" mb={2}>Emergency Status</Text>
              <Select
                value={filters.isEmergency}
                onChange={(e) => handleFilterChange('isEmergency', e.target.value)}
              >
                <option value="All">All</option>
                <option value="true">Emergency Only</option>
                <option value="false">Non-Emergency</option>
              </Select>
            </Box>
            <Box flex="1" minW="200px">
              <Text fontSize="sm" fontWeight="medium" mb={2}>Queue Status</Text>
              <Select
                value={filters.queueStatus}
                onChange={(e) => handleFilterChange('queueStatus', e.target.value)}
              >
                <option value="All">All Statuses</option>
                <option value="Waiting">Waiting</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Emergency">Emergency</option>
                <option value="Cancelled">Cancelled</option>
              </Select>
            </Box>
          </HStack>

          {/* Action Buttons */}
          <HStack spacing={3} justify="flex-end">
            <Button variant="outline" onClick={handleClearFilters}>
              Clear Filters
            </Button>
            <Button colorScheme="blue" onClick={handleApplyFilters}>
              Apply Filters
            </Button>
          </HStack>
        </VStack>
      </Box>

      {/* Records Table */}
      <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
        <HStack justify="space-between" mb={4}>
          <Heading size="md">
            Attendance Records
            <Badge ml={3} colorScheme="blue" fontSize="md">
              {records.length} {records.length === 1 ? 'Record' : 'Records'}
            </Badge>
          </Heading>
          <Button size="sm" onClick={fetchRecords} isLoading={loading}>
            Refresh
          </Button>
        </HStack>

        {loading ? (
          <Flex justify="center" align="center" py={10}>
            <Spinner size="xl" color="blue.500" thickness="4px" />
          </Flex>
        ) : records.length === 0 ? (
          <Box textAlign="center" py={10}>
            <Text fontSize="lg" color="gray.500">
              No attendance records found
            </Text>
            <Text fontSize="sm" color="gray.400" mt={2}>
              Try adjusting your filters or check back later
            </Text>
          </Box>
        ) : (
          <VStack spacing={6} align="stretch">
            {Object.entries(groupedRecords).map(([date, dateRecords]) => (
              <Box key={date}>
                <Flex align="center" mb={3}>
                  <Heading size="sm" color="blue.600">{date}</Heading>
                  <Divider ml={4} />
                </Flex>
                <Box overflowX="auto">
                  <Table variant="simple" size="sm">
                    <Thead bg="gray.50">
                      <Tr>
                        <Th>Time</Th>
                        <Th>Queue #</Th>
                        <Th>Patient Name</Th>
                        <Th>Patient ID</Th>
                        <Th>Visit Type</Th>
                        <Th>Reason</Th>
                        <Th>Status</Th>
                        <Th>Emergency</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {dateRecords.map((record) => (
                        <Tr key={record.visit_id} _hover={{ bg: 'gray.50' }}>
                          <Td>
                            {new Date(record.visit_time).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Td>
                          <Td fontWeight="bold">{record.queue_number}</Td>
                          <Td>
                            {record.patient.first_name} {record.patient.last_name}
                          </Td>
                          <Td>{record.patient.national_id || record.patient.patient_id}</Td>
                          <Td>
                            <Badge colorScheme={record.visit_type === 'Walk-in' ? 'purple' : 'teal'}>
                              {record.visit_type}
                            </Badge>
                          </Td>
                          <Td maxW="200px" isTruncated title={record.visit_reason}>
                            {record.visit_reason || 'N/A'}
                          </Td>
                          <Td>
                            <Badge colorScheme={getStatusColor(record.queue_status)}>
                              {record.queue_status}
                            </Badge>
                          </Td>
                          <Td>
                            {record.is_emergency ? (
                              <Badge colorScheme="red">Emergency</Badge>
                            ) : (
                              <Badge colorScheme="gray">Regular</Badge>
                            )}
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              </Box>
            ))}
          </VStack>
        )}
      </Box>
    </Box>
  );
}
