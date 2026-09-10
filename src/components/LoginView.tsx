import React, { useState, useRef } from 'react';
import { User, UserRole } from '../types';
import { Lock, Shield, Eye, EyeOff, CheckCircle2, AlertCircle, UserPlus, LogIn, Trash2, BookmarkCheck } from 'lucide-react';
import { PsychologySymbol } from './PsychologySymbol';

interface LoginViewProps {
  onLoginSuccess: (user: User, token: string) => void;
}

interface SavedAccount {
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  savedAt: string;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Saved accounts & Remember Me state
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>(() => {
    try {
      const raw = localStorage.getItem('clinicacare_saved_accounts');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      {
        email: 'henrique@clinicacare.com',
        name: 'Dr. Henrique Greca',
        role: 'PROFESSIONAL',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        savedAt: new Date().toISOString(),
      },
      {
        email: 'beatriz@clinicacare.com',
        name: 'Dra. Beatriz Santos',
        role: 'PROFESSIONAL',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        savedAt: new Date().toISOString(),
      },
      {
        email: 'admin@clinicacare.com',
        name: 'Dr. Roberto Fonseca',
        role: 'ADMIN',
        avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80',
        savedAt: new Date().toISOString(),
      },
    ];
  });
  const [rememberMe, setRememberMe] = useState<boolean>(() => {
    return localStorage.getItem('clinicacare_remember_me') !== 'false';
  });

  // Login form state
  const [email, setEmail] = useState(() => {
    return localStorage.getItem('clinicacare_remembered_email') || 'henrique@clinicacare.com';
  });
  const [password, setPassword] = useState('psi123');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('PROFESSIONAL');
  const [regCouncilNumber, setRegCouncilNumber] = useState('');
  const [regSpecialty, setRegSpecialty] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('');

  const persistAccount = (userData: User, userEmail: string) => {
    if (rememberMe) {
      localStorage.setItem('clinicacare_remember_me', 'true');
      localStorage.setItem('clinicacare_remembered_email', userEmail);
      const newAcc: SavedAccount = {
        email: userEmail,
        name: userData.name,
        role: userData.role,
        avatar: userData.avatar,
        savedAt: new Date().toISOString(),
      };
      const updated = [newAcc, ...savedAccounts.filter((a) => a.email.toLowerCase() !== userEmail.toLowerCase())];
      setSavedAccounts(updated);
      localStorage.setItem('clinicacare_saved_accounts', JSON.stringify(updated));
    } else {
      localStorage.setItem('clinicacare_remember_me', 'false');
      localStorage.removeItem('clinicacare_remembered_email');
    }
  };

  const handleSelectSavedAccount = (accEmail: string) => {
    setEmail(accEmail);
    if (accEmail.includes('admin')) {
      setPassword('admin123');
    } else if (accEmail.includes('rec')) {
      setPassword('rec123');
    } else {
      setPassword('psi123');
    }
    setTimeout(() => {
      passwordInputRef.current?.focus();
    }, 50);
  };

  const handleRemoveSavedAccount = (accEmail: string) => {
    const updated = savedAccounts.filter((a) => a.email.toLowerCase() !== accEmail.toLowerCase());
    setSavedAccounts(updated);
    localStorage.setItem('clinicacare_saved_accounts', JSON.stringify(updated));
    if (email.toLowerCase() === accEmail.toLowerCase()) {
      setEmail('');
      localStorage.removeItem('clinicacare_remembered_email');
    }
  };

