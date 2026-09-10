import React, { useState, useEffect } from 'react';
import { Patient, MedicalRecord, MedicalAttachment, User } from '../types';
import { ShieldAlert, Lock, ShieldCheck, Key, FileCheck2, Plus, Upload, Calendar, Clock, AlertTriangle, FileText, Paperclip, Hash, Eye, Trash2 } from 'lucide-react';
import { getAuthHeaders } from '../utils/auth';
import { DocumentPreviewModal } from './DocumentPreviewModal';

interface MedicalRecordViewProps {
  currentUser: User;
  patients: Patient[];
  selectedPatient: Patient | null;
  onSelectPatient: (p: Patient) => void;
  onOpenNewEvolution: () => void;
  onOpenUploadModal: () => void;
  onOpenNewPatient?: () => void;
  refreshKey?: number;
}

export const MedicalRecordView: React.FC<MedicalRecordViewProps> = ({
  currentUser,
  patients,
  selectedPatient,
  onSelectPatient,
  onOpenNewEvolution,
  onOpenUploadModal,
  onOpenNewPatient,
  refreshKey,
}) => {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [attachments, setAttachments] = useState<MedicalAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<MedicalAttachment | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [attachmentToDelete, setAttachmentToDelete] = useState<MedicalAttachment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [accessDeniedError, setAccessDeniedError] = useState<{
    message: string;
    code: string;
    legal_basis: string;
  } | null>(null);

  const activePatient = selectedPatient || patients[0];

  const handleOpenPreview = (att: MedicalAttachment) => {
    setPreviewAttachment(att);
    setIsPreviewOpen(true);
  };

  const confirmDeleteAttachment = async () => {
    if (!attachmentToDelete || !activePatient) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/patients/${activePatient.id}/attachments/${attachmentToDelete.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders({}, undefined, currentUser.id),
      });
      if (res.ok) {
        setAttachments((prev) => prev.filter((a) => a.id !== attachmentToDelete.id));
        if (previewAttachment?.id === attachmentToDelete.id) {
          setIsPreviewOpen(false);
          setPreviewAttachment(null);
        }
        setAttachmentToDelete(null);
      } else {
        const data = await res.json().catch(() => ({}));
        console.error('Erro na exclusão do documento:', data);
      }
    } catch (err) {
      console.error('Erro ao excluir anexo:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'TESTE_PSICOLOGICO':
        return { label: 'Teste Psicológico', badge: 'bg-[#EBF3E8] text-[#3D5A3D]' };
      case 'LAUDO':
        return { label: 'Laudo / Parecer', badge: 'bg-[#F3EBE8] text-[#6E3B33]' };
      case 'ENCAMINHAMENTO':
        return { label: 'Encaminhamento', badge: 'bg-[#E8EEF3] text-[#33566E]' };
      case 'TERMO_CONSENTIMENTO':
        return { label: 'Termo LGPD', badge: 'bg-[#F3EFE8] text-[#5A5A40]' };
      default:
        return { label: 'Documento', badge: 'bg-[#F2F0EA] text-[#5A5A40]' };
    }
  };

  useEffect(() => {
    if (!activePatient) return;
    loadPatientRecords(activePatient.id);
  }, [activePatient?.id, currentUser.id, currentUser.role, refreshKey]);

  const loadPatientRecords = async (patientId: string) => {
    setIsLoading(true);
    setAccessDeniedError(null);

    try {
      const res = await fetch(`/api/patients/${patientId}/records`, {
        headers: getAuthHeaders({}, undefined, currentUser.id),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403) {
          setAccessDeniedError({
            message: data.message || 'Acesso negado às notas clínicas deste paciente.',
            code: data.code || 'FORBIDDEN_ACCESS',
            legal_basis: data.legal_basis || 'LGPD Artigo 11 (Dados Pessoais Sensíveis de Saúde)',
          });
          setRecords([]);
          setAttachments([]);
          return;
        }
        throw new Error(data.error || 'Erro ao carregar prontuário');
      }

      setRecords(data.records || []);
      setAttachments(data.attachments || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Context */}
      <div className="bg-white rounded-xl border border-[#E5E2D9] p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-serif italic text-[#3D3D39]">Prontuário Eletrônico do Paciente (PEP)</h1>
            <span className="bg-[#F2F0EA] text-[#5A5A40] text-xs px-2.5 py-0.5 rounded-md font-medium border border-[#E5E2D9] flex items-center gap-1">
              <Key className="w-3 h-3 text-[#5A5A40]" /> Criptografado AES-256-GCM
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#8A8A82] mt-0.5">
            Registro cronológico inviolável de evolução de sessões clínicas, histórico terapêutico e laudos.
          </p>
        </div>

        {/* Patient Selector Dropdown (Responsive) */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
          <span className="text-xs text-[#8A8A82] font-semibold whitespace-nowrap">Paciente:</span>
          {patients.length > 0 ? (
            <select
              id="select-active-patient-pep"
              value={activePatient?.id || ''}
              onChange={(e) => {
                const target = patients.find((p) => p.id === e.target.value);
                if (target) onSelectPatient(target);
              }}
              className="w-full sm:w-auto bg-[#F2F0EA] border border-[#E5E2D9] text-[#3D3D39] text-xs rounded-lg px-3 py-2.5 sm:py-2 font-medium focus:outline-[#5A5A40] min-h-[38px] sm:min-h-0"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name} ({p.cpf})
                </option>
              ))}
            </select>
          ) : (
            <span className="text-xs text-[#8A8A82] italic bg-[#F2F0EA] px-3 py-1.5 rounded-lg border border-[#E5E2D9]">
              Nenhum paciente cadastrado
            </span>
          )}
        </div>
      </div>

      {/* CASO 0: SEM PACIENTES CADASTRADOS AINDA */}
      {!activePatient ? (
        <div className="bg-white rounded-2xl border border-[#E5E2D9] p-8 sm:p-12 text-center shadow-xs">
          <div className="w-14 h-14 bg-[#F2F0EA] text-[#5A5A40] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#E5E2D9]">
            <FileText className="w-7 h-7 text-[#5A5A40]" />
          </div>
          <h3 className="text-lg font-serif italic font-bold text-[#3D3D39]">
            Nenhum Prontuário Disponível
          </h3>
          <p className="text-xs sm:text-sm text-[#8A8A82] max-w-md mx-auto mt-1.5 leading-relaxed">
            Para iniciar o registro de sessões, evolução clínica com carimbo inviolável SHA-256 e anexar testes psicológicos protegidos por criptografia AES-256-GCM, cadastre o primeiro paciente da clínica.
          </p>
          {onOpenNewPatient && (
            <div className="mt-6">
              <button
                id="btn-empty-pep-new-patient"
                onClick={onOpenNewPatient}
                className="px-4 py-2.5 bg-[#5A5A40] hover:bg-[#484833] text-white text-xs font-semibold rounded-lg shadow-xs inline-flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Cadastrar Paciente para Iniciar PEP
              </button>
            </div>
          )}
        </div>
      ) : currentUser.role === 'RECEPTION' ? (
        <div className="bg-[#FAF7F2] border-2 border-[#D1CEC3] rounded-2xl p-8 text-center shadow-xs animate-in fade-in">
          <div className="w-16 h-16 bg-[#F2EDE4] text-[#8C4A3B] rounded-full flex items-center justify-center mx-auto mb-4 ring-8 ring-[#FAF7F2]">
            <ShieldAlert className="w-8 h-8 text-[#8C4A3B]" />
          </div>

          <span className="px-3 py-1 bg-[#8C4A3B] text-white font-mono text-xs font-bold rounded-full uppercase tracking-wider">
            HTTP 403 FORBIDDEN • BLOQUEIO RBAC ATIVO
          </span>

          <h2 className="text-2xl font-serif italic font-bold text-[#3D3D39] mt-4">
            Acesso Restrito: Prontuário Clínico Protegido por Lei
          </h2>

          <p className="text-sm text-[#8A8A82] max-w-xl mx-auto mt-2 leading-relaxed">
            O usuário atual (<strong>{currentUser.name}</strong>) está autenticado com o perfil de{' '}
            <strong>Recepção / Secretaria</strong>. Pelo princípio da menor necessidade de acesso da{' '}
            <strong>LGPD (Lei Geral de Proteção de Dados - Lei 13.709/18)</strong> e pelo{' '}
            <strong>Código de Ética Profissional da Psicologia/Medicina</strong>, o conteúdo dos prontuários e notas de
            evolução é categorizado como <em>Dado Pessoal Sensível de Saúde (Art. 11)</em> e é estritamente inacessível
            à equipe administrativa.
          </p>

          <div className="mt-6 max-w-lg mx-auto bg-white border border-[#E5E2D9] rounded-xl p-4 text-left space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-[#3D3D39]">
              <Lock className="w-4 h-4 text-[#8C4A3B]" />
              <span>Regras de Auditoria e Proteção Executadas:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[#8A8A82] pl-1">
              <li>Tentativa de acesso interceptada pelo middleware <code className="text-[#8C4A3B] bg-[#F9ECEB] px-1 rounded">requireMedicalRecordAccess</code>.</li>
              <li>Evento de segurança registrado na trilha de auditoria imutável (Audit Trail).</li>
              <li>A recepção mantém acesso irrestrito à <strong>Agenda Geral</strong> e ao <strong>Cadastro Demográfico</strong>.</li>
            </ul>
          </div>

          <div className="mt-6 text-xs text-[#8A8A82]">
            💡 <em>Dica do Arquiteto: Para testar a visualização e adição de evoluções, alterne o usuário ativo no topo da tela para <strong>Dra. Beatriz Santos (Psicóloga)</strong> ou <strong>Administrador</strong>.</em>
          </div>
        </div>
      ) : accessDeniedError ? (
        <div className="bg-[#FAF7F2] border border-[#EADFCB] rounded-xl p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-[#8C6D3B] mx-auto mb-2" />
          <h3 className="text-base font-bold text-[#3D3D39]">{accessDeniedError.message}</h3>
          <p className="text-xs text-[#8A8A82] mt-1">{accessDeniedError.legal_basis}</p>
        </div>
      ) : (
        /* CASO 2: ACESSO AUTORIZADO (CLÍNICO OU ADMIN) */
        <div className="space-y-6">
          {/* Patient Clinical Header Card */}
          {activePatient && (
            <div className="bg-white rounded-xl border border-[#E5E2D9] p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#F2F0EA] text-[#5A5A40] border border-[#E5E2D9] flex items-center justify-center font-bold text-lg font-serif">
                  {activePatient.full_name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-[#3D3D39]">{activePatient.full_name}</h2>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#E8F0E6] text-[#3D5A3D] border border-[#CDE0CB]">
                      {activePatient.status}
                    </span>
                  </div>
                  <div className="text-xs text-[#8A8A82] flex flex-wrap items-center gap-3 mt-0.5">
                    <span>CPF: {activePatient.cpf}</span>
                    <span>•</span>
                    <span>Nascimento: {new Date(activePatient.birth_date).toLocaleDateString('pt-BR')}</span>
                    <span>•</span>
                    <span>Terapeuta: <strong>{activePatient.assigned_professional_name}</strong></span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:flex sm:items-center gap-2 w-full md:w-auto">
                <button
                  id="btn-upload-attachment"
                  onClick={onOpenUploadModal}
                  className="w-full sm:w-auto px-3.5 py-2.5 sm:py-2 border border-[#E5E2D9] bg-[#F2F0EA] text-[#3D3D39] hover:bg-[#E5E2D9] text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[40px] sm:min-h-0"
                >
                  <Upload className="w-4 h-4 text-[#5A5A40]" /> Anexar Documento / Teste
                </button>

                <button
                  id="btn-new-evolution"
                  onClick={onOpenNewEvolution}
                  className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-[#5A5A40] hover:bg-[#484833] text-white text-xs font-semibold rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[40px] sm:min-h-0"
                >
                  <Plus className="w-4 h-4" /> Registrar Nova Evolução
                </button>
              </div>
            </div>
          )}

          {/* Anamnese Rápida */}
          {activePatient?.anamnese && (
            <div className="bg-[#F2F0EA] rounded-xl border border-[#E5E2D9] p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#5A5A40] uppercase tracking-wide">
                  Síntese da Queixa Principal & Anamnese
                </span>
                <span className="text-[11px] text-[#5A5A40] font-semibold flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-[#E5E2D9]">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#5A5A40]" /> Termo LGPD Assinado em {activePatient.anamnese.lgpd_consent_date}
                </span>
              </div>
              <p className="text-xs text-[#3D3D39] italic">
                "{activePatient.anamnese.main_complaint}"
              </p>
              <div className="mt-2 pt-2 border-t border-[#E5E2D9] grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-[#8A8A82]">
                <div><strong className="text-[#3D3D39]">Histórico:</strong> {activePatient.anamnese.clinical_history}</div>
                <div><strong className="text-[#3D3D39]">Medicações:</strong> {activePatient.anamnese.allergies_medications}</div>
              </div>
            </div>
          )}

          {/* Chronological Timeline: Evoluções Clínicas Invioláveis */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-serif italic font-bold text-[#3D3D39]">Evoluções de Sessão Cronológicas</h3>
                <span className="text-xs bg-[#F2F0EA] text-[#5A5A40] border border-[#E5E2D9] px-2 py-0.5 rounded-full font-semibold">
                  {records.length} registro(s) selado(s)
                </span>
              </div>
              <span className="text-xs text-[#8A8A82] font-medium">
                Padrão SOAP (Subjetivo, Avaliação, Intervenção, Plano)
              </span>
            </div>

            {isLoading ? (
              <div className="bg-white rounded-xl border border-[#E5E2D9] p-10 text-center shadow-xs">
                <div className="w-6 h-6 border-2 border-[#5A5A40] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-[#8A8A82]">Carregando prontuário...</p>
              </div>
            ) : records.length === 0 ? (
              <div className="bg-white rounded-xl border border-[#E5E2D9] p-10 text-center shadow-xs">
                <FileText className="w-10 h-10 text-[#D1CEC3] mx-auto mb-2" />
                <h4 className="text-sm font-semibold text-[#3D3D39]">Nenhuma evolução registrada</h4>
                <p className="text-xs text-[#8A8A82] max-w-sm mx-auto mt-1">
                  Clique em "Registrar Nova Evolução" para redigir as anotações clínicas e selar a sessão com carimbo de integridade.
                </p>
              </div>
            ) : (
              records.map((record) => (
                <div
                  key={record.id}
                  id={`evolution-card-${record.id}`}
                  className="bg-white rounded-xl border border-[#E5E2D9] shadow-xs overflow-hidden"
                >
                  {/* Evolution Header */}
                  <div className="bg-[#F2F0EA] px-5 py-3 border-b border-[#E5E2D9] flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-[#5A5A40] text-white font-bold text-xs flex items-center justify-center">
                        #{record.session_number}
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-[#3D3D39]">
                          Sessão Clínica nº {record.session_number}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-[#8A8A82]">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(record.session_date).toLocaleDateString('pt-BR')}
                          </span>
                          <span>•</span>
                          <span>Terapeuta: {record.professional_name}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E8F0E6] text-[#3D5A3D] border border-[#CDE0CB]">
                        <FileCheck2 className="w-3.5 h-3.5" /> Selado e Inviolável
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-[#F2F0EA] text-[#5A5A40] border border-[#E5E2D9]">
                        <Key className="w-3 h-3" /> AES-256-GCM
                      </span>
                    </div>
                  </div>

                  {/* Evolution Content Body */}
                  <div className="p-5 space-y-4 text-xs">
                    {/* Subjetivo */}
                    <div>
                      <div className="font-bold text-[#5A5A40] flex items-center gap-1.5 mb-1 text-xs uppercase tracking-wide">
                        <span className="w-2 h-2 rounded-full bg-[#5A5A40]"></span> 1. Relato Subjetivo do Paciente
                      </div>
                      <p className="text-[#3D3D39] leading-relaxed bg-[#FDFCF9] p-3 rounded-lg border border-[#E5E2D9]">
                        {record.subjective}
                      </p>
                    </div>

                    {/* Avaliação Clínica */}
                    <div>
                      <div className="font-bold text-[#5A5A40] flex items-center gap-1.5 mb-1 text-xs uppercase tracking-wide">
                        <span className="w-2 h-2 rounded-full bg-[#7A7A60]"></span> 2. Avaliação & Raciocínio Clínico
                      </div>
                      <p className="text-[#3D3D39] leading-relaxed bg-[#FDFCF9] p-3 rounded-lg border border-[#E5E2D9]">
                        {record.assessment}
                      </p>
                    </div>

                    {/* Intervenção */}
                    {record.intervention && (
                      <div>
                        <div className="font-bold text-[#5A5A40] flex items-center gap-1.5 mb-1 text-xs uppercase tracking-wide">
                          <span className="w-2 h-2 rounded-full bg-[#3D5A3D]"></span> 3. Intervenção Técnica & Manejo
                        </div>
                        <p className="text-[#3D3D39] leading-relaxed bg-[#FDFCF9] p-3 rounded-lg border border-[#E5E2D9]">
                          {record.intervention}
                        </p>
                      </div>
                    )}

                    {/* Plano Terapêutico */}
                    {record.plan && (
                      <div>
                        <div className="font-bold text-[#5A5A40] flex items-center gap-1.5 mb-1 text-xs uppercase tracking-wide">
                          <span className="w-2 h-2 rounded-full bg-[#8C6D3B]"></span> 4. Metas & Plano para Próxima Sessão
                        </div>
                        <p className="text-[#3D3D39] leading-relaxed bg-[#FDFCF9] p-3 rounded-lg border border-[#E5E2D9]">
                          {record.plan}
                        </p>
                      </div>
                    )}

                    {/* Cryptographic Tamper-Evident Footer */}
                    <div className="pt-3 border-t border-[#E5E2D9] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-[#8A8A82] bg-[#F2F0EA]/60 p-2.5 rounded-lg font-mono">
                      <div className="flex items-center gap-1.5 truncate">
                        <Hash className="w-3.5 h-3.5 text-[#8A8A82] shrink-0" />
                        <span className="text-[#8A8A82]">Hash SHA-256:</span>
                        <span className="text-[#3D3D39] font-semibold truncate">{record.sha256_hash}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 text-[#8A8A82]">
                        <Clock className="w-3 h-3" />
                        <span>Carimbo de data/hora: {new Date(record.sealed_at).toLocaleString('pt-BR')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Anexos e Documentos Clínicos */}
          <div className="bg-white rounded-xl border border-[#E5E2D9] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-[#5A5A40]" />
                <h3 className="text-sm font-bold text-[#3D3D39]">Documentos e Testes Anexos ({attachments.length})</h3>
              </div>
              <button
                id="btn-add-attachment"
                onClick={onOpenUploadModal}
                className="text-xs font-semibold text-[#5A5A40] hover:text-[#3D3D39] flex items-center gap-1 cursor-pointer bg-[#F2F0EA] hover:bg-[#E5E2D9] px-2.5 py-1 rounded-lg border border-[#E5E2D9] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar Anexo
              </button>
            </div>

            {attachments.length === 0 ? (
              <p className="text-xs text-[#8A8A82] text-center py-4">Nenhum documento anexado ainda.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {attachments.map((att) => {
                  const cat = getCategoryLabel(att.category);
                  return (
                    <div
                      key={att.id}
                      className="p-3.5 rounded-xl border border-[#E5E2D9] bg-[#FAF8F5] hover:border-[#5A5A40] transition-all flex flex-col justify-between gap-3 text-xs shadow-2xs group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div
                          onClick={() => handleOpenPreview(att)}
                          className="flex items-start gap-2.5 min-w-0 cursor-pointer flex-1"
                          title="Clique para abrir pré-visualização completa"
                        >
                          <div className="w-9 h-9 rounded-lg bg-[#E5E2D9] text-[#5A5A40] flex items-center justify-center shrink-0 group-hover:bg-[#5A5A40] group-hover:text-white transition-colors">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-[#3D3D39] group-hover:text-[#5A5A40] transition-colors truncate">
                              {att.title}
                            </div>
                            <div className="text-[11px] text-[#8A8A82] truncate mt-0.5">
                              {att.file_name} • {att.file_size}
                            </div>
                          </div>
                        </div>

                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${cat.badge}`}>
                          {cat.label}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-[#EAE7DF] flex items-center justify-between text-[11px] text-[#8A8A82]">
                        <span className="truncate">
                          Por: <strong>{att.uploaded_by_name}</strong>
                        </span>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenPreview(att)}
                            className="px-2 py-1 text-[#5A5A40] bg-white hover:bg-[#5A5A40] hover:text-white rounded-md border border-[#D9D6CC] transition-colors flex items-center gap-1 font-medium cursor-pointer"
                            title="Visualizar documento em tela cheia"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Visualizar</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAttachmentToDelete(att);
                            }}
                            className="p-1 text-[#8A8A82] hover:text-[#8C4A3B] hover:bg-[#FBEBE8] rounded border border-transparent hover:border-[#ECD1CF] transition-colors cursor-pointer"
                            title="Excluir anexo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Pré-visualização de Documento */}
      <DocumentPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        attachment={previewAttachment}
        patient={activePatient}
        onDelete={(att) => setAttachmentToDelete(att)}
      />

      {/* Modal de Confirmação de Exclusão de Anexo */}
      {attachmentToDelete && (
        <div className="fixed inset-0 z-50 bg-[#2D2D2A]/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#E5E2D9] space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-[#FBEBE8] text-[#8C4A3B] flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#3D3D39]">
                  Excluir Documento do Prontuário?
                </h3>
                <p className="text-xs text-[#6B6B63] leading-relaxed">
                  Tem certeza que deseja remover permanentemente o anexo{' '}
                  <strong className="text-[#3D3D39]">"{attachmentToDelete.title}"</strong> ({attachmentToDelete.file_name}) do prontuário de <strong className="text-[#3D3D39]">{activePatient?.full_name}</strong>?
                </p>
              </div>
            </div>

            <div className="p-3 bg-[#F9F8F5] rounded-xl border border-[#EBE8E1] text-[11px] text-[#8A8A82] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#5A5A40] shrink-0" />
              <span>Esta operação será documentada no registro de auditoria e conformidade LGPD.</span>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setAttachmentToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-[#5A5A40] hover:bg-[#F2F0EA] rounded-xl transition-colors cursor-pointer border border-[#D9D6CC]"
              >
                Cancelar
              </button>
              <button
                id="btn-confirm-delete-attachment"
                type="button"
                disabled={isDeleting}
                onClick={confirmDeleteAttachment}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#8C4A3B] hover:bg-[#72382D] rounded-xl transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isDeleting ? 'Excluindo...' : 'Sim, Excluir Documento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
