export default function LoyaltyBanner() {
  return (
    <section id="loyalty" className="max-w-7xl mx-auto px-4 py-14">
      <div className="bg-gradient-to-l from-pink-primary to-pink-dark rounded-3xl p-8 md:p-14 text-white relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-0 left-0 w-40 h-40 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-56 h-56 bg-white/10 rounded-full translate-x-1/3 translate-y-1/3" />
        <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-white/5 rounded-full" />

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1 text-center md:text-right">
            <h2 className="text-3xl md:text-4xl font-black mb-3">
              מועדון DORO
            </h2>
            <p className="text-base md:text-lg text-white/90 mb-6 max-w-lg font-light leading-relaxed">
              הצטרפו למועדון וקבלו 10% הנחה על הקנייה הראשונה, גישה למבצעים בלעדיים והפתעות ליום ההולדת!
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto md:mx-0">
              <input
                type="email"
                placeholder="הזינו את האימייל שלכם"
                className="flex-1 px-6 py-3.5 rounded-full text-text-primary border-none outline-none text-sm"
                dir="rtl"
              />
              <button className="bg-white text-pink-primary border-none px-8 py-3.5 rounded-full font-bold cursor-pointer hover:bg-pink-light transition-colors text-sm whitespace-nowrap">
                הצטרפו עכשיו
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
