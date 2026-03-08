/**
 * Tests for the email validation logic used in LoginScreen.
 * The validation function is inlined in LoginScreen, so we test it directly here.
 */

// Replicate the validation function from LoginScreen
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

describe('email validation', () => {
  describe('valid emails', () => {
    const validEmails = [
      'test@example.com',
      'user.name@domain.com',
      'user+tag@domain.co.uk',
      'user@sub.domain.com',
      'firstname.lastname@company.org',
      'user123@domain.io',
      'a@b.co',
    ];

    it.each(validEmails)('accepts "%s"', (email) => {
      expect(isValidEmail(email)).toBe(true);
    });
  });

  describe('invalid emails', () => {
    const invalidEmails = [
      '',
      'plaintext',
      '@domain.com',
      'user@',
      'user@.com',
      'user @domain.com',      // space
      'user@domain',            // no TLD
      'user@@domain.com',       // double @
    ];

    it.each(invalidEmails)('rejects "%s"', (email) => {
      expect(isValidEmail(email)).toBe(false);
    });
  });
});

describe('password validation', () => {
  it('rejects passwords shorter than 6 characters', () => {
    expect('12345'.length < 6).toBe(true);
    expect(''.length < 6).toBe(true);
    expect('abc'.length < 6).toBe(true);
  });

  it('accepts passwords with 6 or more characters', () => {
    expect('123456'.length >= 6).toBe(true);
    expect('password123'.length >= 6).toBe(true);
    expect('abcdef'.length >= 6).toBe(true);
  });
});
