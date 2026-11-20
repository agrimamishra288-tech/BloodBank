-- Migration 007: replace the five generic demo centres in an existing database
-- with real public hospital blood banks, keeping their bank_id values so
-- inventory, donations and requests keep valid foreign keys.
-- Fresh databases are seeded with the same 25 hospitals by seed.sql.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM blood_banks
    WHERE name = 'City Central Blood Bank' AND city = 'Delhi'
  ) THEN
    RETURN;
  END IF;

  UPDATE blood_banks SET
    name = 'AIIMS Blood Bank',
    address = 'Ansari Nagar, AIIMS Campus',
    city = 'Delhi', state = 'Delhi', pincode = '110029',
    contact_phone = '011-26593308', contact_email = 'bbaiims@aiims.edu',
    latitude = 28.5665, longitude = 77.2097, updated_at = NOW()
  WHERE name = 'City Central Blood Bank' AND city = 'Delhi';

  UPDATE blood_banks SET
    name = 'Safdarjung Hospital Blood Bank',
    address = 'Ring Road, Safdarjung Hospital',
    city = 'Delhi', state = 'Delhi', pincode = '110029',
    contact_phone = '011-26707446', contact_email = 'bbsafdarjung@nic.in',
    latitude = 28.5684, longitude = 77.2066, updated_at = NOW()
  WHERE name = 'AIIMS Regional Blood Bank' AND city = 'Delhi';

  UPDATE blood_banks SET
    name = 'KEM Hospital Blood Bank',
    address = 'Acharya Donde Marg, Parel',
    city = 'Mumbai', state = 'Maharashtra', pincode = '400012',
    contact_phone = '022-24107000', contact_email = 'bbkem@mcgm.gov.in',
    latitude = 18.9754, longitude = 72.8415, updated_at = NOW()
  WHERE name = 'Lifeline Blood Centre' AND city = 'Mumbai';

  UPDATE blood_banks SET
    name = 'NIMHANS Blood Bank',
    address = 'Hosur Road, Lakkasandra',
    city = 'Bangalore', state = 'Karnataka', pincode = '560029',
    contact_phone = '080-46110007', contact_email = 'bb@nimhans.ac.in',
    latitude = 12.9398, longitude = 77.5956, updated_at = NOW()
  WHERE name = 'Apollo Blood Bank' AND city = 'Bangalore';

  UPDATE blood_banks SET
    name = 'Yashoda Hospital Blood Bank',
    address = 'Alexander Road, Secunderabad',
    city = 'Hyderabad', state = 'Telangana', pincode = '500003',
    contact_phone = '040-27808888', contact_email = 'bb@yashodahospitals.com',
    latitude = 17.4329, longitude = 78.4505, updated_at = NOW()
  WHERE name = 'Care Blood Services' AND city = 'Hyderabad';

  INSERT INTO blood_banks (name, address, city, state, pincode, contact_phone, contact_email, latitude, longitude) VALUES
    ('Ram Manohar Lohia Blood Bank',      'Baba Kharak Singh Marg, RML Hospital',            'Delhi',      'Delhi',         '110001', '011-23404328', 'bbrml@gov.in',                      28.6367, 77.2010),
    ('Sir Ganga Ram Blood Bank',          'Rajinder Nagar, Sir Ganga Ram Hospital',          'Delhi',      'Delhi',         '110060', '011-25750000', 'bb@sgrh.com',                       28.6448, 77.1900),
    ('Max Super Speciality Blood Bank',   'Press Enclave Road, Saket',                       'Delhi',      'Delhi',         '110017', '011-26515050', 'bbmax.saket@maxhealthcare.com',     28.5245, 77.2066),
    ('Medanta Blood Bank',                'CH Baktawar Singh Road, Sector 38',               'Gurugram',   'Haryana',       '122001', '0124-4141414', 'bloodbank@medanta.org',             28.4453, 77.0366),
    ('Lilavati Hospital Blood Bank',      'A-791 Bandra Reclamation, Bandra West',           'Mumbai',     'Maharashtra',   '400050', '022-26751000', 'bb@lilavatihospital.com',           19.0538, 72.8292),
    ('Hinduja Hospital Blood Bank',       'Veer Savarkar Marg, Mahim',                       'Mumbai',     'Maharashtra',   '400016', '022-24452222', 'bb@hindujahospital.com',            19.0597, 72.8339),
    ('Breach Candy Hospital Blood Bank',  '60-A Bhulabhai Desai Road',                       'Mumbai',     'Maharashtra',   '400026', '022-23667888', 'bb@breachcandyhospital.org',        18.9718, 72.8089),
    ('Manipal Hospital Blood Bank',       '98 HAL Airport Road',                             'Bangalore',  'Karnataka',     '560017', '080-25024444', 'bb.bangalore@manipalhospitals.com', 12.9538, 77.6481),
    ('St Johns Medical College Blood Bank','Sarjapur Road, Koramangala',                     'Bangalore',  'Karnataka',     '560034', '080-22065000', 'bb@stjohns.in',                     12.9398, 77.6214),
    ('Aster CMI Blood Bank',              'NH-7, Sahakara Nagar',                            'Bangalore',  'Karnataka',     '560092', '080-43425000', 'bb.cmi@asterhospitals.in',          13.0683, 77.5945),
    ('CMC Vellore Blood Bank',            'Ida Scudder Road, CMC Campus',                    'Vellore',    'Tamil Nadu',    '632004', '0416-2281000', 'bb@cmcvellore.ac.in',               12.9237, 79.1326),
    ('Global Hospitals Blood Bank',       'No 439 Cheran Nagar, Perumbakkam',                'Chennai',    'Tamil Nadu',    '600100', '044-44777000', 'bb@globalhospitalsindia.com',       13.0150, 80.2370),
    ('Kauvery Hospital Blood Bank',       '199 Luz Church Road, Mylapore',                   'Chennai',    'Tamil Nadu',    '600004', '044-40006000', 'bb@kauveryhospital.com',            13.0827, 80.2707),
    ('Care Hospital Blood Bank',          'Road No 1, Banjara Hills',                        'Hyderabad',  'Telangana',     '500034', '040-30418000', 'bb@carehospitals.com',              17.4156, 78.4347),
    ('SSKM Blood Bank',                   '244 AJC Bose Road, SSKM Hospital',                'Kolkata',    'West Bengal',   '700020', '033-22044444', 'bb@sskm.gov.in',                    22.5355, 88.3399),
    ('RG Kar Medical College Blood Bank', '1 Khudiram Bose Sarani, Shyambazar',              'Kolkata',    'West Bengal',   '700004', '033-25551126', 'bb@rgkar.gov.in',                   22.5938, 88.3733),
    ('SGPGI Blood Bank',                  'Raebareli Road, SGPGI Campus',                    'Lucknow',    'Uttar Pradesh', '226014', '0522-2495000', 'bb@sgpgi.ac.in',                    26.8560, 80.9823),
    ('KGMU Blood Bank',                   'Shah Mina Road, King Georges Medical University', 'Lucknow',    'Uttar Pradesh', '226003', '0522-2258880', 'bb@kgmu.ac.in',                     26.9124, 80.9499),
    ('PGI Blood Bank',                    'Sector 12, PGI Campus',                           'Chandigarh', 'Chandigarh',    '160012', '0172-2756565', 'bbpgi@pgimer.edu.in',               30.7633, 76.7797),
    ('JIPMER Blood Bank',                 'Dhanvantari Nagar, JIPMER Campus',                'Puducherry', 'Puducherry',    '605006', '0413-2272380', 'bb@jipmer.edu.in',                  11.9416, 79.8083)
  ON CONFLICT DO NOTHING;
END $$;
