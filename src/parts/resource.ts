export interface Resource {
    outbounds?: (Routable | RoutableGroup)[]
    endpoints?: Routable[]
}

export interface Routable {
    type: string
    tag: string
    [k: string]: unknown
}

export interface RoutableGroup extends Routable {
    outbounds?: string[]
}
