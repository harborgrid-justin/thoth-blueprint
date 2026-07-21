export interface PartParam {
  name: string;
  type: "length" | "diameter" | "angle" | "string";
  value: number | string;
  defaultValue?: number | string;
  description?: string;
}

export interface CustomPartDefinition {
  id: string;
  name: string;
  domain: "structure" | "pipe";
  shape: "cylinder" | "box" | "custom";
  params: PartParam[];
}

export interface CustomPartCatalog {
  catalogId: string;
  catalogName: string;
  parts: CustomPartDefinition[];
}
