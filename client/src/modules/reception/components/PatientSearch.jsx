import { useState } from 'react';
import { 
  Box, Input, Button, VStack, Text, Card, CardBody, Stack, 
  Heading, Badge, HStack, IconButton, useDisclosure, Select, FormControl, FormLabel
} from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';
import api from '../../../services/api';
import CheckInModal from './CheckInModal';
import PatientVerificationModal from './PatientVerificationModal';

export default function PatientSearch() {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState('all');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [modalType, setModalType] = useState(null); // 'checkin' or 'verify'
  const { isOpen, onOpen, onClose } = useDisclosure();

  const handleSearch = async () => {
    if (!query) return;
    setLoading(true);
    try {
      const res = await api.get(`/reception/patients?query=${query}&searchType=${searchType}`);
      setResults(res.data);
    } catch (error) {
      console.error("Search failed", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckInClick = (patient) => {
    setSelectedPatient(patient);
    setModalType('checkin');
    onOpen();
  };

  const handleVerifyClick = (patient) => {
    setSelectedPatient(patient);
    setModalType('verify');
    onOpen();
  };

  return (
    <Box>
      <VStack spacing={4} mb={4}>
        <FormControl>
          <FormLabel>Search Type</FormLabel>
          <Select value={searchType} onChange={(e) => setSearchType(e.target.value)}>
            <option value="all">All (Name, ID, Phone)</option>
            <option value="id">National/Student ID</option>
            <option value="phone">Phone Number</option>
          </Select>
        </FormControl>
        <HStack width="full">
          <Input 
            placeholder={
              searchType === 'id' ? "Enter National/Student ID" :
              searchType === 'phone' ? "Enter Phone Number" :
              "Search by Name, ID, or Phone..."
            }
            value={query} 
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <IconButton 
            aria-label="Search" 
            icon={<SearchIcon />} 
            onClick={handleSearch} 
            isLoading={loading}
            colorScheme="blue"
          />
        </HStack>
      </VStack>

      <VStack spacing={4} align="stretch">
        {results.map((patient) => (
          <Card key={patient.patient_id} variant="outline">
            <CardBody>
              <Stack direction={{ base: 'column', sm: 'row' }} justify="space-between" align="center">
                <Box>
                  <HStack>
                    <Heading size="md">{patient.first_name} {patient.last_name}</Heading>
                    {!patient.first_visit && <Badge colorScheme="green">Returning</Badge>}
                    {patient.is_temp_record && <Badge colorScheme="orange">Temp</Badge>}
                  </HStack>
                  <Text fontSize="sm" color="gray.600">
                    ID: {patient.national_id || 'N/A'} | Phone: {patient.phone_number || 'N/A'}
                  </Text>
                  <HStack mt={2}>
                    <Badge colorScheme={patient.gender === 'Male' ? 'blue' : 'pink'}>{patient.gender}</Badge>
                    <Badge colorScheme="purple">{patient.patient_type}</Badge>
                    {patient.allergies && <Badge colorScheme="red">Allergies</Badge>}
                  </HStack>
                </Box>
                <VStack>
                  {!patient.first_visit && (
                    <Button size="sm" colorScheme="teal" onClick={() => handleVerifyClick(patient)}>
                      Verify Details
                    </Button>
                  )}
                  <Button colorScheme="green" onClick={() => handleCheckInClick(patient)}>
                    Check In
                  </Button>
                </VStack>
              </Stack>
            </CardBody>
          </Card>
        ))}
        {results.length === 0 && !loading && query && (
          <Text color="gray.500" textAlign="center">No patients found.</Text>
        )}
      </VStack>

      {selectedPatient && modalType === 'checkin' && (
        <CheckInModal 
          isOpen={isOpen} 
          onClose={onClose} 
          patient={selectedPatient} 
        />
      )}
      {selectedPatient && modalType === 'verify' && (
        <PatientVerificationModal 
          isOpen={isOpen} 
          onClose={onClose} 
          patient={selectedPatient} 
        />
      )}
    </Box>
  );
}
