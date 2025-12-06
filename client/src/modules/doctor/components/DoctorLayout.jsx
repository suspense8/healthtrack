import { FiHome, FiUsers, FiCalendar, FiFileText, FiActivity } from 'react-icons/fi';
import { FaUserMd, FaBed } from 'react-icons/fa';
import ModuleLayout from '../../../components/shared/ModuleLayout';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: FiHome },
  { id: 'consultation', label: 'Consultation', icon: FiActivity },
  { id: 'admitted', label: 'Admitted Patients', icon: FaBed },
  { id: 'patients', label: 'Patient Management', icon: FiUsers },
  { id: 'appointments', label: 'Appointments', icon: FiCalendar },
  { id: 'prescriptions', label: 'Prescriptions', icon: FiFileText },
];

export default function DoctorLayout({ children, activeTab, setActiveTab }) {
  return (
    <ModuleLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      navItems={navItems}
      title="Doctor Portal"
      color="green"
      moduleIcon={FaUserMd}
    >
      {children}
    </ModuleLayout>
  );
}

