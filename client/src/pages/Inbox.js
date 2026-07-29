import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { FiSend, FiPaperclip, FiImage, FiFile, FiMic, FiX, FiArrowLeft, FiArrowUp, FiSearch } from 'react-icons/fi';
import { toast } from 'react-toastify';
import useSubscriptionGuard from '../hooks/useSubscriptionGuard';
import PaywallOverlay from '../components/PaywallOverlay';
import './Inbox.css';

let socket;

export default function Inbox() {
  const { hasSubscription, loading: subLoading } = useSubscriptionGuard();
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [labelFilter, setLabelFilter] = useState('all');
  const [showChat, setShowChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [flows, setFlows] = useState([]);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchConversations();
    socket = io(process.env.REACT_APP_API_URL?.replace('/api', '') || window.location.origin);
    socket.emit('join', user?.id);
    socket.on('new_message', (data) => {
      if (data.contact_id === selectedContact?.contact_id) {
        setMessages(prev => [...prev, data]);
      }
      fetchConversations();
    });
    return () => socket?.disconnect();
  }, [user?.id]);

  useEffect(() => {
    if (selectedContact?.contact_id) {
      fetchMessages(selectedContact.contact_id);
    }
  }, [selectedContact?.contact_id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages]);

  const fetchConversations = async () => {
    api.get('/messages')
      .then(res => setConversations(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));

    api.get('/flows').then(res => setFlows(res.data || [])).catch(() => {});
  };

  const fetchMessages = async (contactId) => {
    try {
      const res = await api.get(`/messages/${contactId}`);
      setMessages(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setMediaFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setMediaPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const removeMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !mediaFile) || !selectedContact || sending) return;
    setSending(true);
    try {
      const formData = new FormData();
      formData.append('contact_id', selectedContact.contact_id);
      if (mediaFile) {
        formData.append('media', mediaFile);
        formData.append('caption', newMessage);
      } else {
        formData.append('body', newMessage);
      }
      await api.post('/messages/send', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setNewMessage('');
      removeMedia();
      fetchMessages(selectedContact.contact_id);
      fetchConversations();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const renderMessage = (msg, index) => {
    const showDate = index === 0 || new Date(msg.created_at).toDateString() !== new Date(messages[index - 1]?.created_at).toDateString();

    const dateSeparator = showDate ? (
      <div style={{ textAlign: 'center', margin: '12px 0' }}>
        <span style={{ background: 'rgba(0,0,0,0.06)', padding: '4px 12px', borderRadius: 8, fontSize: '0.75rem', color: '#667781' }}>
          {new Date(msg.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </div>
    ) : null;

    const readReceipt = msg.direction === 'outbound' ? (
      <span style={{ marginLeft: 4, fontSize: '0.75rem' }}>
        {msg.status === 'read' ? '✓✓' : msg.status === 'delivered' ? '✓✓' : msg.status === 'sent' ? '✓' : ''}
      </span>
    ) : null;

    const content = (() => {
      if (msg.media_url && msg.message_type !== 'text' && msg.message_type !== 'template') {
        const mediaUrl = msg.media_url.startsWith('http') ? msg.media_url : `${process.env.REACT_APP_API_URL?.replace('/api', '') || ''}${msg.media_url}`;
        return (
          <>
            {msg.message_type === 'image' && <img src={mediaUrl} alt="" style={{ maxWidth: 250, borderRadius: 8, marginBottom: msg.body ? 8 : 0 }} />}
            {msg.message_type === 'video' && <video src={mediaUrl} controls style={{ maxWidth: 250, borderRadius: 8 }} />}
            {msg.message_type === 'audio' && <audio src={mediaUrl} controls style={{ maxWidth: 200 }} />}
            {msg.message_type === 'document' && (
              <a href={mediaUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, background: 'rgba(0,0,0,0.05)', borderRadius: 8, textDecoration: 'none', color: 'inherit' }}>
                <FiFile size={20} /><span>{msg.body || 'Document'}</span>
              </a>
            )}
            {msg.body && <div>{msg.body}</div>}
          </>
        );
      }
      return msg.body;
    })();

    return (
      <React.Fragment key={msg.id}>
        {dateSeparator}
        <div className={`message ${msg.direction}`}>
          <div>{content}</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 2 }}>
            <span style={{ fontSize: '0.65rem', color: '#667781' }}>
              {new Date(msg.created_at).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
            </span>
            {readReceipt}
          </div>
        </div>
      </React.Fragment>
    );
  };

  const filteredConversations = conversations.filter(conv => {
    const matchesLabel = labelFilter === 'all' || conv.label === labelFilter;
    const matchesSearch = !searchQuery || (conv.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (conv.phone || '').includes(searchQuery);
    return matchesLabel && matchesSearch;
  });

  if (loading) return <div className="loading">Loading inbox...</div>;

  if (!subLoading && !hasSubscription) return <PaywallOverlay toolName="Live Inbox" />;

  return (
    <div className="whatsapp-inbox">
      {/* Conversation List Panel */}
      <div className={`wa-sidebar ${showChat ? 'wa-sidebar-hidden' : ''}`}>
        <div className="wa-sidebar-header">
          <h3>Chats</h3>
        </div>

        {/* AI Agent Status */}
        {(() => {
          const activeFlows = flows.filter(f => f.active);
          if (activeFlows.length > 0) {
            return (
              <div style={{ padding: '8px 12px', background: '#dcfce7', borderRadius: 8, margin: '0 10px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }} />
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#065f46' }}>AI Auto-Reply ON</span>
              </div>
            );
          }
          return (
            <div style={{ padding: '8px 12px', background: '#fef3c7', borderRadius: 8, margin: '0 10px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#92400e' }}>AI Auto-Reply OFF</span>
            </div>
          );
        })()}

        <div className="wa-search">
          <FiSearch size={16} />
          <input type="text" placeholder="Search or start new chat" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <div className="wa-labels">
          {['all', 'new', 'pending', 'resolved'].map(label => (
            <button key={label} className={`wa-label-btn ${labelFilter === label ? 'active' : ''}`} onClick={() => setLabelFilter(label)}>
              {label.charAt(0).toUpperCase() + label.slice(1)}
            </button>
          ))}
        </div>
        <div className="wa-conversation-list">
          {filteredConversations.length === 0 ? (
            <div className="wa-empty">No conversations</div>
          ) : (
            filteredConversations.map(conv => (
              <div key={conv.contact_id} className={`wa-conversation ${selectedContact?.contact_id === conv.contact_id ? 'active' : ''}`} onClick={() => { setSelectedContact(conv); setShowChat(true); }}>
                <div className="wa-avatar">{getInitials(conv.name)}</div>
                <div className="wa-conv-info">
                  <div className="wa-conv-name">{conv.name || conv.phone}</div>
                  <div className="wa-conv-preview">{conv.last_message || (conv.last_message_type ? `[${conv.last_message_type}]` : 'No messages')}</div>
                </div>
                <div className="wa-conv-time">{conv.last_message_at ? new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Panel */}
      <div className={`wa-chat ${!showChat ? 'wa-chat-hidden' : ''}`}>
        {selectedContact ? (
          <>
            <div className="wa-chat-header">
              <button className="wa-back-btn" onClick={() => setShowChat(false)}><FiArrowLeft size={20} /></button>
              <div className="wa-avatar" style={{ width: 40, height: 40, fontSize: '0.9rem' }}>{getInitials(selectedContact.name)}</div>
              <div><div style={{ fontWeight: 500 }}>{selectedContact.name || selectedContact.phone}</div><div style={{ fontSize: '0.8rem', color: '#667781' }}>{selectedContact.phone}</div></div>
            </div>
            <div className="wa-messages">
              {messages.map((msg, i) => renderMessage(msg, i))}
              <div ref={messagesEndRef} />
            </div>
            {mediaPreview && (
              <div className="wa-media-preview">
                {mediaFile?.type?.startsWith('image/') ? <img src={mediaPreview} alt="" /> : <FiFile size={24} />}
                <span>{mediaFile?.name}</span>
                <button onClick={removeMedia}><FiX /></button>
              </div>
            )}
            <form className="wa-input-bar" onSubmit={sendMessage}>
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} style={{ display: 'none' }} accept="image/*,video/*,audio/*,.pdf,.doc,.docx" />
              <button type="button" onClick={() => fileInputRef.current?.click()} className="wa-attach-btn"><FiPaperclip size={20} /></button>
              <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Type a message" />
              <button type="submit" className="wa-send-btn" disabled={(!newMessage.trim() && !mediaFile) || sending}><FiSend size={18} /></button>
            </form>
          </>
        ) : (
          <div className="wa-chat-empty">
            <div className="wa-chat-empty-icon">💬</div>
            <h3>VONE DIGITALS CRM Web</h3>
            <p>Send and receive messages without keeping your phone online.</p>
            <p style={{ fontSize: '0.8rem', color: '#667781' }}>Select a chat from the left to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}
