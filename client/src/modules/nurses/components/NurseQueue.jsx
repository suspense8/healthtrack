import { useState, useEffect } from 'react';
import { 
  Box, Table, Thead, Tbody, Tr, Th, Td, Badge, Button, useToast, Heading, useDisclosure,
  IconButton, Tooltip
} from '@chakra-ui/react';
import { ViewIcon, EditIcon } from '@chakra-ui/icons';
import api from '../../../services/api';
import VitalsForm from './VitalsForm';
import PatientDetailModal from './PatientDetailModal';

export default function NurseQueue({ status = 'active' }) {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState(null);
  
  // Modals
  const { 
    isOpen: isVitalsOpen, 
    onOpen: onVitalsOpen, 
    onClose: onVitalsClose 
  } = useDisclosure();
  
  const { 
    isOpen: isDetailOpen, 
    onOpen: onDetailOpen, 
    onClose: onDetailClose 
  } = useDisclosure();

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
    setSelectedVisit(visit);
    onDetailOpen();
  };

  const handleAction = (actionType) => {
    if (actionType === 'triage') {
      onDetailClose();
      onVitalsOpen();
    }
  };

  return (
    <Box overflowX="auto">
      <Button size="sm" onClick={fetchQueue} mb={4}>Refresh</Button>
      <Table variant="simple" _hover={{ cursor: 'pointer' }}>
        <Thead>
          <Tr>
            <Th>Queue #</Th>
            <Th>Patient</Th>
            <Th>Reason</Th>
            <Th>Status</Th>
            <Th>Action</Th>
          </Tr>
        </Thead>
        <Tbody>
          {queue.map((visit) => (
            <Tr key={visit.visit_id} _hover={{ bg: 'gray.50' }}>
              <Td fontWeight="bold" onClick={() => handleRowClick(visit)}>#{visit.queue_number}</Td>
              <Td onClick={() => handleRowClick(visit)}>
                {visit.patient.first_name} {visit.patient.last_name}
                {visit.is_emergency && <Badge ml={2} colorScheme="red">EMERGENCY</Badge>}
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
                <Tooltip label="View Details">
                  <IconButton 
                    icon={<ViewIcon />} 
                    size="sm" 
                    mr={2} 
                    onClick={(e) => { e.stopPropagation(); handleRowClick(visit); }}
                  />
                </Tooltip>
                {status === 'active' && (
                  <Button 
                    size="sm" 
                    colorScheme="blue" 
                    leftIcon={<EditIcon />}
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setSelectedVisit(visit); 
                      onVitalsOpen(); 
                    }}
                  >
                    Triage
                  </Button>
                )}
              </Td>
            </Tr>
          ))}
          {queue.length === 0 && <Tr><Td colSpan={5} textAlign="center">No patients found</Td></Tr>}
        </Tbody>
      </Table>

      {selectedVisit && (
        <>
          <VitalsForm 
            isOpen={isVitalsOpen} 
            onClose={onVitalsClose} 
            visit={selectedVisit} 
            onSuccess={fetchQueue} 
          />
          <PatientDetailModal
            isOpen={isDetailOpen}
            onClose={onDetailClose}
            visit={selectedVisit}
            onAction={handleAction}
          />
        </>
      )}
    </Box>
  );
}
