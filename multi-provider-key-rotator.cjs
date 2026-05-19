'use strict';

/**
 * Multi-provider API key rotator for OpenClaw/HuggingClaw
 * --------------------------------------------------------
 * Works exactly like nvidia-key-rotator.cjs but covers every
 * provider that HuggingClaw supports.
 *
 * For each provider you can supply a comma-separated pool:
 *   ANTHROPIC_API_KEYS=key1,key2,key3
 * Falls back to the singular env var, and optionally to LLM_API_KEY.
 *
 * Keys are rotated round-robin per provider independently.
 *
 * Patches globalThis.fetch + node:http + node:https so that
 * virtually every caller is covered without code changes.
 */

const http  = require('node:http');
const https = require('node:https');

// This file is preloaded through NODE_OPTIONS, so it also runs inside npm and
// OpenClaw helper subprocesses that may emit machine-readable JSON on stdout.
// Keep rotator diagnostics on stderr to avoid corrupting those stdout streams.
const log = (...args) => console.error(...args);

// ─── Provider definitions ────────────────────────────────────────────────────
//
// hostname  – regex tested against the request hostname (case-insensitive)
// envPlural – env var that holds a comma-separated key pool  (preferred)
// envSingular – env var that holds a single key              (fallback)
//
// LLM_API_KEY fallback can be controlled via:
//   LLM_API_KEY_FALLBACK_ENABLED=true|false
// Default is enabled for backwards compatibility.
//
const PROVIDERS = [
  {
    name:       'anthropic',
    hostname:   /(?:^|\.)api\.anthropic\.com$/i,
    envPlural:  'ANTHROPIC_API_KEYS',
    envSingular:'ANTHROPIC_API_KEY',
  },
  {
    name:       'openai',
    hostname:   /(?:^|\.)api\.openai\.com$/i,
    envPlural:  'OPENAI_API_KEYS',
    envSingular:'OPENAI_API_KEY',
  },
  {
    name:       'gemini',
    // Gemini uses generativelanguage API; also covers aiplatform
    hostname:   /(?:^|\.)(?:generativelanguage\.googleapis\.com|aiplatform\.googleapis\.com)$/i,
    envPlural:  'GEMINI_API_KEYS',
    envSingular:'GEMINI_API_KEY',
    queryParam: true,
  },
  {
    name:       'deepseek',
    hostname:   /(?:^|\.)api\.deepseek\.com$/i,
    envPlural:  'DEEPSEEK_API_KEYS',
    envSingular:'DEEPSEEK_API_KEY',
  },
  {
    name:       'openrouter',
    hostname:   /(?:^|\.)openrouter\.ai$/i,
    envPlural:  'OPENROUTER_API_KEYS',
    envSingular:'OPENROUTER_API_KEY',
  },
  {
    name:       'kilocode',
    hostname:   /(?:^|\.)kilocode\.ai$/i,
    envPlural:  'KILOCODE_API_KEYS',
    envSingular:'KILOCODE_API_KEY',
  },
  {
    name:       'opencode',
    hostname:   /(?:^|\.)opencode\.ai$/i,
    envPlural:  'OPENCODE_API_KEYS',
    envSingular:'OPENCODE_API_KEY',
  },
  {
    name:       'zai',
    // Z.ai / GLM — both domains normalised to "zai" in OpenClaw
    hostname:   /(?:^|\.)(?:z\.ai|open\.bigmodel\.cn)$/i,
    envPlural:  'ZAI_API_KEYS',
    envSingular:'ZAI_API_KEY',
  },
  {
    name:       'kimi-coding',
    // kimi-coding routes through api.moonshot.cn; dedicated entry so KIMI_API_KEYS pool is used
    hostname:   /(?:^|\.)api\.moonshot\.cn$/i,
    envPlural:  'KIMI_API_KEYS',
    envSingular:'KIMI_API_KEY',
  },
  {
    name:       'moonshot',
    hostname:   /(?:^|\.)api\.moonshot\.cn$/i,
    envPlural:  'MOONSHOT_API_KEYS',
    envSingular:'MOONSHOT_API_KEY',
  },
  {
    name:       'minimax',
    hostname:   /(?:^|\.)api\.minimax\.chat$/i,
    envPlural:  'MINIMAX_API_KEYS',
    envSingular:'MINIMAX_API_KEY',
  },
  {
    name:       'xiaomi',
    // MiMo — update hostname if Xiaomi publishes an official domain
    hostname:   /(?:^|\.)api\.xiaomi\.com$/i,
    envPlural:  'XIAOMI_API_KEYS',
    envSingular:'XIAOMI_API_KEY',
  },
  {
    name:       'volcengine',
    // Volcengine / Doubao
    hostname:   /(?:^|\.)(?:ark\.cn-beijing\.volces\.com|volcengineapi\.com)$/i,
    envPlural:  'VOLCANO_ENGINE_API_KEYS',
    envSingular:'VOLCANO_ENGINE_API_KEY',
  },
  {
    name:       'byteplus',
    hostname:   /(?:^|\.)maas-api\.ml-platform-cn-beijing\.byteplus\.com$/i,
    envPlural:  'BYTEPLUS_API_KEYS',
    envSingular:'BYTEPLUS_API_KEY',
  },
  {
    name:       'mistral',
    hostname:   /(?:^|\.)api\.mistral\.ai$/i,
    envPlural:  'MISTRAL_API_KEYS',
    envSingular:'MISTRAL_API_KEY',
  },
  {
    name:       'xai',
    hostname:   /(?:^|\.)api\.x\.ai$/i,
    envPlural:  'XAI_API_KEYS',
    envSingular:'XAI_API_KEY',
  },
  {
    name:       'nvidia',
    hostname:   /(?:^|\.)(?:integrate\.api\.nvidia\.com|api\.nvidia\.com)$/i,
    envPlural:  'NVIDIA_API_KEYS',
    envSingular:'NVIDIA_API_KEY',
  },
  {
    name:       'groq',
    hostname:   /(?:^|\.)api\.groq\.com$/i,
    envPlural:  'GROQ_API_KEYS',
    envSingular:'GROQ_API_KEY',
  },
  {
    name:       'cohere',
    hostname:   /(?:^|\.)api\.cohere\.(?:ai|com)$/i,
    envPlural:  'COHERE_API_KEYS',
    envSingular:'COHERE_API_KEY',
  },
  {
    name:       'together',
    hostname:   /(?:^|\.)api\.together\.(?:xyz|ai)$/i,
    envPlural:  'TOGETHER_API_KEYS',
    envSingular:'TOGETHER_API_KEY',
  },
  {
    name:       'cerebras',
    hostname:   /(?:^|\.)api\.cerebras\.ai$/i,
    envPlural:  'CEREBRAS_API_KEYS',
    envSingular:'CEREBRAS_API_KEY',
  },
  {
    name:       'huggingface',
    hostname:   /(?:^|\.)(?:api-inference\.huggingface\.co|router\.huggingface\.co|huggingface\.co)$/i,
    envPlural:  'HUGGINGFACE_HUB_TOKENS',       // plural variant
    envSingular:'HUGGINGFACE_HUB_TOKEN',
  },
  {
    name:       'venice',
    hostname:   /(?:^|\.)api\.venice\.ai$/i,
    envPlural:  'VENICE_API_KEYS',
    envSingular:'VENICE_API_KEY',
  },
  {
    name:       'github-copilot',
    hostname:   /(?:^|\.)api\.githubcopilot\.com$/i,
    envPlural:  'COPILOT_GITHUB_TOKENS',
    envSingular:'COPILOT_GITHUB_TOKEN',
  },
  {
    name:       'qianfan',
    // Baidu Qianfan / ERNIE
    hostname:   /(?:^|\.)(?:aip|qianfan)\.baidubce\.com$/i,
    envPlural:  'QIANFAN_API_KEYS',
    envSingular:'QIANFAN_API_KEY',
  },
  {
    name:       'modelstudio',
    // Aliyun DashScope / Qwen (both qwen/* and modelstudio/* prefixes)
    hostname:   /(?:^|\.)dashscope\.aliyuncs\.com$/i,
    envPlural:  'MODELSTUDIO_API_KEYS',
    envSingular:'MODELSTUDIO_API_KEY',
  },
  {
    name:        'synthetic',
    hostname:    /(?:^|\.)synthetic\.local$/i,
    envPlural:   'SYNTHETIC_API_KEYS',
    envSingular: 'SYNTHETIC_API_KEY',
  },

];

