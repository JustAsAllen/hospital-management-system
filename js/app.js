/* MedFlow — app logic */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  let state = {
    view: 'dashboard',
    currentUser: null,
    patients: [],
    doctors: [],
    appointments: [],
    invoices: [],
    apptFilter: 'all',
    patientFilter: '',
    chart: null
  };

  /* ── utilities ─────────────────────────────────── */
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const initials = (a, b) => ((a?.[0] || '') + (b?.[0] || '') || '?').toUpperCase();
  const age = (dob) => { if (!dob) return '—'; const d = new Date(dob); const diff = Date.now() - d.getTime(); return Math.floor(diff / (365.25 * 86400000)) || '<1'; };
  const money = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtDate = (d) => { if (!d) return '—'; const dt = new Date(d + (d.length === 10 ? 'T00:00:00' : '')); return dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }); };
  const time12 = (t) => { if (!t) return ''; const [h, m] = t.split(':').map(Number); const am = h < 12; return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${am ? 'AM' : 'PM'}`; };
  const fullName = (p) => `${p?.first_name || ''} ${p?.last_name || ''}`.trim() || '—';
  const avatarClass = (str) => { const n = (esc(str || '').length || 0) % 4; return ['', 'alt-teal', 'alt-violet', 'alt-pink'][n]; };

  function toast(msg, type = 'success') {
    const icons = { success: '<path d="M20 6L9 17l-5-5"/>', error: '<path d="M18 6L6 18M6 6l12 12"/>', info: '<path d="M12 8v.01M12 12v4"/>' };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<div class="t-icon"><svg viewBox="0 0 24 24">${icons[type] || icons.info}</svg></div><span>${esc(msg)}</span>`;
    $('#toasts').appendChild(el);
    setTimeout(() => { el.classList.add('leaving'); setTimeout(() => el.remove(), 260); }, 3200);
  }

  function openModal(id) { $(`#modal-${id}`).classList.remove('hidden'); }
  function closeModal(id) { $(`#modal-${id}`).classList.add('hidden'); }
  function closeAllModals() { $$('.modal-overlay').forEach(m => m.classList.add('hidden')); }

  function confirmDialog({ title = 'Are you sure?', text = 'This action cannot be undone.', onOk }) {
    $('#confirm-title').textContent = title;
    $('#confirm-text').textContent = text;
    openModal('confirm');
    const ok = $('#confirm-ok');
    const done = () => { closeModal('confirm'); ok.onclick = null; $('#confirm-cancel').onclick = null; };
    ok.onclick = () => { done(); onOk && onOk(); };
    $('#confirm-cancel').onclick = done;
  }

  /* ── init / boot ───────────────────────────────── */
  function updateModeBadge() {
    const online = DB.mode === 'supabase' && DB.isSupabase();
    $('#mode-label').textContent = online ? 'Supabase Live' : 'Demo Mode';
    $('#mode-pill').classList.toggle('offline', !online);
    $('#conn-badge').textContent = online ? 'Connected' : 'Not connected';
    $('#conn-badge').className = 'badge ' + (online ? 'connected' : 'offline');
    $('#set-url').value = window.MEDFLOW_CONFIG.supabaseUrl;
    $('#set-key').value = window.MEDFLOW_CONFIG.supabaseKey;
    $('#set-hospital').value = window.MEDFLOW_CONFIG.hospitalName;
    $('#set-demo').checked = window.MEDFLOW_CONFIG.demoMode;
    $('#demo-status').textContent = window.MEDFLOW_CONFIG.demoMode ? 'On' : 'Off';
  }

  async function boot() {
    updateModeBadge();
    await DB.refreshLive();
    updateModeBadge();
    const session = DB.currentUser();
    if (!session) { showAuth(); return; }
    state.currentUser = session;
    await showApp();
    if (DB.mode === 'supabase' && !state.patients.length && !state.doctors.length) {
      toast('Connected to Supabase, but your cloud database is empty. Use "Seed sample data" in Settings, or sign out to browse the demo.', 'info');
    }
  }

  function showAuth() {
    $('#auth-screen').classList.remove('hidden');
    $('#app').classList.add('hidden');
  }

  async function showApp() {
    $('#auth-screen').classList.add('hidden');
    $('#app').classList.remove('hidden');
    renderUserCard();
    await refreshAll();
    document.title = `${window.MEDFLOW_CONFIG.hospitalName} — MedFlow`;
  }

  function renderUserCard() {
    const u = state.currentUser || {};
    $('#user-avatar').textContent = initials(u.name);
    $('#user-name').textContent = u.name || '—';
    $('#user-role').textContent = u.role || 'Staff';
    $('#greeting').textContent = `Welcome back, ${(u.name || '').split(' ')[0]} 👋`;
    const chimera = $('#avatar-stack');
    chimera.innerHTML = state.doctors.slice(0, 4).map(d =>
      `<div class="user-avatar small" title="${esc(fullName(d))}">${initials(d.first_name, d.last_name)}</div>`
    ).join('');
  }

  /* ── data refresh ──────────────────────────────── */
  async function refreshAll() {
    const [p, d, a, i] = await Promise.all([
      DB.getPatients(), DB.getDoctors(), DB.getAppointments(), DB.getInvoices()
    ]);
    state.patients = p.data || [];
    state.doctors = d.data || [];
    state.appointments = a.data || [];
    state.invoices = i.data || [];
    renderAll();
  }

  /* ── navigation ────────────────────────────────── */
  function navigate(view) {
    state.view = view;
    $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === view));
    $$('.view').forEach(v => v.classList.toggle('active-view', v.id === `view-${view}`));
    $('#app').scrollTop = 0; window.scrollTo({ top: 0, behavior: 'smooth' });
    $('.sidebar').classList.remove('open');
    $('.mobile-scrim')?.remove();
    if (view === 'dashboard') renderDashboard();
    if (view === 'patients') renderPatients();
    if (view === 'doctors') renderDoctors();
    if (view === 'appointments') renderAppointments();
    if (view === 'billing') renderBilling();
    if (view === 'settings') updateModeBadge();
  }

  function renderAll() {
    renderDashboard();
    renderPatients();
    renderDoctors();
    renderAppointments();
    renderBilling();
    renderUserCard();
    const scheduled = state.appointments.filter(a => a.status === 'scheduled').length;
    $('#nav-badge-appts').textContent = scheduled;
  }

  /* ── dashboard ─────────────────────────────────── */
  async function renderDashboard() {
    $('#stat-patients').textContent = state.patients.length;
    $('#stat-doctors').textContent = state.doctors.length;
    $('#stat-appts').textContent = state.appointments.filter(a => a.status !== 'cancelled').length;
    const rev = await DB.monthlyRevenue();
    $('#stat-revenue').textContent = money(rev.paidTotal);
    $('#stat-revenue-trend').textContent = `${rev.pending ? money(rev.pending) + ' pending' : 'All collected'}`;
    const today = new Date().toISOString().slice(0, 10);
    const todayCount = state.appointments.filter(a => a.date === today && a.status !== 'cancelled').length;
    $('#stat-appts-label').textContent = todayCount ? `${todayCount} today` : 'Scheduled';

    renderTodayList();
    renderRecentPatients();
    renderActivityChart();
    renderDeptChart();
  }

  function renderTodayList() {
    const today = new Date().toISOString().slice(0, 10);
    const list = state.appointments
      .filter(a => a.date >= today)
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
      .slice(0, 5);
    const wrap = $('#today-list');
    if (!list.length) { wrap.innerHTML = `<p class="empty-state" style="padding:18px 0">No upcoming appointments.</p>`; return; }
    wrap.innerHTML = list.map(a => `
      <div class="appt-list-item">
        <div class="cell-avatar ${avatarClass(fullName(a.patient))}">${initials(a.patient?.first_name, a.patient?.last_name)}</div>
        <div style="flex:1;min-width:0">
          <strong style="font-size:.87rem">${esc(fullName(a.patient))}</strong>
          <small style="display:block;color:var(--text-faint);font-size:.75rem">${esc(a.doctor?.specialty || '—')} · ${esc(a.reason || '')}</small>
        </div>
        <div style="text-align:right">
          <span class="badge status-${a.status}">${a.status}</span>
          <small style="display:block;color:var(--text-faint);font-size:.72rem;margin-top:3px">${fmtDate(a.date)} · ${time12(a.time)}</small>
        </div>
      </div>`).join('');
  }

  function renderRecentPatients() {
    const rows = state.patients.slice(0, 5);
    $('#recent-patients').innerHTML = rows.map(p => `
      <tr>
        <td><div class="cell-user"><div class="cell-avatar ${avatarClass(fullName(p))}">${initials(p.first_name, p.last_name)}</div><div><strong>${esc(fullName(p))}</strong><small>${esc(p.email || 'no email')}</small></div></div></td>
        <td>${age(p.dob)} / ${esc(p.gender || '—')}</td>
        <td><span class="badge">${esc(p.blood_group || '—')}</span></td>
        <td>${esc(p.phone || '—')}</td>
      </tr>`).join('');
  }

  async function renderActivityChart() {
    const { labels, series } = await DB.activitySeries(7);
    const ctx = $('#activity-chart').getContext('2d');
    if (!window.Chart) return;
    if (state.chart) state.chart.destroy();
    const g = ctx.createLinearGradient(0, 0, 0, 220);
    g.addColorStop(0, 'rgba(99,102,241,0.45)');
    g.addColorStop(1, 'rgba(139,92,246,0)');
    state.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: series,
          borderColor: '#818cf8',
          backgroundColor: g,
          fill: true,
          tension: 0.45,
          borderWidth: 3,
          pointRadius: 4,
          pointBackgroundColor: '#a5b4fc',
          pointBorderColor: '#1e1b4b',
          pointBorderWidth: 2
        }]
      },
      options: {
        responsive: false,
        plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(10,14,28,.95)', padding: 12, cornerRadius: 10, titleFont: { family: 'Inter', weight: 700 }, bodyFont: { family: 'Inter' } } },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64708f', font: { family: 'Inter' } } },
          y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64708f', precision: 0, font: { family: 'Inter' } } }
        }
      }
    });
  }

  async function renderDeptChart() {
    const { rows, max } = await DB.deptStats();
    if (!rows.length) { $('#dept-chart').innerHTML = `<p class="empty-state">No doctors yet.</p>`; return; }
    const palette = ['linear-gradient(135deg,#6366f1,#8b5cf6)', 'linear-gradient(135deg,#14b8a6,#22d3ee)', 'linear-gradient(135deg,#f59e0b,#f97316)', 'linear-gradient(135deg,#ec4899,#8b5cf6)', 'linear-gradient(135deg,#3b82f6,#22d3ee)', 'linear-gradient(135deg,#22c55e,#14b8a6)'];
    $('#dept-chart').innerHTML = rows.map(([name, n], i) => `
      <div class="dept-bar-row">
        <span title="${esc(name)}">${esc(name)}</span>
        <div class="dept-bar"><div class="dept-bar-fill" data-w="${(n / max) * 100}" style="background:${palette[i % palette.length]}"></div></div>
        <span>${n}</span>
      </div>`).join('');
    requestAnimationFrame(() => setTimeout(() => {
      $$('.dept-bar-fill').forEach(f => { f.style.width = f.dataset.w + '%'; });
    }, 60));
  }

  /* ── patients ──────────────────────────────────── */
  function filteredPatients() {
    const q = state.patientFilter.toLowerCase();
    return state.patients.filter(p =>
      !q || `${fullName(p)} ${p.email} ${p.phone} ${p.blood_group}`.toLowerCase().includes(q)
    );
  }

  function renderPatients() {
    const rows = filteredPatients();
    $('#patients-table').innerHTML = rows.map(p => `
      <tr>
        <td><div class="cell-user"><div class="cell-avatar ${avatarClass(fullName(p))}">${initials(p.first_name, p.last_name)}</div><div><strong>${esc(fullName(p))}</strong><small>${esc(p.email || p.address || '—')}</small></div></div></td>
        <td>${age(p.dob)}</td>
        <td>${esc(p.gender || '—')}</td>
        <td>${esc(p.blood_group || '—')}</td>
        <td>${esc(p.phone || '—')}</td>
        <td><div class="row-actions">
          <button class="mini-btn view" data-view-patient="${p.id}" title="View"><svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
          <button class="mini-btn edit" data-edit-patient="${p.id}" title="Edit"><svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/></svg></button>
          <button class="mini-btn del" data-del-patient="${p.id}" title="Delete"><svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg></button>
        </div></td>
      </tr>`).join('');
    $('#patients-empty').classList.toggle('hidden', rows.length > 0);
  }

  function openPatientModal(p) {
    $('#modal-patient-title').textContent = p ? 'Edit Patient' : 'Add Patient';
    $('#pf-id').value = p?.id || '';
    $('#pf-first').value = p?.first_name || '';
    $('#pf-last').value = p?.last_name || '';
    $('#pf-dob').value = p?.dob || '';
    $('#pf-gender').value = p?.gender || 'Male';
    $('#pf-blood').value = p?.blood_group || 'O+';
    $('#pf-phone').value = p?.phone || '';
    $('#pf-email').value = p?.email || '';
    $('#pf-address').value = p?.address || '';
    $('#pf-allergies').value = p?.allergies || '';
    $('#pf-notes').value = p?.notes || '';
    openModal('patient');
  }

  async function viewPatient(id) {
    const p = state.patients.find(x => x.id === id);
    if (!p) return;
    const appts = state.appointments.filter(a => a.patient_id === id);
    const invs = state.invoices.filter(i => i.patient_id === id);
    $('#patient-detail-body').innerHTML = `
      <div class="profile-hero">
        <div class="user-avatar">${initials(p.first_name, p.last_name)}</div>
        <div style="flex:1">
          <h2>${esc(fullName(p))}</h2>
          <p class="muted">${age(p.dob)} yrs · ${esc(p.gender || '—')} · ${esc(p.blood_group || '—')} blood</p>
        </div>
        <span class="badge status-scheduled">${appts.length} visits</span>
      </div>
      <div class="profile-grid">
        <div class="profile-field"><span>Phone</span><strong>${esc(p.phone || '—')}</strong></div>
        <div class="profile-field"><span>Email</span><strong>${esc(p.email || '—')}</strong></div>
        <div class="profile-field" style="grid-column:1/-1"><span>Address</span><strong>${esc(p.address || '—')}</strong></div>
        <div class="profile-field" style="grid-column:1/-1"><span>Allergies</span><strong style="color:${p.allergies ? '#fca5a5' : 'inherit'}">${esc(p.allergies || 'None recorded')}</strong></div>
        <div class="profile-field" style="grid-column:1/-1"><span>Medical Notes</span><strong>${esc(p.notes || 'No notes yet.')}</strong></div>
      </div>
      <div style="margin-top:20px">
        <h3 style="font-size:.95rem;margin-bottom:12px">Recent Appointments</h3>
        ${appts.length ? appts.slice(0, 3).map(a => {
          const d = state.doctors.find(x => x.id === a.doctor_id);
          return `<div class="appt-list-item"><div class="cell-avatar ${avatarClass(fullName(d))}">${initials(d?.first_name, d?.last_name)}</div><div style="flex:1"><strong style="font-size:.85rem">${esc(d ? fullName(d) : '—')}</strong><small style="display:block;color:var(--text-faint)">${esc(d?.specialty || '')}</small></div><span class="badge status-${a.status}">${a.status}</span></div>`;
        }).join('') : '<p class="empty-state">No appointments yet.</p>'}
      </div>
      <div style="margin-top:18px">
        <h3 style="font-size:.95rem;margin-bottom:12px">Invoices (${money(invs.reduce((s, i) => s + (i.status === 'paid' ? Number(i.amount) : 0), 0))} paid)</h3>
        ${invs.length ? invs.map(i => `<div class="appt-list-item"><div style="flex:1"><strong style="font-size:.85rem">${esc(i.description)}</strong><small style="display:block;color:var(--text-faint)">${fmtDate(i.created_at)}</small></div><strong>${money(i.amount)}</strong><span class="badge ${i.status}">${i.status}</span></div>`).join('') : '<p class="empty-state">No invoices yet.</p>'}
      </div>`;
    openModal('patient-details');
  }

  /* ── doctors ───────────────────────────────────── */
  function renderDoctors() {
    const grid = $('#doctor-grid');
    if (!state.doctors.length) { grid.innerHTML = `<p class="empty-state" style="grid-column:1/-1">No doctors yet. Add your first team member →</p>`; return; }
    grid.innerHTML = state.doctors.map(d => `
      <div class="doctor-card glass">
        <div class="doctor-avatar">${initials(d.first_name, d.last_name)}</div>
        <h3>${esc(fullName(d))}</h3>
        <span class="doctor-specialty">${esc(d.specialty)}</span>
        <div class="doctor-meta">
          <span><svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>${esc(d.phone || '—')}</span>
          <span><svg viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>${money(d.fee)}</span>
        </div>
        <span class="badge ${d.available ? 'status-completed' : 'offline'}" style="margin-bottom:14px">${d.available ? '● Available' : '○ Off duty'}</span>
        <div class="row-actions" style="justify-content:center">
          <button class="mini-btn edit" data-edit-doctor="${d.id}" title="Edit"><svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/></svg></button>
          <button class="mini-btn del" data-del-doctor="${d.id}" title="Delete"><svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg></button>
        </div>
      </div>`).join('');
  }

  function openDoctorModal(d) {
    $('#modal-doctor-title').textContent = d ? 'Edit Doctor' : 'Add Doctor';
    $('#df-id').value = d?.id || '';
    $('#df-first').value = d?.first_name || '';
    $('#df-last').value = d?.last_name || '';
    $('#df-specialty').value = d?.specialty || 'General Medicine';
    $('#df-fee').value = d?.fee ?? '';
    $('#df-phone').value = d?.phone || '';
    $('#df-email').value = d?.email || '';
    $('#df-license').value = d?.license || '';
    openModal('doctor');
  }

  /* ── appointments ──────────────────────────────── */
  function filteredAppointments() {
    const today = new Date().toISOString().slice(0, 10);
    return state.appointments
      .filter(a => state.apptFilter === 'all' || a.status === state.apptFilter)
      .map(a => ({ ...a, sortKey: (a.date >= today ? 0 : 1) + (a.date + a.time) }))
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }

  function renderAppointments() {
    const rows = filteredAppointments();
    const grid = $('#appt-grid');
    $('#appts-empty').classList.toggle('hidden', rows.length > 0);
    grid.innerHTML = rows.map(a => {
      const d = new Date(a.date + 'T00:00:00');
      return `
      <div class="appt-card glass">
        <div class="appt-top">
          <div class="appt-date-badge"><strong>${d.getDate()}</strong><span>${d.toLocaleDateString(undefined, { month: 'short' })}</span></div>
          <span class="badge status-${a.status}">${a.status}</span>
        </div>
        <div class="appt-body">
          <h4>${esc(fullName(a.patient))}</h4>
          <p>${esc(a.reason || 'General appointment')}</p>
          <div class="appt-time" style="margin-top:8px"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>${time12(a.time)} · ${d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</div>
        </div>
        <div class="appt-foot">
          <div class="appt-doctor"><div class="cell-avatar">${initials(a.doctor?.first_name, a.doctor?.last_name)}</div>${esc(a.doctor ? fullName(a.doctor) : '—')} · ${esc(a.doctor?.specialty || '')}</div>
          <div class="row-actions">
            <button class="mini-btn edit" data-edit-appt="${a.id}" title="Edit"><svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/></svg></button>
            <button class="mini-btn del" data-del-appt="${a.id}" title="Delete"><svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg></button>
          </div>
        </div>
      </div>`;
    }).join('');
  }

  function fillApptSelects() {
    const po = $('#af-patient'); const doOpt = $('#af-doctor');
    po.innerHTML = `<option value="">Select patient…</option>` + state.patients.map(p => `<option value="${p.id}">${esc(fullName(p))}</option>`).join('');
    doOpt.innerHTML = `<option value="">Select doctor…</option>` + state.doctors.map(d => `<option value="${d.id}">${esc(fullName(d))} — ${esc(d.specialty)}</option>`).join('');
  }

  function fillInvoiceSelects() {
    const po = $('#ivf-patient');
    po.innerHTML = `<option value="">Select patient…</option>` + state.patients.map(p => `<option value="${p.id}">${esc(fullName(p))}</option>`).join('');
  }

  function openAppointmentModal(a) {
    fillApptSelects();
    $('#modal-appointment-title').textContent = a ? 'Edit Appointment' : 'New Appointment';
    $('#af-id').value = a?.id || '';
    $('#af-patient').value = a?.patient_id || '';
    $('#af-doctor').value = a?.doctor_id || '';
    $('#af-date').value = a?.date || new Date().toISOString().slice(0, 10);
    $('#af-time').value = a?.time || '10:00';
    $('#af-status').value = a?.status || 'scheduled';
    $('#af-reason').value = a?.reason || '';
    openModal('appointment');
  }

  function openInvoiceModal(i) {
    fillInvoiceSelects();
    $('#modal-invoice-title').textContent = i ? 'Edit Invoice' : 'New Invoice';
    $('#ivf-id').value = i?.id || '';
    $('#ivf-patient').value = i?.patient_id || '';
    $('#ivf-desc').value = i?.description || '';
    $('#ivf-amount').value = i?.amount ?? '';
    $('#ivf-status').value = i?.status || 'unpaid';
    openModal('invoice');
  }

  /* ── billing ───────────────────────────────────── */
  function renderBilling() {
    const rows = state.invoices;
    $('#invoices-table').innerHTML = rows.map(i => `
      <tr>
        <td><span class="badge">#${esc(i.id.slice(-5).toUpperCase())}</span></td>
        <td><div class="cell-user"><div class="cell-avatar ${avatarClass(fullName(i.patient))}">${initials(i.patient?.first_name, i.patient?.last_name)}</div><strong>${esc(fullName(i.patient))}</strong></div></td>
        <td>${esc(i.description)}<br><small style="color:var(--text-faint)">${fmtDate(i.created_at)}</small></td>
        <td><strong>${money(i.amount)}</strong></td>
        <td><span class="badge ${i.status}">${i.status}</span></td>
        <td><div class="row-actions">
          <button class="mini-btn edit" data-edit-invoice="${i.id}" title="Edit"><svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/></svg></button>
          <button class="mini-btn del" data-del-invoice="${i.id}" title="Delete"><svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg></button>
        </div></td>
      </tr>`).join('');
    $('#invoices-empty').classList.toggle('hidden', rows.length > 0);
  }

  /* ── settings ──────────────────────────────────── */
  function saveConn() {
    const url = $('#set-url').value.trim();
    const key = $('#set-key').value.trim();
    if (!url || !key) return toast('Enter both your Supabase URL and anon key.', 'error');
    localStorage.setItem('mf_supabase_url', url);
    localStorage.setItem('mf_supabase_anon', key);
    location.reload();
  }

  function disconnect() {
    localStorage.removeItem('mf_supabase_url');
    localStorage.removeItem('mf_supabase_anon');
    localStorage.removeItem('mf_session');
    location.reload();
  }

  function saveHospital() {
    const name = $('#set-hospital').value.trim() || 'City General Hospital';
    localStorage.setItem('mf_hospital_name', name);
    localStorage.setItem('mf_demo_mode', $('#set-demo').checked ? '1' : '0');
    toast('Settings saved.');
    document.title = `${name} — MedFlow`;
  }

  function exportData() {
    const blob = new Blob([JSON.stringify({ patients: state.patients, doctors: state.doctors, appointments: state.appointments, invoices: state.invoices }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `medflow-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast('Data exported.');
  }

  async function resetDemo() {
    const isLive = DB.mode === 'supabase';
    confirmDialog({
      title: isLive ? 'Wipe ALL database data?' : 'Reset all demo data?',
      text: isLive
        ? 'This permanently deletes every patient, doctor, appointment and invoice from your Supabase database. This cannot be undone.'
        : 'This replaces all local data with fresh sample data.',
      onOk: async () => {
        const r = await DB.wipeTables();
        if (r.error) return toast(r.error.message, 'error');
        toast(isLive ? 'Database wiped.' : 'Demo data restored.');
        await refreshAll();
      }
    });
  }

  async function seedData() {
    toast('Seeding Indian sample data…', 'info');
    const r = await DB.seedSampleData();
    if (r.error) return toast(r.error.message, 'error');
    toast('Sample data ready — 12 patients, 6 doctors, 10 appointments, 8 invoices.');
    await refreshAll();
  }

  /* ── global search ─────────────────────────────── */
  function globalSearch(q) {
    q = q.toLowerCase().trim();
    if (!q) return;
    const patients = state.patients.filter(p => fullName(p).toLowerCase().includes(q));
    const appts = state.appointments.filter(a => `${fullName(a.patient)} ${(a.reason || '')} ${fullName(a.doctor)}`.toLowerCase().includes(q));
    navigate(appts.length ? 'appointments' : patients.length ? 'patients' : 'dashboard');
    if (patients.length) { state.patientFilter = q; renderPatients(); }
    if (appts.length) { state.apptFilter = 'all'; renderAppointments(); }
    toast(`Found ${patients.length + appts.length} result${patients.length + appts.length === 1 ? '' : 's'}.`, 'info');
    $('#global-search').value = '';
  }

  /* ── form submissions ──────────────────────────── */
  async function submitPatient(e) {
    e.preventDefault();
    const payload = {
      first_name: $('#pf-first').value.trim(),
      last_name: $('#pf-last').value.trim(),
      dob: $('#pf-dob').value,
      gender: $('#pf-gender').value,
      blood_group: $('#pf-blood').value,
      phone: $('#pf-phone').value.trim(),
      email: $('#pf-email').value.trim(),
      address: $('#pf-address').value.trim(),
      allergies: $('#pf-allergies').value.trim(),
      notes: $('#pf-notes').value.trim()
    };
    if (!payload.first_name || !payload.last_name) return toast('Name is required.', 'error');
    const id = $('#pf-id').value;
    const res = id
      ? await DB.updatePatient(id, payload)
      : await DB.addPatient(payload);
    if (res.error) return toast(res.error.message, 'error');
    closeModal('patient');
    toast(id ? 'Patient updated.' : 'Patient added.');
    await refreshAll();
  }

  async function submitDoctor(e) {
    e.preventDefault();
    const payload = {
      first_name: $('#df-first').value.trim(),
      last_name: $('#df-last').value.trim(),
      specialty: $('#df-specialty').value,
      fee: Number($('#df-fee').value) || 0,
      phone: $('#df-phone').value.trim(),
      email: $('#df-email').value.trim(),
      license: $('#df-license').value.trim(),
      available: true
    };
    if (!payload.first_name || !payload.last_name) return toast('Name is required.', 'error');
    const id = $('#df-id').value;
    const res = id ? await DB.updateDoctor(id, payload) : await DB.addDoctor(payload);
    if (res.error) return toast(res.error.message, 'error');
    closeModal('doctor');
    toast(id ? 'Doctor updated.' : 'Doctor added.');
    await refreshAll();
  }

  async function submitAppointment(e) {
    e.preventDefault();
    const payload = {
      patient_id: $('#af-patient').value,
      doctor_id: $('#af-doctor').value,
      date: $('#af-date').value,
      time: $('#af-time').value,
      status: $('#af-status').value,
      reason: $('#af-reason').value.trim()
    };
    if (!payload.patient_id || !payload.doctor_id || !payload.date || !payload.time) return toast('Patient, doctor, date and time are required.', 'error');
    const id = $('#af-id').value;
    const res = id ? await DB.updateAppointment(id, payload) : await DB.addAppointment(payload);
    if (res.error) return toast(res.error.message, 'error');
    closeModal('appointment');
    toast(id ? 'Appointment updated.' : 'Appointment booked.');
    await refreshAll();
  }

  async function submitInvoice(e) {
    e.preventDefault();
    const payload = {
      patient_id: $('#ivf-patient').value,
      description: $('#ivf-desc').value.trim(),
      amount: Number($('#ivf-amount').value),
      status: $('#ivf-status').value
    };
    if (!payload.patient_id || !payload.description || !payload.amount && payload.amount !== 0) return toast('Patient, description and amount are required.', 'error');
    const id = $('#ivf-id').value;
    const res = id ? await DB.updateInvoice(id, payload) : await DB.addInvoice(payload);
    if (res.error) return toast(res.error.message, 'error');
    closeModal('invoice');
    toast(id ? 'Invoice updated.' : 'Invoice created.');
    await refreshAll();
  }

  /* ── auth forms ────────────────────────────────── */
  function setAuthHint(msg, ok = false) {
    const el = $('#auth-hint');
    el.textContent = msg;
    el.className = 'auth-hint ' + (msg ? (ok ? 'ok' : 'err') : '');
  }

  async function submitLogin(e) {
    e.preventDefault();
    setAuthHint('');
    const email = $('#login-email').value.trim();
    const password = $('#login-password').value;
    if (!email || !password) return setAuthHint('Please enter your email and password.');
    const res = await DB.signIn({ email, password });
    if (res.error) return setAuthHint(res.error.message);
    state.currentUser = res.data;
    await showApp();
  }

  async function submitSignup(e) {
    e.preventDefault();
    setAuthHint('');
    const name = $('#signup-name').value.trim();
    const email = $('#signup-email').value.trim();
    const password = $('#signup-password').value;
    if (!name) return setAuthHint('Please enter your full name.');
    if (password.length < 8) return setAuthHint('Password must be at least 8 characters.');
    const res = await DB.signUp({ name, email, password });
    if (res.error) return setAuthHint(res.error.message);
    state.currentUser = res.data;
    toast('Welcome to MedFlow, ' + name.split(' ')[0] + '!');
    await showApp();
  }

  async function logout() {
    await DB.signOut();
    state.currentUser = null;
    showAuth();
  }

  /* ── modal target helpers ──────────────────────── */
  function handleTableClick(e) {
    const viewBtn = e.target.closest('[data-view-patient]');
    const editP = e.target.closest('[data-edit-patient]');
    const delP = e.target.closest('[data-del-patient]');
    const editD = e.target.closest('[data-edit-doctor]');
    const delD = e.target.closest('[data-del-doctor]');
    const editA = e.target.closest('[data-edit-appt]');
    const delA = e.target.closest('[data-del-appt]');
    const editI = e.target.closest('[data-edit-invoice]');
    const delI = e.target.closest('[data-del-invoice]');

    if (viewBtn) {
      e.preventDefault();
      viewPatient(viewBtn.dataset.viewPatient);
    }
    if (editP) { e.preventDefault(); const p = state.patients.find(x => x.id === editP.dataset.editPatient); openPatientModal(p); }
    if (delP) { e.preventDefault(); const id = delP.dataset.delPatient; confirmDialog({ title: 'Delete patient?', text: 'This patient record will be permanently removed.', onOk: async () => { const r = await DB.deletePatient(id); if (r.error) return toast(r.error.message, 'error'); toast('Patient deleted.'); await refreshAll(); } }); }
    if (editD) { e.preventDefault(); const d = state.doctors.find(x => x.id === editD.dataset.editDoctor); openDoctorModal(d); }
    if (delD) { e.preventDefault(); const id = delD.dataset.delDoctor; confirmDialog({ title: 'Remove doctor?', text: 'This doctor will be removed from the roster.', onOk: async () => { const r = await DB.deleteDoctor(id); if (r.error) return toast(r.error.message, 'error'); toast('Doctor removed.'); await refreshAll(); } }); }
    if (editA) { e.preventDefault(); const a = state.appointments.find(x => x.id === editA.dataset.editAppt); openAppointmentModal(a); }
    if (delA) { e.preventDefault(); const id = delA.dataset.delAppt; confirmDialog({ title: 'Cancel appointment?', text: 'This appointment will be permanently removed.', onOk: async () => { const r = await DB.deleteAppointment(id); if (r.error) return toast(r.error.message, 'error'); toast('Appointment deleted.'); await refreshAll(); } }); }
    if (editI) { e.preventDefault(); const i = state.invoices.find(x => x.id === editI.dataset.editInvoice); openInvoiceModal(i); }
    if (delI) { e.preventDefault(); const id = delI.dataset.delInvoice; confirmDialog({ title: 'Delete invoice?', text: 'This invoice will be permanently removed.', onOk: async () => { const r = await DB.deleteInvoice(id); if (r.error) return toast(r.error.message, 'error'); toast('Invoice deleted.'); await refreshAll(); } }); }
  }

  /* ── events ────────────────────────────────────── */
  function bindEvents() {
    // nav
    $$('.nav-item').forEach(n => n.addEventListener('click', () => navigate(n.dataset.view)));
    $$('[data-goto]').forEach(b => b.addEventListener('click', () => navigate(b.dataset.goto)));

    // auth
    $$('.auth-tab').forEach(t => t.addEventListener('click', () => {
      $$('.auth-tab').forEach(x => x.classList.toggle('active', x === t));
      $$('.auth-form').forEach(f => f.classList.toggle('active-form', f.id === `${t.dataset.tab}-form`));
      setAuthHint('');
    }));
    $('#login-form').addEventListener('submit', submitLogin);
    $('#signup-form').addEventListener('submit', submitSignup);
    $('#demo-login').addEventListener('click', async () => {
      const res = await DB.demoLogin();
      state.currentUser = res.data;
      toast('Signed in as demo admin.');
      await showApp();
    });

    // logout / mobile
    $('#logout-btn').addEventListener('click', logout);
    $('#mobile-menu').addEventListener('click', () => {
      $('.sidebar').classList.add('open');
      if (!$('.mobile-scrim')) {
        const scrim = document.createElement('div');
        scrim.className = 'mobile-scrim';
        scrim.onclick = () => { $('.sidebar').classList.remove('open'); scrim.remove(); };
        document.body.appendChild(scrim);
      }
    });

    // forms
    $('#patient-form').addEventListener('submit', submitPatient);
    $('#doctor-form').addEventListener('submit', submitDoctor);
    $('#appointment-form').addEventListener('submit', submitAppointment);
    $('#invoice-form').addEventListener('submit', submitInvoice);

    // modals open/close
    $$('[data-open-modal]').forEach(b => b.addEventListener('click', () => {
      const m = b.dataset.openModal;
      if (m === 'patient') openPatientModal(null);
      else if (m === 'doctor') openDoctorModal(null);
      else if (m === 'appointment') openAppointmentModal(null);
      else if (m === 'invoice') openInvoiceModal(null);
      else openModal(m);
    }));
    $$('[data-close-modal]').forEach(b => b.addEventListener('click', () => closeModal(b.dataset.closeModal)));
    $$('.modal-overlay').forEach(o => o.addEventListener('mousedown', (e) => { if (e.target === o) o.classList.add('hidden'); }));

    // delegated row/table actions
    document.addEventListener('click', handleTableClick);

    // filters
    $('#patient-search').addEventListener('input', (e) => { state.patientFilter = e.target.value; renderPatients(); });
    $$('#appt-status-filters .chip').forEach(c => c.addEventListener('click', () => {
      $$('#appt-status-filters .chip').forEach(x => x.classList.toggle('active', x === c));
      state.apptFilter = c.dataset.status;
      renderAppointments();
    }));

    // global search
    $('#global-search').addEventListener('keydown', (e) => { if (e.key === 'Enter') globalSearch(e.target.value); });

    // quick add button -> open appointment modal
    $('#add-quick').addEventListener('click', () => openAppointmentModal(null));

    // settings
    $('#save-supabase').addEventListener('click', saveConn);
    $('#disconnect-supabase').addEventListener('click', disconnect);
    $('#save-hospital').addEventListener('click', saveHospital);
    $('#export-data').addEventListener('click', exportData);
    $('#reset-data').addEventListener('click', resetDemo);
    $('#seed-data').addEventListener('click', seedData);
  }

  /* ── go ────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', () => { bindEvents(); boot(); });
})();