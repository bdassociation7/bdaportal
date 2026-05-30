/**
 * PDP (Professional Development Provider) React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PDPService, PdpProgramsService } from './pdp.service';
import type {
  ProgramFilters,
  PdpProgramFilters,
  CreateProgramDTO,
  UpdateProgramDTO,
  CreateReportDTO,
  UpdateReportDTO,
  CreateLicenseRequestDTO,
  ToolkitCategory,
  CreateToolkitItemDTO,
  UpdateToolkitItemDTO,
  UpdatePDPPartnerProfileDTO,
  GuidelineCategory,
  CreatePDPGuidelineDTO,
  UpdatePDPGuidelineDTO,
} from './pdp.types';
import { useToast } from '@/components/ui/use-toast';

// Query keys
export const pdpKeys = {
  all: ['pdp'] as const,
  dashboard: () => [...pdpKeys.all, 'dashboard'] as const,
  competencies: () => [...pdpKeys.all, 'competencies'] as const,
  programs: () => [...pdpKeys.all, 'programs'] as const,
  program: (id: string) => [...pdpKeys.programs(), id] as const,
  reports: () => [...pdpKeys.all, 'reports'] as const,
  report: (id: string) => [...pdpKeys.reports(), id] as const,
  license: () => [...pdpKeys.all, 'license'] as const,
  slotStatus: () => [...pdpKeys.all, 'slotStatus'] as const,
  toolkit: (category?: ToolkitCategory) => [...pdpKeys.all, 'toolkit', category] as const,
  allToolkit: () => [...pdpKeys.all, 'allToolkit'] as const,
  profile: () => [...pdpKeys.all, 'profile'] as const,
  guidelines: (category?: GuidelineCategory) => [...pdpKeys.all, 'guidelines', category] as const,
  allGuidelines: () => [...pdpKeys.all, 'allGuidelines'] as const,
};

// =============================================================================
// Dashboard
// =============================================================================

export function usePDPDashboard() {
  return useQuery({
    queryKey: pdpKeys.dashboard(),
    queryFn: async () => {
      const result = await PDPService.getDashboardStats();
      if (result.error) throw result.error;
      return result.data;
    },
  });
}

// =============================================================================
// BoCK Competencies
// =============================================================================

export function useBockCompetencies() {
  return useQuery({
    queryKey: pdpKeys.competencies(),
    queryFn: async () => {
      const result = await PDPService.getBockCompetencies();
      if (result.error) throw result.error;
      return result.data;
    },
  });
}

// =============================================================================
// Programs
// =============================================================================

export function useMyPrograms(filters: ProgramFilters = {}) {
  return useQuery({
    queryKey: [...pdpKeys.programs(), filters],
    queryFn: async () => {
      const result = await PDPService.getMyPrograms(filters);
      if (result.error) throw result.error;
      return result.data;
    },
  });
}

export function useProgram(id: string) {
  return useQuery({
    queryKey: pdpKeys.program(id),
    queryFn: async () => {
      const result = await PDPService.getProgram(id);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: !!id,
  });
}

export function useCreateProgram() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dto: CreateProgramDTO) => PDPService.createProgram(dto),
    onSuccess: (result) => {
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error.message,
          variant: 'destructive',
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: pdpKeys.programs() });
      queryClient.invalidateQueries({ queryKey: pdpKeys.dashboard() });
      toast({
        title: 'Success',
        description: 'Program created successfully',
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

export function useUpdateProgram() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateProgramDTO }) =>
      PDPService.updateProgram(id, dto),
    onSuccess: (result, { id }) => {
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error.message,
          variant: 'destructive',
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: pdpKeys.programs() });
      queryClient.invalidateQueries({ queryKey: pdpKeys.program(id) });
      toast({
        title: 'Success',
        description: 'Program updated successfully',
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

export function useSubmitProgram() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => PDPService.submitProgramForReview(id),
    onSuccess: (result) => {
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error.message,
          variant: 'destructive',
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: pdpKeys.programs() });
      queryClient.invalidateQueries({ queryKey: pdpKeys.dashboard() });
      toast({
        title: 'Success',
        description: 'Program submitted for review',
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

export function useDeleteProgram() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => PDPService.deleteProgram(id),
    onSuccess: (result) => {
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error.message,
          variant: 'destructive',
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: pdpKeys.programs() });
      queryClient.invalidateQueries({ queryKey: pdpKeys.dashboard() });
      toast({
        title: 'Success',
        description: 'Program deleted successfully',
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
// Annual Reports
// =============================================================================

export function useAnnualReports() {
  return useQuery({
    queryKey: pdpKeys.reports(),
    queryFn: async () => {
      const result = await PDPService.getAnnualReports();
      if (result.error) throw result.error;
      return result.data;
    },
  });
}

export function useCreateAnnualReport() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dto: CreateReportDTO) => PDPService.createAnnualReport(dto),
    onSuccess: (result) => {
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error.message,
          variant: 'destructive',
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: pdpKeys.reports() });
      toast({
        title: 'Success',
        description: 'Annual report created successfully',
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

export function useUpdateAnnualReport() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateReportDTO }) =>
      PDPService.updateAnnualReport(id, dto),
    onSuccess: (result) => {
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error.message,
          variant: 'destructive',
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: pdpKeys.reports() });
      toast({
        title: 'Success',
        description: 'Annual report updated successfully',
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
// License Management
// =============================================================================

export function usePDPLicense() {
  return useQuery({
    queryKey: pdpKeys.license(),
    queryFn: async () => {
      const result = await PDPService.getLicenseInfo();
      if (result.error) throw result.error;
      return result.data;
    },
  });
}

export function useProgramSlotStatus() {
  return useQuery({
    queryKey: pdpKeys.slotStatus(),
    queryFn: async () => {
      const result = await PDPService.getProgramSlotStatus();
      if (result.error) throw result.error;
      return result.data;
    },
  });
}

export function useSubmitLicenseRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dto: CreateLicenseRequestDTO) => PDPService.submitLicenseRequest(dto),
    onSuccess: (result) => {
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error.message,
          variant: 'destructive',
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: pdpKeys.license() });
      toast({
        title: 'Success',
        description: 'Request submitted successfully',
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

export function useCancelLicenseRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (requestId: string) => PDPService.cancelLicenseRequest(requestId),
    onSuccess: (result) => {
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error.message,
          variant: 'destructive',
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: pdpKeys.license() });
      toast({
        title: 'Success',
        description: 'Request cancelled',
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

export function usePDPToolkit(category?: ToolkitCategory) {
  return useQuery({
    queryKey: pdpKeys.toolkit(category),
    queryFn: async () => {
      const result = await PDPService.getToolkitItems(category);
      if (result.error) throw result.error;
      return result.data;
    },
  });
}

// Admin: Get all toolkit items (including inactive)
export function useAllToolkitItems() {
  return useQuery({
    queryKey: pdpKeys.allToolkit(),
    queryFn: async () => {
      const result = await PDPService.getAllToolkitItems();
      if (result.error) throw result.error;
      return result.data;
    },
  });
}

// Admin: Create toolkit item
export function useCreateToolkitItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dto: CreateToolkitItemDTO) => PDPService.createToolkitItem(dto),
    onSuccess: (result) => {
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error.message,
          variant: 'destructive',
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: pdpKeys.allToolkit() });
      queryClient.invalidateQueries({ queryKey: pdpKeys.toolkit() });
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

// Admin: Update toolkit item
export function useUpdateToolkitItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateToolkitItemDTO }) =>
      PDPService.updateToolkitItem(id, dto),
    onSuccess: (result) => {
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error.message,
          variant: 'destructive',
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: pdpKeys.allToolkit() });
      queryClient.invalidateQueries({ queryKey: pdpKeys.toolkit() });
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

// Admin: Delete toolkit item
export function useDeleteToolkitItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => PDPService.deleteToolkitItem(id),
    onSuccess: (result) => {
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error.message,
          variant: 'destructive',
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: pdpKeys.allToolkit() });
      queryClient.invalidateQueries({ queryKey: pdpKeys.toolkit() });
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

// Admin: Upload toolkit file
export function useUploadToolkitFile() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ file, category }: { file: File; category: ToolkitCategory }) =>
      PDPService.uploadToolkitFile(file, category),
    onError: (error: Error) => {
      toast({
        title: 'Upload Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// =============================================================================
// Partner Profile
// =============================================================================

export function usePDPPartnerProfile() {
  return useQuery({
    queryKey: pdpKeys.profile(),
    queryFn: async () => {
      const result = await PDPService.getPartnerProfile();
      if (result.error) throw result.error;
      return result.data;
    },
  });
}

export function useUpdatePDPPartnerProfile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dto: UpdatePDPPartnerProfileDTO) => PDPService.updatePartnerProfile(dto),
    onSuccess: (result) => {
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error.message,
          variant: 'destructive',
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: pdpKeys.profile() });
      toast({
        title: 'Success',
        description: 'Profile updated successfully',
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

export function useUploadPartnerLogo() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (file: File) => PDPService.uploadPartnerLogo(file),
    onSuccess: (result) => {
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error.message,
          variant: 'destructive',
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: pdpKeys.profile() });
      toast({
        title: 'Success',
        description: 'Logo uploaded successfully',
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

export function useRemovePartnerLogo() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => PDPService.removePartnerLogo(),
    onSuccess: (result) => {
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error.message,
          variant: 'destructive',
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: pdpKeys.profile() });
      toast({
        title: 'Success',
        description: 'Logo removed successfully',
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

export function useUploadPartnerBadge() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (file: File) => PDPService.uploadPartnerBadge(file),
    onSuccess: (result) => {
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error.message,
          variant: 'destructive',
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: pdpKeys.profile() });
      toast({
        title: 'Success',
        description: 'Badge uploaded successfully',
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

export function useRemovePartnerBadge() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => PDPService.removePartnerBadge(),
    onSuccess: (result) => {
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error.message,
          variant: 'destructive',
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: pdpKeys.profile() });
      toast({
        title: 'Success',
        description: 'Badge removed successfully',
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
// Guidelines / Downloadable Resources
// =============================================================================

export function usePDPGuidelines(category?: GuidelineCategory) {
  return useQuery({
    queryKey: pdpKeys.guidelines(category),
    queryFn: async () => {
      const result = await PDPService.getGuidelines(category);
      if (result.error) throw result.error;
      return result.data;
    },
  });
}

export function useTrackGuidelineDownload() {
  return useMutation({
    mutationFn: (guidelineId: string) => PDPService.trackGuidelineDownload(guidelineId),
  });
}

// Admin hooks for managing guidelines
export function useAllPDPGuidelines() {
  return useQuery({
    queryKey: pdpKeys.allGuidelines(),
    queryFn: async () => {
      const result = await PDPService.getAllGuidelines();
      if (result.error) throw result.error;
      return result.data;
    },
  });
}

export function useCreatePDPGuideline() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dto: CreatePDPGuidelineDTO) => PDPService.createGuideline(dto),
    onSuccess: (result) => {
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error.message,
          variant: 'destructive',
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: pdpKeys.allGuidelines() });
      queryClient.invalidateQueries({ queryKey: pdpKeys.guidelines() });
      toast({
        title: 'Success',
        description: 'Guideline created successfully',
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

export function useUpdatePDPGuideline() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdatePDPGuidelineDTO }) =>
      PDPService.updateGuideline(id, dto),
    onSuccess: (result) => {
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error.message,
          variant: 'destructive',
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: pdpKeys.allGuidelines() });
      queryClient.invalidateQueries({ queryKey: pdpKeys.guidelines() });
      toast({
        title: 'Success',
        description: 'Guideline updated successfully',
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

export function useDeletePDPGuideline() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => PDPService.deleteGuideline(id),
    onSuccess: (result) => {
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error.message,
          variant: 'destructive',
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: pdpKeys.allGuidelines() });
      queryClient.invalidateQueries({ queryKey: pdpKeys.guidelines() });
      toast({
        title: 'Success',
        description: 'Guideline deleted successfully',
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

export function useUploadGuidelineFile() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ file, category }: { file: File; category: GuidelineCategory }) =>
      PDPService.uploadGuidelineFile(file, category),
    onSuccess: (result) => {
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error.message,
          variant: 'destructive',
        });
        return;
      }
      toast({
        title: 'Success',
        description: 'File uploaded successfully',
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

export function useUploadAgendaPDF() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ programId, file }: { programId: string; file: File }) =>
      PDPService.uploadAgendaPDF(programId, file),
    onSuccess: (result, { programId }) => {
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error.message,
          variant: 'destructive',
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: pdpKeys.programs() });
      queryClient.invalidateQueries({ queryKey: pdpKeys.program(programId) });
      toast({
        title: 'Success',
        description: 'Agenda PDF uploaded successfully',
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
// Legacy hooks for backward compatibility
// =============================================================================

export const useActivePdpPrograms = (filters?: PdpProgramFilters) => {
  return useQuery({
    queryKey: ['pdp-programs', filters],
    queryFn: () => PdpProgramsService.getActivePdpPrograms(filters),
  });
};

export const usePdpProgramById = (id: string) => {
  return useQuery({
    queryKey: ['pdp-program', id],
    queryFn: () => PdpProgramsService.getPdpProgramById(id),
    enabled: !!id,
  });
};

export const usePdpProgramByProgramId = (programId: string) => {
  return useQuery({
    queryKey: ['pdp-program-by-program-id', programId],
    queryFn: () => PdpProgramsService.getPdpProgramByProgramId(programId),
    enabled: !!programId,
  });
};

export const usePdpProgramStats = () => {
  return useQuery({
    queryKey: ['pdp-program-stats'],
    queryFn: () => PdpProgramsService.getPdpProgramStats(),
  });
};
