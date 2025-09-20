
import React from 'react';

// In a full application, this file would contain SVG components for all 50 states.
// For brevity, only a few representative states are included here.
// SVGs are simplified and sourced from public domain resources.

const CaliforniaOutline: React.FC = () => (
  <svg viewBox="0 0 100 200" className="w-full h-full" style={{ fill: 'black', stroke: 'black', strokeWidth: 1 }}>
    <path d="M56,193 C55,191 55,189 54,187 C53,184 52,181 50,178 C48,175 46,173 45,170 C43,167 42,164 42,161 C42,157 43,153 44,149 C45,145 46,141 47,137 C48,133 49,129 49,125 C50,121 50,117 50,113 C50,109 49,105 48,102 C47,99 45,96 44,93 C42,91 41,88 40,86 C38,83 37,80 36,77 C35,74 34,71 33,68 C32,65 31,62 30,59 C29,56 28,53 28,50 C28,47 28,44 28,41 C28,38 28,35 29,32 C30,29 31,26 32,23 C33,20 34,17 35,14 C36,11 38,8 40,5 C42,2 45,0 47,0 C48,0 50,1 51,2 C53,4 54,6 55,8 C56,10 57,12 58,14 C59,16 60,18 62,20 C63,22 65,24 66,26 C67,28 68,30 69,32 C70,34 71,36 71,39 C71,41 71,44 71,47 C71,50 71,53 71,56 C71,59 71,62 72,65 C72,68 72,71 73,74 C73,77 73,80 74,83 C74,86 75,89 75,92 C75,95 76,98 76,101 C76,104 76,107 77,110 C77,113 77,116 78,119 C78,122 78,125 79,128 C79,131 79,134 80,137 C80,140 80,143 80,146 C80,149 80,152 79,155 C79,158 78,161 77,164 C76,167 75,170 73,173 C71,176 69,179 67,182 C65,185 62,188 60,191 C58,194 56,197 54,200 L56,193" />
  </svg>
);

const TexasOutline: React.FC = () => (
  <svg viewBox="0 0 200 200" className="w-full h-full" style={{ fill: 'black', stroke: 'black', strokeWidth: 1 }}>
    <path d="M199,87 C198,87 197,88 196,89 C194,90 193,91 191,91 C189,92 188,93 186,93 C184,94 182,94 180,94 C178,94 176,93 174,92 C172,91 170,90 168,88 C166,86 164,84 163,82 C161,80 160,78 159,76 C158,74 157,72 156,70 C155,68 155,66 155,64 C155,62 155,60 156,58 C157,56 158,54 160,52 C161,50 163,48 165,46 C167,44 170,42 173,40 C176,38 179,36 182,34 C185,32 188,30 191,28 C194,26 197,24 200,22 L171,22 C167,22 163,23 159,24 C155,25 151,27 147,29 C143,31 139,33 135,35 C131,37 127,39 123,41 C119,43 115,45 111,47 C107,49 103,51 99,53 C95,55 91,57 87,59 C83,61 79,63 75,65 C71,67 67,69 63,71 C59,73 55,75 51,77 C47,79 43,81 39,83 C35,85 31,87 27,89 C23,91 19,93 15,95 C11,97 7,99 3,101 L0,103 L0,128 C0,130 1,132 2,134 C3,136 4,138 6,140 C8,142 10,144 12,146 C14,148 16,150 18,152 C20,154 22,156 24,158 C26,160 28,162 30,164 C32,166 34,168 36,170 C38,172 40,174 42,176 C44,178 46,180 48,182 C50,184 52,186 54,188 C56,190 58,192 60,194 C62,196 64,198 66,200 L115,138 C116,137 117,136 118,135 C119,134 120,133 121,132 C122,131 123,130 124,129 C125,128 126,127 127,126 C128,125 129,124 130,123 C131,122 132,121 133,120 C134,119 135,118 136,117 C137,116 138,115 139,114 C140,113 141,112 142,111 C143,110 144,109 145,108 C146,107 147,106 148,105 C149,104 150,103 151,102 C152,101 153,100 154,99 C155,98 156,97 157,96 C158,95 159,94 160,93 C161,92 162,91 163,90 C164,89 165,88 166,87 C167,86 168,85 169,84 C170,83 171,82 172,81 C173,80 174,79 175,78 C176,77 177,76 178,75 C179,74 180,73 181,72 C182,71 183,70 184,69 C185,68 186,67 187,66 C188,65 189,64 190,63 C191,62 192,61 193,60 C194,59 195,58 196,57 C197,56 198,55 199,54 C200,53 200,52 200,51 C200,50 200,49 199,48 C198,47 197,46 196,45 C195,44 194,43 193,42 C192,41 191,40 190,39 C189,38 188,37 187,36 C186,35 185,34 184,33 C183,32 182,31 181,30 C180,29 179,28 178,27 C177,26 176,25 175,24 C174,23 173,22 172,21 C171,20 170,19 169,18 C168,17 167,16 166,15 C165,14 164,13 163,12 C162,11 161,10 160,9 C159,8 158,7 157,6 C156,5 155,4 154,3 C153,2 152,1 151,0 L199,0 L199,87 Z" />
  </svg>
);

