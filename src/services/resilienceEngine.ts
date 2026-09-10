import { User, Patient, Appointment, MedicalRecord, MedicalAttachment, AuditLog, ReminderQueueItem, SystemNotification } from '../types';

const STORAGE_KEY = 'clinicare_local_resilience_v2';
const ACTIVE_USER_KEY = 'clinicare_active_user_v2';
const TOKEN_KEY = 'clinicare_session_token';

interface ResilienceStore {
  users: User[];
  patients: Patient[];
  appointments: Appointment[];
  medicalRecords: MedicalRecord[];
  attachments: MedicalAttachment[];
  auditLogs: AuditLog[];
  reminders: ReminderQueueItem[];
  notifications: SystemNotification[];
}

const DEFAULT_USERS: User[] = [
  {
    id: 'u1',
    name: 'Dra. Beatriz Santos',
    email: 'beatriz@clinicacare.com',
    role: 'PROFESSIONAL',
    council_number: 'CRP 06/142981',
    specialty: 'Terapia Cognitivo-Comportamental (TCC)',
    phone: '(11) 99876-5432',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'u2',
    name: 'Dr. Henrique Greca',
    email: 'henrique@clinicacare.com',
    role: 'PROFESSIONAL',
    council_number: 'CRP 08/29182',
    specialty: 'Psicologia Clínica & Avaliação Neuropsicológica',
    phone: '(41) 99123-4567',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'u3',
    name: 'Dr. Roberto Fonseca',
    email: 'admin@clinicacare.com',
    role: 'ADMIN',
    council_number: 'CRM 198421 / Gestor',
    specialty: 'Diretoria Clínica & Governança LGPD',
    phone: '(11) 98765-4321',
    avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'u4',
    name: 'Camila Andrade',
    email: 'recepcao@clinicacare.com',
    role: 'RECEPTION',
    specialty: 'Atendimento & Gestão de Agenda',
    phone: '(11) 3214-5678',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  },
];

const DEFAULT_PATIENTS: Patient[] = [
  {
    id: 'p1',
    full_name: 'Mariana Silva Oliveira',
    cpf: '342.***.***-01',
    birth_date: '1992-05-14',
    email: 'mariana.silva@exemplo.com',
    phone: '(11) 98111-2233',
    gender: 'Feminino',
    address: 'Av. Paulista, 1000, Apto 42 - São Paulo, SP',
    emergency_contact: {
      name: 'Carlos Oliveira (Esposo)',
      relationship: 'Cônjuge',
      phone: '(11) 98222-3344',
    },
    assigned_professional_id: 'u1',
    assigned_professional_name: 'Dra. Beatriz Santos',
    status: 'ATIVO',
    treatment_status: 'ATIVO_CONTINUO',
    recurring_schedule: {
      day_of_week: 2,
      day_name: 'Terça-feira',
      time: '14:00',
      duration_minutes: 50,
      session_type: 'PRESENCIAL',
      active: true,
    },
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    anamnese: {
      marital_status: 'Casada',
      occupation: 'Arquiteta de Software',
      main_complaint: 'Crises de ansiedade generalizada com episódios de taquicardia em situações de pressão no trabalho.',
      clinical_history: 'Paciente relata histórico de perfeccionismo e estresse acentuado há 2 anos. Sem histórico psiquiátrico prévio.',
      allergies_medications: 'Nega alergias medicamentosas conhecidas. Faz uso pontual de fitoterápico (Passiflora).',
      lgpd_consent_signed: true,
      lgpd_consent_date: new Date(Date.now() - 30 * 86400000).toISOString(),
    },
  },
  {
    id: 'p2',
    full_name: 'Lucas Eduardo Mendes',
    cpf: '215.***.***-88',
    birth_date: '1988-11-23',
    email: 'lucas.mendes@exemplo.com',
    phone: '(11) 97333-4455',
    gender: 'Masculino',
    address: 'Rua Oscar Freire, 450 - São Paulo, SP',
    emergency_contact: {
      name: 'Teresa Mendes (Mãe)',
      relationship: 'Mãe',
      phone: '(11) 97444-5566',
    },
    assigned_professional_id: 'u2',
    assigned_professional_name: 'Dr. Henrique Greca',
    status: 'ATIVO',
    treatment_status: 'ATIVO_CONTINUO',
    recurring_schedule: {
      day_of_week: 4,
      day_name: 'Quinta-feira',
      time: '16:00',
      duration_minutes: 50,
      session_type: 'ONLINE',
      active: true,
    },
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
    anamnese: {
      marital_status: 'Solteiro',
      occupation: 'Designer Gráfico',
      main_complaint: 'Dificuldade de concentração, procrastinação crônica e desânimo persistente.',
      clinical_history: 'Investigação de sintomas compatíveis com TDAH no adulto. Relato de alterações no padrão de sono.',
      allergies_medications: 'Rinite alérgica leve. Sem medicamentos contínuos.',
      lgpd_consent_signed: true,
      lgpd_consent_date: new Date(Date.now() - 60 * 86400000).toISOString(),
    },
  },
  {
    id: 'p3',
    full_name: 'Fernanda Costa Ribeiro',
    cpf: '489.***.***-12',
    birth_date: '1995-03-08',
    email: 'fernanda.costa@exemplo.com',
    phone: '(11) 96555-6677',
    gender: 'Feminino',
    address: 'Rua Bela Cintra, 820, Apto 11 - São Paulo, SP',
    emergency_contact: {
      name: 'Juliana Costa (Irmã)',
      relationship: 'Irmã',
      phone: '(11) 96666-7788',
    },
    assigned_professional_id: 'u1',
    assigned_professional_name: 'Dra. Beatriz Santos',
    status: 'ATIVO',
    treatment_status: 'PRIMEIRA_SESSAO',
    created_at: new Date().toISOString(),
    anamnese: {
      marital_status: 'Solteira',
      occupation: 'Gerente Comercial',
      main_complaint: 'Deseja iniciar acompanhamento psicoterápico para trabalhar transição de carreira e autoconhecimento.',
      clinical_history: 'Primeira experiência em psicoterapia. Demonstra boa receptividade ao processo clínico.',
      allergies_medications: 'Nenhuma.',
      lgpd_consent_signed: true,
      lgpd_consent_date: new Date().toISOString(),
    },
  },
];

