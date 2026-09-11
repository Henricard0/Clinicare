import React from 'react';
import { User } from '../types';
import { Bell, UserCheck, Users, Calendar, Lock, LogOut, UserCog, RefreshCw, Sun, Moon, HelpCircle } from 'lucide-react';
import { PsychologySymbol } from './PsychologySymbol';

interface HeaderProps {
  currentUser: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  unreadNotificationsCount: number;
  onOpenNotifications: () => void;
  onOpenProfile: () => void;
  onOpenTutorial?: () => void;
  onLogout: () => void;
  currentTheme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  unreadNotificationsCount,
  onOpenNotifications,
  onOpenProfile,
  onOpenTutorial,
  onLogout,
  currentTheme = 'light',
  onToggleTheme,
}) => {
  const handleReload = () => {
    window.location.reload();
  };
  return (
    <header className="bg-white dark:bg-[#1E1E1A] border-b border-[#E5E2D9] dark:border-[#383832] sticky top-0 z-30 shadow-xs transition-colors duration-200">
      {/* Main navigation header */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo & Clinical System Info com Símbolo da Psicologia */}
          <div id="header-brand-logo" className="flex items-center gap-2 sm:gap-3 cursor-pointer">
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-[#5A5A40] dark:bg-[#8D8D68] rounded-lg flex items-center justify-center text-white shadow-xs shrink-0 overflow-hidden p-0.5">
              <PsychologySymbol variant="tree" className="w-full h-full" color="#FFFFFF" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-lg sm:text-xl font-bold tracking-tight text-[#3D3D39] dark:text-[#EFECE6]">
                  ClínicaCare
                </span>
                <span className="hidden sm:inline-flex text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-[#FAF0DC] dark:bg-[#342D1C] text-[#8C5D1E] dark:text-[#E2B76D] border border-[#ECD8B5] dark:border-[#524426] rounded-md">
                  Psicologia
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-1.5">
            <button
              id="nav-agenda"
              onClick={() => setActiveTab('agenda')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer ${
                activeTab === 'agenda'
                  ? 'bg-[#5A5A40] text-white font-medium shadow-xs'
                  : 'text-[#5A5A40] dark:text-[#C5C5A8] hover:bg-[#F2F0EA] dark:hover:bg-[#2C2C26] hover:text-[#3D3D39] dark:hover:text-white'
              }`}
            >
              <Calendar className="w-4 h-4" /> Agenda
            </button>

            <button
              id="nav-patients"
              onClick={() => setActiveTab('patients')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer ${
                activeTab === 'patients'
                  ? 'bg-[#5A5A40] text-white font-medium shadow-xs'
                  : 'text-[#5A5A40] dark:text-[#C5C5A8] hover:bg-[#F2F0EA] dark:hover:bg-[#2C2C26] hover:text-[#3D3D39] dark:hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" /> Pacientes
            </button>

            <button
              id="nav-records"
              onClick={() => setActiveTab('records')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 relative cursor-pointer ${
                activeTab === 'records'
                  ? 'bg-[#5A5A40] text-white font-medium shadow-xs'
                  : 'text-[#5A5A40] dark:text-[#C5C5A8] hover:bg-[#F2F0EA] dark:hover:bg-[#2C2C26] hover:text-[#3D3D39] dark:hover:text-white'
              }`}
            >
              <Lock className="w-4 h-4" /> Prontuário
              {currentUser.role === 'RECEPTION' && (
                <span className="text-[10px] bg-[#F9ECEB] dark:bg-[#3D1E1E] text-[#9E3E3E] dark:text-[#F39C9C] border border-[#ECD1CF] dark:border-[#5A2828] px-1.5 py-0.2 rounded font-bold">Bloqueado</span>
              )}
            </button>
            <button
              id="nav-financial"
              onClick={() => setActiveTab('financial')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer ${
                activeTab === 'financial'
                  ? 'bg-[#5A5A40] text-white font-medium shadow-xs'
                  : 'text-[#5A5A40] dark:text-[#C5C5A8] hover:bg-[#F2F0EA] dark:hover:bg-[#2C2C26] hover:text-[#3D3D39] dark:hover:text-white'
              }`}
            >
              <UserCheck className="w-4 h-4" /> Financeiro
            </button>
          </nav>

          {/* Right Action Bar */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Tutorial Button */}
            {onOpenTutorial && (
              <button
                id="btn-open-tutorial"
                type="button"
                onClick={onOpenTutorial}
                className="p-2 rounded-lg text-[#5A5A40] dark:text-[#D6D6B8] hover:text-[#3D3D39] dark:hover:text-white hover:bg-[#F2F0EA] dark:hover:bg-[#2C2C26] transition-colors cursor-pointer min-w-[38px] min-h-[38px] flex items-center justify-center relative group"
                title="Tutorial do Sistema (Aprenda a usar a plataforma)"
                aria-label="Abrir Tutorial do Sistema"
              >
                <HelpCircle className="w-5 h-5 transition-transform group-hover:scale-110" />
              </button>
            )}

            {/* Theme Toggle Button */}
            {onToggleTheme && (
              <button
                id="btn-toggle-theme"
                type="button"
                onClick={onToggleTheme}
                className="p-2 rounded-lg text-[#5A5A40] dark:text-[#D6D6B8] hover:text-[#3D3D39] dark:hover:text-white hover:bg-[#F2F0EA] dark:hover:bg-[#2C2C26] transition-colors cursor-pointer min-w-[38px] min-h-[38px] flex items-center justify-center"
                title={currentTheme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
                aria-label="Alternar Tema Claro / Escuro"
              >
                {currentTheme === 'dark' ? (
                  <Sun className="w-5 h-5 text-[#F59E0B] transition-transform hover:rotate-45" />
                ) : (
                  <Moon className="w-5 h-5 text-[#5A5A40] transition-transform hover:-rotate-12" />
                )}
              </button>
            )}

            {/* Notification Bell */}
            <button
              id="btn-notifications"
              onClick={onOpenNotifications}
              className="relative p-2 rounded-lg text-[#5A5A40] dark:text-[#D6D6B8] hover:text-[#3D3D39] dark:hover:text-white hover:bg-[#F2F0EA] dark:hover:bg-[#2C2C26] transition-colors cursor-pointer min-w-[38px] min-h-[38px] flex items-center justify-center"
              title="Notificações em tempo real"
              aria-label="Abrir Notificações"
            >
              <Bell className="w-5 h-5" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#9E3E3E] text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            {/* Current Active Profile Info & Customization Trigger */}
            <div className="flex items-center gap-1.5 sm:gap-2 pl-1.5 sm:pl-2 border-l border-[#E5E2D9] dark:border-[#383832]">
              <button
                id="btn-open-user-profile"
                type="button"
                onClick={onOpenProfile}
                className="flex items-center gap-2 sm:gap-3 p-1 sm:p-1.5 rounded-xl hover:bg-[#F2F0EA] dark:hover:bg-[#2C2C26] transition-all cursor-pointer group text-left"
                title="Personalizar Perfil (Foto, Dados Profissionais e Senha)"
                aria-label="Abrir Personalização do Meu Perfil"
              >
                <div className="hidden lg:block text-right">
                  <div className="text-sm font-bold text-[#3D3D39] dark:text-[#EFECE6] leading-tight group-hover:text-[#5A5A40] dark:group-hover:text-[#D6D6B8] transition-colors flex items-center justify-end gap-1.5">
                    <span>{currentUser.name}</span>
                    <UserCog className="w-3.5 h-3.5 text-[#5A5A40] dark:text-[#D6D6B8] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="text-xs text-[#8A8A82] dark:text-[#A3A196] font-medium mt-0.5 flex items-center justify-end gap-1">
                    <span>
                      {currentUser.role === 'ADMIN' ? 'Admin' : currentUser.role === 'PROFESSIONAL' ? 'Psicólogo(a)' : 'Recepção'}
                    </span>
                    <span className="text-[10px] text-[#5A5A40] dark:text-[#D6D6B8] font-semibold underline opacity-70 group-hover:opacity-100">
                      • Editar
                    </span>
                  </div>
                </div>
                <div className="relative">
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover ring-2 ring-[#E5E2D9] dark:ring-[#383832] group-hover:ring-[#5A5A40] dark:group-hover:ring-[#8D8D68] transition-all"
                  />
                  <span
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-white dark:ring-[#1E1E1A] ${
                      currentUser.role === 'ADMIN'
                        ? 'bg-[#5A5A40]'
                        : currentUser.role === 'PROFESSIONAL'
                        ? 'bg-[#3D5A3D]'
                        : 'bg-[#8C6D3B]'
                    }`}
                    title={currentUser.role}
                  />
                </div>
              </button>

              {/* Botão Atalho Personalizar Perfil */}
              <button
                id="btn-quick-edit-profile"
                type="button"
                onClick={onOpenProfile}
                className="hidden sm:flex p-2 rounded-lg text-[#5A5A40] dark:text-[#D6D6B8] hover:text-[#3D3D39] dark:hover:text-white hover:bg-[#F2F0EA] dark:hover:bg-[#2C2C26] transition-colors cursor-pointer min-w-[36px] min-h-[36px] items-center justify-center"
                title="Personalizar Perfil"
                aria-label="Personalizar Perfil"
              >
                <UserCog className="w-4 h-4" />
              </button>

              {/* Reload System Button */}
              <button
                id="btn-reload-system"
                type="button"
                onClick={handleReload}
                className="p-2 rounded-lg text-[#8A8A82] dark:text-[#A3A196] hover:text-[#5A5A40] dark:hover:text-white hover:bg-[#F2F0EA] dark:hover:bg-[#2C2C26] transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
                title="Recarregar página"
                aria-label="Recarregar página"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              {/* Logout Button */}
              <button
                id="btn-logout"
                onClick={onLogout}
                className="p-2 rounded-lg text-[#8A8A82] dark:text-[#A3A196] hover:text-[#9E3E3E] dark:hover:text-[#F39C9C] hover:bg-[#F9ECEB] dark:hover:bg-[#3D1E1E] transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center ml-0.5"
                title="Sair (Encerrar Sessão Criptografada)"
                aria-label="Sair"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
