type PreReleaseType = 'alpha' | 'beta' | 'rc';

const PRE_RELEASE_WEIGHT: Record<PreReleaseType, number> = {
    alpha: 1,
    beta: 2,
    rc: 3,
};

export class SemVer {
    readonly major: number;
    readonly minor: number;
    readonly patch: number;
    readonly preType: PreReleaseType | null;
    readonly preVersion: number | null;

    constructor(version: string) {
        const regex =
            /^(\d+)\.(\d+)\.(\d+)(?:-(alpha|beta|rc)\.(\d+))?$/;

        const match = version.match(regex);
        if (!match) {
            throw new Error(`Invalid version format: ${version}`);
        }

        this.major = Number(match[1]);
        this.minor = Number(match[2]);
        this.patch = Number(match[3]);
        this.preType = (match[4] as PreReleaseType) ?? null;
        this.preVersion = match[5] ? Number(match[5]) : null;
    }

    compare(other: SemVer): number {
        if (this.major !== other.major) {
            return this.major > other.major ? 1 : -1;
        }

        if (this.minor !== other.minor) {
            return this.minor > other.minor ? 1 : -1;
        }

        if (this.patch !== other.patch) {
            return this.patch > other.patch ? 1 : -1;
        }

        if (this.preType === null && other.preType !== null) return 1;
        if (this.preType !== null && other.preType === null) return -1;
        if (this.preType === null && other.preType === null) return 0;

        const typeDiff =
            PRE_RELEASE_WEIGHT[this.preType!] -
            PRE_RELEASE_WEIGHT[other.preType!];
        if (typeDiff !== 0) {
            return typeDiff > 0 ? 1 : -1;
        }

        return this.preVersion! === other.preVersion!
            ? 0
            : this.preVersion! > other.preVersion!
                ? 1
                : -1;
    }

    gt(other: SemVer): boolean {
        return this.compare(other) > 0;
    }

    gte(other: SemVer): boolean {
        return this.compare(other) >= 0;
    }

    lt(other: SemVer): boolean {
        return this.compare(other) < 0;
    }

    lte(other: SemVer): boolean {
        return this.compare(other) <= 0;
    }

    eq(other: SemVer): boolean {
        return this.compare(other) === 0;
    }

    toString(): string {
        if (this.preType) {
            return `${this.major}.${this.minor}.${this.patch}-${this.preType}.${this.preVersion}`;
        }
        return `${this.major}.${this.minor}.${this.patch}`;
    }
}
