import React, { useState } from 'react';
import { Patient, User } from '../types';
import { X, Calendar, CheckCircle2, AlertCircle, Clock, Repeat, MapPin, Video, Sparkles } from 'lucide-react';
import { getAuthHeaders } from '../utils/auth';

interface ActivateContinuousModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
  currentUser: User;
  allUsers: User[];
  onSuccess: () => void;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' },
];

export const ActivateContinuousModal: React.FC<ActivateContinuousModalProps> = ({
  isOpen,
  onClose,
  patient,
  currentUser,
  allUsers,
  onSuccess,
}) => {
  const professionals = allUsers.filter((u) => u.role === 'PROFESSIONAL' || u.role === 'ADMIN');

  const [dayOfWeek, setDayOfWeek] = useState<number>(2); // Terça-feira default
  const [time, setTime] = useState<string>('14:00');
  const [durationMinutes, setDurationMinutes] = useState<number>(50);
  const [sessionType, setSessionType] = useState<'PRESENCIAL' | 'ONLINE'>('PRESENCIAL');
  const [professionalId, setProfessionalId] = useState<string>(
    patient?.assigned_professional_id || (currentUser.role === 'PROFESSIONAL' ? currentUser.id : professionals[0]?.id || '')
  );
  const [weeksCount, setWeeksCount] = useState<number>(8);
  const [notes, setNotes] = useState<string>('Sessão semanal contínua em acompanhamento');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (patient) {
      setProfessionalId(
        patient.assigned_professional_id ||
        (currentUser.role === 'PROFESSIONAL' ? currentUser.id : professionals[0]?.id || '')
      );
      setError(null);
    }
  }, [patient, currentUser.id, currentUser.role]);

  if (!isOpen || !patient) return null;

  const selectedDayLabel = DAYS_OF_WEEK.find((d) => d.value === Number(dayOfWeek))?.label || 'Semanal';

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/patients/${patient.id}/activate-continuous`, {
        method: 'PATCH',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }, undefined, currentUser.id),
        body: JSON.stringify({
          day_of_week: Number(dayOfWeek),
          day_name: selectedDayLabel,
          time,
          duration_minutes: Number(durationMinutes),
          session_type: sessionType,
          professional_id: professionalId,
          weeks_count: Number(weeksCount),
          notes,
          generate_appointments: true,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Falha ao ativar paciente como contínuo.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro inesperado ao ativar paciente contínuo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#2D2D2A]/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-lg w-full shadow-2xl border border-[#E5E2D9] max-h-[92vh] sm:max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E5E2D9] flex items-center justify-between bg-[#F2F0EA] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#3D5A3D]/10 text-[#3D5A3D] flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-serif italic font-bold text-[#3D3D39]">
                Ativar Tratamento Contínuo
              </h2>
              <p className="text-xs text-[#8A8A82]">
                Definir horário fixo e gerar agenda semanal para {patient.full_name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#8A8A82] hover:text-[#3D3D39] p-1.5 rounded-lg hover:bg-[#E5E2D9] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Explicação da Regra de Negócio */}
        <div className="p-4 bg-[#E8F0E6]/50 border-b border-[#D6E2D4] px-5 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-[#3D5A3D] shrink-0 mt-0.5" />
          <div className="text-xs text-[#2F452F] leading-relaxed">
            <strong className="font-semibold text-[#1F331F] block mb-0.5">
              Passagem da 1ª Sessão para Acompanhamento Contínuo
            </strong>
            Após a avaliação inicial realizada, ao cadastrar o paciente como ativo contínuo, o sistema reserva o horário fixo semanal dele e preenche automaticamente o calendário para as próximas semanas.
          </div>
        </div>

        {/* Formulário */}
        <form onSubmit={handleActivate} className="p-5 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-[#FAF7F2] text-[#8C4A3B] border border-[#EADFCB] text-xs rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#3D3D39] mb-1">
              Profissional Responsável *
            </label>
            <select
              value={professionalId}
              onChange={(e) => setProfessionalId(e.target.value)}
              required
              className="w-full text-xs sm:text-sm bg-[#F2F0EA] border border-[#E5E2D9] rounded-lg p-2.5 focus:border-[#5A5A40] focus:outline-hidden text-[#2D2D2A]"
            >
              {professionals.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.council_number || u.specialty})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#3D3D39] mb-1">
                Dia Fixo da Semana *
              </label>
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(Number(e.target.value))}
                className="w-full text-xs sm:text-sm bg-[#F2F0EA] border border-[#E5E2D9] rounded-lg p-2.5 focus:border-[#5A5A40] focus:outline-hidden text-[#2D2D2A]"
              >
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#3D3D39] mb-1">
                Horário da Sessão *
              </label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full text-xs sm:text-sm bg-[#F2F0EA] border border-[#E5E2D9] rounded-lg p-2.5 focus:border-[#5A5A40] focus:outline-hidden text-[#2D2D2A]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#3D3D39] mb-1">
                Modalidade de Atendimento
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSessionType('PRESENCIAL')}
                  className={`py-2 px-3 text-xs rounded-lg border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    sessionType === 'PRESENCIAL'
                      ? 'bg-[#3D5A3D] text-white border-[#3D5A3D] font-semibold shadow-2xs'
                      : 'bg-[#F2F0EA] text-[#5A5A40] border-[#E5E2D9] hover:bg-[#EAE7DF]'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  Presencial
                </button>
                <button
                  type="button"
                  onClick={() => setSessionType('ONLINE')}
                  className={`py-2 px-3 text-xs rounded-lg border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    sessionType === 'ONLINE'
                      ? 'bg-[#5A5A40] text-white border-[#5A5A40] font-semibold shadow-2xs'
                      : 'bg-[#F2F0EA] text-[#5A5A40] border-[#E5E2D9] hover:bg-[#EAE7DF]'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  Online
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#3D3D39] mb-1">
                Semanas a Projetar no Calendário
              </label>
              <select
                value={weeksCount}
                onChange={(e) => setWeeksCount(Number(e.target.value))}
                className="w-full text-xs sm:text-sm bg-[#F2F0EA] border border-[#E5E2D9] rounded-lg p-2.5 focus:border-[#5A5A40] focus:outline-hidden text-[#2D2D2A]"
              >
                <option value={4}>4 semanas (1 mês)</option>
                <option value={8}>8 semanas (2 meses - Recomendado)</option>
                <option value={12}>12 semanas (3 meses)</option>
                <option value={16}>16 semanas (4 meses)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#3D3D39] mb-1">
              Observações Clínicas / Enquadre
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Sessão semanal contínua às terças..."
              className="w-full text-xs bg-[#F2F0EA] border border-[#E5E2D9] rounded-lg p-2.5 focus:border-[#5A5A40] focus:outline-hidden text-[#2D2D2A]"
            />
          </div>

          {/* Resumo do que será criado */}
          <div className="p-3 bg-[#FAF9F5] border border-[#E5E2D9] rounded-xl text-xs space-y-1 text-[#5A5A40]">
            <div className="font-semibold text-[#3D3D39] flex items-center gap-1.5">
              <Repeat className="w-3.5 h-3.5 text-[#3D5A3D]" />
              Resumo da Agenda Contínua:
            </div>
            <div>
              • <strong>Toda {selectedDayLabel}</strong> às <strong>{time}</strong> ({durationMinutes} min) - {sessionType}
            </div>
            <div>
              • <strong>{weeksCount} sessões</strong> serão criadas imediatamente no calendário semanal
            </div>
            <div>
              • Lembretes automáticos via WhatsApp serão agendados para 24h antes de cada sessão
            </div>
          </div>

          {/* Botões */}
          <div className="pt-3 border-t border-[#E5E2D9] flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#3D3D39] hover:bg-[#F2F0EA] rounded-lg border border-[#E5E2D9] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold bg-[#3D5A3D] hover:bg-[#2F452F] text-white rounded-lg shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting ? 'Gerando Sessões...' : 'Ativar e Gerar Calendário'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
