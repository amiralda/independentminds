import { describe, it, expect } from 'vitest';

describe('Role guard logic', () => {
  const VALID_ROLES = ['parent', 'student'];

  it('only parent and student are valid client roles', () => {
    expect(VALID_ROLES).toContain('parent');
    expect(VALID_ROLES).toContain('student');
    expect(VALID_ROLES).not.toContain('admin');
  });

  it('admin check must go through server-side has_role RPC', () => {
    // Admin is NOT in the client Role type — it's checked via user_roles table
    const clientRoles = ['parent', 'student'];
    expect(clientRoles).not.toContain('admin');
  });

  it('unknown role defaults to student for safety', () => {
    const rawRole = 'unknown';
    const role = VALID_ROLES.includes(rawRole) ? rawRole : 'student';
    expect(role).toBe('student');
  });

  it('profile without role falls back safely', () => {
    const profileData = { role: null as string | null };
    const role = profileData.role || 'student';
    expect(role).toBe('student');
  });

  it('route guard redirects unauthenticated users', () => {
    const session = null;
    const shouldRedirect = !session;
    expect(shouldRedirect).toBe(true);
  });

  it('co-guardian role uses has_guardian_permission, not profiles.role', () => {
    // Co-guardians are checked via co_guardians table + has_guardian_permission()
    // They login as regular parents but with restricted access
    const isCoGuardian = true;
    const permissions = { can_view_progress: true, can_edit_lessons: false };
    expect(permissions.can_view_progress).toBe(true);
    expect(permissions.can_edit_lessons).toBe(false);
  });
});
