import { INITIAL_PARTS_CATALOG } from "./data";
import type {
  PartCategory,
  PartFilterOptions,
  PartSpecification,
} from "./types";
import type { WallType } from "../planning/types/building";

/**
 * Enterprise Global Parts Database Registry
 *
 * Serves as the centralized, framework-agnostic parts catalog engine for Thoth Blueprint.
 * Pre-seeded with architectural, electrical, lumber, civil, and mechanical/plumbing JSON databases.
 * Supports dynamic runtime registration (`registerPart`) for unlimited user and plugin parts.
 */
export class GlobalPartsDatabase {
  private partsMap = new Map<string, PartSpecification>();

  constructor(initialCatalog: PartSpecification[] = INITIAL_PARTS_CATALOG) {
    this.importCatalog(initialCatalog);
  }

  /** Retrieve all parts currently registered in the database. */
  public getAllParts(): PartSpecification[] {
    return Array.from(this.partsMap.values());
  }

  /** Retrieve a single part by ID. */
  public getPart(id: string): PartSpecification | undefined {
    return this.partsMap.get(id);
  }

  /** Retrieve all parts belonging to a specific category. */
  public getPartsByCategory(category: PartCategory): PartSpecification[] {
    return this.getAllParts().filter((p) => p.category === category);
  }

  /** Retrieve all parts belonging to a specific subcategory. */
  public getPartsBySubcategory(subcategory: string): PartSpecification[] {
    return this.getAllParts().filter((p) => p.subcategory === subcategory);
  }

  /** Dynamically register a new part or replace an existing part. */
  public registerPart(spec: PartSpecification): PartSpecification {
    if (!spec.id) {
      throw new Error("PartSpecification requires a unique 'id'");
    }
    const cleanSpec: PartSpecification = {
      ...spec,
      tags: spec.tags ? Array.from(new Set(spec.tags)) : [],
    };
    this.partsMap.set(spec.id, cleanSpec);
    return cleanSpec;
  }

  /** Update/patch properties of an existing part. */
  public updatePart(
    id: string,
    patch: Partial<Omit<PartSpecification, "id">>,
  ): PartSpecification {
    const existing = this.getPart(id);
    if (!existing) {
      throw new Error(`Part '${id}' does not exist in GlobalPartsDatabase`);
    }
    const updated: PartSpecification = {
      ...existing,
      ...patch,
      dimensions: { ...existing.dimensions, ...patch.dimensions },
      properties: { ...existing.properties, ...patch.properties },
      tags: patch.tags
        ? Array.from(new Set([...(existing.tags || []), ...patch.tags]))
        : existing.tags,
    };
    this.partsMap.set(id, updated);
    return updated;
  }

  /** Search parts across name, SKU, manufacturer, tags, description, and properties. */
  public searchParts(
    query: string,
    options: PartFilterOptions = {},
  ): PartSpecification[] {
    const q = query.trim().toLowerCase();
    return this.getAllParts().filter((part) => {
      if (options.category && part.category !== options.category) {
        return false;
      }
      if (options.subcategory && part.subcategory !== options.subcategory) {
        return false;
      }
      if (
        options.manufacturer &&
        part.manufacturer?.toLowerCase() !== options.manufacturer.toLowerCase()
      ) {
        return false;
      }
      if (options.tags && options.tags.length > 0) {
        const partTags = part.tags?.map((t) => t.toLowerCase()) || [];
        const matchesAllTags = options.tags.every((t) =>
          partTags.includes(t.toLowerCase()),
        );
        if (!matchesAllTags) {
          return false;
        }
      }

      if (!q) {
        return true;
      }

      const inName = part.name.toLowerCase().includes(q);
      const inSku = part.sku?.toLowerCase().includes(q) ?? false;
      const inDesc = part.description.toLowerCase().includes(q);
      const inMfr = part.manufacturer?.toLowerCase().includes(q) ?? false;
      const inTags =
        part.tags?.some((t) => t.toLowerCase().includes(q)) ?? false;

      return inName || inSku || inDesc || inMfr || inTags;
    });
  }

  /** Expose architectural wall types compatible with `building.ts` WallType interface. */
  public getWallTypes(): WallType[] {
    const wallParts = this.getPartsBySubcategory("wall_assemblies");
    return wallParts.map((p) => ({
      id: p.id,
      label: p.name,
      thickness: p.dimensions?.thickness ?? 0.5,
      material: (p.properties?.material as any) || "wood",
    }));
  }

  /** Retrieve all curtain wall mullion profile specifications. */
  public getCurtainWallMullions(): PartSpecification[] {
    return this.getPartsBySubcategory("curtainwall_mullions");
  }

  /** Retrieve all curtain wall infill panel specifications. */
  public getCurtainWallInfillPanels(): PartSpecification[] {
    return this.getPartsBySubcategory("curtainwall_panels");
  }

  /** Retrieve all stair assembly specifications. */
  public getStairAssemblies(): PartSpecification[] {
    return this.getPartsBySubcategory("stair_assemblies");
  }

  /** Retrieve all roof assembly specifications. */
  public getRoofAssemblies(): PartSpecification[] {
    return this.getPartsBySubcategory("roof_assemblies");
  }

  /** Retrieve all soil specifications. */
  public getSoilTypes(): PartSpecification[] {
    return this.getPartsBySubcategory("soils");
  }

  /** Retrieve all erosion control Best Management Practice (BMP) specifications. */
  public getErosionControlBmps(): PartSpecification[] {
    return this.getPartsBySubcategory("erosion_bmps");
  }

  /** Retrieve all roadway subassembly specifications. */
  public getSubassemblies(): PartSpecification[] {
    return this.getPartsBySubcategory("subassemblies");
  }

  /** Retrieve all municipal land use zoning category definitions. */
  public getLandUseDefinitions(): PartSpecification[] {
    return this.getPartsBySubcategory("land_use");
  }

  /** Retrieve all civil highway design standards. */
  public getCivilDesignStandards(): PartSpecification[] {
    return this.getPartsBySubcategory("civil_design_standards");
  }

  /** Retrieve all municipal zoning district standards. */
  public getZoningDistricts(): PartSpecification[] {
    return this.getPartsBySubcategory("zoning_districts");
  }

  /** Retrieve all survey COGO description key rules. */
  public getDescriptionKeys(): PartSpecification[] {
    return this.getPartsBySubcategory("description_keys");
  }

  /** Retrieve all standard CAD drawing sheet size specifications. */
  public getSheetSizes(): PartSpecification[] {
    return this.getPartsBySubcategory("sheet_sizes");
  }

  /** Retrieve all CAD hatch pattern definitions. */
  public getHatchPatterns(): PartSpecification[] {
    return this.getPartsBySubcategory("hatch_patterns");
  }

  /** Import a batch array of parts into the database. */
  public importCatalog(catalog: PartSpecification[]): void {
    for (const part of catalog) {
      this.registerPart(part);
    }
  }

  /** Export all registered parts in the database as a JSON string or object array. */
  public exportCatalogJson(): string {
    return JSON.stringify(this.getAllParts(), null, 2);
  }
}

/** Default singleton instance of the Enterprise Global Parts Database. */
export const globalPartsDb = new GlobalPartsDatabase();
