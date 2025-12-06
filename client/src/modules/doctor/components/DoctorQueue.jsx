import { useState, useEffect } from 'react';
import { 
  Box, Table, Thead, Tbody, Tr, Th, Td, Badge, Button, useToast 
} from '@chakra-ui/react';
import api from '../../../services/api';

export default function DoctorQueue({ onStartConsult }) {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await api.get('/doctor/queue');
      setQueue(res.data);
    } catch (error) {
      console.error("Failed to fetch queue", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 30000);
    return () => clearInterval(interval);
  }, []);

  // Removed internal handleConsultation, now using prop


  return (
    <Box overflowX="auto">
      <Button size="sm" onClick={fetchQueue} mb={4}>Refresh</Button>
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>Queue #</Th>
            <Th>Patient</Th>
            <Th>Status</Th>
            <Th>Action</Th>
          </Tr>
        </Thead>
        <Tbody>
          {queue.map((visit) => (
            <Tr key={visit.visit_id}>
              <Td fontWeight="bold">#{visit.queue_number}</Td>
              <Td>{visit.patient.first_name} {visit.patient.last_name}</Td>
              <Td><Badge colorScheme="green">{visit.queue_status}</Badge></Td>
              <Td>
                <Button size="sm" colorScheme="teal" onClick={() => onStartConsult(visit)}>
                  Start Consult
                </Button>
              </Td>
            </Tr>
          ))}
          {queue.length === 0 && <Tr><Td colSpan={4} textAlign="center">No patients waiting</Td></Tr>}
        </Tbody>
      </Table>
    </Box>
  );
}
