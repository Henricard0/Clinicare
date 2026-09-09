import React, { useState } from 'react';
import { Patient, User } from '../types';
import { X, Upload, FileText, CheckCircle2, Eye, Trash2 } from 'lucide-react';
import { getAuthHeaders } from '../utils/auth';

interface UploadAttachmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  currentUser: User;
  onUploaded: () => void;
}

export const UploadAttachmentModal: React.FC<UploadAttachmentModalProps> = ({
  isOpen,
  onClose,
  patient,
  currentUser,
  onUploaded,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'TESTE_PSICOLOGICO' | 'ENCAMINHAMENTO' | 'TERMO_CONSENTIMENTO' | 'LAUDO'>('TESTE_PSICOLOGICO');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [fileType, setFileType] = useState('');
  const [fileData, setFileData] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Calcula tamanho legível
    const sizeInMb = file.size / (1024 * 1024);
    const formattedSize = sizeInMb >= 1 ? `${sizeInMb.toFixed(1)} MB` : `${Math.round(file.size / 1024)} KB`;

    setFileName(file.name);
    setFileSize(formattedSize);
    setFileType(file.type || 'application/octet-stream');

    if (!title) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFileData(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setFileName('');
    setFileSize('');
    setFileType('');
    setFileData(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    setError(null);
    setIsSubmitting(true);

    try {
      const finalFileName = fileName || `${title.toLowerCase().replace(/\s+/g, '_')}.pdf`;
      const res = await fetch(`/api/patients/${patient.id}/attachments`, {
        method: 'POST',
        headers: getAuthHeaders(
          { 'Content-Type': 'application/json' },
          undefined,
          currentUser.id
        ),
        body: JSON.stringify({
          title,
          category,
          file_name: finalFileName,
          file_size: fileSize || '1.1 MB',
          file_type: fileType || 'application/pdf',
          file_data: fileData || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao anexar arquivo');

      onUploaded();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#2D2D2A]/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-md w-full shadow-2xl border border-[#E5E2D9] max-h-[92vh] sm:max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Mobile drag handle */}
        <div className="pt-2 sm:hidden flex justify-center bg-[#F2F0EA]">
          <div className="w-12 h-1 bg-[#D1CEC3] rounded-full"></div>
        </div>

        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-[#E5E2D9] flex items-center justify-between bg-[#F2F0EA] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#E5E2D9] text-[#5A5A40] flex items-center justify-center shrink-0">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-serif italic font-bold text-[#3D3D39]">Anexar Documento</h2>
              <p className="text-xs text-[#8A8A82]">Paciente: {patient.full_name}</p>
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
          {error && <div className="p-3 bg-[#FAF7F2] text-[#8C4A3B] border border-[#EADFCB] text-xs rounded-lg">{error}</div>}

          <div>
            <label className="block text-xs font-semibold text-[#3D3D39] mb-1">Título do Documento *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Escala de Depressão Beck (BDI-II)"
              className="w-full text-sm bg-[#F2F0EA] border border-[#E5E2D9] rounded-lg p-2.5 focus:border-[#5A5A40] focus:outline-hidden text-[#2D2D2A] placeholder:text-[#8A8A82] min-h-[40px]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#3D3D39] mb-1">Categoria *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full text-sm bg-[#F2F0EA] border border-[#E5E2D9] rounded-lg p-2.5 focus:border-[#5A5A40] focus:outline-hidden text-[#2D2D2A] min-h-[40px]"
            >
              <option value="TESTE_PSICOLOGICO">Teste Psicológico / Avaliação</option>
              <option value="LAUDO">Laudo / Parecer Psicológico</option>
              <option value="ENCAMINHAMENTO">Encaminhamento Médico</option>
              <option value="TERMO_CONSENTIMENTO">Termo de Consentimento / Contrato</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#3D3D39] mb-1">Arquivo (PDF, PNG, JPG, DOCX)</label>
            {!fileData ? (
              <label htmlFor="file-upload-input" className="block border-2 border-dashed border-[#E5E2D9] rounded-xl p-5 text-center hover:border-[#5A5A40] transition-colors bg-[#F2F0EA] cursor-pointer group">
                <Upload className="w-6 h-6 text-[#8A8A82] group-hover:text-[#5A5A40] mx-auto mb-1 transition-colors" />
                <span className="text-xs font-semibold text-[#3D3D39] block">Toque para selecionar ou arraste o arquivo</span>
                <span className="text-[11px] text-[#8A8A82]">Armazenamento seguro com pré-visualização instantânea</span>
                <input
                  type="file"
                  className="hidden"
                  id="file-upload-input"
                  onChange={handleFileChange}
                />
              </label>
            ) : (
              <div className="rounded-xl border border-[#D9D6CC] bg-[#FAF8F5] p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="w-8 h-8 rounded-lg bg-[#E5E2D9] text-[#5A5A40] flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <span className="text-xs font-bold text-[#3D3D39] truncate block">{fileName}</span>
                      <span className="text-[11px] text-[#8A8A82]">{fileSize}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="p-1.5 text-[#8A8A82] hover:text-[#8C4A3B] rounded-lg hover:bg-white cursor-pointer"
                    title="Remover arquivo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Miniatura / Pré-visualização Instantânea */}
                {fileType.startsWith('image/') && (
                  <div className="mt-2 pt-2 border-t border-[#E5E2D9] flex justify-center">
                    <img
                      src={fileData}
                      alt="Pré-visualização"
                      className="max-h-36 rounded-lg object-contain border border-[#E5E2D9] bg-white"
                    />
                  </div>
                )}
                {fileType === 'application/pdf' && (
                  <div className="mt-2 pt-2 border-t border-[#E5E2D9] flex items-center gap-1.5 text-xs text-[#5A5A40] font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#5A5A40]" />
                    <span>PDF pronto para visualização e leitura no prontuário</span>
                  </div>
                )}
              </div>
            )}
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
              {isSubmitting ? 'Enviando...' : 'Salvar no Prontuário'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
