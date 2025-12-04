// src/pages/migrate-to-r2.tsx - Web-based migration tool for moving images to R2
import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { storage } from '../utils/storage';
import { useAuth } from '../hooks/useAuth';

interface MigrationStats {
  totalInspections: number;
  processedInspections: number;
  totalImages: number;
  uploadedImages: number;
  failedImages: number;
  currentKey: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  error?: string;
}

export default function MigrateToR2() {
  const router = useRouter();
  const { user } = useAuth();
  const [stats, setStats] = useState<MigrationStats>({
    totalInspections: 0,
    processedInspections: 0,
    totalImages: 0,
    uploadedImages: 0,
    failedImages: 0,
    currentKey: '',
    status: 'idle',
  });

  // Check if user is admin
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">Only administrators can access the migration tool.</p>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  const isBase64Image = (data: string): boolean => {
    return !!(data && typeof data === 'string' && data.startsWith('data:image'));
  };

  const uploadImage = async (base64Data: string, folder: string): Promise<string> => {
    try {
      const response = await fetch('/api/upload/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Data, folder }),
      });

      const result = await response.json();
      return result.success ? result.url : base64Data;
    } catch (error) {
      console.error('Upload failed:', error);
      return base64Data; // Return original on failure
    }
  };

  const migrateInspection = async (
    inspection: any,
    type: string,
    updateStats: (uploaded: number, failed: number) => void
  ): Promise<any> => {
    let uploaded = 0;
    let failed = 0;

    // Migrate observation photos
    if (inspection.observations && Array.isArray(inspection.observations)) {
      for (const obs of inspection.observations) {
        if (obs.photos && Array.isArray(obs.photos)) {
          const newPhotos: string[] = [];
          for (const photo of obs.photos) {
            if (isBase64Image(photo)) {
              const url = await uploadImage(photo, `inspections/${type}`);
              newPhotos.push(url);
              if (url !== photo) {
                uploaded++;
              } else {
                failed++;
              }
            } else {
              newPhotos.push(photo);
            }
          }
          obs.photos = newPhotos;
        }
      }
    }

    // Migrate signature
    if (inspection.signature && isBase64Image(inspection.signature)) {
      const url = await uploadImage(inspection.signature, 'signatures');
      inspection.signature = url;
      if (url !== inspection.signature) {
        uploaded++;
      } else {
        failed++;
      }
    }

    updateStats(uploaded, failed);
    return inspection;
  };

  const startMigration = async () => {
    setStats({
      totalInspections: 0,
      processedInspections: 0,
      totalImages: 0,
      uploadedImages: 0,
      failedImages: 0,
      currentKey: '',
      status: 'running',
    });

    const storageKeys = [
      { key: 'fireExtinguisherInspections', type: 'fire-extinguisher' },
      { key: 'firstAidInspections', type: 'first-aid' },
      { key: 'hseObservations', type: 'hse-observation' },
      { key: 'hseInspections', type: 'hse-inspection' },
    ];

    try {
      for (const { key, type } of storageKeys) {
        setStats(prev => ({ ...prev, currentKey: key }));

        const inspections = storage.load<any[]>(key, []);
        if (inspections.length === 0) continue;

        setStats(prev => ({
          ...prev,
          totalInspections: prev.totalInspections + inspections.length,
        }));

        const migratedInspections = [];

        for (const inspection of inspections) {
          const updateStats = (uploaded: number, failed: number) => {
            setStats(prev => ({
              ...prev,
              totalImages: prev.totalImages + uploaded + failed,
              uploadedImages: prev.uploadedImages + uploaded,
              failedImages: prev.failedImages + failed,
            }));
          };

          const migrated = await migrateInspection(inspection, type, updateStats);
          migratedInspections.push(migrated);

          setStats(prev => ({
            ...prev,
            processedInspections: prev.processedInspections + 1,
          }));
        }

        // Save migrated data back to localStorage
        storage.save(key, migratedInspections);
      }

      setStats(prev => ({
        ...prev,
        status: 'completed',
        currentKey: '',
      }));
    } catch (error) {
      setStats(prev => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Migrate Images to Cloudflare R2
          </h1>
          <p className="text-gray-600 mb-6">
            This tool will migrate all existing inspection images from base64 (stored in browser)
            to Cloudflare R2 storage.
          </p>

          {/* Status Card */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h2 className="font-semibold text-blue-900 mb-2">Migration Status</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-700">Status:</span>
                <span className={`font-semibold ${
                  stats.status === 'completed' ? 'text-green-600' :
                  stats.status === 'error' ? 'text-red-600' :
                  stats.status === 'running' ? 'text-blue-600' :
                  'text-gray-600'
                }`}>
                  {stats.status.toUpperCase()}
                </span>
              </div>
              {stats.currentKey && (
                <div className="flex justify-between">
                  <span className="text-gray-700">Processing:</span>
                  <span className="font-mono text-xs">{stats.currentKey}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-700">Inspections:</span>
                <span className="font-semibold">
                  {stats.processedInspections} / {stats.totalInspections}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Images Uploaded:</span>
                <span className="font-semibold text-green-600">{stats.uploadedImages}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Images Failed:</span>
                <span className="font-semibold text-red-600">{stats.failedImages}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Total Images:</span>
                <span className="font-semibold">{stats.totalImages}</span>
              </div>
            </div>
            {stats.error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                <strong>Error:</strong> {stats.error}
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Before You Start</h3>
            <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
              <li>Ensure R2 credentials are configured in your .env.local file</li>
              <li>This process may take several minutes depending on the number of images</li>
              <li>Do not close this tab while migration is in progress</li>
              <li>Original data will be preserved if any upload fails</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={startMigration}
              disabled={stats.status === 'running'}
              className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-colors ${
                stats.status === 'running'
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {stats.status === 'running' ? 'Migration in Progress...' : 'Start Migration'}
            </button>

            <button
              onClick={() => router.push('/admin')}
              className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>

          {stats.status === 'completed' && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-2">✅ Migration Completed!</h3>
              <p className="text-sm text-green-800">
                Successfully migrated {stats.uploadedImages} images to Cloudflare R2.
                Your app will now use R2 URLs instead of base64 data, significantly reducing
                Supabase egress costs.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
