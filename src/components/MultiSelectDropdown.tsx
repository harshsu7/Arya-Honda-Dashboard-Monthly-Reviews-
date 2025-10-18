import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Badge } from "./ui/badge";
import { ChevronDown, X } from "lucide-react";

interface MultiSelectDropdownProps {
  options: string[];
  selectedOptions: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  label?: string;
  allOptionText?: string;
}

export function MultiSelectDropdown({
  options,
  selectedOptions,
  onChange,
  placeholder = "Select options",
  label,
  allOptionText = "All"
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggleOption = (option: string) => {
    if (selectedOptions.includes(option)) {
      onChange(selectedOptions.filter(item => item !== option));
    } else {
      onChange([...selectedOptions, option]);
    }
  };

  const handleSelectAll = () => {
    if (selectedOptions.length === options.length) {
      onChange([]);
    } else {
      onChange([...options]);
    }
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const isAllSelected = selectedOptions.length === options.length;

  return (
    <div className="relative" ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between hover:bg-gray-50"
      >
        <div className="flex items-center flex-wrap gap-1 flex-1">
          {selectedOptions.length === 0 && (
            <span className="text-gray-500">{placeholder}</span>
          )}
          {selectedOptions.length > 0 && selectedOptions.length <= 2 && (
            selectedOptions.map((option) => (
              <Badge
                key={option}
                variant="secondary"
                className="bg-blue-100 text-blue-700"
              >
                {option}
              </Badge>
            ))
          )}
          {selectedOptions.length > 2 && (
            <>
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                {selectedOptions[0]}
              </Badge>
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                +{selectedOptions.length - 1} more
              </Badge>
            </>
          )}
        </div>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-hidden">
          {/* Header with actions */}
          <div className="p-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="text-xs"
              >
                {isAllSelected ? "Deselect All" : `Select ${allOptionText}`}
              </Button>
              {selectedOptions.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-60 overflow-y-auto p-2">
            {/* "All" option at the top */}
            <div
              className="flex items-center space-x-3 p-2 rounded hover:bg-blue-50 cursor-pointer transition-colors border-b border-gray-200 mb-2 bg-gray-50"
              onClick={handleSelectAll}
            >
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={handleSelectAll}
                className="pointer-events-none"
              />
              <span className="text-sm flex-1 font-medium text-blue-700">
                All {allOptionText}
              </span>
            </div>
            
            {/* Individual options */}
            {options.map((option) => {
              const isSelected = selectedOptions.includes(option);
              return (
                <div
                  key={option}
                  className="flex items-center space-x-3 p-2 rounded hover:bg-gray-100 cursor-pointer transition-colors"
                  onClick={() => handleToggleOption(option)}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleToggleOption(option)}
                    className="pointer-events-none"
                  />
                  <span className="text-sm flex-1">{option}</span>
                </div>
              );
            })}
          </div>

          {/* Footer with count */}
          <div className="p-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-600 text-center">
            {selectedOptions.length} of {options.length} selected
          </div>
        </div>
      )}
    </div>
  );
}
