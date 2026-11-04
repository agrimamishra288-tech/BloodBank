-- ============================================================
-- Blood Bank & Donor Matching System — Seed Data
-- Run AFTER schema.sql
-- ============================================================

-- Clean slate (reverse FK order)
TRUNCATE TABLE
    audit_log, request_donor_matches, blood_requests, patients,
    inventory, donations, donors, users, blood_banks,
    blood_compatibility, blood_groups
RESTART IDENTITY CASCADE;

-- ============================================================
-- blood_groups
-- ============================================================
INSERT INTO blood_groups VALUES
    ('A+'), ('A-'), ('B+'), ('B-'), ('AB+'), ('AB-'), ('O+'), ('O-');

-- ============================================================
-- blood_compatibility (28 rows — ABO + Rh rules)
-- ============================================================
INSERT INTO blood_compatibility (donor_group, recipient_group) VALUES
    ('O-','O-'),('O-','O+'),('O-','A-'),('O-','A+'),
    ('O-','B-'),('O-','B+'),('O-','AB-'),('O-','AB+'),
    ('O+','O+'),('O+','A+'),('O+','B+'),('O+','AB+'),
    ('A-','A-'),('A-','A+'),('A-','AB-'),('A-','AB+'),
    ('A+','A+'),('A+','AB+'),
    ('B-','B-'),('B-','B+'),('B-','AB-'),('B-','AB+'),
    ('B+','B+'),('B+','AB+'),
    ('AB-','AB-'),('AB-','AB+'),
    ('AB+','AB+');

-- ============================================================
-- blood_banks (5 banks across 4 cities)
-- ============================================================
INSERT INTO blood_banks (name, address, city, state, pincode, contact_phone, contact_email) VALUES
    ('City Central Blood Bank',   'Ansari Nagar, New Delhi',         'Delhi',     'Delhi',         '110029', '+911123456001', 'citycentral@bloodbank.in'),
    ('AIIMS Regional Blood Bank', 'AIIMS Campus, Ansari Nagar',      'Delhi',     'Delhi',         '110016', '+911123456002', 'aiims.bb@aiims.edu'),
    ('Lifeline Blood Centre',     'Andheri East, Mumbai',            'Mumbai',    'Maharashtra',   '400069', '+912223456003', 'lifeline@bloodbank.in'),
    ('Apollo Blood Bank',         'Bannerghatta Road, Bengaluru',    'Bangalore', 'Karnataka',     '560076', '+918023456004', 'apollo.bb@apollo.in'),
    ('Care Blood Services',       'Banjara Hills, Hyderabad',        'Hyderabad', 'Telangana',     '500034', '+914023456005', 'care.bb@care.in');

