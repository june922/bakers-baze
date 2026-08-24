import type { TemplateComponents } from "./types";
import elegantTemplate from "./elegant";

const templateRegistry: Record<string, TemplateComponents> = {
  elegant: elegantTemplate,
};

const DEFAULT_TEMPLATE_KEY = "elegant";

export function getTemplate(templateKey: string): TemplateComponents {
  return templateRegistry[templateKey] ?? templateRegistry[DEFAULT_TEMPLATE_KEY];
}
