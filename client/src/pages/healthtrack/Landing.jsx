import React from 'react';
import { 
  Box, 
  Button, 
  Container, 
  Heading, 
  Text, 
  VStack, 
  HStack, 
  Icon, 
  SimpleGrid, 
  Flex,
  useColorModeValue,
  Spacer
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { FaStethoscope, FaUserMd, FaPhoneAlt, FaHeartbeat, FaPills, FaLaptopMedical } from 'react-icons/fa';
import { motion } from 'framer-motion';

const MotionBox = motion(Box);

function FeatureCard({ icon, title, desc, delay }) {
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.100', 'gray.700');
  const textColor = useColorModeValue('gray.600', 'gray.400');
  
  return (
    <MotionBox
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
      }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -5 }}
    >
      <Box 
        p={6} 
        bg={cardBg} 
        borderRadius="2xl" 
        shadow="xl" 
        borderWidth="1px"
        borderColor={borderColor}
        _hover={{ shadow: '2xl' }}
        transition="all 0.3s"
        h="full"
      >
        <Flex 
          w={12} h={12} 
          align="center" justify="center" 
          borderRadius="xl" 
          bg="blue.50" 
          color="blue.500" 
          mb={4}
        >
          <Icon as={icon} w={6} h={6} />
        </Flex>
        <Heading size="md" mb={2} color={useColorModeValue('gray.800', 'white')}>{title}</Heading>
        <Text color={textColor} fontSize="md">{desc}</Text>
      </Box>
    </MotionBox>
  );
}

export default function HealthTrackLanding() {
  const navigate = useNavigate();

  const bgGradient = useColorModeValue('linear(to-br, blue.50, white)', 'linear(to-br, gray.900, gray.800)');
  const textColor = useColorModeValue('gray.600', 'gray.300');

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  return (
    <Box minH="100vh" bgGradient={bgGradient} overflow="hidden" display="flex" flexDirection="column">
      {/* Navigation */}
      <Box bg={useColorModeValue('rgba(255, 255, 255, 0.8)', 'rgba(26, 32, 44, 0.8)')} backdropFilter="blur(10px)" position="sticky" top={0} zIndex={10} borderBottom="1px solid" borderColor={useColorModeValue('gray.200', 'gray.700')}>
        <Flex as="nav" p={4} maxW="7xl" mx="auto" alignItems="center">
          <HStack spacing={3} cursor="pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <Flex align="center" justify="center" bg="blue.500" p={2} borderRadius="lg">
              <Icon as={FaStethoscope} w={6} h={6} color="white" />
            </Flex>
            <Heading size="lg" color={useColorModeValue('blue.700', 'blue.300')} fontWeight="extrabold" letterSpacing="tight">
              HealthTrack
            </Heading>
          </HStack>
          <Spacer />
          <Button 
            variant="outline" 
            colorScheme="blue" 
            leftIcon={<FaUserMd />}
            onClick={() => navigate('/reception/login')}
            size="md"
            borderRadius="full"
            px={6}
            _hover={{ bg: useColorModeValue('blue.50', 'whiteAlpha.200') }}
          >
            Staff Login
          </Button>
        </Flex>
      </Box>

      {/* Main Content */}
      <Container maxW="7xl" flex="1" display="flex" flexDirection="column" justifyContent="center" py={{ base: 12, md: 20 }}>
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={12} alignItems="center">
          
          {/* Hero Left Content */}
          <MotionBox initial="hidden" animate="visible" variants={fadeIn}>
            <VStack align="flex-start" spacing={8}>
              <Box>
                <Text color="blue.500" fontWeight="bold" letterSpacing="widest" mb={3} textTransform="uppercase" fontSize="sm">
                  Welcome to Njala Clinic
                </Text>
                <Heading 
                  as="h1" 
                  fontSize={{ base: '4xl', md: '5xl', lg: '6xl' }}
                  fontWeight="extrabold" 
                  lineHeight="1.1"
                  bgGradient="linear(to-r, blue.400, purple.500)"
                  bgClip="text"
                  pb={2}
                >
                  Healthcare that <br /> cares about you.
                </Heading>
              </Box>
              
              <Text fontSize={{ base: 'lg', md: 'xl' }} color={textColor} maxW="lg" lineHeight="relaxed">
                Experience seamless, unified community healthcare. From remote symptom reporting to complete clinic management, we are here for your wellbeing.
              </Text>
              
              <HStack spacing={4} pt={2}>
                <Button
                  size="lg"
                  colorScheme="blue"
                  bgGradient="linear(to-r, blue.400, blue.600)"
                  _hover={{ bgGradient: "linear(to-r, blue.500, blue.700)", transform: 'translateY(-2px)', shadow: 'xl' }}
                  transition="all 0.2s"
                  leftIcon={<FaPhoneAlt />}
                  onClick={() => navigate('/healthtrack/intake')}
                  px={10}
                  py={7}
                  borderRadius="full"
                  fontSize="lg"
                  fontWeight="bold"
                >
                  Report a Symptom
                </Button>
              </HStack>
            </VStack>
          </MotionBox>

          {/* Feature Grid Right */}
          <MotionBox initial="hidden" animate="visible" variants={staggerContainer}>
            <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={6} pt={{ base: 10, lg: 0 }}>
              <FeatureCard 
                icon={FaHeartbeat} 
                title="Immediate Triage" 
                desc="Report your symptoms instantly from home and get quick feedback."
                delay={0.1}
              />
              <FeatureCard 
                icon={FaLaptopMedical} 
                title="Digital Records" 
                desc="A unified patient history ensures your care is seamless and safe."
                delay={0.2}
              />
              <FeatureCard 
                icon={FaPills} 
                title="Integrated Pharmacy" 
                desc="Prescriptions and medications are managed easily in our systems."
                delay={0.3}
              />
              <FeatureCard 
                icon={FaUserMd} 
                title="Expert Care" 
                desc="Direct access to our dedicated doctors and nurses at the clinic."
                delay={0.4}
              />
            </SimpleGrid>
          </MotionBox>

        </SimpleGrid>
      </Container>
      
      {/* Footer */}
      <Box py={8} textAlign="center" borderTop="1px solid" borderColor={useColorModeValue('gray.200', 'gray.700')} bg={useColorModeValue('white', 'gray.900')}>
        <Text color="gray.500" fontSize="sm">
          © {new Date().getFullYear()} Njala Clinic & HealthTrack. All rights reserved.
        </Text>
      </Box>
    </Box>
  );
}
