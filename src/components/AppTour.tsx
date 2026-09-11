import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Calendar,
  Users,
  Lock,
  UserCheck,
  Plus,
  Bell,
  UserCog,
  HelpCircle,
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Compass,
  ArrowRight
} from 'lucide-react';

export interface TourStep {
  id: string;
  title: string;
  badge: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  practicalUsage: string;
  targetSelector: string; // Seletor CSS (ex: '#nav-agenda, #mobile-nav-agenda')
  tab?: 'agenda' | 'patients' | 'records' | 'financial';
  placement?: 'bottom' | 'top' | 'left' | 'right' | 'auto';
  padding?: number;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'step-brand',
    title: 'Bem-vindo(a) ao ClínicaCare!',
    badge: 'Passo 1 de 10 • Boas-vindas',
    category: 'Visão Geral & Segurança',
    icon: Compass,
    description:
      'Esta é a sua plataforma especializada para psicólogos e clínicas de saúde mental. Todo o sistema opera com criptografia ponta a ponta e sigilo ético absoluto (normas CFP e LGPD Art. 11 para dados sensíveis de saúde).',
    practicalUsage:
      'Navegue facilmente entre as áreas principais pelo menu superior (ou pela barra inferior em telas de celular e tablets).',
    targetSelector: '#header-brand-logo',
    tab: 'agenda',
    placement: 'bottom',
    padding: 8,
  },
  {
    id: 'step-agenda',
    title: 'Grade Semanal de Consultas',
    badge: 'Passo 2 de 10 • Atendimentos',
    category: 'Agenda Clínica',
    icon: Calendar,
    description:
      'Visualize todos os seus atendimentos da semana em uma grade visual horária interativa ou em formato de lista corrida. Acompanhe status de presença (Agendado, Confirmado, Realizado ou Faltou).',
    practicalUsage:
      'Você pode arrastar e soltar (drag & drop) atendimentos para outros dias ou horários e confirmar presenças com agilidade.',
    targetSelector: '#nav-agenda, #mobile-nav-agenda',
    tab: 'agenda',
    placement: 'bottom',
    padding: 6,
  },
  {
    id: 'step-new-appointment',
    title: 'Como Agendar um Paciente',
    badge: 'Passo 3 de 10 • Marcação',
    category: 'Agendamentos',
    icon: Plus,
    description:
      'Abra o formulário de marcação rápida para registrar sessões individuais presenciais ou online por teleconsulta (com geração automática de link seguro), data, horário e profissional.',
    practicalUsage:
      'Você também pode ativar a "Recorrência Semanal Automática" para pacientes em tratamento contínuo, agendando semanas futuras em lote.',
    targetSelector: '#btn-new-appointment',
    tab: 'agenda',
    placement: 'bottom',
    padding: 6,
  },
  {
    id: 'step-patients',
    title: 'Base de Pacientes & Filtros',
    badge: 'Passo 4 de 10 • Gestão',
    category: 'Fichas Cadastrais',
    icon: Users,
    description:
      'Controle completo da carteira de pacientes da clínica. Acesse contatos de emergência, profissional vinculado, termos LGPD assinados e enquadre de tratamento.',
    practicalUsage:
      'Use a barra de busca por nome ou CPF e filtre rapidamente entre pacientes em "Tratamento Contínuo" ou em "1ª Sessão".',
    targetSelector: '#nav-patients, #mobile-nav-patients',
    tab: 'patients',
    placement: 'bottom',
    padding: 6,
  },
  {
    id: 'step-new-patient',
    title: 'Admissão & Novo Cadastro',
    badge: 'Passo 5 de 10 • Admissão',
    category: 'Cadastrar Paciente',
    icon: Plus,
    description:
      'Cadastre novos pacientes com validação automática de dados. A recepção tem acesso aos dados demográficos, enquanto a anamnese profunda e queixa principal ficam em sigilo restrito ao profissional de saúde.',
    practicalUsage:
      'Clique neste botão para registrar um novo paciente e inicializar o prontuário eletrônico.',
    targetSelector: '#btn-new-patient, #btn-empty-add-patient',
    tab: 'patients',
    placement: 'bottom',
    padding: 6,
  },
  {
    id: 'step-records',
    title: 'Prontuário Eletrônico (PEP)',
    badge: 'Passo 6 de 10 • Sigilo Clínico',
    category: 'Evoluções & Notas',
    icon: Lock,
    description:
      'O Prontuário Eletrônico é o coração clínico da sua prática. Registre a evolução detalhada de cada sessão com carimbo inviolável de data, hora e assinatura criptográfica SHA-256.',
    practicalUsage:
      'Selecione o paciente no menu do prontuário para ver a linha do tempo, redigir notas de sessão e anexar testes confidenciais criptografados com AES-256-GCM.',
    targetSelector: '#nav-records, #mobile-nav-records',
    tab: 'records',
    placement: 'bottom',
    padding: 6,
  },
  {
    id: 'step-financial',
    title: 'Honorários, Sessões & Recibos',
    badge: 'Passo 7 de 10 • Módulo Financeiro',
    category: 'Gestão Financeira',
    icon: UserCheck,
    description:
      'Acompanhe o faturamento dos atendimentos, valores recebidos e pendentes por sessão individual ou pacote mensal.',
    practicalUsage:
      'Gere recibos psicológicos formatados com seus dados profissionais e CRP, prontos para impressão ou download em PDF para reembolso e declaração do paciente.',
    targetSelector: '#nav-financial, #mobile-nav-financial',
    tab: 'financial',
    placement: 'bottom',
    padding: 6,
  },
  {
    id: 'step-notifications',
    title: 'Notificações & Lembretes',
    badge: 'Passo 8 de 10 • Alertas',
    category: 'Avisos em Tempo Real',
    icon: Bell,
    description:
      'Receba alertas de confirmações de presença de pacientes via WhatsApp, remarcações de agenda, avisos de sessões próximas e registros de auditoria de segurança.',
    practicalUsage:
      'O sino exibirá uma contagem numérica de alertas não lidos. Clique para abrir a gaveta lateral de avisos.',
    targetSelector: '#btn-notifications',
    tab: 'agenda',
    placement: 'bottom',
    padding: 6,
  },
  {
    id: 'step-profile',
    title: 'Meu Perfil, Segurança & Tema',
    badge: 'Passo 9 de 10 • Personalização',
    category: 'Credenciais Profissionais',
    icon: UserCog,
    description:
      'Personalize seu perfil: atualize sua foto profissional, número de registro no conselho (CRP/CRM), abordagem clínica e senha criptografada com derivação Scrypt.',
    practicalUsage:
      'Você também pode alternar entre o Modo Claro e o Modo Escuro no botão de sol/lua para trabalhar com mais conforto.',
    targetSelector: '#btn-open-user-profile, #mobile-nav-profile',
    tab: 'agenda',
    placement: 'bottom',
    padding: 6,
  },
  {
    id: 'step-tutorial-button',
    title: 'Você está pronto(a) para começar!',
    badge: 'Passo 10 de 10 • Conclusão',
    category: 'Tutorial Sempre Disponível',
    icon: Sparkles,
    description:
      'Parabéns! Você já conhece os principais recursos da ClínicaCare. Agora você pode gerenciar seus pacientes, agendas e prontuários com total tranquilidade e segurança.',
    practicalUsage:
      'Se quiser rever este tutorial passo a passo novamente a qualquer momento, basta clicar neste botão de interrogação no cabeçalho!',
    targetSelector: '#btn-open-tutorial',
    tab: 'agenda',
    placement: 'bottom',
    padding: 6,
  },
];

