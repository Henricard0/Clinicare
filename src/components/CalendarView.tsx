import React, { useState, useEffect, useMemo } from 'react';
import { Appointment, User, AppointmentStatus, Patient } from '../types';
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Filter,
  User as UserIcon,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Video,
  MapPin,
  Repeat,
  Phone,
  CalendarDays,
  List,
  FileText,
  ExternalLink,
  MessageCircle,
  Check,
  X,
  Sparkles,
  Info,
  GripVertical,
  ArrowRightLeft,
  CalendarClock,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

interface CalendarViewProps {
  currentUser: User;
  allUsers: User[];
  appointments: Appointment[];
  patients?: Patient[];
  onOpenNewAppointment: (date?: string, time?: string) => void;
  onUpdateStatus: (appointmentId: string, status: AppointmentStatus) => void;
  onRescheduleAppointment?: (
    appointmentId: string,
    newStartTime: string,
    newEndTime: string,
    newProfessionalId?: string
  ) => Promise<{ success: boolean; error?: string; message?: string }>;
  onOpenRecordForPatient?: (patientId: string) => void;
  onOpenActivateContinuous?: (patient: Patient) => void;
}

// Retorna a segunda-feira da semana de uma data
function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0 = Dom, 1 = Seg, ...
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// Formata data em YYYY-MM-DD local
function toLocalIsoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

