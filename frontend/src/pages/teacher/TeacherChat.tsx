import DashboardLayout from '../../layouts/DashboardLayout';
import { TEACHER_NAV } from './TeacherClasses';
import { useAuth } from '../../context/AuthContext';
import ChatView from '../../components/ChatView';

export default function TeacherChat() {
  const { user } = useAuth();
  return (
    <DashboardLayout navItems={TEACHER_NAV} role="teacher" userName={user?.name || 'Teacher'} sectionLabel="Classroom">
      <ChatView userId={user?.id || ''} userName={user?.name || 'Teacher'} accentColor="#10B981" />
    </DashboardLayout>
  );
}
