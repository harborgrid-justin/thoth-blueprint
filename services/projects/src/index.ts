import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import { siteForTemplate, createId } from "@thoth/domain";
import {
  db,
  type Project,
  type Checkpoint,
  type ReviewComment,
} from "./store.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(morgan("dev"));

// Express doesn't forward rejected promises to the error middleware on its
// own — an unhandled rejection here would hang the request instead of
// surfacing a 500. Wrap every async route so storage/IO errors reach `next`.
// Params default to plain strings (none of our routes use repeating-segment
// captures, which is the only case Express types as `string[]`).
function asyncRoute<P extends Record<string, string> = Record<string, string>>(
  handler: (req: Request<P>, res: Response) => Promise<unknown>,
) {
  return (req: Request<P>, res: Response, next: NextFunction): void => {
    handler(req, res).catch(next);
  };
}

// 1. Current user
app.get("/api/user", (_req, res) => {
  res.json(db.CURRENT_USER);
});

// 2. Reset workspace (samples or empty)
app.post(
  "/api/workspace/reset",
  asyncRoute(async (req, res) => {
    const { mode } = req.body;
    if (mode !== "samples" && mode !== "empty") {
      return res
        .status(400)
        .json({ error: "Invalid mode. Must be 'samples' or 'empty'." });
    }

    const store = await db.loadStore();
    if (mode === "empty") {
      store.projects = [];
      store.checkpoints = [];
      store.threads = [];
    } else {
      // Actually let's just write seed data directly:
      const emptySeed = { projects: [], checkpoints: [], threads: [] };
      await db.writeStore(emptySeed);
      const newSeeded = await db.loadStore();
      store.projects = newSeeded.projects;
      store.checkpoints = [];
      store.threads = [];
    }
    await db.writeStore(store);
    return res.json({ message: "Workspace reset complete." });
  }),
);

// 3. List projects
app.get(
  "/api/projects",
  asyncRoute(async (_req, res) => {
    const store = await db.loadStore();
    const summaries = store.projects
      .map((p) => db.summarize(p))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    res.json(summaries);
  }),
);

// 4. Get project by ID
app.get(
  "/api/projects/:id",
  asyncRoute(async (req, res) => {
    const store = await db.loadStore();
    const project = store.projects.find((p) => p.id === req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    return res.json(project);
  }),
);

// 5. Create project
app.post(
  "/api/projects",
  asyncRoute(async (req, res) => {
    const { name, description, template } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Missing required field: name" });
    }

    const store = await db.loadStore();
    const site = siteForTemplate(name, template ?? "empty");
    const project: Project = {
      id: createId("proj"),
      name,
      description: description ?? "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      siteAreaAcres: 0,
      lotCount: 0,
      members: db.defaultMembers(),
      site,
    };

    store.projects.push(project);
    await db.writeStore(store);
    return res.status(201).json(project);
  }),
);

// 6. Rename/patch project metadata
app.patch(
  "/api/projects/:id",
  asyncRoute(async (req, res) => {
    const { name, description } = req.body;
    const store = await db.loadStore();
    const project = store.projects.find((p) => p.id === req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    if (name !== undefined) {
      project.name = name;
    }
    if (description !== undefined) {
      project.description = description;
    }
    project.updatedAt = new Date().toISOString();

    await db.writeStore(store);
    return res.json(project);
  }),
);

// 7. Delete project
app.delete(
  "/api/projects/:id",
  asyncRoute(async (req, res) => {
    const store = await db.loadStore();
    const index = store.projects.findIndex((p) => p.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: "Project not found" });
    }

    store.projects.splice(index, 1);
    // Cascade delete checkpoints and threads
    store.checkpoints = store.checkpoints.filter(
      (c) => c.projectId !== req.params.id,
    );
    store.threads = store.threads.filter(
      (t) => t.projectId !== req.params.id,
    );

    await db.writeStore(store);
    return res.status(204).end();
  }),
);

