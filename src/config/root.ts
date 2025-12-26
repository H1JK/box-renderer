import { RendererConfigResource } from "./resource"
import { RendererConfigTemplate } from "./template"
import { RendererConfigTemplateRule } from "./template_rule"

export interface RendererConfig {
    resources?: RendererConfigResource[]
    templates: RendererConfigTemplate[]
    template_rules?: RendererConfigTemplateRule[]
}
