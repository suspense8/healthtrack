import { Box, Flex, VStack, Icon, Text, Heading, Divider } from '@chakra-ui/react';
import { FiLogOut } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Header from './Header';

const NavItem = ({ icon, children, isActive, onClick, color }) => (
  <Flex
    align="center"
    p="4"
    mx="4"
    borderRadius="lg"
    role="group"
    cursor="pointer"
    bg={isActive ? `${color}.500` : 'transparent'}
    color={isActive ? 'white' : 'gray.600'}
    _hover={{
      bg: `${color}.500`,
      color: 'white',
    }}
    onClick={onClick}
  >
    {icon && (
      <Icon
        mr="4"
        fontSize="16"
        as={icon}
      />
    )}
    {children}
  </Flex>
);

export default function ModuleLayout({ 
  children, 
  activeTab, 
  setActiveTab, 
  navItems = [], 
  title = 'MediFlow',
  color = 'blue',
  moduleIcon = null
}) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Flex minH="100vh" bg="gray.50">
      {/* Top Header */}
      <Header moduleTitle={title} moduleColor={color} />

      {/* Sidebar */}
      <Box
        w="64"
        bg="white"
        borderRight="1px"
        borderColor="gray.200"
        pos="fixed"
        top={0}
        left={0}
        h="full"
        overflowY="auto"
        zIndex={20}
      >
        <Flex h="16" alignItems="center" mx="6" justifyContent="space-between">
          <Flex align="center">
            {moduleIcon && <Icon as={moduleIcon} boxSize={6} color={`${color}.500`} mr={2} />}
            <Heading fontSize="lg" fontWeight="bold" color={`${color}.600`}>
              {title}
            </Heading>
          </Flex>
        </Flex>
        
        <Divider />
        
        <VStack spacing={1} align="stretch" mt={4}>
          {navItems.map((item) => (
            <NavItem 
              key={item.id}
              icon={item.icon} 
              isActive={activeTab === item.id} 
              onClick={() => setActiveTab(item.id)}
              color={color}
            >
              {item.label}
            </NavItem>
          ))}
          
          <Box pt={8}>
            <Divider mb={4} />
            <Box px={6} py={2}>
              <Text fontSize="xs" color="gray.400" textTransform="uppercase">
                Signed in as
              </Text>
              <Text fontSize="sm" fontWeight="bold" color="gray.600">
                {user?.username || 'User'}
              </Text>
            </Box>
            <NavItem icon={FiLogOut} onClick={handleLogout} color="red">
              Logout
            </NavItem>
          </Box>
        </VStack>
      </Box>

      {/* Main Content - Adjusted for header and sidebar */}
      <Box ml="64" mt="16" w="full" p="8">
        {children}
      </Box>
    </Flex>
  );
}

