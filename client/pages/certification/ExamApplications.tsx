import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Ticket,
  ArrowRight,
  Filter,
  ShoppingBag,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useMergedVouchers } from '@/entities/quiz';
import type { CertificationType } from '@/entities/quiz/quiz.types';
import type { VoucherDisplayInfo } from '@/entities/quiz/voucher.utils';
import { VoucherCard } from './components/VoucherCard';

/**
 * ExamApplications Page - Voucher Manager
 * Single source of truth for managing exam vouchers
 * Users select a voucher here, then proceed to certification-exams
 */

export default function ExamApplications() {
  const navigate = useNavigate();

  // Filters
  const [certTypeFilter, setCertTypeFilter] = useState<CertificationType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<VoucherDisplayInfo['status'] | 'all'>('all');

  // Selected voucher
  const [selectedVoucherId, setSelectedVoucherId] = useState<string | null>(null);

  // Fetch merged vouchers (direct + ECP)
  const { vouchers, activeVouchers, counts, isLoading, error } = useMergedVouchers();

  // Filter vouchers based on selected filters
  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      if (certTypeFilter !== 'all' && v.certification_type !== certTypeFilter) return false;
      if (statusFilter !== 'all' && v.displayInfo.status !== statusFilter) return false;
      return true;
    });
  }, [vouchers, certTypeFilter, statusFilter]);

  // Get selected voucher details
  const selectedVoucher = useMemo(() => {
    if (!selectedVoucherId) return null;
    return vouchers.find((v) => v.id === selectedVoucherId) || null;
  }, [selectedVoucherId, vouchers]);

  // Handle proceed to exam
  const handleProceedToExam = () => {
    if (selectedVoucherId && selectedVoucher?.displayInfo.canUse) {
      navigate(`/certification-exams?voucher_id=${selectedVoucherId}`);
    }
  };

  // Handle voucher selection
  const handleSelectVoucher = (voucherId: string) => {
    setSelectedVoucherId((prev) => (prev === voucherId ? null : voucherId));
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 via-royal-600 to-navy-800 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Ticket className="h-8 w-8" />
          My Exam Vouchers
        </h1>
        <p className="mt-2 opacity-90">
          Select a voucher to proceed to the official certification exam
        </p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{counts.total}</p>
            <p className="text-sm text-gray-600">Active Vouchers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{counts.CP}</p>
            <p className="text-sm text-gray-600">BDA-CP™ Vouchers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-purple-600">{counts.SCP}</p>
            <p className="text-sm text-gray-600">BDA-SCP™ Vouchers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-gray-500">{vouchers.length}</p>
            <p className="text-sm text-gray-600">Total (All Status)</p>
          </CardContent>
        </Card>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Vouchers</AlertTitle>
          <AlertDescription>
            Failed to load your vouchers. Please refresh the page or try again later.
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Filter className="h-5 w-5 text-gray-500" />
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                value={certTypeFilter}
                onValueChange={(value) => setCertTypeFilter(value as CertificationType | 'all')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Certification Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Certification Types</SelectItem>
                  <SelectItem value="CP">BDA-CP™ - BDA Certified Professional</SelectItem>
                  <SelectItem value="SCP">BDA-SCP™ - BDA Senior Certified Professional</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as VoucherDisplayInfo['status'] | 'all')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Voucher Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active (Usable)</SelectItem>
                  <SelectItem value="used">Used</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vouchers List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-600">Loading your vouchers...</p>
        </div>
      ) : filteredVouchers.length === 0 ? (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-12 text-center">
            <Ticket className="h-16 w-16 text-orange-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-orange-900 mb-2">
              {vouchers.length === 0 ? 'No Vouchers Found' : 'No Matching Vouchers'}
            </h3>
            <p className="text-orange-800 mb-4">
              {vouchers.length === 0
                ? "You don't have any exam vouchers yet. Purchase a certification book from our store or contact your ECP partner."
                : 'No vouchers match your current filters. Try adjusting the filters above.'}
            </p>
            {vouchers.length === 0 && (
              <Button
                variant="outline"
                className="border-orange-300 text-orange-900 hover:bg-orange-100"
                onClick={() => window.open('https://bda-global.org/en/store/certifications/', '_blank')}
              >
                <ShoppingBag className="h-4 w-4 mr-2" />
                Visit Store
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVouchers.map((voucher) => {
            // Count active vouchers of the same cert type to determine Transfer button visibility
            const totalActiveVouchersSameCert = activeVouchers.filter(
              (v) => v.certification_type === voucher.certification_type
            ).length;
            return (
            <VoucherCard
              key={voucher.id}
              voucher={voucher}
              isSelected={selectedVoucherId === voucher.id}
              onSelect={() => handleSelectVoucher(voucher.id)}
              disabled={!voucher.displayInfo.canUse}
              totalActiveVouchersSameCert={totalActiveVouchersSameCert}
            />
            );
          })}
        
        </div>
      )}

      {/* Selected Voucher Action Bar (Fixed at bottom) */}
      {selectedVoucher && selectedVoucher.displayInfo.canUse && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-semibold text-gray-900">
                  Selected: <span className="font-mono">{selectedVoucher.code}</span>
                </p>
                <p className="text-sm text-gray-600">
                  BDA-{selectedVoucher.certification_type}™ • {selectedVoucher.displayInfo.sourceLabel}
                </p>
              </div>
            </div>
            <Button
              size="lg"
              onClick={handleProceedToExam}
              className="bg-green-600 hover:bg-green-700"
            >
              Proceed to Official Exam
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Help Text */}
      {activeVouchers.length > 0 && !selectedVoucherId && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">How to Take Your Exam</h3>
                <p className="text-sm text-blue-800">
                  Click on an active voucher to select it, then use the "Proceed to Official Exam"
                  button to schedule or take your certification exam.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

ExamApplications.displayName = 'ExamApplications';
