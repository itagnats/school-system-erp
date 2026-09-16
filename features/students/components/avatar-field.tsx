"use client";

import { ImageUp, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MAX_AVATAR_CHARS } from "@/lib/api/contracts";

/**
 * Choose a profile picture (direction.md §9).
 *
 * **The file never leaves the browser as a file.** It is read into a `data:`
 * URL and sent as part of the personal section, because PRIME has no image
 * storage and inventing an upload endpoint that writes nowhere would be a
 * bigger lie than the one this avoids. It lasts until reload, exactly like
 * every other write here, and the hint under the control says so rather than
 * letting someone discover it.
 *
 * A `data:` URL is also the only thing that can be displayed: the
 * Content-Security-Policy sets `img-src 'self' data: blob:`, so an external
 * address would be blocked by the browser with no error anyone could act on.
 * The server enforces the same rule; this is the half that gives a person a
 * message instead of a silent blank.
 *
 * Type and size are checked here **and** on the server. Neither check is
 * decoration: the one here is what makes the message useful, and the one there
 * is what makes it true.
 */
const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];

/** 300,000 base64 characters is roughly 200KB of image, minus the data: prefix. */
const MAX_BYTES = Math.floor((MAX_AVATAR_CHARS * 3) / 4);

export function AvatarField({
  value,
  initials,
  onChange,
}: {
  /** A data URL, or empty for no picture. */
  value: string;
  initials: string;
  onChange: (dataUrl: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [problem, setProblem] = useState<string>();
  const [reading, setReading] = useState(false);

  function choose(file: File | undefined) {
    if (!file) return;
    setProblem(undefined);

    // Checked before reading rather than after: there is no reason to pull
    // megabytes into memory to then reject them.
    if (!ACCEPTED.includes(file.type)) {
      setProblem("Choose a PNG, JPEG or WebP image");
      return;
    }
    if (file.size > MAX_BYTES) {
      setProblem("That image is too large - keep it under about 200KB");
      return;
    }

    setReading(true);
    const reader = new FileReader();
    reader.onload = () => {
      setReading(false);
      if (typeof reader.result === "string") onChange(reader.result);
    };
    reader.onerror = () => {
      setReading(false);
      setProblem("That file could not be read");
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar className="size-16 border border-hairline">
        {value ? <AvatarImage src={value} alt="" /> : null}
        <AvatarFallback className="text-sm font-medium">{initials}</AvatarFallback>
      </Avatar>

      <div className="grid gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={reading}
            onClick={() => inputRef.current?.click()}
          >
            <ImageUp className="size-3.5" aria-hidden />
            {value ? "Replace image" : "Choose image"}
          </Button>

          {value ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground"
              onClick={() => {
                setProblem(undefined);
                onChange("");
              }}
            >
              <Trash2 className="size-3.5" aria-hidden />
              Remove
            </Button>
          ) : null}

          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED.join(",")}
            className="sr-only"
            aria-label="Profile picture"
            onChange={(event) => {
              choose(event.target.files?.[0]);
              // Clear it, or choosing the same file twice raises no change
              // event and the picker looks broken.
              event.target.value = "";
            }}
          />
        </div>

        {problem ? (
          <p role="alert" className="text-xs font-medium text-destructive">
            {problem}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            PNG, JPEG or WebP, up to about 200KB. Held in the page, not stored -
            it resets on reload like every other change here.
          </p>
        )}
      </div>
    </div>
  );
}
