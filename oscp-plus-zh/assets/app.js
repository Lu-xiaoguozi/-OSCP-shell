/* OSCP+ 中文镜像 · 交互逻辑 */
(function () {
  'use strict';

  const STATUSES = [
    { id: 'NOT STARTED', label: '未开始', cls: 'notstarted' },
    { id: 'RECON', label: '侦察', cls: 'recon' },
    { id: 'FOOTHOLD', label: '立足点', cls: 'foothold' },
    { id: 'PRIVESC', label: '提权', cls: 'privesc' },
    { id: 'OWNED', label: '已攻陷', cls: 'owned' }
  ];
  const STATUS_BY_ID = {};
  STATUSES.forEach(function (s) { STATUS_BY_ID[s.id] = s; });
  const STATUS_ORDER = STATUSES.map(function (s) { return s.id; });
  const PRI_LABEL = { H: '高', M: '中', L: '低' };
  const LS_KEY = 'oscpzh.state.v1';
  const LS_NOTICE = 'oscpzh.notice.v1';

  const state = {
    status: {},
    lang: 'zh',
    pri: 'ALL',
    statusFilter: 'ALL',
    hideDone: false,
    search: '',
    collapsed: {}
  };

  const $ = function (sel, root) { return (root || document).querySelector(sel); };
  const $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  // ---------- 数据 ----------
  let DATA = null;
  try {
    const bin = atob(window.CHECKLIST_DATA_B64 || '');
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    DATA = JSON.parse(new TextDecoder('utf-8').decode(bytes));
  } catch (err) {
    document.getElementById('content').innerHTML =
      '<div class="empty">数据加载失败：' + String(err && err.message ? err.message : err) + '</div>';
    return;
  }

  const ALL = [];
  DATA.phases.forEach(function (p) {
    p.groups.forEach(function (g) {
      g.items.forEach(function (it) {
        it._phase = p;
        it._group = g;
        ALL.push(it);
      });
    });
  });
  const BY_KEY = {};
  ALL.forEach(function (it) { BY_KEY[it.key] = it; });

  // ---------- 本地状态 ----------
  try {
    const raw = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
    if (raw && typeof raw.status === 'object' && raw.status) {
      Object.keys(raw.status).forEach(function (k) {
        if (BY_KEY[k] && STATUS_BY_ID[raw.status[k]]) state.status[k] = raw.status[k];
      });
    }
    if (raw.lang === 'en' || raw.lang === 'zh') state.lang = raw.lang;
    if (['ALL', 'H', 'M', 'L'].indexOf(raw.pri) >= 0) state.pri = raw.pri;
    if (STATUS_BY_ID[raw.statusFilter] || raw.statusFilter === 'ALL') state.statusFilter = raw.statusFilter;
    state.hideDone = !!raw.hideDone;
    if (raw.collapsed && typeof raw.collapsed === 'object') state.collapsed = raw.collapsed;
  } catch (e) { /* ignore */ }

  function save() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        status: state.status,
        lang: state.lang,
        pri: state.pri,
        statusFilter: state.statusFilter,
        hideDone: state.hideDone,
        collapsed: state.collapsed
      }));
    } catch (e) { /* ignore */ }
  }

  function statusOf(it) { return state.status[it.key] || 'NOT STARTED'; }
  function isDone(it) { return statusOf(it) === 'OWNED'; }
  function display(it) { return state.lang === 'en' ? it.en : it.zh; }
  function phaseTitle(p) { return state.lang === 'en' ? p.title.en : p.title.zh; }
  function groupLabel(g) { return state.lang === 'en' ? g.label.en : g.label.zh; }

  // ---------- 工具 ----------
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function rich(s) {
    let h = escapeHtml(s);
    h = h.replace(/\[\[([\s\S]+?)\]\]/g, function (m, c) { return '<code>' + c + '</code>'; });
    h = h.replace(/`([^`]+)`/g, function (m, c) { return '<code>' + c + '</code>'; });
    return h;
  }

  function pct(done, total) { return total ? Math.round(done / total * 100) : 0; }

  function countDone(items) {
    return items.filter(isDone).length;
  }

  // ---------- 渲染 ----------
  const content = $('#content');
  const emptyBox = $('#empty');
  const resultCount = $('#resultCount');
  const phaseNav = $('#phaseNav');

  function matches(it) {
    if (state.pri !== 'ALL' && it.p !== state.pri) return false;
    const st = statusOf(it);
    if (state.statusFilter !== 'ALL' && st !== state.statusFilter) return false;
    if (state.hideDone && st === 'OWNED') return false;
    if (state.search) {
      const q = state.search.toLowerCase();
      const hay = [it.zh, it.en, it.id, it._group.label.zh, it._group.label.en, it._phase.title.zh, it._phase.title.en].join(' ').toLowerCase();
      if (hay.indexOf(q) < 0) return false;
    }
    return true;
  }

  function itemHtml(it) {
    const st = statusOf(it);
    const meta = STATUS_BY_ID[st];
    return '<div class="item' + (st === 'OWNED' ? ' done' : '') + '" data-key="' + it.key + '">' +
      '<label class="item-check" title="标记完成"><input type="checkbox" data-action="check"' + (st === 'OWNED' ? ' checked' : '') + '><span class="box"></span></label>' +
      '<span class="pri pri-' + it.p + '" title="优先级">' + (PRI_LABEL[it.p] || it.p) + '</span>' +
      '<div class="item-body"><span class="item-text">' + rich(display(it)) + '</span><span class="item-id">' + escapeHtml(it.id) + '</span></div>' +
      '<button class="status-pill st-' + meta.cls + '" data-action="status" title="点击切换状态">' + meta.label + '</button>' +
      '<button class="copy-btn" data-action="copy" title="复制条目">⧉</button>' +
      '</div>';
  }

  function groupHtml(g) {
    const shown = g.items.filter(matches);
    if (!shown.length) return '';
    const total = g.items.length;
    const done = countDone(g.items);
    const collapsed = state.search ? false : !!state.collapsed[g.key];
    const desc = state.lang === 'zh' ? g.desc : '';
    return '<section class="group' + (collapsed ? ' collapsed' : '') + '" data-gkey="' + g.key + '">' +
      '<header class="group-head">' +
        '<div><div class="group-title">' + escapeHtml(groupLabel(g)) + '<span class="group-count">' + done + '/' + total + '</span></div>' +
        (desc ? '<div class="group-desc">' + escapeHtml(desc) + '</div>' : '') + '</div>' +
        '<div class="group-progress" title="分组进度"><i style="width:' + pct(done, total) + '%"></i></div>' +
        '<span class="chev">▾</span>' +
      '</header>' +
      '<div class="items">' + shown.map(itemHtml).join('') + '</div>' +
    '</section>';
  }

  function phaseHtml(p) {
    const groups = p.groups.map(groupHtml).filter(Boolean);
    if (!groups.length) return '';
    const total = p.groups.reduce(function (a, g) { return a + g.items.length; }, 0);
    const done = p.groups.reduce(function (a, g) { return a + countDone(g.items); }, 0);
    const collapsed = state.search ? false : !!state.collapsed[p.id];
    const sub = state.lang === 'en' ? p.title.zh : p.desc;
    return '<section class="phase' + (collapsed ? ' collapsed' : '') + '" id="phase-' + p.id + '" data-phase="' + p.id + '">' +
      '<header class="phase-head">' +
        '<div class="phase-num" style="color:' + p.color + '">' + p.num + '</div>' +
        '<div class="phase-title-wrap"><div class="phase-title"><span class="phase-icon">' + p.icon + '</span>' + escapeHtml(phaseTitle(p)) + '</div>' +
        '<div class="phase-sub">' + escapeHtml(sub) + '</div></div>' +
        '<div class="phase-progress"><div class="bar"><i style="width:' + pct(done, total) + '%;background:' + p.color + '"></i></div><span>' + done + ' / ' + total + ' · ' + pct(done, total) + '%</span></div>' +
        '<span class="chev">▾</span>' +
      '</header>' +
      '<div class="phase-body">' + groups.join('') + '</div>' +
    '</section>';
  }

  function render() {
    let shown = 0;
    const html = DATA.phases.map(function (p) {
      const block = phaseHtml(p);
      if (block) {
        p.groups.forEach(function (g) { shown += g.items.filter(matches).length; });
      }
      return block;
    }).filter(Boolean).join('');

    content.innerHTML = html;
    emptyBox.hidden = shown > 0;
    resultCount.innerHTML = '显示 <b>' + shown + '</b> / ' + ALL.length + ' 项' + (state.search ? ' · 搜索：' + escapeHtml(state.search) : '');
    highlight();
    updateStats();
    updateNav();
  }

  function highlight() {
    const q = state.search.trim();
    if (!q) return;
    const ql = q.toLowerCase();
    const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        return n.nodeValue && n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      const text = node.nodeValue;
      const lower = text.toLowerCase();
      if (lower.indexOf(ql) < 0) return;
      const frag = document.createDocumentFragment();
      let i = 0;
      while (true) {
        const idx = lower.indexOf(ql, i);
        if (idx < 0) { frag.appendChild(document.createTextNode(text.slice(i))); break; }
        if (idx > i) frag.appendChild(document.createTextNode(text.slice(i, idx)));
        const mark = document.createElement('mark');
        mark.textContent = text.slice(idx, idx + q.length);
        frag.appendChild(mark);
        i = idx + q.length;
      }
      node.parentNode.replaceChild(frag, node);
    });
  }

  function updateStats() {
    const total = ALL.length;
    const done = ALL.filter(isDone).length;
    const highLeft = ALL.filter(function (it) { return it.p === 'H' && !isDone(it); }).length;
    const p = pct(done, total);
    $('#ring').style.setProperty('--p', p);
    $('#pct').textContent = p + '%';
    $('#doneCount').textContent = done;
    $('#totalCount').textContent = total;
    $('#highLeft').textContent = highLeft;
    $('#ownedCount').textContent = done;
  }

  function updateNav() {
    phaseNav.innerHTML = DATA.phases.map(function (p) {
      const total = p.groups.reduce(function (a, g) { return a + g.items.length; }, 0);
      const done = p.groups.reduce(function (a, g) { return a + countDone(g.items); }, 0);
      return '<button type="button" data-phase="' + p.id + '" style="color:' + p.color + '">' +
        '<span class="pdot"></span><span class="pname">' + escapeHtml(phaseTitle(p)) + '</span>' +
        '<span class="pcount">' + done + '/' + total + '</span>' +
        '<span class="pbar"><i style="width:' + pct(done, total) + '%;background:' + p.color + '"></i></span>' +
      '</button>';
    }).join('');
  }

  // ---------- 状态操作 ----------
  function setStatus(key, st) {
    if (!BY_KEY[key] || !STATUS_BY_ID[st]) return;
    if (st === 'NOT STARTED') delete state.status[key];
    else state.status[key] = st;
    save();
    render();
  }

  function cycleStatus(key) {
    const cur = state.status[key] || 'NOT STARTED';
    const idx = STATUS_ORDER.indexOf(cur);
    setStatus(key, STATUS_ORDER[(idx + 1) % STATUS_ORDER.length]);
  }

  function copyItem(key) {
    const it = BY_KEY[key];
    if (!it) return;
    const text = display(it) + ' [' + it.id + ']';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast('已复制条目'); }, function () { fallbackCopy(text); });
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); toast('已复制条目'); } catch (e) { toast('复制失败'); }
    document.body.removeChild(ta);
  }

  let toastTimer = null;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 1800);
  }

  // ---------- 事件 ----------
  content.addEventListener('click', function (e) {
    const item = e.target.closest('.item');
    if (item) {
      if (e.target.closest('[data-action="status"]')) { cycleStatus(item.dataset.key); return; }
      if (e.target.closest('[data-action="copy"]')) { copyItem(item.dataset.key); return; }
    }
    const gh = e.target.closest('.group-head');
    if (gh) {
      const g = gh.parentNode.dataset.gkey;
      state.collapsed[g] = !state.collapsed[g];
      save();
      render();
      return;
    }
    const ph = e.target.closest('.phase-head');
    if (ph) {
      const id = ph.parentNode.dataset.phase;
      state.collapsed[id] = !state.collapsed[id];
      save();
      render();
    }
  });

  content.addEventListener('change', function (e) {
    if (e.target.matches('.item-check input')) {
      const item = e.target.closest('.item');
      if (item) setStatus(item.dataset.key, e.target.checked ? 'OWNED' : 'NOT STARTED');
    }
  });

  phaseNav.addEventListener('click', function (e) {
    const btn = e.target.closest('button[data-phase]');
    if (!btn) return;
    const target = document.getElementById('phase-' + btn.dataset.phase);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.body.classList.remove('sidebar-open');
  });

  const searchInput = $('#search');
  let searchTimer = null;
  searchInput.addEventListener('input', function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () {
      state.search = searchInput.value.trim();
      render();
    }, 90);
  });

  document.addEventListener('keydown', function (e) {
    const tag = (document.activeElement && document.activeElement.tagName) || '';
    if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
      e.preventDefault();
      searchInput.focus();
    }
    if (e.key === 'Escape' && document.activeElement === searchInput) {
      searchInput.value = '';
      state.search = '';
      render();
      searchInput.blur();
    }
  });

  $('#priFilter').addEventListener('click', function (e) {
    const btn = e.target.closest('button[data-pri]');
    if (!btn) return;
    state.pri = btn.dataset.pri;
    $$('#priFilter button').forEach(function (b) { b.classList.toggle('active', b === btn); });
    save();
    render();
  });

  $('#statusFilter').addEventListener('change', function (e) {
    state.statusFilter = e.target.value;
    save();
    render();
  });

  $('#hideDone').addEventListener('change', function (e) {
    state.hideDone = e.target.checked;
    save();
    render();
  });

  $('#expandAll').addEventListener('click', function () {
    state.collapsed = {};
    save();
    render();
  });

  $('#collapseAll').addEventListener('click', function () {
    DATA.phases.forEach(function (p) {
      state.collapsed[p.id] = true;
      p.groups.forEach(function (g) { state.collapsed[g.key] = true; });
    });
    save();
    render();
  });

  $('#langSeg').addEventListener('click', function (e) {
    const btn = e.target.closest('button[data-lang]');
    if (!btn) return;
    state.lang = btn.dataset.lang;
    document.documentElement.lang = state.lang === 'en' ? 'en' : 'zh-CN';
    $$('#langSeg button').forEach(function (b) { b.classList.toggle('active', b === btn); });
    save();
    render();
  });

  $('#noticeClose').addEventListener('click', function () {
    $('#notice').hidden = true;
    try { localStorage.setItem(LS_NOTICE, '1'); } catch (e) { /* ignore */ }
  });

  $('#exportBtn').addEventListener('click', function () {
    const payload = {
      app: 'oscp-plus-zh',
      version: 1,
      exportedAt: new Date().toISOString(),
      status: state.status
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'oscp-plus-zh-progress.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    toast('进度已导出');
  });

  $('#importBtn').addEventListener('click', function () { $('#importFile').click(); });

  $('#importFile').addEventListener('change', function (e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function () {
      try {
        const obj = JSON.parse(String(reader.result));
        if (!obj || typeof obj.status !== 'object') throw new Error('格式不正确');
        const next = {};
        Object.keys(obj.status).forEach(function (k) {
          if (BY_KEY[k] && STATUS_BY_ID[obj.status[k]] && obj.status[k] !== 'NOT STARTED') next[k] = obj.status[k];
        });
        state.status = next;
        save();
        render();
        toast('进度已导入，共 ' + Object.keys(next).length + ' 项');
      } catch (err) {
        toast('导入失败：' + (err.message || '文件格式不正确'));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  $('#resetBtn').addEventListener('click', function () {
    if (!window.confirm('确定要清空全部进度吗？此操作不可撤销。')) return;
    state.status = {};
    save();
    render();
    toast('已重置全部进度');
  });

  $('#menuBtn').addEventListener('click', function () {
    document.body.classList.toggle('sidebar-open');
  });
  $('#scrim').addEventListener('click', function () {
    document.body.classList.remove('sidebar-open');
  });

  // ---------- 初始化 ----------
  $('#heroItems').textContent = ALL.length;
  $('#totalCount').textContent = ALL.length;
  $('#statusFilter').value = state.statusFilter;
  $('#hideDone').checked = state.hideDone;
  $$('#priFilter button').forEach(function (b) { b.classList.toggle('active', b.dataset.pri === state.pri); });
  $$('#langSeg button').forEach(function (b) { b.classList.toggle('active', b.dataset.lang === state.lang); });
  document.documentElement.lang = state.lang === 'en' ? 'en' : 'zh-CN';
  try { if (localStorage.getItem(LS_NOTICE) === '1') $('#notice').hidden = true; } catch (e) { /* ignore */ }

  render();
})();