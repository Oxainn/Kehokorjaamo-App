export default function BodyMap() {
  return (
    <section className="flex flex-col items-center gap-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-800">Kehokartta</h2>
        <p className="mt-1 text-gray-500 text-sm">
          Valitse kehon alue nähdäksesi kohdistettuja hoito-ohjeita.
        </p>
      </div>

      <div className="w-full max-w-sm bg-white rounded-2xl shadow p-8 flex flex-col items-center gap-4 border border-gray-100">
        <div className="w-32 h-64 rounded-xl bg-brand-100 border-2 border-brand-500 flex items-center justify-center text-brand-600 text-sm font-medium">
          Kehokartta tulossa
        </div>
        <p className="text-xs text-gray-400 text-center">
          Interaktiivinen kehokartta lisätään myöhemmässä versiossa.
        </p>
      </div>
    </section>
  )
}
