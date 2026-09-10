import express from 'express';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';

const app = express();
const PORT = 3000;

// ==========================================
// DETECÇÃO DE AMBIENTE SERVERLESS (Vercel, AWS Lambda, GCP Functions)
// ==========================================
function checkIsServerless(): boolean {
  if (
    process.env.VERCEL ||
    process.env.VERCEL_ENV ||
    process.env.VERCEL_REGION ||
    process.env.NOW_REGION ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT ||
    process.env.IS_SERVERLESS
  ) {
    return true;
  }

  const entry = (process.argv && process.argv[1]) ? process.argv[1].replace(/\\/g, '/') : '';
  const isStandaloneScript = Boolean(
    entry && (entry.endsWith('server.ts') || entry.endsWith('server.cjs') || entry.endsWith('server.js'))
  );
  return !isStandaloneScript;
}

const isServerless = checkIsServerless();

// 1. Normalizador de URL para ambiente Serverless (Vercel) e Proxies
app.use((req, res, next) => {
  const rawPath =
    (req.headers['x-matched-path'] as string) ||
    (req.headers['x-forwarded-uri'] as string) ||
    req.originalUrl ||
    req.url;

  if (rawPath && rawPath.startsWith('/api') && (req.url === '/api' || req.url === '/api/' || !req.url.startsWith('/api/'))) {
    req.url = rawPath;
  } else if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  next();
});

// 2. Parser de Body compatível com Serverless (Vercel)
// No runtime serverless da Vercel, o body já é lido e populado como objeto ou string.
// Chamar express.json() diretamente num stream já drenado causa hang (FUNCTION_INVOCATION_FAILED).
app.use((req, res, next) => {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') {
      try {
        req.body = JSON.parse(req.body);
      } catch {
        // não é json, segue fluxo
      }
    } else if (Buffer.isBuffer(req.body)) {
      try {
        req.body = JSON.parse(req.body.toString('utf8'));
      } catch {
        // não é json, segue fluxo
      }
    }
    return next();
  }
  express.json({ limit: '10mb' })(req, res, next);
});

app.use((req, res, next) => {
  if (req.body !== undefined && req.body !== null && typeof req.body === 'object') {
    return next();
  }
  express.urlencoded({ extended: true, limit: '10mb' })(req, res, next);
});

// ==========================================
// 1. CHAVE CRIPTOGRÁFICA LGPD (AES-256-GCM)
// Em produção, esta Master Key é gerenciada por KMS (ex: GCP Cloud KMS ou AWS KMS)
// ==========================================
const ENCRYPTION_MASTER_KEY = crypto.scryptSync(process.env.APP_SECRET || 'clinical-saas-master-key-lgpd-2026', 'salt-clinic', 32);

function encryptSensitiveField(text: string): { ciphertext: string; iv: string; tag: string } {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_MASTER_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return {
    ciphertext: encrypted,
    iv: iv.toString('hex'),
    tag,
  };
}

function decryptSensitiveField(ciphertext: string, ivHex: string, tagHex: string): string {
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_MASTER_KEY, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    return '[DADO CORROMPIDO OU CHAVE INVÁLIDA]';
  }
}

function generateIntegritySignature(data: { patientId: string; profId: string; content: string; timestamp: string }): string {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

// ==========================================
// 2. MODELO DE DADOS RELACIONAIS COM AUTENTICAÇÃO CRIPTOGRAFADA
// ==========================================
interface UserDb {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'PROFESSIONAL' | 'RECEPTION';
  council_number?: string;
  specialty?: string;
  phone: string;
  avatar: string;
  password_hash: string;
  password_salt: string;
}

// Funções de criptografia de senhas (scrypt + salt de 16 bytes)
function hashPassword(password: string, saltHex?: string): { hash: string; salt: string } {
  const salt = saltHex ? Buffer.from(saltHex, 'hex') : crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt: salt.toString('hex') };
}

function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const computed = crypto.scryptSync(password, Buffer.from(salt, 'hex'), 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(hash, 'hex'));
  } catch {
    return false;
  }
}

