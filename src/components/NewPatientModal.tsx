import React, { useState, useEffect } from 'react';
import { User, TreatmentStatus } from '../types';
import {
  X,
  UserPlus,
  Repeat,
  MapPin,
  Video,
} from 'lucide-react';
import { getAuthHeaders } from '../utils/auth';

interface NewPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  allUsers: User[];
  currentUser: User;
  onCreated: () => void;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' },
];

export const NewPatientModal: React.FC<NewPatientModalProps> = ({
  isOpen,
  onClose,
  allUsers,
  currentUser,
  onCreated,
}) => {
  const professionals = allUsers.filter((u) => u.role === 'PROFESSIONAL' || u.role === 'ADMIN');

  // Tipo de Vínculo: 1ª Sessão / Avaliação Inicial vs Paciente já em Tratamento Contínuo
  const [treatmentStatus, setTreatmentStatus] = useState<TreatmentStatus>('PRIMEIRA_SESSAO');

  // Dados Cadastrais Básicos
  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState('1996-06-15');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('Feminino');
  const [address, setAddress] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [assignedProfessionalId, setAssignedProfessionalId] = useState(
    currentUser.role === 'PROFESSIONAL' ? currentUser.id : professionals[0]?.id || ''
  );
  const [mainComplaint, setMainComplaint] = useState('');

  // Configuração para Paciente Antigo / Já em Tratamento Contínuo (gera horário semanal no calendário)
  const [recurringDayOfWeek, setRecurringDayOfWeek] = useState<number>(2); // Terça-feira
  const [recurringTime, setRecurringTime] = useState<string>('14:00');
  const recurringDuration = 50;
  const [recurringSessionType, setRecurringSessionType] = useState<'PRESENCIAL' | 'ONLINE'>('PRESENCIAL');
  const [recurringWeeks, setRecurringWeeks] = useState<number>(8);

  // Configuração para 1ª Sessão / Avaliação Inicial
  const [scheduleFirstNow, setScheduleFirstNow] = useState<boolean>(false);
  const [firstSessionDate, setFirstSessionDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [firstSessionTime, setFirstSessionTime] = useState<string>('14:00');
  const [firstSessionType, setFirstSessionType] = useState<'PRESENCIAL' | 'ONLINE'>('PRESENCIAL');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (currentUser.role === 'PROFESSIONAL') {
        setAssignedProfessionalId(currentUser.id);
      } else if (!assignedProfessionalId || !professionals.some((p) => p.id === assignedProfessionalId)) {
        setAssignedProfessionalId(professionals[0]?.id || '');
      }
      setError(null);
    }
  }, [isOpen, currentUser.id, currentUser.role, professionals]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const selectedDayLabel =
        DAYS_OF_WEEK.find((d) => d.value === Number(recurringDayOfWeek))?.label || 'Semanal';

      const payload: any = {
        full_name: fullName,
        cpf,
        birth_date: birthDate,
        phone,
        email,
        gender,
        address,
        emergency_contact: {
          name: emergencyName,
          relationship: emergencyRelation,
          phone: emergencyPhone,
        },
        assigned_professional_id: assignedProfessionalId,
        main_complaint: mainComplaint,
        treatment_status: treatmentStatus,
      };

      if (treatmentStatus === 'ATIVO_CONTINUO') {
        payload.recurring_schedule = {
          day_of_week: Number(recurringDayOfWeek),
          day_name: selectedDayLabel,
          time: recurringTime,
          duration_minutes: Number(recurringDuration),
          session_type: recurringSessionType,
        };
        payload.generate_continuous_appointments = true;
        payload.weeks_count = Number(recurringWeeks);
      } else if (treatmentStatus === 'PRIMEIRA_SESSAO' && scheduleFirstNow) {
        payload.first_appointment = {
          session_date: firstSessionDate,
          start_time: firstSessionTime,
          duration_minutes: 50,
          session_type: firstSessionType,
          notes: 'Primeira sessão / Avaliação Inicial agendada no cadastro.',
        };
      }

      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }, undefined, currentUser.id),
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || 'Falha ao cadastrar paciente.');

      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro inesperado ao cadastrar paciente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#2D2D2A]/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-xl w-full shadow-2xl border border-[#E5E2D9] max-h-[94vh] sm:max-h-[88vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Mobile drag handle */}
        <div className="pt-2 sm:hidden flex justify-center bg-[#F2F0EA]">
          <div className="w-12 h-1 bg-[#D1CEC3] rounded-full"></div>
        </div>

        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-[#E5E2D9] flex items-center justify-between bg-[#F2F0EA] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#E5E2D9] text-[#5A5A40] flex items-center justify-center shrink-0">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-serif italic font-bold text-[#3D3D39]">
                Novo Paciente
              </h2>
              <p className="text-xs text-[#8A8A82]">
                Cadastro em conformidade com o enquadre terapêutico e LGPD
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#8A8A82] hover:text-[#3D3D39] p-1.5 rounded-lg hover:bg-[#E5E2D9] cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-[#FAF7F2] text-[#8C4A3B] border border-[#EADFCB] text-xs rounded-lg">
              {error}
            </div>
          )}

          {/* 1. SELETOR DE VÍNCULO / TIPO DE PACIENTE */}
          <div>
            <label className="block text-xs font-bold text-[#3D3D39] mb-2 uppercase tracking-wide">
              Tipo de Entrada / Vínculo com a Agenda *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Opção 1: Primeira Sessão */}
              <button
                type="button"
                onClick={() => setTreatmentStatus('PRIMEIRA_SESSAO')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  treatmentStatus === 'PRIMEIRA_SESSAO'
                    ? 'bg-[#FAF9F5] border-[#5A5A40] ring-2 ring-[#5A5A40]/20 shadow-xs'
                    : 'bg-white border-[#E5E2D9] hover:bg-[#F2F0EA]/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-[#3D3D39] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#5A5A40]"></span>
                      1ª Sessão / Avaliação
                    </span>
                    <span className="text-[10px] bg-[#E5E2D9] text-[#5A5A40] px-1.5 py-0.5 rounded font-bold">
                      Novo
                    </span>
                  </div>
                  <p className="text-[11px] text-[#8A8A82] leading-tight">
                    Não agenda semanas futuras automaticamente. Se o paciente não continuar, fica apenas no histórico sem prender horários.
                  </p>
                </div>
              </button>

              {/* Opção 2: Paciente Já Contínuo */}
              <button
                type="button"
                onClick={() => setTreatmentStatus('ATIVO_CONTINUO')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  treatmentStatus === 'ATIVO_CONTINUO'
                    ? 'bg-[#E8F0E6]/50 border-[#3D5A3D] ring-2 ring-[#3D5A3D]/20 shadow-xs'
                    : 'bg-white border-[#E5E2D9] hover:bg-[#F2F0EA]/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-[#2D452D] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#3D5A3D]"></span>
                      Paciente Já Contínuo
                    </span>
                    <span className="text-[10px] bg-[#3D5A3D] text-white px-1.5 py-0.5 rounded font-bold">
                      Semanal
                    </span>
                  </div>
                  <p className="text-[11px] text-[#5A6E5A] leading-tight">
                    Paciente antigo ou já em tratamento regular. Já gera e exibe seus horários fixos continuamente no calendário semanal.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* PAINEL DINÂMICO CONFORME A ESCOLHA */}
          {treatmentStatus === 'ATIVO_CONTINUO' ? (
            <div className="p-3.5 bg-[#E8F0E6]/30 border border-[#D6E2D4] rounded-xl space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#2D452D]">
                <Repeat className="w-4 h-4 text-[#3D5A3D]" />
                Definir Horário Fixo Semanal no Calendário:
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-[#3D3D39] mb-1">
                    Dia Fixo da Semana *
                  </label>
                  <select
                    value={recurringDayOfWeek}
                    onChange={(e) => setRecurringDayOfWeek(Number(e.target.value))}
                    className="w-full text-xs bg-white border border-[#E5E2D9] rounded-lg p-2 text-[#2D2D2A] focus:border-[#3D5A3D]"
                  >
                    {DAYS_OF_WEEK.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#3D3D39] mb-1">
                    Horário da Sessão *
                  </label>
                  <input
                    type="time"
                    required
                    value={recurringTime}
                    onChange={(e) => setRecurringTime(e.target.value)}
                    className="w-full text-xs bg-white border border-[#E5E2D9] rounded-lg p-2 text-[#2D2D2A] focus:border-[#3D5A3D]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-[#3D3D39] mb-1">
                    Modalidade
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setRecurringSessionType('PRESENCIAL')}
                      className={`py-1.5 px-2 text-xs rounded-md border flex items-center justify-center gap-1 cursor-pointer ${
                        recurringSessionType === 'PRESENCIAL'
                          ? 'bg-[#3D5A3D] text-white border-[#3D5A3D] font-semibold'
                          : 'bg-white text-[#5A5A40] border-[#E5E2D9]'
                      }`}
                    >
                      <MapPin className="w-3 h-3" /> Presencial
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecurringSessionType('ONLINE')}
                      className={`py-1.5 px-2 text-xs rounded-md border flex items-center justify-center gap-1 cursor-pointer ${
                        recurringSessionType === 'ONLINE'
                          ? 'bg-[#5A5A40] text-white border-[#5A5A40] font-semibold'
                          : 'bg-white text-[#5A5A40] border-[#E5E2D9]'
                      }`}
                    >
                      <Video className="w-3 h-3" /> Online
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#3D3D39] mb-1">
                    Projetar no Calendário
                  </label>
                  <select
                    value={recurringWeeks}
                    onChange={(e) => setRecurringWeeks(Number(e.target.value))}
                    className="w-full text-xs bg-white border border-[#E5E2D9] rounded-lg p-2 text-[#2D2D2A]"
                  >
                    <option value={4}>Próximas 4 semanas (1 mês)</option>
                    <option value={8}>Próximas 8 semanas (2 meses)</option>
                    <option value={12}>Próximas 12 semanas (3 meses)</option>
                  </select>
                </div>
              </div>

              <p className="text-[11px] text-[#3D5A3D] font-medium">
                ✓ Ao cadastrar, as sessões aparecerão automaticamente em todas as semanas correspondentes na grade do calendário.
              </p>
            </div>
          ) : (
            <div className="p-3.5 bg-[#FAF9F5] border border-[#E5E2D9] rounded-xl space-y-2.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={scheduleFirstNow}
                  onChange={(e) => setScheduleFirstNow(e.target.checked)}
                  className="rounded border-[#C4C0B3] text-[#5A5A40] focus:ring-[#5A5A40]"
                />
                <span className="text-xs font-semibold text-[#3D3D39]">
                  Já agendar a data da 1ª sessão agora no calendário
                </span>
              </label>

              {scheduleFirstNow ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1.5">
                  <div>
                    <label className="block text-[11px] font-medium text-[#8A8A82] mb-1">Data</label>
                    <input
                      type="date"
                      required={scheduleFirstNow}
                      value={firstSessionDate}
                      onChange={(e) => setFirstSessionDate(e.target.value)}
                      className="w-full text-xs bg-white border border-[#E5E2D9] rounded-lg p-2 text-[#2D2D2A]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#8A8A82] mb-1">Horário</label>
                    <input
                      type="time"
                      required={scheduleFirstNow}
                      value={firstSessionTime}
                      onChange={(e) => setFirstSessionTime(e.target.value)}
                      className="w-full text-xs bg-white border border-[#E5E2D9] rounded-lg p-2 text-[#2D2D2A]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#8A8A82] mb-1">Tipo</label>
                    <select
                      value={firstSessionType}
                      onChange={(e) => setFirstSessionType(e.target.value as any)}
                      className="w-full text-xs bg-white border border-[#E5E2D9] rounded-lg p-2 text-[#2D2D2A]"
                    >
                      <option value="PRESENCIAL">Presencial</option>
                      <option value="ONLINE">Online</option>
                    </select>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-[#8A8A82]">
                  Você também pode agendar a 1ª sessão posteriormente clicando diretamente em qualquer horário livre do calendário.
                </p>
              )}
            </div>
          )}

          {/* DADOS PESSOAIS */}
          <div>
            <label className="block text-xs font-semibold text-[#3D3D39] mb-1">
              Nome Completo *
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ex: Matheus Silveira Lima"
              className="w-full text-sm bg-[#F2F0EA] border border-[#E5E2D9] rounded-lg p-2.5 focus:border-[#5A5A40] focus:outline-hidden text-[#2D2D2A] placeholder:text-[#8A8A82]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#3D3D39] mb-1">CPF *</label>
              <input
                type="text"
                required
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                placeholder="000.000.000-00"
                className="w-full text-sm bg-[#F2F0EA] border border-[#E5E2D9] rounded-lg p-2.5 focus:border-[#5A5A40] focus:outline-hidden text-[#2D2D2A] placeholder:text-[#8A8A82]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#3D3D39] mb-1">
                Data de Nascimento *
              </label>
              <input
                type="date"
                required
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full text-sm bg-[#F2F0EA] border border-[#E5E2D9] rounded-lg p-2.5 focus:border-[#5A5A40] focus:outline-hidden text-[#2D2D2A]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#3D3D39] mb-1">
                Telefone WhatsApp *
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 98765-4321"
                className="w-full text-sm bg-[#F2F0EA] border border-[#E5E2D9] rounded-lg p-2.5 focus:border-[#5A5A40] focus:outline-hidden text-[#2D2D2A] placeholder:text-[#8A8A82]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#3D3D39] mb-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="paciente@email.com"
                className="w-full text-sm bg-[#F2F0EA] border border-[#E5E2D9] rounded-lg p-2.5 focus:border-[#5A5A40] focus:outline-hidden text-[#2D2D2A] placeholder:text-[#8A8A82]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#3D3D39] mb-1">Gênero</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full text-sm bg-[#F2F0EA] border border-[#E5E2D9] rounded-lg p-2.5 focus:border-[#5A5A40] focus:outline-hidden text-[#2D2D2A]"
              >
                <option value="Feminino">Feminino</option>
                <option value="Masculino">Masculino</option>
                <option value="Não-Binário">Não-Binário</option>
                <option value="Outro">Outro</option>
                <option value="Prefiro não informar">Prefiro não informar</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#3D3D39] mb-1">
                Profissional Vinculado *
              </label>
              <select
                value={assignedProfessionalId}
                onChange={(e) => setAssignedProfessionalId(e.target.value)}
                required
                className="w-full text-sm bg-[#F2F0EA] border border-[#E5E2D9] rounded-lg p-2.5 focus:border-[#5A5A40] focus:outline-hidden text-[#2D2D2A]"
              >
                {professionals.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.council_number || u.specialty})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#3D3D39] mb-1">
              Endereço Residencial
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Rua, número, bairro, cidade/UF"
              className="w-full text-sm bg-[#F2F0EA] border border-[#E5E2D9] rounded-lg p-2.5 focus:border-[#5A5A40] focus:outline-hidden text-[#2D2D2A] placeholder:text-[#8A8A82]"
            />
          </div>

          {/* Contato de Emergência */}
          <div className="bg-[#F2F0EA] p-3.5 rounded-xl border border-[#E5E2D9] space-y-2">
            <span className="text-xs font-bold text-[#3D3D39] block">
              Contato de Emergência (Obrigatório Clínico)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                value={emergencyName}
                onChange={(e) => setEmergencyName(e.target.value)}
                placeholder="Nome do contato"
                className="text-xs bg-white border border-[#E5E2D9] rounded-md p-2.5 text-[#2D2D2A] placeholder:text-[#8A8A82] min-h-[38px]"
              />
              <input
                type="text"
                value={emergencyRelation}
                onChange={(e) => setEmergencyRelation(e.target.value)}
                placeholder="Parentesco (ex: Esposo)"
                className="text-xs bg-white border border-[#E5E2D9] rounded-md p-2.5 text-[#2D2D2A] placeholder:text-[#8A8A82] min-h-[38px]"
              />
              <input
                type="text"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                placeholder="Telefone"
                className="text-xs bg-white border border-[#E5E2D9] rounded-md p-2.5 text-[#2D2D2A] placeholder:text-[#8A8A82] min-h-[38px]"
              />
            </div>
          </div>

          {/* Queixa preliminar */}
          <div>
            <label className="block text-xs font-semibold text-[#3D3D39] mb-1">
              Motivo do Acolhimento / Queixa Inicial
            </label>
            <textarea
              rows={2}
              value={mainComplaint}
              onChange={(e) => setMainComplaint(e.target.value)}
              placeholder="Ex: Procura acompanhamento por estresse ocupacional e ansiedade..."
              className="w-full text-xs bg-[#F2F0EA] border border-[#E5E2D9] rounded-lg p-2.5 focus:border-[#5A5A40] focus:outline-hidden text-[#2D2D2A] placeholder:text-[#8A8A82]"
            />
          </div>

          <div className="pt-3 border-t border-[#E5E2D9] flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-xs font-semibold text-[#3D3D39] hover:bg-[#F2F0EA] rounded-lg border border-[#E5E2D9] cursor-pointer min-h-[40px] sm:min-h-0"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full sm:w-auto px-5 py-2.5 sm:py-2 text-xs font-semibold rounded-lg shadow-xs flex items-center justify-center gap-1.5 cursor-pointer min-h-[42px] sm:min-h-0 text-white ${
                treatmentStatus === 'ATIVO_CONTINUO'
                  ? 'bg-[#3D5A3D] hover:bg-[#2F452F]'
                  : 'bg-[#5A5A40] hover:bg-[#484833]'
              }`}
            >
              {isSubmitting
                ? 'Salvando...'
                : treatmentStatus === 'ATIVO_CONTINUO'
                ? 'Salvar e Gerar Agenda Contínua'
                : 'Salvar Paciente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
