export default function MuscleLibrary() {
  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-800">Lihaskirjasto</h2>
        <p className="mt-1 text-gray-500 text-sm">
          Tietopankki lihaksista, niiden toiminnasta ja hoitomenetelmistä.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow border border-gray-100 p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-100 mb-4">
          <span className="text-2xl">💪</span>
        </div>
        <h3 className="text-lg font-medium text-gray-700 mb-2">Lihaskirjasto tulossa</h3>
        <p className="text-sm text-gray-400">
          Lihaskirjasto sisältää kattavan tietokannan lihaksista,
          anatomiasta, yleisimmistä vaivoista ja hoitomenetelmistä.
        </p>
      </div>
    </section>
  )
}
