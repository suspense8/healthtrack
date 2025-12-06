import { useState } from 'react';
import {
  Box, Heading, VStack, HStack, Button, Select, FormControl, FormLabel,
  Input, useToast, Alert, AlertIcon, AlertTitle, AlertDescription,
  SimpleGrid, Text, Badge, Divider, Card, CardBody
} from '@chakra-ui/react';
import { DownloadIcon } from '@chakra-ui/icons';
import { FaFileCsv, FaFileAlt, FaChartLine, FaUsers, FaDatabase } from 'react-icons/fa';
import api from '../../../services/api';

export default function DataExport() {
  const [exportType, setExportType] = useState('welfare');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [format, setFormat] = useState('csv');
  const [patientType, setPatientType] = useState('Student');
  const [exporting, setExporting] = useState(false);
  const toast = useToast();

  const handleExport = async () => {
    setExporting(true);
    try {
      let endpoint = '';
      const params = new URLSearchParams();
      
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      params.append('format', format);
      
      switch (exportType) {
        case 'welfare':
          endpoint = `/admin/export/welfare?${params.toString()}&patientType=${patientType}`;
          break;
        case 'summary':
          endpoint = `/admin/export/summary?patientType=${patientType}`;
          break;
        case 'analytics':
          endpoint = `/admin/export/analytics?${params.toString()}&patientType=${patientType}`;
          break;
        default:
          throw new Error('Invalid export type');
      }

      const response = await api.get(endpoint, {
        responseType: 'blob'
      });

      // Create blob and download
      const blob = new Blob([response.data], { 
        type: format === 'csv' ? 'text/csv' : 'application/json' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename
      const dateStr = new Date().toISOString().split('T')[0];
      const typeNames = {
        welfare: 'student_welfare',
        summary: 'student_summary',
        analytics: 'visit_analytics'
      };
      link.download = `${typeNames[exportType]}_export_${dateStr}.${format === 'csv' ? 'csv' : 'json'}`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Export successful',
        description: 'Data has been downloaded',
        status: 'success',
        duration: 3000
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: 'Export failed',
        description: error.response?.data?.error || 'Failed to export data',
        status: 'error',
        duration: 5000
      });
    } finally {
      setExporting(false);
    }
  };

  const exportTypes = [
    {
      value: 'welfare',
      label: 'Comprehensive Welfare Data',
      description: 'Complete visit records with patient demographics, vitals, diagnoses, prescriptions, and lab results. One row per visit.',
      icon: FaDatabase,
      color: 'blue'
    },
    {
      value: 'summary',
      label: 'Student Summary',
      description: 'Aggregated data per student with visit counts, diagnoses, and health summary. One row per student.',
      icon: FaUsers,
      color: 'green'
    },
    {
      value: 'analytics',
      label: 'Visit Analytics',
      description: 'Daily aggregated statistics including visit counts, emergency rates, and visit types by date.',
      icon: FaChartLine,
      color: 'purple'
    }
  ];

  return (
    <Box>
      <Heading size="md" mb={6}>Data Export for Student Welfare Analysis</Heading>

      <Alert status="info" borderRadius="md" mb={6}>
        <AlertIcon />
        <Box>
          <AlertTitle>Export Data for Analysis</AlertTitle>
          <AlertDescription>
            Export comprehensive student welfare data in CSV or JSON format. 
            Use date ranges to filter data for specific time periods. 
            All exports include anonymized student information suitable for analysis.
          </AlertDescription>
        </Box>
      </Alert>

      <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={6} mb={6}>
        {exportTypes.map((type) => {
          const Icon = type.icon;
          const isSelected = exportType === type.value;
          
          return (
            <Card
              key={type.value}
              cursor="pointer"
              borderWidth={2}
              borderColor={isSelected ? `${type.color}.500` : 'gray.200'}
              bg={isSelected ? `${type.color}.50` : 'white'}
              onClick={() => setExportType(type.value)}
              _hover={{ borderColor: `${type.color}.400`, shadow: 'md' }}
              transition="all 0.2s"
            >
              <CardBody>
                <VStack align="start" spacing={3}>
                  <HStack>
                    <Icon color={`${type.color}.500`} size={24} />
                    <Text fontWeight="bold" fontSize="lg">{type.label}</Text>
                    {isSelected && <Badge colorScheme={type.color}>Selected</Badge>}
                  </HStack>
                  <Text fontSize="sm" color="gray.600">{type.description}</Text>
                </VStack>
              </CardBody>
            </Card>
          );
        })}
      </SimpleGrid>

      <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
        <VStack spacing={6} align="stretch">
          {/* Export Type Selection */}
          <FormControl>
            <FormLabel>Export Type</FormLabel>
            <Select value={exportType} onChange={(e) => setExportType(e.target.value)}>
              {exportTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </Select>
          </FormControl>

          {/* Patient Type */}
          <FormControl>
            <FormLabel>Patient Type</FormLabel>
            <Select value={patientType} onChange={(e) => setPatientType(e.target.value)}>
              <option value="Student">Student</option>
              <option value="Staff">Staff</option>
              <option value="Dependent">Dependent</option>
              <option value="External">External</option>
            </Select>
          </FormControl>

          {/* Date Range (not applicable for summary) */}
          {exportType !== 'summary' && (
            <>
              <Divider />
              <Text fontWeight="medium" fontSize="sm" color="gray.600">
                Date Range (Optional - leave empty for all data)
              </Text>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <FormControl>
                  <FormLabel>Start Date</FormLabel>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>End Date</FormLabel>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                  />
                </FormControl>
              </SimpleGrid>
            </>
          )}

          {/* Format Selection */}
          <Divider />
          <FormControl>
            <FormLabel>Export Format</FormLabel>
            <HStack spacing={4}>
              <Button
                leftIcon={<FaFileCsv />}
                colorScheme={format === 'csv' ? 'green' : 'gray'}
                variant={format === 'csv' ? 'solid' : 'outline'}
                onClick={() => setFormat('csv')}
                flex={1}
              >
                CSV
              </Button>
              <Button
                leftIcon={<FaFileAlt />}
                colorScheme={format === 'json' ? 'blue' : 'gray'}
                variant={format === 'json' ? 'solid' : 'outline'}
                onClick={() => setFormat('json')}
                flex={1}
              >
                JSON
              </Button>
            </HStack>
            <Text fontSize="xs" color="gray.500" mt={2}>
              CSV is recommended for Excel/Google Sheets analysis. JSON is better for programmatic analysis.
            </Text>
          </FormControl>

          {/* Export Button */}
          <Button
            leftIcon={<DownloadIcon />}
            colorScheme="blue"
            size="lg"
            onClick={handleExport}
            isLoading={exporting}
            loadingText="Exporting..."
            isDisabled={exporting}
          >
            Export Data
          </Button>

          {/* Export Information */}
          <Alert status="success" borderRadius="md" variant="left-accent">
            <AlertIcon />
            <Box>
              <Text fontSize="sm" fontWeight="bold">Export Includes:</Text>
              {exportType === 'welfare' && (
                <VStack align="start" spacing={1} mt={2} fontSize="xs">
                  <Text>• Patient demographics (ID, name, age, gender, contact)</Text>
                  <Text>• Visit details (date, time, type, reason, emergency status)</Text>
                  <Text>• Vitals (BP, HR, temperature, SpO2, weight, height)</Text>
                  <Text>• Clinical data (symptoms, diagnosis, treatment plan, notes)</Text>
                  <Text>• Prescriptions (medications, dosages, frequencies)</Text>
                  <Text>• Lab tests (test types, results, status)</Text>
                </VStack>
              )}
              {exportType === 'summary' && (
                <VStack align="start" spacing={1} mt={2} fontSize="xs">
                  <Text>• Student demographics and registration info</Text>
                  <Text>• Visit statistics (total, emergency, completed)</Text>
                  <Text>• Health summary (allergies, conditions, diagnoses)</Text>
                  <Text>• Treatment history (prescriptions, lab tests, appointments)</Text>
                </VStack>
              )}
              {exportType === 'analytics' && (
                <VStack align="start" spacing={1} mt={2} fontSize="xs">
                  <Text>• Daily visit counts and trends</Text>
                  <Text>• Emergency visit rates</Text>
                  <Text>• Visit type breakdown (walk-in vs appointment)</Text>
                  <Text>• Completion rates</Text>
                </VStack>
              )}
            </Box>
          </Alert>
        </VStack>
      </Box>
    </Box>
  );
}






