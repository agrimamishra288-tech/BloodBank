-- ============================================================
-- Blood Bank & Donor Matching System — Seed Data v2.0
-- Real Indian Hospital Blood Banks (source: eRaktkosh / NHM public registry)
-- ============================================================

INSERT INTO blood_groups VALUES
    ('A+'), ('A-'), ('B+'), ('B-'), ('AB+'), ('AB-'), ('O+'), ('O-')
ON CONFLICT DO NOTHING;

INSERT INTO blood_compatibility (donor_group, recipient_group) VALUES
    ('O-','O-'),('O-','O+'),('O-','A-'),('O-','A+'),
    ('O-','B-'),('O-','B+'),('O-','AB-'),('O-','AB+'),
    ('O+','O+'),('O+','A+'),('O+','B+'),('O+','AB+'),
    ('A-','A-'),('A-','A+'),('A-','AB-'),('A-','AB+'),
    ('A+','A+'),('A+','AB+'),
    ('B-','B-'),('B-','B+'),('B-','AB-'),('B-','AB+'),
    ('B+','B+'),('B+','AB+'),
    ('AB-','AB-'),('AB-','AB+'),
    ('AB+','AB+')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 25 REAL Indian Blood Banks (eRaktkosh public registry)
-- ============================================================
INSERT INTO blood_banks (name, address, city, state, pincode, contact_phone, contact_email, latitude, longitude) VALUES
-- Delhi (bank_id 1–6)
('AIIMS Blood Bank',                   'Ansari Nagar, AIIMS Campus',                     'Delhi',      'Delhi',         '110029', '011-26593308', 'bbaiims@aiims.edu',                   28.5665, 77.2097),
('Safdarjung Hospital Blood Bank',     'Ring Road, Safdarjung Hospital',                 'Delhi',      'Delhi',         '110029', '011-26707446', 'bbsafdarjung@nic.in',                 28.5684, 77.2066),
('Ram Manohar Lohia Blood Bank',       'Baba Kharak Singh Marg, RML Hospital',           'Delhi',      'Delhi',         '110001', '011-23404328', 'bbrml@gov.in',                        28.6367, 77.2010),
('Sir Ganga Ram Blood Bank',           'Rajinder Nagar, Sir Ganga Ram Hospital',         'Delhi',      'Delhi',         '110060', '011-25750000', 'bb@sgrh.com',                         28.6448, 77.1900),
('Max Super Speciality Blood Bank',    'Press Enclave Road, Saket',                      'Delhi',      'Delhi',         '110017', '011-26515050', 'bbmax.saket@maxhealthcare.com',       28.5245, 77.2066),
('Medanta Blood Bank',                 'CH Baktawar Singh Road, Sector 38',              'Gurugram',   'Haryana',       '122001', '0124-4141414', 'bloodbank@medanta.org',               28.4453, 77.0366),
-- Mumbai (bank_id 7–10)
('KEM Hospital Blood Bank',            'Acharya Donde Marg, Parel',                      'Mumbai',     'Maharashtra',   '400012', '022-24107000', 'bbkem@mcgm.gov.in',                   18.9754, 72.8415),
('Lilavati Hospital Blood Bank',       'A-791 Bandra Reclamation, Bandra West',          'Mumbai',     'Maharashtra',   '400050', '022-26751000', 'bb@lilavatihospital.com',             19.0538, 72.8292),
('Hinduja Hospital Blood Bank',        'Veer Savarkar Marg, Mahim',                      'Mumbai',     'Maharashtra',   '400016', '022-24452222', 'bb@hindujahospital.com',              19.0597, 72.8339),
('Breach Candy Hospital Blood Bank',   '60-A Bhulabhai Desai Road',                      'Mumbai',     'Maharashtra',   '400026', '022-23667888', 'bb@breachcandyhospital.org',          18.9718, 72.8089),
-- Bangalore (bank_id 11–14)
('NIMHANS Blood Bank',                 'Hosur Road, Lakkasandra',                        'Bangalore',  'Karnataka',     '560029', '080-46110007', 'bb@nimhans.ac.in',                    12.9398, 77.5956),
('Manipal Hospital Blood Bank',        '98 HAL Airport Road',                            'Bangalore',  'Karnataka',     '560017', '080-25024444', 'bb.bangalore@manipalhospitals.com',   12.9538, 77.6481),
('St Johns Medical College Blood Bank','Sarjapur Road, Koramangala',                     'Bangalore',  'Karnataka',     '560034', '080-22065000', 'bb@stjohns.in',                       12.9398, 77.6214),
('Aster CMI Blood Bank',               'NH-7, Sahakara Nagar',                           'Bangalore',  'Karnataka',     '560092', '080-43425000', 'bb.cmi@asterhospitals.in',            13.0683, 77.5945),
-- Chennai (bank_id 15–17)
('CMC Vellore Blood Bank',             'Ida Scudder Road, CMC Campus',                   'Vellore',    'Tamil Nadu',    '632004', '0416-2281000', 'bb@cmcvellore.ac.in',                 12.9237, 79.1326),
('Global Hospitals Blood Bank',        'No 439 Cheran Nagar, Perumbakkam',               'Chennai',    'Tamil Nadu',    '600100', '044-44777000', 'bb@globalhospitalsindia.com',         13.0150, 80.2370),
('Kauvery Hospital Blood Bank',        '199 Luz Church Road, Mylapore',                  'Chennai',    'Tamil Nadu',    '600004', '044-40006000', 'bb@kauveryhospital.com',              13.0827, 80.2707),
-- Hyderabad (bank_id 18–19)
('Yashoda Hospital Blood Bank',        'Alexander Road, Secunderabad',                   'Hyderabad',  'Telangana',     '500003', '040-27808888', 'bb@yashodahospitals.com',             17.4329, 78.4505),
('Care Hospital Blood Bank',           'Road No 1, Banjara Hills',                       'Hyderabad',  'Telangana',     '500034', '040-30418000', 'bb@carehospitals.com',                17.4156, 78.4347),
-- Kolkata (bank_id 20–21)
('SSKM Blood Bank',                    '244 AJC Bose Road, SSKM Hospital',               'Kolkata',    'West Bengal',   '700020', '033-22044444', 'bb@sskm.gov.in',                      22.5355, 88.3399),
('RG Kar Medical College Blood Bank',  '1 Khudiram Bose Sarani, Shyambazar',             'Kolkata',    'West Bengal',   '700004', '033-25551126', 'bb@rgkar.gov.in',                     22.5938, 88.3733),
-- Lucknow (bank_id 22–23)
('SGPGI Blood Bank',                   'Raebareli Road, SGPGI Campus',                   'Lucknow',    'Uttar Pradesh', '226014', '0522-2495000', 'bb@sgpgi.ac.in',                      26.8560, 80.9823),
('KGMU Blood Bank',                    'Shah Mina Road, King Georges Medical University', 'Lucknow',    'Uttar Pradesh', '226003', '0522-2258880', 'bb@kgmu.ac.in',                       26.9124, 80.9499),
-- Others (bank_id 24–25)
('PGI Blood Bank',                     'Sector 12, PGI Campus',                          'Chandigarh', 'Chandigarh',    '160012', '0172-2756565', 'bbpgi@pgimer.edu.in',                 30.7633, 76.7797),
('JIPMER Blood Bank',                  'Dhanvantari Nagar, JIPMER Campus',               'Puducherry', 'Puducherry',    '605006', '0413-2272380', 'bb@jipmer.edu.in',                    11.9416, 79.8083);

