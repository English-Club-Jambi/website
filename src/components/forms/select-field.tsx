"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/20/solid";
import { useId } from "react";

import { classNames } from "@/components/ui";

import styles from "./select-field.module.css";

export type SelectFieldOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export type SelectFieldGroup = {
  label: string;
  options: ReadonlyArray<SelectFieldOption>;
};

type SelectFieldProps = {
  label: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  options?: ReadonlyArray<SelectFieldOption>;
  groups?: ReadonlyArray<SelectFieldGroup>;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  id?: string;
  className?: string;
  describedBy?: string;
  variant?: "field" | "inline";
};

function SelectOption({ option }: { option: SelectFieldOption }) {
  return (
    <SelectPrimitive.Item
      className={styles.item}
      value={option.value}
      disabled={option.disabled}
    >
      <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className={styles.itemIndicator}>
        <CheckIcon width={18} height={18} aria-hidden />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

/**
 * A data-driven select built on Radix's accessible Select primitive.
 *
 * Pass either `options` for a flat list or `groups` for labelled sections.
 * Interaction, focus management, typeahead, and collision-aware positioning
 * remain consistent wherever the field is reused.
 */
export function SelectField({
  label,
  value,
  defaultValue,
  onValueChange,
  options = [],
  groups = [],
  placeholder = "Choose an option",
  disabled = false,
  required = false,
  name,
  id,
  className,
  describedBy,
  variant = "field",
}: SelectFieldProps) {
  const generatedId = useId();
  const triggerId = id ?? `select-${generatedId.replaceAll(":", "")}`;
  const hasGroups = groups.length > 0;

  return (
    <div
      className={classNames(styles.field, className)}
      data-disabled={disabled || undefined}
      data-variant={variant}
    >
      <label className={styles.label} htmlFor={triggerId}>
        {label}
      </label>

      <SelectPrimitive.Root
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        disabled={disabled}
        required={required}
        name={name}
      >
        <SelectPrimitive.Trigger
          id={triggerId}
          className={styles.trigger}
          aria-describedby={describedBy}
          data-select-trigger
          data-variant={variant}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon className={styles.triggerIcon}>
            <ChevronDownIcon width={18} height={18} aria-hidden />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            className={styles.content}
            position="popper"
            side="bottom"
            sideOffset={6}
            align="start"
            collisionPadding={12}
            avoidCollisions
            data-variant={variant}
          >
            <SelectPrimitive.ScrollUpButton
              className={styles.scrollButton}
              aria-label="Scroll to earlier options"
            >
              <ChevronUpIcon width={18} height={18} aria-hidden />
            </SelectPrimitive.ScrollUpButton>

            <SelectPrimitive.Viewport className={styles.viewport}>
              {hasGroups
                ? groups.map((group, groupIndex) => (
                    <SelectPrimitive.Group
                      className={styles.group}
                      key={`${group.label}-${groupIndex}`}
                    >
                      <SelectPrimitive.Label className={styles.groupLabel}>
                        {group.label}
                      </SelectPrimitive.Label>
                      {group.options.map((option) => (
                        <SelectOption key={option.value} option={option} />
                      ))}
                    </SelectPrimitive.Group>
                  ))
                : options.map((option) => (
                    <SelectOption key={option.value} option={option} />
                  ))}
            </SelectPrimitive.Viewport>

            <SelectPrimitive.ScrollDownButton
              className={styles.scrollButton}
              aria-label="Scroll to later options"
            >
              <ChevronDownIcon width={18} height={18} aria-hidden />
            </SelectPrimitive.ScrollDownButton>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </div>
  );
}
