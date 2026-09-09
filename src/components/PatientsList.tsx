import React, { useState } from 'react';
import { Patient, User } from '../types';
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  FileText,
  AlertCircle,
  Calendar,
  UserCheck,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Repeat,
  Clock,
  Filter,
} from 'lucide-react';
import { getAuthHeaders } from '../utils/auth';

interface PatientsListProps {
  patients: Patient[];
  currentUser: User;
  onSelectPatientForRecord: (patient: Patient) => void;
  onOpenNewPatient: () => void;
  onSchedulePatient?: (patientId: string) => void;
  onDeletePatient?: (patientId: string) => Promise<void> | void;
  onOpenActivateContinuous?: (patient: Patient) => void;
}

export const PatientsList: React.FC<PatientsListProps> = ({
  patients,
  currentUser,
  onSelectPatientForRecord,
  onOpenNewPatient,
  onSchedulePatient,
  onDeletePatient,
  onOpenActivateContinuous,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [treatmentStatusFilter, setTreatmentStatusFilter] = useState<string>('ALL');
  const [selectedPatientModal, setSelectedPatientModal] = useState<Patient | null>(null);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccessMessage, setDeleteSuccessMessage] = useState<string | null>(null);

  const filteredPatients = patients.filter((p) => {
    const matchesSearch =
      p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.phone.includes(searchTerm) ||
      p.cpf.includes(searchTerm);

    const matchesTreatmentStatus =
      treatmentStatusFilter === 'ALL' ||
      (treatmentStatusFilter === 'PRIMEIRA_SESSAO' && p.treatment_status === 'PRIMEIRA_SESSAO') ||
      (treatmentStatusFilter === 'ATIVO_CONTINUO' && (p.treatment_status === 'ATIVO_CONTINUO' || !p.treatment_status));

    return matchesSearch && matchesTreatmentStatus;
  });

  const handleConfirmDelete = async () => {
    if (!patientToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      if (onDeletePatient) {
        await onDeletePatient(patientToDelete.id);
      } else {
        const res = await fetch(`/api/patients/${patientToDelete.id}`, {
          method: 'DELETE',
          headers: getAuthHeaders({}, undefined, currentUser.id),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || data.error || 'Erro ao excluir paciente.');
        }
      }

      setDeleteSuccessMessage(`Paciente ${patientToDelete.full_name} foi excluído com sucesso.`);
      setPatientToDelete(null);
      setTimeout(() => setDeleteSuccessMessage(null), 4000);
    } catch (err: any) {
      setDeleteError(err.message || 'Falha ao excluir o paciente. Verifique suas permissões.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-[#E5E2D9] p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-serif italic text-[#3D3D39]">Gestão de Pacientes</h1>
            <span className="bg-[#F2F0EA] text-[#5A5A40] text-xs px-2.5 py-0.5 rounded-md font-medium border border-[#E5E2D9]">
              {currentUser.role === 'ADMIN'
                ? 'Todos os Pacientes'
                : currentUser.role === 'PROFESSIONAL'
                ? 'Seus Pacientes Vinculados'
                : 'Cadastro Básico (Recepção)'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#8A8A82] mt-0.5">
            {currentUser.role === 'RECEPTION'
              ? 'A recepção pode cadastrar dados demográficos e contatos de emergência (a anamnese profunda é restrita ao psicólogo).'
              : 'Acesse fichas cadastrais, anamneses e abra o prontuário eletrônico para registrar evoluções.'}
          </p>
        </div>

        <button
          id="btn-new-patient"
          onClick={onOpenNewPatient}
          className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-[#5A5A40] hover:bg-[#484833] text-white text-xs font-semibold rounded-lg shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer min-h-[40px] sm:min-h-0"
        >
          <Plus className="w-4 h-4" /> Cadastrar Novo Paciente
        </button>
      </div>

      {/* Alerta de Sucesso na Exclusão */}
      {deleteSuccessMessage && (
        <div className="bg-[#E8F0E6] text-[#3D5A3D] border border-[#CDE0CB] px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-[#3D5A3D] shrink-0" />
          <span>{deleteSuccessMessage}</span>
        </div>
      )}

      {/* Search Bar & Treatment Status Filters */}
      <div className="bg-white rounded-xl border border-[#E5E2D9] p-3.5 sm:p-4 shadow-xs space-y-3">
        <div className="flex items-center gap-3">
          <Search className="w-5 h-5 text-[#8A8A82] shrink-0" />
          <input
            id="search-patients"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, CPF ou telefone..."
            className="w-full text-sm text-[#2D2D2A] placeholder:text-[#8A8A82] focus:outline-hidden bg-transparent"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="text-xs text-[#8A8A82] hover:text-[#3D3D39] cursor-pointer shrink-0 px-1 py-0.5">
              Limpar
            </button>
          )}
        </div>

        {/* Filter Badges: Todos / 1ª Sessão / Tratamento Contínuo */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#E5E2D9] text-xs">
          <span className="text-[#8A8A82] font-medium mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Enquadre:
          </span>
          <button
            type="button"
            onClick={() => setTreatmentStatusFilter('ALL')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
              treatmentStatusFilter === 'ALL'
                ? 'bg-[#5A5A40] text-white shadow-2xs'
                : 'bg-[#F2F0EA] text-[#3D3D39] hover:bg-[#E5E2D9]'
            }`}
          >
            Todos ({patients.length})
          </button>
          <button
            type="button"
            onClick={() => setTreatmentStatusFilter('PRIMEIRA_SESSAO')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all flex items-center gap-1 cursor-pointer ${
              treatmentStatusFilter === 'PRIMEIRA_SESSAO'
                ? 'bg-[#8C5D1E] text-white shadow-2xs'
                : 'bg-[#FAF0DC] text-[#8C5D1E] hover:bg-[#F5E5C9] border border-[#ECD8B5]'
            }`}
          >
            <Clock className="w-3 h-3" />
            1ª Sessão / Avaliação ({patients.filter((p) => p.treatment_status === 'PRIMEIRA_SESSAO').length})
          </button>
          <button
            type="button"
            onClick={() => setTreatmentStatusFilter('ATIVO_CONTINUO')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all flex items-center gap-1 cursor-pointer ${
              treatmentStatusFilter === 'ATIVO_CONTINUO'
                ? 'bg-[#3D5A3D] text-white shadow-2xs'
                : 'bg-[#E8F0E6] text-[#3D5A3D] hover:bg-[#D8E6D5] border border-[#CDE0CB]'
            }`}
          >
            <Repeat className="w-3 h-3" />
            Tratamento Contínuo ({patients.filter((p) => p.treatment_status === 'ATIVO_CONTINUO' || !p.treatment_status).length})
          </button>
        </div>
      </div>

      {/* Patients List Grid or Empty State */}
      {filteredPatients.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E5E2D9] p-8 sm:p-12 text-center shadow-xs">
          <div className="w-14 h-14 bg-[#F2F0EA] text-[#5A5A40] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#E5E2D9]">
            <Users className="w-7 h-7 text-[#5A5A40]" />
          </div>
          <h3 className="text-lg font-serif italic font-bold text-[#3D3D39]">
            {searchTerm ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'}
          </h3>
          <p className="text-xs sm:text-sm text-[#8A8A82] max-w-md mx-auto mt-1.5 leading-relaxed">
            {searchTerm
              ? `Não localizamos registros com o termo "${searchTerm}". Verifique o nome ou limpe a busca.`
              : 'Sua base de dados foi iniciada limpa e criptografada. Clique no botão abaixo para cadastrar o primeiro paciente e sua anamnese.'}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {searchTerm ? (
              <button
                onClick={() => setSearchTerm('')}
                className="px-4 py-2 text-xs font-semibold bg-[#F2F0EA] hover:bg-[#E5E2D9] text-[#3D3D39] rounded-lg transition-colors cursor-pointer"
              >
                Limpar Busca
              </button>
            ) : (
              <button
                id="btn-empty-add-patient"
                onClick={onOpenNewPatient}
                className="px-4 py-2.5 bg-[#5A5A40] hover:bg-[#484833] text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Cadastrar Primeiro Paciente
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPatients.map((patient) => (
          <div
            key={patient.id}
            id={`patient-card-${patient.id}`}
            className="bg-white rounded-xl border border-[#E5E2D9] p-4 sm:p-5 shadow-xs hover:border-[#D1CEC3] transition-all flex flex-col justify-between"
          >
            <div>
              {/* Card Header: Name & Status */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <h3 className="text-base font-bold text-[#3D3D39]">{patient.full_name}</h3>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-xs text-[#8A8A82]">
                    <span>CPF: {patient.cpf}</span>
                    <span>•</span>
                    <span>Nasc: {new Date(patient.birth_date).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#E8F0E6] text-[#3D5A3D] border border-[#CDE0CB] shrink-0">
                  {patient.status}
                </span>
              </div>

              {/* Contact Information */}
              <div className="space-y-2 text-xs text-[#3D3D39] bg-[#F2F0EA] p-3 rounded-lg border border-[#E5E2D9] mb-3">
                <a
                  href={`tel:${patient.phone.replace(/\D/g, '')}`}
                  className="flex items-center gap-2 hover:underline text-[#5A5A40] font-medium"
                  title="Ligar para o paciente"
                >
                  <Phone className="w-3.5 h-3.5 text-[#5A5A40] shrink-0" />
                  <span>{patient.phone}</span>
                </a>
                {patient.email && (
                  <a
                    href={`mailto:${patient.email}`}
                    className="flex items-center gap-2 hover:underline truncate"
                  >
                    <Mail className="w-3.5 h-3.5 text-[#8A8A82] shrink-0" />
                    <span className="truncate">{patient.email}</span>
                  </a>
                )}
                {patient.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[#8A8A82] shrink-0" />
                    <span className="truncate">{patient.address}</span>
                  </div>
                )}
              </div>

              {/* Professional Vinculado */}
              <div className="text-xs text-[#8A8A82] mb-3 flex items-center justify-between">
                <span>Terapeuta:</span>
                <span className="font-semibold text-[#3D3D39] truncate max-w-[65%]">{patient.assigned_professional_name}</span>
              </div>

              {/* Enquadre Terapêutico: 1ª Sessão vs Tratamento Contínuo */}
              {patient.treatment_status === 'PRIMEIRA_SESSAO' ? (
                <div className="flex items-center justify-between gap-1.5 mb-3 bg-[#FAF0DC]/80 border border-[#ECD8B5] px-2.5 py-1.5 rounded-lg text-xs">
                  <span className="font-bold text-[#8C5D1E] flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#8C5D1E]" />
                    1ª Sessão / Avaliação
                  </span>
                  {onOpenActivateContinuous && (
                    <button
                      type="button"
                      onClick={() => onOpenActivateContinuous(patient)}
                      className="px-2 py-0.5 bg-[#8C5D1E] hover:bg-[#724a16] text-white font-bold rounded-md text-[11px] flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                      title="Ativar como paciente contínuo e gerar horários semanais no calendário"
                    >
                      <Sparkles className="w-3 h-3" />
                      Tornar Contínuo
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between gap-1.5 mb-3 bg-[#E8F0E6]/80 border border-[#CDE0CB] px-2.5 py-1.5 rounded-lg text-xs">
                  <span className="font-bold text-[#3D5A3D] flex items-center gap-1">
                    <Repeat className="w-3.5 h-3.5 text-[#3D5A3D]" />
                    Tratamento Contínuo
                  </span>
                  {patient.recurring_schedule ? (
                    <span className="text-[11px] font-semibold text-[#4A6B4A]">
                      {patient.recurring_schedule.day_name}s às {patient.recurring_schedule.time}
                    </span>
                  ) : (
                    <span className="text-[11px] text-[#4A6B4A]">Horário Semanal</span>
                  )}
                </div>
              )}

              {/* LGPD Consent Badge */}
              <div className="flex items-center gap-1.5 text-[11px] text-[#5A5A40] bg-[#F2F0EA] px-2.5 py-1 rounded-md border border-[#E5E2D9] mb-3">
                <ShieldCheck className="w-3.5 h-3.5 text-[#5A5A40] shrink-0" />
                <span className="truncate">Consentimento LGPD Assinado</span>
              </div>
            </div>

            {/* Card Actions */}
            <div className="pt-3 border-t border-[#E5E2D9] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <button
                  id={`btn-view-details-${patient.id}`}
                  onClick={() => setSelectedPatientModal(patient)}
                  className="text-xs font-semibold text-[#8A8A82] hover:text-[#3D3D39] transition-colors cursor-pointer py-1 px-1.5 min-h-[36px] flex items-center"
                >
                  Ficha Cadastral
                </button>
                <button
                  id={`btn-delete-patient-${patient.id}`}
                  onClick={() => setPatientToDelete(patient)}
                  className="p-1.5 text-[#8A8A82] hover:text-[#9E3E3E] hover:bg-[#F9ECEB] rounded-lg transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                  title="Excluir paciente"
                  aria-label={`Excluir paciente ${patient.full_name}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                {onSchedulePatient && (
                  <button
                    id={`btn-schedule-patient-${patient.id}`}
                    onClick={() => onSchedulePatient(patient.id)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#F2F0EA] hover:bg-[#E5E2D9] text-[#5A5A40] border border-[#DCD8CC] flex items-center gap-1 transition-colors cursor-pointer min-h-[36px]"
                    title="Agendar consulta para este paciente"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Agendar</span>
                  </button>
                )}

                <button
                  id={`btn-open-record-${patient.id}`}
                  onClick={() => onSelectPatientForRecord(patient)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer min-h-[36px] ${
                    currentUser.role === 'RECEPTION'
                      ? 'bg-[#F5EFE6] text-[#8C6D3B] border border-[#EADFCB] hover:bg-[#ECE2D0]'
                      : 'bg-[#5A5A40] hover:bg-[#484833] text-white shadow-xs'
                  }`}
                  title={
                    currentUser.role === 'RECEPTION'
                      ? 'Clique para testar o bloqueio de segurança LGPD'
                      : 'Abrir Prontuário Clínico Eletrônico'
                  }
                >
                  <FileText className="w-3.5 h-3.5" />
                  {currentUser.role === 'RECEPTION' ? 'Verificar Prontuário' : 'Abrir Prontuário'}
                </button>
              </div>
            </div>
          </div>
        ))}
        </div>
      )}

      {/* Patient Detail Modal (Responsive Bottom-Sheet on mobile) */}
      {selectedPatientModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#2D2D2A]/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-lg w-full shadow-2xl border border-[#E5E2D9] max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Mobile Sheet Handle */}
            <div className="pt-2 sm:hidden flex justify-center bg-[#F2F0EA]">
              <div className="w-12 h-1 bg-[#D1CEC3] rounded-full"></div>
            </div>

            <div className="flex items-center justify-between border-b border-[#E5E2D9] px-5 py-4 bg-[#F2F0EA] shrink-0">
              <div>
                <h3 className="text-lg sm:text-xl font-serif italic font-bold text-[#3D3D39]">{selectedPatientModal.full_name}</h3>
                <p className="text-xs text-[#8A8A82]">Cadastro Cadastral Completo</p>
              </div>
              <button
                onClick={() => setSelectedPatientModal(null)}
                className="text-[#8A8A82] hover:text-[#3D3D39] p-1.5 rounded-lg hover:bg-[#E5E2D9] cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-3 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-[#F2F0EA] p-3 rounded-lg border border-[#E5E2D9]">
                <div>
                  <span className="text-[#8A8A82] block font-medium">CPF</span>
                  <span className="text-[#3D3D39] font-bold">{selectedPatientModal.cpf}</span>
                </div>
                <div>
                  <span className="text-[#8A8A82] block font-medium">Data de Nascimento</span>
                  <span className="text-[#3D3D39] font-bold">
                    {new Date(selectedPatientModal.birth_date).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div>
                  <span className="text-[#8A8A82] block font-medium">Gênero</span>
                  <span className="text-[#3D3D39]">{selectedPatientModal.gender}</span>
                </div>
                <div>
                  <span className="text-[#8A8A82] block font-medium">Status Clínico</span>
                  <span className="text-[#3D5A3D] font-bold">{selectedPatientModal.status}</span>
                </div>
              </div>

              {/* Contato de Emergência */}
              <div className="border border-[#E5E2D9] p-3 rounded-lg bg-white">
                <span className="font-bold text-[#3D3D39] block mb-1">Contato de Emergência</span>
                <p className="text-[#8A8A82]">
                  {selectedPatientModal.emergency_contact.name} ({selectedPatientModal.emergency_contact.relationship}) -{' '}
                  <a
                    href={`tel:${selectedPatientModal.emergency_contact.phone.replace(/\D/g, '')}`}
                    className="font-bold text-[#5A5A40] hover:underline"
                  >
                    {selectedPatientModal.emergency_contact.phone}
                  </a>
                </p>
              </div>

              {/* Enquadre Terapêutico & Agenda */}
              <div className="border border-[#E5E2D9] p-3 rounded-lg bg-white space-y-2">
                <span className="font-bold text-[#3D3D39] block">Enquadre Terapêutico & Calendário</span>
                {selectedPatientModal.treatment_status === 'PRIMEIRA_SESSAO' ? (
                  <div className="bg-[#FAF0DC]/70 border border-[#ECD8B5] p-3 rounded-lg space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#8C5D1E]">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Primeira Sessão / Avaliação Inicial</span>
                    </div>
                    <p className="text-[11px] text-[#7A5016] leading-relaxed">
                      Este paciente não possui horários contínuos bloqueados nas próximas semanas. Se faltar, fica registrado apenas no histórico sem travar a agenda. Se for continuar, ative-o para gerar seu horário semanal.
                    </p>
                    {onOpenActivateContinuous && (
                      <button
                        type="button"
                        onClick={() => {
                          const p = selectedPatientModal;
                          setSelectedPatientModal(null);
                          onOpenActivateContinuous(p);
                        }}
                        className="w-full py-2 px-3 bg-[#8C5D1E] hover:bg-[#724a16] text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Cadastrar como Paciente Contínuo (Fixar Horário Semanal)</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="bg-[#E8F0E6]/70 border border-[#CDE0CB] p-3 rounded-lg space-y-1 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-[#3D5A3D]">
                      <Repeat className="w-3.5 h-3.5" />
                      <span>Tratamento Contínuo Ativo</span>
                    </div>
                    <p className="text-[11px] text-[#4A6B4A]">
                      {selectedPatientModal.recurring_schedule ? (
                        <>
                          Horário fixo semanal: <strong>{selectedPatientModal.recurring_schedule.day_name}s às {selectedPatientModal.recurring_schedule.time}</strong> ({selectedPatientModal.recurring_schedule.session_type.toLowerCase()}).
                        </>
                      ) : (
                        'Paciente contínuo com horários semanais populados no calendário da clínica.'
                      )}
                    </p>
                  </div>
                )}
              </div>

              {/* Anamnese: Apenas se NÃO for recepção */}
              {currentUser.role !== 'RECEPTION' && selectedPatientModal.anamnese ? (
                <div className="border border-[#E5E2D9] bg-[#F2F0EA] p-3.5 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#5A5A40]">Dados da Anamnese Inicial</span>
                    <span className="text-[10px] bg-[#E5E2D9] text-[#5A5A40] px-1.5 py-0.5 rounded font-bold">
                      Acesso Restrito ao Terapeuta
                    </span>
                  </div>
                  <div>
                    <span className="text-[#8A8A82] font-medium block">Queixa Principal:</span>
                    <p className="text-[#3D3D39] font-medium">{selectedPatientModal.anamnese.main_complaint}</p>
                  </div>
                  <div>
                    <span className="text-[#8A8A82] font-medium block">Histórico Clínico:</span>
                    <p className="text-[#3D3D39]">{selectedPatientModal.anamnese.clinical_history}</p>
                  </div>
                  <div>
                    <span className="text-[#8A8A82] font-medium block">Medicações em Uso:</span>
                    <p className="text-[#3D3D39]">{selectedPatientModal.anamnese.allergies_medications}</p>
                  </div>
                </div>
              ) : currentUser.role === 'RECEPTION' ? (
                <div className="border border-[#EADFCB] bg-[#F5EFE6] p-3 rounded-lg text-[11px] text-[#8C6D3B] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-[#8C6D3B] shrink-0 mt-0.5" />
                  <span>
                    <strong>Proteção LGPD Art. 11:</strong> Anamnese clínica e histórico psiquiátrico são dados sensíveis restritos ao profissional de saúde e gestores clínicos.
                  </span>
                </div>
              ) : null}
            </div>

            <div className="p-4 bg-[#F2F0EA] border-t border-[#E5E2D9] flex items-center justify-between gap-2 shrink-0">
              <button
                id="btn-modal-delete-patient"
                type="button"
                onClick={() => {
                  const p = selectedPatientModal;
                  setSelectedPatientModal(null);
                  setPatientToDelete(p);
                }}
                className="px-3 py-2 text-xs font-semibold text-[#9E3E3E] hover:bg-[#F9ECEB] rounded-lg border border-[#ECD1CF] flex items-center gap-1.5 transition-colors cursor-pointer min-h-[38px]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir Cadastro</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedPatientModal(null)}
                className="px-5 py-2 bg-white hover:bg-[#E5E2D9] text-[#3D3D39] rounded-lg text-xs font-semibold cursor-pointer border border-[#E5E2D9] min-h-[38px] flex items-center justify-center"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão de Paciente (LGPD) */}
      {patientToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#2D2D2A]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-[#E5E2D9] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-[#E5E2D9] bg-[#F9ECEB] flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-[#ECD1CF] shrink-0">
                <Trash2 className="w-5 h-5 text-[#9E3E3E]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#9E3E3E]">Excluir Cadastro de Paciente</h3>
                <p className="text-xs text-[#8A8A82]">Esta operação é definitiva conforme a LGPD</p>
              </div>
            </div>

            <div className="p-5 space-y-3 text-xs text-[#3D3D39]">
              <div className="bg-[#F2F0EA] p-3 rounded-lg border border-[#E5E2D9] space-y-1">
                <div><strong className="text-[#8A8A82]">Paciente:</strong> <span className="font-bold text-[#3D3D39]">{patientToDelete.full_name}</span></div>
                <div><strong className="text-[#8A8A82]">CPF:</strong> {patientToDelete.cpf}</div>
                <div><strong className="text-[#8A8A82]">Profissional:</strong> {patientToDelete.assigned_professional_name}</div>
              </div>

              <div className="bg-[#F5EFE6] border border-[#EADFCB] p-3 rounded-lg text-[#8C6D3B] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-[#8C6D3B] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Atenção ao Histórico Clínico:</p>
                  <p className="text-[11px] leading-relaxed">
                    Ao confirmar a exclusão, todos os agendamentos na agenda, lembretes automáticos e evoluções em prontuário associados a este paciente serão removidos da base de dados ativa e auditados.
                  </p>
                </div>
              </div>

              {deleteError && (
                <div className="bg-[#F9ECEB] border border-[#ECD1CF] p-3 rounded-lg text-[#9E3E3E] text-xs font-semibold">
                  {deleteError}
                </div>
              )}
            </div>

            <div className="p-4 bg-[#F2F0EA] border-t border-[#E5E2D9] flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setPatientToDelete(null);
                  setDeleteError(null);
                }}
                className="px-4 py-2 bg-white hover:bg-[#E5E2D9] text-[#3D3D39] rounded-lg text-xs font-semibold cursor-pointer border border-[#E5E2D9] min-h-[38px]"
              >
                Cancelar
              </button>
              <button
                id="btn-confirm-delete-patient"
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-[#9E3E3E] hover:bg-[#853434] text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs min-h-[38px] flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Excluindo...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Sim, Excluir Paciente</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
