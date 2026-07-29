import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { FiPlus, FiTrash2, FiEdit, FiUpload, FiUsers, FiTag, FiActivity } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { SkeletonTable } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';
import useSubscriptionGuard from '../hooks/useSubscriptionGuard';
import PaywallOverlay from '../components/PaywallOverlay';

export default function Contacts() {
  const { hasSubscription, loading: subLoading } = useSubscriptionGuard();
  const [searchParams] = useSearchParams();
  const queryTab = searchParams.get('tab');
  const [contacts, setContacts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', tags: '', custom_fields: '' });
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [search, setSearch] = useState('');
  const [labels, setLabels] = useState([]);
  const [labelFilter, setLabelFilter] = useState(null);
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [labelForm, setLabelForm] = useState({ name: '', color: '#25D366' });
  const [assignLabelContact, setAssignLabelContact] = useState(null);
  const [activeTab, setActiveTab] = useState(queryTab || 'all');

  useEffect(() => {
    if (queryTab) {
      setActiveTab(queryTab);
      if (queryTab === 'labels') setShowLabelModal(true);
    }
  }, [queryTab]);

  useEffect(() => {
    fetchContacts();
    fetchLabels();
  }, []);

  const fetchContacts = async () => {
    try {
      const res = await api.get('/contacts');
      setContacts(res.data);
    } catch (err) {
      console.error('Fetch contacts error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLabels = async () => {
    try {
      const res = await api.get('/contacts/labels');
      setLabels(res.data);
    } catch (err) {}
  };

  const createLabel = async () => {
    if (!labelForm.name.trim()) return;
    try {
      await api.post('/contacts/labels', labelForm);
      toast.success('Label created');
      setLabelForm({ name: '', color: '#25D366' });
      setShowLabelModal(false);
      fetchLabels();
    } catch (err) {
      toast.error('Failed to create label');
    }
  };

  const deleteLabel = async (id) => {
    try {
      await api.delete(`/contacts/labels/${id}`);
      toast.success('Label deleted');
      fetchLabels();
    } catch (err) {
      toast.error('Failed to delete label');
    }
  };

  const assignLabel = async (contactId, labelId) => {
    try {
      await api.post(`/contacts/${contactId}/label`, { label_id: labelId });
      toast.success('Label assigned');
      setAssignLabelContact(null);
      fetchContacts();
    } catch (err) {
      toast.error('Failed to assign label');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: form.name,
        phone: form.phone,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()) : [],
        custom_fields: form.custom_fields ? JSON.parse(form.custom_fields) : {}
      };

      if (editingContact) {
        await api.put(`/contacts/${editingContact.id}`, payload);
        toast.success('Contact updated');
      } else {
        await api.post('/contacts', payload);
        toast.success('Contact added');
      }
      setShowModal(false);
      setForm({ name: '', phone: '', tags: '', custom_fields: '' });
      setEditingContact(null);
      fetchContacts();
    } catch (err) {
      toast.error('Failed to save contact');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/contacts/${deleteId}`);
      toast.success('Contact deleted');
      setDeleteId(null);
      fetchContacts();
    } catch (err) {
      toast.error('Failed to delete contact');
    }
  };

  const handleEdit = (contact) => {
    setEditingContact(contact);
    setForm({
      name: contact.name || '',
      phone: contact.phone || '',
      tags: Array.isArray(contact.tags) ? contact.tags.join(', ') : '',
      custom_fields: contact.custom_fields ? JSON.stringify(contact.custom_fields) : ''
    });
    setShowModal(true);
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.warning('Please select a CSV file');
      return;
    }

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/contacts/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(res.data.message || 'Import successful!');
      fetchContacts();
    } catch (err) {
      toast.error('Import failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const filtered = contacts.filter(c => {
    const matchesSearch = c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search);
    const matchesLabel = !labelFilter || c.label_id === labelFilter;
    return matchesSearch && matchesLabel;
  });

  if (!subLoading && !hasSubscription) return <PaywallOverlay toolName="Contacts" />;
  if (loading) return <SkeletonTable rows={8} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="page-header">
        <h1>Contacts</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search contacts..."
            style={{ padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 6, fontSize: '0.85rem', width: 200 }}
          />
          <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
            <FiUpload /> {importing ? 'Importing...' : 'Import CSV'}
            <input type="file" accept=".csv" onChange={handleImport} hidden />
          </label>
          <button className="btn btn-primary btn-sm" onClick={() => { setEditingContact(null); setForm({ name: '', phone: '', tags: '', custom_fields: '' }); setShowModal(true); }}>
            <FiPlus /> Add Contact
          </button>
        </div>
      </div>

      <div className="page-body">
      {/* Label Filter Bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          onClick={() => setLabelFilter(null)}
          style={{
            padding: '4px 12px', borderRadius: 20, border: '1px solid var(--border)',
            background: !labelFilter ? 'var(--primary)' : 'var(--card)',
            color: !labelFilter ? 'white' : 'var(--text)',
            cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500
          }}
        >
          All
        </button>
        {labels.map(label => (
          <button
            key={label.id}
            onClick={() => setLabelFilter(labelFilter === label.id ? null : label.id)}
            style={{
              padding: '4px 12px', borderRadius: 20, border: `1px solid ${label.color}`,
              background: labelFilter === label.id ? label.color : 'transparent',
              color: labelFilter === label.id ? 'white' : label.color,
              cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500
            }}
          >
            {label.name}
          </button>
        ))}
        <button
          onClick={() => setShowLabelModal(true)}
          style={{
            padding: '4px 12px', borderRadius: 20, border: '1px dashed var(--border)',
            background: 'transparent', cursor: 'pointer', fontSize: '0.8rem',
            color: 'var(--text-muted)'
          }}
        >
          + New Label
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<FiUsers size={32} />}
          title={search ? 'No contacts found' : 'No contacts yet'}
          description={search ? 'Try a different search term' : 'Add your first contact to get started'}
          action={!search && (
            <button className="btn btn-primary btn-sm" onClick={() => { setEditingContact(null); setForm({ name: '', phone: '', tags: '', custom_fields: '' }); setShowModal(true); }}>
              <FiPlus /> Add Contact
            </button>
          )}
        />
      ) : (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Contact</th>
                  <th>Phone Number</th>
                  <th>Tags</th>
                  <th>Label</th>
                  <th>Joined Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((contact) => (
                  <tr key={contact.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%',
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: '0.85rem'
                        }}>
                          {(contact.name || contact.phone || 'C').charAt(0).toUpperCase()}
                        </div>
                        <strong style={{ fontWeight: 600, color: 'var(--text)' }}>{contact.name || 'Unnamed Contact'}</strong>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 500, color: 'var(--text-muted)' }}>{contact.phone}</td>
                    <td>
                      {Array.isArray(contact.tags) && contact.tags.length > 0
                        ? contact.tags.map((tag, i) => <span key={i} className="badge badge-info" style={{ marginRight: 4 }}>{tag}</span>)
                        : <span style={{ color: 'var(--text-light)', fontSize: '0.8rem' }}>No tags</span>}
                    </td>
                    <td>
                      {contact.label_id ? (
                        (() => { const l = labels.find(x => x.id === contact.label_id); return l ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 99, background: l.color + '15', color: l.color, fontSize: '0.75rem', fontWeight: 600, border: `1px solid ${l.color}30` }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: l.color }} />
                            {l.name}
                          </span>
                        ) : <span style={{ color: 'var(--text-light)', fontSize: '0.8rem' }}>None</span>; })()
                      ) : <span style={{ color: 'var(--text-light)', fontSize: '0.8rem' }}>None</span>}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{new Date(contact.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => setAssignLabelContact(contact)} title="Assign Label" style={{ padding: '4px 8px' }}><FiTag size={13} /></button>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(contact)} title="Edit" style={{ padding: '4px 8px' }}><FiEdit size={13} color="var(--primary)" /></button>
                        <button className="btn btn-secondary btn-sm" onClick={() => setDeleteId(contact.id)} title="Delete" style={{ padding: '4px 8px' }}><FiTrash2 size={13} color="var(--danger)" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {deleteId && (
        <ConfirmDialog
          title="Delete Contact"
          message="Are you sure you want to delete this contact? This action cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingContact ? 'Edit Contact' : 'Add Contact'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Contact name" />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1234567890" required />
              </div>
              <div className="form-group">
                <label>Tags (comma separated)</label>
                <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="vip, lead, customer" />
              </div>
              <div className="form-group">
                <label>Custom Fields (JSON)</label>
                <textarea value={form.custom_fields} onChange={(e) => setForm({ ...form, custom_fields: e.target.value })} placeholder='{"company": "ACME"}' rows={3} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingContact ? 'Update' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Label Modal */}
      {showLabelModal && (
        <div className="modal-overlay" onClick={() => setShowLabelModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 360 }}>
            <h2>Create Label</h2>
            <div className="form-group">
              <label>Label Name</label>
              <input value={labelForm.name} onChange={e => setLabelForm({ ...labelForm, name: e.target.value })} placeholder="e.g. VIP, Lead, Customer" />
            </div>
            <div className="form-group">
              <label>Color</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['#25D366', '#3498db', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c', '#e91e63'].map(c => (
                  <button key={c} onClick={() => setLabelForm({ ...labelForm, color: c })}
                    style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: labelForm.color === c ? '3px solid var(--text)' : '3px solid transparent', cursor: 'pointer' }} />
                ))}
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary btn-sm" onClick={() => setShowLabelModal(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={createLabel}>Create</button>
            </div>
            {labels.length > 0 && (
              <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 8 }}>Existing Labels</div>
                {labels.map(l => (
                  <div key={l.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 12, height: 12, borderRadius: '50%', background: l.color, display: 'inline-block' }} />
                      {l.name}
                    </span>
                    <button onClick={() => deleteLabel(l.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '0.8rem' }}>Delete</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Assign Label Modal */}
      {assignLabelContact && (
        <div className="modal-overlay" onClick={() => setAssignLabelContact(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 360 }}>
            <h2>Assign Label</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 12 }}>To: {assignLabelContact.name || assignLabelContact.phone}</p>
            {labels.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No labels created yet. Create one first.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {labels.map(l => (
                  <button key={l.id} onClick={() => assignLabel(assignLabelContact.id, l.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--card)', cursor: 'pointer', textAlign: 'left' }}>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: l.color }} />
                    {l.name}
                  </button>
                ))}
              </div>
            )}
            <div className="modal-actions" style={{ marginTop: 12 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setAssignLabelContact(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