-- ============================================================
-- users (1 admin + 5 hospital + 19 donors = 25 total)
-- passwords set to bcrypt('Test@1234') by init.js
-- ============================================================
INSERT INTO users (name, email, password_hash, role, phone) VALUES
    ('Admin User',         'admin@bloodbank.in',         '$2b$10$placeholder', 'admin',    '+919000000001'),
    ('Dr. Sunita Kapoor',  'sunita.kapoor@aiims.in',     '$2b$10$placeholder', 'hospital', '+919000000002'),
    ('Dr. Farhan Qureshi', 'farhan.q@apollohospital.in', '$2b$10$placeholder', 'hospital', '+919000000003'),
    ('Dr. Meera Pillai',   'meera.p@kemphosp.in',        '$2b$10$placeholder', 'hospital', '+919000000004'),
    ('Dr. Ravi Teja',      'ravi.teja@carehyd.in',       '$2b$10$placeholder', 'hospital', '+919000000005'),
    ('Dr. Prerna Sharma',  'prerna.s@manipal.in',        '$2b$10$placeholder', 'hospital', '+919000000006'),
    ('Rohan Mehta',        'rohan.mehta@gmail.com',      '$2b$10$placeholder', 'donor',    '+919810000001'),
    ('Sneha Rao',          'sneha.rao@gmail.com',         '$2b$10$placeholder', 'donor',    '+919810000002'),
    ('Aman Verma',         'aman.verma@gmail.com',        '$2b$10$placeholder', 'donor',    '+919810000003'),
    ('Priya Nair',         'priya.nair@gmail.com',        '$2b$10$placeholder', 'donor',    '+919810000004'),
    ('Kabir Singh',        'kabir.singh@gmail.com',       '$2b$10$placeholder', 'donor',    '+919810000005'),
    ('Neha Gupta',         'neha.gupta@gmail.com',        '$2b$10$placeholder', 'donor',    '+919810000006'),
    ('Vikram Joshi',       'vikram.joshi@gmail.com',      '$2b$10$placeholder', 'donor',    '+919820000007'),
    ('Isha Patel',         'isha.patel@gmail.com',         '$2b$10$placeholder', 'donor',    '+919820000008'),
    ('Arjun Desai',        'arjun.desai@gmail.com',       '$2b$10$placeholder', 'donor',    '+919820000009'),
    ('Meera Iyer',         'meera.iyer@gmail.com',         '$2b$10$placeholder', 'donor',    '+919820000010'),
    ('Suresh Nambiar',     'suresh.nambiar@gmail.com',    '$2b$10$placeholder', 'donor',    '+919830000011'),
    ('Lakshmi Reddy',      'lakshmi.reddy@gmail.com',     '$2b$10$placeholder', 'donor',    '+919830000012'),
    ('Tarun Bhatia',       'tarun.bhatia@gmail.com',      '$2b$10$placeholder', 'donor',    '+919840000013'),
    ('Ananya Krishnan',    'ananya.k@gmail.com',           '$2b$10$placeholder', 'donor',    '+919840000014'),
    ('Deepak Chauhan',     'deepak.chauhan@gmail.com',    '$2b$10$placeholder', 'donor',    '+919850000015'),
    ('Kavya Menon',        'kavya.menon@gmail.com',        '$2b$10$placeholder', 'donor',    '+919850000016'),
    ('Rahul Tiwari',       'rahul.tiwari@gmail.com',       '$2b$10$placeholder', 'donor',    '+919860000017'),
    ('Simran Kaur',        'simran.kaur@gmail.com',        '$2b$10$placeholder', 'donor',    '+919860000018'),
    ('Nikhil Sharma',      'nikhil.sharma@gmail.com',     '$2b$10$placeholder', 'donor',    '+919870000019');

