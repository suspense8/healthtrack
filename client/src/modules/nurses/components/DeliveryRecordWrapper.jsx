import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Spinner, Center, useToast } from '@chakra-ui/react';
import DeliveryRecordForm from './DeliveryRecordForm';
import api from '../../../services/api';

export default function DeliveryRecordWrapper() {
  const { visitId } = useParams();
  const navigate = useNavigate();
  const [visit, setVisit] = useState(null);
  const [obstetricVisit, setObstetricVisit] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    fetchVisitData();
  }, [visitId]);

  const fetchVisitData = async () => {
    try {
      const res = await api.get(`/nurses/visit/${visitId}`);
      setVisit(res.data);
      setObstetricVisit(res.data.obstetric_visit);
    } catch (error) {
      console.error('Failed to fetch visit:', error);
      toast({
        title: 'Error loading visit',
        description: 'Failed to load patient data',
        status: 'error',
        duration: 5000
      });
      navigate('/nurse/queue');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/nurse/queue');
  };

  const handleComplete = () => {
    toast({
      title: 'Delivery recorded',
      description: 'Delivery successfully recorded',
      status: 'success',
      duration: 3000
    });
    navigate('/nurse/queue');
  };

  if (loading) {
    return (
      <Center h="400px">
        <Spinner size="xl" color="green.500" />
      </Center>
    );
  }

  if (!visit || !obstetricVisit) {
    return <Box>Visit not found or not an obstetric case</Box>;
  }

  return (
    <DeliveryRecordForm
      visit={visit}
      obstetricVisit={obstetricVisit}
      onBack={handleBack}
      onComplete={handleComplete}
      taskId={null}
    />
  );
}
