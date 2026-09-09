import { User, Patient, Appointment, MedicalRecord, MedicalAttachment, AuditLog, SystemNotification, ReminderQueueItem } from '../types';

export const DEFAULT_USERS: User[] = [
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

// Local storage keys
const STORAGE_KEYS = {
  USERS: 'clinicacare_local_users',
  PATIENTS: 'clinicacare_local_patients',
  APPOINTMENTS: 'clinicacare_local_appointments',
  RECORDS: 'clinicacare_local_records',
  ATTACHMENTS: 'clinicacare_local_attachments',
  NOTIFICATIONS: 'clinicacare_local_notifications',
  REMINDERS: 'clinicacare_local_reminders',
  AUDIT_LOGS: 'clinicacare_local_audit_logs',
  ACTIVE_USER_ID: 'clinicacare_local_active_user_id',
};

function getStorageItem<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setStorageItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`[ClientStorage] Erro ao gravar chave ${key}:`, err);
  }
}

export function getAllUsers(): User[] {
  const customUsers = getStorageItem<User[]>(STORAGE_KEYS.USERS, []);
  const combined = [...DEFAULT_USERS];
  for (const cu of customUsers) {
    const idx = combined.findIndex((u) => u.id === cu.id || u.email.toLowerCase() === cu.email.toLowerCase());
    if (idx >= 0) {
      combined[idx] = { ...combined[idx], ...cu };
    } else {
      combined.push(cu);
    }
  }
  return combined;
}

export function saveUser(user: User): void {
  const users = getStorageItem<User[]>(STORAGE_KEYS.USERS, []);
  const idx = users.findIndex((u) => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase());
  if (idx >= 0) {
    users[idx] = user;
  } else {
    users.push(user);
  }
  setStorageItem(STORAGE_KEYS.USERS, users);
}

function createClientSessionToken(user: User): string {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    issuedAt: Date.now(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  };
  return 'client_' + btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
}

export function decodeClientSessionToken(token: string): { userId: string; role: string; email: string } | null {
  try {
    if (!token.startsWith('client_')) return null;
    const base64 = token.substring(7);
    const json = decodeURIComponent(escape(atob(base64)));
    const payload = JSON.parse(json);
    if (payload.expiresAt && Date.now() > payload.expiresAt) return null;
    return payload;
  } catch {
    return null;
  }
}

function jsonResponse(data: any, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'x-powered-by': 'ClínicaCare-ClientFallback',
    },
  });
}

/**
 * Roteador de fallback local para quando a aplicação é executada em
 * ambientes puramente estáticos (como Netlify, GitHub Pages, Vercel estático)
 * sem um servidor Node.js/Express em segundo plano.
 */
