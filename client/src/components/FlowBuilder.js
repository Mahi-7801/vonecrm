import React, { useState, useRef, useCallback, useEffect } from 'react';
import { FiMessageSquare, FiHelpCircle, FiGitBranch, FiZap, FiPlay, FiSquare, FiX, FiTrash2, FiPlus, FiLink, FiCpu, FiList, FiCheckSquare } from 'react-icons/fi';
import api from '../services/api';
import './FlowBuilder.css';

const NODE_TYPES = [
  { type: 'start', label: 'Start', icon: <FiPlay />, color: '#27ae60', description: 'Entry point' },
  { type: 'message', label: 'Message', icon: <FiMessageSquare />, color: '#25D366', description: 'Send a message' },
  { type: 'list_message', label: 'WA List', icon: <FiList />, color: '#00a884', description: 'WhatsApp list menu' },
  { type: 'reply_buttons', label: 'WA Buttons', icon: <FiCheckSquare />, color: '#00a884', description: 'Quick reply buttons' },
  { type: 'question', label: 'Question', icon: <FiHelpCircle />, color: '#3498db', description: 'Ask user input' },
  { type: 'condition', label: 'Condition', icon: <FiGitBranch />, color: '#f39c12', description: 'Branch logic' },
  { type: 'action', label: 'Action', icon: <FiZap />, color: '#9b59b6', description: 'API call or action' },
  { type: 'ai_response', label: 'AI Response', icon: <FiCpu />, color: '#00b4d8', description: 'AI auto-reply' },
  { type: 'end', label: 'End', icon: <FiSquare />, color: '#e74c3c', description: 'End flow' },
];

const DEFAULT_NODE_DATA = {
  start: { message: 'Flow started' },
  message: { message: 'Hello! How can I help you?', buttons: [] },
  list_message: {
    message: 'Select an option:',
    button_text: 'View Services',
    sections: [{
      title: 'Our Services',
      rows: [
        { id: 'fullstack', title: 'Full Stack Development', description: 'React, Node.js, MERN' },
        { id: 'wordpress', title: 'WordPress Development', description: 'Custom themes & plugins' },
        { id: 'digitalmarketing', title: 'Digital Marketing', description: 'SEO, Social Media, Ads' },
      ]
    }]
  },
  reply_buttons: {
    message: 'Choose an option:',
    buttons: [
      { id: 'option1', label: 'Option 1' },
      { id: 'option2', label: 'Option 2' },
    ]
  },
  question: { message: 'What is your name?', variable: 'user_name', options: [] },
  condition: { variable: '', operator: 'equals', value: '' },
  action: { actionType: 'api_call', url: '', method: 'POST' },
  ai_response: { message: 'Let me help you with that...', ai_enabled: true, website_url: '' },
  end: { message: 'Thank you!' },
};

let nodeIdCounter = 0;
const genId = () => `node_${++nodeIdCounter}_${Date.now()}`;