-- ============================================================
-- donors (19 rows linked to user_id 7..25)
-- ============================================================
INSERT INTO donors (user_id, blood_group, age, gender, city, state, address, last_donation_date, total_donations) VALUES
    (7,  'O-',  28, 'M', 'Delhi',      'Delhi',         'Rohini Sector 14',        CURRENT_DATE - INTERVAL '150 days', 3),
    (8,  'O+',  24, 'F', 'Delhi',      'Delhi',         'Lajpat Nagar II',         CURRENT_DATE - INTERVAL '40 days',  1),
    (9,  'A+',  31, 'M', 'Delhi',      'Delhi',         'Dwarka Sector 6',         CURRENT_DATE - INTERVAL '200 days', 5),
    (10, 'B+',  26, 'F', 'Delhi',      'Delhi',         'Saket Phase II',          NULL,                               0),
    (11, 'AB+', 35, 'M', 'Delhi',      'Delhi',         'Greater Kailash I',       CURRENT_DATE - INTERVAL '120 days', 2),
    (12, 'A-',  29, 'F', 'Delhi',      'Delhi',         'Vasant Kunj Sector C',    CURRENT_DATE - INTERVAL '95 days',  4),
    (13, 'O+',  41, 'M', 'Mumbai',     'Maharashtra',   'Andheri West',            CURRENT_DATE - INTERVAL '300 days', 8),
    (14, 'B-',  23, 'F', 'Mumbai',     'Maharashtra',   'Bandra East',             CURRENT_DATE - INTERVAL '20 days',  1),
    (15, 'A+',  33, 'M', 'Mumbai',     'Maharashtra',   'Powai, Hiranandani',      NULL,                               0),
    (16, 'O-',  27, 'F', 'Mumbai',     'Maharashtra',   'Dadar West',              CURRENT_DATE - INTERVAL '110 days', 2),
    (17, 'B+',  38, 'M', 'Bangalore',  'Karnataka',     'Koramangala 4th Block',   CURRENT_DATE - INTERVAL '180 days', 6),
    (18, 'AB-', 25, 'F', 'Bangalore',  'Karnataka',     'Indiranagar 100 Ft Rd',   NULL,                               0),
    (19, 'A-',  30, 'M', 'Bangalore',  'Karnataka',     'Whitefield, Prestige',    CURRENT_DATE - INTERVAL '95 days',  3),
    (20, 'O+',  22, 'F', 'Bangalore',  'Karnataka',     'HSR Layout Sector 6',     CURRENT_DATE - INTERVAL '60 days',  1),
    (21, 'B+',  45, 'M', 'Hyderabad',  'Telangana',     'Banjara Hills Rd No 12',  CURRENT_DATE - INTERVAL '200 days', 7),
    (22, 'AB+', 32, 'F', 'Hyderabad',  'Telangana',     'Madhapur HiTec City',     CURRENT_DATE - INTERVAL '100 days', 2),
    (23, 'O-',  29, 'M', 'Hyderabad',  'Telangana',     'Jubilee Hills Rd 36',     NULL,                               0),
    (24, 'A+',  36, 'F', 'Chennai',    'Tamil Nadu',    'T. Nagar, Panagal Park',  CURRENT_DATE - INTERVAL '140 days', 4),
    (25, 'B-',  28, 'M', 'Chennai',    'Tamil Nadu',    'Anna Nagar 2nd Avenue',   CURRENT_DATE - INTERVAL '91 days',  2);

