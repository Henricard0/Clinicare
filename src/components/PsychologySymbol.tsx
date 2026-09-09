import React from 'react';

interface PsychologySymbolProps {
  className?: string;
  size?: number | string;
  variant?: 'tree' | 'icon' | 'mark';
  color?: string;
}

// Folhas da copa da árvore da Psicologia (reproduzindo fielmente a imagem)
const LEAF_NODES = [
  // Topo central
  { x: 100, y: 22, r: 0, s: 1.1, c: '#48C78E' },
  { x: 92, y: 28, r: -25, s: 0.95, c: '#5AD898' },
  { x: 108, y: 28, r: 25, s: 0.95, c: '#3EB982' },
  { x: 122, y: 32, r: 40, s: 1.0, c: '#48C78E' },
  { x: 78, y: 32, r: -40, s: 1.0, c: '#5AD898' },
  // Camada superior circular
  { x: 60, y: 44, r: -55, s: 1.05, c: '#3EB982' },
  { x: 76, y: 48, r: -30, s: 1.1, c: '#48C78E' },
  { x: 92, y: 46, r: -15, s: 1.0, c: '#5AD898' },
  { x: 108, y: 46, r: 15, s: 1.0, c: '#3EB982' },
  { x: 124, y: 48, r: 30, s: 1.1, c: '#48C78E' },
  { x: 140, y: 44, r: 55, s: 1.05, c: '#5AD898' },
  { x: 154, y: 60, r: 65, s: 0.95, c: '#3EB982' },
  { x: 46, y: 60, r: -65, s: 0.95, c: '#48C78E' },
  // Camada média externa
  { x: 34, y: 80, r: -80, s: 1.05, c: '#5AD898' },
  { x: 46, y: 76, r: -50, s: 1.15, c: '#3EB982' },
  { x: 62, y: 68, r: -35, s: 1.1, c: '#48C78E' },
  { x: 78, y: 64, r: -20, s: 1.0, c: '#5AD898' },
  { x: 100, y: 60, r: 5, s: 1.1, c: '#3EB982' },
  { x: 122, y: 64, r: 20, s: 1.0, c: '#48C78E' },
  { x: 138, y: 68, r: 35, s: 1.1, c: '#5AD898' },
  { x: 154, y: 76, r: 50, s: 1.15, c: '#3EB982' },
  { x: 166, y: 80, r: 80, s: 1.05, c: '#48C78E' },
  // Laterais e entre os ramos do Psi
  { x: 28, y: 104, r: -85, s: 1.0, c: '#48C78E' },
  { x: 38, y: 98, r: -65, s: 1.1, c: '#5AD898' },
  { x: 50, y: 92, r: -40, s: 1.0, c: '#3EB982' },
  { x: 76, y: 82, r: -15, s: 1.05, c: '#48C78E' },
  { x: 124, y: 82, r: 15, s: 1.05, c: '#5AD898' },
  { x: 150, y: 92, r: 40, s: 1.0, c: '#3EB982' },
  { x: 162, y: 98, r: 65, s: 1.1, c: '#48C78E' },
  { x: 172, y: 104, r: 85, s: 1.0, c: '#5AD898' },
  // Folhas internas (entre a haste central e os braços)
  { x: 80, y: 100, r: -25, s: 1.0, c: '#3EB982' },
  { x: 76, y: 116, r: -35, s: 0.95, c: '#48C78E' },
  { x: 82, y: 132, r: -20, s: 1.0, c: '#5AD898' },
  { x: 120, y: 100, r: 25, s: 1.0, c: '#48C78E' },
  { x: 124, y: 116, r: 35, s: 0.95, c: '#3EB982' },
  { x: 118, y: 132, r: 20, s: 1.0, c: '#5AD898' },
  // Folhas inferiores laterais
  { x: 26, y: 122, r: -80, s: 0.95, c: '#3EB982' },
  { x: 38, y: 120, r: -60, s: 1.05, c: '#48C78E' },
  { x: 52, y: 118, r: -45, s: 1.0, c: '#5AD898' },
  { x: 148, y: 118, r: 45, s: 1.0, c: '#48C78E' },
  { x: 162, y: 120, r: 60, s: 1.05, c: '#5AD898' },
  { x: 174, y: 122, r: 80, s: 0.95, c: '#3EB982' },
  // Base da copa
  { x: 36, y: 140, r: -70, s: 0.9, c: '#5AD898' },
  { x: 48, y: 138, r: -50, s: 0.95, c: '#48C78E' },
  { x: 62, y: 142, r: -30, s: 0.9, c: '#3EB982' },
  { x: 138, y: 142, r: 30, s: 0.9, c: '#48C78E' },
  { x: 152, y: 138, r: 50, s: 0.95, c: '#5AD898' },
  { x: 164, y: 140, r: 70, s: 0.9, c: '#3EB982' },
];