// ─── Key loading ─────────────────────────────────────────────────────────────

function normalizeKeys(...inputs) {
  const seen = new Set();
  const out   = [];
  for (const input of inputs) {
    for (const k of String(input || '').split(',').map(s => s.trim()).filter(Boolean)) {
      if (!seen.has(k)) { seen.add(k); out.push(k); }
    }
  }
  return out;
}

// Build per-provider key pools + rotation indices
const providerState = PROVIDERS.map(p => {
  const llmFallbackRaw = String(process.env.LLM_API_KEY_FALLBACK_ENABLED || '').trim().toLowerCase();
  const llmFallbackEnabled = !/^(0|false|no|off)$/.test(llmFallbackRaw);
  const dedicatedKeys = normalizeKeys(
    process.env[p.envPlural]  || '',
    process.env[p.envSingular] || '',
  );
  const hasDedicated = dedicatedKeys.length > 0;
  const keys = hasDedicated
    ? dedicatedKeys
    : (
      llmFallbackEnabled
        ? normalizeKeys(process.env.LLM_API_KEY || '')
        : []
    );

  if (hasDedicated) {
    log(`[key-rotator] ${p.name}: ${keys.length} key${keys.length === 1 ? '' : 's'}`);
  } else if (!keys.length) {
    console.warn(`[key-rotator] No keys for provider "${p.name}"`);
  }

  return { ...p, keys, idx: 0 };
});