-- ============================================================
-- donations (seed explicit events; trigger updates donor stats)
-- ============================================================
INSERT INTO donations (donor_id, bank_id, donation_date, volume_ml) VALUES
    (1,  1, CURRENT_DATE - INTERVAL '150 days', 450),
    (1,  1, CURRENT_DATE - INTERVAL '300 days', 450),
    (2,  2, CURRENT_DATE - INTERVAL '40 days',  450),
    (3,  1, CURRENT_DATE - INTERVAL '200 days', 450),
    (3,  2, CURRENT_DATE - INTERVAL '400 days', 450),
    (6,  1, CURRENT_DATE - INTERVAL '95 days',  450),
    (7,  7, CURRENT_DATE - INTERVAL '300 days', 475),
    (7,  7, CURRENT_DATE - INTERVAL '150 days', 450),
    (8,  7, CURRENT_DATE - INTERVAL '20 days',  450),
    (10, 7, CURRENT_DATE - INTERVAL '110 days', 450),
    (11, 11, CURRENT_DATE - INTERVAL '180 days', 450),
    (15, 18, CURRENT_DATE - INTERVAL '200 days', 460);

-- Fill remaining donation history from total_donations counts
WITH recorded AS (
    SELECT donor_id, COUNT(*)::INT AS event_count, MIN(donation_date) AS oldest_event
    FROM donations GROUP BY donor_id
), missing AS (
    SELECT d.donor_id, d.total_donations AS target_total, d.last_donation_date AS target_last,
           COALESCE(r.event_count, 0) AS event_count, r.oldest_event,
           GREATEST(d.total_donations - COALESCE(r.event_count, 0), 0) AS missing_count
    FROM donors d LEFT JOIN recorded r ON r.donor_id = d.donor_id
), history AS (
    SELECT m.donor_id,
           CASE
             WHEN m.oldest_event IS NULL THEN COALESCE(m.target_last, CURRENT_DATE) - (g.n - 1) * INTERVAL '100 days'
             ELSE m.oldest_event - g.n * INTERVAL '100 days'
           END::DATE AS donation_date
    FROM missing m CROSS JOIN LATERAL generate_series(1, m.missing_count) AS g(n)
)
INSERT INTO donations (donor_id, bank_id, donation_date, volume_ml)
SELECT h.donor_id, COALESCE(bank.bank_id, 1), h.donation_date, 450
FROM history h JOIN donors d ON d.donor_id = h.donor_id
LEFT JOIN LATERAL (
    SELECT b.bank_id FROM blood_banks b
    WHERE LOWER(b.city) = LOWER(d.city) ORDER BY b.bank_id LIMIT 1
) bank ON TRUE;

