import React, { useState, useEffect } from 'react';
import { User, Patient, Appointment, AppointmentStatus, SystemNotification } from './types';
import { Header } from './components/Header';
import { CalendarView } from './components/CalendarView';
import { PatientsList } from './components/PatientsList';
import { MedicalRecordView } from './components/MedicalRecordView';
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
import { FinancialView } from './components/FinancialView';
import { Lock, Code } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(() => localStorage.getItem('clinicacare_session_token'));
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  // Recupera a aba ativa da URL hash ou do localStorage para manter a mesma página após refresh
  const [activeTab, setActiveTab] = useState<'agenda' | 'patients' | 'records' | 'financial'>(() => {
    try {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'agenda' || hash === 'patients' || hash === 'records' || hash === 'financial') {
        return hash as any;
      }
      const saved = localStorage.getItem('clinicacare_active_tab');
      if (saved === 'agenda' || saved === 'patients' || saved === 'records' || saved === 'financial') {
        return saved as any;
      }
    } catch {
      // Ignora restrições de storage se houver
    }
    return 'agenda';
  });

  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);

  // Tema Global (Claro / Escuro)
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('clinicacare_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('clinicacare_theme', currentTheme);
      if (currentTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {
      console.warn('Erro ao salvar tema:', e);
    }
  }, [currentTheme]);

  // Listener para sincronização caso o tema mude via storage em outra aba ou componente
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'clinicacare_theme' && (e.newValue === 'light' || e.newValue === 'dark')) {
        setCurrentTheme(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleToggleTheme = () => {
    setCurrentTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

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
      const [patientsRes, apptsRes, notifsRes] = await Promise.all([
        fetch('/api/patients', { headers }),
        fetch('/api/appointments', { headers }),
        fetch('/api/notifications', { headers }),
      ]);

      const [patientsData, apptsData, notifsData] = await Promise.all([
        patientsRes.json(),
        apptsRes.json(),
        notifsRes.json(),
      ]);

      const fetchedPatients = patientsData.patients || [];
      setPatients(fetchedPatients);
      setAppointments(apptsData.appointments || []);
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

      // Se for admin ou profissional, dados já carregados
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
      setSelectedPatientForRecord(null);
      window.location.hash = '';
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
      <div className="min-h-screen bg-[#FDFCF9] dark:bg-[#121210] flex items-center justify-center transition-colors">
        <div className="text-center space-y-3">
          <div className="w-9 h-9 border-2 border-[#5A5A40] dark:border-[#B5B590] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-[#8A8A82] dark:text-[#A3A196] font-medium tracking-wide">Validando sessão criptografada...</p>
        </div>
      </div>
    );
  }

  // Se não estiver autenticado, exibe a tela de login / cadastro criptografado
  if (!currentUser || !sessionToken) {
    return (
      <LoginView
        onLoginSuccess={handleLoginSuccess}
        currentTheme={currentTheme}
        onToggleTheme={handleToggleTheme}
        hasRegisteredUsers={allUsers.length > 0}
      />
    );
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-[#FDFCF9] dark:bg-[#121210] flex flex-col font-sans text-[#2D2D2A] dark:text-[#EFECE6] transition-colors">
      {/* Header com Switcher de Papéis (RBAC) & Logout */}
      <Header
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab as any}
        unreadNotificationsCount={unreadCount}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        onLogout={handleLogout}
        currentTheme={currentTheme}
        onToggleTheme={handleToggleTheme}
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

        {activeTab === 'financial' && (
          <FinancialView
            currentUser={currentUser}
            patients={patients}
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
            <button
              onClick={() => setIsArchitectureOpen(true)}
              className="flex items-center gap-1 text-[#8A8A82] hover:text-[#5A5A40] transition-colors cursor-pointer"
            >
              <Code className="w-3 h-3" /> Arquitetura & LGPD
            </button>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
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
        currentTheme={currentTheme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Navegação Inferior Mobile */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab as any}
        currentUser={currentUser}
        onOpenProfile={() => setIsProfileOpen(true)}
      />
    </div>
  );
}
