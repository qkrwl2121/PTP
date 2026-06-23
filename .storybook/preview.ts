import type { Preview } from "@storybook/react";
import "../src/styles/theme.css";

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: "dark",
      values: [{ name: "dark", value: "var(--color-bg)" }],
    },
    layout: "padded",
  },
};

export default preview;
