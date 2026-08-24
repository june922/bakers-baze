import db from "@/src/lib/db";
import type { StorefrontSettings } from "./storefront.types";

interface StorefrontSettingsRow {
  tenant_id: string;
  template_key: string;
  display_name: string;
  tagline: string | null;
  about_text: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  hero_image_url: string | null;
  logo_url: string | null;
  primary_color: string | null;
  branding: Record<string, unknown>;
  social: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

function toSettings(row: StorefrontSettingsRow): StorefrontSettings {
  return {
    tenantId: row.tenant_id,
    templateKey: row.template_key,
    displayName: row.display_name,
    tagline: row.tagline,
    aboutText: row.about_text,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    address: row.address,
    heroImageUrl: row.hero_image_url,
    logoUrl: row.logo_url,
    primaryColor: row.primary_color,
    branding: row.branding,
    social: row.social,
  };
}

type SettingsPatch = Partial<{
  templateKey: string;
  displayName: string;
  tagline: string | null;
  aboutText: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  heroImageUrl: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  branding: Record<string, unknown>;
  social: Record<string, unknown>;
}>;

function toRowPatch(input: SettingsPatch): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (input.templateKey !== undefined) patch.template_key = input.templateKey;
  if (input.displayName !== undefined) patch.display_name = input.displayName;
  if (input.tagline !== undefined) patch.tagline = input.tagline;
  if (input.aboutText !== undefined) patch.about_text = input.aboutText;
  if (input.contactEmail !== undefined) patch.contact_email = input.contactEmail;
  if (input.contactPhone !== undefined) patch.contact_phone = input.contactPhone;
  if (input.address !== undefined) patch.address = input.address;
  if (input.heroImageUrl !== undefined) patch.hero_image_url = input.heroImageUrl;
  if (input.logoUrl !== undefined) patch.logo_url = input.logoUrl;
  if (input.primaryColor !== undefined) patch.primary_color = input.primaryColor;
  if (input.branding !== undefined) patch.branding = input.branding;
  if (input.social !== undefined) patch.social = input.social;
  return patch;
}

export const storefrontSettingsRepository = {
  async findByTenantId(tenantId: string): Promise<StorefrontSettings | undefined> {
    const row = await db<StorefrontSettingsRow>("storefront_settings").where({ tenant_id: tenantId }).first();
    return row ? toSettings(row) : undefined;
  },

  async create(tenantId: string, input: SettingsPatch & { displayName: string }): Promise<StorefrontSettings> {
    const [row] = await db<StorefrontSettingsRow>("storefront_settings")
      .insert({
        tenant_id: tenantId,
        template_key: input.templateKey ?? "elegant",
        display_name: input.displayName,
        tagline: input.tagline ?? null,
        about_text: input.aboutText ?? null,
        contact_email: input.contactEmail ?? null,
        contact_phone: input.contactPhone ?? null,
        address: input.address ?? null,
        hero_image_url: input.heroImageUrl ?? null,
        logo_url: input.logoUrl ?? null,
        primary_color: input.primaryColor ?? null,
        branding: input.branding ?? {},
        social: input.social ?? {},
      })
      .returning("*");
    return toSettings(row);
  },

  async updateForTenant(tenantId: string, input: SettingsPatch): Promise<StorefrontSettings | undefined> {
    const [row] = await db<StorefrontSettingsRow>("storefront_settings")
      .where({ tenant_id: tenantId })
      .update({ ...toRowPatch(input), updated_at: db.fn.now() })
      .returning("*");
    return row ? toSettings(row) : undefined;
  },
};