-- ============================================================
-- users (1 admin + 5 hospital staff + 19 donors = 25 total)
-- password_hash = bcrypt of 'Test@1234' (10 rounds)
-- ============================================================
INSERT INTO users (name, email, password_hash, role, phone) VALUES
    -- Admin
    ('Admin User',          'admin@bloodbank.in',        '$2b$10$X9.Vz8Ws1Rg2RpMk4Qz8/.KpjLVzFv3bGJv4mIj9pE7SJM5wVd5m', 'admin',    '+919000000001'),
    -- Hospital staff
    ('Dr. Sunita Kapoor',   'sunita.kapoor@aiims.in',    '$2b$10$X9.Vz8Ws1Rg2RpMk4Qz8/.KpjLVzFv3bGJv4mIj9pE7SJM5wVd5m', 'hospital', '+919000000002'),
    ('Dr. Farhan Qureshi',  'farhan.q@apollohospital.in','$2b$10$X9.Vz8Ws1Rg2RpMk4Qz8/.KpjLVzFv3bGJv4mIj9pE7SJM5wVd5m', 'hospital', '+919000000003'),
    ('Dr. Meera Pillai',    'meera.p@kemphosp.in',       '$2b$10$X9.Vz8Ws1Rg2RpMk4Qz8/.KpjLVzFv3bGJv4mIj9pE7SJM5wVd5m', 'hospital', '+919000000004'),
    ('Dr. Ravi Teja',       'ravi.teja@carehyd.in',      '$2b$10$X9.Vz8Ws1Rg2RpMk4Qz8/.KpjLVzFv3bGJv4mIj9pE7SJM5wVd5m', 'hospital', '+919000000005'),
    ('Dr. Prerna Sharma',   'prerna.s@manipal.in',       '$2b$10$X9.Vz8Ws1Rg2RpMk4Qz8/.KpjLVzFv3bGJv4mIj9pE7SJM5wVd5m', 'hospital', '+919000000006'),
    -- Donors (user_id 7..25)
    ('Rohan Mehta',         'rohan.mehta@gmail.com',     '$2b$10$X9.Vz8Ws1Rg2RpMk4Qz8/.KpjLVzFv3bGJv4mIj9pE7SJM5wVd5m', 'donor',    '+919810000001'),
    ('Sneha Rao',           'sneha.rao@gmail.com',        '$2b$10$X9.Vz8Ws1Rg2RpMk4Qz8/.KpjLVzFv3bGJv4mIj9pE7SJM5wVd5m', 'donor',    '+919810000002'),
    ('Aman Verma',          'aman.verma@gmail.com',       '$2b$10$X9.Vz8Ws1Rg2RpMk4Qz8/.KpjLVzFv3bGJv4mIj9pE7SJM5wVd5m', 'donor',    '+919810000003'),
    ('Priya Nair',          'priya.nair@gmail.com',       '$2b$10$X9.Vz8Ws1Rg2RpMk4Qz8/.KpjLVzFv3bGJv4mIj9pE7SJM5wVd5m', 'donor',    '+919810000004'),
    ('Kabir Singh',         'kabir.singh@gmail.com',      '$2b$10$X9.Vz8Ws1Rg2RpMk4Qz8/.KpjLVzFv3bGJv4mIj9pE7SJM5wVd5m', 'donor',    '+919810000005'),
    ('Neha Gupta',          'neha.gupta@gmail.com',       '$2b$10$X9.Vz8Ws1Rg2RpMk4Qz8/.KpjLVzFv3bGJv4mIj9pE7SJM5wVd5m', 'donor',    '+919810000006'),
    ('Vikram Joshi',        'vikram.joshi@gmail.com',     '$2b$10$X9.Vz8Ws1Rg2RpMk4Qz8/.KpjLVzFv3bGJv4mIj9pE7SJM5wVd5m', 'donor',    '+919820000007'),
    ('Isha Patel',          'isha.patel@gmail.com',        '$2b$10$X9.Vz8Ws1Rg2RpMk4Qz8/.KpjLVzFv3bGJv4mIj9pE7SJM5wVd5m', 'donor',    '+919820000008'),
    ('Arjun Desai',         'arjun.desai@gmail.com',      '$2b$10$X9.Vz8Ws1Rg2RpMk4Qz8/.KpjLVzFv3bGJv4mIj9pE7SJM5wVd5m', 'donor',    '+919820000009'),
    ('Meera Iyer',          'meera.iyer@gmail.com',        '$2b$10$X9.Vz8Ws1Rg2RpMk4Qz8/.KpjLVzFv3bGJv4mIj9pE7SJM5wVd5m', 'donor',    '+919820000010'),
    ('Suresh Nambiar',      'suresh.nambiar@gmail.com',   '$2b$10$X9.Vz8Ws1Rg2RpMk4Qz8/.KpjLVzFv3bGJv4mIj9pE7SJM5wVd5m', 'donor',    '+919830000011'),
    ('Lakshmi Reddy',       'lakshmi.reddy@gmail.com',    '$2b$10$X9.Vz8Ws1Rg2RpMk4Qz8/.KpjLVzFv3bGJv4mIj9pE7SJM5wVd5m', 'donor',    '+919830000012'),
    ('Tarun Bhatia',        'tarun.bhatia@gmail.com',     '$2b$10$X9.Vz8Ws1Rg2RpMk4Qz8/.KpjLVzFv3bGJv4mIj9pE7SJM5wVd5m', 'donor',    '+919840000013'),
    ('Ananya Krishnan',     'ananya.k@gmail.com',          '$2b$10$X9.Vz8Ws1Rg2RpMk4Qz8/.KpjLVzFv3bGJv4mIj9pE7SJM5wVd5m', 'donor',    '+919840000014'),
    ('Deepak Chauhan',      'deepak.chauhan@gmail.com',   '$2b$10$X9.Vz8Ws1Rg2RpMk4Qz8/.KpjLVzFv3bGJv4mIj9pE7SJM5wVd5m', 'donor',    '+919850000015'),
    ('Kavya Menon',         'kavya.menon@gmail.com',       '$2b$10$X9.Vz8Ws1Rg2RpMk4Qz8/.KpjLVzFv3bGJv4mIj9pE7SJM5wVd5m', 'donor',    '+919850000016'),
    ('Rahul Tiwari',        'rahul.tiwari@gmail.com',      '$2b$10$X9.Vz8Ws1Rg2RpMk4Qz8/.KpjLVzFv3bGJv4mIj9pE7SJM5wVd5m', 'donor',    '+919860000017'),
    ('Simran Kaur',         'simran.kaur@gmail.com',       '$2b$10$X9.Vz8Ws1Rg2RpMk4Qz8/.KpjLVzFv3bGJv4mIj9pE7SJM5wVd5m', 'donor',    '+919860000018'),
    ('Nikhil Sharma',       'nikhil.sharma@gmail.com',    '$2b$10$X9.Vz8Ws1Rg2RpMk4Qz8/.KpjLVzFv3bGJv4mIj9pE7SJM5wVd5m', 'donor',    '+919870000019');

