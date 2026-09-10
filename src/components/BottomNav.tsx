import React from 'react';
import { Calendar, Users, Lock, UserCog } from 'lucide-react';
import { User } from '../types';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  currentUser: User;
  onOpenProfile?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onOpenProfile,
}) => {
  return (
    <nav
      id="mobile-bottom-nav"
      aria-label="Navegação Principal Mobile"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#1E1E1A]/95 backdrop-blur-md border-t border-[#E5E2D9] dark:border-[#383832] px-2 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-lg flex items-center justify-around transition-colors"
    >
      {/* 1. Agenda */}
      <button
        id="mobile-nav-agenda"
        onClick={() => setActiveTab('agenda')}
        className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-all cursor-pointer min-h-[44px] ${
          activeTab === 'agenda'
            ? 'text-[#5A5A40] dark:text-[#EFECE6] font-bold bg-[#F2F0EA] dark:bg-[#2C2C26]'
            : 'text-[#8A8A82] dark:text-[#A3A196] hover:text-[#3D3D39] dark:hover:text-white'
        }`}
      >
        <Calendar className={`w-5 h-5 ${activeTab === 'agenda' ? 'text-[#5A5A40] dark:text-[#EFECE6]' : 'text-[#8A8A82] dark:text-[#A3A196]'}`} />
        <span className="text-[10px] mt-0.5 tracking-tight">Agenda</span>
      </button>

      {/* 2. Pacientes */}
      <button
        id="mobile-nav-patients"
        onClick={() => setActiveTab('patients')}
        className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-all cursor-pointer min-h-[44px] ${
          activeTab === 'patients'
            ? 'text-[#5A5A40] dark:text-[#EFECE6] font-bold bg-[#F2F0EA] dark:bg-[#2C2C26]'
            : 'text-[#8A8A82] dark:text-[#A3A196] hover:text-[#3D3D39] dark:hover:text-white'
        }`}
      >
        <Users className={`w-5 h-5 ${activeTab === 'patients' ? 'text-[#5A5A40] dark:text-[#EFECE6]' : 'text-[#8A8A82] dark:text-[#A3A196]'}`} />
        <span className="text-[10px] mt-0.5 tracking-tight">Pacientes</span>
      </button>

      {/* 3. Prontuário */}
      <button
        id="mobile-nav-records"
        onClick={() => setActiveTab('records')}
        className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-all cursor-pointer relative min-h-[44px] ${
          activeTab === 'records'
            ? 'text-[#5A5A40] dark:text-[#EFECE6] font-bold bg-[#F2F0EA] dark:bg-[#2C2C26]'
            : 'text-[#8A8A82] dark:text-[#A3A196] hover:text-[#3D3D39] dark:hover:text-white'
        }`}
      >
        <div className="relative">
          <Lock className={`w-5 h-5 ${activeTab === 'records' ? 'text-[#5A5A40] dark:text-[#EFECE6]' : 'text-[#8A8A82] dark:text-[#A3A196]'}`} />
          {currentUser.role === 'RECEPTION' && (
            <span
              className="absolute -top-1 -right-1.5 w-2.5 h-2.5 rounded-full bg-[#8C4A3B] ring-2 ring-white dark:ring-[#1E1E1A]"
              title="Acesso bloqueado para Recepção (LGPD Art. 11)"
            />
          )}
        </div>
        <span className="text-[10px] mt-0.5 tracking-tight">Prontuário</span>
      </button>

      {/* 4. Financeiro */}
      <button
        id="mobile-nav-financial"
        onClick={() => setActiveTab('financial')}
        className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-all cursor-pointer min-h-[44px] ${
          activeTab === 'financial'
            ? 'text-[#5A5A40] dark:text-[#EFECE6] font-bold bg-[#F2F0EA] dark:bg-[#2C2C26]'
            : 'text-[#8A8A82] dark:text-[#A3A196] hover:text-[#3D3D39] dark:hover:text-white'
        }`}
      >
        <UserCog className={`w-5 h-5 ${activeTab === 'financial' ? 'text-[#5A5A40] dark:text-[#EFECE6]' : 'text-[#8A8A82] dark:text-[#A3A196]'}`} />
        <span className="text-[10px] mt-0.5 tracking-tight">Financeiro</span>
      </button>

      {/* 5. Meu Perfil */}
      {onOpenProfile && (
        <button
          id="mobile-nav-profile"
          onClick={onOpenProfile}
          className="flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-all cursor-pointer min-h-[44px] text-[#8A8A82] dark:text-[#A3A196] hover:text-[#3D3D39] dark:hover:text-white"
        >
          <div className="relative">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-5 h-5 rounded-full object-cover ring-1 ring-[#5A5A40] dark:ring-[#B5B590]"
            />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight font-medium">Perfil</span>
        </button>
      )}
    </nav>
  );
};
