import React, { useState, useEffect, useRef } from 'react';
import { Box, HStack, VStack, Heading, Text, Badge, Button, Input, IconButton, Divider, Spinner, useToast } from '@chakra-ui/react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { TOKEN_KEYS, SOCKET_URL } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { io } from 'socket.io-client';
import { FaPaperPlane, FaArrowLeft, FaHospitalUser } from 'react-icons/fa';

export default function CommunityCaseDetail() {
  const { caseId } = useParams();
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const messagesEndRef = useRef(null);
  
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    fetchCaseData();

    const currentToken = localStorage.getItem(TOKEN_KEYS.nurse) || localStorage.getItem(TOKEN_KEYS.admin);
    const newSocket = io(SOCKET_URL, {
      auth: { token: currentToken },
      withCredentials: true
    });

    newSocket.emit('join_case', caseId);

    newSocket.on('new_message', (msg) => {
      setCaseData(prev => ({
        ...prev,
        messages: [...(prev.messages || []), msg]
      }));
    });

    setSocket(newSocket);

    return () => {
      newSocket.emit('leave_case', caseId);
      newSocket.disconnect();
    };
  }, [caseId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [caseData?.messages]);

  const fetchCaseData = async () => {
    try {
      const res = await api.get(`/nurses/community-cases/${caseId}`);
      setCaseData(res.data);
      
      if (res.data.status === 'new') {
        claimCase();
      } else {
        setLoading(false);
      }
    } catch (err) {
      toast({ title: 'Error fetching case', status: 'error' });
      navigate('/nurse/community-cases');
    }
  };

  const claimCase = async () => {
    try {
      await api.post(`/nurses/community-cases/${caseId}/claim`);
      // re-fetch to get updated state
      const res = await api.get(`/nurses/community-cases/${caseId}`);
      setCaseData(res.data);
      toast({ title: 'Case claimed', status: 'success' });
    } catch (err) {
      toast({ title: 'Error claiming case', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const body = newMessage;
    setNewMessage('');

    try {
      await api.post(`/nurses/community-cases/${caseId}/messages`, { body });
    } catch (err) {
      toast({ title: 'Failed to send message', status: 'error' });
    }
  };

  const promoteToVisit = async () => {
    try {
      await api.post(`/nurses/community-cases/${caseId}/promote`);
      toast({ title: 'Promoted to in-person visit', status: 'success' });
      navigate('/nurse/community-cases');
    } catch (err) {
      toast({ title: 'Failed to promote', status: 'error' });
    }
  };

  if (loading || !caseData) return <Spinner />;

  return (
    <Box maxW="container.xl" mx="auto" p={4}>
      <Button leftIcon={<FaArrowLeft />} onClick={() => navigate('/nurse/community-cases')} mb={4} variant="ghost">
        Back to Queue
      </Button>

      <HStack align="start" spacing={6} h="calc(100vh - 200px)">
        {/* Left Panel: Case Info */}
        <VStack w="350px" bg="white" p={6} borderRadius="xl" shadow="sm" align="stretch" spacing={6} border="1px" borderColor="gray.200">
          <Box>
            <Heading size="md" mb={2}>Case Details</Heading>
            <Badge colorScheme="purple">{caseData.reference_number}</Badge>
          </Box>
          
          <Box>
            <Text fontSize="sm" color="gray.500">Patient</Text>
            <Text fontWeight="bold">{caseData.patient?.first_name} {caseData.patient?.last_name}</Text>
            <Text fontSize="sm">{caseData.phone_e164}</Text>
          </Box>

          <Box>
            <Text fontSize="sm" color="gray.500">Reported Symptom</Text>
            <Text fontWeight="bold">{caseData.symptom}</Text>
            <HStack mt={1}>
              <Badge colorScheme={caseData.severity_suggested === 'urgent' ? 'red' : 'yellow'}>
                {caseData.severity_suggested.toUpperCase()}
              </Badge>
              <Text fontSize="sm">{caseData.area}</Text>
            </HStack>
          </Box>

          <Divider />

          <Button 
            colorScheme="green" 
            leftIcon={<FaHospitalUser />} 
            onClick={promoteToVisit}
            isDisabled={['promoted', 'resolved'].includes(caseData.status)}
          >
            Promote to In-Person Visit
          </Button>

        </VStack>

        {/* Right Panel: Chat Thread */}
        <VStack flex={1} bg="gray.50" borderRadius="xl" shadow="sm" h="full" overflow="hidden" spacing={0} border="1px" borderColor="gray.200">
          <Box w="full" p={4} bg="white" borderBottom="1px" borderColor="gray.200">
            <Heading size="sm">Conversation</Heading>
          </Box>

          <Box flex={1} w="full" p={4} overflowY="auto">
            <VStack spacing={4} align="stretch">
              {(caseData.messages || []).map((msg) => {
                const isNurse = msg.sender_type === 'nurse';
                const isSystem = msg.sender_type === 'system';
                return (
                  <Box
                    key={msg.id}
                    alignSelf={isSystem ? 'center' : (isNurse ? 'flex-end' : 'flex-start')}
                    bg={isSystem ? 'gray.200' : (isNurse ? 'blue.500' : 'white')}
                    color={isSystem ? 'gray.600' : (isNurse ? 'white' : 'gray.800')}
                    px={4} py={2}
                    borderRadius="lg"
                    maxW="70%"
                    shadow={isSystem ? 'none' : 'sm'}
                  >
                    <Text fontSize="sm">{msg.body}</Text>
                    <Text fontSize="xs" opacity={0.7} mt={1} textAlign="right">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {msg.channel === 'sms' && ' via SMS'}
                    </Text>
                  </Box>
                );
              })}
              <div ref={messagesEndRef} />
            </VStack>
          </Box>

          <Box w="full" p={4} bg="white" borderTop="1px" borderColor="gray.200">
            <form onSubmit={handleSendMessage}>
              <HStack>
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a reply to the patient..."
                  size="md"
                />
                <IconButton
                  type="submit"
                  colorScheme="blue"
                  icon={<FaPaperPlane />}
                  isDisabled={!newMessage.trim() || ['promoted', 'resolved'].includes(caseData.status)}
                />
              </HStack>
            </form>
          </Box>
        </VStack>

      </HStack>
    </Box>
  );
}
