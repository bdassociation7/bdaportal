/**
 * Trainer Code of Conduct
 * Placeholder page — content to be added by admin.
 */
import { FileText, ShieldCheck } from 'lucide-react';

export default function TrainerCodeOfConduct() {
  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-[#0d1f4e] flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#0d1f4e]">Trainer Code of Conduct</h1>
            <p className="text-slate-500 text-sm">Standards and responsibilities for BDA Certified Instructors</p>
          </div>
        </div>
      </div>

      {/* Content placeholder */}
      <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-slate-400" />
        </div>
        <h2 className="text-lg font-semibold text-slate-700 mb-2">Content Coming Soon</h2>
        <p className="text-slate-500 text-sm max-w-md mx-auto">
          The Trainer Code of Conduct document is being prepared by the BDA team.
          It will outline the professional standards, responsibilities, and ethical
          guidelines expected of all BDA Certified Instructors.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-[#0d1f4e]/5 rounded-lg text-[#0d1f4e] text-sm font-medium">
          <ShieldCheck className="w-4 h-4" />
          Check back soon
        </div>
      </div>
    </div>
  );
}