interface AppTourProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  activeTab: 'agenda' | 'patients' | 'records' | 'financial';
  setActiveTab: (tab: 'agenda' | 'patients' | 'records' | 'financial') => void;
  currentTheme?: 'light' | 'dark';
}

interface TargetRect {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
}

export const AppTour: React.FC<AppTourProps> = ({
  isOpen,
  onClose,
  onComplete,
  activeTab,
  setActiveTab,
  currentTheme = 'light',
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<TargetRect | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number; position: 'top' | 'bottom' | 'center' }>({
    top: 100,
    left: 20,
    position: 'bottom',
  });
  const popoverRef = useRef<HTMLDivElement>(null);

  const step = TOUR_STEPS[currentStepIndex] || TOUR_STEPS[0];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === TOUR_STEPS.length - 1;
  const progressPercent = Math.round(((currentStepIndex + 1) / TOUR_STEPS.length) * 100);

  // Encontra o elemento alvo no DOM (com suporte a fallback múltiplo)
  const findTargetElement = useCallback((selectorString: string): HTMLElement | null => {
    const selectors = selectorString.split(',').map((s) => s.trim());
    for (const sel of selectors) {
      const el = document.querySelector(sel) as HTMLElement | null;
      if (el && el.offsetParent !== null) {
        // Elemento está visível na tela
        return el;
      }
    }
    // Fallback: se nenhum visível, pega o primeiro que existir
    for (const sel of selectors) {
      const el = document.querySelector(sel) as HTMLElement | null;
      if (el) return el;
    }
    return null;
  }, []);

  // Recalcula as dimensões e posição do spotlight e do popover
  const updateSpotlightPosition = useCallback(() => {
    if (!isOpen) return;

    const el = findTargetElement(step.targetSelector);
    const padding = step.padding ?? 8;

    if (el) {
      const rect = el.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Garante limites dentro da tela
      const x = Math.max(4, rect.left - padding);
      const y = Math.max(4, rect.top - padding);
      const width = Math.min(viewportWidth - x - 4, rect.width + padding * 2);
      const height = Math.min(viewportHeight - y - 4, rect.height + padding * 2);

      setSpotlightRect({
        x,
        y,
        width,
        height,
        radius: 12,
      });

      // Calcula posicionamento inteligente do Popover (Card)
      const popoverWidth = Math.min(420, viewportWidth - 32);
      const popoverHeightEst = 260;

      let top = 0;
      let left = Math.max(16, Math.min(viewportWidth - popoverWidth - 16, x + width / 2 - popoverWidth / 2));
      let position: 'top' | 'bottom' | 'center' = 'bottom';

      // Verifica espaço abaixo vs espaço acima
      const spaceBelow = viewportHeight - (y + height);
      const spaceAbove = y;

      if (spaceBelow >= popoverHeightEst + 20) {
        top = y + height + 14;
        position = 'bottom';
      } else if (spaceAbove >= popoverHeightEst + 20) {
        top = y - popoverHeightEst - 14;
        position = 'top';
      } else {
        // Centraliza verticalmente se não couber nem em cima nem embaixo
        top = Math.max(16, viewportHeight / 2 - popoverHeightEst / 2);
        left = Math.max(16, (viewportWidth - popoverWidth) / 2);
        position = 'center';
      }

      setPopoverPos({ top, left, position });
    } else {
      // Fallback gracioso: centraliza na tela se o elemento não for encontrado
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const popoverWidth = Math.min(420, viewportWidth - 32);

      setSpotlightRect(null);
      setPopoverPos({
        top: Math.max(40, viewportHeight / 2 - 140),
        left: Math.max(16, (viewportWidth - popoverWidth) / 2),
        position: 'center',
      });
    }
  }, [isOpen, step, findTargetElement]);

  // Altera a aba se o passo exigir e atualiza a posição
  useEffect(() => {
    if (!isOpen) return;

    if (step.tab && activeTab !== step.tab) {
      setActiveTab(step.tab);
    }

    // Scroll suave para o elemento alvo se estiver fora do viewport
    const scrollTimeout = setTimeout(() => {
      const el = findTargetElement(step.targetSelector);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }
      updateSpotlightPosition();
    }, 120);

    // Reposiciona novamente após animações de scroll
    const secondTimeout = setTimeout(() => {
      updateSpotlightPosition();
    }, 320);

    return () => {
      clearTimeout(scrollTimeout);
      clearTimeout(secondTimeout);
    };
  }, [isOpen, currentStepIndex, step, activeTab, setActiveTab, findTargetElement, updateSpotlightPosition]);

  // Listeners de Resize e Scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => updateSpotlightPosition();
    const handleScroll = () => updateSpotlightPosition();

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen, updateSpotlightPosition]);

  // Atalhos de Teclado (Esc, Setas)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (!isLastStep) {
          setCurrentStepIndex((prev) => prev + 1);
        } else {
          onComplete();
        }
      } else if (e.key === 'ArrowLeft') {
        if (!isFirstStep) {
          setCurrentStepIndex((prev) => prev - 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLastStep, isFirstStep, onClose, onComplete]);

  if (!isOpen) return null;

  const StepIcon = step.icon;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  return (
    <div
      id="app-tour-overlay"
      className="fixed inset-0 z-[9999] overflow-hidden select-none animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Tutorial do Sistema"
    >
      {/* Máscara SVG de Spotlight com Recorte Suave */}
      <svg className="fixed inset-0 w-full h-full pointer-events-auto">
        <defs>
          <mask id="tour-spotlight-mask">
            {/* Fundo branco = escurecido */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Recorte preto = transparente no elemento selecionado */}
            {spotlightRect && (
              <rect
                x={spotlightRect.x}
                y={spotlightRect.y}
                width={spotlightRect.width}
                height={spotlightRect.height}
                rx={spotlightRect.radius}
                ry={spotlightRect.radius}
                fill="black"
              />
            )}
          </mask>
        </defs>

        {/* Fundo Escuro com Opacidade Confortável */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill={currentTheme === 'dark' ? 'rgba(10, 10, 8, 0.82)' : 'rgba(28, 28, 24, 0.74)'}
          mask="url(#tour-spotlight-mask)"
        />

        {/* Borda Iluminada Pulsante ao Redor do Elemento em Destaque */}
        {spotlightRect && (
          <rect
            x={spotlightRect.x}
            y={spotlightRect.y}
            width={spotlightRect.width}
            height={spotlightRect.height}
            rx={spotlightRect.radius}
            ry={spotlightRect.radius}
            fill="none"
            stroke={currentTheme === 'dark' ? '#C5C5A8' : '#8D8D68'}
            strokeWidth="3"
            strokeDasharray="6 4"
            className="transition-all duration-300 ease-out"
          />
        )}
      </svg>

      {/* Popover / Card Informativo */}
      <div
        ref={popoverRef}
        style={{
          top: `${popoverPos.top}px`,
          left: `${popoverPos.left}px`,
          maxWidth: 'min(420px, calc(100vw - 32px))',
        }}
        className="fixed z-[10000] w-full bg-white dark:bg-[#1E1E1A] text-[#2D2D2A] dark:text-[#EFECE6] rounded-2xl shadow-2xl border border-[#E5E2D9] dark:border-[#383832] p-5 transition-all duration-200 animate-in fade-in zoom-in-95"
      >
        {/* Barra de Progresso Superior */}
        <div className="w-full bg-[#F2F0EA] dark:bg-[#2C2C26] h-1.5 rounded-full overflow-hidden mb-4">
          <div
            className="bg-[#5A5A40] dark:bg-[#A3A37A] h-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Header do Card com Ícone, Categoria e Botão Fechar */}
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#F2F0EA] dark:bg-[#2C2C26] text-[#5A5A40] dark:text-[#D6D6B8] flex items-center justify-center shrink-0 border border-[#E5E2D9] dark:border-[#383832]">
              <StepIcon className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-[#5A5A40] dark:text-[#A3A37A] uppercase tracking-wider block">
                {step.badge}
              </span>
              <h3 className="text-base font-bold text-[#3D3D39] dark:text-[#EFECE6] leading-tight">
                {step.title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            id="btn-tour-close"
            onClick={onClose}
            className="p-1 rounded-lg text-[#8A8A82] hover:text-[#3D3D39] dark:hover:text-white hover:bg-[#F2F0EA] dark:hover:bg-[#2C2C26] transition-colors cursor-pointer"
            title="Fechar tutorial (Esc)"
            aria-label="Fechar tutorial"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Descrição Principal */}
        <p className="text-xs text-[#5A5A52] dark:text-[#C5C5B8] leading-relaxed mb-3">
          {step.description}
        </p>

        {/* Dica Prática de Como Usar */}
        <div className="p-2.5 bg-[#F9F8F5] dark:bg-[#262622] rounded-xl border border-[#EBE8DF] dark:border-[#33332D] mb-4 flex items-start gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#5A5A40] dark:text-[#A3A37A] shrink-0 mt-0.5" />
          <div className="text-[11px] text-[#4A4A40] dark:text-[#B5B5A2] leading-snug">
            <strong className="font-semibold text-[#3D3D35] dark:text-[#EFECE6] mr-1">Como usar:</strong>
            {step.practicalUsage}
          </div>
        </div>

        {/* Rodapé com Navegação & Contador */}
        <div className="flex items-center justify-between pt-3 border-t border-[#E5E2D9] dark:border-[#383832]">
          <button
            type="button"
            id="btn-tour-skip"
            onClick={onClose}
            className="text-xs font-semibold text-[#8A8A82] dark:text-[#999988] hover:text-[#3D3D39] dark:hover:text-white transition-colors cursor-pointer"
          >
            Pular tutorial
          </button>

          <div className="flex items-center gap-2">
            {!isFirstStep && (
              <button
                type="button"
                id="btn-tour-prev"
                onClick={handlePrev}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#E5E2D9] dark:border-[#383832] text-[#5A5A40] dark:text-[#D6D6B8] hover:bg-[#F2F0EA] dark:hover:bg-[#2C2C26] transition-colors cursor-pointer flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Anterior
              </button>
            )}

            <button
              type="button"
              id="btn-tour-next"
              onClick={handleNext}
              className="px-4 py-1.5 text-xs font-bold rounded-lg bg-[#5A5A40] dark:bg-[#8D8D68] hover:bg-[#484833] dark:hover:bg-[#787856] text-white shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              {isLastStep ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Concluir Tutorial
                </>
              ) : (
                <>
                  Próximo <ChevronRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
