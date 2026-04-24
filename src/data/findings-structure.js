export const KIRJAUSRAKENNE = [
  {
    id: 'lantio',
    nimi: 'Lantio',
    mittaus: 'Suoliluuharjanne (iliac crest)',
    prioriteetti: 1,
    tyyppi: 'primaari',
    kirjaukset: [
      { id: 'kallistus', nimi: 'Kallistunut alaspäin',
        vaihtoehdot: ['oikea', 'vasen'] },
      { id: 'kierto', nimi: 'Kiertynyt',
        vaihtoehdot: ['oikea-eteen', 'oikea-taakse',
                      'vasen-eteen', 'vasen-taakse'] }
    ]
  },
  {
    id: 'si-nivel',
    nimi: 'SI-nivel',
    mittaus: 'Fleksiotesti, peukalot SI-nivelissä',
    prioriteetti: 2,
    tyyppi: 'primaari',
    kirjaukset: [
      { id: 'lukkiutunut', nimi: 'Lukkiutunut',
        vaihtoehdot: ['oikea', 'vasen'] }
    ]
  },
  {
    id: 'polvi',
    nimi: 'Polvi',
    mittaus: 'Polvilumpion yläpuolelta',
    prioriteetti: 3,
    tyyppi: 'lantio-seuraus',
    kirjaukset: [
      { id: 'korkeus', nimi: 'Alempana',
        vaihtoehdot: ['oikea', 'vasen'] },
      { id: 'kierto', nimi: 'Kiertynyt',
        vaihtoehdot: ['oikea-sisään', 'oikea-ulospäin',
                      'vasen-sisään', 'vasen-ulospäin'] }
    ]
  },
  {
    id: 'nilkka',
    nimi: 'Nilkka',
    mittaus: 'Sisäkehräsluu',
    prioriteetti: 4,
    tyyppi: 'lantio-seuraus',
    kirjaukset: [
      { id: 'korkeus', nimi: 'Alempana',
        vaihtoehdot: ['oikea', 'vasen'] }
    ]
  },
  {
    id: 'jalkaktera',
    nimi: 'Jalkaterä',
    mittaus: 'Kantaluu',
    prioriteetti: 5,
    tyyppi: 'lantio-seuraus',
    kirjaukset: [
      { id: 'kierto', nimi: 'Kiertynyt',
        vaihtoehdot: ['oikea-sisään', 'oikea-ulospäin',
                      'vasen-sisään', 'vasen-ulospäin'] }
    ]
  },
  {
    id: 'hartiat',
    nimi: 'Hartiat / yläselkä',
    mittaus: 'Olkalisäke (akromion)',
    prioriteetti: 6,
    tyyppi: 'selkaranka-seuraus',
    kirjaukset: [
      { id: 'kallistus', nimi: 'Kallistunut alaspäin',
        vaihtoehdot: ['oikea', 'vasen'] },
      { id: 'kierto', nimi: 'Kiertynyt',
        vaihtoehdot: ['oikea-eteen', 'oikea-taakse',
                      'vasen-eteen', 'vasen-taakse'] }
    ]
  },
  {
    id: 'paa',
    nimi: 'Pää / niska',
    mittaus: 'Korvalehden nipukka + leuankärki',
    prioriteetti: 7,
    tyyppi: 'selkaranka-seuraus',
    kirjaukset: [
      { id: 'kallistus', nimi: 'Kallistunut alaspäin',
        vaihtoehdot: ['oikea', 'vasen'] },
      { id: 'kierto', nimi: 'Kiertynyt',
        vaihtoehdot: ['oikea', 'vasen'] }
    ]
  },
  {
    id: 'selkaranka',
    nimi: 'Selkäranka',
    mittaus: 'Visuaalinen arviointi',
    prioriteetti: 8,
    tyyppi: 'selkaranka-seuraus',
    kirjaukset: [
      { id: 'skolioosi', nimi: 'Skolioosi',
        vaihtoehdot: ['C-oikea', 'C-vasen',
                      'S-oikea', 'S-vasen'] }
    ]
  }
]