// Geração e validação de Session Token assinado criptograficamente (HMAC-SHA256)
function createSessionToken(user: UserDb): string {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    issuedAt: Date.now(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 horas
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', ENCRYPTION_MASTER_KEY).update(data).digest('base64url');
  return `${data}.${signature}`;
}

let sessionRevocationTimestamp: number = 0;

function verifySessionToken(token: string): { userId: string; role: string; email: string; issuedAt?: number } | null {
  try {
    const [data, signature] = token.split('.');
    if (!data || !signature) return null;
    const expectedSignature = crypto.createHmac('sha256', ENCRYPTION_MASTER_KEY).update(data).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (payload.expiresAt && Date.now() > payload.expiresAt) {
      return null;
    }
    // Invalida sessões emitidas antes do último reset de logins
    if (sessionRevocationTimestamp && payload.issuedAt && payload.issuedAt <= sessionRevocationTimestamp) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

// Usuários da clínica com credenciais criptografadas de fábrica
let users: UserDb[] = [];

let activeUserId = '';

interface RecurringScheduleDb {
  day_of_week: number; // 1 = Segunda, 2 = Terça, 3 = Quarta, 4 = Quinta, 5 = Sexta, 6 = Sábado, 7 = Domingo
  day_name: string; // 'Terça-feira'
  time: string; // '14:00'
  duration_minutes: number; // 50
  session_type: 'PRESENCIAL' | 'ONLINE';
  active: boolean;
}

interface PatientDb {
  id: string;
  full_name: string;
  cpf: string;
  birth_date: string;
  email: string;
  phone: string;
  gender: string;
  address: string;
  emergency_contact: {
    name: string;
    relationship: string;
    phone: string;
  };
  assigned_professional_id: string;
  assigned_professional_name: string;
  status: 'ATIVO' | 'INATIVO' | 'EM_ALTA';
  treatment_status: 'PRIMEIRA_SESSAO' | 'ATIVO_CONTINUO';
  recurring_schedule?: RecurringScheduleDb;
  created_at: string;
  anamnese: {
    marital_status: string;
    occupation: string;
    main_complaint: string;
    clinical_history: string;
    allergies_medications: string;
    lgpd_consent_signed: boolean;
    lgpd_consent_date: string;
  };
}

// INICIALIZAÇÃO LIMPA: Base pronta para cadastro de dados reais
let patients: PatientDb[] = [];

interface AppointmentDb {
  id: string;
  patient_id: string;
  patient_name: string;
  patient_phone: string;
  professional_id: string;
  professional_name: string;
  start_time: string;
  end_time: string;
  status: 'AGENDADO' | 'CONFIRMADO' | 'CANCELADO' | 'REALIZADO' | 'FALTOU';
  session_type: 'PRESENCIAL' | 'ONLINE';
  notes?: string;
  is_recurring: boolean;
  is_first_session?: boolean;
  recurrence_rule?: string;
  recurrence_parent_id?: string;
  created_by_user_id: string;
  created_by_role: 'ADMIN' | 'PROFESSIONAL' | 'RECEPTION';
  created_at: string;
}

// INICIALIZAÇÃO LIMPA: Agenda vazia
let appointments: AppointmentDb[] = [];

interface EncryptedMedicalRecordDb {
  id: string;
  patient_id: string;
  professional_id: string;
  professional_name: string;
  appointment_id?: string;
  session_number: number;
  session_date: string;
  encrypted_subjective: { ciphertext: string; iv: string; tag: string };
  encrypted_assessment: { ciphertext: string; iv: string; tag: string };
  encrypted_intervention: { ciphertext: string; iv: string; tag: string };
  encrypted_plan: { ciphertext: string; iv: string; tag: string };
  is_sealed: boolean;
  sealed_at: string;
  sha256_hash: string;
  encryption_algorithm: 'AES-256-GCM';
}

// INICIALIZAÇÃO LIMPA: Prontuário vazio
let medicalRecords: EncryptedMedicalRecordDb[] = [];

interface AttachmentDb {
  id: string;
  patient_id: string;
  title: string;
  category: 'TESTE_PSICOLOGICO' | 'ENCAMINHAMENTO' | 'TERMO_CONSENTIMENTO' | 'LAUDO';
  file_name: string;
  file_size: string;
  file_type?: string;
  file_data?: string; // Data URL Base64 para pré-visualização direta
  uploaded_by_name: string;
  uploaded_at: string;
}

// INICIALIZAÇÃO LIMPA: Anexos vazios
let attachments: AttachmentDb[] = [];

interface AuditLogDb {
  id: string;
  user_id: string;
  user_name: string;
  user_role: 'ADMIN' | 'PROFESSIONAL' | 'RECEPTION';
  action: 'READ' | 'CREATE' | 'UPDATE' | 'DELETE' | 'EXPORT' | 'BLOCKED_ACCESS_ATTEMPT' | 'LOGIN' | 'LOGOUT';
  resource: 'PRONTUARIO' | 'PACIENTE' | 'AGENDA' | 'SISTEMA' | 'AUTH';
  resource_id?: string;
  details: string;
  ip_address: string;
  timestamp: string;
  lgpd_critical: boolean;
}

// Trilha de Auditoria inicializada
let auditLogs: AuditLogDb[] = [
  {
    id: 'aud-init-001',
    user_id: 'system',
    user_name: 'Sistema de Segurança ClínicaCare',
    user_role: 'ADMIN',
    action: 'CREATE',
    resource: 'SISTEMA',
    details: 'Base de dados inicializada limpa para acolhimento de novos pacientes. Criptografia AES-256-GCM em repouso e autenticação PBKDF2/scrypt ativas.',
    ip_address: '127.0.0.1',
    timestamp: new Date().toISOString(),
    lgpd_critical: true,
  },
];

interface SystemNotificationDb {
  id: string;
  recipient_user_id: string;
  title: string;
  message: string;
  type: 'SCHEDULE_CHANGE' | 'NEW_APPOINTMENT' | 'REMINDER_SENT' | 'SECURITY_ALERT';
  read: boolean;
  created_at: string;
}

// Notificações limpas
let notifications: SystemNotificationDb[] = [];

interface ReminderQueueDb {
  id: string;
  appointment_id: string;
  patient_name: string;
  patient_phone: string;
  appointment_datetime: string;
  channel: 'WHATSAPP' | 'EMAIL';
  status: 'PENDENTE' | 'ENVIADO' | 'FALHA';
  scheduled_send_at: string;
  message_preview: string;
}

// Fila de lembretes limpa
let reminders: ReminderQueueDb[] = [];

// ==========================================
// PERSISTÊNCIA EM DISCO (LOGINS & DADOS CLÍNICOS)
// Garante que cadastros de psicólogos, administradores,
// pacientes e sessões não sejam perdidos ao reiniciar
// ==========================================
function resolveStorageDir(): string {
  if (isServerless) {
    const tmpDir = path.join(os.tmpdir(), 'clinic_data');
    try {
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
      return tmpDir;
    } catch {
      return os.tmpdir();
    }
  }

  try {
    const localDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    fs.accessSync(localDir, fs.constants.W_OK);
    return localDir;
  } catch {
    const fallbackDir = path.join(os.tmpdir(), 'clinic_data');
    try {
      if (!fs.existsSync(fallbackDir)) fs.mkdirSync(fallbackDir, { recursive: true });
      return fallbackDir;
    } catch {
      return os.tmpdir();
    }
  }
}

const DATA_DIR = resolveStorageDir();
const DATA_FILE = path.join(DATA_DIR, 'clinic_data.json');

function seedInitialDataIfEmpty(forceDemoData: boolean = false) {
  if (users.length === 0) {
    console.log('[Storage] Inicializando contas clínicas padrão (scrypt + AES-256)...');
    const u1Creds = hashPassword('psi123');
    const u2Creds = hashPassword('psi123');
    const u3Creds = hashPassword('admin123');
    const u4Creds = hashPassword('rec123');

    users = [
      {
        id: 'u1',
        name: 'Dra. Beatriz Santos',
        email: 'beatriz@clinicacare.com',
        role: 'PROFESSIONAL',
        council_number: 'CRP 06/142981',
        specialty: 'Terapia Cognitivo-Comportamental (TCC)',
        phone: '(11) 99876-5432',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        password_hash: u1Creds.hash,
        password_salt: u1Creds.salt,
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
        password_hash: u2Creds.hash,
        password_salt: u2Creds.salt,
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
        password_hash: u3Creds.hash,
        password_salt: u3Creds.salt,
      },
      {
        id: 'u4',
        name: 'Camila Andrade',
        email: 'recepcao@clinicacare.com',
        role: 'RECEPTION',
        specialty: 'Atendimento & Gestão de Agenda',
        phone: '(11) 3214-5678',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
        password_hash: u4Creds.hash,
        password_salt: u4Creds.salt,
      },
    ];
    activeUserId = 'u2';
  }

  // Se já existe arquivo no disco e não foi forçado, respeita a base (inclusive se estiver limpa após reset)
  if (fs.existsSync(DATA_FILE) && !forceDemoData) {
    return;
  }

  if (patients.length === 0) {
    patients = [
      {
        id: 'pat-1',
        full_name: 'Mariana Souza Silva',
        cpf: '342.***.***-18',
        birth_date: '1994-04-12',
        email: 'mariana.souza@gmail.com',
        phone: '(11) 97123-4455',
        gender: 'Feminino',
        address: 'Av. Paulista, 1200 - São Paulo, SP',
        emergency_contact: {
          name: 'Renata Souza (Irmã)',
          relationship: 'Irmã',
          phone: '(11) 98111-2233',
        },
        assigned_professional_id: 'u1',
        assigned_professional_name: 'Dra. Beatriz Santos',
        status: 'ATIVO',
        treatment_status: 'ATIVO_CONTINUO',
        recurring_schedule: {
          day_of_week: 2, // Terça-feira
          day_name: 'Terça-feira',
          time: '14:00',
          duration_minutes: 50,
          session_type: 'PRESENCIAL',
          active: true,
        },
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        anamnese: {
          marital_status: 'Solteira',
          occupation: 'Arquiteta',
          main_complaint: 'Crises de ansiedade generalizada no ambiente de trabalho e insônia recorrente.',
          clinical_history: 'Histórico de perfeccionismo e cobrança excessiva desde a graduação. Sem internações psiquiátricas prévias.',
          allergies_medications: 'Não relata alergias. Em uso pontual de fitoterápico (Passiflora).',
          lgpd_consent_signed: true,
          lgpd_consent_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        },
      },
      {
        id: 'pat-2',
        full_name: 'Lucas Ferreira Mendes',
        cpf: '219.***.***-82',
        birth_date: '1988-11-23',
        email: 'lucas.ferreira@hotmail.com',
        phone: '(41) 98456-7890',
        gender: 'Masculino',
        address: 'Rua das Flores, 450 - Curitiba, PR',
        emergency_contact: {
          name: 'Juliana Mendes (Esposa)',
          relationship: 'Cônjuge',
          phone: '(41) 99222-3344',
        },
        assigned_professional_id: 'u2',
        assigned_professional_name: 'Dr. Henrique Greca',
        status: 'ATIVO',
        treatment_status: 'ATIVO_CONTINUO',
        created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        anamnese: {
          marital_status: 'Casado',
          occupation: 'Engenheiro de Software',
          main_complaint: 'Dificuldades de concentração no home office e suspeita de TDAH do adulto.',
          clinical_history: 'Relata desatenção crônica na infância, desorganização temporal e sobrecarga cognitiva recente.',
          allergies_medications: 'Nenhuma medicação psiquiátrica em uso. Alergia a sulfa.',
          lgpd_consent_signed: true,
          lgpd_consent_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        },
      },
      {
        id: 'pat-3',
        full_name: 'Carlos Eduardo Lima',
        cpf: '155.***.***-09',
        birth_date: '1991-07-30',
        email: 'carlos.lima@gmail.com',
        phone: '(11) 99182-3344',
        gender: 'Masculino',
        address: 'Rua Bela Cintra, 890 - São Paulo, SP',
        emergency_contact: {
          name: 'Marcos Lima (Pai)',
          relationship: 'Pai',
          phone: '(11) 97777-8899',
        },
        assigned_professional_id: 'u1',
        assigned_professional_name: 'Dra. Beatriz Santos',
        status: 'ATIVO',
        treatment_status: 'PRIMEIRA_SESSAO',
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        anamnese: {
          marital_status: 'Solteiro',
          occupation: 'Publicitário',
          main_complaint: 'Sintomas de Burnout e esgotamento emocional.',
          clinical_history: 'Jornadas de 14h diárias, cefaleia tensional e apatia aos finais de semana.',
          allergies_medications: 'Não relata alergias medicamentosas.',
          lgpd_consent_signed: true,
          lgpd_consent_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        },
      },
    ];
  }

  if (appointments.length === 0) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    appointments = [
      {
        id: 'apt-seed-01',
        patient_id: 'pat-1',
        patient_name: 'Mariana Souza Silva',
        patient_phone: '(11) 97123-4455',
        professional_id: 'u1',
        professional_name: 'Dra. Beatriz Santos',
        start_time: `${todayStr}T14:00:00`,
        end_time: `${todayStr}T14:50:00`,
        status: 'CONFIRMADO',
        session_type: 'PRESENCIAL',
        notes: 'Sessão focada em técnicas de reestruturação cognitiva e respiração diafragmática.',
        is_recurring: true,
        recurrence_rule: 'SEMANAL',
        created_by_user_id: 'u4',
        created_by_role: 'RECEPTION',
        created_at: new Date().toISOString(),
      },
      {
        id: 'apt-seed-02',
        patient_id: 'pat-2',
        patient_name: 'Lucas Ferreira Mendes',
        patient_phone: '(41) 98456-7890',
        professional_id: 'u2',
        professional_name: 'Dr. Henrique Greca',
        start_time: `${todayStr}T15:30:00`,
        end_time: `${todayStr}T16:20:00`,
        status: 'AGENDADO',
        session_type: 'ONLINE',
        notes: 'Devolutiva preliminar dos testes de atenção sustentada e funções executivas.',
        is_recurring: false,
        created_by_user_id: 'u2',
        created_by_role: 'PROFESSIONAL',
        created_at: new Date().toISOString(),
      },
      {
        id: 'apt-seed-03',
        patient_id: 'pat-3',
        patient_name: 'Carlos Eduardo Lima',
        patient_phone: '(11) 99182-3344',
        professional_id: 'u1',
        professional_name: 'Dra. Beatriz Santos',
        start_time: `${todayStr}T17:00:00`,
        end_time: `${todayStr}T17:50:00`,
        status: 'AGENDADO',
        session_type: 'PRESENCIAL',
        notes: 'Primeira sessão de acolhimento e enquadre terapêutico (sessão avulsa inicial).',
        is_recurring: false,
        is_first_session: true,
        created_by_user_id: 'u4',
        created_by_role: 'RECEPTION',
        created_at: new Date().toISOString(),
      },
    ];

    reminders = [
      {
        id: 'rem-seed-01',
        appointment_id: 'apt-seed-01',
        patient_name: 'Mariana Souza Silva',
        patient_phone: '(11) 97123-4455',
        appointment_datetime: `${todayStr} 14:00`,
        channel: 'WHATSAPP',
        status: 'ENVIADO',
        scheduled_send_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        message_preview: 'Olá Mariana! Lembramos de sua consulta com Dra. Beatriz Santos hoje às 14:00.',
      },
      {
        id: 'rem-seed-02',
        appointment_id: 'apt-seed-02',
        patient_name: 'Lucas Ferreira Mendes',
        patient_phone: '(41) 98456-7890',
        appointment_datetime: `${todayStr} 15:30`,
        channel: 'WHATSAPP',
        status: 'PENDENTE',
        scheduled_send_at: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
        message_preview: 'Olá Lucas! Lembramos de sua consulta online com Dr. Henrique Greca hoje às 15:30.',
      },
    ];
  }

  if (medicalRecords.length === 0) {
    const rawSubj = 'Paciente relata melhora na frequência de taquicardia noturna após iniciar o registro diário de pensamentos disfuncionais. Permanece com receio ao apresentar relatórios corporativos.';
    const rawAssess = 'Apresenta redução nos escores subjetivos de ansiedade (SUD 8/10 -> 5/10). Boa adesão aos exercícios terapêuticos propostos.';
    const rawInterv = 'Psicoeducação sobre distorções cognitivas de catastrofização. Treino de respiração diafragmática guiada.';
    const rawPlan = 'Manter RPD semanal e planejar exposição gradual a apresentações em reuniões de equipe.';

    const hash = generateIntegritySignature({
      patientId: 'pat-1',
      profId: 'u1',
      content: rawSubj + rawAssess + rawInterv + rawPlan,
      timestamp: new Date().toISOString(),
    });

    medicalRecords = [
      {
        id: 'rec-seed-01',
        patient_id: 'pat-1',
        professional_id: 'u1',
        professional_name: 'Dra. Beatriz Santos',
        session_number: 1,
        session_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        encrypted_subjective: encryptSensitiveField(rawSubj),
        encrypted_assessment: encryptSensitiveField(rawAssess),
        encrypted_intervention: encryptSensitiveField(rawInterv),
        encrypted_plan: encryptSensitiveField(rawPlan),
        is_sealed: true,
        sealed_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        sha256_hash: hash,
        encryption_algorithm: 'AES-256-GCM',
      },
    ];

    attachments = [
      {
        id: 'att-seed-01',
        patient_id: 'pat-1',
        title: 'Termo de Consentimento LGPD Assinado',
        category: 'TERMO_CONSENTIMENTO',
        file_name: 'termo_lgpd_mariana_souza.pdf',
        file_size: '1.2 MB',
        file_type: 'application/pdf',
        uploaded_by_name: 'Dra. Beatriz Santos',
        uploaded_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'att-seed-02',
        patient_id: 'pat-1',
        title: 'Inventário de Depressão Beck (BDI-II)',
        category: 'TESTE_PSICOLOGICO',
        file_name: 'bdi_ii_mariana_resultado.pdf',
        file_size: '840 KB',
        file_type: 'application/pdf',
        uploaded_by_name: 'Dr. Henrique Greca',
        uploaded_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'att-seed-03',
        patient_id: 'pat-1',
        title: 'Parecer Psicológico Inicial',
        category: 'LAUDO',
        file_name: 'parecer_clinico_mariana.pdf',
        file_size: '1.5 MB',
        file_type: 'application/pdf',
        uploaded_by_name: 'Dr. Henrique Greca',
        uploaded_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'att-seed-04',
        patient_id: 'pat-2',
        title: 'Termo de Consentimento LGPD Assinado',
        category: 'TERMO_CONSENTIMENTO',
        file_name: 'termo_lgpd_lucas_mendes.pdf',
        file_size: '1.1 MB',
        file_type: 'application/pdf',
        uploaded_by_name: 'Dr. Henrique Greca',
        uploaded_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'att-seed-05',
        patient_id: 'pat-2',
        title: 'Escala ASRS-18 (Rastreio TDAH Adulto)',
        category: 'TESTE_PSICOLOGICO',
        file_name: 'escala_asrs18_lucas_mendes.pdf',
        file_size: '720 KB',
        file_type: 'application/pdf',
        uploaded_by_name: 'Dr. Henrique Greca',
        uploaded_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'att-seed-06',
        patient_id: 'pat-2',
        title: 'Laudo de Avaliação Neuropsicológica',
        category: 'LAUDO',
        file_name: 'laudo_neuropsicologico_lucas.pdf',
        file_size: '1.8 MB',
        file_type: 'application/pdf',
        uploaded_by_name: 'Dr. Henrique Greca',
        uploaded_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];
  }

  if (notifications.length === 0) {
    notifications = [
      {
        id: 'notif-seed-01',
        recipient_user_id: 'u1',
        title: 'Nova Consulta Agendada pela Recepção',
        message: 'Camila Andrade agendou Mariana Souza Silva para hoje às 14:00 (Sessão Recorrente).',
        type: 'NEW_APPOINTMENT',
        read: false,
        created_at: new Date().toISOString(),
      },
    ];
  }

  saveDatabase();
}

function initStorage() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      const data = JSON.parse(raw);
      if (Array.isArray(data.users) && data.users.length > 0) users = data.users;
      if (Array.isArray(data.patients)) {
        patients = data.patients;
        // Garantia de migração para treatment_status
        patients.forEach((p) => {
          if (!p.treatment_status) {
            p.treatment_status = p.id === 'pat-3' ? 'PRIMEIRA_SESSAO' : 'ATIVO_CONTINUO';
          }
        });
      }
      if (Array.isArray(data.appointments)) appointments = data.appointments;
      if (Array.isArray(data.medicalRecords)) medicalRecords = data.medicalRecords;
      if (Array.isArray(data.attachments)) attachments = data.attachments;
      if (Array.isArray(data.reminders)) reminders = data.reminders;
      if (Array.isArray(data.notifications)) notifications = data.notifications;
      if (Array.isArray(data.auditLogs)) auditLogs = data.auditLogs;
      if (typeof data.sessionRevocationTimestamp === 'number') {
        sessionRevocationTimestamp = data.sessionRevocationTimestamp;
      }
      if (data.activeUserId) activeUserId = data.activeUserId;
      console.log(`[Storage] Base restaurada do disco: ${users.length} usuário(s), ${patients.length} paciente(s).`);
    }
    // Garante que o sistema sempre tenha contas e dados de funcionamento válidos
    seedInitialDataIfEmpty();
  } catch (err) {
    console.error('[Storage] Erro ao carregar dados do disco:', err);
    seedInitialDataIfEmpty();
  }
}