-- ============================================================
-- inventory — ~100 units across 25 real banks
-- ============================================================
INSERT INTO inventory (bank_id, blood_group, collection_date, expiry_date, status) VALUES
-- AIIMS Delhi (bank 1)
(1,'O+', CURRENT_DATE-10, CURRENT_DATE+32,'available'),
(1,'O+', CURRENT_DATE-12, CURRENT_DATE+30,'available'),
(1,'O-', CURRENT_DATE-3,  CURRENT_DATE+39,'available'),
(1,'A+', CURRENT_DATE-8,  CURRENT_DATE+34,'available'),
(1,'A+', CURRENT_DATE-35, CURRENT_DATE+5, 'available'),  -- expiring soon!
(1,'B+', CURRENT_DATE-9,  CURRENT_DATE+33,'available'),
(1,'AB+',CURRENT_DATE-40, CURRENT_DATE+2, 'available'),  -- critical expiry!
-- Safdarjung Delhi (bank 2)
(2,'A-', CURRENT_DATE-7,  CURRENT_DATE+35,'available'),
(2,'B-', CURRENT_DATE-4,  CURRENT_DATE+38,'available'),
(2,'O-', CURRENT_DATE-2,  CURRENT_DATE+40,'available'),
(2,'O+', CURRENT_DATE-6,  CURRENT_DATE+36,'available'),
(2,'A+', CURRENT_DATE-15, CURRENT_DATE+27,'available'),
(2,'B+', CURRENT_DATE-1,  CURRENT_DATE+41,'available'),
-- RML Delhi (bank 3)
(3,'O+', CURRENT_DATE-5,  CURRENT_DATE+37,'available'),
(3,'B+', CURRENT_DATE-9,  CURRENT_DATE+33,'available'),
(3,'A-', CURRENT_DATE-7,  CURRENT_DATE+35,'available'),
(3,'AB-',CURRENT_DATE-3,  CURRENT_DATE+39,'available'),
-- Sir Ganga Ram Delhi (bank 4)
(4,'O-', CURRENT_DATE-4,  CURRENT_DATE+38,'available'),
(4,'A+', CURRENT_DATE-6,  CURRENT_DATE+36,'available'),
(4,'B-', CURRENT_DATE-11, CURRENT_DATE+31,'available'),
-- Max Saket Delhi (bank 5)
(5,'O+', CURRENT_DATE-8,  CURRENT_DATE+34,'available'),
(5,'AB+',CURRENT_DATE-2,  CURRENT_DATE+40,'available'),
(5,'A+', CURRENT_DATE-30, CURRENT_DATE+6, 'available'),  -- expiring soon!
-- Medanta Gurugram (bank 6)
(6,'B+', CURRENT_DATE-5,  CURRENT_DATE+37,'available'),
(6,'O+', CURRENT_DATE-9,  CURRENT_DATE+33,'available'),
(6,'A-', CURRENT_DATE-3,  CURRENT_DATE+39,'available'),
-- KEM Mumbai (bank 7)
(7,'O+', CURRENT_DATE-6,  CURRENT_DATE+36,'available'),
(7,'B-', CURRENT_DATE-4,  CURRENT_DATE+38,'available'),
(7,'A+', CURRENT_DATE-2,  CURRENT_DATE+40,'available'),
(7,'O-', CURRENT_DATE-11, CURRENT_DATE+31,'available'),
(7,'AB+',CURRENT_DATE-7,  CURRENT_DATE+35,'available'),
(7,'A-', CURRENT_DATE-8,  CURRENT_DATE+3, 'available'),  -- expiring soon!
-- Lilavati Mumbai (bank 8)
(8,'O+', CURRENT_DATE-3,  CURRENT_DATE+39,'available'),
(8,'B+', CURRENT_DATE-18, CURRENT_DATE-2, 'expired'),
(8,'A+', CURRENT_DATE-5,  CURRENT_DATE+37,'available'),
(8,'AB-',CURRENT_DATE-9,  CURRENT_DATE+33,'available'),
-- Hinduja Mumbai (bank 9)
(9,'O-', CURRENT_DATE-7,  CURRENT_DATE+35,'available'),
(9,'B+', CURRENT_DATE-4,  CURRENT_DATE+38,'available'),
(9,'A-', CURRENT_DATE-2,  CURRENT_DATE+40,'available'),
-- Breach Candy Mumbai (bank 10)
(10,'AB+',CURRENT_DATE-6, CURRENT_DATE+36,'available'),
(10,'O+', CURRENT_DATE-8, CURRENT_DATE+34,'available'),
-- NIMHANS Bangalore (bank 11)
(11,'A+', CURRENT_DATE-5, CURRENT_DATE+37,'available'),
(11,'B+', CURRENT_DATE-9, CURRENT_DATE+33,'available'),
(11,'AB-',CURRENT_DATE-3, CURRENT_DATE+39,'available'),
(11,'O-', CURRENT_DATE-7, CURRENT_DATE+35,'available'),
(11,'O+', CURRENT_DATE-14,CURRENT_DATE+28,'available'),
(11,'A-', CURRENT_DATE-6, CURRENT_DATE+36,'available'),
-- Manipal Bangalore (bank 12)
(12,'B+', CURRENT_DATE-4, CURRENT_DATE+38,'available'),
(12,'AB+',CURRENT_DATE-2, CURRENT_DATE+40,'available'),
(12,'O+', CURRENT_DATE-10,CURRENT_DATE+32,'available'),
-- St Johns Bangalore (bank 13)
(13,'A+', CURRENT_DATE-8, CURRENT_DATE+5, 'available'),  -- expiring soon!
(13,'O-', CURRENT_DATE-1, CURRENT_DATE+41,'available'),
(13,'B-', CURRENT_DATE-12,CURRENT_DATE+30,'available'),
-- Aster CMI Bangalore (bank 14)
(14,'O+', CURRENT_DATE-6, CURRENT_DATE+36,'available'),
(14,'A-', CURRENT_DATE-4, CURRENT_DATE+38,'available'),
(14,'AB+',CURRENT_DATE-9, CURRENT_DATE+33,'available'),
-- CMC Vellore (bank 15)
(15,'O-', CURRENT_DATE-5, CURRENT_DATE+37,'available'),
(15,'B+', CURRENT_DATE-7, CURRENT_DATE+35,'available'),
(15,'A+', CURRENT_DATE-3, CURRENT_DATE+39,'available'),
-- Global Hospitals Chennai (bank 16)
(16,'AB-',CURRENT_DATE-8, CURRENT_DATE+34,'available'),
(16,'O+', CURRENT_DATE-11,CURRENT_DATE+31,'available'),
-- Kauvery Chennai (bank 17)
(17,'B+', CURRENT_DATE-4, CURRENT_DATE+38,'available'),
(17,'A-', CURRENT_DATE-2, CURRENT_DATE+40,'available'),
(17,'O-', CURRENT_DATE-6, CURRENT_DATE+36,'available'),
-- Yashoda Hyderabad (bank 18)
(18,'B+', CURRENT_DATE-4, CURRENT_DATE+38,'available'),
(18,'AB+',CURRENT_DATE-2, CURRENT_DATE+40,'available'),
(18,'O+', CURRENT_DATE-10,CURRENT_DATE+32,'available'),
(18,'A+', CURRENT_DATE-8, CURRENT_DATE+5, 'available'),  -- expiring soon!
(18,'O-', CURRENT_DATE-1, CURRENT_DATE+41,'available'),
-- Care Hospital Hyderabad (bank 19)
(19,'A+', CURRENT_DATE-5, CURRENT_DATE+37,'available'),
(19,'B-', CURRENT_DATE-9, CURRENT_DATE+33,'available'),
-- SSKM Kolkata (bank 20)
(20,'O+', CURRENT_DATE-6, CURRENT_DATE+36,'available'),
(20,'A+', CURRENT_DATE-3, CURRENT_DATE+39,'available'),
(20,'B+', CURRENT_DATE-7, CURRENT_DATE+35,'available'),
(20,'AB-',CURRENT_DATE-4, CURRENT_DATE+38,'available'),
-- RG Kar Kolkata (bank 21)
(21,'O-', CURRENT_DATE-5, CURRENT_DATE+37,'available'),
(21,'A-', CURRENT_DATE-8, CURRENT_DATE+34,'available'),
-- SGPGI Lucknow (bank 22)
(22,'B+', CURRENT_DATE-3, CURRENT_DATE+39,'available'),
(22,'O+', CURRENT_DATE-9, CURRENT_DATE+33,'available'),
(22,'A+', CURRENT_DATE-6, CURRENT_DATE+36,'available'),
-- KGMU Lucknow (bank 23)
(23,'AB+',CURRENT_DATE-2, CURRENT_DATE+40,'available'),
(23,'O-', CURRENT_DATE-7, CURRENT_DATE+35,'available'),
-- PGI Chandigarh (bank 24)
(24,'A+', CURRENT_DATE-4, CURRENT_DATE+38,'available'),
(24,'B+', CURRENT_DATE-8, CURRENT_DATE+34,'available'),
(24,'O+', CURRENT_DATE-5, CURRENT_DATE+37,'available'),
-- JIPMER Puducherry (bank 25)
(25,'O-', CURRENT_DATE-3, CURRENT_DATE+39,'available'),
(25,'A-', CURRENT_DATE-6, CURRENT_DATE+36,'available'),
(25,'B-', CURRENT_DATE-9, CURRENT_DATE+33,'available');

