import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function AdminPlans() {
  const [plans, setPlans] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', price: '', duration_days: 30, features: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [planRes, subRes] = await Promise.all([
        api.get('/plans/all'),
        api.get('/plans/admin/subscriptions')
      ]);
      setPlans(planRes.data);
      setSubscriptions(subRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    const payload = {
      ...form,
      price: parseFloat(form.price),
      duration_days: parseInt(form.duration_days),
      features: form.features.split('\n').filter(f => f.trim())
    };
    try {
      if (editingPlan) {
        await api.put(`/plans/${editingPlan.id}`, payload);
      } else {
        await api.post('/plans', payload);
      }
      setShowForm(false);
      setEditingPlan(null);
      setForm({ name: '', description: '', price: '', duration_days: 30, features: '' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed');
    }
  };

  const handleEdit = (plan) => {
    const features = typeof plan.features === 'string' ? JSON.parse(plan.features) : (plan.features || []);
    setForm({
      name: plan.name,
      description: plan.description || '',
      price: plan.price.toString(),
      duration_days: plan.duration_days,
      features: features.join('\n')
    });
    setEditingPlan(plan);
    setShowForm(true);
  };

  const handleToggle = async (plan) => {
    await api.put(`/plans/${plan.id}`, { active: !plan.active });
    fetchData();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this plan?')) return;
    await api.delete(`/plans/${id}`);
    fetchData();
  };

  if (loading) return <div className="loading">Loading plans...</div>;

  return (
    <div className="page-body">
      <div className="page-header">
        <h1>Manage Plans</h1>
        <button className="btn btn-primary btn-sm" onClick={() => { setShowForm(!showForm); setEditingPlan(null); setForm({ name: '', description: '', price: '', duration_days: 30, features: '' }); }}>
          {showForm ? 'Cancel' : '+ New Plan'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3>{editingPlan ? 'Edit Plan' : 'Create Plan'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 12 }}>
            <div className="form-group">
              <label>Plan Name</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Basic" />
            </div>
            <div className="form-group">
              <label>Price (₹)</label>
              <input type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})} placeholder="e.g. 499" />
            </div>
            <div className="form-group">
              <label>Duration (days)</label>
              <input type="number" value={form.duration_days} onChange={e => setForm({...form, duration_days: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Description</label>
              <input value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Plan description" />
            </div>
          </div>
          <div className="form-group" style={{ marginTop: 8 }}>
            <label>Features (one per line)</label>
            <textarea
              value={form.features}
              onChange={e => setForm({...form, features: e.target.value})}
              placeholder={"1000 messages/month\n500 contacts\nBasic support"}
              rows={4}
              style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--border)' }}
            />
          </div>
          <button className="btn btn-primary btn-sm" onClick={handleSubmit} style={{ marginTop: 8 }}>
            {editingPlan ? 'Update Plan' : 'Create Plan'}
          </button>
        </div>
      )}

      <div className="card" style={{ marginBottom: 24 }}>
        <h3>All Plans</h3>
        <table style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Price</th>
              <th>Duration</th>
              <th>Features</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {plans.map(plan => {
              const features = typeof plan.features === 'string' ? JSON.parse(plan.features) : (plan.features || []);
              return (
                <tr key={plan.id}>
                  <td><strong>{plan.name}</strong></td>
                  <td>₹{plan.price}</td>
                  <td>{plan.duration_days} days</td>
                  <td style={{ fontSize: '0.85rem' }}>{features.slice(0, 2).join(', ')}{features.length > 2 ? '...' : ''}</td>
                  <td><span className={`badge ${plan.active ? 'badge-success' : 'badge-danger'}`}>{plan.active ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(plan)} style={{ marginRight: 4 }}>Edit</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleToggle(plan)} style={{ marginRight: 4 }}>{plan.active ? 'Disable' : 'Enable'}</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(plan.id)}>Delete</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>All Subscriptions</h3>
        {subscriptions.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', marginTop: 12 }}>No subscriptions yet</p>
        ) : (
          <table style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>User</th>
                <th>Plan</th>
                <th>Price Paid</th>
                <th>Status</th>
                <th>Started</th>
                <th>Expires</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map(sub => (
                <tr key={sub.id}>
                  <td>{sub.email}</td>
                  <td>{sub.plan_name}</td>
                  <td>₹{sub.price}</td>
                  <td><span className={`badge ${sub.status === 'active' ? 'badge-success' : 'badge-danger'}`}>{sub.status}</span></td>
                  <td>{new Date(sub.starts_at).toLocaleDateString()}</td>
                  <td>{new Date(sub.expires_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
