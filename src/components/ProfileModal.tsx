import React, { useState, useRef } from 'react';
import { User } from '../types';
import {
  X,
  User as UserIcon,
  Camera,
  Upload,
  Key,
  Shield,
  Check,
  AlertCircle,
  Phone,
  Sparkles,
  Eye,
  EyeOff,
  RefreshCw,
  CheckCircle2,
  Sun,
  Moon,
  HelpCircle,
} from 'lucide-react';
import { PsychologySymbol } from './PsychologySymbol';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onUpdateSuccess: (updatedUser: User) => void;
  token: string | null;
  currentTheme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  onStartTour?: () => void;
}

// Galeria de avatares profissionais pré-selecionados para saúde mental / clínica
const PRESET_AVATARS = [
  {
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    label: 'Dra. Beatriz',
  },
  {
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    label: 'Dr. Henrique',
  },
  {
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
    label: 'Dra. Camila',
  },
  {
    url: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&auto=format&fit=crop&q=80',
    label: 'Dr. Lucas',
  },
  {
    url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80',
    label: 'Dra. Juliana',
  },
  {
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    label: 'Dr. Eduardo',
  },
  {
    url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&auto=format&fit=crop&q=80',
    label: 'Dra. Renata',
  },
  {
    url: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=200&auto=format&fit=crop&q=80',
    label: 'Dr. Roberto',
  },
];

