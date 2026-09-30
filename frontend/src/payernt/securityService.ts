/**
 * Frontend-Only Lender Security & Mock Submission Verification Service
 * 
 * Flow:
 * 1. Application generates random 4-digit PIN upon reaching final submission stage
 * 2. User confirms PIN by typing it manually
 * 3. User enters mobile number
 * 4. Application generates 6-digit OTP
 * 5. User enters OTP
 * 6. Product submission verified & completed
 */

export interface SubmissionSecuritySession {
  submissionPin?: string;
  isPinVerified: boolean;
  mobileNumber?: string;
  currentOtp?: string;
  otpExpiresAt?: number;
  lastResendTime?: number;
  isOtpVerified: boolean;
  submissionStage: "form" | "review" | "pin" | "mobile" | "otp" | "submitted";
}

export class LenderSecurityService {
  private static instance: LenderSecurityService;
  private session: SubmissionSecuritySession = {
    isPinVerified: false,
    isOtpVerified: false,
    submissionStage: "form",
  };

  private constructor() {}

  public static getInstance(): LenderSecurityService {
    if (!LenderSecurityService.instance) {
      LenderSecurityService.instance = new LenderSecurityService();
    }
    return LenderSecurityService.instance;
  }

  /**
   * Generates a random 4-digit submission PIN (e.g. 4827) for final upload authorization.
   */
  public generateSubmissionPin(): string {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    this.session.submissionPin = pin;
    this.session.isPinVerified = false;
    this.session.submissionStage = "pin";
    return pin;
  }

  /**
   * Sets and confirms a custom host PIN.
   */
  public setAndConfirmPin(pin: string, confirmPin: string): { valid: boolean; error?: string } {
    if (!pin || !confirmPin || pin !== confirmPin) {
      return { valid: false, error: "PINs do not match. Try again." };
    }
    this.session.submissionPin = pin;
    this.session.isPinVerified = true;
    this.session.submissionStage = "mobile";
    return { valid: true };
  }

  /**
   * Verifies the user-entered PIN against the application-generated PIN.
   */
  public verifySubmissionPin(enteredPin: string): { valid: boolean; error?: string } {
    if (!this.session.submissionPin) {
      return { valid: false, error: "No active submission PIN found. Please try again." };
    }

    if (enteredPin.trim() === this.session.submissionPin) {
      this.session.isPinVerified = true;
      this.session.submissionStage = "mobile";
      return { valid: true };
    }

    return { valid: false, error: "Incorrect PIN. Please enter the PIN shown above." };
  }

  /**
   * Generates a temporary 6-digit mock OTP valid for 2 minutes (120 seconds).
   */
  public generateMockOtp(mobileNumber: string): { otp: string; expiresAt: number } {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 120 * 1000;

    this.session.mobileNumber = mobileNumber;
    this.session.currentOtp = otp;
    this.session.otpExpiresAt = expiresAt;
    this.session.lastResendTime = Date.now();
    this.session.isOtpVerified = false;
    this.session.submissionStage = "otp";
    return { otp, expiresAt };
  }

  /**
   * Verifies the entered 6-digit OTP against the active session OTP.
   */
  public verifyOtp(enteredOtp: string): { valid: boolean; error?: string } {
    if (!this.session.currentOtp || !this.session.otpExpiresAt) {
      return { valid: false, error: "No active verification code. Please request a new OTP." };
    }

    if (Date.now() > this.session.otpExpiresAt) {
      return { valid: false, error: "Verification code expired. Please request a new code." };
    }

    if (enteredOtp.trim() === this.session.currentOtp) {
      this.session.isOtpVerified = true;
      this.session.submissionStage = "submitted";
      return { valid: true };
    }

    return { valid: false, error: "Incorrect verification code. Try again." };
  }

  public getSession(): SubmissionSecuritySession {
    return { ...this.session };
  }

  public resetSession(): void {
    this.session = {
      isPinVerified: false,
      isOtpVerified: false,
      submissionStage: "form",
    };
  }
}

export const lenderSecurityService = LenderSecurityService.getInstance();
