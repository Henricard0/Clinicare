import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole } from '../types';
import { Lock, Shield, Key, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight, UserPlus, LogIn, Trash2, BookmarkCheck, ExternalLink, X, Sparkles, HelpCircle } from 'lucide-react';
import { PsychologySymbol } from './PsychologySymbol';
import { apiFetch } from '../utils/clientApiFallback';

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

const DEMO_ACCOUNTS = [
  {
    email: 'beatriz@clinicacare.com',
    password: 'psi123',
    name: 'Dra. Beatriz Santos',
    role: 'PROFESSIONAL' as UserRole,
    roleLabel: 'Psicóloga Clínica (TCC)',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  },
  {
    email: 'henrique@clinicacare.com',
    password: 'psi123',
    name: 'Dr. Henrique Greca',
    role: 'PROFESSIONAL' as UserRole,
    roleLabel: 'Psicólogo Clínico & Avaliação',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  },
  {
    email: 'recepcao@clinicacare.com',
    password: 'rec123',
    name: 'Camila Andrade',
    role: 'RECEPTION' as UserRole,
    roleLabel: 'Recepção / Agenda',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  },
  {
    email: 'admin@clinicacare.com',
    password: 'admin123',
    name: 'Dr. Roberto Fonseca',
    role: 'ADMIN' as UserRole,
    roleLabel: 'Administrador Geral',
    avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80',
  },
];

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Saved accounts & Remember Me state
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>(() => {
    try {
      const raw = localStorage.getItem('clinicacare_saved_accounts');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [rememberMe, setRememberMe] = useState<boolean>(() => {
    return localStorage.getItem('clinicacare_remember_me') !== 'false';
  });

  // Login form state
  const [email, setEmail] = useState(() => {
    return localStorage.getItem('clinicacare_remembered_email') || '';
  });
  const [password, setPassword] = useState('');
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

  // Google OAuth & Account Picker state
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('grecahenrique@gmail.com');
  const [customGoogleName, setCustomGoogleName] = useState('Dr. Henrique Greca');

  useEffect(() => {
    // Escuta evento postMessage do popup OAuth de retorno do Google
    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        persistAccount(event.data.user, event.data.user.email);
        onLoginSuccess(event.data.user, event.data.token);
      } else if (event.data?.type === 'GOOGLE_AUTH_REQUEST') {
        handleSelectGoogleAccount(event.data.email, event.data.name, event.data.avatar);
      } else if (event.data?.type === 'GOOGLE_AUTH_ERROR') {
        setErrorMessage(event.data.message || 'Falha ao autenticar com o Google.');
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, []);

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setIsGoogleLoading(true);

    const width = 480;
    const height = 620;
    const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2);
    const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2);

    let popup: Window | null = null;
    try {
      popup = window.open('about:blank', 'google_signin_popup', `width=${width},height=${height},left=${left},top=${top},status=no,toolbar=no,menubar=no`);
    } catch {
      popup = null;
    }

    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      // Bloqueador de popup do navegador ativo: abre o seletor modal na própria página
      setIsGoogleModalOpen(true);
      setIsGoogleLoading(false);
      return;
    }

    try {
      // Se houver GOOGLE_CLIENT_ID configurado no backend, redireciona o popup para o Google oficial
      const res = await apiFetch('/api/auth/google/url');
      const data = await res.json();

      if (data.configured && data.url) {
        popup.location.href = data.url;
        setIsGoogleLoading(false);
        return;
      }
    } catch {
      // Continua para a tela autenticada de popup do Google
    }

    // Se GOOGLE_CLIENT_ID não estiver configurado no Cloud Console,
    // renderiza a tela com o design oficial do Google Sign-In diretamente na janela popup!
    const popupHtml = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Fazer login com o Google</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; }
          body { background: #FFFFFF; color: #202124; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; }
          .card { width: 100%; max-width: 420px; border: 1px solid #DADCE0; border-radius: 8px; padding: 36px 32px 28px; text-align: center; }
          .logo { width: 42px; height: 42px; margin: 0 auto 14px; }
          h1 { font-size: 22px; font-weight: 500; color: #202124; margin-bottom: 6px; }
          p.sub { font-size: 14px; color: #5F6368; margin-bottom: 24px; }
          p.sub strong { color: #202124; font-weight: 600; }
          .acc-list { text-align: left; border-top: 1px solid #E8EAED; }
          .acc-item { display: flex; align-items: center; padding: 14px 10px; border-bottom: 1px solid #E8EAED; cursor: pointer; border-radius: 4px; transition: background 0.15s; }
          .acc-item:hover { background: #F8F9FA; }
          .avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; margin-right: 14px; border: 1px solid #E0E0E0; }
          .acc-info { flex: 1; }
          .acc-name { font-size: 14px; font-weight: 600; color: #3C4043; }
          .acc-email { font-size: 12px; color: #5F6368; }
          .badge { font-size: 11px; background: #E6F4EA; color: #137333; padding: 2px 8px; border-radius: 12px; font-weight: 500; }
          .action-btn { display: flex; align-items: center; width: 100%; padding: 14px 10px; border: none; background: none; border-bottom: 1px solid #E8EAED; cursor: pointer; text-align: left; font-size: 14px; color: #1A73E8; font-weight: 500; }
          .action-btn:hover { background: #F8F9FA; }
          .other-box { display: none; margin-top: 14px; text-align: left; padding: 12px; background: #F8F9FA; border-radius: 6px; }
          .other-box.open { display: block; }
          .input-field { width: 100%; padding: 10px 12px; border: 1px solid #DADCE0; border-radius: 4px; font-size: 13px; margin-bottom: 8px; background: #FFF; }
          .input-field:focus { border-color: #1A73E8; outline: none; }
          .submit-btn { width: 100%; background: #1A73E8; color: white; border: none; padding: 10px; border-radius: 4px; font-size: 13px; font-weight: 500; cursor: pointer; }
          .submit-btn:hover { background: #1557B0; }
          .footer { margin-top: 20px; font-size: 12px; color: #5F6368; display: flex; justify-content: space-between; width: 100%; max-width: 420px; padding: 0 4px; }
          .loading { display: none; margin: 20px auto 10px; width: 28px; height: 28px; border: 3px solid #E8EAED; border-top: 3px solid #1A73E8; border-radius: 50%; animation: spin 0.8s linear infinite; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
      </head>
      <body>
        <div class="card">
          <svg class="logo" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3h3.88c2.27-2.09 3.66-5.17 3.66-9.09z"/>
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.09C3.26 21.36 7.34 24 12 24z"/>
            <path fill="#FBBC05" d="M5.28 14.32c-.25-.72-.38-1.49-.38-2.32s.13-1.6.38-2.32V6.59H1.24C.45 8.16 0 9.97 0 12s.45 3.84 1.24 5.41l4.04-3.09z"/>
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.24 6.59l4.04 3.09c.95-2.83 3.6-4.93 6.72-4.93z"/>
          </svg>
          <h1>Fazer login com o Google</h1>
          <p class="sub">Escolha uma conta para continuar no <strong>ClínicaCare</strong></p>

          <div id="loading" class="loading"></div>

          <div id="content" class="acc-list">
            <!-- Henrique Greca -->
            <div class="acc-item" onclick="selectAccount('grecahenrique@gmail.com', 'Dr. Henrique Greca', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80')">
              <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80" alt="" class="avatar">
              <div class="acc-info">
                <div class="acc-name">Dr. Henrique Greca</div>
                <div class="acc-email">grecahenrique@gmail.com</div>
              </div>
              <span class="badge">Psicólogo</span>
            </div>

            <!-- Dra Beatriz Santos -->
            <div class="acc-item" onclick="selectAccount('beatriz.psico@gmail.com', 'Dra. Beatriz Santos', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80')">
              <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80" alt="" class="avatar">
              <div class="acc-info">
                <div class="acc-name">Dra. Beatriz Santos</div>
                <div class="acc-email">beatriz.psico@gmail.com</div>
              </div>
              <span class="badge">Psicóloga</span>
            </div>

            <!-- Outra Conta -->
            <button type="button" class="action-btn" onclick="toggleOther()">
              + Usar outra conta Google
            </button>

            <div id="otherBox" class="other-box">
              <input type="text" id="otherName" class="input-field" placeholder="Seu Nome Completo">
              <input type="email" id="otherEmail" class="input-field" placeholder="seu.email@gmail.com">
              <button type="button" class="submit-btn" onclick="submitOther()">Avançar</button>
            </div>
          </div>
        </div>

        <div class="footer">
          <span>Português (Brasil)</span>
          <span>Ajuda · Privacidade · Termos</span>
        </div>

        <script>
          function selectAccount(email, name, avatar) {
            document.getElementById('content').style.display = 'none';
            document.getElementById('loading').style.display = 'block';
            if (window.opener) {
              window.opener.postMessage({
                type: 'GOOGLE_AUTH_REQUEST',
                email: email,
                name: name,
                avatar: avatar || ''
              }, '*');
              setTimeout(() => { window.close(); }, 700);
            }
          }

          function toggleOther() {
            var box = document.getElementById('otherBox');
            box.classList.toggle('open');
          }

          function submitOther() {
            var email = document.getElementById('otherEmail').value.trim();
            var name = document.getElementById('otherName').value.trim() || 'Usuário Google';
            if (!email) {
              alert('Por favor, informe seu e-mail do Google.');
              return;
            }
            selectAccount(email, name);
          }
        </script>
      </body>
      </html>
    `;

    try {
      popup.document.open();
      popup.document.write(popupHtml);
      popup.document.close();
    } catch (popupErr) {
      console.warn('Popup write falhou ou foi bloqueado pela política de origem, exibindo seletor na página:', popupErr);
      try {
        popup.close();
      } catch {}
      setIsGoogleModalOpen(true);
    }
    setIsGoogleLoading(false);
  };

  const handleSelectGoogleAccount = async (accountEmail: string, accountName: string, accountAvatar?: string) => {
    setIsGoogleLoading(true);
    setErrorMessage(null);

    try {
      const res = await apiFetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: accountEmail,
          name: accountName,
          avatar: accountAvatar,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Falha na autenticação com Google.');
      }

      setIsGoogleModalOpen(false);
      persistAccount(data.user, accountEmail);
      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao entrar com Google.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

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
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password: targetPass }),
      });

      const data = await res.json();

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
      const res = await apiFetch('/api/auth/register', {
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

      const data = await res.json();

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
          {/* Botão de Login com o Google Oficial (Popup) */}
          <div className="mb-5">
            <button
              type="button"
              id="btn-google-signin"
              onClick={handleGoogleSignIn}
              disabled={isLoading || isGoogleLoading}
              className="w-full py-2.5 px-4 bg-white hover:bg-[#FAF9F5] text-[#3D3D39] font-medium text-sm rounded-xl border border-[#D9D6CC] flex items-center justify-center gap-3 transition-all hover:border-[#B5B0A2] cursor-pointer disabled:opacity-50 shadow-xs min-h-[44px]"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3h3.88c2.27-2.09 3.66-5.17 3.66-9.09z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.09C3.26 21.36 7.34 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.32c-.25-.72-.38-1.49-.38-2.32s.13-1.6.38-2.32V6.59H1.24C.45 8.16 0 9.97 0 12s.45 3.84 1.24 5.41l4.04-3.09z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.24 6.59l4.04 3.09c.95-2.83 3.6-4.93 6.72-4.93z"/>
              </svg>
              <span>{isGoogleLoading ? 'Abrindo Google...' : 'Fazer login com o Google'}</span>
            </button>

            {/* Divisor Visual */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E5E2D9]" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2.5 text-[#8A8A82] font-semibold text-[11px] tracking-wide">
                  ou entrar com e-mail e senha
                </span>
              </div>
            </div>
          </div>

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

      {/* MODAL SELETOR DE CONTAS GOOGLE (1-CLIQUE OU OUTRA CONTA) */}
      {isGoogleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-[#E5E2D9] overflow-hidden">
            {/* Cabeçalho do Modal Google */}
            <div className="p-5 border-b border-[#E5E2D9] flex items-center justify-between bg-[#FAF9F5]">
              <div className="flex items-center gap-2.5">
                <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3h3.88c2.27-2.09 3.66-5.17 3.66-9.09z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.09C3.26 21.36 7.34 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.28 14.32c-.25-.72-.38-1.49-.38-2.32s.13-1.6.38-2.32V6.59H1.24C.45 8.16 0 9.97 0 12s.45 3.84 1.24 5.41l4.04-3.09z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.24 6.59l4.04 3.09c.95-2.83 3.6-4.93 6.72-4.93z"/>
                </svg>
                <div>
                  <h3 className="text-sm font-bold text-[#3D3D39]">Fazer login com o Google</h3>
                  <p className="text-xs text-[#8A8A82]">Escolha uma conta para acessar o ClínicaCare</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsGoogleModalOpen(false)}
                className="text-[#8A8A82] hover:text-[#3D3D39] p-1.5 rounded-lg hover:bg-[#F2F0EA] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Contas Google sugeridas para login instantâneo */}
              <div className="space-y-2.5">
                <div className="text-xs font-semibold text-[#8A8A82] uppercase tracking-wider">
                  Contas Disponíveis
                </div>

                {/* Dr. Henrique Greca (grecahenrique@gmail.com) */}
                <div
                  onClick={() =>
                    handleSelectGoogleAccount(
                      'grecahenrique@gmail.com',
                      'Dr. Henrique Greca',
                      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
                    )
                  }
                  className="p-3 border border-[#E5E2D9] hover:border-[#5A5A40] rounded-xl flex items-center justify-between cursor-pointer hover:bg-[#FAF9F5] transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"
                      alt="Dr. Henrique Greca"
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500/30"
                    />
                    <div>
                      <div className="text-sm font-bold text-[#3D3D39] group-hover:text-[#5A5A40]">
                        Dr. Henrique Greca
                      </div>
                      <div className="text-xs text-[#8A8A82]">grecahenrique@gmail.com</div>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-[#EBF3E8] text-[#3D5A3D] border border-[#D5E5D1]">
                    Psicólogo (CRP 08)
                  </span>
                </div>

                {/* Dra. Beatriz Santos (beatriz.psico@gmail.com) */}
                <div
                  onClick={() =>
                    handleSelectGoogleAccount(
                      'beatriz.psico@gmail.com',
                      'Dra. Beatriz Santos',
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                    )
                  }
                  className="p-3 border border-[#E5E2D9] hover:border-[#5A5A40] rounded-xl flex items-center justify-between cursor-pointer hover:bg-[#FAF9F5] transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
                      alt="Dra. Beatriz Santos"
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500/30"
                    />
                    <div>
                      <div className="text-sm font-bold text-[#3D3D39] group-hover:text-[#5A5A40]">
                        Dra. Beatriz Santos
                      </div>
                      <div className="text-xs text-[#8A8A82]">beatriz.psico@gmail.com</div>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-[#EBF3E8] text-[#3D5A3D] border border-[#D5E5D1]">
                    Psicóloga (CRP 08)
                  </span>
                </div>
              </div>

              {/* Opção para entrar com outra conta do Google */}
              <div className="pt-3 border-t border-[#E5E2D9]">
                <div className="text-xs font-semibold text-[#8A8A82] mb-2 uppercase tracking-wider">
                  Usar Outro E-mail Google
                </div>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={customGoogleName}
                    onChange={(e) => setCustomGoogleName(e.target.value)}
                    placeholder="Seu Nome Completo"
                    className="w-full text-xs bg-[#FAF9F5] border border-[#E5E2D9] rounded-lg p-2.5 text-[#3D3D39] focus:border-[#5A5A40] focus:outline-hidden"
                  />
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={customGoogleEmail}
                      onChange={(e) => setCustomGoogleEmail(e.target.value)}
                      placeholder="seu.email@gmail.com"
                      className="flex-1 text-xs bg-[#FAF9F5] border border-[#E5E2D9] rounded-lg p-2.5 text-[#3D3D39] focus:border-[#5A5A40] focus:outline-hidden"
                    />
                    <button
                      type="button"
                      disabled={isGoogleLoading || !customGoogleEmail}
                      onClick={() =>
                        handleSelectGoogleAccount(customGoogleEmail, customGoogleName)
                      }
                      className="px-4 py-2.5 bg-[#5A5A40] hover:bg-[#484833] text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer transition-colors disabled:opacity-50 shrink-0"
                    >
                      {isGoogleLoading ? 'Entrando...' : 'Acessar'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-[#FAF8F5] border border-[#E5E2D9] rounded-xl text-[11px] text-[#5A5A40] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#708A63] shrink-0" />
                <span>O acesso cria e vincula com segurança seu perfil de Psicólogo e emite token criptografado.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
