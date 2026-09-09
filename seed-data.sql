-- ═══════════════════════════════════════════════════════════════════════
--  MEDFLOW — Indian Demo Data (patients, doctors, appointments, invoices)
--  Run in: Supabase Dashboard → SQL Editor → New Query → Run
--  Safe to run again — it upserts by fixed IDs, so it never duplicates.
-- ═══════════════════════════════════════════════════════════════════════

-- ── Patients ──────────────────────────────────────────────────────────
insert into patients (id, first_name, last_name, dob, gender, phone, email, address, blood_group, allergies, notes) values
  ('00000000-0000-0000-0000-000000000001', 'Rajesh',   'Kumar',   '1978-04-12', 'Male',   '+91 98200 11223', 'rajesh.kumar@example.in', '14 Marine Drive, Mumbai, Maharashtra', 'A+',  'Penicillin',        'Hypertension patient. BP monitoring monthly.'),
  ('00000000-0000-0000-0000-000000000002', 'Priya',    'Sharma',  '1992-09-23', 'Female', '+91 98110 33445', 'priya.sharma@example.in', '22 Lajpat Nagar, New Delhi',          'B+',  '',                  'Asthma. Carries inhaler.'),
  ('00000000-0000-0000-0000-000000000003', 'Amit',     'Patel',   '1985-01-30', 'Male',   '+91 99090 55667', 'amit.patel@example.in',   '8 CG Road, Ahmedabad, Gujarat',       'O+',  'Sulfa drugs',       'Type 2 diabetes. HbA1c trending down.'),
  ('00000000-0000-0000-0000-000000000004', 'Sunita',   'Verma',   '1988-07-08', 'Female', '+91 98300 77889', 'sunita.verma@example.in', '55 Indiranagar 100ft Rd, Bengaluru',  'B-',  '',                  'Thyroid condition. Regular follow-up.'),
  ('00000000-0000-0000-0000-000000000005', 'Vikram',   'Singh',   '1971-12-19', 'Male',   '+91 94140 99001', 'vikram.singh@example.in', '3 MI Road, Jaipur, Rajasthan',        'O-',  'Aspirin',           'Post-CABG. Cardiology review quarterly.'),
  ('00000000-0000-0000-0000-000000000006', 'Ananya',   'Iyer',    '2001-05-17', 'Female', '+91 98410 22334', 'ananya.iyer@example.in',  '77 T Nagar, Chennai, Tamil Nadu',     'AB+', '',                  'None'),
  ('00000000-0000-0000-0000-000000000007', 'Mohammed', 'Rizwan',  '1996-03-02', 'Male',   '+91 99890 44556', 'rizwan.m@example.in',     '12 Banjara Hills, Hyderabad, Telangana', 'A-', 'Seafood',          'Migraine management. Neurologist consult.'),
  ('00000000-0000-0000-0000-000000000008', 'Kavita',   'Joshi',   '1969-10-25', 'Female', '+91 98220 66778', 'kavita.joshi@example.in', '40 Koregaon Park, Pune, Maharashtra', 'AB-', 'Penicillin',       'Osteoarthritis. Orthopedic follow-up.'),
  ('00000000-0000-0000-0000-000000000009', 'Arjun',    'Nair',    '2013-02-14', 'Male',   '+91 98470 88990', 'arjun.nair@example.in',   '9 MG Road, Kochi, Kerala',            'O+',  'Peanuts, dust',     'Pediatric asthma. Spirometry 6-monthly.'),
  ('00000000-0000-0000-0000-000000000010', 'Deepika',  'Reddy',   '1983-06-09', 'Female', '+91 98660 11220', 'deepika.reddy@example.in', '21 Jubilee Hills, Hyderabad, Telangana', 'A+', '',              'Routine annual health check.'),
  ('00000000-0000-0000-0000-000000000011', 'Sanjay',   'Mehta',   '1959-08-03', 'Male',   '+91 98300 33445', 'sanjay.mehta@example.in', '5 Park Street, Kolkata, West Bengal', 'B+', 'NSAIDs',           'Glaucoma management. Follow-up every 3 months.'),
  ('00000000-0000-0000-0000-000000000012', 'Neha',     'Kapoor',  '1998-11-28', 'Female', '+91 98140 55667', 'neha.kapoor@example.in',  '16 Sector 17, Chandigarh',            'O+',  '',                  'Dermatology consultation.')
