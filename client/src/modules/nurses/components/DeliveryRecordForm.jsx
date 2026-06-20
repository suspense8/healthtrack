import { useState } from 'react';
import {
  Box, VStack, HStack, Heading, FormControl, FormLabel, Input, Select, Textarea,
  Button, NumberInput, NumberInputField, useToast, SimpleGrid, Radio, RadioGroup,
  Stack, Checkbox, Text, Divider, Badge, Card, CardBody
} from '@chakra-ui/react';
import { ArrowBackIcon } from '@chakra-ui/icons';
import { FaBaby } from 'react-icons/fa';
import api from '../../../services/api';

export default function DeliveryRecordForm({ visit, obstetricVisit, onBack, onComplete, taskId }) {
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const [formData, setFormData] = useState({
    delivery_time: new Date().toISOString().slice(0, 16),
    delivery_type: 'SVD',

    // Newborn
    baby_sex: '',
    birth_weight_grams: '',
    apgar_1_min: '',
    apgar_5_min: '',
    resuscitation_needed: false,
    resuscitation_details: '',

    // Maternal
    placenta_delivered: false,
    placenta_delivery_time: '',
    estimated_blood_loss_ml: '',
    perineal_tear: 'None',
    complications: '',
    postpartum_bp_systolic: '',
    postpartum_bp_diastolic: '',
    uterus_firm: true,
    excessive_bleeding: false,

    notes: ''
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        delivery_time: formData.delivery_time,
        delivery_type: formData.delivery_type,
        newborn: {
          sex: formData.baby_sex,
          birth_weight_grams: parseInt(formData.birth_weight_grams) || null,
          apgar_1_min: parseInt(formData.apgar_1_min),
          apgar_5_min: parseInt(formData.apgar_5_min),
          resuscitation_needed: formData.resuscitation_needed,
          resuscitation_details: formData.resuscitation_details || null
        },
        maternal: {
          placenta_delivered: formData.placenta_delivered,
          placenta_delivery_time: formData.placenta_delivery_time || null,
          estimated_blood_loss_ml: parseInt(formData.estimated_blood_loss_ml) || null,
          perineal_tear: formData.perineal_tear,
          complications: formData.complications || null,
          postpartum_bp_systolic: parseInt(formData.postpartum_bp_systolic) || null,
          postpartum_bp_diastolic: parseInt(formData.postpartum_bp_diastolic) || null,
          uterus_firm: formData.uterus_firm,
          excessive_bleeding: formData.excessive_bleeding
        },
        notes: formData.notes,
        task_id: taskId
      };

      const res = await api.post(`/nurses/record-delivery/${visit.visit_id}`, payload);

      toast({
        title: 'Delivery recorded successfully',
        description: 'Postpartum monitoring and billing tasks created',
        status: 'success',
        duration: 5000
      });

      if (onComplete) {
        onComplete(res.data);
      }

    } catch (error) {
      console.error('Delivery record error:', error);
      toast({
        title: 'Failed to record delivery',
        description: error.response?.data?.error || 'Please try again',
        status: 'error',
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
      <HStack justify="space-between" mb={6}>
        <HStack>
          <Button leftIcon={<ArrowBackIcon />} variant="ghost" onClick={onBack}>
            Back
          </Button>
          <Heading size="md">
            Delivery Record: {visit?.patient?.first_name} {visit?.patient?.last_name}
          </Heading>
        </HStack>
        <HStack>
          <Badge colorScheme="green" fontSize="md" p={2}>
            <FaBaby /> DELIVERY
          </Badge>
        </HStack>
      </HStack>

      {/* Patient Summary */}
      <Card mb={4} bg="blue.50">
        <CardBody>
          <SimpleGrid columns={4} spacing={4}>
            <Text><strong>G:</strong> {obstetricVisit?.gravida || '?'}</Text>
            <Text><strong>P:</strong> {obstetricVisit?.para || '?'}</Text>
            <Text><strong>Weeks:</strong> {obstetricVisit?.gestational_age_weeks || '?'}</Text>
            <Text><strong>Presentation:</strong> {obstetricVisit?.fetal_presentation || '?'}</Text>
          </SimpleGrid>
        </CardBody>
      </Card>

      <form onSubmit={handleSubmit}>
        <VStack spacing={6} align="stretch">
          {/* Delivery Details */}
          <Box>
            <Heading size="sm" mb={3}>Delivery Information</Heading>
            <SimpleGrid columns={2} spacing={4}>
              <FormControl isRequired>
                <FormLabel>Delivery Time</FormLabel>
                <Input
                  type="datetime-local"
                  name="delivery_time"
                  value={formData.delivery_time}
                  onChange={handleChange}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Delivery Type</FormLabel>
                <Select
                  name="delivery_type"
                  value={formData.delivery_type}
                  onChange={handleChange}
                >
                  <option value="SVD">SVD (Spontaneous Vaginal Delivery)</option>
                  <option value="Assisted">Assisted Vaginal Delivery</option>
                  <option value="Vacuum">Vacuum Extraction</option>
                  <option value="Forceps">Forceps Delivery</option>
                  <option value="C-Section">Cesarean Section</option>
                </Select>
              </FormControl>
            </SimpleGrid>
          </Box>

          <Divider />

          {/* Newborn Assessment */}
          <Box p={4} bg="pink.50" borderRadius="md">
            <Heading size="sm" mb={3}>Newborn Assessment</Heading>
            <SimpleGrid columns={2} spacing={4}>
              <FormControl isRequired>
                <FormLabel>Baby Sex</FormLabel>
                <RadioGroup
                  value={formData.baby_sex}
                  onChange={(val) => setFormData(prev => ({ ...prev, baby_sex: val }))}
                >
                  <Stack direction="row" spacing={4}>
                    <Radio value="Male">Male</Radio>
                    <Radio value="Female">Female</Radio>
                    <Radio value="Unknown">Unknown</Radio>
                  </Stack>
                </RadioGroup>
              </FormControl>

              <FormControl>
                <FormLabel>Birth Weight (grams)</FormLabel>
                <NumberInput min={500} max={6000}>
                  <NumberInputField
                    name="birth_weight_grams"
                    value={formData.birth_weight_grams}
                    onChange={handleChange}
                    placeholder="e.g., 3200"
                  />
                </NumberInput>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>APGAR Score (1 minute)</FormLabel>
                <NumberInput min={0} max={10}>
                  <NumberInputField
                    name="apgar_1_min"
                    value={formData.apgar_1_min}
                    onChange={handleChange}
                    placeholder="0-10"
                  />
                </NumberInput>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>APGAR Score (5 minutes)</FormLabel>
                <NumberInput min={0} max={10}>
                  <NumberInputField
                    name="apgar_5_min"
                    value={formData.apgar_5_min}
                    onChange={handleChange}
                    placeholder="0-10"
                  />
                </NumberInput>
              </FormControl>

              <FormControl>
                <Checkbox
                  name="resuscitation_needed"
                  isChecked={formData.resuscitation_needed}
                  onChange={handleChange}
                  colorScheme="red"
                >
                  <Text fontWeight="semibold">Resuscitation Needed</Text>
                </Checkbox>
              </FormControl>

              {formData.resuscitation_needed && (
                <FormControl>
                  <FormLabel>Resuscitation Details</FormLabel>
                  <Textarea
                    name="resuscitation_details"
                    value={formData.resuscitation_details}
                    onChange={handleChange}
                    placeholder="Describe interventions..."
                    rows={2}
                  />
                </FormControl>
              )}
            </SimpleGrid>
          </Box>

          <Divider />

          {/* Maternal Outcome */}
          <Box>
            <Heading size="sm" mb={3}>Maternal Outcome</Heading>
            <SimpleGrid columns={2} spacing={4}>
              <FormControl>
                <Checkbox
                  name="placenta_delivered"
                  isChecked={formData.placenta_delivered}
                  onChange={handleChange}
                  colorScheme="green"
                >
                  <Text fontWeight="semibold">Placenta Delivered</Text>
                </Checkbox>
              </FormControl>

              {formData.placenta_delivered && (
                <FormControl>
                  <FormLabel>Placenta Delivery Time</FormLabel>
                  <Input
                    type="datetime-local"
                    name="placenta_delivery_time"
                    value={formData.placenta_delivery_time}
                    onChange={handleChange}
                  />
                </FormControl>
              )}

              <FormControl>
                <FormLabel>Estimated Blood Loss (ml)</FormLabel>
                <NumberInput min={0} max={5000}>
                  <NumberInputField
                    name="estimated_blood_loss_ml"
                    value={formData.estimated_blood_loss_ml}
                    onChange={handleChange}
                    placeholder="e.g., 300"
                  />
                </NumberInput>
              </FormControl>

              <FormControl>
                <FormLabel>Perineal Tear</FormLabel>
                <Select
                  name="perineal_tear"
                  value={formData.perineal_tear}
                  onChange={handleChange}
                >
                  <option value="None">None</option>
                  <option value="First degree">First Degree</option>
                  <option value="Second degree">Second Degree</option>
                  <option value="Third degree">Third Degree</option>
                  <option value="Fourth degree">Fourth Degree</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Postpartum BP</FormLabel>
                <HStack>
                  <NumberInput>
                    <NumberInputField
                      name="postpartum_bp_systolic"
                      value={formData.postpartum_bp_systolic}
                      onChange={handleChange}
                      placeholder="120"
                    />
                  </NumberInput>
                  <Text>/</Text>
                  <NumberInput>
                    <NumberInputField
                      name="postpartum_bp_diastolic"
                      value={formData.postpartum_bp_diastolic}
                      onChange={handleChange}
                      placeholder="80"
                    />
                  </NumberInput>
                </HStack>
              </FormControl>

              <FormControl>
                <Checkbox
                  name="uterus_firm"
                  isChecked={formData.uterus_firm}
                  onChange={handleChange}
                  colorScheme="green"
                >
                  <Text fontWeight="semibold">Uterus Firm</Text>
                </Checkbox>
              </FormControl>

              <FormControl>
                <Checkbox
                  name="excessive_bleeding"
                  isChecked={formData.excessive_bleeding}
                  onChange={handleChange}
                  colorScheme="red"
                >
                  <Text fontWeight="semibold" color="red.600">Excessive Bleeding</Text>
                </Checkbox>
              </FormControl>
            </SimpleGrid>

            <FormControl mt={4}>
              <FormLabel>Complications</FormLabel>
              <Textarea
                name="complications"
                value={formData.complications}
                onChange={handleChange}
                placeholder="Any complications during or after delivery..."
                rows={2}
              />
            </FormControl>
          </Box>

          {/* Notes */}
          <FormControl>
            <FormLabel>Delivery Notes</FormLabel>
            <Textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Additional notes, observations..."
              rows={3}
            />
          </FormControl>

          {/* Action Buttons */}
          <HStack justify="flex-end" pt={4}>
            <Button variant="ghost" onClick={onBack}>
              Cancel
            </Button>
            <Button
              type="submit"
              colorScheme="green"
              size="lg"
              isLoading={loading}
              loadingText="Recording..."
              leftIcon={<FaBaby />}
            >
              Record Delivery
            </Button>
          </HStack>
        </VStack>
      </form>
    </Box>
  );
}
