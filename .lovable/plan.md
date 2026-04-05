

## Disable Email Auto-Confirm

**What**: Turn off the temporary `auto_confirm_email` setting that was enabled for webhook testing.

**Why**: Email verification should be required for production security (COPPA compliance, prevent fake accounts).

**Steps**:
1. Call `configure_auth` with `auto_confirm_email: false`
2. Confirm the change was applied

This is a single configuration change — no code or database modifications needed.

