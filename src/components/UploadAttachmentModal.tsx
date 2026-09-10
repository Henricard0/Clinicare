import React, { useState, useRef } from 'react';
import { Patient, User } from '../types';
import { X, Upload, FileText, CheckCircle2, Trash2, Loader2, AlertCircle } from 'lucide-react';
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
  const [isDragging, setIsDragging] = useState(false);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const processFile = (file: File) => {
    setError(null);

    // Validação de tamanho (máximo 30MB)
    const sizeInMb = file.size / (1024 * 1024);
    if (sizeInMb > 30) {
      setError('O arquivo selecionado excede o limite máximo permitido de 30 MB.');
      return;
    }

    const formattedSize = sizeInMb >= 1 ? `${sizeInMb.toFixed(1)} MB` : `${Math.round(file.size / 1024)} KB`;
    setFileName(file.name);
    setFileSize(formattedSize);
    setFileType(file.type || 'application/octet-stream');

    if (!title) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }

    setIsReadingFile(true);

    // Se for imagem, faz leitura e otimização inteligente para carregamento rápido
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        const img = new Image();
        img.onload = () => {
          try {
            const MAX_DIM = 1920;
            let width = img.width;
            let height = img.height;
            if (width > MAX_DIM || height > MAX_DIM) {
              if (width > height) {
                height = Math.round((height * MAX_DIM) / width);
                width = MAX_DIM;
              } else {
                width = Math.round((width * MAX_DIM) / height);
                height = MAX_DIM;
              }
              const canvas = document.createElement('canvas');
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                const optimizedData = canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.88);
                setFileData(optimizedData);
                setIsReadingFile(false);
                return;
              }
            }
            setFileData(result);
          } catch {
            setFileData(result);
          } finally {
            setIsReadingFile(false);
          }
        };
        img.onerror = () => {
          setFileData(result);
          setIsReadingFile(false);
        };
        img.src = result;
      };
      reader.onerror = () => {
        setError('Não foi possível ler a imagem selecionada. Tente outro arquivo.');
        setIsReadingFile(false);
      };
      reader.readAsDataURL(file);
    } else {
      // Arquivos PDF, DOCX, TXT e outros documentos
      const reader = new FileReader();
      reader.onload = () => {
        setFileData(reader.result as string);
        setIsReadingFile(false);
      };
      reader.onerror = () => {
        setError('Erro ao processar o arquivo selecionado. Verifique as permissões de leitura.');
        setIsReadingFile(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // Reseta o valor para permitir re-selecionar o mesmo arquivo se desejado
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleRemoveFile = () => {
    setFileName('');
    setFileSize('');
    setFileType('');
    setFileData(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      setError('Por favor, defina um título para o documento.');
      return;
    }
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
          title: title.trim(),
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
      setError(err.message || 'Falha ao conectar com o servidor para salvar o documento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-[#1E1E1A] rounded-t-2xl sm:rounded-2xl max-w-md w-full shadow-2xl border border-[#E5E2D9] dark:border-[#383832] max-h-[92vh] sm:max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Mobile drag handle */}
        <div className="pt-2 sm:hidden flex justify-center bg-[#F2F0EA] dark:bg-[#272722]">
          <div className="w-12 h-1 bg-[#D1CEC3] dark:bg-[#4A4A40] rounded-full"></div>
        </div>

        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-[#E5E2D9] dark:border-[#383832] flex items-center justify-between bg-[#F2F0EA] dark:bg-[#272722] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#E5E2D9] dark:bg-[#383830] text-[#5A5A40] dark:text-[#D6D6B8] flex items-center justify-center shrink-0">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-serif italic font-bold text-[#3D3D39] dark:text-[#EFECE6]">Anexar Documento</h2>
              <p className="text-xs text-[#8A8A82] dark:text-[#A3A196]">Paciente: {patient.full_name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#8A8A82] dark:text-[#A3A196] hover:text-[#3D3D39] dark:hover:text-white p-1.5 rounded-lg hover:bg-[#E5E2D9] dark:hover:bg-[#383830] cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-[#FAF7F2] dark:bg-[#2A1E1E] text-[#8C4A3B] dark:text-[#F87171] border border-[#EADFCB] dark:border-[#4A2828] text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#3D3D39] dark:text-[#EFECE6] mb-1">Título do Documento *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Escala de Depressão Beck (BDI-II)"
              className="w-full text-sm bg-[#F2F0EA] dark:bg-[#242420] border border-[#E5E2D9] dark:border-[#383832] rounded-lg p-2.5 focus:border-[#5A5A40] dark:focus:border-[#8D8D68] focus:outline-hidden text-[#2D2D2A] dark:text-[#EFECE6] placeholder:text-[#8A8A82] dark:placeholder:text-[#787770] min-h-[40px]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#3D3D39] dark:text-[#EFECE6] mb-1">Categoria *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full text-sm bg-[#F2F0EA] dark:bg-[#242420] border border-[#E5E2D9] dark:border-[#383832] rounded-lg p-2.5 focus:border-[#5A5A40] dark:focus:border-[#8D8D68] focus:outline-hidden text-[#2D2D2A] dark:text-[#EFECE6] min-h-[40px]"
            >
              <option value="TESTE_PSICOLOGICO">Teste Psicológico / Avaliação</option>
              <option value="LAUDO">Laudo / Parecer Psicológico</option>
              <option value="ENCAMINHAMENTO">Encaminhamento Médico</option>
              <option value="TERMO_CONSENTIMENTO">Termo de Consentimento / Contrato</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#3D3D39] dark:text-[#EFECE6] mb-1">Arquivo (PDF, PNG, JPG, WEBP, DOCX)</label>
            {!fileData && !isReadingFile ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer group ${
                  isDragging
                    ? 'border-[#5A5A40] dark:border-[#B5B590] bg-[#EBEBE3] dark:bg-[#303028] scale-[1.01]'
                    : 'border-[#E5E2D9] dark:border-[#383832] hover:border-[#5A5A40] dark:hover:border-[#8D8D68] bg-[#F2F0EA] dark:bg-[#242420]'
                }`}
              >
                <Upload className="w-6 h-6 text-[#8A8A82] dark:text-[#A3A196] group-hover:text-[#5A5A40] dark:group-hover:text-[#B5B590] mx-auto mb-1 transition-colors" />
                <span className="text-xs font-semibold text-[#3D3D39] dark:text-[#EFECE6] block">
                  {isDragging ? 'Solte o arquivo para carregar' : 'Toque para selecionar ou arraste o arquivo'}
                </span>
                <span className="text-[11px] text-[#8A8A82] dark:text-[#787770]">
                  Suporta imagens, PDFs e relatórios (até 30 MB)
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  id="file-upload-input"
                  accept="application/pdf,image/*,.docx,.doc,.txt"
                  onChange={handleFileChange}
                />
              </div>
            ) : isReadingFile ? (
              <div className="rounded-xl border border-[#D9D6CC] dark:border-[#383832] bg-[#FAF8F5] dark:bg-[#242420] p-6 text-center space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-[#5A5A40] dark:text-[#B5B590] mx-auto" />
                <span className="text-xs font-semibold text-[#3D3D39] dark:text-[#EFECE6] block">Processando arquivo...</span>
              </div>
            ) : (
              <div className="rounded-xl border border-[#D9D6CC] dark:border-[#383832] bg-[#FAF8F5] dark:bg-[#242420] p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="w-8 h-8 rounded-lg bg-[#E5E2D9] dark:bg-[#383830] text-[#5A5A40] dark:text-[#D6D6B8] flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <span className="text-xs font-bold text-[#3D3D39] dark:text-[#EFECE6] truncate block">{fileName}</span>
                      <span className="text-[11px] text-[#8A8A82] dark:text-[#A3A196]">{fileSize}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="p-1.5 text-[#8A8A82] hover:text-[#8C4A3B] dark:hover:text-[#F87171] rounded-lg hover:bg-white dark:hover:bg-[#2C2C26] cursor-pointer transition-colors"
                    title="Remover arquivo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Miniatura / Pré-visualização Instantânea */}
                {fileType.startsWith('image/') && fileData && (
                  <div className="mt-2 pt-2 border-t border-[#E5E2D9] dark:border-[#383832] flex justify-center">
                    <img
                      src={fileData}
                      alt="Pré-visualização"
                      className="max-h-36 rounded-lg object-contain border border-[#E5E2D9] dark:border-[#383832] bg-white dark:bg-[#1E1E1A]"
                    />
                  </div>
                )}
                {fileType === 'application/pdf' && (
                  <div className="mt-2 pt-2 border-t border-[#E5E2D9] dark:border-[#383832] flex items-center gap-1.5 text-xs text-[#5A5A40] dark:text-[#86EFAC] font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#5A5A40] dark:text-[#86EFAC]" />
                    <span>PDF pronto para visualização e leitura no prontuário</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-[#E5E2D9] dark:border-[#383832] flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-xs font-semibold text-[#3D3D39] dark:text-[#EFECE6] hover:bg-[#F2F0EA] dark:hover:bg-[#2C2C26] rounded-lg border border-[#E5E2D9] dark:border-[#383832] cursor-pointer min-h-[40px] sm:min-h-0 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isReadingFile}
              className="w-full sm:w-auto px-5 py-2.5 sm:py-2 text-xs font-semibold bg-[#5A5A40] hover:bg-[#484833] text-white rounded-lg shadow-xs flex items-center justify-center gap-1.5 cursor-pointer min-h-[42px] sm:min-h-0 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Enviando...</span>
                </>
              ) : (
                'Salvar no Prontuário'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
