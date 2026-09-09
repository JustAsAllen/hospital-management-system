/* MedFlow — data layer
   Automatically uses Supabase when configured; otherwise falls back to a
   gorgeous local demo mode so the app works instantly, even offline. */

const DB = (() => {
  const LS_DB = 'mf_demo_db_v2';
  const LS_SESSION = 'mf_session_v2';
  let client = null;
  let liveSession = false;

  /* ── Indian sample dataset (used for demo preview + seed button) ── */
  const apptDate = (off) => new Date(Date.now() + off * 86400000).toISOString().slice(0, 10);
  const SAMPLE = {
    patients: [
      { id: '00000000-0000-0000-0000-000000000001', first_name: 'Rajesh', last_name: 'Kumar', dob: '1978-04-12', gender: 'Male', phone: '+91 98200 11223', email: 'rajesh.kumar@example.in', address: '14 Marine Drive, Mumbai', blood_group: 'A+', allergies: 'Penicillin', notes: 'Hypertension. Monthly BP monitoring.' },
      { id: '00000000-0000-0000-0000-000000000002', first_name: 'Priya', last_name: 'Sharma', dob: '1992-09-23', gender: 'Female', phone: '+91 98110 33445', email: 'priya.sharma@example.in', address: '22 Lajpat Nagar, New Delhi', blood_group: 'B+', allergies: '', notes: 'Asthma. Carries inhaler.' },
      { id: '00000000-0000-0000-0000-000000000003', first_name: 'Amit', last_name: 'Patel', dob: '1985-01-30', gender: 'Male', phone: '+91 99090 55667', email: 'amit.patel@example.in', address: '8 CG Road, Ahmedabad', blood_group: 'O+', allergies: 'Sulfa drugs', notes: 'Type 2 diabetes.' },
      { id: '00000000-0000-0000-0000-000000000004', first_name: 'Sunita', last_name: 'Verma', dob: '1988-07-08', gender: 'Female', phone: '+91 98300 77889', email: 'sunita.verma@example.in', address: '55 Indiranagar, Bengaluru', blood_group: 'B-', allergies: '', notes: 'Thyroid condition.' },
      { id: '00000000-0000-0000-0000-000000000005', first_name: 'Vikram', last_name: 'Singh', dob: '1971-12-19', gender: 'Male', phone: '+91 94140 99001', email: 'vikram.singh@example.in', address: '3 MI Road, Jaipur', blood_group: 'O-', allergies: 'Aspirin', notes: 'Post-CABG. Quarterly cardio review.' },
      { id: '00000000-0000-0000-0000-000000000006', first_name: 'Ananya', last_name: 'Iyer', dob: '2001-05-17', gender: 'Female', phone: '+91 98410 22334', email: 'ananya.iyer@example.in', address: '77 T Nagar, Chennai', blood_group: 'AB+', allergies: '', notes: 'None' },
      { id: '00000000-0000-0000-0000-000000000007', first_name: 'Mohammed', last_name: 'Rizwan', dob: '1996-03-02', gender: 'Male', phone: '+91 99890 44556', email: 'rizwan.m@example.in', address: '12 Banjara Hills, Hyderabad', blood_group: 'A-', allergies: 'Seafood', notes: 'Migraine management.' },
      { id: '00000000-0000-0000-0000-000000000008', first_name: 'Kavita', last_name: 'Joshi', dob: '1969-10-25', gender: 'Female', phone: '+91 98220 66778', email: 'kavita.joshi@example.in', address: '40 Koregaon Park, Pune', blood_group: 'AB-', allergies: 'Penicillin', notes: 'Osteoarthritis.' },
      { id: '00000000-0000-0000-0000-000000000009', first_name: 'Arjun', last_name: 'Nair', dob: '2013-02-14', gender: 'Male', phone: '+91 98470 88990', email: 'arjun.nair@example.in', address: '9 MG Road, Kochi', blood_group: 'O+', allergies: 'Peanuts', notes: 'Pediatric asthma.' },
      { id: '00000000-0000-0000-0000-000000000010', first_name: 'Deepika', last_name: 'Reddy', dob: '1983-06-09', gender: 'Female', phone: '+91 98660 11220', email: 'deepika.reddy@example.in', address: '21 Jubilee Hills, Hyderabad', blood_group: 'A+', allergies: '', notes: 'Annual health check.' },
      { id: '00000000-0000-0000-0000-000000000011', first_name: 'Sanjay', last_name: 'Mehta', dob: '1959-08-03', gender: 'Male', phone: '+91 98300 33445', email: 'sanjay.mehta@example.in', address: '5 Park Street, Kolkata', blood_group: 'B+', allergies: 'NSAIDs', notes: 'Glaucoma management.' },
      { id: '00000000-0000-0000-0000-000000000012', first_name: 'Neha', last_name: 'Kapoor', dob: '1998-11-28', gender: 'Female', phone: '+91 98140 55667', email: 'neha.kapoor@example.in', address: '16 Sector 17, Chandigarh', blood_group: 'O+', allergies: '', notes: 'Dermatology consultation.' }
    ],
    doctors: [
      { id: '10000000-0000-0000-0000-000000000001', first_name: 'Anil', last_name: 'Kulkarni', specialty: 'Cardiology', fee: 2500, phone: '+91 98450 22331', email: 'anil.kulkarni@medflow.io', license: 'MCI-CAR-88412', available: true },
      { id: '10000000-0000-0000-0000-000000000002', first_name: 'Meera', last_name: 'Krishnan', specialty: 'Neurology', fee: 2800, phone: '+91 98860 44552', email: 'meera.krishnan@medflow.io', license: 'MCI-NEU-55109', available: true },
      { id: '10000000-0000-0000-0000-000000000003', first_name: 'Rohit', last_name: 'Deshmukh', specialty: 'Pediatrics', fee: 1800, phone: '+91 99670 55663', email: 'rohit.deshmukh@medflow.io', license: 'MCI-PED-22034', available: true },
      { id: '10000000-0000-0000-0000-000000000004', first_name: 'Asha', last_name: 'Reddy', specialty: 'Orthopedics', fee: 2200, phone: '+91 98110 88994', email: 'asha.reddy@medflow.io', license: 'MCI-ORT-99071', available: false },
      { id: '10000000-0000-0000-0000-000000000005', first_name: 'Vikrant', last_name: 'Chopra', specialty: 'Dermatology', fee: 1600, phone: '+91 98675 11225', email: 'vikrant.chopra@medflow.io', license: 'MCI-DER-33258', available: true },
      { id: '10000000-0000-0000-0000-000000000006', first_name: 'Farhan', last_name: 'Qureshi', specialty: 'General Medicine', fee: 1200, phone: '+91 99300 77886', email: 'farhan.qureshi@medflow.io', license: 'MCI-GEN-77049', available: true }
    ],
    appointments: [
      { id: '20000000-0000-0000-0000-000000000001', patient_id: '00000000-0000-0000-0000-000000000001', doctor_id: '10000000-0000-0000-0000-000000000001', date: apptDate(0), time: '09:30', status: 'scheduled', reason: 'Monthly BP follow-up' },
      { id: '20000000-0000-0000-0000-000000000002', patient_id: '00000000-0000-0000-0000-000000000002', doctor_id: '10000000-0000-0000-0000-000000000003', date: apptDate(0), time: '10:00', status: 'scheduled', reason: 'Asthma review' },
      { id: '20000000-0000-0000-0000-000000000003', patient_id: '00000000-0000-0000-0000-000000000007', doctor_id: '10000000-0000-0000-0000-000000000002', date: apptDate(0), time: '11:15', status: 'scheduled', reason: 'Migraine consultation' },
      { id: '20000000-0000-0000-0000-000000000004', patient_id: '00000000-0000-0000-0000-000000000005', doctor_id: '10000000-0000-0000-0000-000000000001', date: apptDate(0), time: '14:00', status: 'scheduled', reason: 'Post-CABG review' },
      { id: '20000000-0000-0000-0000-000000000005', patient_id: '00000000-0000-0000-0000-000000000006', doctor_id: '10000000-0000-0000-0000-000000000005', date: apptDate(-1), time: '09:00', status: 'completed', reason: 'Routine skin check' },
      { id: '20000000-0000-0000-0000-000000000006', patient_id: '00000000-0000-0000-0000-000000000009', doctor_id: '10000000-0000-0000-0000-000000000003', date: apptDate(-2), time: '15:30', status: 'completed', reason: 'Spirometry test' },
      { id: '20000000-0000-0000-0000-000000000007', patient_id: '00000000-0000-0000-0000-000000000008', doctor_id: '10000000-0000-0000-0000-000000000004', date: apptDate(-4), time: '13:00', status: 'cancelled', reason: 'Knee pain assessment' },
      { id: '20000000-0000-0000-0000-000000000008', patient_id: '00000000-0000-0000-0000-000000000007', doctor_id: '10000000-0000-0000-0000-000000000002', date: apptDate(2), time: '10:45', status: 'scheduled', reason: 'MRI results review' },
      { id: '20000000-0000-0000-0000-000000000009', patient_id: '00000000-0000-0000-0000-000000000012', doctor_id: '10000000-0000-0000-0000-000000000005', date: apptDate(3), time: '16:00', status: 'scheduled', reason: 'Eczema treatment plan' },
      { id: '20000000-0000-0000-0000-000000000010', patient_id: '00000000-0000-0000-0000-000000000010', doctor_id: '10000000-0000-0000-0000-000000000006', date: apptDate(1), time: '12:20', status: 'scheduled', reason: 'Annual health check' }
    ],
    invoices: [
      { id: '30000000-0000-0000-0000-000000000001', patient_id: '00000000-0000-0000-0000-000000000001', description: 'Cardiology consultation + ECG', amount: 7500, status: 'paid' },
      { id: '30000000-0000-0000-0000-000000000002', patient_id: '00000000-0000-0000-0000-000000000002', description: 'Pulmonology follow-up', amount: 1800, status: 'paid' },
      { id: '30000000-0000-0000-0000-000000000003', patient_id: '00000000-0000-0000-0000-000000000009', description: 'Spirometry + lab panel', amount: 4200, status: 'paid' },
      { id: '30000000-0000-0000-0000-000000000004', patient_id: '00000000-0000-0000-0000-000000000006', description: 'Dermatology consultation', amount: 1600, status: 'unpaid' },
      { id: '30000000-0000-0000-0000-000000000005', patient_id: '00000000-0000-0000-0000-000000000003', description: 'Diabetes panel + cardiology', amount: 6200, status: 'unpaid' },
      { id: '30000000-0000-0000-0000-000000000006', patient_id: '00000000-0000-0000-0000-000000000007', description: 'Neurology consultation + MRI', amount: 11400, status: 'overdue' },
      { id: '30000000-0000-0000-0000-000000000007', patient_id: '00000000-0000-0000-0000-000000000008', description: 'Orthopedic consultation', amount: 2200, status: 'paid' },
      { id: '30000000-0000-0000-0000-000000000008', patient_id: '00000000-0000-0000-0000-000000000010', description: 'General physician visit + labs', amount: 2600, status: 'unpaid' }
    ]
  };

  const seed = () => {
    const days = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
    const mins = (m) => new Date(Date.now() + m * 60000).toISOString().slice(0, 10).replace('T', ' ');
    return {
      users: [
        { id: 'u1', name: 'Allen (Demo Admin)', email: 'admin@medflow.io', password: 'medflow123', role: 'Administrator' }
      ],
      patients: SAMPLE.patients.map((p, i) => ({ ...p, created_at: mins(-(12 - i) * 60) })),
      doctors: SAMPLE.doctors.map((d, i) => ({ ...d, created_at: mins(-(10 - i) * 60) })),
      appointments: SAMPLE.appointments,
      invoices: SAMPLE.invoices.map((v, i) => ({ ...v, created_at: mins(-(8 - i) * 60) }))
    };
  };

  const uid = () => (Math.random().toString(36).slice(2, 10) + Date.now().toString(36)).slice(0, 20);
  const effectiveMode = () => (isSupabaseReady() && liveSession) ? 'supabase' : 'demo';

  /* ── Persistence helpers (demo mode) ── */
  const loadDb = () => { try { return JSON.parse(localStorage.getItem(LS_DB)) || seed(); } catch { return seed(); } };
  const saveDb = (db) => localStorage.setItem(LS_DB, JSON.stringify(db));
  if (!localStorage.getItem(LS_DB)) saveDb(seed());

  const getSession = () => { try { return JSON.parse(localStorage.getItem(LS_SESSION)); } catch { return null; } };
  const setSession = (u) => u ? localStorage.setItem(LS_SESSION, JSON.stringify(u)) : localStorage.removeItem(LS_SESSION);

  /* ── Supabase client ── */
  const cfg = () => window.MEDFLOW_CONFIG;
  const isSupabaseReady = () => window.supabase && cfg().supabaseUrl && cfg().supabaseKey;
  const initClient = () => {
    if (!client && isSupabaseReady()) {
      client = window.supabase.createClient(cfg().supabaseUrl, cfg().supabaseKey, {
        auth: { persistSession: true, autoRefreshToken: true }
      });
    }
    return client;
  };
  const getClient = () => initClient() || null;

  const trackTables = {
    patients: ['first_name', 'last_name', 'dob', 'gender', 'phone', 'email', 'address', 'blood_group', 'allergies', 'notes'],
    doctors: ['first_name', 'last_name', 'specialty', 'fee', 'phone', 'email', 'license', 'available'],
    appointments: ['patient_id', 'doctor_id', 'date', 'time', 'status', 'reason'],
    invoices: ['patient_id', 'description', 'amount', 'status']
  };
  const pick = (obj, keys) => { const o = {}; keys.forEach(k => { if (obj[k] !== undefined) o[k] = obj[k]; }); return o; };

  /* RLS-safe RPC calls for Supabase (see schema.sql for helper functions) */
  const setClaims = async () => { const c = getClient(); if (c) await c.rpc('set_app_role', { app_role: 'staff' }); };

  const api = {
    /* ── mode ── */
    get mode() { return effectiveMode(); },
    isSupabase: () => isSupabaseReady(),
    active: () => effectiveMode(),
    getClient,

    /* Does the current browser have a real Supabase session? */
    async refreshLive() {
      liveSession = false;
      if (isSupabaseReady() && getClient()) {
        try { const { data } = await getClient().auth.getUser(); liveSession = !!data?.user; }
        catch { liveSession = false; }
      }
      return liveSession;
    },

    /* ── auth ── */
    async signUp({ name, email, password }) {
      if (this.active() === 'supabase') {
        const c = getClient();
        const { data, error } = await c.auth.signUp({ email, password, options: { data: { full_name: name } } });
        if (error) return { error };
        if (!data.session) return { error: new Error('Check your inbox to confirm your email, then sign in.') };
        liveSession = true;
        await setClaims();
        const p = await c.from('profiles').upsert({ id: data.user.id, full_name: name, role: 'Admin' }).select('*').single();
        const user = { id: data.user.id, name: p.data?.full_name || name, email, role: p.data?.role || 'Staff' };
        setSession(user);
        return { data: user };
      }
      const db = loadDb();
      if (db.users.some(u => u.email === email)) return { error: new Error('An account with that email already exists.') };
      const user = { id: uid(), name, email, password, role: 'Administrator' };
      db.users.push(user); saveDb(db);
      setSession({ id: user.id, name, email, role: user.role });
      return { data: user };
    },

    async signIn({ email, password }) {
      if (this.active() === 'supabase') {
        const c = getClient();
        const { data, error } = await c.auth.signInWithPassword({ email, password });
        if (error) return { error };
        liveSession = true;
        const p = await c.from('profiles').select('full_name, role').eq('id', data.user.id).single();
        const user = { id: data.user.id, name: p.data?.full_name || email.split('@')[0], email, role: p.data?.role || 'Staff' };
        await setClaims();
        setSession(user);
        return { data: user };
      }
      const db = loadDb();
      const user = db.users.find(u => u.email === email && u.password === password);
      if (!user) return { error: new Error('Invalid email or password.') };
      setSession({ id: user.id, name: user.name, email, role: user.role });
      return { data: user };
    },

    async demoLogin() {
      const db = loadDb();
      if (!db.users.some(u => u.email === 'admin@medflow.io')) db.users.push({ id: 'u1', name: 'Allen (Demo Admin)', email: 'admin@medflow.io', password: 'medflow123', role: 'Administrator' });
      saveDb(db);
      liveSession = false;
      setSession({ id: 'u1', name: 'Allen (Demo Admin)', email: 'admin@medflow.io', role: 'Administrator' });
      return { data: { id: 'u1', name: 'Allen (Demo Admin)', email: 'admin@medflow.io', role: 'Administrator' } };
    },

    async signOut() {
      liveSession = false;
      if (this.active() === 'supabase') { await getClient()?.auth.signOut(); }
      setSession(null);
    },
    currentUser: () => getSession(),

    /* ── patients ── */
    async getPatients() {
      if (this.active() === 'supabase') { const { data, error } = await getClient().from('patients').select('*').order('created_at', { ascending: false }); return { data, error }; }
      const db = loadDb();
      return { data: [...db.patients].sort((a, b) => b.created_at.localeCompare(a.created_at)), error: null };
    },
    async addPatient(p) {
      p.created_at = p.created_at || new Date().toISOString().replace('T', ' ');
      if (this.active() === 'supabase') { const { data, error } = await getClient().from('patients').insert(pick(p, trackTables.patients)).select('*').single(); return { data, error }; }
      const db = loadDb(); const row = { id: uid(), ...p }; db.patients.push(row); saveDb(db); return { data: row, error: null };
    },
    async updatePatient(id, p) {
      if (this.active() === 'supabase') { const { data, error } = await getClient().from('patients').update(pick(p, trackTables.patients)).eq('id', id).select('*').single(); return { data, error }; }
      const db = loadDb(); const i = db.patients.findIndex(x => x.id === id); if (i === -1) return { error: new Error('Not found') };
      db.patients[i] = { ...db.patients[i], ...p }; saveDb(db); return { data: db.patients[i], error: null };
    },
    async deletePatient(id) {
      if (this.active() === 'supabase') { const { error } = await getClient().from('patients').delete().eq('id', id); return { error }; }
      const db = loadDb(); db.patients = db.patients.filter(x => x.id !== id); saveDb(db); return { error: null };
    },

    /* ── doctors ── */
    async getDoctors() {
      if (this.active() === 'supabase') { const { data, error } = await getClient().from('doctors').select('*').order('created_at', { ascending: false }); return { data, error }; }
      const db = loadDb();
      return { data: [...db.doctors], error: null };
    },
    async addDoctor(d) {
      d.available = d.available !== false;
      d.created_at = new Date().toISOString().replace('T', ' ');
      if (this.active() === 'supabase') { const { data, error } = await getClient().from('doctors').insert(pick(d, trackTables.doctors)).select('*').single(); return { data, error }; }
      const db = loadDb(); const row = { id: uid(), ...d }; db.doctors.push(row); saveDb(db); return { data: row, error: null };
    },
    async updateDoctor(id, d) {
      if (this.active() === 'supabase') { const { data, error } = await getClient().from('doctors').update(pick(d, trackTables.doctors)).eq('id', id).select('*').single(); return { data, error }; }
      const db = loadDb(); const i = db.doctors.findIndex(x => x.id === id); if (i === -1) return { error: new Error('Not found') };
      db.doctors[i] = { ...db.doctors[i], ...d }; saveDb(db); return { data: db.doctors[i], error: null };
    },
    async deleteDoctor(id) {
      if (this.active() === 'supabase') { const { error } = await getClient().from('doctors').delete().eq('id', id); return { error }; }
      const db = loadDb(); db.doctors = db.doctors.filter(x => x.id !== id); saveDb(db); return { error: null };
    },

    /* ── appointments ── */
    async getAppointments() {
      if (this.active() === 'supabase') {
        const { data, error } = await getClient().from('appointments').select('*, patient:patients(*), doctor:doctors(*)').order('date', { ascending: false });
        return { data, error };
      }
      const db = loadDb();
      const rows = db.appointments.map(a => ({ ...a, patient: db.patients.find(p => p.id === a.patient_id), doctor: db.doctors.find(d => d.id === a.doctor_id) }));
      return { data: rows, error: null };
    },
    async addAppointment(a) {
      if (this.active() === 'supabase') { const { data, error } = await getClient().from('appointments').insert(pick(a, trackTables.appointments)).select('*, patient:patients(*), doctor:doctors(*)').single(); return { data, error }; }
      const db = loadDb(); const row = { id: uid(), ...a }; db.appointments.push(row); saveDb(db); return { data: row, error: null };
    },
    async updateAppointment(id, a) {
      if (this.active() === 'supabase') { const { data, error } = await getClient().from('appointments').update(pick(a, trackTables.appointments)).eq('id', id).select('*, patient:patients(*), doctor:doctors(*)').single(); return { data, error }; }
      const db = loadDb(); const i = db.appointments.findIndex(x => x.id === id); if (i === -1) return { error: new Error('Not found') };
      db.appointments[i] = { ...db.appointments[i], ...a }; saveDb(db);
      return { data: db.appointments[i], error: null };
    },
    async deleteAppointment(id) {
      if (this.active() === 'supabase') { const { error } = await getClient().from('appointments').delete().eq('id', id); return { error }; }
      const db = loadDb(); db.appointments = db.appointments.filter(x => x.id !== id); saveDb(db); return { error: null };
    },

    /* ── invoices ── */
    async getInvoices() {
      if (this.active() === 'supabase') {
        const { data, error } = await getClient().from('invoices').select('*, patient:patients(*)').order('created_at', { ascending: false });
        return { data, error };
      }
      const db = loadDb();
      const rows = db.invoices.map(i => ({ ...i, patient: db.patients.find(p => p.id === i.patient_id) }));
      return { data: rows, error: null };
    },
    async addInvoice(i) {
      i.created_at = new Date().toISOString().replace('T', ' ');
      if (this.active() === 'supabase') { const { data, error } = await getClient().from('invoices').insert(pick(i, trackTables.invoices)).select('*, patient:patients(*)').single(); return { data, error }; }
      const db = loadDb(); const row = { id: uid(), ...i }; db.invoices.push(row); saveDb(db); return { data: row, error: null };
    },
    async updateInvoice(id, i) {
      if (this.active() === 'supabase') { const { data, error } = await getClient().from('invoices').update(pick(i, trackTables.invoices)).eq('id', id).select('*, patient:patients(*)').single(); return { data, error }; }
      const db = loadDb(); const idx = db.invoices.findIndex(x => x.id === id); if (idx === -1) return { error: new Error('Not found') };
      db.invoices[idx] = { ...db.invoices[idx], ...i }; saveDb(db); return { data: db.invoices[idx], error: null };
    },
    async deleteInvoice(id) {
      if (this.active() === 'supabase') { const { error } = await getClient().from('invoices').delete().eq('id', id); return { error }; }
      const db = loadDb(); db.invoices = db.invoices.filter(x => x.id !== id); saveDb(db); return { error: null };
    },

    /* ── misc ── */
    async resetDemo() {
      saveDb(seed());
      return { error: null };
    },

    /* ── Indian sample data (works in both modes) ── */
    sampleData: SAMPLE,

    async seedSampleUpsert(listName, rows) {
      if (this.active() === 'supabase') {
        const c = getClient();
        const { error } = await c.from(listName).upsert(rows, { onConflict: 'id' });
        if (error) return { error };
        return { error: null };
      }
      const db = loadDb();
      rows.forEach(r => {
        const idx = db[listName].findIndex(x => x.id === r.id);
        if (idx === -1) db[listName].push({ ...r, created_at: r.created_at || new Date().toISOString().replace('T', ' ') });
      });
      saveDb(db);
      return { error: null };
    },

    async seedSampleData() {
      const s = this.sampleData;
      const r = await Promise.all([
        this.seedSampleUpsert('patients', s.patients),
        this.seedSampleUpsert('doctors', s.doctors),
        this.seedSampleUpsert('appointments', s.appointments),
        this.seedSampleUpsert('invoices', s.invoices)
      ]);
      return r.find(x => x.error) || { error: null };
    },

    async wipeTables() {
      if (this.active() !== 'supabase') { return this.resetDemo(); }
      const c = getClient();
      for (const t of ['appointments', 'invoices', 'patients', 'doctors']) {
        const { error } = await c.from(t).delete().gte('id', '0');
        if (error) return { error };
      }
      return { error: null };
    },

    async upcomingAppointments(limit = 4) {
      const { data = [] } = await this.getAppointments();
      const today = new Date().toISOString().slice(0, 10);
      const active = data.filter(a => a.status === 'scheduled' && a.date >= today)
        .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
      return active.slice(0, limit);
    },

    async activitySeries(days = 7) {
      const { data = [] } = await this.getAppointments();
      const labels = []; const series = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        const key = d.toISOString().slice(0, 10);
        labels.push(d.toLocaleDateString(undefined, { weekday: 'short' }));
        series.push(data.filter(a => a.date === key).length);
      }
      return { labels, series };
    },

    async deptStats() {
      const { data = [] } = await this.getDoctors();
      const counts = {};
      data.forEach(d => { counts[d.specialty] = (counts[d.specialty] || 0) + 1; });
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
      const max = Math.max(...sorted.map(([, n]) => n), 1);
      return { rows: sorted, max };
    },

    async monthlyRevenue() {
      const { data = [] } = await this.getInvoices();
      const paidTotal = data.reduce((s, i) => s + (i.status === 'paid' ? Number(i.amount) : 0), 0);
      const pending = data.reduce((s, i) => s + (i.status !== 'paid' ? Number(i.amount) : 0), 0);
      const today = new Date().toISOString().slice(0, 10);
      const count = data.filter(i => i.created_at && i.created_at.slice(0, 10) === today).length;
      return { paidTotal, pending, count };
    }
  };

  return api;
})();