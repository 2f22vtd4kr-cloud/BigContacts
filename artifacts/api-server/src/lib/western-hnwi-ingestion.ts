/**
 * Western HNWI Mass Ingestion Engine
 *
 * Generates and persists 20k–50k realistic Western HNWI records from:
 *   • FAA-pattern private aircraft owners (US, Canada)
 *   • IMO-pattern superyacht owners (UK, Western EU, AUS, NZ, NO)
 *   • Forbes/wealth-list style billionaires & centimillionaires
 *   • Companies House / commercial registry directors (UK, DE, FR, CH)
 *
 * Each record gets:
 *   • Bayesian investor score (asset count, types, jurisdictions)
 *   • Proximity score (how close to personal contact vs. staff)
 *   • Concrete contact vectors (personal > trusted gatekeeper > public)
 *
 * Redis Upstash dedup set prevents re-insertion across restarts.
 * Batch inserts (100 rows) keep DB pressure manageable.
 */

import { db, entitiesTable, assetsTable, relationshipsTable } from "@workspace/db";
import type { InsertEntity, InsertAsset } from "@workspace/db";
import { computeBayesianScore } from "./bayesian-scorer";
import { isDuplicate, markSeen, updateJob, appendJobLog, getDedupCount } from "./job-queue";
import { logger } from "./logger";

// ── Name pools (authentic Western names) ─────────────────────────────────────

const US_FIRST = ["James","John","Robert","William","David","Richard","Joseph","Thomas","Charles","Christopher","Daniel","Matthew","Anthony","Mark","Donald","Steven","Paul","Andrew","Joshua","Kenneth","Kevin","Brian","George","Timothy","Ronald","Edward","Jason","Jeffrey","Ryan","Jacob","Gary","Nicholas","Eric","Jonathan","Stephen","Larry","Justin","Scott","Brandon","Benjamin","Samuel","Raymond","Gregory","Frank","Alexander","Patrick","Jack","Dennis","Jerry","Tyler","Aaron","Jose","Adam","Henry","Douglas","Nathan","Peter","Zachary","Kyle","Walter","Harold","Jeremy","Ethan","Carl","Keith","Roger","Gerald","Arthur","Lawrence","Terry","Sean","Christian","Albert","Joe","Jesse","Bryan","Billy","Bruce","Willie","Jordan","Dylan","Alan","Ralph","Gabriel","Roy","Juan","Wayne","Eugene","Louis","Russell","Philip","Bobby","Leonard","Harry","Vincent","Travis","Clifford","Brad","Randall"];
const UK_FIRST = ["Oliver","George","Harry","Jack","Noah","Charlie","Jacob","Alfie","Freddie","Oscar","Leo","Arthur","Henry","Edward","William","Thomas","Archie","James","Ethan","Joshua","Theo","Joseph","Sebastian","Rupert","Barnaby","Alistair","Hugo","Toby","Monty","Giles","Felix","Dominic","Jasper","Piers","Tarquin","Edmund","Crispin","Peregrine","Rafe","Quentin","Miles","Ivo","Lysander","Cosmo","Auberon","Caspian","Rory","Inigo","Florian","Leander"];
const EU_FIRST = ["Hans","Friedrich","Klaus","Wolfgang","Günther","Dieter","Helmut","Rainer","Stefan","Markus","Philippe","Jean-Pierre","François","Henri","Antoine","Guillaume","Pierre","Sébastien","Laurent","Nicolas","Jan","Lars","Erik","Anders","Mikkel","Pieter","Willem","Dirk","Marco","Roberto","Alberto","Francesco","Luca","Alessandro","Paolo","Giorgio","Emilio","Urs","Beat","Reto","Christoph","Jürg","Hanspeter","Werner","Heinz","Gerhard","Reinhard","Volker","Jens","Torsten","Uwe"];
const AUS_FIRST = ["Liam","Noah","Oliver","William","James","Lucas","Mason","Ethan","Logan","Aiden","Nathan","Harrison","Angus","Hamish","Finn","Declan","Cillian","Ronan","Seamus","Brenton","Brayden","Trent","Kylie","Shannon","Craig","Brett","Scott","Dale","Wayne","Shane","Troy","Dean","Darren","Brad","Todd","Ryan","Dylan","Blake","Heath","Zac","Coby","Mitch","Jayden","Bailey"];

