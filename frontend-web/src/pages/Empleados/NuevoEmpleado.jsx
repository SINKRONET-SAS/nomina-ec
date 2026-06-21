import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, FileUp, ShieldCheck } from 'lucide-react';
import { authenticatedApi } from '../../services/authenticatedApi';

const initialForm = {
  cedula: '',
  nombres: '',
  apellidos: '',
  cargo: '',
  departamento: '',
  unidad_organizativa_codigo: '',
  jornada_codigo: '',
  zona_marcacion_codigo: '',
  sueldo_bruto_mensual: '',
  jornada_horas_mensuales: '',
  gastos_personales_anuales: '',
  fecha_ingreso: '',
  tipo_contrato: 'indefinido',
  estado_civil: '',
  cargas_familiares: 0,
  direccion_domicilio: '',
  ciudad_domicilio: '',
  provincia_domicilio: '',
  telefono: '',
  email_personal: '',
  forma_pago: 'transferencia',
  banco: '',
  tipo_cuenta: '',
  cuenta_bancaria: '',
  region_decimo_cuarto: 'sierra_amazonia',
};

function normalizeEmpleado(empleado) {
  return {
    ...initialForm,
    cedula: empleado.cedula || '',
    nombres: empleado.nombres || '',
    apellidos: empleado.apellidos || '',
    cargo: empleado.cargo || '',
    departamento: empleado.departamento || '',
    unidad_organizativa_codigo: empleado.unidad_organizativa_codigo || '',
    jornada_codigo: empleado.jornada_codigo || '',
    zona_marcacion_codigo: empleado.zona_marcacion_codigo || '',
    sueldo_bruto_mensual: empleado.sueldo_bruto_mensual || '',
    jornada_horas_mensuales: empleado.jornada_horas_mensuales || '',
    gastos_personales_anuales: empleado.gastos_personales_anuales || '',
    fecha_ingreso: empleado.fecha_ingreso ? String(empleado.fecha_ingreso).slice(0, 10) : '',
    tipo_contrato: empleado.tipo_contrato || 'indefinido',
    estado_civil: empleado.estado_civil || '',
    cargas_familiares: empleado.cargas_familiares || 0,
    direccion_domicilio: empleado.direccion_domicilio || '',
    ciudad_domicilio: empleado.ciudad_domicilio || '',
    provincia_domicilio: empleado.provincia_domicilio || '',
    telefono: empleado.telefono || '',
    email_personal: empleado.email_personal || '',
    forma_pago: empleado.forma_pago || 'transferencia',
    banco: empleado.banco || '',
    tipo_cuenta: empleado.tipo_cuenta || '',
    cuenta_bancaria: '',
    region_decimo_cuarto: empleado.region_decimo_cuarto || 'sierra_amazonia',
  };
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function Field({ label, name, value, onChange, type = 'text', required = false, placeholder = '', children, disabled = false, min, step, maxLength }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}{required ? ' *' : ''}</span>
      {children || (
        <input
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
          disabled={disabled}
          maxLength={maxLength}
          min={min}
          name={name}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          step={step}
          type={type}
          value={value}
        />
      )}
    </label>
  );
}

