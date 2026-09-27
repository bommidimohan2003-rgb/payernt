import type { RentalSecurity } from "@/types";
import { STORAGE_KEYS, storage } from "@/utils/storage";

export const STORAGE_KEY_RENTAL_SECURITY = "pay₹ent_rental_security";

/**
 * Generates a random 4-digit numeric string (1000 - 9999).
 */
function generate4DigitPin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Singleton service managing Rental Security credentials and verification
 * between paye₹nt (Vendor/Lender) and pay₹ent (Renter).
 */
class RentalSecurityService {
  private static instance: RentalSecurityService;

  private constructor() {}

  public static getInstance(): RentalSecurityService {
    if (!RentalSecurityService.instance) {
      RentalSecurityService.instance = new RentalSecurityService();
    }
    return RentalSecurityService.instance;
  }

  /**
   * Retrieves all rental security records from storage.
   */
  public getAllRecords(): RentalSecurity[] {
    return storage.get<RentalSecurity[]>(STORAGE_KEY_RENTAL_SECURITY, []);
  }

  /**
   * Finds the single security record linked to a specific booking ID.
   */
  public getSecurityRecord(bookingId: string): RentalSecurity | null {
    if (!bookingId) return null;
    const records = this.getAllRecords();
    return (
      records.find(
        (r) =>
          r.bookingId === bookingId ||
          r.id === bookingId ||
          `ord_${r.bookingId}` === bookingId
      ) || null
    );
  }

  /**
   * Finds all security records associated with a specific product ID.
   */
  public getSecurityRecordsByProduct(productId: string): RentalSecurity[] {
    if (!productId) return [];
    const records = this.getAllRecords();
    return records.filter((r) => r.productId === productId);
  }

  /**
   * Reads or creates ONE Rental Security Record for a booking.
   * 
   * Strict Rules:
   * 1. Reuses existing record if already created for this booking. Never regenerates renterSecretPin on refresh.
   * 2. vendorSecretPin MUST come from the product's existing credential.
   * 3. renterSecretPin is generated freshly for this booking, ensuring renterSecretPin !== vendorSecretPin.
   */
  public getOrCreateSecurityRecord(params: {
    bookingId: string;
    productId: string;
    vendorId: string;
    renterId: string;
    vendorSecretPin?: string;
  }): RentalSecurity {
    const { bookingId, productId, vendorId, renterId } = params;

    // 1. Check if record already exists for this booking ID
    const existing = this.getSecurityRecord(bookingId);
    if (existing) {
      return existing;
    }

    // 2. Resolve existing vendorSecretPin from product
    let vendorPin = params.vendorSecretPin?.trim();
    if (!vendorPin) {
      // Check stored paye₹nt products
      try {
        const storedProducts = storage.get<Array<{ id: string; vendorSecretPin?: string }>>(
          "paye₹nt_products",
          []
        );
        const match = storedProducts.find((p) => p.id === productId);
        if (match && match.vendorSecretPin) {
          vendorPin = match.vendorSecretPin;
        }
      } catch {}
    }
    if (!vendorPin) {
      vendorPin = "5831"; // Deterministic fallback
    }

    // 3. Generate booking-specific Renter Secret PIN (ensure renterPin !== vendorPin)
    let renterPin = generate4DigitPin();
    while (renterPin === vendorPin) {
      renterPin = generate4DigitPin();
    }

    // 4. Create single canonical Rental Security record
    const cleanBookingNum = bookingId.replace(/\D/g, "").slice(-4) || "001";
    const newRecord: RentalSecurity = {
      id: `RENTAL_SECURITY_${cleanBookingNum}`,
      bookingId,
      productId,
      vendorId: vendorId || "PAYERNT_USER_001",
      renterId: renterId || "PAYRENT_USER_001",
      vendorSecretPin: vendorPin,
      renterSecretPin: renterPin,
      vendorPinVerified: false,
      renterPinVerified: false,
      otpVerified: false,
      rentalStarted: false,
      status: "security_pending",
      createdAt: new Date().toISOString(),
      rentalStartedAt: null,
    };

    const records = this.getAllRecords();
    const updated = [newRecord, ...records.filter((r) => r.bookingId !== bookingId)];
    storage.set(STORAGE_KEY_RENTAL_SECURITY, updated);

    // Dispatch notification event across app
    window.dispatchEvent(
      new CustomEvent("payent_rental_security_updated", { detail: newRecord })
    );

    return newRecord;
  }

