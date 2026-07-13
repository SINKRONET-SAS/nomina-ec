import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  Circle,
  Download,
  Edit3,
  Plus,
  Settings2,
  Trash2,
  X,
} from 'lucide-react';
import CompactNotice from '../../components/UI/CompactNotice';
import { useAuth } from '../../context/AuthContext';
import Field from './parametrizacion/Field';
import IncomeTaxTableFields from './parametrizacion/IncomeTaxTableFields';
import { IncomeTaxTablePreview, LegalParametersPreview } from './parametrizacion/LegalParametersPreview';
import { normalizeIncomeTaxBrackets } from './parametrizacion/legalParameterDisplay';
import {
  completeOnboardingStep,
  createConfigurationResource,
  deleteConfigurationResource,
  fetchConfigurationSummary,
  loadMandatoryLegalParameters,
  updateConfigurationResource,
} from '../../services/configurationApi';
import { extractApiError } from '../../services/publicApi';

import {
  BANK_MAPPING_STRUCTURES,
  BANK_TEMPLATE_DEFAULTS,
  BANK_TEMPLATE_PREVIEWS,
  CANONICAL_BANK_FIELDS,
  accountingMappingByConcept,
  bankTemplateFromProfile,
  buildBankProfilePayload,
  buildInitialState,
  cloneFormValues,
  configurationLoadMessage,
  defaultMappingStructure,
  formDefinitions,
  formValuesFromRecord,
  mappingsForBank,
  normalizeBankCode,
  optionsForField,
  parseUploadedBankStructure,
  payrollConceptByCode,
  payrollConceptOptions,
  profileOptions,
  recordMetaForDefinition,
  recordsForDefinition,
  stepFormMap,
} from './parametrizacion/parametrizacionModel';

