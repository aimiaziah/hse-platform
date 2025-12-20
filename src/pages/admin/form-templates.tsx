// src/pages/admin/form-templates.tsx
// Form Management page for editing fire extinguisher and first aid templates
import React, { useState, useEffect } from 'react';
import AdminLayout from '@/roles/admin/layouts/AdminLayout';
import ProtectedRoute from '@/shared/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';

interface FireExtinguisherTemplate {
  id: string;
  item_no: number;
  serial_no: string;
  location: string;
  type_size: string;
  display_order: number;
  is_active: boolean;
}

interface FirstAidItemTemplate {
  id: string;
  item_id: string;
  item_name: string;
  display_order: number;
  is_active: boolean;
}

interface FirstAidKitTemplate {
  id: string;
  kit_no: number;
  model: string;
  model_no: string;
  kit_location: string;
  display_order: number;
  is_active: boolean;
}

interface FormFieldConfiguration {
  id: string;
  form_type: 'fire_extinguisher' | 'first_aid';
  field_key: string;
  field_label: string;
  field_type: 'text' | 'number' | 'rating' | 'date' | 'textarea' | 'select';
  display_order: number;
  is_visible: boolean;
  is_required: boolean;
  column_width?: number;
  min_width?: number;
  default_value?: string;
  placeholder?: string;
  help_text?: string;
  validation_rules?: any;
  is_active: boolean;
}

