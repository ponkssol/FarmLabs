"use client";

import { useId, useState } from "react";

function normalizeRaw(s: string) {
  return s.trim().replace(/\s/g, "").replace(/,/g, ".");
}

type Props = {
  value: number | undefined;
  onValueChange: (n: number | undefined) => void;
  className?: string;
  id?: string;
  placeholder?: string;
};

/**
 * Allows typing small decimals (e.g. 0.002 SOL) without the caret jumping; does not
 * parse to a number on every keypress like a raw <input type="number">.
 */
export function DecimalPriceInput({ value, onValueChange, className, id, placeholder }: Props) {
  const autoId = useId();
  const elId = id ?? autoId;
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState("");

  const show =
    focused
      ? text
      : value == null || value === 0
        ? ""
        : String(value);

  return (
    <input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      id={elId}
      className={className}
      placeholder={placeholder}
      value={show}
      onChange={(e) => {
        setText(e.target.value);
      }}
      onFocus={() => {
        setFocused(true);
        setText(value == null || value === 0 ? "" : String(value));
      }}
      onBlur={() => {
        setFocused(false);
        const raw = normalizeRaw(text);
        if (raw === "" || raw === ".") {
          onValueChange(undefined);
          return;
        }
        const n = parseFloat(raw);
        if (!Number.isFinite(n) || n < 0) {
          onValueChange(undefined);
          return;
        }
        if (n === 0) {
          onValueChange(undefined);
          return;
        }
        onValueChange(n);
        setText("");
      }}
    />
  );
}
