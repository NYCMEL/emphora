/**
 * seed-users.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Dev seed accounts — re-synced on every server restart.
 * All passwords: test-1234
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

module.exports = [
  // ── Role accounts ──────────────────────────────────────────────────────────
  { firstName:'Admin',      lastName:'User',       email:'admin@emphora.dev',                  password:'test-1234', accountType:'admin',      emphoraScore:99.0, isVerified:1, isActive:1 },
  { firstName:'Test',       lastName:'Employee',   email:'employee@emphora.dev',               password:'test-1234', accountType:'employee',   emphoraScore:72.5, isVerified:1, isActive:1 },
  { firstName:'Test',       lastName:'Employer',   email:'employer@emphora.dev',               password:'test-1234', accountType:'employer',   emphoraScore:85.0, isVerified:1, isActive:1 },
  { firstName:'Test',       lastName:'Researcher', email:'researcher@emphora.dev',             password:'test-1234', accountType:'researcher', emphoraScore:80.0, isVerified:0, isActive:1 },

  // ── Named employee pool ────────────────────────────────────────────────────
  { firstName:'Sarah',      lastName:'Chen',       email:'sarah.chen@emphora.dev',             password:'test-1234', accountType:'employee',   emphoraScore:96.4, isVerified:1, isActive:1 },
  { firstName:'Marcus',     lastName:'Webb',       email:'marcus.webb@emphora.dev',            password:'test-1234', accountType:'employee',   emphoraScore:93.8, isVerified:1, isActive:1 },
  { firstName:'Priya',      lastName:'Sharma',     email:'priya.sharma@emphora.dev',           password:'test-1234', accountType:'employee',   emphoraScore:88.2, isVerified:1, isActive:1 },
  { firstName:'Devon',      lastName:'Okafor',     email:'devon.okafor@emphora.dev',           password:'test-1234', accountType:'employee',   emphoraScore:85.7, isVerified:1, isActive:1 },
  { firstName:'Lin',        lastName:'Xiao',       email:'lin.xiao@emphora.dev',               password:'test-1234', accountType:'employee',   emphoraScore:83.1, isVerified:1, isActive:1 },
  { firstName:'Jordan',     lastName:'Reyes',      email:'jordan.reyes@emphora.dev',           password:'test-1234', accountType:'employee',   emphoraScore:78.9, isVerified:1, isActive:1 },
  { firstName:'Aisha',      lastName:'Patel',      email:'aisha.patel@emphora.dev',            password:'test-1234', accountType:'employee',   emphoraScore:75.3, isVerified:0, isActive:1 },
  { firstName:'Tom',        lastName:'Nakamura',   email:'tom.nakamura@emphora.dev',           password:'test-1234', accountType:'employee',   emphoraScore:71.6, isVerified:0, isActive:1 },
  { firstName:'Zoe',        lastName:'Andersen',   email:'zoe.andersen@emphora.dev',           password:'test-1234', accountType:'employee',   emphoraScore:64.2, isVerified:0, isActive:1 },
  { firstName:'Kai',        lastName:'Osei',       email:'kai.osei@emphora.dev',               password:'test-1234', accountType:'employee',   emphoraScore:57.8, isVerified:0, isActive:1 },

  // ── Blank test account (no data) ───────────────────────────────────────────
  { firstName:'David',      lastName:'Miller',     email:'david.miller@emphora.dev',           password:'test-1234', accountType:'employee',   emphoraScore:0.0,  isVerified:0, isActive:1 },

  // ── Extended employee pool ─────────────────────────────────────────────────
  { firstName:'Alex',       lastName:'T Adams',    email:'alex.t.adams1@emphora.dev',          password:'test-1234', accountType:'employee',   emphoraScore:69.9, isVerified:1, isActive:1 },
  { firstName:'Blake',      lastName:'T Baker',    email:'blake.t.baker2@emphora.dev',         password:'test-1234', accountType:'employee',   emphoraScore:27.5, isVerified:0, isActive:1 },
  { firstName:'Casey',      lastName:'T Barnes',   email:'casey.t.barnes3@emphora.dev',        password:'test-1234', accountType:'employee',   emphoraScore:59.7, isVerified:0, isActive:1 },
  { firstName:'Dana',       lastName:'T Bell',     email:'dana.t.bell4@emphora.dev',           password:'test-1234', accountType:'employee',   emphoraScore:28.7, isVerified:1, isActive:1 },
  { firstName:'Drew',       lastName:'T Brooks',   email:'drew.t.brooks5@emphora.dev',         password:'test-1234', accountType:'employee',   emphoraScore:30.9, isVerified:0, isActive:1 },
  { firstName:'Ellis',      lastName:'T Campbell', email:'ellis.t.campbell6@emphora.dev',      password:'test-1234', accountType:'employee',   emphoraScore:72.7, isVerified:0, isActive:1 },
  { firstName:'Finley',     lastName:'T Carter',   email:'finley.t.carter7@emphora.dev',       password:'test-1234', accountType:'employee',   emphoraScore:76.0, isVerified:1, isActive:1 },
  { firstName:'Gray',       lastName:'T Chen',     email:'gray.t.chen8@emphora.dev',           password:'test-1234', accountType:'employee',   emphoraScore:32.4, isVerified:1, isActive:1 },
  { firstName:'Harper',     lastName:'T Clark',    email:'harper.t.clark9@emphora.dev',        password:'test-1234', accountType:'employee',   emphoraScore:23.5, isVerified:1, isActive:1 },
  { firstName:'Indigo',     lastName:'T Collins',  email:'indigo.t.collins10@emphora.dev',     password:'test-1234', accountType:'employee',   emphoraScore:30.4, isVerified:1, isActive:1 },
  { firstName:'Jamie',      lastName:'T Cook',     email:'jamie.t.cook11@emphora.dev',         password:'test-1234', accountType:'employee',   emphoraScore:45.5, isVerified:0, isActive:1 },
  { firstName:'Jordan',     lastName:'T Cooper',   email:'jordan.t.cooper12@emphora.dev',      password:'test-1234', accountType:'employee',   emphoraScore:78.5, isVerified:0, isActive:1 },
  { firstName:'Kendall',    lastName:'T Davis',    email:'kendall.t.davis13@emphora.dev',      password:'test-1234', accountType:'employee',   emphoraScore:96.0, isVerified:0, isActive:1 },
  { firstName:'Lane',       lastName:'T Diaz',     email:'lane.t.diaz14@emphora.dev',          password:'test-1234', accountType:'employee',   emphoraScore:89.4, isVerified:0, isActive:1 },
  { firstName:'Logan',      lastName:'T Edwards',  email:'logan.t.edwards15@emphora.dev',      password:'test-1234', accountType:'employee',   emphoraScore:63.1, isVerified:1, isActive:1 },
  { firstName:'Morgan',     lastName:'T Evans',    email:'morgan.t.evans16@emphora.dev',       password:'test-1234', accountType:'employee',   emphoraScore:87.8, isVerified:1, isActive:1 },
  { firstName:'Noel',       lastName:'T Fisher',   email:'noel.t.fisher17@emphora.dev',        password:'test-1234', accountType:'employee',   emphoraScore:31.4, isVerified:1, isActive:1 },
  { firstName:'Oakley',     lastName:'T Foster',   email:'oakley.t.foster18@emphora.dev',      password:'test-1234', accountType:'employee',   emphoraScore:48.7, isVerified:0, isActive:1 },
  { firstName:'Parker',     lastName:'T Garcia',   email:'parker.t.garcia19@emphora.dev',      password:'test-1234', accountType:'employee',   emphoraScore:81.4, isVerified:1, isActive:1 },
  { firstName:'Quinn',      lastName:'T Gibson',   email:'quinn.t.gibson20@emphora.dev',       password:'test-1234', accountType:'employee',   emphoraScore:67.4, isVerified:0, isActive:1 },
  { firstName:'Reese',      lastName:'T Gray',     email:'reese.t.gray21@emphora.dev',         password:'test-1234', accountType:'employee',   emphoraScore:63.4, isVerified:0, isActive:1 },
  { firstName:'Riley',      lastName:'T Green',    email:'riley.t.green22@emphora.dev',        password:'test-1234', accountType:'employee',   emphoraScore:79.6, isVerified:0, isActive:1 },
  { firstName:'River',      lastName:'T Hall',     email:'river.t.hall23@emphora.dev',         password:'test-1234', accountType:'employee',   emphoraScore:67.0, isVerified:1, isActive:1 },
  { firstName:'Rowan',      lastName:'T Harris',   email:'rowan.t.harris24@emphora.dev',       password:'test-1234', accountType:'employee',   emphoraScore:90.9, isVerified:0, isActive:1 },
  { firstName:'Sage',       lastName:'T Hayes',    email:'sage.t.hayes25@emphora.dev',         password:'test-1234', accountType:'employee',   emphoraScore:70.4, isVerified:1, isActive:1 },
  { firstName:'Sawyer',     lastName:'T Hill',     email:'sawyer.t.hill26@emphora.dev',        password:'test-1234', accountType:'employee',   emphoraScore:24.2, isVerified:0, isActive:1 },
  { firstName:'Scout',      lastName:'T Holmes',   email:'scout.t.holmes27@emphora.dev',       password:'test-1234', accountType:'employee',   emphoraScore:24.9, isVerified:0, isActive:1 },
  { firstName:'Skylar',     lastName:'T Howard',   email:'skylar.t.howard28@emphora.dev',      password:'test-1234', accountType:'employee',   emphoraScore:64.8, isVerified:1, isActive:1 },
  { firstName:'Spencer',    lastName:'T Hughes',   email:'spencer.t.hughes29@emphora.dev',     password:'test-1234', accountType:'employee',   emphoraScore:35.3, isVerified:1, isActive:1 },
  { firstName:'Sterling',   lastName:'T James',    email:'sterling.t.james30@emphora.dev',     password:'test-1234', accountType:'employee',   emphoraScore:30.4, isVerified:0, isActive:1 },
  { firstName:'Tatum',      lastName:'T Jenkins',  email:'tatum.t.jenkins31@emphora.dev',      password:'test-1234', accountType:'employee',   emphoraScore:48.7, isVerified:1, isActive:1 },
  { firstName:'Taylor',     lastName:'T Johnson',  email:'taylor.t.johnson32@emphora.dev',     password:'test-1234', accountType:'employee',   emphoraScore:62.6, isVerified:1, isActive:1 },
  { firstName:'Tegan',      lastName:'T Jones',    email:'tegan.t.jones33@emphora.dev',        password:'test-1234', accountType:'employee',   emphoraScore:57.2, isVerified:0, isActive:1 },
  { firstName:'Terry',      lastName:'T Kelly',    email:'terry.t.kelly34@emphora.dev',        password:'test-1234', accountType:'employee',   emphoraScore:34.4, isVerified:1, isActive:1 },
  { firstName:'Tobin',      lastName:'T Kim',      email:'tobin.t.kim35@emphora.dev',          password:'test-1234', accountType:'employee',   emphoraScore:26.1, isVerified:1, isActive:1 },
  { firstName:'Tristan',    lastName:'T King',     email:'tristan.t.king36@emphora.dev',       password:'test-1234', accountType:'employee',   emphoraScore:51.9, isVerified:0, isActive:1 },
  { firstName:'Tyler',      lastName:'T Lee',      email:'tyler.t.lee37@emphora.dev',          password:'test-1234', accountType:'employee',   emphoraScore:39.1, isVerified:0, isActive:1 },
  { firstName:'Umber',      lastName:'T Lewis',    email:'umber.t.lewis38@emphora.dev',        password:'test-1234', accountType:'employee',   emphoraScore:43.4, isVerified:1, isActive:1 },
  { firstName:'Val',        lastName:'T Long',     email:'val.t.long39@emphora.dev',           password:'test-1234', accountType:'employee',   emphoraScore:80.5, isVerified:0, isActive:1 },
  { firstName:'Wren',       lastName:'T Lopez',    email:'wren.t.lopez40@emphora.dev',         password:'test-1234', accountType:'employee',   emphoraScore:21.3, isVerified:0, isActive:1 },
  { firstName:'Xan',        lastName:'T Martin',   email:'xan.t.martin41@emphora.dev',         password:'test-1234', accountType:'employee',   emphoraScore:65.8, isVerified:1, isActive:1 },
  { firstName:'Yael',       lastName:'T Miller',   email:'yael.t.miller42@emphora.dev',        password:'test-1234', accountType:'employee',   emphoraScore:21.0, isVerified:1, isActive:1 },
  { firstName:'Zara',       lastName:'T Mitchell', email:'zara.t.mitchell43@emphora.dev',      password:'test-1234', accountType:'employee',   emphoraScore:38.9, isVerified:0, isActive:1 },
  { firstName:'Beau',       lastName:'T Moore',    email:'beau.t.moore44@emphora.dev',         password:'test-1234', accountType:'employee',   emphoraScore:43.0, isVerified:0, isActive:1 },
  { firstName:'Cleo',       lastName:'T Morgan',   email:'cleo.t.morgan45@emphora.dev',        password:'test-1234', accountType:'employee',   emphoraScore:55.1, isVerified:0, isActive:1 },
  { firstName:'Demi',       lastName:'T Morris',   email:'demi.t.morris46@emphora.dev',        password:'test-1234', accountType:'employee',   emphoraScore:82.1, isVerified:0, isActive:1 },
  { firstName:'Ezra',       lastName:'T Nelson',   email:'ezra.t.nelson47@emphora.dev',        password:'test-1234', accountType:'employee',   emphoraScore:30.6, isVerified:0, isActive:1 },
  { firstName:'Fynn',       lastName:'T Parker',   email:'fynn.t.parker48@emphora.dev',        password:'test-1234', accountType:'employee',   emphoraScore:20.1, isVerified:1, isActive:1 },
  { firstName:'Glen',       lastName:'T Patel',    email:'glen.t.patel49@emphora.dev',         password:'test-1234', accountType:'employee',   emphoraScore:48.5, isVerified:1, isActive:1 },
  { firstName:'Hale',       lastName:'T Price',    email:'hale.t.price50@emphora.dev',         password:'test-1234', accountType:'employee',   emphoraScore:60.8, isVerified:1, isActive:1 },

  // ── Named real-world account ───────────────────────────────────────────────
  { firstName:'Mel',        lastName:'M. Heravi',  email:'mel.heravi@emphora.dev',             password:'test-1234', accountType:'employee',   emphoraScore:94.7, isVerified:1, isActive:1 },
  // ── Employer accounts — one per seeded company ────────────────────────────
  { firstName:'Melify',      lastName:'LLC',          email:'hr@melify.emphora.dev',              password:'test-1234', accountType:'employer', emphoraScore:92.0, isVerified:1, isActive:1 },
  { firstName:'Fiserv',      lastName:'Recruiting',   email:'hr@fiserv.emphora.dev',              password:'test-1234', accountType:'employer', emphoraScore:88.0, isVerified:1, isActive:1 },
  { firstName:'Orion',       lastName:'Inc.',         email:'hr@orion.emphora.dev',               password:'test-1234', accountType:'employer', emphoraScore:85.0, isVerified:1, isActive:1 },
  { firstName:'JPMorgan',    lastName:'Chase',        email:'hr@jpmorgan.emphora.dev',            password:'test-1234', accountType:'employer', emphoraScore:91.0, isVerified:1, isActive:1 },
  { firstName:'DTCC',        lastName:'Recruiting',   email:'hr@dtcc.emphora.dev',               password:'test-1234', accountType:'employer', emphoraScore:84.0, isVerified:1, isActive:1 },
  { firstName:'Barclays',    lastName:'Bank',         email:'hr@barclays.emphora.dev',            password:'test-1234', accountType:'employer', emphoraScore:87.0, isVerified:1, isActive:1 },
  { firstName:'Fannie',      lastName:'Mae',          email:'hr@fanniemae.emphora.dev',           password:'test-1234', accountType:'employer', emphoraScore:83.0, isVerified:1, isActive:1 },
  { firstName:'Fidelity',    lastName:'Investments',  email:'hr@fidelity.emphora.dev',            password:'test-1234', accountType:'employer', emphoraScore:90.0, isVerified:1, isActive:1 },
  { firstName:'Acme',        lastName:'Corp',         email:'hr@acmecorp.emphora.dev',            password:'test-1234', accountType:'employer', emphoraScore:74.0, isVerified:1, isActive:1 },
  { firstName:'TechNova',    lastName:'Inc.',         email:'hr@technova.emphora.dev',            password:'test-1234', accountType:'employer', emphoraScore:82.0, isVerified:1, isActive:1 },
  { firstName:'Brightline',  lastName:'Systems',      email:'hr@brightline.emphora.dev',          password:'test-1234', accountType:'employer', emphoraScore:79.0, isVerified:1, isActive:1 },
  { firstName:'Apex',        lastName:'Digital',      email:'hr@apexdigital.emphora.dev',         password:'test-1234', accountType:'employer', emphoraScore:77.0, isVerified:1, isActive:1 },
  { firstName:'Quantum',     lastName:'Works',        email:'hr@quantumworks.emphora.dev',        password:'test-1234', accountType:'employer', emphoraScore:81.0, isVerified:1, isActive:1 },
  { firstName:'Meridian',    lastName:'Labs',         email:'hr@meridianlabs.emphora.dev',        password:'test-1234', accountType:'employer', emphoraScore:78.0, isVerified:1, isActive:1 },
  { firstName:'Solstice',    lastName:'AI',           email:'hr@solsticeai.emphora.dev',          password:'test-1234', accountType:'employer', emphoraScore:86.0, isVerified:1, isActive:1 },
  { firstName:'Ironclad',    lastName:'Tech',         email:'hr@ironcladtech.emphora.dev',        password:'test-1234', accountType:'employer', emphoraScore:76.0, isVerified:1, isActive:1 },
  { firstName:'Vantage',     lastName:'Solutions',    email:'hr@vantagesolutions.emphora.dev',    password:'test-1234', accountType:'employer', emphoraScore:80.0, isVerified:1, isActive:1 },
  { firstName:'Nexus',       lastName:'Corp',         email:'hr@nexuscorp.emphora.dev',           password:'test-1234', accountType:'employer', emphoraScore:75.0, isVerified:1, isActive:1 },
  { firstName:'Pinnacle',    lastName:'Software',     email:'hr@pinnaclesoftware.emphora.dev',    password:'test-1234', accountType:'employer', emphoraScore:83.0, isVerified:1, isActive:1 },
  { firstName:'Atlas',       lastName:'Engineering',  email:'hr@atlasengineering.emphora.dev',    password:'test-1234', accountType:'employer', emphoraScore:78.0, isVerified:1, isActive:1 },
  { firstName:'Horizon',     lastName:'Dynamics',     email:'hr@horizondynamics.emphora.dev',     password:'test-1234', accountType:'employer', emphoraScore:77.0, isVerified:1, isActive:1 },
  { firstName:'Vertex',      lastName:'Technologies', email:'hr@vertextech.emphora.dev',          password:'test-1234', accountType:'employer', emphoraScore:82.0, isVerified:1, isActive:1 },
  { firstName:'Crestwood',   lastName:'Digital',      email:'hr@crestwooddigital.emphora.dev',    password:'test-1234', accountType:'employer', emphoraScore:74.0, isVerified:1, isActive:1 },
  { firstName:'Lighthouse',  lastName:'Analytics',    email:'hr@lighthouseanalytics.emphora.dev', password:'test-1234', accountType:'employer', emphoraScore:80.0, isVerified:1, isActive:1 },
  { firstName:'Cascade',     lastName:'Software',     email:'hr@cascadesoftware.emphora.dev',     password:'test-1234', accountType:'employer', emphoraScore:76.0, isVerified:1, isActive:1 },
  { firstName:'Summit',      lastName:'Tech',         email:'hr@summittech.emphora.dev',          password:'test-1234', accountType:'employer', emphoraScore:79.0, isVerified:1, isActive:1 },
  { firstName:'Ember',       lastName:'Labs',         email:'hr@emberlabs.emphora.dev',           password:'test-1234', accountType:'employer', emphoraScore:72.0, isVerified:1, isActive:1 },

];