// Summarise providers that fall back to LLM_API_KEY
const fallbackCount = providerState.filter(p => {
  const dedicated = normalizeKeys(
    process.env[p.envPlural]  || '',
    process.env[p.envSingular] || '',
  );
  return dedicated.length === 0 && p.keys.length > 0;
}).length;
if (fallbackCount > 0) {
  log(`[key-rotator] ${fallbackCount} provider(s) using LLM_API_KEY fallback`);
} else if (process.env.LLM_API_KEY && /^(0|false|no|off)$/i.test(String(process.env.LLM_API_KEY_FALLBACK_ENABLED || ''))) {
  log('[key-rotator] LLM_API_KEY fallback disabled (set LLM_API_KEY_FALLBACK_ENABLED=true to re-enable)');
}

// ─── Runtime helpers ─────────────────────────────────────────────────────────

function resolveHostname(urlLike) {
  try {
    const u =
      typeof urlLike === 'string'                              ? new URL(urlLike)
      : urlLike instanceof URL                                 ? urlLike
      : urlLike && typeof urlLike.url === 'string'             ? new URL(urlLike.url)
      : urlLike && typeof urlLike.href === 'string'            ? new URL(urlLike.href)
      : urlLike && typeof urlLike.hostname === 'string'        ? urlLike
      : null;
    return u ? u.hostname : null;
  } catch {
    return null;
  }
}

function matchProvider(hostname) {
  if (!hostname) return null;
  return providerState.find(p => p.hostname.test(hostname)) || null;
}

function nextKey(provider) {
  if (!provider || !provider.keys.length) return null;
  const key = provider.keys[provider.idx % provider.keys.length];
  provider.idx = (provider.idx + 1) % provider.keys.length;
  return key;
}

function setAuthHeader(headers, key) {
  if (!key) return headers;
  const authValue = `Bearer ${key}`;

  if (typeof Headers !== 'undefined' && headers instanceof Headers) {
    headers.set('authorization', authValue);
    return headers;
  }
  if (Array.isArray(headers)) {
    const out = headers.filter(([k]) => String(k).toLowerCase() !== 'authorization');
    out.push(['authorization', authValue]);
    return out;
  }
  if (headers && typeof headers === 'object') {
    return { ...headers, authorization: authValue };
  }
  return { authorization: authValue };
}

