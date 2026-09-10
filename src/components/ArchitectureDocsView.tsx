import React, { useState } from 'react';
import { X, Database, FolderTree, Code, Shield, Copy, Check, Lock, Key, Server } from 'lucide-react';

interface ArchitectureDocsViewProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureDocsView: React.FC<ArchitectureDocsViewProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'er' | 'structure' | 'api' | 'middleware' | 'lgpd'>('er');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const sqlSchema = `-- ==========================================================
-- 1. MODELO RELACIONAL POSTGRESQL (CLINICARE SAAS)
-- Conformidade com LGPD, Criptografia em Repouso & Auditoria
-- ==========================================================

-- Extensões para UUID e criptografia nativa (se aplicável)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tipos Enumerados (Enums)
CREATE TYPE user_role AS ENUM ('ADMIN', 'PROFESSIONAL', 'RECEPTION');
CREATE TYPE appointment_status AS ENUM ('AGENDADO', 'CONFIRMADO', 'CANCELADO', 'REALIZADO', 'FALTOU');
CREATE TYPE session_type AS ENUM ('PRESENCIAL', 'ONLINE');
CREATE TYPE audit_action AS ENUM ('READ', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT', 'BLOCKED_ACCESS_ATTEMPT');

-- 1. Tabela de Usuários do Sistema (RBAC)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL, -- Multi-tenancy SaaS
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    council_number VARCHAR(50), -- Ex: CRP 06/142980, CRM
    specialty VARCHAR(100),
    phone VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela de Pacientes (Dados Demográficos e Contatos)
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    cpf_encrypted BYTEA NOT NULL, -- Criptografia AES-256
    cpf_masked VARCHAR(14) NOT NULL, -- Ex: 342.***.***-09 para indexação/exibição segura
    birth_date DATE NOT NULL,
    email VARCHAR(150),
    phone VARCHAR(20) NOT NULL,
    gender VARCHAR(30),
    address TEXT,
    emergency_contact JSONB NOT NULL, -- { "name": "...", "phone": "...", "relation": "..." }
    assigned_professional_id UUID REFERENCES users(id) ON DELETE SET NULL,
    lgpd_consent_signed BOOLEAN DEFAULT TRUE,
    lgpd_consent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'ATIVO',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabela de Agendamentos e Consultas (Calendário)
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    professional_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status appointment_status DEFAULT 'AGENDADO',
    session_type session_type DEFAULT 'PRESENCIAL',
    notes TEXT, -- Observações administrativas da recepção
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_rule VARCHAR(100), -- Ex: 'FREQ=WEEKLY;INTERVAL=1'
    recurrence_parent_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
    created_by_user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_appointment_interval CHECK (end_time > start_time)
);

-- Índice parcial para prevenir Double Booking (Colisão de horários para o mesmo profissional)
CREATE UNIQUE INDEX idx_prevent_double_booking ON appointments (professional_id, start_time)
WHERE status != 'CANCELADO';

-- 4. Tabela de Prontuário Eletrônico (Evoluções Clínicas Invioláveis)
-- DADOS SENSÍVEIS (LGPD ART. 11): Criptografados via Envelope Encryption (AES-256-GCM)
CREATE TABLE medical_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    professional_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    session_number INT NOT NULL,
    session_date DATE NOT NULL,
    -- Cargas criptografadas (Ciphertext + IV + Tag de autenticação)
    encrypted_subjective BYTEA NOT NULL, -- Relato do paciente
    encrypted_assessment BYTEA NOT NULL, -- Avaliação diagnóstica
    encrypted_intervention BYTEA,       -- Intervenções e técnicas
    encrypted_plan BYTEA,               -- Metas futuras
    iv_vector VARCHAR(64) NOT NULL,
    auth_tag VARCHAR(64) NOT NULL,
    -- Selo de Inviolabilidade (Imutabilidade legal)
    is_sealed BOOLEAN DEFAULT TRUE,
    sealed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    sha256_hash VARCHAR(64) NOT NULL, -- Hash de integridade forense
    encryption_key_id VARCHAR(100) NOT NULL, -- Referência à chave gerenciada no KMS
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabela de Documentos e Testes Psicológicos Anexos
CREATE TABLE medical_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL, -- TESTE_PSICOLOGICO, LAUDO, ENCAMINHAMENTO
    storage_path VARCHAR(255) NOT NULL, -- Bucket seguro (GCS / S3 com SSE-KMS)
    file_size_bytes BIGINT NOT NULL,
    uploaded_by_id UUID NOT NULL REFERENCES users(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabela de Trilha de Auditoria LGPD (Audit Trail - Inalterável)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL,
    user_id UUID REFERENCES users(id),
    user_role user_role NOT NULL,
    action audit_action NOT NULL,
    resource VARCHAR(50) NOT NULL, -- 'PRONTUARIO', 'PACIENTE', 'AGENDA'
    resource_id VARCHAR(100),
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    details TEXT NOT NULL,
    lgpd_critical BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Regra de imutabilidade: impedir UPDATE e DELETE na tabela audit_logs
CREATE OR REPLACE RULE no_update_audit AS ON UPDATE TO audit_logs DO INSTEAD NOTHING;
CREATE OR REPLACE RULE no_delete_audit AS ON DELETE TO audit_logs DO INSTEAD NOTHING;`;

  const folderStructure = `clinic-saas-root/
├── backend/                        # API Node.js / Express com TypeScript
│   ├── src/
│   │   ├── config/                 # Configurações de ambiente, CORS e KMS
│   │   │   ├── env.ts
│   │   │   └── kms.ts              # Provedor de Chaves Criptográficas (GCP/AWS KMS)
│   │   ├── db/                     # Conexão PostgreSQL & Migrações
│   │   │   ├── index.ts            # Pool de conexão (pg / Kysely / Prisma)
│   │   │   └── migrations/         # Scripts DDL versionados
│   │   ├── modules/                # Arquitetura Modular por Domínio
│   │   │   ├── auth/               # Autenticação JWT, Refresh Token & Hash bcrypt
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   └── auth.routes.ts
│   │   │   ├── appointments/       # Módulo da Agenda Clínica (Recepção & Clínico)
│   │   │   │   ├── appointment.controller.ts
│   │   │   │   ├── appointment.service.ts
│   │   │   │   ├── appointment.validator.ts
│   │   │   │   └── appointment.routes.ts
│   │   │   ├── patients/           # Gestão de Pacientes & Consentimento LGPD
│   │   │   │   ├── patient.controller.ts
│   │   │   │   └── patient.service.ts
│   │   │   ├── medical-records/    # Prontuário Eletrônico (AES-256 & SHA-256)
│   │   │   │   ├── medical-record.controller.ts
│   │   │   │   ├── medical-record.service.ts
│   │   │   │   └── medical-record.routes.ts
│   │   │   └── reminders/          # Agendamento 24h (WhatsApp API & Cron Jobs)
│   │   │       ├── reminder.queue.ts
│   │   │       └── reminder.worker.ts
│   │   ├── middlewares/            # Middlewares de Proteção & Segurança
│   │   │   ├── auth.middleware.ts
│   │   │   ├── rbac.middleware.ts  # Bloqueio estrito da Recepção a prontuários
│   │   │   └── audit.middleware.ts # Registro obrigatório de acessos (Art. 6/11 LGPD)
│   │   ├── security/               # Módulos de Criptografia
│   │   │   ├── cipher.ts           # AES-256-GCM Envelope Encryption
│   │   │   └── integrity.ts        # Gerador e validador de Hash SHA-256
│   │   └── server.ts               # Entrypoint HTTP do Express
│   ├── package.json
│   └── tsconfig.json
│
└── frontend/                       # Aplicação React 19 + TypeScript + Tailwind
    ├── src/
    │   ├── api/                    # Clientes HTTP (Axios / Fetch com interceptors)
    │   │   ├── client.ts
    │   │   └── endpoints.ts
    │   ├── components/             # Componentes de UI Reutilizáveis
    │   │   ├── calendar/           # Visão Diária, Semanal e Mensal
    │   │   ├── records/            # Linha do tempo de Evoluções e Anexos
    │   │   ├── patients/           # Listagem e Ficha Cadastral
    │   │   └── ui/                 # Modais, Badges, Botões e Inputs
    │   ├── context/                # Estado Global (AuthContext, RBAC, Notificações)
    │   │   └── AuthContext.tsx
    │   ├── hooks/                  # Custom Hooks (useAppointments, useMedicalRecord)
    │   ├── types/                  # Definições TypeScript compartilhadas
    │   │   └── index.ts
    │   ├── App.tsx
    │   └── main.tsx
    ├── tailwind.config.ts
    └── vite.config.ts`;

  const apiRouteCode = `// src/modules/appointments/appointment.controller.ts
import { Request, Response } from 'express';
import { db } from '../../db';
import { logAuditEvent } from '../../security/audit';
import { queueWhatsappReminder } from '../reminders/reminder.queue';

export async function createAppointmentHandler(req: Request, res: Response) {
  const currentUser = req.user; // Injetado pelo middleware de autenticação
  const {
    patient_id,
    professional_id,
    start_time,
    end_time,
    session_type = 'PRESENCIAL',
    notes,
    is_recurring = false,
    recurrence_weeks = 1,
  } = req.body;

  // 1. Validações de integridade dos dados
  if (!patient_id || !professional_id || !start_time || !end_time) {
    return res.status(400).json({
      error: 'DADOS_OBRIGATORIOS_AUSENTES',
      message: 'Paciente, profissional, data/hora de início e término são mandatórios.',
    });
  }

  const startDate = new Date(start_time);
  const endDate = new Date(end_time);

  if (endDate <= startDate) {
    return res.status(400).json({
      error: 'HORARIO_INVALIDO',
      message: 'O horário de término deve ser estritamente posterior ao horário de início.',
    });
  }

  // 2. Prevenção de Conflito de Horário (Double Booking / Prevenção de sobreposição)
  // Query relacional com trava de concorrência
  const conflict = await db.query(
    \`SELECT id FROM appointments 
     WHERE professional_id = $1 
       AND status != 'CANCELADO'
       AND tstzrange(start_time, end_time) && tstzrange($2, $3)\`,
    [professional_id, startDate.toISOString(), endDate.toISOString()]
  );

  if (conflict.rows.length > 0) {
    return res.status(409).json({
      error: 'CONFLITO_AGENDA',
      message: 'O profissional clínico já possui uma consulta agendada neste mesmo intervalo de horário.',
    });
  }

  // 3. Transação Relacional: Criação do(s) agendamento(s) recorrente(s)
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const createdAppointments = [];
    const weeksCount = is_recurring ? Math.min(Number(recurrence_weeks) || 4, 12) : 1;
    let parentAppointmentId: string | null = null;

    for (let i = 0; i < weeksCount; i++) {
      const currentStart = new Date(startDate.getTime() + i * 7 * 24 * 60 * 60 * 1000);
      const currentEnd = new Date(endDate.getTime() + i * 7 * 24 * 60 * 60 * 1000);

      const insertResult = await client.query(
        \`INSERT INTO appointments (
            clinic_id, patient_id, professional_id, start_time, end_time,
            status, session_type, notes, is_recurring, recurrence_parent_id, created_by_user_id
         ) VALUES ($1, $2, $3, $4, $5, 'AGENDADO', $6, $7, $8, $9, $10)
         RETURNING *\`,
        [
          currentUser.clinic_id,
          patient_id,
          professional_id,
          currentStart.toISOString(),
          currentEnd.toISOString(),
          session_type,
          notes || null,
          is_recurring,
          parentAppointmentId,
          currentUser.id,
        ]
      );

      const apt = insertResult.rows[0];
      if (i === 0) parentAppointmentId = apt.id;
      createdAppointments.push(apt);

      // 4. Enfileira lembrete automático de WhatsApp/Email para 24h antes da consulta
      await queueWhatsappReminder({
        appointmentId: apt.id,
        patientId: patient_id,
        scheduledFor: new Date(currentStart.getTime() - 24 * 60 * 60 * 1000),
      });
    }

    await client.query('COMMIT');

    // 5. Notificação interna se a recepção agendou para um psicólogo
    if (currentUser.role === 'RECEPTION') {
      await sendInAppNotification({
        userId: professional_id,
        title: 'Nova Consulta Agendada pela Recepção',
        message: \`Mariana (Recepção) agendou uma sessão para você em \${startDate.toLocaleString('pt-BR')}.\`,
      });
    }

    // 6. Registro de Auditoria
    await logAuditEvent({
      userId: currentUser.id,
      userRole: currentUser.role,
      action: 'CREATE',
      resource: 'AGENDA',
      details: \`Agendamento criado para paciente \${patient_id} com o profissional \${professional_id}.\`,
    });

    return res.status(201).json({
      success: true,
      data: createdAppointments,
      message: \`\${createdAppointments.length} agendamento(s) criado(s) com sucesso.\`,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}`;

  const middlewareCode = `// src/middlewares/rbac.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { logAuditEvent } from '../security/audit';

/**
 * Middleware de Segurança Estrita de Prontuário Clínico (Entregável 4)
 * 
 * Objetivo de Segurança da Informação & LGPD:
 * Impede que perfis operacionais/administrativos (ex: Recepção/Secretaria)
 * acessem qualquer dado sensível de saúde (Art. 11 LGPD) e evoluções clínicas.
 */
export function requireMedicalRecordAccess(req: Request, res: Response, next: NextFunction) {
  const user = req.user; // Usuário autenticado pelo JWT
  const patientId = req.params.patientId || req.body.patient_id;

  // 1. REGRA ABSOLUTA: Recepção / Secretaria NÃO PODE LER nem ESCREVER em Prontuário
  if (user.role === 'RECEPTION') {
    // Registra imediatamente evento crítico de auditoria para fins de compliance
    logAuditEvent({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'BLOCKED_ACCESS_ATTEMPT',
      resource: 'PRONTUARIO',
      resourceId: patientId,
      ipAddress: req.ip,
      details: \`Tentativa não autorizada de leitura de prontuário clínico pelo usuário \${user.name} (\${user.role}). Bloqueio automático conforme LGPD Art. 11.\`,
      lgpdCritical: true,
    });

    return res.status(403).json({
      error: 'ACESSO NEGADO (SIGILO CLÍNICO E LGPD)',
      code: 'FORBIDDEN_RECEPTION_CLINICAL_RECORD_ACCESS',
      message: 'O perfil de Recepção/Secretaria possui acesso restrito à gestão de horários e cadastros básicos, sendo expressamente proibido de visualizar evoluções clínicas e notas de prontuário.',
      legal_ground: 'LGPD (Lei 13.709/2018) Art. 11 & Resolução CFP nº 001/2009',
    });
  }

  // 2. REGRA DO PROFISSIONAL CLÍNICO: Só pode acessar pacientes sob seu cuidado
  if (user.role === 'PROFESSIONAL') {
    // Consulta rápida de vínculo entre paciente e terapeuta
    const isAssigned = checkProfessionalPatientLink(user.id, patientId);
    if (!isAssigned) {
      logAuditEvent({
        userId: user.id,
        userRole: user.role,
        action: 'BLOCKED_ACCESS_ATTEMPT',
        resource: 'PRONTUARIO',
        resourceId: patientId,
        details: \`Clínico tentou acessar prontuário de paciente vinculado a outro profissional.\`,
        lgpdCritical: true,
      });

      return res.status(403).json({
        error: 'ACESSO NEGADO',
        message: 'Você não possui permissão clínica para consultar os registros de pacientes vinculados a outro terapeuta.',
      });
    }
  }

  // 3. Usuário Autorizado (Admin ou Profissional responsável)
  // Registra leitura de dados sensíveis na trilha de auditoria
  logAuditEvent({
    userId: user.id,
    userRole: user.role,
    action: 'READ',
    resource: 'PRONTUARIO',
    resourceId: patientId,
    details: \`Leitura autorizada de prontuário pelo usuário \${user.name} (\${user.role}).\`,
    lgpdCritical: true,
  });

  next();
}`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#2D2D2A]/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-[#FDFCF9] rounded-t-2xl sm:rounded-2xl max-w-5xl w-full shadow-2xl border border-[#E5E2D9] overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh]">
        {/* Mobile drag handle */}
        <div className="pt-2 sm:hidden flex justify-center bg-[#2D2D2A]">
          <div className="w-12 h-1 bg-[#5A5A40] rounded-full"></div>
        </div>

        {/* Modal Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-[#3D3D39] flex items-center justify-between bg-[#2D2D2A] text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#3D3D39] text-[#FDFCF9] flex items-center justify-center border border-[#5A5A40]/40 shrink-0">
              <Server className="w-4 h-4 sm:w-5 sm:h-5 text-[#E5E2D9]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-serif italic font-bold text-white">Especificação Técnica</h2>
              <p className="text-[11px] sm:text-xs text-[#8A8A82]">Prontuário SaaS com RBAC e LGPD (Entregáveis 1 a 5)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#8A8A82] hover:text-white p-1.5 rounded-lg hover:bg-[#3D3D39] transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-[#F2F0EA] px-3 sm:px-6 border-b border-[#E5E2D9] flex items-center gap-1 overflow-x-auto text-xs font-semibold shrink-0 no-scrollbar">
          <button
            onClick={() => setActiveTab('er')}
            className={`px-4 py-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'er'
                ? 'border-[#5A5A40] text-[#3D3D39] bg-white font-bold'
                : 'border-transparent text-[#8A8A82] hover:text-[#3D3D39]'
            }`}
          >
            <Database className="w-4 h-4 text-[#5A5A40]" />
            1. Modelo ER Relacional (DDL)
          </button>

          <button
            onClick={() => setActiveTab('structure')}
            className={`px-4 py-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'structure'
                ? 'border-[#5A5A40] text-[#3D3D39] bg-white font-bold'
                : 'border-transparent text-[#8A8A82] hover:text-[#3D3D39]'
            }`}
          >
            <FolderTree className="w-4 h-4 text-[#5A5A40]" />
            2. Estrutura de Pastas
          </button>

          <button
            onClick={() => setActiveTab('api')}
            className={`px-4 py-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'api'
                ? 'border-[#5A5A40] text-[#3D3D39] bg-white font-bold'
                : 'border-transparent text-[#8A8A82] hover:text-[#3D3D39]'
            }`}
          >
            <Code className="w-4 h-4 text-[#5A5A40]" />
            3. Rota de Agendamento
          </button>

          <button
            onClick={() => setActiveTab('middleware')}
            className={`px-4 py-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'middleware'
                ? 'border-[#5A5A40] text-[#3D3D39] bg-white font-bold'
                : 'border-transparent text-[#8A8A82] hover:text-[#3D3D39]'
            }`}
          >
            <Shield className="w-4 h-4 text-[#5A5A40]" />
            4. Middleware de Permissão (RBAC)
          </button>

          <button
            onClick={() => setActiveTab('lgpd')}
            className={`px-4 py-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'lgpd'
                ? 'border-[#5A5A40] text-[#3D3D39] bg-white font-bold'
                : 'border-transparent text-[#8A8A82] hover:text-[#3D3D39]'
            }`}
          >
            <Lock className="w-4 h-4 text-[#5A5A40]" />
            5. Criptografia & LGPD
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-[#FDFCF9] text-xs">
          {/* TAB 1: MODELO ER */}
          {activeTab === 'er' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#3D3D39]">Entregável 1: Diagrama e Esquema Relacional (PostgreSQL)</h3>
                  <p className="text-[#8A8A82] mt-0.5">
                    Tabelas com chaves estrangeiras estritas, tipos ENUM, índices contra Double Booking e tabela inalterável de Auditoria.
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(sqlSchema, 'sql')}
                  className="px-3 py-1.5 bg-white border border-[#E5E2D9] rounded-lg text-[#3D3D39] hover:bg-[#F2F0EA] font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  {copiedKey === 'sql' ? <Check className="w-3.5 h-3.5 text-[#5A5A40]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'sql' ? 'Copiado!' : 'Copiar DDL SQL'}</span>
                </button>
              </div>

              {/* Visual Schema Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-white p-3 rounded-lg border border-[#E5E2D9]">
                  <span className="font-bold text-[#5A5A40] block">users (RBAC)</span>
                  <p className="text-[#8A8A82] text-[11px] mt-1">
                    id, clinic_id, full_name, email, password_hash, role (ADMIN / PROFESSIONAL / RECEPTION), council_number
                  </p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-[#E5E2D9]">
                  <span className="font-bold text-[#5A5A40] block">patients</span>
                  <p className="text-[#8A8A82] text-[11px] mt-1">
                    id, full_name, cpf_encrypted, birth_date, phone, emergency_contact (JSONB), assigned_professional_id (FK)
                  </p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-[#E5E2D9]">
                  <span className="font-bold text-[#5A5A40] block">appointments</span>
                  <p className="text-[#8A8A82] text-[11px] mt-1">
                    id, patient_id (FK), professional_id (FK), start_time, end_time, status, is_recurring, recurrence_parent_id
                  </p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-[#E5E2D9]">
                  <span className="font-bold text-[#5A5A40] block">medical_records (PEP)</span>
                  <p className="text-[#8A8A82] text-[11px] mt-1">
                    id, patient_id (FK), professional_id (FK), encrypted_subjective, encrypted_assessment, sha256_hash, is_sealed
                  </p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-[#E5E2D9]">
                  <span className="font-bold text-[#5A5A40] block">medical_attachments</span>
                  <p className="text-[#8A8A82] text-[11px] mt-1">
                    id, patient_id (FK), title, category, storage_path, uploaded_by_id (FK), uploaded_at
                  </p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-[#E5E2D9]">
                  <span className="font-bold text-[#8C4A3B] block">audit_logs (Imutável)</span>
                  <p className="text-[#8A8A82] text-[11px] mt-1">
                    id, user_id (FK), user_role, action, resource, details, ip_address, lgpd_critical. Regras no-update/no-delete.
                  </p>
                </div>
              </div>

              {/* SQL Code Block */}
              <div className="bg-[#2D2D2A] text-[#FDFCF9] rounded-xl p-4 font-mono text-[11px] overflow-x-auto border border-[#3D3D39]">
                <pre>{sqlSchema}</pre>
              </div>
            </div>
          )}

          {/* TAB 2: ESTRUTURA DE PASTAS */}
          {activeTab === 'structure' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#3D3D39]">Entregável 2: Estrutura de Pastas (Clean Architecture Modular)</h3>
                  <p className="text-[#8A8A82] mt-0.5">
                    Separação clara entre camadas de domínio, controle de acesso RBAC, criptografia KMS e SPA Frontend.
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(folderStructure, 'tree')}
                  className="px-3 py-1.5 bg-white border border-[#E5E2D9] rounded-lg text-[#3D3D39] hover:bg-[#F2F0EA] font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  {copiedKey === 'tree' ? <Check className="w-3.5 h-3.5 text-[#5A5A40]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'tree' ? 'Copiado!' : 'Copiar Árvore'}</span>
                </button>
              </div>

              <div className="bg-[#2D2D2A] text-[#D8D4C8] rounded-xl p-4 font-mono text-[11px] overflow-x-auto border border-[#3D3D39]">
                <pre>{folderStructure}</pre>
              </div>
            </div>
          )}

          {/* TAB 3: ENDPOINT DE AGENDAMENTO */}
          {activeTab === 'api' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#3D3D39]">Entregável 3: Endpoint de Agendamento (API Route)</h3>
                  <p className="text-[#8A8A82] mt-0.5">
                    Relaciona Paciente, Profissional e Data com validação de double booking, suporte a sessões semanais recorrentes e alerta instantâneo.
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(apiRouteCode, 'api')}
                  className="px-3 py-1.5 bg-white border border-[#E5E2D9] rounded-lg text-[#3D3D39] hover:bg-[#F2F0EA] font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  {copiedKey === 'api' ? <Check className="w-3.5 h-3.5 text-[#5A5A40]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'api' ? 'Copiado!' : 'Copiar Código'}</span>
                </button>
              </div>

              <div className="bg-[#2D2D2A] text-[#FDFCF9] rounded-xl p-4 font-mono text-[11px] overflow-x-auto border border-[#3D3D39]">
                <pre>{apiRouteCode}</pre>
              </div>
            </div>
          )}

          {/* TAB 4: MIDDLEWARE RBAC */}
          {activeTab === 'middleware' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#3D3D39]">Entregável 4: Middleware de Autorização (Bloqueio da Recepção)</h3>
                  <p className="text-[#8A8A82] mt-0.5">
                    Garante que o perfil de Recepção/Secretaria seja imediatamente barrado (HTTP 403) ao tentar consultar prontuários, com registro em auditoria.
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(middlewareCode, 'mid')}
                  className="px-3 py-1.5 bg-white border border-[#E5E2D9] rounded-lg text-[#3D3D39] hover:bg-[#F2F0EA] font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  {copiedKey === 'mid' ? <Check className="w-3.5 h-3.5 text-[#5A5A40]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'mid' ? 'Copiado!' : 'Copiar Middleware'}</span>
                </button>
              </div>

              <div className="bg-[#2D2D2A] text-[#FDFCF9] rounded-xl p-4 font-mono text-[11px] overflow-x-auto border border-[#3D3D39]">
                <pre>{middlewareCode}</pre>
              </div>
            </div>
          )}

          {/* TAB 5: LGPD & CRIPTOGRAFIA */}
          {activeTab === 'lgpd' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-[#3D3D39]">Segurança de Dados de Saúde, Criptografia e Conformidade LGPD</h3>
                <p className="text-[#8A8A82] mt-0.5">
                  Estratégia completa de arquitetura para atendimento aos requisitos legais da Lei nº 13.709/2018 (Artigos 6º, 11 e 46).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-[#E5E2D9] space-y-2">
                  <div className="flex items-center gap-2 font-bold text-[#5A5A40]">
                    <Key className="w-4 h-4 text-[#5A5A40]" />
                    <span>Envelope Encryption (AES-256-GCM + KMS)</span>
                  </div>
                  <p className="text-[#3D3D39] text-xs leading-relaxed">
                    Os campos clínicos (relato do paciente, hipótese diagnóstica e conduta) não são gravados em texto plano no banco de dados. Utilizamos <strong>Envelope Encryption</strong>:
                    <br />
                    • Uma <em>Data Encryption Key (DEK)</em> exclusiva é gerada com o algoritmo <strong>AES-256-GCM</strong> para cada evolução.
                    <br />
                    • A DEK é criptografada por uma <em>Key Encryption Key (KEK)</em> mestra mantida em cofre inviolável (<strong>Google Cloud KMS</strong> ou <strong>AWS KMS</strong>), com rotação automática anual.
                  </p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-[#E5E2D9] space-y-2">
                  <div className="flex items-center gap-2 font-bold text-[#5A5A40]">
                    <Lock className="w-4 h-4 text-[#5A5A40]" />
                    <span>Inviolabilidade & Hash SHA-256</span>
                  </div>
                  <p className="text-[#3D3D39] text-xs leading-relaxed">
                    O Código de Ética e as resoluções do CFP/CFM exigem que o prontuário seja inalterável retroativamente.
                    <br />
                    • Ao selar a sessão, é computado um <strong>Hash criptográfico SHA-256</strong> combinando: <code>ID do Paciente + ID do Terapeuta + Conteúdo da Sessão + Timestamp UTC</code>.
                    <br />
                    • Qualquer tentativa de adulteração direta no banco altera o hash e é acusada na verificação de integridade forense.
                  </p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-[#E5E2D9] space-y-2">
                  <div className="flex items-center gap-2 font-bold text-[#5A5A40]">
                    <Shield className="w-4 h-4 text-[#5A5A40]" />
                    <span>Princípio da Menor Necessidade (LGPD Art. 6º)</span>
                  </div>
                  <p className="text-[#3D3D39] text-xs leading-relaxed">
                    A recepção/secretaria necessita apenas de dados cadastrais para o agendamento (nome, telefone, horário).
                    A API projeta os dados sanitizados e bloqueia expressamente as tabelas de prontuário, anamnese e diagnósticos psicológicos.
                  </p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-[#E5E2D9] space-y-2">
                  <div className="flex items-center gap-2 font-bold text-[#5A5A40]">
                    <Database className="w-4 h-4 text-[#5A5A40]" />
                    <span>Trilha de Auditoria Imutável (Audit Trail)</span>
                  </div>
                  <p className="text-[#3D3D39] text-xs leading-relaxed">
                    Toda leitura ou tentativa bloqueada aos dados de prontuário gera um registro com <code>user_id, IP, timestamp e motivo</code>.
                    A tabela <code>audit_logs</code> possui regras do PostgreSQL (<code>DO INSTEAD NOTHING</code>) para impedir qualquer UPDATE ou DELETE, garantindo conformidade perante fiscalização da ANPD.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-[#F2F0EA] border-t border-[#E5E2D9] flex items-center justify-between text-xs">
          <span className="text-[#8A8A82]">
            Arquitetura em conformidade com as diretrizes da <strong>ANPD (LGPD)</strong> e <strong>CFP/CFM</strong>.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#5A5A40] hover:bg-[#484833] text-white font-semibold rounded-lg cursor-pointer transition-colors"
          >
            Fechar Especificação
          </button>
        </div>
      </div>
    </div>
  );
};
