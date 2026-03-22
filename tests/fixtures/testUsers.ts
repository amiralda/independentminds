export const TEST_USERS = {
  parent: {
    email:
      process.env.TEST_PARENT_EMAIL ||
      'test-parent@independentminds.test',
    password: process.env.TEST_PARENT_PASSWORD || 'TestParent2026!',
    name: 'Test Parent',
  },
  admin: {
    email:
      process.env.TEST_ADMIN_EMAIL ||
      'test-admin@independentminds.test',
    password: process.env.TEST_ADMIN_PASSWORD || 'TestAdmin2026!',
    name: 'Test Admin',
  },
  guardian: {
    email:
      process.env.TEST_GUARDIAN_EMAIL ||
      'test-guardian@independentminds.test',
    password:
      process.env.TEST_GUARDIAN_PASSWORD || 'TestGuardian2026!',
    name: 'Test Guardian',
  },
};