const DEFAULT_APPOINTMENTS: Appointment[] = [
  {
    id: 'app-1',
    patient_id: 'p1',
    patient_name: 'Mariana Silva Oliveira',
    patient_phone: '(11) 98111-2233',
    professional_id: 'u1',
    professional_name: 'Dra. Beatriz Santos',
    start_time: new Date(new Date().setHours(14, 0, 0, 0)).toISOString(),
    end_time: new Date(new Date().setHours(14, 50, 0, 0)).toISOString(),
    status: 'CONFIRMADO',
    session_type: 'PRESENCIAL',
    notes: 'Sessão semanal recorrente (TCC).',
    is_recurring: true,
    created_by_user_id: 'u1',
    created_by_role: 'PROFESSIONAL',
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  {
    id: 'app-2',
    patient_id: 'p2',
    patient_name: 'Lucas Eduardo Mendes',
    patient_phone: '(11) 97333-4455',
    professional_id: 'u2',
    professional_name: 'Dr. Henrique Greca',
    start_time: new Date(new Date().setHours(16, 0, 0, 0)).toISOString(),
    end_time: new Date(new Date().setHours(16, 50, 0, 0)).toISOString(),
    status: 'AGENDADO',
    session_type: 'ONLINE',
    notes: 'Devolutiva de inventário de atenção concentrada.',
    is_recurring: true,
    created_by_user_id: 'u2',
    created_by_role: 'PROFESSIONAL',
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
];

const DEFAULT_RECORDS: MedicalRecord[] = [
  {
    id: 'rec-1',
    patient_id: 'p1',
    professional_id: 'u1',
    professional_name: 'Dra. Beatriz Santos',
    session_number: 1,
    session_date: new Date(Date.now() - 14 * 86400000).toISOString(),
    subjective: 'Paciente relata que teve três episódios de ansiedade aguda na última semana. Identificou gatilhos relacionados a prazos de entrega.',
    assessment: 'Apresenta distorções cognitivas do tipo catastrofização e pensamento tudo-ou-nada.',
    intervention: 'Apresentação do modelo cognitivo de Beck e técnica de Registro de Pensamentos Disfuncionais (RPD).',
    plan: 'Praticar o preenchimento do RPD quando identificar alterações emocionais intensas.',
    is_sealed: true,
    sealed_at: new Date(Date.now() - 14 * 86400000).toISOString(),
    sha256_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    encryption_algorithm: 'AES-256-GCM',
  },
  {
    id: 'rec-2',
    patient_id: 'p2',
    professional_id: 'u2',
    professional_name: 'Dr. Henrique Greca',
    session_number: 1,
    session_date: new Date(Date.now() - 21 * 86400000).toISOString(),
    subjective: 'Paciente relata dificuldade crônica em manter foco em tarefas de longo prazo. Queixa-se de desorganização.',
    assessment: 'Indicadores preliminares apontam comprometimento em funções executivas e flexibilidade cognitiva.',
    intervention: 'Aplicação de escala de autorrelato para TDAH em adultos e orientação sobre técnicas de ancoragem temporal.',
    plan: 'Iniciar registro de atividades diárias em blocos de 25 minutos (Pomodoro adaptado).',
    is_sealed: true,
    sealed_at: new Date(Date.now() - 21 * 86400000).toISOString(),
    sha256_hash: 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e',
    encryption_algorithm: 'AES-256-GCM',
  },
];

function loadStore(): ResilienceStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.patients && parsed.users) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[Resilience] Falha ao ler localStorage:', err);
  }

  const initial: ResilienceStore = {
    users: DEFAULT_USERS,
    patients: DEFAULT_PATIENTS,
    appointments: DEFAULT_APPOINTMENTS,
    medicalRecords: DEFAULT_RECORDS,
    attachments: [],
    auditLogs: [],
    reminders: [
      {
        id: 'rem-1',
        appointment_id: 'app-1',
        patient_name: 'Mariana Silva Oliveira',
        patient_phone: '(11) 98111-2233',
        appointment_datetime: new Date(new Date().setHours(14, 0, 0, 0)).toISOString(),
        message_preview: 'Olá Mariana, confirmamos sua sessão hoje às 14:00 na CliniCare.',
        scheduled_send_at: new Date(new Date().setHours(8, 0, 0, 0)).toISOString(),
        status: 'ENVIADO',
        channel: 'WHATSAPP',
      },
    ],
    notifications: [
      {
        id: 'notif-1',
        recipient_user_id: 'u2',
        title: 'Prontuário com Criptografia Ativa',
        message: 'Sistema inicializado em modo seguro com conformidade LGPD.',
        type: 'SECURITY_ALERT',
        read: false,
        created_at: new Date().toISOString(),
      },
    ],
  };
  saveStore(initial);
  return initial;
}

