/**
 * ECP (Exclusive Certification Partner) React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ECPService } from './ecp.service';
import type {
  BatchFilters,
  TrainerFilters,
  TraineeFilters,
  CreateBatchDTO,
  UpdateBatchDTO,
  CreateTrainerDTO,
  UpdateTrainerDTO,
  CreateTraineeDTO,
  UpdateTraineeDTO,
  BulkTraineeUpload,
  CreateLicenseRequestDTO,
  VoucherFilters,
  CreateVoucherRequestDTO,
  AssignVoucherDTO,
  ECPToolkitCategory,
  CreateECPToolkitItemDTO,
  UpdateECPToolkitItemDTO,
} from './ecp.types';
import { useToast } from '@/components/ui/use-toast';

// Query keys
export const ecpKeys = {
  all: ['ecp'] as const,
  dashboard: () => [...ecpKeys.all, 'dashboard'] as const,
  batches: () => [...ecpKeys.all, 'batches'] as const,
  batch: (id: string) => [...ecpKeys.batches(), id] as const,
  trainers: () => [...ecpKeys.all, 'trainers'] as const,
  trainer: (id: string) => [...ecpKeys.trainers(), id] as const,
  trainees: () => [...ecpKeys.all, 'trainees'] as const,
  trainee: (id: string) => [...ecpKeys.trainees(), id] as const,
  vouchers: () => [...ecpKeys.all, 'vouchers'] as const,
  metrics: (type: string) => [...ecpKeys.all, 'metrics', type] as const,
  license: () => [...ecpKeys.all, 'license'] as const,
  licenseInfo: () => [...ecpKeys.all, 'licenseInfo'] as const,
  licenseDocuments: () => [...ecpKeys.all, 'licenseDocuments'] as const,
  licenseTerms: () => [...ecpKeys.all, 'licenseTerms'] as const,
  complianceRequirements: () => [...ecpKeys.all, 'complianceRequirements'] as const,
  licenseRequests: () => [...ecpKeys.all, 'licenseRequests'] as const,
  toolkit: (category?: ECPToolkitCategory) => [...ecpKeys.all, 'toolkit', category] as const,
  allToolkit: () => [...ecpKeys.all, 'toolkit', 'all'] as const,
};

// =============================================================================
// Dashboard
// =============================================================================

export function useECPDashboard() {
  return useQuery({
    queryKey: ecpKeys.dashboard(),
    queryFn: async () => {
      const result = await ECPService.getDashboardStats();
      if (result.error) throw result.error;
      return result.data;
    },
  });
}

// =============================================================================
// Batches
// =============================================================================

export function useBatches(filters: BatchFilters = {}) {
  return useQuery({
    queryKey: [...ecpKeys.batches(), filters],
    queryFn: async () => {
      const result = await ECPService.getBatches(filters);
      if (result.error) throw result.error;
      return result.data;
    },
  });
}

export function useBatch(id: string) {
  return useQuery({
    queryKey: ecpKeys.batch(id),
    queryFn: async () => {
      const result = await ECPService.getBatchById(id);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: !!id,
  });
}

export function useCreateBatch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dto: CreateBatchDTO) => ECPService.createBatch(dto),
    onSuccess: (result) => {
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error.message,
          variant: 'destructive',
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ecpKeys.batches() });
      queryClient.invalidateQueries({ queryKey: ecpKeys.dashboard() });
      toast({
        title: 'Success',
        description: 'Training batch created successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateBatch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateBatchDTO }) =>
      ECPService.updateBatch(id, dto),
    onSuccess: (result, { id }) => {
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error.message,
          variant: 'destructive',
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ecpKeys.batches() });
      queryClient.invalidateQueries({ queryKey: ecpKeys.batch(id) });
      toast({
        title: 'Success',
        description: 'Training batch updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteBatch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => ECPService.deleteBatch(id),
    onSuccess: (result) => {
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error.message,
          variant: 'destructive',
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ecpKeys.batches() });
      queryClient.invalidateQueries({ queryKey: ecpKeys.dashboard() });
      toast({
        title: 'Success',
        description: 'Training batch deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// =============================================================================
// Trainers
// =============================================================================

export function useTrainers(filters: TrainerFilters = {}) {
  return useQuery({
    queryKey: [...ecpKeys.trainers(), filters],
    queryFn: async () => {
      const result = await ECPService.getTrainers(filters);
      if (result.error) throw result.error;
      return result.data;
    },
  });
}

export function useTrainer(id: string) {
  return useQuery({
    queryKey: ecpKeys.trainer(id),
    queryFn: async () => {
      const result = await ECPService.getTrainer(id);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: !!id,
  });
}

export function useCreateTrainer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dto: CreateTrainerDTO) => ECPService.createTrainer(dto),
    onSuccess: (result) => {
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error.message,
          variant: 'destructive',
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ecpKeys.trainers() });
      queryClient.invalidateQueries({ queryKey: ecpKeys.dashboard() });
      toast({
        title: 'Success',
        description: 'Trainer added successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateTrainer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateTrainerDTO }) =>
      ECPService.updateTrainer(id, dto),
    onSuccess: (result) => {
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error.message,
          variant: 'destructive',
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ecpKeys.trainers() });
      toast({
        title: 'Success',
        description: 'Trainer updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteTrainer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => ECPService.deleteTrainer(id),
    onSuccess: (result) => {
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error.message,
          variant: 'destructive',
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ecpKeys.trainers() });
      queryClient.invalidateQueries({ queryKey: ecpKeys.dashboard() });
      toast({
        title: 'Success',
        description: 'Trainer removed successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// =============================================================================
// Trainees
// =============================================================================

export function useTrainees(filters: TraineeFilters = {}) {
  return useQuery({
    queryKey: [...ecpKeys.trainees(), filters],
    queryFn: async () => {
      const result = await ECPService.getTrainees(filters);
      if (result.error) throw result.error;
      return result.data;
    },
  });
}

export function useCreateTrainee() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dto: CreateTraineeDTO) => ECPService.createTrainee(dto),
    onSuccess: (result) => {
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error.message,
          variant: 'destructive',
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ecpKeys.trainees() });
      queryClient.invalidateQueries({ queryKey: ecpKeys.dashboard() });
      toast({
        title: 'Success',
        description: 'Trainee added successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useCreateTraineesBulk() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      trainees,
      batchId,
      certificationType,
    }: {
      trainees: BulkTraineeUpload[];
      batchId: string;
      certificationType: string;
    }) => ECPService.createTraineesBulk(trainees, batchId, certificationType),
    onSuccess: (result) => {
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error.message,
          variant: 'destructive',
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ecpKeys.trainees() });
      queryClient.invalidateQueries({ queryKey: ecpKeys.dashboard() });

      const { created, errors } = result.data!;
      if (errors.length > 0) {
        toast({
          title: 'Partial Success',
          description: `Created ${created} trainees. ${errors.length} failed.`,
          variant: 'default',
        });
      } else {
        toast({
          title: 'Success',
          description: `Created ${created} trainees successfully`,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateTrainee() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateTraineeDTO }) =>
      ECPService.updateTrainee(id, dto),
    onSuccess: (result) => {
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error.message,
          variant: 'destructive',
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ecpKeys.trainees() });
      toast({
        title: 'Success',
        description: 'Trainee updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteTrainee() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => ECPService.deleteTrainee(id),
    onSuccess: (result) => {
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error.message,
          variant: 'destructive',
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ecpKeys.trainees() });
      queryClient.invalidateQueries({ queryKey: ecpKeys.dashboard() });
      toast({
        title: 'Success',
        description: 'Trainee removed successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// =============================================================================
// Vouchers
// =============================================================================

export function useVoucherAllocations() {
  return useQuery({
    queryKey: ecpKeys.vouchers(),
    queryFn: async () => {
      const result = await ECPService.getVoucherAllocations();
      if (result.error) throw result.error;
      return result.data;
    },
  });
}

// =============================================================================
// Performance Metrics
// =============================================================================

export function usePerformanceMetrics(periodType: 'monthly' | 'quarterly' | 'yearly' = 'monthly') {
  return useQuery({
    queryKey: ecpKeys.metrics(periodType),
    queryFn: async () => {
      const result = await ECPService.getPerformanceMetrics(periodType);
      if (result.error) throw result.error;
      return result.data;
    },
  });
}

// =============================================================================
// License Management
// =============================================================================

/**
 * Get complete license info including documents, terms, and compliance requirements
 */
