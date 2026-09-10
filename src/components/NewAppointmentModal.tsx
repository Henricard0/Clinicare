import React, { useState, useEffect } from 'react';
import { Patient, User } from '../types';
import {
  X,
  Calendar,
  Repeat,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Info,
} from 'lucide-react';
import { getAuthHeaders } from '../utils/auth';

interface NewAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: Patient[];
  allUsers: User[];
  currentUser: User;
  onCreated: () => void;
  initialPatientId?: string;
  initialDate?: string;
  initialTime?: string;
  onOpenActivateContinuous?: (patient: Patient) => void;
}

export const NewAppointmentModal: React.FC<NewAppointmentModalProps> = ({
  isOpen,
  onClose,
  patients,
  allUsers,
  currentUser,
  onCreated,
  initialPatientId,
  initialDate,
  initialTime,
  onOpenActivateContinuous,
}) => {
  const professionals = allUsers.filter((u) => u.role === 'PROFESSIONAL' || u.role === 'ADMIN');

  // Default values
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = tomorrow.toISOString().split('T')[0];

  const [patientId, setPatientId] = useState(initialPatientId || patients[0]?.id || '');
  const [professionalId, setProfessionalId] = useState(
    currentUser.role === 'PROFESSIONAL' ? currentUser.id : professionals[0]?.id || ''
  );
  const [sessionDate, setSessionDate] = useState(initialDate || defaultDate);
  const [startTime, setStartTime] = useState(initialTime || '14:00');
  const [durationMinutes, setDurationMinutes] = useState(50);
  const [sessionType, setSessionType] = useState<'PRESENCIAL' | 'ONLINE'>('PRESENCIAL');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceWeeks, setRecurrenceWeeks] = useState(8);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedPatient = patients.find((p) => p.id === patientId);
  const isFirstSessionPatient = selectedPatient?.treatment_status === 'PRIMEIRA_SESSAO';

  useEffect(() => {
    if (isOpen) {
      if (initialPatientId && patients.some((p) => p.id === initialPatientId)) {
        setPatientId(initialPatientId);
      } else if (!patientId || !patients.some((p) => p.id === patientId)) {
        setPatientId(patients[0]?.id || '');
      }

      if (initialDate) {
        setSessionDate(initialDate);
      } else {
        setSessionDate(defaultDate);
      }

      if (initialTime) {
        setStartTime(initialTime);
      }

      if (currentUser.role === 'PROFESSIONAL') {
        setProfessionalId(currentUser.id);
      } else if (!professionalId || !professionals.some((u) => u.id === professionalId)) {
        setProfessionalId(professionals[0]?.id || '');
      }
      setErrorMessage(null);
    }
  }, [isOpen, initialPatientId, initialDate, initialTime, currentUser.id, currentUser.role, patients, professionals, defaultDate]);

  // Se o paciente selecionado for de primeira sessão, desabilita a recorrência para não bloquear semanas futuras
  useEffect(() => {
    if (isFirstSessionPatient) {
      setIsRecurring(false);
    }
  }, [isFirstSessionPatient]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const startDateTime = `${sessionDate}T${startTime}:00`;
      const [hours, minutes] = startTime.split(':').map(Number);
      const endDate = new Date(`${sessionDate}T00:00:00`);
      endDate.setHours(hours);
      endDate.setMinutes(minutes + Number(durationMinutes));
      const endHours = String(endDate.getHours()).padStart(2, '0');
      const endMinutes = String(endDate.getMinutes()).padStart(2, '0');
      const endDateTime = `${sessionDate}T${endHours}:${endMinutes}:00`;

      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: getAuthHeaders(
          { 'Content-Type': 'application/json' },
          undefined,
          currentUser.id
        ),
        body: JSON.stringify({
          patient_id: patientId,
          professional_id: professionalId,
          start_time: startDateTime,
          end_time: endDateTime,
          session_type: sessionType,
          notes: notes || (isFirstSessionPatient ? '1ª Sessão / Avaliação Inicial' : ''),
          is_recurring: isFirstSessionPatient ? false : isRecurring,
          recurrence_weeks: recurrenceWeeks,
          is_first_session: isFirstSessionPatient,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Erro ao agendar consulta.');
      }

      onCreated();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha na comunicação com o servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#2D2D2A]/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-lg w-full shadow-2xl border border-[#E5E2D9] max-h-[92vh] sm:max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Mobile drag handle */}
        <div className="pt-2 sm:hidden flex justify-center bg-[#F2F0EA]">
          <div className="w-12 h-1 bg-[#D1CEC3] rounded-full"></div>
        </div>

        {/* Modal Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-[#E5E2D9] flex items-center justify-between bg-[#F2F0EA] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#E5E2D9] text-[#5A5A40] flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-serif italic font-bold text-[#3D3D39]">
                Novo Agendamento
              </h2>
              <p className="text-xs text-[#8A8A82]">
                Sincronização imediata no calendário e validação de conflitos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#8A8A82] hover:text-[#3D3D39] p-1.5 rounded-lg hover:bg-[#E5E2D9] transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3.5 sm:space-y-4 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="p-3 bg-[#FAF7F2] border border-[#EADFCB] rounded-lg text-xs text-[#8C4A3B] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-[#8C4A3B] shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Paciente */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-[#3D3D39]">
                Paciente <span className="text-[#8C4A3B]">*</span>
              </label>
              {selectedPatient && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isFirstSessionPatient
                      ? 'bg-[#F2E8D9] text-[#8C6020] border border-[#E5D5BC]'
                      : 'bg-[#E8F0E6] text-[#2F452F] border border-[#D6E2D4]'
                  }`}
                >
                  {isFirstSessionPatient ? '1ª Sessão / Avaliação' : '✓ Tratamento Contínuo'}
                </span>
              )}
            </div>
            <select
              id="select-appointment-patient"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              required
              className="w-full bg-[#F2F0EA] border border-[#E5E2D9] text-[#2D2D2A] text-sm rounded-lg p-2.5 focus:border-[#5A5A40] focus:outline-hidden"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name} ({p.treatment_status === 'PRIMEIRA_SESSAO' ? '1ª Sessão' : 'Contínuo'}) - {p.phone}
                </option>
              ))}
            </select>
          </div>

          {/* Alerta de Regra de Negócio sobre 1ª Sessão vs Contínuo */}
          {isFirstSessionPatient ? (
            <div className="p-3 bg-[#FAF9F5] border border-[#EADFCB] rounded-xl flex items-start gap-2.5 text-xs text-[#6E5730]">
              <Info className="w-4 h-4 text-[#8C6020] shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong className="font-semibold text-[#543E19] block mb-0.5">
                  1ª Sessão / Avaliação Inicial (Sessão Única)
                </strong>
                Este paciente está agendando a primeira consulta. Horários futuros não serão reservados nas próximas semanas para não bloquear a agenda caso ele não continue. Se após a consulta ele continuar, você poderá ativá-lo como paciente contínuo.
                {onOpenActivateContinuous && (
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedPatient) {
                        onClose();
                        onOpenActivateContinuous(selectedPatient);
                      }
                    }}
                    className="mt-1.5 text-xs font-semibold text-[#3D5A3D] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" /> Já é um paciente antigo? Ativar como Contínuo agora
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="p-2.5 bg-[#E8F0E6]/50 border border-[#D6E2D4] rounded-lg text-xs text-[#2F452F] flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#3D5A3D]" />
                Paciente ativo em tratamento contínuo
              </span>
              {selectedPatient?.recurring_schedule && (
                <span className="text-[11px] text-[#3D5A3D] font-bold">
                  Horário fixo: {selectedPatient.recurring_schedule.day_name}s às {selectedPatient.recurring_schedule.time}
                </span>
              )}
            </div>
          )}

          {/* Profissional Clínico */}
          <div>
            <label className="block text-xs font-semibold text-[#3D3D39] mb-1">
              Profissional Clínico / Terapeuta <span className="text-[#8C4A3B]">*</span>
            </label>
            <select
              id="select-appointment-professional"
              value={professionalId}
              onChange={(e) => setProfessionalId(e.target.value)}
              disabled={currentUser.role === 'PROFESSIONAL'}
              required
              className="w-full bg-[#F2F0EA] border border-[#E5E2D9] text-[#2D2D2A] text-sm rounded-lg p-2.5 focus:border-[#5A5A40] focus:outline-hidden disabled:bg-[#E5E2D9]/50 disabled:text-[#8A8A82]"
            >
              {professionals.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} - {u.council_number || u.specialty}
                </option>
              ))}
            </select>
            {currentUser.role === 'RECEPTION' && (
              <p className="text-[11px] text-[#5A5A40] mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> O profissional será notificado no painel assim que você agendar.
              </p>
            )}
          </div>

          {/* Data & Horário */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#3D3D39] mb-1">
                Data da Sessão <span className="text-[#8C4A3B]">*</span>
              </label>
              <input
                id="input-appointment-date"
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                required
                className="w-full bg-[#F2F0EA] border border-[#E5E2D9] text-[#2D2D2A] text-sm rounded-lg p-2.5 focus:border-[#5A5A40] focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#3D3D39] mb-1">
                Horário de Início <span className="text-[#8C4A3B]">*</span>
              </label>
              <input
                id="input-appointment-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full bg-[#F2F0EA] border border-[#E5E2D9] text-[#2D2D2A] text-sm rounded-lg p-2.5 focus:border-[#5A5A40] focus:outline-hidden"
              />
            </div>
          </div>

          {/* Duração & Modalidade */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#3D3D39] mb-1">Duração</label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full bg-[#F2F0EA] border border-[#E5E2D9] text-[#2D2D2A] text-sm rounded-lg p-2.5 focus:border-[#5A5A40] focus:outline-hidden"
              >
                <option value={50}>50 minutos (Padrão Psicologia)</option>
                <option value={60}>60 minutos (1 hora)</option>
                <option value={90}>90 minutos (Sessão Dupla)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#3D3D39] mb-1">Modalidade</label>
              <select
                value={sessionType}
                onChange={(e) => setSessionType(e.target.value as 'PRESENCIAL' | 'ONLINE')}
                className="w-full bg-[#F2F0EA] border border-[#E5E2D9] text-[#2D2D2A] text-sm rounded-lg p-2.5 focus:border-[#5A5A40] focus:outline-hidden"
              >
                <option value="PRESENCIAL">Presencial (Consultório)</option>
                <option value="ONLINE">Online (Teleconsulta)</option>
              </select>
            </div>
          </div>

          {/* Sessão Recorrente - Só permitida para pacientes de tratamento contínuo */}
          {!isFirstSessionPatient ? (
            <div className="bg-[#F2F0EA] border border-[#E5E2D9] rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    id="checkbox-recurring"
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    className="rounded text-[#5A5A40] focus:ring-[#5A5A40] w-4 h-4 accent-[#5A5A40]"
                  />
                  <span className="text-xs font-bold text-[#3D3D39] flex items-center gap-1.5">
                    <Repeat className="w-3.5 h-3.5 text-[#5A5A40]" /> Sessão Recorrente Semanal
                  </span>
                </label>
                {isRecurring && (
                  <span className="text-[11px] text-[#5A5A40] font-semibold bg-[#E5E2D9] px-2 py-0.5 rounded">
                    Toda semana no mesmo dia e horário
                  </span>
                )}
              </div>

              {isRecurring && (
                <div className="pt-2 border-t border-[#E5E2D9] flex items-center justify-between gap-3 text-xs">
                  <span className="text-[#8A8A82]">Repetir por quantas semanas?</span>
                  <select
                    value={recurrenceWeeks}
                    onChange={(e) => setRecurrenceWeeks(Number(e.target.value))}
                    className="bg-white border border-[#E5E2D9] rounded px-2 py-1 text-xs font-medium text-[#3D3D39]"
                  >
                    <option value={4}>4 semanas (1 mês)</option>
                    <option value={8}>8 semanas (2 meses)</option>
                    <option value={12}>12 semanas (3 meses)</option>
                  </select>
                </div>
              )}
            </div>
          ) : (
            <div className="p-2.5 bg-[#F2F0EA]/70 border border-[#E5E2D9] rounded-lg text-xs text-[#8A8A82] flex items-center justify-between">
              <span>Recorrência contínua desativada para 1ª sessão.</span>
              <span className="text-[10px] bg-[#E5E2D9] px-2 py-0.5 rounded font-medium text-[#5A5A40]">
                Sessão Única
              </span>
            </div>
          )}

          {/* Observações da Recepção */}
          <div>
            <label className="block text-xs font-semibold text-[#3D3D39] mb-1">
              Observações Administrativas (Visível na agenda)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Paciente solicitou recibo para reembolso do plano"
              className="w-full bg-[#F2F0EA] border border-[#E5E2D9] text-[#2D2D2A] text-sm rounded-lg p-2.5 focus:border-[#5A5A40] focus:outline-hidden placeholder:text-[#8A8A82]"
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-[#E5E2D9] flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 sm:py-2 border border-[#E5E2D9] text-[#3D3D39] text-xs font-semibold rounded-lg hover:bg-[#F2F0EA] transition-colors cursor-pointer min-h-[40px] sm:min-h-0"
            >
              Cancelar
            </button>
            <button
              id="btn-submit-appointment"
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-5 py-2.5 sm:py-2 bg-[#5A5A40] hover:bg-[#484833] text-white text-xs font-semibold rounded-lg shadow-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-60 cursor-pointer min-h-[42px] sm:min-h-0"
            >
              {isSubmitting ? 'Verificando & Agendando...' : 'Confirmar Agendamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
