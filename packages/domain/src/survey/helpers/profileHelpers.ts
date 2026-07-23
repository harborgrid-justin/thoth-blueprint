import { sampleCrossSection, type VerticalProfile, type VerticalPVI } from "../../civil/profile";

export function computeCrossSection({
  resolved,
  terrainSurface,
  selectedStation,
  swathWidth,
}: {
  resolved: any;
  terrainSurface: any;
  selectedStation: number;
  swathWidth: number;
}) {
  if (!resolved || !terrainSurface) {
    return null;
  }
  return sampleCrossSection(
    terrainSurface,
    terrainSurface,
    resolved,
    selectedStation,
    swathWidth,
    2,
  );
}

export function updateProfilePvi(
  profile: VerticalProfile,
  index: number,
  field: keyof VerticalPVI,
  value: number,
): VerticalProfile {
  const updated = [...profile.pvis];
  updated[index] = { ...updated[index], [field]: value };
  return { ...profile, pvis: updated };
}

export function addProfilePvi(profile: VerticalProfile): VerticalProfile {
  const station =
    profile.pvis.length > 0
      ? profile.pvis[profile.pvis.length - 1].station + 100
      : 100;
  const elevation = 15;
  return {
    ...profile,
    pvis: [...profile.pvis, { station, elevation, curveLength: 50 }],
  };
}

export function removeProfilePvi(
  profile: VerticalProfile,
  index: number,
): VerticalProfile {
  if (profile.pvis.length <= 1) {
    return profile;
  }
  const updated = profile.pvis.filter((_, i) => i !== index);
  return { ...profile, pvis: updated };
}
