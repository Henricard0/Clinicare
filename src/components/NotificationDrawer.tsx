import React from 'react';
import { SystemNotification } from '../types';
import { X, Bell, Calendar, Clock } from 'lucide-react';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: SystemNotification[];
  onMarkAsRead: (id: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#2D2D2A]/40 backdrop-blur-2xs flex justify-end">
      <div className="bg-[#FDFCF9] w-full max-w-md h-full shadow-2xl border-l border-[#E5E2D9] flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-[#E5E2D9] flex items-center justify-between bg-[#F2F0EA]">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#5A5A40]" />
            <h2 className="text-base font-serif italic font-bold text-[#3D3D39]">Notificações em Tempo Real</h2>
          </div>
          <button onClick={onClose} className="text-[#8A8A82] hover:text-[#3D3D39] p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 overflow-y-auto space-y-3">
          {notifications.length === 0 ? (
            <div className="text-center py-12 text-[#8A8A82] text-xs">
              <Bell className="w-8 h-8 mx-auto mb-2 text-[#8A8A82]/50" />
              Nenhuma notificação recente.
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => onMarkAsRead(n.id)}
                className={`p-3.5 rounded-xl border transition-colors cursor-pointer text-xs space-y-1.5 ${
                  n.read
                    ? 'bg-[#F2F0EA] border-[#E5E2D9] text-[#8A8A82]'
                    : 'bg-white border-[#5A5A40]/40 text-[#2D2D2A] shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-bold text-[#3D3D39]">
                    <Calendar className="w-3.5 h-3.5 text-[#5A5A40] shrink-0" />
                    <span>{n.title}</span>
                  </div>
                  {!n.read && (
                    <span className="w-2 h-2 rounded-full bg-[#5A5A40] shrink-0 mt-1"></span>
                  )}
                </div>
                <p className="text-[#3D3D39] leading-relaxed">{n.message}</p>
                <div className="flex items-center gap-1 text-[10px] text-[#8A8A82] pt-1">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(n.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#F2F0EA] border-t border-[#E5E2D9] text-center">
          <span className="text-[11px] text-[#8A8A82]">
            Sincronização em tempo real entre Recepção e Clínicos
          </span>
        </div>
      </div>
    </div>
  );
};
