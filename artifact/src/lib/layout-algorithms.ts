import { type AppEdge, type AppNode, type AppZoneNode } from "@/lib/types";
import { isNodeInsideZone } from "./utils";

interface LayoutNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  level: number;
  connections: Set<string>;
  actualHeight: number; // Store actual table height
}

interface LayoutOptions {
  nodeWidth?: number;
  nodeHeight?: number;
  horizontalSpacing?: number;
  verticalSpacing?: number;
  startX?: number;
  startY?: number;
}

const DEFAULT_OPTIONS: Required<LayoutOptions> = {
  nodeWidth: 288,
  nodeHeight: 120,
  horizontalSpacing: 100,
  verticalSpacing: 80,
  startX: 50,
  startY: 50,
};

function calculateTableHeight(node: AppNode): number {
  const baseHeight = 60;
  const columnHeight = 32;
  const columnCount = node.data.columns?.length || 0;
  
  return baseHeight + (columnCount * columnHeight);
}

function rectanglesOverlap(
  rect1: { x: number; y: number; width: number; height: number },
  rect2: { x: number; y: number; width: number; height: number }
): boolean {
  return !(
    rect1.x + rect1.width < rect2.x ||
    rect2.x + rect2.width < rect1.x ||
    rect1.y + rect1.height < rect2.y ||
    rect2.y + rect2.height < rect1.y
  );
}

function findNonOverlappingPosition(
  node: LayoutNode,
  levelNodes: LayoutNode[],
  opts: Required<LayoutOptions>
): { x: number; y: number } {
  let attempts = 0;
  const maxAttempts = 50;
  let currentX = node.x;
  let currentY = node.y;
  
  while (attempts < maxAttempts) {
    let hasOverlap = false;
    
    // Check for overlaps with other nodes in the same level
    for (const otherNode of levelNodes) {
      if (otherNode.id === node.id) continue;
      
      const otherRect = {
        x: otherNode.x,
        y: otherNode.y,
        width: otherNode.width,
        height: otherNode.actualHeight
      };
      
      const currentRect = {
        x: currentX,
        y: currentY,
        width: node.width,
        height: node.actualHeight
      };
      
      if (rectanglesOverlap(currentRect, otherRect)) {
        hasOverlap = true;
        currentX = otherNode.x + otherNode.width + opts.horizontalSpacing;
        break;
      }
    }
    
    if (!hasOverlap) {
      const verticalSpacing = Math.max(opts.verticalSpacing, node.actualHeight + 20);
      if (currentY < node.y + verticalSpacing) {
        currentY = node.y + (attempts * 20);
      }
      
      return { x: currentX, y: currentY };
    }
    
    attempts++;
  }
  
  return { x: node.x, y: node.y };
}