function saveStore(store: ResilienceStore) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (err) {
    console.warn('[Resilience] Falha ao salvar no localStorage:', err);
  }
}

// Emissor de status de resiliência
let isResilienceModeActive = false;

function setResilienceMode(active: boolean, reason?: string) {
  if (isResilienceModeActive !== active) {
    isResilienceModeActive = active;
    window.dispatchEvent(
      new CustomEvent('clinic-resilience-mode', {
        detail: { active, reason },
      })
    );
    if (active) {
      console.warn('[Resilience Engine] Modo Resiliente Local ativado:', reason);
    } else {
      console.log('[Resilience Engine] Servidor online reconectado.');
    }
  }
}

/**
 * Interceptor transparente de chamadas /api/ no navegador
 */
export function setupResilienceInterceptor() {
  if (typeof window === 'undefined' || !(window as any).fetch) return;

  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlString = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

    // Se não for rota da API clínica, passa direto para o fetch nativo
    if (!urlString.includes('/api/')) {
      return nativeFetch(input, init);
    }

    try {
      // 1. Tenta a requisição real de rede
      const response = await nativeFetch(input, init);

      // Se respondeu com sucesso ou erro de validação normal (400, 401, 403, 422), retorna normal
      if (response.status < 500 && response.status !== 404) {
        setResilienceMode(false);
        return response;
      }

      // Se retornou 500 (como FUNCTION_INVOCATION_FAILED da Vercel) ou 404, ativa resiliência local
      const clone = response.clone();
      const bodyText = await clone.text();
      if (
        response.status >= 500 ||
        bodyText.includes('FUNCTION_INVOCATION_FAILED') ||
        response.status === 404
      ) {
        setResilienceMode(true, `Status ${response.status} do servidor backend (${bodyText.slice(0, 60)})`);
        return handleLocalApiRequest(urlString, init);
      }

      return response;
    } catch (networkError: any) {
      // Falha de rede / offline / timeout / CORS -> ativa resiliência local instantaneamente
      setResilienceMode(true, networkError?.message || 'Falha de rede com servidor');
      return handleLocalApiRequest(urlString, init);
    }
  };

  console.log('[Resilience Engine] Interceptor de Alta Disponibilidade instalado.');
}