function BankFlatFileGuide({ values, mappings = [] }) {
  const template = BANK_TEMPLATE_PREVIEWS[values.template] || BANK_TEMPLATE_PREVIEWS.generico;
  const visibleColumns = mappings.length > 0
    ? mappings.map((mapping) => ([
      String(mapping.position),
      mapping.bank_field_name,
      mapping.canonical_field,
      mapping.formatter || (mapping.required ? 'Obligatorio' : 'Opcional'),
    ]))
    : template.columns;

  return (
    <div className="mt-5 space-y-4 rounded-md border border-teal-100 bg-teal-50/70 p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold text-teal-950">Archivo bancario</p>
          <h4 className="mt-1 text-base font-semibold text-slate-950">{template.title}</h4>
          <p className="mt-1 text-sm leading-6 text-slate-700">
            Usa roles cerrados o pagados y la homologación vigente. Fuente: {template.source}.
          </p>
        </div>
        <div className="rounded-md bg-white px-3 py-2 text-xs text-slate-600">
          <p><strong>Archivo:</strong> {template.fileName}</p>
          <p><strong>Encoding:</strong> {template.encoding}</p>
          <p><strong>Separador:</strong> {template.delimiter === ';' ? 'punto y coma (;)' : template.delimiter}</p>
          <p><strong>Líneas:</strong> {template.lineEnding}</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {template.sections.map((section) => (
          <div className="rounded-md border border-teal-100 bg-white p-3" key={section.label}>
            <p className="text-xs font-semibold uppercase text-teal-800">{section.label}</p>
            <p className="mt-1 text-sm leading-5 text-slate-700">{section.value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-md border border-teal-100 bg-white">
        <table className="min-w-[760px] w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 font-semibold">Pos.</th>
              <th className="px-3 py-2 font-semibold">Campo banco</th>
              <th className="px-3 py-2 font-semibold">Dato usado</th>
              <th className="px-3 py-2 font-semibold">Formato</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleColumns.map(([position, bankField, source, format]) => (
              <tr key={`${position}-${bankField}`}>
                <td className="px-3 py-2 font-mono text-slate-500">{position}</td>
                <td className="px-3 py-2 font-semibold text-slate-900">{bankField}</td>
                <td className="px-3 py-2 text-slate-700">{source}</td>
                <td className="px-3 py-2 text-slate-700">{format}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-md bg-slate-950 px-3 py-2 text-xs text-slate-100">
        <p className="font-semibold text-teal-200">Ejemplo de línea de detalle</p>
        <code className="mt-1 block overflow-x-auto whitespace-nowrap">{template.example}</code>
      </div>

      <CompactNotice tone="amber">
        {mappings.length > 0
          ? 'Usando la homologación guardada. Actualízala si cambia la estructura del banco.'
          : 'Sin homologación guardada: se muestra la plantilla base.'}
      </CompactNotice>
    </div>
  );
}

function BankMappingStructureBuilder({
  values,
  summary,
  onFieldChange,
  onApplyProfile,
  onGenerate,
  isGenerating,
}) {
  const profiles = profileOptions(summary);
  const selectedProfile = (summary?.resources?.bankProfiles || []).find(
    (profile) => normalizeBankCode(profile.banco_codigo) === normalizeBankCode(values.banco_codigo)
  );
  const template = values.template || bankTemplateFromProfile(selectedProfile);
  const uploadedStructure = Array.isArray(values.uploadedStructure) ? values.uploadedStructure : [];
  const structure = uploadedStructure.length > 0 ? uploadedStructure : defaultMappingStructure(template);
  const savedMappings = mappingsForBank(summary, values.banco_codigo);

  function updateStructureField(index, name, value) {
    const next = structure.map((field, fieldIndex) => (
      fieldIndex === index ? { ...field, [name]: value } : field
    ));
    onFieldChange('uploadedStructure', next);
  }

  function importStructure(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseUploadedBankStructure(reader.result);
      onFieldChange('uploadedStructure', parsed.length > 0 ? parsed : []);
    };
    reader.readAsText(file);
  }

  return (
    <div className="mt-5 space-y-4">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <label>
          <span className="text-sm font-medium text-slate-700">Banco configurado</span>
          <select
            className="form-control"
            value={values.banco_codigo}
            onChange={(event) => onApplyProfile(event.target.value)}
          >
            {profiles.length === 0 && <option value="">Primero crea un banco</option>}
            {profiles.map((profile) => (
              <option key={profile.value} value={profile.value}>{profile.label}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-sm font-medium text-slate-700">Estructura base</span>
          <select
            className="form-control"
            value={template}
            onChange={(event) => onFieldChange('template', event.target.value)}
          >
            <option value="generico">Genérica delimitada</option>
            <option value="pacifico_interbank_immediate">Banco Pacífico - transferencias interbancarias inmediatas</option>
          </select>
        </label>
      </div>

      <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-950">Homologación desde archivo plano</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              Sube un TXT/CSV modelo y ajusta los campos antes de guardar.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex min-h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:border-teal-300">
              <Download className="h-4 w-4 rotate-180" />
              Subir plano modelo
              <input className="hidden" type="file" accept=".txt,.csv" onChange={importStructure} />
            </label>
            {uploadedStructure.length > 0 && (
              <button
                className="inline-flex min-h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700"
                type="button"
                onClick={() => onFieldChange('uploadedStructure', [])}
              >
                Volver a plantilla base
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-slate-200">
        <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-950">Estructura que se guardará para {values.banco_codigo || 'el banco'}</p>
            <p className="mt-1 text-xs text-slate-500">
              Se generan {structure.length} campos ordenados. Existentes para este banco: {savedMappings.length}.
            </p>
          </div>
          <button
            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white disabled:opacity-60"
            disabled={!values.banco_codigo || isGenerating}
            type="button"
            onClick={() => onGenerate(structure)}
          >
            <Plus className="h-4 w-4" />
            {isGenerating ? 'Generando...' : 'Generar estructura completa'}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="bg-white text-slate-500">
              <tr>
                <th className="px-3 py-2 font-semibold">Pos.</th>
                <th className="px-3 py-2 font-semibold">Campo SKNOMINA</th>
                <th className="px-3 py-2 font-semibold">Campo banco</th>
                <th className="px-3 py-2 font-semibold">Formato</th>
                <th className="px-3 py-2 font-semibold">Req.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {structure.map((field, index) => {
                const saved = savedMappings.find((mapping) => mapping.canonical_field === field.canonical_field);
                return (
                  <tr className={saved ? 'bg-emerald-50/50' : 'bg-white'} key={field.canonical_field}>
                    <td className="px-3 py-2 font-mono">{field.position}</td>
                    <td className="px-3 py-2">
                      <select
                        className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
                        value={CANONICAL_BANK_FIELDS.includes(field.canonical_field) ? field.canonical_field : ''}
                        onChange={(event) => updateStructureField(index, 'canonical_field', event.target.value)}
                      >
                        <option value="">Revisar campo</option>
                        {CANONICAL_BANK_FIELDS.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
                        value={field.bank_field_name}
                        onChange={(event) => updateStructureField(index, 'bank_field_name', event.target.value.toUpperCase())}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
                        value={field.formatter || ''}
                        onChange={(event) => updateStructureField(index, 'formatter', event.target.value)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-700"
                        type="checkbox"
                        checked={Boolean(field.required)}
                        onChange={(event) => updateStructureField(index, 'required', event.target.checked)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <CompactNotice tone="amber">
        El archivo bancario usa esta homologación para ordenar y validar sus campos.
      </CompactNotice>
    </div>
  );
}

function BankMappingGroups({ records }) {
  const groups = records.reduce((acc, record) => {
    const code = normalizeBankCode(record.banco_codigo);
    if (!acc.has(code)) acc.set(code, []);
    acc.get(code).push(record);
    return acc;
  }, new Map());

  if (groups.size === 0) {
    return (
      <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
        Aún no hay estructuras bancarias homologadas.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {[...groups.entries()].map(([code, mappings]) => {
        const ordered = [...mappings].sort((a, b) => Number(a.position) - Number(b.position));
        return (
          <div className="rounded-md bg-slate-50 px-3 py-2" key={code}>
            <p className="text-sm font-semibold text-slate-900">{code}</p>
            <p className="mt-1 text-xs text-slate-500">{ordered.length} campos homologados</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {ordered.slice(0, 12).map((mapping) => (
                <span className="rounded bg-white px-2 py-1 text-[11px] text-slate-600" key={mapping.id}>
                  {mapping.position}. {mapping.bank_field_name}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function dedupeNoveltyRecords(records = []) {
  const seen = new Set();
  return records.filter((record) => {
    const code = String(record.code || record.tipo_novedad || record.name || record.id || '')
      .trim()
      .toLowerCase();
    if (!code) return true;
    if (seen.has(code)) return false;
    seen.add(code);
    return true;
  });
}

function Parametrizacion() {
  const { token, usuario } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const requestedSection = searchParams.get('seccion');
  const initialForm = formDefinitions.some((definition) => definition.key === requestedSection)
    ? requestedSection
    : formDefinitions[0].key;
  const [activeForm, setActiveForm] = useState(initialForm);
  const [forms, setForms] = useState(buildInitialState);
  const [mandatoryYear, setMandatoryYear] = useState(new Date().getFullYear());
  const [editingRecord, setEditingRecord] = useState(null);
  const [pendingDeleteId, setPendingDeleteId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const {
    data: summary,
    error: summaryError,
    isError: summaryHasError,
  } = useQuery({
    queryKey: ['configuration-summary'],
    queryFn: () => fetchConfigurationSummary(token),
    enabled: Boolean(token),
    retry: false,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ definition, values, record }) => {
      const payload = definition.buildPayload(values);
      if (definition.resource === 'legalParameters' && payload.validation_status === 'validado_oficial' && !canValidateLegalParameters) {
        throw new Error('Solo el administrador principal puede marcar parámetros legales como validados.');
      }
      const savedRecord = record
        ? await updateConfigurationResource(token, definition.resource, record.id, payload)
        : await createConfigurationResource(token, definition.resource, payload);
      await completeOnboardingStep(token, definition.stepCode, {
        notes: `${definition.title} ${record ? 'actualizado' : 'creado'} desde parametrizacion.`,
        evidence: { recordId: savedRecord.id, resource: definition.resource },
      });
      return { record: savedRecord, definition, mode: record ? 'actualizado' : 'guardado' };
    },
    onSuccess: ({ definition, mode }) => {
      setError('');
      setMessage(`${definition.title} ${mode}.`);
      setForms((current) => ({ ...current, [definition.key]: cloneFormValues(definition.initial) }));
      setEditingRecord(null);
      setPendingDeleteId('');
      queryClient.invalidateQueries({ queryKey: ['configuration-summary'] });
    },
    onError: (err) => {
      setMessage('');
      setError(extractApiError(err, 'No pudimos guardar la parametrizacion. Revisa los datos e intenta nuevamente.'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ definition, record }) => deleteConfigurationResource(token, definition.resource, record.id),
    onSuccess: (_data, { definition, record }) => {
      setError('');
      setMessage(`${definition.title} eliminado.`);
      setPendingDeleteId('');
      if (editingRecord?.id === record.id) {
        setEditingRecord(null);
        setForms((current) => ({ ...current, [definition.key]: cloneFormValues(definition.initial) }));
      }
      queryClient.invalidateQueries({ queryKey: ['configuration-summary'] });
    },
    onError: (err) => {
      setMessage('');
      setError(extractApiError(err, 'No pudimos eliminar el registro. Verifica si ya tiene consumos operativos.'));
    },
  });

  const loadMandatoryMutation = useMutation({
    mutationFn: () => loadMandatoryLegalParameters(token, mandatoryYear),
    onSuccess: (data) => {
      setError('');
      setMessage(`Parámetros legales vigentes para ${data.periodYear} actualizados: ${data.count}.`);
      selectForm('ir');
      queryClient.invalidateQueries({ queryKey: ['configuration-summary'] });
    },
    onError: (err) => {
      setMessage('');
      setError(extractApiError(err, 'No pudimos cargar los parámetros legales obligatorios.'));
    },
  });

  const generateBankMappingStructureMutation = useMutation({
    mutationFn: async (structure) => {
      const bancoCodigo = normalizeBankCode(activeValues.banco_codigo);
      const existingMappings = mappingsForBank(summary, bancoCodigo);
      const validStructure = structure.filter((field) => CANONICAL_BANK_FIELDS.includes(field.canonical_field));
      if (!bancoCodigo) {
        throw new Error('Selecciona un banco antes de generar la homologación.');
      }
      if (validStructure.length === 0) {
        throw new Error('La estructura no tiene campos canónicos válidos para guardar.');
      }

      const savedRows = [];
      for (const field of validStructure) {
        const payload = {
          banco_codigo: bancoCodigo,
          canonical_field: field.canonical_field,
          bank_field_name: String(field.bank_field_name || field.canonical_field).trim().toUpperCase(),
          position: Number(field.position),
          formatter: String(field.formatter || '').trim(),
          required: Boolean(field.required),
          metadata: {
            source: Array.isArray(activeValues.uploadedStructure) && activeValues.uploadedStructure.length > 0
              ? 'archivo_plano_modelo'
              : 'plantilla_sknomina',
            template: activeValues.template,
          },
        };
        const existing = existingMappings.find((mapping) => mapping.canonical_field === field.canonical_field);
        const saved = existing
          ? await updateConfigurationResource(token, 'bankFieldMappings', existing.id, payload)
          : await createConfigurationResource(token, 'bankFieldMappings', payload);
        savedRows.push(saved);
      }

      await completeOnboardingStep(token, 'bancos', {
        notes: `Homologación bancaria ${bancoCodigo} generada como estructura completa.`,
        evidence: { bancoCodigo, totalCampos: savedRows.length },
      });

      return { bancoCodigo, savedRows };
    },
    onSuccess: ({ bancoCodigo, savedRows }) => {
      setError('');
      setMessage(`Homologación ${bancoCodigo} actualizada: ${savedRows.length} campos guardados.`);
      queryClient.invalidateQueries({ queryKey: ['configuration-summary'] });
    },
    onError: (err) => {
      setMessage('');
      setError(extractApiError(err, 'No pudimos generar la estructura bancaria completa.'));
    },
  });

  const activeDefinition = formDefinitions.find((definition) => definition.key === activeForm) || formDefinitions[0];
  const activeValues = forms[activeDefinition.key];
  const isEditingActiveRecord = editingRecord?.definitionKey === activeDefinition.key;
  const currentRole = String(usuario?.rol || '').trim().toLowerCase();
  const canValidateLegalParameters = ['superadmin', 'owner'].includes(currentRole);
  const isLegalParameterForm = activeDefinition.resource === 'legalParameters';
  const legalParameterLoadDisabled = loadMandatoryMutation.isPending || !canValidateLegalParameters;
  const legalParameterLoadHelp = canValidateLegalParameters
    ? 'Carga los valores base del año fiscal para iniciar la parametrización legal.'
    : 'Disponible para el administrador principal o soporte global.';
  const isLockedValidatedLegalRecord = isLegalParameterForm
    && isEditingActiveRecord
    && editingRecord?.validation_status === 'validado_oficial'
    && !canValidateLegalParameters;
  const completion = summary?.onboarding?.completionPercent || 0;
  const baseRecords = recordsForDefinition(summary, activeDefinition);
  const records = activeDefinition.resource === 'noveltyTypes'
    ? dedupeNoveltyRecords(baseRecords)
    : baseRecords;
  const legalRecords = summary?.resources?.legalParameters || [];
  const rootFormDefinitions = formDefinitions.filter((definition) => !definition.parentKey);
  const childFormDefinitions = (parentKey) => formDefinitions.filter((definition) => definition.parentKey === parentKey);

  useEffect(() => {
    if (requestedSection && formDefinitions.some((definition) => definition.key === requestedSection)) {
      selectForm(requestedSection);
    }
  }, [requestedSection]);

  function updateField(name, value) {
    setForms((current) => {
      const nextValues = {
        ...current[activeDefinition.key],
        ...(activeDefinition.key === 'banco' && name === 'template'
          ? BANK_TEMPLATE_DEFAULTS[value] || {}
          : {}),
        [name]: value,
      };

      if (activeDefinition.key === 'contabilidad' && name === 'concept_code') {
        const concept = payrollConceptByCode(summary, value);
        nextValues.concept_label = concept?.label || '';
        nextValues.category = concept?.category || '';
        nextValues.entry_type = concept?.entryType || nextValues.entry_type || 'DEVENGAMIENTO';
      }

      return {
        ...current,
        [activeDefinition.key]: nextValues,
      };
    });
  }

  function applyBankProfileToMapping(bancoCodigo) {
    const profile = (summary?.resources?.bankProfiles || []).find(
      (item) => normalizeBankCode(item.banco_codigo) === normalizeBankCode(bancoCodigo)
    );
    setForms((current) => ({
      ...current,
      homologacion_banco: {
        ...current.homologacion_banco,
        banco_codigo: bancoCodigo,
        template: bankTemplateFromProfile(profile),
        uploadedStructure: [],
      },
    }));
  }

  function generateBankMappingStructure(structure) {
    generateBankMappingStructureMutation.mutate(structure);
  }

  function updateBracket(index, name, value) {
    setForms((current) => ({
      ...current,
      [activeDefinition.key]: {
        ...current[activeDefinition.key],
        brackets: current[activeDefinition.key].brackets.map((bracket, bracketIndex) => (
          bracketIndex === index ? { ...bracket, [name]: value } : bracket
        )),
      },
    }));
  }

  function addBracket() {
    setForms((current) => ({
      ...current,
      [activeDefinition.key]: {
        ...current[activeDefinition.key],
        brackets: [
          ...current[activeDefinition.key].brackets,
          { from: '', to: '', baseTax: '0', rate: '0' },
        ],
      },
    }));
  }

  function removeBracket(index) {
    setForms((current) => ({
      ...current,
      [activeDefinition.key]: {
        ...current[activeDefinition.key],
        brackets: current[activeDefinition.key].brackets.filter((_, bracketIndex) => bracketIndex !== index),
      },
    }));
  }

  function submitForm(event) {
    event.preventDefault();
    if (activeDefinition.customType === 'bankMappingStructure') {
      return;
    }
    saveMutation.mutate({
      definition: activeDefinition,
      values: activeValues,
      record: isEditingActiveRecord ? editingRecord : null,
    });
  }

  function selectForm(definitionKey) {
    setActiveForm(definitionKey);
    setEditingRecord(null);
    setPendingDeleteId('');
  }

  function startEdit(definition, record) {
    try {
      const values = formValuesFromRecord(definition, record);
      setActiveForm(definition.key);
      setEditingRecord({ ...record, definitionKey: definition.key });
      setPendingDeleteId('');
      setError('');
      setMessage('');
      setForms((current) => ({ ...current, [definition.key]: values }));
    } catch (err) {
      setError(`No se pudo cargar el registro para editar: ${err.message}`);
    }
  }

  function cancelEdit() {
    setEditingRecord(null);
    setPendingDeleteId('');
    setForms((current) => ({
      ...current,
      [activeDefinition.key]: cloneFormValues(activeDefinition.initial),
    }));
  }

  function requestDelete(recordId) {
    setPendingDeleteId(recordId);
    setMessage('');
    setError('');
  }

  function confirmDelete(definition, record) {
    deleteMutation.mutate({ definition, record });
  }

  function openStepForm(stepCode) {
    const formKey = stepFormMap[stepCode];
    if (formKey) selectForm(formKey);
  }

  function MandatoryLegalParametersAction({ compact = false } = {}) {
    const containerClass = compact
      ? 'mt-4 rounded-md border border-teal-200 bg-teal-50 p-4'
      : 'flex flex-wrap items-end gap-3';
    const controlClass = compact
      ? 'mt-3 flex flex-wrap items-end gap-3'
      : 'flex flex-wrap items-end gap-3';

    return (
      <div className={containerClass}>
        {compact && (
          <div>
            <p className="text-sm font-semibold text-teal-950">Carga inicial de valores legales</p>
            <p className="mt-1 text-sm leading-6 text-teal-900">{legalParameterLoadHelp}</p>
          </div>
        )}
        <div className={controlClass}>
          <label>
            <span className="text-sm font-medium text-teal-950">Año fiscal</span>
            <input
              className="mt-1 w-32 rounded-md border border-teal-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
              type="number"
              value={mandatoryYear}
              onChange={(event) => setMandatoryYear(Number(event.target.value))}
            />
          </label>
          <button
            className="inline-flex min-h-10 items-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={legalParameterLoadDisabled}
            type="button"
            title={legalParameterLoadHelp}
            onClick={() => loadMandatoryMutation.mutate()}
          >
            <Download className="h-4 w-4" />
            {loadMandatoryMutation.isPending ? 'Cargando...' : 'Cargar valores legales'}
          </button>
          {!canValidateLegalParameters && (
            <p className="max-w-xs text-xs leading-5 text-teal-900">{legalParameterLoadHelp}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">Configuración de empresa</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">Parámetros de nómina</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Mantén valores legales, estructura, zonas, jornadas y bancos listos para operar.
            </p>
          </div>
          <div className="rounded-md bg-teal-50 px-5 py-4 text-center">
            <p className="text-sm font-medium text-teal-900">Avance</p>
            <p className="text-3xl font-semibold text-teal-900">{completion}%</p>
          </div>
        </div>
        <div className="mt-5 h-2 rounded-full bg-slate-100">
          <div className="h-2 rounded-full bg-teal-700" style={{ width: `${completion}%` }} />
        </div>
      </div>

      {message && <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{message}</div>}
      {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{error}</div>}
      {summaryHasError && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          {configurationLoadMessage(summaryError)}
        </div>
      )}

      <section className="rounded-lg border border-teal-200 bg-teal-50 p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-teal-950">Carga de valores legales obligatorios</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-teal-900">
              Carga la base legal del año seleccionado. El responsable de la empresa debe revisarla antes de marcarla como validada.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label>
              <span className="text-sm font-medium text-teal-950">Año fiscal</span>
              <input
                className="mt-1 w-32 rounded-md border border-teal-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
                type="number"
                value={mandatoryYear}
                onChange={(event) => setMandatoryYear(Number(event.target.value))}
              />
            </label>
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white disabled:opacity-60"
              disabled={legalParameterLoadDisabled}
              type="button"
              title={legalParameterLoadHelp}
              onClick={() => loadMandatoryMutation.mutate()}
            >
              <Download className="h-4 w-4" />
              {loadMandatoryMutation.isPending ? 'Cargando...' : 'Cargar valores legales'}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Settings2 className="h-6 w-6 text-teal-700" />
            <h2 className="text-lg font-semibold text-slate-950">Centro de configuración</h2>
          </div>
          <p className="text-sm text-slate-500">Selecciona un dominio operativo y completa los campos requeridos.</p>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <div className="rounded-md border border-teal-100 bg-teal-50 px-4 py-3 text-sm leading-6 text-teal-950">
            <p className="font-semibold">Valores legales</p>
            <p>Valores que alimentan cálculos laborales y tributarios.</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
            <p className="font-semibold text-slate-950">Cuentas contables de nómina</p>
            <p>Debe/haber por concepto, vigencia y centro de costo.</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-start gap-2">
          {rootFormDefinitions.map((definition) => {
            const Icon = definition.icon;
            const isActive = definition.key === activeDefinition.key;
            const children = childFormDefinitions(definition.key);
            const hasActiveChild = children.some((child) => child.key === activeDefinition.key);
            return (
              <div className="flex flex-col gap-2" key={definition.key}>
                <button
                  className={`inline-flex min-h-10 items-center gap-2 rounded-md border px-3 text-sm font-semibold ${
                    isActive
                      ? 'border-teal-700 bg-teal-700 text-white'
                      : hasActiveChild
                        ? 'border-teal-300 bg-teal-50 text-teal-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-teal-300'
                  }`}
                  type="button"
                  onClick={() => selectForm(definition.key)}
                >
                  <Icon className="h-4 w-4" />
                  {definition.title}
                </button>
                {children.length > 0 && (
                  <div className="ml-3 flex flex-wrap gap-2 border-l border-slate-200 pl-3">
                    {children.map((child) => {
                      const ChildIcon = child.icon;
                      const childActive = child.key === activeDefinition.key;
                      return (
                        <button
                          className={`inline-flex min-h-9 items-center gap-2 rounded-md border px-3 text-xs font-semibold ${
                            childActive
                              ? 'border-teal-700 bg-teal-700 text-white'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-teal-300'
                          }`}
                          key={child.key}
                          type="button"
                          onClick={() => selectForm(child.key)}
                        >
                          <ChildIcon className="h-3.5 w-3.5" />
                          {child.navigationLabel || child.title}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <form className="rounded-md border border-slate-200 p-4" onSubmit={submitForm}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="font-semibold text-slate-950">
                  {isEditingActiveRecord ? `Editar ${activeDefinition.title}` : activeDefinition.title}
                </h3>
                <p className="mt-1 text-sm text-slate-600">{activeDefinition.description}</p>
              </div>
              {isEditingActiveRecord && (
                <button
                  className="inline-flex min-h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:border-teal-300"
                  type="button"
                  onClick={cancelEdit}
                >
                  <X className="h-4 w-4" />
                  Cancelar
                </button>
              )}
            </div>


            {activeDefinition.key === 'jornada' && (
              <CompactNotice className="mt-4" tone="amber" title="Revisa la jornada">
                Valida límites, recargos y autorizaciones antes de operar jornadas especiales o excepcionales.
              </CompactNotice>
            )}

            {activeDefinition.key === 'legal' && (
              <CompactNotice
                className="mt-4"
                tone="teal"
                title="Fórmula de horas extra"
                items={[
                  'jornada_horas_mensuales: divide el sueldo para obtener el valor hora.',
                  'horas_extra_recargo_suplementaria: multiplicador de horas suplementarias.',
                  'horas_extra_recargo_extraordinaria: multiplicador de horas extraordinarias.',
                  'horas_extra_limite_semanal: tope semanal antes de bloquear el cálculo.',
                ]}
              >
                Se parametriza en Valores legales. Carga los valores obligatorios del año y edita estos códigos con perfil de administrador principal.
              </CompactNotice>
            )}

            {isLegalParameterForm && (
              <CompactNotice className="mt-4" tone="amber" title="Validación del responsable">
                El check habilita el parámetro para cálculo. Luego solo el administrador principal o soporte global puede cambiarlo.
              </CompactNotice>
            )}

            {isLegalParameterForm && <MandatoryLegalParametersAction compact />}

            {activeDefinition.customType === 'incomeTaxTable' ? (
              <div className="mt-5">
                <IncomeTaxTableFields
                  values={activeValues}
                  onFieldChange={updateField}
                  onBracketChange={updateBracket}
                  onAddBracket={addBracket}
                  onRemoveBracket={removeBracket}
                  disabled={isLockedValidatedLegalRecord}
                  canValidate={canValidateLegalParameters}
                />
              </div>
            ) : activeDefinition.customType === 'bankMappingStructure' ? (
              <BankMappingStructureBuilder
                values={activeValues}
                summary={summary}
                onFieldChange={updateField}
                onApplyProfile={applyBankProfileToMapping}
                onGenerate={generateBankMappingStructure}
                isGenerating={generateBankMappingStructureMutation.isPending}
              />
            ) : (
              <>
                <div className="form-grid mt-5">
                  {activeDefinition.fields.map((field) => (
                    <Field
                      key={field.name}
                      field={{
                        ...field,
                        disabled: isLockedValidatedLegalRecord
                          || (isLegalParameterForm && field.name === 'owner_validated' && !canValidateLegalParameters),
                      }}
                      value={activeValues[field.name]}
                      onChange={updateField}
                      options={optionsForField(summary, field)}
                    />
                  ))}
                </div>
                {activeDefinition.key === 'banco' && (
                  <BankFlatFileGuide
                    values={activeValues}
                    mappings={mappingsForBank(summary, activeValues.banco_codigo)}
                  />
                )}
              </>
            )}

            {activeDefinition.customType !== 'bankMappingStructure' && (
              <button
                className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white disabled:opacity-60"
                disabled={saveMutation.isPending || isLockedValidatedLegalRecord}
                type="submit"
              >
                {isEditingActiveRecord ? <Edit3 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {saveMutation.isPending
                  ? 'Guardando...'
                  : (isEditingActiveRecord
                    ? activeDefinition.updateLabel || (activeDefinition.key === 'banco' ? 'Actualizar estructura bancaria' : 'Actualizar parámetro')
                    : activeDefinition.saveLabel || (activeDefinition.key === 'banco' ? 'Guardar estructura bancaria' : 'Guardar parámetro'))}
              </button>
            )}
          </form>

          <aside className="rounded-md border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-950">{activeDefinition.recordsTitle || 'Registros vigentes'}</h3>
            <div className="mt-4 space-y-3">
              {activeDefinition.customType === 'bankMappingStructure' ? (
                <BankMappingGroups records={records} />
              ) : records.length === 0 && (
                <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  {activeDefinition.emptyText || 'Aún no hay registros en esta categoría.'}
                </p>
              )}
              {activeDefinition.customType !== 'bankMappingStructure' && records.slice(0, 12).map((record) => {
                const recordLocked = activeDefinition.resource === 'legalParameters'
                  && record.validation_status === 'validado_oficial'
                  && !canValidateLegalParameters;
                return (
                <div className="rounded-md bg-slate-50 px-3 py-2" key={record.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{activeDefinition.recordLabel(record, summary)}</p>
                      <p className="mt-1 text-xs text-slate-500">{recordMetaForDefinition(activeDefinition, record, summary)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-teal-700 hover:border-teal-300"
                        type="button"
                        disabled={recordLocked}
                        onClick={() => startEdit(activeDefinition, record)}
                        title={recordLocked ? 'Solo el administrador principal puede modificar parámetros validados' : 'Editar registro'}
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      {pendingDeleteId === record.id ? (
                        <>
                          <button
                            className="inline-flex min-h-8 items-center rounded-md border border-red-200 bg-white px-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                            type="button"
                            disabled={deleteMutation.isPending || recordLocked}
                            onClick={() => confirmDelete(activeDefinition, record)}
                          >
                            Eliminar
                          </button>
                          <button
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                            type="button"
                            onClick={() => setPendingDeleteId('')}
                            title="Cancelar eliminacion"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <button
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:border-red-200 hover:text-red-700"
                          type="button"
                          disabled={recordLocked}
                          onClick={() => requestDelete(record.id)}
                          title={recordLocked ? 'Solo el administrador principal puede eliminar parámetros validados' : 'Eliminar si no tiene consumos'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
            {activeDefinition.key === 'legal' && (
              <LegalParametersPreview records={legalRecords} />
            )}
            {activeDefinition.customType === 'incomeTaxTable' && (
              <IncomeTaxTablePreview records={records} />
            )}
          </aside>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-slate-950">Avance operativo</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(summary?.onboarding?.steps || []).map((step) => (
            <div className="flex items-center gap-3 rounded-md bg-slate-50 px-4 py-3" key={step.step_code}>
              {step.status === 'completado'
                ? <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                : <Circle className="h-5 w-5 text-slate-400" />}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900">{step.label}</p>
                <p className="text-xs text-slate-500">{step.status}</p>
              </div>
              {step.status !== 'completado' && stepFormMap[step.step_code] && (
                <button
                  className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-teal-700 hover:border-teal-300"
                  type="button"
                  onClick={() => openStepForm(step.step_code)}
                >
                  Configurar
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Parametrizacion;
