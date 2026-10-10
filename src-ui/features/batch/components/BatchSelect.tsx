import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface BatchSelectOption<T extends string = string> {
  value: T;
  label: string;
  swatch?: "transparent" | "white" | "black";
}

interface Props<T extends string = string> {
  value: T;
  options: BatchSelectOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  title?: string;
  id?: string;
}

export function BatchSelect<T extends string = string>({
  value,
  options,
  onChange,
  disabled = false,
  title,
  id,
}: Props<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  const handleSelect = (val: T) => {
    onChange(val);
    setIsOpen(false);
  };

  const renderSwatch = (swatch?: "transparent" | "white" | "black") => {
    if (!swatch) return null;
    return <span className={`batch-swatch batch-swatch-${swatch}`} />;
  };

  return (
    <div
      ref={containerRef}
      className={`batch-select-wrapper ${disabled ? "disabled" : ""} ${isOpen ? "open" : ""}`}
      title={title}
      id={id}
    >
      <button
        type="button"
        className="batch-select-trigger"
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        disabled={disabled}
      >
        <span className="batch-select-trigger-label">
          {renderSwatch(selectedOption?.swatch)}
          <span>{selectedOption?.label}</span>
        </span>
        <ChevronDown
          size={13}
          className={`batch-select-chevron ${isOpen ? "rotated" : ""}`}
        />
      </button>

      {isOpen && !disabled && (
        <div className="batch-select-popover">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <div
                key={opt.value}
                className={`batch-select-option ${isSelected ? "selected" : ""}`}
                onClick={() => handleSelect(opt.value)}
              >
                <div className="batch-select-option-content">
                  {renderSwatch(opt.swatch)}
                  <span>{opt.label}</span>
                </div>
                {isSelected && <Check size={13} className="batch-select-check" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