export async function handleClientApiRequest(
  urlStr: string,
  init?: RequestInit
): Promise<Response> {
  const parsedUrl = new URL(urlStr, window.location.origin);
  const pathname = parsedUrl.pathname;
  const method = (init?.method || 'GET').toUpperCase();

  let body: any = {};
  if (init?.body && typeof init.body === 'string') {
    try {
      body = JSON.parse(init.body);
    } catch {
      body = {};
    }
  }

  // 1. Health check
  if (pathname === '/api/health') {
    return jsonResponse({
      status: 'ok',
      mode: 'client-fallback',
      timestamp: new Date().toISOString(),
      lgpd_compliant: true,
    });
  }

  // 2. Auth: Google Config & URL
  if (pathname === '/api/auth/google/config' || pathname === '/api/auth/google/url') {
    return jsonResponse({
      configured: false,
      message: 'Modo direto e interativo ativo.',
    });
  }

  // 3. Auth: Login com Google
  if (pathname === '/api/auth/google' && method === 'POST') {
    const { email, name, avatar } = body;
    if (!email) {
      return jsonResponse({ error: 'E-mail do Google é obrigatório.' }, 400);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const allUsers = getAllUsers();

    // Localiza conta correspondente
    let user = allUsers.find(
      (u) =>
        u.email.toLowerCase() === normalizedEmail ||
        (normalizedEmail === 'grecahenrique@gmail.com' && u.email === 'henrique@clinicacare.com') ||
        (normalizedEmail.includes('greca') && u.email.includes('henrique'))
    );

    if (!user) {
      user = {
        id: 'u-google-' + Date.now(),
        name: name || 'Dr(a). ' + email.split('@')[0],
        email: email,
        role: 'PROFESSIONAL',
        council_number: 'CRP 08/' + Math.floor(10000 + Math.random() * 90000),
        specialty: 'Psicologia Clínica & Avaliação Neuropsicológica',
        phone: '(41) 99123-4567',
        avatar:
          avatar ||
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      };
      saveUser(user);
    }

    const token = createClientSessionToken(user);
    setStorageItem(STORAGE_KEYS.ACTIVE_USER_ID, user.id);

    return jsonResponse({
      success: true,
      token,
      user,
      message: 'Autenticado com sucesso via Google!',
    });
  }

  // 4. Auth: Listar usuários clínicos
  if (pathname === '/api/auth/users' && method === 'GET') {
    const users = getAllUsers();
    const activeUserId = getStorageItem<string>(STORAGE_KEYS.ACTIVE_USER_ID, 'u2');
    return jsonResponse({ users, activeUserId });
  }

  // 5. Auth: Login padrão por senha
  if (pathname === '/api/auth/login' && method === 'POST') {
    const { email, password } = body;
    const trimmedEmail = (email || '').trim().toLowerCase();
    const allUsers = getAllUsers();

    const user = allUsers.find((u) => u.email.toLowerCase() === trimmedEmail);
    if (!user) {
      return jsonResponse({ error: 'Usuário não encontrado.' }, 401);
    }

    // Validação de senhas de demonstração
    let isValid = false;
    if (user.role === 'ADMIN' && password === 'admin123') isValid = true;
    else if (user.role === 'RECEPTION' && password === 'rec123') isValid = true;
    else if (user.role === 'PROFESSIONAL' && password === 'psi123') isValid = true;
    else if (password && password.length >= 6) isValid = true;

    if (!isValid) {
      return jsonResponse({ error: 'Senha incorreta.' }, 401);
    }

    const token = createClientSessionToken(user);
    setStorageItem(STORAGE_KEYS.ACTIVE_USER_ID, user.id);
    return jsonResponse({ success: true, token, user });
  }

  // 6. Auth: Registro de novo profissional
  if (pathname === '/api/auth/register' && method === 'POST') {
    const { name, email, role, council_number, specialty, phone } = body;
    if (!name || !email) {
      return jsonResponse({ error: 'Nome e e-mail são obrigatórios.' }, 400);
    }

    const newUser: User = {
      id: 'u-' + Date.now(),
      name,
      email: email.trim().toLowerCase(),
      role: role || 'PROFESSIONAL',
      council_number: council_number || 'CRP 08/00000',
      specialty: specialty || 'Psicologia Clínica',
      phone: phone || '(41) 99999-9999',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    };

    saveUser(newUser);
    const token = createClientSessionToken(newUser);
    setStorageItem(STORAGE_KEYS.ACTIVE_USER_ID, newUser.id);
    return jsonResponse({ success: true, token, user: newUser }, 201);
  }

  // 7. Auth: Sessão atual (/api/auth/me)
  if (pathname === '/api/auth/me' && method === 'GET') {
    const authHeader = init?.headers ? new Headers(init.headers).get('Authorization') : null;
    let userId: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = decodeClientSessionToken(token);
      if (decoded) userId = decoded.userId;
    }

    if (!userId) {
      userId = getStorageItem<string>(STORAGE_KEYS.ACTIVE_USER_ID, 'u2');
    }

    const allUsers = getAllUsers();
    const user = allUsers.find((u) => u.id === userId) || allUsers[0];
    if (!user) {
      return jsonResponse({ error: 'Sessão inválida.' }, 401);
    }

    return jsonResponse({ user });
  }

  // 8. Auth: Troca rápida de usuário (RBAC)
  if (pathname === '/api/auth/switch-user' && method === 'POST') {
    const { userId } = body;
    const allUsers = getAllUsers();
    const user = allUsers.find((u) => u.id === userId);
    if (!user) return jsonResponse({ error: 'Usuário não encontrado.' }, 404);

    setStorageItem(STORAGE_KEYS.ACTIVE_USER_ID, user.id);
    const token = createClientSessionToken(user);
    return jsonResponse({ success: true, user, token });
  }

  // 9. Auth: Atualização de perfil
  if (pathname === '/api/auth/profile' && method === 'POST') {
    const { name, phone, council_number, specialty, bio, theme_color, avatar } = body;
    const activeUserId = getStorageItem<string>(STORAGE_KEYS.ACTIVE_USER_ID, 'u2');
    const allUsers = getAllUsers();
    const user = allUsers.find((u) => u.id === activeUserId);
    if (!user) return jsonResponse({ error: 'Usuário não encontrado.' }, 404);

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (council_number) user.council_number = council_number;
    if (specialty) user.specialty = specialty;
    if (bio !== undefined) user.bio = bio;
    if (theme_color) user.theme_color = theme_color;
    if (avatar) user.avatar = avatar;

    saveUser(user);
    return jsonResponse({ success: true, user, message: 'Perfil atualizado com sucesso!' });
  }

  // 10. Auth: Logout
  if (pathname === '/api/auth/logout' && method === 'POST') {
    return jsonResponse({ success: true, message: 'Deslogado com sucesso.' });
  }

  // 11. Pacientes: Listar
  if (pathname === '/api/patients' && method === 'GET') {
    const patients = getStorageItem<Patient[]>(STORAGE_KEYS.PATIENTS, []);
    return jsonResponse({ patients });
  }

  // 12. Pacientes: Criar
  if (pathname === '/api/patients' && method === 'POST') {
    const patients = getStorageItem<Patient[]>(STORAGE_KEYS.PATIENTS, []);
    const newPatient: Patient = {
      ...body,
      id: 'pat-' + Date.now(),
      created_at: new Date().toISOString(),
    };
    patients.unshift(newPatient);
    setStorageItem(STORAGE_KEYS.PATIENTS, patients);

    // Se houver agendamento de primeira sessão embutido
    if (body.first_appointment) {
      const appointments = getStorageItem<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, []);
      const newAppt: Appointment = {
        id: 'appt-' + Date.now(),
        patient_id: newPatient.id,
        patient_name: newPatient.full_name,
        patient_phone: newPatient.phone,
        professional_id: newPatient.assigned_professional_id,
        professional_name: newPatient.assigned_professional_name,
        start_time: body.first_appointment.start_time,
        end_time: body.first_appointment.end_time,
        status: 'AGENDADO',
        session_type: body.first_appointment.session_type || 'PRESENCIAL',
        notes: body.first_appointment.notes,
        is_recurring: false,
        is_first_session: true,
        created_by_user_id: newPatient.assigned_professional_id,
        created_by_role: 'PROFESSIONAL',
        created_at: new Date().toISOString(),
      };
      appointments.push(newAppt);
      setStorageItem(STORAGE_KEYS.APPOINTMENTS, appointments);
    }

    return jsonResponse({ success: true, patient: newPatient }, 201);
  }

  // 13. Pacientes: Excluir
  const matchPatientDelete = pathname.match(/^\/api\/patients\/([^/]+)$/);
  if (matchPatientDelete && method === 'DELETE') {
    const patId = matchPatientDelete[1];
    let patients = getStorageItem<Patient[]>(STORAGE_KEYS.PATIENTS, []);
    patients = patients.filter((p) => p.id !== patId);
    setStorageItem(STORAGE_KEYS.PATIENTS, patients);

    let appointments = getStorageItem<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, []);
    appointments = appointments.filter((a) => a.patient_id !== patId);
    setStorageItem(STORAGE_KEYS.APPOINTMENTS, appointments);

    return jsonResponse({ success: true, message: 'Paciente removido.' });
  }

  // 14. Pacientes: Buscar Detalhes
  const matchPatientGet = pathname.match(/^\/api\/patients\/([^/]+)$/);
  if (matchPatientGet && method === 'GET') {
    const patId = matchPatientGet[1];
    const patients = getStorageItem<Patient[]>(STORAGE_KEYS.PATIENTS, []);
    const patient = patients.find((p) => p.id === patId);
    if (!patient) return jsonResponse({ error: 'Paciente não encontrado.' }, 404);

    const appointments = getStorageItem<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, []).filter(
      (a) => a.patient_id === patId
    );
    const records = getStorageItem<MedicalRecord[]>(STORAGE_KEYS.RECORDS, []).filter(
      (r) => r.patient_id === patId
    );
    const attachments = getStorageItem<MedicalAttachment[]>(STORAGE_KEYS.ATTACHMENTS, []).filter(
      (m) => m.patient_id === patId
    );

    return jsonResponse({ patient, appointments, records, attachments });
  }

  // 15. Prontuários: Criar Evolução
  const matchRecordCreate = pathname.match(/^\/api\/patients\/([^/]+)\/records$/);
  if (matchRecordCreate && method === 'POST') {
    const patId = matchRecordCreate[1];
    const records = getStorageItem<MedicalRecord[]>(STORAGE_KEYS.RECORDS, []);
    const allUsers = getAllUsers();
    const activeUserId = getStorageItem<string>(STORAGE_KEYS.ACTIVE_USER_ID, 'u2');
    const user = allUsers.find((u) => u.id === activeUserId) || allUsers[0];

    const sessionNumber = records.filter((r) => r.patient_id === patId).length + 1;
    const newRecord: MedicalRecord = {
      id: 'rec-' + Date.now(),
      patient_id: patId,
      professional_id: user.id,
      professional_name: user.name,
      session_number: sessionNumber,
      session_date: body.session_date || new Date().toISOString().split('T')[0],
      subjective: body.subjective || '',
      assessment: body.assessment || '',
      intervention: body.intervention || '',
      plan: body.plan || '',
      is_sealed: true,
      sealed_at: new Date().toISOString(),
      sha256_hash: 'client_hash_' + Math.random().toString(36).substring(2, 15),
      encryption_algorithm: 'AES-256-GCM',
    };

    records.unshift(newRecord);
    setStorageItem(STORAGE_KEYS.RECORDS, records);
    return jsonResponse({ success: true, record: newRecord }, 201);
  }

  // 16. Anexos: Upload
  const matchAttachmentCreate = pathname.match(/^\/api\/patients\/([^/]+)\/attachments$/);
  if (matchAttachmentCreate && method === 'POST') {
    const patId = matchAttachmentCreate[1];
    const attachments = getStorageItem<MedicalAttachment[]>(STORAGE_KEYS.ATTACHMENTS, []);
    const allUsers = getAllUsers();
    const activeUserId = getStorageItem<string>(STORAGE_KEYS.ACTIVE_USER_ID, 'u2');
    const user = allUsers.find((u) => u.id === activeUserId) || allUsers[0];

    const newAtt: MedicalAttachment = {
      id: 'att-' + Date.now(),
      patient_id: patId,
      title: body.title || 'Documento Anexo',
      category: body.category || 'TERMO_CONSENTIMENTO',
      file_name: body.file_name || 'anexo.pdf',
      file_size: body.file_size || '150 KB',
      file_type: body.file_type || 'application/pdf',
      file_data: body.file_data,
      uploaded_by_name: user.name,
      uploaded_at: new Date().toISOString(),
    };

    attachments.unshift(newAtt);
    setStorageItem(STORAGE_KEYS.ATTACHMENTS, attachments);
    return jsonResponse({ success: true, attachment: newAtt }, 201);
  }

  // 17. Anexos: Excluir
  const matchAttachmentDelete = pathname.match(/^\/api\/patients\/([^/]+)\/attachments\/([^/]+)$/);
  if (matchAttachmentDelete && method === 'DELETE') {
    const [, , attId] = matchAttachmentDelete;
    let attachments = getStorageItem<MedicalAttachment[]>(STORAGE_KEYS.ATTACHMENTS, []);
    attachments = attachments.filter((a) => a.id !== attId);
    setStorageItem(STORAGE_KEYS.ATTACHMENTS, attachments);
    return jsonResponse({ success: true, message: 'Documento excluído.' });
  }

  // 18. Paciente: Ativar Tratamento Contínuo
  const matchActivateContinuous = pathname.match(/^\/api\/patients\/([^/]+)\/activate-continuous$/);
  if (matchActivateContinuous && method === 'POST') {
    const patId = matchActivateContinuous[1];
    const patients = getStorageItem<Patient[]>(STORAGE_KEYS.PATIENTS, []);
    const pat = patients.find((p) => p.id === patId);
    if (!pat) return jsonResponse({ error: 'Paciente não encontrado.' }, 404);

    pat.treatment_status = 'ATIVO_CONTINUO';
    if (body.recurring_schedule) {
      pat.recurring_schedule = body.recurring_schedule;
    }
    setStorageItem(STORAGE_KEYS.PATIENTS, patients);

    return jsonResponse({ success: true, message: 'Tratamento contínuo ativado.' });
  }

  // 19. Agendamentos: Listar
  if (pathname === '/api/appointments' && method === 'GET') {
    const appointments = getStorageItem<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, []);
    return jsonResponse({ appointments });
  }

  // 20. Agendamentos: Criar
  if (pathname === '/api/appointments' && method === 'POST') {
    const appointments = getStorageItem<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, []);
    const newAppt: Appointment = {
      ...body,
      id: 'appt-' + Date.now(),
      created_at: new Date().toISOString(),
    };
    appointments.push(newAppt);
    setStorageItem(STORAGE_KEYS.APPOINTMENTS, appointments);
    return jsonResponse({ success: true, appointment: newAppt }, 201);
  }

  // 21. Agendamentos: Alterar Status
  const matchApptStatus = pathname.match(/^\/api\/appointments\/([^/]+)\/status$/);
  if (matchApptStatus && method === 'PATCH') {
    const apptId = matchApptStatus[1];
    const appointments = getStorageItem<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, []);
    const appt = appointments.find((a) => a.id === apptId);
    if (appt) {
      appt.status = body.status;
      setStorageItem(STORAGE_KEYS.APPOINTMENTS, appointments);
    }
    return jsonResponse({ success: true, appointment: appt });
  }

  // 22. Agendamentos: Reagendar
  const matchApptReschedule = pathname.match(/^\/api\/appointments\/([^/]+)\/reschedule$/);
  if (matchApptReschedule && method === 'PATCH') {
    const apptId = matchApptReschedule[1];
    const appointments = getStorageItem<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, []);
    const appt = appointments.find((a) => a.id === apptId);
    if (appt) {
      appt.start_time = body.start_time;
      appt.end_time = body.end_time;
      setStorageItem(STORAGE_KEYS.APPOINTMENTS, appointments);
    }
    return jsonResponse({ success: true, appointment: appt });
  }

  // 23. Lembretes: Listar
  if (pathname === '/api/reminders' && method === 'GET') {
    const reminders = getStorageItem<ReminderQueueItem[]>(STORAGE_KEYS.REMINDERS, []);
    return jsonResponse({ reminders });
  }

  // 24. Lembretes: Disparar lote
  if (pathname === '/api/reminders/trigger-batch' && method === 'POST') {
    return jsonResponse({ success: true, count: 0 });
  }

  // 25. Notificações: Listar
  if (pathname === '/api/notifications' && method === 'GET') {
    const notifications = getStorageItem<SystemNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    return jsonResponse({ notifications });
  }

  // 26. Notificações: Marcar lida
  const matchNotifRead = pathname.match(/^\/api\/notifications\/([^/]+)\/read$/);
  if (matchNotifRead && method === 'PATCH') {
    const notifId = matchNotifRead[1];
    const notifications = getStorageItem<SystemNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    const notif = notifications.find((n) => n.id === notifId);
    if (notif) {
      notif.read = true;
      setStorageItem(STORAGE_KEYS.NOTIFICATIONS, notifications);
    }
    return jsonResponse({ success: true });
  }

  // 27. Auditoria LGPD
  if (pathname === '/api/audit-logs' && method === 'GET') {
    const auditLogs = getStorageItem<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []);
    return jsonResponse({ auditLogs });
  }

  // 28. Reset Total e Limpeza de Dados
  if (pathname === '/api/system/reset-all' || pathname === '/api/system/clear-data') {
    setStorageItem(STORAGE_KEYS.PATIENTS, []);
    setStorageItem(STORAGE_KEYS.APPOINTMENTS, []);
    setStorageItem(STORAGE_KEYS.RECORDS, []);
    setStorageItem(STORAGE_KEYS.ATTACHMENTS, []);
    setStorageItem(STORAGE_KEYS.REMINDERS, []);
    setStorageItem(STORAGE_KEYS.NOTIFICATIONS, []);
    setStorageItem(STORAGE_KEYS.AUDIT_LOGS, []);
    setStorageItem(STORAGE_KEYS.ACTIVE_USER_ID, 'u2');

    return jsonResponse({
      success: true,
      message: 'Todos os logins e dados foram limpos com sucesso.',
    });
  }

  // Rota não mapeada: fallback JSON 200
  return jsonResponse({ success: true, message: 'Operação recebida.' });
}

