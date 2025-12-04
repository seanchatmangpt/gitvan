'use client';

import { useState, useEffect } from 'react';

/**
 * Enterprise Settings Dashboard
 *
 * Manage team, users, API keys, webhooks, schedules, and quotas.
 * RBAC, audit logging, and compliance features for enterprise deployments.
 */
export default function EnterprisePage() {
  const [activeTab, setActiveTab] = useState<string>('team');
  const [teamData, setTeamData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTeamData = async () => {
      try {
        const response = await fetch(`/api/enterprise/team?section=overview`);
        if (response.ok) {
          const data = await response.json();
          setTeamData(data.overview);
        }
      } catch (error) {
        console.error('Failed to load team data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTeamData();
  }, []);

  const tabs = [
    { id: 'team', label: 'Team & Members', icon: '👥' },
    { id: 'apikeys', label: 'API Keys', icon: '🔑' },
    { id: 'webhooks', label: 'Webhooks', icon: '🪝' },
    { id: 'schedules', label: 'Schedules', icon: '⏰' },
    { id: 'quotas', label: 'Quotas', icon: '📊' },
    { id: 'audit', label: 'Audit Log', icon: '📋' },
  ];

  return (
    <div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
        Enterprise Settings
      </h1>
      <p style={{ fontSize: '16px', color: '#666', marginBottom: '32px' }}>
        Manage team, users, integrations, and enterprise features
      </p>

      {/* Tab Navigation */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '32px',
          borderBottom: '2px solid #e5e7eb',
          overflowX: 'auto',
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 16px',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === tab.id ? '600' : '500',
              color: activeTab === tab.id ? '#3b82f6' : '#666',
              marginBottom: '-2px',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'team' && <TeamTab teamData={teamData} loading={loading} />}
      {activeTab === 'apikeys' && <ApiKeysTab />}
      {activeTab === 'webhooks' && <WebhooksTab />}
      {activeTab === 'schedules' && <SchedulesTab />}
      {activeTab === 'quotas' && <QuotasTab />}
      {activeTab === 'audit' && <AuditTab />}
    </div>
  );
}

/**
 * Team & Members Tab
 */
function TeamTab({ teamData, loading }: any) {
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    const loadMembers = async () => {
      try {
        const response = await fetch('/api/enterprise/team?section=members');
        if (response.ok) {
          const data = await response.json();
          setMembers(data.members || []);
        }
      } catch (error) {
        console.error('Failed to load members:', error);
      }
    };

    loadMembers();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
      {/* Team Info */}
      <div
        style={{
          padding: '20px',
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
        }}
      >
        <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
          Team Information
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#666' }}>Team Name</div>
            <div style={{ fontSize: '14px', fontWeight: '600', marginTop: '4px' }}>
              {teamData?.name || 'Loading...'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#666' }}>Plan</div>
            <div style={{ fontSize: '14px', fontWeight: '600', marginTop: '4px' }}>
              {teamData?.plan || 'Enterprise'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#666' }}>Created</div>
            <div style={{ fontSize: '14px', fontWeight: '600', marginTop: '4px' }}>
              {teamData?.createdAt ? new Date(teamData.createdAt).toLocaleDateString() : 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* Members List */}
      <div
        style={{
          padding: '20px',
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600' }}>Team Members ({members.length})</h2>
          <button
            style={{
              padding: '6px 12px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: '600',
            }}
          >
            Invite Member
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {members.map((member) => (
            <div
              key={member.id}
              style={{
                padding: '12px',
                backgroundColor: '#f9fafb',
                borderRadius: '6px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600' }}>{member.name}</div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                  {member.email}
                </div>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  padding: '4px 8px',
                  backgroundColor:
                    member.role === 'admin'
                      ? '#fecaca'
                      : member.role === 'manager'
                        ? '#fed7aa'
                        : '#dbeafe',
                  color:
                    member.role === 'admin'
                      ? '#992a2a'
                      : member.role === 'manager'
                        ? '#9a3412'
                        : '#1e40af',
                  borderRadius: '4px',
                  textTransform: 'capitalize',
                }}
              >
                {member.role}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * API Keys Tab
 */
function ApiKeysTab() {
  const [showNew, setShowNew] = useState(false);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600' }}>API Keys</h2>
        <button
          onClick={() => setShowNew(!showNew)}
          style={{
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600',
          }}
        >
          + New API Key
        </button>
      </div>

      {showNew && (
        <div
          style={{
            padding: '20px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #86efac',
            borderRadius: '8px',
            marginBottom: '16px',
          }}
        >
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Create API Key</h3>
          <input
            type="text"
            placeholder="API Key Name (e.g., CI/CD Pipeline)"
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #86efac',
              borderRadius: '6px',
              marginBottom: '12px',
              fontSize: '14px',
            }}
          />
          <button
            style={{
              padding: '8px 16px',
              backgroundColor: '#22c55e',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
            }}
          >
            Create Key
          </button>
        </div>
      )}

      <div
        style={{
          padding: '20px',
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
        }}
      >
        <div
          style={{
            padding: '12px',
            backgroundColor: '#f9fafb',
            borderRadius: '6px',
            marginBottom: '12px',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '14px', fontWeight: '600' }}>CI/CD Pipeline</div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>gvk_masking...</div>
          </div>
          <button
            style={{
              padding: '4px 8px',
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              border: 'none',
              borderRadius: '4px',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            Revoke
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Webhooks Tab
 */
function WebhooksTab() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Webhooks</h2>
        <button
          style={{
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600',
          }}
        >
          + New Webhook
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {['Slack Notifications', 'GitHub Status Updates'].map((name, idx) => (
          <div
            key={idx}
            style={{
              padding: '16px',
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600' }}>{name}</div>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                Active • Last triggered: 2 hours ago
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#f0f9ff',
                  color: '#3b82f6',
                  border: '1px solid #bfdbfe',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                Test
              </button>
              <button
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#fee2e2',
                  color: '#991b1b',
                  border: '1px solid #fecaca',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Schedules Tab
 */
function SchedulesTab() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Scheduled Workflows</h2>
        <button
          style={{
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600',
          }}
        >
          + New Schedule
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {[
          { name: 'Daily Metrics Collection', cron: '0 0 * * *', next: 'Today at 12:00 AM' },
          { name: 'Weekly Backup', cron: '0 2 * * 0', next: 'Sunday at 2:00 AM' },
        ].map((schedule, idx) => (
          <div
            key={idx}
            style={{
              padding: '16px',
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600' }}>{schedule.name}</div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  Cron: <code>{schedule.cron}</code>
                </div>
              </div>
              <div
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#d1fae5',
                  color: '#065f46',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '600',
                }}
              >
                Active
              </div>
            </div>
            <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
              Next execution: {schedule.next}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Quotas Tab
 */
function QuotasTab() {
  const quotas = [
    { name: 'Workflow Executions', used: 456, limit: 1000, unit: 'executions/month' },
    { name: 'API Requests', used: 28934, limit: 100000, unit: 'requests/month' },
    { name: 'Storage', used: 23.5, limit: 100, unit: 'GB' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
      {quotas.map((quota) => {
        const percentage = (quota.used / quota.limit) * 100;
        return (
          <div
            key={quota.name}
            style={{
              padding: '20px',
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ fontSize: '14px', fontWeight: '600' }}>{quota.name}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {quota.used} / {quota.limit}
              </div>
            </div>

            {/* Progress Bar */}
            <div
              style={{
                width: '100%',
                height: '8px',
                backgroundColor: '#e5e7eb',
                borderRadius: '4px',
                overflow: 'hidden',
                marginBottom: '8px',
              }}
            >
              <div
                style={{
                  height: '100%',
                  backgroundColor:
                    percentage > 80 ? '#ef4444' : percentage > 60 ? '#f59e0b' : '#22c55e',
                  width: `${Math.min(percentage, 100)}%`,
                }}
              />
            </div>

            <div style={{ fontSize: '12px', color: '#666' }}>
              {percentage.toFixed(1)}% used • {quota.unit}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Audit Log Tab
 */
function AuditTab() {
  return (
    <div
      style={{
        padding: '20px',
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
      }}
    >
      <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
        Audit Log
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {[
          { action: 'Workflow created', user: 'Alice Johnson', time: '2 hours ago', status: '✓' },
          { action: 'API key revoked', user: 'Bob Smith', time: '5 hours ago', status: '✓' },
          { action: 'Team member added', user: 'Carol Davis', time: '1 day ago', status: '✓' },
          { action: 'Webhook triggered', user: 'System', time: '3 hours ago', status: '✓' },
        ].map((entry, idx) => (
          <div
            key={idx}
            style={{
              padding: '12px',
              backgroundColor: '#f9fafb',
              borderRadius: '6px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600' }}>{entry.action}</div>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                {entry.user} • {entry.time}
              </div>
            </div>
            <span style={{ fontSize: '14px', color: '#22c55e' }}>{entry.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
