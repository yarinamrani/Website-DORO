import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

function isShabbat(): boolean {
  const now = new Date();
  const day = now.getDay();
  const hours = now.getHours();
  // Friday after 16:00 until Saturday after 20:00
  if (day === 5 && hours >= 16) return true;
  if (day === 6 && hours < 20) return true;
  return false;
}

export default function ShabbatOverlay() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setShow(isShabbat());
  }, []);

  if (!show || dismissed) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 md:p-12 max-w-lg w-full text-center relative shadow-2xl">
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-4 left-4 bg-transparent border-none cursor-pointer text-text-secondary hover:text-text-primary"
        >
          <X size={24} />
        </button>

        <div className="text-6xl mb-4">🕯️</div>
        <h2 className="text-3xl font-black text-pink-primary mb-4">שבת שלום!</h2>
        <p className="text-text-secondary text-lg leading-relaxed mb-6">
          החנות שלנו סגורה לכבוד השבת.
          <br />
          נשמח לראות אתכם במוצאי שבת!
        </p>
        <div className="w-16 h-1 bg-pink-primary mx-auto rounded-full mb-6" />
        <p className="text-sm text-text-secondary">
          ניתן לגלוש ולהתרשם מהמוצרים שלנו
        </p>
        <button
          onClick={() => setDismissed(true)}
          className="mt-6 bg-pink-primary text-white border-none px-8 py-3 rounded-full font-bold text-base cursor-pointer hover:bg-pink-dark transition-colors"
        >
          המשך גלישה
        </button>
      </div>
    </div>
  );
}
