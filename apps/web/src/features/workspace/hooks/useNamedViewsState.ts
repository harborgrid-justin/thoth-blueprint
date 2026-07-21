import { useCanvasStore } from "@/store/canvasStore";
import { promptViewName, confirmDeleteView } from "../helpers/namedViewsHelpers";

export function useNamedViewsState() {
  const { namedViews, addNamedView, deleteNamedView, setViewport } = useCanvasStore();

  function handleSave() {
    const name = promptViewName();
    if (name) {
      addNamedView(name);
    }
  }

  function handleDelete(e: React.MouseEvent, name: string) {
    e.stopPropagation();
    if (confirmDeleteView(name)) {
      deleteNamedView(name);
    }
  }

  return {
    namedViews,
    setViewport,
    handleSave,
    handleDelete,
  };
}
