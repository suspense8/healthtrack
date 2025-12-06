import { useState, useEffect } from 'react';
import { 
  Box, Table, Thead, Tbody, Tr, Th, Td, Badge, Heading, 
  Button, HStack, IconButton, useToast, Menu, MenuButton, MenuList, MenuItem
} from '@chakra-ui/react';
import { ChevronDownIcon } from '@chakra-ui/icons';
import api from '../../../services/api';

export default function QueueBoard() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reception/queue');
      setQueue(res.data);
    } catch (error) {
      console.error("Failed to fetch queue", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  // Poll every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchQueue, 30000);
    return () => clearInterval(interval);
  }, []);

  const updateStatus = async (visitId, newStatus) => {
    try {
      await api.patch(`/reception/visits/${visitId}/status`, { queue_status: newStatus });
      toast({ title: `Visit marked as ${newStatus}`, status: 'success' });
      fetchQueue();
    } catch (error) {
      toast({ title: 'Failed to update status', status: 'error' });
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Waiting': return 'yellow';
      case 'waiting_for_vitals': return 'blue';
      case 'In Progress': return 'green';
      case 'Emergency': return 'red';
      case 'abandoned': return 'gray';
      default: return 'gray';
    }
  };

  return (
    <Box>
      <HStack justify="space-between" mb={4}>
        <Heading size="md">Current Queue</Heading>
        <Button size="sm" onClick={fetchQueue} isLoading={loading}>Refresh</Button>
      </HStack>
      
      <Box overflowX="auto">
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>Queue #</Th>
              <Th>Patient</Th>
              <Th>Status</Th>
              <Th>Type</Th>
              <Th>Emergency</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {(queue.map((visit) => (
              <Tr 
                key={visit.visit_id} 
                bg={visit.is_emergency ? 'red.100' : 'white'}
                borderLeft={visit.is_emergency ? '4px solid' : 'none'}
                borderLeftColor="red.500"
              >
                <Td fontWeight="bold">
                  {visit.is_emergency && <Badge colorScheme="red" mr={2}>🚨</Badge>}
                  #{visit.queue_number}
                </Td>
                <Td>
                  {visit.patient.first_name} {visit.patient.last_name}
                  {visit.patient.is_temp_record && <Badge ml={2} colorScheme="orange">TEMP</Badge>}
                  {visit.patient.allergies && <Badge ml={2} colorScheme="red">⚠</Badge>}
                </Td>
                <Td>
                  <Badge colorScheme={getStatusColor(visit.queue_status)}>
                    {visit.queue_status}
                  </Badge>
                </Td>
                <Td>{visit.visit_type}</Td>
                <Td>{visit.is_emergency ? <Badge colorScheme="red">YES</Badge> : 'No'}</Td>
                <Td>
                  <Menu>
                    <MenuButton as={Button} size="sm" rightIcon={<ChevronDownIcon />}>
                      Update
                    </MenuButton>
                    <MenuList>
                      {visit.queue_status === 'Waiting' && (
                        <MenuItem onClick={() => updateStatus(visit.visit_id, 'waiting_for_vitals')}>
                          Send to Nurse
                        </MenuItem>
                      )}
                      <MenuItem onClick={() => updateStatus(visit.visit_id, 'abandoned')} color="red.500">
                        Mark Abandoned / Left
                      </MenuItem>
                    </MenuList>
                  </Menu>
                </Td>
              </Tr>
            )))}
            {queue.length === 0 && (
              <Tr>
                <Td colSpan={6} textAlign="center">Queue is empty</Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
}
