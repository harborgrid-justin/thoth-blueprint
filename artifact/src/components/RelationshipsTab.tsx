import { DbRelationship } from "@/lib/constants";
import { AppEdge, type AppNode } from "@/lib/types";
import { type StoreState, useStore } from "@/store/store";
import { ArrowLeft, GitCommitHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import EdgeInspectorPanel from "./EdgeInspectorPanel";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";

interface RelationshipsTabProps {
    nodes: AppNode[];
    edges: AppEdge[];
}

export default function RelationshipsTab({ nodes, edges }: RelationshipsTabProps) {
    const selectedEdgeId = useStore((state) => state.selectedEdgeId);
    const [inspectingEdgeId, setInspectingEdgeId] = useState<string | null>(selectedEdgeId);
    const [relationshipFilter, setRelationshipFilter] = useState<string>("");

    const { setSelectedEdgeId, setSelectedNodeId } = useStore(
        useShallow((state: StoreState) => ({
            setSelectedEdgeId: state.setSelectedEdgeId,
            setSelectedNodeId: state.setSelectedNodeId,

        }))
    );

    // Create Maps for O(1) lookups
    const nodesMap = useMemo(() => new Map(nodes.map(node => [node.id, node])), [nodes]);
    const edgesMap = useMemo(() => new Map(edges.map(edge => [edge.id, edge])), [edges]);

    useEffect(() => {
        if (selectedEdgeId && edges.some((edge) => edge.id === selectedEdgeId)) {
            setInspectingEdgeId(selectedEdgeId)
        }
    }, [edges, selectedEdgeId])

    const filteredRels = useMemo(() => {
        if (!relationshipFilter) return edges;
        const filter = relationshipFilter.toLowerCase();
        return edges.filter((edge) => {
            const sourceNode = nodesMap.get(edge.source);
            const targetNode = nodesMap.get(edge.target);
            if (!sourceNode || !targetNode) return false;

            const sourceName = sourceNode.data.label.toLowerCase();
            const targetName = targetNode.data.label.toLowerCase();
            const relationshipLabel = `${sourceName} to ${targetName}`;
            const relationshipType = edge.data?.relationship || "";

            return (
                relationshipLabel.includes(filter) || relationshipType.includes(filter)
            );
        });
    }, [edges, nodesMap, relationshipFilter]);

    const inspectingEdge = edgesMap.get(inspectingEdgeId || "");

    const handleRelSelect = (id:string) => {
        setInspectingEdgeId(id);
        setSelectedEdgeId(id);
        setSelectedNodeId(null);
    }

    if (inspectingEdge) {
        return (
            <div className="flex flex-col h-full p-4">
                <Button
                    variant="ghost"
                    onClick={() => setInspectingEdgeId(null)}
                    className="mb-2 self-start"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back to list
                </Button>
                <div className="flex-1 overflow-hidden">
                    <ScrollArea className="h-full">
                        <EdgeInspectorPanel
                            edge={inspectingEdge}
                            nodes={nodes}
                        />
                    </ScrollArea>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Filter */}
            <div className="px-4 mt-1 pb-2 flex-shrink-0">
                <div className="relative">
                    <Input
                        placeholder="Filter relationships..."
                        value={relationshipFilter}
                        onChange={(e) => setRelationshipFilter(e.target.value)}
                        className="pr-8"
                    />
                    {relationshipFilter && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                            onClick={() => setRelationshipFilter("")}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 px-4 overflow-hidden">
                <ScrollArea className="h-full">
                    <div className="space-y-2">
                        {filteredRels.length > 0 ? (
                            filteredRels.map((edge) => {
                                const sourceNode = nodesMap.get(edge.source);
                                const targetNode = nodesMap.get(edge.target);
                                return (
                                    <Button
                                        key={edge.id}
                                        variant="ghost"
                                        className="w-full justify-start h-auto py-2"
                                        onClick={() => handleRelSelect(edge.id)}
                                    >
                                        <GitCommitHorizontal className="h-4 w-4 mr-2 flex-shrink-0" />
                                        <div className="text-left text-sm">
                                            <p className="font-semibold">
                                                {sourceNode?.data.label} to {targetNode?.data.label}
                                            </p>
                                            <p className="text-muted-foreground text-xs">
                                                {edge.data?.relationship ?? DbRelationship.ONE_TO_MANY}
                                            </p>
                                        </div>
                                    </Button>
                                );
                            })
                        ) : (
                            <div className="text-center py-10">
                                {relationshipFilter ? (
                                    <>
                                        <p className="text-sm text-muted-foreground">
                                            No relationships found matching your filter.
                                        </p>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="mt-4"
                                            onClick={() => setRelationshipFilter("")}
                                        >
                                            <X className="h-4 w-4 mr-2" />
                                            Clear Filter
                                        </Button>
                                    </>
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        No relationships in this diagram yet.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}