function Section({ title, description, children }) {
  return (
    <section className="rounded-md border border-slate-200 p-4">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
        {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function NuevoEmpleado() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [formData, setFormData] = useState(initialForm);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [cargando, setCargando] = useState(false);
  const [uploading, setUploading] = useState(false);

  const empleadoQuery = useQuery({
    queryKey: ['empleado', id],
    enabled: isEdit,
    queryFn: async () => {
      const response = await authenticatedApi.get('/empleados/' + id);
      return response.data.empleado;
    },
  });

  const bankProfilesQuery = useQuery({
    queryKey: ['configuracion', 'bankProfiles'],
    queryFn: async () => {
      const response = await authenticatedApi.get('/configuracion/bankProfiles');
      return response.data.data || [];
    },
  });

  const activeBankProfiles = (bankProfilesQuery.data || []).filter((profile) => profile.activo !== false);

  const workShiftsQuery = useQuery({
    queryKey: ['configuracion', 'workShifts'],
    queryFn: async () => {
      const response = await authenticatedApi.get('/configuracion/workShifts');
      return response.data.data || [];
    },
  });
  const organizationUnitsQuery = useQuery({
    queryKey: ['configuracion', 'organizationUnits'],
    queryFn: async () => {
      const response = await authenticatedApi.get('/configuracion/organizationUnits');
      return response.data.data || [];
    },
  });
  const workZonesQuery = useQuery({
    queryKey: ['configuracion', 'workZones'],
    queryFn: async () => {
      const response = await authenticatedApi.get('/configuracion/workZones');
      return response.data.data || [];
    },
  });
  const activeWorkShifts = (workShiftsQuery.data || []).filter((item) => item.status !== 'inactivo');
  const activeOrganizationUnits = (organizationUnitsQuery.data || []).filter((item) => item.status !== 'inactivo');
  const activeWorkZones = (workZonesQuery.data || []).filter((item) => item.status !== 'inactivo');

  useEffect(() => {
    if (empleadoQuery.data) setFormData(normalizeEmpleado(empleadoQuery.data));
  }, [empleadoQuery.data]);

  useEffect(() => {
    if (empleadoQuery.isError) {
      setError(empleadoQuery.error?.response?.data?.message || empleadoQuery.error?.response?.data?.error || 'No pudimos cargar el empleado.');
    }
  }, [empleadoQuery.isError, empleadoQuery.error]);

  const handleChange = (event) => {
    setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const buildCreatePayload = () => ({
    cedula: formData.cedula,
    nombres: formData.nombres,
    apellidos: formData.apellidos,
    cargo: formData.cargo,
    departamento: formData.departamento,
    unidad_organizativa_codigo: formData.unidad_organizativa_codigo,
    jornada_codigo: formData.jornada_codigo,
    zona_marcacion_codigo: formData.zona_marcacion_codigo,
    sueldo_bruto_mensual: formData.sueldo_bruto_mensual,
    jornada_horas_mensuales: formData.jornada_horas_mensuales,
    gastos_personales_anuales: formData.gastos_personales_anuales,
    fecha_ingreso: formData.fecha_ingreso,
    tipo_contrato: formData.tipo_contrato,
    estado_civil: formData.estado_civil,
    cargas_familiares: Number(formData.cargas_familiares || 0),
    direccion: formData.direccion_domicilio,
    ciudad: formData.ciudad_domicilio,
    provincia: formData.provincia_domicilio,
    telefono: formData.telefono,
    email: formData.email_personal,
    forma_pago: formData.forma_pago,
    banco: formData.banco,
    tipo_cuenta: formData.tipo_cuenta,
    cuenta_bancaria: formData.cuenta_bancaria,
    region_decimo_cuarto: formData.region_decimo_cuarto,
  });

  const buildUpdatePayload = () => {
    const { cedula, ...payload } = formData;
    if (!payload.cuenta_bancaria) delete payload.cuenta_bancaria;
    payload.cargas_familiares = Number(payload.cargas_familiares || 0);
    return payload;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setCargando(true);

    try {
      if (isEdit) {
        await authenticatedApi.put('/empleados/' + id, buildUpdatePayload());
        setMessage('Ficha del trabajador actualizada.');
        setFormData((current) => ({ ...current, cuenta_bancaria: '' }));
      } else {
        const response = await authenticatedApi.post('/empleados', buildCreatePayload());
        const empleadoId = response.data.empleado?.id;
        if (empleadoId) {
          navigate('/dashboard/empleados/' + empleadoId + '/editar');
        } else {
          navigate('/dashboard/empleados');
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || (isEdit ? 'Error al actualizar empleado' : 'Error al crear empleado'));
    } finally {
      setCargando(false);
    }
  };

  const handleSignedContract = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !id) return;
    setError('');
    setMessage('');

    if (file.type !== 'application/pdf') {
      setError('Adjunta el contrato firmado en PDF.');
      return;
    }

    setUploading(true);
    try {
      const contenidoBase64 = await fileToBase64(file);
      await authenticatedApi.post('/documentos/adjuntar', {
        empleadoId: id,
        tipoDocumento: 'contrato',
        nombreArchivo: file.name,
        mimeType: file.type,
        contenidoBase64,
      });
      setMessage('Contrato firmado adjuntado a la ficha del trabajador.');
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'No pudimos adjuntar el contrato firmado.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-teal-700" type="button">
        <ArrowLeft size={20} className="mr-2" /> Volver
      </button>

      <div>
        <h1 className="text-2xl font-bold text-slate-950">{isEdit ? 'Editar ficha del trabajador' : 'Nuevo trabajador'}</h1>
        <p className="mt-2 text-sm text-slate-600">
          La cuenta bancaria registrada aqui pertenece al trabajador y se cifra como dato personal. La cuenta bancaria del cliente se configura por separado en Parametrizacion. Banco y parametros legales se guardan como codigos controlados.
        </p>
      </div>

      {message && <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>}
      {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-5 rounded-lg bg-white p-6 shadow">
        <Section title="Identificacion y contacto" description="Datos personales relevantes para la relacion laboral y comunicaciones.">
          <Field disabled={isEdit} label="Cedula" maxLength="10" name="cedula" onChange={handleChange} required value={formData.cedula} />
          <Field label="Nombres" name="nombres" onChange={handleChange} required value={formData.nombres} />
          <Field label="Apellidos" name="apellidos" onChange={handleChange} required value={formData.apellidos} />
          <Field label="Telefono" name="telefono" onChange={handleChange} value={formData.telefono} />
          <Field label="Correo personal" name="email_personal" onChange={handleChange} type="email" value={formData.email_personal} />
          <Field label="Estado civil" name="estado_civil" onChange={handleChange} value={formData.estado_civil}>
            <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" name="estado_civil" onChange={handleChange} value={formData.estado_civil}>
              <option value="">Seleccionar...</option>
              <option value="soltero">Soltero/a</option>
              <option value="casado">Casado/a</option>
              <option value="union_hecho">Union de hecho</option>
              <option value="divorciado">Divorciado/a</option>
              <option value="viudo">Viudo/a</option>
            </select>
          </Field>
          <Field label="Cargas familiares" min="0" name="cargas_familiares" onChange={handleChange} type="number" value={formData.cargas_familiares} />
        </Section>

        <Section title="Domicilio" description="Ubicacion declarada por el trabajador para documentos laborales y contacto.">
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-slate-700">Domicilio</span>
            <textarea className="mt-1 min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" name="direccion_domicilio" onChange={handleChange} value={formData.direccion_domicilio} />
          </label>
          <Field label="Ciudad" name="ciudad_domicilio" onChange={handleChange} value={formData.ciudad_domicilio} />
          <Field label="Provincia" name="provincia_domicilio" onChange={handleChange} value={formData.provincia_domicilio} />
        </Section>

        <Section title="Relacion laboral" description="Datos base para nomina, beneficios, contratos y reportes.">
          <Field label="Cargo" name="cargo" onChange={handleChange} value={formData.cargo} />
          <Field label="Departamento o unidad" name="departamento" onChange={handleChange} value={formData.departamento} />
          <Field label="Unidad organizativa" name="unidad_organizativa_codigo" onChange={handleChange} value={formData.unidad_organizativa_codigo}>
            <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" name="unidad_organizativa_codigo" onChange={handleChange} value={formData.unidad_organizativa_codigo}>
              <option value="">{organizationUnitsQuery.isLoading ? 'Cargando unidades...' : 'Seleccionar unidad parametrizada...'}</option>
              {activeOrganizationUnits.map((unit) => (
                <option key={unit.id || unit.code} value={unit.code}>{unit.code} - {unit.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Codigo de jornada" name="jornada_codigo" onChange={handleChange} required value={formData.jornada_codigo}>
            <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" name="jornada_codigo" onChange={handleChange} required value={formData.jornada_codigo}>
              <option value="">{workShiftsQuery.isLoading ? 'Cargando jornadas...' : 'Seleccionar jornada parametrizada...'}</option>
              {activeWorkShifts.map((shift) => (
                <option key={shift.id || shift.code} value={shift.code}>{shift.code} - {shift.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Zona de marcacion" name="zona_marcacion_codigo" onChange={handleChange} value={formData.zona_marcacion_codigo}>
            <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" name="zona_marcacion_codigo" onChange={handleChange} value={formData.zona_marcacion_codigo}>
              <option value="">{workZonesQuery.isLoading ? 'Cargando zonas...' : 'Seleccionar zona parametrizada...'}</option>
              {activeWorkZones.map((zone) => (
                <option key={zone.id || zone.code} value={zone.code}>{zone.code} - {zone.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Sueldo bruto" name="sueldo_bruto_mensual" onChange={handleChange} required step="0.01" type="number" value={formData.sueldo_bruto_mensual} />
          <Field label="Jornada mensual (horas)" min="1" name="jornada_horas_mensuales" onChange={handleChange} placeholder="240 por defecto" step="0.01" type="number" value={formData.jornada_horas_mensuales} />
          <Field label="Gastos personales anuales SRI" min="0" name="gastos_personales_anuales" onChange={handleChange} placeholder="0.00" step="0.01" type="number" value={formData.gastos_personales_anuales} />
          <Field label="Fecha de ingreso" name="fecha_ingreso" onChange={handleChange} required type="date" value={formData.fecha_ingreso} />
          <Field label="Tipo de contrato" name="tipo_contrato" onChange={handleChange} value={formData.tipo_contrato}>
            <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" name="tipo_contrato" onChange={handleChange} value={formData.tipo_contrato}>
              <option value="indefinido">Indefinido</option>
              <option value="ocasional">Ocasional</option>
              <option value="obra">Obra o faena</option>
              <option value="hora">Por hora</option>
            </select>
          </Field>
          <Field label="Region para decimo cuarto" name="region_decimo_cuarto" onChange={handleChange} required value={formData.region_decimo_cuarto}>
            <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" name="region_decimo_cuarto" onChange={handleChange} required value={formData.region_decimo_cuarto}>
              <option value="sierra_amazonia">Sierra / Amazonia</option>
              <option value="costa_galapagos">Costa / Galapagos</option>
            </select>
          </Field>
          <div className="md:col-span-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Este codigo enlaza la ficha con el parametro legal de decimo cuarto correspondiente. No se calcula por texto libre.
          </div>
        </Section>

        <Section title="Datos de pago del trabajador" description="Entidad y cuenta del trabajador. La entidad debe estar autorizada por la autoridad de control financiero aplicable.">
          <Field label="Forma de pago" name="forma_pago" onChange={handleChange} value={formData.forma_pago}>
            <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" name="forma_pago" onChange={handleChange} value={formData.forma_pago}>
              <option value="transferencia">Transferencia bancaria</option>
              <option value="cheque">Cheque</option>
              <option value="efectivo">Efectivo autorizado</option>
            </select>
          </Field>
          <Field label="Entidad bancaria o financiera del trabajador" name="banco" onChange={handleChange} required={formData.forma_pago === 'transferencia'} value={formData.banco}>
            <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" name="banco" onChange={handleChange} required={formData.forma_pago === 'transferencia'} value={formData.banco}>
              <option value="">{bankProfilesQuery.isLoading ? 'Cargando bancos...' : 'Seleccionar banco parametrizado...'}</option>
              {activeBankProfiles.map((profile) => (
                <option key={profile.id || profile.banco_codigo} value={profile.banco_codigo}>
                  {profile.banco_codigo} - {profile.banco_nombre}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tipo de cuenta" name="tipo_cuenta" onChange={handleChange} value={formData.tipo_cuenta}>
            <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" name="tipo_cuenta" onChange={handleChange} value={formData.tipo_cuenta}>
              <option value="">Seleccionar...</option>
              <option value="AHORROS">Ahorros</option>
              <option value="CORRIENTE">Corriente</option>
              <option value="VIRTUAL">Cuenta virtual</option>
              <option value="OTRA">Otra</option>
            </select>
          </Field>
          <Field label={isEdit ? 'Nueva cuenta del trabajador' : 'Numero de cuenta del trabajador'} name="cuenta_bancaria" onChange={handleChange} placeholder={isEdit ? 'Dejar vacio para conservar la actual' : ''} value={formData.cuenta_bancaria} />
          <div className="md:col-span-2 flex gap-3 rounded-md border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-950">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <p>Esta cuenta pertenece al trabajador y se guarda cifrada. El banco sale de perfiles bancarios y su homologacion de campos. No corresponde a la cuenta pagadora del cliente/empresa.</p>
          </div>
          {activeBankProfiles.length === 0 && (
            <div className="md:col-span-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              Configura al menos un perfil bancario en Parametrizacion antes de registrar cuentas por transferencia.
            </div>
          )}
        </Section>

        {isEdit && (
          <Section title="Gestion posterior" description="Despues de crear la ficha puedes adjuntar contrato firmado y registrar novedades de nomina.">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Contrato firmado en PDF</span>
              <input accept="application/pdf" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" disabled={uploading} onChange={handleSignedContract} type="file" />
            </label>
            <div className="flex flex-wrap items-end gap-3">
              <Link className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50" to="/dashboard/documentos/contratos"><FileUp className="h-4 w-4" />Ver contratos</Link>
              <Link className="inline-flex min-h-10 items-center rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50" to="/dashboard/nomina/beneficios">Beneficios y descuentos</Link>
              <Link className="inline-flex min-h-10 items-center rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50" to="/dashboard/asistencia/novedades">Novedades de asistencia</Link>
            </div>
          </Section>
        )}

        <div className="flex justify-end gap-4 pt-2">
          <button className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={() => navigate(-1)} type="button">Cancelar</button>
          <button className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50" disabled={cargando} type="submit">
            {cargando ? 'Guardando...' : isEdit ? 'Actualizar ficha' : 'Guardar trabajador'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default NuevoEmpleado;