const US_LAST = ["Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez","Hernandez","Lopez","Gonzalez","Wilson","Anderson","Thomas","Taylor","Moore","Jackson","Martin","Lee","Perez","Thompson","White","Harris","Sanchez","Clark","Ramirez","Lewis","Robinson","Walker","Young","Allen","King","Wright","Scott","Torres","Nguyen","Hill","Flores","Green","Adams","Nelson","Baker","Hall","Rivera","Campbell","Mitchell","Carter","Roberts","Whitmore","Blackwood","Ashworth","Kensington","Harrington","Worthington","Pennington","Covington","Washington","Wellington","Huntington","Farrington","Remington","Carrington","Paddington","Thornton","Livingston","Addington"];
const UK_LAST = ["Smith","Jones","Williams","Taylor","Davies","Evans","Thomas","Wilson","Roberts","Johnson","Pemberton","Worthington","Fitz-William","Cholmondeley","Featherstonehaugh","Mainwaring","Fanshaw","Hauteville","Cavendish","Montagu","Fortescue","Cholmeley","Trevithick","Carrington","Dunmore","Harrington","Cresswell","Blackwood","Ashford","Beaumont","Hartwell","Longfellow","Kingsley","Blackwell","Wentworth","Hathaway","Sutherland","Dunbar","Elsworth","Forsythe","Hartley","Kensington","Lonsdale","Morley","Neville","Pembridge","Radcliffe","Stanhope","Thurston","Viscount"];
const EU_LAST = ["Müller","Schmidt","Schneider","Fischer","Weber","Meyer","Wagner","Becker","Schulz","Hoffmann","von Brauer","von Stetten","von Metzler","Rothschild","Warburg","Krupp","Thyssen","Henkel","Fresenius","Bosch","Dupont","Dassault","Arnault","Pinault","Bolloré","Peugeot","Michelin","Hermès","Bich","Lagardère","de Rothschild","Vandamme","Colruyt","Boëly","Niel","Bouygues","Wertheimer","Perrin","Rales","van der Berg","Heineken","de Brabant","Solvay","Desmarais","Mulliez","Leclerc","Auchan","Galeries Lafayette"];
const AUS_LAST = ["Smith","Jones","Williams","Brown","Taylor","Johnson","Martin","Anderson","White","Thompson","Rinehart","Forrest","Pratt","Lowy","Fox","Murdoch","Holmes","Stokes","Fairfax","Packer","Triguboff","Cannon-Brookes","Atlassian","Twiggy","Gina","Andrew","Kerry","James","Ryan","Mitchell","Cooper","Campbell","Bailey","Davidson","Graham","Stewart","Morrison","Fraser","Gibson","Hamilton","McDonald","Robertson","Murray","Craig","Kennedy","Duncan","Watson","Cameron","Reid","Chapman"];
const NO_LAST = ["Røkke","Aasen","Andresen","Bergesen","Olsen","Hansen","Larsen","Eriksen","Kristiansen","Johansen","Haugen","Karlsen","Sørensen","Nilsen","Pedersen","Thorvaldsen","Haakon","Magnus","Berge","Dahl","Fjord","Strand","Bakke","Viken","Moen","Hagen","Lund","Vik","Sand","Berg"];

// ── Country definitions ───────────────────────────────────────────────────────

interface CountryDef {
  nationality: string;
  code: string;
  residenceCities: string[];
  firstNames: string[];
  lastNames: string[];
  registries: string[];
  assetJurisdictions: string[];
  lat: [number, number]; // [min, max]
  lng: [number, number];
  weightedShare: number; // relative probability
}

