// SOLNIK — solnik-toon.js (CARTOON BODY, 2026-11-25)
// The same Solnik as the adopted portrait (solnik-character-v1.jpg): brass-and-
// bronze clockwork sprite, huge amber eyes, golden crystal heart, segmented
// limbs, ribbon cables — redrawn as a warm 2D cartoon and rigged procedurally.
// No image assets, no model files: one SVG, drawn in code, posed every frame by
// render(state). Identity is structural — the same builder draws every view,
// every expression and every clip, so the face can never drift between frames.
//
// Palette (town): ink #141210 · antique gold #C9A227 · dark bronze #6B5626 ·
// bone cream #E9DDC6 · amber #FFB52E.

const INK = '#141210';

// Mouth shapes: local coords centred on (0,0), drawn inside the head group.
// Open shapes are filled paths; line shapes are strokes (rendered by render()).
export const MOUTHS = {
  sil:   { d: 'M -8 0 Q 0 2.5 8 0', stroke: 2.6 },
  smile: { d: 'M -13 -2 Q 0 11 13 -2', stroke: 3.2 },
  grin:  { d: 'M -14 -3 Q 0 13 14 -3 Q 0 3 -14 -3 Z', fill: '#5a3410', teeth: true },
  PP:    { d: 'M -8 0.5 L 8 0.5', stroke: 3 },
  FF:    { d: 'M -9 -1 L 9 -1 L 7 3 L -7 3 Z', fill: '#E9DDC6' },
  TH:    { d: 'M -7 0 Q 0 4 7 0', stroke: 3 },
  DD:    { d: 'M -8 -2 Q 0 7 8 -2 Q 0 1 -8 -2 Z', fill: '#7a2e12' },
  kk:    { d: 'M -6 -1 Q 0 5 6 -1 Q 0 2 -6 -1 Z', fill: '#7a2e12' },
  CH:    { d: 'M -7 -2 Q 0 6 7 -2 Q 0 2 -7 -2 Z', fill: '#8a3a14' },
  SS:    { d: 'M -10 0 L 10 0', stroke: 2.4, teeth: true },
  nn:    { d: 'M -6 0 Q 0 3 6 0', stroke: 2.6 },
  RR:    { d: 'M -7 -1 Q 0 6 7 -1 Q 0 2 -7 -1 Z', fill: '#8a3a14' },
  aa:    { d: 'M -9 -6 Q 0 -9 9 -6 Q 12 4 6 9 Q 0 12 -6 9 Q -12 4 -9 -6 Z', fill: '#6e2a10' },
  E:     { d: 'M -12 -3 Q 0 -6 12 -3 Q 12 4 0 6 Q -12 4 -12 -3 Z', fill: '#7a2e12' },
  I:     { d: 'M -11 -1 Q 0 -3 11 -1 Q 11 2 0 3.4 Q -11 2 -11 -1 Z', fill: '#8a3a14' },
  O:     { d: 'M -6 -7 Q 0 -9.5 6 -7 Q 9 0 6 7 Q 0 9.5 -6 7 Q -9 0 -6 -7 Z', fill: '#5f2408' },
  U:     { d: 'M -4.5 -5 Q 0 -7 4.5 -5 Q 6.5 0 4.5 5 Q 0 7 -4.5 5 Q -6.5 0 -4.5 -5 Z', fill: '#5f2408' },
};
// speech band-map names used by the live module's viseme stepper
export const VISEMES = ['sil', 'PP', 'FF', 'TH', 'DD', 'kk', 'CH', 'SS', 'nn', 'RR', 'aa', 'E', 'I', 'O', 'U'];

