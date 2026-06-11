import { Lock, ArrowLeft, AlertCircle } from 'lucide-react';
import type { CurriculumModule } from '@/entities/curriculum';

interface ModuleLockedProps {
  module: CurriculumModule;
  prerequisiteModule?: CurriculumModule;
  onBack: () => void;
}

/**
 * Module Locked Component — English Only
 * Shown when user tries to access a locked module
 */
export function ModuleLocked({
  module,
  prerequisiteModule,
  onBack,
}: ModuleLockedProps) {
  const getCompetencyName = (mod: CurriculumModule) => {
    return mod.competency_name || 'Untitled Module';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-6">
            <Lock className="w-10 h-10 text-gray-400" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-3">Module Locked</h2>

          <p className="text-gray-600 mb-6">
            This module is currently locked. You need to complete the previous module first.
          </p>

          {prerequisiteModule && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900 mb-1">Complete First:</p>
                  <p className="text-gray-700">
                    Module {prerequisiteModule.order_index}: {getCompetencyName(prerequisiteModule)}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={onBack}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
            >
              <ArrowLeft className="w-5 h-5" />
              Return to Curriculum
            </button>

            <p className="text-sm text-gray-500">
              Modules must be completed in sequential order
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