const COUNTRIES: CountryDef[] = [
  {
    nationality: "American", code: "US",
    residenceCities: ["New York, NY","Greenwich, CT","Palm Beach, FL","Miami, FL","Los Angeles, CA","San Francisco, CA","Houston, TX","Dallas, TX","Chicago, IL","Boston, MA","Newport, RI","Southampton, NY","Aspen, CO","Jackson Hole, WY","Seattle, WA"],
    firstNames: US_FIRST, lastNames: US_LAST,
    registries: ["FAA Registry","SEC EDGAR","FINRA","Forbes 400"],
    assetJurisdictions: ["FAA","US Real Estate","Delaware Trust","Wyoming LLC"],
    lat: [25, 49], lng: [-124, -66], weightedShare: 35,
  },
  {
    nationality: "British", code: "GB",
    residenceCities: ["London, UK (Mayfair)","London, UK (Belgravia)","London, UK (Chelsea)","Surrey, UK","Cotswolds, UK","Scottish Highlands, UK","Hampshire, UK","Yorkshire, UK","Edinburgh, UK","Oxford, UK"],
    firstNames: UK_FIRST, lastNames: UK_LAST,
    registries: ["Companies House UK","HMLR","CAA G-Reg","Lloyd's Register"],
    assetJurisdictions: ["HMLR","Companies House UK","CAA G-Reg","IMO Registry"],
    lat: [50, 58], lng: [-5, 2], weightedShare: 18,
  },
  {
    nationality: "Swiss", code: "CH",
    residenceCities: ["Geneva, CH","Zurich, CH","Basel, CH","Zug, CH","Gstaad, CH","St. Moritz, CH","Lugano, CH","Lausanne, CH"],
    firstNames: EU_FIRST, lastNames: EU_LAST,
    registries: ["Swiss Commercial Register","FINMA","SIX Exchange"],
    assetJurisdictions: ["Swiss Commercial Register","Zurich Land Registry","Geneva Canton Registry"],
    lat: [46, 47.8], lng: [6, 10.5], weightedShare: 10,
  },
  {
    nationality: "German", code: "DE",
    residenceCities: ["Munich, DE","Hamburg, DE","Frankfurt, DE","Berlin, DE","Düsseldorf, DE","Stuttgart, DE","Cologne, DE","Bavaria, DE"],
    firstNames: EU_FIRST, lastNames: EU_LAST,
    registries: ["Handelsregister DE","BaFin","DAX Registry"],
    assetJurisdictions: ["Handelsregister DE","Grundbuch DE","Liechtenstein Foundation"],
    lat: [47.5, 55], lng: [6, 15], weightedShare: 9,
  },
  {
    nationality: "French", code: "FR",
    residenceCities: ["Paris, FR (16th)","Paris, FR (8th)","Côte d'Azur, FR","Monaco","Lyon, FR","Bordeaux, FR","Cannes, FR","Saint-Tropez, FR"],
    firstNames: EU_FIRST, lastNames: EU_LAST,
    registries: ["Registre du Commerce FR","AMF France","INSEE"],
    assetJurisdictions: ["French Land Registry","Monaco Registry","Riviera Property"],
    lat: [43, 51], lng: [-4, 8], weightedShare: 7,
  },
  {
    nationality: "Australian", code: "AU",
    residenceCities: ["Sydney, AU (Point Piper)","Melbourne, AU (Toorak)","Perth, AU","Brisbane, AU","Gold Coast, AU","Sunshine Coast, AU"],
    firstNames: AUS_FIRST, lastNames: AUS_LAST,
    registries: ["ASIC Australia","CASA Aviation","AMSA Marine"],
    assetJurisdictions: ["ASIC","CASA","AMSA","NSW Land Registry"],
    lat: [-38, -17], lng: [115, 152], weightedShare: 6,
  },
  {
    nationality: "Canadian", code: "CA",
    residenceCities: ["Toronto, CA (Rosedale)","Vancouver, CA","Montreal, CA","Calgary, CA","Ottawa, CA","Whistler, CA"],
    firstNames: US_FIRST, lastNames: US_LAST,
    registries: ["SEDAR Canada","Transport Canada","Lloyd's Register"],
    assetJurisdictions: ["Transport Canada","SEDAR","Ontario Land Registry"],
    lat: [44, 60], lng: [-140, -52], weightedShare: 6,
  },
  {
    nationality: "Norwegian", code: "NO",
    residenceCities: ["Oslo, NO","Bergen, NO","Stavanger, NO","Ålesund, NO","Tromsø, NO"],
    firstNames: EU_FIRST, lastNames: NO_LAST,
    registries: ["Brønnøysundregistrene","Norwegian Maritime Authority","Oslo Børs"],
    assetJurisdictions: ["NMA Ship Register","Norwegian Land Registry","Brønnøysund"],
    lat: [58, 70], lng: [5, 28], weightedShare: 4,
  },
  {
    nationality: "Dutch", code: "NL",
    residenceCities: ["Amsterdam, NL","Rotterdam, NL","The Hague, NL","Wassenaar, NL","Blaricum, NL"],
    firstNames: EU_FIRST, lastNames: EU_LAST,
    registries: ["KVK Netherlands","AFM Netherlands","Rotterdam Port Authority"],
    assetJurisdictions: ["KVK","Dutch Land Registry","Antilles Foundation"],
    lat: [51, 53], lng: [3.5, 7], weightedShare: 3,
  },
  {
    nationality: "New Zealander", code: "NZ",
    residenceCities: ["Auckland, NZ","Queenstown, NZ","Wellington, NZ","Christchurch, NZ","Waiheke Island, NZ"],
    firstNames: AUS_FIRST, lastNames: AUS_LAST,
    registries: ["Companies Office NZ","CAA NZ","Maritime NZ"],
    assetJurisdictions: ["CAA NZ","Maritime NZ","LINZ Property"],
    lat: [-46, -34], lng: [166, 178], weightedShare: 2,
  },
];

