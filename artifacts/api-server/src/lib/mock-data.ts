/**
 * Mock Registries & Seed Data for ApexFinder Pro
 *
 * Simulates rich, interconnected data from:
 * - Italy Catasto (Agenzia delle Entrate SISTER)
 * - UK HM Land Registry (HMLR / Companies House)
 * - FAA / EASA Aviation Register
 * - Lloyd's IMO Marine Registry
 * - Forbes / Bloomberg Billionaires (public data)
 * - Private Gentleman Clubs (Boodle's, Pratt's, etc.)
 * - Riva del Garda Ferrari Club
 * - Luxury hunting & safari operators (Africa Big Five)
 */

import { db } from "@workspace/db";
import {
  entitiesTable,
  assetsTable,
  relationshipsTable,
  researchSessionsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";

export async function seedMockData(): Promise<void> {
  // Only seed if entities table is empty
  const existing = await db.select().from(entitiesTable).limit(1);
  if (existing.length > 0) return;

  // ── ENTITIES ─────────────────────────────────────────────────────────────
  const entityData = [
    // Italian HNWI — villa in Tuscany, yacht in Sardinia, UK shell company
    {
      name: "Lorenzo Castellani",
      type: "HNWI",
      bayesianScore: 0.89,
      nationality: "Italian",
      estimatedNetWorth: 280_000_000,
      knownResidences: "Florence, IT (primary) / London, UK / Monaco",
      linkedinUrl: null,
      phone: null,
      email: null,
      contactMethod: "Gatekeeper only",
      notes: "Third-generation industrialist. Porto Cervo marina slip holder. Member: Circolo della Caccia (Rome). Ferrari Club Riva del Garda #0047.",
      sourceRegistries: JSON.stringify(["Italy Catasto", "Companies House UK", "IMO Registry"]),
      metadata: JSON.stringify({ confidence: "HIGH", lastVerified: "2026-03-15" }),
      isHot: true,
    },
    // UK HNWI — Mayfair townhouse, private jet, Boodle's Club
    {
      name: "Edward Fitzwilliam-Holt",
      type: "HNWI",
      bayesianScore: 0.92,
      nationality: "British",
      estimatedNetWorth: 560_000_000,
      knownResidences: "London, UK (Mayfair) / Scottish Highlands / Barbados",
      linkedinUrl: null,
      phone: null,
      email: null,
      contactMethod: "Gatekeeper only",
      notes: "Old money. Inherited estates + modern PE. Boodle's member. Pratt's Club. Annual Africa big-game hunt (Kenya PH: Kariuki Safaris). Pilot — flies own G700.",
      sourceRegistries: JSON.stringify(["HMLR", "FAA/CAA", "Companies House UK"]),
      metadata: JSON.stringify({ confidence: "APEX", lastVerified: "2026-04-02" }),
      isHot: true,
    },
    // Swiss HNWI — ski chalet, Geneva family office
    {
      name: "Viktor Spengler",
      type: "HNWI",
      bayesianScore: 0.74,
      nationality: "Swiss",
      estimatedNetWorth: 180_000_000,
      knownResidences: "Geneva, CH / Gstaad, CH / Dubai, UAE",
      linkedinUrl: null,
      phone: null,
      email: null,
      contactMethod: "Family Office",
      notes: "Technology exit (sold series B SaaS, 2021). Now deploying capital via Spengler Family Office SA. Member: Grand Casino Luzern patron circle.",
      sourceRegistries: JSON.stringify(["Swiss Commercial Register", "UAE Corporate Registry"]),
      metadata: JSON.stringify({ confidence: "HIGH", lastVerified: "2026-02-20" }),
      isHot: false,
    },
    // Russian HNWI — BVI structure, Mediterranean yacht, Cyprus assets
    {
      name: "Alexei Morozov",
      type: "HNWI",
      bayesianScore: 0.81,
      nationality: "Russian",
      estimatedNetWorth: 420_000_000,
      knownResidences: "Monaco / Cyprus / Dubai",
      linkedinUrl: null,
      phone: null,
      email: null,
      contactMethod: "Yacht broker / Marina staff",
      notes: "Energy sector. BVI holding structure with Cyprus intermediary. 72m superyacht 'Meridian Star' (Monaco marina). Avoids direct contact — approach via yacht management company.",
      sourceRegistries: JSON.stringify(["Lloyd's IMO", "BVI Registry", "Cyprus Companies"]),
      metadata: JSON.stringify({ confidence: "HIGH", lastVerified: "2026-05-10" }),
      isHot: true,
    },
    // German HNWI — Munich + Lake Como villa
    {
      name: "Friedrich von Brauer",
      type: "HNWI",
      bayesianScore: 0.68,
      nationality: "German",
      estimatedNetWorth: 120_000_000,
      knownResidences: "Munich, DE / Lake Como, IT",
      linkedinUrl: null,
      phone: null,
      email: null,
      contactMethod: "Private banker (Deutsche Bank Private)",
      notes: "Manufacturing dynasty (automotive suppliers). Lake Como villa registered via Italian LLC. DB Private banker known: confirm via alumni network.",
      sourceRegistries: JSON.stringify(["Italy Catasto", "Handelsregister DE"]),
      metadata: JSON.stringify({ confidence: "MEDIUM", lastVerified: "2026-01-08" }),
      isHot: false,
    },
    // US HNWI — Forbes list, Miami + Hamptons
    {
      name: "Bradford Whitmore III",
      type: "HNWI",
      bayesianScore: 0.95,
      nationality: "American",
      estimatedNetWorth: 2_100_000_000,
      knownResidences: "Miami, FL / East Hampton, NY / Aspen, CO",
      linkedinUrl: "https://linkedin.com/in/bradford-whitmore",
      phone: null,
      email: null,
      contactMethod: "Family Office (Whitmore Capital Group)",
      notes: "Forbes #312. FinTech IPO 2019 ($1.8B). Active LP in multiple European VC funds — natural target for deal flow. Aspen Institute board member. Approach via LP co-investor in known European fund.",
      sourceRegistries: JSON.stringify(["Forbes 400", "SEC EDGAR", "FAA Registry"]),
      metadata: JSON.stringify({ confidence: "APEX", lastVerified: "2026-06-01" }),
      isHot: true,
    },

    // CORPORATIONS (Shell companies and holding structures)
    {
      name: "Castellani Holdings Ltd",
      type: "Corporation",
      bayesianScore: 0.55,
      nationality: "British",
      estimatedNetWorth: null,
      knownResidences: "Registered: 22 Bishopsgate, London EC2N 4BQ",
      linkedinUrl: null,
      phone: null,
      email: "info@castellaniholdings.co.uk",
      contactMethod: "Email",
      notes: "UK shell company for Lorenzo Castellani's Italian property holdings. Company secretary: Archibald & Partners LLP. Director: nominee only.",
      sourceRegistries: JSON.stringify(["Companies House UK"]),
      metadata: JSON.stringify({ companyNumber: "14728310", confidence: "HIGH" }),
      isHot: false,
    },
    {
      name: "Whitmore Capital Group LLC",
      type: "Corporation",
      bayesianScore: 0.62,
      nationality: "American",
      estimatedNetWorth: null,
      knownResidences: "1001 Brickell Bay Drive, Miami, FL 33131",
      linkedinUrl: null,
      phone: "+1 305 555 0142",
      email: "investor.relations@whitmorecapital.com",
      contactMethod: "Email / Phone",
      notes: "Bradford Whitmore III's family office. Handles deal origination. Investment team lead: Margaret Chen (reachable via LinkedIn).",
      sourceRegistries: JSON.stringify(["SEC EDGAR", "Florida SoS"]),
      metadata: JSON.stringify({ ein: "XX-XXXXXXX", confidence: "APEX" }),
      isHot: false,
    },
    {
      name: "Meridian Star Yachting Ltd",
      type: "Corporation",
      bayesianScore: 0.42,
      nationality: "Maltese",
      estimatedNetWorth: null,
      knownResidences: "Registered: Malta Maritime Authority",
      linkedinUrl: null,
      phone: "+356 2123 0000",
      email: "ops@meridianstaryachting.mt",
      contactMethod: "Phone / WhatsApp",
      notes: "Yacht management company for Morozov's 'Meridian Star'. Captain: Petros Anastasiou (+30 693 847 2211). Receives all provisioning / berthing coordination — warm introduction vector. Approach via WhatsApp off-season (Nov–Feb). Marina berthing agent in Monaco has direct line.",
      sourceRegistries: JSON.stringify(["Malta Maritime Authority", "Lloyd's IMO"]),
      metadata: JSON.stringify({ imoManaged: "IMO-9723441", confidence: "HIGH" }),
      isHot: false,
    },

    // TRUSTS
    {
      name: "Fitzwilliam Family Trust",
      type: "Trust",
      bayesianScore: 0.71,
      nationality: "British",
      estimatedNetWorth: null,
      knownResidences: "Registered: Cayman Islands",
      linkedinUrl: null,
      phone: null,
      email: null,
      contactMethod: "Trustee (Maples & Calder)",
      notes: "Cayman trust holding Fitzwilliam-Holt's Barbados estate and Mayfair property portfolio. Trustee: Maples & Calder (Grand Cayman).",
      sourceRegistries: JSON.stringify(["Cayman Islands Monetary Authority", "HMLR"]),
      metadata: JSON.stringify({ trustDate: "2008-03-14", confidence: "HIGH" }),
      isHot: false,
    },

    // GATEKEEPERS — the warm-introduction points
    {
      name: "Marco Ricci (Geometra)",
      type: "Gatekeeper",
      bayesianScore: 0.22,
      nationality: "Italian",
      estimatedNetWorth: null,
      knownResidences: "Via dei Servi 12, Florence 50122, Italy",
      linkedinUrl: null,
      phone: "+39 055 234 5678",
      email: "m.ricci.geometra@libero.it",
      contactMethod: "WhatsApp",
      notes: "Licensed Geometra. Manages Castellani's Tuscan property portfolio including Villa Ariana (Chianti DOCG parcel IT-FI-A2247). Has direct weekly contact with Lorenzo. Open to referral arrangements per local custom.",
      sourceRegistries: JSON.stringify(["Italy Catasto", "Albo dei Geometri Firenze"]),
      metadata: JSON.stringify({ geometraLicense: "FI/14732", confidence: "APEX" }),
      isHot: false,
    },
    {
      name: "Hamish MacAlpine (Estate Manager)",
      type: "Gatekeeper",
      bayesianScore: 0.18,
      nationality: "British",
      estimatedNetWorth: null,
      knownResidences: "Fitzwilliam Estate, Perthshire PH1 3EG, Scotland",
      linkedinUrl: "https://linkedin.com/in/hamish-macalpine-estate",
      phone: "+44 7700 900142",
      email: "estate@fitzwilliamholt.co.uk",
      contactMethod: "Email (professional)",
      notes: "Manages the Fitzwilliam-Holt Scottish estate + coordinates Edward's calendar for shooting weekends. Best approach: professional estate management angle. Will not respond to unsolicited calls — email only initially.",
      sourceRegistries: JSON.stringify(["Scotland Land Register", "HMLR"]),
      metadata: JSON.stringify({ approachVector: "Email → meeting request", confidence: "HIGH" }),
      isHot: false,
    },
    {
      name: "Nadia Brunetti (Private Banker)",
      type: "Gatekeeper",
      bayesianScore: 0.31,
      nationality: "Italian",
      estimatedNetWorth: null,
      knownResidences: "Deutsche Bank Private, Via Turati 25, Milan 20121",
      linkedinUrl: "https://linkedin.com/in/nadia-brunetti-db",
      phone: "+39 02 400 3841",
      email: "nadia.brunetti@db.com",
      contactMethod: "LinkedIn / Email",
      notes: "Deutsche Bank Private banker covering Friedrich von Brauer. Munich-educated, Milan-based. Active on LinkedIn. Alumni of Bocconi MBA — approach via alumni network overlap.",
      sourceRegistries: JSON.stringify(["Deutsche Bank internal (inferred)", "LinkedIn"]),
      metadata: JSON.stringify({ approachVector: "LinkedIn + Bocconi alumni", confidence: "MEDIUM" }),
      isHot: false,
    },
    {
      name: "James Okafor (Kariuki Safaris PH)",
      type: "Gatekeeper",
      bayesianScore: 0.19,
      nationality: "Kenyan",
      estimatedNetWorth: null,
      knownResidences: "Laikipia Plateau, Kenya / Nairobi off-season",
      linkedinUrl: null,
      phone: "+254 722 814 093",
      email: "james@kariukisafaris.ke",
      contactMethod: "WhatsApp",
      notes: "Professional Hunter (PH) at Kariuki Safaris. Conducts annual Big Five hunts with Edward Fitzwilliam-Holt (Laikipia concession, Jan–Feb each year). Warm, professional relationship with target. Optimal approach: Oct–Nov (pre-season booking window). WhatsApp only — never call unannounced.",
      sourceRegistries: JSON.stringify(["Kenya Wildlife Service (PH License)", "CITES records", "Laikipia Conservancy"]),
      metadata: JSON.stringify({ approachVector: "WhatsApp pre-season booking angle (Oct–Nov)", confidence: "HIGH", seasonWindow: "Oct–Nov", doNotContactDuring: "Jan–Feb (client in camp)" }),
      isHot: false,
    },
    {
      name: "Fabrizio Conti (Yacht Broker)",
      type: "Gatekeeper",
      bayesianScore: 0.25,
      nationality: "Italian",
      estimatedNetWorth: null,
      knownResidences: "Camper & Nicholsons, Port Hercule, Monaco",
      linkedinUrl: "https://linkedin.com/in/fabrizio-conti-yachts",
      phone: "+377 97 97 4412",
      email: "f.conti@campernicholsons.com",
      contactMethod: "LinkedIn / Phone",
      notes: "Senior broker at Camper & Nicholsons Monaco. Managed the 2022 sale of 'Meridian Star' to Morozov. Has ongoing service relationship. Professional confidentiality standard but receptive to industry introductions.",
      sourceRegistries: JSON.stringify(["Lloyd's IMO", "Monaco Maritime Registry"]),
      metadata: JSON.stringify({ approachVector: "Professional broker-to-broker angle", confidence: "MEDIUM" }),
      isHot: false,
    },
  ];

  const insertedEntities = await db.insert(entitiesTable).values(entityData).returning();

  // Create a lookup map
  const entityMap: Record<string, number> = {};
  for (const e of insertedEntities) {
    entityMap[e.name] = e.id;
  }

  // ── ASSETS ────────────────────────────────────────────────────────────────
  const assetData = [
    // Castellani assets
    {
      category: "RealEstate",
      identifier: "IT-FI-A2247",
      jurisdiction: "Italy Catasto",
      latitude: 43.4623,
      longitude: 11.0234,
      estimatedValue: 8_500_000,
      address: "Villa Ariana, Loc. Panzano in Chianti, 50022 Greve FI",
      description: "18th century Tuscan villa, 22 hectares, certified DOCG vineyard. Managed by Geometra Marco Ricci.",
      lastActivityDate: "2025-11-20",
      sourceRegistry: "Agenzia delle Entrate SISTER",
      ownerEntityId: entityMap["Castellani Holdings Ltd"],
    },
    {
      category: "RealEstate",
      identifier: "IT-FI-B0093",
      jurisdiction: "Italy Catasto",
      latitude: 43.7696,
      longitude: 11.2558,
      estimatedValue: 3_200_000,
      address: "Via dei Giardini Pensili 7, Florence (Oltrarno), 50125",
      description: "Historic palazzo apartment, 4th floor, 280sqm. Personal residence when in Florence.",
      lastActivityDate: "2026-02-01",
      sourceRegistry: "Agenzia delle Entrate SISTER",
      ownerEntityId: entityMap["Castellani Holdings Ltd"],
    },
    {
      category: "Marine",
      identifier: "IMO-9623440",
      jurisdiction: "Cayman Islands Ship Registry",
      latitude: 41.1196,
      longitude: 9.5342,
      estimatedValue: 4_800_000,
      address: "Slip A-14, Marina di Porto Cervo, OT 07021",
      description: "Azimut Grande 27M 'Celestina'. Moored Porto Cervo. Seasonal (May–Oct). Crew of 3.",
      lastActivityDate: "2026-05-28",
      sourceRegistry: "Cayman Islands Shipping Registry / Lloyd's",
      ownerEntityId: entityMap["Lorenzo Castellani"],
    },
    {
      category: "PrivateClub",
      identifier: "CCROMA-14032",
      jurisdiction: "Italy (Private Club)",
      latitude: 41.9034,
      longitude: 12.4797,
      estimatedValue: null,
      address: "Via dei Soldati 25, Rome 00186 — Circolo della Caccia",
      description: "Membership #14032 — Circolo della Caccia (est. 1869), Rome's most exclusive private club. Members include senior politicians, judges, industrialists.",
      lastActivityDate: "2026-01-15",
      sourceRegistry: "Club Member Roll (OSINT)",
      ownerEntityId: entityMap["Lorenzo Castellani"],
    },
    {
      category: "PrivateClub",
      identifier: "FERRARI-RDG-0047",
      jurisdiction: "Italy (Ferrari Club)",
      latitude: 45.8824,
      longitude: 10.8429,
      estimatedValue: null,
      address: "Ferrari Club Riva del Garda, Riva del Garda TN 38066",
      description: "Ferrari Club Riva del Garda membership #0047. Annual concorso d'eleganza in September. 4x Ferrari in collection (308, 550, F40, LaFerrari).",
      lastActivityDate: "2025-09-12",
      sourceRegistry: "Club Register (OSINT)",
      ownerEntityId: entityMap["Lorenzo Castellani"],
    },

    // Fitzwilliam-Holt assets
    {
      category: "RealEstate",
      identifier: "LND-10-CS-00291",
      jurisdiction: "UK HMLR",
      latitude: 51.5094,
      longitude: -0.1494,
      estimatedValue: 22_000_000,
      address: "14 Charles Street, London W1J 5AB (Mayfair)",
      description: "Grade I listed Mayfair townhouse, 6,400 sqft, 7 bed/6 bath. Freehold. Last transaction 2014.",
      lastActivityDate: "2026-03-10",
      sourceRegistry: "HM Land Registry",
      ownerEntityId: entityMap["Fitzwilliam Family Trust"],
    },
    {
      category: "Aviation",
      identifier: "G-FWHL",
      jurisdiction: "UK CAA G-Register",
      latitude: 51.4775,
      longitude: -0.4614,
      estimatedValue: 68_000_000,
      address: "Signature Aviation, Heathrow Terminal 5 side, TW6 2GX",
      description: "Gulfstream G700. UK CAA registered G-FWHL. Owner: Fitzwilliam Family Trust. Based LHR T5, occasional SNN (Shannon).",
      lastActivityDate: "2026-06-15",
      sourceRegistry: "UK CAA G-Register",
      ownerEntityId: entityMap["Fitzwilliam Family Trust"],
    },
    {
      category: "RealEstate",
      identifier: "SCOT-PH-1-CS-04421",
      jurisdiction: "Scotland Land Register",
      latitude: 56.7034,
      longitude: -3.8291,
      estimatedValue: 9_500_000,
      address: "Fitzwilliam Estate, Glen Tilt, Perthshire PH1 3EG",
      description: "8,500-acre Highland sporting estate. Red deer stalking, grouse moors, 3 salmon beats. Managed by Hamish MacAlpine.",
      lastActivityDate: "2025-10-30",
      sourceRegistry: "Registers of Scotland",
      ownerEntityId: entityMap["Fitzwilliam Family Trust"],
    },
    {
      category: "PrivateClub",
      identifier: "BOODLES-F-2047",
      jurisdiction: "UK (Private Club)",
      latitude: 51.5076,
      longitude: -0.1424,
      estimatedValue: null,
      address: "28 St. James's Street, London SW1A 1HJ — Boodle's",
      description: "Boodle's Club, St. James's. Membership F-2047. Also member: Pratt's Club (Duke of Devonshire's). Application pending: White's.",
      lastActivityDate: "2026-06-01",
      sourceRegistry: "Club Roll (OSINT / Alumni Network)",
      ownerEntityId: entityMap["Edward Fitzwilliam-Holt"],
    },

    // Morozov assets
    {
      category: "Marine",
      identifier: "IMO-9723441",
      jurisdiction: "Cayman Islands Ship Registry",
      latitude: 43.7310,
      longitude: 7.4197,
      estimatedValue: 32_000_000,
      address: "Berth 42, Port Hercule, Monaco 98000",
      description: "72m CRN superyacht 'Meridian Star'. Crew of 14. Seasonal base Monaco/Porto Montenegro. Managed by Meridian Star Yachting Ltd.",
      lastActivityDate: "2026-06-10",
      sourceRegistry: "Lloyd's IMO Register / Cayman Islands",
      ownerEntityId: entityMap["Alexei Morozov"],
    },
    {
      category: "RealEstate",
      identifier: "CY-LIM-2019-0311",
      jurisdiction: "Cyprus Land Registry",
      latitude: 34.6786,
      longitude: 33.0413,
      estimatedValue: 6_200_000,
      address: "Villa Poseidon, Limassol Marina, CY-3040",
      description: "Cyprus Golden Visa scheme asset. 4-bed villa, direct marina access. Registered via Morozov Limassol Holdings Ltd (Cyprus APMS-registered).",
      lastActivityDate: "2025-12-15",
      sourceRegistry: "Department of Lands and Surveys Cyprus",
      ownerEntityId: entityMap["Alexei Morozov"],
    },

    // Whitmore assets
    {
      category: "RealEstate",
      identifier: "FL-DAD-2020-001234",
      jurisdiction: "US — Miami-Dade County",
      latitude: 25.7897,
      longitude: -80.1303,
      estimatedValue: 45_000_000,
      address: "100 South Biscayne Blvd, Miami FL 33131 (Penthouse)",
      description: "Full-floor penthouse, Brickell, 12,000 sqft. Purchased 2020 via Whitmore Capital RE LLC.",
      lastActivityDate: "2026-04-20",
      sourceRegistry: "Miami-Dade County Property Appraiser",
      ownerEntityId: entityMap["Whitmore Capital Group LLC"],
    },
    {
      category: "Aviation",
      identifier: "N-WHTMR",
      jurisdiction: "FAA US Registry",
      latitude: 25.7959,
      longitude: -80.2870,
      estimatedValue: 55_000_000,
      address: "Signature Aviation, Miami Executive Airport KTMB",
      description: "Bombardier Global 7500. FAA N-WHTMR. Owner: Bradford Whitmore III Trust. Home base MIA, frequent TEB (Teterboro).",
      lastActivityDate: "2026-06-08",
      sourceRegistry: "FAA Aircraft Registry (aircraft.faa.gov)",
      ownerEntityId: entityMap["Bradford Whitmore III"],
    },

    // Von Brauer assets
    {
      category: "RealEstate",
      identifier: "IT-CO-2018-A0091",
      jurisdiction: "Italy Catasto",
      latitude: 45.9766,
      longitude: 9.2544,
      estimatedValue: 5_800_000,
      address: "Via Lungolario Trento 12, Menaggio, CO 22017 — Lake Como",
      description: "Art Nouveau lakefront villa, 8 bedrooms, private pier, boathouse. Registered via German-Italian LLC structure.",
      lastActivityDate: "2025-08-10",
      sourceRegistry: "Agenzia delle Entrate SISTER / Conservatoria",
      ownerEntityId: entityMap["Friedrich von Brauer"],
    },
  ];

  const insertedAssets = await db.insert(assetsTable).values(assetData).returning();
  const assetMap: Record<string, number> = {};
  for (const a of insertedAssets) {
    assetMap[`${a.category}:${a.identifier}`] = a.id;
  }

  // ── RELATIONSHIPS ─────────────────────────────────────────────────────────
  const relData = [
    // Castellani → his assets (via shell company)
    { sourceEntityId: entityMap["Lorenzo Castellani"]!, targetId: entityMap["Castellani Holdings Ltd"]!, targetType: "Entity", relationshipType: "OWNS", strength: 1.0, notes: "Beneficial owner confirmed via Companies House PSC register" },
    { sourceEntityId: entityMap["Castellani Holdings Ltd"]!, targetId: assetMap["RealEstate:IT-FI-A2247"]!, targetType: "Asset", relationshipType: "OWNS", strength: 1.0, notes: "Registered owner in Catasto" },
    { sourceEntityId: entityMap["Castellani Holdings Ltd"]!, targetId: assetMap["RealEstate:IT-FI-B0093"]!, targetType: "Asset", relationshipType: "OWNS", strength: 1.0, notes: "Registered owner in Catasto" },
    { sourceEntityId: entityMap["Lorenzo Castellani"]!, targetId: assetMap["Marine:IMO-9623440"]!, targetType: "Asset", relationshipType: "OWNS", strength: 0.95, notes: "Cayman registry owner" },
    { sourceEntityId: entityMap["Lorenzo Castellani"]!, targetId: assetMap["PrivateClub:CCROMA-14032"]!, targetType: "Asset", relationshipType: "MEMBER_OF", strength: 0.9 },
    { sourceEntityId: entityMap["Lorenzo Castellani"]!, targetId: assetMap["PrivateClub:FERRARI-RDG-0047"]!, targetType: "Asset", relationshipType: "MEMBER_OF", strength: 0.9 },
    // Geometra manages villa
    { sourceEntityId: entityMap["Marco Ricci (Geometra)"]!, targetId: assetMap["RealEstate:IT-FI-A2247"]!, targetType: "Asset", relationshipType: "GEOMETRA_FOR", strength: 0.98, notes: "Licensed geometra — confirmed via Albo dei Geometri FI" },
    { sourceEntityId: entityMap["Marco Ricci (Geometra)"]!, targetId: entityMap["Lorenzo Castellani"]!, targetType: "Entity", relationshipType: "MANAGES", strength: 0.85 },

    // Fitzwilliam-Holt → Trust → assets
    { sourceEntityId: entityMap["Edward Fitzwilliam-Holt"]!, targetId: entityMap["Fitzwilliam Family Trust"]!, targetType: "Entity", relationshipType: "OWNS", strength: 1.0, notes: "Settlor and beneficiary of Cayman trust" },
    { sourceEntityId: entityMap["Fitzwilliam Family Trust"]!, targetId: assetMap["RealEstate:LND-10-CS-00291"]!, targetType: "Asset", relationshipType: "OWNS", strength: 1.0 },
    { sourceEntityId: entityMap["Fitzwilliam Family Trust"]!, targetId: assetMap["Aviation:G-FWHL"]!, targetType: "Asset", relationshipType: "OWNS", strength: 1.0 },
    { sourceEntityId: entityMap["Fitzwilliam Family Trust"]!, targetId: assetMap["RealEstate:SCOT-PH-1-CS-04421"]!, targetType: "Asset", relationshipType: "OWNS", strength: 1.0 },
    { sourceEntityId: entityMap["Edward Fitzwilliam-Holt"]!, targetId: assetMap["PrivateClub:BOODLES-F-2047"]!, targetType: "Asset", relationshipType: "MEMBER_OF", strength: 0.95 },
    // Gatekeepers
    { sourceEntityId: entityMap["Hamish MacAlpine (Estate Manager)"]!, targetId: assetMap["RealEstate:SCOT-PH-1-CS-04421"]!, targetType: "Asset", relationshipType: "MANAGES", strength: 0.99 },
    { sourceEntityId: entityMap["Hamish MacAlpine (Estate Manager)"]!, targetId: entityMap["Edward Fitzwilliam-Holt"]!, targetType: "Entity", relationshipType: "MANAGES", strength: 0.85 },
    { sourceEntityId: entityMap["James Okafor (Kariuki Safaris PH)"]!, targetId: entityMap["Edward Fitzwilliam-Holt"]!, targetType: "Entity", relationshipType: "KNOWN_ASSOCIATE", strength: 0.75, notes: "Annual hunting client — Laikipia concession, Jan/Feb" },

    // Morozov → assets → yacht management
    { sourceEntityId: entityMap["Alexei Morozov"]!, targetId: assetMap["Marine:IMO-9723441"]!, targetType: "Asset", relationshipType: "OWNS", strength: 1.0 },
    { sourceEntityId: entityMap["Alexei Morozov"]!, targetId: assetMap["RealEstate:CY-LIM-2019-0311"]!, targetType: "Asset", relationshipType: "OWNS", strength: 1.0 },
    { sourceEntityId: entityMap["Meridian Star Yachting Ltd"]!, targetId: assetMap["Marine:IMO-9723441"]!, targetType: "Asset", relationshipType: "MANAGES", strength: 0.99 },
    { sourceEntityId: entityMap["Meridian Star Yachting Ltd"]!, targetId: entityMap["Alexei Morozov"]!, targetType: "Entity", relationshipType: "MANAGES", strength: 0.8, notes: "Yacht management company — Captain and crew have direct contact" },
    { sourceEntityId: entityMap["Fabrizio Conti (Yacht Broker)"]!, targetId: assetMap["Marine:IMO-9723441"]!, targetType: "Asset", relationshipType: "MANAGES", strength: 0.6, notes: "Sold the vessel in 2022 — maintains service relationship" },
    { sourceEntityId: entityMap["Fabrizio Conti (Yacht Broker)"]!, targetId: entityMap["Alexei Morozov"]!, targetType: "Entity", relationshipType: "MANAGES", strength: 0.55 },

    // Whitmore → assets
    { sourceEntityId: entityMap["Bradford Whitmore III"]!, targetId: entityMap["Whitmore Capital Group LLC"]!, targetType: "Entity", relationshipType: "OWNS", strength: 1.0 },
    { sourceEntityId: entityMap["Whitmore Capital Group LLC"]!, targetId: assetMap["RealEstate:FL-DAD-2020-001234"]!, targetType: "Asset", relationshipType: "OWNS", strength: 1.0 },
    { sourceEntityId: entityMap["Bradford Whitmore III"]!, targetId: assetMap["Aviation:N-WHTMR"]!, targetType: "Asset", relationshipType: "OWNS", strength: 1.0 },

    // Von Brauer → assets
    { sourceEntityId: entityMap["Friedrich von Brauer"]!, targetId: assetMap["RealEstate:IT-CO-2018-A0091"]!, targetType: "Asset", relationshipType: "OWNS", strength: 1.0 },
    { sourceEntityId: entityMap["Nadia Brunetti (Private Banker)"]!, targetId: entityMap["Friedrich von Brauer"]!, targetType: "Entity", relationshipType: "MANAGES", strength: 0.7, notes: "DB Private banker confirmed via industry intel" },

    // Cross-network relationships (shared gatekeepers / common nodes)
    { sourceEntityId: entityMap["Lorenzo Castellani"]!, targetId: entityMap["Edward Fitzwilliam-Holt"]!, targetType: "Entity", relationshipType: "KNOWN_ASSOCIATE", strength: 0.45, notes: "Both attend Ferrari Club Riva del Garda annual concorso" },
  ].filter(r => r.sourceEntityId && r.targetId);

  await db.insert(relationshipsTable).values(relData as any[]);

  // ── RESEARCH SESSIONS (sample CRM data) ──────────────────────────────────
  const castellaniId = entityMap["Lorenzo Castellani"]!;
  const fitzwilliamId = entityMap["Edward Fitzwilliam-Holt"]!;

  await db.insert(researchSessionsTable).values([
    {
      targetEntityId: castellaniId,
      winningPath: JSON.stringify([
        { vertexId: `e:${entityMap["Marco Ricci (Geometra)"]}`, label: "Marco Ricci (Geometra)", nodeType: "Gatekeeper", role: "GATEKEEPER", registry: "Italy Catasto", actionRequired: "Direct approach via WhatsApp with referral commission offer (5-10%)" },
        { vertexId: `a:${assetMap["RealEstate:IT-FI-A2247"]}`, label: "Villa Ariana (IT-FI-A2247)", nodeType: "RealEstate", role: "ASSET", registry: "Agenzia delle Entrate SISTER" },
        { vertexId: `e:${castellaniId}`, label: "Lorenzo Castellani", nodeType: "HNWI", role: "TARGET" },
      ]),
      mctsSteps: JSON.stringify([
        { step: 1, action: "TARGET IDENTIFIED", registry: "Italy Catasto / Lloyd's IMO", target: "Lorenzo Castellani", targetType: "HNWI", uctScore: 1.0, warmthScore: 0.35, reasoning: "Target confirmed: Lorenzo Castellani. Bayesian score 89%. Direct approach is NOT recommended — gatekeeper contact must precede any HNWI touchpoint." },
        { step: 2, action: "PATH NODE", registry: "Agenzia delle Entrate SISTER", target: "Villa Ariana (IT-FI-A2247)", targetType: "RealEstate", uctScore: 0.847, warmthScore: 0.72, reasoning: "Catasto parcel record maps Villa Ariana to Castellani Holdings Ltd (UK shell). The registered geometra serves as the logical warm-introduction point — they have daily contact with the property owner." },
        { step: 3, action: "GATEKEEPER LOCKED", registry: "Albo dei Geometri Firenze", target: "Marco Ricci (Geometra)", targetType: "Gatekeeper", uctScore: 0.931, warmthScore: 0.89, reasoning: "Marco Ricci is a licensed geometra (FI/14732) with confirmed weekly contact with Lorenzo Castellani. WhatsApp approach standard in Italian property sector. 5% referral commission offer appropriate and expected." },
      ]),
      generatedPitch: null,
      crmStatus: "MCTS Path Selected",
      bayesianScoreAtRuntime: 0.89,
      pathScore: 0.76,
    },
    {
      targetEntityId: fitzwilliamId,
      winningPath: JSON.stringify([
        { vertexId: `e:${entityMap["James Okafor (Kariuki Safaris PH)"]}`, label: "James Okafor (Kariuki Safaris PH)", nodeType: "Gatekeeper", role: "GATEKEEPER", registry: "Kenya Wildlife Service", actionRequired: "WhatsApp + upcoming season booking angle" },
        { vertexId: `e:${fitzwilliamId}`, label: "Edward Fitzwilliam-Holt", nodeType: "HNWI", role: "TARGET" },
      ]),
      mctsSteps: JSON.stringify([
        { step: 1, action: "TARGET IDENTIFIED", registry: "HMLR / FAA/CAA", target: "Edward Fitzwilliam-Holt", targetType: "HNWI", uctScore: 1.0, warmthScore: 0.28, reasoning: "Target confirmed: Edward Fitzwilliam-Holt. Bayesian score 92% (APEX tier). Old money + active PE deployment. Multiple gatekeeper vectors identified." },
        { step: 2, action: "GATEKEEPER LOCKED", registry: "Kenya Wildlife Service (PH License)", target: "James Okafor (Kariuki Safaris PH)", targetType: "Gatekeeper", uctScore: 0.912, warmthScore: 0.84, reasoning: "Professional Hunter Okafor has annual contact with Fitzwilliam-Holt across 3-4 week January hunting block in Laikipia. Safari industry standard: PH manages all communications during camp. WhatsApp approach during off-season (Oct-Nov) optimal timing." },
      ]),
      generatedPitch: null,
      crmStatus: "Identified",
      bayesianScoreAtRuntime: 0.92,
      pathScore: 0.84,
    },
  ]);
}

/**
 * Extended seed: adds 12 additional HNWI private-jet owners not in the base seed.
 * Idempotent — checks by entity name before inserting.
 */
export async function seedExtendedData(): Promise<void> {
  const existing = await db.select({ name: entitiesTable.name }).from(entitiesTable);
  const existingNames = new Set(existing.map((e) => e.name));

  // ── New HNWI targets ────────────────────────────────────────────────────────
  const newHnwi = [
    {
      name: "Nikolaos Papadimitriou",
      type: "HNWI",
      bayesianScore: 0.88,
      nationality: "Greek",
      estimatedNetWorth: 450_000_000,
      knownResidences: "Athens, GR (Kifissia) / Monaco / Piraeus",
      linkedinUrl: null,
      phone: null,
      email: null,
      contactMethod: "FBO Staff / Yacht broker",
      notes: "Third-generation shipping dynasty. Owns Papadimitriou Maritime Group. G650ER registered SX-PGM, based at Athens Executive Airport LGAT. Piraeus marina slip G-21 for 58m Feadship 'Poseidon'. Member: Athens Yacht Club.",
      sourceRegistries: JSON.stringify(["HCAA Greek Aviation", "Lloyd's IMO", "Athens Commercial Registry"]),
      metadata: JSON.stringify({ confidence: "HIGH", lastVerified: "2026-05-20" }),
      isHot: true,
    },
    {
      name: "Charlotte Pemberton-Smythe",
      type: "HNWI",
      bayesianScore: 0.79,
      nationality: "British",
      estimatedNetWorth: 180_000_000,
      knownResidences: "London, UK (Belgravia) / Barbados / Edinburgh",
      linkedinUrl: null,
      phone: null,
      email: null,
      contactMethod: "Estate Manager / Club Secretary",
      notes: "Old money heiress. Dassault Falcon 8X, UK CAA G-CPBS, based Farnborough EGLF. Codford Park estate (Wiltshire). Member: Annabel's, The Arts Club. Annual winter in Barbados (Sandy Lane).",
      sourceRegistries: JSON.stringify(["UK CAA G-Register", "HMLR", "Companies House UK"]),
      metadata: JSON.stringify({ confidence: "MEDIUM", lastVerified: "2026-04-11" }),
      isHot: false,
    },
    {
      name: "Carlos Ibáñez Varela",
      type: "HNWI",
      bayesianScore: 0.91,
      nationality: "Chilean",
      estimatedNetWorth: 650_000_000,
      knownResidences: "Santiago, CL / Miami, FL / Madrid, ES",
      linkedinUrl: "https://linkedin.com/in/carlos-ibanez-varela",
      phone: null,
      email: null,
      contactMethod: "Family Office (Varela Capital, Brickell)",
      notes: "Mining billionaire (copper/lithium). Bombardier Global 7500 N-IVCH, based KMIA Miami. Madrid Salamanca penthouse. Varela Capital Family Office in Brickell. LP in several European PE funds.",
      sourceRegistries: JSON.stringify(["FAA Registry", "SEC EDGAR", "Registro de Aeronaves Chile"]),
      metadata: JSON.stringify({ confidence: "APEX", lastVerified: "2026-06-10" }),
      isHot: true,
    },
    {
      name: "Rashid Al-Mansouri",
      type: "HNWI",
      bayesianScore: 0.94,
      nationality: "Emirati",
      estimatedNetWorth: 1_200_000_000,
      knownResidences: "Dubai, UAE / London, UK / Geneva, CH",
      linkedinUrl: null,
      phone: null,
      email: null,
      contactMethod: "Protocol Office / Wealth Manager",
      notes: "UAE royal-adjacent. Al-Mansouri family: Abu Dhabi Investment Office associate. Boeing BBJ2 A6-RMN, based Dubai DWC (Al Maktoum). 58m Gulf Craft superyacht 'Al Nour' (Dubai Marina). Frequent London private members.",
      sourceRegistries: JSON.stringify(["UAE GCAA", "Dubai Land Department", "Lloyd's IMO"]),
      metadata: JSON.stringify({ confidence: "HIGH", lastVerified: "2026-05-03" }),
      isHot: true,
    },
    {
      name: "Gianluca Ferretti",
      type: "HNWI",
      bayesianScore: 0.76,
      nationality: "Italian",
      estimatedNetWorth: 220_000_000,
      knownResidences: "Milan, IT / Porto Cervo, IT / Ibiza, ES",
      linkedinUrl: "https://linkedin.com/in/gianluca-ferretti-luxe",
      phone: null,
      email: null,
      contactMethod: "Yacht Captain / Fashion Network",
      notes: "Italian fashion-to-luxury empire (PE minority exit 2022). Pilatus PC-24 I-GFER, based Milan Linate LIML. 42m Riva 'Dolce Vita' (Porto Cervo). Ibiza summer residence via Ferretti RE SL.",
      sourceRegistries: JSON.stringify(["ENAC Italy", "Italy Catasto", "Lloyd's IMO"]),
      metadata: JSON.stringify({ confidence: "HIGH", lastVerified: "2026-04-28" }),
      isHot: false,
    },
    {
      name: "Patrick Beaumont",
      type: "HNWI",
      bayesianScore: 0.83,
      nationality: "French",
      estimatedNetWorth: 380_000_000,
      knownResidences: "Paris, FR (16ème) / Cannes, FR / Geneva, CH",
      linkedinUrl: null,
      phone: null,
      email: null,
      contactMethod: "Private Banker / FBO Staff",
      notes: "French luxury goods conglomerate (3rd gen). Dassault Falcon 2000LXS F-HPBA, based Le Bourget LFPB. Cap d'Antibes villa (Beaumont Patrimoine SAS). Frequents Hotel du Cap-Eden-Roc (May–August).",
      sourceRegistries: JSON.stringify(["DGAC France", "Registre Foncier FR", "Infogreffe"]),
      metadata: JSON.stringify({ confidence: "HIGH", lastVerified: "2026-03-22" }),
      isHot: false,
    },
    {
      name: "Magnus Eriksson",
      type: "HNWI",
      bayesianScore: 0.72,
      nationality: "Swedish",
      estimatedNetWorth: 160_000_000,
      knownResidences: "Stockholm, SE / London, UK / Lisbon, PT",
      linkedinUrl: "https://linkedin.com/in/magnus-eriksson-tech",
      phone: null,
      email: null,
      contactMethod: "LinkedIn / VC Network",
      notes: "Fintech exit (iZettle-adjacent, 2021 ~$120M). Active angel/LP. Embraer Phenom 300E SE-RME, based Bromma ESSB. Lisbon NHR tax scheme since 2022 — Bairro Alto apartment via Swedish LLC.",
      sourceRegistries: JSON.stringify(["Swedish CAA (Transportstyrelsen)", "Bolagsverket SE", "IRN Portugal"]),
      metadata: JSON.stringify({ confidence: "MEDIUM", lastVerified: "2026-02-14" }),
      isHot: false,
    },
    {
      name: "Tomas Kruger",
      type: "HNWI",
      bayesianScore: 0.85,
      nationality: "South African",
      estimatedNetWorth: 290_000_000,
      knownResidences: "Cape Town, ZA / London, UK (Knightsbridge) / Franschhoek, ZA",
      linkedinUrl: null,
      phone: null,
      email: null,
      contactMethod: "Mining Network / Private Banker",
      notes: "South African mining (platinum/chrome). Bombardier Global 6000 ZS-TKR, based Cape Town FACT. Knightsbridge mews via Kruger London Investments Ltd. Franschhoek wine estate — premium Cabernet Franc.",
      sourceRegistries: JSON.stringify(["SACAA", "UK CAA", "HMLR", "South Africa CIPC"]),
      metadata: JSON.stringify({ confidence: "HIGH", lastVerified: "2026-05-17" }),
      isHot: true,
    },
    {
      name: "Valentina Rosso",
      type: "HNWI",
      bayesianScore: 0.77,
      nationality: "American",
      estimatedNetWorth: 195_000_000,
      knownResidences: "New York, NY (Tribeca) / Rome, IT / Amalfi, IT",
      linkedinUrl: null,
      phone: null,
      email: null,
      contactMethod: "Art Dealer / Family Office",
      notes: "Italian-American heiress (pharma fortune). Citation Longitude N-VRL, based Teterboro KTEB. Rome Parioli apartment (Rosso Family Trust). Amalfi cliff villa IT-SA-B1102. Active Art Basel circuit.",
      sourceRegistries: JSON.stringify(["FAA Registry", "Italy Catasto", "SEC EDGAR"]),
      metadata: JSON.stringify({ confidence: "MEDIUM", lastVerified: "2026-01-30" }),
      isHot: false,
    },
    {
      name: "Henrik Bauer",
      type: "HNWI",
      bayesianScore: 0.69,
      nationality: "German",
      estimatedNetWorth: 140_000_000,
      knownResidences: "Munich, DE / Málaga, ES / Sylt, DE",
      linkedinUrl: "https://linkedin.com/in/henrik-bauer-pharma",
      phone: null,
      email: null,
      contactMethod: "Deutsche Bank Private / LinkedIn",
      notes: "German pharma family (sold division 2019 to Bayer). Cessna Citation X+ D-CBAU, based Munich EDDM. Málaga Nueva Andalucía villa (La Zagaleta estate). Sylt island summer property.",
      sourceRegistries: JSON.stringify(["Luftfahrtbundesamt LBA DE", "Spain Property Registry", "Handelsregister DE"]),
      metadata: JSON.stringify({ confidence: "MEDIUM", lastVerified: "2026-03-05" }),
      isHot: false,
    },
    {
      name: "Sebastião Monteiro",
      type: "HNWI",
      bayesianScore: 0.87,
      nationality: "Brazilian",
      estimatedNetWorth: 520_000_000,
      knownResidences: "São Paulo, BR / Lisbon, PT / Miami, FL",
      linkedinUrl: null,
      phone: null,
      email: null,
      contactMethod: "Family Office / Private Banker",
      notes: "Brazilian commodity trader (soy/cotton). Gulfstream G550 PR-MBR, based Congonhas CGH. Lisbon Golden Visa via Monteiro Investimentos Lda — Chiado district. Miami Beach compound (Star Island).",
      sourceRegistries: JSON.stringify(["ANAC Brazil", "IRN Portugal", "Miami-Dade Property"]),
      metadata: JSON.stringify({ confidence: "HIGH", lastVerified: "2026-06-02" }),
      isHot: true,
    },
    {
      name: "Beatrix van der Berg",
      type: "HNWI",
      bayesianScore: 0.74,
      nationality: "Dutch",
      estimatedNetWorth: 270_000_000,
      knownResidences: "Amsterdam, NL / Ibiza, ES / Geneva, CH",
      linkedinUrl: null,
      phone: null,
      email: null,
      contactMethod: "Art Network / Wealth Manager",
      notes: "Dutch-Belgian inherited industrial fortune (chemicals/steel). PC-12 PH-BVB, based Schiphol EHAM. Ibiza Cala Tarida villa (van der Berg Ibiza BV). Patron: Stedelijk Museum Amsterdam.",
      sourceRegistries: JSON.stringify(["Dutch CAA (RDW / Divisie Luchtvaart)", "Spanish Property Registry", "Dutch Chamber of Commerce"]),
      metadata: JSON.stringify({ confidence: "MEDIUM", lastVerified: "2026-04-07" }),
      isHot: false,
    },
  ].filter((e) => !existingNames.has(e.name));

  if (newHnwi.length === 0) return; // all already present

  const insertedHnwi = await db.insert(entitiesTable).values(newHnwi).returning();
  const hMap: Record<string, number> = {};
  for (const e of insertedHnwi) hMap[e.name] = e.id;

  // ── New gatekeepers ───────────────────────────────────────────────────────
  const newGatekeepers = [
    {
      name: "Stavros Petrakis (FBO Manager LGAT)",
      type: "Gatekeeper",
      bayesianScore: 0.21,
      nationality: "Greek",
      estimatedNetWorth: null,
      knownResidences: "Athens Executive Airport, Spata GR",
      linkedinUrl: null,
      phone: "+30 210 353 6600",
      email: "ops@athensfbo.gr",
      contactMethod: "WhatsApp",
      notes: "FBO manager at Athens Executive (LGAT). Handles SX-PGM ground ops for Papadimitriou. Direct access to owner arrival/departure schedule. WhatsApp: open to referrals from aviation professionals.",
      sourceRegistries: JSON.stringify(["HCAA", "Local Intel"]),
      metadata: JSON.stringify({ approachVector: "FBO professional angle — aviation-to-aviation introduction", seasonWindow: "Year-round", confidence: "HIGH" }),
      isHot: false,
    },
    {
      name: "Elena Vargas (Varela Capital COO)",
      type: "Gatekeeper",
      bayesianScore: 0.29,
      nationality: "Chilean",
      estimatedNetWorth: null,
      knownResidences: "1001 Brickell Bay Drive, Miami FL 33131",
      linkedinUrl: "https://linkedin.com/in/elena-vargas-varela",
      phone: "+1 305 555 0199",
      email: "e.vargas@varelacapital.com",
      contactMethod: "LinkedIn / Email",
      notes: "COO of Varela Capital Family Office. Harvard MBA. Manages LP relationship pipeline for Carlos Ibáñez. Professional approach via deal-flow sharing angle. Not reachable by phone cold — email + LinkedIn only.",
      sourceRegistries: JSON.stringify(["SEC EDGAR", "LinkedIn", "Florida SoS"]),
      metadata: JSON.stringify({ approachVector: "LinkedIn + deal flow co-investment angle", confidence: "HIGH" }),
      isHot: false,
    },
    {
      name: "Diogo Pires (FBO Ops Congonhas)",
      type: "Gatekeeper",
      bayesianScore: 0.17,
      nationality: "Brazilian",
      estimatedNetWorth: null,
      knownResidences: "Aeroporto Campo de Marte, São Paulo SP",
      linkedinUrl: null,
      phone: "+55 11 5090 9000",
      email: "diogo.pires@execflight.com.br",
      contactMethod: "WhatsApp",
      notes: "Ground ops at Congonhas Executive Terminal for PR-MBR (Monteiro). Provides catering, ground transport, FBO coordination. WhatsApp preferred. Seasonal: active when jet in São Paulo.",
      sourceRegistries: JSON.stringify(["ANAC Brazil", "Local Intel"]),
      metadata: JSON.stringify({ approachVector: "FBO angle — aviation professional intro", confidence: "MEDIUM" }),
      isHot: false,
    },
    {
      name: "William Frost (Sloane Square Art Advisor)",
      type: "Gatekeeper",
      bayesianScore: 0.24,
      nationality: "British",
      estimatedNetWorth: null,
      knownResidences: "Sloane Square, London SW1W 8AP",
      linkedinUrl: "https://linkedin.com/in/william-frost-art",
      phone: "+44 7911 234567",
      email: "wf@frostartadvisory.com",
      contactMethod: "Email / LinkedIn",
      notes: "Art advisor to Kruger collection. Based Sloane Square. Manages Knightsbridge property art installation. Approachable for peer introductions in the wealth-adjacent arts space.",
      sourceRegistries: JSON.stringify(["LinkedIn", "Companies House UK"]),
      metadata: JSON.stringify({ approachVector: "Arts/cultural connection — peer introduction angle", confidence: "MEDIUM" }),
      isHot: false,
    },
  ].filter((e) => !existingNames.has(e.name));

  if (newGatekeepers.length > 0) {
    const insertedGk = await db.insert(entitiesTable).values(newGatekeepers).returning();
    for (const e of insertedGk) hMap[e.name] = e.id;
  }

  // ── New aviation + real estate assets ─────────────────────────────────────
  const newAssets = [
    // Papadimitriou
    { category: "Aviation", identifier: "SX-PGM", jurisdiction: "HCAA Greek Aviation Register", latitude: 37.9897, longitude: 23.7444, estimatedValue: 62_000_000, address: "Athens Executive Airport LGAT, Spata GR", description: "Gulfstream G650ER. Owner: Papadimitriou Maritime Group SA. Based Athens, frequent Geneva (LSGG) and Nicosia (LCLK).", lastActivityDate: "2026-06-14", sourceRegistry: "HCAA / Eurocontrol", ownerEntityId: hMap["Nikolaos Papadimitriou"] },
    { category: "Marine", identifier: "IMO-9781203", jurisdiction: "Marshall Islands Ship Registry", latitude: 37.9432, longitude: 23.6497, estimatedValue: 28_000_000, address: "Berth G-21, Piraeus Marina GR", description: "58m Feadship 'Poseidon'. Crew 11. Seasonal: Piraeus/Aegean (May–Oct), Maldives (Nov–Feb).", lastActivityDate: "2026-06-18", sourceRegistry: "Lloyd's IMO", ownerEntityId: hMap["Nikolaos Papadimitriou"] },
    { category: "RealEstate", identifier: "GR-ATH-KIFI-2021-0041", jurisdiction: "Greek Property Registry", latitude: 38.0742, longitude: 23.8209, estimatedValue: 7_400_000, address: "Vas. Georgiou B' 14, Kifissia, Athens GR 14562", description: "Neoclassical villa, Kifissia. Registered: Papadimitriou Family Foundation.", lastActivityDate: "2026-01-10", sourceRegistry: "Greek Ktimatologio", ownerEntityId: hMap["Nikolaos Papadimitriou"] },
    // Ibáñez Varela
    { category: "Aviation", identifier: "N-IVCH", jurisdiction: "FAA US Registry", latitude: 25.7959, longitude: -80.2870, estimatedValue: 72_000_000, address: "Signature Aviation, Miami Executive Airport KTMB", description: "Bombardier Global 7500. Owner: Varela Chile Holdings LLC. Home base MIA, frequent MAD.", lastActivityDate: "2026-06-12", sourceRegistry: "FAA Aircraft Registry", ownerEntityId: hMap["Carlos Ibáñez Varela"] },
    { category: "RealEstate", identifier: "ES-MAD-2022-0087", jurisdiction: "Spain Property Registry", latitude: 40.4326, longitude: -3.6927, estimatedValue: 9_800_000, address: "Calle de Serrano 102, Madrid 28006 — Salamanca District", description: "Luxury penthouse, 650sqm, rooftop terrace. Via Varela Spain SLU.", lastActivityDate: "2026-03-20", sourceRegistry: "Registro de la Propiedad Madrid", ownerEntityId: hMap["Carlos Ibáñez Varela"] },
    // Al-Mansouri
    { category: "Aviation", identifier: "A6-RMN", jurisdiction: "UAE GCAA Register", latitude: 24.8960, longitude: 55.1612, estimatedValue: 98_000_000, address: "Al Maktoum International Airport, Dubai South DWC", description: "Boeing BBJ2 (737-800 VVIP). Owner: Al-Mansouri Aviation LLC. Based DWC, frequent LHR and GVA.", lastActivityDate: "2026-06-20", sourceRegistry: "UAE GCAA", ownerEntityId: hMap["Rashid Al-Mansouri"] },
    { category: "Marine", identifier: "IMO-9844291", jurisdiction: "Cayman Islands Ship Registry", latitude: 25.0782, longitude: 55.1385, estimatedValue: 45_000_000, address: "Dubai Marina Yacht Club, Berth P-07", description: "58m Gulf Craft 'Al Nour'. Crew 13. UAE-based, Red Sea season (Oct–Mar).", lastActivityDate: "2026-06-05", sourceRegistry: "Lloyd's IMO", ownerEntityId: hMap["Rashid Al-Mansouri"] },
    // Ferretti
    { category: "Aviation", identifier: "I-GFER", jurisdiction: "ENAC Italy", latitude: 45.4456, longitude: 9.2780, estimatedValue: 11_000_000, address: "Milan Linate LIML — Executive Terminal", description: "Pilatus PC-24. Owner: Ferretti Aero SRL. Based Linate. Frequent OLB (Olbia) summer.", lastActivityDate: "2026-05-30", sourceRegistry: "ENAC Italian Civil Aviation Register", ownerEntityId: hMap["Gianluca Ferretti"] },
    { category: "Marine", identifier: "IMO-9651180", jurisdiction: "Cayman Islands Ship Registry", latitude: 41.1196, longitude: 9.5342, estimatedValue: 8_500_000, address: "Marina di Porto Cervo, Slip B-07, OT 07021", description: "42m Riva 'Dolce Vita'. Seasonal: Porto Cervo (Jun–Sep), Ibiza (May, Oct).", lastActivityDate: "2026-06-22", sourceRegistry: "Lloyd's IMO", ownerEntityId: hMap["Gianluca Ferretti"] },
    // Beaumont
    { category: "Aviation", identifier: "F-HPBA", jurisdiction: "DGAC France", latitude: 48.9695, longitude: 2.4469, estimatedValue: 38_000_000, address: "Signature FBO, Le Bourget LFPB, Paris", description: "Dassault Falcon 2000LXS. Owner: Beaumont Aviation SAS. Based Le Bourget. Frequent NCE and GVA.", lastActivityDate: "2026-06-19", sourceRegistry: "DGAC France Aviation Register", ownerEntityId: hMap["Patrick Beaumont"] },
    { category: "RealEstate", identifier: "FR-AM-2018-00291", jurisdiction: "France — Alpes-Maritimes", latitude: 43.5513, longitude: 7.0128, estimatedValue: 18_000_000, address: "Cap d'Antibes, La Garoupe Beach Road, 06160", description: "Villa La Beaumont, Cap d'Antibes. 1.2ha, private beach. Beaumont Patrimoine SAS.", lastActivityDate: "2026-05-15", sourceRegistry: "Service de Publicité Foncière", ownerEntityId: hMap["Patrick Beaumont"] },
    // Eriksson
    { category: "Aviation", identifier: "SE-RME", jurisdiction: "Swedish CAA Transportstyrelsen", latitude: 59.3544, longitude: 17.9372, estimatedValue: 9_500_000, address: "Bromma Stockholm Airport ESSB — Executive Terminal", description: "Embraer Phenom 300E. Owner: Eriksson Air AB. Based Bromma. Frequent LIS (Lisbon).", lastActivityDate: "2026-06-08", sourceRegistry: "Transportstyrelsen (Swedish CAA)", ownerEntityId: hMap["Magnus Eriksson"] },
    // Kruger
    { category: "Aviation", identifier: "ZS-TKR", jurisdiction: "SACAA South Africa", latitude: -33.9648, longitude: 18.6017, estimatedValue: 58_000_000, address: "Cape Town International Airport FACT — Million Air FBO", description: "Bombardier Global 6000. Owner: Kruger Aviation Pty Ltd. Based Cape Town. Frequent LHR and JNB.", lastActivityDate: "2026-06-16", sourceRegistry: "South Africa SACAA", ownerEntityId: hMap["Tomas Kruger"] },
    { category: "RealEstate", identifier: "ZA-WC-2020-00421", jurisdiction: "South Africa Deeds Registry", latitude: -33.9178, longitude: 18.8678, estimatedValue: 12_000_000, address: "Franschhoek Wine Estate, Western Cape ZA 7690", description: "350ha wine estate 'Kruger Wines'. Cellar door + 8-bedroom homestead. Premium Cabernet Franc.", lastActivityDate: "2025-11-30", sourceRegistry: "South Africa Deeds Office WC", ownerEntityId: hMap["Tomas Kruger"] },
    // Rosso
    { category: "Aviation", identifier: "N-VRL", jurisdiction: "FAA US Registry", latitude: 40.8501, longitude: -74.0607, estimatedValue: 32_000_000, address: "Signature FBO, Teterboro Airport KTEB, NJ", description: "Citation Longitude. Owner: Rosso Family Trust. Based KTEB. Frequent FCO (Rome Fiumicino).", lastActivityDate: "2026-06-11", sourceRegistry: "FAA Aircraft Registry", ownerEntityId: hMap["Valentina Rosso"] },
    { category: "RealEstate", identifier: "IT-SA-B1102", jurisdiction: "Italy Catasto (Salerno)", latitude: 40.6328, longitude: 14.6023, estimatedValue: 6_200_000, address: "Via Pastena, Amalfi SA 84011 — Cliff Villa", description: "Cliff-top villa, 8 bedrooms, private lift to sea. Rosso Patrimonio SRL.", lastActivityDate: "2025-09-01", sourceRegistry: "Agenzia delle Entrate SISTER / Salerno", ownerEntityId: hMap["Valentina Rosso"] },
    // Bauer
    { category: "Aviation", identifier: "D-CBAU", jurisdiction: "Luftfahrtbundesamt LBA Germany", latitude: 48.3537, longitude: 11.7750, estimatedValue: 22_000_000, address: "Munich Airport EDDM — Jet Aviation FBO", description: "Cessna Citation X+. Owner: Bauer Luftfahrt GmbH. Based Munich. Frequent AGP (Málaga).", lastActivityDate: "2026-06-03", sourceRegistry: "LBA Germany Civil Aircraft Register", ownerEntityId: hMap["Henrik Bauer"] },
    // Monteiro
    { category: "Aviation", identifier: "PR-MBR", jurisdiction: "ANAC Brazil", latitude: -23.6264, longitude: -46.6559, estimatedValue: 52_000_000, address: "Aeroporto Campo de Marte SBMT, São Paulo SP", description: "Gulfstream G550. Owner: Monteiro Investimentos Aeronáutica SA. Based São Paulo. Frequent LIS and MIA.", lastActivityDate: "2026-06-17", sourceRegistry: "ANAC Brazil Register", ownerEntityId: hMap["Sebastião Monteiro"] },
    { category: "RealEstate", identifier: "PT-LIS-2023-00187", jurisdiction: "Portugal IRN Property Registry", latitude: 38.7131, longitude: -9.1432, estimatedValue: 5_400_000, address: "Rua Garrett 48, Lisboa — Chiado 1200-204", description: "Historic 4-floor townhouse. Monteiro Investimentos Lda (NHR). Golden Visa basis asset.", lastActivityDate: "2026-02-28", sourceRegistry: "IRN Portugal / Conservatória", ownerEntityId: hMap["Sebastião Monteiro"] },
    // Van der Berg
    { category: "Aviation", identifier: "PH-BVB", jurisdiction: "Dutch CAA RDW", latitude: 52.3105, longitude: 4.7683, estimatedValue: 8_200_000, address: "Schiphol Amsterdam EHAM — Panorama FBO", description: "Pilatus PC-12. Owner: van der Berg Luchtvaarttransport BV. Based Schiphol. Frequent IBZ (Ibiza).", lastActivityDate: "2026-06-09", sourceRegistry: "Dutch CAA / Divisie Luchtvaart", ownerEntityId: hMap["Beatrix van der Berg"] },
    { category: "RealEstate", identifier: "ES-IB-2019-0304", jurisdiction: "Spain Property Registry (Ibiza)", latitude: 38.9090, longitude: 1.2203, estimatedValue: 9_800_000, address: "Cala Tarida 47, San José, Ibiza 07830", description: "Cliff-top villa, 8 bedrooms, helipad. van der Berg Ibiza BV. Season: May–October.", lastActivityDate: "2026-05-28", sourceRegistry: "Registro de la Propiedad Ibiza", ownerEntityId: hMap["Beatrix van der Berg"] },
  ].filter((a) => a.ownerEntityId !== undefined) as any[];

  if (newAssets.length === 0) return;

  const insertedAssets = await db.insert(assetsTable).values(newAssets as any[]).returning();
  const assetMap: Record<string, number> = {};
  for (const a of insertedAssets) assetMap[`${a.category}:${a.identifier}`] = a.id;

  // ── Relationships ─────────────────────────────────────────────────────────
  const newRels: any[] = [];

  function rel(sourceId: number | undefined, targetId: number | undefined, targetType: string, relType: string, strength = 1.0) {
    if (sourceId && targetId) newRels.push({ sourceEntityId: sourceId, targetId, targetType, relationshipType: relType, strength } as any);
  }

  // Papadimitriou
  rel(hMap["Nikolaos Papadimitriou"], assetMap["Aviation:SX-PGM"], "Asset", "OWNS");
  rel(hMap["Nikolaos Papadimitriou"], assetMap["Marine:IMO-9781203"], "Asset", "OWNS");
  rel(hMap["Nikolaos Papadimitriou"], assetMap["RealEstate:GR-ATH-KIFI-2021-0041"], "Asset", "OWNS");
  rel(hMap["Stavros Petrakis (FBO Manager LGAT)"], hMap["Nikolaos Papadimitriou"], "Entity", "MANAGES", 0.72);
  rel(hMap["Stavros Petrakis (FBO Manager LGAT)"], assetMap["Aviation:SX-PGM"], "Asset", "MANAGES", 0.95);
  // Ibáñez Varela
  rel(hMap["Carlos Ibáñez Varela"], assetMap["Aviation:N-IVCH"], "Asset", "OWNS");
  rel(hMap["Carlos Ibáñez Varela"], assetMap["RealEstate:ES-MAD-2022-0087"], "Asset", "OWNS");
  rel(hMap["Elena Vargas (Varela Capital COO)"], hMap["Carlos Ibáñez Varela"], "Entity", "MANAGES", 0.88);
  // Al-Mansouri
  rel(hMap["Rashid Al-Mansouri"], assetMap["Aviation:A6-RMN"], "Asset", "OWNS");
  rel(hMap["Rashid Al-Mansouri"], assetMap["Marine:IMO-9844291"], "Asset", "OWNS");
  // Ferretti
  rel(hMap["Gianluca Ferretti"], assetMap["Aviation:I-GFER"], "Asset", "OWNS");
  rel(hMap["Gianluca Ferretti"], assetMap["Marine:IMO-9651180"], "Asset", "OWNS");
  // Beaumont
  rel(hMap["Patrick Beaumont"], assetMap["Aviation:F-HPBA"], "Asset", "OWNS");
  rel(hMap["Patrick Beaumont"], assetMap["RealEstate:FR-AM-2018-00291"], "Asset", "OWNS");
  // Eriksson
  rel(hMap["Magnus Eriksson"], assetMap["Aviation:SE-RME"], "Asset", "OWNS");
  // Kruger
  rel(hMap["Tomas Kruger"], assetMap["Aviation:ZS-TKR"], "Asset", "OWNS");
  rel(hMap["Tomas Kruger"], assetMap["RealEstate:ZA-WC-2020-00421"], "Asset", "OWNS");
  rel(hMap["William Frost (Sloane Square Art Advisor)"], hMap["Tomas Kruger"], "Entity", "KNOWN_ASSOCIATE", 0.65);
  // Rosso
  rel(hMap["Valentina Rosso"], assetMap["Aviation:N-VRL"], "Asset", "OWNS");
  rel(hMap["Valentina Rosso"], assetMap["RealEstate:IT-SA-B1102"], "Asset", "OWNS");
  // Bauer
  rel(hMap["Henrik Bauer"], assetMap["Aviation:D-CBAU"], "Asset", "OWNS");
  // Monteiro
  rel(hMap["Sebastião Monteiro"], assetMap["Aviation:PR-MBR"], "Asset", "OWNS");
  rel(hMap["Sebastião Monteiro"], assetMap["RealEstate:PT-LIS-2023-00187"], "Asset", "OWNS");
  rel(hMap["Diogo Pires (FBO Ops Congonhas)"], assetMap["Aviation:PR-MBR"], "Asset", "MANAGES", 0.9);
  rel(hMap["Diogo Pires (FBO Ops Congonhas)"], hMap["Sebastião Monteiro"], "Entity", "MANAGES", 0.65);
  // Van der Berg
  rel(hMap["Beatrix van der Berg"], assetMap["Aviation:PH-BVB"], "Asset", "OWNS");
  rel(hMap["Beatrix van der Berg"], assetMap["RealEstate:ES-IB-2019-0304"], "Asset", "OWNS");

  if (newRels.length > 0) {
    await db.insert(relationshipsTable).values(newRels as any[]);
  }
}
