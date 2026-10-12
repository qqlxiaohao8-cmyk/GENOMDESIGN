import React from 'react';

const DOTS = [
  { l: '6%', t: '28%', s: 2, d: 15, delay: 0, o: 0.38, c: '#2c2c28' },
  { l: '12%', t: '62%', s: 1.4, d: 18, delay: -4, o: 0.26, c: '#6b5c4a' },
  { l: '18%', t: '18%', s: 2.6, d: 13, delay: -2, o: 0.22, c: '#2c2c28' },
  { l: '24%', t: '48%', s: 1.6, d: 17, delay: -7, o: 0.3, c: '#8a7a68' },
  { l: '31%', t: '34%', s: 2.2, d: 14, delay: -1, o: 0.28, c: '#2c2c28' },
  { l: '37%', t: '70%', s: 1.4, d: 19, delay: -9, o: 0.22, c: '#6b5c4a' },
  { l: '44%', t: '22%', s: 2.4, d: 16, delay: -3, o: 0.24, c: '#2c2c28' },
  { l: '51%', t: '56%', s: 1.5, d: 12, delay: -6, o: 0.32, c: '#8a7a68' },
  { l: '58%', t: '30%', s: 2.8, d: 20, delay: -8, o: 0.18, c: '#6b5c4a' },
  { l: '64%', t: '64%', s: 1.8, d: 15, delay: -2.5, o: 0.28, c: '#2c2c28' },
  { l: '71%', t: '16%', s: 1.4, d: 18, delay: -11, o: 0.3, c: '#2c2c28' },
  { l: '77%', t: '44%', s: 2.2, d: 14, delay: -5, o: 0.22, c: '#8a7a68' },
  { l: '83%', t: '72%', s: 1.6, d: 16, delay: -1.5, o: 0.28, c: '#6b5c4a' },
  { l: '89%', t: '26%', s: 2, d: 13, delay: -10, o: 0.24, c: '#2c2c28' },
  { l: '94%', t: '52%', s: 1.4, d: 19, delay: -4.5, o: 0.2, c: '#8a7a68' },
  { l: '9%', t: '80%', s: 1.5, d: 17, delay: -12, o: 0.22, c: '#2c2c28' },
  { l: '41%', t: '8%', s: 1.8, d: 15, delay: -6.5, o: 0.28, c: '#6b5c4a' },
  { l: '67%', t: '86%', s: 1.9, d: 21, delay: -3.5, o: 0.2, c: '#2c2c28' },
  { l: '28%', t: '8%', s: 1.4, d: 12, delay: -8.5, o: 0.26, c: '#8a7a68' },
  { l: '86%', t: '8%', s: 2.1, d: 18, delay: -0.8, o: 0.22, c: '#2c2c28' },
];

export default function PaperDustLayer() {
  return (
    <div className="paper-dust" aria-hidden>
      {DOTS.map((dot, i) => (
        <span
          key={i}
          className="paper-dust__dot"
          style={{
            left: dot.l,
            top: dot.t,
            width: dot.s,
            height: dot.s,
            background: dot.c,
            opacity: dot.o,
            animationDuration: `${dot.d}s`,
            animationDelay: `${dot.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