  const executeLogin = async (targetEmail: string, targetPass: string) => {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const trimmedEmail = targetEmail.trim();
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password: targetPass }),
      });

      const contentType = res.headers.get('content-type') || '';
      let data: any = {};
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(
          res.status === 404
            ? 'Endpoint /api/auth/login não encontrado (404). Verifique se o servidor backend está ativo.'
            : `Erro no servidor (${res.status}): ${text.slice(0, 100)}`
        );
      }

      if (!res.ok) {
        throw new Error(data.message || data.error || 'Credenciais inválidas.');
      }

      // Salva o login para logins posteriores
      persistAccount(data.user, trimmedEmail);

      // Sucesso na autenticação
      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao autenticar.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeLogin(email, password);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (regPassword !== regPasswordConfirm) {
      setErrorMessage('As senhas digitadas não coincidem.');
      return;
    }

    if (regPassword.length < 6) {
      setErrorMessage('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    setIsLoading(true);

    try {
      const trimmedEmail = regEmail.trim();
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName.trim(),
          email: trimmedEmail,
          role: regRole,
          council_number: regCouncilNumber.trim(),
          specialty: regSpecialty.trim(),
          phone: regPhone.trim(),
          password: regPassword,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      let data: any = {};
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(
          res.status === 404
            ? 'Endpoint /api/auth/register não encontrado (404). Verifique se o servidor backend está ativo.'
            : `Erro no servidor (${res.status}): ${text.slice(0, 100)}`
        );
      }

      if (!res.ok) {
        throw new Error(data.message || data.error || 'Falha ao cadastrar usuário.');
      }

      // Salva automaticamente o novo cadastro para logins posteriores
      persistAccount(data.user, trimmedEmail);

      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao registrar.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F5F0] flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Icon & Heading com Símbolo da Psicologia */}
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-md ring-4 ring-[#E5E2D9] p-1 overflow-hidden transition-transform hover:scale-105">
            <PsychologySymbol variant="tree" size={58} className="w-full h-full" color="#2D2D2A" />
          </div>
        </div>

        <h1 className="mt-4 text-center text-2xl sm:text-3xl font-serif italic font-bold text-[#3D3D39] tracking-tight">
          ClínicaCare
        </h1>
        <div className="mt-1 flex items-center justify-center gap-1.5 text-xs sm:text-sm font-medium text-[#5A5A40]">
          <PsychologySymbol variant="icon" size={15} className="w-3.5 h-3.5 text-[#5A5A40]" />
          <span>Psicologia Clínica & Saúde Mental</span>
        </div>
        <p className="mt-0.5 text-center text-xs text-[#8A8A82]">
          Gestão Clínica, Agenda & Prontuário Eletrônico LGPD
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-6 px-4 sm:px-8 shadow-xl rounded-2xl border border-[#E5E2D9]">
          {/* Mode Switch Tabs */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-[#F2F0EA] rounded-xl mb-6 text-xs font-semibold">
            <button
              type="button"
              id="tab-mode-login"
              onClick={() => {
                setMode('login');
                setErrorMessage(null);
              }}
              className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-[#3D3D39] shadow-xs'
                  : 'text-[#8A8A82] hover:text-[#3D3D39]'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" /> Entrar no Sistema
            </button>
            <button
              type="button"
              id="tab-mode-register"
              onClick={() => {
                setMode('register');
                setErrorMessage(null);
              }}
              className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-white text-[#3D3D39] shadow-xs'
                  : 'text-[#8A8A82] hover:text-[#3D3D39]'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" /> Criar Novo Acesso
            </button>
          </div>

          {/* Error Alert Box */}
          {errorMessage && (
            <div className="mb-4 p-3 bg-[#FAF7F2] border border-[#EADFCB] rounded-xl text-xs text-[#8C4A3B] flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-[#8C4A3B] shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {mode === 'login' ? (
            <div>
              {/* Contas Salvas para Acesso Rápido */}
              {savedAccounts.length > 0 && (
                <div className="mb-5 pb-4 border-b border-[#E5E2D9]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-[#3D3D39] flex items-center gap-1.5">
                      <BookmarkCheck className="w-3.5 h-3.5 text-[#5A5A40]" />
                      Contas salvas para acesso rápido:
                    </span>
                    <span className="text-[11px] text-[#8A8A82]">Clique para preencher</span>
                  </div>
                  <div className="space-y-2">
                    {savedAccounts.map((acc) => {
                      const isSelected = email.toLowerCase() === acc.email.toLowerCase();
                      return (
                        <div
                          key={acc.email}
                          onClick={() => handleSelectSavedAccount(acc.email)}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                            isSelected
                              ? 'bg-[#F2F0EA] border-[#5A5A40] ring-1 ring-[#5A5A40]'
                              : 'bg-[#FAF8F5] hover:bg-[#F2F0EA] border-[#E5E2D9]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={acc.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                              alt={acc.name}
                              className="w-8 h-8 rounded-full object-cover ring-1 ring-[#E5E2D9] shrink-0"
                            />
                            <div className="min-w-0 text-left">
                              <div className="text-xs font-bold text-[#3D3D39] truncate">{acc.name}</div>
                              <div className="text-[11px] text-[#8A8A82] truncate">{acc.email}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-white border border-[#E5E2D9] text-[#5A5A40]">
                              {acc.role === 'ADMIN' ? 'Administrador' : acc.role === 'PROFESSIONAL' ? 'Psicólogo(a)' : 'Recepção'}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveSavedAccount(acc.email);
                              }}
                              className="p-1 rounded-md text-[#8A8A82] hover:text-[#8C4A3B] hover:bg-white transition-colors"
                              title="Remover este login salvo do dispositivo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleLoginSubmit} name="loginForm" autoComplete="on" className="space-y-4">
                <div>
                  <label htmlFor="input-login-email" className="block text-xs font-semibold text-[#3D3D39] mb-1">
                    E-mail Profissional
                  </label>
                  <input
                    id="input-login-email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ex: seu.nome@clinicapsi.com.br"
                    required
                    className="w-full text-sm bg-[#F2F0EA] border border-[#E5E2D9] rounded-lg p-2.5 text-[#2D2D2A] placeholder:text-[#8A8A82] focus:border-[#5A5A40] focus:outline-hidden min-h-[42px]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="input-login-password" className="block text-xs font-semibold text-[#3D3D39]">
                      Senha de Acesso
                    </label>
                    <span className="text-[11px] text-[#8A8A82]">Hash scrypt com salt</span>
                  </div>
                  <div className="relative">
                    <input
                      ref={passwordInputRef}
                      id="input-login-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full text-sm bg-[#F2F0EA] border border-[#E5E2D9] rounded-lg p-2.5 pr-10 text-[#2D2D2A] focus:border-[#5A5A40] focus:outline-hidden min-h-[42px]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8A8A82] hover:text-[#3D3D39] p-1 cursor-pointer"
                      title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Opção de Lembrar Login */}
                <div className="flex items-center justify-between py-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-[#3D3D39]">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-[#E5E2D9] text-[#5A5A40] focus:ring-[#5A5A40] accent-[#5A5A40]"
                    />
                    <span>Lembrar meu login neste dispositivo</span>
                  </label>
                  <span className="text-[11px] text-[#708A63] font-medium hidden sm:inline">
                    Salva para acessos posteriores
                  </span>
                </div>

                <button
                  id="btn-submit-login"
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-3 px-4 bg-[#5A5A40] hover:bg-[#484833] text-white text-sm font-semibold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 min-h-[44px]"
                >
                  {isLoading ? (
                    <span>Verificando credenciais seguras...</span>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" /> Entrar com Autenticação Criptografada
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            /* Register Form */
            <form onSubmit={handleRegisterSubmit} name="registerForm" autoComplete="on" className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#3D3D39] mb-1">
                  Nome Completo <span className="text-[#8C4A3B]">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  autoComplete="name"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Ex: Dr. Henrique Silva"
                  required
                  className="w-full text-sm bg-[#F2F0EA] border border-[#E5E2D9] rounded-lg p-2.5 text-[#2D2D2A] placeholder:text-[#8A8A82] focus:border-[#5A5A40] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#3D3D39] mb-1">
                  E-mail de Trabalho <span className="text-[#8C4A3B]">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  autoComplete="username"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="henrique@clinicapsi.com.br"
                  required
                  className="w-full text-sm bg-[#F2F0EA] border border-[#E5E2D9] rounded-lg p-2.5 text-[#2D2D2A] placeholder:text-[#8A8A82] focus:border-[#5A5A40] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#3D3D39] mb-1">
                    Perfil / Função <span className="text-[#8C4A3B]">*</span>
                  </label>
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value as UserRole)}
                    className="w-full text-sm bg-[#F2F0EA] border border-[#E5E2D9] rounded-lg p-2.5 text-[#2D2D2A] focus:border-[#5A5A40] focus:outline-hidden"
                  >
                    <option value="PROFESSIONAL">Psicólogo / Clínico</option>
                    <option value="ADMIN">Administrador Geral</option>
                    <option value="RECEPTION">Recepção / Secretaria</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#3D3D39] mb-1">
                    Telefone / Celular
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    autoComplete="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="(11) 98888-7777"
                    className="w-full text-sm bg-[#F2F0EA] border border-[#E5E2D9] rounded-lg p-2.5 text-[#2D2D2A] placeholder:text-[#8A8A82] focus:border-[#5A5A40] focus:outline-hidden"
                  />
                </div>
              </div>

              {regRole === 'PROFESSIONAL' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#3D3D39] mb-1">
                      Registro (CRP / CRM)
                    </label>
                    <input
                      type="text"
                      value={regCouncilNumber}
                      onChange={(e) => setRegCouncilNumber(e.target.value)}
                      placeholder="Ex: CRP 06/184290"
                      className="w-full text-sm bg-[#F2F0EA] border border-[#E5E2D9] rounded-lg p-2.5 text-[#2D2D2A] placeholder:text-[#8A8A82] focus:border-[#5A5A40] focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#3D3D39] mb-1">
                      Especialidade / Abordagem
                    </label>
                    <input
                      type="text"
                      value={regSpecialty}
                      onChange={(e) => setRegSpecialty(e.target.value)}
                      placeholder="Ex: TCC, Psicanálise"
                      className="w-full text-sm bg-[#F2F0EA] border border-[#E5E2D9] rounded-lg p-2.5 text-[#2D2D2A] placeholder:text-[#8A8A82] focus:border-[#5A5A40] focus:outline-hidden"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#3D3D39] mb-1">
                    Senha de Acesso <span className="text-[#8C4A3B]">*</span>
                  </label>
                  <input
                    type="password"
                    name="password"
                    autoComplete="new-password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Mínimo 6 dígitos"
                    required
                    className="w-full text-sm bg-[#F2F0EA] border border-[#E5E2D9] rounded-lg p-2.5 text-[#2D2D2A] focus:border-[#5A5A40] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#3D3D39] mb-1">
                    Confirmar Senha <span className="text-[#8C4A3B]">*</span>
                  </label>
                  <input
                    type="password"
                    name="confirm-password"
                    autoComplete="new-password"
                    value={regPasswordConfirm}
                    onChange={(e) => setRegPasswordConfirm(e.target.value)}
                    placeholder="Repita a senha"
                    required
                    className="w-full text-sm bg-[#F2F0EA] border border-[#E5E2D9] rounded-lg p-2.5 text-[#2D2D2A] focus:border-[#5A5A40] focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="p-2.5 bg-[#FAF8F5] border border-[#E5E2D9] rounded-xl text-[11px] text-[#5A5A40] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#708A63] shrink-0" />
                <span>O login criado será salvo neste navegador para futuros acessos rápidos.</span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 bg-[#5A5A40] hover:bg-[#484833] text-white text-sm font-semibold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 min-h-[44px]"
              >
                {isLoading ? (
                  <span>Criando conta e gerando chaves...</span>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" /> Cadastrar Usuário e Iniciar
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* LGPD and Security Footer notice */}
        <div className="mt-4 text-center text-xs text-[#8A8A82] flex items-center justify-center gap-4">
          <span className="flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-[#5A5A40]" /> Proteção de Dados LGPD
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#708A63]" /> Sigilo Ético CFP
          </span>
        </div>
      </div>
    </div>
  );
};