export function organizeTablesByRelationships(
  nodes: AppNode[],
  edges: AppEdge[],
  options: LayoutOptions = {}
): AppNode[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  if (nodes.length === 0) return nodes;
  
  const nodeMap = new Map<string, LayoutNode>();
  const adjacencyList = new Map<string, Set<string>>();
  
  nodes.forEach(node => {
    const actualHeight = calculateTableHeight(node);
    const layoutNode: LayoutNode = {
      id: node.id,
      x: 0,
      y: 0,
      width: opts.nodeWidth,
      height: opts.nodeHeight,
      actualHeight: actualHeight,
      level: 0,
      connections: new Set(),
    };
    nodeMap.set(node.id, layoutNode);
    adjacencyList.set(node.id, new Set());
  });
  
  // Build connections from edges (foreign key relationships)
  edges.forEach(edge => {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);
    
    if (sourceNode && targetNode) {
      // Add bidirectional connections for layout purposes
      sourceNode.connections.add(edge.target);
      targetNode.connections.add(edge.source);
      
      adjacencyList.get(edge.source)?.add(edge.target);
      adjacencyList.get(edge.target)?.add(edge.source);
    }
  });
  
  // Find root nodes (tables that are referenced but don't reference others)
  const referencedTables = new Set<string>();
  const referencingTables = new Set<string>();
  
  edges.forEach(edge => {
    referencedTables.add(edge.target);
    referencingTables.add(edge.source);
  });
  
  const rootNodes = nodes
    .filter(node => !referencingTables.has(node.id))
    .map(node => node.id);
  
  // If no clear roots, use nodes with fewer connections as roots
  const rootNodeIds = rootNodes.length > 0 ? rootNodes : 
    nodes
      .map(node => ({ id: node.id, connections: nodeMap.get(node.id)?.connections.size || 0 }))
      .sort((a, b) => a.connections - b.connections)
      .slice(0, Math.max(1, Math.ceil(nodes.length * 0.3)))
      .map(item => item.id);
  
  // Assign levels using BFS
  const visited = new Set<string>();
  const queue: Array<{ id: string; level: number }> = [];
  
  rootNodeIds.forEach(id => {
    queue.push({ id, level: 0 });
    visited.add(id);
  });
  
  while (queue.length > 0) {
    const { id, level } = queue.shift()!;
    const node = nodeMap.get(id);
    if (node) {
      node.level = level;
    }
    
    const neighbors = adjacencyList.get(id) || new Set();
    neighbors.forEach(neighborId => {
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        queue.push({ id: neighborId, level: level + 1 });
      }
    });
  }
  
  // Group nodes by level
  const levels = new Map<number, LayoutNode[]>();
  nodeMap.forEach(node => {
    if (!levels.has(node.level)) {
      levels.set(node.level, []);
    }
    levels.get(node.level)!.push(node);
  });
  
  // Position nodes with collision detection
  let currentY = opts.startY;
  const maxLevel = Math.max(...Array.from(levels.keys()));
  const allPlacedNodes: LayoutNode[] = [];
  
  for (let level = 0; level <= maxLevel; level++) {
    const levelNodes = levels.get(level) || [];
    
    // Sort nodes within level by number of connections (more connected nodes first)
    levelNodes.sort((a, b) => b.connections.size - a.connections.size);
    
    // Calculate optimal positioning within level
    const totalWidth = levelNodes.length * opts.nodeWidth + (levelNodes.length - 1) * opts.horizontalSpacing;
    let currentX = opts.startX + Math.max(0, (800 - totalWidth) / 2); // Center the level
    
    // Initial positioning
    levelNodes.forEach(node => {
      node.x = currentX;
      node.y = currentY;
      currentX += opts.nodeWidth + opts.horizontalSpacing;
    });
    
    // Apply collision detection within the level
    for (let i = 0; i < levelNodes.length; i++) {
      const node = levelNodes[i];
      const otherNodesInLevel = levelNodes.slice(0, i); // Only check against previously positioned nodes
      
      if (otherNodesInLevel.length > 0 && node) {
        const newPosition = findNonOverlappingPosition(node, otherNodesInLevel, opts);
        node.x = newPosition.x;
        node.y = newPosition.y;
      }
    }
    
    // Calculate the maximum height in this level for proper vertical spacing
    const maxHeightInLevel = Math.max(...levelNodes.map(node => node.actualHeight || opts.nodeHeight));
    currentY += maxHeightInLevel + opts.verticalSpacing;
    
    // Add all nodes from this level to the global tracking array
    allPlacedNodes.push(...levelNodes);
  }
  
  // Apply positions back to AppNode objects
  return nodes.map(node => {
    const layoutNode = nodeMap.get(node.id);
    if (!layoutNode) return node;
    
    return {
      ...node,
      position: {
        x: layoutNode.x,
        y: layoutNode.y,
      },
    };
  });
}

/**
 * Organizes tables with zone awareness. Tables inside zones are reorganized within their zones,
 * while tables outside zones are reorganized globally. Respects locked zones and prevents moving
 * outside tables into zones.
 */