-- ============================================================
-- donors (19 rows, user_id 7..25)
-- ============================================================
INSERT INTO donors (user_id, blood_group, age, gender, city, state, address, last_donation_date, total_donations) VALUES
    -- Delhi donors
    (7,  'O-',  28, 'M', 'Delhi',     'Delhi',       'Rohini Sector 14',        CURRENT_DATE - INTERVAL '150 days', 3),
    (8,  'O+',  24, 'F', 'Delhi',     'Delhi',       'Lajpat Nagar II',         CURRENT_DATE - INTERVAL '40 days',  1),  -- NOT eligible
    (9,  'A+',  31, 'M', 'Delhi',     'Delhi',       'Dwarka Sector 6',         CURRENT_DATE - INTERVAL '200 days', 5),
    (10, 'B+',  26, 'F', 'Delhi',     'Delhi',       'Saket Phase II',          NULL,                               0),
    (11, 'AB+', 35, 'M', 'Delhi',     'Delhi',       'Greater Kailash I',       CURRENT_DATE - INTERVAL '120 days', 2),
    (12, 'A-',  29, 'F', 'Delhi',     'Delhi',       'Vasant Kunj Sector C',    CURRENT_DATE - INTERVAL '95 days',  4),
    -- Mumbai donors
    (13, 'O+',  41, 'M', 'Mumbai',    'Maharashtra', 'Andheri West',            CURRENT_DATE - INTERVAL '300 days', 8),
    (14, 'B-',  23, 'F', 'Mumbai',    'Maharashtra', 'Bandra East',             CURRENT_DATE - INTERVAL '20 days',  1),  -- NOT eligible
    (15, 'A+',  33, 'M', 'Mumbai',    'Maharashtra', 'Powai, Hiranandani',      NULL,                               0),
    (16, 'O-',  27, 'F', 'Mumbai',    'Maharashtra', 'Dadar West',              CURRENT_DATE - INTERVAL '110 days', 2),
    -- Bangalore donors
    (17, 'B+',  38, 'M', 'Bangalore', 'Karnataka',   'Koramangala 4th Block',   CURRENT_DATE - INTERVAL '180 days', 6),
    (18, 'AB-', 25, 'F', 'Bangalore', 'Karnataka',   'Indiranagar 100 Ft Rd',   NULL,                               0),
    (19, 'A-',  30, 'M', 'Bangalore', 'Karnataka',   'Whitefield, Prestige',    CURRENT_DATE - INTERVAL '95 days',  3),
    (20, 'O+',  22, 'F', 'Bangalore', 'Karnataka',   'HSR Layout Sector 6',     CURRENT_DATE - INTERVAL '60 days',  1),  -- NOT eligible
    -- Hyderabad donors
    (21, 'B+',  45, 'M', 'Hyderabad', 'Telangana',   'Banjara Hills Rd No 12',  CURRENT_DATE - INTERVAL '200 days', 7),
    (22, 'AB+', 32, 'F', 'Hyderabad', 'Telangana',   'Madhapur HiTec City',     CURRENT_DATE - INTERVAL '100 days', 2),
    (23, 'O-',  29, 'M', 'Hyderabad', 'Telangana',   'Jubilee Hills Rd 36',     NULL,                               0),
    -- Chennai donors
    (24, 'A+',  36, 'F', 'Chennai',   'Tamil Nadu',  'T. Nagar, Panagal Park',  CURRENT_DATE - INTERVAL '140 days', 4),
    (25, 'B-',  28, 'M', 'Chennai',   'Tamil Nadu',  'Anna Nagar 2nd Avenue',   CURRENT_DATE - INTERVAL '91 days',  2);

