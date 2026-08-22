import { supabase } from '@/shared/config/supabase.config';

interface RegisterIndividualInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

interface RegistrationResponse {
  success: boolean;
  message: string;
  code?: string;
}

export class IndividualRegistrationService {
  private static async invoke(payload: Record<string, string>): Promise<RegistrationResponse> {
    const { data, error } = await supabase.functions.invoke('register-individual', {
      body: payload,
    });

    if (error) {
      const message = typeof data?.error === 'string'
        ? data.error
        : 'Unable to create your account. Please try again shortly.';
      throw new Error(message);
    }

    if (!data?.success) {
      throw new Error(typeof data?.error === 'string' ? data.error : 'Unable to create your account. Please try again shortly.');
    }

    return data as RegistrationResponse;
  }

  static register(input: RegisterIndividualInput) {
    return this.invoke({
      action: 'register',
      email: input.email.trim().toLowerCase(),
      password: input.password,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
    });
  }

  static resendConfirmation(email: string) {
    return this.invoke({
      action: 'resend',
      email: email.trim().toLowerCase(),
    });
  }
}
