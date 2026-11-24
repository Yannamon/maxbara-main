"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useFormStatus } from "react-dom";

const maxBytes = 3 * 1024 * 1024;

async function compressPhoto(file: File) {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    return blob ? new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" }) : file;
  } finally {
    bitmap.close();
  }
}

export function UploadPicker({ action, labels }: {
  action: (form: FormData) => Promise<void>;
  labels: { file: string; camera: string; upload: string; uploading: string; size: string };
}) {
  const picker = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const job = useRef(0);
  const [selection, setSelection] = useState("");
  const [busy, setBusy] = useState(false);
  const [tooLarge, setTooLarge] = useState(false);

  async function select(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    const sequence = ++job.current;
    const other = input === picker.current ? camera.current : picker.current;
    if (other) other.value = "";
    setSelection(file.name);
    setTooLarge(false);
    setBusy(false);

    if (file.size <= maxBytes) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setTooLarge(true);
      return;
    }
    setBusy(true);
    try {
      const smaller = await compressPhoto(file);
      if (sequence !== job.current || input.files?.[0] !== file) return;
      const transfer = new DataTransfer();
      transfer.items.add(smaller);
      input.files = transfer.files;
      setTooLarge(smaller.size > maxBytes);
    } catch {
      if (sequence === job.current) setTooLarge(true);
    } finally {
      if (sequence === job.current) setBusy(false);
    }
  }

  return (
    <form className="document-upload" action={action}>
      <div className="upload-options">
        <label className="button button-outline button-small upload-control">
          {labels.file}
          <input ref={picker} name="file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" onChange={select} />
        </label>
        <label className="button button-outline button-small upload-control">
          {labels.camera}
          <input ref={camera} name="photo" type="file" accept="image/*" capture="environment" onChange={select} />
        </label>
        <UploadButton disabled={busy || tooLarge} ready={labels.upload} pendingLabel={labels.uploading} />
      </div>
      {selection && <p className="file-name" aria-live="polite">{selection}</p>}
      {tooLarge && <p role="alert">{labels.size}</p>}
    </form>
  );
}

function UploadButton({ disabled, ready, pendingLabel }: {
  disabled: boolean;
  ready: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  return <button className="button button-small" disabled={disabled || pending} type="submit">
    {pending ? pendingLabel : ready}
  </button>;
}