-- ============================================================
-- patients
-- ============================================================
INSERT INTO patients (name, age, gender, blood_group, hospital_name, hospital_city, hospital_state, contact_phone) VALUES
    ('Ramesh Kumar',   45,'M','A+', 'AIIMS Delhi',               'Delhi',     'Delhi',       '+919911000001'),
    ('Sunita Sharma',  38,'F','O-', 'Apollo Hospital Delhi',      'Delhi',     'Delhi',       '+919911000002'),
    ('Farhan Khan',    52,'M','B-', 'KEM Hospital Mumbai',        'Mumbai',    'Maharashtra', '+919911000003'),
    ('Lalitha Devi',   60,'F','AB+','Manipal Hospital Bangalore', 'Bangalore', 'Karnataka',   '+919911000004'),
    ('Sunil Mehrotra', 35,'M','O+', 'Yashoda Hospital Hyderabad', 'Hyderabad', 'Telangana',   '+919911000005'),
    ('Anita Bose',     28,'F','A-', 'Fortis Hospital Delhi',      'Delhi',     'Delhi',       '+919911000006'),
    ('Prakash Naidu',  67,'M','B+', 'Global Hospital Chennai',    'Chennai',   'Tamil Nadu',  '+919911000007'),
    ('Geeta Pillai',   40,'F','AB-','Aster CMI Bangalore',        'Bangalore', 'Karnataka',   '+919911000008'),
    ('Arun Chopra',    55,'M','O-', 'Max Hospital Delhi',         'Delhi',     'Delhi',       '+919911000009'),
    ('Divya Krishnan', 22,'F','A+', 'Kauvery Hospital Chennai',   'Chennai',   'Tamil Nadu',  '+919911000010');

