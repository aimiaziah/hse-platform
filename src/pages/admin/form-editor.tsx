// src/pages/admin/form-editor.tsx - WYSIWYG Form Template Editor
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/roles/admin/layouts/AdminLayout';
import ProtectedRoute from '@/shared/components/ProtectedRoute';
import { storage } from '@/utils/storage';

type InspectionType = 'hse' | 'fire_extinguisher' | 'first_aid';
type RatingType = 'G' | 'A' | 'P' | 'SIN' | 'SPS' | 'SWO' | '✓' | 'X' | 'NA' | null;

interface FormField {
  id: string;
  label: string;
  type: 'rating' | 'text' | 'textarea' | 'date' | 'select';
  category?: string;
  options?: string[];
  required?: boolean;
  placeholder?: string;
  defaultValue?: any;
}

interface FormTemplate {
  id: string;
  name: string;
  description: string;
  inspectionType: InspectionType;
  fields: FormField[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  isActive: boolean;
}

const FormEditor: React.FC = () => {
  const router = useRouter();
  const { templateId, mode, importFrom } = router.query;

  const [template, setTemplate] = useState<FormTemplate>({
    id: Date.now().toString(),
    name: '',
    description: '',
    inspectionType: 'hse',
    fields: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'Admin',
    isActive: true,
  });

  const [previewMode, setPreviewMode] = useState(false);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [availableInspections, setAvailableInspections] = useState<any[]>([]);

  useEffect(() => {
    if (mode === 'edit' && templateId) {
      loadTemplate(templateId as string);
    } else if (mode === 'duplicate' && templateId) {
      duplicateTemplate(templateId as string);
    } else if (mode === 'import' && importFrom) {
      importFromInspection(importFrom as string);
    }
  }, [mode, templateId, importFrom]);

  const loadTemplate = (id: string) => {
    const templates = storage.load('form_templates', []) as FormTemplate[];
    const found = templates.find((t: FormTemplate) => t.id === id);
    if (found) {
      setTemplate(found);
    }
  };

  const duplicateTemplate = (id: string) => {
    const templates = storage.load('form_templates', []) as FormTemplate[];
    const found = templates.find((t: FormTemplate) => t.id === id) as FormTemplate | undefined;
    if (found) {
      setTemplate({
        ...found,
        id: Date.now().toString(),
        name: `${found.name} (Copy)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const importFromInspection = (inspectionId: string) => {
    // Load the inspection data from storage based on type
    const hseInspections = storage.load('inspections', []);
    const fireInspections = storage.load('fire_extinguisher_inspections', []);
    const firstAidInspections = storage.load('first_aid_inspections', []);

    const allInspections = [
      ...hseInspections.map((i: any) => ({ ...i, type: 'hse' })),
      ...fireInspections.map((i: any) => ({ ...i, type: 'fire_extinguisher' })),
      ...firstAidInspections.map((i: any) => ({ ...i, type: 'first_aid' })),
    ];

    const inspection = allInspections.find((i: any) => i.id === inspectionId);

    if (inspection) {
      const fields: FormField[] = [];

      // Convert inspection items to form fields
      if (inspection.items && Array.isArray(inspection.items)) {
        inspection.items.forEach((item: any, index: number) => {
          fields.push({
            id: `field_${index}`,
            label: item.item || item.label || `Field ${index + 1}`,
            type: 'rating',
            category: item.category || 'General',
            required: true,
          });
        });
      }

      setTemplate({
        id: Date.now().toString(),
        name: `Imported from ${inspection.type} Inspection`,
        description: `Imported on ${new Date().toLocaleDateString()}`,
        inspectionType: inspection.type,
        fields,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'Admin',
        isActive: true,
      });
    }
  };

  const loadAvailableInspections = () => {
    const hseInspections = storage.load('inspections', []);
    const fireInspections = storage.load('fire_extinguisher_inspections', []);
    const firstAidInspections = storage.load('first_aid_inspections', []);

    const allInspections = [
      ...hseInspections.map((i: any) => ({ ...i, type: 'hse', typeName: 'HSE Inspection' })),
      ...fireInspections.map((i: any) => ({
        ...i,
        type: 'fire_extinguisher',
        typeName: 'Fire Extinguisher',
      })),
      ...firstAidInspections.map((i: any) => ({
        ...i,
        type: 'first_aid',
        typeName: 'First Aid Items',
      })),
    ].filter((i: any) => i.status === 'completed');

    setAvailableInspections(allInspections);
    setShowImportModal(true);
  };

  const handleImportInspection = (inspectionId: string) => {
    router.push(`/admin/form-editor?mode=import&importFrom=${inspectionId}`);
    setShowImportModal(false);
  };

  const addField = () => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      label: 'New Field',
      type: 'rating',
      category: template.fields[0]?.category || 'General',
      required: false,
    };
    setTemplate((prev) => ({
      ...prev,
      fields: [...prev.fields, newField],
    }));
  };

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    setTemplate((prev) => ({
      ...prev,
      fields: prev.fields.map((field) => (field.id === fieldId ? { ...field, ...updates } : field)),
    }));
  };

  const deleteField = (fieldId: string) => {
    if (confirm('Are you sure you want to delete this field?')) {
      setTemplate((prev) => ({
        ...prev,
        fields: prev.fields.filter((field) => field.id !== fieldId),
      }));
      if (selectedField === fieldId) {
        setSelectedField(null);
      }
    }
  };

  const moveField = (fieldId: string, direction: 'up' | 'down') => {
    const index = template.fields.findIndex((f) => f.id === fieldId);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= template.fields.length) return;

    const newFields = [...template.fields];
    const [removed] = newFields.splice(index, 1);
    newFields.splice(newIndex, 0, removed);

    setTemplate((prev) => ({ ...prev, fields: newFields }));
  };

  const saveTemplate = () => {
    if (!template.name.trim()) {
      alert('Please enter a template name');
      return;
    }

    if (template.fields.length === 0) {
      alert('Please add at least one field');
      return;
    }

    const templates = storage.load('form_templates', []) as FormTemplate[];
    const updatedTemplate: FormTemplate = {
      ...template,
      updatedAt: new Date().toISOString(),
    };

    const existingIndex = templates.findIndex((t: FormTemplate) => t.id === template.id);
    if (existingIndex >= 0) {
      templates[existingIndex] = updatedTemplate;
    } else {
      templates.push(updatedTemplate);
    }

    storage.save('form_templates', templates);
    alert('Template saved successfully!');
    router.push('/admin/checklist-items');
  };

  const getInspectionTypeIcon = (type: string) => {
    switch (type) {
      case 'hse':
        return '🛡️';
      case 'fire_extinguisher':
        return '🧯';
      case 'first_aid':
        return '🏥';
      default:
        return '📋';
    }
  };

  return (
    <ProtectedRoute requiredPermission="canManageForms">
      <AdminLayout title="Form Editor">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {mode === 'edit' ? 'Edit' : mode === 'duplicate' ? 'Duplicate' : 'Create'} Form
                Template
              </h1>
              <p className="text-gray-600">Design inspection forms with live preview</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.back()}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={loadAvailableInspections}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                Import from Inspection
              </button>
              <button
                onClick={() => setPreviewMode(!previewMode)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                {previewMode ? 'Edit Mode' : 'Preview Mode'}
              </button>
              <button
                onClick={saveTemplate}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Save Template
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Template Settings */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Template Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Template Name *
                    </label>
                    <input
                      type="text"
                      value={template.name}
                      onChange={(e) => setTemplate((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Monthly HSE Inspection"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={template.description}
                      onChange={(e) =>
                        setTemplate((prev) => ({ ...prev, description: e.target.value }))
                      }
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Brief description of this template"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Inspection Type *
                    </label>
                    <select
                      value={template.inspectionType}
                      onChange={(e) =>
                        setTemplate((prev) => ({
                          ...prev,
                          inspectionType: e.target.value as InspectionType,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="hse">HSE Inspection</option>
                      <option value="fire_extinguisher">Fire Extinguisher</option>
                      <option value="first_aid">First Aid Items</option>
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={template.isActive}
                        onChange={(e) =>
                          setTemplate((prev) => ({ ...prev, isActive: e.target.checked }))
                        }
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Active Template</span>
                    </label>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t">
                  <button
                    onClick={addField}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    Add Field
                  </button>
                </div>
              </div>

              {/* Field Editor */}
              {selectedField && !previewMode && (
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Field</h3>
                  {(() => {
                    const field = template.fields.find((f) => f.id === selectedField);
                    if (!field) return null;

                    return (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Field Label *
                          </label>
                          <input
                            type="text"
                            value={field.label}
                            onChange={(e) => updateField(field.id, { label: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Field Type
                          </label>
                          <select
                            value={field.type}
                            onChange={(e) => updateField(field.id, { type: e.target.value as any })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="rating">Rating (G/A/P/SIN/etc)</option>
                            <option value="text">Text Input</option>
                            <option value="textarea">Text Area</option>
                            <option value="date">Date Picker</option>
                            <option value="select">Dropdown Select</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Category
                          </label>
                          <input
                            type="text"
                            value={field.category || ''}
                            onChange={(e) => updateField(field.id, { category: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., WORKING AREAS"
                          />
                        </div>

                        <div>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={field.required || false}
                              onChange={(e) =>
                                updateField(field.id, { required: e.target.checked })
                              }
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">Required Field</span>
                          </label>
                        </div>

                        <button
                          onClick={() => deleteField(field.id)}
                          className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                          Delete Field
                        </button>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Form Preview/Editor */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-6 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <span>{getInspectionTypeIcon(template.inspectionType)}</span>
                        {template.name || 'Untitled Form'}
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">
                        {template.description || 'No description'}
                      </p>
                    </div>
                    <span className="text-sm text-gray-500">
                      {template.fields.length} field{template.fields.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto">
                  {template.fields.length === 0 ? (
                    <div className="text-center py-12">
                      <svg
                        className="w-16 h-16 text-gray-300 mx-auto mb-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <p className="text-gray-500">No fields added yet</p>
                      <button
                        onClick={addField}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Add Your First Field
                      </button>
                    </div>
                  ) : (
                    template.fields.map((field, index) => (
                      <div
                        key={field.id}
                        onClick={() => !previewMode && setSelectedField(field.id)}
                        className={`border rounded-lg p-4 transition-all cursor-pointer ${
                          selectedField === field.id && !previewMode
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {!previewMode && (
                            <div className="flex flex-col gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveField(field.id, 'up');
                                }}
                                disabled={index === 0}
                                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 15l7-7 7 7"
                                  />
                                </svg>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveField(field.id, 'down');
                                }}
                                disabled={index === template.fields.length - 1}
                                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 9l-7 7-7-7"
                                  />
                                </svg>
                              </button>
                            </div>
                          )}

                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-gray-500">
                                    {index + 1}.
                                  </span>
                                  <label className="text-gray-900 font-medium">
                                    {field.label}
                                    {field.required && <span className="text-red-500 ml-1">*</span>}
                                  </label>
                                </div>
                                {field.category && (
                                  <span className="text-xs text-gray-500 ml-6">
                                    {field.category}
                                  </span>
                                )}
                              </div>
                              <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                {field.type}
                              </span>
                            </div>

                            {/* Field Input Preview */}
                            {field.type === 'rating' && (
                              <div className="grid grid-cols-3 gap-2 mt-2">
                                <button className="py-2 px-3 border-2 border-gray-300 rounded-lg text-sm font-medium hover:border-green-500 hover:bg-green-50">
                                  G
                                </button>
                                <button className="py-2 px-3 border-2 border-gray-300 rounded-lg text-sm font-medium hover:border-blue-500 hover:bg-blue-50">
                                  A
                                </button>
                                <button className="py-2 px-3 border-2 border-gray-300 rounded-lg text-sm font-medium hover:border-yellow-500 hover:bg-yellow-50">
                                  P
                                </button>
                              </div>
                            )}
                            {field.type === 'text' && (
                              <input
                                type="text"
                                placeholder={field.placeholder || 'Enter text...'}
                                className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md"
                                disabled={!previewMode}
                              />
                            )}
                            {field.type === 'textarea' && (
                              <textarea
                                placeholder={field.placeholder || 'Enter details...'}
                                rows={3}
                                className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md"
                                disabled={!previewMode}
                              />
                            )}
                            {field.type === 'date' && (
                              <input
                                type="date"
                                className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md"
                                disabled={!previewMode}
                              />
                            )}
                            {field.type === 'select' && (
                              <select
                                className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md"
                                disabled={!previewMode}
                              >
                                <option>Select an option</option>
                              </select>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Import Modal */}
        {showImportModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div
                className="fixed inset-0 transition-opacity"
                onClick={() => setShowImportModal(false)}
              >
                <div className="absolute inset-0 bg-gray-500 opacity-75" />
              </div>

              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Import from Completed Inspection
                  </h3>

                  <div className="max-h-96 overflow-y-auto">
                    {availableInspections.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-500">No completed inspections found</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {availableInspections.map((inspection) => (
                          <button
                            key={inspection.id}
                            onClick={() => handleImportInspection(inspection.id)}
                            className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span>{getInspectionTypeIcon(inspection.type)}</span>
                                  <span className="font-medium text-gray-900">
                                    {inspection.typeName}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">
                                  By {inspection.inspectedBy || 'Unknown'} •{' '}
                                  {new Date(inspection.createdAt).toLocaleDateString()}
                                </p>
                                {inspection.items && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    {inspection.items.length} fields
                                  </p>
                                )}
                              </div>
                              <svg
                                className="w-5 h-5 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    onClick={() => setShowImportModal(false)}
                    className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AdminLayout>
    </ProtectedRoute>
  );
};

export default FormEditor;
