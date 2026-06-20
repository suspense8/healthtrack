import React, { useState, useEffect } from 'react';
import { Box, Table, Thead, Tbody, Tr, Th, Td, Badge, Button, Heading, HStack, Spinner, Text, useToast } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import api, { TOKEN_KEYS, SOCKET_URL } from '../../../services/api';
import { io } from 'socket.io-client';

export default function CommunityCaseQueue() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    fetchCases();

    const currentToken = localStorage.getItem(TOKEN_KEYS.nurse) || localStorage.getItem(TOKEN_KEYS.admin);

    const socket = io(SOCKET_URL, {
      auth: { token: currentToken },
      withCredentials: true
    });

    socket.on('community_case_updated', (updatedCase) => {
      setCases((prevCases) => {
        const index = prevCases.findIndex(c => c.id === updatedCase.id);
        if (index > -1) {
          const newCases = [...prevCases];
          if (['resolved', 'promoted', 'referred'].includes(updatedCase.status)) {
            newCases.splice(index, 1);
          } else {
            newCases[index] = updatedCase;
          }
          return newCases;
        } else if (!['resolved', 'promoted', 'referred'].includes(updatedCase.status)) {
          return [updatedCase, ...prevCases];
        }
        return prevCases;
      });
    });

    return () => socket.disconnect();
  }, []);

  const fetchCases = async () => {
    try {
      const res = await api.get('/nurses/community-cases');
      setCases(res.data);
      setLoading(false);
    } catch (err) {
      toast({ title: 'Error fetching cases', status: 'error' });
      setLoading(false);
    }
  };

  const getSeverityBadge = (severity) => {
    const colors = {
      urgent: 'red',
      high: 'orange',
      medium: 'yellow',
      low: 'green'
    };
    return <Badge colorScheme={colors[severity] || 'gray'}>{severity.toUpperCase()}</Badge>;
  };

  if (loading) return <Spinner />;

  return (
    <Box>
      <HStack justify="space-between" mb={6}>
        <Heading size="md">Community Surveillance Queue</Heading>
        <Badge colorScheme="blue">{cases.length} Active Cases</Badge>
      </HStack>

      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>Time</Th>
            <Th>Reference</Th>
            <Th>Symptom</Th>
            <Th>Area</Th>
            <Th>Severity</Th>
            <Th>Status</Th>
            <Th>Assigned</Th>
            <Th>Action</Th>
          </Tr>
        </Thead>
        <Tbody>
          {cases.length === 0 && (
            <Tr>
              <Td colSpan={8} textAlign="center">No community cases at the moment.</Td>
            </Tr>
          )}
          {cases.map((c) => (
            <Tr key={c.id}>
              <Td>{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Td>
              <Td fontWeight="bold">{c.reference_number}</Td>
              <Td>{c.symptom}</Td>
              <Td>{c.area}</Td>
              <Td>{getSeverityBadge(c.severity_suggested)}</Td>
              <Td>
                <Badge colorScheme={c.status === 'new' ? 'purple' : 'blue'}>
                  {c.status.toUpperCase()}
                </Badge>
              </Td>
              <Td>{c.assigned_nurse ? c.assigned_nurse.name : 'Unassigned'}</Td>
              <Td>
                <Button 
                  size="sm" 
                  colorScheme="blue" 
                  onClick={() => navigate(`/nurse/community-case/${c.id}`)}
                >
                  {c.status === 'new' ? 'Claim & Review' : 'Open'}
                </Button>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}
