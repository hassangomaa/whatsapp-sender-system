import {
  formatAuditRegister,
  formatAuditQuotaExhausted,
} from '@whatsapp-sender/contracts';

describe('AdminAuditService formatters', () => {
  it('formatAuditRegister includes client details', () => {
    const msg = formatAuditRegister({
      workspaceId: 'ws-1',
      workspaceName: 'Ahmed Workspace',
      ownerName: 'Ahmed',
      ownerPhone: '966508334708',
      planName: 'Trial',
    });
    expect(msg).toContain('Ahmed');
    expect(msg).toContain('966508334708');
  });

  it('formatAuditQuotaExhausted includes usage', () => {
    const msg = formatAuditQuotaExhausted({
      workspaceId: 'ws-1',
      workspaceName: 'Test',
      ownerName: 'Omar',
      messagesUsed: 30,
      messageLimit: 30,
      planName: 'Trial',
    });
    expect(msg).toContain('30/30');
    expect(msg).toContain('Upgrade needed');
  });
});
