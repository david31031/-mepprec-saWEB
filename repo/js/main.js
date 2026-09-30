/* Mepprec SA — main.js */
(function () {
  'use strict';

  /* ================================================================== */
  /* Supabase client — set these two values to make chat, sermons,       */
  /* leadership and the calendar sync live for every visitor. Create a   */
  /* free project at supabase.com. Until then, everything still works    */
  /* on this device only, via local fallbacks.                           */
  /* ================================================================== */
  var SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
  var SUPABASE_ANON_KEY = 'YOUR_PUBLIC_ANON_KEY';
  var configured = SUPABASE_URL.indexOf('YOUR_PROJECT') === -1;
  var sb = (configured && window.supabase) ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

  /* ================================================================== */
  /* In-page navigation, handled entirely in JS. Some mobile browsers    */
  /* and embedded/preview webviews mistakenly treat plain same-page      */
  /* "#section" links as outbound navigation and prompt "Open external   */
  /* link?". Intercepting the click and scrolling manually avoids that   */
  /* prompt completely — every nav link, button, and footer link that    */
  /* points at "#something" on this same page goes through here.        */
  /* ================================================================== */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var hash = a.getAttribute('href');
    if (!hash || hash.length < 2) return;
    var target = document.querySelector(hash);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', hash);
  });

  /* Mobile nav */
  var toggle = document.getElementById('mobile-menu-toggle');
  var nav = document.getElementById('mobile-nav');
  var iconOpen = document.getElementById('icon-menu-open');
  var iconClose = document.getElementById('icon-menu-close');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var isOpen = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!isOpen));
      nav.style.maxHeight = isOpen ? '0px' : nav.scrollHeight + 'px';
      iconOpen.classList.toggle('hidden', !isOpen);
      iconClose.classList.toggle('hidden', isOpen);
    });
    nav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        toggle.setAttribute('aria-expanded', 'false');
        nav.style.maxHeight = '0px';
        iconOpen.classList.remove('hidden'); iconClose.classList.add('hidden');
      });
    });
  }

  /* Sticky header shadow */
  var header = document.getElementById('site-header');
  if (header) {
    window.addEventListener('scroll', function () {
      header.classList.toggle('is-scrolled', window.scrollY > 12);
    }, { passive: true });
  }

  /* Reveal on scroll */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in-view'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in-view'); });
  }

  /* FAQ accordion */
  document.querySelectorAll('.faq-item').forEach(function (item) {
    item.querySelector('.faq-trigger').addEventListener('click', function () {
      var isOpen = item.getAttribute('data-open') === 'true';
      document.querySelectorAll('.faq-item').forEach(function (i) { i.setAttribute('data-open', 'false'); });
      item.setAttribute('data-open', String(!isOpen));
    });
  });

  document.getElementById('footer-year').textContent = new Date().getFullYear();

  /* ================================================================== */
  /* Events Calendar — month grid, sample data, 3D hover tilt            */
  /* ================================================================== */
  (function () {
    var grid = document.getElementById('cal-grid');
    if (!grid) return;
    var monthLabel = document.getElementById('cal-month-label');
    var detailEl = document.getElementById('event-detail');
    var card = document.getElementById('cal-card');
    var today = new Date();
    var viewYear = today.getFullYear();
    var viewMonth = today.getMonth();
    var selectedKey = null;

    function key(y, m, d) { return y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0'); }

    /* Sample events — replace with your own, or wire to a CMS/Supabase table */
    var EVENTS = {};
    EVENTS[key(viewYear, viewMonth, 13)] = { title: 'Full Day of Worship', items: ['Word of the Day — Pastor Thabo', 'Saturday Service — 11:00', 'Worship Night — 17:00'] };
    EVENTS[key(viewYear, viewMonth, 7)] = { title: 'Weekend Services', items: ['Saturday Service — 11:00', 'Sunday Service — 15:00', 'Mepprec Kids — both services'] };
    EVENTS[key(viewYear, viewMonth, 10)] = { title: 'Midweek Online Prayer', items: ['WhatsApp Prayer — 18:30', 'Telegram Prayer Room open — 18:00'] };
    EVENTS[key(viewYear, viewMonth, 21)] = { title: 'Weekend Services', items: ['Saturday Service — 11:00', 'Sunday Service — 15:00'] };
    EVENTS[key(viewYear, viewMonth, 27)] = { title: 'Youth Night', items: ['Young Adults Gathering — 18:00', 'Worship Team Rehearsal — 16:00'] };

    /* Anyone's saved changes (Manage panel) override the samples above */
    var removedEventKeys = JSON.parse(localStorage.getItem('mepprec-removed-events') || '[]');
    removedEventKeys.forEach(function (k) { delete EVENTS[k]; });
    function localEventsStore() { return JSON.parse(localStorage.getItem('mepprec-custom-events') || '[]'); }
    localEventsStore().forEach(function (ev) { EVENTS[ev.key] = { title: ev.title, items: ev.items, _local: true }; });

    var WEEKDAY_FMT = { weekday: 'long', month: 'long', day: 'numeric' };

    function render() {
      monthLabel.textContent = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });
      grid.innerHTML = '';
      var firstDow = new Date(viewYear, viewMonth, 1).getDay();
      var daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
      var totalCells = Math.ceil((firstDow + daysInMonth) / 7) * 7;

      for (var i = 0; i < totalCells; i++) {
        var dayNum = i - firstDow + 1;
        var cell = document.createElement('div');
        if (dayNum < 1 || dayNum > daysInMonth) {
          cell.className = 'cal-day is-outside';
          grid.appendChild(cell);
          continue;
        }
        var k = key(viewYear, viewMonth, dayNum);
        cell.className = 'cal-day';
        cell.textContent = dayNum;
        cell.setAttribute('data-key', k);
        cell.setAttribute('role', 'button');
        cell.setAttribute('tabindex', '0');
        cell.setAttribute('aria-label', new Date(viewYear, viewMonth, dayNum).toLocaleDateString('en-ZA', WEEKDAY_FMT));
        if (EVENTS[k]) cell.classList.add('has-event');
        if (viewYear === today.getFullYear() && viewMonth === today.getMonth() && dayNum === today.getDate()) cell.classList.add('is-today');
        if (k === selectedKey) cell.classList.add('is-selected');
        cell.addEventListener('click', function () { selectDay(this.getAttribute('data-key')); });
        cell.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectDay(this.getAttribute('data-key')); } });
        grid.appendChild(cell);
      }
    }

    function selectDay(k) {
      selectedKey = k;
      render();
      var data = EVENTS[k];
      var d = new Date(k + 'T00:00:00');
      var dateStr = d.toLocaleDateString('en-ZA', WEEKDAY_FMT);
      if (!data) {
        detailEl.innerHTML = '<div class="event-detail-card"><p class="date">' + dateStr + '</p><h4>Nothing scheduled</h4><p class="text-ink-soft mt-2">Check back closer to the date, or reach out if you\'re planning something.</p></div>';
        return;
      }
      var itemsHtml = data.items.map(function (it) {
        return '<div class="event-list-item"><span class="dot"></span>' + it + '</div>';
      }).join('');
      detailEl.innerHTML = '<div class="event-detail-card"><p class="date">' + dateStr + '</p><h4>' + data.title + '</h4><div class="event-list">' + itemsHtml + '</div></div>';
    }

    document.getElementById('cal-prev').addEventListener('click', function () {
      viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; } render();
    });
    document.getElementById('cal-next').addEventListener('click', function () {
      viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; } render();
    });

    /* Subtle 3D tilt on the whole calendar card, following the cursor */
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduceMotion && card) {
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        card.classList.add('tilt-active');
        card.style.transform = 'rotateY(' + (px * 6) + 'deg) rotateX(' + (py * -6) + 'deg)';
      });
      card.addEventListener('mouseleave', function () {
        card.classList.remove('tilt-active');
        card.style.transform = 'rotateY(0deg) rotateX(0deg)';
      });
    }

    /* Manage the Calendar panel — open to everyone, no sign-in */
    var manageList = document.getElementById('calendar-manage-list');
    function renderManageList() {
      if (!manageList) return;
      var keys = Object.keys(EVENTS).sort();
      if (!keys.length) { manageList.innerHTML = '<p class="text-ink-soft text-xs text-center py-2">Nothing on the calendar yet.</p>'; return; }
      manageList.innerHTML = keys.map(function (k) {
        var ev = EVENTS[k];
        return '<div class="flex items-center justify-between gap-2 text-sm bg-parchment rounded-lg px-3 py-2">' +
          '<span class="text-ink font-medium truncate">' + k + ' \u2014 ' + ev.title + '</span>' +
          '<button type="button" data-remove-event-key="' + k + '" class="text-ember shrink-0 font-bold px-1">\u00d7</button>' +
          '</div>';
      }).join('');
      manageList.querySelectorAll('[data-remove-event-key]').forEach(function (btn) {
        btn.addEventListener('click', async function () {
          var k = btn.getAttribute('data-remove-event-key');
          var ev = EVENTS[k];
          if (ev._id && sb) {
            await sb.from('events').delete().eq('id', ev._id);
          } else if (ev._local) {
            var store = localEventsStore().filter(function (e) { return e.key !== k; });
            localStorage.setItem('mepprec-custom-events', JSON.stringify(store));
          } else {
            removedEventKeys.push(k);
            localStorage.setItem('mepprec-removed-events', JSON.stringify(removedEventKeys));
          }
          delete EVENTS[k];
          render();
          renderManageList();
          if (selectedKey === k) { selectedKey = null; detailEl.className = 'mt-6 event-detail-empty event-detail-empty--dark'; detailEl.innerHTML = '<p>Tap a highlighted date to see what\'s happening.</p>'; }
        });
      });
    }

    var calManageToggle = document.getElementById('calendar-manage-toggle');
    var calManagePanel = document.getElementById('calendar-admin-panel');
    var calEventForm = document.getElementById('calendar-event-form');
    if (calManageToggle && calManagePanel) {
      calManageToggle.addEventListener('click', function () { calManagePanel.classList.remove('hidden'); renderManageList(); });
      calManagePanel.querySelectorAll('[data-calendar-admin-close]').forEach(function (el) {
        el.addEventListener('click', function () { calManagePanel.classList.add('hidden'); });
      });
    }
    if (calEventForm) {
      calEventForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        var status = document.getElementById('calendar-event-status');
        var dateVal = document.getElementById('calendar-event-date').value;
        var title = document.getElementById('calendar-event-title').value;
        var itemsRaw = document.getElementById('calendar-event-items').value;
        var items = itemsRaw.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
        if (!dateVal || !title) return;
        if (!sb) {
          var store = localEventsStore();
          store.push({ key: dateVal, title: title, items: items });
          localStorage.setItem('mepprec-custom-events', JSON.stringify(store));
          EVENTS[dateVal] = { title: title, items: items, _local: true };
          render();
          renderManageList();
          calEventForm.reset();
          status.textContent = 'Saved on this device \u2014 connect Supabase so everyone sees it (see README).';
          return;
        }
        status.textContent = 'Saving\u2026';
        var ins = await sb.from('events').insert({ event_date: dateVal, title: title, items: items.join('\n') });
        if (ins.error) { status.textContent = 'Failed to save: ' + ins.error.message; return; }
        status.textContent = 'Saved! Refreshing calendar\u2026';
        calEventForm.reset();
        loadDbEvents();
      });
    }

    async function loadDbEvents() {
      if (!sb) { renderManageList(); return; }
      var res = await sb.from('events').select('*');
      if (res.error || !res.data) { renderManageList(); return; }
      res.data.forEach(function (r) {
        EVENTS[r.event_date] = { title: r.title, items: (r.items || '').split('\n').filter(Boolean), _id: r.id };
      });
      render();
      renderManageList();
    }

    render();
    selectDay(key(viewYear, viewMonth, 13));
    loadDbEvents();
  })();

  /* ================================================================== */
  /* Supabase-backed sermon library + open upload                        */
  /* ================================================================== */
  (function () {
    var grid = document.getElementById('sermon-grid');
    var empty = document.getElementById('sermon-empty');
    var toggleBtn = document.getElementById('admin-upload-toggle');
    var panel = document.getElementById('admin-panel');
    var uploadForm = document.getElementById('admin-upload-form');
    var player = document.getElementById('sermon-video');
    var titleEl = document.getElementById('sermon-title');
    var dateEl = document.getElementById('sermon-date');
    if (!grid) return;

    var localSermons = []; /* same-device fallback until Supabase is connected */

    function playSermon(sermon) {
      player.src = sermon.url;
      player.play().catch(function () {});
      titleEl.textContent = sermon.title;
      dateEl.textContent = sermon.date;
    }

    function renderSermons(list) {
      grid.innerHTML = '';
      if (!list.length) { empty.classList.remove('hidden'); return; }
      empty.classList.add('hidden');
      list.forEach(function (s) {
        var card = document.createElement('div');
        card.className = 'sermon-card';
        card.innerHTML = '<div class="sermon-thumb"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="10,8 16,12 10,16 10,8" fill="currentColor" stroke="none"/></svg></div>' +
          '<div class="body"><p class="font-semibold text-ink">' + s.title + '</p><p class="text-xs text-ink-soft font-mono mt-1">' + s.date + '</p></div>';
        card.addEventListener('click', function () { playSermon(s); });
        grid.appendChild(card);
      });
    }

    async function loadSermons() {
      if (!sb) { renderSermons(localSermons); return; }
      var res = await sb.from('sermons').select('*').order('date', { ascending: false });
      if (res.error) { renderSermons(localSermons); return; }
      renderSermons((res.data || []).map(function (r) { return { title: r.title, date: r.date, url: r.video_url }; }));
    }
    loadSermons();

    /* Upload panel open/close — open to anyone, no sign-in */
    if (toggleBtn) {
      toggleBtn.addEventListener('click', function () { panel.classList.remove('hidden'); });
      panel.querySelectorAll('[data-admin-close]').forEach(function (el) {
        el.addEventListener('click', function () { panel.classList.add('hidden'); });
      });
    }

    if (uploadForm) {
      uploadForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        var status = document.getElementById('upload-status');
        var file = document.getElementById('upload-file').files[0];
        var title = document.getElementById('upload-title').value;
        var date = document.getElementById('upload-date').value;
        if (!file) { status.textContent = 'Please choose a video file first.'; return; }
        if (!sb) {
          localSermons.unshift({ title: title, date: date, url: URL.createObjectURL(file) });
          renderSermons(localSermons);
          uploadForm.reset();
          status.textContent = 'Uploaded on this device — connect Supabase so everyone can see it (see README).';
          return;
        }
        status.textContent = 'Uploading…';
        var path = Date.now() + '-' + file.name;
        var up = await sb.storage.from('sermons').upload(path, file);
        if (up.error) { status.textContent = 'Upload failed: ' + up.error.message; return; }
        var publicUrl = sb.storage.from('sermons').getPublicUrl(path).data.publicUrl;
        var insert = await sb.from('sermons').insert({ title: title, date: date, video_url: publicUrl });
        if (insert.error) { status.textContent = 'Saved file, but failed to save details: ' + insert.error.message; return; }
        status.textContent = 'Uploaded! Refreshing list…';
        uploadForm.reset();
        loadSermons();
      });
    }
  })();

  /* ================================================================== */
  /* The Open Space — anonymous, gamer-style live chat, 24h rolling      */
  /* window. No names, no accounts, no login, no content filtering — by  */
  /* design. Needs a Supabase table "comments" (columns: guest_tag text, */
  /* guest_color text, message text, created_at timestamptz default     */
  /* now()) for messages to be visible to every visitor. For real 24h    */
  /* cleanup, add a Supabase scheduled Edge Function / pg_cron job —     */
  /* this script also opportunistically deletes anything older than     */
  /* 24h every time someone loads the page, as a best-effort backup.     */
  /* ================================================================== */
  (function () {
    var list = document.getElementById('comment-list');
    var form = document.getElementById('comment-form');
    var status = document.getElementById('comment-status');
    if (!list || !form) return;

    var DAY_MS = 24 * 60 * 60 * 1000;
    var localItems = []; /* fallback so the chat still works before Supabase is connected */

    /* Every visitor gets a random gamer-style tag + colour, kept for this browser */
    var GUEST_COLORS = ['#F4E3A1', '#7FD8C4', '#8FB8E8', '#E8A0D0', '#F2B880', '#A6E28C'];
    var guestTag = localStorage.getItem('mepprec-guest-tag');
    var guestColor = localStorage.getItem('mepprec-guest-color');
    if (!guestTag) {
      guestTag = 'Guest' + Math.floor(1000 + Math.random() * 9000);
      guestColor = GUEST_COLORS[Math.floor(Math.random() * GUEST_COLORS.length)];
      localStorage.setItem('mepprec-guest-tag', guestTag);
      localStorage.setItem('mepprec-guest-color', guestColor);
    }

    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, function (ch) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
      });
    }

    function timeAgo(ts) {
      var mins = Math.max(0, Math.floor((Date.now() - ts) / 60000));
      if (mins < 1) return 'just now';
      if (mins < 60) return mins + 'm ago';
      var hrs = Math.floor(mins / 60);
      if (hrs < 24) return hrs + 'h ago';
      return Math.floor(hrs / 24) + 'd ago';
    }

    function renderComments(items) {
      var cutoff = Date.now() - DAY_MS;
      var fresh = items.filter(function (it) { return new Date(it.created_at).getTime() > cutoff; });
      if (!fresh.length) { list.innerHTML = '<p class="comment-empty">Be the first to say something \uD83D\uDC4B</p>'; return; }
      list.innerHTML = fresh.map(function (it) {
        var tag = it.guest_tag || 'Guest';
        var color = it.guest_color || '#F4E3A1';
        return '<div class="comment-item"><span class="c-name" style="color:' + color + '">' + escapeHtml(tag) + '</span> <span class="c-time">' + timeAgo(new Date(it.created_at).getTime()) + '</span><p class="c-msg">' + escapeHtml(it.message) + '</p></div>';
      }).join('');
      list.scrollTop = list.scrollHeight;
    }

    async function loadComments() {
      if (!sb) { renderComments(localItems); return; }
      var cutoffIso = new Date(Date.now() - DAY_MS).toISOString();
      var res = await sb.from('comments').select('*').gt('created_at', cutoffIso).order('created_at', { ascending: true });
      if (res.error) { renderComments(localItems); return; }
      renderComments(res.data || []);
      sb.from('comments').delete().lt('created_at', cutoffIso).then(function () {}); /* best-effort cleanup */
    }

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var messageInput = document.getElementById('comment-message');
      var message = messageInput.value.trim();
      if (!message) return;
      if (!sb) {
        localItems.push({ guest_tag: guestTag, guest_color: guestColor, message: message, created_at: new Date().toISOString() });
        renderComments(localItems);
        form.reset();
        status.textContent = 'Visible on this device — connect Supabase so everyone can chat together (see README).';
        return;
      }
      var ins = await sb.from('comments').insert({ guest_tag: guestTag, guest_color: guestColor, message: message });
      if (ins.error) { status.textContent = 'Could not send \u2014 try again.'; return; }
      status.textContent = '';
      form.reset();
      loadComments();
    });

    loadComments();
    if (sb) {
      setInterval(loadComments, 8000);
      if (sb.channel) {
        try {
          sb.channel('comments-live').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, function () { loadComments(); }).subscribe();
        } catch (err) {}
      }
    }
  })();

  /* ================================================================== */
  /* Pastoral Leadership — the real Mepprec SA roster, plus a fully open */
  /* "Manage the Pastoral Team" panel (no login) to add or remove        */
  /* ministers (Supabase table "pastors" + storage buckets               */
  /* "pastor-photos" and "pastor-videos"). Click a card for the full      */
  /* animated bio page with their 60-second scripture short.              */
  /* ================================================================== */
  (function () {
    var pastorGrid = document.getElementById('pastor-grid');
    if (!pastorGrid) return;

    var removedDefaults = JSON.parse(localStorage.getItem('mepprec-removed-pastors') || '[]');

    var PASTORS = [
      {
        key: 'default-1', name: 'Prophetesse Ra\u00efssa Mutamba', role: 'Senior Pastor',
        short: 'Senior Pastor at Mepprec SA \u2014 House of Judah.',
        bio: 'Prophetesse Ra\u00efssa Mutamba leads Mepprec SA \u2014 House of Judah as Senior Pastor, carrying the church\u2019s prophetic vision and pastoral direction. Full biography coming soon \u2014 add it any time from the \u201cManage the Pastoral Team\u201d panel.',
        gradient: 'linear-gradient(135deg,var(--gold),var(--ember))', photo: 'assets/raissa-mutamba.webp', cardPhoto: 'assets/raissa-mutamba-card.webp', video: null
      },
      {
        key: 'default-2', name: 'Minister Gael Musoya', role: 'Co-Pastor',
        short: 'Co-Pastor at Mepprec SA.',
        bio: 'Minister Gael Musoya serves as Co-Pastor at Mepprec SA, walking alongside the Senior Pastor in leading and shepherding the church family. Full biography coming soon \u2014 add it any time from the \u201cManage the Pastoral Team\u201d panel.',
        gradient: 'linear-gradient(135deg,var(--fynbos),var(--gold-deep))', photo: 'assets/gael-musoya.webp', cardPhoto: 'assets/gael-musoya-card.webp', video: null
      },
      {
        key: 'default-3', name: 'Minister Linda Elanga', role: 'Minister',
        short: 'Minister at Mepprec SA.',
        bio: 'Minister Linda Elanga serves in ministry at Mepprec SA. Full biography coming soon \u2014 add it any time from the \u201cManage the Pastoral Team\u201d panel.',
        gradient: 'linear-gradient(135deg,var(--ember),var(--karoo-2))', photo: 'assets/linda-elanga.webp', cardPhoto: 'assets/linda-elanga-card.webp', video: null
      },
      {
        key: 'default-4', name: 'Minister Prisca Musoya/Kabulo', role: 'Minister',
        short: 'Minister at Mepprec SA.',
        bio: 'Minister Prisca Musoya/Kabulo serves in ministry at Mepprec SA. Full biography coming soon \u2014 add it any time from the \u201cManage the Pastoral Team\u201d panel.',
        gradient: 'linear-gradient(135deg,var(--gold-deep),var(--fynbos-deep))', photo: null, video: null
      },
      {
        key: 'default-5', name: 'Minister Patrick Luhembwe', role: 'Minister',
        short: 'Minister at Mepprec SA.',
        bio: 'Minister Patrick Luhembwe serves in ministry at Mepprec SA. Full biography coming soon \u2014 add it any time from the \u201cManage the Pastoral Team\u201d panel.',
        gradient: 'linear-gradient(135deg,var(--fynbos-light),var(--gold))', photo: 'assets/patrick-luhembwe.webp', cardPhoto: 'assets/patrick-luhembwe-card.webp', video: null
      },
      {
        key: 'default-6', name: 'Prophet Nathan-Mutombo', role: 'Minister',
        short: 'Minister at Mepprec SA.',
        bio: 'Prophet Nathan-Mutombo serves in ministry at Mepprec SA. Full biography coming soon \u2014 add it any time from the \u201cManage the Pastoral Team\u201d panel.',
        gradient: 'linear-gradient(135deg,var(--gold),var(--karoo-2))', photo: 'assets/nathan-mutombo.webp', cardPhoto: 'assets/nathan-mutombo-card.webp', video: null
      }
    ].filter(function (p) { return removedDefaults.indexOf(p.key) === -1; });

    function renderPastors() {
      pastorGrid.innerHTML = PASTORS.map(function (p, i) {
        var cardImg = p.cardPhoto || p.photo;
        var photoStyle = cardImg ? ('background-image:url(\'' + cardImg + '\');background-size:cover;background-position:center top') : ('background:' + p.gradient);
        return '<div class="team-card pastor-card reveal in-view relative" data-idx="' + i + '">' +
          '<button type="button" class="pastor-remove-btn" data-remove-idx="' + i + '" aria-label="Remove">\u00d7</button>' +
          '<button type="button" class="pastor-open-btn" data-idx="' + i + '">' +
          '<div class="team-photo" style="' + photoStyle + '" aria-hidden="true"></div>' +
          '<h3 class="font-display font-semibold text-ink text-lg mt-4">' + p.name + '</h3>' +
          '<p class="text-gold-deep text-sm font-mono mt-0.5">' + p.role + '</p>' +
          '<p class="text-ink-soft text-sm mt-2 leading-relaxed">' + p.short + '</p>' +
          '</button></div>';
      }).join('');

      pastorGrid.querySelectorAll('.pastor-open-btn').forEach(function (btn) {
        btn.addEventListener('click', function () { openPastor(PASTORS[Number(btn.getAttribute('data-idx'))]); });
      });
      pastorGrid.querySelectorAll('.pastor-remove-btn').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          removePastor(Number(btn.getAttribute('data-remove-idx')));
        });
      });
      renderManageList();
    }

    async function removePastor(idx) {
      var p = PASTORS[idx];
      if (!p) return;
      if (p.id && sb) {
        await sb.from('pastors').delete().eq('id', p.id);
      } else if (p.key) {
        removedDefaults.push(p.key);
        localStorage.setItem('mepprec-removed-pastors', JSON.stringify(removedDefaults));
      }
      PASTORS.splice(idx, 1);
      renderPastors();
    }

    function renderManageList() {
      var manageList = document.getElementById('pastor-manage-list');
      if (!manageList) return;
      if (!PASTORS.length) { manageList.innerHTML = '<p class="text-ink-soft text-xs text-center py-2">No one on the team yet.</p>'; return; }
      manageList.innerHTML = PASTORS.map(function (p, i) {
        return '<div class="flex items-center justify-between gap-2 text-sm bg-parchment rounded-lg px-3 py-2">' +
          '<span class="text-ink font-medium truncate">' + p.name + ' <span class="text-ink-soft font-normal">\u2014 ' + p.role + '</span></span>' +
          '<button type="button" data-manage-remove-idx="' + i + '" class="text-ember shrink-0 font-bold px-1">\u00d7</button>' +
          '</div>';
      }).join('');
      manageList.querySelectorAll('[data-manage-remove-idx]').forEach(function (btn) {
        btn.addEventListener('click', function () { removePastor(Number(btn.getAttribute('data-manage-remove-idx'))); });
      });
    }

    /* Bio overlay */
    var overlay = document.getElementById('pastor-overlay');
    var overlayPhoto = document.getElementById('pastor-overlay-photo');
    var overlayRole = document.getElementById('pastor-overlay-role');
    var overlayName = document.getElementById('pastor-overlay-name');
    var overlayBio = document.getElementById('pastor-overlay-bio');
    var overlayShortsWrap = document.getElementById('pastor-overlay-shorts-wrap');
    var overlayShorts = document.getElementById('pastor-overlay-shorts');

    function openPastor(p) {
      overlayRole.textContent = p.role;
      overlayName.textContent = p.name;
      overlayBio.textContent = p.bio;
      if (p.photo) {
        overlayPhoto.style.backgroundImage = 'url(' + p.photo + ')';
      } else {
        overlayPhoto.style.backgroundImage = 'none';
        overlayPhoto.style.background = p.gradient;
      }
      if (p.video) {
        overlayShortsWrap.classList.remove('hidden');
        overlayShorts.innerHTML = '<div class="pastor-short"><span class="short-badge">60 sec</span><video src="' + p.video + '" controls playsinline preload="metadata"></video></div>';
      } else {
        overlayShortsWrap.classList.remove('hidden');
        overlayShorts.innerHTML = '<div class="pastor-short flex items-center justify-center p-3 text-center"><span class="text-gold-light/50 text-xs font-mono">Scripture short coming soon</span></div>';
      }
      overlay.classList.add('is-open');
      overlay.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }
    function closePastor() {
      overlay.classList.remove('is-open');
      overlay.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
    if (overlay) {
      overlay.querySelectorAll('[data-overlay-close]').forEach(function (el) { el.addEventListener('click', closePastor); });
      overlay.addEventListener('click', function (e) { if (e.target === overlay) closePastor(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePastor(); });
    }

    async function loadExtraPastors() {
      if (!sb) return;
      var res = await sb.from('pastors').select('*').order('created_at', { ascending: true });
      if (res.error || !res.data) return;
      res.data.forEach(function (r) {
        PASTORS.push({
          id: r.id, name: r.name, role: r.role, short: (r.bio || '').slice(0, 110), bio: r.bio,
          photo: r.photo_url || null, video: r.video_url || null,
          gradient: 'linear-gradient(135deg,var(--gold),var(--fynbos))'
        });
      });
      renderPastors();
    }

    renderPastors();
    loadExtraPastors();

    /* Manage the Pastoral Team panel — open to everyone, no sign-in */
    var toggleBtn = document.getElementById('pastor-admin-toggle');
    var panel = document.getElementById('pastor-admin-panel');
    var uploadForm = document.getElementById('pastor-upload-form');

    if (toggleBtn && panel) {
      toggleBtn.addEventListener('click', function () { panel.classList.remove('hidden'); renderManageList(); });
      panel.querySelectorAll('[data-pastor-admin-close]').forEach(function (el) {
        el.addEventListener('click', function () { panel.classList.add('hidden'); });
      });
    }

    if (uploadForm) {
      uploadForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        var status = document.getElementById('pastor-upload-status');
        var name = document.getElementById('pastor-upload-name').value;
        var role = document.getElementById('pastor-upload-role').value;
        var bio = document.getElementById('pastor-upload-bio').value;
        var photoFile = document.getElementById('pastor-upload-photo').files[0];
        var videoFile = document.getElementById('pastor-upload-video').files[0];
        if (!sb) {
          PASTORS.push({ name: name, role: role, short: bio.slice(0, 110), bio: bio,
            photo: photoFile ? URL.createObjectURL(photoFile) : null,
            video: videoFile ? URL.createObjectURL(videoFile) : null,
            gradient: 'linear-gradient(135deg,var(--gold),var(--fynbos))' });
          renderPastors();
          uploadForm.reset();
          status.textContent = 'Added on this device \u2014 connect Supabase so everyone can see it (see README).';
          return;
        }
        status.textContent = 'Saving\u2026';
        var photoUrl = null, videoUrl = null;
        if (photoFile) {
          var pPath = Date.now() + '-' + photoFile.name;
          var pUp = await sb.storage.from('pastor-photos').upload(pPath, photoFile);
          if (!pUp.error) photoUrl = sb.storage.from('pastor-photos').getPublicUrl(pPath).data.publicUrl;
        }
        if (videoFile) {
          var vPath = Date.now() + '-' + videoFile.name;
          var vUp = await sb.storage.from('pastor-videos').upload(vPath, videoFile);
          if (!vUp.error) videoUrl = sb.storage.from('pastor-videos').getPublicUrl(vPath).data.publicUrl;
        }
        var insert = await sb.from('pastors').insert({ name: name, role: role, bio: bio, photo_url: photoUrl, video_url: videoUrl });
        if (insert.error) { status.textContent = 'Failed to save: ' + insert.error.message; return; }
        status.textContent = 'Added! Refreshing team\u2026';
        uploadForm.reset();
        loadExtraPastors();
      });
    }
  })();
})();