export function useLicenseInfo() {
  return useQuery({
    queryKey: ecpKeys.licenseInfo(),
    queryFn: async () => {
      const result = await ECPService.getLicenseInfo();
      if (result.error) throw result.error;
      return result.data;
    },
  });
}

/**
 * Get the license record directly
 */
export function useLicense() {
  return useQuery({
    queryKey: ecpKeys.license(),
    queryFn: async () => {
      const result = await ECPService.getLicense();
      if (result.error) throw result.error;
      return result.data;
    },
    retry: false, // Don't retry - no license is a valid state
  });
}

/**
 * Get license documents
 */
export function useLicenseDocuments() {
  return useQuery({
    queryKey: ecpKeys.licenseDocuments(),
    queryFn: async () => {
      const result = await ECPService.getLicenseDocuments();
      if (result.error) throw result.error;
      return result.data;
    },
    retry: false,
  });
}

/**
 * Get license terms
 */
export function useLicenseTerms() {
  return useQuery({
    queryKey: ecpKeys.licenseTerms(),
    queryFn: async () => {
      const result = await ECPService.getLicenseTerms();
      if (result.error) throw result.error;
      return result.data;
    },
    retry: false,
  });
}

/**
 * Get compliance requirements
 */
export function useComplianceRequirements() {
  return useQuery({
    queryKey: ecpKeys.complianceRequirements(),
    queryFn: async () => {
      const result = await ECPService.getComplianceRequirements();
      if (result.error) throw result.error;
      return result.data;
    },
    retry: false,
  });
}