on conflict (id) do nothing;

-- ── Doctors ───────────────────────────────────────────────────────────
insert into doctors (id, first_name, last_name, specialty, fee, phone, email, license, available) values
  ('10000000-0000-0000-0000-000000000001', 'Anil',    'Kulkarni',   'Cardiology',    2500, '+91 98450 22331', 'anil.kulkarni@medflow.io', 'MCI-CAR-88412',  true),
  ('10000000-0000-0000-0000-000000000002', 'Meera',   'Krishnan',   'Neurology',     2800, '+91 98860 44552', 'meera.krishnan@medflow.io', 'MCI-NEU-55109',  true),
  ('10000000-0000-0000-0000-000000000003', 'Rohit',   'Deshmukh',   'Pediatrics',    1800, '+91 99670 55663', 'rohit.deshmukh@medflow.io', 'MCI-PED-22034',  true),
  ('10000000-0000-0000-0000-000000000004', 'Asha',    'Reddy',      'Orthopedics',   2200, '+91 98110 88994', 'asha.reddy@medflow.io',    'MCI-ORT-99071',  false),
  ('10000000-0000-0000-0000-000000000005', 'Vikrant', 'Chopra',     'Dermatology',   1600, '+91 98675 11225', 'vikrant.chopra@medflow.io', 'MCI-DER-33258', true),
  ('10000000-0000-0000-0000-000000000006', 'Farhan',  'Qureshi',    'General Medicine', 1200, '+91 99300 77886', 'farhan.qureshi@medflow.io', 'MCI-GEN-77049', true)
on conflict (id) do nothing;

-- ── Appointments ──────────────────────────────────────────────────────
insert into appointments (id, patient_id, doctor_id, date, time, status, reason) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', current_date, '09:30', 'scheduled', 'Monthly BP follow-up'),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', current_date, '10:00', 'scheduled', 'Asthma review'),
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000002', current_date, '11:15', 'scheduled', 'Migraine consultation'),
  ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', current_date, '14:00', 'scheduled', 'Post-CABG review'),
  ('20000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000005', current_date - 1, '09:00', 'completed', 'Routine skin check'),
  ('20000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000003', current_date - 2, '15:30', 'completed', 'Spirometry test'),
  ('20000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000004', current_date - 4, '13:00', 'cancelled', 'Knee pain assessment'),
  ('20000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000002', current_date + 2, '10:45', 'scheduled', 'MRI results review'),
  ('20000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000005', current_date + 3, '16:00', 'scheduled', 'Eczema treatment plan'),
  ('20000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000006', current_date + 1, '12:20', 'scheduled', 'Annual health check')
on conflict (id) do nothing;

-- ── Invoices ──────────────────────────────────────────────────────────
insert into invoices (id, patient_id, description, amount, status, created_at) values
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Cardiology consultation + ECG',     7500, 'paid',   now() - interval '10 days'),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Pulmonology follow-up',             1800, 'paid',   now() - interval '9 days'),
  ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000009', 'Spirometry + lab panel',            4200, 'paid',   now() - interval '8 days'),
  ('30000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000006', 'Dermatology consultation',          1600, 'unpaid', now() - interval '4 days'),
  ('30000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000003', 'Diabetes panel + cardiology',       6200, 'unpaid', now() - interval '3 days'),
  ('30000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000007', 'Neurology consultation + MRI',     11400, 'overdue', now() - interval '2 days'),
  ('30000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000008', 'Orthopedic consultation',           2200, 'paid',   now() - interval '6 days'),
  ('30000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000010', 'General physician visit + labs',    2600, 'unpaid', now() - interval '1 day')
on conflict (id) do nothing;