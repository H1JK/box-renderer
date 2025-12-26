import { Resource } from "../parts/resource"

export interface RendererConfigResource {
    tag: string
    from: 'remote' | 'local' | 'inline'
    options?: RendererConfigResourceOptions

    /**
     * Remote fields
     */
    remote_url?: string
    remote_header?: {
        [k: string]: string
    }
    remote_disable_cache?: boolean

    /**
     * Local fields
     */
    local_path?: string

    /**
     * Inline fields
     */
    payload?: Resource
}

export interface RendererConfigResourceOptions {
    filter?: string[]
    exclude?: string[]
    filter_type?: string[]
    exclude_type?: string[]
    tag_prefix?: string
}