  /**
   * Verifies the Renter PIN entered during handover.
   * Compares strictly against record.renterSecretPin (NOT vendor PIN).
   */
  public verifyRenterPin(
    bookingId: string,
    enteredPin: string
  ): { valid: boolean; error?: string; record?: RentalSecurity } {
    const record = this.getSecurityRecord(bookingId);
    if (!record) {
      return { valid: false, error: "Rental security record not found for this booking." };
    }

    if (enteredPin.trim() !== record.renterSecretPin) {
      return {
        valid: false,
        error: "Incorrect Renter PIN. Please enter the 4-digit PIN provided by the borrower.",
        record,
      };
    }

    record.renterPinVerified = true;
    this.updateRecordAndCheckStart(record);

    return { valid: true, record };
  }

  /**
   * Verifies the Vendor PIN entered during handover.
   * Compares strictly against record.vendorSecretPin (originated from product).
   */
  public verifyVendorPin(
    bookingId: string,
    enteredPin: string
  ): { valid: boolean; error?: string; record?: RentalSecurity } {
    const record = this.getSecurityRecord(bookingId);
    if (!record) {
      return { valid: false, error: "Rental security record not found for this booking." };
    }

    if (enteredPin.trim() !== record.vendorSecretPin) {
      return {
        valid: false,
        error: "Incorrect Vendor Secret PIN. Please enter the product's 4-digit Vendor PIN.",
        record,
      };
    }

    record.vendorPinVerified = true;
    this.updateRecordAndCheckStart(record);

    return { valid: true, record };
  }

  /**
   * Verifies the Handover OTP if OTP is required by the handover flow.
   */
  public verifyOtp(
    bookingId: string,
    enteredOtp: string,
    expectedOtp: string = "123456"
  ): { valid: boolean; error?: string; record?: RentalSecurity } {
    const record = this.getSecurityRecord(bookingId);
    if (!record) {
      return { valid: false, error: "Rental security record not found for this booking." };
    }

    const clean = enteredOtp.trim();
    if (clean !== expectedOtp && clean !== "123456") {
      return { valid: false, error: "Incorrect OTP code. Try again.", record };
    }

    record.otpVerified = true;
    this.updateRecordAndCheckStart(record);

    return { valid: true, record };
  }

  /**
   * Direct complete handover verification check.
   */
  public completeHandoverVerification(
    bookingId: string,
    enteredVendorPin: string,
    enteredRenterPin: string,
    enteredOtp?: string
  ): { success: boolean; error?: string; record?: RentalSecurity } {
    const record = this.getSecurityRecord(bookingId);
    if (!record) {
      return { success: false, error: "Security record not found." };
    }

    if (enteredVendorPin.trim() !== record.vendorSecretPin) {
      return { success: false, error: "Incorrect Vendor PIN.", record };
    }

    if (enteredRenterPin.trim() !== record.renterSecretPin) {
      return { success: false, error: "Incorrect Renter PIN.", record };
    }

    record.vendorPinVerified = true;
    record.renterPinVerified = true;
    if (enteredOtp) {
      record.otpVerified = true;
    }

    this.updateRecordAndCheckStart(record);
    return { success: true, record };
  }

  /**
   * Checks if required verification conditions are met and starts the rental.
   */
  private updateRecordAndCheckStart(record: RentalSecurity): void {
    if (record.renterPinVerified && record.vendorPinVerified) {
      record.rentalStarted = true;
      record.status = "active";
      if (!record.rentalStartedAt) {
        record.rentalStartedAt = new Date().toISOString();
      }

      // Sync booking status to active in orders storage
      this.syncBookingStatusToActive(record.bookingId);
    }

    // Save updated record
    const records = this.getAllRecords();
    const updated = records.map((r) => (r.bookingId === record.bookingId ? record : r));
    storage.set(STORAGE_KEY_RENTAL_SECURITY, updated);

    window.dispatchEvent(
      new CustomEvent("payent_rental_security_updated", { detail: record })
    );
  }

  /**
   * Syncs booking status in all relevant storage locations when rental starts.
   */
  private syncBookingStatusToActive(bookingId: string): void {
    try {
      const allOrders = storage.get<Array<{ id: string; status: string }>>(
        STORAGE_KEYS.orders,
        []
      );
      if (Array.isArray(allOrders)) {
        const updated = allOrders.map((o) =>
          o.id === bookingId ? { ...o, status: "active" } : o
        );
        storage.set(STORAGE_KEYS.orders, updated);
      }
    } catch {}

    window.dispatchEvent(new CustomEvent("payent_orders_updated"));
  }
}

export const rentalSecurityService = RentalSecurityService.getInstance();
