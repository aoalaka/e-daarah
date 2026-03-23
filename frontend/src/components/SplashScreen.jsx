import { useState, useEffect } from 'react';
import './SplashScreen.css';

function SplashScreen({ onComplete }) {
  const [phase, setPhase] = useState('logo'); // logo → tagline → exit

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('tagline'), 600);
    const t2 = setTimeout(() => setPhase('exit'), 1800);
    const t3 = setTimeout(() => onComplete(), 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  return (
    <div className={`splash ${phase === 'exit' ? 'splash-exit' : ''}`}>
      <div className={`splash-content ${phase !== 'logo' ? 'splash-content-up' : ''}`}>
        <img
          src="/e-daarah-whitebg-logo.png"
          alt="E-Daarah"
          className={`splash-logo ${phase !== 'logo' ? 'splash-logo-visible' : ''}`}
        />
        <div className={`splash-tagline ${phase === 'tagline' ? 'splash-tagline-visible' : ''}`}>
          Madrasah Management, Simplified
        </div>
      </div>
    </div>
  );
}

export default SplashScreen;