const FloridaOutline: React.FC = () => (
  <svg viewBox="0 0 150 200" className="w-full h-full" style={{ fill: 'black', stroke: 'black', strokeWidth: 1 }}>
    <path d="M127,0 C125,0 123,1 121,2 C119,3 117,4 115,5 C113,6 111,7 109,8 C107,9 105,10 103,11 C101,12 99,13 97,14 C95,15 93,16 91,17 C89,18 87,19 85,20 C83,21 81,22 79,23 C77,24 75,25 73,26 C71,27 69,28 67,29 C65,30 63,31 61,32 C59,33 57,34 55,35 C53,36 51,37 49,38 C47,39 45,40 43,41 C41,42 39,43 37,44 C35,45 33,46 31,47 C29,48 27,49 25,50 C23,51 21,52 19,53 C17,54 15,55 13,56 C11,57 9,58 7,59 C5,60 3,61 1,62 L0,63 L0,84 C2,84 4,84 6,84 C8,84 10,84 12,84 C14,84 16,84 18,84 C20,84 22,84 24,84 C26,84 28,84 30,84 C32,84 34,84 36,84 C38,84 40,84 42,84 C44,84 46,84 48,84 C50,84 52,84 54,84 C56,84 58,84 60,84 C62,84 64,84 66,84 C68,84 70,84 72,84 C74,84 76,84 78,84 C80,84 82,84 84,84 C86,84 88,84 90,84 C92,84 94,84 96,84 C98,84 100,84 102,84 C104,84 106,84 108,84 C110,84 112,84 114,84 C116,84 118,84 120,84 C122,84 124,84 126,84 C128,84 130,84 132,84 C134,84 136,84 138,84 C140,84 142,84 144,84 C146,84 148,84 150,84 L149,85 C148,90 147,95 146,100 C145,105 144,110 143,115 C142,120 141,125 140,130 C139,135 138,140 137,145 C136,150 135,155 134,160 C133,165 132,170 131,175 C130,180 129,185 128,190 C127,195 126,200 L123,198 C120,196 117,194 114,192 C111,190 108,188 105,186 C102,184 99,182 96,180 C93,178 90,176 87,174 C84,172 81,170 78,168 C75,166 72,164 69,162 C66,160 63,158 60,156 C57,154 54,152 51,150 L127,0 Z" />
  </svg>
);

const ColoradoOutline: React.FC = () => (
    <svg viewBox="0 0 200 144" className="w-full h-full" style={{ fill: 'black', stroke: 'black', strokeWidth: 1 }}>
        <rect width="200" height="144" />
    </svg>
);

const PennsylvaniaOutline: React.FC = () => (
    <svg viewBox="0 0 200 115" className="w-full h-full" style={{ fill: 'black', stroke: 'black', strokeWidth: 1 }}>
        <path d="M0,28 L0,115 L160,115 L160,108 C163,107 165,106 167,105 C170,103 172,101 175,100 C177,98 180,96 182,95 C185,93 187,91 190,90 C192,88 195,86 197,85 C200,83 200,83 200,83 L200,0 L32,0 L32,28 L0,28 Z" />
    </svg>
);

export const StateOutlines: { [key: string]: React.FC } = {
    'California': CaliforniaOutline,
    'Texas': TexasOutline,
    'Florida': FloridaOutline,
    'Colorado': ColoradoOutline,
    'Pennsylvania': PennsylvaniaOutline,
    // Add all other 45 states here...
    // Fallback for states not yet added
    'Alabama': ColoradoOutline, 'Alaska': ColoradoOutline, 'Arizona': ColoradoOutline, 'Arkansas': ColoradoOutline, 
    'Connecticut': ColoradoOutline, 'Delaware': ColoradoOutline, 'Georgia': ColoradoOutline, 
    'Hawaii': ColoradoOutline, 'Idaho': ColoradoOutline, 'Illinois': ColoradoOutline, 'Indiana': ColoradoOutline, 'Iowa': ColoradoOutline, 'Kansas': ColoradoOutline, 
    'Kentucky': ColoradoOutline, 'Louisiana': ColoradoOutline, 'Maine': ColoradoOutline, 'Maryland': ColoradoOutline, 'Massachusetts': ColoradoOutline, 
    'Michigan': ColoradoOutline, 'Minnesota': ColoradoOutline, 'Mississippi': ColoradoOutline, 'Missouri': ColoradoOutline, 'Montana': ColoradoOutline, 
    'Nebraska': ColoradoOutline, 'Nevada': ColoradoOutline, 'New Hampshire': ColoradoOutline, 'New Jersey': ColoradoOutline, 'New Mexico': ColoradoOutline, 
    'New York': ColoradoOutline, 'North Carolina': ColoradoOutline, 'North Dakota': ColoradoOutline, 'Ohio': ColoradoOutline, 'Oklahoma': ColoradoOutline, 
    'Oregon': ColoradoOutline, 'Rhode Island': ColoradoOutline, 'South Carolina': ColoradoOutline, 
    'South Dakota': ColoradoOutline, 'Tennessee': ColoradoOutline, 'Utah': ColoradoOutline, 'Vermont': ColoradoOutline, 
    'Virginia': ColoradoOutline, 'Washington': ColoradoOutline, 'West Virginia': ColoradoOutline, 'Wisconsin': ColoradoOutline, 'Wyoming': ColoradoOutline
};