export function organizeTablesByRelationshipsWithZones(
  nodes: AppNode[],
  edges: AppEdge[],
  zones: AppZoneNode[],
  options: LayoutOptions = {}
): AppNode[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  if (nodes.length === 0) return nodes;
  
  // Group tables by zone
  const tablesByZone = new Map<string, AppNode[]>();
  const tablesOutsideZones: AppNode[] = [];
  
  // Initialize zone groups
  zones.forEach(zone => {
    tablesByZone.set(zone.id, []);
  });
  
  // Categorize tables - only categorize tables that are already in zones
  // This prevents moving outside tables into zones
  nodes.forEach(node => {
    let foundInZone = false;
    const actualHeight = calculateTableHeight(node);
    
    for (const zone of zones) {
      if (isNodeInsideZone(node, zone, opts.nodeWidth, actualHeight)) {
        tablesByZone.get(zone.id)!.push(node);
        foundInZone = true;
        break;
      }
    }
    
    if (!foundInZone) {
      tablesOutsideZones.push(node);
    }
  });
  
  // Get edges for tables outside zones
  const edgesForOutsideTables = edges.filter(edge => {
    const sourceOutside = tablesOutsideZones.some(node => node.id === edge.source);
    const targetOutside = tablesOutsideZones.some(node => node.id === edge.target);
    return sourceOutside && targetOutside;
  });
  
  // Reorganize tables outside zones globally - but prevent them from being placed inside zones
  const reorganizedOutsideTables = organizeTablesByRelationshipsWithZoneExclusion(
    tablesOutsideZones,
    edgesForOutsideTables,
    zones,
    options
  );
  
  // Reorganize tables within each zone (respecting locked zones)
  const reorganizedTables: AppNode[] = [];
  
  zones.forEach(zone => {
    const zoneTables = tablesByZone.get(zone.id) || [];
    
    if (zoneTables.length === 0) return;
    
    // Skip reorganizing tables in locked zones
    if (zone.data?.isLocked) {
      // Keep tables in their current positions within locked zones
      reorganizedTables.push(...zoneTables);
      return;
    }
    
    // Get edges for tables within this zone
    const zoneEdges = edges.filter(edge => {
      const sourceInZone = zoneTables.some(node => node.id === edge.source);
      const targetInZone = zoneTables.some(node => node.id === edge.target);
      return sourceInZone && targetInZone;
    });
    
    // Calculate zone bounds with padding
    const zoneWidth = zone.width || opts.nodeWidth * 3;
    const zoneHeight = zone.height || opts.nodeHeight * 3;
    const padding = 20;
    
    const zoneOptions: LayoutOptions = {
      ...options,
      startX: zone.position.x + padding,
      startY: zone.position.y + padding,
      nodeWidth: Math.min(opts.nodeWidth, zoneWidth - padding * 2),
      nodeHeight: Math.min(opts.nodeHeight, zoneHeight - padding * 2),
    };
    
    // Reorganize tables within zone bounds
    const reorganizedZoneTables = organizeTablesByRelationships(
      zoneTables,
      zoneEdges,
      zoneOptions
    );
    
    reorganizedTables.push(...reorganizedZoneTables);
  });
  
  // Combine all reorganized tables
  return [...reorganizedOutsideTables, ...reorganizedTables];
}

/**
 * Organizes tables based on relationships while preventing them from being positioned inside zones.
 * This ensures that tables outside zones stay outside zones during reorganization.
 */
