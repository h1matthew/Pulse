# Finding Template

Use this template when documenting new security findings.

---

## Finding #X: [Concise Title]

**Severity:** Critical | High | Medium | Low | Info
**Category:** Authentication | Authorization | Input Validation | Rate Limiting | Prompt Injection | Error Handling | Data Exposure | Ownership
**Route:** `/api/path/to/route`
**File:** `web/app/api/path/to/route.ts`
**Lines:** [Line numbers, e.g., 123-145]

### Description

[1-2 sentences: What is the vulnerability? Be specific about what's missing or incorrect.]

### Impact

[What could an attacker do? What's the business/security impact? Be specific about the worst-case scenario.]

### Evidence

```typescript
// Vulnerable code snippet from the file
// Show the problematic lines with context
// Include line numbers for reference
```

### Exploitation Scenario

[Step-by-step example of how to exploit this vulnerability]

1. Attacker does X
2. Because of Y vulnerability
3. This results in Z impact

### Remediation

```typescript
// Fixed code snippet
// Show exactly what to change
// Include the full context needed to apply the fix
```

### Priority Justification

[Why this severity? What happens if not fixed? Consider:
- Likelihood of exploitation
- Skill level required to exploit
- Business impact if exploited
- Existing mitigations]

### Estimated Fix Time

[X minutes/hours]

### Verification Steps

1. [How to verify the fix works]
2. [Test case to run]
3. [Expected result after fix]

---

## Severity Criteria Reference

| Severity | Criteria | Examples |
|----------|----------|----------|
| **Critical** | Unauthenticated access to sensitive operations; mass data exposure; RCE | Auth bypass on admin route; SQL injection; unauthenticated file deletion |
| **High** | Authorization bypass; privilege escalation; significant data exposure | Non-admin accessing admin endpoints; user A accessing user B's data |
| **Medium** | Missing rate limits on expensive operations; moderate data exposure | No rate limit on AI generation; missing input validation on user-facing routes |
| **Low** | Minor info disclosure; weak validation on non-critical fields | Verbose error messages; no length limits on optional fields |
| **Info** | Security hardening; defense-in-depth | Missing CSP headers; no request logging; consider adding 2FA |

## Category Definitions

- **Authentication**: Verifying who the user is (session, token validation)
- **Authorization**: Verifying what the user can do (admin checks, role-based access)
- **Input Validation**: Checking user input for correctness and safety
- **Rate Limiting**: Preventing abuse through request throttling
- **Prompt Injection**: Preventing manipulation of AI system prompts
- **Error Handling**: Ensuring errors don't leak sensitive information
- **Data Exposure**: Ensuring responses don't contain sensitive fields
- **Ownership**: Ensuring users can only access their own data