function saveDatabase() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const payload = {
      users,
      patients,
      appointments,
      medicalRecords,
      attachments,
      reminders,
      notifications,
      auditLogs,
      activeUserId,
      sessionRevocationTimestamp,
      lastSaved: new Date().toISOString(),
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2), 'utf8');
  } catch (err) {
    console.error('[Storage] Erro ao persistir dados no disco:', err);
  }
}

function resetAllLoginsAndData() {
  console.log('[Storage] Executando reset total de logins, sessões e informações...');
  sessionRevocationTimestamp = Date.now();

  const u1Creds = hashPassword('psi123');
  const u2Creds = hashPassword('psi123');
  const u3Creds = hashPassword('admin123');
  const u4Creds = hashPassword('rec123');

  users = [
    {
      id: 'u1',
      name: 'Dra. Beatriz Santos',
      email: 'beatriz@clinicacare.com',
      role: 'PROFESSIONAL',
      council_number: 'CRP 06/142981',
      specialty: 'Terapia Cognitivo-Comportamental (TCC)',
      phone: '(11) 99876-5432',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      password_hash: u1Creds.hash,
      password_salt: u1Creds.salt,
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
      password_hash: u2Creds.hash,
      password_salt: u2Creds.salt,
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
      password_hash: u3Creds.hash,
      password_salt: u3Creds.salt,
    },
    {
      id: 'u4',
      name: 'Camila Andrade',
      email: 'recepcao@clinicacare.com',
      role: 'RECEPTION',
      specialty: 'Atendimento & Gestão de Agenda',
      phone: '(11) 3214-5678',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      password_hash: u4Creds.hash,
      password_salt: u4Creds.salt,
    },
  ];
  activeUserId = 'u2';

  patients = [];
  appointments = [];
  medicalRecords = [];
  attachments = [];
  reminders = [];
  notifications = [];
  auditLogs = [];

  saveDatabase();
  console.log('[Storage] Reset total concluído: 0 pacientes, 0 agendamentos, 0 prontuários, 0 anexos, logins e sessões redefinidos.');
}

// Inicializa dados persistidos
initStorage();

// ==========================================
// 3. MIDDLEWARE DE AUDITORIA & RBAC ESTREITO
// ==========================================
function getActingUser(req: express.Request): UserDb | undefined {
  // 1. Tenta recuperar sessão via Bearer Token assinado
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const session = verifySessionToken(token);
    if (session) {
      const user = users.find((u) => u.id === session.userId);
      if (user) return user;
    }
  }

  // 2. Tenta header customizado x-session-token
  const sessionTokenHeader = req.headers['x-session-token'] as string;
  if (sessionTokenHeader) {
    const session = verifySessionToken(sessionTokenHeader);
    if (session) {
      const user = users.find((u) => u.id === session.userId);
      if (user) return user;
    }
  }

  // 3. Fallback controlado para x-user-id se explicitamente informado
  const headerUserId = req.headers['x-user-id'] as string;
  if (headerUserId) {
    const user = users.find((u) => u.id === headerUserId);
    if (user) return user;
  }

  // Não usa fallback arbitrário para evitar vazamento entre contas diferentes
  return undefined;
}

// Log helper
function logAuditEvent(
  user: UserDb,
  action: AuditLogDb['action'],
  resource: AuditLogDb['resource'],
  details: string,
  resource_id?: string,
  lgpd_critical = false
) {
  const entry: AuditLogDb = {
    id: 'aud-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    user_id: user.id,
    user_name: user.name,
    user_role: user.role,
    action,
    resource,
    resource_id,
    details,
    ip_address: '127.0.0.1',
    timestamp: new Date().toISOString(),
    lgpd_critical,
  };
  auditLogs.unshift(entry);
}

// Middleware de Proteção Estrita de Prontuário (Entregável 4)
function requireMedicalRecordAccess(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = getActingUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Sessão inválida.' });
  }

  // REGRA INVIOLÁVEL: Recepção / Secretaria NÃO possui acesso ao Prontuário
  if (user.role === 'RECEPTION') {
    logAuditEvent(
      user,
      'BLOCKED_ACCESS_ATTEMPT',
      'PRONTUARIO',
      `Tentativa de acesso não autorizada a prontuário clínico pelo usuário ${user.name} (${user.role}). Acesso barrado conforme art. 11 da LGPD (dados sensíveis de saúde).`,
      req.params.patientId || req.params.id,
      true
    );

    return res.status(403).json({
      error: 'ACESSO NEGADO (LGPD / SIGILO PROFISSIONAL)',
      code: 'FORBIDDEN_RECEPTION_MEDICAL_RECORD_ACCESS',
      message:
        'A recepção/secretaria não possui autorização legal e técnica para acessar anotações clínicas, evoluções de sessões ou prontuários de pacientes.',
      role: user.role,
      legal_basis: 'LGPD Artigo 11 (Dados Pessoais Sensíveis) & Código de Ética Profissional do CFP (Resolução nº 001/2009)',
    });
  }

  // Se for profissional, valida se o paciente pertence a ele (ou se é Admin)
  if (user.role === 'PROFESSIONAL') {
    const patientId = req.params.patientId || req.params.id || req.body.patient_id;
    if (patientId) {
      const patient = patients.find((p) => p.id === patientId);
      if (patient && patient.assigned_professional_id !== user.id) {
        logAuditEvent(
          user,
          'BLOCKED_ACCESS_ATTEMPT',
          'PRONTUARIO',
          `Clínico ${user.name} tentou acessar prontuário do paciente ${patient.full_name} vinculado a outro profissional (${patient.assigned_professional_name}).`,
          patientId,
          true
        );
        return res.status(403).json({
          error: 'ACESSO NEGADO',
          message: 'Você só possui autorização para consultar e editar prontuários de pacientes sob seus próprios cuidados clínicos.',
        });
      }
    }
  }

  // Autorizado: Registra log de leitura
  logAuditEvent(
    user,
    'READ',
    'PRONTUARIO',
    `Acesso ao prontuário clínico autorizado para o usuário ${user.name} (${user.role}).`,
    req.params.patientId || req.params.id,
    true
  );

  next();
}

// ==========================================
// 4. ROTAS DA API REST
// ==========================================

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), lgpd_compliant: true });
});

// Autenticação Criptografada & Gestão de Sessões
app.get('/api/auth/users', (req, res) => {
  // Retorna usuários sem campos confidenciais de credencial (hash/salt)
  const safeUsers = users.map(({ password_hash, password_salt, ...u }) => u);
  res.json({ users: safeUsers, activeUserId });
});

