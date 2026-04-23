"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { DynamicToolUIPart, ToolUIPart } from "ai";
import {
  AlertCircleIcon,
  ChevronRightIcon,
  LoaderIcon,
} from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { isValidElement } from "react";

import { CodeBlock } from "./code-block";

export type ToolProps = ComponentProps<typeof Collapsible>;

export const Tool = ({ className, ...props }: ToolProps) => (
  <Collapsible
    className={cn("group not-prose mb-1.5 w-full", className)}
    {...props}
  />
);

export type ToolPart = ToolUIPart | DynamicToolUIPart;

export type ToolHeaderProps = {
  title?: string;
  className?: string;
} & (
  | { type: ToolUIPart["type"]; state: ToolUIPart["state"]; toolName?: never }
  | {
      type: DynamicToolUIPart["type"];
      state: DynamicToolUIPart["state"];
      toolName: string;
    }
);

/** Inline status indicator — loading spinner, error mark, or nothing. */
function StatusIndicator({ state }: { state: ToolPart["state"] }) {
  if (
    state === "input-streaming" ||
    state === "input-available" ||
    state === "approval-requested"
  ) {
    return (
      <LoaderIcon className="size-3 animate-spin text-muted-foreground/60" />
    );
  }

  if (state === "output-error" || state === "output-denied") {
    return (
      <AlertCircleIcon className="size-3 text-destructive/70" />
    );
  }

  // output-available, approval-responded — show nothing
  return null;
}

export const ToolHeader = ({
  className,
  title,
  type,
  state,
  toolName,
  ...props
}: ToolHeaderProps) => {
  const derivedName =
    type === "dynamic-tool" ? toolName : type.split("-").slice(1).join("-");

  return (
    <CollapsibleTrigger
      className={cn(
        "flex w-full items-center gap-2 rounded-lg bg-muted/60 px-2.5 py-1.5",
        "transition-colors hover:bg-muted",
        className
      )}
      {...props}
    >
      <ChevronRightIcon className="size-3 text-muted-foreground/50 transition-transform duration-150 ease-out group-data-[state=open]:rotate-90" />
      <span className="flex-1 text-left text-[12px] font-light tracking-wide text-muted-foreground">
        {title ?? derivedName}
      </span>
      <StatusIndicator state={state} />
    </CollapsibleTrigger>
  );
};

export type ToolContentProps = ComponentProps<typeof CollapsibleContent>;

export const ToolContent = ({ className, ...props }: ToolContentProps) => (
  <CollapsibleContent
    className={cn(
      "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 space-y-3 px-2.5 py-2.5 text-popover-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
      className
    )}
    {...props}
  />
);

export type ToolInputProps = ComponentProps<"div"> & {
  input: ToolPart["input"];
};

export const ToolInput = ({ className, input, ...props }: ToolInputProps) => (
  <div className={cn("space-y-1.5 overflow-hidden", className)} {...props}>
    <h4 className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
      Parameters
    </h4>
    <div className="rounded-md bg-muted/40">
      <CodeBlock code={JSON.stringify(input, null, 2) ?? "{}"} language="json" />
    </div>
  </div>
);

export type ToolOutputProps = ComponentProps<"div"> & {
  output: ToolPart["output"];
  errorText: ToolPart["errorText"];
};

export const ToolOutput = ({
  className,
  output,
  errorText,
  ...props
}: ToolOutputProps) => {
  if (!(output || errorText)) {
    return null;
  }

  let Output = <div>{output as ReactNode}</div>;

  if (typeof output === "object" && !isValidElement(output)) {
    Output = (
      <CodeBlock code={JSON.stringify(output, null, 2)} language="json" />
    );
  } else if (typeof output === "string") {
    Output = <CodeBlock code={output} language="json" />;
  }

  return (
    <div className={cn("space-y-1.5", className)} {...props}>
      <h4 className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
        {errorText ? "Error" : "Result"}
      </h4>
      <div
        className={cn(
          "overflow-x-auto rounded-md text-xs [&_table]:w-full",
          errorText
            ? "bg-destructive/10 text-destructive"
            : "bg-muted/40 text-foreground"
        )}
      >
        {errorText && <div>{errorText}</div>}
        {Output}
      </div>
    </div>
  );
};