/**
 * Get license requests
 */
export function useLicenseRequests() {
  return useQuery({
    queryKey: ecpKeys.licenseRequests(),
    queryFn: async () => {
      const result = await ECPService.getLicenseRequests();
      if (result.error) throw result.error;
      return result.data;
    },
    retry: false,
  });
}

/**
 * Submit a license request (renewal or scope update)
 */
export function useSubmitLicenseRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dto: CreateLicenseRequestDTO) => ECPService.submitLicenseRequest(dto),
    onSuccess: (result) => {
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error.message,
          variant: 'destructive',
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ecpKeys.license() });
      queryClient.invalidateQueries({ queryKey: ecpKeys.licenseInfo() });
      queryClient.invalidateQueries({ queryKey: ecpKeys.licenseRequests() });

      const requestType = result.data?.request_type;
      const message = requestType === 'renewal'
        ? 'Your license renewal request has been submitted. BDA will contact you shortly.'
        : 'Your request has been submitted for review.';

      toast({
        title: 'Request Submitted',
        description: message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Cancel a pending license request
 */
export function useCancelLicenseRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (requestId: string) => ECPService.cancelLicenseRequest(requestId),
    onSuccess: (result) => {
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error.message,
          variant: 'destructive',
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ecpKeys.licenseRequests() });
      toast({
        title: 'Request Cancelled',
        description: 'Your request has been cancelled.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// =============================================================================
// Voucher Management
// =============================================================================

/**
 * Get all vouchers for the current partner
 */
export function useVouchers(filters?: VoucherFilters) {
  return useQuery({
    queryKey: [...ecpKeys.vouchers(), filters],
    queryFn: async () => {
      const result = await ECPService.getVouchers(filters);
      if (result.error) throw result.error;
      return result.data;
    },
  });
}

/**
 * Get voucher stats for the current partner
 */
export function useVoucherStats() {
  return useQuery({
    queryKey: [...ecpKeys.vouchers(), 'stats'],
    queryFn: async () => {
      const result = await ECPService.getVoucherStats();
      if (result.error) throw result.error;
      return result.data;
    },
  });
}

/**
 * Get voucher requests for the current partner
 */
export function useVoucherRequests() {
  return useQuery({
    queryKey: [...ecpKeys.vouchers(), 'requests'],
    queryFn: async () => {
      const result = await ECPService.getVoucherRequests();
      if (result.error) throw result.error;
      return result.data;
    },
  });
}

/**
 * Submit a voucher request
 */
export function useSubmitVoucherRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dto: CreateVoucherRequestDTO) => ECPService.submitVoucherRequest(dto),
    onSuccess: (result) => {
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error.message,
          variant: 'destructive',
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ecpKeys.vouchers() });
      toast({
        title: 'Request Submitted',
        description: `Your request for ${result.data?.quantity} vouchers has been submitted. You will receive an invoice shortly.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Cancel a pending voucher request
 */
export function useCancelVoucherRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (requestId: string) => ECPService.cancelVoucherRequest(requestId),
    onSuccess: (result) => {
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error.message,
          variant: 'destructive',
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ecpKeys.vouchers() });
      toast({
        title: 'Request Cancelled',
        description: 'Your voucher request has been cancelled.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Assign a voucher to a candidate
 */
export function useAssignVoucher() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dto: AssignVoucherDTO) => ECPService.assignVoucher(dto),
    onSuccess: (result) => {
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error.message,
          variant: 'destructive',
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ecpKeys.vouchers() });
      queryClient.invalidateQueries({ queryKey: ecpKeys.trainees() });
      toast({
        title: 'Voucher Assigned',
        description: `Voucher ${result.data?.voucher_code} has been assigned to ${result.data?.assigned_to_name}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Unassign a voucher
 */
export function useUnassignVoucher() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (voucherId: string) => ECPService.unassignVoucher(voucherId),
    onSuccess: (result) => {
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error.message,
          variant: 'destructive',
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ecpKeys.vouchers() });
      queryClient.invalidateQueries({ queryKey: ecpKeys.trainees() });
      toast({
        title: 'Voucher Unassigned',
        description: 'The voucher has been unassigned and is now available.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// =============================================================================
// Toolkit
// =============================================================================

/**
 * Get toolkit items (optionally filtered by category)
 */
export function useECPToolkit(category?: ECPToolkitCategory) {
  return useQuery({
    queryKey: ecpKeys.toolkit(category),
    queryFn: async () => {
      const result = await ECPService.getToolkitItems(category);
      if (result.error) throw result.error;
      return result.data;
    },
  });
}

/**
 * Admin: Get all toolkit items (including inactive)
 */
export function useAllECPToolkitItems() {
  return useQuery({
    queryKey: ecpKeys.allToolkit(),
    queryFn: async () => {
      const result = await ECPService.getAllToolkitItems();
      if (result.error) throw result.error;
      return result.data;
    },
  });
}

/**
 * Admin: Create toolkit item
 */
export function useCreateECPToolkitItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dto: CreateECPToolkitItemDTO) => ECPService.createToolkitItem(dto),
    onSuccess: (result) => {
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error.message,
          variant: 'destructive',
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ecpKeys.allToolkit() });
      queryClient.invalidateQueries({ queryKey: ecpKeys.toolkit() });
      toast({
        title: 'Success',
        description: 'Toolkit item created successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Admin: Update toolkit item
 */
export function useUpdateECPToolkitItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateECPToolkitItemDTO }) =>
      ECPService.updateToolkitItem(id, dto),
    onSuccess: (result) => {
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error.message,
          variant: 'destructive',
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ecpKeys.allToolkit() });
      queryClient.invalidateQueries({ queryKey: ecpKeys.toolkit() });
      toast({
        title: 'Success',
        description: 'Toolkit item updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Admin: Delete toolkit item
 */
export function useDeleteECPToolkitItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => ECPService.deleteToolkitItem(id),
    onSuccess: (result) => {
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error.message,
          variant: 'destructive',
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ecpKeys.allToolkit() });
      queryClient.invalidateQueries({ queryKey: ecpKeys.toolkit() });
      toast({
        title: 'Success',
        description: 'Toolkit item deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Admin: Upload toolkit file
 */
export function useUploadECPToolkitFile() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ file, category }: { file: File; category: ECPToolkitCategory }) =>
      ECPService.uploadToolkitFile(file, category),
    onError: (error: Error) => {
      toast({
        title: 'Upload Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
