import { ProviderContext, SettingsField } from "../types";

export const getSettingsSchema = async function ({
  providerContext,
}: {
  providerContext: ProviderContext;
}): Promise<SettingsField[]> {
  return [
    {
      key: "baseUrlOverride",
      type: "text",
      label: "Custom MoviBD Mirror URL",
      description: "Alternative mirror if movibd.top is blocked by your ISP",
      placeholder: "https://movibd.top",
      defaultValue: "",
    },
  ];
};
