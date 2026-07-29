import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { FiUserPlus, FiTrash2, FiUsers, FiUser, FiMail, FiBriefcase, FiLink } from 'react-icons/fi';
import useSubscriptionGuard from '../hooks/useSubscriptionGuard';
import PaywallOverlay from '../components/PaywallOverlay';

export default function Agents() {
  const { hasSubscription, loading: subLoading } = useSubscriptionGuard();
  const [agents, setAgents] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'support' });
  const [assignContact, setAssignContact] = useState('');
  const [assignAgent, setAssignAgent] = useState('');
  const [assignments, setAssignments] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [agentRes, contactRes] = await Promise.all([
        api.get('/agents'),
        api.get('/contacts')
      ]);
      setAgents(agentRes.data);
      setContacts(contactRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.email.trim()) return alert('Name and email required');
    try {
      await api.post('/agents', form);
      setForm({ name: '', email: '', role: 'support' });
      setShowForm(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create agent');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this agent?')) return;
    try {
      await api.delete(`/agents/${id}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete agent');
    }
  };

  const handleAssign = async () => {
    if (!assignContact || !assignAgent) return alert('Select both contact and agent');
    try {
      await api.post('/agents/assign', { contact_id: assignContact, agent_id: assignAgent });
      alert('Contact assigned to agent');
      setAssignContact('');
      setAssignAgent('');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to assign');
    }
  };

  if (!subLoading && !hasSubscription) return <PaywallOverlay toolName="AI Agents" />;
  if (loading) return <div className="loading">Loading agents...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="page-header">
        <h1>Team & Support Agents 👥</h1>
        {!showForm ? (
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
            <FiUserPlus /> Add Agent
          </button>
        ) : null}
      </div>

      <div className="page-body">
      {/* Add Agent Form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, background: 'var(--primary)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <FiUserPlus size={20} />
              </div>
              <h3 style={{ margin: 0 }}>Add New Agent</h3>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 16, alignItems: 'end' }}>
            <div className="form-group">
              <label><FiUser /> Name</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Agent name" />
            </div>
            <div className="form-group">
              <label><FiMail /> Email</label>
              <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="agent@email.com" />
            </div>
            <div className="form-group">
              <label><FiBriefcase /> Role</label>
              <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                <option value="support">Support</option>
                <option value="sales">Sales</option>
                <option value="manager">Manager</option>
              </select>
            </div>
            <button className="btn btn-primary" onClick={handleCreate} style={{ height: 44 }}>
              Create Agent
            </button>
          </div>
        </div>
      )}

      {/* All Agents */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ width: 40, height: 40, background: '#e3f2fd', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1976d2' }}>
            <FiUsers size={20} />
          </div>
          <div>
            <h3 style={{ margin: 0 }}>All Agents</h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{agents.length} agent(s) configured</p>
          </div>
        </div>

        {agents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--bg)', borderRadius: 12 }}>
            <FiUsers size={48} style={{ color: 'var(--text-muted)', marginBottom: 12, opacity: 0.4 }} />
            <h4 style={{ color: 'var(--text)', marginBottom: 8 }}>No agents yet</h4>
            <p style={{ color: 'var(--text-muted)', marginBottom: 16, fontSize: '0.9rem' }}>
              Add your team members to handle customer conversations
            </p>
            <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
              <FiUserPlus /> Add First Agent
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {agents.map(agent => {
              const roleColors = {
                support: { bg: '#e8f5e9', color: '#2e7d32', label: 'Support' },
                sales: { bg: '#fff3e0', color: '#e65100', label: 'Sales' },
                manager: { bg: '#e3f2fd', color: '#1565c0', label: 'Manager' }
              };
              const roleStyle = roleColors[agent.role] || roleColors.support;

              return (
                <div key={agent.id} style={{
                  background: 'white',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        background: roleStyle.bg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.2rem',
                        fontWeight: 600,
                        color: roleStyle.color
                      }}>
                        {agent.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '1rem' }}>{agent.name}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{agent.email}</div>
                      </div>
                    </div>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: 20,
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      background: roleStyle.bg,
                      color: roleStyle.color
                    }}>
                      {roleStyle.label}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1 }}
                      onClick={() => {
                        setAssignAgent(String(agent.id));
                        document.getElementById('assign-section')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      <FiLink /> Assign Contact
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleDelete(agent.id)}
                      style={{ color: 'var(--danger)' }}
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {/* Assign Contact to Agent */}
      {agents.length > 0 && (
        <div className="card" id="assign-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 40, height: 40, background: '#fff3e0', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e65100' }}>
              <FiLink size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0 }}>Assign Contact to Agent</h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Link a customer to a specific agent</p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 16, alignItems: 'end' }}>
            <div className="form-group">
              <label>Contact</label>
              <select value={assignContact} onChange={e => setAssignContact(e.target.value)}>
                <option value="">Select contact...</option>
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>{c.name || c.phone}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Agent</label>
              <select value={assignAgent} onChange={e => setAssignAgent(e.target.value)}>
                <option value="">Select agent...</option>
                {agents.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.role})</option>
                ))}
              </select>
            </div>
            <button className="btn btn-primary" onClick={handleAssign} style={{ height: 44 }}>
              Assign
            </button>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
