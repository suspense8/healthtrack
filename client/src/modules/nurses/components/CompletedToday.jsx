import { useState, useEffect } from 'react';
import {
  Box, Heading, Table, Thead, Tbody, Tr, Th, Td, Badge, 
  Text, Spinner, Center, VStack, Tabs, TabList, TabPanels, Tab, TabPanel,
  HStack, Stat, StatLabel, StatNumber, SimpleGrid, Button
} from '@chakra-ui/react';
import { CheckIcon } from '@chakra-ui/icons';
import api from '../../../services/api';

export default function CompletedToday() {
  const [vitalsCompleted, setVitalsCompleted] = useState([]);
  const [dischargedToday, setDischargedToday] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [vitalsRes, admissionsRes] = await Promise.all([
        api.get('/nurses/queue?status=process'),
        api.get('/admission/admitted?includeAll=true')  // Include discharged for history
      ]);

      setVitalsCompleted(vitalsRes.data);

      // Filter discharged today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const discharged = admissionsRes.data.filter(a => {
        if (a.admission_status !== 'Discharged') return false;
        const dischargeDate = new Date(a.discharged_at);
        return dischargeDate >= today;
      });
      setDischargedToday(discharged);
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return <Center h="300px"><Spinner size="xl" color="purple.500" /></Center>;
  }

  return (
    <Box>
      <HStack justify="space-between" mb={6}>
        <Heading size="sm">Completed Today</Heading>
        <Button size="sm" onClick={fetchData} isLoading={loading}>
          Refresh
        </Button>
      </HStack>
      {/* Stats */}
      <SimpleGrid columns={3} spacing={4} mb={6}>
        <Stat p={4} bg="green.50" borderRadius="md" borderLeft="4px solid" borderColor="green.400">
          <StatLabel>Vitals Completed</StatLabel>
          <StatNumber color="green.600">{vitalsCompleted.length}</StatNumber>
        </Stat>
        <Stat p={4} bg="blue.50" borderRadius="md" borderLeft="4px solid" borderColor="blue.400">
          <StatLabel>Discharged Today</StatLabel>
          <StatNumber color="blue.600">{dischargedToday.length}</StatNumber>
        </Stat>
        <Stat p={4} bg="purple.50" borderRadius="md" borderLeft="4px solid" borderColor="purple.400">
          <StatLabel>Total Completed</StatLabel>
          <StatNumber color="purple.600">{vitalsCompleted.length + dischargedToday.length}</StatNumber>
        </Stat>
      </SimpleGrid>

      <Tabs variant="enclosed" colorScheme="purple">
        <TabList>
          <Tab>Vitals Completed ({vitalsCompleted.length})</Tab>
          <Tab>Discharged Today ({dischargedToday.length})</Tab>
        </TabList>

        <TabPanels>
          {/* Vitals Completed */}
          <TabPanel px={0}>
            {vitalsCompleted.length === 0 ? (
              <Center h="150px">
                <Text color="gray.500">No vitals completed yet today</Text>
              </Center>
            ) : (
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th>Queue #</Th>
                    <Th>Patient</Th>
                    <Th>BP</Th>
                    <Th>HR</Th>
                    <Th>Temp</Th>
                    <Th>Status</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {vitalsCompleted.map((v) => (
                    <Tr key={v.visit_id}>
                      <Td fontWeight="bold">{v.queue_number}</Td>
                      <Td>{v.patient?.first_name} {v.patient?.last_name}</Td>
                      <Td>{v.systolic_bp}/{v.diastolic_bp}</Td>
                      <Td>{v.heart_rate}</Td>
                      <Td>{v.temperature}°C</Td>
                      <Td>
                        <Badge colorScheme="green">{v.queue_status}</Badge>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </TabPanel>

          {/* Discharged Today */}
          <TabPanel px={0}>
            {dischargedToday.length === 0 ? (
              <Center h="150px">
                <VStack>
                  <CheckIcon boxSize={8} color="green.400" />
                  <Text color="gray.500">No discharges today yet</Text>
                </VStack>
              </Center>
            ) : (
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th>Patient</Th>
                    <Th>Ward</Th>
                    <Th>Bed</Th>
                    <Th>Admitted</Th>
                    <Th>Discharged</Th>
                    <Th>Status</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {dischargedToday.map((d) => (
                    <Tr key={d.admission_id}>
                      <Td fontWeight="bold">
                        {d.patient?.first_name} {d.patient?.last_name}
                      </Td>
                      <Td>{d.ward?.ward_name}</Td>
                      <Td>{d.bed?.bed_number}</Td>
                      <Td fontSize="xs">{new Date(d.admitted_at).toLocaleDateString()}</Td>
                      <Td fontSize="xs">{new Date(d.discharged_at).toLocaleTimeString()}</Td>
                      <Td>
                        <Badge colorScheme="green">Discharged</Badge>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
}
