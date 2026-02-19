"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCategory } from "@/lib/actions";
import { CATEGORY_COLORS, CATEGORY_ICONS } from "@/lib/constants";
import { CategoryIcon } from "@/components/icons";
import { Plus } from "lucide-react";

export function NewCategoryDialog() {
  const [open, setOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string>(CATEGORY_COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState<string>("folder");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 border-dashed">
          <Plus className="h-4 w-4" />
          Category
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Category</DialogTitle>
        </DialogHeader>
        <form
          action={async (formData) => {
            formData.set("color", selectedColor);
            formData.set("icon", selectedIcon);
            await createCategory(formData);
            setOpen(false);
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="cat-name">Name</Label>
            <Input
              id="cat-name"
              name="name"
              placeholder="e.g. Coding Tasks"
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2 flex-wrap">
              {CATEGORY_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    selectedColor === color
                      ? "border-white scale-110"
                      : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setSelectedColor(color)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="flex gap-2 flex-wrap">
              {CATEGORY_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all ${
                    selectedIcon === icon
                      ? "border-white bg-white/10"
                      : "border-transparent opacity-50 hover:opacity-100"
                  }`}
                  onClick={() => setSelectedIcon(icon)}
                >
                  <CategoryIcon icon={icon} className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