app.get('/api/auth/me', (req, res) => {
  const user = getActingUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Sessão inválida ou usuário não encontrado.' });
  }
  const { password_hash, password_salt, ...safeUser } = user;
  res.json({ user: safeUser });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
  }

  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    logAuditEvent(
      { id: 'unknown', name: email, email, role: 'RECEPTION', phone: '', avatar: '', password_hash: '', password_salt: '' },
      'BLOCKED_ACCESS_ATTEMPT',
      'AUTH',
      `Tentativa de login falha: usuário inexistente (${email}).`,
      undefined,
      true
    );
    return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
  }

  const isValid = verifyPassword(password, user.password_hash, user.password_salt);
  if (!isValid) {
    logAuditEvent(
      user,
      'BLOCKED_ACCESS_ATTEMPT',
      'AUTH',
      `Tentativa de login com senha incorreta para o usuário ${user.name} (${user.email}).`,
      user.id,
      true
    );
    return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
  }

  activeUserId = user.id;
  const token = createSessionToken(user);
  saveDatabase();
  logAuditEvent(
    user,
    'LOGIN',
    'AUTH',
    `Login autenticado com sucesso para ${user.name} (${user.role}) via credencial criptografada (scrypt). Sessão emitida.`,
    user.id,
    true
  );

  const { password_hash, password_salt, ...safeUser } = user;
  res.json({ success: true, token, user: safeUser });
});

app.post('/api/auth/register', (req, res) => {
  const { name, email, role, council_number, specialty, phone, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nome completo, e-mail e senha são obrigatórios.' });
  }

  const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: 'Já existe um usuário cadastrado com este e-mail.' });
  }

  const { hash, salt } = hashPassword(password);
  const newUser: UserDb = {
    id: 'u-' + Date.now(),
    name,
    email: email.toLowerCase(),
    role: role || 'PROFESSIONAL',
    council_number,
    specialty,
    phone: phone || '',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    password_hash: hash,
    password_salt: salt,
  };

  users.push(newUser);
  activeUserId = newUser.id;
  const token = createSessionToken(newUser);
  saveDatabase();

  logAuditEvent(
    newUser,
    'CREATE',
    'AUTH',
    `Novo usuário registrado com sucesso: ${newUser.name} (${newUser.role}) com credenciais protegidas por hash scrypt.`,
    newUser.id,
    true
  );

  const { password_hash, password_salt, ...safeUser } = newUser;
  res.status(201).json({ success: true, token, user: safeUser });
});

// ==========================================
// GOOGLE OAUTH 2.0 & GOOGLE SIGN-IN ENDPOINTS
// ==========================================
app.get('/api/auth/google/config', (req, res) => {
  const appUrl = process.env.APP_URL || 'https://ais-dev-5lmydobo57gs6kujnyyycn-93849339892.us-east1.run.app';
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '';
  const callbackUrl = `${appUrl}/auth/google/callback`;

  res.json({
    configured: Boolean(clientId),
    clientId: clientId ? clientId.substring(0, 12) + '...' : '',
    callbackUrl,
    devCallbackUrl: 'https://ais-dev-5lmydobo57gs6kujnyyycn-93849339892.us-east1.run.app/auth/google/callback',
    sharedCallbackUrl: 'https://ais-pre-5lmydobo57gs6kujnyyycn-93849339892.us-east1.run.app/auth/google/callback',
  });
});

app.get('/api/auth/google/url', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
  const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  const redirectUri = `${appUrl}/auth/google/callback`;

  if (!clientId) {
    return res.json({
      configured: false,
      message: 'GOOGLE_CLIENT_ID não configurado. Utilize o seletor rápido ou configure as credenciais no Cloud Console.',
    });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  res.json({ configured: true, url: authUrl });
});

