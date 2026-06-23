import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./Button";

const meta: Meta<typeof Button> = {
  title: "Components/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    variant: { control: "select", options: ["primary", "secondary"] },
    fullWidth: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: { variant: "primary", children: "프로그램 생성" },
};

export const Secondary: Story = {
  args: { variant: "secondary", children: "데이터 내보내기" },
};

export const FullWidth: Story = {
  args: { variant: "primary", fullWidth: true, children: "오늘 스트렝스 완료" },
};
