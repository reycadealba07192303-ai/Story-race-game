import DashboardLayout from '../../layouts/DashboardLayout';
import { STUDENT_NAV } from './StudentDashboard';
import { useAuth } from '../../context/AuthContext';
import ChatView from '../../components/ChatView';

export default function StudentChat() {
  const { user } = useAuth();
  return (
    <DashboardLayout navItems={STUDENT_NAV} role="student" userName={user?.name || 'Student'} sectionLabel="Learning">
      <ChatView userId={user?.id || ''} userName={user?.name || 'Student'} accentColor="#EC4899" />
    </DashboardLayout>
  );
}