export default function FlowBuilder({ initialFlow, onSave, onCancel }) {
  const canvasRef = useRef(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [connecting, setConnecting] = useState(null);
  const [connectMouse, setConnectMouse] = useState({ x: 0, y: 0 });
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [flowName, setFlowName] = useState(initialFlow?.name || 'Untitled Flow');
  const [triggerKeyword, setTriggerKeyword] = useState(initialFlow?.trigger_keyword || '');

  // AI Agents
  const [aiAgents, setAiAgents] = useState([]);

  // Test mode state
  const [testMode, setTestMode] = useState(false);
  const [testConversation, setTestConversation] = useState(null);
  const [testMessages, setTestMessages] = useState([]);
  const [testInput, setTestInput] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [testFlowId, setTestFlowId] = useState(null);

  // Load initial flow
  useEffect(() => {
    if (initialFlow?.flow_json) {
      let data = initialFlow.flow_json;
      while (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch (e) {
          break;
        }
      }

      const nodesArray = Array.isArray(data?.nodes) ? data.nodes : (data && typeof data === 'object' ? data.nodes || [] : []);
      const edgesArray = Array.isArray(data?.edges) ? data.edges : (data && typeof data === 'object' ? data.edges || [] : []);

      // Auto-layout node positions cleanly so nodes never overlap on canvas load
      const seenPos = new Set();
      const loadedNodes = nodesArray.map((node, index) => {
        let x = node.x !== undefined && node.x !== 0 ? node.x : 350;
        let y = node.y !== undefined && node.y !== 0 ? node.y : (80 + index * 190);

        const posKey = `${x},${y}`;
        if (seenPos.has(posKey)) {
          x = 350 + (index % 3) * 220;
          y = 80 + Math.floor(index / 3) * 190;
        }
        seenPos.add(`${x},${y}`);
        return { ...node, x, y };
      });

      if (loadedNodes.length > 0) {
        setNodes(loadedNodes);
        setEdges(edgesArray);
      } else {
        const startId = genId();
        setNodes([{
          id: startId,
          type: 'start',
          x: 350,
          y: 80,
          data: { ...DEFAULT_NODE_DATA.start }
        }]);
      }

      nodeIdCounter = Math.max(0, ...(nodesArray.map(n => {
        const match = n.id?.match(/node_(\d+)_/);
        return match ? parseInt(match[1]) : 0;
      })));
    } else {
      const startId = genId();
      setNodes([{
        id: startId,
        type: 'start',
        x: 350,
        y: 80,
        data: { ...DEFAULT_NODE_DATA.start }
      }]);
    }
  }, [initialFlow]);

  // Fetch AI agents
  useEffect(() => {
    api.get('/ai-agents').then(res => {
      console.log('AI Agents loaded:', res.data);
      setAiAgents(res.data);
    }).catch(err => {
      console.log('AI Agents fetch error:', err.message);
    });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNode) {
        e.preventDefault();
        deleteNode(selectedNode);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode]);

  const getFlowJson = useCallback(() => ({
    nodes: nodes.map(n => ({ ...n })),
    edges: edges.map(e => ({ ...e }))
  }), [nodes, edges]);

  // Sidebar drag
  const handleSidebarDragStart = (e, type) => {
    e.dataTransfer.setData('nodeType', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  // Canvas drop
  const handleCanvasDrop = (e) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('nodeType');
    if (!type) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - canvasOffset.x;
    const y = e.clientY - rect.top - canvasOffset.y;

    const newNode = {
      id: genId(),
      type,
      x: Math.round(x / 20) * 20,
      y: Math.round(y / 20) * 20,
      data: { ...DEFAULT_NODE_DATA[type] }
    };

    setNodes(prev => [...prev, newNode]);
    setSelectedNode(newNode.id);
  };

  const handleCanvasDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  // Node click on canvas
  const handleNodeClick = (e, nodeId) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedNode(nodeId);
  };

  // Node drag on canvas
  const handleNodeMouseDown = (e, nodeId) => {
    if (e.button !== 0) return;
    e.stopPropagation();

    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    setSelectedNode(nodeId);

    const rect = canvasRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left - canvasOffset.x - node.x,
      y: e.clientY - rect.top - canvasOffset.y - node.y
    });
    setDragging(nodeId);
  };

  const handleMouseMove = (e) => {
    if (dragging) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - canvasOffset.x - dragOffset.x;
      const y = e.clientY - rect.top - canvasOffset.y - dragOffset.y;
      setNodes(prev => prev.map(n =>
        n.id === dragging
          ? { ...n, x: Math.round(x / 20) * 20, y: Math.round(y / 20) * 20 }
          : n
      ));
    }

    if (connecting) {
      const rect = canvasRef.current.getBoundingClientRect();
      setConnectMouse({
        x: e.clientX - rect.left - canvasOffset.x,
        y: e.clientY - rect.top - canvasOffset.y
      });
    }

    if (panning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setCanvasOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setDragging(null);
    setPanning(false);

    if (connecting) {
      const targetNode = nodes.find(n => {
        const dx = connectMouse.x - n.x;
        const dy = connectMouse.y - n.y;
        return Math.abs(dx) < 80 && Math.abs(dy) < 40 && n.id !== connecting.from;
      });

      if (targetNode) {
        const exists = edges.some(e => e.from === connecting.from && e.to === targetNode.id);
        if (!exists) {
          setEdges(prev => [...prev, { from: connecting.from, to: targetNode.id, label: connecting.label || '' }]);
        }
      }
      setConnecting(null);
    }
  };

  const handleCanvasMouseDown = (e) => {
    // Only deselect and start panning when clicking on the canvas background (not on nodes)
    const isNode = e.target.closest('.flow-node');
    const isPort = e.target.closest('.flow-port');
    if (!isNode && !isPort) {
      setSelectedNode(null);
      setPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  // Connection port click
  const handlePortClick = (e, nodeId, label) => {
    e.stopPropagation();
    if (connecting?.from === nodeId) {
      setConnecting(null);
      return;
    }
    setConnecting({ from: nodeId, label });
    const rect = canvasRef.current.getBoundingClientRect();
    setConnectMouse({
      x: e.clientX - rect.left - canvasOffset.x,
      y: e.clientY - rect.top - canvasOffset.y
    });
  };

  // Delete node
  const deleteNode = (nodeId) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setEdges(prev => prev.filter(e => e.from !== nodeId && e.to !== nodeId));
    if (selectedNode === nodeId) setSelectedNode(null);
  };

  // Delete edge
  const deleteEdge = (idx) => {
    setEdges(prev => prev.filter((_, i) => i !== idx));
  };

  // Update node data
  const updateNodeData = (nodeId, key, value) => {
    setNodes(prev => prev.map(n =>
      n.id === nodeId ? { ...n, data: { ...n.data, [key]: value } } : n
    ));
  };

  // Add button to node
  const addButtonToNode = (nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const buttons = node.data?.buttons || [];
    const newButton = { label: `Button ${buttons.length + 1}`, target: '' };

    updateNodeData(nodeId, 'buttons', [...buttons, newButton]);
  };

  // Update button in node
  const updateNodeButton = (nodeId, buttonIndex, key, value) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const buttons = [...(node.data?.buttons || [])];
    buttons[buttonIndex] = { ...buttons[buttonIndex], [key]: value };
    updateNodeData(nodeId, 'buttons', buttons);
  };

  // Remove button from node
  const removeButtonFromNode = (nodeId, buttonIndex) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const buttons = (node.data?.buttons || []).filter((_, i) => i !== buttonIndex);
    updateNodeData(nodeId, 'buttons', buttons);
  };

  // Auto-link button to node
  const autoLinkButton = (nodeId, buttonIndex, targetNodeId) => {
    updateNodeButton(nodeId, buttonIndex, 'target', targetNodeId);

    // Also create an edge
    const exists = edges.some(e => e.from === nodeId && e.to === targetNodeId);
    if (!exists) {
      setEdges(prev => [...prev, { from: nodeId, to: targetNodeId, label: '' }]);
    }
  };

  // Test mode functions
  const startTest = async () => {
    if (!initialFlow?.id) {
      // Save first, then test
      alert('Please save the flow first before testing');
      return;
    }

    setTestMode(true);
    setTestMessages([]);
    setTestLoading(true);

    try {
      const res = await api.post(`/flows/${initialFlow.id}/conversation`);
      setTestConversation(res.data.conversation_id);
      setTestMessages([
        { role: 'assistant', content: res.data.message, buttons: res.data.buttons || [] }
      ]);
    } catch (err) {
      console.error('Start test error:', err);
      setTestMessages([{ role: 'system', content: 'Failed to start test conversation' }]);
    } finally {
      setTestLoading(false);
    }
  };

  const handleTestButtonClick = async (button) => {
    if (!testConversation || !initialFlow?.id) return;

    setTestLoading(true);
    try {
      const res = await api.post(`/flows/${initialFlow.id}/conversation/${testConversation}/button`, {
        button_label: button.label,
        button_target: button.target
      });

      setTestMessages(prev => [
        ...prev,
        { role: 'button_click', content: button.label },
        { role: 'assistant', content: res.data.message, buttons: res.data.buttons || [], ai_generated: res.data.ai_generated }
      ]);

      if (res.data.ended) {
        setTestMessages(prev => [...prev, { role: 'system', content: 'Flow ended' }]);
      }
    } catch (err) {
      console.error('Test button error:', err);
    } finally {
      setTestLoading(false);
    }
  };

  const selectedNodeObj = nodes.find(n => n.id === selectedNode);

  const getNodeStyle = (type) => {
    const nt = NODE_TYPES.find(t => t.type === type);
    return nt || NODE_TYPES[0];
  };

  // Test panel
  if (testMode) {
    return (
      <div className="flow-test-panel">
        <div className="flow-test-header">
          <h3>Test Flow: {flowName}</h3>
          <button className="btn btn-secondary btn-sm" onClick={() => setTestMode(false)}>Back to Editor</button>
        </div>
        <div className="flow-test-chat">
          {testMessages.map((msg, idx) => (
            <div key={idx} className={`flow-test-message ${msg.role}`}>
              {msg.role === 'button_click' && <span className="flow-test-btn-click">Clicked: {msg.content}</span>}
              {msg.role === 'assistant' && (
                <>
                  <div className="flow-test-bubble">{msg.content}</div>
                  {msg.ai_generated && <span className="flow-test-ai-badge">AI Generated</span>}
                  {msg.buttons && msg.buttons.length > 0 && (
                    <div className="flow-test-buttons">
                      {msg.buttons.map((btn, bidx) => (
                        <button
                          key={bidx}
                          className="flow-test-btn"
                          onClick={() => handleTestButtonClick(btn)}
                          disabled={testLoading}
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
              {msg.role === 'system' && <div className="flow-test-system">{msg.content}</div>}
            </div>
          ))}
          {testLoading && <div className="flow-test-loading">Typing...</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="flow-builder">
      {/* Header */}
      <div className="flow-builder-header">
        <div className="flow-header-left">
          <input
            className="flow-name-input"
            value={flowName}
            onChange={(e) => setFlowName(e.target.value)}
            placeholder="Flow name"
          />
          <div className="flow-trigger-input">
            <label>Trigger:</label>
            <input
              value={triggerKeyword}
              onChange={(e) => setTriggerKeyword(e.target.value)}
              placeholder="e.g. good morning, hi, hello"
              className="flow-trigger-field"
            />
          </div>
        </div>
        <div className="flow-builder-actions">
          <button className="btn btn-secondary btn-sm" onClick={startTest}>
            <FiPlay /> Test Flow
          </button>
          <button className="btn btn-secondary btn-sm" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={() => onSave({ name: flowName, flow_json: getFlowJson(), trigger_keyword: triggerKeyword || null })}>
            Save Flow
          </button>
        </div>
      </div>

      <div className="flow-builder-body">
        {/* Sidebar - Node Palette */}
        <div className="flow-sidebar">
          <h4>Nodes</h4>
          <p className="flow-sidebar-hint">Drag onto canvas</p>
          {NODE_TYPES.map(nt => (
            <div
              key={nt.type}
              className="flow-node-palette"
              draggable
              onDragStart={(e) => handleSidebarDragStart(e, nt.type)}
            >
              <span className="flow-node-palette-icon" style={{ background: nt.color }}>{nt.icon}</span>
              <div>
                <div className="flow-node-palette-label">{nt.label}</div>
                <div className="flow-node-palette-desc">{nt.description}</div>
              </div>
            </div>
          ))}

          {/* Node Editor */}
          {selectedNodeObj && (
            <div className="flow-node-editor">
              <h4>Edit Node</h4>
              <div className="flow-editor-field">
                <label>Type</label>
                <span className="badge badge-info">{selectedNodeObj.type}</span>
              </div>

              {/* Message field for most node types */}
              {(selectedNodeObj.type === 'message' || selectedNodeObj.type === 'start' || selectedNodeObj.type === 'end' || selectedNodeObj.type === 'ai_response') && (
                <div className="flow-editor-field">
                  <label>Message</label>
                  <textarea
                    value={selectedNodeObj.data?.message || ''}
                    onChange={(e) => updateNodeData(selectedNodeObj.id, 'message', e.target.value)}
                    rows={3}
                  />
                </div>
              )}

              {/* Question node */}
              {selectedNodeObj.type === 'question' && (
                <>
                  <div className="flow-editor-field">
                    <label>Question</label>
                    <textarea
                      value={selectedNodeObj.data?.message || ''}
                      onChange={(e) => updateNodeData(selectedNodeObj.id, 'message', e.target.value)}
                      rows={2}
                    />
                  </div>
                  <div className="flow-editor-field">
                    <label>Save to variable</label>
                    <input
                      value={selectedNodeObj.data?.variable || ''}
                      onChange={(e) => updateNodeData(selectedNodeObj.id, 'variable', e.target.value)}
                      placeholder="e.g. user_name"
                    />
                  </div>
                </>
              )}

              {/* Condition node */}
              {selectedNodeObj.type === 'condition' && (
                <>
                  <div className="flow-editor-field">
                    <label>Variable</label>
                    <input
                      value={selectedNodeObj.data?.variable || ''}
                      onChange={(e) => updateNodeData(selectedNodeObj.id, 'variable', e.target.value)}
                      placeholder="e.g. user_name"
                    />
                  </div>
                  <div className="flow-editor-field">
                    <label>Operator</label>
                    <select
                      value={selectedNodeObj.data?.operator || 'equals'}
                      onChange={(e) => updateNodeData(selectedNodeObj.id, 'operator', e.target.value)}
                    >
                      <option value="equals">Equals</option>
                      <option value="not_equals">Not Equals</option>
                      <option value="contains">Contains</option>
                    </select>
                  </div>
                  <div className="flow-editor-field">
                    <label>Value</label>
                    <input
                      value={selectedNodeObj.data?.value || ''}
                      onChange={(e) => updateNodeData(selectedNodeObj.id, 'value', e.target.value)}
                    />
                  </div>
                </>
              )}

              {/* Action node */}
              {selectedNodeObj.type === 'action' && (
                <>
                  <div className="flow-editor-field">
                    <label>Action Type</label>
                    <select
                      value={selectedNodeObj.data?.actionType || 'api_call'}
                      onChange={(e) => updateNodeData(selectedNodeObj.id, 'actionType', e.target.value)}
                    >
                      <option value="api_call">API Call</option>
                      <option value="set_variable">Set Variable</option>
                    </select>
                  </div>
                  <div className="flow-editor-field">
                    <label>URL / Endpoint</label>
                    <input
                      value={selectedNodeObj.data?.url || ''}
                      onChange={(e) => updateNodeData(selectedNodeObj.id, 'url', e.target.value)}
                      placeholder="https://api.example.com/webhook"
                    />
                  </div>
                </>
              )}

              {/* AI Response node */}
              {selectedNodeObj.type === 'ai_response' && (
                <>
                  <div className="flow-editor-field">
                    <label>
                      <FiCpu /> AI Enabled
                    </label>
                    <label className="flow-toggle">
                      <input
                        type="checkbox"
                        checked={selectedNodeObj.data?.ai_enabled || false}
                        onChange={(e) => updateNodeData(selectedNodeObj.id, 'ai_enabled', e.target.checked)}
                      />
                      <span>Enable AI auto-response</span>
                    </label>
                  </div>
                  <div className="flow-editor-field">
                    <label>Select AI Agent</label>
                    <select
                      value={selectedNodeObj.data?.agent_id || ''}
                      onChange={(e) => {
                        const agent = aiAgents.find(a => String(a.id) === e.target.value);
                        updateNodeData(selectedNodeObj.id, 'agent_id', e.target.value);
                        if (agent) {
                          updateNodeData(selectedNodeObj.id, 'agent_name', agent.name);
                          updateNodeData(selectedNodeObj.id, 'system_prompt', agent.system_prompt);
                        }
                      }}
                    >
                      <option value="">Default (General AI)</option>
                      {aiAgents.map(agent => (
                        <option key={agent.id} value={agent.id}>
                          {agent.avatar_emoji} {agent.name}
                        </option>
                      ))}
                    </select>
                    {selectedNodeObj.data?.agent_name && (
                      <p className="flow-editor-hint">Using: {selectedNodeObj.data.agent_name}</p>
                    )}
                  </div>
                  <div className="flow-editor-field">
                    <label>Website URL (for AI context)</label>
                    <input
                      value={selectedNodeObj.data?.website_url || ''}
                      onChange={(e) => updateNodeData(selectedNodeObj.id, 'website_url', e.target.value)}
                      placeholder="https://example.com"
                    />
                    <p className="flow-editor-hint">AI will fetch this URL for context</p>
                  </div>
                </>
              )}

              {/* List Message node */}
              {selectedNodeObj.type === 'list_message' && (
                <>
                  <div className="flow-editor-field">
                    <label>Message</label>
                    <textarea
                      value={selectedNodeObj.data?.message || ''}
                      onChange={(e) => updateNodeData(selectedNodeObj.id, 'message', e.target.value)}
                      rows={2}
                    />
                  </div>
                  <div className="flow-editor-field">
                    <label>Button Text</label>
                    <input
                      value={selectedNodeObj.data?.button_text || ''}
                      onChange={(e) => updateNodeData(selectedNodeObj.id, 'button_text', e.target.value)}
                      placeholder="View Services"
                    />
                  </div>
                  <div className="flow-editor-field">
                    <label>List Items</label>
                    {(selectedNodeObj.data?.sections?.[0]?.rows || []).map((row, idx) => (
                      <div key={idx} className="flow-list-item">
                        <input
                          value={row.title}
                          onChange={(e) => {
                            const sections = [...(selectedNodeObj.data?.sections || [{ title: '', rows: [] }])];
                            const rows = [...sections[0].rows];
                            rows[idx] = { ...rows[idx], title: e.target.value };
                            sections[0] = { ...sections[0], rows };
                            updateNodeData(selectedNodeObj.id, 'sections', sections);
                          }}
                          placeholder="Service name"
                          className="flow-button-input"
                        />
                        <button
                          className="flow-button-remove"
                          onClick={() => {
                            const sections = [...(selectedNodeObj.data?.sections || [{ title: '', rows: [] }])];
                            const rows = sections[0].rows.filter((_, i) => i !== idx);
                            sections[0] = { ...sections[0], rows };
                            updateNodeData(selectedNodeObj.id, 'sections', sections);
                          }}
                        >
                          <FiX />
                        </button>
                      </div>
                    ))}
                    <button
                      className="flow-button-add"
                      onClick={() => {
                        const sections = [...(selectedNodeObj.data?.sections || [{ title: '', rows: [] }])];
                        if (!sections[0]) sections[0] = { title: '', rows: [] };
                        sections[0] = { ...sections[0], rows: [...sections[0].rows, { id: `item_${Date.now()}`, title: 'New Item', description: '' }] };
                        updateNodeData(selectedNodeObj.id, 'sections', sections);
                      }}
                    >
                      <FiPlus /> Add Item
                    </button>
                  </div>
                </>
              )}

              {/* Reply Buttons node */}
              {selectedNodeObj.type === 'reply_buttons' && (
                <>
                  <div className="flow-editor-field">
                    <label>Message</label>
                    <textarea
                      value={selectedNodeObj.data?.message || ''}
                      onChange={(e) => updateNodeData(selectedNodeObj.id, 'message', e.target.value)}
                      rows={2}
                    />
                  </div>
                  <div className="flow-editor-field">
                    <label>Quick Reply Buttons (max 3)</label>
                    {(selectedNodeObj.data?.buttons || []).map((btn, idx) => (
                      <div key={idx} className="flow-button-item">
                        <input
                          value={btn.label}
                          onChange={(e) => {
                            const buttons = [...(selectedNodeObj.data?.buttons || [])];
                            buttons[idx] = { ...buttons[idx], label: e.target.value, id: e.target.value.toLowerCase().replace(/\s+/g, '_') };
                            updateNodeData(selectedNodeObj.id, 'buttons', buttons);
                          }}
                          placeholder="Button label"
                          className="flow-button-input"
                        />
                        <select
                          value={btn.target || ''}
                          onChange={(e) => {
                            const buttons = [...(selectedNodeObj.data?.buttons || [])];
                            buttons[idx] = { ...buttons[idx], target: e.target.value };
                            updateNodeData(selectedNodeObj.id, 'buttons', buttons);
                            if (e.target.value) autoLinkButton(selectedNodeObj.id, idx, e.target.value);
                          }}
                          className="flow-button-target"
                        >
                          <option value="">Auto (next node)</option>
                          {nodes.filter(n => n.id !== selectedNodeObj.id).map(n => (
                            <option key={n.id} value={n.id}>
                              {getNodeStyle(n.type).label}: {n.data?.message?.substring(0, 20) || n.id}
                            </option>
                          ))}
                        </select>
                        <button
                          className="flow-button-remove"
                          onClick={() => {
                            const buttons = (selectedNodeObj.data?.buttons || []).filter((_, i) => i !== idx);
                            updateNodeData(selectedNodeObj.id, 'buttons', buttons);
                          }}
                        >
                          <FiX />
                        </button>
                      </div>
                    ))}
                    {(selectedNodeObj.data?.buttons || []).length < 3 && (
                      <button
                        className="flow-button-add"
                        onClick={() => {
                          const buttons = [...(selectedNodeObj.data?.buttons || []), { id: `btn_${Date.now()}`, label: `Option ${buttons.length + 1}`, target: '' }];
                          updateNodeData(selectedNodeObj.id, 'buttons', buttons);
                        }}
                      >
                        <FiPlus /> Add Button
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* Buttons section for message nodes */}
              {(selectedNodeObj.type === 'message' || selectedNodeObj.type === 'ai_response') && (
                <div className="flow-editor-field">
                  <label><FiLink /> Buttons</label>
                  <div className="flow-buttons-list">
                    {(selectedNodeObj.data?.buttons || []).map((btn, idx) => (
                      <div key={idx} className="flow-button-item">
                        <input
                          value={btn.label}
                          onChange={(e) => updateNodeButton(selectedNodeObj.id, idx, 'label', e.target.value)}
                          placeholder="Button label"
                          className="flow-button-input"
                        />
                        <select
                          value={btn.target || ''}
                          onChange={(e) => {
                            updateNodeButton(selectedNodeObj.id, idx, 'target', e.target.value);
                            if (e.target.value) autoLinkButton(selectedNodeObj.id, idx, e.target.value);
                          }}
                          className="flow-button-target"
                        >
                          <option value="">Auto (next node)</option>
                          {nodes.filter(n => n.id !== selectedNodeObj.id).map(n => (
                            <option key={n.id} value={n.id}>
                              {getNodeStyle(n.type).label}: {n.data?.message?.substring(0, 20) || n.id}
                            </option>
                          ))}
                        </select>
                        <button
                          className="flow-button-remove"
                          onClick={() => removeButtonFromNode(selectedNodeObj.id, idx)}
                        >
                          <FiX />
                        </button>
                      </div>
                    ))}
                    <button
                      className="flow-button-add"
                      onClick={() => addButtonToNode(selectedNodeObj.id)}
                    >
                      <FiPlus /> Add Button
                    </button>
                  </div>
                </div>
              )}

              <button className="btn btn-danger btn-sm" onClick={() => deleteNode(selectedNodeObj.id)} style={{ width: '100%', marginTop: 8 }}>
                <FiTrash2 /> Delete Node
              </button>
            </div>
          )}
        </div>

        {/* Canvas */}
        <div
          className="flow-canvas"
          ref={canvasRef}
          onDrop={handleCanvasDrop}
          onDragOver={handleCanvasDragOver}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseDown={handleCanvasMouseDown}
          onWheel={(e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            setZoom(prev => Math.min(2, Math.max(0.3, prev + delta)));
          }}
        >
          {/* Zoom Controls */}
          <div className="flow-zoom-controls">
            <button className="flow-zoom-btn" onClick={() => setZoom(prev => Math.min(2, prev + 0.15))} title="Zoom In">+</button>
            <span className="flow-zoom-label">{Math.round(zoom * 100)}%</span>
            <button className="flow-zoom-btn" onClick={() => setZoom(prev => Math.max(0.3, prev - 0.15))} title="Zoom Out">-</button>
            <button className="flow-zoom-btn flow-zoom-reset" onClick={() => { setZoom(1); setCanvasOffset({ x: 0, y: 0 }); }} title="Reset View">Reset</button>
          </div>

          <div className="flow-canvas-grid" style={{ transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${zoom})`, transformOrigin: '0 0' }}>
            {/* Edges */}
            <svg className="flow-edges-svg">
              {edges.map((edge, idx) => {
                const fromNode = nodes.find(n => n.id === edge.from);
                const toNode = nodes.find(n => n.id === edge.to);
                if (!fromNode || !toNode) return null;

                const x1 = fromNode.x + 80;
                const y1 = fromNode.y + 40;
                const x2 = toNode.x + 80;
                const y2 = toNode.y + 40;

                const mx = (x1 + x2) / 2;
                const my = (y1 + y2) / 2;

                return (
                  <g key={idx}>
                    <path
                      d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                      className="flow-edge-path"
                      onClick={(e) => { e.stopPropagation(); deleteEdge(idx); }}
                    />
                    <circle cx={x2} cy={y2} r={4} className="flow-edge-arrow" />
                    {edge.label && (
                      <text x={mx} y={my - 8} className="flow-edge-label">{edge.label}</text>
                    )}
                  </g>
                );
              })}

              {connecting && (
                <path
                  d={`M ${nodes.find(n => n.id === connecting.from)?.x + 80} ${nodes.find(n => n.id === connecting.from)?.y + 40} L ${connectMouse.x} ${connectMouse.y}`}
                  className="flow-edge-connecting"
                />
              )}
            </svg>

            {/* Nodes */}
            {nodes.map(node => {
              const style = getNodeStyle(node.type);
              const buttons = node.data?.buttons || [];
              return (
                <div
                  key={node.id}
                  className={`flow-node ${selectedNode === node.id ? 'selected' : ''}`}
                  style={{ left: node.x, top: node.y }}
                  onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                  onClick={(e) => handleNodeClick(e, node.id)}
                >
                  <div className="flow-node-header" style={{ background: style.color }}>
                    <span className="flow-node-icon">{style.icon}</span>
                    <span className="flow-node-type">{style.label}</span>
                    {node.type !== 'start' && (
                      <button
                        className="flow-node-delete"
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); deleteNode(node.id); }}
                        title="Delete node"
                      >
                        <FiX size={12} />
                      </button>
                    )}
                  </div>
                  <div className="flow-node-body">
                    <div className="flow-node-text">{node.data?.message || node.data?.variable || style.label}</div>
                    {node.data?.website_url && (
                      <div className="flow-node-url">
                        <FiLink size={10} /> {node.data.website_url}
                      </div>
                    )}
                    {buttons.length > 0 && (
                      <div className="flow-node-buttons">
                        {buttons.map((btn, idx) => (
                          <span key={idx} className="flow-node-btn">{btn.label}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Connection ports */}
                  {node.type !== 'start' && (
                    <div
                      className="flow-port flow-port-in"
                      onClick={(e) => handlePortClick(e, node.id, 'in')}
                      title="Connect to this node"
                    />
                  )}
                  {node.type !== 'end' && (
                    <div
                      className="flow-port flow-port-out"
                      onClick={(e) => handlePortClick(e, node.id, 'out')}
                      title="Drag to connect"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