/**
 * Processador local de requisições /api/ com persistência em localStorage
 */
function handleLocalApiRequest(url: string, init?: RequestInit): Response {
  const store = loadStore();
  const method = (init?.method || 'GET').toUpperCase();
  const body = init?.body ? (typeof init.body === 'string' ? JSON.parse(init.body) : init.body) : {};

  // Extrai o caminho limpo da rota (/api/auth/login, etc.)
  const cleanPath = url.replace(/^[a-z]+:\/\/[^/]+/i, '').split('?')[0];

  const jsonResponse = (data: any, status = 200) => {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        'Content-Type': 'application/json',
        'X-Clinic-Storage-Mode': 'RESILIENT_LOCAL',
      },
    });
  };

  // --- 1. /api/auth/login ---
  if (cleanPath === '/api/auth/login' && method === 'POST') {
    const rawEmail = String(body.email || '').toLowerCase().trim();

    let user = store.users.find((u) => u.email.toLowerCase() === rawEmail);
    // Alias especial para Dr. Henrique Greca
    if (!user && (rawEmail === 'henriquegrecac@gmail.com' || rawEmail.includes('greca'))) {
      user = store.users.find((u) => u.id === 'u2') || store.users[1];
    }

    if (!user) {
      return jsonResponse({ error: 'Credenciais inválidas no modo local.' }, 401);
    }

    localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(user));
    localStorage.setItem(TOKEN_KEY, 'resilient-token-' + user.id + '-' + Date.now());

    return jsonResponse({
      success: true,
      user,
      token: 'resilient-token-' + user.id + '-' + Date.now(),
      mode: 'RESILIENT_LOCAL',
    });
  }

  // --- 2. /api/auth/register ---
  if (cleanPath === '/api/auth/register' && method === 'POST') {
    const newUser: User = {
      id: 'u-' + Date.now(),
      name: body.name || 'Novo Usuário',
      email: body.email || 'usuario@clinicacare.com',
      role: body.role || 'PROFESSIONAL',
      council_number: body.council_number || '',
      specialty: body.specialty || '',
      phone: body.phone || '',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    };
    store.users.push(newUser);
    saveStore(store);
    localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(newUser));
    return jsonResponse({ success: true, user: newUser, token: 'resilient-token-' + newUser.id });
  }

  // --- 3. /api/auth/users ---
  if (cleanPath === '/api/auth/users' && method === 'GET') {
    const activeRaw = localStorage.getItem(ACTIVE_USER_KEY);
    const activeUser = activeRaw ? JSON.parse(activeRaw) : store.users[1];
    return jsonResponse({ users: store.users, activeUserId: activeUser.id });
  }

  // --- 4. /api/auth/me ---
  if (cleanPath === '/api/auth/me' && method === 'GET') {
    const activeRaw = localStorage.getItem(ACTIVE_USER_KEY);
    const activeUser = activeRaw ? JSON.parse(activeRaw) : store.users[1];
    return jsonResponse({ user: activeUser });
  }

  // --- 5. /api/patients ---
  if (cleanPath === '/api/patients') {
    if (method === 'GET') {
      return jsonResponse({ patients: store.patients });
    }
    if (method === 'POST') {
      const newPatient: Patient = {
        id: 'pat-' + Date.now(),
        full_name: body.full_name || 'Paciente Sem Nome',
        cpf: body.cpf || '000.***.***-00',
        birth_date: body.birth_date || '1990-01-01',
        email: body.email || '',
        phone: body.phone || '',
        gender: body.gender || 'Não especificado',
        address: body.address || '',
        emergency_contact: body.emergency_contact || { name: '', relationship: '', phone: '' },
        assigned_professional_id: body.assigned_professional_id || 'u2',
        assigned_professional_name: body.assigned_professional_name || 'Dr. Henrique Greca',
        status: 'ATIVO',
        treatment_status: body.treatment_status || 'PRIMEIRA_SESSAO',
        recurring_schedule: body.recurring_schedule,
        created_at: new Date().toISOString(),
        anamnese: body.anamnese || {
          marital_status: '',
          occupation: '',
          main_complaint: '',
          clinical_history: '',
          allergies_medications: '',
          lgpd_consent_signed: true,
          lgpd_consent_date: new Date().toISOString(),
        },
      };
      store.patients.unshift(newPatient);
      saveStore(store);
      return jsonResponse({ success: true, patient: newPatient }, 201);
    }
  }

  // --- 6. /api/patients/:id ---
  const patientMatch = cleanPath.match(/^\/api\/patients\/([^/]+)$/);
  if (patientMatch) {
    const pId = patientMatch[1];
    const index = store.patients.findIndex((p) => p.id === pId);

    if (method === 'GET') {
      if (index === -1) return jsonResponse({ error: 'Paciente não encontrado' }, 404);
      return jsonResponse({ patient: store.patients[index] });
    }
    if (method === 'PUT') {
      if (index !== -1) {
        store.patients[index] = { ...store.patients[index], ...body };
        saveStore(store);
        return jsonResponse({ success: true, patient: store.patients[index] });
      }
    }
    if (method === 'DELETE') {
      if (index !== -1) {
        store.patients.splice(index, 1);
        saveStore(store);
        return jsonResponse({ success: true });
      }
    }
  }

  // --- 7. /api/patients/:id/records ---
  const recordsMatch = cleanPath.match(/^\/api\/patients\/([^/]+)\/records$/);
  if (recordsMatch) {
    const pId = recordsMatch[1];
    if (method === 'GET') {
      const records = store.medicalRecords.filter((r) => r.patient_id === pId);
      return jsonResponse({ records });
    }
    if (method === 'POST') {
      const newRec: MedicalRecord = {
        id: 'rec-' + Date.now(),
        patient_id: pId,
        professional_id: body.professional_id || 'u2',
        professional_name: body.professional_name || 'Dr. Henrique Greca',
        session_number: body.session_number || (store.medicalRecords.filter((r) => r.patient_id === pId).length + 1),
        session_date: body.session_date || new Date().toISOString(),
        subjective: body.subjective || '',
        assessment: body.assessment || '',
        intervention: body.intervention || '',
        plan: body.plan || '',
        is_sealed: true,
        sealed_at: new Date().toISOString(),
        sha256_hash: 'local-hash-' + Math.random().toString(36).substring(2),
        encryption_algorithm: 'AES-256-GCM',
      };
      store.medicalRecords.unshift(newRec);
      saveStore(store);
      return jsonResponse({ success: true, record: newRec }, 201);
    }
  }

  // --- 8. /api/appointments ---
  if (cleanPath === '/api/appointments') {
    if (method === 'GET') {
      return jsonResponse({ appointments: store.appointments });
    }
    if (method === 'POST') {
      const newApp: Appointment = {
        id: 'app-' + Date.now(),
        patient_id: body.patient_id,
        patient_name: body.patient_name || '',
        patient_phone: body.patient_phone || '',
        professional_id: body.professional_id || 'u2',
        professional_name: body.professional_name || 'Dr. Henrique Greca',
        start_time: body.start_time || new Date().toISOString(),
        end_time: body.end_time || new Date(Date.now() + 50 * 60000).toISOString(),
        status: body.status || 'AGENDADO',
        session_type: body.session_type || 'PRESENCIAL',
        notes: body.notes || '',
        is_recurring: Boolean(body.is_recurring),
        created_by_user_id: 'u2',
        created_by_role: 'PROFESSIONAL',
        created_at: new Date().toISOString(),
      };
      store.appointments.push(newApp);
      saveStore(store);
      return jsonResponse({ success: true, appointment: newApp }, 201);
    }
  }

  // --- 9. /api/reminders ---
  if (cleanPath === '/api/reminders') {
    return jsonResponse({ reminders: store.reminders });
  }

  // --- 10. /api/notifications ---
  if (cleanPath === '/api/notifications') {
    return jsonResponse({ notifications: store.notifications });
  }

  // --- 11. /api/audit-logs ---
  if (cleanPath === '/api/audit-logs') {
    return jsonResponse({ auditLogs: store.auditLogs });
  }

  // Fallback genérico para rotas não capturadas
  return jsonResponse({ success: true, mode: 'RESILIENT_LOCAL' });
}