function eye(cx, cy, r, pfx) {
  return `<g class="tn-eye" data-cx="${cx}" data-cy="${cy}">
    <circle cx="${cx}" cy="${cy}" r="${r + 3.5}" fill="#2a1e0c"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#tnAmber)"/>
    <circle class="tn-pupil" cx="${cx}" cy="${cy + 1}" r="${r * 0.46}" fill="#3a1c02"/>
    <circle class="tn-pupil" cx="${cx}" cy="${cy + 1}" r="${r * 0.2}" fill="#120a01"/>
    <circle cx="${cx - r * 0.34}" cy="${cy - r * 0.38}" r="${r * 0.21}" fill="#FFF6D8" opacity="0.95"/>
    <circle cx="${cx + r * 0.3}" cy="${cy + r * 0.34}" r="${r * 0.1}" fill="#FFE9A8" opacity="0.7"/>
  </g>`;
}

function leg(side, hipX, pfx, far) {
  const fill = far ? '#5d4718' : 'url(#tnBronze)';
  return `<g class="tn-leg" data-hip="${hipX}" transform="translate(${hipX} 196)">
    <path d="M -8 0 Q -9 16 -6 26 L 6 26 Q 9 16 8 0 Z" fill="${fill}" stroke="${INK}" stroke-width="2"/>
    <circle cx="0" cy="27" r="6.5" fill="#8A6D2F" stroke="${INK}" stroke-width="2"/>
    <g class="tn-shin" transform="translate(0 27)">
      <path d="M -6 0 Q -7 14 -5 24 L 5 24 Q 7 14 6 0 Z" fill="${fill}" stroke="${INK}" stroke-width="2"/>
      <path d="M -7 24 L 9 24 Q 13 24 12 29 Q 11 33 5 33 L -6 33 Q -10 33 -9.5 28.5 Q -9 24 -7 24 Z" fill="#3A2C12" stroke="${INK}" stroke-width="2"/>
      <path d="M -4 33 L -4 36 M 2 33 L 3 36" stroke="#3A2C12" stroke-width="2.4" stroke-linecap="round"/>
    </g></g>`;
}

function arm(side, shX, pfx, far) {
  // side: -1 left, +1 right. Shoulder pivot at (shX,138). Ribbon trails the wrist.
  const fill = far ? '#5d4718' : 'url(#tnBronze)';
  const rib = side < 0
    ? 'M 0 52 Q -16 84 -6 108 Q 1 124 -8 132'
    : 'M 0 52 Q 16 84 6 108 Q -1 124 8 132';
  return `<g class="tn-arm" transform="translate(${shX} 138)">
    <path d="M -7 -2 Q -9 14 -6 26 L 6 26 Q 9 14 7 -2 Z" fill="${fill}" stroke="${INK}" stroke-width="2"/>
    <circle cx="0" cy="27" r="6" fill="#8A6D2F" stroke="${INK}" stroke-width="2"/>
    <g class="tn-fore" transform="translate(0 27)">
      <path d="M -5.5 0 Q -6.5 13 -4.5 24 L 4.5 24 Q 6.5 13 5.5 0 Z" fill="${fill}" stroke="${INK}" stroke-width="2"/>
      <path class="tn-ribbon" d="${rib}" fill="none" stroke="#A8823A" stroke-width="5" stroke-linecap="round" opacity="0.9"/>
      <path class="tn-ribbon" d="${rib}" fill="none" stroke="#5d4718" stroke-width="1.4" stroke-linecap="round" opacity="0.8"/>
      <g class="tn-hand" transform="translate(0 26)">
        <circle cx="0" cy="2" r="6" fill="#8A6D2F" stroke="${INK}" stroke-width="2"/>
        <path d="M -5 5 Q -7 12 -4.5 14 M 0 7 Q 0 14 2 15.5 M 5 5 Q 7.5 11 5.5 14" fill="none" stroke="#3A2C12" stroke-width="2.6" stroke-linecap="round"/>
      </g>
    </g>
    <circle cx="0" cy="0" r="8.5" fill="#A8823A" stroke="${INK}" stroke-width="2"/>
  </g>`;
}

