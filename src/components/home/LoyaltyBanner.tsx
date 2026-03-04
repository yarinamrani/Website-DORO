export default function LoyaltyBanner() {
  return (
    <section className="max-w-7xl mx-auto px-4 py-12">
      <div className="bg-gradient-to-l from-pink-primary to-pink-dark rounded-3xl p-8 md:p-12 text-white text-center relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-48 h-48 bg-white/10 rounded-full translate-x-1/3 translate-y-1/3" />

        <div className="relative z-10">
          <h2 className="text-3xl md:text-4xl font-black mb-4">
            💎 מועדון הלקוחות של DORO
          </h2>
          <p className="text-lg text-white/90 mb-8 max-w-xl mx-auto font-light">
            הצטרפו למועדון וקבלו 10% הנחה על הקנייה הראשונה, גישה למבצעים בלעדיים והפתעות ליום ההולדת!
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
            <input
              type="email"
              placeholder="הזינו את האימייל שלכם"
              className="flex-1 px-6 py-3 rounded-full text-text-primary border-none outline-none text-sm"
              dir="rtl"
            />
            <button className="bg-white text-pink-primary border-none px-8 py-3 rounded-full font-bold cursor-pointer hover:bg-pink-light transition-colors text-sm whitespace-nowrap">
              הצטרפו עכשיו
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
