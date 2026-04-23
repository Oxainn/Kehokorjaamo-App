export default function Aftercare() {
  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-800">Jälkihoito</h2>
        <p className="mt-1 text-gray-500 text-sm">
          Ohjeet hoidon jälkeiseen palautumiseen ja omatoimiseen huoltoon.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow border border-gray-100 p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-100 mb-4">
          <span className="text-2xl">🌿</span>
        </div>
        <h3 className="text-lg font-medium text-gray-700 mb-2">Jälkihoito-ohjeet tulossa</h3>
        <p className="text-sm text-gray-400">
          Jälkihoito-osio tarjoaa räätälöityjä ohjeita venyttelyyn,
          lämpö- ja kylmähoitoihin sekä arkipäivän ergonomiaan.
        </p>
      </div>
    </section>
  )
}
