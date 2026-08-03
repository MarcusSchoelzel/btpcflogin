import { search, Separator } from "@inquirer/prompts";
import {
  createPrompt,
  useState,
  useKeypress,
  usePrefix,
  isEnterKey,
  isUpKey,
  isDownKey,
  makeTheme,
} from "@inquirer/core";
import chalk from "chalk";

export { Separator };

export type PromptChoice = {
  value: string;
  name?: string;
  description?: string;
};

/**
 * Type-ahead list selection (replacement for enquirer's 'autocomplete' prompt)
 *
 * @returns value of the chosen entry
 */
export async function autocomplete(
  config: {
    message: string;
    choices: (PromptChoice | Separator)[];
    /** value of the entry the cursor is initially placed on */
    default?: string;
  },
  context?: Parameters<typeof search>[1],
): Promise<string> {
  return search<string>(
    {
      message: config.message,
      default: config.default,
      pageSize: 15,
      source: (term) => {
        if (!term) return config.choices;

        const searchTerm = term.toLowerCase();
        return config.choices.filter(
          (choice) =>
            !(choice instanceof Separator) && (choice.name ?? choice.value).toLowerCase().includes(searchTerm),
        );
      },
    },
    context,
  );
}

/**
 * Interactive reordering of a list (replacement for enquirer's 'sort' prompt).
 * <space> grabs/releases the entry under the cursor, ↑/↓ moves cursor or grabbed entry,
 * <enter> confirms the current order.
 *
 * @returns values in their new order
 */
export const reorder = createPrompt<string[], { message: string; choices: PromptChoice[] }>((config, done) => {
  const [choices, setChoices] = useState<PromptChoice[]>(config.choices);
  const [cursor, setCursor] = useState(0);
  const [grabbed, setGrabbed] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const theme = makeTheme({});
  const prefix = usePrefix({ status: isDone ? "done" : "idle", theme });
  const message = theme.style.message(config.message, isDone ? "done" : "idle");

  useKeypress((key) => {
    if (isEnterKey(key)) {
      setIsDone(true);
      done(choices.map((choice) => choice.value));
    } else if (key.name === "space") {
      setGrabbed(!grabbed);
    } else if (isUpKey(key) || isDownKey(key)) {
      const newCursor = isUpKey(key) ? cursor - 1 : cursor + 1;
      if (newCursor < 0 || newCursor >= choices.length) return;

      if (grabbed) {
        const reordered = [...choices];
        [reordered[cursor], reordered[newCursor]] = [reordered[newCursor], reordered[cursor]];
        setChoices(reordered);
      }
      setCursor(newCursor);
    }
  });

  if (isDone) return `${prefix} ${message}`;

  const list = choices
    .map((choice, index) => {
      const label = (choice.name ?? choice.value) + (choice.description ? chalk.dim(` (${choice.description})`) : "");
      if (index !== cursor) return `  ${label}`;
      return grabbed ? chalk.cyanBright(`◆ ${label}`) : chalk.cyan(`❯ ${label}`);
    })
    .join("\n");

  const help = theme.style.help("<space> grab/release, ↑/↓ move, <enter> confirm");
  return `${prefix} ${message} ${help}\n${list}`;
});
