// Automatically generated from the official schema

/**
 * Base Gist
 */
export interface BaseGist {
    url: string
    forks_url: string
    commits_url: string
    id: string
    node_id: string
    git_pull_url: string
    git_push_url: string
    html_url: string
    files: GistFiles
    public: boolean
    created_at: string
    updated_at: string
    description: string | null
    comments: number
    comments_enabled?: boolean
    user: null | SimpleUser
    comments_url: string
    owner?: SimpleUser
    truncated?: boolean
    forks?: unknown[]
    history?: unknown[]
    [k: string]: unknown
}

export interface GistFiles {
    [filename: string]: {
        filename: string
        type?: string
        language?: string
        raw_url: string
        size?: number
        /**
         * The encoding used for `content`. Currently, `"utf-8"` and `"base64"` are supported.
         */
        encoding?: 'utf-8' | 'base64' | string
        [k: string]: unknown
    }
}

/**
 * A GitHub user.
 */
export interface SimpleUser {
    name?: string | null
    email?: string | null
    login: string
    id: number
    node_id: string
    avatar_url: string
    gravatar_id: string | null
    url: string
    html_url: string
    followers_url: string
    following_url: string
    gists_url: string
    starred_url: string
    subscriptions_url: string
    organizations_url: string
    repos_url: string
    events_url: string
    received_events_url: string
    type: string
    site_admin: boolean
    starred_at?: string
    user_view_type?: string
    [k: string]: unknown
}
