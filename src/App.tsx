import React, { useState, useEffect } from 'react';
import { User, Patient, Appointment, AppointmentStatus, ReminderQueueItem, SystemNotification, AuditLog } from './types';
import { Header } from './components/Header';
import { CalendarView } from './components/CalendarView';
import { PatientsList } from './components/PatientsList';
import { MedicalRecordView } from './components/MedicalRecordView';
import { RemindersView } from './components/RemindersView';
import { AuditLogsView } from './components/AuditLogsView';
import { NewAppointmentModal } from './components/NewAppointmentModal';
import { NewPatientModal } from './components/NewPatientModal';
import { ActivateContinuousModal } from './components/ActivateContinuousModal';
import { NewEvolutionModal } from './components/NewEvolutionModal';
import { UploadAttachmentModal } from './components/UploadAttachmentModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import { ArchitectureDocsView } from './components/ArchitectureDocsView';
import { BottomNav } from './components/BottomNav';
import { LoginView } from './components/LoginView';
import { ProfileModal } from './components/ProfileModal';
import { ShieldCheck, Calendar, Users, Lock, Smartphone, Shield, FileCode, CheckCircle2, ArrowRight } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(() => localStorage.getItem('clinicacare_session_token'));
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  // Recupera a aba ativa da URL hash ou do localStorage para manter a mesma página após refresh
  const [activeTab, setActiveTab] = useState<'agenda' | 'patients' | 'records'>(() => {
    try {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'agenda' || hash === 'patients' || hash === 'records') {
        return hash;
      }
      const saved = localStorage.getItem('clinicacare_active_tab');
      if (saved === 'agenda' || saved === 'patients' || saved === 'records') {
        return saved;
      }
    } catch {
      // Ignora restrições de storage se houver
    }
    return 'agenda';
  });

  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [reminders, setReminders] = useState<ReminderQueueItem[]>([]);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const [selectedPatientForRecord, setSelectedPatientForRecord] = useState<Patient | null>(null);

  // Sincroniza a aba ativa com o localStorage e com a hash da URL para manter a página ao atualizar
  useEffect(() => {
    try {
      localStorage.setItem('clinicacare_active_tab', activeTab);
      if (window.location.hash !== `#${activeTab}`) {
        window.history.replaceState(null, '', `#${activeTab}`);
      }
    } catch (e) {
      console.warn('Erro ao salvar estado da aba ativa:', e);
    }
  }, [activeTab]);

  // Persiste o paciente selecionado para manter o mesmo prontuário aberto após refresh
  useEffect(() => {
    if (selectedPatientForRecord?.id) {
      try {
        localStorage.setItem('clinicacare_selected_patient_id', selectedPatientForRecord.id);
      } catch (e) {
        console.warn('Erro ao salvar paciente selecionado:', e);
      }
    }
  }, [selectedPatientForRecord]);

  // Modals state
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false);
  const [newAppointmentDefaults, setNewAppointmentDefaults] = useState<{ date?: string; time?: string; patientId?: string }>({});
  const [isNewPatientOpen, setIsNewPatientOpen] = useState(false);
  const [isActivateContinuousOpen, setIsActivateContinuousOpen] = useState(false);
  const [patientForContinuous, setPatientForContinuous] = useState<Patient | null>(null);
  const [isNewEvolutionOpen, setIsNewEvolutionOpen] = useState(false);
  const [isUploadAttachmentOpen, setIsUploadAttachmentOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isArchitectureOpen, setIsArchitectureOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleOpenNewAppointment = (date?: string, time?: string, patientId?: string) => {
    setNewAppointmentDefaults({ date, time, patientId });
    setIsNewAppointmentOpen(true);
  };

  const handleOpenActivateContinuous = (patient: Patient) => {
    setPatientForContinuous(patient);
    setIsActivateContinuousOpen(true);
  };

  const handleDeletePatient = async (patientId: string) => {
    const res = await fetch(`/api/patients/${patientId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Erro ao excluir paciente.');
    }
    if (selectedPatientForRecord?.id === patientId) {
      setSelectedPatientForRecord(null);
    }
    await refreshAllData();
  };

  // Initial load
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsAuthChecking(true);
    try {
      // 1. Carrega lista pública de profissionais para formulários
      const authRes = await fetch('/api/auth/users');
      const authData = await authRes.json();
      setAllUsers(authData.users || []);

      // 2. Verifica se há token de sessão salvo no localStorage
      const savedToken = localStorage.getItem('clinicacare_session_token');
      if (savedToken) {
        const meRes = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${savedToken}`,
          },
        });

        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.user) {
            setCurrentUser(meData.user);
            setSessionToken(savedToken);
            await refreshAllData(meData.user.id, savedToken);
            setIsAuthChecking(false);
            return;
          }
        }
      }

      // Se não há token válido ou se a sessão foi revogada, limpa sessão e exibe a tela de login
      localStorage.removeItem('clinicacare_session_token');
      localStorage.removeItem('clinicacare_user');
      localStorage.removeItem('clinicacare_selected_patient_id');
      setSessionToken(null);
      setCurrentUser(null);
    } catch (err) {
      console.error('Erro ao verificar autenticação inicial:', err);
      localStorage.removeItem('clinicacare_session_token');
      localStorage.removeItem('clinicacare_user');
      localStorage.removeItem('clinicacare_selected_patient_id');
      setCurrentUser(null);
      setSessionToken(null);
    } finally {
      setIsAuthChecking(false);
    }
  };

  const getHeaders = (userId?: string, token?: string) => {
    const actingToken = token || sessionToken || '';
    const actingId = userId || currentUser?.id || '';
    const headers: Record<string, string> = {};
    if (actingToken) {
      headers['Authorization'] = `Bearer ${actingToken}`;
    }
    if (actingId) {
      headers['x-user-id'] = actingId;
    }
    return headers;
  };

  const refreshAllData = async (userId?: string, token?: string) => {
    const headers = getHeaders(userId, token);

    try {
      const [patientsRes, apptsRes, remsRes, notifsRes] = await Promise.all([
        fetch('/api/patients', { headers }),
        fetch('/api/appointments', { headers }),
        fetch('/api/reminders', { headers }),
        fetch('/api/notifications', { headers }),
      ]);

      const [patientsData, apptsData, remsData, notifsData] = await Promise.all([
        patientsRes.json(),
        apptsRes.json(),
        remsRes.json(),
        notifsRes.json(),
      ]);

      const fetchedPatients = patientsData.patients || [];
      setPatients(fetchedPatients);
      setAppointments(apptsData.appointments || []);
      setReminders(remsData.reminders || []);
      setNotifications(notifsData.notifications || []);

      if (fetchedPatients.length > 0) {
        const savedPatientId = localStorage.getItem('clinicacare_selected_patient_id');
        setSelectedPatientForRecord((prev) => {
          if (prev && fetchedPatients.some((p: Patient) => p.id === prev.id)) {
            return prev;
          }
          if (savedPatientId) {
            const found = fetchedPatients.find((p: Patient) => p.id === savedPatientId);
            if (found) return found;
          }
          return fetchedPatients[0];
        });
      } else {
        setSelectedPatientForRecord(null);
      }

      // Se for admin, carrega logs de auditoria
      const actingId = userId || currentUser?.id;
      const user = allUsers.find((u) => u.id === actingId) || currentUser;
      if (user?.role === 'ADMIN') {
        const logsRes = await fetch('/api/audit-logs', { headers });
        if (logsRes.ok) {
          const logsData = await logsRes.json();
          setAuditLogs(logsData.auditLogs || []);
        }
      }
    } catch (err) {
      console.error('Erro ao atualizar dados:', err);
    }
  };

  const handleLoginSuccess = async (user: User, token: string) => {
    localStorage.setItem('clinicacare_session_token', token);
    setSessionToken(token);
    setCurrentUser(user);
    await refreshAllData(user.id, token);
  };

  const handleLogout = async () => {
    try {
      if (sessionToken) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: getHeaders(),
        });
      }
    } catch (err) {
      console.error('Erro ao deslogar:', err);
    } finally {
      localStorage.removeItem('clinicacare_session_token');
      localStorage.removeItem('clinicacare_user');
      localStorage.removeItem('clinicacare_selected_patient_id');
      localStorage.removeItem('clinicacare_active_tab');
      setSessionToken(null);
      setCurrentUser(null);
      setPatients([]);
      setAppointments([]);
      setReminders([]);
      setSelectedPatientForRecord(null);
      window.location.hash = '';
    }
  };

  const handleResetSystem = async () => {
    try {
      await fetch('/api/system/reset-all', {
        method: 'POST',
        headers: getHeaders(),
      });
    } catch (err) {
      console.error('Erro ao resetar sistema:', err);
    } finally {
      localStorage.removeItem('clinicacare_session_token');
      localStorage.removeItem('clinicacare_user');
      localStorage.removeItem('clinicacare_selected_patient_id');
      localStorage.removeItem('clinicacare_active_tab');
      setSessionToken(null);
      setCurrentUser(null);
      setPatients([]);
      setAppointments([]);
      setReminders([]);
      setSelectedPatientForRecord(null);
      window.location.hash = '';
      await loadInitialData();
    }
  };

  const handleClearData = async () => {
    if (!confirm('Deseja realmente limpar todos os dados de exemplo para iniciar seus cadastros limpos?')) return;
    try {
      const res = await fetch('/api/system/clear-data', {
        method: 'POST',
        headers: getHeaders(),
      });
      if (res.ok) {
        setPatients([]);
        setAppointments([]);
        setReminders([]);
        setSelectedPatientForRecord(null);
        await refreshAllData();
      }
    } catch (err) {
      console.error('Erro ao limpar dados:', err);
    }
  };

  const handleSwitchUser = async (userId: string) => {
    try {
      const res = await fetch('/api/auth/switch-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getHeaders() },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.user) {
        if (data.token) {
          localStorage.setItem('clinicacare_session_token', data.token);
          setSessionToken(data.token);
        }
        setCurrentUser(data.user);
        await refreshAllData(data.user.id, data.token);
      }
    } catch (err) {
      console.error('Erro ao alternar usuário:', err);
    }
  };

  const handleUpdateStatus = async (appointmentId: string, status: AppointmentStatus) => {
    if (!currentUser) return;
    try {
      await fetch(`/api/appointments/${appointmentId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getHeaders(),
        },
        body: JSON.stringify({ status }),
      });
      await refreshAllData();
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    }
  };

  const handleRescheduleAppointment = async (
    appointmentId: string,
    newStartTime: string,
    newEndTime: string,
    newProfessionalId?: string
  ): Promise<{ success: boolean; error?: string; message?: string }> => {
    if (!currentUser) return { success: false, error: 'Usuário não autenticado.' };
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/reschedule`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getHeaders(),
        },
        body: JSON.stringify({
          start_time: newStartTime,
          end_time: newEndTime,
          professional_id: newProfessionalId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.message || data.error || 'Erro ao remanejar consulta.' };
      }
      await refreshAllData();
      return { success: true, message: data.message };
    } catch (err: any) {
      console.error('Erro ao remanejar:', err);
      return { success: false, error: err.message || 'Erro de comunicação com o servidor.' };
    }
  };

  const handleTriggerBatchReminders = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/reminders/trigger-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getHeaders(),
        },
      });
      const data = await res.json();
      if (data.reminders) {
        setReminders(data.reminders);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkNotificationAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'POST',
        headers: getHeaders(),
      });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleProfileUpdated = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    setAllUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
    // Atualiza o nome do profissional nos pacientes vinculados
    setPatients((prev) =>
      prev.map((p) =>
        p.assigned_professional_id === updatedUser.id
          ? { ...p, assigned_professional_name: updatedUser.name }
          : p
      )
    );
  };

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-[#FDFCF9] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-9 h-9 border-2 border-[#5A5A40] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-[#8A8A82] font-medium tracking-wide">Validando sessão criptografada...</p>
        </div>
      </div>
    );
  }

  // Se não estiver autenticado, exibe a tela de login / cadastro criptografado
  if (!currentUser || !sessionToken) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-[#FDFCF9] flex flex-col font-sans text-[#2D2D2A]">
      {/* Header com Switcher de Papéis (RBAC) & Logout */}
      <Header
        currentUser={currentUser}
        allUsers={allUsers}
        onSwitchUser={handleSwitchUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab as any}
        unreadNotificationsCount={unreadCount}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenArchitecture={() => setIsArchitectureOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        onLogout={handleLogout}
        onClearData={handleClearData}
        onResetSystem={handleResetSystem}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 md:pb-8">
        {/* Tab Views */}
        {activeTab === 'agenda' && (
          <CalendarView
            currentUser={currentUser}
            allUsers={allUsers}
            appointments={appointments}
            patients={patients}
            onOpenNewAppointment={handleOpenNewAppointment}
            onUpdateStatus={handleUpdateStatus}
            onRescheduleAppointment={handleRescheduleAppointment}
            onOpenActivateContinuous={handleOpenActivateContinuous}
            onOpenRecordForPatient={(patientId) => {
              const pat = patients.find((p) => p.id === patientId);
              if (pat) {
                setSelectedPatientForRecord(pat);
                setActiveTab('records');
              }
            }}
          />
        )}

        {activeTab === 'patients' && (
          <PatientsList
            patients={patients}
            currentUser={currentUser}
            onSelectPatientForRecord={(p) => {
              setSelectedPatientForRecord(p);
              setActiveTab('records');
            }}
            onOpenNewPatient={() => setIsNewPatientOpen(true)}
            onSchedulePatient={(patId) => handleOpenNewAppointment(undefined, undefined, patId)}
            onDeletePatient={handleDeletePatient}
            onOpenActivateContinuous={handleOpenActivateContinuous}
          />
        )}

        {activeTab === 'records' && (
          <MedicalRecordView
            currentUser={currentUser}
            patients={patients}
            selectedPatient={selectedPatientForRecord}
            onSelectPatient={setSelectedPatientForRecord}
            onOpenNewEvolution={() => setIsNewEvolutionOpen(true)}
            onOpenUploadModal={() => setIsUploadAttachmentOpen(true)}
            onOpenNewPatient={() => setIsNewPatientOpen(true)}
          />
        )}
      </main>

      {/* Footer (Desktop only or clean spacing) */}
      <footer className="hidden md:block bg-white border-t border-[#E5E2D9] py-4 text-center text-xs text-[#8A8A82]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>ClínicaCare • Gestão Clínica Inteligente</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-[#8A8A82]">
              <Lock className="w-3 h-3" /> Criptografia Ponta a Ponta
            </span>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onOpenArchitecture={() => setIsArchitectureOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
      />

      {/* Modais do Sistema */}
      <NewAppointmentModal
        isOpen={isNewAppointmentOpen}
        onClose={() => {
          setIsNewAppointmentOpen(false);
          setNewAppointmentDefaults({});
        }}
        patients={patients}
        allUsers={allUsers}
        currentUser={currentUser}
        initialDate={newAppointmentDefaults.date}
        initialTime={newAppointmentDefaults.time}
        initialPatientId={newAppointmentDefaults.patientId}
        onOpenActivateContinuous={handleOpenActivateContinuous}
        onCreated={() => refreshAllData()}
      />

      <NewPatientModal
        isOpen={isNewPatientOpen}
        onClose={() => setIsNewPatientOpen(false)}
        allUsers={allUsers}
        currentUser={currentUser}
        onCreated={() => refreshAllData()}
      />

      <ActivateContinuousModal
        isOpen={isActivateContinuousOpen}
        onClose={() => {
          setIsActivateContinuousOpen(false);
          setPatientForContinuous(null);
        }}
        patient={patientForContinuous}
        currentUser={currentUser}
        allUsers={allUsers}
        onSuccess={() => {
          refreshAllData();
        }}
      />

      {selectedPatientForRecord && (
        <>
          <NewEvolutionModal
            isOpen={isNewEvolutionOpen}
            onClose={() => setIsNewEvolutionOpen(false)}
            patient={selectedPatientForRecord}
            currentUser={currentUser}
            onCreated={() => refreshAllData()}
          />

          <UploadAttachmentModal
            isOpen={isUploadAttachmentOpen}
            onClose={() => setIsUploadAttachmentOpen(false)}
            patient={selectedPatientForRecord}
            currentUser={currentUser}
            onUploaded={() => refreshAllData()}
          />
        </>
      )}

      <NotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onMarkAsRead={handleMarkNotificationAsRead}
      />

      <ArchitectureDocsView
        isOpen={isArchitectureOpen}
        onClose={() => setIsArchitectureOpen(false)}
      />

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        currentUser={currentUser}
        onUpdateSuccess={handleProfileUpdated}
        token={sessionToken}
      />
    </div>
  );
}
