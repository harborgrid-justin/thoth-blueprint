import { Link, Route, Routes } from "react-router-dom";
import { Dashboard } from "@/features/dashboard/Dashboard";
import { Workspace } from "@/features/workspace/Workspace";
import { Button } from "@/components/ui/button";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/project/:projectId" element={<Workspace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
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