// 8. Save/autosave project site layout
app.post(
  "/api/projects/:id/save",
  asyncRoute(async (req, res) => {
    const { site } = req.body;
    if (!site) {
      return res.status(400).json({ error: "Missing required field: site" });
    }

    const store = await db.loadStore();
    const project = store.projects.find((p) => p.id === req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    project.site = site;
    project.updatedAt = new Date().toISOString();

    await db.writeStore(store);
    return res.json(project);
  }),
);

// 9. List checkpoints
app.get(
  "/api/projects/:id/checkpoints",
  asyncRoute(async (req, res) => {
    const store = await db.loadStore();
    const list = store.checkpoints
      .filter((c) => c.projectId === req.params.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json(list);
  }),
);

// 10. Create checkpoint
app.post(
  "/api/projects/:id/checkpoints",
  asyncRoute(async (req, res) => {
    const { name, note } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Missing required field: name" });
    }

    const store = await db.loadStore();
    const project = store.projects.find((p) => p.id === req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const checkpoint: Checkpoint = {
      id: createId("cp"),
      projectId: req.params.id,
      name,
      note: note ?? "",
      createdAt: new Date().toISOString(),
      authorName: "You",
      site: JSON.parse(JSON.stringify(project.site)), // Deep copy site
    };

    store.checkpoints.push(checkpoint);
    await db.writeStore(store);
    return res.status(201).json(checkpoint);
  }),
);

// 11. Restore project to checkpoint
app.post(
  "/api/projects/:id/checkpoints/:checkpointId/restore",
  asyncRoute(async (req, res) => {
    const store = await db.loadStore();
    const project = store.projects.find((p) => p.id === req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const checkpoint = store.checkpoints.find(
      (c) =>
        c.projectId === req.params.id && c.id === req.params.checkpointId,
    );
    if (!checkpoint) {
      return res.status(404).json({ error: "Checkpoint not found" });
    }

    project.site = JSON.parse(JSON.stringify(checkpoint.site));
    project.updatedAt = new Date().toISOString();

    await db.writeStore(store);
    return res.json(project);
  }),
);

// 12. Delete checkpoint
app.delete(
  "/api/projects/:id/checkpoints/:checkpointId",
  asyncRoute(async (req, res) => {
    const store = await db.loadStore();
    const index = store.checkpoints.findIndex(
      (c) => c.projectId === req.params.id && c.id === req.params.checkpointId,
    );
    if (index === -1) {
      return res.status(404).json({ error: "Checkpoint not found" });
    }

    store.checkpoints.splice(index, 1);
    await db.writeStore(store);
    return res.status(204).end();
  }),
);

// 13. List comment threads
app.get(
  "/api/projects/:id/threads",
  asyncRoute(async (req, res) => {
    const store = await db.loadStore();
    const list = store.threads.filter((t) => t.projectId === req.params.id);
    res.json(list);
  }),
);

// 14. Add comment/thread
app.post(
  "/api/projects/:id/threads",
  asyncRoute(async (req, res) => {
    const { elementId, body } = req.body;
    if (!body) {
      return res.status(400).json({ error: "Missing required field: body" });
    }

    const store = await db.loadStore();
    const project = store.projects.find((p) => p.id === req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Look for existing unresolved thread on this element
    let thread = store.threads.find(
      (t) =>
        t.projectId === req.params.id &&
        t.elementId === elementId &&
        !t.resolved,
    );

    const comment: ReviewComment = {
      id: createId("cmt"),
      authorName: db.CURRENT_USER.name,
      authorColor: db.CURRENT_USER.color,
      body,
      createdAt: new Date().toISOString(),
    };

    if (thread) {
      thread.comments.push(comment);
    } else {
      thread = {
        id: createId("thrd"),
        projectId: req.params.id,
        elementId: elementId ?? null,
        resolved: false,
        comments: [comment],
      };
      store.threads.push(thread);
    }

    await db.writeStore(store);
    return res.status(201).json(thread);
  }),
);

// 15. Resolve comment thread
app.post(
  "/api/projects/:id/threads/:threadId/resolve",
  asyncRoute(async (req, res) => {
    const store = await db.loadStore();
    const thread = store.threads.find(
      (t) => t.projectId === req.params.id && t.id === req.params.threadId,
    );
    if (!thread) {
      return res.status(404).json({ error: "Thread not found" });
    }

    thread.resolved = true;
    await db.writeStore(store);
    return res.json(thread);
  }),
);

// Final error handler: anything asyncRoute forwards (storage/IO errors,
// unexpected exceptions) lands here as a JSON 500 instead of Express's
// default HTML error page or a hung connection.
app.use(
  (err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
    // eslint-disable-next-line no-console
    console.error(err);
    if (res.headersSent) {
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  },
);

const server = app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[projects-service] Server running at http://localhost:${PORT}`);
});

async function shutdown(): Promise<void> {
  server.close();
  await db.closeStorage();
  process.exit(0);
}

process.on("SIGTERM", () => {
  shutdown().catch((err: unknown) => {
    // eslint-disable-next-line no-console
    console.error("Error during shutdown:", err);
    process.exit(1);
  });
});
process.on("SIGINT", () => {
  shutdown().catch((err: unknown) => {
    // eslint-disable-next-line no-console
    console.error("Error during shutdown:", err);
    process.exit(1);
  });
});