-- ============================================================
-- donations (12 rows — for donors who have donated)
-- ============================================================
INSERT INTO donations (donor_id, bank_id, donation_date, volume_ml) VALUES
    (1, 1, CURRENT_DATE - INTERVAL '150 days', 450),
    (1, 1, CURRENT_DATE - INTERVAL '300 days', 450),
    (2, 2, CURRENT_DATE - INTERVAL '40 days',  450),
    (3, 1, CURRENT_DATE - INTERVAL '200 days', 450),
    (3, 2, CURRENT_DATE - INTERVAL '400 days', 450),
    (6, 1, CURRENT_DATE - INTERVAL '95 days',  450),
    (7, 3, CURRENT_DATE - INTERVAL '300 days', 475),
    (7, 3, CURRENT_DATE - INTERVAL '150 days', 450),
    (8, 3, CURRENT_DATE - INTERVAL '20 days',  450),
    (10, 3, CURRENT_DATE - INTERVAL '110 days', 450),
    (11, 4, CURRENT_DATE - INTERVAL '180 days', 450),
    (14, 5, CURRENT_DATE - INTERVAL '200 days', 460);

-- ============================================================
-- inventory (35 units across 5 banks, all blood groups covered)
-- ============================================================
INSERT INTO inventory (bank_id, blood_group, collection_date, expiry_date, status) VALUES
    -- Bank 1 (Delhi - City Central): 8 units
    (1, 'O+',  CURRENT_DATE - 10, CURRENT_DATE + 32, 'available'),
    (1, 'O+',  CURRENT_DATE - 12, CURRENT_DATE + 30, 'available'),
    (1, 'O+',  CURRENT_DATE - 5,  CURRENT_DATE + 37, 'available'),
    (1, 'A+',  CURRENT_DATE - 8,  CURRENT_DATE + 34, 'available'),
    (1, 'A+',  CURRENT_DATE - 35, CURRENT_DATE + 5,  'available'),   -- expiring soon!
    (1, 'B+',  CURRENT_DATE - 9,  CURRENT_DATE + 33, 'available'),
    (1, 'O-',  CURRENT_DATE - 3,  CURRENT_DATE + 39, 'available'),
    (1, 'AB+', CURRENT_DATE - 40, CURRENT_DATE + 2,  'available'),   -- expiring very soon!
    -- Bank 2 (Delhi - AIIMS): 7 units
    (2, 'A-',  CURRENT_DATE - 7,  CURRENT_DATE + 35, 'available'),
    (2, 'B-',  CURRENT_DATE - 4,  CURRENT_DATE + 38, 'available'),
    (2, 'O-',  CURRENT_DATE - 2,  CURRENT_DATE + 40, 'available'),
    (2, 'O+',  CURRENT_DATE - 6,  CURRENT_DATE + 36, 'available'),
    (2, 'A+',  CURRENT_DATE - 15, CURRENT_DATE + 27, 'available'),
    (2, 'AB-', CURRENT_DATE - 20, CURRENT_DATE - 1,  'expired'),     -- expired
    (2, 'B+',  CURRENT_DATE - 1,  CURRENT_DATE + 41, 'available'),
    -- Bank 3 (Mumbai - Lifeline): 8 units
    (3, 'O+',  CURRENT_DATE - 6,  CURRENT_DATE + 36, 'available'),
    (3, 'B-',  CURRENT_DATE - 4,  CURRENT_DATE + 38, 'available'),
    (3, 'A+',  CURRENT_DATE - 2,  CURRENT_DATE + 40, 'available'),
    (3, 'O-',  CURRENT_DATE - 11, CURRENT_DATE + 31, 'available'),
    (3, 'AB+', CURRENT_DATE - 7,  CURRENT_DATE + 35, 'available'),
    (3, 'A-',  CURRENT_DATE - 8,  CURRENT_DATE + 3,  'available'),   -- expiring soon!
    (3, 'B+',  CURRENT_DATE - 18, CURRENT_DATE - 2,  'expired'),     -- expired
    (3, 'O+',  CURRENT_DATE - 3,  CURRENT_DATE + 39, 'issued'),      -- already issued
    -- Bank 4 (Bangalore - Apollo): 6 units
    (4, 'A+',  CURRENT_DATE - 5,  CURRENT_DATE + 37, 'available'),
    (4, 'B+',  CURRENT_DATE - 9,  CURRENT_DATE + 33, 'available'),
    (4, 'AB-', CURRENT_DATE - 3,  CURRENT_DATE + 39, 'available'),
    (4, 'O-',  CURRENT_DATE - 7,  CURRENT_DATE + 35, 'available'),
    (4, 'O+',  CURRENT_DATE - 14, CURRENT_DATE + 28, 'available'),
    (4, 'A-',  CURRENT_DATE - 6,  CURRENT_DATE + 36, 'available'),
    -- Bank 5 (Hyderabad - Care): 6 units
    (5, 'B+',  CURRENT_DATE - 4,  CURRENT_DATE + 38, 'available'),
    (5, 'AB+', CURRENT_DATE - 2,  CURRENT_DATE + 40, 'available'),
    (5, 'O+',  CURRENT_DATE - 10, CURRENT_DATE + 32, 'available'),
    (5, 'A+',  CURRENT_DATE - 8,  CURRENT_DATE + 5,  'available'),   -- expiring soon!
    (5, 'O-',  CURRENT_DATE - 1,  CURRENT_DATE + 41, 'available'),
    (5, 'B-',  CURRENT_DATE - 12, CURRENT_DATE + 30, 'available');