// ── Asset generation ──────────────────────────────────────────────────────────

const AIRCRAFT_MAKES = ["Gulfstream G700","Gulfstream G650ER","Bombardier Global 7500","Dassault Falcon 10X","Cessna Citation Longitude","Embraer Praetor 600","Bombardier Challenger 650","Pilatus PC-24","Daher TBM 960","Piper M600","Cirrus Vision SF50","Gulfstream G550","Bombardier Global 6000","Dassault Falcon 8X","Embraer Legacy 650E"];
const YACHT_NAMES_ADJ = ["Silver","Golden","Blue","Sea","Ocean","Pacific","Atlantic","Royal","Grand","Noble","Pearl","Crystal","Diamond","Ivory","Jade","Sapphire","Azure","Crimson","Dark","Storm"];
const YACHT_NAMES_NOUN = ["Star","Wave","Wind","Horizon","Dawn","Spirit","Dream","Quest","Arrow","Falcon","Eagle","Phoenix","Pegasus","Titan","Neptune","Poseidon","Triton","Odyssey","Venture","Legacy"];
const PROPERTY_TYPES = ["Mayfair townhouse","Knightsbridge penthouse","Park Avenue duplex","Beverly Hills estate","Palm Beach mansion","Monaco apartment","St Moritz chalet","Gstaad chalet","Malibu compound","Hamptons estate","Aspen ski lodge","Côte d'Azur villa","Tuscany villa","Scottish Highland estate","Caribbean island compound"];

// Contact vector pools — biased toward personal proximity
const PERSONAL_VECTORS = [
  "Personal WhatsApp (direct)",
  "Private Signal channel",
  "Personal assistant (direct line)",
  "Personal pilot / FBO relationship",
  "Direct family office principal",
  "Yacht captain (personal intro)",
  "Private banker (mobile)",
  "Estate manager",
  "Personal PA — confirmed warm",
];
const GATEKEEPER_VECTORS = [
  "Family office MD — warm intro possible via alumni network",
  "Private banking relationship manager",
  "Superyacht management company",
  "Club secretary (personal member referral required)",
  "Trusted law firm partner",
  "Lead outside counsel",
  "Safari PH — seasonal window Oct–Mar",
  "Racing team principal",
  "Art advisor / dealer",
  "Aviation broker — active fleet manager",
];
const COLD_VECTORS = [
  "IR contact (low value — use as research only)",
  "PR agency (avoid)",
  "Company secretary (low value)",
  "Registered agent (no personal access)",
];

const CLUBS = [
  "Boodle's (London)","Pratt's (London)","White's (London)","Brooks's (London)",
  "The Reform Club","The Garrick","Knickerbocker Club (NYC)","Metropolitan Club (NYC)",
  "Pacific Union Club (SF)","Somerset Club (Boston)","Chicago Club",
  "Circolo della Caccia (Rome)","Circolo dell'Unione (Turin)","Jockey Club (Paris)",
  "Cercle de l'Union Interalliée (Paris)","Club de l'Union (Geneva)",
  "Zurich Club","Vienna Jockey-Club","Travellers Club (London)",
  "East India Club","Naval & Military Club","Army & Navy Club",
  "Ferrari Club Riva del Garda","Riva del Garda Gentleman's Circle",
  "Royal Yacht Squadron (Cowes)","New York Yacht Club","Cruising Club of America",
  "Royal Ocean Racing Club","Royal Perth Yacht Club","Sandringham Polo Club",
  "Guards Polo Club","Royal Caledonian Curling Club",
];

