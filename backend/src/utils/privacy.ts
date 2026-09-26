/**
 * Privacy utilities for protecting donor and patient personal identifiable information (PII).
 * Ensures compliance with health data privacy and platform donor security requirements.
 */

/**
 * Masks a telephone number: e.g., '+919876543210' -> '+91 98****3210', '9876543210' -> '98****3210'
 */
export function maskPhoneNumber(phone?: string | null): string {
  if (!phone) return '';
  const cleaned = phone.trim().replace(/\s+/g, '');
  if (cleaned.length <= 4) return '****';

  // If starts with country code like +91
  if (cleaned.startsWith('+')) {
    const countryCode = cleaned.slice(0, 3); // e.g. +91
    const rest = cleaned.slice(3);
    if (rest.length >= 6) {
      const start = rest.slice(0, 2);
      const end = rest.slice(-4);
      return `${countryCode} ${start}****${end}`;
    }
    return `${countryCode} ****${rest.slice(-2)}`;
  }

  if (cleaned.length >= 6) {
    const start = cleaned.slice(0, 2);
    const end = cleaned.slice(-4);
    return `${start}****${end}`;
  }

  return `${cleaned.slice(0, 1)}****${cleaned.slice(-1)}`;
}

/**
 * Masks an email address: e.g., 'johndoe@example.com' -> 'j*****e@example.com'
 */
export function maskEmail(email?: string | null): string {
  if (!email) return '';
  const parts = email.split('@');
  if (parts.length !== 2) return '****@****';

  const [name, domain] = parts;
  if (name.length <= 2) {
    return `${name[0]}*@${domain}`;
  }

  const maskedName = `${name[0]}${'*'.repeat(Math.min(name.length - 2, 6))}${name[name.length - 1]}`;
  return `${maskedName}@${domain}`;
}

/**
 * Sanitizes donor profile details based on viewing permissions and configurable donor privacy settings.
 * Section 5 compliance:
 * - Before donor acceptance: Anonymous view ("Matched Donor", masked contact).
 * - After donor acceptance: Respect donor privacy preferences (hidePhoneNumber, hideExactAddress).
 * - Never expose exact home address or live GPS coordinates to recipients.
 */
export function sanitizeDonorView(
  donor: any,
  canViewFullDetails: boolean,
  isSelf: boolean = false
): any {
  if (!donor) return donor;

  if (isSelf) {
    return donor;
  }

  // If viewer is allowed full coordination details (e.g. Hospital or Requester post-acceptance)
  if (canViewFullDetails) {
    const showPhone = !donor.hidePhoneNumber;
    const sanitizedUser = donor.user
      ? {
          ...donor.user,
          phone: showPhone ? donor.user.phone : maskPhoneNumber(donor.user.phone),
          email: donor.user.email,
        }
      : undefined;

    return {
      ...donor,
      user: sanitizedUser,
      address: donor.hideExactAddress
        ? `${donor.city || ''}, ${donor.state || ''}`.trim().replace(/^,\s*|,\s*$/g, '')
        : donor.address,
      latitude: donor.hideExactAddress ? undefined : donor.latitude,
      longitude: donor.hideExactAddress ? undefined : donor.longitude,
    };
  }

  // Anonymous / pre-acceptance view
  const sanitizedUser = donor.user
    ? {
        ...donor.user,
        phone: maskPhoneNumber(donor.user.phone),
        email: maskEmail(donor.user.email),
      }
    : undefined;

  return {
    ...donor,
    fullName: 'Matched Donor',
    user: sanitizedUser,
    address: `${donor.city || ''}, ${donor.state || ''}`.trim().replace(/^,\s*|,\s*$/g, '') || 'Vicinity only',
    latitude: undefined,
    longitude: undefined,
  };
}
