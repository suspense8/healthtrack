import { Box, Heading, Text, VStack, Card, CardBody, CardHeader, Divider, Button } from '@chakra-ui/react';
import { useAuth } from '../context/AuthContext';
import Header from '../components/shared/Header';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <Box minH="100vh" bg="gray.50">
      <Header />
      <Box p={8} maxW="container.md" mx="auto">
        <Card>
          <CardHeader>
            <Heading size="md">My Profile</Heading>
          </CardHeader>
          <CardBody>
            <VStack align="stretch" spacing={4}>
              <Box>
                <Text fontWeight="bold" color="gray.600">Username</Text>
                <Text fontSize="lg">{user?.username}</Text>
              </Box>
              <Divider />
              <Box>
                <Text fontWeight="bold" color="gray.600">Role</Text>
                <Text fontSize="lg" textTransform="capitalize">{user?.role || 'Receptionist'}</Text>
              </Box>
              <Divider />
              <Box>
                <Text fontWeight="bold" color="gray.600">Account Status</Text>
                <Text color="green.500" fontWeight="bold">Active</Text>
              </Box>
              
              <Box pt={4}>
                <Button onClick={() => navigate('/')} variant="outline" colorScheme="blue">
                  Back to Dashboard
                </Button>
              </Box>
            </VStack>
          </CardBody>
        </Card>
      </Box>
    </Box>
  );
}