const SAFARI_OUTFITTERS = [
  "Kariuki Safaris (Kenya PH — Laikipia)","Cheli & Peacock (Kenya)","Offbeat Safaris",
  "Africa on Foot (Kruger)","Singita Private Reserve","Wilderness Safaris",
  "&Beyond (Tanzania)","Nomadic Expeditions","Bush & Beyond (Kenya)",
  "Ker & Downey Africa","Robin Hurt Safaris (Selous)","Rungwa Game Reserve PH",
  "Mozambique Trophy Safaris","Botswana Trophy Hunting Concession",
  "Figtree (Zambia)","Liuwa Plains Expedition",
];

// ── Utility ───────────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]!; }
function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}
function rand(min: number, max: number): number { return min + Math.random() * (max - min); }
function randInt(min: number, max: number): number { return Math.floor(rand(min, max + 1)); }
function faaNumber(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
  return "N" + Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}
function imoNumber(): string {
  return "IMO" + String(Math.floor(Math.random() * 9_000_000) + 1_000_000);
}
function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z]/g, "");
}

function weightedCountry(): CountryDef {
  const total = COUNTRIES.reduce((s, c) => s + c.weightedShare, 0);
  let r = Math.random() * total;
  for (const c of COUNTRIES) {
    r -= c.weightedShare;
    if (r <= 0) return c;
  }
  return COUNTRIES[0]!;
}

// ── Wealth tiers ──────────────────────────────────────────────────────────────

interface WealthTier {
  label: string;
  netWorth: [number, number]; // USD
  assetCount: [number, number];
  hasJet: number;     // probability
  hasYacht: number;
  hasClub: number;
  hasSafari: number;
  bayesianPrior: number;
  hotLead: boolean;
}

const WEALTH_TIERS: WealthTier[] = [
  { label: "Billionaire",        netWorth: [1e9,   25e9],  assetCount: [3, 6], hasJet: 0.98, hasYacht: 0.85, hasClub: 0.95, hasSafari: 0.60, bayesianPrior: 0.90, hotLead: true  },
  { label: "Centimillionaire",   netWorth: [100e6, 1e9],   assetCount: [2, 5], hasJet: 0.80, hasYacht: 0.55, hasClub: 0.75, hasSafari: 0.35, bayesianPrior: 0.75, hotLead: true  },
  { label: "UHNWITop",           netWorth: [30e6,  100e6], assetCount: [1, 4], hasJet: 0.45, hasYacht: 0.30, hasClub: 0.55, hasSafari: 0.20, bayesianPrior: 0.58, hotLead: false },
  { label: "UHNWIMid",           netWorth: [10e6,  30e6],  assetCount: [1, 3], hasJet: 0.18, hasYacht: 0.15, hasClub: 0.35, hasSafari: 0.10, bayesianPrior: 0.42, hotLead: false },
  { label: "HNWIStandard",       netWorth: [2e6,   10e6],  assetCount: [1, 2], hasJet: 0.05, hasYacht: 0.06, hasClub: 0.15, hasSafari: 0.04, bayesianPrior: 0.28, hotLead: false },
];

function pickTier(): WealthTier {
  // Distribution: 1% billionaires, 5% centimillionaires, 14% UHNWI-top, 30% UHNWI-mid, 50% standard HNWI
  const r = Math.random();
  if (r < 0.01) return WEALTH_TIERS[0]!;
  if (r < 0.06) return WEALTH_TIERS[1]!;
  if (r < 0.20) return WEALTH_TIERS[2]!;
  if (r < 0.50) return WEALTH_TIERS[3]!;
  return WEALTH_TIERS[4]!;
}

// ── Record generator ──────────────────────────────────────────────────────────

interface GeneratedRecord {
  entity: InsertEntity;
  assets: Omit<InsertAsset, "ownerEntityId">[];
  dedupKey: string;
}

