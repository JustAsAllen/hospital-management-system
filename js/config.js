/* MedFlow — configuration
   Your Supabase project credentials are pre-wired below.
   You can change them anytime from Settings → Supabase Connection in the app. */
window.MEDFLOW_CONFIG = {
  supabaseUrl: localStorage.getItem('mf_supabase_url') || 'https://bexbhhzddavrailsvotv.supabase.co',
  supabaseKey: localStorage.getItem('mf_supabase_anon') || 'sb_publishable_z6Qynpdpd10bkcyiUz0KHQ_q_UlN4iv',
  hospitalName: localStorage.getItem('mf_hospital_name') || 'City General Hospital',
  demoMode: localStorage.getItem('mf_demo_mode') !== '0'
};