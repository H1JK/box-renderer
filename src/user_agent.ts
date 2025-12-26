import { SemVer } from "./semver";

export const parseSingBoxVersionFromUA = (userAgent: string | null) => {
    if (userAgent === null) return null;

    const fullSemverRegex =
        /sing-box\/(\d+\.\d+\.\d+(?:-(?:alpha|beta|rc)\.\d+)?)/i;

    const fullMatch = userAgent.match(fullSemverRegex);
    if (fullMatch) {
        try {
            return new SemVer(fullMatch[1]);
        } catch {
            // ignore and fallback
        }
    }

    const anyRegex =
        /sing-box\/(\d+)\.(\d+)\.(\d+)-any\.\d+/i;

    const anyMatch = userAgent.match(anyRegex);
    if (!anyMatch) {
        return null;
    }

    const version = `${anyMatch[1]}.${anyMatch[2]}.${anyMatch[3]}`;

    try {
        return new SemVer(version);
    } catch {
        return null;
    }
}