const FormTemplatesManagement: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'fire_extinguisher' | 'first_aid'>(
    'fire_extinguisher',
  );
  const [activeSection, setActiveSection] = useState<'items' | 'fields'>('items');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fire extinguisher data
  const [fireExtinguishers, setFireExtinguishers] = useState<FireExtinguisherTemplate[]>([]);
  const [editingExtinguisher, setEditingExtinguisher] = useState<string | null>(null);
  const [newExtinguisher, setNewExtinguisher] = useState<Partial<FireExtinguisherTemplate>>({
    item_no: 0,
    serial_no: '',
    location: '',
    type_size: '',
  });

  // First aid items data
  const [firstAidItems, setFirstAidItems] = useState<FirstAidItemTemplate[]>([]);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [newItem, setNewItem] = useState<Partial<FirstAidItemTemplate>>({
    item_id: '',
    item_name: '',
  });

  // First aid kits data
  const [firstAidKits, setFirstAidKits] = useState<FirstAidKitTemplate[]>([]);
  const [editingKit, setEditingKit] = useState<string | null>(null);
  const [newKit, setNewKit] = useState<Partial<FirstAidKitTemplate>>({
    kit_no: 0,
    model: '',
    model_no: '',
    kit_location: '',
  });

  // Form field configurations
  const [formFields, setFormFields] = useState<FormFieldConfiguration[]>([]);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [newField, setNewField] = useState<Partial<FormFieldConfiguration>>({
    field_key: '',
    field_label: '',
    field_type: 'text',
    display_order: 0,
    is_visible: true,
    is_required: false,
  });

  useEffect(() => {
    loadTemplates();
    if (activeSection === 'fields') {
      loadFormFields();
    }
  }, [activeTab, activeSection]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      if (activeTab === 'fire_extinguisher') {
        const response = await fetch(
          '/api/admin/inspection-item-templates?template_type=fire_extinguisher&item_type=extinguisher&is_active=true',
        );
        const result = await response.json();
        if (result.success) {
          setFireExtinguishers(result.data || []);
        }
      } else {
        // Load first aid items
        const itemsResponse = await fetch(
          '/api/admin/inspection-item-templates?template_type=first_aid&item_type=first_aid_item&is_active=true',
        );
        const itemsResult = await itemsResponse.json();
        if (itemsResult.success) {
          setFirstAidItems(itemsResult.data || []);
        }

        // Load first aid kits
        const kitsResponse = await fetch(
          '/api/admin/inspection-item-templates?template_type=first_aid&item_type=first_aid_kit&is_active=true',
        );
        const kitsResult = await kitsResponse.json();
        if (kitsResult.success) {
          setFirstAidKits(kitsResult.data || []);
        }
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFormFields = async () => {
    try {
      const response = await fetch(
        `/api/admin/form-field-configurations?form_type=${activeTab}&is_active=true`,
      );
      const result = await response.json();
      if (result.success) {
        setFormFields(result.data || []);
      }
    } catch (error) {
      console.error('Error loading form fields:', error);
    }
  };

  const handleSaveExtinguisher = async (id: string, data: Partial<FireExtinguisherTemplate>) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/inspection-item-templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (result.success) {
        await loadTemplates();
        setEditingExtinguisher(null);
      } else {
        alert('Failed to save: ' + result.error);
      }
    } catch (error) {
      console.error('Error saving extinguisher:', error);
      alert('Failed to save extinguisher');
    } finally {
      setSaving(false);
    }
  };

  const handleAddExtinguisher = async () => {
    if (!newExtinguisher.serial_no || !newExtinguisher.location) {
      alert('Please fill in all required fields');
      return;
    }
    setSaving(true);
    try {
      const response = await fetch('/api/admin/inspection-item-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_type: 'fire_extinguisher',
          item_type: 'extinguisher',
          item_no: newExtinguisher.item_no || fireExtinguishers.length + 1,
          serial_no: newExtinguisher.serial_no,
          location: newExtinguisher.location,
          type_size: newExtinguisher.type_size || '',
          display_order: fireExtinguishers.length + 1,
        }),
      });
      const result = await response.json();
      if (result.success) {
        await loadTemplates();
        setNewExtinguisher({ item_no: 0, serial_no: '', location: '', type_size: '' });
      } else {
        alert('Failed to add: ' + result.error);
      }
    } catch (error) {
      console.error('Error adding extinguisher:', error);
      alert('Failed to add extinguisher');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExtinguisher = async (id: string) => {
    if (!confirm('Are you sure you want to delete this fire extinguisher?')) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/inspection-item-templates/${id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        await loadTemplates();
      } else {
        alert('Failed to delete: ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting extinguisher:', error);
      alert('Failed to delete extinguisher');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveItem = async (id: string, data: Partial<FirstAidItemTemplate>) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/inspection-item-templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (result.success) {
        await loadTemplates();
        setEditingItem(null);
      } else {
        alert('Failed to save: ' + result.error);
      }
    } catch (error) {
      console.error('Error saving item:', error);
      alert('Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItem.item_id || !newItem.item_name) {
      alert('Please fill in all required fields');
      return;
    }
    setSaving(true);
    try {
      const response = await fetch('/api/admin/inspection-item-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_type: 'first_aid',
          item_type: 'first_aid_item',
          item_id: newItem.item_id,
          item_name: newItem.item_name,
          display_order: firstAidItems.length + 1,
        }),
      });
      const result = await response.json();
      if (result.success) {
        await loadTemplates();
        setNewItem({ item_id: '', item_name: '' });
      } else {
        alert('Failed to add: ' + result.error);
      }
    } catch (error) {
      console.error('Error adding item:', error);
      alert('Failed to add item');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this first aid item?')) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/inspection-item-templates/${id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        await loadTemplates();
      } else {
        alert('Failed to delete: ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveKit = async (id: string, data: Partial<FirstAidKitTemplate>) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/inspection-item-templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (result.success) {
        await loadTemplates();
        setEditingKit(null);
      } else {
        alert('Failed to save: ' + result.error);
      }
    } catch (error) {
      console.error('Error saving kit:', error);
      alert('Failed to save kit');
    } finally {
      setSaving(false);
    }
  };

  const handleAddKit = async () => {
    if (!newKit.model || !newKit.model_no || !newKit.kit_location) {
      alert('Please fill in all required fields');
      return;
    }
    setSaving(true);
    try {
      const response = await fetch('/api/admin/inspection-item-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_type: 'first_aid',
          item_type: 'first_aid_kit',
          kit_no: newKit.kit_no || firstAidKits.length + 1,
          model: newKit.model,
          model_no: newKit.model_no,
          kit_location: newKit.kit_location,
          display_order: firstAidKits.length + 1,
        }),
      });
      const result = await response.json();
      if (result.success) {
        await loadTemplates();
        setNewKit({ kit_no: 0, model: '', model_no: '', kit_location: '' });
      } else {
        alert('Failed to add: ' + result.error);
      }
    } catch (error) {
      console.error('Error adding kit:', error);
      alert('Failed to add kit');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteKit = async (id: string) => {
    if (!confirm('Are you sure you want to delete this first aid kit?')) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/inspection-item-templates/${id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        await loadTemplates();
      } else {
        alert('Failed to delete: ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting kit:', error);
      alert('Failed to delete kit');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveField = async (id: string, data: Partial<FormFieldConfiguration>) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/form-field-configurations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (result.success) {
        await loadFormFields();
        setEditingField(null);
      } else {
        alert('Failed to save: ' + result.error);
      }
    } catch (error) {
      console.error('Error saving field:', error);
      alert('Failed to save field');
    } finally {
      setSaving(false);
    }
  };

  const handleAddField = async () => {
    if (!newField.field_key || !newField.field_label || !newField.field_type) {
      alert('Please fill in all required fields');
      return;
    }
    setSaving(true);
    try {
      const response = await fetch('/api/admin/form-field-configurations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form_type: activeTab,
          field_key: newField.field_key,
          field_label: newField.field_label,
          field_type: newField.field_type,
          display_order: newField.display_order || formFields.length + 1,
          is_visible: newField.is_visible !== undefined ? newField.is_visible : true,
          is_required: newField.is_required !== undefined ? newField.is_required : false,
          column_width: newField.column_width,
          min_width: newField.min_width,
        }),
      });
      const result = await response.json();
      if (result.success) {
        await loadFormFields();
        setNewField({
          field_key: '',
          field_label: '',
          field_type: 'text',
          display_order: 0,
          is_visible: true,
          is_required: false,
        });
      } else {
        alert('Failed to add: ' + result.error);
      }
    } catch (error) {
      console.error('Error adding field:', error);
      alert('Failed to add field');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteField = async (id: string) => {
    if (!confirm('Are you sure you want to remove this field from the form?')) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/form-field-configurations/${id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        await loadFormFields();
      } else {
        alert('Failed to delete: ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting field:', error);
      alert('Failed to delete field');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute requiredPermission="canManageForms">
      <AdminLayout title="Form Management">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Form Management</h1>
            <p className="text-gray-600 mt-1">
              Manage fire extinguisher and first aid inspection templates
            </p>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('fire_extinguisher')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'fire_extinguisher'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Fire Extinguisher
              </button>
              <button
                onClick={() => setActiveTab('first_aid')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'first_aid'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                First Aid
              </button>
            </nav>
          </div>

          {/* Section Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveSection('items')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeSection === 'items'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Manage Items
              </button>
              <button
                onClick={() => setActiveSection('fields')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeSection === 'fields'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Manage Form Fields
              </button>
            </nav>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading templates...</p>
            </div>
          ) : (
            <>
              {/* Form Fields Management Section */}
              {activeSection === 'fields' && (
                <div className="space-y-6">
                  <div className="bg-white shadow rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h2 className="text-xl font-semibold text-gray-900">
                        Form Fields Configuration -{' '}
                        {activeTab === 'fire_extinguisher' ? 'Fire Extinguisher' : 'First Aid'}
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">
                        Manage form columns/fields. Edit field labels, IDs, types, and order.
                      </p>
                    </div>
                    <div className="p-6">
                      {/* Add New Field */}
                      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                          Add New Form Field
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Field ID (Key) *
                            </label>
                            <input
                              type="text"
                              value={newField.field_key || ''}
                              onChange={(e) =>
                                setNewField({ ...newField, field_key: e.target.value })
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                              placeholder="newField"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Field Label *
                            </label>
                            <input
                              type="text"
                              value={newField.field_label || ''}
                              onChange={(e) =>
                                setNewField({ ...newField, field_label: e.target.value })
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                              placeholder="New Field"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Field Type *
                            </label>
                            <select
                              value={newField.field_type || 'text'}
                              onChange={(e) =>
                                setNewField({ ...newField, field_type: e.target.value as any })
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="text">Text</option>
                              <option value="number">Number</option>
                              <option value="rating">Rating (√/X/NA)</option>
                              <option value="date">Date</option>
                              <option value="textarea">Textarea</option>
                              <option value="select">Select</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Display Order
                            </label>
                            <input
                              type="number"
                              value={newField.display_order || ''}
                              onChange={(e) =>
                                setNewField({
                                  ...newField,
                                  display_order: parseInt(e.target.value),
                                })
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                              placeholder="0"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={newField.is_visible !== false}
                              onChange={(e) =>
                                setNewField({ ...newField, is_visible: e.target.checked })
                              }
                              className="mr-2"
                            />
                            <label className="text-sm text-gray-700">Visible</label>
                          </div>
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={newField.is_required === true}
                              onChange={(e) =>
                                setNewField({ ...newField, is_required: e.target.checked })
                              }
                              className="mr-2"
                            />
                            <label className="text-sm text-gray-700">Required</label>
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              value={newField.column_width || ''}
                              onChange={(e) =>
                                setNewField({ ...newField, column_width: parseInt(e.target.value) })
                              }
                              className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                              placeholder="Width"
                            />
                            <input
                              type="number"
                              value={newField.min_width || ''}
                              onChange={(e) =>
                                setNewField({ ...newField, min_width: parseInt(e.target.value) })
                              }
                              className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                              placeholder="Min Width"
                            />
                          </div>
                        </div>
                        <button
                          onClick={handleAddField}
                          disabled={saving}
                          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                          {saving ? 'Adding...' : 'Add Form Field'}
                        </button>
                      </div>

                      {/* Fields Table */}
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Order
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Field ID
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Field Label
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Type
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Width
                              </th>
                              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Visible
                              </th>
                              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Required
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {formFields.map((field) => (
                              <tr key={field.id}>
                                {editingField === field.id ? (
                                  <>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <input
                                        type="number"
                                        defaultValue={field.display_order}
                                        onBlur={(e) =>
                                          handleSaveField(field.id, {
                                            display_order: parseInt(e.target.value),
                                          })
                                        }
                                        className="w-20 px-2 py-1 border border-gray-300 rounded"
                                      />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <input
                                        type="text"
                                        defaultValue={field.field_key}
                                        onBlur={(e) =>
                                          handleSaveField(field.id, { field_key: e.target.value })
                                        }
                                        className="w-full px-2 py-1 border border-gray-300 rounded"
                                      />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <input
                                        type="text"
                                        defaultValue={field.field_label}
                                        onBlur={(e) =>
                                          handleSaveField(field.id, { field_label: e.target.value })
                                        }
                                        className="w-full px-2 py-1 border border-gray-300 rounded"
                                      />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <select
                                        defaultValue={field.field_type}
                                        onBlur={(e) =>
                                          handleSaveField(field.id, {
                                            field_type: e.target.value as any,
                                          })
                                        }
                                        className="w-full px-2 py-1 border border-gray-300 rounded"
                                      >
                                        <option value="text">Text</option>
                                        <option value="number">Number</option>
                                        <option value="rating">Rating</option>
                                        <option value="date">Date</option>
                                        <option value="textarea">Textarea</option>
                                        <option value="select">Select</option>
                                      </select>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <input
                                        type="number"
                                        defaultValue={field.column_width || ''}
                                        onBlur={(e) =>
                                          handleSaveField(field.id, {
                                            column_width: parseInt(e.target.value) || undefined,
                                          })
                                        }
                                        className="w-24 px-2 py-1 border border-gray-300 rounded"
                                        placeholder="Width"
                                      />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                      <input
                                        type="checkbox"
                                        defaultChecked={field.is_visible}
                                        onChange={(e) =>
                                          handleSaveField(field.id, {
                                            is_visible: e.target.checked,
                                          })
                                        }
                                      />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                      <input
                                        type="checkbox"
                                        defaultChecked={field.is_required}
                                        onChange={(e) =>
                                          handleSaveField(field.id, {
                                            is_required: e.target.checked,
                                          })
                                        }
                                      />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                      <button
                                        onClick={() => setEditingField(null)}
                                        className="text-blue-600 hover:text-blue-900"
                                      >
                                        Done
                                      </button>
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                      {field.display_order}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                      {field.field_key}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                      {field.field_label}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                      {field.field_type}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                      {field.column_width || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                      {field.is_visible ? (
                                        <span className="text-green-600">✓</span>
                                      ) : (
                                        <span className="text-gray-400">✗</span>
                                      )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                      {field.is_required ? (
                                        <span className="text-red-600">✓</span>
                                      ) : (
                                        <span className="text-gray-400">-</span>
                                      )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                      <button
                                        onClick={() => setEditingField(field.id)}
                                        className="text-blue-600 hover:text-blue-900 mr-4"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => handleDeleteField(field.id)}
                                        className="text-red-600 hover:text-red-900"
                                      >
                                        Remove
                                      </button>
                                    </td>
                                  </>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Items Management Section */}
              {activeSection === 'items' && (
                <>
                  {/* Fire Extinguisher Tab */}
                  {activeTab === 'fire_extinguisher' && (
                    <div className="space-y-6">
                      <div className="bg-white shadow rounded-lg">
                        <div className="px-6 py-4 border-b border-gray-200">
                          <h2 className="text-xl font-semibold text-gray-900">
                            Fire Extinguisher Items
                          </h2>
                          <p className="text-sm text-gray-600 mt-1">
                            Manage fire extinguisher items that appear in inspection forms
                          </p>
                        </div>
                        <div className="p-6">
                          {/* Add New Extinguisher */}
                          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">
                              Add New Fire Extinguisher
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  ID Number
                                </label>
                                <input
                                  type="number"
                                  value={newExtinguisher.item_no || ''}
                                  onChange={(e) =>
                                    setNewExtinguisher({
                                      ...newExtinguisher,
                                      item_no: parseInt(e.target.value),
                                    })
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="1"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Serial No *
                                </label>
                                <input
                                  type="text"
                                  value={newExtinguisher.serial_no || ''}
                                  onChange={(e) =>
                                    setNewExtinguisher({
                                      ...newExtinguisher,
                                      serial_no: e.target.value,
                                    })
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="FF022018Y002311"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Location *
                                </label>
                                <input
                                  type="text"
                                  value={newExtinguisher.location || ''}
                                  onChange={(e) =>
                                    setNewExtinguisher({
                                      ...newExtinguisher,
                                      location: e.target.value,
                                    })
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="Ground Floor"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Type/Size
                                </label>
                                <input
                                  type="text"
                                  value={newExtinguisher.type_size || ''}
                                  onChange={(e) =>
                                    setNewExtinguisher({
                                      ...newExtinguisher,
                                      type_size: e.target.value,
                                    })
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="9"
                                />
                              </div>
                            </div>
                            <button
                              onClick={handleAddExtinguisher}
                              disabled={saving}
                              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                            >
                              {saving ? 'Adding...' : 'Add Fire Extinguisher'}
                            </button>
                          </div>

                          {/* Extinguishers Table */}
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    ID No
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Serial No
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Location
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Type/Size
                                  </th>
                                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {fireExtinguishers.map((ext) => (
                                  <tr key={ext.id}>
                                    {editingExtinguisher === ext.id ? (
                                      <>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <input
                                            type="number"
                                            defaultValue={ext.item_no}
                                            onBlur={(e) =>
                                              handleSaveExtinguisher(ext.id, {
                                                item_no: parseInt(e.target.value),
                                              })
                                            }
                                            className="w-20 px-2 py-1 border border-gray-300 rounded"
                                          />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <input
                                            type="text"
                                            defaultValue={ext.serial_no}
                                            onBlur={(e) =>
                                              handleSaveExtinguisher(ext.id, {
                                                serial_no: e.target.value,
                                              })
                                            }
                                            className="w-full px-2 py-1 border border-gray-300 rounded"
                                          />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <input
                                            type="text"
                                            defaultValue={ext.location}
                                            onBlur={(e) =>
                                              handleSaveExtinguisher(ext.id, {
                                                location: e.target.value,
                                              })
                                            }
                                            className="w-full px-2 py-1 border border-gray-300 rounded"
                                          />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <input
                                            type="text"
                                            defaultValue={ext.type_size}
                                            onBlur={(e) =>
                                              handleSaveExtinguisher(ext.id, {
                                                type_size: e.target.value,
                                              })
                                            }
                                            className="w-full px-2 py-1 border border-gray-300 rounded"
                                          />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                          <button
                                            onClick={() => setEditingExtinguisher(null)}
                                            className="text-blue-600 hover:text-blue-900"
                                          >
                                            Done
                                          </button>
                                        </td>
                                      </>
                                    ) : (
                                      <>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                          {ext.item_no}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                          {ext.serial_no}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                          {ext.location}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                          {ext.type_size}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                          <button
                                            onClick={() => setEditingExtinguisher(ext.id)}
                                            className="text-blue-600 hover:text-blue-900 mr-4"
                                          >
                                            Edit
                                          </button>
                                          <button
                                            onClick={() => handleDeleteExtinguisher(ext.id)}
                                            className="text-red-600 hover:text-red-900"
                                          >
                                            Delete
                                          </button>
                                        </td>
                                      </>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* First Aid Tab */}
                  {activeTab === 'first_aid' && (
                    <div className="space-y-6">
                      {/* First Aid Items */}
                      <div className="bg-white shadow rounded-lg">
                        <div className="px-6 py-4 border-b border-gray-200">
                          <h2 className="text-xl font-semibold text-gray-900">First Aid Items</h2>
                          <p className="text-sm text-gray-600 mt-1">
                            Manage first aid items that appear in inspection forms
                          </p>
                        </div>
                        <div className="p-6">
                          {/* Add New Item */}
                          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">
                              Add New First Aid Item
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Item ID *
                                </label>
                                <input
                                  type="text"
                                  value={newItem.item_id || ''}
                                  onChange={(e) =>
                                    setNewItem({ ...newItem, item_id: e.target.value })
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="item29"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Item Name *
                                </label>
                                <input
                                  type="text"
                                  value={newItem.item_name || ''}
                                  onChange={(e) =>
                                    setNewItem({ ...newItem, item_name: e.target.value })
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="New Item Name"
                                />
                              </div>
                            </div>
                            <button
                              onClick={handleAddItem}
                              disabled={saving}
                              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                            >
                              {saving ? 'Adding...' : 'Add First Aid Item'}
                            </button>
                          </div>

                          {/* Items Table */}
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Item ID
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Item Name
                                  </th>
                                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {firstAidItems.map((item) => (
                                  <tr key={item.id}>
                                    {editingItem === item.id ? (
                                      <>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <input
                                            type="text"
                                            defaultValue={item.item_id}
                                            onBlur={(e) =>
                                              handleSaveItem(item.id, { item_id: e.target.value })
                                            }
                                            className="w-full px-2 py-1 border border-gray-300 rounded"
                                          />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <input
                                            type="text"
                                            defaultValue={item.item_name}
                                            onBlur={(e) =>
                                              handleSaveItem(item.id, { item_name: e.target.value })
                                            }
                                            className="w-full px-2 py-1 border border-gray-300 rounded"
                                          />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                          <button
                                            onClick={() => setEditingItem(null)}
                                            className="text-blue-600 hover:text-blue-900"
                                          >
                                            Done
                                          </button>
                                        </td>
                                      </>
                                    ) : (
                                      <>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                          {item.item_id}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                          {item.item_name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                          <button
                                            onClick={() => setEditingItem(item.id)}
                                            className="text-blue-600 hover:text-blue-900 mr-4"
                                          >
                                            Edit
                                          </button>
                                          <button
                                            onClick={() => handleDeleteItem(item.id)}
                                            className="text-red-600 hover:text-red-900"
                                          >
                                            Delete
                                          </button>
                                        </td>
                                      </>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>

                      {/* First Aid Kits */}
                      <div className="bg-white shadow rounded-lg">
                        <div className="px-6 py-4 border-b border-gray-200">
                          <h2 className="text-xl font-semibold text-gray-900">First Aid Kits</h2>
                          <p className="text-sm text-gray-600 mt-1">
                            Manage first aid kits that appear in inspection forms
                          </p>
                        </div>
                        <div className="p-6">
                          {/* Add New Kit */}
                          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">
                              Add New First Aid Kit
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Kit No
                                </label>
                                <input
                                  type="number"
                                  value={newKit.kit_no || ''}
                                  onChange={(e) =>
                                    setNewKit({ ...newKit, kit_no: parseInt(e.target.value) })
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="1"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Model *
                                </label>
                                <input
                                  type="text"
                                  value={newKit.model || ''}
                                  onChange={(e) => setNewKit({ ...newKit, model: e.target.value })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="PVC Large"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Model No *
                                </label>
                                <input
                                  type="text"
                                  value={newKit.model_no || ''}
                                  onChange={(e) =>
                                    setNewKit({ ...newKit, model_no: e.target.value })
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="P-3"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Location *
                                </label>
                                <input
                                  type="text"
                                  value={newKit.kit_location || ''}
                                  onChange={(e) =>
                                    setNewKit({ ...newKit, kit_location: e.target.value })
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="Ground Floor"
                                />
                              </div>
                            </div>
                            <button
                              onClick={handleAddKit}
                              disabled={saving}
                              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                            >
                              {saving ? 'Adding...' : 'Add First Aid Kit'}
                            </button>
                          </div>

                          {/* Kits Table */}
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Kit No
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Model
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Model No
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Location
                                  </th>
                                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {firstAidKits.map((kit) => (
                                  <tr key={kit.id}>
                                    {editingKit === kit.id ? (
                                      <>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <input
                                            type="number"
                                            defaultValue={kit.kit_no}
                                            onBlur={(e) =>
                                              handleSaveKit(kit.id, {
                                                kit_no: parseInt(e.target.value),
                                              })
                                            }
                                            className="w-20 px-2 py-1 border border-gray-300 rounded"
                                          />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <input
                                            type="text"
                                            defaultValue={kit.model}
                                            onBlur={(e) =>
                                              handleSaveKit(kit.id, { model: e.target.value })
                                            }
                                            className="w-full px-2 py-1 border border-gray-300 rounded"
                                          />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <input
                                            type="text"
                                            defaultValue={kit.model_no}
                                            onBlur={(e) =>
                                              handleSaveKit(kit.id, { model_no: e.target.value })
                                            }
                                            className="w-full px-2 py-1 border border-gray-300 rounded"
                                          />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <input
                                            type="text"
                                            defaultValue={kit.kit_location}
                                            onBlur={(e) =>
                                              handleSaveKit(kit.id, {
                                                kit_location: e.target.value,
                                              })
                                            }
                                            className="w-full px-2 py-1 border border-gray-300 rounded"
                                          />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                          <button
                                            onClick={() => setEditingKit(null)}
                                            className="text-blue-600 hover:text-blue-900"
                                          >
                                            Done
                                          </button>
                                        </td>
                                      </>
                                    ) : (
                                      <>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                          {kit.kit_no}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                          {kit.model}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                          {kit.model_no}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                          {kit.kit_location}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                          <button
                                            onClick={() => setEditingKit(kit.id)}
                                            className="text-blue-600 hover:text-blue-900 mr-4"
                                          >
                                            Edit
                                          </button>
                                          <button
                                            onClick={() => handleDeleteKit(kit.id)}
                                            className="text-red-600 hover:text-red-900"
                                          >
                                            Delete
                                          </button>
                                        </td>
                                      </>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
};

export default FormTemplatesManagement;
