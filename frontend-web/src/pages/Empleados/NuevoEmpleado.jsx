import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, FileUp, ShieldCheck } from 'lucide-react';
import { authenticatedApi } from '../../services/authenticatedApi';

const initialForm = {
  cedula: '',
  nombres: '',
  apellidos: '',
  fecha_nacimiento: '',
  position_id: '',
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
  iess_afiliado: true,
  iess_tipo_relacion: 'relacion_dependencia',
  estado_civil: '',
  cargas_familiares: 0,
  direccion_domicilio: '',
  provincia_codigo: '',
  ciudad_codigo: '',
  ciudad_domicilio: '',
  provincia_domicilio: '',
  telefono: '',
  email_personal: '',
  forma_pago: 'transferencia',
  banco: '',
  tipo_cuenta: '',
  cuenta_bancaria: '',
  region_decimo_cuarto: 'sierra_amazonia',
  modalidad_fondo_reserva: 'mensual',
  whatsapp_consent: false,
  dependientes: [],
};

const MIN_EMPLOYEE_AGE = 18;
const OLDER_ADULT_AGE = 65;

function calculateAge(fechaNacimiento) {
  if (!fechaNacimiento) return null;
  const birthDate = new Date(`${fechaNacimiento}T00:00:00`);
  if (Number.isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDelta = today.getMonth() - birthDate.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) age -= 1;
  return age;
}

const emptyDependent = () => ({
  nombres: '',
  apellidos: '',
  identificacion: '',
  parentesco: 'hijo',
  fecha_nacimiento: '',
  discapacidad: false,
  porcentaje_discapacidad: '',
  documento_base64: '',
  documento_nombre: '',
  documento_mime_type: '',
});

