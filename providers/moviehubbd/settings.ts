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
      label: "Custom MovieHubBD Mirror URL",
      description: "Alternative mirror if moviehubbd.net is blocked by your ISP",
      placeholder: "https://moviehubbd.net",
      defaultValue: "",
    },
  ];
};