// Builds the character SVG. view: 'front' | 'tq' (three-quarter) | 'side'.
// One builder for every view = the identity cannot drift between views.
export function toonSVG(view = 'front', uid = 'a') {
  const side = view === 'side', tq = view === 'tq';
  const hx = side ? 14 : tq ? 9 : 0;           // head-content shift
  const eyeFar = side ? '' : `<g class="tn-eyeFar">${eye(84 + hx * 0.4, 74, side ? 0 : 19, uid)}</g>`;
  const eyeNear = eye(side ? 128 : 136 - hx * 0.2, 74, 19.5, uid);
  const browFar = side ? '' : `<path class="tn-browL" d="M 68 46 Q 84 39 100 45" fill="none" stroke="#3A2A0E" stroke-width="5" stroke-linecap="round"/>`;
  const browNear = `<path class="tn-browR" d="M ${side ? 112 : 120} 45 Q ${side ? 129 : 137} 38 ${side ? 146 : 154} 44" fill="none" stroke="#3A2A0E" stroke-width="5" stroke-linecap="round"/>`;
  return `<svg class="tn-svg" viewBox="0 0 220 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Solnik, the brass sprite of Provadia">
  <defs>
    <radialGradient id="tnBrass" cx="38%" cy="30%" r="80%">
      <stop offset="0%" stop-color="#F3D98B"/><stop offset="45%" stop-color="#C9A227"/><stop offset="100%" stop-color="#7A5C14"/>
    </radialGradient>
    <linearGradient id="tnBronze" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#9A7B33"/><stop offset="100%" stop-color="#4A3812"/>
    </linearGradient>
    <radialGradient id="tnAmber" cx="42%" cy="38%" r="75%">
      <stop offset="0%" stop-color="#FFE9A8"/><stop offset="55%" stop-color="#FFB52E"/><stop offset="100%" stop-color="#B96A00"/>
    </radialGradient>
    <radialGradient id="tnPortal" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFC95E" stop-opacity="0.95"/><stop offset="55%" stop-color="#C9A227" stop-opacity="0.45"/><stop offset="100%" stop-color="#C9A227" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="tnCrystal" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFF3B0"/><stop offset="55%" stop-color="#FFC21F"/><stop offset="100%" stop-color="#E07F00"/>
    </linearGradient>
  </defs>
  <g class="tn-flip"><ellipse class="tn-portal" cx="110" cy="243" rx="46" ry="11" fill="url(#tnPortal)" opacity="0"/><g class="tn-squash">
    <ellipse class="tn-shadow" cx="110" cy="250" rx="46" ry="6" fill="#000" opacity="0.28"/>
    ${leg(-1, 94, uid, side)}${leg(1, 126, uid, false)}
    <g class="tn-bodyG">
      <path d="M 110 118 Q 152 118 158 152 Q 163 186 146 202 Q 128 212 110 212 Q 92 212 74 202 Q 57 186 62 152 Q 68 118 110 118 Z" fill="url(#tnBronze)" stroke="${INK}" stroke-width="2.5"/>
      <path d="M 76 138 Q 110 126 144 138" fill="none" stroke="#2A1E0C" stroke-width="2" opacity="0.55"/>
      <ellipse cx="110" cy="182" rx="26" ry="18" fill="#3A2C12" opacity="0.5"/>
      <g class="tn-crystalG">
        <circle class="tn-crystalGlow" cx="110" cy="160" r="24" fill="#FFC21F" opacity="0.35"/>
        <path d="M 110 134 Q 128 146 128 162 Q 128 180 110 188 Q 92 180 92 162 Q 92 146 110 134 Z" fill="none" stroke="#C9A227" stroke-width="3"/>
        <path class="tn-crystal" d="M 110 140 L 122 154 L 116 176 L 110 182 L 104 176 L 98 154 Z" fill="url(#tnCrystal)" stroke="#8A5A00" stroke-width="1.6"/>
        <path d="M 110 140 L 104 176 M 110 140 L 116 176 M 98 154 L 122 154" stroke="#FFF3B0" stroke-width="1.1" opacity="0.8"/>
      </g>
      <circle cx="76" cy="128" r="2.2" fill="#2A1E0C"/><circle cx="144" cy="128" r="2.2" fill="#2A1E0C"/>
    </g>
    ${arm(-1, 64, uid, side)}${arm(1, 156, uid, false)}
    <g class="tn-headG">
      <path d="M 100 116 L 120 116 L 118 128 L 102 128 Z" fill="#6B5626" stroke="${INK}" stroke-width="2"/>
      <path d="M 99 121 L 121 121 M 100 125 L 120 125" stroke="#2A1E0C" stroke-width="1.6"/>
      <circle cx="110" cy="72" r="59" fill="url(#tnBrass)" stroke="${INK}" stroke-width="2.5"/>
      <path d="M 57 52 Q 110 12 163 52 Q 164 40 156 30 Q 110 2 64 30 Q 56 40 57 52 Z" fill="#8A6D2F" opacity="0.85"/>
      <path d="M 62 44 Q 110 10 158 44" fill="none" stroke="#5d4718" stroke-width="2.4"/>
      <circle cx="86" cy="27" r="5" fill="none" stroke="#5d4718" stroke-width="2"/>
      <circle cx="134" cy="27" r="5" fill="none" stroke="#5d4718" stroke-width="2"/>
      <circle cx="110" cy="20" r="6" fill="none" stroke="#5d4718" stroke-width="2"/>
      <circle cx="54" cy="74" r="9" fill="#8A6D2F" stroke="${INK}" stroke-width="2"/>
      <circle cx="54" cy="74" r="4" fill="#4A3812"/>
      <circle cx="166" cy="74" r="9" fill="#8A6D2F" stroke="${INK}" stroke-width="2"/>
      <circle cx="166" cy="74" r="4" fill="#4A3812"/>
      <ellipse cx="76" cy="102" rx="11" ry="6" fill="#FF9A3C" opacity="0.28"/>
      <ellipse cx="144" cy="102" rx="11" ry="6" fill="#FF9A3C" opacity="0.28"/>
      ${eyeFar}${eyeNear}
      ${browFar}${browNear}
      <path d="M 106 96 Q 110 100 114 96" fill="none" stroke="#7A5C14" stroke-width="2.2" stroke-linecap="round"/>
      <g class="tn-mouthG" transform="translate(110 112)"><path class="tn-mouth" d="M -8 0 Q 0 2.5 8 0" fill="none" stroke="#4A2E08" stroke-width="2.6" stroke-linecap="round"/><path class="tn-teeth" d="" fill="#FFF6D8"/></g>
    </g>
    <g class="tn-zzz" opacity="0"><text x="168" y="34" font-family="Georgia,serif" font-size="17" fill="#C9A227">Z</text><text x="180" y="20" font-family="Georgia,serif" font-size="12" fill="#C9A227">z</text></g>
    <g class="tn-burst"></g>
  </g></g></svg>`;
}

