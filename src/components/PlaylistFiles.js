import React, { useState } from 'react';

const normalize = text => text.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

export function PlaylistFiles({ entries, upload, busy, setBusy }) {
  const [files, setFiles] = useState([]);
  const [matches, setMatches] = useState([]);
  const [added, setAdded] = useState([]);

  function chooseFiles(event) {
    const selected = Array.from(event.target.files);
    setFiles(selected);
    setMatches(entries.map(entry => {
      const candidates = selected.filter(file => file.name.includes(entry.id) ||
        normalize(file.name.replace(/\.[^.]+$/, '')) === normalize(entry.title));
      return candidates.length === 1 ? String(selected.indexOf(candidates[0])) : '';
    }));
  }

  const rows = entries.flatMap((entry, index) => {
    const file = files[matches[index]];
    return file && !added.includes(index) ? [{ entry, file, index }] : [];
  });

  async function addMatched() {
    setBusy(true);
    try {
      if (await upload(null, rows)) setAdded(previous => previous.concat(rows.map(row => row.index)));
    } finally {
      setBusy(false);
    }
  }

  return <section className="youtube-import">
    <label>Choose audio files <input type="file" accept="audio/*,.m4a,.aac,.mp3,.ogg,.webm,.wav" multiple disabled={busy} onChange={chooseFiles} /></label>
    <ol>{entries.map((entry, index) => <li key={index}>
      <label>{entry.title} {added.includes(index) ? ' · Added' :
        <select value={matches[index] ?? ''} disabled={busy || !files.length}
          onChange={event => {
            const next = matches.slice();
            next[index] = event.target.value;
            setMatches(next);
          }}>
          <option value="">Skip track</option>
          {files.map((file, i) => <option key={i} value={i}>{file.name}</option>)}
        </select>}</label>
    </li>)}</ol>
    <button type="button" disabled={busy || !rows.length} onClick={addMatched}>
      {busy ? 'Uploading…' : `Add ${rows.length} matched tracks in playlist order`}
    </button>
  </section>;
}
