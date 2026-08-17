import React, { useEffect, useRef, useState } from 'react';
import {
  MessageSquare, Search, Send, X, Plus, Users, Trash2, ArrowLeft, MoreVertical, UserPlus,
} from 'lucide-react';
import {
  searchChatUsersAPI, getConversationsAPI, getOrCreateDmAPI, createGroupAPI,
  getMessagesAPI, sendMessageAPI, deleteMessageAPI, deleteConversationAPI,
  type ConversationData, type MessageData, type ChatUser,
} from '../services/chatApi';

interface Props {
  userId: string;
  userName: string;
  accentColor: string;
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

function timeAgo(date: string) {
  const d = new Date(date);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function sameMessages(a: MessageData[], b: MessageData[]) {
  if (a.length !== b.length) return false;
  if (a.length === 0) return true;
  const lastA = a[a.length - 1];
  const lastB = b[b.length - 1];
  return lastA._id === lastB._id && lastA.text === lastB.text && lastA.status === lastB.status;
}

function sameConvos(a: ConversationData[], b: ConversationData[]) {
  if (a.length !== b.length) return false;
  return a.every((c, i) => (
    c._id === b[i]?._id
    && c.lastMessage?.text === b[i]?.lastMessage?.text
    && c.lastMessage?.sentAt === b[i]?.lastMessage?.sentAt
  ));
}

export default function ChatView({ userId, userName, accentColor }: Props) {
  const [convos, setConvos] = useState<ConversationData[]>([]);
  const [activeConvo, setActiveConvo] = useState<ConversationData | null>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChatUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const [showNewGC, setShowNewGC] = useState(false);
  const [gcName, setGcName] = useState('');
  const [gcSearch, setGcSearch] = useState('');
  const [gcResults, setGcResults] = useState<ChatUser[]>([]);
  const [gcSelected, setGcSelected] = useState<ChatUser[]>([]);

  const [contextMenu, setContextMenu] = useState<{ msg: MessageData; x: number; y: number } | null>(null);
  const [convoMenu, setConvoMenu] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeConvoIdRef = useRef<string | null>(null);
  const messagesRef = useRef<MessageData[]>([]);
  const convosRef = useRef<ConversationData[]>([]);

  const loadConvos = async () => {
    try {
      const data = await getConversationsAPI(userId);
      setConvos(data.conversations || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { activeConvoIdRef.current = activeConvo?._id ?? null; }, [activeConvo?._id]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { convosRef.current = convos; }, [convos]);

  // Keep conversation list + open thread in sync
  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      if (document.hidden) return;
      try {
        const convoData = await getConversationsAPI(userId);
        if (cancelled) return;
        const nextConvos = convoData.conversations || [];
        if (!sameConvos(convosRef.current, nextConvos)) {
          setConvos(nextConvos);
        }
        setLoading(false);

        const cid = activeConvoIdRef.current;
        if (!cid) return;
        const data = await getMessagesAPI(cid, userId);
        if (cancelled || activeConvoIdRef.current !== cid) return;
        const incoming = data.messages || [];
        if (!sameMessages(messagesRef.current, incoming)) {
          setMessages(incoming);
        }
      } catch { /* ignore */ }
    };

    tick();
    const id = setInterval(tick, 2500);
    const onVis = () => { if (!document.hidden) tick(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const openConvo = async (convo: ConversationData) => {
    setActiveConvo(convo);
    setLoadingMsgs(true);
    try {
      const data = await getMessagesAPI(convo._id, userId);
      setMessages(data.messages || []);
    } catch { setMessages([]); }
    finally { setLoadingMsgs(false); }
  };

  const handleSend = async () => {
    if (!input.trim() || !activeConvo) return;
    const text = input;
    setInput('');
    try {
      const data = await sendMessageAPI(activeConvo._id, userId, text);
      setMessages(prev => [...prev, data.message]);
      loadConvos();
    } catch { /* ignore */ }
  };

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.trim().length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const data = await searchChatUsersAPI(q, userId);
      setSearchResults(data.users || []);
    } catch { setSearchResults([]); }
    finally { setSearching(false); }
  };

  const startDM = async (other: ChatUser) => {
    try {
      const data = await getOrCreateDmAPI(userId, other._id);
      setShowSearch(false);
      setSearchQuery('');
      setSearchResults([]);
      await loadConvos();
      openConvo(data.conversation);
    } catch { /* ignore */ }
  };

  const handleGcSearch = async (q: string) => {
    setGcSearch(q);
    if (q.trim().length < 2) { setGcResults([]); return; }
    try {
      const data = await searchChatUsersAPI(q, userId);
      setGcResults((data.users || []).filter(u => !gcSelected.find(s => s._id === u._id)));
    } catch { setGcResults([]); }
  };

  const createGC = async () => {
    if (!gcName.trim() || gcSelected.length === 0) return;
    try {
      const data = await createGroupAPI(userId, gcName.trim(), gcSelected.map(u => u._id));
      setShowNewGC(false);
      setGcName('');
      setGcSelected([]);
      setGcSearch('');
      await loadConvos();
      openConvo(data.conversation);
    } catch { /* ignore */ }
  };

  const handleDeleteMsg = async (msgId: string, mode: 'for_me' | 'for_everyone' | 'unsend') => {
    try {
      await deleteMessageAPI(msgId, userId, mode);
      if (mode === 'for_me' || mode === 'unsend') {
        setMessages(prev => prev.filter(m => m._id !== msgId));
      } else {
        setMessages(prev => prev.map(m => m._id === msgId ? { ...m, text: 'This message was deleted.', status: 'deleted_for_everyone' } : m));
      }
    } catch { /* ignore */ }
    setContextMenu(null);
  };

  const handleDeleteConvo = async (convoId: string) => {
    try {
      await deleteConversationAPI(convoId, userId);
      setConvos(prev => prev.filter(c => c._id !== convoId));
      if (activeConvo?._id === convoId) { setActiveConvo(null); setMessages([]); }
    } catch { /* ignore */ }
    setConvoMenu(null);
  };

  const roleBadge = (role?: string) => {
    if (!role) return null;
    const colors: Record<string, { bg: string; fg: string }> = {
      admin: { bg: 'rgba(239,68,68,0.12)', fg: '#EF4444' },
      teacher: { bg: 'rgba(16,185,129,0.12)', fg: '#10B981' },
      student: { bg: 'rgba(99,102,241,0.12)', fg: '#6366F1' },
    };
    const c = colors[role] || { bg: 'var(--db-hover)', fg: 'var(--db-muted)' };
    return (
      <span style={{ display: 'inline-block', padding: '2px 7px', borderRadius: 6, fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, background: c.bg, color: c.fg }}>{role}</span>
    );
  };

  const getConvoRole = (convo: ConversationData) => {
    if (convo.type === 'group') return null;
    const other = convo.participants.find(p => p._id !== userId);
    return other?.role;
  };

  const getConvoName = (convo: ConversationData) => {
    if (convo.type === 'group') return convo.name || 'Group Chat';
    const other = convo.participants.find(p => p._id !== userId);
    return other?.name || 'Unknown';
  };

  const getConvoAvatar = (convo: ConversationData) => {
    if (convo.type === 'group') return <Users size={18} />;
    const other = convo.participants.find(p => p._id !== userId);
    return <span style={{ fontSize: 13, fontWeight: 900 }}>{initials(other?.name || '?')}</span>;
  };

  return (
    <div className={`db-chat-layout${activeConvo ? ' chat-active' : ''}`}>
      {/* Sidebar */}
      <div className="db-chat-sidebar">
        {/* Header */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--db-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: 'var(--db-text)' }}>Messages</h3>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" className="db-icon-btn" title="Search users" onClick={() => { setShowSearch(!showSearch); setShowNewGC(false); }} style={{ width: 32, height: 32 }}>
              <Search size={15} />
            </button>
            <button type="button" className="db-icon-btn" title="New group chat" onClick={() => { setShowNewGC(!showNewGC); setShowSearch(false); }} style={{ width: 32, height: 32 }}>
              <Plus size={15} />
            </button>
          </div>
        </div>

        {/* Search bar */}
        {showSearch && (
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--db-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--db-hover)', borderRadius: 12, padding: '8px 12px', border: '1px solid var(--db-border)' }}>
              <Search size={14} color="var(--db-muted)" />
              <input
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Search users by name or email…"
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: 'var(--db-text)', fontSize: 13, fontFamily: 'inherit' }}
                autoFocus
              />
              {searchQuery && <button type="button" className="db-icon-btn" onClick={() => { setSearchQuery(''); setSearchResults([]); }} style={{ width: 22, height: 22 }}><X size={11} /></button>}
            </div>
            {searching && <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--db-muted)' }}>Searching…</p>}
            {searchResults.length > 0 && (
              <div style={{ marginTop: 8, maxHeight: 240, overflowY: 'auto' }}>
                {searchResults.map(u => (
                  <div key={u._id} onClick={() => startDM(u)} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12, cursor: 'pointer', marginBottom: 4,
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--db-hover)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${accentColor}22`, color: accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 12, flexShrink: 0 }}>
                      {initials(u.name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--db-text)' }}>{u.name}</span>
                        {roleBadge(u.role)}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--db-muted)' }}>{u.email}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
              <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--db-muted)', textAlign: 'center' }}>No users found.</p>
            )}
          </div>
        )}

        {/* New GC panel */}
        {showNewGC && (
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--db-border)' }}>
            <input
              value={gcName}
              onChange={e => setGcName(e.target.value)}
              placeholder="Group name…"
              style={{ width: '100%', border: '1px solid var(--db-border)', borderRadius: 10, padding: '8px 12px', background: 'var(--db-hover)', color: 'var(--db-text)', fontSize: 13, fontFamily: 'inherit', marginBottom: 8, outline: 'none', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--db-hover)', borderRadius: 10, padding: '6px 10px', border: '1px solid var(--db-border)', marginBottom: 8 }}>
              <Search size={13} color="var(--db-muted)" />
              <input
                value={gcSearch}
                onChange={e => handleGcSearch(e.target.value)}
                placeholder="Search members…"
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: 'var(--db-text)', fontSize: 12, fontFamily: 'inherit' }}
              />
            </div>
            {gcSelected.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                {gcSelected.map(u => (
                  <span key={u._id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, background: `${accentColor}22`, color: accentColor, fontSize: 11, fontWeight: 700 }}>
                    {u.name}
                    <button type="button" onClick={() => setGcSelected(prev => prev.filter(p => p._id !== u._id))} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'inherit', lineHeight: 1 }}><X size={10} /></button>
                  </span>
                ))}
              </div>
            )}
            {gcResults.length > 0 && (
              <div style={{ maxHeight: 160, overflowY: 'auto', marginBottom: 8 }}>
                {gcResults.map(u => (
                  <div key={u._id} onClick={() => { setGcSelected(prev => [...prev, u]); setGcResults(prev => prev.filter(r => r._id !== u._id)); setGcSearch(''); }} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, cursor: 'pointer', fontSize: 12,
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--db-hover)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <UserPlus size={13} color={accentColor} /> {u.name} <span style={{ color: 'var(--db-muted)' }}>({u.role})</span>
                  </div>
                ))}
              </div>
            )}
            <button type="button" className="db-btn primary" disabled={!gcName.trim() || gcSelected.length === 0} onClick={createGC} style={{ width: '100%', fontSize: 13, padding: '8px 0' }}>
              <Users size={14} /> Create Group
            </button>
          </div>
        )}

        {/* Conversation list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {loading && <p style={{ textAlign: 'center', color: 'var(--db-muted)', padding: 20 }}>Loading…</p>}
          {!loading && convos.length === 0 && !showSearch && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--db-muted)' }}>
              <MessageSquare size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
              <p style={{ fontWeight: 700, fontSize: 14 }}>No conversations yet</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>Use the search button to find users and start chatting.</p>
            </div>
          )}
          {convos.map(convo => (
            <div key={convo._id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, cursor: 'pointer',
              background: activeConvo?._id === convo._id ? `${accentColor}15` : 'transparent',
              border: activeConvo?._id === convo._id ? `1px solid ${accentColor}33` : '1px solid transparent',
              marginBottom: 4, position: 'relative',
            }}
              onClick={() => openConvo(convo)}
              onMouseEnter={e => { if (activeConvo?._id !== convo._id) e.currentTarget.style.background = 'var(--db-hover)'; }}
              onMouseLeave={e => { if (activeConvo?._id !== convo._id) e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{ width: 42, height: 42, borderRadius: 12, background: `${accentColor}22`, color: accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {getConvoAvatar(convo)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--db-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getConvoName(convo)}</span>
                    {roleBadge(getConvoRole(convo) ?? undefined)}
                  </div>
                  {convo.lastMessage?.sentAt && <span style={{ fontSize: 10, color: 'var(--db-muted)', flexShrink: 0, marginLeft: 8 }}>{timeAgo(convo.lastMessage.sentAt)}</span>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--db-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>
                  {convo.lastMessage?.text || (convo.type === 'group' ? `${convo.participants.length} members` : 'No messages yet')}
                </div>
              </div>
              <button type="button" className="db-icon-btn" onClick={(e) => { e.stopPropagation(); setConvoMenu(convoMenu === convo._id ? null : convo._id); }} style={{ width: 26, height: 26, flexShrink: 0 }}>
                <MoreVertical size={12} />
              </button>
              {convoMenu === convo._id && (
                <div onClick={e => e.stopPropagation()} style={{
                  position: 'absolute', top: '100%', right: 8, zIndex: 100, minWidth: 160, padding: 6,
                  background: 'var(--db-card)', border: '1px solid var(--db-border)', borderRadius: 12,
                  boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
                }}>
                  <button type="button" onClick={() => handleDeleteConvo(convo._id)} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', border: 'none',
                    background: 'transparent', color: '#EF4444', fontWeight: 700, fontSize: 12, borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                    <Trash2 size={13} /> Delete conversation
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="db-chat-main">
        {!activeConvo ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'var(--db-muted)' }}>
            <MessageSquare size={52} style={{ marginBottom: 16, opacity: 0.2 }} />
            <p style={{ fontWeight: 700, fontSize: 16 }}>Select a conversation</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>or search for a user to start chatting</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div style={{
              padding: '14px 20px', borderBottom: '1px solid var(--db-border)',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <button type="button" className="db-icon-btn" onClick={() => { setActiveConvo(null); setMessages([]); }} style={{ width: 30, height: 30 }}>
                <ArrowLeft size={15} />
              </button>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: `${accentColor}22`, color: accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {getConvoAvatar(activeConvo)}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--db-text)' }}>{getConvoName(activeConvo)}</span>
                  {roleBadge(getConvoRole(activeConvo) ?? undefined)}
                </div>
                {activeConvo.type === 'group' && (
                  <div style={{ fontSize: 11, color: 'var(--db-muted)' }}>
                    {activeConvo.participants.map(p => `${p.name} (${p.role})`).join(', ')}
                  </div>
                )}
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {loadingMsgs && <p style={{ textAlign: 'center', color: 'var(--db-muted)' }}>Loading…</p>}
              {!loadingMsgs && messages.length === 0 && (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--db-muted)', fontSize: 13 }}>
                  No messages yet. Say hello!
                </div>
              )}
              {messages.map(msg => {
                const isMe = msg.sender?._id === userId;
                const deleted = msg.status === 'deleted_for_everyone';
                return (
                  <div key={msg._id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                    <div
                      onContextMenu={e => { e.preventDefault(); setContextMenu({ msg, x: e.clientX, y: e.clientY }); }}
                      style={{
                        maxWidth: '70%', padding: '10px 16px', borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        background: deleted ? 'var(--db-hover)' : isMe ? accentColor : 'var(--db-hover)',
                        color: deleted ? 'var(--db-muted)' : isMe ? '#fff' : 'var(--db-text)',
                        fontStyle: deleted ? 'italic' : 'normal',
                        fontSize: 13, lineHeight: 1.5, position: 'relative', cursor: 'context-menu',
                      }}
                    >
                      {activeConvo.type === 'group' && !isMe && !deleted && (
                        <div style={{ fontSize: 10, fontWeight: 800, color: accentColor, marginBottom: 4 }}>{msg.sender?.name}</div>
                      )}
                      {msg.text}
                      <div style={{ fontSize: 9, marginTop: 4, opacity: 0.6, textAlign: 'right' }}>
                        {new Date(msg.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--db-border)', display: 'flex', gap: 10, alignItems: 'center' }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Type a message…"
                style={{
                  flex: 1, border: '1px solid var(--db-border)', borderRadius: 14, padding: '12px 16px',
                  background: 'var(--db-hover)', color: 'var(--db-text)', fontSize: 13, fontFamily: 'inherit', outline: 'none',
                }}
              />
              <button type="button" className="db-btn primary" onClick={handleSend} disabled={!input.trim()} style={{ borderRadius: 14, padding: '12px 18px' }}>
                <Send size={15} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Context menu for message deletion */}
      {contextMenu && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 2000 }} onClick={() => setContextMenu(null)} />
          <div style={{
            position: 'fixed', left: contextMenu.x, top: contextMenu.y, zIndex: 2001,
            minWidth: 200, padding: 6, background: 'var(--db-card)', border: '1px solid var(--db-border)',
            borderRadius: 14, boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
          }}>
            <button type="button" onClick={() => handleDeleteMsg(contextMenu.msg._id, 'for_me')} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', border: 'none',
              background: 'transparent', color: 'var(--db-text)', fontWeight: 700, fontSize: 12, borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--db-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <Trash2 size={13} /> Delete for me
            </button>
            {contextMenu.msg.sender?._id === userId && contextMenu.msg.status !== 'deleted_for_everyone' && (
              <>
                <button type="button" onClick={() => handleDeleteMsg(contextMenu.msg._id, 'for_everyone')} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', border: 'none',
                  background: 'transparent', color: '#EF4444', fontWeight: 700, fontSize: 12, borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <Trash2 size={13} /> Delete for everyone
                </button>
                <button type="button" onClick={() => handleDeleteMsg(contextMenu.msg._id, 'unsend')} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', border: 'none',
                  background: 'transparent', color: '#F59E0B', fontWeight: 700, fontSize: 12, borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <Trash2 size={13} /> Unsend message
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
