import { Routable } from "./resource";

export interface Template {
    outbounds?: Routable[];
    endpoints?: Routable[];
    [k: string]: unknown
}
