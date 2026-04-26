// Anatomical zones in body image SVG coordinate space (viewBox 0 0 1471 1069)
// Layout L→R: vasen sivu (50-370) | takakuva center x≈540 (390-730) | etukuva center x≈840 (760-1100) | oikea sivu (1110-1430)
export const KEHON_VYÖHYKKEET = [
  // ── Etukuva (kolmas hahmo, center x≈840) ───────────────────────────────
  { id: 'paa-e',      nimi: 'Pää',             puoli: 'Edestä', cx:  840, cy:  88 },
  { id: 'kaula-e',    nimi: 'Kaula',           puoli: 'Edestä', cx:  840, cy: 152 },
  { id: 'olka-o-e',   nimi: 'Oikea olkapää',   puoli: 'Edestä', cx:  730, cy: 210 },
  { id: 'olka-v-e',   nimi: 'Vasen olkapää',   puoli: 'Edestä', cx:  950, cy: 210 },
  { id: 'kasiv-o-e',  nimi: 'Oikea käsivarsi', puoli: 'Edestä', cx:  676, cy: 330 },
  { id: 'kasiv-v-e',  nimi: 'Vasen käsivarsi', puoli: 'Edestä', cx: 1004, cy: 330 },
  { id: 'rinta-e',    nimi: 'Rintakehä',       puoli: 'Edestä', cx:  840, cy: 272 },
  { id: 'vatsa-e',    nimi: 'Vatsa',           puoli: 'Edestä', cx:  840, cy: 390 },
  { id: 'lonkka-o-e', nimi: 'Oikea lonkka',    puoli: 'Edestä', cx:  766, cy: 496 },
  { id: 'lonkka-v-e', nimi: 'Vasen lonkka',    puoli: 'Edestä', cx:  914, cy: 496 },
  { id: 'reisi-o-e',  nimi: 'Oikea reisi',     puoli: 'Edestä', cx:  766, cy: 602 },
  { id: 'reisi-v-e',  nimi: 'Vasen reisi',     puoli: 'Edestä', cx:  914, cy: 602 },
  { id: 'polvi-o-e',  nimi: 'Oikea polvi',     puoli: 'Edestä', cx:  766, cy: 706 },
  { id: 'polvi-v-e',  nimi: 'Vasen polvi',     puoli: 'Edestä', cx:  914, cy: 706 },
  { id: 'saari-o-e',  nimi: 'Oikea sääri',     puoli: 'Edestä', cx:  766, cy: 796 },
  { id: 'saari-v-e',  nimi: 'Vasen sääri',     puoli: 'Edestä', cx:  914, cy: 796 },

  // ── Takakuva (toinen hahmo, center x≈540) ──────────────────────────────
  { id: 'paa-t',      nimi: 'Pää',             puoli: 'Takaa',  cx:  540, cy:  88 },
  { id: 'niska-t',    nimi: 'Niska',           puoli: 'Takaa',  cx:  540, cy: 152 },
  { id: 'harj-o-t',   nimi: 'Oikea hartia',    puoli: 'Takaa',  cx:  430, cy: 210 },
  { id: 'harj-v-t',   nimi: 'Vasen hartia',    puoli: 'Takaa',  cx:  650, cy: 210 },
  { id: 'ylaselka-t', nimi: 'Yläselkä',        puoli: 'Takaa',  cx:  540, cy: 272 },
  { id: 'kessel-t',   nimi: 'Keskiselkä',      puoli: 'Takaa',  cx:  540, cy: 354 },
  { id: 'alasel-t',   nimi: 'Alaselkä',        puoli: 'Takaa',  cx:  540, cy: 440 },
  { id: 'pak-o-t',    nimi: 'Oikea pakara',    puoli: 'Takaa',  cx:  454, cy: 516 },
  { id: 'pak-v-t',    nimi: 'Vasen pakara',    puoli: 'Takaa',  cx:  626, cy: 516 },
  { id: 'reisi-o-t',  nimi: 'Oikea reisi',     puoli: 'Takaa',  cx:  454, cy: 612 },
  { id: 'reisi-v-t',  nimi: 'Vasen reisi',     puoli: 'Takaa',  cx:  626, cy: 612 },
  { id: 'polvi-o-t',  nimi: 'Oikea polvi',     puoli: 'Takaa',  cx:  454, cy: 706 },
  { id: 'polvi-v-t',  nimi: 'Vasen polvi',     puoli: 'Takaa',  cx:  626, cy: 706 },
  { id: 'pohje-o-t',  nimi: 'Oikea pohje',     puoli: 'Takaa',  cx:  454, cy: 796 },
  { id: 'pohje-v-t',  nimi: 'Vasen pohje',     puoli: 'Takaa',  cx:  626, cy: 796 },
]
