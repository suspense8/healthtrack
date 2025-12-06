import { useState, useEffect } from 'react';
import {
  Box, Heading, SimpleGrid, Stat, StatLabel, StatNumber, StatHelpText,
  HStack, VStack, Text, Select, Spinner, Center, Badge, Icon
} from '@chakra-ui/react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { FaUsers, FaUserMd, FaFlask, FaPills, FaCalendarCheck, FaBed, FaClock } from 'react-icons/fa';
import api from '../../../services/api';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function AnalyticsDashboard() {
  const [stats, setStats] = useState(null);
  const [visitData, setVisitData] = useState(null);
  const [patientData, setPatientData] = useState(null);
  const [clinicalData, setClinicalData] = useState(null);
  const [period, setPeriod] = useState('7d');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [statsRes, visitRes, patientRes, clinicalRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get(`/admin/analytics/visits?period=${period}`),
        api.get('/admin/analytics/patients'),
        api.get('/admin/analytics/clinical')
      ]);
      setStats(statsRes.data);
      setVisitData(visitRes.data);
      setPatientData(patientRes.data);
      setClinicalData(clinicalRes.data);
    } catch (error) {
      console.error('Failed to fetch analytics', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [period]);

  const StatCard = ({ icon, label, value, helpText, color }) => (
    <Stat p={4} bg="white" borderRadius="lg" boxShadow="sm" borderLeft="4px solid" borderColor={`${color}.500`}>
      <HStack>
        <Icon as={icon} boxSize={6} color={`${color}.500`} />
        <Box>
          <StatLabel color="gray.500" fontSize="xs">{label}</StatLabel>
          <StatNumber fontSize="xl">{value ?? '-'}</StatNumber>
          {helpText && <StatHelpText fontSize="xs" mb={0}>{helpText}</StatHelpText>}
        </Box>
      </HStack>
    </Stat>
  );

  if (loading) {
    return <Center h="400px"><Spinner size="xl" color="red.500" /></Center>;
  }

  return (
    <Box>
      {/* Period Selector */}
      <HStack justify="space-between" mb={6}>
        <Heading size="md">Analytics Overview</Heading>
        <Select w="150px" value={period} onChange={(e) => setPeriod(e.target.value)} bg="white">
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
        </Select>
      </HStack>

      {/* Stats Cards */}
      <SimpleGrid columns={{ base: 2, md: 4, lg: 7 }} spacing={4} mb={6}>
        <StatCard icon={FaUsers} label="Total Patients" value={stats?.totalPatients} color="blue" />
        <StatCard icon={FaUserMd} label="Staff Users" value={stats?.totalUsers} color="green" />
        <StatCard icon={FaCalendarCheck} label="Today's Visits" value={stats?.todayVisits} color="purple" />
        <StatCard icon={FaBed} label="Admitted" value={stats?.admittedPatients} color="orange" />
        <StatCard icon={FaClock} label="Pending Admission" value={stats?.pendingAdmissions} color="yellow" />
        <StatCard icon={FaFlask} label="Pending Labs" value={stats?.pendingLabOrders} color="cyan" />
        <StatCard icon={FaPills} label="Pending Rx" value={stats?.pendingPrescriptions} color="red" />
      </SimpleGrid>

      {/* Charts Row 1 */}
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6} mb={6}>
        {/* Visit Trend */}
        <Box bg="white" p={5} borderRadius="lg" boxShadow="sm">
          <Heading size="sm" mb={4}>Visit Trends</Heading>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={visitData?.dailyTrend || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="total" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} name="Total" />
              <Area type="monotone" dataKey="emergency" stroke="#ff7300" fill="#ff7300" fillOpacity={0.3} name="Emergency" />
            </AreaChart>
          </ResponsiveContainer>
        </Box>

        {/* Peak Hours */}
        <Box bg="white" p={5} borderRadius="lg" boxShadow="sm">
          <Heading size="sm" mb={4}>Peak Hours</Heading>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={visitData?.peakHours?.filter((_, i) => i >= 6 && i <= 20) || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#00C49F" name="Visits" />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </SimpleGrid>

      {/* Charts Row 2 */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6} mb={6}>
        {/* Visit Types */}
        <Box bg="white" p={5} borderRadius="lg" boxShadow="sm">
          <Heading size="sm" mb={4}>Visit Types</Heading>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={visitData?.visitTypeBreakdown || []}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={70}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {(visitData?.visitTypeBreakdown || []).map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Box>

        {/* Gender Distribution */}
        <Box bg="white" p={5} borderRadius="lg" boxShadow="sm">
          <Heading size="sm" mb={4}>Patient Gender</Heading>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={patientData?.genderDistribution || []}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={70}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {(patientData?.genderDistribution || []).map((_, index) => (
                  <Cell key={`cell-${index}`} fill={index === 0 ? '#0088FE' : '#FF69B4'} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Box>

        {/* Age Distribution */}
        <Box bg="white" p={5} borderRadius="lg" boxShadow="sm">
          <Heading size="sm" mb={4}>Age Distribution</Heading>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={patientData?.ageDistribution || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={50} />
              <Tooltip />
              <Bar dataKey="value" fill="#8884d8" name="Patients" />
            </BarChart>
          </ResponsiveContainer>
        </Box>

        {/* Admissions by Ward */}
        <Box bg="white" p={5} borderRadius="lg" boxShadow="sm">
          <Heading size="sm" mb={4}>Admissions by Ward</Heading>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={clinicalData?.admissionsByWard || []}
                dataKey="count"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={70}
              >
                {(clinicalData?.admissionsByWard || []).map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Box>
      </SimpleGrid>

      {/* Charts Row 3 */}
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
        {/* Top Diagnoses */}
        <Box bg="white" p={5} borderRadius="lg" boxShadow="sm">
          <Heading size="sm" mb={4}>Top 10 Diagnoses</Heading>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={clinicalData?.topDiagnoses || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={120} />
              <Tooltip />
              <Bar dataKey="count" fill="#FF8042" name="Cases" />
            </BarChart>
          </ResponsiveContainer>
        </Box>

        {/* Patient Registration Trend */}
        <Box bg="white" p={5} borderRadius="lg" boxShadow="sm">
          <Heading size="sm" mb={4}>New Registrations (30 Days)</Heading>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={patientData?.registrationTrend || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#00C49F" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </SimpleGrid>
    </Box>
  );
}