-- ============================================================
-- patients (10 rows across cities)
-- ============================================================
INSERT INTO patients (name, age, gender, blood_group, hospital_name, hospital_city, hospital_state, contact_phone) VALUES
    ('Ramesh Kumar',    45, 'M', 'A+',  'AIIMS Delhi',              'Delhi',     'Delhi',       '+919911000001'),
    ('Sunita Sharma',   38, 'F', 'O-',  'Apollo Hospital Delhi',     'Delhi',     'Delhi',       '+919911000002'),
    ('Farhan Khan',     52, 'M', 'B-',  'KEM Hospital Mumbai',       'Mumbai',    'Maharashtra', '+919911000003'),
    ('Lalitha Devi',    60, 'F', 'AB+', 'Manipal Hospital Bangalore','Bangalore', 'Karnataka',   '+919911000004'),
    ('Sunil Mehrotra',  35, 'M', 'O+',  'Yashoda Hospital Hyderabad','Hyderabad', 'Telangana',   '+919911000005'),
    ('Anita Bose',      28, 'F', 'A-',  'Fortis Hospital Delhi',     'Delhi',     'Delhi',       '+919911000006'),
    ('Prakash Naidu',   67, 'M', 'B+',  'Global Hospital Chennai',   'Chennai',   'Tamil Nadu',  '+919911000007'),
    ('Geeta Pillai',    40, 'F', 'AB-', 'Aster CMI Bangalore',       'Bangalore', 'Karnataka',   '+919911000008'),
    ('Arun Chopra',     55, 'M', 'O-',  'Max Hospital Delhi',        'Delhi',     'Delhi',       '+919911000009'),
    ('Divya Krishnan',  22, 'F', 'A+',  'Kauvery Hospital Chennai',  'Chennai',   'Tamil Nadu',  '+919911000010');

