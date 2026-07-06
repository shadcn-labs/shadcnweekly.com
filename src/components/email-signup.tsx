import { BorderBeam } from "border-beam";

import { Button } from "@/components/ui/button";

export const EmailSignup = () => (
  <BorderBeam className="w-full" size="md" duration={4} colorVariant="colorful">
    <div className="flex items-center rounded-full border border-border bg-background p-1">
      <input
        type="email"
        placeholder="Enter your email"
        className="flex-1 bg-transparent px-4 text-base outline-none placeholder:text-muted-foreground"
      />
      <Button type="submit" size="lg" className="shrink-0 rounded-full px-6">
        Subscribe
      </Button>
    </div>
  </BorderBeam>
);