const D2R = Math.PI / 180;
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));

// Toon — one live cartoon Solnik. Attach to a host element; call render(state)
// every frame. All cartoon physics live here: squash-and-stretch, walk/run/
// climb cycles, gesture arms, blink/gaze face, viseme mouth, heart glow.
export class Toon {
  constructor(host, view = 'front') {
    host.innerHTML = toonSVG(view);
    this.svg = host.querySelector('svg');
    const q = (s) => this.svg.querySelector(s), qa = (s) => [...this.svg.querySelectorAll(s)];
    this.flip = q('.tn-flip'); this.squashG = q('.tn-squash');
    this.legs = qa('.tn-leg').map(g => ({ g, shin: g.querySelector('.tn-shin') }));
    this.arms = qa('.tn-arm').map(g => ({ g, fore: g.querySelector('.tn-fore') }));
    this.headG = q('.tn-headG'); this.bodyG = q('.tn-bodyG');
    this.eyes = qa('.tn-eye'); this.pupils = qa('.tn-pupil');
    this.browL = q('.tn-browL'); this.browR = q('.tn-browR');
    this.mouthG = q('.tn-mouthG'); this.mouth = q('.tn-mouth'); this.teeth = q('.tn-teeth');
    this.crystalGlow = q('.tn-crystalGlow'); this.crystal = q('.tn-crystal');
    this.zzz = q('.tn-zzz'); this.shadow = q('.tn-shadow'); this.portalEl = q('.tn-portal');
    this.burstG = q('.tn-burst');
    this.sparks = [];
    for (let i = 0; i < 12; i++) { const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); c.setAttribute('r', 2.6); c.setAttribute('fill', '#E4C65B'); c.setAttribute('opacity', 0); this.burstG.appendChild(c); this.sparks.push(c); }
    this.mouthName = '';
  }
  setMouth(name, open) {
    if (name !== this.mouthName) {
      const m = MOUTHS[name] || MOUTHS.sil;
      this.mouthName = name;
      this.mouth.setAttribute('d', m.d);
      if (m.fill) { this.mouth.setAttribute('fill', m.fill); this.mouth.setAttribute('stroke', 'none'); }
      else { this.mouth.setAttribute('fill', 'none'); this.mouth.setAttribute('stroke', '#4A2E08'); this.mouth.setAttribute('stroke-width', m.stroke || 2.6); }
      this.teeth.setAttribute('d', m.teeth ? 'M -11 -3.4 Q 0 -5.4 11 -3.4 L 10 -0.6 Q 0 -2.4 -10 -0.6 Z' : '');
    }
    this.mouthG.setAttribute('transform', `translate(110 ${112 + (1 - open) * 1.5}) scale(1 ${(0.3 + 0.85 * open).toFixed(3)})`);
  }
  render(s) {
    const t = s.t;
    // ---- facing: eased scaleX through zero reads as a cartoon spin-turn
    const fx = Math.abs(s.facing) < 0.14 ? (s.facing < 0 ? -0.14 : 0.14) : s.facing;
    // ---- squash & stretch
    let sy = 1, sx = 1;
    const loco = s.loco.mode;
    if (loco === 'idle') sy += Math.sin(t * 1.35) * 0.013;                       // breathe
    if (loco === 'walk') sy += Math.abs(Math.sin(s.loco.phase)) * 0.045;
    if (loco === 'run') sy += Math.abs(Math.sin(s.loco.phase)) * 0.06;
    if (loco === 'drop') { sy = 1.07; sx = 0.95; }                               // falling stretch
    if (loco === 'land') { const k = clampN(s.loco.landT / 0.23, 0, 1); sy = 1 - 0.17 * k; sx = 1 + 0.13 * k; } // landT counts DOWN from ~0.23 s at impact: full squash at impact, recovering to 0
    if (loco === 'sleep') sy += Math.sin(t * 0.9) * 0.02;
    if (s.gesture.name === 'chuckleBody') { const p = Math.abs(Math.sin(s.gesture.el * Math.PI / 350)); sy -= p * 0.05; sx += p * 0.04; }
    const bob = (s.bobPx || 0) + (loco === 'walk' ? Math.abs(Math.sin(s.loco.phase)) * 3.2 : loco === 'run' ? Math.abs(Math.sin(s.loco.phase)) * 4.6 : 0);
    // portal transit: he grows out of the doorway light (emerge) or is taken by it (enter)
    let es = 1;
    if (loco === 'emerge') { const k = s.loco.k == null ? 1 : s.loco.k; es = 0.22 + 0.78 * k; sy *= 1 + Math.sin(k * Math.PI) * 0.07; }
    if (loco === 'enter') { const k = s.loco.k == null ? 0 : s.loco.k; es = 1 - 0.8 * k; }
    sx *= es; sy *= es;
    const pv = s.portal || 0;
    this.portalEl.setAttribute('opacity', (pv * 0.92).toFixed(2));
    this.portalEl.setAttribute('rx', (38 + pv * 26).toFixed(0));
    this.flip.setAttribute('transform', `translate(110 0) scale(${fx.toFixed(3)} 1) translate(-110 0)`);
    this.squashG.setAttribute('transform', `translate(0 ${(-bob).toFixed(2)}) translate(110 246) scale(${sx.toFixed(3)} ${sy.toFixed(3)}) translate(-110 -246)`);
    const airK = clampN(1 - (s.airPx || 0) / 320, 0.12, 1);
    this.shadow.setAttribute('rx', (46 * airK).toFixed(1)); this.shadow.setAttribute('opacity', (0.28 * airK).toFixed(2));
    // ---- legs
    const ph = s.loco.phase;
    let hipL = 0, hipR = 0, kneeL = 3, kneeR = 3;
    if (loco === 'walk' || loco === 'run') {
      const A = loco === 'run' ? 46 : 27, K = loco === 'run' ? 58 : 36;
      hipL = Math.sin(ph) * A; hipR = Math.sin(ph + Math.PI) * A;
      kneeL = Math.max(0, Math.sin(ph - 2.0)) * K + 4; kneeR = Math.max(0, Math.sin(ph + Math.PI - 2.0)) * K + 4;
    } else if (loco === 'climb') {
      hipL = -30 + Math.sin(ph) * 22; hipR = -30 + Math.sin(ph + Math.PI) * 22;
      kneeL = 16 + Math.max(0, Math.sin(ph + 0.7)) * 40; kneeR = 16 + Math.max(0, Math.sin(ph + Math.PI + 0.7)) * 40;
    } else if (loco === 'drop') { hipL = -10; hipR = 10; kneeL = 42; kneeR = 42; }
    else if (loco === 'land') { kneeL = 20; kneeR = 20; hipL = -6; hipR = 6; }
    this.legs[0].g.setAttribute('transform', `translate(94 196) rotate(${hipL.toFixed(1)})`);
    this.legs[0].shin.setAttribute('transform', `translate(0 27) rotate(${kneeL.toFixed(1)})`);
    this.legs[1].g.setAttribute('transform', `translate(126 196) rotate(${hipR.toFixed(1)})`);
    this.legs[1].shin.setAttribute('transform', `translate(0 27) rotate(${kneeR.toFixed(1)})`);
    // ---- arms: locomotion swing, gesture overrides (local-right arm leads;
    // the flip mirrors it to his facing side)
    let shL = 6, shR = -6, elL = 8, elR = 8;
    if (loco === 'walk') { shL = Math.sin(ph + Math.PI) * 17; shR = Math.sin(ph) * 17; elL = elR = 12; }
    if (loco === 'run') { shL = Math.sin(ph + Math.PI) * 30; shR = Math.sin(ph) * 30; elL = elR = 26; }
    if (loco === 'climb') { shL = -148 + Math.sin(ph) * 34; shR = -148 + Math.sin(ph + Math.PI) * 34; elL = 14; elR = 14; }
    if (loco === 'drop') { shL = -128; shR = -152; elL = 8; elR = 8; }
    if (loco === 'sleep') { shL = 12; shR = -12; elL = 16; elR = 16; }
    const g = s.gesture;
    if (g.name === 'wave' || g.name === 'greet') { shR = -168 + Math.sin(t * 9.5) * 16; elR = 12; }
    if (g.name === 'point') { shR = -82; elR = 3; }
    if (g.name === 'cheer') { shL = -150; shR = -158; elL = 10; elR = 10; }
    if (g.name === 'grip') { shL = 26; shR = -26; elL = 30; elR = 30; }
    if (g.name === 'operate') { const press = Math.sin(g.el * Math.PI / 340); shR = -64 + press * 9; elR = 20 + press * 13; shL = 14; elL = 12; }
    if (g.name === 'touch') { shR = -60 - (g.el > 220 && g.el < 460 ? Math.sin((g.el - 220) / 240 * Math.PI) * 9 : 0); elR = 7; }
    if (g.name === 'inspect') { shR = -48; elR = 22; shL = 10; elL = 10; }
    if (g.name === 'listen') { shR = -18; elR = 20; }
    this.arms[0].g.setAttribute('transform', `translate(64 138) rotate(${shL.toFixed(1)})`);
    this.arms[0].fore.setAttribute('transform', `translate(0 27) rotate(${elL.toFixed(1)})`);
    this.arms[1].g.setAttribute('transform', `translate(156 138) rotate(${shR.toFixed(1)})`);
    this.arms[1].fore.setAttribute('transform', `translate(0 27) rotate(${elR.toFixed(1)})`);
    // ---- head: gaze + expression offsets composed in one write
    const lean = (loco === 'run' ? 4 : loco === 'climb' ? -5 : loco === 'drop' ? -3 : 0) + (g.name === 'operate' ? 3 : 0);
    this.headG.setAttribute('transform', `translate(${(s.head.yawPx || 0).toFixed(1)} ${((s.head.pitchPx || 0) + (g.name === 'inspect' ? 3.5 : 0)).toFixed(1)}) rotate(${((s.head.roll || 0) + lean * 0.4).toFixed(2)} 110 122)`);
    this.bodyG.setAttribute('transform', `rotate(${lean.toFixed(1)} 110 200)`);
    // ---- face
    for (const e of this.eyes) {
      const cx = +e.dataset.cx, cy = +e.dataset.cy;
      e.setAttribute('transform', `translate(${cx} ${cy}) scale(1 ${Math.max(0.05, s.face.eyeOpen).toFixed(3)}) translate(${-cx} ${-cy})`);
    }
    for (const p of this.pupils) p.setAttribute('transform', `translate(${(s.face.pupilX || 0).toFixed(1)} ${(s.face.pupilY || 0).toFixed(1)})`);
    if (this.browL) this.browL.setAttribute('transform', `translate(0 ${(-s.face.browL).toFixed(1)}) rotate(${(s.face.browAngL || 0).toFixed(1)} 84 44)`);
    if (this.browR) this.browR.setAttribute('transform', `translate(0 ${(-s.face.browR).toFixed(1)}) rotate(${(-(s.face.browAngR || 0)).toFixed(1)} 136 44)`);
    this.setMouth(s.face.mouth, s.face.mouthOpen);
    // ---- heart crystal
    const glow = clampN(s.crystal, 0, 1.6);
    this.crystalGlow.setAttribute('opacity', (0.12 + glow * 0.3).toFixed(2));
    this.crystalGlow.setAttribute('r', (21 + glow * 5 + Math.sin(t * 2.2) * 1.6).toFixed(1));
    // ---- sleep Z's
    if (s.zzz > 0) { const zp = (t * 0.45) % 1; this.zzz.setAttribute('opacity', (s.zzz * (1 - zp) * 0.95).toFixed(2)); this.zzz.setAttribute('transform', `translate(0 ${(-zp * 13).toFixed(1)})`); }
    else this.zzz.setAttribute('opacity', 0);
    // ---- materialise burst
    if (s.burstT >= 0 && s.burstT <= 1) {
      this.sparks.forEach((c, i) => { const a = i * (Math.PI * 2 / 12) + 0.4, r = 16 + 95 * s.burstT; c.setAttribute('cx', (110 + Math.cos(a) * r).toFixed(1)); c.setAttribute('cy', (150 + Math.sin(a) * r * 0.72).toFixed(1)); c.setAttribute('opacity', (0.95 * (1 - s.burstT)).toFixed(2)); });
    } else if (this.sparks[0].getAttribute('opacity') !== '0') this.sparks.forEach(c => c.setAttribute('opacity', 0));
  }
}
