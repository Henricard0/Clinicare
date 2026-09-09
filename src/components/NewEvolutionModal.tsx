import React, { useState } from 'react';
import { Patient, User } from '../types';
import { X, FileSignature, Lock, ShieldCheck, AlertCircle } from 'lucide-react';
import { getAuthHeaders } from '../utils/auth';

interface NewEvolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  currentUser: User;
  onSaved?: () => void;
  onCreated?: () => void;
}

export const NewEvolutionModal: React.FC<NewEvolutionModalProps> = ({
  isOpen,
  onClose,
  patient,
  currentUser,
  onSaved,
  onCreated,
}) => {
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [sessionNumber, setSessionNumber] = useState(1);
  const [subjective, setSubjective] = useState('');
  const [assessment, setAssessment] = useState('');
  const [intervention, setIntervention] = useState('');
  const [plan, setPlan] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/patients/${patient.id}/records`, {
        method: 'POST',
        headers: getAuthHeaders(
          { 'Content-Type': 'application/json' },
          undefined,
          currentUser.id
        ),
        body: JSON.stringify({
          session_number: sessionNumber,
          session_date: sessionDate,
          subjective,
          assessment,
          intervention,
          plan,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao registrar evolução');

      if (onSaved) onSaved();
      if (onCreated) onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#2D2D2A]/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-2xl w-full shadow-2xl border border-[#E5E2D9] max-h-[92vh] sm:max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Mobile drag handle */}
        <div className="pt-2 sm:hidden flex justify-center bg-[#F2F0EA]">
          <div className="w-12 h-1 bg-[#D1CEC3] rounded-full"></div>
        </div>

        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-[#E5E2D9] flex items-center justify-between bg-[#F2F0EA] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#E5E2D9] text-[#5A5A40] flex items-center justify-center shrink-0">
              <FileSignature className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-serif italic font-bold text-[#3D3D39]">Registrar Evolução</h2>
              <p className="text-xs text-[#8A8A82]">Paciente: <strong>{patient.full_name}</strong> • Registro Inviolável</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#8A8A82] hover:text-[#3D3D39] p-1.5 rounded-lg hover:bg-[#E5E2D9] cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3.5 sm:space-y-4 overflow-y-auto flex-1">
          {error && <div className="p-3 bg-[#FAF7F2] text-[#8C4A3B] border border-[#EADFCB] text-xs rounded-lg">{error}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#3D3D39] mb-1">Nº da Sessão</label>
              <input
                type="number"
                value={sessionNumber}
                onChange={(e) => setSessionNumber(Number(e.target.value))}
                required
                className="w-full text-sm bg-[#F2F0EA] border border-[#E5E2D9] rounded-lg p-2.5 text-[#2D2D2A] focus:border-[#5A5A40] focus:outline-hidden min-h-[40px]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#3D3D39] mb-1">Data do Atendimento</label>
              <input
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                required
                className="w-full text-sm bg-[#F2F0EA] border border-[#E5E2D9] rounded-lg p-2.5 text-[#2D2D2A] focus:border-[#5A5A40] focus:outline-hidden min-h-[40px]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#3D3D39] mb-1">
              1. Relato Subjetivo do Paciente (Demanda Trazida) *
            </label>
            <textarea
              rows={3}
              required
              value={subjective}
              onChange={(e) => setSubjective(e.target.value)}
              placeholder="O que o paciente relatou sobre sua semana, sentimentos, pensamentos e sintomas..."
              className="w-full text-sm bg-[#F2F0EA] border border-[#E5E2D9] rounded-lg p-2.5 focus:border-[#5A5A40] focus:outline-hidden text-[#2D2D2A] placeholder:text-[#8A8A82]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#3D3D39] mb-1">
              2. Avaliação Clínica do Profissional (Raciocínio Diagnóstico) *
            </label>
            <textarea
              rows={3}
              required
              value={assessment}
              onChange={(e) => setAssessment(e.target.value)}
              placeholder="Análise comportamental, padrões cognitivos observados, evolução dos sintomas..."
              className="w-full text-sm bg-[#F2F0EA] border border-[#E5E2D9] rounded-lg p-2.5 focus:border-[#5A5A40] focus:outline-hidden text-[#2D2D2A] placeholder:text-[#8A8A82]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#3D3D39] mb-1">
                3. Intervenção Técnica Realizada
              </label>
              <textarea
                rows={2}
                value={intervention}
                onChange={(e) => setIntervention(e.target.value)}
                placeholder="Técnicas utilizadas (ex: RPD, exposição, psicoeducação...)"
                className="w-full text-sm bg-[#F2F0EA] border border-[#E5E2D9] rounded-lg p-2.5 focus:border-[#5A5A40] focus:outline-hidden text-[#2D2D2A] placeholder:text-[#8A8A82]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#3D3D39] mb-1">
                4. Plano & Tarefas para a Próxima Sessão
              </label>
              <textarea
                rows={2}
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                placeholder="Metas combinadas, exercícios de casa, encaminhamentos..."
                className="w-full text-sm bg-[#F2F0EA] border border-[#E5E2D9] rounded-lg p-2.5 focus:border-[#5A5A40] focus:outline-hidden text-[#2D2D2A] placeholder:text-[#8A8A82]"
              />
            </div>
          </div>

          {/* Inviolability & Encryption Seal Warning */}
          <div className="bg-[#FAF7F2] border border-[#E5E2D9] rounded-xl p-3.5 text-xs text-[#3D3D39] flex items-start gap-2.5">
            <Lock className="w-5 h-5 text-[#5A5A40] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-[#5A5A40] block">Garantia de Inviolabilidade & Criptografia LGPD</span>
              <p className="text-[11px] text-[#8A8A82] mt-0.5 leading-relaxed">
                Ao clicar em "Selar e Salvar", o sistema gerará um hash digital <strong>SHA-256</strong> e
                criptografará o conteúdo em <strong>AES-256-GCM</strong>. Em conformidade com o Código de Ética e a LGPD,
                este registro não poderá sofrer edições retroativas ou adulterações silenciosas.
              </p>
            </div>
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
              className="w-full sm:w-auto px-5 py-2.5 sm:py-2 text-xs font-semibold bg-[#5A5A40] hover:bg-[#484833] text-white rounded-lg shadow-xs flex items-center justify-center gap-1.5 cursor-pointer min-h-[42px] sm:min-h-0"
            >
              {isSubmitting ? 'Criptografando & Selando...' : 'Selar e Salvar Evolução'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
