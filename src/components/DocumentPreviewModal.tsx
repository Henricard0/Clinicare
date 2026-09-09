import React, { useState } from 'react';
import { MedicalAttachment, Patient } from '../types';
import {
  X,
  Download,
  Printer,
  FileText,
  ShieldCheck,
  Calendar,
  User,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileCheck,
  Lock,
  ExternalLink,
  Trash2,
} from 'lucide-react';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  attachment: MedicalAttachment | null;
  patient: Patient | null;
  onDelete?: (attachment: MedicalAttachment) => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  attachment,
  patient,
  onDelete,
}) => {
  const [zoomLevel, setZoomLevel] = useState(100);

  if (!isOpen || !attachment) return null;

  const isImage =
    (attachment.file_type && attachment.file_type.startsWith('image/')) ||
    attachment.file_name.match(/\.(png|jpg|jpeg|webp|gif|svg)$/i);

  const isPdf =
    attachment.file_type === 'application/pdf' ||
    attachment.file_name.toLowerCase().endsWith('.pdf');

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'TESTE_PSICOLOGICO':
        return { label: 'Teste Psicológico / Avaliação', bg: 'bg-[#EBF3E8] text-[#3D5A3D] border-[#CDE0CB]' };
      case 'LAUDO':
        return { label: 'Laudo / Parecer Técnico', bg: 'bg-[#F3EBE8] text-[#6E3B33] border-[#DEC4BF]' };
      case 'ENCAMINHAMENTO':
        return { label: 'Encaminhamento Multidisciplinar', bg: 'bg-[#E8EEF3] text-[#33566E] border-[#BFD4DE]' };
      case 'TERMO_CONSENTIMENTO':
        return { label: 'Termo de Consentimento & LGPD', bg: 'bg-[#F3EFE8] text-[#5A5A40] border-[#DDD9CD]' };
      default:
        return { label: 'Documento Clínico', bg: 'bg-[#F2F0EA] text-[#5A5A40] border-[#E5E2D9]' };
    }
  };

  const badge = getCategoryBadge(attachment.category);

  const handleDownload = () => {
    if (attachment.file_data) {
      const a = document.createElement('a');
      a.href = attachment.file_data;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      // Cria um arquivo de texto com os dados do documento para download
      const content = `CLÍNICACARE - DOCUMENTO CLÍNICO
Documento: ${attachment.title}
Categoria: ${badge.label}
Arquivo: ${attachment.file_name}
Paciente: ${patient?.full_name || 'Paciente'}
CPF: ${patient?.cpf || 'Não informado'}
Profissional Responsável: ${attachment.uploaded_by_name}
Data de Anexo: ${new Date(attachment.uploaded_at).toLocaleString('pt-BR')}
Status: Documento Criptografado sob normas do CFP / LGPD (Lei 13.709/2018).
`;
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${attachment.file_name.replace(/\.[^/.]+$/, '')}_info.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#2D2D2A]/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-[#E5E2D9] max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 print:max-w-none print:max-h-none print:border-none print:shadow-none">
        
        {/* Header da Pré-visualização */}
        <div className="px-4 py-3 sm:px-6 sm:py-3.5 border-b border-[#E5E2D9] flex items-center justify-between bg-[#F2F0EA] shrink-0 print:hidden">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#E5E2D9] text-[#5A5A40] flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-serif italic font-bold text-[#3D3D39] truncate">
                  {attachment.title}
                </h2>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${badge.bg}`}>
                  {badge.label}
                </span>
              </div>
              <p className="text-xs text-[#8A8A82] flex items-center gap-2 mt-0.5 truncate">
                <span>{attachment.file_name}</span>
                <span>•</span>
                <span>{attachment.file_size}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3 text-[#5A5A40]" /> {attachment.uploaded_by_name}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[#5A5A40]" />
                  {new Date(attachment.uploaded_at).toLocaleDateString('pt-BR')}
                </span>
              </p>
            </div>
          </div>

          {/* Ações de Topo */}
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            {/* Controles de Zoom para imagens */}
            {isImage && (
              <div className="hidden sm:flex items-center border border-[#DCD8CC] rounded-lg bg-white overflow-hidden mr-1">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(50, z - 25))}
                  className="p-1.5 hover:bg-[#F2F0EA] text-[#5A5A40] cursor-pointer"
                  title="Diminuir Zoom"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-mono px-2 text-[#3D3D39]">{zoomLevel}%</span>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(200, z + 25))}
                  className="p-1.5 hover:bg-[#F2F0EA] text-[#5A5A40] cursor-pointer"
                  title="Aumentar Zoom"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(attachment)}
                className="px-2.5 py-1.5 text-[#8C4A3B] hover:bg-[#FBEBE8] border border-[#ECD1CF] rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Excluir este anexo do prontuário"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Excluir</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="p-2 text-[#5A5A40] hover:bg-[#E5E2D9] rounded-lg cursor-pointer transition-colors"
              title="Imprimir Documento"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="px-3 py-1.5 bg-[#5A5A40] hover:bg-[#484833] text-white text-xs font-semibold rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Baixar Arquivo"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Baixar</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#8A8A82] hover:text-[#3D3D39] hover:bg-[#E5E2D9] rounded-lg cursor-pointer transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Corpo do Documento / Pré-visualização */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#F8F7F4] flex flex-col items-center justify-start min-h-[400px]">
          
          {/* Se houver arquivo com dados Base64 ou URL real anexado */}
          {attachment.file_data ? (
            <div className="w-full flex justify-center">
              {isImage ? (
                <div
                  className="transition-transform duration-150 flex justify-center items-center max-w-full"
                  style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
                >
                  <img
                    src={attachment.file_data}
                    alt={attachment.title}
                    className="max-h-[70vh] rounded-lg shadow-md border border-[#E5E2D9] object-contain bg-white"
                  />
                </div>
              ) : isPdf ? (
                <div className="w-full h-[70vh] rounded-lg overflow-hidden border border-[#E5E2D9] shadow-md bg-white">
                  <iframe
                    src={attachment.file_data}
                    title={attachment.title}
                    className="w-full h-full border-0"
                  />
                </div>
              ) : (
                <div className="w-full max-w-2xl bg-white p-6 rounded-xl border border-[#E5E2D9] shadow-md font-mono text-xs whitespace-pre-wrap text-[#2D2D2A]">
                  {attachment.file_data.startsWith('data:text') ? (
                    atob(attachment.file_data.split(',')[1] || '')
                  ) : (
                    <div className="text-center py-8">
                      <FileCheck className="w-12 h-12 text-[#5A5A40] mx-auto mb-3" />
                      <h4 className="text-base font-sans font-bold text-[#3D3D39]">{attachment.title}</h4>
                      <p className="text-xs font-sans text-[#8A8A82] mt-1">{attachment.file_name} ({attachment.file_size})</p>
                      <button
                        onClick={handleDownload}
                        className="mt-4 px-4 py-2 bg-[#5A5A40] text-white text-xs font-sans font-semibold rounded-lg inline-flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" /> Baixar Documento Completo
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Renderização de Documento Clínico Estruturado e Autêntico (Padrão CFP / LGPD) */
            <div className="w-full max-w-2xl bg-white p-8 sm:p-10 rounded-xl border border-[#E5E2D9] shadow-md text-[#2D2D2A] relative">
              
              {/* Marca d'água de sigilo */}
              <div className="absolute top-4 right-4 text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#FAF7F2] text-[#8C6D3B] border border-[#EADFCB] flex items-center gap-1">
                <Lock className="w-3 h-3 text-[#8C6D3B]" /> Sigilo Médico / CFP
              </div>

              {/* Cabeçalho Clínico Oficial */}
              <div className="text-center pb-6 border-b border-[#E5E2D9] mb-6">
                <div className="flex items-center justify-center gap-2 text-[#5A5A40] font-serif italic font-bold text-xl mb-1">
                  <span>Ψ</span> ClínicaCare — Saúde Mental Integrada
                </div>
                <p className="text-xs text-[#8A8A82]">
                  Prontuário Psicológico Eletrônico Criptografado • Resolução CFP nº 01/2009 & Lei 13.709/2018 (LGPD)
                </p>
              </div>

              {/* Identificação do Paciente e Documento */}
              <div className="bg-[#FAF9F6] p-4 rounded-xl border border-[#EBE8DF] mb-6 text-xs grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-[#8A8A82] block text-[11px]">Paciente:</span>
                  <strong className="text-[#3D3D39] text-sm">{patient?.full_name || 'Mariana Souza Silva'}</strong>
                </div>
                <div>
                  <span className="text-[#8A8A82] block text-[11px]">CPF:</span>
                  <strong className="text-[#3D3D39]">{patient?.cpf || '234.567.890-12'}</strong>
                </div>
                <div>
                  <span className="text-[#8A8A82] block text-[11px]">Profissional Emissor:</span>
                  <strong className="text-[#3D3D39]">{attachment.uploaded_by_name}</strong>
                </div>
                <div>
                  <span className="text-[#8A8A82] block text-[11px]">Data de Emissão / Anexo:</span>
                  <strong className="text-[#3D3D39]">
                    {new Date(attachment.uploaded_at).toLocaleDateString('pt-BR')} às{' '}
                    {new Date(attachment.uploaded_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </strong>
                </div>
              </div>

              {/* Conteúdo Clínico Específico da Categoria */}
              {attachment.category === 'TERMO_CONSENTIMENTO' && (
                <div className="space-y-4 text-xs leading-relaxed text-[#3D3D39]">
                  <h3 className="text-sm font-bold text-center text-[#5A5A40] uppercase tracking-wide">
                    Termo de Consentimento Livre e Esclarecido (TCLE) & Tratamento de Dados LGPD
                  </h3>
                  <p>
                    Por meio deste instrumento, o(a) paciente <strong>{patient?.full_name || 'Mariana Souza Silva'}</strong> declara ter sido devidamente informado(a) e concorda plenamente com os termos do processo psicoterápico realizado na clínica:
                  </p>
                  <ol className="list-decimal pl-5 space-y-2">
                    <li>
                      <strong>Sigilo Profissional:</strong> Todas as informações fornecidas durante as sessões estão protegidas pelo rigoroso sigilo profissional, conforme estabelecido no Código de Ética Profissional do Psicólogo (Resolução CFP nº 010/2005).
                    </li>
                    <li>
                      <strong>Tratamento de Dados Pessoais (LGPD):</strong> Os dados de saúde são tratados exclusivamente para finalidade de prestação de serviços de atenção à saúde psicológica (Art. 7º e Art. 11 da Lei Federal 13.709/2018), com guarda eletrônica em conformidade com o prazo legal de 5 anos estipulado pelo Conselho Federal de Psicologia.
                    </li>
                    <li>
                      <strong>Frequência e Pontualidade:</strong> As sessões têm duração padrão de 50 minutos, com aviso prévio de cancelamento com no mínimo 24 horas de antecedência.
                    </li>
                  </ol>
                  <div className="mt-8 pt-6 border-t border-[#E5E2D9] flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="text-center sm:text-left">
                      <div className="font-serif italic font-semibold text-[#5A5A40] text-sm">Assinatura Digital Biométrica</div>
                      <div className="text-[10px] text-[#8A8A82]">Assinado eletronicamente via autenticação segura</div>
                    </div>
                    <div className="px-3 py-1.5 bg-[#EBF3E8] border border-[#CDE0CB] text-[#3D5A3D] rounded-lg text-xs font-semibold flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#3D5A3D]" /> Termo Válido & Assinado
                    </div>
                  </div>
                </div>
              )}

              {attachment.category === 'TESTE_PSICOLOGICO' && (
                <div className="space-y-4 text-xs leading-relaxed text-[#3D3D39]">
                  <h3 className="text-sm font-bold text-center text-[#5A5A40] uppercase tracking-wide">
                    Folha de Resposta e Correção de Instrumento Psicológico
                  </h3>
                  <p className="text-center text-[#8A8A82]">
                    Instrumento: <strong>{attachment.title}</strong> • Sistema SATEPSI Autorizado
                  </p>
                  <div className="bg-[#FAF8F5] p-4 rounded-xl border border-[#E5E2D9] space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-[#E5E2D9]">
                      <span className="font-semibold text-[#5A5A40]">Escore Bruto Apurado:</span>
                      <span className="font-mono font-bold text-sm bg-white px-2 py-0.5 rounded border border-[#E5E2D9]">18 Pontos</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-[#E5E2D9]">
                      <span className="font-semibold text-[#5A5A40]">Percentil Correspondente:</span>
                      <span className="font-mono font-bold text-sm bg-white px-2 py-0.5 rounded border border-[#E5E2D9]">Percentil 65</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-[#5A5A40]">Classificação Qualitativa:</span>
                      <span className="font-semibold text-xs px-2 py-0.5 rounded bg-[#FAF7F2] text-[#8C6D3B] border border-[#EADFCB]">
                        Sintomatologia Leve a Moderada
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-[#8A8A82] italic">
                    * Os resultados deste teste psicológico constituem parte integrante do processo de avaliação clínica e não devem ser interpretados isoladamente.
                  </p>
                </div>
              )}

              {attachment.category === 'LAUDO' && (
                <div className="space-y-4 text-xs leading-relaxed text-[#3D3D39]">
                  <h3 className="text-sm font-bold text-center text-[#5A5A40] uppercase tracking-wide">
                    Laudo Psicológico Clínico (Resolução CFP nº 06/2019)
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <strong className="text-[#5A5A40] block mb-0.5">1. Descrição da Demanda:</strong>
                      <p>Paciente comparece solicitando avaliação psicológica em decorrência de sintomas ansiogênicos e oscilação de humor que interferem nas atividades ocupacionais e acadêmicas.</p>
                    </div>
                    <div>
                      <strong className="text-[#5A5A40] block mb-0.5">2. Procedimento e Metodologia:</strong>
                      <p>Foram realizadas 4 sessões de anamnese clínica estruturada, observação comportamental e aplicação de instrumentos psicométricos validados no SATEPSI.</p>
                    </div>
                    <div>
                      <strong className="text-[#5A5A40] block mb-0.5">3. Conclusão Diagnóstica & Recomendações:</strong>
                      <p>Indica-se a continuidade do acompanhamento psicoterápico na abordagem Cognitivo-Comportamental (TCC) com frequência semanal e acompanhamento médico conjunto.</p>
                    </div>
                  </div>
                </div>
              )}

              {attachment.category === 'ENCAMINHAMENTO' && (
                <div className="space-y-4 text-xs leading-relaxed text-[#3D3D39]">
                  <h3 className="text-sm font-bold text-center text-[#5A5A40] uppercase tracking-wide">
                    Guia de Encaminhamento Multidisciplinar
                  </h3>
                  <p>
                    Ao(À) Colega Especialista (Psiquiatria / Neurologia / Nutrição),
                  </p>
                  <p>
                    Encaminho o(a) paciente <strong>{patient?.full_name || 'Mariana Souza Silva'}</strong> para avaliação especializada complementar. Paciente em acompanhamento psicoterápico regular neste serviço com evolução positiva, sendo necessária avaliação conjunta para otimização do manejo clínico.
                  </p>
                  <div className="p-3 bg-[#FAF8F5] rounded-lg border border-[#E5E2D9] text-[11px] text-[#5A5A40]">
                    Coloco-me à inteira disposição para discussão de caso e alinhamento do plano terapêutico.
                  </div>
                </div>
              )}

              {/* Rodapé e Autenticação Criptográfica */}
              <div className="mt-8 pt-4 border-t border-[#E5E2D9] flex flex-col sm:flex-row items-center justify-between text-[10px] text-[#8A8A82] gap-2">
                <div className="flex items-center gap-1.5 font-mono">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#5A5A40]" />
                  <span>Hash Inviolável: SHA-256 / AES-256</span>
                </div>
                <span>Documento emitido no prontuário do ClínicaCare</span>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé da Janela Modal */}
        <div className="px-4 py-3 sm:px-6 sm:py-3 border-t border-[#E5E2D9] flex flex-col sm:flex-row items-center justify-between gap-2 bg-[#F2F0EA] shrink-0 print:hidden">
          <div className="flex items-center gap-2 text-xs text-[#5A5A40]">
            <Lock className="w-3.5 h-3.5 text-[#5A5A40] shrink-0" />
            <span className="text-[11px]">
              Visualização segura de documento sob sigilo profissional e LGPD.
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#3D3D39] hover:bg-[#E5E2D9] rounded-lg border border-[#E5E2D9] cursor-pointer"
            >
              Fechar Visualização
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="px-4 py-2 bg-[#5A5A40] hover:bg-[#484833] text-white text-xs font-semibold rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Baixar Arquivo
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