// ─── Patch globalThis.fetch ───────────────────────────────────────────────────

function patchFetch() {
  if (typeof globalThis.fetch !== 'function') return;

  const originalFetch = globalThis.fetch.bind(globalThis);

  globalThis.fetch = async function patchedFetch(input, init = {}) {
    try {
      const urlLike =
        typeof input === 'string' || input instanceof URL
          ? input
          : input && typeof input.url === 'string' ? input.url : null;

      const hostname = resolveHostname(urlLike);
      const provider = matchProvider(hostname);

            if (provider) {
        const key = nextKey(provider);
        if (key) {
          if (provider.queryParam) {
            // Gemini: key URL query param mein jaata hai, Bearer nahi
            const url = new URL(typeof input === 'string' ? input : input.url);
            url.searchParams.set('key', key);
            if (typeof input === 'string') {
              input = url.toString();
            } else {
              // Do NOT pass the Request object as init — that clones (consumes) the body stream.
              // Instead patch only the URL via init object; fetch spec merges headers from Request.
              init = {
                method: input.method,
                headers: input.headers,
                body: input.body,
                mode: input.mode,
                credentials: input.credentials,
                cache: input.cache,
                redirect: input.redirect,
                referrer: input.referrer,
                integrity: input.integrity,
                ...init,
              };
              input = url.toString();
            }
          } else {
            const headers        = init.headers || (input && input.headers) || undefined;
            const patchedHeaders = setAuthHeader(headers, key);
            init = { ...init, headers: patchedHeaders };
            // NOTE: new Request(input, {headers}) yahan nahi karte — Request clone karna
            // body stream ko disturb kar deta hai → UND_ERR_INVALID_ARG on POST requests.
            // init.headers fetch spec ke mutabiq Request ke headers ko override kar deta hai.
          }
        }
      }
    } catch (err) {
      console.warn('[key-rotator] fetch patch error:', err?.message || err);
    }

    return originalFetch(input, init);
  };
}

// ─── Patch node:http / node:https ────────────────────────────────────────────

function patchHttpModule(mod) {
  const originalRequest = mod.request;

  mod.request = function patchedRequest(...args) {
    try {
      const options  = args[0];
      const hostname = resolveHostname(options);
      const provider = matchProvider(hostname);

      if (provider) {
        const key = nextKey(provider);
        if (key) {
          if (provider.queryParam) {
            // Gemini: ?key= query param use karo
            const u = new URL(String(typeof options === 'string' || options instanceof URL ? options : `https://${options.hostname}${options.path || '/'}`));
            u.searchParams.set('key', key);
            args[0] = typeof options === 'object' && !(options instanceof URL)
              ? { ...options, path: `${u.pathname}${u.search}` }
              : u.toString();
          } else if (typeof options === 'string' || options instanceof URL) {
            // Convert string/URL to options object and inject auth header.
            // Also preserve any extra options passed as args[1] (3-arg form of http.request).
            const u = new URL(String(options));
            const extraOpts = (args[1] && typeof args[1] === 'object' && typeof args[1].on !== 'function') ? args[1] : {};
            args[0] = {
              protocol: u.protocol,
              hostname: u.hostname,
              port:     u.port,
              path:     `${u.pathname}${u.search}`,
              ...extraOpts,
              headers:  setAuthHeader(extraOpts.headers, key),
            };
          } else if (options && typeof options === 'object') {
            args[0] = { ...options, headers: setAuthHeader(options.headers, key) };
          }
        }
      }
    } catch (err) {
      console.warn('[key-rotator] http patch error:', err?.message || err);
    }

    return originalRequest.apply(mod, args);
  };
}

// ─── Apply patches ────────────────────────────────────────────────────────────

patchFetch();
patchHttpModule(http);
patchHttpModule(https);

log('[key-rotator] loaded — all providers active');