export function organizeTablesByRelationshipsWithZoneExclusion(
  nodes: AppNode[],
  edges: AppEdge[],
  zones: AppZoneNode[],
  options: LayoutOptions = {}
): AppNode[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  if (nodes.length === 0) return nodes;
  
  // Build zone boundaries for quick lookup
  const zoneBoundaries = zones.map(zone => ({
    left: zone.position.x,
    right: zone.position.x + (zone.width || 300),
    top: zone.position.y,
    bottom: zone.position.y + (zone.height || 200),
    zone: zone
  }));

  // Create a modified version of organizeTablesByRelationships that avoids zones
  const layoutNodes: LayoutNode[] = nodes.map(node => {
    const actualHeight = calculateTableHeight(node);
    return {
      id: node.id,
      x: node.position?.x || opts.startX,
      y: node.position?.y || opts.startY,
      width: opts.nodeWidth,
      height: opts.nodeHeight,
      actualHeight: actualHeight,
      level: 0,
      connections: new Set(),
    };
  });

  const nodeMap = new Map(layoutNodes.map(node => [node.id, node]));
  const adjacencyList = new Map<string, Set<string>>();
  
  // Build adjacency list
  layoutNodes.forEach(node => {
    adjacencyList.set(node.id, new Set());
  });
  
  edges.forEach(edge => {
    adjacencyList.get(edge.source)?.add(edge.target);
    adjacencyList.get(edge.target)?.add(edge.source);
  });
  
  // Calculate connections for each node
  layoutNodes.forEach(node => {
    node.connections = adjacencyList.get(node.id) || new Set();
  });
  
  // Build hierarchy using BFS
  const visited = new Set<string>();
  const queue: { id: string; level: number }[] = [];
  
  // Start BFS from nodes with no incoming edges (root nodes)
  const incomingEdges = new Map<string, number>();
  layoutNodes.forEach(node => incomingEdges.set(node.id, 0));
  edges.forEach(edge => {
    incomingEdges.set(edge.target, (incomingEdges.get(edge.target) || 0) + 1);
  });
  
  layoutNodes.forEach(node => {
    if ((incomingEdges.get(node.id) || 0) === 0) {
      visited.add(node.id);
      queue.push({ id: node.id, level: 0 });
    }
  });
  
  // If no root nodes found (no edges), create a zone-aware grid layout
  if (queue.length === 0) {
    const nodesPerRow = Math.ceil(Math.sqrt(layoutNodes.length));
    layoutNodes.forEach((node, index) => {
      const row = Math.floor(index / nodesPerRow);
      const col = index % nodesPerRow;
      node.level = row;
      
      // Calculate initial grid position
      let x = opts.startX + col * (opts.nodeWidth + opts.horizontalSpacing);
      let y = opts.startY + row * (opts.nodeHeight + opts.verticalSpacing);
      
      // Check if this position is in any zone, and adjust if needed
      let attempts = 0;
      const maxAttempts = 20;
      let placed = false;
      const actualHeight = node.actualHeight || opts.nodeHeight;
      
      while (attempts < maxAttempts && !placed) {
        let isInAnyZone = false;
        for (const boundary of zoneBoundaries) {
          const nodeRight = x + opts.nodeWidth;
          const nodeBottom = y + actualHeight;
          
          if (x < boundary.right && nodeRight > boundary.left &&
              y < boundary.bottom && nodeBottom > boundary.top) {
            isInAnyZone = true;
            break;
          }
        }
        
        if (!isInAnyZone) {
          placed = true;
        } else {
          // Shift position to avoid zone
          x += opts.nodeWidth * 1.5;
          if (x > opts.startX + 1000) {
            x = opts.startX;
            y += actualHeight * 1.5;
          }
          attempts++;
        }
      }
      
      node.x = x;
      node.y = y;
    });
    
    // Skip the BFS and positioning logic for nodes without edges
    // Apply positions back to AppNode objects
    return nodes.map(node => {
      const layoutNode = nodeMap.get(node.id);
      if (!layoutNode) return node;
      
      return {
        ...node,
        position: {
          x: layoutNode.x,
          y: layoutNode.y,
        },
      };
    });
  }
  
  while (queue.length > 0) {
    const { id, level } = queue.shift()!;
    const node = nodeMap.get(id);
    if (node) {
      node.level = level;
    }
    
    const neighbors = adjacencyList.get(id) || new Set();
    neighbors.forEach(neighborId => {
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        queue.push({ id: neighborId, level: level + 1 });
      }
    });
  }
  
  // Group nodes by level
  const levels = new Map<number, LayoutNode[]>();
  nodeMap.forEach(node => {
    if (!levels.has(node.level)) {
      levels.set(node.level, []);
    }
    levels.get(node.level)!.push(node);
  });
  
  // Position nodes with zone-aware collision detection
  let currentY = opts.startY;
  const maxLevel = Math.max(...Array.from(levels.keys()));
  const allPlacedNodes: LayoutNode[] = []; // Track ALL positioned nodes to prevent cross-level overlapping
  
  for (let level = 0; level <= maxLevel; level++) {
    const levelNodes = levels.get(level) || [];
    
    // Sort nodes within level by number of connections (more connected nodes first)
    levelNodes.sort((a, b) => b.connections.size - a.connections.size);
    
    // Calculate optimal positioning within level
    const totalWidth = levelNodes.length * opts.nodeWidth + (levelNodes.length - 1) * opts.horizontalSpacing;
    let currentX = opts.startX + Math.max(0, (800 - totalWidth) / 2); // Center the level
    
    // Zone-aware positioning - first pass: try to place nodes in relationship order
    const placedNodes: LayoutNode[] = [];
    
    levelNodes.forEach(node => {
      let x = currentX;
      let y = currentY;
      let placed = false;
      let attempts = 0;
      const maxAttempts = 30;
      
      // Try to find a valid position that respects relationships and avoids zones
      while (attempts < maxAttempts && !placed) {
        // Check if this position would place the node in any zone
        let isInAnyZone = false;
        const actualHeight = node.actualHeight || opts.nodeHeight;
        for (const boundary of zoneBoundaries) {
          const nodeRight = x + opts.nodeWidth;
          const nodeBottom = y + actualHeight;
          
          if (x < boundary.right && nodeRight > boundary.left &&
              y < boundary.bottom && nodeBottom > boundary.top) {
            isInAnyZone = true;
            break;
          }
        }
        
        if (!isInAnyZone) {
          // Check for collisions with ALL previously positioned nodes (not just this level)
          const hasCollision = allPlacedNodes.some(other => {
            return (
              x < other.x + opts.nodeWidth + opts.horizontalSpacing &&
              x + opts.nodeWidth + opts.horizontalSpacing > other.x &&
              y < other.y + (other.actualHeight || opts.nodeHeight) + opts.verticalSpacing &&
              y + (node.actualHeight || opts.nodeHeight) + opts.verticalSpacing > other.y
            );
          });
          
          if (!hasCollision) {
            node.x = x;
            node.y = y;
            placedNodes.push(node);
            placed = true;
            currentX = x + opts.nodeWidth + opts.horizontalSpacing;
          } else {
            // Shift right for collision with proper spacing
            x += opts.nodeWidth + opts.horizontalSpacing/2;
            attempts++;
          }
        } else {
          // Shift right to avoid zone with proper spacing
          x += opts.nodeWidth + opts.horizontalSpacing/2;
          attempts++;
        }
        
        // If we've moved too far right, reset and move down
        if (x > opts.startX + 1000) {
          x = opts.startX;
          y += opts.nodeHeight + opts.verticalSpacing;
          attempts++;
        }
      }
      
      // If we couldn't place it properly, use the original position but adjusted
      if (!placed) {
        node.x = currentX;
        node.y = currentY;
        currentX += opts.nodeWidth + opts.horizontalSpacing;
      }
    });
    
    // Apply zone-aware collision detection within the level
    for (let i = 0; i < levelNodes.length; i++) {
      const node = levelNodes[i];
      const otherNodesInLevel = levelNodes.slice(0, i); // Only check against previously positioned nodes
      
      if (otherNodesInLevel.length > 0 && node) {
        const newPosition = findNonOverlappingPositionWithZones(node, otherNodesInLevel, zoneBoundaries, opts);
        node.x = newPosition.x;
        node.y = newPosition.y;
      }
    }
    
    // Calculate the maximum height in this level for proper vertical spacing
    const maxHeightInLevel = Math.max(...levelNodes.map(node => node.actualHeight));
    currentY += maxHeightInLevel + opts.verticalSpacing;
  }
  
  // Apply positions back to AppNode objects
  return nodes.map(node => {
    const layoutNode = nodeMap.get(node.id);
    if (!layoutNode) return node;
    
    return {
      ...node,
      position: {
        x: layoutNode.x,
        y: layoutNode.y,
      },
    };
  });
}

