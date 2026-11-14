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
      label: "Custom MovieBaaz Mirror URL",
      description: "Alternative mirror if moviebaaz.baby is blocked by your ISP",
      placeholder: "https://moviebaaz.baby",
      defaultValue: "",
    },
  ];
};
