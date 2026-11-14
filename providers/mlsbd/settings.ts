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
      label: "Custom MLSBD Mirror URL",
      description: "Alternative mirror if mlsbd.co is blocked by your ISP",
      placeholder: "https://mlsbd.co",
      defaultValue: "",
    },
  ];
};
