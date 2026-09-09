import React, { useState } from 'react';
import { AuditLog, User } from '../types';
import { Shield, ShieldAlert, CheckCircle2, Lock, Clock, Filter, AlertTriangle } from 'lucide-react';

interface AuditLogsViewProps {
  logs: AuditLog[];
  currentUser: User;
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({ logs, currentUser }) => {
  const [filterType, setFilterType] = useState<'ALL' | 'CRITICAL' | 'BLOCKED'>('ALL');

  const filtered = logs.filter((log) => {
    if (filterType === 'CRITICAL' && !log.lgpd_critical) return false;
    if (filterType === 'BLOCKED' && log.action !== 'BLOCKED_ACCESS_ATTEMPT') return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-[#E5E2D9] p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-serif italic font-bold text-[#3D3D39]">Trilha de Auditoria e Conformidade LGPD</h1>
            <span className="bg-[#F2F0EA] text-[#5A5A40] text-xs px-2.5 py-0.5 rounded-md font-medium border border-[#E5E2D9] flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" /> Artigo 6º e 11 LGPD
            </span>
          </div>
          <p className="text-xs text-[#8A8A82] mt-0.5">
            Registro cronológico inalterável de todas as leituras, criações, edições e tentativas de acessos indevidos aos dados de saúde.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="bg-[#F2F0EA] border border-[#E5E2D9] text-[#2D2D2A] text-xs rounded-lg px-3 py-2 font-medium focus:border-[#5A5A40] focus:outline-hidden"
          >
            <option value="ALL">Todos os Eventos</option>
            <option value="CRITICAL">Apenas Críticos LGPD (Prontuários)</option>
            <option value="BLOCKED">Acessos Bloqueados (403 Forbidden)</option>
          </select>
        </div>
      </div>

      {/* Logs Table (Desktop) & Card List (Mobile) */}
      <div className="bg-white rounded-xl border border-[#E5E2D9] shadow-xs overflow-hidden">
        {/* Mobile View: Cards */}
        <div className="block md:hidden divide-y divide-[#E5E2D9]">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#8A8A82]">Nenhum registro encontrado para este filtro.</div>
          ) : (
            filtered.map((log) => {
              const isBlocked = log.action === 'BLOCKED_ACCESS_ATTEMPT';
              return (
                <div
                  key={log.id}
                  className={`p-3.5 space-y-2 ${
                    isBlocked ? 'bg-[#FAF7F2]' : log.lgpd_critical ? 'bg-[#F2F0EA]/30' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-semibold text-xs text-[#2D2D2A] truncate">{log.user_name}</span>
                      <span className="text-[10px] text-[#8A8A82] bg-[#F2F0EA] px-1.5 py-0.5 rounded border border-[#E5E2D9] shrink-0">
                        {log.user_role}
                      </span>
                    </div>
                    {isBlocked ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF7F2] text-[#8C4A3B] border border-[#EADFCB] shrink-0">
                        <ShieldAlert className="w-3 h-3" /> Bloqueado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#F2F0EA] text-[#3D3D39] border border-[#E5E2D9] shrink-0">
                        {log.action}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[#3D3D39] font-sans leading-relaxed">{log.details}</p>

                  <div className="flex items-center justify-between text-[11px] text-[#8A8A82] pt-1 font-mono">
                    <span className="font-semibold text-[#5A5A40] font-sans">{log.resource}</span>
                    <span>{new Date(log.timestamp).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs text-[#3D3D39]">
            <thead className="bg-[#F2F0EA] text-[#3D3D39] font-semibold border-b border-[#E5E2D9] uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5">Data / Hora</th>
                <th className="p-3.5">Usuário (Perfil)</th>
                <th className="p-3.5">Ação</th>
                <th className="p-3.5">Recurso</th>
                <th className="p-3.5">Detalhes do Evento</th>
                <th className="p-3.5">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E2D9] font-mono">
              {filtered.map((log) => {
                const isBlocked = log.action === 'BLOCKED_ACCESS_ATTEMPT';

                return (
                  <tr
                    key={log.id}
                    className={`hover:bg-[#F2F0EA]/60 transition-colors ${
                      isBlocked ? 'bg-[#FAF7F2]' : log.lgpd_critical ? 'bg-[#F2F0EA]/30' : ''
                    }`}
                  >
                    <td className="p-3.5 whitespace-nowrap text-[#8A8A82] font-sans">
                      {new Date(log.timestamp).toLocaleString('pt-BR')}
                    </td>
                    <td className="p-3.5 whitespace-nowrap font-sans font-medium text-[#2D2D2A]">
                      {log.user_name} ({log.user_role})
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      {isBlocked ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#FAF7F2] text-[#8C4A3B] border border-[#EADFCB]">
                          <ShieldAlert className="w-3 h-3" /> ACESSO BARRADO
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#F2F0EA] text-[#3D3D39] border border-[#E5E2D9]">
                          {log.action}
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 whitespace-nowrap font-sans">
                      <span className="font-semibold text-[#3D3D39]">{log.resource}</span>
                    </td>
                    <td className="p-3.5 font-sans text-[#3D3D39] max-w-md">
                      {log.details}
                    </td>
                    <td className="p-3.5 text-[#8A8A82] whitespace-nowrap">
                      {log.ip_address}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
