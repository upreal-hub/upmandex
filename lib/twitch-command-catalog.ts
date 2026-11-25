export const commandIcons = ["🎱", "😄", "🤗", "⚡", "🤔", "👀", "🎨", "🖼️", "💀", "🏁", "📘", "☁️", "💬", "🎵", "🎧", "📋", "⏳", "⏭️", "↩️", "⏱️", "💜", "👥", "👤", "📅", "🎬", "✨"] as const;

export type Category = { id: string; title: string; order: number };
export type TwitchCommand = {
  id: string; categoryId: string; syntax: string; description: string; example: string;
  icon: string; aliases: string[]; global: number; viewer: number; order: number; visible: boolean;
};
export type CommandCatalog = { categories: Category[]; commands: TwitchCommand[] };
export type CommandSnapshot = { revision: number; catalog: CommandCatalog };

const ordered = <T extends { order: number; id: string }>(rows: T[]) =>
  [...rows].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));

export function publicCommands(catalog: CommandCatalog): CommandCatalog {
  const commands = ordered(catalog.commands.filter(command => command.visible));
  return { commands, categories: ordered(catalog.categories.filter(category => commands.some(c => c.categoryId === category.id))) };
}

export function searchCommands(commands: TwitchCommand[], query: string, category: string) {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return commands.filter(command => (!category || category === command.categoryId) && terms.every(term =>
    [command.syntax, ...command.aliases, command.description, command.example].some(value => value.toLowerCase().includes(term))));
}

export async function copyCommand(clipboard: Pick<Clipboard, "writeText">, example: string) {
  await clipboard.writeText(example);
  return example;
}

export class CommandInputError extends Error {}
const inputError = (message: string): never => { throw new CommandInputError(message); };
const object = (value: unknown) => (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
function label(value: unknown, max: number, name: string) {
  if (typeof value === "string" && value.trim() && value.trim().length <= max && !/[\r\n]/.test(value)) return value.trim();
  return inputError(`${name} must be between 1 and ${max} characters.`);
}
function number(value: unknown, max: number, name: string) {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= max) return value;
  return inputError(`${name} must be a whole number between 0 and ${max}.`);
}
const triggerPattern = /^![a-z0-9_]{1,32}$/i;
const triggerOf = (syntax: string) => syntax.split(/\s+/)[0].toLowerCase();

export function changeCatalog(catalog: CommandCatalog, input: unknown, makeId: () => string): CommandCatalog {
  const action = object(input);
  const id = typeof action.id === "string" ? action.id : null;
  const value = object(action.value);
  switch (action.type) {
    case "saveCommand": {
      if (id && !catalog.commands.some(command => command.id === id)) return inputError("Command no longer exists.");
      const categoryId = label(value.categoryId, 50, "Category");
      if (!catalog.categories.some(category => category.id === categoryId)) return inputError("Choose an existing category.");
      const syntax = label(value.syntax, 100, "Syntax");
      const example = label(value.example, 160, "Example");
      const primary = triggerOf(syntax);
      if (!triggerPattern.test(primary) || !Array.isArray(value.aliases) || value.aliases.length > 20)
        return inputError("Enter a valid command and up to 20 aliases.");
      const aliases = value.aliases.map(alias => label(alias, 33, "Alias"));
      if (!aliases.every(alias => triggerPattern.test(alias))) return inputError("Each alias must be a single command beginning with !.");
      const triggers = [primary, ...aliases.map(alias => alias.toLowerCase())];
      const reserved = new Set(catalog.commands.filter(command => command.id !== id)
        .flatMap(command => [triggerOf(command.syntax), ...command.aliases.map(alias => alias.toLowerCase())]));
      if (new Set(triggers).size !== triggers.length || triggers.some(trigger => reserved.has(trigger)))
        return inputError("Command names and aliases must be unique, regardless of case.");
      if (!triggers.includes(triggerOf(example))) return inputError("The example must start with the command or one of its aliases.");
      const icon = label(value.icon, 10, "Icon");
      if (!commandIcons.some(candidate => candidate === icon) || typeof value.visible !== "boolean")
        return inputError("Choose an icon and a visibility setting.");
      const command: TwitchCommand = {
        id: id ?? makeId(), categoryId, syntax, aliases, example, icon, visible: value.visible,
        description: label(value.description, 400, "Description"), global: number(value.global, 86400, "Global cooldown"),
        viewer: number(value.viewer, 86400, "Viewer cooldown"), order: number(value.order, 9999, "Display order"),
      };
      return { ...catalog, commands: [...catalog.commands.filter(row => row.id !== id), command] };
    }
    case "deleteCommand":
      if (!catalog.commands.some(row => row.id === id)) return inputError("Command no longer exists.");
      return { ...catalog, commands: catalog.commands.filter(row => row.id !== id) };
    case "saveCategory": {
      if (id && !catalog.categories.some(row => row.id === id)) return inputError("Category no longer exists.");
      const title = label(value.title, 60, "Category name");
      if (catalog.categories.some(row => row.id !== id && row.title.toLowerCase() === title.toLowerCase()))
        return inputError("That category name is already in use.");
      const category = { id: id ?? makeId(), title, order: number(value.order, 9999, "Display order") };
      return { ...catalog, categories: [...catalog.categories.filter(row => row.id !== id), category] };
    }
    case "deleteCategory":
      if (!catalog.categories.some(row => row.id === id)) return inputError("Category no longer exists.");
      if (catalog.commands.some(command => command.categoryId === id)) return inputError("Move or delete every command in this category first.");
      return { ...catalog, categories: catalog.categories.filter(row => row.id !== id) };
    default: return inputError("Unknown catalog action.");
  }
}
