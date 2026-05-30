/**
 * WorkspaceSwitcher — Landing page for dual_partner users.
 * Allows them to navigate to either ECP or PDP workspace.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/app/providers/AuthProvider';
import { Award, GraduationCap, ArrowRight, Shield, Users, BookOpen, Ticket, BarChart3 } from 'lucide-react';

export default function WorkspaceSwitcher() {
  const { user } = useAuthContext();
  const navigate = useNavigate();

  const firstName = user?.profile?.first_name || 'Partner';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#0d2b5e] rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-[#0d2b5e] text-sm">BDA Partner Portal</span>
          </div>
          <span className="text-xs text-gray-500 bg-indigo-50 border border-indigo-200 text-indigo-700 px-3 py-1 rounded-full font-medium">
            Dual Partner
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Welcome */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-[#0d2b5e] mb-3">
            Welcome back, {firstName}
          </h1>
          <p className="text-gray-500 text-base max-w-xl mx-auto">
            You hold both an <strong>ECP</strong> and a <strong>PDP</strong> partnership with BDA.
            Select the workspace you want to manage below.
          </p>
        </div>

        {/* Workspace Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {/* ECP Card */}
          <div
            onClick={() => navigate('/ecp/dashboard')}
            className="group bg-white rounded-2xl border border-gray-200 p-8 cursor-pointer hover:border-[#0d2b5e] hover:shadow-lg transition-all duration-200"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="w-14 h-14 bg-[#0d2b5e] rounded-xl flex items-center justify-center">
                <Award className="w-7 h-7 text-white" />
              </div>
              <span className="text-xs font-semibold text-[#0d2b5e] bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
                Active
              </span>
            </div>

            <h2 className="text-xl font-bold text-[#0d2b5e] mb-2">
              ECP Workspace
            </h2>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              Endorsed Certification Partner — Manage candidates, training batches, vouchers, and exam preparation programmes.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { icon: Users, label: 'Candidates' },
                { icon: Ticket, label: 'Vouchers' },
                { icon: BarChart3, label: 'Reports' },
                { icon: BookOpen, label: 'Learning Kit' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-xs text-gray-500">
                  <Icon className="w-3.5 h-3.5 text-[#0d2b5e]" />
                  <span>{label}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 text-[#0d2b5e] font-semibold text-sm group-hover:gap-3 transition-all">
              Enter ECP Workspace
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* PDP Card */}
          <div
            onClick={() => navigate('/pdp/dashboard')}
            className="group bg-white rounded-2xl border border-gray-200 p-8 cursor-pointer hover:border-[#0d2b5e] hover:shadow-lg transition-all duration-200"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="w-14 h-14 bg-[#1a4a8a] rounded-xl flex items-center justify-center">
                <GraduationCap className="w-7 h-7 text-white" />
              </div>
              <span className="text-xs font-semibold text-[#0d2b5e] bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
                Active
              </span>
            </div>

            <h2 className="text-xl font-bold text-[#0d2b5e] mb-2">
              PDP Workspace
            </h2>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              Professional Development Partner — Submit and manage accredited CPD programmes, annual reports, and recertification activities.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { icon: BookOpen, label: 'Programmes' },
                { icon: BarChart3, label: 'Annual Report' },
                { icon: Award, label: 'Accreditation' },
                { icon: Users, label: 'Enrollments' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-xs text-gray-500">
                  <Icon className="w-3.5 h-3.5 text-[#1a4a8a]" />
                  <span>{label}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 text-[#0d2b5e] font-semibold text-sm group-hover:gap-3 transition-all">
              Enter PDP Workspace
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-[#0d2b5e] rounded-xl p-5 flex items-start gap-4">
          <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm mb-1">Dual Partnership Active</p>
            <p className="text-blue-200 text-xs leading-relaxed">
              Your account is linked to both ECP and PDP licences. You can switch between workspaces at any time using the sidebar navigation. All data is shared under a single account.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
