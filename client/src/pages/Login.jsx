import { useState } from 'react';
import { Box, Button, FormControl, FormLabel, Input, Heading, VStack, useToast, Text, Icon, Alert, AlertIcon } from '@chakra-ui/react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaUserMd, FaUserNurse, FaClipboardList, FaUserShield, FaPills, FaFlask } from 'react-icons/fa';

const moduleConfig = {
  doctor: {
    title: 'Doctor Portal',
    icon: FaUserMd,
    color: 'green',
    redirect: '/doctor',
    role: 'doctor'
  },
  nurse: {
    title: 'Nurse Portal',
    icon: FaUserNurse,
    color: 'purple',
    redirect: '/nurse',
    role: 'nurse'
  },
  reception: {
    title: 'Reception Portal',
    icon: FaClipboardList,
    color: 'blue',
    redirect: '/reception',
    role: 'receptionist'
  },
  admin: {
    title: 'Admin Portal',
    icon: FaUserShield,
    color: 'red',
    redirect: '/admin',
    role: 'admin'
  },
  pharmacy: {
    title: 'Pharmacy Portal',
    icon: FaPills,
    color: 'teal',
    redirect: '/pharmacy',
    role: 'pharmacist'
  },
  lab: {
    title: 'Lab Portal',
    icon: FaFlask,
    color: 'cyan',
    redirect: '/lab',
    role: 'lab_tech'
  }
};

export default function Login({ module }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const config = module ? moduleConfig[module] : null;
  const expectedRole = config?.role;
  const redirectTo = location.state?.from?.pathname || config?.redirect || '/';

  // If already logged in for this role, redirect
  if (expectedRole && isLoggedIn(expectedRole)) {
    navigate(redirectTo, { replace: true });
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const result = await login(username, password, expectedRole);
    setLoading(false);
    
    if (result.success) {
      toast({ title: 'Login successful', status: 'success' });
      navigate(redirectTo, { replace: true });
    } else {
      setError(result.error);
      toast({ title: result.error, status: 'error' });
    }
  };

  return (
    <Box 
      minH="100vh" 
      display="flex" 
      alignItems="center" 
      justifyContent="center" 
      bg={config ? `${config.color}.50` : 'gray.50'}
    >
      <Box 
        maxW="md" 
        w="full" 
        mx={4} 
        p={8} 
        bg="white" 
        borderRadius="xl" 
        boxShadow="lg"
        borderTop="4px solid"
        borderColor={config ? `${config.color}.500` : 'blue.500'}
      >
        <VStack spacing={6} as="form" onSubmit={handleSubmit}>
          {config && (
            <Icon as={config.icon} boxSize={12} color={`${config.color}.500`} />
          )}
          <Heading size="lg" color={config ? `${config.color}.700` : 'gray.700'}>
            {config ? config.title : 'Clinical System Login'}
          </Heading>
          {module && (
            <Text color="gray.500" fontSize="sm">
              Sign in with your {config?.role} credentials
            </Text>
          )}

          {error && (
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              {error}
            </Alert>
          )}
          
          <FormControl isRequired>
            <FormLabel>Staff ID</FormLabel>
            <Input 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              placeholder="Enter your staff ID"
              size="lg"
            />
          </FormControl>
          <FormControl isRequired>
            <FormLabel>Password</FormLabel>
            <Input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Enter your password"
              size="lg"
            />
          </FormControl>
          <Button 
            type="submit" 
            colorScheme={config?.color || 'blue'} 
            width="full" 
            size="lg"
            isLoading={loading}
          >
            Sign In
          </Button>
        </VStack>
      </Box>
    </Box>
  );
}