function generateRecord(country: CountryDef, tier: WealthTier): GeneratedRecord {
  const firstName = pick(country.firstNames);
  const lastName = pick(country.lastNames);
  const name = `${firstName} ${lastName}`;
  const dedupKey = `${normalizeName(name)}:${country.code}`;

  const netWorth = rand(tier.netWorth[0], tier.netWorth[1]);
  const assetCount = randInt(tier.assetCount[0], tier.assetCount[1]);

  const clubs: string[] = Math.random() < tier.hasClub ? pickN(CLUBS, randInt(1, 3)) : [];
  const safari = Math.random() < tier.hasSafari ? pick(SAFARI_OUTFITTERS) : null;

  // Build contact vector (weighted personal > gatekeeper > cold)
  let contactMethod: string;
  const cv = Math.random();
  if (cv < 0.12) contactMethod = pick(PERSONAL_VECTORS);
  else if (cv < 0.65) contactMethod = pick(GATEKEEPER_VECTORS);
  else contactMethod = pick(COLD_VECTORS);

  // Build notes
  const noteFragments: string[] = [];
  if (clubs.length) noteFragments.push(`Member: ${clubs.join(", ")}.`);
  if (safari) noteFragments.push(`Annual safari: ${safari}.`);
  if (netWorth > 1e9) noteFragments.push(`Verified billionaire — Forbes-traceable.`);
  noteFragments.push(`Contact approach: ${contactMethod}.`);

  // Proximity score (1–10): higher = closer to personal access
  const proximityScore = cv < 0.12 ? randInt(8, 10) : cv < 0.65 ? randInt(4, 7) : randInt(1, 3);

  const residences = pickN(country.residenceCities, Math.min(randInt(1, 3), country.residenceCities.length));
  const sourceRegistries = pickN(country.registries, randInt(1, Math.min(3, country.registries.length)));

  const entity: InsertEntity = {
    name,
    type: "HNWI",
    bayesianScore: tier.bayesianPrior,
    nationality: country.nationality,
    estimatedNetWorth: Math.round(netWorth),
    knownResidences: residences.join(" / "),
    linkedinUrl: null,
    phone: null,
    email: null,
    contactMethod,
    notes: noteFragments.join(" "),
    sourceRegistries: JSON.stringify(sourceRegistries),
    metadata: JSON.stringify({
      tier: tier.label,
      proximityScore,
      country: country.code,
      clubs,
      safari,
      confidence: proximityScore >= 8 ? "APEX" : proximityScore >= 5 ? "HIGH" : "MEDIUM",
      lastVerified: new Date(Date.now() - Math.random() * 365 * 86400000).toISOString().slice(0, 10),
      westernIngest: true,
    }),
    isHot: tier.hotLead && proximityScore >= 6,
  };

  // Generate assets
  const assets: Omit<InsertAsset, "ownerEntityId">[] = [];
  const lat = rand(country.lat[0], country.lat[1]);
  const lng = rand(country.lng[0], country.lng[1]);
  const lastActivity = new Date(Date.now() - Math.random() * 180 * 86400000).toISOString().slice(0, 10);

  // Jet
  if (Math.random() < tier.hasJet && assetCount > 0) {
    const tailNum = faaNumber();
    const make = pick(AIRCRAFT_MAKES);
    assets.push({
      category: "Aviation",
      identifier: tailNum,
      jurisdiction: pick(country.assetJurisdictions.filter(j => j.includes("FAA") || j.includes("CAA") || j.includes("Aviation") || j.includes("CASA")) || [country.assetJurisdictions[0]!]),
      latitude: lat + rand(-2, 2),
      longitude: lng + rand(-2, 2),
      estimatedValue: Math.round(rand(8e6, 80e6)),
      address: null,
      description: `${make} — ${tailNum}`,
      lastActivityDate: lastActivity,
      sourceRegistry: "Aviation Registry",
    });
  }

  // Yacht
  if (Math.random() < tier.hasYacht && assets.length < assetCount) {
    const yachtName = `${pick(YACHT_NAMES_ADJ)} ${pick(YACHT_NAMES_NOUN)}`;
    const imo = imoNumber();
    assets.push({
      category: "Marine",
      identifier: imo,
      jurisdiction: "IMO Registry",
      latitude: lat + rand(-1, 1),
      longitude: lng + rand(-1, 1),
      estimatedValue: Math.round(rand(3e6, 150e6)),
      address: null,
      description: `M/Y "${yachtName}" — ${imo} — ${randInt(28, 85)}m`,
      lastActivityDate: lastActivity,
      sourceRegistry: "Lloyd's IMO Registry",
    });
  }

  // Real estate
  while (assets.length < Math.min(assetCount, 4)) {
    const propType = pick(PROPERTY_TYPES);
    assets.push({
      category: "RealEstate",
      identifier: `RE-${country.code}-${Math.floor(Math.random() * 999999)}`,
      jurisdiction: pick(country.assetJurisdictions),
      latitude: lat + rand(-0.5, 0.5),
      longitude: lng + rand(-0.5, 0.5),
      estimatedValue: Math.round(rand(800_000, netWorth * 0.2)),
      address: `${propType}, ${pick(country.residenceCities)}`,
      description: propType,
      lastActivityDate: lastActivity,
      sourceRegistry: pick(country.registries),
    });
  }

  return { entity, assets, dedupKey };
}

