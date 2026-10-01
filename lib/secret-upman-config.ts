import "server-only";

const TWITCH_CATEGORY_ID_PATTERN = /^[1-9][0-9]{0,29}$/;

type CategoryRequirement =
  | { configured: true; requiredTwitchCategoryId: string | null }
  | { configured: false; requiredTwitchCategoryId: null };

function configuredTwitchCategoryId(value: string | undefined) {
  const categoryId = value?.trim();
  return categoryId && TWITCH_CATEGORY_ID_PATTERN.test(categoryId)
    ? categoryId
    : null;
}

export function getGarticPhoneCategoryId() {
  return configuredTwitchCategoryId(process.env.TWITCH_GARTIC_PHONE_CATEGORY_ID);
}

export function getStreamCommandCategoryRequirement(input: {
  upmanSlug: string;
  requiredTwitchCategoryId: string | null;
}): CategoryRequirement {
  if (input.upmanSlug !== "garticupman") {
    return {
      configured: true,
      requiredTwitchCategoryId: input.requiredTwitchCategoryId,
    };
  }

  const categoryId = getGarticPhoneCategoryId();
  return categoryId
    ? { configured: true, requiredTwitchCategoryId: categoryId }
    : { configured: false, requiredTwitchCategoryId: null };
}
