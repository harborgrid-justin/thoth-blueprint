import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { db } from "./store.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "../data");
const DB_FILE = path.join(DATA_DIR, "db.json");

describe("Projects Service Store", () => {
  let dbBackup: string | null = null;

  beforeEach(() => {
    // Back up existing DB if any
    if (fs.existsSync(DB_FILE)) {
      dbBackup = fs.readFileSync(DB_FILE, "utf-8");
      fs.unlinkSync(DB_FILE);
    } else {
      dbBackup = null;
    }
  });

  afterEach(() => {
    // Restore DB backup
    if (dbBackup !== null) {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, dbBackup, "utf-8");
    } else if (fs.existsSync(DB_FILE)) {
      fs.unlinkSync(DB_FILE);
    }
  });

  it("should seed store on initial load if database file does not exist", () => {
    expect(fs.existsSync(DB_FILE)).toBe(false);
    const store = db.loadStore();

    expect(fs.existsSync(DB_FILE)).toBe(true);
    expect(store.projects.length).toBe(3);
    expect(store.checkpoints.length).toBe(0);
    expect(store.threads.length).toBe(0);

    const projectNames = store.projects.map((p) => p.name);
    expect(projectNames).toContain("Willow Creek Subdivision");
    expect(projectNames).toContain("Riverside Mixed-Use District");
    expect(projectNames).toContain("Kestrel Ridge Estate");
  });

  it("should successfully persist changes to the file system", () => {
    const store = db.loadStore();
    const originalCount = store.projects.length;

    const newProject = {
      id: "proj-test-123",
      name: "Test persistence project",
      description: "Unit testing store persistence",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      siteAreaAcres: 10,
      lotCount: 5,
      members: db.defaultMembers(),
      site: { id: "site-123", name: "Test site", layers: [], elements: [] },
    };

    store.projects.push(newProject);
    db.writeStore(store);

    // Load from disk again to verify persistence
    const loadedStore = db.loadStore();
    expect(loadedStore.projects.length).toBe(originalCount + 1);

    const savedProject = loadedStore.projects.find(
      (p) => p.id === "proj-test-123",
    );
    expect(savedProject).toBeDefined();
    expect(savedProject?.name).toBe("Test persistence project");
  });

  it("should generate correct project summaries", () => {
    const store = db.loadStore();
    const project = store.projects[0];

    const summary = db.summarize(project);
    expect(summary.id).toBe(project.id);
    expect(summary.name).toBe(project.name);
    expect(summary.members.length).toBe(project.members.length);
    // Project object has site, summary shouldn't expose it
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((summary as any).site).toBeUndefined();
  });
});
