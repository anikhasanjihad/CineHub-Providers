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
      label: "Custom FlixHub Mirror URL",
      description: "Alternative mirror if flixhub.net is blocked by your ISP",
      placeholder: "https://flixhub.net",
      defaultValue: "",
    },
  ];
};
