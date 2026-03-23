import { useState, useEffect } from 'react';
import './SplashScreen.css';

function SplashScreen({ onComplete }) {
  const [phase, setPhase] = useState('logo'); // logo → name → tagline → exit

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('name'), 500);
    const t2 = setTimeout(() => setPhase('tagline'), 1200);
    const t3 = setTimeout(() => setPhase('exit'), 3200);
    const t4 = setTimeout(() => onComplete(), 3600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onComplete]);

  const showName = phase === 'name' || phase === 'tagline' || phase === 'exit';
  const showTagline = phase === 'tagline' || phase === 'exit';

  return (
    <div className={`splash ${phase === 'exit' ? 'splash-exit' : ''}`}>
      <div className={`splash-content ${showName ? 'splash-content-up' : ''}`}>
        <img
          src="/e-daarah-whitebg-logo.png"
          alt="E-Daarah"
          className="splash-logo"
        />
        <div className={`splash-name ${showName ? 'splash-name-visible' : ''}`}>
          E-Daarah
        </div>
        <div className={`splash-tagline ${showTagline ? 'splash-tagline-visible' : ''}`}>
          Your madrasah, in your pocket
        </div>
      </div>
    </div>
  );
}

export default SplashScreen;