const SPECIALTY_SUGGESTIONS = [
  'TCC - Terapia Cognitivo-Comportamental',
  'Psicanálise Clínica',
  'Neuropsicologia',
  'Gestalt-terapia',
  'Terapia de Casal e Família',
  'Psicologia Humanista',
  'Psicoterapia Breve',
  'Psiquiatria da Infância e Adolescência',
];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdateSuccess,
  token,
  currentTheme = 'light',
  onToggleTheme,
  onStartTour,
}) => {
  const [activeTab, setActiveTab] = useState<'dados' | 'avatar' | 'seguranca' | 'tema'>('dados');

  // Form Fields
  const [name, setName] = useState(currentUser.name);
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [councilNumber, setCouncilNumber] = useState(currentUser.council_number || '');
  const [specialty, setSpecialty] = useState(currentUser.specialty || '');
  const [bio, setBio] = useState(currentUser.bio || '');
  const [avatar, setAvatar] = useState(currentUser.avatar);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');

  // Password Fields
  const [changePasswordActive, setChangePasswordActive] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Status
  const [isLoading, setIsLoading] = useState(false);
  const [isDraggingAvatar, setIsDraggingAvatar] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Processa arquivo de imagem com compressão e fallback
  const processAvatarFile = (file: File) => {
    setErrorMessage(null);
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Selecione um arquivo de imagem válido (JPG, PNG ou WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 320;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height = Math.round((height * MAX_SIZE) / width);
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width = Math.round((width * MAX_SIZE) / height);
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
            setAvatar(compressedDataUrl);
            setSuccessMessage('Foto carregada do dispositivo! Clique em "Salvar Alterações" para confirmar.');
            setTimeout(() => setSuccessMessage(null), 4000);
            return;
          }
          setAvatar(result);
        } catch {
          setAvatar(result);
        }
      };
      img.onerror = () => {
        setAvatar(result);
        setSuccessMessage('Foto carregada com sucesso.');
        setTimeout(() => setSuccessMessage(null), 4000);
      };
      img.src = result;
    };
    reader.onerror = () => {
      setErrorMessage('Erro ao ler a foto selecionada. Tente outra imagem.');
    };
    reader.readAsDataURL(file);
  };

  // Lida com o upload local de foto do computador ou celular
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processAvatarFile(file);
    }
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleAvatarDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingAvatar(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processAvatarFile(file);
    }
  };

  const handleApplyCustomUrl = () => {
    if (!customAvatarUrl.trim()) return;
    setAvatar(customAvatarUrl.trim());
    setCustomAvatarUrl('');
    setSuccessMessage('URL da imagem aplicada com sucesso.');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!name.trim()) {
      setErrorMessage('O nome completo não pode estar em branco.');
      return;
    }

    if (changePasswordActive) {
      if (!currentPassword) {
        setErrorMessage('Para alterar sua senha, informe a senha atual.');
        return;
      }
      if (newPassword.length < 6) {
        setErrorMessage('A nova senha deve ter no mínimo 6 caracteres.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMessage('A confirmação da senha não coincide com a nova senha.');
        return;
      }
    }

    setIsLoading(true);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const payload: any = {
        name: name.trim(),
        phone: phone.trim(),
        council_number: councilNumber.trim(),
        specialty: specialty.trim(),
        bio: bio.trim(),
        avatar: avatar.trim(),
      };

      if (changePasswordActive && newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || 'Falha ao atualizar o perfil.');
      }

      const updatedUser: User = data.user || {
        ...currentUser,
        name: name.trim(),
        avatar: avatar.trim(),
        phone: phone.trim(),
        council_number: councilNumber.trim(),
        specialty: specialty.trim(),
        bio: bio.trim(),
      };

      // Atualiza contas salvas em localStorage para que a foto e o nome reflitam na tela de login
      try {
        const raw = localStorage.getItem('clinicacare_saved_accounts');
        if (raw) {
          const accounts = JSON.parse(raw);
          const targetEmail = (updatedUser.email || currentUser.email || '').toLowerCase();
          const updated = accounts.map((acc: any) => {
            if (acc.email && acc.email.toLowerCase() === targetEmail) {
              return {
                ...acc,
                name: updatedUser.name,
                avatar: updatedUser.avatar,
              };
            }
            return acc;
          });
          localStorage.setItem('clinicacare_saved_accounts', JSON.stringify(updated));
        }
      } catch (e) {
        console.error('Erro ao atualizar contas salvas:', e);
      }

      setSuccessMessage('Perfil atualizado com sucesso!');
      onUpdateSuccess(updatedUser);

      // Limpa campos de senha
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setChangePasswordActive(false);

      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao processar as alterações.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-[#FAF8F5] dark:bg-[#1E1E1A] border border-[#E5E2D9] dark:border-[#383832] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-auto text-[#2D2D2A] dark:text-[#EFECE6]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header do Modal */}
        <div className="bg-[#F2F0EA] dark:bg-[#272722] border-b border-[#E5E2D9] dark:border-[#383832] px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#5A5A40] dark:bg-[#8D8D68] text-white flex items-center justify-center shadow-xs">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#3D3D39] dark:text-[#EFECE6] leading-tight flex items-center gap-2">
                Personalização de Perfil
                <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-white dark:bg-[#303028] border border-[#E5E2D9] dark:border-[#383832] text-[#5A5A40] dark:text-[#D6D6B8]">
                  {currentUser.role === 'ADMIN'
                    ? 'Administrador'
                    : currentUser.role === 'PROFESSIONAL'
                    ? 'Psicólogo(a)'
                    : 'Recepção'}
                </span>
              </h2>
              <p className="text-xs text-[#8A8A82] dark:text-[#A3A196] mt-0.5">
                Atualize sua foto, dados profissionais e credenciais com criptografia.
              </p>
            </div>
          </div>
          <button
            id="btn-close-profile-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8A8A82] dark:text-[#A3A196] hover:text-[#3D3D39] dark:hover:text-white hover:bg-[#E5E2D9] dark:hover:bg-[#383830] transition-colors cursor-pointer"
            title="Fechar"
            aria-label="Fechar janela"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas de Navegação Interna */}
        <div className="flex border-b border-[#E5E2D9] dark:border-[#383832] bg-white dark:bg-[#1E1E1A] px-5 text-xs font-semibold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('dados')}
            className={`py-3 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'dados'
                ? 'border-[#5A5A40] dark:border-[#B5B590] text-[#5A5A40] dark:text-[#EFECE6]'
                : 'border-transparent text-[#8A8A82] dark:text-[#A3A196] hover:text-[#3D3D39] dark:hover:text-white'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            Dados Profissionais
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('avatar')}
            className={`py-3 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'avatar'
                ? 'border-[#5A5A40] dark:border-[#B5B590] text-[#5A5A40] dark:text-[#EFECE6]'
                : 'border-transparent text-[#8A8A82] dark:text-[#A3A196] hover:text-[#3D3D39] dark:hover:text-white'
            }`}
          >
            <Camera className="w-4 h-4" />
            Foto & Avatar
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tema')}
            className={`py-3 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'tema'
                ? 'border-[#5A5A40] dark:border-[#B5B590] text-[#5A5A40] dark:text-[#EFECE6]'
                : 'border-transparent text-[#8A8A82] dark:text-[#A3A196] hover:text-[#3D3D39] dark:hover:text-white'
            }`}
          >
            {currentTheme === 'dark' ? <Moon className="w-4 h-4 text-[#B5B590]" /> : <Sun className="w-4 h-4 text-[#C98A2C]" />}
            Tema & Aparência
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('seguranca')}
            className={`py-3 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'seguranca'
                ? 'border-[#5A5A40] dark:border-[#B5B590] text-[#5A5A40] dark:text-[#EFECE6]'
                : 'border-transparent text-[#8A8A82] dark:text-[#A3A196] hover:text-[#3D3D39] dark:hover:text-white'
            }`}
          >
            <Key className="w-4 h-4" />
            Segurança & Senha
          </button>
        </div>

        {/* Mensagens de Feedback */}
        {errorMessage && (
          <div className="mx-5 mt-4 p-3 bg-[#FDF2F0] border border-[#F0D5D2] rounded-xl flex items-center gap-2.5 text-xs text-[#8C4A3B]">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mx-5 mt-4 p-3 bg-[#F2F7F2] border border-[#D5E5D5] rounded-xl flex items-center gap-2.5 text-xs text-[#3D5A3D]">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Conteúdo do Formulário */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* ABA 1: DADOS PROFISSIONAIS */}
          {activeTab === 'dados' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Card Resumo do Perfil com Avatar e Nome */}
              <div className="p-3.5 bg-white border border-[#E5E2D9] rounded-xl flex items-center gap-4">
                <div className="relative shrink-0">
                  <img
                    src={avatar}
                    alt={name}
                    className="w-14 h-14 rounded-full object-cover ring-2 ring-[#5A5A40]"
                  />
                  <button
                    type="button"
                    onClick={() => setActiveTab('avatar')}
                    className="absolute -bottom-1 -right-1 p-1 rounded-full bg-[#5A5A40] text-white hover:bg-[#484833] transition-colors shadow-xs cursor-pointer"
                    title="Mudar foto"
                  >
                    <Camera className="w-3 h-3" />
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-[#3D3D39] truncate">{name || 'Seu Nome'}</div>
                  <div className="text-xs text-[#8A8A82] truncate">{currentUser.email}</div>
                  <div className="text-[11px] text-[#5A5A40] font-medium mt-0.5">
                    {specialty || 'Psicologia Clínica'} {councilNumber ? `• ${councilNumber}` : ''}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#3D3D39] mb-1">
                    Nome Completo <span className="text-[#8C4A3B]">*</span>
                  </label>
                  <input
                    id="input-profile-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Dr. Henrique Greca"
                    required
                    className="w-full text-sm bg-white border border-[#E5E2D9] rounded-lg p-2.5 text-[#2D2D2A] focus:border-[#5A5A40] focus:outline-hidden min-h-[42px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#3D3D39] mb-1">
                    E-mail Institucional (Login)
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={currentUser.email}
                      disabled
                      className="w-full text-sm bg-[#F2F0EA] border border-[#E5E2D9] rounded-lg p-2.5 text-[#8A8A82] cursor-not-allowed min-h-[42px]"
                    />
                    <Shield className="w-4 h-4 text-[#8A8A82] absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                  <span className="text-[10px] text-[#8A8A82] mt-0.5 block">
                    Identificador fixo criptografado no sistema
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#3D3D39] mb-1">
                    Telefone / WhatsApp Profissional
                  </label>
                  <div className="relative">
                    <input
                      id="input-profile-phone"
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(11) 98888-7777"
                      className="w-full text-sm bg-white border border-[#E5E2D9] rounded-lg p-2.5 pl-8 text-[#2D2D2A] focus:border-[#5A5A40] focus:outline-hidden min-h-[42px]"
                    />
                    <Phone className="w-4 h-4 text-[#8A8A82] absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#3D3D39] mb-1">
                    Registro Profissional (CRP / CRM)
                  </label>
                  <div className="relative">
                    <input
                      id="input-profile-council"
                      type="text"
                      value={councilNumber}
                      onChange={(e) => setCouncilNumber(e.target.value)}
                      placeholder="Ex: CRP 08/29182 ou CRM-SP 123456"
                      className="w-full text-sm bg-white border border-[#E5E2D9] rounded-lg p-2.5 pl-8 text-[#2D2D2A] focus:border-[#5A5A40] focus:outline-hidden min-h-[42px]"
                    />
                    <PsychologySymbol variant="icon" className="w-4 h-4 text-[#5A5A40] absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#3D3D39] mb-1">
                  Especialidade / Abordagem Clínica
                </label>
                <input
                  id="input-profile-specialty"
                  type="text"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="Ex: TCC - Terapia Cognitivo-Comportamental"
                  className="w-full text-sm bg-white border border-[#E5E2D9] rounded-lg p-2.5 text-[#2D2D2A] focus:border-[#5A5A40] focus:outline-hidden min-h-[42px]"
                />

                {/* Chips de Sugestão Rápida */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="text-[10px] text-[#8A8A82] py-0.5 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#5A5A40]" /> Sugestões rápidas:
                  </span>
                  {SPECIALTY_SUGGESTIONS.map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setSpecialty(sug)}
                      className={`text-[10px] px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
                        specialty === sug
                          ? 'bg-[#5A5A40] text-white border-[#5A5A40]'
                          : 'bg-white text-[#3D3D39] border-[#E5E2D9] hover:border-[#5A5A40]'
                      }`}
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#3D3D39] mb-1">
                  Biografia / Mini Apresentação Profissional
                </label>
                <textarea
                  id="textarea-profile-bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={2}
                  placeholder="Ex: Psicólogo clínico com mais de 8 anos de experiência em atendimento de adultos e adolescentes com foco em ansiedade e desenvolvimento pessoal."
                  className="w-full text-sm bg-white border border-[#E5E2D9] rounded-lg p-2.5 text-[#2D2D2A] focus:border-[#5A5A40] focus:outline-hidden resize-none"
                />
              </div>
            </div>
          )}

          {/* ABA 2: FOTO & AVATAR */}
          {activeTab === 'avatar' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Preview e Upload */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingAvatar(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingAvatar(false);
                }}
                onDrop={handleAvatarDrop}
                className={`p-4 bg-white dark:bg-[#242420] border-2 rounded-xl flex flex-col sm:flex-row items-center gap-5 transition-all ${
                  isDraggingAvatar
                    ? 'border-[#5A5A40] dark:border-[#B5B590] bg-[#F2F0EA] dark:bg-[#303028] scale-[1.01]'
                    : 'border-[#E5E2D9] dark:border-[#383832]'
                }`}
              >
                <div className="relative cursor-pointer group" onClick={() => fileInputRef.current?.click()} title="Clique para trocar a foto">
                  <img
                    src={avatar}
                    alt={name}
                    className="w-20 h-20 rounded-full object-cover ring-4 ring-[#E5E2D9] dark:ring-[#383832] shadow-sm group-hover:opacity-80 transition-opacity"
                  />
                  <span className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-[#5A5A40] text-white flex items-center justify-center ring-2 ring-white dark:ring-[#242420]">
                    <Camera className="w-3 h-3" />
                  </span>
                </div>

                <div className="flex-1 text-center sm:text-left space-y-2">
                  <div className="text-xs font-bold text-[#3D3D39] dark:text-[#EFECE6]">
                    {isDraggingAvatar ? 'Solte a imagem aqui' : 'Foto do Perfil Atual'}
                  </div>
                  <p className="text-[11px] text-[#8A8A82] dark:text-[#A3A196]">
                    Arraste e solte uma foto aqui, selecione um arquivo do computador ou escolha uma pré-definição.
                  </p>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs px-3.5 py-2 bg-[#5A5A40] hover:bg-[#484833] text-white font-medium rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer min-h-[38px]"
                    >
                      <Upload className="w-3.5 h-3.5" /> Enviar Foto do Dispositivo
                    </button>
                  </div>
                </div>
              </div>

              {/* Galeria de Pré-definições */}
              <div>
                <label className="block text-xs font-semibold text-[#3D3D39] dark:text-[#EFECE6] mb-2 flex items-center justify-between">
                  <span>Escolha um Avatar Clínico Profissional:</span>
                  <span className="text-[11px] text-[#8A8A82] dark:text-[#A3A196]">1 clique para aplicar</span>
                </label>

                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
                  {PRESET_AVATARS.map((item, idx) => {
                    const isSelected = avatar === item.url;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setAvatar(item.url);
                          setSuccessMessage(`Avatar "${item.label}" selecionado!`);
                          setTimeout(() => setSuccessMessage(null), 2500);
                        }}
                        className={`relative rounded-xl overflow-hidden p-1 border-2 transition-all cursor-pointer flex flex-col items-center group ${
                          isSelected
                            ? 'border-[#5A5A40] dark:border-[#B5B590] bg-[#F2F0EA] dark:bg-[#303028] scale-105 shadow-sm'
                            : 'border-transparent hover:border-[#E5E2D9] dark:hover:border-[#383832] bg-white dark:bg-[#242420]'
                        }`}
                      >
                        <img
                          src={item.url}
                          alt={item.label}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <span className="text-[10px] text-[#3D3D39] dark:text-[#EFECE6] font-medium mt-1 truncate w-full text-center">
                          {item.label}
                        </span>
                        {isSelected && (
                          <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#5A5A40] text-white flex items-center justify-center">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* URL Personalizada Opcional */}
              <div className="pt-2 border-t border-[#E5E2D9] dark:border-[#383832]">
                <label className="block text-xs font-semibold text-[#3D3D39] dark:text-[#EFECE6] mb-1">
                  Ou informe o Link direto de uma foto (URL externa):
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={customAvatarUrl}
                    onChange={(e) => setCustomAvatarUrl(e.target.value)}
                    placeholder="https://exemplo.com/sua-foto.jpg"
                    className="flex-1 text-sm bg-white dark:bg-[#242420] border border-[#E5E2D9] dark:border-[#383832] rounded-lg p-2 text-[#2D2D2A] dark:text-[#EFECE6] focus:border-[#5A5A40] focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCustomUrl}
                    disabled={!customAvatarUrl.trim()}
                    className="px-3.5 py-2 text-xs bg-[#F2F0EA] dark:bg-[#303028] hover:bg-[#E5E2D9] dark:hover:bg-[#3A3A32] text-[#3D3D39] dark:text-[#EFECE6] font-semibold rounded-lg border border-[#E5E2D9] dark:border-[#383832] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ABA 3: TEMA & APARÊNCIA */}
          {activeTab === 'tema' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 bg-white dark:bg-[#242420] border border-[#E5E2D9] dark:border-[#383832] rounded-xl space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-[#3D3D39] dark:text-[#EFECE6]">Preferência de Tema Visual</h3>
                  <p className="text-xs text-[#8A8A82] dark:text-[#A3A196] mt-0.5">
                    Escolha a aparência da interface do consultório conforme sua preferência de iluminação e conforto visual.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Modo Claro */}
                  <div
                    onClick={() => {
                      if (currentTheme !== 'light' && onToggleTheme) onToggleTheme();
                    }}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                      currentTheme === 'light'
                        ? 'border-[#5A5A40] bg-[#FAF8F5] shadow-sm'
                        : 'border-[#E5E2D9] dark:border-[#383832] bg-white dark:bg-[#1E1E1A] hover:border-[#8A8A82]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#3D3D39] dark:text-[#EFECE6]">
                        <Sun className="w-4 h-4 text-[#C98A2C]" />
                        <span>Modo Claro</span>
                      </div>
                      {currentTheme === 'light' && (
                        <div className="w-4 h-4 rounded-full bg-[#5A5A40] text-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>
                    <div className="h-14 rounded-lg bg-[#FAF8F5] border border-[#E5E2D9] p-2 flex flex-col justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#5A5A40]"></div>
                        <div className="w-12 h-1.5 bg-[#D9D6CC] rounded-full"></div>
                      </div>
                      <div className="w-full h-2 bg-white rounded-xs border border-[#E5E2D9]"></div>
                    </div>
                    <p className="text-[11px] text-[#8A8A82]">
                      Paleta suave com tons de linho, off-white e oliva clássico para uso diurno.
                    </p>
                  </div>

                  {/* Modo Escuro */}
                  <div
                    onClick={() => {
                      if (currentTheme !== 'dark' && onToggleTheme) onToggleTheme();
                    }}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                      currentTheme === 'dark'
                        ? 'border-[#B5B590] bg-[#272722] shadow-sm'
                        : 'border-[#E5E2D9] dark:border-[#383832] bg-white dark:bg-[#1E1E1A] hover:border-[#8A8A82]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#3D3D39] dark:text-[#EFECE6]">
                        <Moon className="w-4 h-4 text-[#B5B590]" />
                        <span>Modo Escuro</span>
                      </div>
                      {currentTheme === 'dark' && (
                        <div className="w-4 h-4 rounded-full bg-[#B5B590] text-[#1E1E1A] flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <div className="h-14 rounded-lg bg-[#181815] border border-[#383832] p-2 flex flex-col justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#B5B590]"></div>
                        <div className="w-12 h-1.5 bg-[#4A4A40] rounded-full"></div>
                      </div>
                      <div className="w-full h-2 bg-[#242420] rounded-xs border border-[#383832]"></div>
                    </div>
                    <p className="text-[11px] text-[#8A8A82] dark:text-[#A3A196]">
                      Alto contraste com fundo escuro aveludado, ideal para sessões noturnas e descanso visual.
                    </p>
                  </div>
                </div>

                {onToggleTheme && (
                  <div className="pt-2 flex justify-center">
                    <button
                      type="button"
                      onClick={onToggleTheme}
                      className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#F2F0EA] dark:bg-[#303028] text-[#3D3D39] dark:text-[#EFECE6] border border-[#E5E2D9] dark:border-[#383832] hover:bg-[#E5E2D9] dark:hover:bg-[#3A3A32] transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      {currentTheme === 'dark' ? <Sun className="w-3.5 h-3.5 text-[#C98A2C]" /> : <Moon className="w-3.5 h-3.5 text-[#5A5A40]" />}
                      Alternar para Modo {currentTheme === 'dark' ? 'Claro' : 'Escuro'}
                    </button>
                  </div>
                )}

                {/* Tutorial Interativo do Sistema */}
                {onStartTour && (
                  <div className="mt-4 pt-4 border-t border-[#E5E2D9] dark:border-[#383832]">
                    <div className="p-4 bg-[#F9F8F5] dark:bg-[#262622] rounded-xl border border-[#EBE8DF] dark:border-[#33332D] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-bold text-[#3D3D39] dark:text-[#EFECE6]">
                          <HelpCircle className="w-4 h-4 text-[#5A5A40] dark:text-[#D6D6B8]" />
                          <span>Tutorial Guiado da Plataforma</span>
                        </div>
                        <p className="text-[11px] text-[#8A8A82] dark:text-[#A3A196]">
                          Rever o passo a passo com destaque em tela e explicação detalhada de cada módulo.
                        </p>
                      </div>
                      <button
                        type="button"
                        id="btn-profile-restart-tour"
                        onClick={() => {
                          onClose();
                          setTimeout(() => {
                            onStartTour();
                          }, 150);
                        }}
                        className="px-3.5 py-2 bg-white dark:bg-[#303028] border border-[#E5E2D9] dark:border-[#383832] hover:border-[#5A5A40] text-[#5A5A40] dark:text-[#EFECE6] text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 flex items-center justify-center gap-1.5 shadow-2xs"
                      >
                        <HelpCircle className="w-3.5 h-3.5" /> Iniciar Tutorial
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ABA 4: SEGURANÇA & SENHA */}
          {activeTab === 'seguranca' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3.5 bg-white border border-[#E5E2D9] rounded-xl flex items-start gap-3">
                <Shield className="w-5 h-5 text-[#5A5A40] shrink-0 mt-0.5" />
                <div className="text-xs text-[#3D3D39] space-y-1">
                  <div className="font-bold">Proteção Criptográfica Scrypt</div>
                  <p className="text-[#8A8A82]">
                    Suas senhas são protegidas com derivação de chave criptográfica e salt individual. Nenhum colaborador ou sistema externo possui acesso à sua senha em texto claro.
                  </p>
                </div>
              </div>

              {!changePasswordActive ? (
                <div className="p-4 bg-white border border-[#E5E2D9] rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-[#3D3D39]">Senha de Acesso</div>
                    <div className="text-[11px] text-[#8A8A82]">•••••••••••• (Criptografada)</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setChangePasswordActive(true)}
                    className="text-xs px-3 py-2 bg-white border border-[#E5E2D9] hover:border-[#5A5A40] text-[#5A5A40] font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Alterar Senha
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-white border border-[#5A5A40]/30 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#3D3D39] flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-[#5A5A40]" />
                      Alterar Senha de Acesso
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setChangePasswordActive(false);
                        setCurrentPassword('');
                        setNewPassword('');
                        setConfirmPassword('');
                      }}
                      className="text-xs text-[#8A8A82] hover:text-[#8C4A3B] cursor-pointer"
                    >
                      Cancelar troca de senha
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#3D3D39] mb-1">
                      Senha Atual
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Informe sua senha atual"
                        className="w-full text-sm bg-[#FAF8F5] border border-[#E5E2D9] rounded-lg p-2.5 pr-10 text-[#2D2D2A] focus:border-[#5A5A40] focus:outline-hidden min-h-[40px]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8A8A82] hover:text-[#3D3D39] p-1 cursor-pointer"
                      >
                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#3D3D39] mb-1">
                        Nova Senha
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Mínimo 6 caracteres"
                          className="w-full text-sm bg-[#FAF8F5] border border-[#E5E2D9] rounded-lg p-2.5 pr-10 text-[#2D2D2A] focus:border-[#5A5A40] focus:outline-hidden min-h-[40px]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8A8A82] hover:text-[#3D3D39] p-1 cursor-pointer"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#3D3D39] mb-1">
                        Confirmar Nova Senha
                      </label>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repita a nova senha"
                        className="w-full text-sm bg-[#FAF8F5] border border-[#E5E2D9] rounded-lg p-2.5 text-[#2D2D2A] focus:border-[#5A5A40] focus:outline-hidden min-h-[40px]"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Rodapé do Modal com Ações */}
          <div className="pt-3 border-t border-[#E5E2D9] flex items-center justify-end gap-3">
            <button
              id="btn-cancel-profile"
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 text-xs font-semibold text-[#8A8A82] hover:text-[#3D3D39] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              id="btn-save-profile"
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 bg-[#5A5A40] hover:bg-[#484833] text-white text-xs font-semibold rounded-xl shadow-xs flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50 min-h-[42px]"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando perfil...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Salvar Alterações</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
