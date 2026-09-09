export type UserRole = 'ADMIN' | 'PROFESSIONAL' | 'RECEPTION';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  council_number?: string; // e.g. CRP 06/123456
  specialty?: string; // e.g. Psicologia Clínica TCC
  phone: string;
  avatar: string;
  bio?: string;
  theme_color?: string;
}

export type AppointmentStatus = 'AGENDADO' | 'CONFIRMADO' | 'CANCELADO' | 'REALIZADO' | 'FALTOU';

export type TreatmentStatus = 'PRIMEIRA_SESSAO' | 'ATIVO_CONTINUO';

export interface RecurringSchedule {
  day_of_week: number; // 1 = Segunda, 2 = Terça, 3 = Quarta, 4 = Quinta, 5 = Sexta, 6 = Sábado, 7 = Domingo
  day_name: string; // 'Terça-feira'
  time: string; // '14:00'
  duration_minutes: number; // 50
  session_type: 'PRESENCIAL' | 'ONLINE';
  active: boolean;
}

export interface Patient {
  id: string;
  full_name: string;
  cpf: string; // Mascarado para conformidade LGPD
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
  treatment_status?: TreatmentStatus; // 'PRIMEIRA_SESSAO' (não agenda semanas futuras continuamente) ou 'ATIVO_CONTINUO' (paciente com agenda semanal contínua)
  recurring_schedule?: RecurringSchedule;
  created_at: string;
  anamnese?: {
    marital_status: string;
    occupation: string;
    main_complaint: string;
    clinical_history: string;
    allergies_medications: string;
    lgpd_consent_signed: boolean;
    lgpd_consent_date: string;
  };
}

export interface Appointment {
  id: string;
  patient_id: string;
  patient_name: string;
  patient_phone: string;
  professional_id: string;
  professional_name: string;
  start_time: string; // ISO String
  end_time: string; // ISO String
  status: AppointmentStatus;
  session_type: 'PRESENCIAL' | 'ONLINE';
  notes?: string;
  is_recurring: boolean;
  is_first_session?: boolean; // Primeira sessão / avaliação inicial
  recurrence_rule?: string; // e.g., 'WEEKLY_1400'
  recurrence_parent_id?: string;
  created_by_user_id: string;
  created_by_role: UserRole;
  created_at: string;
}

export interface MedicalRecord {
  id: string;
  patient_id: string;
  professional_id: string;
  professional_name: string;
  appointment_id?: string;
  session_number: number;
  session_date: string;
  // Campos clínicos protegidos e criptografados
  subjective: string; // Relato do paciente
  assessment: string; // Análise clínica
  intervention: string; // Intervenção técnica utilizada
  plan: string; // Metas para a próxima sessão
  is_sealed: boolean; // Imutável após salvar
  sealed_at: string;
  sha256_hash: string; // Hash de inviolabilidade do prontuário
  encryption_algorithm: 'AES-256-GCM';
}

export interface MedicalAttachment {
  id: string;
  patient_id: string;
  title: string;
  category: 'TESTE_PSICOLOGICO' | 'ENCAMINHAMENTO' | 'TERMO_CONSENTIMENTO' | 'LAUDO';
  file_name: string;
  file_size: string;
  file_type?: string;
  file_data?: string; // Data URL / Base64 string ou conteúdo para pré-visualização
  uploaded_by_name: string;
  uploaded_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  user_name: string;
  user_role: UserRole;
  action: 'READ' | 'CREATE' | 'UPDATE' | 'DELETE' | 'EXPORT' | 'BLOCKED_ACCESS_ATTEMPT' | 'LOGIN' | 'LOGOUT';
  resource: 'PRONTUARIO' | 'PACIENTE' | 'AGENDA' | 'SISTEMA' | 'AUTH';
  resource_id?: string;
  details: string;
  ip_address: string;
  timestamp: string;
  lgpd_critical: boolean;
}

export interface SystemNotification {
  id: string;
  recipient_user_id: string;
  title: string;
  message: string;
  type: 'SCHEDULE_CHANGE' | 'NEW_APPOINTMENT' | 'REMINDER_SENT' | 'SECURITY_ALERT';
  read: boolean;
  created_at: string;
}

export interface ReminderQueueItem {
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
