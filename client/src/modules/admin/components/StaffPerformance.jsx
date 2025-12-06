import { useState, useEffect } from 'react';
import {
  Box, Heading, SimpleGrid, Text, Badge, Spinner, Center,
  VStack, HStack, Stat, StatLabel, StatNumber, Icon, Table, Thead, Tbody, Tr, Th, Td,
  Progress, Button
} from '@chakra-ui/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { FaUserMd, FaUserNurse, FaFlask, FaPills } from 'react-icons/fa';
import api from '../../../services/api';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function StaffPerformance() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await api.get('/admin/analytics/staff');
      setData(res.data);
    } catch (error) {
      console.error('Failed to fetch staff performance', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return <Center h="400px"><Spinner size="xl" color="red.500" /></Center>;
  }

  return (
    <Box>
      <HStack justify="space-between" mb={6}>
        <Heading size="md">Staff Performance & Productivity</Heading>
        <Button size="sm" onClick={fetchData} isLoading={loading}>
          Refresh
        </Button>
      </HStack>

      {/* Stats Row */}
      <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4} mb={6}>
        <Stat p={4} bg="white" borderRadius="lg" boxShadow="sm" borderLeft="4px solid" borderColor="blue.500">
          <HStack>
            <Icon as={FaUserMd} boxSize={8} color="blue.500" />
            <Box>
              <StatLabel>Total Consultations</StatLabel>
              <StatNumber>{data?.totalConsultations || 0}</StatNumber>
            </Box>
          </HStack>
        </Stat>
        <Stat p={4} bg="white" borderRadius="lg" boxShadow="sm" borderLeft="4px solid" borderColor="purple.500">
          <HStack>
            <Icon as={FaUserNurse} boxSize={8} color="purple.500" />
            <Box>
              <StatLabel>Nurses</StatLabel>
              <StatNumber>{data?.staffByRole?.find(s => s.role === 'nurse')?.count || 0}</StatNumber>
            </Box>
          </HStack>
        </Stat>
        <Stat p={4} bg="white" borderRadius="lg" boxShadow="sm" borderLeft="4px solid" borderColor="cyan.500">
          <HStack>
            <Icon as={FaFlask} boxSize={8} color="cyan.500" />
            <Box>
              <StatLabel>Lab Technicians</StatLabel>
              <StatNumber>{data?.staffByRole?.find(s => s.role === 'lab_tech')?.count || 0}</StatNumber>
            </Box>
          </HStack>
        </Stat>
        <Stat p={4} bg="white" borderRadius="lg" boxShadow="sm" borderLeft="4px solid" borderColor="green.500">
          <HStack>
            <Icon as={FaPills} boxSize={8} color="green.500" />
            <Box>
              <StatLabel>Pharmacists</StatLabel>
              <StatNumber>{data?.staffByRole?.find(s => s.role === 'pharmacist')?.count || 0}</StatNumber>
            </Box>
          </HStack>
        </Stat>
      </SimpleGrid>

      {/* Charts Row */}
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6} mb={6}>
        {/* Staff by Role */}
        <Box bg="white" p={5} borderRadius="lg" boxShadow="sm">
          <Heading size="sm" mb={4}>Staff Distribution by Role</Heading>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={data?.staffByRole || []}
                dataKey="count"
                nameKey="role"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ role, percent }) => `${role} ${(percent * 100).toFixed(0)}%`}
              >
                {(data?.staffByRole || []).map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Box>

        {/* Pharmacist Performance */}
        <Box bg="white" p={5} borderRadius="lg" boxShadow="sm">
          <Heading size="sm" mb={4}>Pharmacist - Prescriptions Dispensed</Heading>
          {(data?.pharmacistPerformance?.length || 0) === 0 ? (
            <Center h="250px">
              <Text color="gray.500">No data available</Text>
            </Center>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data?.pharmacistPerformance || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#00C49F" name="Prescriptions" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Box>
      </SimpleGrid>

      {/* Lab Tech Performance */}
      <Box bg="white" p={5} borderRadius="lg" boxShadow="sm">
        <Heading size="sm" mb={4}>Lab Technicians - Tests Processed</Heading>
        {(data?.labTechPerformance?.length || 0) === 0 ? (
          <Center h="150px">
            <Text color="gray.500">No data available</Text>
          </Center>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data?.labTechPerformance || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#8884D8" name="Lab Tests" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Box>
    </Box>
  );
}
