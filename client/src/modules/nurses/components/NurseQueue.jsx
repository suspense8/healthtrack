import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Table, Thead, Tbody, Tr, Th, Td, Badge, Button, useToast, Heading,
  IconButton, Tooltip, HStack, Text
} from '@chakra-ui/react';
import { ViewIcon, EditIcon } from '@chakra-ui/icons';
import { FaHeartbeat } from 'react-icons/fa';
import api from '../../../services/api';

export default function NurseQueue({ status = 'active' }) {
  const navigate = useNavigate();
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/nurses/queue?status=${status}`);
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
  }, [status]);

  const handleRowClick = (visit) => {
    navigate(`/nurse/patient/${visit.visit_id}`);
  };

  // A visit has obstetric triage if it carries an obstetric_visit record
  const isObstetricCase = (visit) => {
    return !!visit.obstetric_visit;
  };

  return (
    <Box overflowX="auto">
      <Button size="sm" onClick={fetchQueue} mb={4}>Refresh</Button>
      <Table variant="simple" _hover={{ cursor: 'pointer' }}>
        <Thead>
          <Tr>
            <Th>Position</Th>
            <Th>Patient</Th>
            <Th>Reason</Th>
            <Th>Status</Th>
            <Th>Action</Th>
          </Tr>
        </Thead>
        <Tbody>
          {queue.map((visit) => (
            <Tr key={visit.visit_id} _hover={{ bg: 'gray.50' }}>
              <Td fontWeight="bold" onClick={() => handleRowClick(visit)}>
                #{visit.position}
                <Box as="span" fontSize="xs" color="gray.400" ml={1} fontWeight="normal">
                  (arrival #{visit.queue_number})
                </Box>
              </Td>
              <Td onClick={() => handleRowClick(visit)}>
                {visit.patient.first_name} {visit.patient.last_name}
                {visit.is_emergency && <Badge ml={2} colorScheme="red">{visit.emergency_subtype || 'EMERGENCY'}</Badge>}
                {visit.appointment_id && <Badge ml={2} colorScheme="blue">Appointment</Badge>}
              </Td>
              <Td maxW="200px" isTruncated onClick={() => handleRowClick(visit)}>{visit.visit_reason}</Td>
              <Td onClick={() => handleRowClick(visit)}>
                <Badge
                  colorScheme={
                    visit.queue_status === 'Emergency' ? 'red' :
                      visit.queue_status === 'Completed' ? 'green' :
                        visit.queue_status === 'In Progress' ? 'blue' : 'gray'
                  }
                >
                  {visit.queue_status}
                </Badge>
              </Td>
              <Td>
                <HStack>
                  <Tooltip label="View Details">
                    <IconButton
                      icon={<ViewIcon />}
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); handleRowClick(visit); }}
                    />
                  </Tooltip>
                  {status === 'active' && (
                    isObstetricCase(visit) ? (
                      <Button
                        size="sm"
                        colorScheme="pink"
                        leftIcon={<FaHeartbeat />}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/nurse/obstetric-triage/${visit.visit_id}`);
                        }}
                      >
                        {visit.emergency_subtype || 'Emergency'} Triage
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        colorScheme="purple"
                        leftIcon={<EditIcon />}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/nurse/vitals/${visit.visit_id}`);
                        }}
                      >
                        Triage
                      </Button>
                    )
                  )}
                </HStack>
              </Td>
            </Tr>
          ))}
          {queue.length === 0 && <Tr><Td colSpan={5} textAlign="center">No patients found</Td></Tr>}
        </Tbody>
      </Table>
    </Box>
  );
}
