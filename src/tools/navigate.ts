// src/tools/navigate.ts
// "navigate" tool: map a mood or quote category to the page that helps most.
import { isCategory } from "@/data/quotes";
import { getMood } from "@/lib/moods";

export const schema = {
  name: "navigate",
  description: "Return the route path for a given mood or quote category",
  parameters: {
    type: "object",
    properties: { target: { type: "string" } },
    required: ["target"],
  },
};

export function exec(args: { target: string }): { route: string } {
  if (isCategory(args.target)) return { route: `/quotes/${args.target}` };
  const mood = getMood(args.target);
  if (mood?.helper) return { route: mood.helper.href };
  if (mood) return { route: `/quotes/${mood.categories[0]}` };
  return { route: "/quotes" };
}
