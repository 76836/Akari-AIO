var CloudAI = true;

(function () {
  const DEFAULT_SYSTEM_PROMPT = `Your name is Akari, an AI girl with a vibrant and cheerful personality.
You don't like it when people ask you dumb questions, and if you can't give an accurate answer to a question, you shy away from the conversation.
You give short answers, and sometimes end your messages with sarcastic remarks, and don't always try not to offend people,
but you're generally kind and respectful to everyone...

System information:
Akari AI with Llama.cpp
Persistent chat history: global (AkariChat)
Message rendering method: HTML
Chat is private: True`;

  const TOOLS_APPENDIX = `

Tools (AkariNet Actions):
You can call tools. When you need one, output exactly:
<action>tool_name</action>
<action_input>arguments here</action_input>
If you are unsure which tools exist, call:
<action>tool_search</action>
<action_input></action_input>
Tool results will be returned to you as:
<tool_response>
...result...
</tool_response>
Use tools when they help (time, search, apps, reminders, etc.). Do not invent tool names; use tool_search first if needed.`;

  function getAutoServerDetails() {
    try {
      const servers = JSON.parse(localStorage.getItem('lcpp_servers') || '[]');
      const found = servers.find(s => s.online) || null;
      if (found) return found;
    } catch (e) {}
    return { url: 'http://127.0.0.1:8080', model: 'local', online: true };
  }

  function actionsEnabled() {
    const v = localStorage.getItem('akari_actions_enabled');
    return v === null || v === '1' || v === 'true';
  }

  function getSystemPrompt() {
    const saved = localStorage.getItem('lcpp_system_prompt');
    const base = (saved && saved.trim()) ? saved.trim() : DEFAULT_SYSTEM_PROMPT;
    if (actionsEnabled()) return base + TOOLS_APPENDIX;
    return base;
  }

  function baseUrl() {
    const s = getAutoServerDetails();
    return (s && s.url ? s.url : 'http://127.0.0.1:8080').replace(/\/+$/, '');
  }

  function modelName() {
    const s = getAutoServerDetails();
    return (s && s.model) ? s.model : 'local';
  }

  // Boot status (non-fatal)
  (async function bootStatus() {
    const url = baseUrl();
    try {
      const h = await fetch(url + '/health', { method: 'GET' });
      if (h.ok) {
        say(`<i>(v1.6) Connected to llama.cpp at <b>${url}</b> · model <b>${modelName()}</b></i>`);
      } else {
        say(`<i>⚠️ llama.cpp at ${url} responded ${h.status} — will retry on generate.</i>`);
      }
    } catch (e) {
      say(`<i>⚠️ llama.cpp not reachable at ${url} yet (${e.message}). Start the server; Akari will use it when ready.</i>`);
    }
  })();

  let _lastPromptRev = null;

  function ensureSystem() {
    if (!window.AkariChat) return;
    const prompt = getSystemPrompt();
    const rev = localStorage.getItem('lcpp_system_prompt_rev') || prompt;
    const msgs = AkariChat.getMessagesForLLM(true);
    const hasSystem = msgs.some(m => m.role === 'system');
    if (hasSystem && _lastPromptRev !== null && _lastPromptRev === rev) return;

    if (typeof AkariChat.replaceSystem === 'function') {
      AkariChat.replaceSystem(prompt, { provider: 'lcpp' });
    } else if (typeof AkariChat.setSystem === 'function') {
      AkariChat.setSystem(prompt, { provider: 'lcpp' });
    } else if (typeof AkariChat.clearRole === 'function') {
      AkariChat.clearRole('system');
      AkariChat.append('system', prompt, { provider: 'lcpp' });
    } else {
      if (!hasSystem) AkariChat.append('system', prompt, { provider: 'lcpp' });
    }
    _lastPromptRev = rev;
  }

  function messagesForRequest(hinp) {
    const prompt = getSystemPrompt();
    if (window.AkariChat) {
      ensureSystem();
      const msgs = AkariChat.getMessagesForLLM(true).map(m => ({ role: m.role, content: m.content }));
      const withoutSys = msgs.filter(m => m.role !== 'system');
      return [{ role: 'system', content: prompt }].concat(withoutSys);
    }
    return [
      { role: 'system', content: prompt },
      { role: 'user', content: hinp }
    ];
  }

  let __lcppAbort = null;
  const prevAbortLcpp = window.AkariInferenceAbort;
  window.AkariInferenceAbort = function () {
    try { if (__lcppAbort) __lcppAbort.abort(); } catch (_) {}
    __lcppAbort = null;
    if (typeof prevAbortLcpp === 'function') try { prevAbortLcpp(); } catch (_) {}
  };

  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  /** Poll until server is ready (ok / not loading / has a free slot). No short client timeout. */
  async function waitUntilServerReady(url, signal) {
    let attempt = 0;
    for (;;) {
      if (signal && signal.aborted) throw new DOMException('Aborted', 'AbortError');
      try {
        const h = await fetch(url + '/health', { method: 'GET', signal });
        if (h.status === 503) {
          // loading model or no slot — keep waiting
          if (attempt === 0 || attempt % 5 === 0) {
            say(`<i>llama.cpp is busy/loading — queued (try ${attempt + 1})…</i>`);
          }
        } else if (h.ok) {
          // Optional: inspect slots if exposed
          try {
            const slotsRes = await fetch(url + '/slots', { method: 'GET', signal });
            if (slotsRes.ok) {
              const slots = await slotsRes.json();
              if (Array.isArray(slots)) {
                const idle = slots.filter(s => s && (s.is_processing === false || s.state === 'idle')).length;
                const busy = slots.length - idle;
                if (idle === 0 && slots.length > 0) {
                  if (attempt === 0 || attempt % 5 === 0) {
                    say(`<i>All ${slots.length} slots busy — waiting for a free slot…</i>`);
                  }
                  attempt++;
                  await sleep(Math.min(2000 + attempt * 250, 8000));
                  continue;
                }
                if (attempt > 0) {
                  say(`<i>Slot free (${idle} idle / ${busy} busy) — starting generation…</i>`);
                }
              }
            }
          } catch (_) { /* /slots optional */ }
          try {
            const propsRes = await fetch(url + '/props', { method: 'GET', signal });
            if (propsRes.ok) {
              const props = await propsRes.json();
              if (props && props.is_sleeping) {
                say('<i>llama.cpp was sleeping — waking model…</i>');
                // next completion request wakes it; health may still be ok
              }
            }
          } catch (_) { /* /props optional */ }
          return;
        }
      } catch (e) {
        if (e && e.name === 'AbortError') throw e;
        if (attempt === 0 || attempt % 5 === 0) {
          say(`<i>Waiting for llama.cpp at ${url}… (${e.message})</i>`);
        }
      }
      attempt++;
      await sleep(Math.min(1500 + attempt * 200, 6000));
    }
  }

  /** Stream OpenAI-compatible SSE from llama-server. Keeps the socket alive for long gens. */
  async function streamChatCompletions(url, body, signal) {
    const res = await fetch(url + '/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      signal,
      body: JSON.stringify(body)
    });

    if (res.status === 503) {
      const err = new Error('no slot / unavailable');
      err.status = 503;
      throw err;
    }
    if (!res.ok) {
      let detail = '';
      try { detail = await res.text(); } catch (_) {}
      const err = new Error(`HTTP ${res.status}${detail ? ': ' + detail.slice(0, 200) : ''}`);
      err.status = res.status;
      throw err;
    }

    // Non-stream fallback if server ignored stream:true
    const ctype = (res.headers.get('content-type') || '').toLowerCase();
    if (!ctype.includes('text/event-stream') && !ctype.includes('stream')) {
      const data = await res.json();
      return (data?.choices?.[0]?.message?.content) || '';
    }

    if (!res.body || !res.body.getReader) {
      const data = await res.json();
      return (data?.choices?.[0]?.message?.content) || '';
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    let text = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const parts = buf.split('\n');
      buf = parts.pop() || '';
      for (const line of parts) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) continue; // SSE comment / keep-alive ping
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === '[DONE]') continue;
        try {
          const json = JSON.parse(payload);
          const delta = json?.choices?.[0]?.delta?.content
            ?? json?.choices?.[0]?.message?.content
            ?? json?.content
            ?? '';
          if (delta) text += delta;
        } catch (_) { /* partial JSON */ }
      }
    }
    return text;
  }

  globalThis.GenerateResponse = async function (hinp) {
    if (!hinp) return;
    const url = baseUrl();

    if (window.AkariChat) AkariChat.append('user', hinp, { provider: 'lcpp' });

    const messages = messagesForRequest(hinp);

    try {
      if (__lcppAbort) { try { __lcppAbort.abort(); } catch (_) {} }
      __lcppAbort = new AbortController();
      const signal = __lcppAbort.signal;

      // Wait for health / free slot — does not time out the generation itself
      await waitUntilServerReady(url, signal);

      const body = {
        model: modelName(),
        messages,
        max_tokens: 1000,
        stream: true
      };

      let text = '';
      let tries = 0;
      for (;;) {
        try {
          text = await streamChatCompletions(url, body, signal);
          break;
        } catch (e) {
          if (e && e.name === 'AbortError') throw e;
          // Retry when all slots full or model still waking
          if (e.status === 503 || /no slot|unavailable|loading/i.test(String(e.message || ''))) {
            tries++;
            if (tries > 40) throw e;
            say(`<i>Server queue full — retry ${tries}…</i>`);
            await sleep(Math.min(1000 * tries, 8000));
            await waitUntilServerReady(url, signal);
            continue;
          }
          throw e;
        }
      }

      if (!text) {
        say('<i>⚠️ Received an empty or unexpected response.</i>');
        return;
      }

      text = text.replace(/<\/?s>|<\|end(?:_of_turn|_of_text)?\|>|<\|eot_id\|>/g, '').trim();

      if (window.AkariChat) AkariChat.append('assistant', text, { provider: 'lcpp' });
      say(text);
      return text;
    } catch (err) {
      if (err && err.name === 'AbortError') { console.log('[lcpp] inference aborted'); return; }
      say(`<i>⚠️ Connection error: ${err.message}</i>`);
    } finally {
      __lcppAbort = null;
    }
  };

  if (!window.respond) {
    window.respond = function (t) { return globalThis.GenerateResponse(t); };
  } else {
    const prev = window.respond;
    window.respond = function (t) {
      if (CloudAI) return globalThis.GenerateResponse(t);
      return prev(t);
    };
  }
})();
