/**
 * Pure logic for vehicle documents (registration, insurance, vignette, etc.).
 *
 * A document either has an expiry date (renewable) or is lifetime (no expiry).
 * Status is computed relative to today so the UI can flag expired / expiring-soon
 * documents consistently across the vehicle documents page and the reminders page.
 */

import { DocumentType } from '../types';

/** How many days ahead counts as "expiring soon". */
export const EXPIRING_SOON_DAYS = 30;

export type DocumentStatus = 'lifetime' | 'expired' | 'expiring_soon' | 'valid';

export interface DocumentStatusResult {
  status: DocumentStatus;
  /** Days until expiry (positive) or days overdue (negative). Null for lifetime docs. */
  daysRemaining: number | null;
}

/** Ordered list of document types shown in the add/edit form. */
export const DOCUMENT_TYPES: DocumentType[] = [
  DocumentType.REGISTRATION,
  DocumentType.INSURANCE,
  DocumentType.VIGNETTE,
  DocumentType.TECHNICAL_INSPECTION,
  DocumentType.OTHER,
];

/** Document types that default to "no expiry (lifetime)" when adding. */
const LIFETIME_DEFAULT_TYPES: DocumentType[] = [DocumentType.REGISTRATION];

export function defaultsToLifetime(documentType: DocumentType): boolean {
  return LIFETIME_DEFAULT_TYPES.includes(documentType);
}

/**
 * Compute a document's status from its expiry date.
 * @param expiryDate YYYY-MM-DD or null (null = lifetime document)
 * @param today      optional reference date (defaults to the current local date)
 */
export function getDocumentStatus(
  expiryDate: string | null,
  today: Date = new Date()
): DocumentStatusResult {
  if (!expiryDate) {
    return { status: 'lifetime', daysRemaining: null };
  }

  const exp = parseLocalDate(expiryDate);
  const ref = startOfDay(today);
  const expDay = startOfDay(exp);

  const diffMs = expDay.getTime() - ref.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    return { status: 'expired', daysRemaining };
  }
  if (daysRemaining <= EXPIRING_SOON_DAYS) {
    return { status: 'expiring_soon', daysRemaining };
  }
  return { status: 'valid', daysRemaining };
}

/** Parse a "YYYY-MM-DD" string into a local Date (avoids UTC off-by-one). */
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Zero out the time component of a Date. */
function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Default name for a document type — used to autofill the name field.
 * Returns null for OTHER (user must type a custom name).
 */
export function getDefaultDocumentName(documentType: DocumentType): string | null {
  switch (documentType) {
    case DocumentType.REGISTRATION:
      return 'registration';
    case DocumentType.INSURANCE:
      return 'insurance';
    case DocumentType.VIGNETTE:
      return 'vignette';
    case DocumentType.TECHNICAL_INSPECTION:
      return 'technical_inspection';
    default:
      return null;
  }
}