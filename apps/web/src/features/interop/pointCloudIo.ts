import {
  isBinaryPointCloudFormat,
  parsePointCloud,
  pointCloudFormatFromName,
  serializePointCloud,
  type PointCloud,
  type PointCloudFormat,
} from "@thoth/domain";
import { downloadArrayBuffer, downloadText, readFileAsArrayBuffer, readFileAsText, slugify } from "./fileIo";

export const POINT_CLOUD_ACCEPT = ".xyz,.pts,.ply,.las,.dxf";
export const POINT_CLOUD_FORMATS: PointCloudFormat[] = ["xyz", "pts", "ply", "las", "dxf"];

/** Read and parse a point-cloud file, inferring the format from its name. */
export async function importPointCloudFile(file: File): Promise<{ name: string; cloud: PointCloud }> {
  const format = pointCloudFormatFromName(file.name);
  if (!format) throw new Error(`Unsupported point-cloud file: ${file.name}`);
  const data = isBinaryPointCloudFormat(format)
    ? await readFileAsArrayBuffer(file)
    : await readFileAsText(file);
  const cloud = parsePointCloud(data, format);
  return { name: file.name.replace(/\.[^.]+$/, ""), cloud };
}

/** Serialize a point cloud to a format and download it. */
export function exportPointCloud(cloud: PointCloud, format: PointCloudFormat, baseName: string): void {
  const data = serializePointCloud(cloud, format);
  const filename = `${slugify(baseName)}.${format}`;
  if (typeof data === "string") {
    const mime = format === "dxf" ? "application/dxf" : "text/plain";
    downloadText(filename, data, mime);
  } else {
    downloadArrayBuffer(filename, data, "application/octet-stream");
  }
}
