import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, Download, Landmark, Settings2, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { authenticatedApi } from '../../services/authenticatedApi';
import { extractApiError } from '../../services/publicApi';
import { downloadUrl } from '../../utils/downloadUrl';
import { ECUADOR_TIME_ZONE, currentPeriodEC } from '../../utils/dateFormat';

function normalizeBankCode(value) {
  return String(value || '').trim().toUpperCase();
}

async function fetchBankProfiles() {
  const response = await authenticatedApi.get('/configuracion/bankProfiles');
  return response.data?.data || [];
}

function PagosBancarios() {
  const initialPeriod = currentPeriodEC();
  const [anio, setAnio] = useState(initialPeriod.anio);
  const [mes, setMes] = useState(initialPeriod.mes);
  const [banco, setBanco] = useState('');
  const [precheck, setPrecheck] = useState(null);
  const [generatedFile, setGeneratedFile] = useState(null);
  const [loadingAction, setLoadingAction] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const bankProfilesQuery = useQuery({
    queryKey: ['pagos-bancarios', 'bankProfiles'],
    queryFn: fetchBankProfiles,
    retry: false,
  });

  const activeProfiles = useMemo(() => (
    (bankProfilesQuery.data || []).filter((profile) => profile.activo !== false)
  ), [bankProfilesQuery.data]);

  useEffect(() => {
    if (!banco && activeProfiles.length > 0) {
      setBanco(normalizeBankCode(activeProfiles[0].banco_codigo));
    }
  }, [activeProfiles, banco]);

  const selectedProfile = activeProfiles.find(
    (profile) => normalizeBankCode(profile.banco_codigo) === normalizeBankCode(banco)
  );
  const canOperate = Boolean(banco && anio && mes && !loadingAction);

  function resetOperationState() {
    setPrecheck(null);
    setGeneratedFile(null);
    setMessage('');
    setError('');
  }

  async function validarArchivoPago() {
    setLoadingAction('precheck');
    setMessage('');
    setError('');
    setGeneratedFile(null);
    try {
      const response = await authenticatedApi.post('/pagos/banco/precheck', {
        anio: Number(anio),
        mes: Number(mes),
        banco,
      });
      const nextPrecheck = response.data?.precheck;
      setPrecheck(nextPrecheck);
      if (nextPrecheck?.ready) {
        setMessage('Archivo de pago listo para generarse con el banco seleccionado.');
      } else {
        const failed = (nextPrecheck?.checks || []).filter((check) => !check.passed);
        setError(failed.map((check) => check.detail || check.label).join(' | ') || 'Hay validaciones pendientes antes de generar el archivo.');
      }
      return nextPrecheck;
    } catch (err) {
      setPrecheck(null);
      setError(extractApiError(err, 'No pudimos validar el archivo de pago.'));
      return null;
    } finally {
      setLoadingAction('');
    }
  }

  async function generarArchivoPago() {
    setLoadingAction('generate');
    setMessage('');
    setError('');
    setGeneratedFile(null);
    try {
      let currentPrecheck = precheck?.anio === Number(anio)
        && precheck?.mes === Number(mes)
        && normalizeBankCode(precheck?.banco) === normalizeBankCode(banco)
        ? precheck
        : null;
      if (!currentPrecheck) {
        const precheckResponse = await authenticatedApi.post('/pagos/banco/precheck', {
          anio: Number(anio),
          mes: Number(mes),
          banco,
        });
        currentPrecheck = precheckResponse.data?.precheck;
        setPrecheck(currentPrecheck);
      }
      if (!currentPrecheck?.ready) {
        const failed = (currentPrecheck?.checks || []).filter((check) => !check.passed);
        setError(failed.map((check) => check.detail || check.label).join(' | ') || 'Hay validaciones pendientes antes de generar el archivo.');
        return;
      }

      const response = await authenticatedApi.post('/pagos/banco', {
        anio: Number(anio),
        mes: Number(mes),
        banco,
      });
      const reporte = response.data?.reporte;
      setGeneratedFile(reporte);
      setMessage(`Archivo de pago generado: ${reporte?.totalEmpleados || 0} pagos por USD ${reporte?.totalPagos || 0}.`);
    } catch (err) {
      setError(extractApiError(err, 'No pudimos generar el archivo de pago.'));
    } finally {
      setLoadingAction('');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Pagos bancarios</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
          Genera el archivo bancario de pago de nomina desde roles cerrados o pagados, usando el banco y la homologacion configurada.
        </p>
      </div>

      {message && <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{message}</div>}
      {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{error}</div>}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <Landmark className="mt-1 h-5 w-5 text-teal-700" />
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Archivo de pago del periodo</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Selecciona el banco pagador, valida el periodo y descarga el plano bancario junto con el Excel de revision.
              </p>
            </div>
          </div>
          <Link
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:border-teal-300"
            to="/dashboard/configuracion/parametrizacion?seccion=banco"
          >
            <Settings2 className="h-4 w-4" />
            Configurar bancos
          </Link>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1.5fr)_120px_120px]">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Banco para generar archivo</span>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
              disabled={bankProfilesQuery.isLoading}
              value={banco}
              onChange={(event) => {
                setBanco(event.target.value);
                resetOperationState();
              }}
            >
              <option value="">{bankProfilesQuery.isLoading ? 'Cargando bancos...' : 'Seleccionar banco configurado...'}</option>
              {activeProfiles.map((profile) => (
                <option key={profile.id || profile.banco_codigo} value={normalizeBankCode(profile.banco_codigo)}>
                  {normalizeBankCode(profile.banco_codigo)} - {profile.banco_nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Anio</span>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
              type="number"
              value={anio}
              onChange={(event) => {
                setAnio(Number(event.target.value));
                resetOperationState();
              }}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Mes</span>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
              value={mes}
              onChange={(event) => {
                setMes(Number(event.target.value));
                resetOperationState();
              }}
            >
              {Array.from({ length: 12 }, (_, index) => (
                <option key={index + 1} value={index + 1}>{index + 1}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <p><strong>Banco operativo:</strong> {selectedProfile ? `${normalizeBankCode(selectedProfile.banco_codigo)} - ${selectedProfile.banco_nombre}` : 'sin seleccionar'}</p>
          <p className="mt-1 text-xs text-slate-500">Periodo inicial calculado en {ECUADOR_TIME_ZONE}.</p>
        </div>

        {activeProfiles.length === 0 && !bankProfilesQuery.isLoading && (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            No hay bancos activos configurados. Registra al menos un perfil bancario y su estructura antes de generar pagos.
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-teal-200 px-4 text-sm font-semibold text-teal-700 hover:border-teal-400 disabled:opacity-60"
            disabled={!canOperate}
            type="button"
            onClick={validarArchivoPago}
          >
            <ShieldCheck className="h-4 w-4" />
            {loadingAction === 'precheck' ? 'Validando...' : 'Validar archivo de pago'}
          </button>
          <button
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
            disabled={!canOperate}
            type="button"
            onClick={generarArchivoPago}
          >
            <Download className="h-4 w-4" />
            {loadingAction === 'generate' ? 'Generando...' : 'Generar archivo bancario'}
          </button>
        </div>
      </section>

      {precheck && (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Validacion previa</h2>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {precheck.checks.map((check) => (
              <div className={`flex items-start gap-3 rounded-md px-4 py-3 ${check.passed ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`} key={check.code}>
                {check.passed ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
                <div>
                  <p className="text-sm font-semibold">{check.label}</p>
                  {check.detail && <p className="mt-1 text-xs opacity-80">{check.detail}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {generatedFile && (
        <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-emerald-950">Archivo generado</h2>
          <p className="mt-2 text-sm text-emerald-800">
            {generatedFile.totalEmpleados} pagos por USD {generatedFile.totalPagos}
          </p>
          {generatedFile.checksum && <p className="mt-1 break-all text-xs text-emerald-800">Checksum: {generatedFile.checksum}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            {generatedFile.csvUrl && (
              <button
                className="inline-flex min-h-9 items-center gap-2 rounded-md bg-emerald-700 px-3 text-sm font-semibold text-white"
                type="button"
                onClick={() => downloadUrl(generatedFile.csvUrl, generatedFile.fileName || `archivo-banco-${anio}-${String(mes).padStart(2, '0')}.csv`)}
              >
                <Download className="h-4 w-4" />
                Descargar plano
              </button>
            )}
            {generatedFile.excelUrl && (
              <button
                className="inline-flex min-h-9 items-center gap-2 rounded-md border border-emerald-300 bg-white px-3 text-sm font-semibold text-emerald-800"
                type="button"
                onClick={() => downloadUrl(generatedFile.excelUrl, `revision-banco-${anio}-${String(mes).padStart(2, '0')}.xlsx`)}
              >
                <Download className="h-4 w-4" />
                Descargar Excel revision
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

export default PagosBancarios;
