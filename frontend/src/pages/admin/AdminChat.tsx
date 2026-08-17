import DashboardLayout from '../../layouts/DashboardLayout';
import { ADMIN_NAV } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import ChatView from '../../components/ChatView';

export default function AdminChat() {
  const { user } = useAuth();
  return (
    <DashboardLayout navItems={ADMIN_NAV} role="admin" userName={user?.name || 'Admin'} sectionLabel="Administration">
      <ChatView userId={user?.id || ''} userName={user?.name || 'Admin'} accentColor="#6366F1" />
    </DashboardLayout>
  );
}
