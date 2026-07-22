import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { db, __test__, type Project } from "./store.js";

// The store persists through @thoth/storage; the "memory" driver keeps
// these tests fast and isolated from the filesystem.
beforeAll(() => {
  process.env.STORAGE_DRIVER = "memory";
});

beforeEach(() => {
  __test__.resetStorage();
});

describe("Projects Service Store", () => {
  it("should seed store on initial load if none exists", async () => {
    const store = await db.loadStore();

    expect(store.projects.length).toBe(3);
    expect(store.checkpoints.length).toBe(0);
    expect(store.threads.length).toBe(0);

    const projectNames = store.projects.map((p) => p.name);
    expect(projectNames).toContain("Willow Creek Subdivision");
    expect(projectNames).toContain("Riverside Mixed-Use District");
    expect(projectNames).toContain("Kestrel Ridge Estate");
  });

  it("does not reseed once projects already exist", async () => {
    const first = await db.loadStore();
    await db.writeStore({ ...first, projects: [first.projects[0]] });

    const second = await db.loadStore();
    expect(second.projects.length).toBe(1);
  });

  it("should successfully persist changes across loadStore/writeStore calls", async () => {
    const store = await db.loadStore();
    const originalCount = store.projects.length;

    const newProject: Project = {
      id: "proj-test-123",
      name: "Test persistence project",
      description: "Unit testing store persistence",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      siteAreaAcres: 10,
      lotCount: 5,
      members: db.defaultMembers(),
      site: store.projects[0].site,
    };

    store.projects.push(newProject);
    await db.writeStore(store);

    // Reload to verify persistence went through the storage layer.
    const loadedStore = await db.loadStore();
    expect(loadedStore.projects.length).toBe(originalCount + 1);

    const savedProject = loadedStore.projects.find(
      (p) => p.id === "proj-test-123",
    );
    expect(savedProject).toBeDefined();
    expect(savedProject?.name).toBe("Test persistence project");
  });

  it("round-trips checkpoints and review threads", async () => {
    const store = await db.loadStore();
    const project = store.projects[0];

    store.checkpoints.push({
      id: "cp-1",
      projectId: project.id,
      name: "Before rezoning",
      createdAt: new Date().toISOString(),
      authorName: "You",
      site: project.site,
    });
    store.threads.push({
      id: "thrd-1",
      projectId: project.id,
      elementId: null,
      resolved: false,
      comments: [],
    });
    await db.writeStore(store);

    const reloaded = await db.loadStore();
    expect(reloaded.checkpoints.map((c) => c.id)).toContain("cp-1");
    expect(reloaded.threads.map((t) => t.id)).toContain("thrd-1");
  });

  it("should generate correct project summaries", async () => {
    const store = await db.loadStore();
    const project = store.projects[0];

    const summary = db.summarize(project);
    expect(summary.id).toBe(project.id);
    expect(summary.name).toBe(project.name);
    expect(summary.members.length).toBe(project.members.length);
    // Project object has site, summary shouldn't expose it
    expect((summary as Partial<Project>).site).toBeUndefined();
  });
});
