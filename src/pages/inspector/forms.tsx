// src/pages/inspector/forms.tsx - Month and Year on Same Line (Smaller)
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import ProtectedRoute from '@/shared/components/ProtectedRoute';
import InspectorLayout from '@/roles/inspector/layouts/InspectorLayout';
import { storage } from '@/utils/storage';
import { useAuth } from '@/hooks/useAuth';
import { Trash2 } from 'lucide-react';

interface FormStatus {
  name: string;
  completed: boolean;
  lastCompleted?: string;
  route: string;
}

const InspectorForms: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [formStatuses, setFormStatuses] = useState<FormStatus[]>([]);

  useEffect(() => {
    loadFormStatuses();
  }, [user]);

  const loadFormStatuses = () => {
    if (!user) return;
    try {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const fireInspections = storage.load<any[]>('fire_extinguisher_inspections', []);
      const firstAidInspections = storage.load<any[]>('first_aid_inspections', []);
      const manhoursReports = storage.load<any[]>('manhours_reports', []);
      const hseInspections = storage.load<any[]>('hse_inspections', []);
      const hseObservations = storage.load<any[]>('hse_observations', []);

      const allForms: FormStatus[] = [
        { name: 'Fire Extinguisher', completed: false, route: '/fire-extinguisher' },
        { name: 'First Aid Items', completed: false, route: '/first-aid' },
        {
          name: 'Monthly Safety & Health Man-hours Report',
          completed: false,
          route: '/manhours-report',
        },
        {
          name: 'Health, Safety & Environment (HSE) Inspection',
          completed: false,
          route: '/hse-inspection',
        },
        { name: 'Observation Form', completed: false, route: '/hse-observation' },
      ];

      const monthlyFire = fireInspections.filter((i: any) => {
        const inspectionDate = new Date(i.createdAt);
        return (
          (i.inspectorId === user.id || i.inspectedBy === user.name) &&
          inspectionDate.getMonth() === currentMonth &&
          inspectionDate.getFullYear() === currentYear
        );
      });
      const monthlyFirstAid = firstAidInspections.filter((i: any) => {
        const inspectionDate = new Date(i.createdAt);
        return (
          (i.inspectorId === user.id || i.inspectedBy === user.name) &&
          inspectionDate.getMonth() === currentMonth &&
          inspectionDate.getFullYear() === currentYear
        );
      });
      const monthlyManhours = manhoursReports.filter((i: any) => {
        const inspectionDate = new Date(i.createdAt);
        return (
          (i.inspectorId === user.id || i.inspectedBy === user.name) &&
          inspectionDate.getMonth() === currentMonth &&
          inspectionDate.getFullYear() === currentYear
        );
      });
      const monthlyHSE = hseInspections.filter((i: any) => {
        const inspectionDate = new Date(i.createdAt);
        return (
          (i.inspectorId === user.id || i.inspectedBy === user.name) &&
          inspectionDate.getMonth() === currentMonth &&
          inspectionDate.getFullYear() === currentYear
        );
      });
      const monthlyObservations = hseObservations.filter((i: any) => {
        const inspectionDate = new Date(i.createdAt);
        return (
          (i.inspectorId === user.id || i.inspectedBy === user.name) &&
          inspectionDate.getMonth() === currentMonth &&
          inspectionDate.getFullYear() === currentYear
        );
      });

      if (monthlyFire.length > 0) {
        allForms[0].completed = true;
        allForms[0].lastCompleted = monthlyFire[monthlyFire.length - 1].createdAt;
      }
      if (monthlyFirstAid.length > 0) {
        allForms[1].completed = true;
        allForms[1].lastCompleted = monthlyFirstAid[monthlyFirstAid.length - 1].createdAt;
      }
      if (monthlyManhours.length > 0) {
        allForms[2].completed = true;
        allForms[2].lastCompleted = monthlyManhours[monthlyManhours.length - 1].createdAt;
      }
      if (monthlyHSE.length > 0) {
        allForms[3].completed = true;
        allForms[3].lastCompleted = monthlyHSE[monthlyHSE.length - 1].createdAt;
      }
      if (monthlyObservations.length > 0) {
        allForms[4].completed = true;
        allForms[4].lastCompleted = monthlyObservations[monthlyObservations.length - 1].createdAt;
      }

      setFormStatuses(allForms);
    } catch (error) {
      console.error('Error loading form statuses:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleDeleteForm = (formIndex: number) => {
    if (!user) return;

    const confirmDelete = window.confirm(
      'Are you sure you want to delete this form? This action cannot be undone.',
    );
    if (!confirmDelete) return;

    try {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const storageKeys = [
        'fire_extinguisher_inspections',
        'first_aid_inspections',
        'manhours_reports',
        'hse_inspections',
        'hse_observations',
      ];

      const storageKey = storageKeys[formIndex];
      const inspections = storage.load<any[]>(storageKey, []);

      const filteredInspections = inspections.filter((i: any) => {
        const inspectionDate = new Date(i.createdAt);
        const isCurrentMonth =
          inspectionDate.getMonth() === currentMonth &&
          inspectionDate.getFullYear() === currentYear;
        const isUserInspection = i.inspectorId === user.id || i.inspectedBy === user.name;

        return !(isCurrentMonth && isUserInspection);
      });

      storage.save(storageKey, filteredInspections);
      loadFormStatuses();
    } catch (error) {
      console.error('Error deleting form:', error);
      alert('Failed to delete form. Please try again.');
    }
  };

  // Only count Fire Extinguisher and First Aid Items as pending
  const pendingCount = formStatuses.filter(
    (f, index) => !f.completed && (index === 0 || index === 1),
  ).length;

  return (
    <ProtectedRoute requiredPermission="canCreateInspections">
      <InspectorLayout title="Forms">
        <div className="p-3 space-y-4 max-w-md mx-auto">
          {/* Page Header */}
          <div className="text-center mb-4">
            <h1 className="text-base font-semibold text-gray-800">
              {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              {pendingCount} pending • {formStatuses.filter((f) => f.completed).length} completed
            </p>
          </div>

          {/* Onsite Inspection Forms */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3 border-b border-gray-200 pb-2">
              Onsite Inspection Forms
            </h2>
            <div className="space-y-3">
              {formStatuses.slice(0, 2).map((form, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border-l-4 ${
                    form.completed ? 'border-green-500 bg-green-50' : 'border-amber-500 bg-amber-50'
                  } flex items-center justify-between`}
                >
                  <div onClick={() => router.push(form.route)} className="flex-1 cursor-pointer">
                    <p className="text-sm font-medium text-gray-800">{form.name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {form.completed ? (
                        <>Completed: {formatDate(form.lastCompleted!)}</>
                      ) : (
                        <span className="text-amber-600 font-medium">Pending</span>
                      )}
                    </p>
                  </div>
                  {form.completed && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteForm(index);
                      }}
                      className="ml-3 p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                      title="Delete this form"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Report Form */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3 border-b border-gray-200 pb-2">
              Report Form
            </h2>
            <div className="space-y-3">
              {formStatuses.slice(2, 3).map((form, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border-l-4 ${
                    form.completed ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50'
                  } flex items-center justify-between`}
                >
                  <div onClick={() => router.push(form.route)} className="flex-1 cursor-pointer">
                    <p className="text-sm font-medium text-gray-800">{form.name}</p>
                    {form.completed && (
                      <p className="text-xs text-gray-500 mt-1">
                        Completed: {formatDate(form.lastCompleted!)}
                      </p>
                    )}
                  </div>
                  {form.completed && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteForm(index + 2);
                      }}
                      className="ml-3 p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                      title="Delete this form"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Offsite Inspection Forms */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3 border-b border-gray-200 pb-2">
              Offsite Inspection Forms
            </h2>
            <div className="space-y-3">
              {formStatuses.slice(3, 5).map((form, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border-l-4 ${
                    form.completed ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50'
                  } flex items-center justify-between`}
                >
                  <div onClick={() => router.push(form.route)} className="flex-1 cursor-pointer">
                    <p className="text-sm font-medium text-gray-800">{form.name}</p>
                    {form.completed && (
                      <p className="text-xs text-gray-500 mt-1">
                        Completed: {formatDate(form.lastCompleted!)}
                      </p>
                    )}
                  </div>
                  {form.completed && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteForm(index + 3);
                      }}
                      className="ml-3 p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                      title="Delete this form"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </InspectorLayout>
    </ProtectedRoute>
  );
};

export default InspectorForms;