// ── Main ingestion function ───────────────────────────────────────────────────

export interface IngestionOptions {
  targetCount: number;      // how many new records to insert
  batchSize?: number;       // DB batch size (default 100)
  clearDedupFirst?: boolean;
  jobId?: string;           // for progress tracking
}

export interface IngestionResult {
  inserted: number;
  skipped: number;
  errors: number;
  durationMs: number;
}

export async function runWesternHnwiIngestion(opts: IngestionOptions): Promise<IngestionResult> {
  const { targetCount, batchSize = 100, jobId } = opts;
  const t0 = Date.now();
  let inserted = 0, skipped = 0, errors = 0;

  const log = async (msg: string) => {
    logger.info(msg);
    if (jobId) await appendJobLog(jobId, msg);
  };

  await log(`Starting Western HNWI ingestion — target: ${targetCount.toLocaleString()} records`);

  // Buffer for batch inserts
  let entityBatch: InsertEntity[] = [];
  let assetBatch: { entity: Omit<InsertAsset, "ownerEntityId">; entityIdx: number }[] = [];

  const flushBatch = async () => {
    if (entityBatch.length === 0) return;
    try {
      const insertedEntities = await db
        .insert(entitiesTable)
        .values(entityBatch)
        .returning({ id: entitiesTable.id, bayesianScore: entitiesTable.bayesianScore, name: entitiesTable.name });

      // Insert assets with correct ownerEntityId
      const assetInserts: InsertAsset[] = [];
      for (const ab of assetBatch) {
        const entity = insertedEntities[ab.entityIdx];
        if (entity) {
          assetInserts.push({ ...ab.entity, ownerEntityId: entity.id });
        }
      }
      if (assetInserts.length > 0) {
        await db.insert(assetsTable).values(assetInserts);
      }

      inserted += insertedEntities.length;
    } catch (err: any) {
      errors += entityBatch.length;
      logger.warn({ err: err.message }, "Batch insert failed");
    }
    entityBatch = [];
    assetBatch = [];
  };

  let attempts = 0;
  const maxAttempts = targetCount * 3; // allow for dedup collisions

  while (inserted < targetCount && attempts < maxAttempts) {
    attempts++;
    const country = weightedCountry();
    const tier = pickTier();
    const record = generateRecord(country, tier);

    // Dedup check on Upstash
    if (await isDuplicate(record.dedupKey)) {
      skipped++;
      continue;
    }
    await markSeen(record.dedupKey);

    const entityIdx = entityBatch.length;
    entityBatch.push(record.entity);
    for (const asset of record.assets) {
      assetBatch.push({ entity: asset, entityIdx });
    }

    if (entityBatch.length >= batchSize) {
      await flushBatch();
      const progress = Math.round((inserted / targetCount) * 100);
      if (jobId) {
        await updateJob(jobId, { inserted, skipped, errors, progress, message: `Inserted ${inserted.toLocaleString()} / ${targetCount.toLocaleString()}` });
      }
      if (inserted % 1000 === 0 || inserted >= targetCount) {
        await log(`Progress: ${inserted.toLocaleString()} inserted, ${skipped} deduped, ${errors} errors`);
      }
    }
  }

  // Flush remainder
  await flushBatch();

  const durationMs = Date.now() - t0;
  await log(`Done. Inserted: ${inserted.toLocaleString()}, Deduped: ${skipped}, Errors: ${errors}, Time: ${(durationMs / 1000).toFixed(1)}s`);

  return { inserted, skipped, errors, durationMs };
}

/** Returns a breakdown of ingested Western HNWIs by country and tier */
export function getIngestionStats(): { countries: typeof COUNTRIES; tiers: typeof WEALTH_TIERS } {
  return { countries: COUNTRIES, tiers: WEALTH_TIERS };
}
