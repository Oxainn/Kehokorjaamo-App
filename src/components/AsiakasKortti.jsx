import { useAsiakkaanSairaudet } from '../hooks/useAsiakkaanSairaudet'

function laskeIka(syntymaaika) {
  if (!syntymaaika) return null
  const diff = Date.now() - new Date(syntymaaika).getTime()
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000))
}

function muotoilePvm(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('fi-FI')
}

function onkoTyhja(arvo) {
  const tulos = arvo === null || arvo === undefined || String(arvo).trim() === ''
  console.log('onkoTyhja:', JSON.stringify(arvo), '→', tulos)
  return tulos
}

function KipuPalkki({ arvo }) {
  if (arvo === null || arvo === undefined) return null
  const prosentti = Math.min(Math.max((arvo / 10) * 100, 0), 100)
  const vari = arvo <= 3 ? 'bg-green-500' : arvo <= 6 ? 'bg-orange-400' : 'bg-red-500'
  return (
    <div className="flex items-center gap-3 mt-1">
      <div className="bg-gray-200 rounded h-2 flex-1">
        <div className={`${vari} h-2 rounded transition-all`} style={{ width: `${prosentti}%` }} />
      </div>
      <span className="text-sm font-semibold text-gray-700 w-8 text-right">{arvo}/10</span>
    </div>
  )
}

function Osio({ otsikko, children }) {
  return (
    <div className="border-t border-gray-100 pt-4 pb-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-2">{otsikko}</h3>
      {children}
    </div>
  )
}

export default function AsiakasKortti({ asiakas, onMuokkaa }) {
  const { sairaudet, kontraindikaatiot, lataa: sairaudetLataa } =
    useAsiakkaanSairaudet(asiakas?.id ?? null)

  console.log('AsiakasKortti propsit:', asiakas)

  if (!asiakas) return null

  const ika     = laskeIka(asiakas.syntymaaika)
  const osoite  = [asiakas.lahiosoite, asiakas.postinumero, asiakas.postitoimipaikka]
    .filter(Boolean).join(', ')
  const kontraIdt = new Set(kontraindikaatiot.map(k => k.id))

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">

      {/* ── HEADER ────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">{asiakas.nimi}</h1>
          {(ika !== null || asiakas.ammatti) && (
            <p className="text-sm text-gray-500 mt-0.5">
              {[ika !== null ? `${ika} v.` : null, asiakas.ammatti].filter(Boolean).join(' · ')}
            </p>
          )}
          <div className="flex flex-col gap-0.5 mt-2">
            {!onkoTyhja(asiakas.puhelin) && (
              <a href={`tel:${asiakas.puhelin}`} className="text-sm text-emerald-700 hover:underline">
                📞 {asiakas.puhelin}
              </a>
            )}
            {!onkoTyhja(asiakas.sahkoposti) && (
              <a href={`mailto:${asiakas.sahkoposti}`} className="text-sm text-emerald-700 hover:underline">
                ✉ {asiakas.sahkoposti}
              </a>
            )}
            {!onkoTyhja(osoite) && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(osoite)}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-emerald-700 hover:underline"
              >
                📍 {osoite}
              </a>
            )}
          </div>
        </div>

        {onMuokkaa && (
          <button
            onClick={onMuokkaa}
            className="flex-shrink-0 px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
          >
            Muokkaa
          </button>
        )}
      </div>

      {/* ── HOITOON TULON SYY + KIPU ──────────────────────────── */}
      {(!onkoTyhja(asiakas.hoitoon_syy) || asiakas.kipu_taso !== null) && (
        <Osio otsikko="Hoitoon tulon syy">
          {!onkoTyhja(asiakas.hoitoon_syy) && (
            <p className="text-sm text-gray-700 mb-2">{asiakas.hoitoon_syy}</p>
          )}
          {asiakas.kipu_taso !== null && asiakas.kipu_taso !== undefined && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Kipu nyt</p>
              <KipuPalkki arvo={asiakas.kipu_taso} />
            </div>
          )}
        </Osio>
      )}

      {/* ── SAIRAUDET ─────────────────────────────────────────── */}
      {sairaudetLataa ? (
        <Osio otsikko="Sairaudet">
          <p className="text-sm text-gray-400">Ladataan...</p>
        </Osio>
      ) : sairaudet.length > 0 && (
        <Osio otsikko="Sairaudet">
          <ul className="flex flex-col gap-1">
            {sairaudet.map(s => {
              const onKontra = kontraIdt.has(s.id)
              const nimi     = s.sairaus_tyyppi?.nimi ?? s.nimi ?? '—'
              const tarkenne = s.tarkenne
              return (
                <li key={s.id} className="text-sm text-gray-700 flex gap-2">
                  <span>{onKontra ? '⚠' : '•'}</span>
                  <span className={onKontra ? 'font-medium text-amber-800' : ''}>
                    {nimi}{!onkoTyhja(tarkenne) ? ` — ${tarkenne}` : ''}
                  </span>
                </li>
              )
            })}
          </ul>
        </Osio>
      )}

      {/* ── LÄÄKITYS ──────────────────────────────────────────── */}
      {!onkoTyhja(asiakas.laakitys) && (
        <Osio otsikko="Lääkitys">
          <p className="text-sm text-gray-700">{asiakas.laakitys}</p>
        </Osio>
      )}

      {/* ── HARRASTUKSET ──────────────────────────────────────── */}
      {!onkoTyhja(asiakas.harrastukset) && (
        <Osio otsikko="Harrastukset">
          <p className="text-sm text-gray-700">{asiakas.harrastukset}</p>
        </Osio>
      )}

      {/* ── VAMMAT JA HUOMIOITAVAT ────────────────────────────── */}
      {!onkoTyhja(asiakas.vammat_huomiot) && (
        <Osio otsikko="Vammat ja huomioitavat">
          <p className="text-sm text-gray-700">{asiakas.vammat_huomiot}</p>
        </Osio>
      )}

      {/* ── DIAGNOSOIDUT SAIRAUDET ────────────────────────────── */}
      {!onkoTyhja(asiakas.diagnosoidut_sairaudet) && (
        <Osio otsikko="Diagnosoidut sairaudet">
          <p className="text-sm text-gray-700">{asiakas.diagnosoidut_sairaudet}</p>
        </Osio>
      )}

      {/* ── KEHONKARTTA ───────────────────────────────────────── */}
      {!onkoTyhja(asiakas.kehonkartta_kuva_url) && (
        <Osio otsikko="Kehonkartta">
          <img
            src={asiakas.kehonkartta_kuva_url}
            alt="Kehonkartta"
            className="rounded-lg border border-gray-200 max-w-full"
          />
        </Osio>
      )}

      {/* ── HOITOHISTORIA ─────────────────────────────────────── */}
      <Osio otsikko="Hoitohistoria">
        <p className="text-sm text-gray-400 italic">Ei vielä hoitokäyntejä</p>
      </Osio>

      {/* ── META ──────────────────────────────────────────────── */}
      <div className="border-t border-gray-100 pt-3 mt-2 flex flex-col gap-0.5">
        {asiakas.luotu && (
          <p className="text-xs text-gray-400">Lisätty: {muotoilePvm(asiakas.luotu)}</p>
        )}
        {!onkoTyhja(asiakas.miten_loysi) && (
          <p className="text-xs text-gray-400">Miten löysi: {asiakas.miten_loysi}</p>
        )}
      </div>

    </div>
  )
}
