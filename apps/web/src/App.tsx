import * as React from "react";
import { Link, Route, Routes } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const Dashboard = React.lazy(() =>
  import("@/features/dashboard/Dashboard").then((m) => ({
    default: m.Dashboard,
  })),
);
const Workspace = React.lazy(() =>
  import("@/features/workspace/Workspace").then((m) => ({
    default: m.Workspace,
  })),
);

export default function App() {
  return (
    <React.Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/project/:projectId" element={<Workspace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </React.Suspense>
  );
}

function LoadingScreen() {
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background">
      <div className="text-center">
        <h1 className="text-3xl font-semibold">Page not found</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          That plan or page doesn&apos;t exist.
        </p>
      </div>
      <Button asChild>
        <Link to="/">Back to projects</Link>
      </Button>
    </div>
  );
}
