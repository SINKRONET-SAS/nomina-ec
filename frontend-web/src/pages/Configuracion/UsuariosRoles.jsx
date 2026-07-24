import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ShieldCheck, UserPlus, UserRound, X } from 'lucide-react';
import { authenticatedApi } from '../../services/authenticatedApi';
import { extractApiError } from '../../services/publicApi';

const EMPTY_FORM = { nombres: '', apellidos: '', email: '', password: '', rol: 'admin_rrhh', dpaAccepted: false };
const ROLE_LABELS = { admin_rrhh: 'Administrador de RRHH', supervisor: 'Supervisor', empleado: 'Empleado' };

export default function UsuariosRoles() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [permissions, setPermissions] = useState({});
  const [message, setMessage] = useState('');

  const usersQuery = useQuery({
    queryKey: ['usuarios-roles'],
    queryFn: async () => (await authenticatedApi.get('/usuarios')).data,
  });
  const permissionQuery = useQuery({
    queryKey: ['usuario-permisos', selectedUserId],
    queryFn: async () => (await authenticatedApi.get(`/usuarios/${selectedUserId}/permisos-modulo`)).data,
    enabled: Boolean(selectedUserId),
  });
  useEffect(() => setPermissions(permissionQuery.data?.effective || {}), [permissionQuery.data]);

  const createMutation = useMutation({
    mutationFn: async () => (await authenticatedApi.post('/auth/register', {
      ...form,
      delegated: true,
      lopdpConsent: { acceptedDataProcessing: true, version: 'LOPDP-2026-06', acceptedAt: new Date().toISOString() },
    })).data,
    onSuccess: () => {
      setForm(EMPTY_FORM);
      setMessage('Usuario delegado creado. Se envió la verificación al correo registrado.');
      queryClient.invalidateQueries({ queryKey: ['usuarios-roles'] });
    },
  });
  const statusMutation = useMutation({
    mutationFn: async ({ id, activo }) => authenticatedApi.patch(`/usuarios/${id}/estado`, { activo }),
    onSuccess: () => { setMessage('Estado del usuario actualizado.'); queryClient.invalidateQueries({ queryKey: ['usuarios-roles'] }); },
  });
  const permissionMutation = useMutation({
    mutationFn: async () => authenticatedApi.put(`/usuarios/${selectedUserId}/permisos-modulo`, { permissions }),
    onSuccess: () => setMessage('Permisos por módulo guardados.'),
  });

  const users = usersQuery.data?.users || [];
  const limits = usersQuery.data?.limits || {};
  const usage = usersQuery.data?.usage || {};
  const modules = permissionQuery.data?.modules || [];
  const selected = users.find((user) => user.id === selectedUserId);
  const mutationError = createMutation.error || statusMutation.error || permissionMutation.error || usersQuery.error || permissionQuery.error;
  const updateForm = (name, value) => { setForm((current) => ({ ...current, [name]: value })); setMessage(''); };

  return (
    <div className="space-y-5">
      <div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-800">Configuración y acceso</p><h1 className="mt-1 text-2xl font-bold text-slate-950">Usuarios y roles</h1><p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">Administra usuarios delegados, permisos por módulo y estado de acceso. La información queda aislada por empresa y auditada.</p></div>
      <div className="rounded-lg border border-teal-100 bg-teal-50 p-4 text-sm text-teal-950">Usuarios activos: <strong>{usage.activeUsers || 0}</strong> / <strong>{limits.usersMax || 'sin límite'}</strong>. Solo el administrador principal puede crear o cambiar accesos.</div>
      {message && <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>}
      {mutationError && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{extractApiError(mutationError, 'No pudimos completar la operación de usuarios.')}</div>}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-teal-700" /><h2 className="text-lg font-semibold text-slate-950">Crear usuario delegado</h2></div><div className="mt-4 space-y-3">
          {['nombres', 'apellidos', 'email'].map((field) => <label className="block text-sm font-medium text-slate-700" key={field}>{field === 'nombres' ? 'Nombres' : field === 'apellidos' ? 'Apellidos' : 'Correo'}<input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" type={field === 'email' ? 'email' : 'text'} value={form[field]} onChange={(event) => updateForm(field, event.target.value)} required /></label>)}
          <label className="block text-sm font-medium text-slate-700">Contraseña inicial<input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" minLength="8" type="password" value={form.password} onChange={(event) => updateForm('password', event.target.value)} required /></label>
          <label className="block text-sm font-medium text-slate-700">Rol<select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" value={form.rol} onChange={(event) => updateForm('rol', event.target.value)}>{Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-700"><input className="mt-1" type="checkbox" checked={form.dpaAccepted} onChange={(event) => updateForm('dpaAccepted', event.target.checked)} required /><span><strong>Acepto el tratamiento DPA/LOPDP</strong>. La aceptación queda auditada.</span></label>
          <button className="inline-flex min-h-10 items-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:bg-slate-300" disabled={createMutation.isPending || !form.dpaAccepted} type="button" onClick={() => createMutation.mutate()}><UserPlus className="h-4 w-4" />{createMutation.isPending ? 'Creando...' : 'Crear usuario'}</button>
        </div></section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><UserRound className="h-5 w-5 text-teal-700" /><h2 className="text-lg font-semibold text-slate-950">Usuarios registrados</h2></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[680px] text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-3 py-2">Usuario</th><th className="px-3 py-2">Rol</th><th className="px-3 py-2">Estado</th><th className="px-3 py-2 text-right">Acciones</th></tr></thead><tbody className="divide-y divide-slate-100">{users.map((user) => <tr key={user.id}><td className="px-3 py-3"><p className="font-semibold text-slate-900">{[user.nombres, user.apellidos].filter(Boolean).join(' ') || user.email}</p><p className="text-xs text-slate-500">{user.email}</p></td><td className="px-3 py-3">{ROLE_LABELS[user.rol] || user.rol}</td><td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${user.activo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{user.activo ? 'Activo' : 'Inactivo'}</span></td><td className="px-3 py-3 text-right"><button className="mr-2 rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700" type="button" onClick={() => setSelectedUserId(user.id)} disabled={!user.activo}>Permisos</button><button className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700" type="button" onClick={() => statusMutation.mutate({ id: user.id, activo: !user.activo })}>{user.activo ? 'Desactivar' : 'Activar'}</button></td></tr>)}{users.length === 0 && <tr><td className="px-3 py-6 text-center text-slate-500" colSpan="4">No hay usuarios registrados.</td></tr>}</tbody></table></div></section>
      </div>

      {selected && <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-950">Permisos de {selected.nombres || selected.email}</h2><p className="mt-1 text-sm text-slate-600">Owner y superadmin son irrestrictos. Los demás pueden personalizarse por módulo.</p></div><button className="rounded-md border border-slate-200 p-2 text-slate-500" type="button" onClick={() => setSelectedUserId('')}><X className="h-4 w-4" /></button></div>{permissionQuery.isLoading ? <p className="mt-4 text-sm text-slate-500">Cargando permisos...</p> : <><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{modules.map((module) => <label className="flex items-start gap-3 rounded-md border border-slate-200 p-3" key={module.code}><input className="mt-1" type="checkbox" checked={permissions[module.code] === true} disabled={permissionQuery.data?.isUnrestricted} onChange={(event) => setPermissions((current) => ({ ...current, [module.code]: event.target.checked }))} /><span><span className="block font-semibold text-slate-900">{module.label}</span><span className="text-xs text-slate-500">{module.description}</span></span>{permissions[module.code] === true && <Check className="ml-auto h-4 w-4 text-teal-700" />}</label>)}</div><div className="mt-4 flex items-center gap-2 text-xs text-slate-600"><ShieldCheck className="h-4 w-4 text-teal-700" /> Cambios separados por tenant y registrados en auditoría.</div><button className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-semibold text-white disabled:bg-slate-300" disabled={permissionMutation.isPending || permissionQuery.data?.isUnrestricted} type="button" onClick={() => permissionMutation.mutate()}>{permissionMutation.isPending ? 'Guardando...' : 'Guardar permisos'}</button></>}</section>}
    </div>
  );
}