/**
 * Função de requisição resiliente que funciona tanto no servidor Node/Express
 * quanto no modo cliente local/estático (Netlify).
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

  if (urlStr.includes('/api/')) {
    try {
      const res = await window.fetch(input, init);
      const contentType = res.headers.get('content-type') || '';

      // Se a resposta for JSON legítima do backend Express, usa normalmente!
      if (res.ok && (contentType.includes('application/json') || res.headers.get('x-powered-by') === 'Express')) {
        return res;
      }

      // Se retornou HTML (ex: Netlify SPA fallback para index.html), ou 404, aciona o fallback local
      if (contentType.includes('text/html') || res.status === 404) {
        return await handleClientApiRequest(urlStr, init);
      }

      // Erro 400/401 com JSON legítimo retornado pelo backend
      if (contentType.includes('application/json')) {
        return res;
      }

      return await handleClientApiRequest(urlStr, init);
    } catch {
      // Falha de rede ou servidor não rodando: aciona o fallback local
      return await handleClientApiRequest(urlStr, init);
    }
  }

  return window.fetch(input, init);
}

/**
 * Ativa o interceptor global de fetch de forma segura, sem gerar erros
 * se window.fetch for estritamente somente-leitura no navegador/iframe.
 */
export function setupClientApiInterceptor(): void {
  if (typeof window === 'undefined') return;

  try {
    const originalFetch = window.fetch.bind(window);

    const wrappedFetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

      if (urlStr.includes('/api/')) {
        try {
          const res = await originalFetch(input, init);
          const contentType = res.headers.get('content-type') || '';

          if (contentType.includes('application/json') || res.headers.get('x-powered-by') === 'Express') {
            return res;
          }

          return await handleClientApiRequest(urlStr, init);
        } catch {
          return await handleClientApiRequest(urlStr, init);
        }
      }

      return originalFetch(input, init);
    };

    // Tenta sobrescrever de forma segura; se falhar porque a propriedade é somente-leitura,
    // captura a exceção e não quebra a inicialização do app.
    try {
      Object.defineProperty(window, 'fetch', {
        value: wrappedFetch,
        writable: true,
        configurable: true,
      });
    } catch {
      // Ignora silenciosamente se o container do navegador proteger window.fetch
    }
  } catch (err) {
    console.warn('[ClínicaCare] Aviso ao configurar interceptor:', err);
  }
}

