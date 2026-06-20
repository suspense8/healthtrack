import React, { useEffect, useState, useRef } from 'react';
import { Box, Container, VStack, HStack, Input, IconButton, Text, Heading, Badge, Spinner, Center } from '@chakra-ui/react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { FaPaperPlane } from 'react-icons/fa';

export default function WebConversation() {
  const { token } = useParams();
  const [messages, setMessages] = useState([]);
  const [caseInfo, setCaseInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // 1. Fetch initial messages
    const fetchMessages = async () => {
      try {
        const res = await axios.get(`http://localhost:3000/api/community/messages/${token}`);
        setMessages(res.data.messages);
        setCaseInfo(res.data.case);
        setLoading(false);
      } catch (err) {
        setError('Invalid or expired link. Please request a new one via SMS.');
        setLoading(false);
      }
    };
    fetchMessages();

    // 2. Connect Socket.IO
    const newSocket = io('http://localhost:3000', {
      auth: { token: token, isPatient: true },
      withCredentials: true
    });

    newSocket.on('connect', () => {
      console.log('Connected to chat server');
    });

    newSocket.on('new_message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, [token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const body = newMessage;
    setNewMessage('');

    try {
      await axios.post(`http://localhost:3000/api/community/messages/${token}`, { body });
    } catch (err) {
      console.error('Failed to send message');
      // In real app: show error state on message
    }
  };

  if (loading) return <Center h="100vh"><Spinner size="xl" color="blue.500" /></Center>;
  if (error) return <Center h="100vh"><Text color="red.500" fontSize="lg">{error}</Text></Center>;

  return (
    <Box minH="100vh" bg="gray.100" py={8}>
      <Container maxW="container.md" h="80vh">
        <VStack h="full" bg="white" borderRadius="xl" shadow="lg" overflow="hidden" spacing={0}>
          
          {/* Header */}
          <Box w="full" bg="blue.600" color="white" p={4}>
            <HStack justify="space-between">
              <VStack align="start" spacing={1}>
                <Heading size="md">Clinic Chat</Heading>
                <Text fontSize="sm" opacity={0.9}>Case {caseInfo?.reference_number}</Text>
              </VStack>
              <Badge colorScheme={caseInfo?.status === 'resolved' ? 'green' : 'yellow'} variant="solid">
                {caseInfo?.status.toUpperCase()}
              </Badge>
            </HStack>
          </Box>

          {/* Messages Area */}
          <Box flex={1} w="full" p={4} overflowY="auto" bg="gray.50">
            <VStack spacing={4} align="stretch">
              {messages.map((msg) => {
                const isPatient = msg.sender_type === 'patient';
                const isSystem = msg.sender_type === 'system';
                
                return (
                  <Box
                    key={msg.id}
                    alignSelf={isSystem ? 'center' : (isPatient ? 'flex-end' : 'flex-start')}
                    bg={isSystem ? 'gray.200' : (isPatient ? 'blue.500' : 'white')}
                    color={isSystem ? 'gray.600' : (isPatient ? 'white' : 'gray.800')}
                    px={4} py={2}
                    borderRadius="lg"
                    maxW="70%"
                    shadow={isSystem ? 'none' : 'sm'}
                  >
                    <Text fontSize="sm">{msg.body}</Text>
                    <Text fontSize="xs" opacity={0.7} mt={1} textAlign="right">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </Box>
                );
              })}
              <div ref={messagesEndRef} />
            </VStack>
          </Box>

          {/* Input Area */}
          <Box w="full" p={4} bg="white" borderTop="1px" borderColor="gray.200">
            <form onSubmit={handleSendMessage}>
              <HStack>
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  size="lg"
                  borderRadius="full"
                />
                <IconButton
                  type="submit"
                  colorScheme="blue"
                  icon={<FaPaperPlane />}
                  size="lg"
                  isRound
                  isDisabled={!newMessage.trim()}
                />
              </HStack>
            </form>
          </Box>

        </VStack>
      </Container>
    </Box>
  );
}
