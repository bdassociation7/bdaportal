interface RegisterIndividualInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

interface RegistrationResponse {
  success: boolean;
  message: string;
  existing?: boolean;
}

export class IndividualRegistrationService {
  private static async invoke(payload: Record<string, string>): Promise<RegistrationResponse> {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const publishableKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !publishableKey) {
      throw new Error('The registration service is not configured. Please contact BDA Support.');
    }

    let response: Response;
    try {
      response = await fetch(`${supabaseUrl}/functions/v1/register-individual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: publishableKey,
        },
        body: JSON.stringify(payload),
      });
    } catch {
      throw new Error('Unable to reach the registration service. Please check your connection and try again.');
    }

    const data = await response.json().catch(() => null) as { success?: boolean; message?: string; error?: string; existing?: boolean } | null;
    const message = data?.message || data?.error || 'Unable to create your account. Please try again shortly.';

    if (!response.ok || !data?.success) {
      throw new Error(message);
    }

    return {
      success: true,
      message,
      existing: Boolean(data.existing),
    };
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
