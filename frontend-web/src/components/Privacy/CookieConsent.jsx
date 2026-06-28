import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const CONSENT_KEY = 'sknomina_cookie_consent_v2026_06';

function readConsent() {
  try {
    return JSON.parse(localStorage.getItem(CONSENT_KEY) || 'null');
  } catch (err) {
    console.error('No se pudo leer consentimiento local de cookies.', {
      code: 'COOKIE_CONSENT_READ_FAILED',
      message: err?.message,
    });
    return null;
  }
}

function writeConsent(analytics) {
  const payload = {
    version: 'LOPDP-2026-06',
    analytics,
    acceptedAt: new Date().toISOString(),
  };
  localStorage.setItem(CONSENT_KEY, JSON.stringify(payload));
  window.dispatchEvent(new CustomEvent('nomina-cookie-consent', { detail: payload }));
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!readConsent());
  }, []);

  const accept = (analytics) => {
    writeConsent(analytics);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <section className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white shadow-2xl">
      <div className="page-container flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-slate-950">Privacidad y cookies</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Usamos cookies necesarias para operar la sesión y, solo con autorización, medición no esencial.
            No activamos analítica ni cacheamos datos personales de nómina sin consentimiento.
          </p>
          <Link className="mt-2 inline-flex text-sm font-semibold text-teal-800" to="/privacidad">
            Ver política de privacidad
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="secondary-button" type="button" onClick={() => accept(false)}>
            Solo necesarias
          </button>
          <button className="primary-button" type="button" onClick={() => accept(true)}>
            Permitir medición
          </button>
        </div>
      </div>
    </section>
  );
}