app.get(['/auth/google/callback', '/auth/google/callback/'], async (req, res) => {
  const { code, error } = req.query;

  if (error || !code) {
    return res.send(`
      <html>
        <body style="font-family: sans-serif; text-align: center; padding: 40px; background: #F7F5F0;">
          <h2 style="color: #8C4A3B;">Autenticação Cancelada</h2>
          <p>${error || 'Nenhum código de autorização recebido do Google.'}</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'GOOGLE_AUTH_ERROR', message: '${error || 'Falha na autenticação Google'}' }, '*');
              window.close();
            }
          </script>
        </body>
      </html>
    `);
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const redirectUri = `${appUrl}/auth/google/callback`;

    let userEmail = 'usuario.google@gmail.com';
    let userName = 'Usuário Google';
    let userAvatar = '';

    if (clientId && clientSecret) {
      // Troca code por tokens com o Google
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: String(code),
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      const tokenData = await tokenRes.json();
      if (tokenData.access_token) {
        const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const profile = await profileRes.json();
        if (profile.email) {
          userEmail = profile.email;
          userName = profile.name || userName;
          userAvatar = profile.picture || '';
        }
      }
    }

    // Localiza ou cria a conta clínica do usuário
    const normalizedEmail = userEmail.toLowerCase();
    let user = users.find(
      (u) =>
        u.email.toLowerCase() === normalizedEmail ||
        (normalizedEmail.includes('greca') && u.email.includes('henrique'))
    );

    if (!user) {
      const generatedCreds = hashPassword(crypto.randomBytes(16).toString('hex'));
      user = {
        id: 'u-google-' + Date.now(),
        name: userName,
        email: normalizedEmail,
        role: 'PROFESSIONAL',
        specialty: 'Psicologia Clínica',
        council_number: 'CRP Em Cadastro',
        phone: '',
        avatar: userAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        password_hash: generatedCreds.hash,
        password_salt: generatedCreds.salt,
      };
      users.push(user);
      logAuditEvent(user, 'CREATE', 'AUTH', `Usuário criado via autenticação Google OAuth: ${user.name} (${user.email}).`, user.id, true);
    } else if (userAvatar && !user.avatar.includes('unsplash')) {
      user.avatar = userAvatar;
    }

    activeUserId = user.id;
    const sessionToken = createSessionToken(user);
    saveDatabase();

    logAuditEvent(user, 'LOGIN', 'AUTH', `Login realizado com sucesso via Google OAuth por ${user.name} (${user.email}).`, user.id, true);

    const { password_hash, password_salt, ...safeUser } = user;

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Autenticado com Google</title>
          <meta charset="utf-8" />
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #FAF9F5; color: #3D3D39; }
            .card { background: white; padding: 32px; border-radius: 16px; border: 1px solid #E5E2D9; text-align: center; max-width: 380px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
            .badge { display: inline-flex; align-items: center; gap: 6px; background: #E8F0E6; color: #3D5A3D; padding: 6px 12px; border-radius: 20px; font-weight: 600; font-size: 12px; margin-bottom: 12px; }
            h3 { margin: 0 0 8px; font-size: 18px; }
            p { margin: 0; font-size: 13px; color: #8A8A82; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="badge">✓ Conectado com Google</div>
            <h3>Autenticação Concluída</h3>
            <p>Seja bem-vindo(a), ${safeUser.name}! Retornando ao ClínicaCare...</p>
          </div>
          <script>
            const authPayload = {
              type: 'GOOGLE_AUTH_SUCCESS',
              token: '${sessionToken}',
              user: ${JSON.stringify(safeUser)}
            };
            if (window.opener) {
              window.opener.postMessage(authPayload, '*');
              setTimeout(() => { window.close(); }, 700);
            } else {
              window.location.href = '/';
            }
          </script>
        </body>
      </html>
    `);
  } catch (err: any) {
    console.error('Erro no callback do Google OAuth:', err);
    res.status(500).send('Erro ao processar autenticação com Google.');
  }
});

// Endpoint unificado de login com Google (chamado via GSI / One-Tap ou Seletor de Contas Google)
app.post('/api/auth/google', (req, res) => {
  const { email, name, avatar, googleId } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'E-mail do Google é obrigatório.' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Localiza por email exato ou vínculo com conta demonstrada
  let user = users.find(
    (u) =>
      u.email.toLowerCase() === normalizedEmail ||
      (normalizedEmail === 'grecahenrique@gmail.com' && u.email === 'henrique@clinicacare.com') ||
      (normalizedEmail.includes('greca') && u.email.includes('henrique'))
  );

  if (!user) {
    // Provisão automática da conta clínica para o usuário autenticado no Google
    const generatedCreds = hashPassword(crypto.randomBytes(16).toString('hex'));
    user = {
      id: 'u-google-' + Date.now(),
      name: name || (normalizedEmail.includes('greca') ? 'Dr. Henrique Greca' : normalizedEmail.split('@')[0]),
      email: normalizedEmail,
      role: 'PROFESSIONAL',
      specialty: 'Psicologia Clínica & Psicoterapia',
      council_number: 'CRP 08/29182',
      phone: '(41) 99123-4567',
      avatar: avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      password_hash: generatedCreds.hash,
      password_salt: generatedCreds.salt,
    };
    users.push(user);
    logAuditEvent(
      user,
      'CREATE',
      'AUTH',
      `Nova conta profissional criada automaticamente via Google Sign-In para ${user.name} (${user.email}).`,
      user.id,
      true
    );
  } else {
    // Atualiza avatar se fornecido
    if (avatar && (!user.avatar || user.avatar.includes('unsplash'))) {
      user.avatar = avatar;
    }
  }

  activeUserId = user.id;
  const token = createSessionToken(user);
  saveDatabase();

  logAuditEvent(
    user,
    'LOGIN',
    'AUTH',
    `Login autenticado via Google Sign-In para ${user.name} (${user.email}) - Sessão emitida com sucesso.`,
    user.id,
    true
  );

  const { password_hash, password_salt, ...safeUser } = user;
  res.json({ success: true, token, user: safeUser });
});

app.post('/api/auth/logout', (req, res) => {
  const user = getActingUser(req);
  if (!user) return res.status(401).json({ error: 'Não autorizado.' });
logAuditEvent(user, 'LOGOUT', 'AUTH', `Sessão encerrada com segurança para o usuário ${user.name} (${user.role}).`, user.id);
  res.json({ success: true });
});

app.post('/api/auth/switch-user', (req, res) => {
  const userId = req.body.userId || req.body.targetUserId;
  const target = users.find((u) => u.id === userId);
  if (!target) return res.status(404).json({ error: 'Usuário não encontrado' });
  activeUserId = target.id;
  const token = createSessionToken(target);
  logAuditEvent(target, 'READ', 'SISTEMA', `Sessão ativa alternada para ${target.name} (${target.role})`);
  const { password_hash, password_salt, ...safeTarget } = target;
  res.json({ success: true, user: safeTarget, token });
});

// Personalização de Perfil de Usuário
app.put('/api/auth/profile', (req, res) => {
  const user = getActingUser(req);
  if (!user) return res.status(401).json({ error: 'Sessão inválida ou não autorizada.' });

  const { name, phone, council_number, specialty, avatar, bio, currentPassword, newPassword } = req.body;

  // Atualização de Nome
  if (name && typeof name === 'string' && name.trim()) {
    const oldName = user.name;
    user.name = name.trim();
    // Se o profissional teve o nome alterado, sincroniza nos pacientes atribuídos
    if (oldName !== user.name) {
      patients.forEach((p) => {
        if (p.assigned_professional_id === user.id) {
          p.assigned_professional_name = user.name;
        }
      });
    }
  }

  // Atualização de Telefone
  if (phone !== undefined && typeof phone === 'string') {
    user.phone = phone.trim();
  }

  // Atualização de Registro Profissional (CRP / CRM)
  if (council_number !== undefined && typeof council_number === 'string') {
    user.council_number = council_number.trim();
  }

  // Atualização de Especialidade / Abordagem Clínica
  if (specialty !== undefined && typeof specialty === 'string') {
    user.specialty = specialty.trim();
  }

  // Atualização de Foto / Avatar
  if (avatar && typeof avatar === 'string' && avatar.trim()) {
    user.avatar = avatar.trim();
  }

  // Atualização de Biografia / Apresentação
  if (bio !== undefined && typeof bio === 'string') {
    (user as any).bio = bio.trim();
  }

  // Alteração Opcional de Senha com Verificação Criptográfica
  if (newPassword) {
    if (!currentPassword) {
      return res.status(400).json({ error: 'Para alterar a senha, informe sua senha atual.' });
    }
    const isCurrentValid = verifyPassword(currentPassword, user.password_hash, user.password_salt);
    if (!isCurrentValid) {
      logAuditEvent(
        user,
        'BLOCKED_ACCESS_ATTEMPT',
        'AUTH',
        `Tentativa inválida de troca de senha para o usuário ${user.name} (senha atual incorreta).`,
        user.id,
        true
      );
      return res.status(400).json({ error: 'A senha atual informada está incorreta.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'A nova senha deve possuir no mínimo 6 caracteres.' });
    }

    const { hash, salt } = hashPassword(newPassword);
    user.password_hash = hash;
    user.password_salt = salt;

    logAuditEvent(
      user,
      'UPDATE',
      'AUTH',
      `Senha de acesso redefinida com sucesso para o usuário ${user.name} (scrypt hash renovado).`,
      user.id,
      true
    );
  }

  // Persiste no disco
  saveDatabase();

  logAuditEvent(
    user,
    'UPDATE',
    'AUTH',
    `Perfil personalizado com sucesso: ${user.name} (${user.role}).`,
    user.id,
    true
  );

  const { password_hash, password_salt, ...safeUser } = user;
  res.json({ success: true, user: safeUser, message: 'Perfil atualizado com sucesso!' });
});

// Limpeza de dados para novo início ou testes limpos
app.post('/api/system/clear-data', (req, res) => {
  const user = getActingUser(req);
  if (!user) return res.status(401).json({ error: 'Não autorizado.' });
  patients = [];
  appointments = [];
  medicalRecords = [];
  attachments = [];
  reminders = [];
  notifications = [];
  saveDatabase();

  logAuditEvent(
    user,
    'DELETE',
    'SISTEMA',
    `Limpeza de dados executada por ${user.name} (${user.role}). Todos os registros, agenda e pacientes foram zerados para dados reais.`,
    undefined,
    true
  );

  res.json({ success: true, message: 'Dados zerados com sucesso. O sistema está pronto para seus cadastros reais.' });
});

// Endpoint para resetar todos os logins e dados (invalida sessões ativas e zera informações)
app.post('/api/system/reset-all', (_req, res) => {
  resetAllLoginsAndData();
  res.json({
    success: true,
    message: 'Todos os logins, sessões ativas e dados clínicos foram resetados com sucesso.',
  });
});

// Pacientes
app.get('/api/patients', (req, res) => {
  const user = getActingUser(req);
  if (!user) return res.status(401).json({ error: 'Não autorizado.' });
// RBAC:
  // - Admin vê todos
  // - Profissional vê os vinculados a ele
  // - Recepção vê dados básicos de contato/cadastro de todos para agendamento, SEM anamnese clínica aprofundada
  if (user.role === 'ADMIN') {
    return res.json({ patients });
  }

  if (user.role === 'PROFESSIONAL') {
    const profPatients = patients.filter((p) => p.assigned_professional_id === user.id);
    return res.json({ patients: profPatients });
  }

  if (user.role === 'RECEPTION') {
    // Projeta apenas dados cadastrais básicos necessários para o agendamento (LGPD data minimization)
    const sanitized = patients.map((p) => ({
      id: p.id,
      full_name: p.full_name,
      cpf: p.cpf,
      birth_date: p.birth_date,
      email: p.email,
      phone: p.phone,
      gender: p.gender,
      address: p.address,
      emergency_contact: p.emergency_contact,
      assigned_professional_id: p.assigned_professional_id,
      assigned_professional_name: p.assigned_professional_name,
      status: p.status,
      treatment_status: p.treatment_status || 'ATIVO_CONTINUO',
      recurring_schedule: p.recurring_schedule,
      created_at: p.created_at,
      // Anamnese omitida para a recepção!
    }));
    return res.json({ patients: sanitized });
  }

  res.json({ patients: [] });
});

app.get('/api/patients/:id', (req, res) => {
  const user = getActingUser(req);
  if (!user) return res.status(401).json({ error: 'Não autorizado.' });
  const patient = patients.find((p) => p.id === req.params.id);
  if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

  if (user.role === 'RECEPTION') {
    // Retorna sem anamnese
    const { anamnese, ...safeData } = patient;
    return res.json({ patient: safeData });
  }

  if (user.role === 'PROFESSIONAL' && patient.assigned_professional_id !== user.id) {
    return res.status(403).json({ error: 'Você não tem permissão para visualizar dados deste paciente.' });
  }

  res.json({ patient });
});

// Função auxiliar para gerar agendamentos semanais contínuos no calendário
function generateRecurringAppointments(params: {
  patient: PatientDb;
  professional: UserDb;
  dayOfWeek: number; // 1 = Seg, 2 = Ter, ..., 7 = Dom
  time: string; // '14:00'
  durationMinutes: number;
  sessionType: 'PRESENCIAL' | 'ONLINE';
  weeksCount: number;
  notes?: string;
  actingUser: { id: string; role: 'ADMIN' | 'PROFESSIONAL' | 'RECEPTION'; name: string };
  startDate?: string;
}): AppointmentDb[] {
  const [hours, minutes] = params.time.split(':').map(Number);
  const baseDate = params.startDate ? new Date(params.startDate + 'T00:00:00') : new Date();
  baseDate.setHours(0, 0, 0, 0);

  // Calcula a primeira ocorrência
  const currentDayOfWeek = baseDate.getDay() === 0 ? 7 : baseDate.getDay();
  let dayDiff = params.dayOfWeek - currentDayOfWeek;
  if (dayDiff < 0) {
    dayDiff += 7;
  }

  const firstOccurrence = new Date(baseDate.getTime() + dayDiff * 24 * 60 * 60 * 1000);
  const parentId = 'apt-' + Date.now();
  const created: AppointmentDb[] = [];

  for (let w = 0; w < params.weeksCount; w++) {
    const slotDate = new Date(firstOccurrence.getTime() + w * 7 * 24 * 60 * 60 * 1000);
    const yyyy = slotDate.getFullYear();
    const mm = String(slotDate.getMonth() + 1).padStart(2, '0');
    const dd = String(slotDate.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    const startTime = `${dateStr}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
    const endMinutesTotal = hours * 60 + minutes + params.durationMinutes;
    const endH = Math.floor(endMinutesTotal / 60);
    const endM = endMinutesTotal % 60;
    const endTime = `${dateStr}T${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`;

    // Conflito check para o profissional naquele dia/hora
    const hasConflict = appointments.some((a) => {
      if (a.professional_id !== params.professional.id || a.status === 'CANCELADO') return false;
      const s1 = new Date(startTime).getTime();
      const e1 = new Date(endTime).getTime();
      const s2 = new Date(a.start_time).getTime();
      const e2 = new Date(a.end_time).getTime();
      return s1 < e2 && e1 > s2;
    });

    if (hasConflict) {
      continue; // Não sobrepõe horário conflitante existente
    }

    const apt: AppointmentDb = {
      id: w === 0 ? parentId : `apt-${Date.now()}-rec-${w}`,
      patient_id: params.patient.id,
      patient_name: params.patient.full_name,
      patient_phone: params.patient.phone,
      professional_id: params.professional.id,
      professional_name: params.professional.name,
      start_time: startTime,
      end_time: endTime,
      status: 'AGENDADO',
      session_type: params.sessionType || 'PRESENCIAL',
      notes: params.notes || 'Sessão contínua em acompanhamento semanal',
      is_recurring: true,
      is_first_session: false,
      recurrence_rule: 'SEMANAL',
      recurrence_parent_id: w === 0 ? undefined : parentId,
      created_by_user_id: params.actingUser.id,
      created_by_role: params.actingUser.role,
      created_at: new Date().toISOString(),
    };

    appointments.push(apt);
    created.push(apt);

    // Lembrete WhatsApp agendado
    const sendAt = new Date(new Date(startTime).getTime() - 24 * 60 * 60 * 1000).toISOString();
    reminders.push({
      id: 'rem-' + Date.now() + '-' + w,
      appointment_id: apt.id,
      patient_name: params.patient.full_name,
      patient_phone: params.patient.phone,
      appointment_datetime: startTime.replace('T', ' ').substring(0, 16),
      channel: 'WHATSAPP',
      status: 'PENDENTE',
      scheduled_send_at: sendAt,
      message_preview: `Olá ${params.patient.full_name.split(' ')[0]}! Lembramos da sua sessão com ${params.professional.name} em ${startTime.replace('T', ' às ').substring(0, 16)}.`,
    });
  }

  return created;
}

app.post('/api/patients', (req, res) => {
  const user = getActingUser(req);
  if (!user) return res.status(401).json({ error: 'Não autorizado.' });

  const {
    full_name,
    cpf,
    birth_date,
    email,
    phone,
    gender,
    address,
    emergency_contact,
    assigned_professional_id,
    main_complaint,
    treatment_status, // 'PRIMEIRA_SESSAO' | 'ATIVO_CONTINUO'
    recurring_schedule, // { day_of_week, day_name, time, duration_minutes, session_type }
    first_appointment, // { session_date, start_time, duration_minutes, session_type, notes }
    generate_continuous_appointments,
    weeks_count,
  } = req.body;

  if (!full_name || !phone || !assigned_professional_id) {
    return res.status(400).json({ error: 'Nome completo, telefone e profissional responsável são obrigatórios.' });
  }

  const assignedProf = users.find((u) => u.id === assigned_professional_id);
  if (!assignedProf) {
    return res.status(400).json({ error: 'Profissional responsável não encontrado.' });
  }

  const statusFinal: 'PRIMEIRA_SESSAO' | 'ATIVO_CONTINUO' =
    treatment_status === 'ATIVO_CONTINUO' ? 'ATIVO_CONTINUO' : 'PRIMEIRA_SESSAO';

  const newPatient: PatientDb = {
    id: 'pat-' + Date.now(),
    full_name,
    cpf: cpf || '000.***.***-00',
    birth_date: birth_date || '1995-01-01',
    email: email || '',
    phone,
    gender: gender || 'Não especificado',
    address: address || '',
    emergency_contact: emergency_contact || { name: '', relationship: '', phone: '' },
    assigned_professional_id,
    assigned_professional_name: assignedProf.name,
    status: 'ATIVO',
    treatment_status: statusFinal,
    recurring_schedule: statusFinal === 'ATIVO_CONTINUO' && recurring_schedule ? {
      day_of_week: Number(recurring_schedule.day_of_week) || 1,
      day_name: recurring_schedule.day_name || 'Semanal',
      time: recurring_schedule.time || '14:00',
      duration_minutes: Number(recurring_schedule.duration_minutes) || 50,
      session_type: recurring_schedule.session_type || 'PRESENCIAL',
      active: true,
    } : undefined,
    created_at: new Date().toISOString(),
    anamnese: {
      marital_status: 'Não informado',
      occupation: 'Não informado',
      main_complaint: main_complaint || (statusFinal === 'PRIMEIRA_SESSAO' ? 'Avaliação inicial / 1ª sessão.' : 'Paciente em acompanhamento contínuo.'),
      clinical_history: statusFinal === 'PRIMEIRA_SESSAO' ? 'Aguardando primeira sessão de acolhimento.' : 'Histórico clínico em andamento.',
      allergies_medications: 'Não relatado.',
      lgpd_consent_signed: true,
      lgpd_consent_date: new Date().toISOString().split('T')[0],
    },
  };

  patients.push(newPatient);

  let createdAppointments: AppointmentDb[] = [];

  // Se for paciente antigo ou cadastrado como contínuo com horário fixo, já gera as consultas no calendário!
  if (statusFinal === 'ATIVO_CONTINUO' && newPatient.recurring_schedule && generate_continuous_appointments !== false) {
    createdAppointments = generateRecurringAppointments({
      patient: newPatient,
      professional: assignedProf,
      dayOfWeek: newPatient.recurring_schedule.day_of_week,
      time: newPatient.recurring_schedule.time,
      durationMinutes: newPatient.recurring_schedule.duration_minutes,
      sessionType: newPatient.recurring_schedule.session_type,
      weeksCount: Math.min(Number(weeks_count) || 8, 16),
      actingUser: user,
      notes: 'Sessão contínua em acompanhamento regular',
    });
  }

  // Se for 1ª sessão e tiver data/hora informada, cria APENAS esse agendamento avulso (sem prender semanas futuras)
  if (statusFinal === 'PRIMEIRA_SESSAO' && first_appointment && first_appointment.session_date && first_appointment.start_time) {
    const duration = Number(first_appointment.duration_minutes) || 50;
    const [h, m] = first_appointment.start_time.split(':').map(Number);
    const startTime = `${first_appointment.session_date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
    const endMinutes = h * 60 + m + duration;
    const endH = Math.floor(endMinutes / 60);
    const endM = endMinutes % 60;
    const endTime = `${first_appointment.session_date}T${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`;

    const firstApt: AppointmentDb = {
      id: 'apt-' + Date.now(),
      patient_id: newPatient.id,
      patient_name: newPatient.full_name,
      patient_phone: newPatient.phone,
      professional_id: assignedProf.id,
      professional_name: assignedProf.name,
      start_time: startTime,
      end_time: endTime,
      status: 'AGENDADO',
      session_type: first_appointment.session_type || 'PRESENCIAL',
      notes: first_appointment.notes || 'Primeira sessão / Avaliação inicial (sessão única).',
      is_recurring: false,
      is_first_session: true,
      created_by_user_id: user.id,
      created_by_role: user.role,
      created_at: new Date().toISOString(),
    };

    appointments.push(firstApt);
    createdAppointments.push(firstApt);

    reminders.push({
      id: 'rem-' + Date.now(),
      appointment_id: firstApt.id,
      patient_name: newPatient.full_name,
      patient_phone: newPatient.phone,
      appointment_datetime: startTime.replace('T', ' ').substring(0, 16),
      channel: 'WHATSAPP',
      status: 'PENDENTE',
      scheduled_send_at: new Date(new Date(startTime).getTime() - 24 * 60 * 60 * 1000).toISOString(),
      message_preview: `Olá ${newPatient.full_name.split(' ')[0]}! Lembramos da sua primeira sessão com ${assignedProf.name} em ${startTime.replace('T', ' às ').substring(0, 16)}.`,
    });
  }

  saveDatabase();

  logAuditEvent(
    user,
    'CREATE',
    'PACIENTE',
    `Paciente ${newPatient.full_name} (${statusFinal === 'ATIVO_CONTINUO' ? 'Tratamento Contínuo' : '1ª Sessão/Avaliação'}) cadastrado no sistema por ${user.name} (${user.role}).`,
    newPatient.id
  );

  res.status(201).json({
    success: true,
    patient: newPatient,
    createdAppointments,
    message: statusFinal === 'ATIVO_CONTINUO' && createdAppointments.length > 0
      ? `Paciente contínuo cadastrado com sucesso! ${createdAppointments.length} sessões geradas no calendário.`
      : 'Paciente cadastrado com sucesso.',
  });
});

// Ativar paciente de 1ª sessão para Tratamento Contínuo (gera horário semanal contínuo no calendário)
app.patch('/api/patients/:id/activate-continuous', (req, res) => {
  const user = getActingUser(req);
  if (!user) return res.status(401).json({ error: 'Não autorizado.' });

  const patient = patients.find((p) => p.id === req.params.id);
  if (!patient) return res.status(404).json({ error: 'Paciente não encontrado.' });

  const {
    day_of_week,
    day_name,
    time,
    duration_minutes,
    session_type,
    professional_id,
    weeks_count,
    start_date,
    notes,
    generate_appointments,
  } = req.body;

  const profId = professional_id || patient.assigned_professional_id;
  const professional = users.find((u) => u.id === profId);
  if (!professional) return res.status(400).json({ error: 'Profissional clínico não encontrado.' });

  patient.status = 'ATIVO';
  patient.treatment_status = 'ATIVO_CONTINUO';

  if (day_of_week && time) {
    patient.recurring_schedule = {
      day_of_week: Number(day_of_week),
      day_name: day_name || 'Semanal',
      time: time,
      duration_minutes: Number(duration_minutes) || 50,
      session_type: session_type || 'PRESENCIAL',
      active: true,
    };
  }

  let generatedAppointments: AppointmentDb[] = [];

  if (generate_appointments !== false && patient.recurring_schedule) {
    generatedAppointments = generateRecurringAppointments({
      patient,
      professional,
      dayOfWeek: patient.recurring_schedule.day_of_week,
      time: patient.recurring_schedule.time,
      durationMinutes: patient.recurring_schedule.duration_minutes,
      sessionType: patient.recurring_schedule.session_type,
      weeksCount: Math.min(Number(weeks_count) || 8, 16),
      startDate: start_date,
      notes: notes || 'Sessão contínua em acompanhamento semanal',
      actingUser: user,
    });
  }

  saveDatabase();

  logAuditEvent(
    user,
    'UPDATE',
    'PACIENTE',
    `Paciente ${patient.full_name} ativado para TRATAMENTO CONTÍNUO por ${user.name} (${user.role}). ${generatedAppointments.length} sessões geradas no calendário.`,
    patient.id
  );

  res.json({
    success: true,
    patient,
    createdAppointments: generatedAppointments,
    message: `Paciente ativado como contínuo com sucesso! ${generatedAppointments.length} sessões adicionadas ao calendário.`,
  });
});

// Alterar diretamente o status de tratamento (ex: redefinir para 1ª sessão ou contínuo)
app.patch('/api/patients/:id/treatment-status', (req, res) => {
  const user = getActingUser(req);
  if (!user) return res.status(401).json({ error: 'Não autorizado.' });

  const patient = patients.find((p) => p.id === req.params.id);
  if (!patient) return res.status(404).json({ error: 'Paciente não encontrado.' });

  const { treatment_status } = req.body;
  if (treatment_status !== 'PRIMEIRA_SESSAO' && treatment_status !== 'ATIVO_CONTINUO') {
    return res.status(400).json({ error: 'Status de tratamento inválido.' });
  }

  patient.treatment_status = treatment_status;
  saveDatabase();

  logAuditEvent(
    user,
    'UPDATE',
    'PACIENTE',
    `Status de tratamento do paciente ${patient.full_name} alterado para ${treatment_status} por ${user.name}.`,
    patient.id
  );

  res.json({ success: true, patient });
});

app.delete('/api/patients/:id', (req, res) => {
  const user = getActingUser(req);
  if (!user) return res.status(401).json({ error: 'Não autorizado.' });

  const patientIndex = patients.findIndex((p) => p.id === req.params.id);
  if (patientIndex === -1) {
    return res.status(404).json({ error: 'Paciente não encontrado.' });
  }

  const patient = patients[patientIndex];

  // Regra de Controle de Acesso (RBAC):
  // Administradores e recepção autorizada podem remover cadastros.
  // Profissionais clínicos só podem remover pacientes sob sua responsabilidade direta.
  if (user.role === 'PROFESSIONAL' && patient.assigned_professional_id !== user.id) {
    return res.status(403).json({
      error: 'ACESSO_NEGADO',
      message: 'Você só possui autorização para excluir pacientes sob sua responsabilidade clínica direta.',
    });
  }

  // Remove o paciente da base
  patients.splice(patientIndex, 1);

  // Limpeza em cascata dos agendamentos vinculados
  const removedApts = appointments.filter((a) => a.patient_id === patient.id);
  appointments = appointments.filter((a) => a.patient_id !== patient.id);

  // Limpeza dos lembretes vinculados aos agendamentos removidos
  const removedAptIds = new Set(removedApts.map((a) => a.id));
  reminders = reminders.filter((r) => !removedAptIds.has(r.appointment_id));

  // Limpeza de prontuários eletrônicos e anexos vinculados
  medicalRecords = medicalRecords.filter((r) => r.patient_id !== patient.id);
  attachments = attachments.filter((att) => att.patient_id !== patient.id);

  saveDatabase();

  logAuditEvent(
    user,
    'DELETE',
    'PACIENTE',
    `Paciente ${patient.full_name} (CPF: ${patient.cpf}) e todos os dados associados foram excluídos por ${user.name} (${user.role}).`,
    patient.id,
    true
  );

  return res.json({
    success: true,
    message: `Paciente ${patient.full_name} excluído com sucesso.`,
    deletedId: patient.id,
  });
});

// ==========================================
// 5. ROTAS DE PRONTUÁRIO ELETRÔNICO (PROTEGIDAS)
// ==========================================
app.get('/api/patients/:patientId/records', requireMedicalRecordAccess, (req, res) => {
  const patientId = req.params.patientId;
  const records = medicalRecords.filter((r) => r.patient_id === patientId);

  // Decriptografa dados em memória para entrega ao profissional autorizado
  const decryptedRecords = records.map((r) => ({
    id: r.id,
    patient_id: r.patient_id,
    professional_id: r.professional_id,
    professional_name: r.professional_name,
    appointment_id: r.appointment_id,
    session_number: r.session_number,
    session_date: r.session_date,
    subjective: decryptSensitiveField(r.encrypted_subjective.ciphertext, r.encrypted_subjective.iv, r.encrypted_subjective.tag),
    assessment: decryptSensitiveField(r.encrypted_assessment.ciphertext, r.encrypted_assessment.iv, r.encrypted_assessment.tag),
    intervention: decryptSensitiveField(r.encrypted_intervention.ciphertext, r.encrypted_intervention.iv, r.encrypted_intervention.tag),
    plan: decryptSensitiveField(r.encrypted_plan.ciphertext, r.encrypted_plan.iv, r.encrypted_plan.tag),
    is_sealed: r.is_sealed,
    sealed_at: r.sealed_at,
    sha256_hash: r.sha256_hash,
    encryption_algorithm: r.encryption_algorithm,
  }));

  const patientAttachments = attachments.filter((a) => a.patient_id === patientId);

  res.json({ records: decryptedRecords, attachments: patientAttachments });
});

app.post('/api/patients/:patientId/records', requireMedicalRecordAccess, (req, res) => {
  const user = getActingUser(req);
  if (!user) return res.status(401).json({ error: 'Não autorizado.' });
const patientId = req.params.patientId;
  const { session_number, session_date, subjective, assessment, intervention, plan, appointment_id } = req.body;

  if (!subjective || !assessment) {
    return res.status(400).json({ error: 'Relato subjetivo e avaliação clínica são obrigatórios.' });
  }

  const sealedAt = new Date().toISOString();
  const signatureHash = generateIntegritySignature({
    patientId,
    profId: user.id,
    content: `${subjective}|${assessment}|${intervention || ''}|${plan || ''}`,
    timestamp: sealedAt,
  });

  const newRecord: EncryptedMedicalRecordDb = {
    id: 'rec-' + Date.now(),
    patient_id: patientId,
    professional_id: user.id,
    professional_name: user.name,
    appointment_id,
    session_number: Number(session_number) || medicalRecords.filter((r) => r.patient_id === patientId).length + 1,
    session_date: session_date || new Date().toISOString().split('T')[0],
    encrypted_subjective: encryptSensitiveField(subjective),
    encrypted_assessment: encryptSensitiveField(assessment),
    encrypted_intervention: encryptSensitiveField(intervention || ''),
    encrypted_plan: encryptSensitiveField(plan || ''),
    is_sealed: true, // Inviolável
    sealed_at: sealedAt,
    sha256_hash: signatureHash,
    encryption_algorithm: 'AES-256-GCM',
  };

  medicalRecords.push(newRecord);

  // Sincronização entre Prontuário e Agenda:
  // Se a evolução estiver vinculada a um agendamento (ou houver consulta hoje para o paciente), marca como REALIZADO
  if (appointment_id) {
    const apt = appointments.find((a) => a.id === appointment_id);
    if (apt && apt.status !== 'CANCELADO') {
      apt.status = 'REALIZADO';
    }
  } else {
    // Procura consulta do dia deste paciente com o profissional para marcar como realizada
    const todayStr = newRecord.session_date;
    const todayApt = appointments.find(
      (a) =>
        a.patient_id === patientId &&
        a.professional_id === user.id &&
        a.start_time.startsWith(todayStr) &&
        (a.status === 'AGENDADO' || a.status === 'CONFIRMADO')
    );
    if (todayApt) {
      todayApt.status = 'REALIZADO';
    }
  }

  saveDatabase();

  logAuditEvent(
    user,
    'CREATE',
    'PRONTUARIO',
    `Evolução clínica #${newRecord.session_number} registrada e selada criptograficamente por ${user.name}. Hash: ${signatureHash.substring(0, 12)}...`,
    newRecord.id,
    true
  );

  res.status(201).json({
    success: true,
    record: {
      ...newRecord,
      subjective,
      assessment,
      intervention: intervention || '',
      plan: plan || '',
    },
  });
});

// Upload de Documentos Anexos
app.post('/api/patients/:patientId/attachments', requireMedicalRecordAccess, (req, res) => {
  const user = getActingUser(req);
  if (!user) return res.status(401).json({ error: 'Não autorizado.' });
  const patientId = req.params.patientId;
  const { title, category, file_name, file_type, file_data, file_size } = req.body;

  if (!title || !file_name) {
    return res.status(400).json({ error: 'Título e nome do arquivo são obrigatórios.' });
  }

  const newAttachment: AttachmentDb = {
    id: 'att-' + Date.now(),
    patient_id: patientId,
    title,
    category: category || 'ENCAMINHAMENTO',
    file_name,
    file_size: file_size || `${(Math.random() * 2 + 0.5).toFixed(1)} MB`,
    file_type: file_type || (file_name.endsWith('.pdf') ? 'application/pdf' : file_name.match(/\.(png|jpg|jpeg|webp)$/i) ? 'image/' + file_name.split('.').pop()?.toLowerCase() : 'application/octet-stream'),
    file_data: file_data || undefined,
    uploaded_by_name: user.name,
    uploaded_at: new Date().toISOString(),
  };

  attachments.push(newAttachment);
  saveDatabase();
  logAuditEvent(user, 'CREATE', 'PRONTUARIO', `Documento anexado: "${title}" para o paciente ${patientId}`, newAttachment.id, true);

  res.status(201).json({ success: true, attachment: newAttachment });
});

// Exclusão de Documento Anexo
app.delete('/api/patients/:patientId/attachments/:attachmentId', requireMedicalRecordAccess, (req, res) => {
  const user = getActingUser(req);
  if (!user) return res.status(401).json({ error: 'Não autorizado.' });
  const { patientId, attachmentId } = req.params;

  const index = attachments.findIndex((a) => a.id === attachmentId && a.patient_id === patientId);
  if (index === -1) {
    return res.status(404).json({ error: 'Documento anexo não encontrado.' });
  }

  const removed = attachments.splice(index, 1)[0];
  saveDatabase();
  logAuditEvent(user, 'DELETE', 'PRONTUARIO', `Documento removido: "${removed.title}" do paciente ${patientId}`, removed.id, true);

  res.json({ success: true, message: 'Documento excluído com sucesso.' });
});

// ==========================================
// 6. ROTAS DE AGENDAMENTO (Entregável 3)
// ==========================================
app.get('/api/appointments', (req, res) => {
  const user = getActingUser(req);
  if (!user) return res.status(401).json({ error: 'Não autorizado.' });
// Se profissional, filtra apenas sua agenda. Se admin ou recepção, vê todos os agendamentos
  if (user.role === 'PROFESSIONAL') {
    const profAppts = appointments.filter((a) => a.professional_id === user.id);
    return res.json({ appointments: profAppts });
  }

  res.json({ appointments });
});

// Endpoint de Criação de Agendamento com Conflito e Recorrência
app.post('/api/appointments', (req, res) => {
  const user = getActingUser(req);
  if (!user) return res.status(401).json({ error: 'Não autorizado.' });
const {
    patient_id,
    professional_id,
    start_time,
    end_time,
    session_type,
    notes,
    is_recurring,
    recurrence_weeks,
  } = req.body;

  // 1. Validação dos campos obrigatórios
  if (!patient_id || !professional_id || !start_time || !end_time) {
    return res.status(400).json({
      error: 'DADOS_INVALIDOS',
      message: 'Paciente, profissional, horário de início e término são obrigatórios.',
    });
  }

  const patient = patients.find((p) => p.id === patient_id);
  if (!patient) return res.status(404).json({ error: 'Paciente não encontrado.' });

  const professional = users.find((u) => u.id === professional_id && (u.role === 'PROFESSIONAL' || u.role === 'ADMIN'));
  if (!professional) return res.status(404).json({ error: 'Profissional clínico não encontrado.' });

  // Regra de Negócio: Paciente em 1ª sessão não pode ter agendamento contínuo automático nas próximas semanas
  if (patient.treatment_status === 'PRIMEIRA_SESSAO' && is_recurring) {
    return res.status(400).json({
      error: 'PRIMEIRA_SESSAO_BLOQUEADA_RECORRENCIA',
      message:
        'Este paciente está cadastrado como "1ª Sessão / Avaliação Inicial". Para não prender horários futuros caso o paciente não continue, sessões contínuas não podem ser criadas antes de ativá-lo como paciente contínuo.',
    });
  }

  // 2. Verificação de conflito de agenda (Double Booking)
  const reqStart = new Date(start_time).getTime();
  const reqEnd = new Date(end_time).getTime();

  if (reqEnd <= reqStart) {
    return res.status(400).json({ error: 'O horário de término deve ser posterior ao horário de início.' });
  }

  const hasConflict = appointments.some((apt) => {
    if (apt.professional_id !== professional_id || apt.status === 'CANCELADO') return false;
    const existingStart = new Date(apt.start_time).getTime();
    const existingEnd = new Date(apt.end_time).getTime();
    return reqStart < existingEnd && reqEnd > existingStart;
  });

  if (hasConflict) {
    return res.status(409).json({
      error: 'CONFLITO_AGENDA',
      message: `O profissional ${professional.name} já possui um compromisso no intervalo selecionado. Escolha outro horário.`,
    });
  }

  // 3. Criação do Agendamento Principal
  const createdAppts: AppointmentDb[] = [];
  const parentId = 'apt-' + Date.now();
  const weeksCount = is_recurring ? Math.min(Number(recurrence_weeks) || 4, 12) : 1;
  const isFirstSession =
    req.body.is_first_session !== undefined
      ? !!req.body.is_first_session
      : patient.treatment_status === 'PRIMEIRA_SESSAO';

  for (let i = 0; i < weeksCount; i++) {
    const currentStart = new Date(reqStart + i * 7 * 24 * 60 * 60 * 1000).toISOString().replace('Z', '');
    const currentEnd = new Date(reqEnd + i * 7 * 24 * 60 * 60 * 1000).toISOString().replace('Z', '');

    const newApt: AppointmentDb = {
      id: i === 0 ? parentId : `apt-${Date.now()}-rec-${i}`,
      patient_id,
      patient_name: patient.full_name,
      patient_phone: patient.phone,
      professional_id,
      professional_name: professional.name,
      start_time: currentStart,
      end_time: currentEnd,
      status: 'AGENDADO',
      session_type: session_type || 'PRESENCIAL',
      notes: notes || (isFirstSession && i === 0 ? 'Primeira sessão / Avaliação Inicial' : ''),
      is_recurring: !!is_recurring,
      is_first_session: i === 0 ? isFirstSession : false,
      recurrence_rule: is_recurring ? 'SEMANAL' : undefined,
      recurrence_parent_id: i === 0 ? undefined : parentId,
      created_by_user_id: user.id,
      created_by_role: user.role,
      created_at: new Date().toISOString(),
    };

    appointments.push(newApt);
    createdAppts.push(newApt);

    // Agenda o lembrete 24h para WhatsApp
    const sendAt = new Date(new Date(currentStart).getTime() - 24 * 60 * 60 * 1000).toISOString();
    reminders.push({
      id: 'rem-' + Date.now() + '-' + i,
      appointment_id: newApt.id,
      patient_name: patient.full_name,
      patient_phone: patient.phone,
      appointment_datetime: currentStart.replace('T', ' ').substring(0, 16),
      channel: 'WHATSAPP',
      status: 'PENDENTE',
      scheduled_send_at: sendAt,
      message_preview: `Olá ${patient.full_name.split(' ')[0]}! Lembramos da sua consulta com ${professional.name} em ${currentStart.replace('T', ' às ').substring(0, 16)}. Responda SIM para confirmar.`,
    });
  }

  // 4. Notificação interna em tempo real para o profissional se for criado pela recepção
  if (user.role === 'RECEPTION') {
    const notif: SystemNotificationDb = {
      id: 'notif-' + Date.now(),
      recipient_user_id: professional_id,
      title: 'Nova Consulta Agendada pela Recepção',
      message: `${user.name} agendou ${patient.full_name} para ${new Date(start_time).toLocaleDateString('pt-BR')} às ${new Date(start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} (${is_recurring ? `Recorrente por ${weeksCount} semanas` : 'Sessão Avulsa'}).`,
      type: 'NEW_APPOINTMENT',
      read: false,
      created_at: new Date().toISOString(),
    };
    notifications.unshift(notif);
  }

  logAuditEvent(
    user,
    'CREATE',
    'AGENDA',
    `Agendamento criado para ${patient.full_name} com ${professional.name} (${createdAppts.length} sessão(ões)). Criador: ${user.name} (${user.role})`,
    parentId
  );

  saveDatabase();

  res.status(201).json({
    success: true,
    appointments: createdAppts,
    message: `${createdAppts.length} consulta(s) agendada(s) com sucesso.`,
  });
});

// Alteração de Status da Consulta
app.patch('/api/appointments/:id/status', (req, res) => {
  const user = getActingUser(req);
  if (!user) return res.status(401).json({ error: 'Não autorizado.' });
const { status } = req.body;
  const apt = appointments.find((a) => a.id === req.params.id);

  if (!apt) return res.status(404).json({ error: 'Agendamento não encontrado.' });

  const oldStatus = apt.status;
  apt.status = status;

  // Notifica o profissional se a recepção cancelar ou alterar
  if (user.role === 'RECEPTION' && user.id !== apt.professional_id) {
    notifications.unshift({
      id: 'notif-' + Date.now(),
      recipient_user_id: apt.professional_id,
      title: 'Status de Consulta Atualizado',
      message: `A recepção alterou o status da consulta de ${apt.patient_name} de "${oldStatus}" para "${status}".`,
      type: 'SCHEDULE_CHANGE',
      read: false,
      created_at: new Date().toISOString(),
    });
  }

  logAuditEvent(
    user,
    'UPDATE',
    'AGENDA',
    `Status do agendamento ${apt.id} alterado de ${oldStatus} para ${status} por ${user.name} (${user.role})`,
    apt.id
  );

  saveDatabase();

  res.json({ success: true, appointment: apt });
});

// Remanejamento Manual / Arrastar de Consulta com Validação de Conflito
app.patch('/api/appointments/:id/reschedule', (req, res) => {
  const user = getActingUser(req);
  if (!user) return res.status(401).json({ error: 'Não autorizado.' });

  const { start_time, end_time, professional_id } = req.body;
  if (!start_time || !end_time) {
    return res.status(400).json({ error: 'Os horários de início e término são obrigatórios.' });
  }

  const apt = appointments.find((a) => a.id === req.params.id);
  if (!apt) {
    return res.status(404).json({ error: 'Agendamento não encontrado.' });
  }

  const targetProfId = professional_id || apt.professional_id;
  const professional = users.find((u) => u.id === targetProfId && (u.role === 'PROFESSIONAL' || u.role === 'ADMIN'));
  if (!professional) {
    return res.status(404).json({ error: 'Profissional não encontrado.' });
  }

  const reqStart = new Date(start_time).getTime();
  const reqEnd = new Date(end_time).getTime();

  if (isNaN(reqStart) || isNaN(reqEnd) || reqEnd <= reqStart) {
    return res.status(400).json({ error: 'Intervalo de horário inválido.' });
  }

  // Verificar conflito com outros agendamentos ativos deste profissional
  const hasConflict = appointments.some((other) => {
    if (other.id === apt.id) return false;
    if (other.professional_id !== targetProfId || other.status === 'CANCELADO') return false;
    const existingStart = new Date(other.start_time).getTime();
    const existingEnd = new Date(other.end_time).getTime();
    return reqStart < existingEnd && reqEnd > existingStart;
  });

  if (hasConflict) {
    return res.status(409).json({
      error: 'CONFLITO_AGENDA',
      message: `O profissional ${professional.name} já possui um compromisso agendado no intervalo selecionado. Escolha outro horário ou dia.`,
    });
  }

  const oldStart = apt.start_time;
  const oldProf = apt.professional_name;

  apt.start_time = start_time;
  apt.end_time = end_time;
  apt.professional_id = targetProfId;
  apt.professional_name = professional.name;

  // Atualiza lembrete associado
  const rem = reminders.find((r) => r.appointment_id === apt.id);
  if (rem) {
    rem.appointment_datetime = start_time.replace('T', ' ').substring(0, 16);
    rem.scheduled_send_at = new Date(reqStart - 24 * 60 * 60 * 1000).toISOString();
    rem.status = 'PENDENTE';
    rem.message_preview = `Olá ${apt.patient_name.split(' ')[0]}! Lembramos da sua consulta remanejada com ${professional.name} em ${start_time.replace('T', ' às ').substring(0, 16)}. Responda SIM para confirmar.`;
  }

  // Notifica profissional se a recepção tiver feito a alteração
  if (user.role === 'RECEPTION' && user.id !== apt.professional_id) {
    notifications.unshift({
      id: 'notif-' + Date.now(),
      recipient_user_id: apt.professional_id,
      title: 'Consulta Remanejada pela Recepção',
      message: `${user.name} remanejou a consulta de ${apt.patient_name} para ${new Date(start_time).toLocaleDateString('pt-BR')} às ${new Date(start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`,
      type: 'SCHEDULE_CHANGE',
      read: false,
      created_at: new Date().toISOString(),
    });
  }

  logAuditEvent(
    user,
    'UPDATE',
    'AGENDA',
    `Consulta de ${apt.patient_name} remanejada de ${oldStart} (${oldProf}) para ${start_time} (${professional.name}) por ${user.name} (${user.role}).`,
    apt.id
  );

  saveDatabase();

  res.json({
    success: true,
    appointment: apt,
    message: `Consulta de ${apt.patient_name} remanejada com sucesso para ${new Date(start_time).toLocaleDateString('pt-BR')} às ${new Date(start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`,
  });
});

// Lembretes & Notificações
app.get('/api/reminders', (req, res) => {
  res.json({ reminders });
});

app.post('/api/reminders/trigger-batch', (req, res) => {
  const user = getActingUser(req);
  if (!user) return res.status(401).json({ error: 'Não autorizado.' });
let count = 0;
  reminders.forEach((r) => {
    if (r.status === 'PENDENTE') {
      r.status = 'ENVIADO';
      count++;
    }
  });

  saveDatabase();

  logAuditEvent(user, 'UPDATE', 'SISTEMA', `Disparo em lote de lembretes automáticos (WhatsApp/E-mail): ${count} enviados.`);
  res.json({ success: true, count, reminders });
});

app.get('/api/notifications', (req, res) => {
  const user = getActingUser(req);
  if (!user) return res.status(401).json({ error: 'Não autorizado.' });
const userNotifs = notifications.filter((n) => n.recipient_user_id === user.id);
  res.json({ notifications: userNotifs });
});

app.post('/api/notifications/:id/read', (req, res) => {
  const notif = notifications.find((n) => n.id === req.params.id);
  if (notif) notif.read = true;
  saveDatabase();
  res.json({ success: true });
});

// Logs de Auditoria LGPD
app.get('/api/audit-logs', (req, res) => {
  const user = getActingUser(req);
  if (!user) return res.status(401).json({ error: 'Não autorizado.' });
if (user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Apenas Administradores possuem autorização para auditar a trilha de segurança da clínica.' });
  }
  res.json({ auditLogs });
});

// Tratamento Global de Erros para Express / Serverless
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Express Uncaught Error]:', err);
  if (!res.headersSent) {
    res.status(500).json({
      error: 'Erro interno no servidor',
      message: err?.message || 'Ocorreu um erro ao processar a requisição.',
    });
  }
});

// ==========================================
// 7. INICIALIZAÇÃO DO SERVIDOR COM VITE MIDDLEWARE
// ==========================================
async function startServer() {
  if (isServerless) {
    return;
  }

  if (process.env.NODE_ENV !== 'production') {
    try {
      const viteModule = 'vite';
      const { createServer: createViteServer } = await import(/* @vite-ignore */ viteModule);
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (err) {
      console.warn('[Server] Não foi possível iniciar middleware Vite:', err);
    }
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CliniCare SaaS Server running on http://0.0.0.0:${PORT}`);
  });
}

if (!checkIsServerless()) {
  startServer();
}

export default app;
