import React, { useEffect, useRef, useState } from 'react';

type Props = {
  placeholder?: string;
  draftKey?: string; // optional localStorage key for per-question drafts
  onSubmit?: (html: string, files?: File[]) => Promise<void> | void;
};

export default function ChatBox({ placeholder = 'Write a reply...', draftKey, onSubmit }: Props) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const selRangeRef = useRef<Range | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [loadingEmoji, setLoadingEmoji] = useState(false);
  const emojiPickerRef = useRef<any>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  // Temporary flags
  const HIDE_ATTACH_LINK = true; // hide attachment and link controls temporarily

  useEffect(() => {
    if (!draftKey) return;
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved && editorRef.current) editorRef.current.innerHTML = saved;
    } catch (_) {}
  }, [draftKey]);

  useEffect(() => {
    const handler = () => {
      try {
        if (!draftKey || !editorRef.current) return;
        localStorage.setItem(draftKey, editorRef.current.innerHTML || '');
      } catch (_) {}
    };
    const el = editorRef.current;
    if (el) el.addEventListener('input', handler);
    // track selection changes so emoji insertion knows where to restore caret
    const saveSelection = () => {
      try {
        const sel = window.getSelection && window.getSelection();
        if (!sel) return;
        if (sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          // only save if selection is inside our editor
          if (editorRef.current && editorRef.current.contains(range.startContainer)) {
            selRangeRef.current = range.cloneRange();
          }
        }
      } catch (_) {}
    };
    if (el) {
      el.addEventListener('keyup', saveSelection);
      el.addEventListener('mouseup', saveSelection);
      el.addEventListener('click', saveSelection);
      el.addEventListener('blur', saveSelection);
    }
    return () => { if (el) el.removeEventListener('input', handler); };
  }, [draftKey]);

  const exec = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value || undefined);
    editorRef.current?.focus();
  };

  const handleSend = async () => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML.trim();
    const text = editorRef.current.innerText.trim();
    if (!html || !text) return;
    try {
      await onSubmit?.(html, files);
    } catch (_) {}
    editorRef.current.innerHTML = '';
    setFiles([]);
    if (draftKey) localStorage.removeItem(draftKey);
  };

  const handleKeyDown: React.KeyboardEventHandler = (e) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const ctrlKey = isMac ? e.metaKey : e.ctrlKey;
    // Ctrl/Cmd+Enter to send
    if (e.key === 'Enter' && ctrlKey) {
      e.preventDefault();
      handleSend();
      return;
    }
    // Enter to send (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
      return;
    }
    // Escape to cancel/clear
    if (e.key === 'Escape') {
      e.preventDefault();
      if (editorRef.current) editorRef.current.innerHTML = '';
      setFiles([]);
      return;
    }
  };

  const onPickEmoji = (emojiObject: any) => {
    const emoji = emojiObject?.emoji || emojiObject?.native || emojiObject?.unified || '';
    if (!editorRef.current) return;
    try {
      // try to restore saved selection first (saved when opening emoji picker)
      const sel = window.getSelection && window.getSelection();
      let usedRange: Range | null = null;
      if (selRangeRef.current) {
        try { usedRange = selRangeRef.current.cloneRange(); } catch (_) { usedRange = null; }
      }
      // if no saved range, use current selection
      if (!usedRange && sel && sel.rangeCount > 0) usedRange = sel.getRangeAt(0);

      if (usedRange) {
        usedRange.deleteContents();
        const node = document.createTextNode(emoji);
        usedRange.insertNode(node);
        // move caret after inserted node
        const range = document.createRange();
        range.setStartAfter(node);
        range.collapse(true);
        sel && sel.removeAllRanges();
        sel && sel.addRange(range);
      } else {
        // append to innerHTML preserving markup
        editorRef.current.innerHTML = (editorRef.current.innerHTML || '') + emoji;
        // move caret to end
        const range = document.createRange();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
        sel && sel.removeAllRanges();
        sel && sel.addRange(range);
      }
    } catch (err) {
      // fallback: append and continue
      try { editorRef.current.innerHTML = (editorRef.current.innerHTML || '') + emoji; } catch (_) {}
    }
    // ensure editor is focused and selection is at end
    try { editorRef.current.focus(); } catch (_) {}
    setShowEmoji(false);
    // clear saved range after use
    selRangeRef.current = null;
  };

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files ? Array.from(e.target.files) : [];
    setFiles(prev => prev.concat(list));
    e.currentTarget.value = '';
  };

  const removeFile = (idx: number) => setFiles(prev => prev.filter((_, i) => i !== idx));

  const loadEmojiPicker = async () => {
    if (emojiPickerRef.current) return;
    setLoadingEmoji(true);
    try {
      const mod = await import('emoji-picker-react');
      // save reference to default export or module itself
      emojiPickerRef.current = mod && (mod.default || mod);
    } catch (_) {
      emojiPickerRef.current = null;
    } finally {
      setLoadingEmoji(false);
    }
  };

  useEffect(() => {
    if (showEmoji) loadEmojiPicker();
  }, [showEmoji]);

  return (
    <div className="chatbox">
      <div className="chatbox-toolbar">
        <button type="button" className="tool-btn" onClick={() => exec('bold')} title="Bold (Ctrl+B)">B</button>
        <button type="button" className="tool-btn" onClick={() => exec('italic')} title="Italic (Ctrl+I)">I</button>
        <button type="button" className="tool-btn" onClick={() => exec('insertUnorderedList')} title="Bullet list">• List</button>
        <button type="button" className="tool-btn" onClick={() => exec('insertOrderedList')} title="Numbered list">1. List</button>
        <div className="spacer" />
        {!HIDE_ATTACH_LINK && (
          <>
            <button type="button" className="tool-btn" onClick={() => {
              const url = prompt('Enter URL');
              if (url) exec('createLink', url);
            }} title="Insert link">🔗</button>
            <label className="tool-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              📎
              <input type="file" multiple onChange={handleFiles} style={{ display: 'none' }} />
            </label>
          </>
        )}
        <button type="button" className="tool-btn" onClick={() => {
          // save current selection before opening emoji picker
          try {
            const sel = window.getSelection && window.getSelection();
            if (sel && sel.rangeCount > 0) selRangeRef.current = sel.getRangeAt(0).cloneRange();
          } catch (_) {}
          setShowEmoji(s => !s);
        }} title="Emoji picker">{showEmoji ? '😊' : '😀'}</button>
      </div>

      <div
        ref={editorRef}
        className="chatbox-editor"
        contentEditable
        suppressContentEditableWarning
        onKeyDown={handleKeyDown}
        aria-label={placeholder}
      />

      {files.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          {files.map((f, i) => (
            <div key={i} style={{ padding: '6px 8px', background: '#f3f4f6', borderRadius: 999, display: 'inline-flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 12 }}>{f.name}</span>
              <button className="btn small" onClick={() => removeFile(i)}>x</button>
            </div>
          ))}
        </div>
      )}

      {showEmoji && (
        <div style={{ position: 'relative', zIndex: 9999, marginTop: 8 }}>
          {loadingEmoji && <div style={{ padding: 8 }}>Loading emojis…</div>}
          {!loadingEmoji && emojiPickerRef.current && (
            // emoji-picker-react v4 default export is a component that takes onEmojiClick prop
            // handler tolerates either (event, emojiObj) or (emojiObj, event)
            React.createElement(emojiPickerRef.current, { onEmojiClick: (a: any, b: any) => {
              const emojiObj = a && a.emoji ? a : (b && b.emoji ? b : a);
              onPickEmoji(emojiObj);
            } })
          )}
          {!loadingEmoji && !emojiPickerRef.current && (
            <div style={{ padding: 8 }}>Emoji picker not available</div>
          )}
        </div>
      )}

      <div className="chatbox-footer">
        <span className="hint">Markdown is supported — press Enter to send (Shift+Enter = newline)</span>
        <div className="actions">
          <button className="btn-outline" onClick={() => { if (editorRef.current) editorRef.current.innerHTML = ''; setFiles([]); }}>Cancel</button>
          <button className="btn-primary" onClick={handleSend}>Reply</button>
        </div>
      </div>
    </div>
  );
}