-- ============================================================
-- blood_requests
-- ============================================================
INSERT INTO blood_requests (patient_id, requested_by, blood_group, units_needed, units_fulfilled, city, urgency, status, notes) VALUES
    (1, 2,'A+', 2, 0,'Delhi',    'urgent',  'pending',             'Post-surgery requirement'),
    (2, 2,'O-', 1, 0,'Delhi',    'critical','pending',             'Emergency — accident victim'),
    (3, 4,'B-', 1, 0,'Mumbai',   'normal',  'pending',             'Scheduled surgery next week'),
    (4, 3,'AB+',3, 0,'Bangalore','urgent',  'pending',             'Cancer treatment ongoing'),
    (5, 5,'O+', 2, 0,'Hyderabad','normal',  'pending',             'Thalassemia patient'),
    (6, 2,'A-', 1, 1,'Delhi',    'urgent',  'partially_fulfilled', 'One unit still needed'),
    (7, 6,'B+', 2, 2,'Chennai',  'normal',  'fulfilled',           'Completed successfully'),
    (8, 3,'AB-',1, 1,'Bangalore','urgent',  'fulfilled',           'Rare group — fulfilled from Bangalore bank'),
    (9, 2,'O-', 2, 0,'Delhi',    'normal',  'cancelled',           'Patient transferred to another hospital'),
    (10,6,'A+', 1, 0,'Chennai',  'urgent',  'matched',             'Donors notified');

-- ============================================================
-- request_donor_matches
-- ============================================================
INSERT INTO request_donor_matches (request_id, donor_id, response, responded_at) VALUES
    (6, 6, 'accepted', NOW() - INTERVAL '2 days'),
    (6, 1, 'declined', NOW() - INTERVAL '2 days'),
    (7, 19,'accepted', NOW() - INTERVAL '5 days'),
    (8, 12,'accepted', NOW() - INTERVAL '3 days'),
    (10,18,'pending',  NULL),
    (1, 3, 'pending',  NULL),
    (1, 9, 'pending',  NULL),
    (2, 1, 'pending',  NULL);