/**
 * Finds a position for a node that doesn't overlap with other nodes and stays outside zones
 */
function findNonOverlappingPositionWithZones(
  node: LayoutNode,
  otherNodes: LayoutNode[],
  zoneBoundaries: Array<{ left: number; right: number; top: number; bottom: number; zone: AppZoneNode }>,
  opts: Required<LayoutOptions>
): { x: number; y: number } {
  let attempts = 0;
  const maxAttempts = 100; // Increased attempts for better positioning
  let currentX = node.x;
  let currentY = node.y;
  const stepSize = 40; // Increased step size for more thorough search
  
  while (attempts < maxAttempts) {
    // Check collision with other nodes (with proper spacing)
    const actualHeight = node.actualHeight || opts.nodeHeight;
    const hasCollision = otherNodes.some(other => {
      const otherActualHeight = other.actualHeight || opts.nodeHeight;
      return (
        currentX < other.x + opts.nodeWidth + opts.horizontalSpacing &&
        currentX + opts.nodeWidth + opts.horizontalSpacing > other.x &&
        currentY < other.y + otherActualHeight + opts.verticalSpacing &&
        currentY + actualHeight + opts.verticalSpacing > other.y
      );
    });
    
    // Check if position is inside any zone
    const isInAnyZone = zoneBoundaries.some(boundary => {
      const nodeRight = currentX + opts.nodeWidth;
      const nodeBottom = currentY + actualHeight;
      
      return (
        currentX < boundary.right && nodeRight > boundary.left &&
        currentY < boundary.bottom && nodeBottom > boundary.top
      );
    });
    
    // If no collision and not in any zone, we found a good position
    if (!hasCollision && !isInAnyZone) {
      return { x: currentX, y: currentY };
    }
    
    // Move to next position (improved spiral pattern)
    const spiralStep = Math.floor(attempts / 8); // Complete circle every 8 steps
    const angle = (attempts % 8) * Math.PI / 4; // 8 directions per circle
    const radius = spiralStep * stepSize + stepSize;
    
    currentX = node.x + Math.cos(angle) * radius;
    currentY = node.y + Math.sin(angle) * radius;
    
    attempts++;
  }
  
  // Fallback: try different starting positions if spiral search failed
  let fallbackX = node.x;
  let fallbackY = node.y;
  let fallbackAttempts = 0;
  const maxFallbackAttempts = 20;
  
  while (fallbackAttempts < maxFallbackAttempts) {
    // Check if this fallback position works
    const actualHeight = node.actualHeight || opts.nodeHeight;
    const hasCollision = otherNodes.some(other => {
      const otherActualHeight = other.actualHeight || opts.nodeHeight;
      return (
        fallbackX < other.x + opts.nodeWidth + opts.horizontalSpacing &&
        fallbackX + opts.nodeWidth + opts.horizontalSpacing > other.x &&
        fallbackY < other.y + otherActualHeight + opts.verticalSpacing &&
        fallbackY + actualHeight + opts.verticalSpacing > other.y
      );
    });
    
    const isInAnyZone = zoneBoundaries.some(boundary => {
      const nodeRight = fallbackX + opts.nodeWidth;
      const nodeBottom = fallbackY + actualHeight;
      
      return (
        fallbackX < boundary.right && nodeRight > boundary.left &&
        fallbackY < boundary.bottom && nodeBottom > boundary.top
      );
    });
    
    if (!hasCollision && !isInAnyZone) {
      return { x: fallbackX, y: fallbackY };
    }
    
    // Move fallback position systematically
    fallbackX += opts.nodeWidth * 1.5;
    if (fallbackX > node.x + 800) {
      fallbackX = node.x;
      fallbackY += opts.nodeHeight * 1.5;
    }
    fallbackAttempts++;
  }
  
  // Final fallback: try to find a position that's at least outside zones
  const actualHeight = node.actualHeight || opts.nodeHeight;
  const zoneFreePosition = findZoneFreePosition(node.x, node.y, zoneBoundaries, opts, actualHeight);
  return { x: zoneFreePosition.x, y: zoneFreePosition.y };
}