export const PsychologySymbol: React.FC<PsychologySymbolProps> = ({
  className = 'w-10 h-10',
  size,
  variant = 'tree',
  color = '#2D2D2A',
}) => {
  const style = size ? { width: size, height: size } : undefined;

  // Variante Compacta (Ícone simples para inputs e botões pequenos)
  if (variant === 'icon') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        style={style}
        aria-label="Símbolo da Psicologia"
      >
        {/* Haste central */}
        <line x1="12" y1="2" x2="12" y2="22" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        {/* Curvatura dos braços do Psi */}
        <path
          d="M4.5 7.5C4.5 13 8 16 12 16C16 16 19.5 13 19.5 7.5"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Base do pedestal */}
        <line x1="9" y1="22" x2="15" y2="22" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    );
  }

  // Variante Mark (Psi sólido estilizado com base em pedestal elegante)
  if (variant === 'mark') {
    return (
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        style={style}
        aria-label="Símbolo da Psicologia"
      >
        {/* Silhueta precisa do Psi grego */}
        <path
          d="M 44 14 C 44 10 56 10 56 14 L 56 62 C 60 62 66 61 71 56 C 75 51 77 43 76 34 C 76 30 84 30 84 34 C 85 47 81 58 74 65 C 67 73 59 76 56 77 L 56 86 C 60 87 64 89 67 92 L 33 92 C 36 89 40 87 44 86 L 44 77 C 41 76 33 73 26 65 C 19 58 15 47 16 34 C 16 30 24 30 24 34 C 23 43 25 51 29 56 C 34 61 40 62 44 62 Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  // Variante Árvore da Psicologia (A imagem exata fornecida pelo usuário)
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-label="Árvore da Psicologia (Psi)"
    >
      {/* 1. Folhas verdes formando a copa arredondada */}
      <g id="psychology-leaves" className="transition-transform duration-300">
        {LEAF_NODES.map((leaf, index) => (
          <g
            key={index}
            transform={`translate(${leaf.x}, ${leaf.y}) rotate(${leaf.r}) scale(${leaf.s * 0.9})`}
          >
            {/* Folha em formato de amêndoa orgânica com nervura sutil */}
            <path
              d="M 0 -8 C 5 -6 6 1 0 8 C -6 1 -5 -6 0 -8 Z"
              fill={leaf.c}
              opacity="0.95"
            />
            <path
              d="M 0 -6 L 0 6"
              stroke="#FFFFFF"
              strokeWidth="0.6"
              strokeLinecap="round"
              opacity="0.4"
            />
          </g>
        ))}
      </g>

      {/* 2. Símbolo Psi como tronco e ramos principais */}
      <g id="psychology-psi-trunk">
        {/* Tronco Central com base alargada */}
        <path
          d="
            M 92 78
            C 92 74 108 74 108 78
            L 108 142
            C 114 142 121 140 128 134
            C 134 128 137 116 136 102
            C 136 96 142 84 153 82
            C 158 81 161 85 160 90
            C 158 97 151 100 148 104
            C 148 116 144 128 136 137
            C 127 147 116 151 108 152
            L 108 166
            C 115 169 122 173 125 178
            L 75 178
            C 78 173 85 169 92 166
            L 92 152
            C 84 151 73 147 64 137
            C 56 128 52 116 52 104
            C 49 100 42 97 40 90
            C 39 85 42 81 47 82
            C 58 84 64 96 64 102
            C 63 116 66 128 72 134
            C 79 140 86 142 92 142
            Z
          "
          fill={color}
          fillRule="evenodd"
        />
      </g>
    </svg>
  );
};