function normalizeEmpleado(empleado) {
  return {
    ...initialForm,
    cedula: empleado.cedula || '',
    nombres: empleado.nombres || '',
    apellidos: empleado.apellidos || '',
    fecha_nacimiento: empleado.fecha_nacimiento ? String(empleado.fecha_nacimiento).slice(0, 10) : '',
    position_id: empleado.position_id || '',
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
    iess_afiliado: empleado.iess_afiliado !== false,
    iess_tipo_relacion: empleado.iess_tipo_relacion || 'relacion_dependencia',
    estado_civil: empleado.estado_civil || '',
    cargas_familiares: empleado.cargas_familiares || 0,
    direccion_domicilio: empleado.direccion_domicilio || '',
    provincia_codigo: empleado.provincia_codigo || '',
    ciudad_codigo: empleado.ciudad_codigo || '',
    ciudad_domicilio: empleado.ciudad_domicilio || '',
    provincia_domicilio: empleado.provincia_domicilio || '',
    telefono: empleado.telefono || '',
    email_personal: empleado.email_personal || '',
    forma_pago: empleado.forma_pago || 'transferencia',
    banco: empleado.banco || '',
    tipo_cuenta: empleado.tipo_cuenta || '',
    cuenta_bancaria: '',
    region_decimo_cuarto: empleado.region_decimo_cuarto || 'sierra_amazonia',
    modalidad_fondo_reserva: empleado.modalidad_fondo_reserva || 'mensual',
    whatsapp_consent: Boolean(empleado.whatsapp_consent_at),
    dependientes: (empleado.dependientes || []).map((dependent) => ({
      nombres: dependent.nombres || '',
      apellidos: dependent.apellidos || '',
      identificacion: dependent.identificacion || '',
      parentesco: dependent.parentesco || 'hijo',
      fecha_nacimiento: dependent.fecha_nacimiento ? String(dependent.fecha_nacimiento).slice(0, 10) : '',
      discapacidad: Boolean(dependent.discapacidad),
      porcentaje_discapacidad: dependent.porcentaje_discapacidad || '',
      documento_base64: '',
      documento_nombre: dependent.documento_url ? 'Documento cargado' : '',
      documento_mime_type: '',
    })),
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

const CONTROL_CLASS = 'form-control';
const FILE_CONTROL_CLASS = 'form-file';
const TEXTAREA_CLASS = 'form-textarea';
const FIELD_HALF = 'form-field-half';
const FIELD_THIRD = 'form-field-third';
const FIELD_FULL = 'form-field-full';

function Field({ label, name, value, onChange, type = 'text', required = false, placeholder = '', children, disabled = false, min, step, maxLength, className = FIELD_HALF }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-medium text-slate-700">{label}{required ? ' *' : ''}</span>
      {children || (
        <input
          className={CONTROL_CLASS}
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
    <section className="form-section">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
        {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
      </div>
      <div className="form-grid">{children}</div>
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
  const jobPositionsQuery = useQuery({
    queryKey: ['configuracion', 'jobPositions'],
    queryFn: async () => {
      const response = await authenticatedApi.get('/configuracion/jobPositions');
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
  const activeJobPositions = (jobPositionsQuery.data || []).filter((item) => item.status === 'activo');
  const activeWorkZones = (workZonesQuery.data || []).filter((item) => item.status !== 'inactivo');
  const provincesQuery = useQuery({
    queryKey: ['catalogos', 'ecuador', 'provincias'],
    queryFn: async () => {
      const response = await authenticatedApi.get('/catalogos/ecuador/provincias');
      return response.data.data || [];
    },
  });
  const citiesQuery = useQuery({
    queryKey: ['catalogos', 'ecuador', 'ciudades', formData.provincia_codigo],
    enabled: Boolean(formData.provincia_codigo),
    queryFn: async () => {
      const response = await authenticatedApi.get('/catalogos/ecuador/ciudades', {
        params: { provinceCode: formData.provincia_codigo },
      });
      return response.data.data || [];
    },
  });
  const provinces = provincesQuery.data || [];
  const cities = citiesQuery.data || [];
  const employeeAge = calculateAge(formData.fecha_nacimiento);
  const isMinor = employeeAge !== null && employeeAge < MIN_EMPLOYEE_AGE;
  const isOlderAdult = employeeAge !== null && employeeAge >= OLDER_ADULT_AGE;
  const selectedOrganizationUnit = activeOrganizationUnits.find((unit) => unit.code === formData.unidad_organizativa_codigo);
  const availableJobPositions = activeJobPositions.filter((position) => (
    !selectedOrganizationUnit || position.organization_unit_id === selectedOrganizationUnit.id
  ));
  const selectedJobPosition = activeJobPositions.find((position) => position.id === formData.position_id);
  const salaryNumber = Number(formData.sueldo_bruto_mensual || 0);
  const selectedSalaryMin = Number(selectedJobPosition?.salary_min || 0);
  const selectedSalaryMax = Number(selectedJobPosition?.salary_max || 0);
  const salaryOutOfRange = selectedJobPosition
    && salaryNumber > 0
    && (salaryNumber < selectedSalaryMin || salaryNumber > selectedSalaryMax);

  useEffect(() => {
    if (empleadoQuery.data) setFormData(normalizeEmpleado(empleadoQuery.data));
  }, [empleadoQuery.data]);

  useEffect(() => {
    if (empleadoQuery.isError) {
      setError(empleadoQuery.error?.response?.data?.message || empleadoQuery.error?.response?.data?.error || 'No pudimos cargar el empleado.');
    }
  }, [empleadoQuery.isError, empleadoQuery.error]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => {
      if (name === 'unidad_organizativa_codigo') {
        const nextUnit = activeOrganizationUnits.find((unit) => unit.code === value);
        const currentPosition = activeJobPositions.find((position) => position.id === current.position_id);
        const keepPosition = currentPosition && nextUnit && currentPosition.organization_unit_id === nextUnit.id;
        return {
          ...current,
          unidad_organizativa_codigo: value,
          position_id: keepPosition ? current.position_id : '',
          cargo: keepPosition ? current.cargo : '',
        };
      }
      if (name !== 'cargas_familiares') return { ...current, [name]: value };
      const count = Math.max(0, Number(value || 0));
      const dependientes = [...current.dependientes];
      while (dependientes.length < count) dependientes.push(emptyDependent());
      return { ...current, cargas_familiares: count, dependientes: dependientes.slice(0, count) };
    });
  };

  const handlePositionChange = (event) => {
    const positionId = event.target.value;
    const position = activeJobPositions.find((item) => item.id === positionId);
    const unit = activeOrganizationUnits.find((item) => item.id === position?.organization_unit_id);
    setFormData((current) => ({
      ...current,
      position_id: positionId,
      cargo: position?.name || '',
      unidad_organizativa_codigo: unit?.code || current.unidad_organizativa_codigo,
      departamento: current.departamento || unit?.name || '',
    }));
  };

  const handleDependentChange = (index, field, value) => {
    setFormData((current) => ({
      ...current,
      dependientes: current.dependientes.map((dependent, currentIndex) => (
        currentIndex === index ? { ...dependent, [field]: value } : dependent
      )),
    }));
  };

  const handleDependentFile = async (index, file) => {
    if (!file) return;
    const contenidoBase64 = await fileToBase64(file);
    setFormData((current) => ({
      ...current,
      dependientes: current.dependientes.map((dependent, currentIndex) => (
        currentIndex === index
          ? {
              ...dependent,
              documento_base64: contenidoBase64,
              documento_nombre: file.name,
              documento_mime_type: file.type,
            }
          : dependent
      )),
    }));
  };

  const buildCreatePayload = () => ({
    cedula: formData.cedula,
    nombres: formData.nombres,
    apellidos: formData.apellidos,
    fecha_nacimiento: formData.fecha_nacimiento,
    position_id: formData.position_id,
    cargo: formData.cargo,
    departamento: formData.departamento,
    unidad_organizativa_codigo: formData.unidad_organizativa_codigo,
    jornada_codigo: formData.jornada_codigo,
    zona_marcacion_codigo: formData.zona_marcacion_codigo,
    sueldo_bruto_mensual: formData.sueldo_bruto_mensual,
    gastos_personales_anuales: formData.gastos_personales_anuales,
    fecha_ingreso: formData.fecha_ingreso,
    tipo_contrato: formData.tipo_contrato,
    iess_afiliado: Boolean(formData.iess_afiliado),
    iess_tipo_relacion: formData.iess_tipo_relacion,
    estado_civil: formData.estado_civil,
    cargas_familiares: Number(formData.cargas_familiares || 0),
    direccion: formData.direccion_domicilio,
    provincia_codigo: formData.provincia_codigo,
    ciudad_codigo: formData.ciudad_codigo,
    telefono: formData.telefono,
    email: formData.email_personal,
    forma_pago: formData.forma_pago,
    banco: formData.banco,
    tipo_cuenta: formData.tipo_cuenta,
    cuenta_bancaria: formData.cuenta_bancaria,
    region_decimo_cuarto: formData.region_decimo_cuarto,
    modalidad_fondo_reserva: formData.modalidad_fondo_reserva,
    whatsapp_consent: Boolean(formData.whatsapp_consent),
    dependientes: formData.dependientes,
  });

  const buildUpdatePayload = () => {
    const { cedula, ...payload } = formData;
    if (!payload.cuenta_bancaria) delete payload.cuenta_bancaria;
    delete payload.jornada_horas_mensuales;
    payload.whatsapp_consent = Boolean(payload.whatsapp_consent);
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

      <form onSubmit={handleSubmit} className="max-w-7xl space-y-5 rounded-lg bg-white p-5 shadow sm:p-6">
        <Section title="Identificacion y contacto" description="Datos personales relevantes para la relacion laboral y comunicaciones.">
          <Field className={FIELD_THIRD} disabled={isEdit} label="Cedula" maxLength="10" name="cedula" onChange={handleChange} required value={formData.cedula} />
          <Field className={FIELD_THIRD} label="Nombres" name="nombres" onChange={handleChange} required value={formData.nombres} />
          <Field className={FIELD_THIRD} label="Apellidos" name="apellidos" onChange={handleChange} required value={formData.apellidos} />
          <Field className={FIELD_THIRD} label="Fecha de nacimiento" name="fecha_nacimiento" onChange={handleChange} required type="date" value={formData.fecha_nacimiento} />
          <div className="md:col-span-1 lg:col-span-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            Edad calculada: <strong>{employeeAge === null ? 'pendiente' : `${employeeAge} anios`}</strong>
          </div>
          <Field className={FIELD_THIRD} label="Telefono" name="telefono" onChange={handleChange} value={formData.telefono} />
          <Field className={FIELD_HALF} label="Correo personal" name="email_personal" onChange={handleChange} type="email" value={formData.email_personal} />
          <Field className={FIELD_THIRD} label="Estado civil" name="estado_civil" onChange={handleChange} value={formData.estado_civil}>
            <select className={CONTROL_CLASS} name="estado_civil" onChange={handleChange} value={formData.estado_civil}>
              <option value="">Seleccionar...</option>
              <option value="soltero">Soltero/a</option>
              <option value="casado">Casado/a</option>
              <option value="union_hecho">Union de hecho</option>
              <option value="divorciado">Divorciado/a</option>
              <option value="viudo">Viudo/a</option>
            </select>
          </Field>
          <Field className={FIELD_THIRD} label="Cargas familiares" min="0" name="cargas_familiares" onChange={handleChange} type="number" value={formData.cargas_familiares} />
          {isMinor && (
            <div className={`${FIELD_FULL} rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800`}>
              Este flujo bloquea contratacion de menores de edad. Requiere modulo especial de autorizaciones antes de registrar una ficha laboral.
            </div>
          )}
          {isOlderAdult && (
            <div className={`${FIELD_FULL} rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950`}>
              Trabajador adulto mayor: revisar beneficios, retenciones e implicaciones de impuesto a la renta aplicables.
            </div>
          )}
        </Section>

        {Number(formData.cargas_familiares || 0) > 0 && (
          <Section title="Cargas familiares" description="Registra los datos y documentos de soporte para efectos laborales y de impuesto a la renta.">
            <div className={`${FIELD_FULL} space-y-4`}>
              {formData.dependientes.map((dependent, index) => (
                <div className="grid grid-cols-1 gap-3 rounded-md border border-slate-200 p-4 md:grid-cols-2 lg:grid-cols-12" key={index}>
                  <h3 className={FIELD_FULL + ' text-sm font-semibold text-slate-900'}>Carga familiar {index + 1}</h3>
                  <Field className="lg:col-span-4" label="Nombres" name={`dependiente-${index}-nombres`} onChange={(event) => handleDependentChange(index, 'nombres', event.target.value)} required value={dependent.nombres} />
                  <Field className="lg:col-span-4" label="Apellidos" name={`dependiente-${index}-apellidos`} onChange={(event) => handleDependentChange(index, 'apellidos', event.target.value)} value={dependent.apellidos} />
                  <Field className="lg:col-span-4" label="Identificacion" name={`dependiente-${index}-identificacion`} onChange={(event) => handleDependentChange(index, 'identificacion', event.target.value)} value={dependent.identificacion} />
                  <Field className="lg:col-span-4" label="Parentesco" name={`dependiente-${index}-parentesco`} onChange={(event) => handleDependentChange(index, 'parentesco', event.target.value)} value={dependent.parentesco}>
                    <select className={CONTROL_CLASS} onChange={(event) => handleDependentChange(index, 'parentesco', event.target.value)} value={dependent.parentesco}>
                      <option value="hijo">Hijo/a</option>
                      <option value="conyuge">Conyuge</option>
                      <option value="union_hecho">Pareja en union de hecho</option>
                      <option value="padre_madre">Padre/Madre</option>
                      <option value="otro">Otro permitido</option>
                    </select>
                  </Field>
                  <Field className="lg:col-span-4" label="Fecha de nacimiento" name={`dependiente-${index}-fecha`} onChange={(event) => handleDependentChange(index, 'fecha_nacimiento', event.target.value)} type="date" value={dependent.fecha_nacimiento} />
                  <label className="flex h-10 items-center gap-2 self-end rounded-md border border-slate-200 px-3 text-sm text-slate-700 lg:col-span-4">
                    <input checked={dependent.discapacidad} onChange={(event) => handleDependentChange(index, 'discapacidad', event.target.checked)} type="checkbox" />
                    Discapacidad
                  </label>
                  {dependent.discapacidad && (
                    <Field className="lg:col-span-4" label="Porcentaje discapacidad" min="0" name={`dependiente-${index}-porcentaje`} onChange={(event) => handleDependentChange(index, 'porcentaje_discapacidad', event.target.value)} step="0.01" type="number" value={dependent.porcentaje_discapacidad} />
                  )}
                  <label className={`block ${FIELD_FULL}`}>
                    <span className="text-sm font-medium text-slate-700">Documento legal de soporte</span>
                    <input accept="application/pdf,image/jpeg,image/png" className={FILE_CONTROL_CLASS} onChange={(event) => handleDependentFile(index, event.target.files?.[0])} type="file" />
                    {dependent.documento_nombre && <p className="mt-1 text-xs text-slate-500">{dependent.documento_nombre}</p>}
                  </label>
                </div>
              ))}
            </div>
          </Section>
        )}

        <Section title="Domicilio" description="Ubicacion declarada por el trabajador para documentos laborales y contacto.">
          <label className={`block ${FIELD_FULL}`}>
            <span className="text-sm font-medium text-slate-700">Domicilio</span>
            <textarea className={TEXTAREA_CLASS} name="direccion_domicilio" onChange={handleChange} value={formData.direccion_domicilio} />
          </label>
          <Field label="Provincia" name="provincia_codigo" onChange={(event) => setFormData((current) => ({ ...current, provincia_codigo: event.target.value, ciudad_codigo: '' }))} required value={formData.provincia_codigo}>
            <select className={CONTROL_CLASS} name="provincia_codigo" onChange={(event) => setFormData((current) => ({ ...current, provincia_codigo: event.target.value, ciudad_codigo: '' }))} required value={formData.provincia_codigo}>
              <option value="">{provincesQuery.isLoading ? 'Cargando provincias...' : 'Seleccionar provincia...'}</option>
              {provinces.map((province) => (
                <option key={province.code} value={province.code}>{province.code} - {province.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Ciudad / canton" name="ciudad_codigo" onChange={handleChange} required value={formData.ciudad_codigo}>
            <select className={CONTROL_CLASS} disabled={!formData.provincia_codigo} name="ciudad_codigo" onChange={handleChange} required value={formData.ciudad_codigo}>
              <option value="">{citiesQuery.isLoading ? 'Cargando ciudades...' : 'Seleccionar ciudad...'}</option>
              {cities.map((city) => (
                <option key={city.code} value={city.code}>{city.code} - {city.name}</option>
              ))}
            </select>
          </Field>
        </Section>

        <Section title="Relacion laboral" description="Datos base para nomina, beneficios, contratos y reportes.">
          <Field label="Departamento o unidad" name="departamento" onChange={handleChange} value={formData.departamento} />
          <Field label="Unidad organizativa" name="unidad_organizativa_codigo" onChange={handleChange} value={formData.unidad_organizativa_codigo}>
            <select className={CONTROL_CLASS} name="unidad_organizativa_codigo" onChange={handleChange} value={formData.unidad_organizativa_codigo}>
              <option value="">{organizationUnitsQuery.isLoading ? 'Cargando unidades...' : 'Seleccionar unidad parametrizada...'}</option>
              {activeOrganizationUnits.map((unit) => (
                <option key={unit.id || unit.code} value={unit.code}>{unit.code} - {unit.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Cargo o puesto" name="position_id" onChange={handlePositionChange} required value={formData.position_id}>
            <select className={CONTROL_CLASS} name="position_id" onChange={handlePositionChange} required value={formData.position_id}>
              <option value="">{jobPositionsQuery.isLoading ? 'Cargando cargos...' : 'Seleccionar cargo parametrizado...'}</option>
              {availableJobPositions.map((position) => (
                <option key={position.id} value={position.id}>
                  {position.code} - {position.name} ({position.currency || 'USD'} {Number(position.salary_min || 0).toFixed(2)} a {Number(position.salary_max || 0).toFixed(2)})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Codigo de jornada" name="jornada_codigo" onChange={handleChange} required value={formData.jornada_codigo}>
            <select className={CONTROL_CLASS} name="jornada_codigo" onChange={handleChange} required value={formData.jornada_codigo}>
              <option value="">{workShiftsQuery.isLoading ? 'Cargando jornadas...' : 'Seleccionar jornada parametrizada...'}</option>
              {activeWorkShifts.map((shift) => (
                <option key={shift.id || shift.code} value={shift.code}>{shift.code} - {shift.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Zona de marcacion" name="zona_marcacion_codigo" onChange={handleChange} value={formData.zona_marcacion_codigo}>
            <select className={CONTROL_CLASS} name="zona_marcacion_codigo" onChange={handleChange} value={formData.zona_marcacion_codigo}>
              <option value="">{workZonesQuery.isLoading ? 'Cargando zonas...' : 'Seleccionar zona parametrizada...'}</option>
              {activeWorkZones.map((zone) => (
                <option key={zone.id || zone.code} value={zone.code}>{zone.code} - {zone.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Sueldo bruto" name="sueldo_bruto_mensual" onChange={handleChange} required step="0.01" type="number" value={formData.sueldo_bruto_mensual} />
          {selectedJobPosition && (
            <div className={`${FIELD_FULL} rounded-md border ${salaryOutOfRange ? 'border-red-200 bg-red-50 text-red-800' : 'border-teal-100 bg-teal-50 text-teal-950'} px-4 py-3 text-sm`}>
              Rango del cargo seleccionado: {selectedJobPosition.currency || 'USD'} {selectedSalaryMin.toFixed(2)} a {selectedSalaryMax.toFixed(2)}.
              {salaryOutOfRange ? ' Ajusta el sueldo o selecciona otro cargo.' : ''}
            </div>
          )}
          {activeJobPositions.length === 0 && (
            <div className={`${FIELD_FULL} rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800`}>
              Configura cargos y rangos salariales en Parametrizacion antes de crear trabajadores.
            </div>
          )}
          <Field label="Gastos personales anuales SRI" min="0" name="gastos_personales_anuales" onChange={handleChange} placeholder="0.00" step="0.01" type="number" value={formData.gastos_personales_anuales} />
          <Field label="Fecha de ingreso" name="fecha_ingreso" onChange={handleChange} required type="date" value={formData.fecha_ingreso} />
          <Field label="Tipo de contrato" name="tipo_contrato" onChange={handleChange} value={formData.tipo_contrato}>
            <select className={CONTROL_CLASS} name="tipo_contrato" onChange={handleChange} value={formData.tipo_contrato}>
              <option value="indefinido">Indefinido</option>
              <option value="ocasional">Ocasional</option>
              <option value="obra">Obra o faena</option>
              <option value="hora">Por hora</option>
            </select>
          </Field>
          <Field label="Tipo relacion IESS" name="iess_tipo_relacion" onChange={handleChange} value={formData.iess_tipo_relacion}>
            <select className={CONTROL_CLASS} name="iess_tipo_relacion" onChange={handleChange} value={formData.iess_tipo_relacion}>
              <option value="relacion_dependencia">Relacion de dependencia</option>
              <option value="jornada_parcial_permanente">Jornada parcial permanente</option>
              <option value="sin_relacion_dependencia">Sin relacion de dependencia</option>
              <option value="servicios_profesionales">Servicios profesionales</option>
              <option value="pasante">Pasante</option>
            </select>
          </Field>
          <label className={`${FIELD_HALF} flex min-h-10 items-center gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700`}>
            <input
              checked={Boolean(formData.iess_afiliado)}
              className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
              name="iess_afiliado"
              onChange={(event) => setFormData((current) => ({ ...current, iess_afiliado: event.target.checked }))}
              type="checkbox"
            />
            Afiliado IESS para nomina
          </label>
          <div className={`${FIELD_FULL} rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700`}>
            El calculo de aportes IESS usa esta clasificacion y deja la decision visible en el detalle de nomina.
          </div>
          <Field label="Region para decimo cuarto" name="region_decimo_cuarto" onChange={handleChange} required value={formData.region_decimo_cuarto}>
            <select className={CONTROL_CLASS} name="region_decimo_cuarto" onChange={handleChange} required value={formData.region_decimo_cuarto}>
              <option value="sierra_amazonia">Sierra / Amazonia</option>
              <option value="costa_galapagos">Costa / Galapagos</option>
            </select>
          </Field>
          <div className={`${FIELD_FULL} rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950`}>
            Este codigo enlaza la ficha con el parametro legal de decimo cuarto correspondiente. No se calcula por texto libre.
          </div>
          <Field label="Fondo de reserva" name="modalidad_fondo_reserva" onChange={handleChange} required value={formData.modalidad_fondo_reserva}>
            <select className={CONTROL_CLASS} name="modalidad_fondo_reserva" onChange={handleChange} required value={formData.modalidad_fondo_reserva}>
              <option value="mensual">Pagar mensual en rol</option>
              <option value="iess_directo">Depositar directamente al IESS</option>
            </select>
          </Field>
        </Section>

        <Section title="Datos de pago del trabajador" description="Entidad y cuenta del trabajador. La entidad debe estar autorizada por la autoridad de control financiero aplicable.">
          <Field label="Forma de pago" name="forma_pago" onChange={handleChange} value={formData.forma_pago}>
            <select className={CONTROL_CLASS} name="forma_pago" onChange={handleChange} value={formData.forma_pago}>
              <option value="transferencia">Transferencia bancaria</option>
              <option value="cheque">Cheque</option>
              <option value="efectivo">Efectivo autorizado</option>
            </select>
          </Field>
          <Field label="Entidad bancaria o financiera del trabajador" name="banco" onChange={handleChange} required={formData.forma_pago === 'transferencia'} value={formData.banco}>
            <select className={CONTROL_CLASS} name="banco" onChange={handleChange} required={formData.forma_pago === 'transferencia'} value={formData.banco}>
              <option value="">{bankProfilesQuery.isLoading ? 'Cargando bancos...' : 'Seleccionar banco parametrizado...'}</option>
              {activeBankProfiles.map((profile) => (
                <option key={profile.id || profile.banco_codigo} value={profile.banco_codigo}>
                  {profile.banco_codigo} - {profile.banco_nombre}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tipo de cuenta" name="tipo_cuenta" onChange={handleChange} value={formData.tipo_cuenta}>
            <select className={CONTROL_CLASS} name="tipo_cuenta" onChange={handleChange} value={formData.tipo_cuenta}>
              <option value="">Seleccionar...</option>
              <option value="AHORROS">Ahorros</option>
              <option value="CORRIENTE">Corriente</option>
              <option value="VIRTUAL">Cuenta virtual</option>
              <option value="OTRA">Otra</option>
            </select>
          </Field>
          <Field label={isEdit ? 'Nueva cuenta del trabajador' : 'Numero de cuenta del trabajador'} name="cuenta_bancaria" onChange={handleChange} placeholder={isEdit ? 'Dejar vacio para conservar la actual' : ''} value={formData.cuenta_bancaria} />
          <label className={`${FIELD_FULL} flex items-start gap-3 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700`}>
            <input
              checked={Boolean(formData.whatsapp_consent)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
              name="whatsapp_consent"
              onChange={(event) => setFormData((current) => ({ ...current, whatsapp_consent: event.target.checked }))}
              type="checkbox"
            />
            <span>
              <span className="block font-semibold text-slate-900">Autoriza comunicaciones laborales por WhatsApp</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                Usar solo si el trabajador acepto este canal para invitaciones y avisos laborales.
              </span>
            </span>
          </label>
          <div className={`${FIELD_FULL} flex gap-3 rounded-md border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-950`}>
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <p>Esta cuenta pertenece al trabajador y se guarda cifrada. El banco sale de perfiles bancarios y su homologacion de campos. No corresponde a la cuenta pagadora del cliente/empresa.</p>
          </div>
          {activeBankProfiles.length === 0 && (
            <div className={`${FIELD_FULL} rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800`}>
              Configura al menos un perfil bancario en Parametrizacion antes de registrar cuentas por transferencia.
            </div>
          )}
        </Section>

        {isEdit && (
          <Section title="Gestion posterior" description="Despues de crear la ficha puedes adjuntar contrato firmado y registrar novedades de nomina.">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Contrato firmado en PDF</span>
              <input accept="application/pdf" className={FILE_CONTROL_CLASS} disabled={uploading} onChange={handleSignedContract} type="file" />
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
          <button className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50" disabled={cargando || isMinor || salaryOutOfRange || activeJobPositions.length === 0} type="submit">
            {cargando ? 'Guardando...' : isEdit ? 'Actualizar ficha' : 'Guardar trabajador'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default NuevoEmpleado;

