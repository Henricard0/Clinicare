import React, { useState } from 'react';
import { ReminderQueueItem, User } from '../types';
import { Send, MessageSquare, Mail, Clock, CheckCircle2, AlertCircle, RefreshCw, Smartphone, ShieldCheck, Zap } from 'lucide-react';

interface RemindersViewProps {
  reminders: ReminderQueueItem[];
  currentUser: User;
  onTriggerBatch: () => void;
}

export const RemindersView: React.FC<RemindersViewProps> = ({
  reminders,
  currentUser,
  onTriggerBatch,
}) => {
  const [filterChannel, setFilterChannel] = useState<'ALL' | 'WHATSAPP' | 'EMAIL'>('ALL');
  const [isProcessing, setIsProcessing] = useState(false);

  const filtered = reminders.filter((r) => {
    if (filterChannel !== 'ALL' && r.channel !== filterChannel) return false;
    return true;
  });

  const handleTrigger = async () => {
    setIsProcessing(true);
    await onTriggerBatch();
    setIsProcessing(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-[#E5E2D9] p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-serif italic font-bold text-[#3D3D39]">Fila de Lembretes Automáticos</h1>
            <span className="bg-[#F2F0EA] text-[#5A5A40] text-xs px-2.5 py-0.5 rounded-md font-medium border border-[#E5E2D9] flex items-center gap-1">
              <Zap className="w-3 h-3" /> WhatsApp & E-mail Bot
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#8A8A82] mt-0.5">
            Lógica de background para confirmação de presença preventiva, redução de no-shows e integração via Meta WhatsApp Cloud API.
          </p>
        </div>

        <button
          id="btn-trigger-batch-reminders"
          onClick={handleTrigger}
          disabled={isProcessing}
          className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-[#5A5A40] hover:bg-[#484833] text-white text-xs font-semibold rounded-lg shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 min-h-[40px] sm:min-h-0"
        >
          <Send className="w-3.5 h-3.5" />
          {isProcessing ? 'Disparando Lembretes...' : 'Disparar Lote Pendente (Simular Cron)'}
        </button>
      </div>

      {/* Architecture Concept Callout */}
      <div className="bg-[#2D2D2A] text-[#FDFCF9] rounded-xl p-4 text-xs space-y-2 border border-[#3D3D39]">
        <div className="flex items-center gap-2 font-bold text-[#D8D4C8]">
          <Clock className="w-4 h-4 text-[#5A5A40]" />
          <span>Como funciona a arquitetura do robô de lembretes em produção:</span>
        </div>
        <p className="text-[#8A8A82] leading-relaxed">
          1. Um cron job diário ou fila distribuída (ex: <strong>BullMQ / Redis</strong> ou <strong>GCP Cloud Scheduler</strong>) consulta no PostgreSQL as consultas agendadas entre <code>NOW() + 24 HOURS</code> e <code>NOW() + 26 HOURS</code>.
          <br />
          2. A mensagem personalizada é montada com o primeiro nome do paciente, nome do terapeuta e link de confirmação segura.
          <br />
          3. O webhook da <strong>API Oficial do WhatsApp</strong> recebe a resposta "SIM" do paciente e atualiza automaticamente o status da consulta para <strong>"CONFIRMADO"</strong> na agenda da clínica.
        </p>
      </div>

      {/* Queue Cards or Empty State */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E5E2D9] p-8 sm:p-12 text-center shadow-xs">
          <div className="w-14 h-14 bg-[#F2F0EA] text-[#5A5A40] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#E5E2D9]">
            <Smartphone className="w-7 h-7 text-[#5A5A40]" />
          </div>
          <h3 className="text-lg font-serif italic font-bold text-[#3D3D39]">
            Fila de Lembretes Vazia
          </h3>
          <p className="text-xs sm:text-sm text-[#8A8A82] max-w-md mx-auto mt-1.5 leading-relaxed">
            Ao agendar consultas na aba Agenda com a opção de lembrete por WhatsApp ativada, os disparos automáticos de 24 horas antes aparecerão nesta fila de transmissão.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-[#E5E2D9] p-4 shadow-xs space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-[#F2F0EA] text-[#5A5A40] border border-[#E5E2D9]">
                      <Smartphone className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-[#3D3D39]">{item.patient_name}</h4>
                      <span className="text-xs text-[#8A8A82]">{item.patient_phone}</span>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      item.status === 'ENVIADO'
                        ? 'bg-[#F2F0EA] text-[#5A5A40] border border-[#E5E2D9]'
                        : 'bg-[#FAF7F2] text-[#8C4A3B] border border-[#EADFCB]'
                    }`}
                  >
                    {item.status === 'ENVIADO' ? '✓ Enviado' : '⏳ Aguardando Horário (24h)'}
                  </span>
                </div>

                {/* Message Bubble Preview */}
                <div className="bg-[#F2F0EA]/70 border border-[#E5E2D9] rounded-xl p-3 text-xs text-[#3D3D39] relative font-sans">
                  <div className="text-[10px] text-[#5A5A40] font-bold mb-1 flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" /> Preview WhatsApp:
                  </div>
                  <p className="italic">"{item.message_preview}"</p>
                </div>
              </div>

              <div className="pt-2 border-t border-[#E5E2D9] flex items-center justify-between text-[11px] text-[#8A8A82]">
                <span>Consulta: <strong className="text-[#3D3D39]">{item.appointment_datetime}</strong></span>
                <span>Canal: WhatsApp API</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
