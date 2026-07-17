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
