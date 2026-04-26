// Anatomical zones in body image SVG coordinate space (viewBox 0 0 1471 1069)
// Layout L→R: vasen sivu (50-370) | takakuva center x≈520 (390-730) | etukuva center x≈880 (760-1100) | oikea sivu (1110-1430)
export const KEHON_VYÖHYKKEET = [
  // ── Etukuva (kolmas hahmo, center x≈880) ───────────────────────────────
  { id: 'paa-e',      nimi: 'Pää',             puoli: 'Edestä', cx:  880, cy:  88 },
  { id: 'kaula-e',    nimi: 'Kaula',           puoli: 'Edestä', cx:  880, cy: 152 },
  { id: 'olka-o-e',   nimi: 'Oikea olkapää',   puoli: 'Edestä', cx:  770, cy: 210 },
  { id: 'olka-v-e',   nimi: 'Vasen olkapää',   puoli: 'Edestä', cx:  990, cy: 210 },
  { id: 'kasiv-o-e',  nimi: 'Oikea käsivarsi', puoli: 'Edestä', cx:  716, cy: 330 },
  { id: 'kasiv-v-e',  nimi: 'Vasen käsivarsi', puoli: 'Edestä', cx: 1044, cy: 330 },
  { id: 'rinta-e',    nimi: 'Rintakehä',       puoli: 'Edestä', cx:  880, cy: 272 },
  { id: 'vatsa-e',    nimi: 'Vatsa',           puoli: 'Edestä', cx:  880, cy: 390 },
  { id: 'lonkka-o-e', nimi: 'Oikea lonkka',    puoli: 'Edestä', cx:  806, cy: 496 },
  { id: 'lonkka-v-e', nimi: 'Vasen lonkka',    puoli: 'Edestä', cx:  954, cy: 496 },
  { id: 'reisi-o-e',  nimi: 'Oikea reisi',     puoli: 'Edestä', cx:  806, cy: 602 },
  { id: 'reisi-v-e',  nimi: 'Vasen reisi',     puoli: 'Edestä', cx:  954, cy: 602 },
  { id: 'polvi-o-e',  nimi: 'Oikea polvi',     puoli: 'Edestä', cx:  806, cy: 706 },
  { id: 'polvi-v-e',  nimi: 'Vasen polvi',     puoli: 'Edestä', cx:  954, cy: 706 },
  { id: 'saari-o-e',  nimi: 'Oikea sääri',     puoli: 'Edestä', cx:  806, cy: 796 },
  { id: 'saari-v-e',  nimi: 'Vasen sääri',     puoli: 'Edestä', cx:  954, cy: 796 },

  // ── Takakuva (toinen hahmo, center x≈520) ──────────────────────────────
  { id: 'paa-t',      nimi: 'Pää',             puoli: 'Takaa',  cx:  520, cy:  88 },
  { id: 'niska-t',    nimi: 'Niska',           puoli: 'Takaa',  cx:  520, cy: 152 },
  { id: 'harj-o-t',   nimi: 'Oikea hartia',    puoli: 'Takaa',  cx:  410, cy: 210 },
  { id: 'harj-v-t',   nimi: 'Vasen hartia',    puoli: 'Takaa',  cx:  630, cy: 210 },
  { id: 'ylaselka-t', nimi: 'Yläselkä',        puoli: 'Takaa',  cx:  520, cy: 272 },
  { id: 'kessel-t',   nimi: 'Keskiselkä',      puoli: 'Takaa',  cx:  520, cy: 354 },
  { id: 'alasel-t',   nimi: 'Alaselkä',        puoli: 'Takaa',  cx:  520, cy: 440 },
  { id: 'pak-o-t',    nimi: 'Oikea pakara',    puoli: 'Takaa',  cx:  434, cy: 516 },
  { id: 'pak-v-t',    nimi: 'Vasen pakara',    puoli: 'Takaa',  cx:  606, cy: 516 },
  { id: 'reisi-o-t',  nimi: 'Oikea reisi',     puoli: 'Takaa',  cx:  434, cy: 612 },
  { id: 'reisi-v-t',  nimi: 'Vasen reisi',     puoli: 'Takaa',  cx:  606, cy: 612 },
  { id: 'polvi-o-t',  nimi: 'Oikea polvi',     puoli: 'Takaa',  cx:  434, cy: 706 },
  { id: 'polvi-v-t',  nimi: 'Vasen polvi',     puoli: 'Takaa',  cx:  606, cy: 706 },
  { id: 'pohje-o-t',  nimi: 'Oikea pohje',     puoli: 'Takaa',  cx:  434, cy: 796 },
  { id: 'pohje-v-t',  nimi: 'Vasen pohje',     puoli: 'Takaa',  cx:  606, cy: 796 },
]
