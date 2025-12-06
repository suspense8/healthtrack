import { useState, useEffect } from 'react';
import {
  Box, Heading, SimpleGrid, Text, Badge, Spinner, Center,
  VStack, HStack, Progress, Stat, StatLabel, StatNumber, Icon,
  Table, Thead, Tbody, Tr, Th, Td, Divider, Button
} from '@chakra-ui/react';
import { FaWalking, FaStethoscope, FaBed, FaCheckCircle, FaHourglass } from 'react-icons/fa';
import api from '../../../services/api';

export default function PatientFlowTracker() {
  const [flowData, setFlowData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchFlow = async () => {
    try {
      const res = await api.get('/admin/patient-flow');
      setFlowData(res.data);
    } catch (error) {
      console.error('Failed to fetch patient flow', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlow();
    const interval = setInterval(fetchFlow, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <Center h="400px"><Spinner size="xl" color="red.500" /></Center>;
  }

  const { flow, summary } = flowData || { flow: {}, summary: {} };

  const FlowStage = ({ icon, title, count, color, patients }) => (
    <Box bg="white" p={4} borderRadius="lg" boxShadow="sm" borderTop="4px solid" borderColor={`${color}.500`}>
      <HStack mb={3}>
        <Icon as={icon} boxSize={5} color={`${color}.500`} />
        <Text fontWeight="bold">{title}</Text>
        <Badge colorScheme={color} ml="auto">{count}</Badge>
      </HStack>
      <VStack align="stretch" spacing={2} maxH="200px" overflowY="auto">
        {patients?.length === 0 ? (
          <Text fontSize="sm" color="gray.400" textAlign="center">No patients</Text>
        ) : (
          patients?.slice(0, 5).map((p, i) => (
            <HStack key={i} fontSize="sm" p={2} bg="gray.50" borderRadius="md">
              <Text fontWeight="medium">Q{p.queue_number}</Text>
              <Text>{p.patient?.first_name} {p.patient?.last_name}</Text>
              {p.is_emergency && <Badge colorScheme="red" size="sm">EMERG</Badge>}
            </HStack>
          ))
        )}
        {patients?.length > 5 && (
          <Text fontSize="xs" color="gray.500" textAlign="center">
            +{patients.length - 5} more
          </Text>
        )}
      </VStack>
    </Box>
  );

  const completionRate = summary.total > 0 
    ? Math.round((summary.completed / summary.total) * 100) 
    : 0;

  return (
    <Box>
      <HStack justify="space-between" mb={6}>
        <Heading size="md">Today's Patient Flow</Heading>
        <HStack spacing={4}>
          <Button size="sm" onClick={fetchFlow} isLoading={loading}>
            Refresh
          </Button>
          <Stat textAlign="center">
            <StatLabel fontSize="xs">Total Today</StatLabel>
            <StatNumber fontSize="lg">{summary.total}</StatNumber>
          </Stat>
          <Stat textAlign="center">
            <StatLabel fontSize="xs">Completed</StatLabel>
            <StatNumber fontSize="lg" color="green.500">{summary.completed}</StatNumber>
          </Stat>
          <Stat textAlign="center">
            <StatLabel fontSize="xs">In Progress</StatLabel>
            <StatNumber fontSize="lg" color="blue.500">{summary.inProgress}</StatNumber>
          </Stat>
        </HStack>
      </HStack>

      {/* Flow Progress Bar */}
      <Box bg="white" p={4} borderRadius="lg" boxShadow="sm" mb={6}>
        <HStack justify="space-between" mb={2}>
          <Text fontSize="sm" fontWeight="medium">Completion Rate</Text>
          <Text fontSize="sm" color="green.500">{completionRate}%</Text>
        </HStack>
        <Progress value={completionRate} colorScheme="green" borderRadius="full" size="lg" />
      </Box>

      {/* Flow Stages */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3, xl: 6 }} spacing={4} mb={6}>
        <FlowStage 
          icon={FaHourglass} 
          title="Waiting" 
          count={summary.waiting} 
          color="gray" 
          patients={flow.waiting}
        />
        <FlowStage 
          icon={FaWalking} 
          title="In Vitals" 
          count={flow.inVitals?.length || 0} 
          color="purple" 
          patients={flow.inVitals}
        />
        <FlowStage 
          icon={FaStethoscope} 
          title="With Doctor" 
          count={flow.withDoctor?.length || 0} 
          color="blue" 
          patients={flow.withDoctor}
        />
        <FlowStage 
          icon={FaBed} 
          title="Pending Admission" 
          count={summary.pendingAdmission} 
          color="orange" 
          patients={flow.pendingAdmission}
        />
        <FlowStage 
          icon={FaBed} 
          title="Admitted" 
          count={summary.admitted} 
          color="red" 
          patients={flow.admitted}
        />
        <FlowStage 
          icon={FaCheckCircle} 
          title="Completed" 
          count={summary.completed} 
          color="green" 
          patients={flow.completed}
        />
      </SimpleGrid>

      {/* Detailed Queue */}
      <Box bg="white" p={5} borderRadius="lg" boxShadow="sm">
        <Heading size="sm" mb={4}>Queue Details</Heading>
        <Table variant="simple" size="sm">
          <Thead>
            <Tr>
              <Th>Queue #</Th>
              <Th>Patient</Th>
              <Th>Status</Th>
              <Th>Visit Type</Th>
              <Th>Reason</Th>
            </Tr>
          </Thead>
          <Tbody>
            {[...(flow.waiting || []), ...(flow.inVitals || []), ...(flow.withDoctor || [])]
              .sort((a, b) => a.queue_number - b.queue_number)
              .slice(0, 15)
              .map((visit) => (
                <Tr key={visit.visit_id}>
                  <Td fontWeight="bold">{visit.queue_number}</Td>
                  <Td>{visit.patient?.first_name} {visit.patient?.last_name}</Td>
                  <Td>
                    <Badge 
                      colorScheme={
                        visit.queue_status === 'Waiting' ? 'gray' :
                        visit.queue_status === 'With Doctor' ? 'blue' : 'purple'
                      }
                    >
                      {visit.queue_status}
                    </Badge>
                  </Td>
                  <Td>
                    {visit.is_emergency ? (
                      <Badge colorScheme="red">Emergency</Badge>
                    ) : (
                      <Text fontSize="sm">{visit.visit_type}</Text>
                    )}
                  </Td>
                  <Td maxW="200px" isTruncated>{visit.visit_reason || '-'}</Td>
                </Tr>
              ))}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
}