-- ============================================================
-- blood_requests (10 rows — various statuses)
-- requested_by: admin=1, hospital staff=2..6
-- ============================================================
INSERT INTO blood_requests (patient_id, requested_by, blood_group, units_needed, units_fulfilled, city, urgency, status, notes) VALUES
    (1, 2, 'A+',  2, 0, 'Delhi',     'urgent',   'pending',              'Post-surgery requirement'),
    (2, 2, 'O-',  1, 0, 'Delhi',     'critical', 'pending',              'Emergency — accident victim'),
    (3, 4, 'B-',  1, 0, 'Mumbai',    'normal',   'pending',              'Scheduled surgery next week'),
    (4, 3, 'AB+', 3, 0, 'Bangalore', 'urgent',   'pending',              'Cancer treatment ongoing'),
    (5, 5, 'O+',  2, 0, 'Hyderabad', 'normal',   'pending',              'Thalassemia patient'),
    (6, 2, 'A-',  1, 1, 'Delhi',     'urgent',   'partially_fulfilled',  'One unit still needed'),
    (7, 6, 'B+',  2, 2, 'Chennai',   'normal',   'fulfilled',            'Completed successfully'),
    (8, 3, 'AB-', 1, 1, 'Bangalore', 'urgent',   'fulfilled',            'Rare group — fulfilled from Bangalore bank'),
    (9, 2, 'O-',  2, 0, 'Delhi',     'normal',   'cancelled',            'Patient transferred to another hospital'),
    (10,6, 'A+',  1, 0, 'Chennai',   'urgent',   'matched',              'Donors notified');

-- ============================================================
-- request_donor_matches (for matched/fulfilled/partial requests)
-- ============================================================
INSERT INTO request_donor_matches (request_id, donor_id, response, responded_at) VALUES
    -- Request 6 (partially_fulfilled, Delhi A-)
    (6, 6, 'accepted',  NOW() - INTERVAL '2 days'),   -- Neha Gupta (A-)
    (6, 1, 'declined',  NOW() - INTERVAL '2 days'),   -- Rohan Mehta (O-)
    -- Request 7 (fulfilled, Chennai B+)
    (7, 19, 'accepted', NOW() - INTERVAL '5 days'),   -- Chennai B-? Actually B+ donor
    -- Request 8 (fulfilled, Bangalore AB-)
    (8, 12, 'accepted', NOW() - INTERVAL '3 days'),   -- Ananya (AB-)
    -- Request 10 (matched, Chennai A+)
    (10, 18, 'pending', NULL),                         -- Divya donor notified
    -- Request 1 (pending, notified donors)
    (1, 3, 'pending',   NULL),                         -- Aman Verma (A+) notified
    (1, 9, 'pending',   NULL),                         -- Arjun Desai (A+) notified
    -- Request 2 (critical O-, notified)
    (2, 1, 'pending',   NULL);                         -- Rohan Mehta (O-) notified