export const CalendarView: React.FC<CalendarViewProps> = ({
  currentUser,
  allUsers,
  appointments,
  patients = [],
  onOpenNewAppointment,
  onUpdateStatus,
  onRescheduleAppointment,
  onOpenRecordForPatient,
  onOpenActivateContinuous,
}) => {
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [selectedMonday, setSelectedMonday] = useState<Date>(() => getMonday(new Date()));
  const [selectedProfessionalFilter, setSelectedProfessionalFilter] = useState<string>(
    currentUser.role === 'PROFESSIONAL' ? currentUser.id : 'ALL'
  );
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [modalityFilter, setModalityFilter] = useState<string>('ALL');

  // Mobile: dia selecionado na barra de dias da semana (0 = seg, 1 = ter, ...)
  const [mobileSelectedDayIndex, setMobileSelectedDayIndex] = useState<number>(() => {
    const today = new Date().getDay();
    return today === 0 ? 6 : today - 1; // 0 = seg, 6 = dom
  });
  const [mobileForceFullGrid, setMobileForceFullGrid] = useState<boolean>(false);

  // Modal de Detalhes da Consulta
  const [selectedAppointmentDetail, setSelectedAppointmentDetail] = useState<Appointment | null>(null);

  // Drag-and-Drop & Remanejamento Manual
  const [draggedAppointment, setDraggedAppointment] = useState<Appointment | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<{ dayIso: string; hour: number } | null>(null);
  const [pendingReschedule, setPendingReschedule] = useState<{
    appointment: Appointment;
    newDayIso: string;
    newDayName: string;
    newHourStr: string;
    newStartTime: string;
    newEndTime: string;
    targetProfessionalId: string;
    targetProfessionalName: string;
  } | null>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleFeedback, setRescheduleFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Remanejamento Manual dentro do Modal de Detalhes
  const [isManualRescheduleOpen, setIsManualRescheduleOpen] = useState(false);
  const [manualDate, setManualDate] = useState('');
  const [manualTime, setManualTime] = useState('09:00');
  const [manualProfessionalId, setManualProfessionalId] = useState('');

  // Sincroniza campos manuais ao abrir uma consulta
  useEffect(() => {
    if (selectedAppointmentDetail) {
      const [datePart, timePart] = selectedAppointmentDetail.start_time.split('T');
      setManualDate(datePart || '');
      setManualTime(timePart?.substring(0, 5) || '09:00');
      setManualProfessionalId(selectedAppointmentDetail.professional_id);
      setIsManualRescheduleOpen(false);
      setRescheduleFeedback(null);
    }
  }, [selectedAppointmentDetail]);

  useEffect(() => {
    setSelectedProfessionalFilter(currentUser.role === 'PROFESSIONAL' ? currentUser.id : 'ALL');
  }, [currentUser.id, currentUser.role]);

  const professionals = allUsers.filter((u) => u.role === 'PROFESSIONAL' || u.role === 'ADMIN');

  // Cálculo dos 7 dias da semana
  const weekDays = useMemo(() => {
    const days = [];
    const todayIso = toLocalIsoDate(new Date());

    const dayNames = [
      { full: 'Segunda-feira', short: 'Seg' },
      { full: 'Terça-feira', short: 'Ter' },
      { full: 'Quarta-feira', short: 'Qua' },
      { full: 'Quinta-feira', short: 'Qui' },
      { full: 'Sexta-feira', short: 'Sex' },
      { full: 'Sábado', short: 'Sáb' },
      { full: 'Domingo', short: 'Dom' },
    ];

    for (let i = 0; i < 7; i++) {
      const d = new Date(selectedMonday);
      d.setDate(selectedMonday.getDate() + i);
      const iso = toLocalIsoDate(d);
      days.push({
        dateObj: d,
        iso,
        dayNumber: d.getDate(),
        monthNumber: d.getMonth() + 1,
        dayName: dayNames[i].full,
        dayShort: dayNames[i].short,
        isToday: iso === todayIso,
      });
    }
    return days;
  }, [selectedMonday]);

  // Filtragem de agendamentos
  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      if (currentUser.role === 'PROFESSIONAL' && apt.professional_id !== currentUser.id) {
        return false;
      }
      if (selectedProfessionalFilter !== 'ALL' && apt.professional_id !== selectedProfessionalFilter) {
        return false;
      }
      if (statusFilter !== 'ALL' && apt.status !== statusFilter) {
        return false;
      }
      if (modalityFilter !== 'ALL' && apt.session_type !== modalityFilter) {
        return false;
      }
      return true;
    });
  }, [appointments, currentUser.role, currentUser.id, selectedProfessionalFilter, statusFilter, modalityFilter]);

  // Agendamentos da semana ativa
  const weekAppointments = useMemo(() => {
    const weekIsoSet = new Set(weekDays.map((d) => d.iso));
    return filteredAppointments.filter((apt) => {
      const aptDate = apt.start_time.split('T')[0];
      return weekIsoSet.has(aptDate);
    });
  }, [filteredAppointments, weekDays]);

  // Mapa rápido [data][hora] => Appointment[]
  const appointmentsByDayAndHour = useMemo(() => {
    const map: Record<string, Record<number, Appointment[]>> = {};

    weekDays.forEach((d) => {
      map[d.iso] = {};
      HOURS.forEach((h) => {
        map[d.iso][h] = [];
      });
    });

    weekAppointments.forEach((apt) => {
      const [datePart, timePart] = apt.start_time.split('T');
      if (map[datePart]) {
        const hour = parseInt(timePart?.split(':')[0] || '0', 10);
        if (map[datePart][hour]) {
          map[datePart][hour].push(apt);
        } else {
          // Se for fora das horas padrões (ex: 07h), agrupa na hora mais próxima
          const targetHour = Math.max(8, Math.min(20, hour));
          if (!map[datePart][targetHour]) map[datePart][targetHour] = [];
          map[datePart][targetHour].push(apt);
        }
      }
    });

    return map;
  }, [weekDays, weekAppointments]);

  // Contagem de pacientes por dia
  const patientCountByDay = useMemo(() => {
    const counts: Record<string, number> = {};
    weekDays.forEach((d) => {
      counts[d.iso] = weekAppointments.filter((apt) => apt.start_time.startsWith(d.iso)).length;
    });
    return counts;
  }, [weekDays, weekAppointments]);

  const handlePrevWeek = () => {
    const prev = new Date(selectedMonday);
    prev.setDate(prev.getDate() - 7);
    setSelectedMonday(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(selectedMonday);
    next.setDate(next.getDate() + 7);
    setSelectedMonday(next);
  };

  const handleTodayWeek = () => {
    setSelectedMonday(getMonday(new Date()));
    const today = new Date().getDay();
    setMobileSelectedDayIndex(today === 0 ? 6 : today - 1);
  };

  const getStatusBadge = (status: AppointmentStatus) => {
    switch (status) {
      case 'AGENDADO':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[#F2F0EA] text-[#5A5A40] border border-[#E5E2D9]">
            Agendado
          </span>
        );
      case 'CONFIRMADO':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[#E8F0E6] text-[#3D5A3D] border border-[#CDE0CB]">
            <CheckCircle className="w-3 h-3 text-[#3D5A3D]" /> Confirmado
          </span>
        );
      case 'REALIZADO':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[#EAE8F0] text-[#4A3D5A] border border-[#D5CDE0]">
            Realizado
          </span>
        );
      case 'CANCELADO':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[#F2F0EA] text-[#8A8A82] line-through border border-[#E5E2D9]">
            Cancelado
          </span>
        );
      case 'FALTOU':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[#F9ECEB] text-[#9E3E3E] border border-[#ECD1CF]">
            <XCircle className="w-3 h-3 text-[#9E3E3E]" /> Faltou
          </span>
        );
    }
  };

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    const date = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', weekday: 'short' });
    const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return { date, time };
  };

  const weekLabel = useMemo(() => {
    const start = weekDays[0];
    const end = weekDays[6];
    const startMonth = start.dateObj.toLocaleDateString('pt-BR', { month: 'short' });
    const endMonth = end.dateObj.toLocaleDateString('pt-BR', { month: 'short' });
    const year = end.dateObj.getFullYear();

    if (start.dateObj.getMonth() === end.dateObj.getMonth()) {
      return `${start.dayNumber} a ${end.dayNumber} de ${end.dateObj.toLocaleDateString('pt-BR', { month: 'long' })} de ${year}`;
    }
    return `${start.dayNumber} de ${startMonth} a ${end.dayNumber} de ${endMonth} de ${year}`;
  }, [weekDays]);

  const handleDropSlot = (dayIso: string, hourNum: number, dayName: string) => {
    if (!draggedAppointment) return;
    const hourStr = `${String(hourNum).padStart(2, '0')}:00`;

    // Evita reagendar para exatamente o mesmo dia e horário
    const currentDay = draggedAppointment.start_time.split('T')[0];
    const currentHour = parseInt(draggedAppointment.start_time.split('T')[1]?.split(':')[0] || '0', 10);
    if (currentDay === dayIso && currentHour === hourNum) {
      setDraggedAppointment(null);
      setDragOverSlot(null);
      return;
    }

    const origStartMs = new Date(draggedAppointment.start_time).getTime();
    const origEndMs = new Date(draggedAppointment.end_time).getTime();
    const durationMs = Math.max(30 * 60 * 1000, origEndMs - origStartMs || 50 * 60 * 1000);

    const newStartIso = `${dayIso}T${hourStr}:00`;
    const newStartMs = new Date(newStartIso).getTime();
    const newEndIso = new Date(newStartMs + durationMs).toISOString().replace('Z', '');

    setPendingReschedule({
      appointment: draggedAppointment,
      newDayIso: dayIso,
      newDayName: dayName,
      newHourStr: hourStr,
      newStartTime: newStartIso,
      newEndTime: newEndIso,
      targetProfessionalId: draggedAppointment.professional_id,
      targetProfessionalName: draggedAppointment.professional_name,
    });

    setDraggedAppointment(null);
    setDragOverSlot(null);
  };

  const handleExecuteReschedule = async (
    appointmentId: string,
    newStartTime: string,
    newEndTime: string,
    newProfId?: string
  ) => {
    if (!onRescheduleAppointment) return;
    setIsRescheduling(true);
    setRescheduleFeedback(null);
    try {
      const res = await onRescheduleAppointment(appointmentId, newStartTime, newEndTime, newProfId);
      if (!res.success) {
        setRescheduleFeedback({ type: 'error', message: res.error || 'Não foi possível remanejar.' });
      } else {
        setRescheduleFeedback({ type: 'success', message: res.message || 'Consulta remanejada com sucesso!' });
        setPendingReschedule(null);
        setIsManualRescheduleOpen(false);
        setSelectedAppointmentDetail(null);
        setTimeout(() => setRescheduleFeedback(null), 6000);
      }
    } catch (err: any) {
      setRescheduleFeedback({ type: 'error', message: err.message || 'Erro ao processar reagendamento.' });
    } finally {
      setIsRescheduling(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Toast Feedback de Remanejamento / Conflito */}
      {rescheduleFeedback && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs shadow-xs transition-all animate-in fade-in duration-150 ${
            rescheduleFeedback.type === 'success'
              ? 'bg-[#E8F0E6] text-[#2F452F] border-[#CDE0CB]'
              : 'bg-[#F9ECEB] text-[#9E3E3E] border-[#ECD1CF]'
          }`}
        >
          <div className="flex items-center gap-2">
            {rescheduleFeedback.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-[#3D5A3D] shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-[#9E3E3E] shrink-0" />
            )}
            <span className="font-semibold">{rescheduleFeedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setRescheduleFeedback(null)}
            className="text-xs hover:underline cursor-pointer opacity-70 hover:opacity-100 font-bold"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Alerta Visual de Arraste em Andamento */}
      {draggedAppointment && (
        <div className="bg-[#FAF0DC] border border-[#ECD8B5] text-[#8C5D1E] px-4 py-2.5 rounded-xl text-xs flex items-center justify-between gap-2 shadow-xs animate-in fade-in duration-150 sticky top-2 z-30">
          <div className="flex items-center gap-2">
            <GripVertical className="w-4 h-4 animate-pulse" />
            <span>
              Arrastando a consulta de <strong>{draggedAppointment.patient_name}</strong>... Solte em qualquer horário desejado da grade para remanejar.
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setDraggedAppointment(null);
              setDragOverSlot(null);
            }}
            className="px-2.5 py-1 bg-white border border-[#ECD8B5] text-[#8C5D1E] rounded-md font-semibold hover:bg-[#F5E5C9] cursor-pointer text-[11px]"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Top Banner Context */}
      <div className="bg-white rounded-xl border border-[#E5E2D9] p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-serif italic text-[#3D3D39]">Agenda de Pacientes</h1>
            <span className="bg-[#F2F0EA] text-[#5A5A40] text-xs px-2.5 py-0.5 rounded-md font-medium border border-[#E5E2D9]">
              {currentUser.role === 'RECEPTION'
                ? 'Modo Recepção (Global)'
                : currentUser.role === 'ADMIN'
                ? 'Modo Gestor (Todas as Agendas)'
                : 'Modo Clínico (Sua Agenda)'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#8A8A82] mt-0.5">
            Visualize os horários dos pacientes por semana, confirme presenças ou agende novas sessões com um clique.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-new-appointment"
            onClick={() => onOpenNewAppointment()}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-[#5A5A40] hover:bg-[#484833] text-white text-xs font-semibold rounded-lg shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer min-h-[40px] sm:min-h-0"
          >
            <Plus className="w-4 h-4" /> Novo Agendamento
          </button>
        </div>
      </div>

      {/* Filter and View Controls Bar */}
      <div className="bg-white rounded-xl border border-[#E5E2D9] p-3.5 sm:p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* View Mode Toggle */}
          <div className="inline-flex rounded-lg border border-[#E5E2D9] bg-[#F2F0EA] p-1">
            <button
              id="view-mode-calendar"
              onClick={() => setViewMode('calendar')}
              className={`py-1.5 px-3.5 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'calendar' ? 'bg-white text-[#3D3D39] shadow-xs' : 'text-[#8A8A82] hover:text-[#3D3D39]'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Grade Semanal Interativa</span>
            </button>
            <button
              id="view-mode-list"
              onClick={() => setViewMode('list')}
              className={`py-1.5 px-3.5 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'list' ? 'bg-white text-[#3D3D39] shadow-xs' : 'text-[#8A8A82] hover:text-[#3D3D39]'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Lista de Sessões</span>
            </button>
          </div>

          <div className="text-xs text-[#8A8A82] font-medium flex items-center justify-between sm:justify-end gap-2">
            <span className="bg-[#F2F0EA] px-2.5 py-1 rounded-md border border-[#E5E2D9] text-[#5A5A40] font-semibold">
              {weekAppointments.length} sessão(ões) nesta semana
            </span>
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-[#E5E2D9]/60">
          {/* Professional Selector (Available for Reception & Admin) */}
          {(currentUser.role === 'ADMIN' || currentUser.role === 'RECEPTION') && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 text-xs">
              <span className="text-[#8A8A82] font-medium shrink-0">Profissional:</span>
              <select
                id="filter-professional"
                value={selectedProfessionalFilter}
                onChange={(e) => setSelectedProfessionalFilter(e.target.value)}
                className="w-full bg-[#F2F0EA] border border-[#E5E2D9] text-[#3D3D39] text-xs rounded-lg px-2.5 py-1.5 focus:outline-[#5A5A40] font-medium min-h-[36px]"
              >
                <option value="ALL">Todos os Profissionais</option>
                {professionals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.council_number || p.specialty?.split(' ')[0] || 'Clínico'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 text-xs">
            <span className="text-[#8A8A82] font-medium shrink-0">Status:</span>
            <select
              id="filter-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-[#F2F0EA] border border-[#E5E2D9] text-[#3D3D39] text-xs rounded-lg px-2.5 py-1.5 focus:outline-[#5A5A40] font-medium min-h-[36px]"
            >
              <option value="ALL">Todos os Status</option>
              <option value="AGENDADO">Agendado</option>
              <option value="CONFIRMADO">Confirmado</option>
              <option value="REALIZADO">Realizado</option>
              <option value="FALTOU">Faltou</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
          </div>

          {/* Modality Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 text-xs">
            <span className="text-[#8A8A82] font-medium shrink-0">Modalidade:</span>
            <select
              id="filter-modality"
              value={modalityFilter}
              onChange={(e) => setModalityFilter(e.target.value)}
              className="w-full bg-[#F2F0EA] border border-[#E5E2D9] text-[#3D3D39] text-xs rounded-lg px-2.5 py-1.5 focus:outline-[#5A5A40] font-medium min-h-[36px]"
            >
              <option value="ALL">Todas as modalidades</option>
              <option value="PRESENCIAL">Presencial</option>
              <option value="ONLINE">Online</option>
            </select>
          </div>
        </div>
      </div>

      {/* Week Navigation Header */}
      <div className="bg-white rounded-xl border border-[#E5E2D9] p-3 sm:p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            id="btn-prev-week"
            onClick={handlePrevWeek}
            className="p-2 rounded-lg border border-[#E5E2D9] bg-[#F2F0EA] hover:bg-[#E5E2D9] text-[#3D3D39] transition-colors cursor-pointer"
            title="Semana Anterior"
            aria-label="Semana Anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            id="btn-today-week"
            onClick={handleTodayWeek}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#E5E2D9] bg-[#F2F0EA] hover:bg-[#E5E2D9] text-[#3D3D39] transition-colors cursor-pointer"
          >
            Semana Atual (Hoje)
          </button>
          <button
            id="btn-next-week"
            onClick={handleNextWeek}
            className="p-2 rounded-lg border border-[#E5E2D9] bg-[#F2F0EA] hover:bg-[#E5E2D9] text-[#3D3D39] transition-colors cursor-pointer"
            title="Próxima Semana"
            aria-label="Próxima Semana"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="text-center sm:text-right">
          <div className="text-sm sm:text-base font-bold text-[#3D3D39] capitalize flex items-center gap-1.5 justify-center sm:justify-end">
            <CalendarIcon className="w-4 h-4 text-[#5A5A40]" />
            <span>{weekLabel}</span>
          </div>
          <span className="text-[11px] text-[#8A8A82]">Clique em qualquer horário vazio para agendar um paciente</span>
        </div>
      </div>

      {/* MAIN VIEW: GRADE SEMANAL INTERATIVA OU LISTA */}
      {viewMode === 'calendar' ? (
        <div className="space-y-4">
          {/* Mobile Day Selector Bar (Visible only on small screens) */}
          <div className="md:hidden bg-white rounded-xl border border-[#E5E2D9] p-2 shadow-xs">
            <div className="text-[11px] font-bold text-[#8A8A82] uppercase tracking-wider px-2 pt-1 pb-2 flex items-center justify-between">
              <span>Selecione o Dia:</span>
              <button
                onClick={() => setMobileForceFullGrid(!mobileForceFullGrid)}
                className="text-[#5A5A40] underline hover:text-[#3D3D39] font-medium"
              >
                {mobileForceFullGrid ? 'Ver dia a dia' : 'Ver grade com rolagem'}
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {weekDays.map((day, idx) => {
                const count = patientCountByDay[day.iso] || 0;
                const isSelected = mobileSelectedDayIndex === idx;

                return (
                  <button
                    key={day.iso}
                    onClick={() => {
                      setMobileSelectedDayIndex(idx);
                      setMobileForceFullGrid(false);
                    }}
                    className={`py-2 px-1 rounded-lg text-center flex flex-col items-center justify-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#5A5A40] text-white font-bold shadow-xs'
                        : day.isToday
                        ? 'bg-[#E8F0E6] text-[#3D5A3D] font-bold border border-[#CDE0CB]'
                        : 'bg-[#F2F0EA] text-[#3D3D39] hover:bg-[#E5E2D9]'
                    }`}
                  >
                    <span className="text-[10px] uppercase">{day.dayShort}</span>
                    <span className="text-sm font-bold mt-0.5">{day.dayNumber}</span>
                    {count > 0 && (
                      <span
                        className={`text-[9px] px-1 rounded-full mt-1 ${
                          isSelected ? 'bg-white text-[#5A5A40] font-bold' : 'bg-[#5A5A40] text-white'
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grade Semanal: Modo Mobile Individual (se não forçado grade cheia) */}
          {!mobileForceFullGrid && (
            <div className="md:hidden bg-white rounded-xl border border-[#E5E2D9] shadow-xs overflow-hidden">
              {(() => {
                const activeDay = weekDays[mobileSelectedDayIndex];
                const dayAppts = weekAppointments.filter((apt) => apt.start_time.startsWith(activeDay.iso));

                return (
                  <div>
                    <div className="p-3.5 bg-[#F2F0EA] border-b border-[#E5E2D9] flex items-center justify-between">
                      <div>
                        <div className="text-xs text-[#8A8A82] uppercase tracking-wider">{activeDay.dayName}</div>
                        <h3 className="text-base font-bold text-[#3D3D39]">
                          {activeDay.dayNumber}/{String(activeDay.monthNumber).padStart(2, '0')}
                          {activeDay.isToday && (
                            <span className="ml-2 text-[11px] font-semibold bg-[#E8F0E6] text-[#3D5A3D] px-2 py-0.5 rounded-full border border-[#CDE0CB]">
                              Hoje
                            </span>
                          )}
                        </h3>
                      </div>
                      <span className="text-xs text-[#5A5A40] font-semibold">
                        {dayAppts.length} paciente(s)
                      </span>
                    </div>

                    <div className="divide-y divide-[#E5E2D9]">
                      {HOURS.map((hour) => {
                        const hourStr = `${String(hour).padStart(2, '0')}:00`;
                        const apptsInHour = appointmentsByDayAndHour[activeDay.iso]?.[hour] || [];
                        const isDragOver = dragOverSlot?.dayIso === activeDay.iso && dragOverSlot?.hour === hour;

                        return (
                          <div
                            key={hour}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = 'move';
                              if (dragOverSlot?.dayIso !== activeDay.iso || dragOverSlot?.hour !== hour) {
                                setDragOverSlot({ dayIso: activeDay.iso, hour });
                              }
                            }}
                            onDragLeave={() => {
                              if (dragOverSlot?.dayIso === activeDay.iso && dragOverSlot?.hour === hour) {
                                setDragOverSlot(null);
                              }
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              handleDropSlot(activeDay.iso, hour, activeDay.dayName);
                            }}
                            className={`p-3 flex items-start gap-3 relative transition-all ${
                              isDragOver ? 'bg-[#FAF0DC] ring-2 ring-inset ring-[#8C5D1E]' : ''
                            }`}
                          >
                            <div className="w-14 text-xs font-bold text-[#8A8A82] shrink-0 pt-1 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{hourStr}</span>
                            </div>

                            <div className="flex-1 space-y-2">
                              {isDragOver && (
                                <div className="p-2 rounded-lg bg-[#FAF0DC] border-2 border-dashed border-[#8C5D1E] text-center text-xs font-bold text-[#8C5D1E] flex items-center justify-center gap-1.5 animate-pulse">
                                  <ArrowRightLeft className="w-3.5 h-3.5" />
                                  <span>Solte aqui para mover para {hourStr}</span>
                                </div>
                              )}
                              {apptsInHour.length === 0 ? (
                                <button
                                  onClick={() => onOpenNewAppointment(activeDay.iso, hourStr)}
                                  className="w-full py-2 px-3 rounded-lg border border-dashed border-[#D1CEC3] text-[11px] text-[#8A8A82] hover:text-[#5A5A40] hover:border-[#5A5A40] hover:bg-[#F2F0EA]/50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Horário livre • Agendar às {hourStr}</span>
                                </button>
                              ) : (
                                apptsInHour.map((apt) => {
                                  const { time } = formatDateTime(apt.start_time);
                                  const endTime = formatDateTime(apt.end_time).time;
                                  const isBeingDragged = draggedAppointment?.id === apt.id;

                                  return (
                                    <div
                                      key={apt.id}
                                      draggable={apt.status !== 'CANCELADO'}
                                      onDragStart={(e) => {
                                        e.stopPropagation();
                                        setDraggedAppointment(apt);
                                        e.dataTransfer.setData('text/plain', apt.id);
                                        e.dataTransfer.effectAllowed = 'move';
                                      }}
                                      onDragEnd={() => {
                                        setDraggedAppointment(null);
                                        setDragOverSlot(null);
                                      }}
                                      onClick={() => setSelectedAppointmentDetail(apt)}
                                      className={`bg-[#FDFCF9] border border-[#D1CEC3] rounded-lg p-2.5 shadow-xs hover:border-[#5A5A40] transition-all cursor-pointer ${
                                        isBeingDragged ? 'opacity-40 ring-2 ring-[#5A5A40]' : ''
                                      }`}
                                    >
                                      <div className="flex items-center justify-between gap-1 mb-1">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span
                                            className="cursor-grab active:cursor-grabbing text-[#8A8A82] hover:text-[#5A5A40] -ml-0.5"
                                            title="Segure e arraste para remanejar"
                                          >
                                            <GripVertical className="w-3.5 h-3.5" />
                                          </span>
                                          <span className="text-[11px] font-bold text-[#5A5A40]">
                                            {time} - {endTime}
                                          </span>
                                          {apt.is_first_session && (
                                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#FAF0DC] text-[#8C5D1E] border border-[#ECD8B5]">
                                              1ª Sessão
                                            </span>
                                          )}
                                          {apt.is_recurring && (
                                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#E8F0E6] text-[#2F452F] border border-[#D6E2D4] flex items-center gap-0.5">
                                              <Repeat className="w-2.5 h-2.5" /> Contínuo
                                            </span>
                                          )}
                                        </div>
                                        {getStatusBadge(apt.status)}
                                      </div>
                                      <div className="text-sm font-bold text-[#3D3D39] truncate">
                                        {apt.patient_name}
                                      </div>
                                      <div className="flex items-center justify-between text-[11px] text-[#8A8A82] mt-1">
                                        <span>{apt.professional_name}</span>
                                        <span className="flex items-center gap-1 font-medium">
                                          {apt.session_type === 'ONLINE' ? (
                                            <><Video className="w-3 h-3 text-[#5A5A40]" /> Online</>
                                          ) : (
                                            <><MapPin className="w-3 h-3 text-[#3D5A3D]" /> Presencial</>
                                          )}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Grade Semanal Completa (Desktop ou Mobile forçado) */}
          <div className={`${!mobileForceFullGrid ? 'hidden md:block' : 'block'} bg-white rounded-xl border border-[#E5E2D9] shadow-xs overflow-x-auto`}>
            <div className="min-w-[850px]">
              {/* Header com os 7 Dias */}
              <div className="grid grid-cols-8 border-b border-[#E5E2D9] bg-[#F2F0EA] sticky top-0 z-10">
                <div className="p-3 text-center text-xs font-bold text-[#8A8A82] uppercase tracking-wider border-r border-[#E5E2D9] flex items-center justify-center">
                  <span>Horário</span>
                </div>
                {weekDays.map((day) => {
                  const count = patientCountByDay[day.iso] || 0;
                  return (
                    <div
                      key={day.iso}
                      className={`p-2.5 text-center border-r border-[#E5E2D9] last:border-r-0 ${
                        day.isToday ? 'bg-[#E8F0E6]/70' : ''
                      }`}
                    >
                      <div className="text-[11px] uppercase font-semibold text-[#8A8A82]">{day.dayShort}</div>
                      <div className="flex items-center justify-center gap-1.5 mt-0.5">
                        <span className="text-base font-bold text-[#3D3D39]">{day.dayNumber}</span>
                        {day.isToday && (
                          <span className="text-[10px] bg-[#3D5A3D] text-white px-1.5 py-0.2 rounded font-bold">
                            Hoje
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-[#5A5A40] font-medium mt-0.5">
                        {count > 0 ? `${count} paciente(s)` : 'Livre'}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Linhas de Horários e Células dos Dias */}
              <div className="divide-y divide-[#E5E2D9]">
                {HOURS.map((hour) => {
                  const hourStr = `${String(hour).padStart(2, '0')}:00`;

                  return (
                    <div key={hour} className="grid grid-cols-8 min-h-[82px]">
                      {/* Coluna do Horário */}
                      <div className="p-2.5 text-center text-xs font-bold text-[#8A8A82] border-r border-[#E5E2D9] bg-[#FAF9F5] flex flex-col items-center justify-center select-none">
                        <span>{hourStr}</span>
                        <span className="text-[10px] font-normal text-[#B0ADA4] mt-0.5">50 min</span>
                      </div>

                      {/* 7 Células dos Dias */}
                      {weekDays.map((day) => {
                        const apptsInCell = appointmentsByDayAndHour[day.iso]?.[hour] || [];
                        const isDragOver = dragOverSlot?.dayIso === day.iso && dragOverSlot?.hour === hour;

                        return (
                          <div
                            key={day.iso + '-' + hour}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = 'move';
                              if (dragOverSlot?.dayIso !== day.iso || dragOverSlot?.hour !== hour) {
                                setDragOverSlot({ dayIso: day.iso, hour });
                              }
                            }}
                            onDragLeave={() => {
                              if (dragOverSlot?.dayIso === day.iso && dragOverSlot?.hour === hour) {
                                setDragOverSlot(null);
                              }
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              handleDropSlot(day.iso, hour, day.dayName);
                            }}
                            className={`p-1.5 border-r border-[#E5E2D9] last:border-r-0 transition-colors relative group ${
                              isDragOver
                                ? 'bg-[#FAF0DC] ring-2 ring-inset ring-[#8C5D1E]'
                                : day.isToday
                                ? 'bg-[#E8F0E6]/20 hover:bg-[#E8F0E6]/40'
                                : 'hover:bg-[#F2F0EA]/40'
                            }`}
                          >
                            {isDragOver && (
                              <div className="absolute inset-0 bg-[#FAF0DC]/95 border-2 border-dashed border-[#8C5D1E] rounded-md flex flex-col items-center justify-center p-1 pointer-events-none z-20 shadow-xs">
                                <ArrowRightLeft className="w-4 h-4 text-[#8C5D1E] animate-bounce" />
                                <span className="text-[10px] font-bold text-[#8C5D1E] text-center mt-0.5 leading-tight">
                                  Mover para {day.dayShort} às {hourStr}
                                </span>
                              </div>
                            )}

                            {apptsInCell.length === 0 ? (
                              <button
                                type="button"
                                onClick={() => onOpenNewAppointment(day.iso, hourStr)}
                                className="w-full h-full min-h-[64px] rounded-lg border border-transparent group-hover:border-dashed group-hover:border-[#C4C0B3] group-hover:bg-white/70 transition-all flex flex-col items-center justify-center text-[#8A8A82] group-hover:text-[#5A5A40] opacity-0 group-hover:opacity-100 cursor-pointer p-1"
                                title={`Agendar paciente para ${day.dayShort} às ${hourStr}`}
                              >
                                <Plus className="w-4 h-4" />
                                <span className="text-[10px] font-semibold mt-0.5">+ {hourStr}</span>
                              </button>
                            ) : (
                              <div className="space-y-1.5">
                                {apptsInCell.map((apt) => {
                                  const { time } = formatDateTime(apt.start_time);
                                  const endTime = formatDateTime(apt.end_time).time;
                                  const isBeingDragged = draggedAppointment?.id === apt.id;

                                  // Cores de status elegantes
                                  const statusColor =
                                    apt.status === 'CONFIRMADO'
                                      ? 'border-l-4 border-l-[#3D5A3D] bg-white'
                                      : apt.status === 'REALIZADO'
                                      ? 'border-l-4 border-l-[#4A3D5A] bg-white'
                                      : apt.status === 'FALTOU'
                                      ? 'border-l-4 border-l-[#9E3E3E] bg-[#F9ECEB]/50'
                                      : apt.status === 'CANCELADO'
                                      ? 'border-l-4 border-l-[#8A8A82] bg-[#F2F0EA]/60 opacity-60'
                                      : 'border-l-4 border-l-[#5A5A40] bg-white';

                                  return (
                                    <div
                                      key={apt.id}
                                      draggable={apt.status !== 'CANCELADO'}
                                      onDragStart={(e) => {
                                        e.stopPropagation();
                                        setDraggedAppointment(apt);
                                        e.dataTransfer.setData('text/plain', apt.id);
                                        e.dataTransfer.effectAllowed = 'move';
                                      }}
                                      onDragEnd={() => {
                                        setDraggedAppointment(null);
                                        setDragOverSlot(null);
                                      }}
                                      onClick={() => setSelectedAppointmentDetail(apt)}
                                      className={`p-2 rounded-md border border-[#E5E2D9] ${statusColor} shadow-2xs hover:shadow-xs hover:border-[#5A5A40] transition-all cursor-pointer ${
                                        isBeingDragged ? 'opacity-40 ring-2 ring-[#5A5A40]' : ''
                                      }`}
                                      title={`${apt.patient_name} - ${time} às ${endTime} (${apt.status}) • Arraste para alterar o horário`}
                                    >
                                      <div className="flex items-center justify-between text-[10px] font-bold text-[#5A5A40] mb-0.5">
                                        <div className="flex items-center gap-1">
                                          <span
                                            className="cursor-grab active:cursor-grabbing text-[#8A8A82] hover:text-[#5A5A40] -ml-0.5"
                                            title="Arraste para alterar o horário"
                                          >
                                            <GripVertical className="w-3 h-3" />
                                          </span>
                                          <span>{time} - {endTime}</span>
                                          {apt.is_first_session && (
                                            <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-[#FAF0DC] text-[#8C5D1E] border border-[#ECD8B5]" title="1ª Sessão / Avaliação Inicial">
                                              1ª
                                            </span>
                                          )}
                                          {apt.is_recurring && (
                                            <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-[#E8F0E6] text-[#2F452F] border border-[#D6E2D4]" title="Paciente Contínuo">
                                              ↻
                                            </span>
                                          )}
                                        </div>
                                        {apt.session_type === 'ONLINE' ? (
                                          <Video className="w-3 h-3 text-[#5A5A40]" title="Sessão Online" />
                                        ) : (
                                          <MapPin className="w-3 h-3 text-[#3D5A3D]" title="Presencial" />
                                        )}
                                      </div>
                                      <div className="text-xs font-bold text-[#3D3D39] truncate" title={apt.patient_name}>
                                        {apt.patient_name}
                                      </div>
                                      {(currentUser.role === 'ADMIN' || currentUser.role === 'RECEPTION') && (
                                        <div className="text-[10px] text-[#8A8A82] truncate mt-0.5">
                                          {apt.professional_name.split(' ')[0]} {apt.professional_name.split(' ')[1] || ''}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* VISTA EM LISTA DETALHADA / CARTÕES */
        <div>
          {filteredAppointments.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#E5E2D9] p-12 text-center shadow-xs">
              <CalendarIcon className="w-12 h-12 text-[#D1CEC3] mx-auto mb-3" />
              <h3 className="text-base font-serif italic font-semibold text-[#3D3D39]">Nenhum compromisso encontrado</h3>
              <p className="text-sm text-[#8A8A82] max-w-md mx-auto mt-1">
                Não há consultas cadastradas com os filtros selecionados. Clique em "Novo Agendamento" para marcar uma sessão.
              </p>
              <button
                onClick={() => onOpenNewAppointment()}
                className="mt-4 px-4 py-2 bg-[#5A5A40] hover:bg-[#484833] text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Agendar Primeira Sessão
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAppointments.map((apt) => {
                const { date, time } = formatDateTime(apt.start_time);
                const endTimeFormatted = formatDateTime(apt.end_time).time;

                return (
                  <div
                    key={apt.id}
                    id={`appointment-card-${apt.id}`}
                    className="bg-white rounded-xl border border-[#E5E2D9] p-5 shadow-xs hover:border-[#D1CEC3] transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-[#5A5A40] uppercase tracking-wide">
                            <Clock className="w-3.5 h-3.5 text-[#5A5A40]" />
                            <span>{date} • {time} às {endTimeFormatted}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {apt.is_first_session ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-[#FAF0DC] text-[#8C5D1E] border border-[#ECD8B5]">
                                1ª Sessão / Avaliação
                              </span>
                            ) : apt.is_recurring ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-[#E8F0E6] text-[#2F452F] border border-[#D6E2D4]">
                                <Repeat className="w-3 h-3" /> Contínuo Semanal
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-[#F2F0EA] text-[#5A5A40] border border-[#E5E2D9]">
                                Avulso
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 text-xs text-[#8A8A82]">
                              {apt.session_type === 'ONLINE' ? (
                                <><Video className="w-3.5 h-3.5 text-[#5A5A40]" /> Online</>
                              ) : (
                                <><MapPin className="w-3.5 h-3.5 text-[#3D5A3D]" /> Presencial</>
                              )}
                            </span>
                          </div>
                        </div>
                        <div>{getStatusBadge(apt.status)}</div>
                      </div>

                      {/* Patient Info */}
                      <div className="bg-[#F2F0EA] rounded-lg p-3 border border-[#E5E2D9] mb-3">
                        <div className="text-[10px] text-[#8A8A82] font-bold uppercase tracking-wider">Paciente</div>
                        <div className="text-sm font-bold text-[#3D3D39] mt-0.5">{apt.patient_name}</div>
                        <a
                          href={`tel:${apt.patient_phone.replace(/\D/g, '')}`}
                          className="inline-flex items-center gap-1.5 text-xs text-[#5A5A40] hover:underline mt-1 font-medium"
                          title="Ligar para o paciente"
                        >
                          <Phone className="w-3.5 h-3.5 text-[#5A5A40]" />
                          <span>{apt.patient_phone}</span>
                        </a>
                      </div>

                      <div className="flex items-center justify-between text-xs text-[#8A8A82] mb-3 px-1">
                        <span className="font-medium">Profissional:</span>
                        <span className="font-bold text-[#3D3D39]">{apt.professional_name}</span>
                      </div>

                      {apt.notes && (
                        <div className="text-xs text-[#5A5A40] italic bg-[#F2F0EA]/70 p-2.5 rounded-lg border border-[#E5E2D9] mb-3">
                          "{apt.notes}"
                        </div>
                      )}
                    </div>

                    {/* Card Footer */}
                    <div className="pt-3 border-t border-[#E5E2D9] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedAppointmentDetail(apt)}
                          className="text-xs font-semibold text-[#8A8A82] hover:text-[#3D3D39] underline cursor-pointer"
                        >
                          Ver Detalhes
                        </button>
                        {apt.status !== 'CANCELADO' && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAppointmentDetail(apt);
                              setIsManualRescheduleOpen(true);
                            }}
                            className="text-xs font-semibold text-[#5A5A40] hover:text-[#3D3D39] inline-flex items-center gap-1 cursor-pointer bg-[#F2F0EA] px-2 py-1 rounded-md border border-[#E5E2D9] hover:bg-[#E5E2D9]"
                            title="Remanejar horário manualmente"
                          >
                            <CalendarClock className="w-3 h-3" />
                            <span>Remanejar</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {apt.status === 'AGENDADO' && (
                          <button
                            onClick={() => onUpdateStatus(apt.id, 'CONFIRMADO')}
                            className="px-3 py-1.5 text-xs font-semibold bg-[#E8F0E6] text-[#3D5A3D] hover:bg-[#D8E6D5] rounded-lg border border-[#CDE0CB] transition-colors cursor-pointer"
                          >
                            Confirmar
                          </button>
                        )}
                        {apt.status === 'CONFIRMADO' && (
                          <button
                            onClick={() => onUpdateStatus(apt.id, 'REALIZADO')}
                            className="px-3 py-1.5 text-xs font-semibold bg-[#EAE8F0] text-[#4A3D5A] hover:bg-[#DCD8E6] rounded-lg border border-[#D5CDE0] transition-colors cursor-pointer"
                          >
                            Concluir
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL DE DETALHES DA CONSULTA (INTERATIVO) */}
      {selectedAppointmentDetail && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#2D2D2A]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-[#E5E2D9] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 border-b border-[#E5E2D9] bg-[#F2F0EA] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-[#D1CEC3] shrink-0">
                  <UserIcon className="w-5 h-5 text-[#5A5A40]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#3D3D39]">{selectedAppointmentDetail.patient_name}</h3>
                  <p className="text-xs text-[#8A8A82]">Detalhes do Horário & Ações da Sessão</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAppointmentDetail(null)}
                className="text-[#8A8A82] hover:text-[#3D3D39] p-1.5 rounded-lg hover:bg-[#E5E2D9] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 text-xs text-[#3D3D39]">
              {/* Horário & Status */}
              <div className="grid grid-cols-2 gap-3 bg-[#F2F0EA] p-3.5 rounded-xl border border-[#E5E2D9]">
                <div>
                  <span className="text-[#8A8A82] block font-medium">Data e Horário</span>
                  <span className="font-bold text-sm text-[#3D3D39]">
                    {formatDateTime(selectedAppointmentDetail.start_time).date} às {formatDateTime(selectedAppointmentDetail.start_time).time}
                  </span>
                </div>
                <div>
                  <span className="text-[#8A8A82] block font-medium">Status Atual</span>
                  <div className="mt-0.5">{getStatusBadge(selectedAppointmentDetail.status)}</div>
                </div>
                <div>
                  <span className="text-[#8A8A82] block font-medium">Modalidade</span>
                  <span className="font-semibold text-[#3D3D39] flex items-center gap-1 mt-0.5">
                    {selectedAppointmentDetail.session_type === 'ONLINE' ? (
                      <><Video className="w-3.5 h-3.5 text-[#5A5A40]" /> Online (Google Meet/Link)</>
                    ) : (
                      <><MapPin className="w-3.5 h-3.5 text-[#3D5A3D]" /> Presencial (Consultório 03)</>
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-[#8A8A82] block font-medium">Profissional Responsável</span>
                  <span className="font-semibold text-[#3D3D39] mt-0.5 block">
                    {selectedAppointmentDetail.professional_name}
                  </span>
                </div>
              </div>

              {/* Contato do Paciente */}
              <div className="border border-[#E5E2D9] p-3 rounded-xl bg-white flex items-center justify-between">
                <div>
                  <span className="text-[#8A8A82] block font-medium">Telefone / WhatsApp</span>
                  <span className="font-bold text-[#3D3D39]">{selectedAppointmentDetail.patient_phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${selectedAppointmentDetail.patient_phone.replace(/\D/g, '')}`}
                    className="px-3 py-1.5 bg-[#F2F0EA] hover:bg-[#E5E2D9] text-[#5A5A40] rounded-lg font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Ligar</span>
                  </a>
                  <a
                    href={`https://wa.me/55${selectedAppointmentDetail.patient_phone.replace(/\D/g, '')}?text=Ol%C3%A1%20${encodeURIComponent(selectedAppointmentDetail.patient_name)},%20confirmamos%20sua%20sess%C3%A3o%20na%20Cl%C3%ADnicaCare.`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-[#E8F0E6] hover:bg-[#D8E6D5] text-[#3D5A3D] rounded-lg font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>

              {/* Anotações */}
              {selectedAppointmentDetail.notes && (
                <div className="bg-[#FAF9F5] border border-[#E5E2D9] p-3 rounded-xl">
                  <span className="text-[#8A8A82] block font-medium mb-1">Anotações da Consulta</span>
                  <p className="italic text-[#5A5A40]">{selectedAppointmentDetail.notes}</p>
                </div>
              )}

              {/* Enquadre Terapêutico (1ª Sessão vs Contínuo) */}
              {selectedAppointmentDetail.is_first_session ? (
                <div className="bg-[#FAF0DC]/60 border border-[#ECD8B5] p-3.5 rounded-xl space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#8C5D1E]">
                    <Info className="w-4 h-4 text-[#8C5D1E] shrink-0" />
                    <span>Enquadre Clínico: 1ª Sessão / Avaliação Inicial</span>
                  </div>
                  <p className="text-[11px] text-[#7A5016] leading-relaxed">
                    {selectedAppointmentDetail.status === 'FALTOU'
                      ? 'O paciente faltou à primeira sessão. Como ele não é um paciente contínuo, a agenda das próximas semanas permaneceu 100% livre e o registro foi preservado no histórico.'
                      : selectedAppointmentDetail.status === 'REALIZADO'
                      ? 'Primeira sessão realizada com sucesso! Se o paciente for continuar o tratamento, ative-o como Paciente Contínuo para fixar seu dia e horário semanal automaticamente no calendário.'
                      : 'Esta é a primeira sessão do paciente. Por segurança, horários futuros não foram agendados continuamente para não prender a agenda caso ele não continue.'}
                  </p>

                  {onOpenActivateContinuous && (
                    <button
                      type="button"
                      onClick={() => {
                        const patientObj = patients.find((p) => p.id === selectedAppointmentDetail.patient_id) || {
                          id: selectedAppointmentDetail.patient_id,
                          full_name: selectedAppointmentDetail.patient_name,
                          cpf: '',
                          birth_date: '',
                          phone: selectedAppointmentDetail.patient_phone,
                          email: '',
                          address: '',
                          status: 'ATIVO',
                          treatment_status: 'PRIMEIRA_SESSAO',
                          assigned_professional_id: selectedAppointmentDetail.professional_id,
                          assigned_professional_name: selectedAppointmentDetail.professional_name,
                          created_at: '',
                          has_lgpd_consent: true,
                          anamnese: null,
                        };
                        setSelectedAppointmentDetail(null);
                        onOpenActivateContinuous(patientObj as Patient);
                      }}
                      className="w-full mt-1.5 py-2 px-3 bg-[#8C5D1E] hover:bg-[#724a16] text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Cadastrar Paciente como Ativo Contínuo (Gerar Semanal)</span>
                    </button>
                  )}
                </div>
              ) : selectedAppointmentDetail.is_recurring ? (
                <div className="bg-[#E8F0E6]/60 border border-[#CDE0CB] p-3 rounded-xl flex items-center gap-2 text-xs text-[#2F452F]">
                  <Repeat className="w-4 h-4 text-[#3D5A3D] shrink-0" />
                  <div>
                    <span className="font-bold block">Paciente em Acompanhamento Contínuo</span>
                    <span className="text-[11px] text-[#4A6B4A]">
                      Horário semanal fixo ativo e protegido na agenda do profissional.
                    </span>
                  </div>
                </div>
              ) : null}

              {/* Alternativa Manual de Remanejamento de Horário */}
              {selectedAppointmentDetail.status !== 'CANCELADO' && (
                <div className="border border-[#E5E2D9] rounded-xl p-3.5 bg-[#FAF9F5] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#3D3D39]">
                      <CalendarClock className="w-4 h-4 text-[#5A5A40]" />
                      <span>Remanejar Horário (Alternativa Manual)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsManualRescheduleOpen(!isManualRescheduleOpen)}
                      className="text-xs font-semibold text-[#5A5A40] hover:text-[#3D3D39] underline cursor-pointer"
                    >
                      {isManualRescheduleOpen ? 'Recolher' : 'Alterar Data/Hora'}
                    </button>
                  </div>

                  {isManualRescheduleOpen ? (
                    <div className="space-y-3 pt-2 border-t border-[#E5E2D9]">
                      <p className="text-[11px] text-[#8A8A82]">
                        Defina uma nova data e horário para a sessão. O sistema valida automaticamente se há conflitos com outros atendimentos do profissional.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-[#5A5A40] mb-1">Nova Data:</label>
                          <input
                            type="date"
                            value={manualDate}
                            onChange={(e) => setManualDate(e.target.value)}
                            className="w-full text-xs p-2 rounded-lg border border-[#D1CEC3] bg-white text-[#3D3D39] focus:outline-hidden focus:border-[#5A5A40]"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-[#5A5A40] mb-1">Novo Horário:</label>
                          <select
                            value={manualTime}
                            onChange={(e) => setManualTime(e.target.value)}
                            className="w-full text-xs p-2 rounded-lg border border-[#D1CEC3] bg-white text-[#3D3D39] focus:outline-hidden focus:border-[#5A5A40]"
                          >
                            {HOURS.map((h) => {
                              const hStr = `${String(h).padStart(2, '0')}:00`;
                              return (
                                <option key={h} value={hStr}>
                                  {hStr} (50 min)
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      </div>

                      {(currentUser.role === 'ADMIN' || currentUser.role === 'RECEPTION') && (
                        <div>
                          <label className="block text-[11px] font-bold text-[#5A5A40] mb-1">Profissional / Terapeuta:</label>
                          <select
                            value={manualProfessionalId}
                            onChange={(e) => setManualProfessionalId(e.target.value)}
                            className="w-full text-xs p-2 rounded-lg border border-[#D1CEC3] bg-white text-[#3D3D39] focus:outline-hidden focus:border-[#5A5A40]"
                          >
                            {professionals.map((prof) => (
                              <option key={prof.id} value={prof.id}>
                                {prof.name} ({prof.role === 'ADMIN' ? 'Administrador' : 'Psicólogo(a)'})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {rescheduleFeedback?.type === 'error' && (
                        <div className="p-2.5 rounded-lg bg-[#F9ECEB] border border-[#ECD1CF] text-xs text-[#9E3E3E] flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>{rescheduleFeedback.message}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsManualRescheduleOpen(false)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#D1CEC3] text-[#5A5A40] hover:bg-[#E5E2D9] cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          disabled={isRescheduling || !manualDate || !manualTime}
                          onClick={() => {
                            const origStartMs = new Date(selectedAppointmentDetail.start_time).getTime();
                            const origEndMs = new Date(selectedAppointmentDetail.end_time).getTime();
                            const durationMs = Math.max(30 * 60 * 1000, origEndMs - origStartMs || 50 * 60 * 1000);
                            const newStartIso = `${manualDate}T${manualTime}:00`;
                            const newStartMs = new Date(newStartIso).getTime();
                            const newEndIso = new Date(newStartMs + durationMs).toISOString().replace('Z', '');
                            handleExecuteReschedule(
                              selectedAppointmentDetail.id,
                              newStartIso,
                              newEndIso,
                              manualProfessionalId
                            );
                          }}
                          className="px-4 py-1.5 rounded-lg text-xs font-bold bg-[#5A5A40] hover:bg-[#484833] text-white transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                        >
                          {isRescheduling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          <span>Confirmar Novo Horário</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-[11px] text-[#8A8A82]">
                      <span>
                        Além do arraste pela grade semanal, você pode definir data e hora manualmente por aqui.
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsManualRescheduleOpen(true)}
                        className="text-[#5A5A40] font-bold hover:underline shrink-0 ml-2 cursor-pointer"
                      >
                        Mudar horário
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Ações Rápidas de Mudança de Status */}
              <div>
                <span className="text-[#8A8A82] block font-medium mb-2">Alterar Status da Sessão:</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    onClick={() => {
                      onUpdateStatus(selectedAppointmentDetail.id, 'CONFIRMADO');
                      setSelectedAppointmentDetail({ ...selectedAppointmentDetail, status: 'CONFIRMADO' });
                    }}
                    className={`py-2 px-2.5 rounded-lg font-semibold text-center border transition-colors cursor-pointer ${
                      selectedAppointmentDetail.status === 'CONFIRMADO'
                        ? 'bg-[#3D5A3D] text-white border-[#3D5A3D]'
                        : 'bg-[#E8F0E6] text-[#3D5A3D] border-[#CDE0CB] hover:bg-[#D8E6D5]'
                    }`}
                  >
                    Confirmar
                  </button>

                  <button
                    onClick={() => {
                      onUpdateStatus(selectedAppointmentDetail.id, 'REALIZADO');
                      setSelectedAppointmentDetail({ ...selectedAppointmentDetail, status: 'REALIZADO' });
                    }}
                    className={`py-2 px-2.5 rounded-lg font-semibold text-center border transition-colors cursor-pointer ${
                      selectedAppointmentDetail.status === 'REALIZADO'
                        ? 'bg-[#4A3D5A] text-white border-[#4A3D5A]'
                        : 'bg-[#EAE8F0] text-[#4A3D5A] border-[#D5CDE0] hover:bg-[#DCD8E6]'
                    }`}
                  >
                    Realizado
                  </button>

                  <button
                    onClick={() => {
                      onUpdateStatus(selectedAppointmentDetail.id, 'FALTOU');
                      setSelectedAppointmentDetail({ ...selectedAppointmentDetail, status: 'FALTOU' });
                    }}
                    className={`py-2 px-2.5 rounded-lg font-semibold text-center border transition-colors cursor-pointer ${
                      selectedAppointmentDetail.status === 'FALTOU'
                        ? 'bg-[#9E3E3E] text-white border-[#9E3E3E]'
                        : 'bg-[#F9ECEB] text-[#9E3E3E] border-[#ECD1CF] hover:bg-[#F2D7D5]'
                    }`}
                  >
                    Faltou
                  </button>

                  <button
                    onClick={() => {
                      onUpdateStatus(selectedAppointmentDetail.id, 'CANCELADO');
                      setSelectedAppointmentDetail({ ...selectedAppointmentDetail, status: 'CANCELADO' });
                    }}
                    className={`py-2 px-2.5 rounded-lg font-semibold text-center border transition-colors cursor-pointer ${
                      selectedAppointmentDetail.status === 'CANCELADO'
                        ? 'bg-[#8A8A82] text-white border-[#8A8A82]'
                        : 'bg-[#F2F0EA] text-[#8A8A82] border-[#E5E2D9] hover:bg-[#E5E2D9]'
                    }`}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-[#F2F0EA] border-t border-[#E5E2D9] flex flex-wrap items-center justify-between gap-2">
              {onOpenRecordForPatient && currentUser.role !== 'RECEPTION' ? (
                <button
                  type="button"
                  onClick={() => {
                    const patId = selectedAppointmentDetail.patient_id;
                    setSelectedAppointmentDetail(null);
                    onOpenRecordForPatient(patId);
                  }}
                  className="px-4 py-2 bg-[#5A5A40] hover:bg-[#484833] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Abrir Prontuário Clínico</span>
                </button>
              ) : (
                <div></div>
              )}

              <button
                type="button"
                onClick={() => setSelectedAppointmentDetail(null)}
                className="px-5 py-2 bg-white hover:bg-[#E5E2D9] text-[#3D3D39] rounded-lg text-xs font-semibold cursor-pointer border border-[#E5E2D9]"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DO ARRASTE (DRAG-AND-DROP) */}
      {pendingReschedule && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#2D2D2A]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-[#E5E2D9] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 border-b border-[#E5E2D9] bg-[#F2F0EA] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#FAF0DC] flex items-center justify-center border border-[#ECD8B5] shrink-0 text-[#8C5D1E]">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#3D3D39]">Confirmar Mudança de Horário</h3>
                  <p className="text-xs text-[#8A8A82]">Remanejamento manual de atendimento</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPendingReschedule(null)}
                className="text-[#8A8A82] hover:text-[#3D3D39] p-1.5 rounded-lg hover:bg-[#E5E2D9] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 text-xs text-[#3D3D39]">
              <p className="text-xs text-[#8A8A82]">
                Você arrastou a consulta para um novo horário. Deseja aplicar essa alteração na agenda?
              </p>

              <div className="bg-[#FAF9F5] border border-[#E5E2D9] rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-[#E5E2D9]">
                  <span className="text-[#8A8A82]">Paciente:</span>
                  <span className="font-bold text-sm text-[#3D3D39]">{pendingReschedule.appointment.patient_name}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#8A8A82]">Horário Atual:</span>
                  <span className="font-medium text-[#8A8A82] line-through">
                    {formatDateTime(pendingReschedule.appointment.start_time).date} às {formatDateTime(pendingReschedule.appointment.start_time).time}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[#5A5A40] font-bold">Novo Horário:</span>
                  <span className="font-bold text-[#3D5A3D] text-xs bg-[#E8F0E6] px-2.5 py-1 rounded-md border border-[#CDE0CB]">
                    {pendingReschedule.newDayName}, {pendingReschedule.newDayIso.split('-').reverse().join('/')} às {pendingReschedule.newHourStr}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-[#E5E2D9]">
                  <span className="text-[#8A8A82]">Terapeuta:</span>
                  <span className="font-semibold text-[#3D3D39]">{pendingReschedule.targetProfessionalName}</span>
                </div>
              </div>

              {rescheduleFeedback?.type === 'error' && (
                <div className="p-3 rounded-lg bg-[#F9ECEB] border border-[#ECD1CF] text-xs text-[#9E3E3E] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{rescheduleFeedback.message}</span>
                </div>
              )}

              <p className="text-[11px] text-[#8A8A82] italic">
                * Os lembretes e confirmações automáticas do paciente serão atualizados para a nova data e horário.
              </p>
            </div>

            {/* Footer */}
            <div className="p-4 bg-[#F2F0EA] border-t border-[#E5E2D9] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingReschedule(null)}
                className="px-4 py-2 bg-white hover:bg-[#E5E2D9] text-[#5A5A40] rounded-lg text-xs font-semibold cursor-pointer border border-[#D1CEC3]"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isRescheduling}
                onClick={() =>
                  handleExecuteReschedule(
                    pendingReschedule.appointment.id,
                    pendingReschedule.newStartTime,
                    pendingReschedule.newEndTime,
                    pendingReschedule.targetProfessionalId
                  )
                }
                className="px-4 py-2 bg-[#5A5A40] hover:bg-[#484833] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
              >
                {isRescheduling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Confirmar Remanejamento</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Floating Action Button */}
      <button
        id="mobile-fab-new-appointment"
        onClick={() => onOpenNewAppointment()}
        className="md:hidden fixed bottom-20 right-4 z-30 bg-[#5A5A40] hover:bg-[#484833] text-white p-3.5 rounded-full shadow-xl flex items-center justify-center cursor-pointer transition-transform active:scale-95 min-w-[50px] min-h-[50px]"
        aria-label="Novo Agendamento"
        title="Novo Agendamento"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
};