/**
 * Helper function to find a position that's at least outside all zones
 */
function findZoneFreePosition(
  startX: number,
  startY: number,
  zoneBoundaries: Array<{ left: number; right: number; top: number; bottom: number; zone: AppZoneNode }>,
  opts: Required<LayoutOptions>,
  nodeHeight: number = opts.nodeHeight
): { x: number; y: number } {
  let x = startX;
  let y = startY;
  let attempts = 0;
  const maxAttempts = 20;
  
  while (attempts < maxAttempts) {
    const isInAnyZone = zoneBoundaries.some(boundary => {
      const nodeRight = x + opts.nodeWidth;
      const nodeBottom = y + nodeHeight;
      
      return (
        x < boundary.right && nodeRight > boundary.left &&
        y < boundary.bottom && nodeBottom > boundary.top
      );
    });
    
    if (!isInAnyZone) {
      return { x, y };
    }
    
    // Move right and down gradually
    x += opts.nodeWidth / 2;
    if (x > startX + 600) {
      x = startX;
      y += nodeHeight / 2;
    }
    attempts++;
  }
  
  return { x: startX, y: startY }; // Fallback to original position
}



/**
 * Alternative force-directed layout that pushes connected nodes together
 * and unconnected nodes apart.
 */
export function forceDirectedLayout(
  nodes: AppNode[],
  edges: AppEdge[],
  options: LayoutOptions = {}
): AppNode[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  if (nodes.length === 0) return nodes;
  
  // Initialize positions randomly if not set
  const positions = new Map<string, { x: number; y: number }>();
  nodes.forEach((node, index) => {
    positions.set(node.id, {
      x: node.position?.x ?? opts.startX + (index % 5) * (opts.nodeWidth + opts.horizontalSpacing),
      y: node.position?.y ?? opts.startY + Math.floor(index / 5) * (opts.nodeHeight + opts.verticalSpacing),
    });
  });
  
  // Build adjacency list
  const connections = new Map<string, Set<string>>();
  nodes.forEach(node => connections.set(node.id, new Set()));
  edges.forEach(edge => {
    connections.get(edge.source)?.add(edge.target);
    connections.get(edge.target)?.add(edge.source);
  });
  
  // Simple force-directed iterations
  for (let iteration = 0; iteration < 50; iteration++) {
    const forces = new Map<string, { x: number; y: number }>();
    
    // Initialize forces
    nodes.forEach(node => {
      forces.set(node.id, { x: 0, y: 0 });
    });
    
    // Repulsion forces between all nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const node1 = nodes[i];
        const node2 = nodes[j];
        const pos1 = positions.get(node1?.id || "")!;
        const pos2 = positions.get(node2?.id || "")!;
        
        const dx = pos2.x - pos1.x;
        const dy = pos2.y - pos1.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        
        const force = (opts.nodeWidth * opts.nodeHeight) / (distance * distance);
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;
        
        const force1 = forces.get(node1?.id || "")!;
        const force2 = forces.get(node2?.id || "")!;
        
        force1.x -= fx;
        force1.y -= fy;
        force2.x += fx;
        force2.y += fy;
      }
    }
    
    // Attraction forces for connected nodes
    edges.forEach(edge => {
      const pos1 = positions.get(edge.source)!;
      const pos2 = positions.get(edge.target)!;
      
      const dx = pos2.x - pos1.x;
      const dy = pos2.y - pos1.y;
      const distance = Math.sqrt(dx * dx + dy * dy) || 1;
      
      const force = distance * 0.1;
      const fx = (dx / distance) * force;
      const fy = (dy / distance) * force;
      
      const force1 = forces.get(edge.source)!;
      const force2 = forces.get(edge.target)!;
      
      force1.x += fx;
      force1.y += fy;
      force2.x -= fx;
      force2.y -= fy;
    });
    
    // Apply forces
    nodes.forEach(node => {
      const pos = positions.get(node.id)!;
      const force = forces.get(node.id)!;
      
      pos.x += force.x * 0.1;
      pos.y += force.y * 0.1;
      
      // Keep nodes within bounds
      pos.x = Math.max(opts.startX, Math.min(pos.x, opts.startX + 1000));
      pos.y = Math.max(opts.startY, Math.min(pos.y, opts.startY + 1000));
    });
  }
  
  // Apply positions back to AppNode objects
  return nodes.map(node => {
    const position = positions.get(node.id);
    if (!position) return node;
    
    return {
      ...node,
      position,
    };
  });
}